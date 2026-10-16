const WIDTH = 1024;
const FONT = '20px "Microsoft YaHei", sans-serif';

export function wrapExportText(context, text, width) {
  return String(text).split('\n').flatMap(paragraph => {
    let line = '';
    const lines = [];
    for (const character of paragraph) {
      if (line && context.measureText(line + character).width > width) { lines.push(line); line = ''; }
      line += character;
    }
    lines.push(line);
    return lines;
  });
}

function loadImage(src) {
  return new Promise(resolve => {
    const image = new Image();
    const timer = setTimeout(() => resolve(null), 12000);
    image.onload = () => { clearTimeout(timer); resolve(image); };
    image.onerror = () => { clearTimeout(timer); resolve(null); };
    image.src = src;
  });
}

function cover(context, image, x, y, width, height) {
  if (!image) { context.fillStyle = '#23232b'; context.fillRect(x, y, width, height); return; }
  const scale = Math.max(width / image.width, height / image.height);
  const sw = width / scale, sh = height / scale;
  context.drawImage(image, (image.width - sw) / 2, (image.height - sh) * .35, sw, sh, x, y, width, height);
}

const crcTable = Uint32Array.from({ length: 256 }, (_, n) => {
  for (let i = 0; i < 8; i++) n = n & 1 ? 0xedb88320 ^ (n >>> 1) : n >>> 1;
  return n >>> 0;
});
function pngChunk(type, bytes) {
  const chunk = new Uint8Array(bytes.length + 12);
  const view = new DataView(chunk.buffer);
  view.setUint32(0, bytes.length);
  chunk.set(new TextEncoder().encode(type), 4);
  chunk.set(bytes, 8);
  let crc = 0xffffffff;
  for (const byte of chunk.subarray(4, bytes.length + 8)) crc = crcTable[(crc ^ byte) & 255] ^ (crc >>> 8);
  view.setUint32(bytes.length + 8, (crc ^ 0xffffffff) >>> 0);
  return chunk;
}

// Encode strips into a single PNG: no full-height canvas, no browser canvas
// height limit and no clipping to the visible chat viewport.
export async function renderLongPng(width, height, draw) {
  if (typeof CompressionStream === 'undefined') throw new Error('当前浏览器不支持长图导出，请使用新版 Chrome 或 Edge');
  const header = new Uint8Array(13);
  const headerView = new DataView(header.buffer);
  headerView.setUint32(0, width); headerView.setUint32(4, height);
  header[8] = 8; header[9] = 6; // RGBA, 8-bit.
  const parts = [new Uint8Array([137,80,78,71,13,10,26,10]), pngChunk('IHDR', header)];
  const compression = new CompressionStream('deflate');
  const writer = compression.writable.getWriter();
  const reader = compression.readable.getReader();
  const consume = (async () => {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      parts.push(pngChunk('IDAT', value));
    }
  })();
  const canvas = document.createElement('canvas'); canvas.width = width;
  try {
    for (let top = 0; top < height; top += 512) {
      const size = Math.min(512, height - top);
      canvas.height = size;
      const context = canvas.getContext('2d', { willReadFrequently: true });
      draw(context, top, size);
      const rgba = context.getImageData(0, 0, width, size).data;
      const stride = width * 4;
      const scanlines = new Uint8Array((stride + 1) * size);
      for (let row = 0; row < size; row++) scanlines.set(rgba.subarray(row * stride, (row + 1) * stride), row * (stride + 1) + 1);
      await writer.write(scanlines);
      await new Promise(resolve => setTimeout(resolve, 0));
    }
    await writer.close();
    await consume;
  } catch (error) {
    await writer.abort(error).catch(() => {});
    await consume.catch(() => {});
    throw error;
  } finally { canvas.width = canvas.height = 0; }
  parts.push(pngChunk('IEND', new Uint8Array()));
  return new Blob(parts, { type: 'image/png' });
}

