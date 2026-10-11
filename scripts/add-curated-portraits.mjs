import { mkdir, readFile, writeFile } from 'node:fs/promises';
import portraitCredits from '../src/portraitCredits.js';

const endpoint = 'https://commons.wikimedia.org/w/api.php';
const curated = [
  { id: 'laozi', title: 'File:Laozi by Muqi (Okayama Prefectural Museum of Art).jpeg' },
  { id: 'wangyangming', title: 'File:蔡世新 王阳明肖像轴 (cropped).jpg' },
  { id: '荀子-2', title: 'File:Portrait of Xun Zi.jpg' },
  { id: '孙子-5', title: 'File:吴司马孙武.jpg' },
  { id: '慧能-13', title: 'File:Unkoku Tōeki 雲谷等益 - Huineng, the Sixth Patriarch of Zen, with Geese and Myna - 2021.398.14a–c - Metropolitan Museum of Art.jpg' },
  { id: '陆九渊-22', title: 'File:陸九淵.jpg' },
  { id: '克尔凯郭尔-87', title: 'File:Kierkegaard portrait.jpg' },
  { id: '第欧根尼-64', title: 'File:Diogenes, bust-length, and turned to the right, holding a lantern MET DP836615.jpg' },
  { id: '斯宾诺莎-78', title: 'File:Spinoza.jpg' },
  { id: '列子-7', title: 'File:列子図襖-The Daoist Immortal Liezi MET DT6105.jpg' },
  { id: 'cn-curated-3', title: 'File:云南甲马-文昌帝君.jpg' },
  { id: 'cn-curated-11', title: 'File:Statue of Zhang Sanfeng.jpg' },
  { id: '老子骑牛-34', title: 'File:Zhang Lu-Laozi Riding an Ox.jpg' },
  { id: '妈祖-35', title: 'File:Mazu.jpg' },
  { id: '张载-33', title: 'File:至聖先賢半身像 冊-115-張載.jpg' },
  { id: '陀思妥耶夫斯基-89', title: 'File:Dostoevsky 1872.jpg' },
  { id: '辛弃疾-23', title: 'File:The statue of Xin Qiji.JPG' },
];
function value(metadata, key) {
  return String(metadata?.[key]?.value || '').replace(/<[^>]*>/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
}
const params = new URLSearchParams({
  action: 'query', format: 'json', titles: curated.map((item) => item.title).join('|'),
  prop: 'imageinfo', iiprop: 'url|extmetadata', iiurlwidth: '640',
});
const response = await fetch(`${endpoint}?${params}`, { headers: { 'User-Agent': 'GuandaoPortraitArchive/1.0 (offline educational portrait pack)' } });
if (!response.ok) throw new Error(`Wikimedia API returned ${response.status}`);
const payload = await response.json();
const pageByTitle = new Map(Object.values(payload.query?.pages || {}).map((page) => [page.title, page]));
await mkdir(new URL('../portraits/', import.meta.url), { recursive: true });
for (const portrait of curated) {
  const page = pageByTitle.get(portrait.title);
  const info = page?.imageinfo?.[0];
  if (!info?.thumburl) throw new Error(`Could not retrieve ${portrait.title}`);
  const metadata = info.extmetadata || {};
  const license = value(metadata, 'LicenseShortName');
  if (!license || /fair use|non-free|copyrighted/i.test(license)) throw new Error(`No reusable license for ${portrait.title}`);
  const imageResponse = await fetch(info.thumburl, { headers: { 'User-Agent': 'GuandaoPortraitArchive/1.0 (offline educational portrait pack)' } });
  if (!imageResponse.ok) throw new Error(`Could not download ${portrait.title}`);
  const filename = `${portrait.id}.jpg`;
  await writeFile(new URL(`../portraits/${filename}`, import.meta.url), new Uint8Array(await imageResponse.arrayBuffer()));
  portraitCredits[portrait.id] = {
    id: portrait.id,
    src: `/portraits/${filename}`,
    file: page.title.replace(/^File:/, ''),
    page: info.descriptionurl || info.descriptionpage || `https://commons.wikimedia.org/wiki/${encodeURIComponent(page.title.replace(/^File:/, '').replace(/ /g, '_'))}`,
    artist: value(metadata, 'Artist') || value(metadata, 'Credit') || '未注明',
    license,
    licenseUrl: value(metadata, 'LicenseUrl'),
  };
}
await writeFile(new URL('../src/portraitCredits.js', import.meta.url), `const portraitCredits = ${JSON.stringify(portraitCredits, null, 2)};\nexport default portraitCredits;\n`, 'utf8');
const missingUrl = new URL('../portraits/missing-portraits.json', import.meta.url);
const missing = JSON.parse(await readFile(missingUrl, 'utf8'));
const recovered = new Set(curated.map(({ id }) => id));
const names = new Map([['laozi', '老子'], ['wangyangming', '王阳明'], ['荀子-2', '荀子'], ['孙子-5', '孙子'], ['慧能-13', '慧能'], ['陆九渊-22', '陆九渊'], ['克尔凯郭尔-87', '克尔凯郭尔'], ['第欧根尼-64', '第欧根尼'], ['斯宾诺莎-78', '斯宾诺莎'], ['列子-7', '列子'], ['cn-curated-3', '文昌帝君'], ['cn-curated-11', '张三丰'], ['老子骑牛-34', '老子骑牛'], ['妈祖-35', '妈祖'], ['张载-33', '张载'], ['陀思妥耶夫斯基-89', '陀思妥耶夫斯基'], ['辛弃疾-23', '辛弃疾']]);
await writeFile(missingUrl, `${JSON.stringify(missing.filter((item) => ![...recovered].some((id) => names.get(id) === item.name)), null, 2)}\n`, 'utf8');
console.log(`Added ${curated.length} curated historical portraits.`);
