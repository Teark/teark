import { readFile, writeFile, unlink } from 'node:fs/promises';
import { basename } from 'node:path';
import portraitCredits from '../src/portraitCredits.js';

// Search results that are statues, group portraits, or a different person with
// the same name must never be presented as a verified individual portrait.
const reject = new Map([
]);

const manifestUrl = new URL('../src/portraitCredits.js', import.meta.url);
const missingUrl = new URL('../portraits/missing-portraits.json', import.meta.url);
const peopleModule = await import('../src/data.js');
const currentMissing = JSON.parse(await readFile(missingUrl, 'utf8'));
const names = new Map(peopleModule.thinkers.map((person) => [person.id, person.name]));
for (const [id, reason] of reject) {
  const entry = portraitCredits[id];
  if (!entry) continue;
  const filename = basename(entry.src);
  if (filename !== entry.src.replace('/portraits/', '')) throw new Error(`Unexpected portrait path: ${entry.src}`);
  await unlink(new URL(`../portraits/${filename}`, import.meta.url));
  delete portraitCredits[id];
  if (!currentMissing.some((item) => item.name === names.get(id))) currentMissing.push({ name: names.get(id) || id, reason });
}
await writeFile(manifestUrl, `const portraitCredits = ${JSON.stringify(portraitCredits, null, 2)};\nexport default portraitCredits;\n`, 'utf8');
await writeFile(missingUrl, `${JSON.stringify(currentMissing, null, 2)}\n`, 'utf8');
console.log(`Kept ${Object.keys(portraitCredits).length} portraits with reusable source metadata; ${currentMissing.length} still need a reliable source.`);
