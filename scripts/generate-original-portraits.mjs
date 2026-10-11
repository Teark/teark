import { mkdir, writeFile } from 'node:fs/promises';
import { thinkers } from '../src/data.js';
import { portraitSvg } from '../src/portrait.js';

const directory = new URL('../portraits/original/', import.meta.url);
await mkdir(directory, { recursive: true });
for (const [index, person] of thinkers.entries()) {
  await writeFile(new URL(`portrait-${index}.svg`, directory), portraitSvg(person.name, person.region, person.role));
}
console.log(`Saved ${thinkers.length} individually named original SVG illustrations (not historical portraits).`);
