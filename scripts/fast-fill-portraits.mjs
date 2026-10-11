import { writeFile, readFile } from 'node:fs/promises';
import { thinkers } from '../src/data.js';
import credits from '../src/portraitCredits.js';
import { savePortraitManifest } from './portrait-manifest.mjs';

// Exclude known namesakes, uncertain attributions, and objects without a face.
const excluded = ['女魃', '以斯拉', '保罗', '哈菲兹', '福柏', '阿肯那顿', '西格鲁德', '使徒托马斯', '使徒西门'];
for (const person of thinkers) if (excluded.includes(person.name) && credits[person.id]?.provider && credits[person.id].provider !== 'Public web image search') delete credits[person.id];
const englishTerms = JSON.parse(await readFile(new URL('../portraits/identity-search-terms.json', import.meta.url), 'utf8').catch(() => '{}'));
const samePeople = { '伊本鲁世': '阿维罗伊', '伊本西那': '伊本·西那', '丹麦克尔凯郭尔': '克尔凯郭尔', '曹国舅曹景休': '曹国舅', '蓝采和何晓云': '蓝采和', '铁拐李李玄': '铁拐李', '韩湘子韩湘': '韩湘子', '何仙姑何琼': '何仙姑', '张紫阳': '张伯端', '许由尧时': '许由', '陈抟老祖': '陈抟' };
for (const person of thinkers) {
  const original = thinkers.find(other => other.name === samePeople[person.name]);
  if (!credits[person.id] && original && credits[original.id]) credits[person.id] = { ...credits[original.id], id: person.id, identityAliasOf: original.id };
}
const aliases = { '许由尧时': '许由', '隐士巢父': '巢父', '陈抟老祖': '陈抟', '济公道济': '济公', '列御寇': '列子', '淮南王刘安': '刘安', '光武帝刘秀': '刘秀', '丹麦克尔凯郭尔': '克尔凯郭尔', '耶稣会士利玛窦': '利玛窦', '祆教琐罗亚斯德': '琐罗亚斯德', '曹国舅曹景休': '曹国舅', '铁拐李李玄': '铁拐李', '韩湘子韩湘': '韩湘子', '何仙姑何琼': '何仙姑', '张紫阳': '张伯端', '方济各沙勿略': '沙勿略' };
const pending = thinkers.filter(person => !credits[person.id]);
const headers = { 'User-Agent': 'Mozilla/5.0', Accept: 'image/avif,image/webp,image/png,image/jpeg,*/*' };
const audit = [];
let cursor = 0;
let finished = 0;
let queue = Promise.resolve();
function persist() {
  const snapshot = structuredClone(credits);
  queue = queue.then(() => savePortraitManifest(snapshot));
  return queue;
}
function plain(value = '') { return String(value).replace(/<[^>]*>/g, '').replace(/&quot;/g, '"').replace(/&amp;/g, '&'); }
const comparable = value => plain(value).replace(/[\uE000-\uE0FF]/g, '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
async function search(name) {
  const query = `${name} 画像`;
  const params = new URLSearchParams({ tn: 'resultjson_com', ipn: 'rj', word: query, queryWord: query, pn: '0', rn: '15' });
  const response = await fetch(`https://image.baidu.com/search/acjson?${params}`, { headers, signal: AbortSignal.timeout(8000) });
  if (!response.ok) throw new Error(`Search HTTP ${response.status}`);
  const raw = await response.text();
  const payload = JSON.parse(raw.replace(/\\(?!["\\/bfnrtu])/g, '\\\\'));
  return (payload.data || []).filter(row => row.thumbURL && !row.isVideoSource && plain(row.fromPageTitle || row.fromPageTitleEnc).includes(name) && !/试题|考试|答案|手机壁纸|书法作品|书籍封面/.test(plain(row.fromPageTitle || row.fromPageTitleEnc)) && Number(row.width) >= 100 && Number(row.height) >= 100 && Number(row.width) / Number(row.height) > .35 && Number(row.width) / Number(row.height) < 2).map(row => ({ url: row.thumbURL, title: plain(row.fromPageTitle || row.fromPageTitleEnc), page: row.replaceUrl?.[0]?.FromURL || row.replaceUrl?.[0]?.FromUrl || `https://image.baidu.com/search/index?${new URLSearchParams({ tn: 'baiduimage', word: query })}`, query }));
}
async function bing(name) {
  const query = `${name} 肖像`;
  const response = await fetch(`https://www.bing.com/images/search?${new URLSearchParams({ q: query })}`, { headers, signal: AbortSignal.timeout(8000) });
  if (!response.ok) return [];
  const html = await response.text();
  return [...html.matchAll(/\bm="([^"\n]*&quot;murl&quot;[^"\n]*)"/g)].flatMap(match => {
    try {
      const row = JSON.parse(plain(match[1]));
      return comparable(`${row.t || ''} ${row.desc || ''}`).includes(comparable(name)) && row.turl ? [{ url: row.turl, title: plain(row.t), page: row.purl, query }] : [];
    } catch { return []; }
  });
}
async function worker() {
  while (cursor < pending.length) {
    const person = pending[cursor++];
    const name = aliases[person.name] || person.name;
    const entry = { id: person.id, name: person.name, status: 'no-image' };
    audit.push(entry);
    try {
      let candidates = await search(name).catch(() => []);
      if (!candidates.length) candidates = await bing(name);
      if (!candidates.length && englishTerms[person.name]) {
        for (const term of englishTerms[person.name].slice(0, 2)) {
          candidates = await bing(term).catch(() => []);
          if (candidates.length) break;
        }
      }
      for (const candidate of candidates.slice(0, 4)) {
        try {
          const response = await fetch(candidate.url, { headers, signal: AbortSignal.timeout(6000) });
          if (!response.ok) continue;
          const bytes = new Uint8Array(await response.arrayBuffer());
          const prefix = new TextDecoder().decode(bytes.subarray(0, 12));
          const extension = bytes[0] === 0xff && bytes[1] === 0xd8 ? 'jpg' : bytes[0] === 0x89 && prefix.includes('PNG') ? 'png' : prefix.startsWith('GIF8') ? 'gif' : prefix.startsWith('RIFF') && prefix.includes('WEBP') ? 'webp' : null;
          if (!extension || bytes.length < 500) continue;
          const filename = `web-${thinkers.indexOf(person)}.${extension}`;
          await writeFile(new URL(`../portraits/${filename}`, import.meta.url), bytes);
          credits[person.id] = { id: person.id, src: `/portraits/${filename}`, file: candidate.title, page: candidate.page, artist: '来源网页见链接', license: '来源网页，许可未核实', licenseUrl: '', provider: 'Public web image search', searchQuery: candidate.query, verification: '搜索结果标题包含对应人物名' };
          entry.status = 'downloaded'; entry.selected = candidate;
          break;
        } catch { /* Try the next image rather than blocking the batch. */ }
      }
    } catch (error) { entry.error = error.message; }
    finished++;
    await persist();
    if (finished % 20 === 0 || finished === pending.length) console.log(`Checked ${finished}/${pending.length}; sourced ${thinkers.filter(person => credits[person.id]).length}/1000`);
  }
}
await Promise.all(Array.from({ length: 8 }, worker));
await persist();
await writeFile(new URL('../portraits/web-sourcing-audit.json', import.meta.url), JSON.stringify(audit, null, 2) + '\n');
console.log('Fast public image fill complete.');
