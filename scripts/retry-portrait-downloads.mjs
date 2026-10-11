import { readFile, writeFile, rename } from 'node:fs/promises';
import { thinkers } from '../src/data.js';
import credits from '../src/portraitCredits.js';

const audit = JSON.parse(await readFile(new URL('../portraits/sourcing-audit.json', import.meta.url)));
const pending = audit.filter(row => row.status === 'download-failed' && !credits[row.id]);
const headers = { 'User-Agent': 'GuandaoPortraitArchive/2.0 (educational local archive)' };
for (let start = 0; start < pending.length; start += 40) {
  const batch = pending.slice(start, start + 40);
  const params = new URLSearchParams({ action: 'query', format: 'json', titles: [...new Set(batch.map(row => row.file.replaceAll('_', ' ')))].join('|'), prop: 'imageinfo', iiprop: 'url|size|mime|extmetadata', iiurlwidth: '640' });
  const response = await fetch(`https://commons.wikimedia.org/w/api.php?${params}`, { headers, signal: AbortSignal.timeout(20000) });
  if (!response.ok) { console.log(`Metadata HTTP ${response.status}`); continue; }
  const payload = await response.json();
  const files = new Map(Object.values(payload.query?.pages || {}).map(page => [page.title, page.imageinfo?.[0]]));
  for (const row of batch) {
    const info = files.get(row.file.replaceAll('_', ' '));
    if (!info) continue;
    const plain = key => String(info.extmetadata?.[key]?.value || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    const license = plain('LicenseShortName');
    if (!license || /fair use|non.free|copyrighted/i.test(license)) continue;
    const original = info.size < 4_000_000;
    const url = original ? info.url : info.thumburl;
    const extension = original ? { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/gif': 'gif', 'image/webp': 'webp', 'image/svg+xml': 'svg' }[info.mime] : /\.([a-z0-9]+)(?:\?|$)/i.exec(url)?.[1];
    if (!['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(extension)) continue;
    try {
      const image = await fetch(url, { headers, signal: AbortSignal.timeout(15000) });
      if (!image.ok) throw new Error(`HTTP ${image.status}`);
      const bytes = new Uint8Array(await image.arrayBuffer());
      const text = new TextDecoder().decode(bytes.subarray(0, 500));
      if (!((bytes[0] === 0xff && bytes[1] === 0xd8) || bytes[0] === 0x89 || text.startsWith('GIF8') || text.includes('<svg') || text.startsWith('RIFF'))) throw new Error('Invalid image');
      const personIndex = thinkers.findIndex(person => person.id === row.id);
      const filename = `roster-${personIndex}-verified.${extension}`;
      await writeFile(new URL(`../portraits/${filename}`, import.meta.url), bytes);
      credits[row.id] = { id: row.id, src: `/portraits/${filename}`, file: row.file.slice(5), page: info.descriptionurl, artist: plain('Artist') || '未注明', license, licenseUrl: plain('LicenseUrl') };
      row.status = 'downloaded-on-retry';
      delete row.reason;
      const temporary = new URL('../src/portraitCredits.generated.tmp', import.meta.url);
      await writeFile(temporary, `const portraitCredits = ${JSON.stringify(credits, null, 2)};\nexport default portraitCredits;\n`);
      await rename(temporary, new URL('../src/portraitCredits.js', import.meta.url));
      console.log(`Recovered ${row.name}`);
    } catch (error) { row.reason = error.message; console.log(`Pending ${row.name}: ${error.message}`); }
    await new Promise(resolve => setTimeout(resolve, 500));
  }
}
await writeFile(new URL('../portraits/sourcing-audit.json', import.meta.url), JSON.stringify(audit, null, 2) + '\n');
