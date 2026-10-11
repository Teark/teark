import { mkdir, writeFile } from 'node:fs/promises';
import { extname } from 'node:path';
import { thinkers } from '../src/data.js';
import portraitCredits from '../src/portraitCredits.js';
import { portraitFilename } from '../src/portrait.js';

const endpoint = 'https://commons.wikimedia.org/w/api.php';
const imageDirectory = new URL('../portraits/', import.meta.url);
const manifestPath = new URL('../src/portraitCredits.js', import.meta.url);
const terms = {
  '庄子': 'Zhuangzi', '老子': 'Laozi', '孔子': 'Confucius', '释迦牟尼': 'Gautama Buddha', '杨朱': 'Yang Zhu philosopher',
  '苏格拉底': 'Socrates', '柏拉图': 'Plato', '亚里士多德': 'Aristotle',
  '马可·奥勒留': 'Marcus Aurelius', '耶稣': 'Jesus Christ', '毕达哥拉斯': 'Pythagoras', '赫拉克利特': 'Heraclitus',
  '德谟克利特': 'Democritus', '伊壁鸠鲁': 'Epicurus', '第欧根尼': 'Diogenes of Sinope', '塞涅卡': 'Seneca',
  '普罗提诺': 'Plotinus', '奥古斯丁': 'Augustine of Hippo', '伊本·西那': 'Avicenna', '阿维罗伊': 'Averroes',
  '鲁米': 'Rumi', '但丁': 'Dante Alighieri', '埃克哈特': 'Meister Eckhart', '伊拉斯谟': 'Desiderius Erasmus',
  '马基雅维利': 'Niccolo Machiavelli', '蒙田': 'Michel de Montaigne', '培根': 'Francis Bacon philosopher',
  '笛卡尔': 'Rene Descartes', '斯宾诺莎': 'Baruch Spinoza', '洛克': 'John Locke philosopher',
  '莱布尼茨': 'Gottfried Wilhelm Leibniz', '康德': 'Immanuel Kant', '卢梭': 'Jean-Jacques Rousseau',
  '伏尔泰': 'Voltaire', '亚当·斯密': 'Adam Smith', '黑格尔': 'Georg Wilhelm Friedrich Hegel',
  '叔本华': 'Arthur Schopenhauer', '克尔凯郭尔': 'Soren Kierkegaard', '马克思': 'Karl Marx',
  '陀思妥耶夫斯基': 'Fyodor Dostoevsky', '托尔斯泰': 'Leo Tolstoy', '甘地': 'Mahatma Gandhi', '荣格': 'Carl Jung',
  '尼采': 'Friedrich Nietzsche', '严复': 'Yan Fu', '王阳明': 'Wang Yangming',
  '庚桑楚': 'Gengsang Chu', '文昌帝君': 'Wenchang Wang', '观音': 'Guanyin', '仓颉': 'Cangjie', '大禹': 'Yu the Great',
  '许由': 'Xu You', '葛洪': 'Ge Hong', '张三丰': 'Zhang Sanfeng', '王重阳': 'Wang Chongyang', '丘处机': 'Qiu Chuji',
  '李叔同': 'Li Shutong', '荀子': 'Xunzi', '韩非': 'Han Fei', '孙子': 'Sun Tzu', '列子': 'Liezi', '司马迁': 'Sima Qian',
  '慧能': 'Huineng', '玄奘': 'Xuanzang', '苏轼': 'Su Shi', '程颢': 'Cheng Hao', '陆九渊': 'Lu Jiuyuan',
  '辛弃疾': 'Xin Qiji', '顾炎武': 'Gu Yanwu', '唐君毅': 'Tang Junyi', '张载': 'Zhang Zai', '妈祖': 'Mazu',
  '耶稣': 'Jesus Christ', '第欧根尼': 'Diogenes of Sinope', '塞涅卡': 'Lucius Annaeus Seneca', '但丁': 'Dante Alighieri',
  '培根': 'Francis Bacon', '陀思妥耶夫斯基': 'Fyodor Dostoevsky', '王阳明': 'Wang Yangming',
};

