import { access, mkdir, readFile, readdir, rename, rm, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { thinkers } from '../src/data.js';
import credits from '../src/portraitCredits.js';

const optimizedRoot = new URL('../portraits/optimized/', import.meta.url);

async function replaceImage(destination, bytes) {
  const temporary = `${destination}.tmp`;
  await writeFile(temporary, bytes);
  for (let attempt = 0; ; attempt++) {
    try { await rename(temporary, destination); return; }
    catch (error) {
      if (!['EPERM', 'EBUSY', 'EACCES'].includes(error.code) || attempt >= 8) throw error;
      await new Promise((resolve) => setTimeout(resolve, 250 * (attempt + 1)));
    }
  }
}

await mkdir(optimizedRoot, { recursive: true });

for (const [index, person] of thinkers.entries()) {
  const source = credits[person.id]?.src || `/portraits/optimized/portrait-${index}.webp`;
  const destination = new URL(`portrait-${index}.webp`, optimizedRoot);
  const destinationExists = await access(destination).then(() => true, () => false);
  const input = fileURLToPath(new URL(`..${source}`, import.meta.url));
  const inputBytes = await readFile(input);
  const metadata = await sharp(inputBytes).metadata();
  if (!destinationExists || metadata.width !== 192 || metadata.height !== 192) {
    const output = await sharp(inputBytes, { animated: false })
      .rotate()
      .resize(192, 192, { fit: 'cover', position: 'centre' })
      .webp({ quality: 65, effort: 6, smartSubsample: true })
      .toBuffer();
    await replaceImage(fileURLToPath(destination), output);
  }
  if (credits[person.id]) credits[person.id].src = `/portraits/optimized/portrait-${index}.webp`;
}

const activeIds = new Set(thinkers.map((person) => person.id));
for (const id of Object.keys(credits)) {
  if (!activeIds.has(id)) delete credits[id];
}

const backgroundSource = new URL('../public/backgrounds/milky-way-spiral.webp', import.meta.url);
const backgroundDestination = new URL('../public/backgrounds/milky-way-spiral.webp', import.meta.url);
const backgroundBytes = await readFile(backgroundSource);
const backgroundMetadata = await sharp(backgroundBytes).metadata();
if (Math.max(backgroundMetadata.width, backgroundMetadata.height) > 960) {
  const output = await sharp(backgroundBytes)
    .resize({ width: 960, height: 960, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 65, effort: 6, smartSubsample: true })
    .toBuffer();
  await replaceImage(fileURLToPath(backgroundDestination), output);
}

await writeFile(
  new URL('../src/portraitCredits.js', import.meta.url),
  `const portraitCredits = ${JSON.stringify(credits, null, 2)};\nexport default portraitCredits;\n`,
  'utf8',
);

const usedFiles = new Set(thinkers.map((person, index) => (credits[person.id]?.src || `/portraits/optimized/portrait-${index}.webp`).split('/').at(-1)));
for (const entry of await readdir(optimizedRoot, { withFileTypes: true })) {
  if (entry.isFile() && entry.name.endsWith('.webp') && !usedFiles.has(entry.name)) {
    await rm(new URL(entry.name, optimizedRoot));
  }
}

console.log(`Optimized ${thinkers.length} portraits to 192x192 WebP and compressed the active background.`);
