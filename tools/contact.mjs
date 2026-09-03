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
  // `blatt-` because `tools/shot.mjs` writes into the same folder and
  // both tools had a target called `schatten`. The world shot silently
  // overwrote the contact sheet, and the sheet I had just spent ten
  // minutes reading was a screenshot of a completely different screen
  // by the time I looked at it again.
  await page.locator('canvas').screenshot({ path: `shots/blatt-${name}.png` });
  await page.close();
  console.log(`  shots/blatt-${name}.png`);
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
    // No cell tint. Rule 3: judge a sprite on the background it will
    // actually be seen on, and that background is grass. A dark panel
    // behind a character whose legs are dark timber hides the walk
    // cycle, which is the one thing this grid exists to show.
    ctx.drawImage(held(d, f, looks[0]).toCanvas(), x, y, W * SCALE, H * SCALE);
  }
  ctx.fillStyle = '#f8f0dc';
  ctx.fillText(d, 10 + col * CELL_W + (W * SCALE) / 2, 18);
});

looks.forEach((lk, i) => {
  const x = 10 + i * CELL_W;
  const y = 26 + 3 * CELL_H + 24;
  // Every other one wearing the hat from the cart, so that the shop's
  // promise — every effect is visible — can be looked at rather than
  // asserted. It shipped once saying the hat was on his head when it
  // was drawn on nothing at all.
  ctx.drawImage(held('unten', 0, lk, i % 2 === 1).toCanvas(), x, y, W * SCALE, H * SCALE);
});

(window as any).ready = true;
`);
}

// ------------------------------------------------------------- Luma

if (doIt('luma')) {
  await sheet('luma', `
import { portrait, PW, PH } from '../src/spiel/luma.js';

// She is judged at the size she is actually seen — the dialogue box
// draws her at 3x — and on the colour of the box she sits in, which is
// nearly black. A fairy made of light looks completely different on a
// dark ground from how she looks on grass, and the dark ground is the
// only one that will ever happen.
const c = document.createElement('canvas');
c.width = 40 + (2 + 3 + 4 + 6) * PW + 4 * 24;
c.height = 60 + PH * 6;
document.body.appendChild(c);
const ctx = c.getContext('2d')!;
ctx.imageSmoothingEnabled = false;
ctx.fillStyle = '#1a1622';
ctx.fillRect(0, 0, c.width, c.height);
ctx.font = 'bold 15px sans-serif';
ctx.textAlign = 'center';
ctx.fillStyle = '#f8f0dc';

const px = portrait().toCanvas();
let x = 20;
for (const s of [2, 3, 4, 6]) {
  ctx.drawImage(px, x, 40, PW * s, PH * s);
  ctx.fillText(String(s) + 'x', x + (PW * s) / 2, 26);
  x += PW * s + 24;
}

(window as any).ready = true;
`);
}

// ---------------------------------------------------------- a shadow

if (doIt('schatten')) {
  await sheet('schatten', `
import { ARTEN, schatten, SW, SH } from '../src/spiel/schatten.js';

// All five kinds across, four stages of being pushed back down.
//
// The axis that matters is the DOWN one: every one of these has to read
// as dim rather than as dangerous at every stage, and none of them may
// ever read as hurt. The across axis is the new one — five silhouettes
// that must be tellable apart at a glance, because a child should be
// able to say "there's a tall one over there" before they are close
// enough to see the colour.
const S = 5;
const c = document.createElement('canvas');
c.width = 40 + ARTEN.length * (SW * S + 18);
c.height = 50 + 4 * (SH * S + 14);
document.body.appendChild(c);
const ctx = c.getContext('2d')!;
ctx.imageSmoothingEnabled = false;
ctx.fillStyle = '#2f2a3c';
ctx.fillRect(0, 0, c.width, c.height);
ctx.font = 'bold 15px sans-serif';
ctx.textAlign = 'center';

ARTEN.forEach((art, col) => {
  const x = 20 + col * (SW * S + 18);
  ctx.fillStyle = '#f8f0dc';
  ctx.fillText(art, x + (SW * S) / 2, 24);
  [1, 0.66, 0.33, 0.05].forEach((wach, row) => {
    ctx.drawImage(schatten(row % 4, 7 + col, wach, art).toCanvas(),
      x, 34 + row * (SH * S + 14), SW * S, SH * S);
  });
});

(window as any).ready = true;
`);
}

// ------------------------------------------------ links und rechts

if (doIt('fahrzeuge')) {
  await sheet('fahrzeuge', `
import { FAHRZEUGE, fahrzeug, pfeil, FW, FH } from '../src/games/fahrzeuge.js';

// Both directions of all five, side by side, at the size they are
// tapped and at the size a doubting adult wants.
//
// The pairs are stacked so the mirror can be checked at a glance: a
// vehicle that reads as going right in one row and as nothing in
// particular in the other is a vehicle whose direction lives entirely
// in the speed lines, and this whole exercise is about the direction.
const SCALE = 5;
const CELL_W = FW * SCALE + 20, CELL_H = FH * SCALE + 22;

const c = document.createElement('canvas');
c.width = 20 + FAHRZEUGE.length * CELL_W;
c.height = 40 + 2 * CELL_H + 40 + 34 * 4;
document.body.appendChild(c);
const ctx = c.getContext('2d')!;
ctx.imageSmoothingEnabled = false;
// On the tan of the round screen, which is the only ground these are
// ever seen on — not on grass, and not on a dark panel.
ctx.fillStyle = '#e8dcc0';
ctx.fillRect(0, 0, c.width, c.height);
ctx.font = 'bold 15px sans-serif';
ctx.textAlign = 'center';

FAHRZEUGE.forEach((f, i) => {
  const x = 10 + i * CELL_W;
  ctx.fillStyle = '#2a2030';
  ctx.fillText(f, x + (FW * SCALE) / 2, 22);
  ['rechts', 'links'].forEach((nach, row) => {
    ctx.drawImage(fahrzeug(f, nach).toCanvas(),
      x, 32 + row * CELL_H, FW * SCALE, FH * SCALE);
  });
});

// And the two arrows the question is asked with.
const ay = 40 + 2 * CELL_H;
ctx.fillStyle = '#2a2030';
ctx.fillText('die Frage', 10 + CELL_W, ay + 16);
['rechts', 'links'].forEach((nach, i) => {
  ctx.drawImage(pfeil(nach).toCanvas(), 20 + i * 34 * 5, ay + 26, 34 * 4, 34 * 4);
});

(window as any).ready = true;
`);
}

await browser.close();
rmSync('.contact', { recursive: true, force: true });