function field(metadata, key) {
  const value = metadata?.[key]?.value || '';
  return value.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
}
function scorePage(page, term) {
  const title = `${page.title} ${field(page.imageinfo?.[0]?.extmetadata, 'ImageDescription')}`.toLowerCase();
  const tokens = term.toLowerCase().split(/[^\p{L}\p{N}]+/u).filter((word) => word && !['philosopher', 'saint', 'the'].includes(word));
  const matching = tokens.filter((word) => title.includes(word));
  if (!matching.length) return -100;
  if (tokens.length > 1 && matching.length < tokens.length) return -100;
  if (/\b(book|volume|chapter|page|scan|catalog|catalogue|map|diagram|family tree|tomb|temple|archive|panoramio|school|park|puppet|meeting|legend|story|monument|memorial|statue|bust|sculpture|relief|bronze|marble|colosseum|group of|five men|twenty portraits|portraits of|album of|donatress|donor|church|palazzo|inv\d|massimo|magu|jatayou|qian zai|four existential)\b|卷[一二三四五六七八九十]|小学|國小|中学|中學|学院|學院|学校|學校|陵|全景|风景|風景|皮影|会见|會見|雕像|群像|合影|供养人|供養人|教堂/i.test(title)) return -100;
  const isPortrait = /portrait|肖像|画像|畫像|人像|畫像石|畫傳/.test(title);
  const art = isPortrait ? 88 : /painting|engraving|fresco|etching|lithograph|drawing|绘像|繪像|版画|版畫|画传|畫傳/.test(title) ? 38 : 0;
  if (!art) return -100;
  const complete = tokens.length > 1 && matching.length === tokens.length ? 30 : 0;
  return matching.length * 20 + complete + art;
}
async function fetchWithRetry(url) {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const response = await fetch(url, { headers: { 'User-Agent': 'GuandaoPortraitArchive/1.0 (offline educational portrait pack)' } });
    if (response.ok) return response;
    if (![429, 503].includes(response.status) || attempt === 4) throw new Error(`Wikimedia API returned ${response.status}`);
    const retryAfter = Number(response.headers.get('retry-after')) || (2 ** (attempt + 1));
    await new Promise((resolve) => setTimeout(resolve, retryAfter * 1000));
  }
}
async function request(url) { return (await fetchWithRetry(url)).json(); }
const rejectedImage = /statue|bust|sculpture|relief|monument|memorial|temple|tomb|grave|museum|building|landscape|map|diagram|book|manuscript|calligraphy|seal|coin|stamp|flag|logo|poster|street|park|mountain|donatress|donor|group|album of|inv\d|massimo|pio.?clemetino|palazzo|church|colosseum|jatayou|magu|thought to be|four existential|雕像|塑像|雕塑|纪念碑|陵|寺|庙|墓|博物馆|建筑|风景|地图|书影|手稿|书法|印章|钱币|邮票|旗帜|标志|海报|街道|公园|山景|供养人|群像|合影|教堂|宫殿/i;
async function articleImage(person) {
  const params = new URLSearchParams({ action: 'query', format: 'json', titles: person.name, prop: 'pageimages', piprop: 'thumbnail|original|name', pithumbsize: '640' });
  const payload = await request(`https://zh.wikipedia.org/w/api.php?${params}`);
  const article = Object.values(payload.query?.pages || {})[0];
  const imageName = article?.original?.source ? article.pageimage : '';
  if (!imageName || rejectedImage.test(imageName)) return null;
  const fileTitle = `File:${imageName}`;
  const infoParams = new URLSearchParams({ action: 'query', format: 'json', titles: fileTitle, prop: 'imageinfo', iiprop: 'url|extmetadata', iiurlwidth: '640' });
  const infoPayload = await request(`${endpoint}?${infoParams}`);
  const page = Object.values(infoPayload.query?.pages || {})[0];
  const info = page?.imageinfo?.[0];
  if (!info?.thumburl || rejectedImage.test(`${imageName} ${field(info.extmetadata, 'ImageDescription')}`)) return null;
  return { title: fileTitle, imageinfo: [info], score: 200 };
}
async function findPage(person) {
  const term = terms[person.name] || person.name;
  const fromArticle = await articleImage(person).catch(() => null);
  if (fromArticle) return { term, page: fromArticle };
  const searchTerms = person.name === '老子' ? ['Laozi portrait', 'Lao Tzu portrait', 'Laozi', 'Lao Tzu'] : person.name === '庄子' ? ['Zhuang Zhou portrait', 'Zhuangzi portrait', 'Zhuangzi'] : person.name === '王阳明' ? ['Wang Yang-ming portrait', 'Wang Yangming portrait'] : /[\u3400-\u9fff]/.test(term) ? [term] : [`${term} portrait`, term];
  const pages = [];
  for (const search of searchTerms) {
    const params = new URLSearchParams({
      action: 'query', format: 'json', generator: 'search', gsrsearch: search,
      gsrnamespace: '6', gsrlimit: '30', prop: 'imageinfo', iiprop: 'url|extmetadata', iiurlwidth: '640',
    });
    const payload = await request(`${endpoint}?${params}`);
    pages.push(...Object.values(payload.query?.pages || {}));
    await new Promise((resolve) => setTimeout(resolve, 1000));
    if (pages.some((page) => scorePage(page, term) >= 100)) break;
  }
  const matches = pages
    .filter((page) => page.imageinfo?.[0]?.thumburl && /\.(jpe?g|png|webp)$/i.test(page.title) && /\.(jpe?g|png|webp)$/i.test(new URL(page.imageinfo[0].thumburl).pathname))
    .map((page) => ({ ...page, score: scorePage(page, term) }))
    .filter((page) => page.score >= 20)
    .sort((a, b) => b.score - a.score);
  return { term, page: matches[0] };
}
async function download(person) {
  const { term, page } = await findPage(person);
  if (!page) return { person, missing: true, term };
  const info = page.imageinfo[0];
  const metadata = info.extmetadata || {};
  const license = field(metadata, 'LicenseShortName');
  if (!license || /fair use|non-free|copyrighted/i.test(license)) return { person, missing: true, term, reason: license || 'no license metadata' };
  const url = info.thumburl;
  let response;
  try { response = await fetchWithRetry(url); } catch (error) { return { person, missing: true, term, reason: error.message }; }
  const extension = extname(new URL(url).pathname).toLowerCase();
  const filename = `${portraitFilename(person.id)}${extension}`;
  await writeFile(new URL(filename, imageDirectory), new Uint8Array(await response.arrayBuffer()));
  return {
    id: person.id,
    src: `/portraits/${filename}`,
    file: page.title.replace(/^File:/, ''),
    page: info.descriptionpage || `https://commons.wikimedia.org/wiki/${encodeURIComponent(page.title.replace(/ /g, '_'))}`,
    artist: field(metadata, 'Artist') || field(metadata, 'Credit') || '未注明',
    license,
    licenseUrl: field(metadata, 'LicenseUrl'),
  };
}

