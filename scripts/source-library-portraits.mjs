import { readFile, writeFile } from 'node:fs/promises';
import { thinkers } from '../src/data.js';
import credits from '../src/portraitCredits.js';
import { savePortraitManifest } from './portrait-manifest.mjs';

const identities = JSON.parse(await readFile(new URL('../portraits/identity-search-terms.json', import.meta.url)));
const pending = thinkers.filter(person => !credits[person.id]);
const audit = [];
const headers = { 'User-Agent': 'GuandaoPortraitArchive/3.0 (local educational portrait collection)' };
const normalize = text => String(text).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
for (const person of pending) {
  const entry = { id: person.id, name: person.name, status: 'no-matching-library-image', terms: identities[person.name] || [] };
  audit.push(entry);
  for (const term of entry.terms) {
    if (!/[a-zA-Z]/.test(term)) continue;
    try {
      const params = new URLSearchParams({ fo: 'json', c: '12', q: `"${term}"` });
      const response = await fetch(`https://www.loc.gov/photos/?${params}`, { headers, signal: AbortSignal.timeout(15000) });
      if (!response.ok) throw new Error(`Search HTTP ${response.status}`);
      const payload = await response.json();
      const tokens = normalize(term).split(' ').filter(token => !['the', 'of', 'saint'].includes(token));
      const candidates = (payload.results || []).filter(row => {
        const title = ` ${normalize(row.title)} `;
        return !row.access_restricted && row.item?.service_medium && tokens.every(token => title.includes(` ${token} `)) && /no known restrictions|public domain/i.test(row.item.rights_advisory || '') && !/group|with | and |letter|book|memorial|building|monument/i.test(row.title);
      }).sort((a, b) => Number(/portrait/i.test(b.item?.summary || '')) - Number(/portrait/i.test(a.item?.summary || '')));
      for (const row of candidates.slice(0, 2)) {
        const image = await fetch(row.item.service_medium.replace(/^http:/, 'https:'), { headers, signal: AbortSignal.timeout(15000) });
        if (!image.ok) continue;
        const bytes = new Uint8Array(await image.arrayBuffer());
        if (bytes[0] !== 0xff || bytes[1] !== 0xd8) continue;
        const filename = `library-${thinkers.indexOf(person)}.jpg`;
        await writeFile(new URL(`../portraits/${filename}`, import.meta.url), bytes);
        credits[person.id] = { id: person.id, src: `/portraits/${filename}`, file: row.title, page: row.id.replace(/^http:/, 'https:'), artist: row.item.creators?.join('; ') || '未注明', license: row.item.rights_advisory, licenseUrl: row.id.replace(/^http:/, 'https:'), provider: 'Library of Congress' };
        entry.status = 'downloaded'; entry.selected = { title: row.title, page: credits[person.id].page, image: row.item.service_medium };
        await savePortraitManifest(credits);
        console.log(`Added ${person.name}: Library of Congress / ${row.title}`);
        break;
      }
      if (credits[person.id]) break;
    } catch (error) { entry.error = error.message; }
    await new Promise(resolve => setTimeout(resolve, 3200));
  }
  await writeFile(new URL('../portraits/library-sourcing-audit.json', import.meta.url), JSON.stringify(audit, null, 2) + '\n');
  if (audit.length % 20 === 0) console.log(`Library checked ${audit.length}/${pending.length}; sourced ${thinkers.filter(person => credits[person.id]).length}/1000`);
}
console.log('Library source pass finished.');
