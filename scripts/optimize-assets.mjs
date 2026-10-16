import { access, mkdir, readdir, rm, writeFile } from 'node:fs/promises';
import { extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { thinkers } from '../src/data.js';
import credits from '../src/portraitCredits.js';

const portraitsRoot = new URL('../portraits/', import.meta.url);
const optimizedRoot = new URL('../portraits/optimized/', import.meta.url);
const imageExtensions = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg']);

await mkdir(optimizedRoot, { recursive: true });

for (const [index, person] of thinkers.entries()) {
  const source = credits[person.id]?.src || `/portraits/original/portrait-${index}.svg`;
  const destination = new URL(`portrait-${index}.webp`, optimizedRoot);
  const destinationExists = await access(destination).then(() => true, () => false);
  if (!destinationExists && source !== `/portraits/optimized/portrait-${index}.webp`) {
    await sharp(fileURLToPath(new URL(`..${source}`, import.meta.url)), { animated: false })
      .resize(384, 384, { fit: 'cover', position: 'centre', withoutEnlargement: false })
      .webp({ quality: 78, effort: 6, smartSubsample: true })
      .toFile(fileURLToPath(destination));
  }
  if (credits[person.id]) credits[person.id].src = `/portraits/optimized/portrait-${index}.webp`;
}

const activeIds = new Set(thinkers.map((person) => person.id));
for (const id of Object.keys(credits)) {
  if (!activeIds.has(id)) delete credits[id];
}

const backgroundSource = new URL('../public/backgrounds/milky-way-spiral.png', import.meta.url);
const backgroundDestination = new URL('../public/backgrounds/milky-way-spiral.webp', import.meta.url);
if (await access(backgroundSource).then(() => true, () => false)) {
  await sharp(fileURLToPath(backgroundSource))
    .resize({ width: 1280, height: 1280, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 76, effort: 6, smartSubsample: true })
    .toFile(fileURLToPath(backgroundDestination));
}

await writeFile(
  new URL('../src/portraitCredits.js', import.meta.url),
  `const portraitCredits = ${JSON.stringify(credits, null, 2)};\nexport default portraitCredits;\n`,
  'utf8',
);

// Optimized files have been fully written before legacy assets are removed.
for (const entry of await readdir(portraitsRoot, { withFileTypes: true })) {
  if (entry.isFile() && imageExtensions.has(extname(entry.name).toLowerCase())) {
    await rm(new URL(entry.name, portraitsRoot), { force: true, maxRetries: 8, retryDelay: 250 });
  }
}
await rm(new URL('../portraits/original/', import.meta.url), { recursive: true, force: true });
await rm(new URL('../public/backgrounds/milky-way.png', import.meta.url), { force: true, maxRetries: 8, retryDelay: 250 });
await rm(backgroundSource, { force: true, maxRetries: 8, retryDelay: 250 });

console.log(`Optimized ${thinkers.length} portraits to 384x384 WebP and compressed the active background.`);
