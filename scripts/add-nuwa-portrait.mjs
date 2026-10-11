import { writeFile } from 'node:fs/promises';
import credits from '../src/portraitCredits.js';

const url = 'https://upload.wikimedia.org/wikipedia/commons/0/01/Shanhaijing_illustration_of_N%C3%BCwa.jpg';
const response = await fetch(url, { headers: { 'User-Agent': 'GuandaoPortraitArchive/2.0' }, signal: AbortSignal.timeout(25000) });
if (!response.ok) throw new Error(`Nuwa download: HTTP ${response.status}`);
const bytes = new Uint8Array(await response.arrayBuffer());
if (bytes[0] !== 0xff || bytes[1] !== 0xd8) throw new Error('Expected a JPEG image');
await writeFile(new URL('../portraits/nuwa-shanhaijing.jpg', import.meta.url), bytes);
credits['legacy-cn-0-女娲'] = { id: 'legacy-cn-0-女娲', src: '/portraits/nuwa-shanhaijing.jpg', file: 'Shanhaijing illustration of Nüwa.jpg', page: 'https://commons.wikimedia.org/wiki/File:Shanhaijing_illustration_of_N%C3%BCwa.jpg', artist: '明代蒋应镐《山海经图绘全像》', license: 'Public domain', licenseUrl: 'https://creativecommons.org/publicdomain/mark/1.0/' };
await writeFile(new URL('../src/portraitCredits.js', import.meta.url), `const portraitCredits = ${JSON.stringify(credits, null, 2)};\nexport default portraitCredits;\n`);
console.log('Saved Nuwa traditional illustration.');