await mkdir(imageDirectory, { recursive: true });
const credits = { ...portraitCredits };
const missing = [];
const pending = thinkers.filter((person) => !credits[person.id]);
let next = 0;
async function worker() {
  while (next < pending.length) {
    const person = pending[next++];
    try {
      const result = await download(person);
      if (result.missing) missing.push({ name: person.name, term: result.term, reason: result.reason || 'no matching Commons portrait' });
      else credits[result.id] = result;
      console.log(`${Object.keys(credits).length + missing.length}/${thinkers.length} ${person.name}: ${result.missing ? '未找到' : result.file}`);
    } catch (error) {
      missing.push({ name: person.name, reason: error.message });
      console.log(`${Object.keys(credits).length + missing.length}/${thinkers.length} ${person.name}: 失败`);
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
}
await Promise.all(Array.from({ length: 4 }, worker));
await writeFile(manifestPath, `const portraitCredits = ${JSON.stringify(credits, null, 2)};\nexport default portraitCredits;\n`, 'utf8');
await writeFile(new URL('../portraits/missing-portraits.json', import.meta.url), `${JSON.stringify(missing, null, 2)}\n`, 'utf8');
console.log(`Saved ${Object.keys(credits).length}/${thinkers.length} Commons portraits. See portraits/missing-portraits.json for unresolved figures.`);
