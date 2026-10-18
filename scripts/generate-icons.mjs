import { mkdir, writeFile } from 'node:fs/promises';
import sharp from 'sharp';

const mark = 'M16 3.2 29.2 28H21.6L16 16.4 10.4 28H2.8L16 3.2Z';

function icon(size, paddingRatio) {
  const inner = size * (1 - paddingRatio * 2);
  const scale = inner / 32;
  const offset = (size - inner) / 2;
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" fill="#101114"/>
  <g transform="translate(${offset} ${offset}) scale(${scale})">
    <path fill="#f5f6f8" d="${mark}"/>
  </g>
</svg>`;
}

await mkdir('public/icons', { recursive: true });

const outputs = [
  ['public/icons/icon-192.png', 192, 0.18],
  ['public/icons/icon-512.png', 512, 0.18],
  ['public/icons/apple-touch-icon.png', 180, 0.18],
  ['public/icons/icon-maskable-512.png', 512, 0.28],
];

for (const [file, size, padding] of outputs) {
  const png = await sharp(Buffer.from(icon(size, padding))).png().toBuffer();
  await writeFile(file, png);
}
