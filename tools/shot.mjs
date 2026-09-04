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
await page.waitForTimeout(900);
if (want('start')) await shot('start');

/** Through the door: one picture, one button. */
async function starten() {
  if (await page.locator('.start').count()) {
    await page.locator('button', { hasText: 'Spiel starten' }).first().tap();
    await page.waitForTimeout(600);
  }
}
await starten();
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

// Waking up: the lantern opening out of the dark.
if (want('welt-wach')) {
  await page.waitForTimeout(200);
  await shot('welt-wach');
}

// Luma, saying hello. She is the first thing that happens in a new
// adventure, so she is shot before she is dismissed.
await page.waitForTimeout(1200);
if (want('welt-luma')) await shot('welt-luma');

// The ring she asks the child to walk to — the only thing this game
// ever teaches, and it teaches it by asking.
if (want('welt-ring')) {
  await page.locator('.luma').tap();
  await page.waitForTimeout(900);
  await shot('welt-ring');
}

/** Tap her away, however many lines she has queued up. */
async function lumaWeg() {
  for (let i = 0; i < 4; i++) {
    if (await page.locator('.luma').count() === 0) break;
    await page.locator('.luma').tap();
    await page.waitForTimeout(350);
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

// The language house: a picture, an ear, and four letters.
// Das Haus der Addition, and its neighbour's plaque two screens south.
if (want('addition')) {
  await page.evaluate(() => {
    const k = 'funkelwelt.platz0.v1';
    const s = JSON.parse(localStorage.getItem(k));
    s.ort = { x: 7.5, y: 13.4 };
    localStorage.setItem(k, JSON.stringify(s));
  });
  await page.reload();
  await page.waitForTimeout(800);
  await starten();
  await page.locator('.platz').first().tap();
  await page.waitForTimeout(2400);
  await lumaWeg();
  await shot('addition-welt');
  await page.keyboard.down('ArrowUp');
  await page.waitForTimeout(700);
  await page.keyboard.up('ArrowUp');
  await page.waitForTimeout(1600);
  await lumaWeg();
  for (let i = 0; i < 3; i++) {
    await shot(`addition-${i + 1}`);
    await page.locator('.karten button').first().tap();
    await page.waitForTimeout(2100);
    await lumaWeg();
  }
}

// Das Haus von links und rechts: the approach and two questions.
if (want('richtung')) {
  await page.evaluate(() => {
    const k = 'funkelwelt.platz0.v1';
    const s = JSON.parse(localStorage.getItem(k));
    s.ort = { x: 40.5, y: 19.4 };
    localStorage.setItem(k, JSON.stringify(s));
  });
  await page.reload();
  await page.waitForTimeout(800);
  await starten();
  await page.locator('.platz').first().tap();
  await page.waitForTimeout(2400);
  await lumaWeg();
  await shot('richtung-welt');
  await page.keyboard.down('ArrowUp');
  await page.waitForTimeout(700);
  await page.keyboard.up('ArrowUp');
  await page.waitForTimeout(1600);
  await lumaWeg();
  for (let i = 0; i < 2; i++) {
    await shot(`richtung-${i + 1}`);
    await page.locator('.karten button').first().tap();
    await page.waitForTimeout(2100);
    await lumaWeg();
  }
}

// The map, with one house finished and one gate open, so both states
// of both markers are in the same picture.
if (want('karte')) {
  await page.evaluate(() => {
    const k = 'funkelwelt.platz0.v1';
    const s = JSON.parse(localStorage.getItem(k));
    s.ort = { x: 22.5, y: 14.5 };
    s.sterne = { mathe: 40, wort: 0 };
    s.geschafft = { 'verliebte-zahlen': 2, richtung: 1 };
    localStorage.setItem(k, JSON.stringify(s));
  });
  await page.reload();
  await page.waitForTimeout(800);
  await starten();
  await page.locator('.platz').first().tap();
  await page.waitForTimeout(2400);
  await lumaWeg();
  await page.locator('.hudKnopf').last().tap();
  await page.waitForTimeout(500);
  await page.locator('.kartenknopf').first().tap();
  await page.waitForTimeout(700);
  await shot('karte');
}

// The selection ring: a house tapped from across the meadow, caught
// while he is still walking to it.
if (want('auswahl')) {
  await page.evaluate(() => {
    const k = 'funkelwelt.platz0.v1';
    const s = JSON.parse(localStorage.getItem(k));
    s.ort = { x: 23.5, y: 17.5 };
    localStorage.setItem(k, JSON.stringify(s));
  });
  await page.reload();
  await page.waitForTimeout(800);
  await starten();
  await page.locator('.platz').first().tap();
  await page.waitForTimeout(2400);
  await lumaWeg();
  // From the east along the path: the viewport is thirteen tiles tall,
  // so a door six tiles NORTH of him is off the top of the screen and a
  // click there lands nowhere. Three earlier attempts at this picture
  // failed for exactly that and looked like a drawing bug.
  const p = await page.evaluate(() => window.weltOrt?.(17 * 16 + 8, 17 * 16 + 8) ?? null);
  if (p) {
    await page.mouse.click(p[0], p[1]);
    await page.waitForTimeout(450);
    await shot('auswahl');
  }
}

// The three strikes: two used, and a card mid-flash.
if (want('strikes')) {
  await page.evaluate(() => {
    const k = 'funkelwelt.platz0.v1';
    const s = JSON.parse(localStorage.getItem(k));
    s.ort = { x: 7.5, y: 22.4 };
    localStorage.setItem(k, JSON.stringify(s));
  });
  await page.reload();
  await page.waitForTimeout(800);
  await starten();
  await page.locator('.platz').first().tap();
  await page.waitForTimeout(2400);
  await lumaWeg();
  const p = await page.evaluate(() => window.weltOrt?.(7 * 16 + 8, 20 * 16 + 8) ?? null);
  if (p) {
    await page.mouse.click(p[0], p[1]);
    await page.waitForTimeout(2600);
    await lumaWeg();
    // Two wrong answers, then a third tapped and caught mid-flash.
    for (let i = 0; i < 3; i++) {
      const zahl = await page.locator('.frage[data-zahl]').first()
        .getAttribute('data-zahl').catch(() => null);
      const karten = page.locator('.karten button');
      const labels = await karten.evaluateAll(
        (els) => els.map((e) => (e.textContent ?? '').trim()));
      const idx = labels.findIndex((l) => l !== String(10 - Number(zahl)));
      if (idx < 0) break;
      await karten.nth(idx).tap();
      if (i === 1) { await page.waitForTimeout(130); await shot('strikes'); }
      await page.waitForTimeout(900);
    }
  }
}

// The cart, with coins for two of the four things on it.
if (want('laden')) {
  await page.evaluate(() => {
    const k = 'funkelwelt.platz0.v1';
    const s = JSON.parse(localStorage.getItem(k));
    s.ort = { x: 12.5, y: 22.4 };
    s.muenzen = 42;
    s.ausruestung = ['hut'];
    localStorage.setItem(k, JSON.stringify(s));
  });
  await page.reload();
  await page.waitForTimeout(800);
  await starten();
  await page.locator('.platz').first().tap();
  await page.waitForTimeout(2400);
  await lumaWeg();
  await shot('laden-welt');
  await page.keyboard.down('ArrowUp');
  await page.waitForTimeout(400);
  await page.keyboard.up('ArrowUp');
  await page.waitForTimeout(1200);
  await lumaWeg();
  await shot('laden');
}

// Both gates side by side, shut: one wants numbers, one wants words,
// and a child has to be able to tell which is which before they can
// tell how many.
if (want('tore')) {
  for (const [name, ort] of [['tor-zahlen', { x: 43.5, y: 9.6 }],
                             ['tor-woerter', { x: 39.4, y: 29.5 }]]) {
    await page.evaluate((o) => {
      const k = 'funkelwelt.platz0.v1';
      const s = JSON.parse(localStorage.getItem(k));
      s.ort = o;
      s.sterne = { mathe: 0, wort: 0 };
      s.gehoert = ['say.willkommen', 'say.tippen'];
      localStorage.setItem(k, JSON.stringify(s));
    }, ort);
    await page.reload();
    await page.waitForTimeout(800);
    await starten();
    await page.locator('.platz').first().tap();
    await page.waitForTimeout(2400);
    await lumaWeg();
    await shot(name);
  }
}

// The gate, shut and open, from the same spot — which is the whole
// point of it: the world did not change, the child did.
if (want('tor')) {
  for (const [name, sterne] of [['tor-zu', 0], ['tor-auf', 40]]) {
    await page.evaluate((st) => {
      const k = 'funkelwelt.platz0.v1';
      const s = JSON.parse(localStorage.getItem(k));
      s.ort = { x: 43.5, y: 9.6 };
      s.sterne = { mathe: st, wort: 0 };
      s.gehoert = [];
      localStorage.setItem(k, JSON.stringify(s));
    }, sterne);
    await page.reload();
    await page.waitForTimeout(800);
    await starten();
    await page.locator('.platz').first().tap();
    await page.waitForTimeout(2400);
    await lumaWeg();
    await page.keyboard.down('ArrowUp');
    await page.waitForTimeout(420);
    await page.keyboard.up('ArrowUp');
    await page.waitForTimeout(900);
    await shot(name);
    await lumaWeg();
  }
}

// Meeting a shadow. Seeded next to the nearest one and walked into it.
if (want('schatten')) {
  await page.evaluate(() => {
    const k = 'funkelwelt.platz0.v1';
    const s = JSON.parse(localStorage.getItem(k));
    s.ort = { x: 18.5, y: 9.6 };
    s.schatten = [];
    localStorage.setItem(k, JSON.stringify(s));
  });
  await page.reload();
  await page.waitForTimeout(800);
  await starten();
  await page.locator('.platz').first().tap();
  await page.waitForTimeout(2400);
  await lumaWeg();
  await shot('schatten-welt');
  // Down onto the shadow at (18,11), from the north. He used to be
  // placed south of it at y 12.6 — which is inside Das Haus der
  // Nachbarzahlen since the houses were rearranged, so this shot had
  // quietly become a picture of a completely different screen.
  await page.keyboard.down('ArrowDown');
  await page.waitForTimeout(900);
  await page.keyboard.up('ArrowDown');
  await page.waitForTimeout(1400);
  await lumaWeg();
  await shot('schatten');
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
  await starten();
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
  for (let versuch = 0; versuch < 6; versuch++) {
    // Seeded fresh EVERY attempt. Seeding once and looping was enough
    // when this ran on its own and not enough in a full run, because the
    // round before it had already moved every strength — which is the
    // same shape of bug as a check that asserts an absolute.
    // Seeded AFTER the reload, not before it.
    //
    // Before it, the previous round's page is still alive and the
    // world's five-second autosave writes the whole in-memory save back
    // over the seed. The symptom was a pair that completed — vz:2 went
    // from 2 to 3 — and a celebration that never fired, because the
    // round had started from a save where it was already 3.
    await page.reload();
    await page.waitForTimeout(700);
    await starten();
    await page.evaluate(() => {
      const k = 'funkelwelt.platz0.v1';
      const s = JSON.parse(localStorage.getItem(k));
      s.staerke = {};
      for (let n = 0; n <= 10; n++) s.staerke[`vz:${n}`] = 3;
      s.staerke['vz:2'] = 2;
      s.ort = { x: 7.5, y: 22.4 };
      localStorage.setItem(k, JSON.stringify(s));
    });
    await page.reload();
    await page.waitForTimeout(700);
    await starten();
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
  }
}

// And a slot with somebody in it.
if (want('titel-belegt')) {
  await page.goto(`http://localhost:${PORT}/`);
  await page.waitForTimeout(800);
  await starten();
  await shot('titel-belegt');
}

await browser.close();
server.close();
console.log('done');
