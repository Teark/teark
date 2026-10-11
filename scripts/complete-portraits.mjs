import { mkdir, writeFile, access, readFile, rename } from 'node:fs/promises';
import { thinkers } from '../src/data.js';
import existingCredits from '../src/portraitCredits.js';

const credits = { ...existingCredits };
const audit = [];
const aliases = { '毛主席': '毛泽东', '有巢': '有巢氏', '燧人': '燧人氏', '禹': '大禹', '契': '契 (商朝)', '龙': '龙 (神话)', '地藏菩萨': '地藏菩萨', '王守仁': '王阳明', '孟轲': '孟子', '庄周': '庄子', '列御寇': '列子', '孙武': '孙子', '马可奥勒留': '马可·奥勒留', '圣雄甘地': '甘地', '特蕾莎修女': '德兰修女', '汉娜阿伦特': '汉娜·阿伦特', '西蒙娜德波伏娃': '西蒙娜·德·波伏娃' };
const headers = { 'User-Agent': 'GuandaoPortraitArchive/2.0 (educational local image archive)' };
async function request(url, binary = false) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await fetch(url, { headers, signal: AbortSignal.timeout(25000) });
      if (binary && response.status === 429) throw new Error('HTTP 429 (deferred for a later retry)');
      if (response.status === 429 || response.status === 503) {
        const delay = Math.min(60000, (Number(response.headers.get('retry-after')) || 15 * (attempt + 1)) * 1000);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return binary ? new Uint8Array(await response.arrayBuffer()) : await response.json();
    } catch (error) {
      if (binary && /429/.test(error.message)) throw error;
      if (attempt === 2) throw error;
      await new Promise(resolve => setTimeout(resolve, 1500 * (attempt + 1)));
    }
  }
}
function api(host, params) { return `https://${host}/w/api.php?${new URLSearchParams({ action: 'query', format: 'json', ...params })}`; }
function plain(metadata, key) { return String(metadata?.[key]?.value || '').replace(/<[^>]*>/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim(); }
async function save() {
  const temporary = new URL('../src/portraitCredits.generated.tmp', import.meta.url);
  await writeFile(temporary, `const portraitCredits = ${JSON.stringify(credits, null, 2)};\nexport default portraitCredits;\n`);
  await rename(temporary, new URL('../src/portraitCredits.js', import.meta.url));
  await writeFile(new URL('../portraits/sourcing-audit.json', import.meta.url), JSON.stringify(audit, null, 2) + '\n');
}
await mkdir(new URL('../portraits/', import.meta.url), { recursive: true });
for (const [id, credit] of Object.entries(credits)) {
  try { await access(new URL(`..${credit.src}`, import.meta.url)); } catch { delete credits[id]; }
}
const pending = thinkers.filter(p => !credits[p.id]);
for (let start = 0; start < pending.length; start += 40) {
  const batch = pending.slice(start, start + 40);
  const titles = batch.map(p => aliases[p.name] || p.name);
  let payload;
  try { payload = await request(api('zh.wikipedia.org', { titles: [...new Set(titles)].join('|'), redirects: '1', converttitles: '1', prop: 'pageimages|pageprops', piprop: 'name|original', ppprop: 'disambiguation' })); }
  catch (error) { batch.forEach(person => audit.push({ id: person.id, name: person.name, status: 'request-failed', reason: error.message })); console.log(`Batch ${start}: ${error.message}`); await save(); continue; }
  const mapping = new Map([...payload.query?.normalized || [], ...payload.query?.converted || [], ...payload.query?.redirects || []].map(row => [row.from, row.to]));
  const pages = new Map(Object.values(payload.query?.pages || {}).map(p => [p.title, p]));
  const candidates = batch.flatMap((person, i) => {
    let title = titles[i]; const seen = new Set();
    while (mapping.has(title) && !seen.has(title)) { seen.add(title); title = mapping.get(title); }
    const page = pages.get(title);
    if (!page?.pageimage || page.pageprops?.disambiguation !== undefined) { audit.push({ id: person.id, name: person.name, status: 'no-article-image', article: title }); return []; }
    if (/logo|flag|map|signature|coat.of.arms|書法|书法|印章|签名|簽名|墓|陵|temple|tomb|grave|landscape|building/i.test(page.pageimage)) { audit.push({ id: person.id, name: person.name, status: 'unsuitable-image', file: page.pageimage }); return []; }
    return [{ person, article: title, file: `File:${page.pageimage}` }];
  });
  if (candidates.length) {
    let images;
    try { images = await request(api('commons.wikimedia.org', { titles: [...new Set(candidates.map(c => c.file))].join('|'), prop: 'imageinfo', iiprop: 'url|mime|extmetadata', iiurlwidth: '500' })); }
    catch (error) { console.log(`Commons ${start}: ${error.message}`); continue; }
    const files = new Map(Object.values(images.query?.pages || {}).map(p => [p.title, p]));
    for (const normalized of images.query?.normalized || []) {
      if (files.has(normalized.to)) files.set(normalized.from, files.get(normalized.to));
    }
    let cursor = 0;
    async function worker() {
      while (cursor < candidates.length) {
        const candidate = candidates[cursor++];
        const info = (files.get(candidate.file) || files.get(candidate.file.replaceAll('_', ' ')))?.imageinfo?.[0];
        const license = plain(info?.extmetadata, 'LicenseShortName');
        if (!info || !license || /fair use|non.free|copyrighted/i.test(license)) { audit.push({ id: candidate.person.id, name: candidate.person.name, status: 'no-reusable-file', file: candidate.file }); continue; }
        const url = info.thumburl || info.url;
        const extension = info.thumburl ? (/\.([a-z0-9]+)(?:\?|$)/i.exec(url)?.[1] || 'jpg') : ({ 'image/jpeg': 'jpg', 'image/png': 'png', 'image/svg+xml': 'svg', 'image/webp': 'webp', 'image/gif': 'gif' }[info.mime]);
        if (!['jpg', 'jpeg', 'png', 'svg', 'webp', 'gif'].includes(extension)) continue;
        const filename = `roster-${thinkers.indexOf(candidate.person)}.${extension}`;
        try {
          const destination = new URL(`../portraits/${filename}`, import.meta.url);
          const cached = await readFile(destination).catch(() => null);
          const bytes = cached?.length > 500 ? cached : await request(url, true);
          if (bytes.length < 500) throw new Error('Empty or unusably small image');
          await writeFile(new URL(`../portraits/${filename}`, import.meta.url), bytes);
          credits[candidate.person.id] = { id: candidate.person.id, src: `/portraits/${filename}`, file: candidate.file.slice(5), page: info.descriptionurl || `https://commons.wikimedia.org/wiki/${encodeURIComponent(candidate.file)}`, article: `https://zh.wikipedia.org/wiki/${encodeURIComponent(candidate.article)}`, artist: plain(info.extmetadata, 'Artist') || '未注明', license, licenseUrl: plain(info.extmetadata, 'LicenseUrl') };
          audit.push({ id: candidate.person.id, name: candidate.person.name, status: 'downloaded', file: candidate.file });
          console.log(`Added ${candidate.person.name}`);
          await save();
        } catch (error) { audit.push({ id: candidate.person.id, name: candidate.person.name, status: 'download-failed', file: candidate.file, reason: error.message }); console.log(`${candidate.person.name}: ${error.message}`); }
        await new Promise(resolve => setTimeout(resolve, 350));
      }
    }
    await worker();
  }
  await save();
  console.log(`Checked ${Math.min(start + 40, pending.length)}/${pending.length}; covered ${thinkers.filter(p => credits[p.id]).length}/1000`);
  await new Promise(resolve => setTimeout(resolve, 2000));
}
await save();
console.log('Portrait archive saved.');
