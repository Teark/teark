import { writeFile, rename, readFile } from 'node:fs/promises';
import { thinkers } from '../src/data.js';
import credits from '../src/portraitCredits.js';
import { savePortraitManifest } from './portrait-manifest.mjs';

const identities = {
  '许由': ['Xu You'], '许由尧时': ['Xu You'], '隐士巢父': ['Chao Fu'],
  '陈抟': ['Chen Tuan'], '陈抟老祖': ['Chen Tuan'], '寒山': ['Hanshan'], '拾得': ['Shide'],
  '摩诃迦叶': ['Mahakashyapa', 'Kasyapa'], '阿难': ['Ananda'], '提婆': ['Aryadeva'], '无著': ['Asanga'],
  '济公道济': ['Ji Gong', 'Jigong'], '钟离权': ['Zhongli Quan'], '汉钟离': ['Zhongli Quan'],
  '韩湘子': ['Han Xiangzi'], '铁拐李': ['Li Tieguai'], '马钰': ['Ma Yu'],
  '司马光': ['Sima Guang'], '曹植': ['Cao Zhi'], '柳公权': ['Liu Gongquan'],
  '伊本鲁世': ['Averroes'], '伊本西那': ['Avicenna'], '伊本赫勒敦': ['Ibn Khaldun'],
  '奥卡姆威廉': ['William of Ockham'], '密尔': ['John Stuart Mill'], '斯宾塞': ['Herbert Spencer'],
  '威廉詹姆斯': ['William James'], '杜威': ['John Dewey'], '皮尔士': ['Charles Sanders Peirce'],
  '列维斯特劳斯': ['Claude Levi Strauss'], '芝诺': ['Zeno of Citium'],
  '摩西': ['Moses'], '大卫': ['King David'], '以利亚': ['Elijah'], '耶利米': ['Jeremiah'], '以斯拉': ['Ezra'],
  '马利亚': ['Virgin Mary', 'Madonna'], '彼得': ['Saint Peter'], '保罗': ['Saint Paul'],
  '约翰': ['John the Evangelist'], '方济各': ['Saint Francis of Assisi', 'Saint Francis'],
  '本笃': ['Saint Benedict'], '安东尼': ['Saint Anthony Abbot', 'Saint Anthony the Great'],
  '额我略': ['Saint Gregory the Great'], '十字若望': ['Saint John of the Cross'],
  '伊格那丢': ['Saint Ignatius of Loyola'], '路德': ['Martin Luther'], '加尔文': ['John Calvin'],
  '乔治福克斯': ['George Fox'], '威廉布莱克': ['William Blake'], '约翰班扬': ['John Bunyan'],
  '西蒙娜薇依': ['Simone Weil'], '耶稣会士利玛窦': ['Matteo Ricci'],
  '阿里': ['Ali ibn Abi Talib'], '赫蒂彻': ['Khadija'], '法蒂玛': ['Fatimah'],
  '阿布伯克尔': ['Abu Bakr'], '奥斯曼': ['Uthman'], '侯赛因': ['Husayn ibn Ali'],
  '哈菲兹': ['Hafiz', 'Hafez'], '萨迪': ['Saadi'], '阿塔尔': ['Attar'],
  '伊本阿拉比': ['Ibn Arabi'], '拉比阿': ['Rabia al Adawiyya'],
  '祆教琐罗亚斯德': ['Zoroaster'], '祆教阿胡拉玛兹达': ['Ahura Mazda'],
  '阿佛洛狄忒': ['Aphrodite'], '玛尔斯': ['Mars'], '朱诺': ['Juno'], '戴安娜': ['Diana'],
  '阿特拉斯': ['Atlas'], '厄庇米修斯': ['Epimetheus'], '瑞亚': ['Rhea'],
  '忒提斯': ['Tethys'], '赫卡忒': ['Hecate'], '忒修斯': ['Theseus'], '代达罗斯': ['Daedalus'],
  '悉多': ['Sita'], '克里希那': ['Krishna'], '罗陀': ['Radha'], '阿周那': ['Arjuna'],
  '德鲁帕蒂': ['Draupadi'], '阿耆尼': ['Agni'], '迦摩': ['Kamadeva'], '波湿奴': ['Vishnu'],
  '罗睺': ['Rahu'], '迦楼罗': ['Garuda'], '摩诃毗罗': ['Mahavira'],
  '拉玛努阇': ['Ramanuja'], '阿底商羯罗': ['Adi Shankara'],
  '月读须佐之男': ['Tsukuyomi', 'Susanoo'], '大国主神': ['Okuninushi'],
  '丰臣秀吉': ['Toyotomi Hideyoshi'], '弗雷': ['Freyr'], '海拉': ['Hel'], '伊敦': ['Idun'],
  '梅林': ['Merlin'], '兰斯洛特': ['Lancelot'], '高文': ['Gawain'], '盖拉哈德': ['Galahad'],
  '雅各': ['Jacob'], '约瑟': ['Joseph son of Jacob', 'Joseph and his brothers'], '以利沙': ['Elisha'],
  '使徒托马斯': ['Saint Thomas'], '使徒安德烈': ['Saint Andrew'], '使徒马太': ['Saint Matthew'],
  '使徒巴多罗买': ['Saint Bartholomew'], '使徒西门': ['Saint Simon'], '使徒犹大': ['Saint Jude'],
  '大安东尼': ['Saint Anthony Abbot'], '威廉潘恩': ['William Penn'], '约翰多恩': ['John Donne'],
  '帕斯卡': ['Blaise Pascal'], '乔治赫伯特': ['George Herbert'], '丹麦克尔凯郭尔': ['Soren Kierkegaard'],
  '方济各沙勿略': ['Saint Francis Xavier'],
  '女魃': ['Nuba Chinese drought goddess'], '共工': ['Gonggong'], '夸父': ['Kuafu'],
  '羲和': ['Xihe'], '嫘祖': ['Leizu'], '伏羲女娲': ['Fuxi and Nuwa'],
  '埃克哈特': ['Meister Eckhart'], '阿那克西美尼': ['Anaximenes'], '克里安西斯': ['Cleanthes'],
  '克律西波': ['Chrysippus'], '爱比克泰德': ['Epictetus'], '谢林': ['Friedrich Schelling'],
  '布鲁诺': ['Giordano Bruno'], '特斯拉': ['Nikola Tesla'],
  '古鲁安格德': ['Guru Angad'], '古鲁阿马尔达斯': ['Guru Amar Das'], '古鲁拉姆达斯': ['Guru Ram Das'],
  '古鲁哈戈宾德': ['Guru Hargobind'], '古鲁哈赖': ['Guru Har Rai'], '古鲁哈克里山': ['Guru Har Krishan'],
  '古鲁德格巴哈杜尔': ['Guru Tegh Bahadur'], '古鲁戈宾德辛格': ['Guru Gobind Singh'],
  '厄瑞玻斯': ['Erebus'], '福柏': ['Phoebe'], '科俄斯': ['Coeus'], '伊阿佩托斯': ['Iapetus'],
  '墨提斯': ['Metis'], '欧忒耳佩': ['Euterpe'], '波吕许谟尼': ['Polyhymnia'], '乌拉尼亚': ['Urania'],
  '阿肯那顿': ['Akhenaten'], '提亚马特': ['Tiamat'], '娑维德丽': ['Savitri'],
  '弥特拉': ['Mithra'], '阿娜希塔': ['Anahita'], '西格鲁德': ['Sigurd'],
  '芬恩': ['Fionn mac Cumhaill'], '陶勒': ['Johannes Tauler'],
};
const aliasTitles = { '许由尧时': '许由', '隐士巢父': '巢父', '济公道济': '济公', '陈抟老祖': '陈抟', '列御寇': '列子', '光武帝刘秀': '汉光武帝', '孙武': '孙子', '祆教琐罗亚斯德': '琐罗亚斯德', '耶稣会士利玛窦': '利玛窦', '丹麦克尔凯郭尔': '克尔凯郭尔', '方济各沙勿略': '沙勿略' };
const headers = { 'User-Agent': 'GuandaoPortraitArchive/3.0 (local educational collection)' };
const audit = [];
const pending = thinkers.filter(person => !credits[person.id]);
async function json(url) {
  const response = await fetch(url, { headers, signal: AbortSignal.timeout(15000) });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}
