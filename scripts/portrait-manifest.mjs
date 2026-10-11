import { writeFile, rename } from 'node:fs/promises';

export async function savePortraitManifest(credits) {
  const temporary = new URL(`../src/portraitCredits.${process.pid}.tmp`, import.meta.url);
  await writeFile(temporary, `const portraitCredits = ${JSON.stringify(credits, null, 2)};\nexport default portraitCredits;\n`);
  for (let attempt = 0; attempt < 8; attempt++) {
    try { await rename(temporary, new URL('../src/portraitCredits.js', import.meta.url)); return; }
    catch (error) {
      if (!['EPERM', 'EACCES', 'EBUSY'].includes(error.code) || attempt === 7) throw error;
      await new Promise(resolve => setTimeout(resolve, 150 * (attempt + 1)));
    }
  }
}
