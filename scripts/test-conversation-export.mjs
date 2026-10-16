import assert from 'node:assert/strict';
import { inflateSync } from 'node:zlib';
import { renderLongPng, wrapExportText } from '../src/exportConversation.js';

// Small-width, extra-long image proves strip encoding beyond canvas height
// limits without retaining the entire image in a canvas or omitting the tail.
globalThis.document = {
  createElement() {
    return { width: 0, height: 0, getContext() {
      const canvas = this;
      return { getImageData() { return { data: new Uint8Array(canvas.width * canvas.height * 4).fill(127) }; } };
    } };
  },
};
const strips = [];
const blob = await renderLongPng(8, 40000, (_context, top, size) => strips.push({ top, size }));
const bytes = Buffer.from(await blob.arrayBuffer());
assert.deepEqual([...bytes.subarray(0, 8)], [137,80,78,71,13,10,26,10]);
let offset = 8;
const compressed = [];
while (offset < bytes.length) {
  const size = bytes.readUInt32BE(offset);
  const type = bytes.toString('ascii', offset + 4, offset + 8);
  if (type === 'IHDR') {
    assert.equal(bytes.readUInt32BE(offset + 8), 8);
    assert.equal(bytes.readUInt32BE(offset + 12), 40000);
  }
  if (type === 'IDAT') compressed.push(bytes.subarray(offset + 8, offset + 8 + size));
  offset += size + 12;
}
const pixels = inflateSync(Buffer.concat(compressed));
assert.equal(pixels.length, (8 * 4 + 1) * 40000);
assert.equal(pixels.at(-1), 127);
assert.equal(strips.reduce((sum, strip) => sum + strip.size, 0), 40000);
assert.equal(strips.at(-1).top + strips.at(-1).size, 40000);
const measure = { measureText: text => ({ width: [...text].length * 10 }) };
assert.deepEqual(wrapExportText(measure, '甲乙丙丁\n\nemoji🙂', 20), ['甲乙', '丙丁', '', 'em', 'oj', 'i🙂']);
console.log('PASS: one 40,000-pixel PNG, all strips retained, explicit newlines and Unicode wrapping.');
