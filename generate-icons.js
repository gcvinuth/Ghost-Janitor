const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// Helper to build a valid PNG file buffer from raw RGBA pixel data
function createPNG(width, height, rgbaBuffer) {
  // PNG signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR chunk
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr.writeUInt8(8, 8); // bit depth 8
  ihdr.writeUInt8(6, 9); // color type 6 (RGBA)
  ihdr.writeUInt8(0, 10); // compression method 0
  ihdr.writeUInt8(0, 11); // filter method 0
  ihdr.writeUInt8(0, 12); // interlace method 0
  const ihdrChunk = makeChunk('IHDR', ihdr);

  // Scanlines with filter byte 0 (None)
  const scanlines = Buffer.alloc(height * (1 + width * 4));
  let srcOffset = 0;
  let dstOffset = 0;
  for (let y = 0; y < height; y++) {
    scanlines[dstOffset++] = 0; // Filter byte: 0
    rgbaBuffer.copy(scanlines, dstOffset, srcOffset, srcOffset + width * 4);
    dstOffset += width * 4;
    srcOffset += width * 4;
  }

  const compressedData = zlib.deflateSync(scanlines, { level: 9 });
  const idatChunk = makeChunk('IDAT', compressedData);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

// CRC32 implementation for PNG chunks
function makeChunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const body = Buffer.concat([typeBuf, data]);
  
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(calculateCrc(body), 0);
  return Buffer.concat([length, body, crc]);
}

let crcTable = null;
function makeCrcTable() {
  let c;
  const table = [];
  for (let n = 0; n < 256; n++) {
    c = n;
    for (let k = 0; k < 8; k++) {
      if (c & 1) c = 0xedb88320 ^ (c >>> 1);
      else c = c >>> 1;
    }
    table[n] = c;
  }
  return table;
}

