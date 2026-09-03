// The verification suite.
//
//   node tools/verify.mjs
//
// Lifted in spirit from LernInseln, where it caught things nothing else
// did — a full-screen layer that swallowed every tap, a voice set that
// could have vanished silently, a performance check that was measuring
// the harness rather than the app.
//
// The rules it inherits:
//
//   * Every interactive element measured >=64x64 CSS px BY A TEST.
//   * Driven with tap(), not click(): a test that clicks will pass on a
//     build no child can operate.
//   * Assert the PROMISE, not the intention — "nothing leaves the
//     device" is a check on every request's origin, not a comment.
//   * A new check must be seen to fail before it is trusted to pass.

import { chromium, devices } from 'playwright';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join } from 'node:path';
import { inflateSync } from 'node:zlib';

const PORT = 8395;
const MIME = {
  '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
  '.png': 'image/png', '.json': 'application/json', '.map': 'application/json',
  '.mp3': 'audio/mpeg', '.webmanifest': 'application/manifest+json',
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
const BASE = `http://localhost:${PORT}/`;

let failures = 0;
function check(name, ok, detail = '') {
  console.log(`  ${ok ? 'ok  ' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
  if (!ok) failures++;
}

const browser = await chromium.launch();
const ctx = await browser.newContext({
  ...(devices['iPad (gen 7) landscape'] ?? devices['iPad (gen 7)']),
  hasTouch: true,
  isMobile: true,
  viewport: { width: 1080, height: 810 },
  deviceScaleFactor: 2,
});
const page = await ctx.newPage();

const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

const notFound = [];
page.on('response', (r) => { if (r.status() === 404) notFound.push(new URL(r.url()).pathname); });
const offsite = new Set();
page.on('request', (r) => {
  const u = new URL(r.url());
  if (u.origin !== new URL(BASE).origin) offsite.add(u.origin);
});

/** Every visible button, measured. Apple's 44pt is for adults. */
async function measureButtons(where) {
  const boxes = await page.locator('button:visible').evaluateAll((els) =>
    els.map((e) => {
      const r = e.getBoundingClientRect();
      return {
        w: Math.round(r.width), h: Math.round(r.height),
        label: (e.textContent || '').trim().slice(0, 18),
      };
    }));
  // The little delete button on an occupied slot is deliberately 44px —
  // it is for the grown-up and it must NOT be easy for a child to hit.
  const small = boxes.filter((b) => (b.w < 64 || b.h < 64) && b.label !== 'Löschen');
  check(`${where}: every child-facing button is at least 64x64 (${boxes.length} measured)`,
    small.length === 0,
    small.map((b) => `"${b.label}" ${b.w}x${b.h}`).join(', '));
}

// ---------------------------------------------------------- title screen

await page.goto(BASE);
await page.waitForTimeout(700);

check('the title screen offers three slots',
  await page.locator('.platz').count() === 3);
await measureButtons('title');

// ------------------------------------------------------------ character

await page.locator('.platz').first().tap();
await page.waitForTimeout(600);
check('an empty slot opens the character editor',
  await page.locator('.namensfeld').count() === 1);
await measureButtons('editor');

// The adventurer cannot be created without a name. A slot called ""
// would show as empty on the title screen and be unreachable forever.
const gesperrt = await page.locator('button', { hasText: 'Los geht es' })
  .first().isDisabled();
check('you cannot set out without a name', gesperrt);

await page.locator('.namensfeld').fill('Testkind');
await page.waitForTimeout(200);
const frei = !(await page.locator('button', { hasText: 'Los geht es' })
  .first().isDisabled());
check('and you can once you have one', frei);

// Every hairstyle swatch draws the style rather than a flat colour —
// they were three identical cream squares once, which told a child
// nothing at all.
const frisuren = page.locator('.reihe').nth(2).locator('.probe canvas');
check('the hairstyles are shown, not just named',
  await frisuren.count() === 3, `${await frisuren.count()} drawn`);

// --------------------------------------------------------------- saving

await page.locator('button', { hasText: 'Los geht es' }).first().tap();
await page.waitForTimeout(500);
const gespeichert = await page.evaluate(() => {
  const raw = localStorage.getItem('funkelwelt.platz0.v1');
  return raw ? JSON.parse(raw) : null;
});
check('the adventurer is written to slot one',
  gespeichert && gespeichert.name === 'Testkind', `name=${gespeichert && gespeichert.name}`);

await page.reload();
await page.waitForTimeout(700);
check('and is still there after a reload',
  (await page.locator('.pname').first().textContent()) === 'Testkind');

// The other two slots must be untouched: three saves that overwrite
// each other are one save with extra steps.
const andere = await page.evaluate(() => [
  localStorage.getItem('funkelwelt.platz1.v1'),
  localStorage.getItem('funkelwelt.platz2.v1'),
]);
check('the other two slots are untouched', andere.every((x) => x === null));

// --------------------------------------------------------------- world
//
// PLAN.md item 1, and the reason it gets this much of the suite: the
// walking is the thing everything else will be built on top of, and
// every one of its failure modes is silent. A hero who does not move, a
// wall that is not solid, a steering mode that is wired to nothing —
// all of them typecheck, none of them throws, and all of them are
// obvious the moment something drives the game with a finger.

/** Read the slot the way the app wrote it. */
const slot = () => page.evaluate(() =>
  JSON.parse(localStorage.getItem('funkelwelt.platz0.v1') ?? 'null'));

/** Put the adventurer somewhere, so a check does not have to walk there. */
async function stellAuf(x, y) {
  await page.evaluate(([px, py]) => {
    const k = 'funkelwelt.platz0.v1';
    const s = JSON.parse(localStorage.getItem(k));
    s.ort = { x: px, y: py };
    localStorage.setItem(k, JSON.stringify(s));
  }, [x, y]);
}

/** Open slot one and wait for the region to be composited. */
async function inDieWelt() {
  await page.goto(BASE);
  await page.waitForTimeout(700);
  await page.locator('.platz').first().tap();
  await page.waitForTimeout(1200);
}

/** Walk with the keyboard, then leave — leaving is what saves the spot. */
async function laufe(taste, ms) {
  await page.keyboard.down(taste);
  await page.waitForTimeout(ms);
  await page.keyboard.up(taste);
  await page.waitForTimeout(200);
}

await inDieWelt();
check('opening an occupied slot opens the world, not a placeholder',
  await page.locator('.hud').count() === 1 && await page.locator('.beutel').count() === 1);
await measureButtons('world');

{
  // Put him down first. A fresh slot's `ort` is 0,0 and the world spawns
  // him at the door instead, so measuring from the stored spot before
  // he has ever been anywhere measures the spawn rather than the walk.
  await stellAuf(14.5, 22.5);
  await inDieWelt();
  const vor = (await slot()).ort;
  await laufe('ArrowRight', 1200);
  await page.locator('.hudKnopf').first().tap();
  await page.waitForTimeout(400);
  const nach = (await slot()).ort;
  check('the adventurer walks', nach.x - vor.x > 1.5,
    `moved ${(nach.x - vor.x).toFixed(2)} tiles east`);
  check('and the spot is still there after leaving',
    Math.abs(nach.y - vor.y) < 0.5, `y ${vor.y.toFixed(2)} -> ${nach.y.toFixed(2)}`);
}

// The house is solid.
//
// Measured against its WALL rather than against its door, and the door
// is the reason: this check used to walk north out of the doorstep and
// assert that the house stopped him, and the moment the door started
// opening it stopped measuring the wall and started measuring the door.
// It failed loudly rather than quietly, which is the whole argument for
// asserting on a saved coordinate instead of on a screenshot.
//
// From four tiles east of the house at wall height, walking west for
// three seconds would cover eight tiles if nothing stopped it.
{
  await inDieWelt();
  await stellAuf(13.5, 17.5);
  await inDieWelt();
  await laufe('ArrowLeft', 3000);
  await page.locator('.hudKnopf').first().tap();
  await page.waitForTimeout(400);
  const ort = (await slot()).ort;
  check('a wall is a wall — the house stops you at its side',
    ort.x > 10, `stopped at x ${ort.x.toFixed(2)}`);
}

// -------------------------------------------------------------- the house
//
// PLAN.md item 2. The door is the most obvious thing on the screen and a
// child will try it in the first ten seconds, so the whole path through
// it gets asserted: it opens, it asks something, an answer counts, and
// what it pays is stars and not something else.

{
  await inDieWelt();
  await stellAuf(7.5, 22.4);
  await inDieWelt();
  await laufe('ArrowUp', 900);
  await page.waitForTimeout(900);
  check('walking into the door opens the house',
    await page.locator('.runde').count() === 1);
  check('and it asks ten things', await page.locator('.pip').count() === 10);
  await measureButtons('house');

  // A question is a picture, never a sentence. The child cannot read.
  check('the question is shown, not written',
    await page.locator('.zehnerfeld canvas').count() === 1);

  // Answer the round. The right card is whichever one the app says is
  // right — reimplementing the arithmetic here would only produce a
  // check that agrees with a bug.
  let gestellt = 0;
  for (let i = 0; i < 14; i++) {
    if (await page.locator('.blatt').count()) break;
    const karten = page.locator('.karten button');
    const n = await karten.count();
    if (n === 0) break;
    gestellt++;
    await karten.first().tap();
    await page.waitForTimeout(2400);
  }
  check('answering ten of them finishes the round',
    await page.locator('.blatt').count() === 1, `answered ${gestellt}`);

  await page.waitForTimeout(1800);
  const s = await slot();
  check('a round pays Mathe-Sterne', s.sterne.mathe > 0, `${s.sterne.mathe} stars`);
  check('and never Wort-Sterne, which it did not teach', s.sterne.wort === 0);
  check('the house counts how often it has been cleared',
    s.geschafft['verliebte-zahlen'] === 1, JSON.stringify(s.geschafft));
  // The scheduler has to have learned something, or the spaced
  // repetition is a comment rather than a mechanism.
  check('what was asked is remembered, per fact',
    Object.keys(s.staerke).length > 0, `${Object.keys(s.staerke).length} facts`);

  await page.locator('button', { hasText: 'Zurück in die Welt' }).first().tap();
  await page.waitForTimeout(600);
  check('and it comes back out into the world',
    await page.locator('.hud').count() === 1);
}

// Touch, not clicks. A thumbstick driven by a mouse would pass on a
// build no child can operate, so this one goes through real touch
// events: down where the thumb lands, drag, hold, release.
{
  await inDieWelt();
  await stellAuf(14.5, 22.5);
  await inDieWelt();
  const vor = (await slot()).ort;
  const cdp = await ctx.newCDPSession(page);
  const touch = (type, x, y) => cdp.send('Input.dispatchTouchEvent', {
    type,
    touchPoints: type === 'touchEnd' ? [] : [{ x, y, radiusX: 12, radiusY: 12, force: 1 }],
  });
  await touch('touchStart', 300, 600);
  await touch('touchMove', 344, 600);
  await page.waitForTimeout(1100);
  await touch('touchEnd', 344, 600);
  await page.waitForTimeout(200);
  await page.locator('.hudKnopf').first().tap();
  await page.waitForTimeout(400);
  const nach = (await slot()).ort;
  check('the thumbstick moves him under a real finger',
    nach.x - vor.x > 1.2, `moved ${(nach.x - vor.x).toFixed(2)} tiles`);
}

// Tap-to-walk, the other half of HANDOVER.md's open question. It is no
// use offering the choice if one of the two does nothing.
{
  await inDieWelt();
  await stellAuf(14.5, 22.5);
  await inDieWelt();
  await page.locator('.hudKnopf').nth(1).tap();
  await page.waitForTimeout(400);
  await page.locator('button', { hasText: 'Tippen' }).first().tap();
  await page.waitForTimeout(200);
  await page.locator('button', { hasText: 'Weiter spielen' }).first().tap();
  await page.waitForTimeout(300);
  check('the steering choice is remembered', (await slot()).steuerung === 'tippen');
  await page.touchscreen.tap(880, 420);
  await page.waitForTimeout(2200);
  await page.locator('.hudKnopf').first().tap();
  await page.waitForTimeout(400);
  const ort = (await slot()).ort;
  check('tapping a spot walks him to it',
    ort.x - 14.5 > 1.2, `moved ${(ort.x - 14.5).toFixed(2)} tiles towards the tap`);
}

// A lightspark is picked up by walking into it and pays coins — never
// stars, which are the record of what has been learned.
{
  await inDieWelt();
  await page.evaluate(() => {
    const k = 'funkelwelt.platz0.v1';
    const s = JSON.parse(localStorage.getItem(k));
    s.ort = { x: 27.5, y: 15.9 };
    s.funken = [];
    s.muenzen = 0;
    s.steuerung = 'stick';
    localStorage.setItem(k, JSON.stringify(s));
  });
  await inDieWelt();
  // Measured as a DIFFERENCE, not against zero. The house above already
  // paid this slot some Mathe-Sterne, and a check that asserts "no stars
  // at all" is really asserting "nothing else in the suite earned any",
  // which is a check about the suite rather than about the sparks.
  const vor = await slot();
  await laufe('ArrowDown', 500);
  const s = await slot();
  check('walking into a lightspark picks it up',
    s.funken.includes('f27,16'), `carrying ${JSON.stringify(s.funken)}`);
  check('and it pays coins rather than stars',
    s.muenzen - vor.muenzen === 3
    && s.sterne.mathe === vor.sterne.mathe
    && s.sterne.wort === vor.sterne.wort,
    `+${s.muenzen - vor.muenzen} coins, `
    + `stars ${vor.sterne.mathe}/${vor.sterne.wort} -> ${s.sterne.mathe}/${s.sterne.wort}`);
}

// ------------------------------------------------------------- offline

await page.goto(BASE);
await page.waitForTimeout(1500);
await ctx.setOffline(true);
await page.goto(BASE).catch(() => { /* the assertion below is the test */ });
await page.waitForTimeout(900);
check('the game starts with the network disabled',
  await page.locator('.platz').count() === 3);
await ctx.setOffline(false);

// ---------------------------------------------------------------- icons

// The home-screen icon is the only part of the app a child sees before
// the app is running, and it is the one part no screenshot of the game
// ever shows. So it gets checked here rather than trusted.
//
// Three things go wrong with an apple-touch-icon and all three are
// silent: the file is missing (iOS falls back to a screenshot of the
// page, which for this game is a black rectangle), the `sizes` attribute
// disagrees with the actual PNG (Safari picks it and then rescales, so
// the pixel art smudges), and the PNG has transparency (iOS composites
// it onto black rather than honouring it).

{
  const html = await (await fetch(BASE + 'index.html')).text();
  const manifest = await (await fetch(BASE + 'manifest.webmanifest')).json();

  const refs = [];
  for (const m of html.matchAll(/<link[^>]*rel="(apple-touch-icon|icon)"[^>]*>/g)) {
    const href = /href="([^"]+)"/.exec(m[0])?.[1];
    const sizes = /sizes="(\d+)x\1"/.exec(m[0])?.[1];
    if (href) refs.push({ href, want: sizes ? Number(sizes) : null, from: m[1] });
  }
  for (const i of manifest.icons) {
    refs.push({ href: i.src, want: Number(i.sizes.split('x')[0]), from: 'manifest' });
  }

  check('the page and manifest reference home-screen icons', refs.length >= 6,
    `${refs.length} references`);
  check('an apple-touch-icon is offered at 180, the size iOS draws',
    refs.some((r) => r.from === 'apple-touch-icon' && r.want === 180));

  const bad = [];
  const notOpaque = [];
  for (const r of refs) {
    const res = await fetch(BASE + r.href);
    if (!res.ok) { bad.push(`${r.href} is ${res.status}`); continue; }
    const png = Buffer.from(await res.arrayBuffer());
    const w = png.readUInt32BE(16), h = png.readUInt32BE(20);
    if (w !== h) bad.push(`${r.href} is ${w}x${h}, not square`);
    else if (r.want !== null && w !== r.want) bad.push(`${r.href} declares ${r.want} and is ${w}`);

    // Every pixel opaque. Worth decoding for: a transparent icon looks
    // correct in every preview and turns into a black square on a home
    // screen, which is exactly the kind of bug that only shows up on
    // the device, three days later, in someone else's hands.
    const idat = [];
    for (let o = 8; o + 8 <= png.length;) {
      const len = png.readUInt32BE(o), type = png.toString('ascii', o + 4, o + 8);
      if (type === 'IDAT') idat.push(png.subarray(o + 8, o + 8 + len));
      o += 12 + len;
    }
    const raw = inflateSync(Buffer.concat(idat));
    const stride = w * 4;
    const line = Buffer.alloc(stride);
    const prev = Buffer.alloc(stride);
    let opaque = true;
    for (let y = 0; y < h && opaque; y++) {
      const f = raw[y * (stride + 1)];
      raw.copy(line, 0, y * (stride + 1) + 1, y * (stride + 1) + 1 + stride);
      for (let i = 0; i < stride; i++) {
        const a = i >= 4 ? line[i - 4] : 0, b = prev[i], c = i >= 4 ? prev[i - 4] : 0;
        if (f === 1) line[i] = (line[i] + a) & 255;
        else if (f === 2) line[i] = (line[i] + b) & 255;
        else if (f === 3) line[i] = (line[i] + ((a + b) >> 1)) & 255;
        else if (f === 4) {
          const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
          line[i] = (line[i] + (pa <= pb && pa <= pc ? a : pb <= pc ? b : c)) & 255;
        }
      }
      for (let i = 3; i < stride; i += 4) if (line[i] !== 255) { opaque = false; break; }
      line.copy(prev);
    }
    if (!opaque) notOpaque.push(r.href);
  }
  check('every icon exists and is the size it says it is', bad.length === 0, bad.join('; '));
  check('every icon is fully opaque, so iOS has no transparency to blacken',
    notOpaque.length === 0, notOpaque.join(', '));
}

// -------------------------------------------------------------- silence

check('nothing threw', errors.length === 0, errors.slice(0, 3).join(' | '));
check('nothing 404s', notFound.length === 0, [...new Set(notFound)].slice(0, 5).join(', '));
check('the game talks to nobody', offsite.size === 0, [...offsite].join(', '));

await browser.close();
server.close();
console.log(failures ? `\n${failures} failed` : '\nall good');
process.exit(failures ? 1 : 0);