const normalize = text => String(text).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
const matches = (title, term) => (` ${normalize(title)} `).includes(` ${normalize(term)} `);
function score(title) {
  if (/possibly|probably|unidentified|nuba woman|thomas aquinas/i.test(title)) return -1;
  if (/landscape|calligraphy|brush pot|bookplate|book cover|coin|medal|seal|letter|signature|fragment|manuscript|vase|bowl|dish|tile|garden|mirror|textile|portrait of the artist's/i.test(title)) return -1;
  return /portrait|bust|head of|half length/i.test(title) ? 100 : /saint|immortal|deity|god|goddess|hermit|sage|bodhisattva|rinsing|resting|rishi/i.test(title) ? 70 : 30;
}
// Use Wikidata only to resolve names; downloaded assets come from the museums.
for (let start = 0; start < pending.length; start += 40) {
  const batch = pending.slice(start, start + 40);
  try {
    const params = new URLSearchParams({ action: 'query', format: 'json', titles: [...new Set(batch.map(person => aliasTitles[person.name] || person.name))].join('|'), redirects: '1', converttitles: '1', prop: 'pageprops', ppprop: 'wikibase_item|disambiguation' });
    const payload = await json(`https://zh.wikipedia.org/w/api.php?${params}`);
    const mapping = new Map([...payload.query?.normalized || [], ...payload.query?.converted || [], ...payload.query?.redirects || []].map(row => [row.from, row.to]));
    const pages = new Map(Object.values(payload.query?.pages || {}).map(page => [page.title, page]));
    const resolved = batch.flatMap(person => {
      let title = aliasTitles[person.name] || person.name; const seen = new Set();
      while (mapping.has(title) && !seen.has(title)) { seen.add(title); title = mapping.get(title); }
      const page = pages.get(title);
      return page?.pageprops?.wikibase_item && page.pageprops.disambiguation === undefined ? [{ person, id: page.pageprops.wikibase_item }] : [];
    });
    if (!resolved.length) continue;
    const entityParams = new URLSearchParams({ action: 'wbgetentities', format: 'json', ids: [...new Set(resolved.map(row => row.id))].join('|'), props: 'labels', languages: 'en' });
    const entities = await json(`https://www.wikidata.org/w/api.php?${entityParams}`);
    for (const { person, id } of resolved) {
      const label = entities.entities?.[id]?.labels?.en?.value;
      if (label && !identities[person.name]) identities[person.name] = [label];
    }
  } catch (error) { console.log(`Identity batch ${start}: ${error.message}`); }
}
let saveQueue = Promise.resolve();
function persist() {
  const snapshot = structuredClone(credits);
  saveQueue = saveQueue.then(async () => {
    await savePortraitManifest(snapshot);
    await writeFile(new URL('../portraits/museum-sourcing-audit.json', import.meta.url), JSON.stringify(audit, null, 2) + '\n');
  });
  return saveQueue;
}
await writeFile(new URL('../portraits/identity-search-terms.json', import.meta.url), JSON.stringify(identities, null, 2) + '\n');
async function cleveland(term) {
  const params = new URLSearchParams({ q: `"${term}"`, limit: '12', has_image: '1', cc0: '', fields: 'id,title,images,share_license_status,url,creators' });
  const payload = await json(`https://openaccess-api.clevelandart.org/api/artworks/?${params}`);
  return (payload.data || []).filter(row => row.share_license_status === 'CC0' && row.images?.web?.url && matches(row.title, term) && score(row.title) > 0).map(row => ({ title: row.title, url: row.images.web.url, page: row.url, artist: row.creators?.map(artist => artist.description).join('; ') || '未注明', license: 'CC0', licenseUrl: 'https://creativecommons.org/publicdomain/zero/1.0/', provider: 'Cleveland Museum of Art', score: score(row.title) }));
}
async function chicago(term) {
  const params = new URLSearchParams({ q: `"${term}"`, limit: '12', fields: 'id,title,image_id,is_public_domain,artist_display', 'query[term][is_public_domain]': 'true' });
  const payload = await json(`https://api.artic.edu/api/v1/artworks/search?${params}`);
  return (payload.data || []).filter(row => row.is_public_domain && row.image_id && matches(row.title, term) && score(row.title) > 0).map(row => ({ title: row.title, url: `${payload.config.iiif_url}/${row.image_id}/full/600,/0/default.jpg`, page: `https://www.artic.edu/artworks/${row.id}`, artist: row.artist_display || '未注明', license: 'CC0', licenseUrl: 'https://creativecommons.org/publicdomain/zero/1.0/', provider: 'Art Institute of Chicago', score: score(row.title) }));
}
async function metropolitan(term) {
  const params = new URLSearchParams({ q: term, hasImages: 'true', title: 'true', limit: '6' });
  const payload = await json(`https://collectionapi.metmuseum.org/public/collection/v1.1/search?${params}`);
  const result = [];
  for (const id of (payload.objectIDs || []).slice(0, 6)) {
    const row = await json(`https://collectionapi.metmuseum.org/public/collection/v1/objects/${id}`);
    if (row.isPublicDomain && row.primaryImageSmall && matches(row.title, term) && score(row.title) > 0) result.push({ title: row.title, url: row.primaryImageSmall, page: row.objectURL, artist: row.artistDisplayName || '未注明', license: 'CC0', licenseUrl: 'https://creativecommons.org/publicdomain/zero/1.0/', provider: 'Metropolitan Museum of Art', score: score(row.title) });
  }
  return result;
}
let cursor = 0;
async function worker() {
  while (cursor < pending.length) {
    const person = pending[cursor++];
    const terms = identities[person.name] || [person.name];
    const entry = { id: person.id, name: person.name, terms, providers: [], status: 'no-matching-museum-image' };
    audit.push(entry);
    const candidates = [];
    for (const term of terms) {
      const responses = await Promise.allSettled([cleveland(term), chicago(term), metropolitan(term)]);
      responses.forEach((response, index) => {
        entry.providers.push({ provider: ['Cleveland Museum of Art', 'Art Institute of Chicago', 'Metropolitan Museum of Art'][index], term, matches: response.status === 'fulfilled' ? response.value.length : 0, error: response.status === 'rejected' ? response.reason.message : undefined });
        if (response.status === 'fulfilled') candidates.push(...response.value);
      });
    }
    candidates.sort((a, b) => b.score - a.score);
    for (const candidate of candidates.slice(0, 3)) {
      try {
        const response = await fetch(candidate.url, { headers, signal: AbortSignal.timeout(20000) });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const bytes = new Uint8Array(await response.arrayBuffer());
        if (bytes[0] !== 0xff || bytes[1] !== 0xd8) throw new Error('Not a JPEG');
        const filename = `museum-${thinkers.indexOf(person)}.jpg`;
        await writeFile(new URL(`../portraits/${filename}`, import.meta.url), bytes);
        credits[person.id] = { id: person.id, src: `/portraits/${filename}`, file: candidate.title, page: candidate.page, artist: candidate.artist, license: candidate.license, licenseUrl: candidate.licenseUrl, provider: candidate.provider };
        entry.status = 'downloaded'; entry.selected = candidate;
        console.log(`Added ${person.name}: ${candidate.provider} / ${candidate.title}`);
        break;
      } catch (error) { entry.status = 'museum-image-download-failed'; entry.error = error.message; }
    }
    await persist();
    if (audit.length % 10 === 0) console.log(`Museum checked ${audit.length}/${pending.length}; sourced ${thinkers.filter(person => credits[person.id]).length}/1000`);
    await new Promise(resolve => setTimeout(resolve, 300));
  }
}
await Promise.all([worker(), worker()]);
await persist();
console.log('Museum source pass finished.');
