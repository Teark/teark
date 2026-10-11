import { readFile, writeFile } from 'node:fs/promises';
import { thinkers } from '../src/data.js';
import credits from '../src/portraitCredits.js';
import { savePortraitManifest } from './portrait-manifest.mjs';

const candidateFile = process.argv[2] || '../portraits/selected-web-candidates.json';
const candidates = JSON.parse(await readFile(new URL(candidateFile, import.meta.url)));
const unsuitable = new Set(['老童', '太虚印顺', '虚云本焕', '张正常', '张留孙', '张清志', '葛巢甫', '彭蒙', '董仲舒贾谊', '公都子']);
for (const person of thinkers) if (unsuitable.has(person.name) && credits[person.id]?.src?.startsWith('/portraits/selected-')) delete credits[person.id];
let cursor = 0;
async function worker() {
  while (cursor < candidates.length) {
    const entry = candidates[cursor++];
    const person = thinkers.find(person => person.name === entry.name) || { id: `component-${entry.name}`, name: entry.name };
    if (unsuitable.has(entry.name) || entry.name === '威廉潘恩' && /Sir William/i.test(entry.choices?.[0]?.title || '')) continue;
    if (credits[person.id]) continue;
    for (const choice of entry.choices || []) {
      try {
        const response = await fetch(choice.url, { headers: { 'User-Agent': 'Mozilla/5.0', Referer: choice.page }, signal: AbortSignal.timeout(8000) });
        if (!response.ok) { entry.error = `HTTP ${response.status}`; continue; }
        const bytes = new Uint8Array(await response.arrayBuffer());
        const prefix = new TextDecoder().decode(bytes.subarray(0, 600));
        const extension = bytes[0] === 0xff && bytes[1] === 0xd8 ? 'jpg' : bytes[0] === 0x89 && prefix.includes('PNG') ? 'png' : prefix.startsWith('GIF8') ? 'gif' : prefix.startsWith('RIFF') && prefix.includes('WEBP') ? 'webp' : prefix.includes('<svg') ? 'svg' : null;
        if (!extension || bytes.length < 500) { entry.error = 'Invalid image'; continue; }
        const index = thinkers.indexOf(person);
        const filename = index >= 0 ? `selected-${index}.${extension}` : `component-${candidates.indexOf(entry)}.${extension}`;
        await writeFile(new URL(`../portraits/${filename}`, import.meta.url), bytes);
        credits[person.id] = { id: person.id, src: `/portraits/${filename}`, file: choice.title, page: choice.page, artist: '来源网页见链接', license: '来源网页，许可未核实', licenseUrl: '', provider: 'Public web image search' };
        console.log(`Added ${person.name}`);
        break;
      } catch (error) { entry.error = error.message; }
    }
  }
}
await Promise.all(Array.from({ length: 8 }, worker));
await savePortraitManifest(credits);
await writeFile(new URL(candidateFile, import.meta.url), JSON.stringify(candidates, null, 2) + '\n');
console.log(`Sourced ${thinkers.filter(person => credits[person.id]).length}/1000`);