function calculateCrc(buf) {
  if (!crcTable) crcTable = makeCrcTable();
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

// Draw Pixel-Art Ghost Janitor on an RGBA buffer
function drawGhostJanitor(size, isMaskable = false) {
  const buf = Buffer.alloc(size * size * 4);

  // Background color
  // Dark Game Boy arcade purple
  const bgR = 0x15, bgG = 0x0f, bgB = 0x24, bgA = 0xff;
  for (let i = 0; i < size * size; i++) {
    buf[i * 4] = bgR;
    buf[i * 4 + 1] = bgG;
    buf[i * 4 + 2] = bgB;
    buf[i * 4 + 3] = bgA;
  }

  // Draw decorative outer glowing arcade border
  const margin = isMaskable ? Math.round(size * 0.14) : Math.round(size * 0.05);
  const innerSize = size - margin * 2;

  // Let's create an 18x18 pixel art grid for the Ghost Janitor sprite
  // 0: bg, 1: ghost cyan (#00f0ff), 2: ghost shadow cyan (#00a2c7), 3: eyes dark (#0d0818),
  // 4: janitor cap navy (#2b1e4a), 5: cap gold badge (#f6c90e), 6: broom handle wood (#d4a373),
  // 7: broom bristles (#f72585 / gold), 8: neon sparkles (#39ff14 / #f72585)
  const grid = [
    [0,0,0,0,0, 4,4,4,4,4,4, 0,0,0,0,0,0,0],
    [0,0,0,0, 4,4,5,5,4,4,4,4, 0,0,0,0,0,0],
    [0,0,0, 4,4,4,4,4,4,4,4,4,4, 0,0,0,0,0],
    [0,0, 1,1,1,1,1,1,1,1,1,1,1,1, 0,0,0,0],
    [0, 1,1,1,1,1,1,1,1,1,1,1,1,1,1, 0,0,0],
    [0, 1,1,3,3,1,1,1,1,3,3,1,1,1,1, 0,0,0],
    [0, 1,1,3,3,1,1,1,1,3,3,1,1,1,1, 0,8,0],
    [0, 1,1,1,1,1,1,1,1,1,1,1,1,1,1, 0,0,0],
    [0, 1,1,1,1,1,1,1,1,1,1,1,1,1,1, 0,6,0],
    [0, 2,2,1,1,1,1,1,1,1,1,1,1,2,2, 0,6,0],
    [0, 2,2,2,1,1,1,1,1,1,1,1,2,2,2, 0,6,0],
    [0, 0,2,2,2,1,1,1,1,1,1,2,2,2,0, 0,6,0],
    [0, 1,1,0,1,1,0,1,1,0,1,1,0,1,1, 0,6,0],
    [0, 1,0,0,0,1,0,0,1,0,0,1,0,0,1, 7,7,7],
    [0, 0,0,0,0,0,0,0,0,0,0,0,0,0,0, 7,7,7],
    [0, 8,0,0,0,0,0,0,0,0,0,0,0,0,0, 7,7,7],
    [0, 0,0,0,0,0,0,0,0,0,0,0,0,0,0, 0,7,0],
    [0, 0,0,0,0,0,0,0,0,0,0,0,0,0,0, 0,0,0]
  ];

  const gridH = grid.length;
  const gridW = grid[0].length;
  const pixelScale = Math.floor(innerSize / Math.max(gridW, gridH));
  const startX = margin + Math.floor((innerSize - gridW * pixelScale) / 2);
  const startY = margin + Math.floor((innerSize - gridH * pixelScale) / 2);

  const colors = {
    1: [0x00, 0xf0, 0xff, 0xff], // Cyan Ghost
    2: [0x00, 0xa2, 0xc7, 0xff], // Cyan Shade
    3: [0x0d, 0x08, 0x18, 0xff], // Dark Eyes
    4: [0x9d, 0x4e, 0xdd, 0xff], // Purple Janitor Cap
    5: [0xf6, 0xc9, 0x0e, 0xff], // Gold badge
    6: [0xd4, 0xa3, 0x73, 0xff], // Broom handle
    7: [0xf7, 0x25, 0x85, 0xff], // Neon Pink Bristles
    8: [0x39, 0xff, 0x14, 0xff]  // Neon Green Sparkle
  };

  // Draw background border glow inside frame
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = x - size / 2;
      const dy = y - size / 2;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const maxR = size * 0.48;
      if (dist < maxR) {
        // Radial subtle dark violet gradient
        const factor = dist / maxR;
        const r = Math.round(0x23 * (1 - factor * 0.4));
        const g = Math.round(0x1b * (1 - factor * 0.4));
        const b = Math.round(0x38 * (1 - factor * 0.2));
        const idx = (y * size + x) * 4;
        buf[idx] = r;
        buf[idx + 1] = g;
        buf[idx + 2] = b;
      }
    }
  }

  // Draw grid pixels
  for (let gy = 0; gy < gridH; gy++) {
    for (let gx = 0; gx < gridW; gx++) {
      const cell = grid[gy][gx];
      if (cell === 0) continue;
      const col = colors[cell];
      if (!col) continue;

      const px0 = startX + gx * pixelScale;
      const py0 = startY + gy * pixelScale;

      for (let py = py0; py < py0 + pixelScale; py++) {
        for (let px = px0; px < px0 + pixelScale; px++) {
          if (px >= 0 && px < size && py >= 0 && py < size) {
            const idx = (py * size + px) * 4;
            buf[idx] = col[0];
            buf[idx + 1] = col[1];
            buf[idx + 2] = col[2];
            buf[idx + 3] = col[3];
          }
        }
      }
    }
  }

  return createPNG(size, size, buf);
}

// Generate all required icon files
const iconsDir = path.join(__dirname, 'icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

const targets = [
  { name: 'icon-192.png', size: 192, maskable: false },
  { name: 'icon-512.png', size: 512, maskable: false },
  { name: 'icon-maskable-192.png', size: 192, maskable: true },
  { name: 'icon-maskable-512.png', size: 512, maskable: true },
  { name: 'apple-touch-icon.png', size: 180, maskable: false },
  { name: 'favicon-32x32.png', size: 32, maskable: false },
  { name: 'favicon-16x16.png', size: 16, maskable: false }
];

targets.forEach(t => {
  const png = drawGhostJanitor(t.size, t.maskable);
  fs.writeFileSync(path.join(iconsDir, t.name), png);
  console.log(`Generated ${t.name} (${t.size}x${t.size})`);
});

// Also create a basic favicon.ico (copying 32x32 PNG as ico/png compatible or raw PNG)
fs.writeFileSync(path.join(__dirname, 'favicon.ico'), drawGhostJanitor(32, false));

console.log('All icons generated successfully!');
