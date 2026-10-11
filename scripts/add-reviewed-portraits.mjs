import { writeFile, rename } from 'node:fs/promises';
import { thinkers } from '../src/data.js';
import credits from '../src/portraitCredits.js';

// Checked against the depicted-person categories and their article references.
const reviewed = [
  { name: '许由', file: 'Kano Eitoku 008.jpg' },
  { name: '后羿', file: 'Houyi Shooting an Arrow, Xiao Yuncong.gif' },
  { name: '嫘祖', file: '黃帝妃西陵氏教民蚕（廿一史通俗衍義）.jpg' },
];
const headers = { 'User-Agent': 'GuandaoPortraitArchive/2.0 (educational local portrait archive)' };
const params = new URLSearchParams({ action: 'query', format: 'json', titles: reviewed.map(row => `File:${row.file}`).join('|'), prop: 'imageinfo', iiprop: 'url|mime|size|extmetadata', iiurlwidth: '640' });
const response = await fetch(`https://commons.wikimedia.org/w/api.php?${params}`, { headers, signal: AbortSignal.timeout(25000) });
if (!response.ok) throw new Error(`Commons HTTP ${response.status}`);
const payload = await response.json();
const files = new Map(Object.values(payload.query?.pages || {}).map(page => [page.title, page.imageinfo?.[0]]));
for (const row of reviewed) {
  const person = thinkers.find(person => person.name === row.name);
  if (!person || credits[person.id]) continue;
  const info = files.get(`File:${row.file}`);
  if (!info) continue;
  const plain = key => String(info.extmetadata?.[key]?.value || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  if (!plain('LicenseShortName') || /fair use|non.free|copyrighted/i.test(plain('LicenseShortName'))) continue;
  const original = info.size < 4_000_000;
  const extension = original ? { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/gif': 'gif' }[info.mime] : /\.([a-z0-9]+)(?:\?|$)/i.exec(info.thumburl)?.[1];
  if (!extension) continue;
  const image = await fetch(original ? info.url : info.thumburl, { headers, signal: AbortSignal.timeout(20000) });
  if (!image.ok) { console.log(`${row.name}: HTTP ${image.status}`); continue; }
  const bytes = new Uint8Array(await image.arrayBuffer());
  if (bytes.length < 500) continue;
  const filename = `reviewed-${thinkers.indexOf(person)}.${extension}`;
  await writeFile(new URL(`../portraits/${filename}`, import.meta.url), bytes);
  credits[person.id] = { id: person.id, src: `/portraits/${filename}`, file: row.file, page: info.descriptionurl, artist: plain('Artist') || '未注明', license: plain('LicenseShortName'), licenseUrl: plain('LicenseUrl') };
  console.log(`Reviewed and added ${row.name}`);
}
const temporary = new URL('../src/portraitCredits.generated.tmp', import.meta.url);
await writeFile(temporary, `const portraitCredits = ${JSON.stringify(credits, null, 2)};\nexport default portraitCredits;\n`);
await rename(temporary, new URL('../src/portraitCredits.js', import.meta.url));
