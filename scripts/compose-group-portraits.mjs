import { readFile, writeFile } from 'node:fs/promises';
import { thinkers } from '../src/data.js';
import credits from '../src/portraitCredits.js';
import { savePortraitManifest } from './portrait-manifest.mjs';

const groups = {
  '太虚印顺': ['太虚', '印顺'], '虚云本焕': ['虚云', '本焕'],
  '董仲舒贾谊': ['董仲舒', '贾谊'], '王重阳丘处机': ['王重阳', '丘处机'],
  '吕洞宾汉钟离': ['吕洞宾', '汉钟离'], '白玉蟾陈楠': ['白玉蟾', '陈楠'],
};
const escape = value => String(value).replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[character]);
for (const [name, members] of Object.entries(groups)) {
  const person = thinkers.find(person => person.name === name);
  const parts = members.map(member => credits[thinkers.find(person => person.name === member)?.id] || credits[`component-${member}`]);
  if (!person || parts.some(part => !part)) continue;
  const images = [];
  for (const [index, part] of parts.entries()) {
    const bytes = await readFile(new URL(`..${part.src}`, import.meta.url));
    const extension = part.src.split('.').at(-1);
    const mime = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', gif: 'image/gif', svg: 'image/svg+xml' }[extension];
    images.push(`<image href="data:${mime};base64,${bytes.toString('base64')}" x="${index * 200}" y="0" width="200" height="470" preserveAspectRatio="xMidYMid slice"/><text x="${index * 200 + 100}" y="465" text-anchor="middle" fill="#efe2c7" font-family="serif" font-size="20" stroke="#111" stroke-width=".5">${escape(members[index])}</text>`);
  }
  const filename = `group-${thinkers.indexOf(person)}.svg`;
  await writeFile(new URL(`../portraits/${filename}`, import.meta.url), `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 500"><title>${escape(name)} · 人物组合图</title><rect width="400" height="500" fill="#171819"/>${images.join('')}<path d="M200 0V470" stroke="#b8a275" stroke-opacity=".6"/><text x="200" y="491" text-anchor="middle" fill="#bca981" font-size="12">人物组合图</text></svg>`);
  credits[person.id] = { id: person.id, src: `/portraits/${filename}`, file: `${name}人物组合图`, page: parts[0].page, artist: parts.map(part => part.artist).join('; '), license: '各部分图片许可见 sources；组合图由本项目制作', licenseUrl: '', kind: 'source-composite', sources: parts.map((part, index) => ({ name: members[index], page: part.page, license: part.license })) };
  console.log(`Composed ${name}`);
}
for (const id of Object.keys(credits)) if (id.startsWith('component-')) delete credits[id];
await savePortraitManifest(credits);
