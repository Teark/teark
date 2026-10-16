import { readFile, writeFile } from 'node:fs/promises';
import { thinkers } from '../src/data.js';
import credits from '../src/portraitCredits.js';

const failed = [];
const original = [];
const sources = [];
for (const [index, person] of thinkers.entries()) {
  const source = credits[person.id]?.src || `/portraits/optimized/portrait-${index}.webp`;
  sources.push({ person, source });
  try {
    const bytes = await readFile(new URL(`..${source}`, import.meta.url));
    const valid = source.endsWith('.svg') ? bytes.toString().includes('<svg') : bytes[0] === 0xff && bytes[1] === 0xd8 || bytes[0] === 0x89 && bytes.subarray(1, 4).toString() === 'PNG' || bytes.subarray(0, 4).toString() === 'RIFF';
    if (!valid && !/^GIF8[79]a/.test(bytes.subarray(0, 6).toString())) throw new Error('Invalid image signature');
    if (credits[person.id] && (!credits[person.id].page || !credits[person.id].license)) throw new Error('Missing source or license');
    if (!credits[person.id]) original.push({ id: person.id, name: person.name, src: source, type: 'original-illustration', description: '原创示意插画，非历史肖像' });
  } catch (error) { failed.push({ id: person.id, name: person.name, source, reason: error.message }); }
}
if (process.argv.includes('--http')) {
  let cursor = 0;
  async function worker() {
    while (cursor < sources.length) {
      const { person, source } = sources[cursor++];
      try {
        const response = await fetch(`http://localhost:5173${source}`, { signal: AbortSignal.timeout(10000) });
        if (!response.ok || !response.headers.get('content-type')?.startsWith('image/')) throw new Error(`HTTP ${response.status} ${response.headers.get('content-type')}`);
        await response.arrayBuffer();
      } catch (error) { failed.push({ id: person.id, name: person.name, source, reason: error.message }); }
    }
  }
  await Promise.all(Array.from({ length: 8 }, worker));
}
const report = { total: thinkers.length, sourced: thinkers.length - original.length - failed.length, original: original.length, missing: failed.length, originalIllustrations: original };
await writeFile(new URL('../portraits/coverage.json', import.meta.url), JSON.stringify(report, null, 2) + '\n');
await writeFile(new URL('../portraits/needs-sourced-portrait.json', import.meta.url), JSON.stringify(original.map(({ id, name }) => ({ id, name, status: '示意插画，尚未补齐对应人物形象' })), null, 2) + '\n');
await writeFile(new URL('../portraits/missing-portraits.json', import.meta.url), JSON.stringify(failed, null, 2) + '\n');
console.log(JSON.stringify({ total: report.total, sourced: report.sourced, original: report.original, missing: report.missing }));
if (thinkers.length !== 1000 || failed.length) process.exitCode = 1;