export async function exportConversation({ person, people, index, messages, portraitSource }) {
  await document.fonts.ready;
  const measure = document.createElement('canvas').getContext('2d'); measure.font = FONT;
  let nextY = 540;
  const bubbles = messages.map(message => {
    const lines = wrapExportText(measure, message.content, 740);
    const height = Math.max(52, 32 + lines.length * 32);
    const width = Math.min(788, Math.max(80, ...lines.map(line => measure.measureText(line).width + 48)));
    const item = { ...message, lines, y: nextY, height, width };
    nextY += height + 24;
    return item;
  });
  const height = nextY + 80;
  const cards = await Promise.all(Array.from({ length: 41 }, async (_, i) => {
    const offset = i - 20;
    const item = people[((index + offset) % people.length + people.length) % people.length];
    return { person: item, offset, image: await loadImage(portraitSource(item)) };
  }));
  const galaxy = await loadImage('/backgrounds/milky-way-spiral.webp');
  const blob = await renderLongPng(WIDTH, height, (context, top, size) => {
    context.fillStyle = '#07090f'; context.fillRect(0, 0, WIDTH, size);
    // Fixed star pattern across strips keeps the long background seamless.
    for (let y = Math.floor(top / 180) * 180; y < top + size; y += 180) {
      for (let n = 0; n < 55; n++) {
        const x = (n * 173 + y * 7) % WIDTH, sy = y + (n * 47 % 180) - top;
        context.fillStyle = `rgba(220,230,255,${.2 + (n % 5) * .09})`;
        context.beginPath(); context.arc(x, sy, n % 9 === 0 ? 1.4 : .7, 0, Math.PI * 2); context.fill();
      }
    }
    context.save(); context.translate(0, -top);
    if (galaxy && top < 800) { context.globalAlpha = .16; context.drawImage(galaxy, 540, 480, 430, 242); context.globalAlpha = 1; }
    if (top < 520) {
      context.fillStyle = '#dec99f'; context.font = '24px serif'; context.fillText('与道对话', 48, 54);
      context.font = '32px serif'; context.fillStyle = '#eee9de'; context.fillText(person.name, 48, 106);
      context.font = '16px sans-serif'; context.fillStyle = '#aaa49a';
      context.fillText(`${person.era || ''} · ${person.role || ''}`, 48, 140, 920);
      context.strokeStyle = '#cdb17d44'; context.beginPath(); context.ellipse(512, 409, 450, 48, 0, 0, Math.PI * 2); context.stroke();
      const ordered = cards.map(card => ({ ...card, depth: (1 + Math.cos(card.offset * Math.PI * 2 / 25)) / 2 })).sort((a,b) => a.depth - b.depth || Math.abs(b.offset) - Math.abs(a.offset));
      for (const card of ordered) {
        const featured = card.offset === 0, angle = card.offset * Math.PI * 2 / 25;
        const w = featured ? 190 : 32 + card.depth * 26, h = featured ? 270 : w * 1.35;
        const x = 512 + Math.sin(angle) * 410 + Math.sign(card.offset) * 54 * card.depth ** 4 - w / 2;
        const y = featured ? 188 : 370 - (1 - Math.cos(angle)) * 82 - h / 2;
        context.globalAlpha = featured ? 1 : .45 + card.depth * .5;
        cover(context, card.image, x, y, w, h);
        context.strokeStyle = featured ? '#cdb17d' : '#b7aa8566'; context.strokeRect(x, y, w, h);
        context.fillStyle = '#07090fcc'; context.fillRect(x, y + h - (featured ? 36 : 16), w, featured ? 36 : 16);
        context.fillStyle = '#eee9de'; context.font = featured ? '22px serif' : '10px sans-serif'; context.textAlign = 'center';
        context.fillText(card.person.name, x + w / 2, y + h - (featured ? 11 : 4), w - 4);
      }
      context.globalAlpha = 1; context.textAlign = 'left';
    }
    for (const bubble of bubbles) {
      if (bubble.y + bubble.height < top || bubble.y > top + size) continue;
      const user = bubble.role === 'user';
      const avatarX = user ? 924 : 48;
      const x = user ? avatarX - 16 - bubble.width : avatarX + 52 + 16;
      // Match the live UI: circular name badge beside the bubble, user on
      // the right and thinker on the left, rather than a speaker heading.
      context.beginPath(); context.arc(avatarX + 26, bubble.y + 26, 26, 0, Math.PI * 2);
      context.fillStyle = user ? '#192030ee' : '#29251fee'; context.fill();
      context.strokeStyle = user ? '#ced6e433' : '#cdb17d66'; context.stroke();
      const speaker = user ? '我' : bubble.personName || person.name;
      context.font = '14px "Microsoft YaHei", sans-serif';
      const nameLines = wrapExportText(context, speaker, 42);
      const nameSize = Math.min(14, 36 / nameLines.length);
      context.font = `${nameSize}px "Microsoft YaHei", sans-serif`;
      context.fillStyle = user ? '#d8deed' : '#e6d1a6'; context.textAlign = 'center';
      nameLines.forEach((line, i) => context.fillText(line, avatarX + 26, bubble.y + 26 + (i - (nameLines.length - 1) / 2) * nameSize * 1.1 + nameSize * .35, 44));
      context.textAlign = 'left';
      context.fillStyle = user ? '#29231de8' : '#141923eb';
      context.beginPath(); context.roundRect(x, bubble.y, bubble.width, bubble.height, 8); context.fill();
      context.strokeStyle = user ? '#b69b6844' : '#ffffff18'; context.stroke();
      context.font = FONT; context.fillStyle = '#e5e1d8';
      bubble.lines.forEach((line, i) => context.fillText(line, x + 24, bubble.y + 38 + i * 32));
    }
    if (top + size >= height - 60) {
      context.font = '14px sans-serif'; context.fillStyle = '#969087';
      context.fillText('与道对话 · AI 模拟人物对话，仅供交流与启发', 48, height - 32);
    }
    context.restore();
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a'); link.href = url;
  link.download = `与${person.name}对话-${new Date().toISOString().slice(0,10)}.png`;
  document.body.append(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}
