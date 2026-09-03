// Contact sheets. Look at the sprites before building anything on them.
//
//   node tools/contact.mjs held
//
// Lifted from LernInseln, where it earned its keep twice over: it found
// four broken word pictures, six broken island sprites, and six letters
// whose stroke direction was wrong. A sprite nobody has looked at is a
// sprite that is probably wrong.

import esbuild from 'esbuild';
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';

const want = process.argv.slice(2);
const doIt = (n) => want.length === 0 || want.includes(n);

mkdirSync('shots', { recursive: true });
mkdirSync('.contact', { recursive: true });

const browser = await chromium.launch();

async function sheet(name, source) {
  writeFileSync('.contact/entry.ts', source);
  await esbuild.build({
    entryPoints: ['.contact/entry.ts'],
    bundle: true,
    outfile: '.contact/bundle.js',
    format: 'iife',
    logLevel: 'error',
  });
  writeFileSync('.contact/index.html',
    '<!doctype html><meta charset="utf-8">'
    + '<body style="margin:0;background:#173a5c">'
    + '<script src="bundle.js"></script>');

  const page = await browser.newPage({ deviceScaleFactor: 1 });
  page.on('pageerror', (e) => console.log('  page error:', e.message));
  await page.goto(`file://${process.cwd().replace(/\\/g, '/')}/.contact/index.html`);
  await page.waitForFunction(() => window.ready === true, { timeout: 15000 });
  await page.locator('canvas').screenshot({ path: `shots/${name}.png` });
  await page.close();
  console.log(`  shots/${name}.png`);
}

// ------------------------------------------------------- the adventurer

if (doIt('held')) {
  await sheet('held', `
import { held } from '../src/spiel/held.js';

// Every direction across, every walk frame down — a walk cycle is only
// judgeable as a ROW and a direction only as a set. Then six whole
// characters, to see whether they read as different people or as one
// person in six jumpers.
const SCALE = 5, W = 18, H = 26;
const CELL_W = W * SCALE + 20, CELL_H = H * SCALE + 20;
const dirs: ('unten' | 'oben' | 'links' | 'rechts')[] = ['unten', 'oben', 'links', 'rechts'];

const looks = [
  { haut: 1, haar: 1, frisur: 0, kleid: 0 },
  { haut: 2, haar: 2, frisur: 1, kleid: 4 },
  { haut: 0, haar: 0, frisur: 2, kleid: 1 },
  { haut: 3, haar: 3, frisur: 0, kleid: 2 },
  { haut: 1, haar: 4, frisur: 1, kleid: 5 },
  { haut: 2, haar: 5, frisur: 2, kleid: 3 },
];

const c = document.createElement('canvas');
c.width = Math.max(dirs.length, looks.length) * CELL_W + 20;
c.height = 4 * CELL_H + 70;
document.body.appendChild(c);
const ctx = c.getContext('2d')!;
ctx.imageSmoothingEnabled = false;
ctx.fillStyle = '#548544';
ctx.fillRect(0, 0, c.width, c.height);
ctx.font = 'bold 15px sans-serif';
ctx.textAlign = 'center';

dirs.forEach((d, col) => {
  for (let f = 0; f < 3; f++) {
    const x = 10 + col * CELL_W;
    const y = 26 + f * CELL_H;
    ctx.fillStyle = 'rgba(36,29,43,0.12)';
    ctx.fillRect(x, y, W * SCALE, H * SCALE);
    ctx.drawImage(held(d, f, looks[0]).toCanvas(), x, y, W * SCALE, H * SCALE);
  }
  ctx.fillStyle = '#f8f0dc';
  ctx.fillText(d, 10 + col * CELL_W + (W * SCALE) / 2, 18);
});

looks.forEach((lk, i) => {
  const x = 10 + i * CELL_W;
  const y = 26 + 3 * CELL_H + 24;
  ctx.fillStyle = 'rgba(36,29,43,0.12)';
  ctx.fillRect(x, y, W * SCALE, H * SCALE);
  ctx.drawImage(held('unten', 0, lk).toCanvas(), x, y, W * SCALE, H * SCALE);
});

(window as any).ready = true;
`);
}

await browser.close();
rmSync('.contact', { recursive: true, force: true });
