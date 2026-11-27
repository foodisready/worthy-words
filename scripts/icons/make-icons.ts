// Draws the app icons: a cinnabar seal (朱印) with 賢 carved out in white
// (白文), the way a name seal stamps a classical book.
//
// The character comes from Noto Serif TC (SIL Open Font License), subset to
// just 賢 and 文 (see README.md here). Renders with Playwright's Chromium.
// Usage: node scripts/icons/make-icons.ts [--preview]
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { chromium } from '@playwright/test';

const HERE = new URL('.', import.meta.url).pathname;
const PUBLIC = new URL('../../public/', import.meta.url).pathname;

const RED = '#a3271f';
const PAPER = '#f7f3ea';
const FONT = readFileSync(join(HERE, 'noto-serif-tc-900-subset.woff2')).toString('base64');

type Variant = 'seal' | 'full' | 'maskable' | 'tiny';

/**
 * - seal: the seal on a transparent background ("any" icons).
 * - full: fills the square, for iOS, which rounds the corners itself.
 * - maskable: fills the square, character inside the safe circle (80%).
 * - tiny: favicons, no frame, bigger character.
 */
function svg(variant: Variant): string {
  const S = 512;
  const bleed = variant !== 'seal';
  const inset = bleed ? 0 : 20;
  const radius = variant === 'tiny' ? 72 : bleed ? 0 : 96;
  const frame = { seal: 58, full: 60, maskable: 0, tiny: 0 }[variant];
  const size = { seal: 276, full: 270, maskable: 250, tiny: 390 }[variant];
  // The character sits a little high in its em box; nudge it down to centre it.
  const y = S / 2 + size * 0.36;
  return `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${S} ${S}" width="${S}" height="${S}">
  <defs>
    <style>
      @font-face { font-family: Seal; src: url(data:font/woff2;base64,${FONT}) format('woff2'); }
    </style>
  </defs>
  <rect x="${inset}" y="${inset}" width="${S - 2 * inset}" height="${S - 2 * inset}"
        rx="${radius}" fill="${RED}"/>
  ${
    frame
      ? `<rect x="${frame}" y="${frame}" width="${S - 2 * frame}" height="${S - 2 * frame}"
              rx="${bleed ? 18 : 36}" fill="none" stroke="${PAPER}" stroke-width="12"/>`
      : ''
  }
  <text x="${S / 2}" y="${y}" text-anchor="middle" font-family="Seal" font-weight="900"
        font-size="${size}" fill="${PAPER}">賢</text>
</svg>`;
}

const browser = await chromium.launch();
const page = await browser.newPage();

async function render(variant: Variant, px: number): Promise<Buffer> {
  await page.setViewportSize({ width: px, height: px });
  await page.setContent(
    `<html><body style="margin:0;background:transparent">
       <div style="width:${px}px;height:${px}px">${svg(variant).replace(
         /width="512" height="512"/,
         `width="${px}" height="${px}"`,
       )}</div></body></html>`,
  );
  await page.evaluate(() => document.fonts.ready);
  return page.screenshot({ omitBackground: true, clip: { x: 0, y: 0, width: px, height: px } });
}

if (process.argv.includes('--preview')) {
  // One sheet with every variant, on light and dark, for checking the design.
  const variants: Variant[] = ['seal', 'full', 'maskable', 'tiny'];
  const cells = variants
    .map((v) =>
      [192, 64, 32]
        .map(
          (px) =>
            `<div style="width:${px}px;height:${px}px;${v === 'maskable' ? 'border-radius:50%;overflow:hidden;' : ''}">${svg(v).replace(/width="512" height="512"/, `width="${px}" height="${px}"`)}</div>`,
        )
        .join(''),
    )
    .map((row) => `<div style="display:flex;gap:24px;align-items:end;margin:16px">${row}</div>`)
    .join('');
  await page.setViewportSize({ width: 760, height: 1100 });
  await page.setContent(
    `<body style="margin:0;display:flex"><div style="background:#f7f3ea;padding:8px">${cells}</div><div style="background:#1b1916;padding:8px">${cells}</div></body>`,
  );
  await page.evaluate(() => document.fonts.ready);
  const out = process.argv[process.argv.indexOf('--preview') + 1] ?? 'icon-preview.png';
  await page.screenshot({ path: out, fullPage: true });
  console.log(`Wrote ${out}`);
} else {
  for (const px of [72, 96, 128, 144, 152, 192, 384, 512]) {
    writeFileSync(join(PUBLIC, 'icons', `icon-${px}x${px}.png`), await render('seal', px));
  }
  for (const px of [192, 512]) {
    writeFileSync(join(PUBLIC, 'icons', `maskable-${px}x${px}.png`), await render('maskable', px));
  }
  writeFileSync(join(PUBLIC, 'icons', 'apple-touch-icon.png'), await render('full', 180));
  writeFileSync(
    join(PUBLIC, 'favicon.ico'),
    ico([await render('tiny', 16), await render('tiny', 32), await render('tiny', 48)]),
  );
  console.log('Wrote public/icons/*.png and public/favicon.ico');
}
await browser.close();

/** An .ico file holding PNG images (supported by every current browser). */
function ico(pngs: Buffer[]): Buffer {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2); // icon
  header.writeUInt16LE(pngs.length, 4);
  const entries: Buffer[] = [];
  let offset = 6 + 16 * pngs.length;
  for (const png of pngs) {
    const size = png.readUInt32BE(16); // width from the PNG header
    const entry = Buffer.alloc(16);
    entry.writeUInt8(size >= 256 ? 0 : size, 0);
    entry.writeUInt8(size >= 256 ? 0 : size, 1);
    entry.writeUInt16LE(1, 4); // colour planes
    entry.writeUInt16LE(32, 6); // bits per pixel
    entry.writeUInt32LE(png.length, 8);
    entry.writeUInt32LE(offset, 12);
    offset += png.length;
    entries.push(entry);
  }
  return Buffer.concat([header, ...entries, ...pngs]);
}
