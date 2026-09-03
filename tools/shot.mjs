// Look at the thing.
//
//   node tools/shot.mjs [name...]
//
// Lifted from LernInseln, where the rule paid for itself five times:
// every bug that mattered typechecked, ran clean and was obvious the
// moment somebody took a screenshot. Real iPad viewport, touch on,
// driven with tap() rather than click().

import { chromium, devices } from 'playwright';
import { mkdirSync } from 'node:fs';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join } from 'node:path';

const PORT = 8396;
const MIME = {
  '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
  '.png': 'image/png', '.json': 'application/json', '.map': 'application/json',
  '.webp': 'image/webp', '.mp3': 'audio/mpeg', '.webmanifest': 'application/manifest+json',
};

const server = createServer(async (req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (p === '/') p = '/index.html';
  try {
    const data = await readFile(join('dist', p));
    res.writeHead(200, { 'content-type': MIME[extname(p)] ?? 'application/octet-stream' });
    res.end(data);
  } catch {
    res.writeHead(404); res.end('not found');
  }
});
await new Promise((r) => server.listen(PORT, r));

mkdirSync('shots', { recursive: true });

const browser = await chromium.launch();
const ctx = await browser.newContext({
  ...(devices['iPad (gen 7) landscape'] ?? devices['iPad (gen 7)']),
  hasTouch: true,
  isMobile: true,
  viewport: { width: 1080, height: 810 },
  deviceScaleFactor: 2,
});
const page = await ctx.newPage();
page.on('pageerror', (e) => console.log('  page error:', e.message));
page.on('console', (m) => { if (m.type() === 'error') console.log('  console:', m.text()); });

const wanted = process.argv.slice(2);
const want = (n) => wanted.length === 0 || wanted.includes(n);

async function shot(name) {
  await page.waitForTimeout(420);
  await page.screenshot({ path: `shots/${name}.png` });
  console.log(`  shots/${name}.png`);
}

await page.goto(`http://localhost:${PORT}/`);
await page.waitForTimeout(700);
if (want('titel')) await shot('titel');

// Into the character editor from an empty slot.
await page.locator('.platz').first().tap();
await page.waitForTimeout(700);
if (want('editor')) await shot('editor');

// Pick a different look and a name, so the shot shows the thing doing
// its job rather than its defaults.
if (want('editor2')) {
  const proben = page.locator('.reihe').nth(1).locator('.probe');
  if (await proben.count() > 3) await proben.nth(3).tap();
  const kleider = page.locator('.reihe').nth(3).locator('.probe');
  if (await kleider.count() > 4) await kleider.nth(4).tap();
  const frisuren = page.locator('.reihe').nth(2).locator('.probe');
  if (await frisuren.count() > 1) await frisuren.nth(1).tap();
  await page.locator('.namensfeld').fill('Ben');
  await page.waitForTimeout(400);
  await shot('editor2');
}

// Into the world. The name is filled here rather than relying on the
// editor2 shot above having done it — asking for one shot by name must
// not leave the run stuck on a disabled button.
if (!(await page.locator('.namensfeld').inputValue())) {
  await page.locator('.namensfeld').fill('Ben');
  await page.waitForTimeout(250);
}
await page.locator('button', { hasText: 'Los geht es' }).first().tap();
await page.waitForTimeout(1500);

// Luma, saying hello. She is the first thing that happens in a new
// adventure, so she is shot before she is dismissed.
if (want('welt-luma')) await shot('welt-luma');

/** Tap her away, however many lines she has queued up. */
async function lumaWeg() {
  for (let i = 0; i < 4; i++) {
    if (await page.locator('.luma').count() === 0) break;
    await page.locator('.luma').tap();
    await page.waitForTimeout(450);
  }
}
await lumaWeg();
if (want('welt')) await shot('welt');

// Walked east along the path, so the shot shows the lamps and the
// bridge rather than the doorstep the game opens on.
if (want('welt-weg') || want('welt-stick') || want('welt-einstellungen')) {
  await lumaWeg();
  await page.keyboard.down('ArrowRight');
  await page.waitForTimeout(4200);
  await page.keyboard.up('ArrowRight');
  await page.waitForTimeout(300);
  if (want('welt-weg')) await shot('welt-weg');
}

