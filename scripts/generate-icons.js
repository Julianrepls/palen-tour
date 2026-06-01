// Genera iconos PWA a partir del SVG base.
//
// - Lee public/logo.svg
// - Produce:
//   public/icons/icon-192.png     (icon estándar 192x192)
//   public/icons/icon-512.png     (icon estándar 512x512)
//   public/icons/icon-maskable-512.png (con padding para "maskable" en Android)
//   public/icons/apple-touch-icon.png  (180x180 para iOS)
//   public/logo.png               (copia genérica 512x512 para usos varios)
//
// Uso: npm run gen:icons
//
// El icono "maskable" debe tener un safe zone interior del ~80% para que Android
// pueda recortarlo en círculo/squircle sin perder partes importantes del logo.

import sharp from 'sharp';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '..');
const SRC_SVG = resolve(projectRoot, 'public/logo.svg');
const OUT_DIR = resolve(projectRoot, 'public/icons');

const BG = '#ffffff';
const GREEN = '#16a34a';

// SVG con padding interior para versión "maskable" (logo al 60% del canvas).
const maskableSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 100 100">
  <rect width="100" height="100" fill="${BG}"/>
  <g transform="translate(20 20) scale(2.5)">
    <path d="m8 3 4 8 5-5 5 15H2L8 3z"
          fill="none" stroke="${GREEN}" stroke-width="2"
          stroke-linecap="round" stroke-linejoin="round"/>
  </g>
</svg>`;

// SVG con fondo blanco para iconos normales (icon-192/512, apple).
const filledSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 24 24">
  <rect width="24" height="24" fill="${BG}"/>
  <path d="m8 3 4 8 5-5 5 15H2L8 3z"
        fill="none" stroke="${GREEN}" stroke-width="2"
        stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

async function main() {
  console.log('→ Leyendo', SRC_SVG);
  await readFile(SRC_SVG); // sanity check — falla si no existe el SVG base

  await mkdir(OUT_DIR, { recursive: true });

  const tasks = [
    { name: 'icon-192.png',          size: 192, source: filledSvg },
    { name: 'icon-512.png',          size: 512, source: filledSvg },
    { name: 'icon-maskable-512.png', size: 512, source: maskableSvg },
    { name: 'apple-touch-icon.png',  size: 180, source: filledSvg },
  ];

  for (const { name, size, source } of tasks) {
    const out = resolve(OUT_DIR, name);
    await sharp(Buffer.from(source))
      .resize(size, size)
      .png()
      .toFile(out);
    console.log(`✓ ${name} (${size}x${size})`);
  }

  // Logo genérico 512x512 en public/ para casos sueltos (og:image, etc.)
  const generic = resolve(projectRoot, 'public/logo.png');
  await sharp(Buffer.from(filledSvg)).resize(512, 512).png().toFile(generic);
  console.log('✓ logo.png (512x512) en public/');

  console.log('\nIconos generados en public/icons/');
}

main().catch((e) => {
  console.error('Error generando iconos:', e);
  process.exit(1);
});
