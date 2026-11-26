import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const crcTable = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  return table;
})();

function crc32(buffer) {
  let crc = -1;
  for (const byte of buffer) crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ -1) >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, crc]);
}

function makePng(size) {
  const raw = Buffer.alloc(size * (size * 4 + 1));
  const cell = Math.floor(size / 3);
  const gap = Math.max(2, Math.floor(size * 0.04));
  const colors = [
    [249, 115, 22], [251, 146, 60], [253, 186, 116],
    [234, 88, 12], [249, 115, 22], [251, 146, 60],
    [253, 186, 116], [234, 88, 12], [249, 115, 22],
  ];
  for (let y = 0; y < size; y++) {
    const rowStart = y * (size * 4 + 1);
    raw[rowStart] = 0;
    for (let x = 0; x < size; x++) {
      const offset = rowStart + 1 + x * 4;
      let color = [15, 23, 42];
      const gy = Math.floor(y / cell);
      const gx = Math.floor(x / cell);
      const localX = x % cell;
      const localY = y % cell;
      if (gy < 3 && gx < 3 && localX > gap && localX < cell - gap && localY > gap && localY < cell - gap) {
        color = colors[gy * 3 + gx];
      }
      raw[offset] = color[0];
      raw[offset + 1] = color[1];
      raw[offset + 2] = color[2];
      raw[offset + 3] = 255;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const target = resolve('public/icons');
mkdirSync(target, { recursive: true });
for (const size of [192, 512]) {
  const path = resolve(target, `icon-${size}.png`);
  writeFileSync(path, makePng(size));
  console.log(`created ${path}`);
}
