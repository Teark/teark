import { mkdir, copyFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { thinkers } from '../src/data.js';
import credits from '../src/portraitCredits.js';

const sources = new Set(thinkers.map((person, index) => credits[person.id]?.src || `/portraits/original/portrait-${index}.svg`));
for (const source of sources) {
  if (!source.startsWith('/portraits/') || source.includes('..')) throw new Error(`Unexpected portrait path: ${source}`);
  const destination = new URL(`../dist${source}`, import.meta.url);
  await mkdir(dirname(fileURLToPath(destination)), { recursive: true });
  await copyFile(new URL(`..${source}`, import.meta.url), destination);
}
console.log(`Copied ${sources.size} portrait assets into the production build.`);
