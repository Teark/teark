import { readFile, unlink } from 'node:fs/promises';
import credits from '../src/portraitCredits.js';
import { savePortraitManifest } from './portrait-manifest.mjs';

const temporary = new URL('../src/portraitCredits.generated.tmp', import.meta.url);
const content = await readFile(temporary, 'utf8').catch(() => null);
if (content) {
  const match = /^const portraitCredits = ([\s\S]+);\s*export default portraitCredits;\s*$/.exec(content);
  if (!match) throw new Error('Unexpected temporary manifest format');
  Object.assign(credits, JSON.parse(match[1]));
}
// An African Nuba portrait is not the Chinese drought goddess; a tentative
// attribution is not sufficient to replace a specific person's illustration.
delete credits['legacy-cn-34-女魃'];
delete credits['legacy-cn-82-摩诃迦叶'];
await savePortraitManifest(credits);
if (content) await unlink(temporary);
console.log('Recovered saved museum entries and excluded two unsuitable matches.');