// The thumbstick, mid-drag, where a thumb actually put it.
if (want('welt-stick')) {
  await page.touchscreen.tap(300, 600);          // wake the pointer stack
  await page.mouse.move(300, 620);
  await page.mouse.down();
  await page.mouse.move(340, 600, { steps: 6 });
  await page.waitForTimeout(500);
  await shot('welt-stick');
  await page.mouse.up();
  await page.waitForTimeout(200);
}

if (want('welt-einstellungen')) {
  await page.locator('.hudKnopf').nth(1).tap();
  await page.waitForTimeout(500);
  await shot('welt-einstellungen');
  await page.locator('button', { hasText: 'Weiter spielen' }).first().tap();
  await page.waitForTimeout(300);
}

// Into the house. Walking north out of the doorstep goes through the
// door, which is how a child gets in as well.
if (want('haus') || want('haus-blatt')) {
  await page.evaluate(() => {
    const k = 'funkelwelt.platz0.v1';
    const s = JSON.parse(localStorage.getItem(k));
    s.ort = { x: 7.5, y: 22.4 };
    localStorage.setItem(k, JSON.stringify(s));
  });
  await page.reload();
  await page.waitForTimeout(800);
  await page.locator('.platz').first().tap();
  await page.waitForTimeout(1200);
  await page.keyboard.down('ArrowUp');
  await page.waitForTimeout(900);
  await page.keyboard.up('ArrowUp');
  await page.waitForTimeout(900);
  if (want('haus')) await shot('haus');

  if (want('haus-blatt') || want('haus-paar')) {
    await spieleRunde();
    await page.waitForTimeout(1800);
    if (want('haus-blatt') && await page.locator('.blatt').count()) await shot('haus-blatt');
  }
}

/**
 * Play a whole round, correctly.
 *
 * The numeral on screen IS the question in this house, so reading it and
 * tapping ten-minus-it answers correctly every time. `verify.mjs`
 * deliberately does NOT do this — a check that reimplements the
 * arithmetic is a check that agrees with a bug — but a screenshot tool
 * is not checking anything, it is trying to reach a screen, and a
 * payout sheet from ten right answers is a better picture than one from
 * two.
 */
async function spieleRunde() {
  for (let i = 0; i < 14; i++) {
    if (await page.locator('.blatt').count()) break;
    if (await page.locator('.luma').count()) {
      await page.locator('.luma').tap();
      await page.waitForTimeout(400);
      continue;
    }
    const karten = page.locator('.karten button');
    if (await karten.count() === 0) break;
    const gezeigt = await page.locator('.zahl-gross').first().textContent();
    const will = String(10 - Number(gezeigt));
    const treffer = karten.filter({ hasText: new RegExp(`^${will}$`) });
    if (await treffer.count()) await treffer.first().tap();
    else await karten.first().tap();
    await page.waitForTimeout(1400);
  }
}

// Two numbers becoming friends. Seeded so that one pair is a single
// right answer away, which is the only way to reach this screen
// on purpose rather than after a fortnight of play.
if (want('haus-paar')) {
  await page.evaluate(() => {
    const k = 'funkelwelt.platz0.v1';
    const s = JSON.parse(localStorage.getItem(k));
    s.staerke = {};
    for (let n = 0; n <= 10; n++) s.staerke[`vz:${n}`] = 3;
    s.staerke['vz:2'] = 2;
    s.ort = { x: 7.5, y: 22.4 };
    localStorage.setItem(k, JSON.stringify(s));
  });
  for (let versuch = 0; versuch < 6; versuch++) {
    await page.reload();
    await page.waitForTimeout(800);
    await page.locator('.platz').first().tap();
    await page.waitForTimeout(1200);
    await lumaWeg();
    await page.keyboard.down('ArrowUp');
    await page.waitForTimeout(900);
    await page.keyboard.up('ArrowUp');
    await page.waitForTimeout(900);
    await spieleRunde();
    await page.waitForTimeout(700);
    if (await page.locator('.blatt.paar').count()) {
      await page.waitForTimeout(900);
      await shot('haus-paar');
      break;
    }
    await page.evaluate(() => {
      const k = 'funkelwelt.platz0.v1';
      const s = JSON.parse(localStorage.getItem(k));
      s.staerke['vz:2'] = 2;
      s.ort = { x: 7.5, y: 22.4 };
      localStorage.setItem(k, JSON.stringify(s));
    });
  }
}

// And a slot with somebody in it.
if (want('titel-belegt')) {
  await page.goto(`http://localhost:${PORT}/`);
  await page.waitForTimeout(800);
  await shot('titel-belegt');
}

await browser.close();
server.close();
console.log('done');
