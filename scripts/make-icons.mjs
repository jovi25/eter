// Generates public/icon-192.png and public/icon-512.png with no extra dependencies.
// Draws the same crystal as icon.svg using simple per-pixel math, then encodes PNG with zlib.
import { deflateSync } from 'node:zlib';
import { writeFileSync } from 'node:fs';

const CRC_TABLE = new Uint32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}

const lerp = (a, b, t) => a + (b - a) * t;
const mix = (c1, c2, t) => c1.map((v, i) => Math.round(lerp(v, c2[i], t)));

// Point inside the diamond with vertices top(0,-1) right(w,y0) bottom(0,1) left(-w,y0)?
function inDiamond(x, y, w, top, mid, bottom) {
  if (y < top || y > bottom) return false;
  const half = y < mid ? (w * (y - top)) / (mid - top) : (w * (bottom - y)) / (bottom - mid);
  return Math.abs(x) <= half;
}

function render(size) {
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let py = 0; py < size; py++) {
    raw[py * (size * 4 + 1)] = 0;
    for (let px = 0; px < size; px++) {
      // normalized 0..512 space, like the SVG
      const x = ((px + 0.5) / size) * 512;
      const y = ((py + 0.5) / size) * 512;
      const d = Math.hypot(x - 256, y - 205) / 360;
      let c = mix([0x3a, 0x24, 0x70], [0x0b, 0x07, 0x16], Math.min(1, d));
      const dx = x - 256;
      if (inDiamond(dx, y, 130, 64, 220, 448)) c = [255, 255, 255];
      if (inDiamond(dx, y, 116, 72, 220, 440)) {
        const t = (y - 72) / 368;
        c = t < 0.5 ? mix([0xe8, 0xd8, 0xff], [0xa7, 0x7b, 0xff], t * 2) : mix([0xa7, 0x7b, 0xff], [0x5a, 0x2f, 0xc2], (t - 0.5) * 2);
        if (inDiamond(dx, y, 44, 72, 220, 440)) c = mix(c, [255, 255, 255], 0.25);
        if (Math.hypot(dx, y - 220) < 26) c = mix(c, [255, 255, 255], 0.9);
      }
      const o = py * (size * 4 + 1) + 1 + px * 4;
      raw[o] = c[0];
      raw[o + 1] = c[1];
      raw[o + 2] = c[2];
      raw[o + 3] = 255;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

for (const size of [192, 512]) {
  writeFileSync(new URL(`../public/icon-${size}.png`, import.meta.url), render(size));
  console.log(`public/icon-${size}.png`);
}
