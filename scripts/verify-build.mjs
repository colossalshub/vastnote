import { access, readdir, readFile } from 'node:fs/promises';

const required = [
  'dist/index.html',
  'dist/manifest.webmanifest',
  'dist/sw.js',
  'dist/favicon.svg',
  'dist/icons/icon-192.png',
  'dist/icons/icon-512.png',
  'dist/icons/icon-maskable-512.png',
  'dist/icons/apple-touch-icon.png',
];

for (const file of required) {
  await access(file);
}

const manifest = JSON.parse(await readFile('dist/manifest.webmanifest', 'utf8'));
const index = await readFile('dist/index.html', 'utf8');
if (manifest.name !== 'Vastnote') throw new Error('Manifest name mismatch');
if (!manifest.icons?.some((icon) => icon.purpose === 'maskable')) throw new Error('Missing maskable icon');
if (!index.includes('manifest.webmanifest')) throw new Error('Manifest is not linked');
const assets = await readdir('dist/assets');
const scripts = await Promise.all(
  assets.filter((file) => file.endsWith('.js')).map((file) => readFile(`dist/assets/${file}`, 'utf8')),
);
if (!scripts.some((source) => source.includes('serviceWorker'))) {
  throw new Error('Service worker registration was not bundled');
}

console.log('Production build contains the app shell, manifest, and icons.');
