// Generates PWA icons (icon-192.png, icon-512.png) as simple PNGs without
// any image dependency — pure Node zlib + hand-rolled PNG encoder.
// Usage: node scripts/make-icons.js
const zlib = require('zlib');
const fs = require('fs');
const path = require('path');

const outDir = path.join(__dirname, '..', 'icons');
fs.mkdirSync(outDir, { recursive: true });

// ---- PNG encoding helpers ---------------------------------------------------
const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  return table;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i += 1) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function encodePng(width, height, rgbaPixels) {
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 6;  // color type RGBA
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y += 1) {
    raw[y * (width * 4 + 1)] = 0; // filter: none
    rgbaPixels.copy(raw, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4);
  }
  const idat = zlib.deflateSync(raw, { level: 9 });

  return Buffer.concat([
    signature,
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0))
  ]);
}

// ---- drawing helpers ---------------------------------------------------------
function lerp(a, b, t) { return a + (b - a) * t; }

function dist(x, y, cx, cy) { return Math.hypot(x - cx, y - cy); }

function drawIcon(size) {
  const px = Buffer.alloc(size * size * 4);
  const cx = size / 2;

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const t = y / size;
      // vertical navy-blue gradient background
      let r = Math.round(lerp(15, 42, t));
      let g = Math.round(lerp(45, 93, t));
      let b = Math.round(lerp(87, 159, t));

      // subtle radial glow top-left
      const glow = Math.max(0, 1 - dist(x, y, size * 0.25, size * 0.2) / (size * 0.8));
      r = Math.round(lerp(r, 120, glow * 0.35));
      g = Math.round(lerp(g, 200, glow * 0.35));
      b = Math.round(lerp(b, 255, glow * 0.35));

      const rr = size / 3.2; // screen-safe rounded-corner radius
      const inCorner = Math.max(Math.abs(x - (size - rr)), Math.abs(y - (size - rr)));
      if (x > size - rr && y > size - rr && inCorner > rr) {
        // keep inside rounded square (transparent corner)
        r = g = b = 0;
      }

      let alpha = 255;

      // ---- sun (large warm circle, upper-left) ----
      const sunCx = size * 0.30;
      const sunCy = size * 0.28;
      const sunR = size * 0.14;
      const dSun = dist(x, y, sunCx, sunCy);
      if (dSun < sunR) {
        r = 255; g = 205; b = 66;
      } else if (dSun < sunR * 1.35) {
        const ring = 1 - (dSun - sunR) / (sunR * 0.35);
        r = Math.round(lerp(255, 255, 0) * ring + 60 * (1 - ring));
        g = Math.round(lerp(205, 210, 0) * ring + 150 * (1 - ring));
        b = Math.round(lerp(66, 90, 0) * ring + 60 * (1 - ring));
      }

      // ---- cloud (three white circles + rounded base) ----
      const cloudR = size * 0.155;
      const c1 = dist(x, y, size * 0.50, size * 0.52);
      const c2 = dist(x, y, size * 0.66, size * 0.60);
      const c3 = dist(x, y, size * 0.38, size * 0.62);
      const inCloud = c1 < cloudR * 1.05 || c2 < cloudR * 0.95 || c3 < cloudR * 0.95;
      const inBase = x > size * 0.30 && x < size * 0.74 && y > size * 0.56 && y < size * 0.76 &&
        Math.hypot(x - size * 0.30, y - size * 0.66) < size * 0.10 &&
        Math.hypot(x - size * 0.74, y - size * 0.66) < size * 0.10;
      if (inCloud || inBase) {
        const shade = Math.max(0, Math.min(1, (y / size - 0.5) * 4));
        r = 250; g = 252; b = 255;
        if (shade > 0) {
          r = Math.round(lerp(250, 205, shade));
          g = Math.round(lerp(252, 222, shade));
          b = Math.round(lerp(255, 235, shade));
        }
      }

      const idx = (y * size + x) * 4;
      px[idx] = r;
      px[idx + 1] = g;
      px[idx + 2] = b;
      px[idx + 3] = alpha;
    }
  }
  return px;
}

for (const size of [192, 512]) {
  const png = encodePng(size, size, drawIcon(size));
  const file = path.join(outDir, `icon-${size}.png`);
  fs.writeFileSync(file, png);
  console.log(`wrote ${file} (${png.length} bytes)`);
}