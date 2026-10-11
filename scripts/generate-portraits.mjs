import { mkdir, writeFile } from 'node:fs/promises';
import { thinkers } from '../src/data.js';
import { portraitFilename, portraitSvg } from '../src/portrait.js';

const output = new URL('../portraits/', import.meta.url);
await mkdir(output, { recursive: true });
for (const person of thinkers) {
  const filename = `${portraitFilename(person.id)}.svg`;
  await writeFile(new URL(filename, output), portraitSvg(person.name, person.region), 'utf8');
}
console.log(`Generated ${thinkers.length} local portraits in portraits/.`);
