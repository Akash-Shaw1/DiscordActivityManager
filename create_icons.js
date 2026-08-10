import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

function createPngBuffer(width, height, r, g, b, a) {
  // Signature
  const sig = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
  
  // IHDR chunk
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // bit depth
  ihdrData[9] = 6; // color type 6 (RGBA)
  ihdrData[10] = 0; // compression
  ihdrData[11] = 0; // filter
  ihdrData[12] = 0; // interlace
  
  const ihdrChunk = makeChunk('IHDR', ihdrData);

  // Raw pixel data with filter byte per scanline
  const rowSize = 1 + width * 4;
  const rawData = Buffer.alloc(height * rowSize);
  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowSize;
    rawData[rowOffset] = 0; // Filter 0 (None)
    for (let x = 0; x < width; x++) {
      const pxOffset = rowOffset + 1 + x * 4;
      rawData[pxOffset] = r;
      rawData[pxOffset + 1] = g;
      rawData[pxOffset + 2] = b;
      rawData[pxOffset + 3] = a;
    }
  }

  const idatCompressed = zlib.deflateSync(rawData);
  const idatChunk = makeChunk('IDAT', idatCompressed);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([sig, ihdrChunk, idatChunk, iendChunk]);
}

function makeChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  
  const typeBuf = Buffer.from(type, 'ascii');
  const bufForCrc = Buffer.concat([typeBuf, data]);
  
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(bufForCrc), 0);
  
  return Buffer.concat([len, typeBuf, data, crc]);
}

// Simple CRC32 implementation
function crc32(buf) {
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i];
    for (let j = 0; j < 8; j++) {
      if (crc & 1) {
        crc = (crc >>> 1) ^ 0xEDB88320;
      } else {
        crc = crc >>> 1;
      }
    }
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

function createIcoBuffer(pngBuffer, width, height) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // Reserved
  header.writeUInt16LE(1, 2); // Type 1 = ICO
  header.writeUInt16LE(1, 4); // 1 image

  const dir = Buffer.alloc(16);
  dir[0] = width >= 256 ? 0 : width;
  dir[1] = height >= 256 ? 0 : height;
  dir[2] = 0; // Colors
  dir[3] = 0; // Reserved
  dir.writeUInt16LE(1, 4); // Planes
  dir.writeUInt16LE(32, 6); // Bits per pixel
  dir.writeUInt32LE(pngBuffer.length, 8); // Size of image data
  dir.writeUInt32LE( header.length + dir.length, 12); // Offset of image data

  return Buffer.concat([header, dir, pngBuffer]);
}

const iconsDir = path.resolve('src-tauri/icons');
fs.mkdirSync(iconsDir, { recursive: true });

// Discord Blurple color rgba(88, 101, 242, 255)
const p32 = createPngBuffer(32, 32, 88, 101, 242, 255);
const p128 = createPngBuffer(128, 128, 88, 101, 242, 255);
const p256 = createPngBuffer(256, 256, 88, 101, 242, 255);
const ico = createIcoBuffer(p32, 32, 32);

fs.writeFileSync(path.join(iconsDir, '32x32.png'), p32);
fs.writeFileSync(path.join(iconsDir, '128x128.png'), p128);
fs.writeFileSync(path.join(iconsDir, '128x128@2x.png'), p256);
fs.writeFileSync(path.join(iconsDir, 'icon.png'), p256);
fs.writeFileSync(path.join(iconsDir, 'icon.ico'), ico);
fs.writeFileSync(path.join(iconsDir, 'Square30x30Logo.png'), p32);
fs.writeFileSync(path.join(iconsDir, 'Square44x44Logo.png'), p32);
fs.writeFileSync(path.join(iconsDir, 'Square71x71Logo.png'), p128);
fs.writeFileSync(path.join(iconsDir, 'Square89x89Logo.png'), p128);
fs.writeFileSync(path.join(iconsDir, 'Square107x107Logo.png'), p128);
fs.writeFileSync(path.join(iconsDir, 'Square142x142Logo.png'), p128);
fs.writeFileSync(path.join(iconsDir, 'Square150x150Logo.png'), p128);

console.log('Icons generated successfully in src-tauri/icons/');
