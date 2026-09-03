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
import { readFile, readdir, stat } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { extname, join } from 'node:path';
import { inflateSync } from 'node:zlib';

/**
 * Refuse to test a bundle that is older than the source it came from.
 *
 * AGENTS.md rule 1 says a failing typecheck means `dist/` was not
 * rebuilt, and warns that twice on LernInseln a measurement was taken
 * against a stale bundle and believed. It has now happened twice more
 * here in one afternoon, both times during a sabotage run — and the
 * second time was the nasty one: the build failed, `dist/` still held
 * the PREVIOUS sabotage, and the suite reported a mixture of passes and
 * failures that looked like a real result.
 *
 * A rule in a document did not stop it. This does. It is eight lines and
 * it runs before the browser starts.
 */
async function neuesteQuelle(dir) {
  let neuste = 0;
  for (const name of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, name.name);
    if (name.isDirectory()) neuste = Math.max(neuste, await neuesteQuelle(p));
    else neuste = Math.max(neuste, (await stat(p)).mtimeMs);
  }
  return neuste;
}
{
  const gebaut = await stat('dist/main.js').catch(() => null);
  if (!gebaut) {
    console.log('  FAIL  dist/main.js does not exist — run `npm run build`');
    process.exit(1);
  }
  const quelle = Math.max(await neuesteQuelle('src'), await neuesteQuelle('public'));
  if (quelle > gebaut.mtimeMs) {
    const alt = Math.round((quelle - gebaut.mtimeMs) / 1000);
    console.log(`  FAIL  dist/ is ${alt}s older than src/ — the build did not run,`);
    console.log('        so everything below would be measuring the previous one.');
    console.log('        Almost always a failing typecheck. Run `npm run build`.');
    process.exit(1);
  }
}

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
// Port 0: the OS picks a free one.
//
// This was a fixed 8395 until a run timed out and left the server
// holding it, and the next run died on EADDRINUSE with a raw Node stack
// trace — no failing check, no explanation, just a listen error where
// the suite's output should be. The suite is the thing that says whether
// the game works; it must not be the thing that breaks first, and it
// must never be defeated by its own previous corpse.
await new Promise((r) => server.listen(0, r));
const PORT = server.address().port;
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
await page.waitForTimeout(900);

// One picture and one button. A six-year-old handed an iPad presses the
// biggest thing on the screen, so there has to be exactly one.
check('the game opens on a picture and one button',
  await page.locator('.start').count() === 1
  && await page.locator('.start button').count() === 1);
await measureButtons('start');
check('and the picture actually loaded',
  await page.locator('.startBild').evaluate((i) => i.naturalWidth) > 100);
await starten();

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
await starten();
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

/**
 * Tap Luma away, however many lines she has queued.
 *
 * She holds the world still while she talks, on purpose, so every check
 * below that measures walking has to get past her first. Without this
 * they would all fail and all of them would be measuring the fairy.
 */
async function lumaWeg() {
  for (let i = 0; i < 4; i++) {
    if (await page.locator('.luma').count() === 0) return;
    await page.locator('.luma').tap();
    await page.waitForTimeout(420);
  }
}

/**
 * Through the start screen.
 *
 * One picture and one button, and every path into the game now goes
 * past it — so this is a helper rather than four copies of the same tap.
 */
async function starten() {
  if (await page.locator('.start').count()) {
    await page.locator('button', { hasText: 'Spiel starten' }).first().tap();
    await page.waitForTimeout(500);
  }
}

/** Open slot one and wait for the region to be composited. */
async function inDieWelt() {
  await page.goto(BASE);
  await page.waitForTimeout(700);
  await starten();
  await page.locator('.platz').first().tap();
  await page.waitForTimeout(1300);
  await lumaWeg();
}

/** Walk with the keyboard, then leave — leaving is what saves the spot. */
async function laufe(taste, ms) {
  await page.keyboard.down(taste);
  await page.waitForTimeout(ms);
  await page.keyboard.up(taste);
  await page.waitForTimeout(200);
}

// ---------------------------------------------------------------- Luma
//
// She is the only character who explains anything, and every rule about
// her is a rule about NOT showing her: once per adventurer, never twice,
// and the world holds still while she talks so that a child watching her
// is not also walking into a pond.

{
  // A genuinely fresh adventurer. The character editor above already
  // walked into the world once, which is where she said hello and where
  // she was written down as having said it — so testing "she greets a
  // new child" from here means clearing what this slot has heard.
  await page.evaluate(() => {
    const k = 'funkelwelt.platz0.v1';
    const s = JSON.parse(localStorage.getItem(k));
    s.gehoert = [];
    localStorage.setItem(k, JSON.stringify(s));
  });
  await page.goto(BASE);
  await page.waitForTimeout(700);
  await starten();
  await page.locator('.platz').first().tap();
  // 2400, not 1400. The world wakes up before she speaks — the lantern
  // opens out of the dark over two and a bit seconds for a child who
  // has never been here — and the greeting is deliberately behind it.
  await page.waitForTimeout(2400);
  check('Luma says hello when a new adventurer arrives',
    await page.locator('.luma').count() === 1);
  // naturalWidth, not just "the element is there". An <img> whose file
  // is missing is still an <img>, and a check that counts elements would
  // pass on a broken portrait — which is the whole failure this is for.
  // Counted before it is measured, because a broken portrait REPLACES
  // itself with the coded fallback — so `.luma-gemalt` is simply gone
  // and an evaluate on it hangs for thirty seconds instead of failing.
  // A check that times out is a check nobody reads the output of.
  const breit = await page.locator('.luma-gemalt').count()
    ? await page.locator('.luma-gemalt').evaluate((i) => i.naturalWidth)
    : 0;
  check('and she is a picture that actually loaded', breit > 100,
    breit ? `${breit}px wide` : 'the painting did not load; the coded fallback took over');

  // The world holds still while she is talking.
  //
  // Measured through a saved coordinate that is KNOWN to be non-zero,
  // and the reason is a mistake made twice already today: the first
  // version of this compared 0,0 with 0,0 on a slot that had never
  // saved a position, and passed for a reason that had nothing to do
  // with Luma. Seeding the spot first is what makes the comparison mean
  // something — and the same keypress moves him 3.5 tiles when she is
  // not there, which the very next check demonstrates.
  await stellAuf(14.5, 22.5);
  await page.goto(BASE);
  await page.waitForTimeout(700);
  await page.evaluate(() => {
    const k = 'funkelwelt.platz0.v1';
    const s = JSON.parse(localStorage.getItem(k));
    s.gehoert = [];
    localStorage.setItem(k, JSON.stringify(s));
  });
  await starten();
  await page.locator('.platz').first().tap();
  await page.waitForTimeout(2400);
  const stillA = (await slot()).ort;
  await page.keyboard.down('ArrowRight');
  await page.waitForTimeout(1200);
  await page.keyboard.up('ArrowRight');
  await page.locator('.hudKnopf').first().tap();
  await page.waitForTimeout(400);
  const stillB = (await slot()).ort;
  check('the world holds still while she talks',
    stillA.x > 1 && Math.abs(stillA.x - stillB.x) < 0.05,
    `${stillA.x.toFixed(2)} -> ${stillB.x.toFixed(2)}`);

  await page.goto(BASE);
  await page.waitForTimeout(700);
  await page.evaluate(() => {
    const k = 'funkelwelt.platz0.v1';
    const s = JSON.parse(localStorage.getItem(k));
    s.gehoert = [];
    localStorage.setItem(k, JSON.stringify(s));
  });
  await starten();
  await page.locator('.platz').first().tap();
  await page.waitForTimeout(2400);
  await lumaWeg();
  check('tapping her sends her away', await page.locator('.luma').count() === 0);

  // And she never says the same thing twice to the same child.
  await page.goto(BASE);
  await page.waitForTimeout(700);
  await starten();
  await page.locator('.platz').first().tap();
  await page.waitForTimeout(1600);
  check('she says each line once per adventurer, and then never again',
    await page.locator('.luma').count() === 0);
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
  // Tap-to-walk is the default now (AGENTS.md rule 13: tap is the
  // primary interaction), so a check about the THUMBSTICK has to turn
  // the thumbstick on rather than assume it.
  await page.evaluate(() => {
    const k = 'funkelwelt.platz0.v1';
    const s = JSON.parse(localStorage.getItem(k));
    s.steuerung = 'stick';
    s.ort = { x: 14.5, y: 22.5 };
    localStorage.setItem(k, JSON.stringify(s));
  });
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

// ------------------------------------------------- the language house
//
// Until this door existed nothing in the game could award a Wort-Stern,
// so "Wörter 1" sat on the title screen for ever and half the design —
// the whole reason the stars are per SUBJECT — was a promise.

{
  // Das Haus der Nachbarzahlen — the middle building, which was Das
  // Haus der ersten Laute until Deutsch moved to a world of its own.
  await inDieWelt();
  await page.evaluate(() => {
    const k = 'funkelwelt.platz0.v1';
    const s = JSON.parse(localStorage.getItem(k));
    s.ort = { x: 17.5, y: 18.4 };
    s.sterne = { mathe: 0, wort: 0 };
    localStorage.setItem(k, JSON.stringify(s));
  });
  await inDieWelt();
  await laufe('ArrowUp', 700);
  await page.waitForTimeout(1400);
  await lumaWeg();

  check('the middle door opens Das Haus der Nachbarzahlen',
    await page.locator('.runde').count() === 1
    && await page.locator('.zahlenreihe').count() === 1);
  await measureButtons('Nachbarzahlen');

  // A row with exactly one gap in it, and the gap is the question.
  check('it asks with a row that has one gap in it',
    await page.locator('.zahlenreihe .luecke').count() === 1);

  // Answered by READING THE ROW, not by tapping the first card.
  //
  // Tapping blind is what this check used to do, and it passed locally
  // and failed in CI with "0 Mathe". `numberChoices` hands the cards
  // back in order, and the gap in a five-wide window is almost never
  // the smallest of them — so the first card is not a coin toss, it is
  // systematically the wrong answer, and the local run had simply been
  // lucky. The maths house next door has been tapping blind for weeks
  // for the same reason and passing on the same luck.
  //
  // The row is arithmetic: find the '?', take a neighbour, count.
  let richtig = 0, gefragt = 0;
  for (let i = 0; i < 14; i++) {
    if (await page.locator('.blatt').count()) break;
    await lumaWeg();
    const karten = page.locator('.karten button');
    if (await karten.count() === 0) break;

    const reihe = await page.locator('.zahlenreihe span')
      .evaluateAll((els) => els.map((e) => (e.textContent ?? '').trim()));
    const luecke = reihe.indexOf('?');
    const anker = reihe.findIndex((t) => t !== '?');
    if (luecke >= 0 && anker >= 0) {
      const fehlt = Number(reihe[anker]) + (luecke - anker);
      const labels = await karten.evaluateAll(
        (els) => els.map((e) => (e.textContent ?? '').trim()));
      const idx = labels.indexOf(String(fehlt));
      gefragt++;
      if (idx >= 0) {
        await karten.nth(idx).tap();
        await page.waitForTimeout(600);
        if (await page.locator('.karten button.richtig').count() === 1) richtig++;
        await page.waitForTimeout(2000);
        continue;
      }
      check('the number that fills the gap is on one of the cards',
        false, `row ${reihe.join(',')} needs ${fehlt}; cards ${labels.join(',')}`);
    }
    await karten.first().tap();
    await page.waitForTimeout(2400);
  }
  check('filling the gap by counting along the row is RIGHT, every time',
    gefragt > 0 && richtig === gefragt, `${richtig} of ${gefragt} correct`);

  await page.waitForTimeout(1600);
  const s5 = await slot();
  check('a round here pays Mathe-Sterne, like every house in this world',
    s5.sterne.mathe > 0, `${s5.sterne.mathe} Mathe`);
  check('and no Wort-Stern exists in this world at all',
    s5.sterne.wort === 0, `${s5.sterne.wort} Wort`);
}

// The hat has to be ON HIS HEAD.
//
// The cart shipped saying it was, and it was drawn on nothing at all —
// so this compares the actual pixels above the adventurer with the hat
// and without it. "Every effect is visible" is the shop's whole promise
// and it is the one that was quietly false.
{
  async function kopf(ausruestung) {
    await inDieWelt();
    await page.evaluate((a) => {
      const k = 'funkelwelt.platz0.v1';
      const s = JSON.parse(localStorage.getItem(k));
      s.ort = { x: 14.5, y: 22.5 };
      s.ausruestung = a;
      localStorage.setItem(k, JSON.stringify(s));
    }, ausruestung);
    await inDieWelt();
    await page.waitForTimeout(600);
    return page.evaluate(() => {
      const c = document.getElementById('welt');
      const x = c.getContext('2d', { willReadFrequently: true });
      // A band across the top of his HEAD, in device pixels.
      //
      // The first version sampled from the centre downwards, which is
      // his body — so it compared two identical torsos and reported that
      // a hat which was in fact drawn was not there. The adventurer's
      // feet sit a little below the middle and he is about two hundred
      // device pixels tall, so the head is well above centre.
      const d = x.getImageData(Math.round(c.width / 2) - 100, Math.round(c.height / 2) - 230,
        200, 190).data;
      let sum = 0;
      for (let i = 0; i < d.length; i += 4) sum += d[i] + d[i + 1] * 3 + d[i + 2] * 7;
      return sum;
    });
  }
  const ohne = await kopf([]);
  const mit = await kopf(['hut']);
  check('the hat is actually on his head',
    ohne !== mit, ohne === mit ? 'the pixels above him are identical' : 'the picture changed');
}

// ---------------------------------------------------------------- shop
//
// The screen that failed the playtest which started this project, so
// what is asserted here is mostly what it must NOT be: a catalogue, a
// canvas, or a place a child can spend badly.

{
  await inDieWelt();
  await page.evaluate(() => {
    const k = 'funkelwelt.platz0.v1';
    const s = JSON.parse(localStorage.getItem(k));
    s.ort = { x: 12.5, y: 22.4 };
    s.muenzen = 21;
    s.ausruestung = [];
    localStorage.setItem(k, JSON.stringify(s));
  });
  await inDieWelt();
  await laufe('ArrowUp', 400);
  await page.waitForTimeout(900);
  await lumaWeg();

  check('walking into the cart opens it', await page.locator('.laden').count() === 1);
  const karten = await page.locator('.ware').count();
  check('four things, and only four', karten === 4, `${karten} on the cart`);
  await measureButtons('cart');

  // One screen. The shop that failed had twenty-seven things and a
  // scroll bar, and a child who has to scroll to see the choices is
  // being asked to hold a catalogue in their head.
  const passt = await page.locator('.laden').evaluate(
    (e) => e.scrollHeight <= e.clientHeight + 2);
  check('and they all fit on one screen with no scrolling', passt);

  // Derived, not hard-coded.
  //
  // The first version asserted "3 dimmed" from my own arithmetic on the
  // prices, got 2, and was wrong — the check, not the shop. Reading the
  // prices off the screen and counting the ones above the purse makes it
  // a statement about the RELATIONSHIP, which is what was meant, and it
  // survives every future price change.
  const preise = await page.locator('.ware .wpreis').evaluateAll(
    (els) => els.map((e) => Number((e.textContent || '').replace(/\D/g, '')) || 0));
  const geld = (await slot()).muenzen;
  const erwartet = preise.filter((p2) => p2 > geld).length;
  const zuTeuer = await page.locator('.ware.zuteuer').count();
  check('everything above the purse is dimmed, and nothing else is',
    zuTeuer === erwartet && erwartet > 0,
    `${zuTeuer} dimmed, ${erwartet} above ${geld} coins`);

  // Tapping one you cannot afford must do something and take nothing.
  await page.locator('.ware.zuteuer').first().tap();
  await page.waitForTimeout(400);
  const nachTipp = await slot();
  check('tapping one you cannot afford takes nothing',
    nachTipp.muenzen === 21 && nachTipp.ausruestung.length === 0,
    `${nachTipp.muenzen} coins, ${nachTipp.ausruestung.length} owned`);

  // Buying spends exactly the price.
  await page.locator('.ware:not(.zuteuer):not(.hat)').first().tap();
  await page.waitForTimeout(500);
  const gekauft = await slot();
  check('buying spends exactly the price and grants the thing',
    gekauft.muenzen === 1 && gekauft.ausruestung.length === 1,
    `${gekauft.muenzen} coins, ${JSON.stringify(gekauft.ausruestung)}`);

  // And it cannot be bought twice — the card is owned and disabled.
  const besitz = await page.locator('.ware.hat').count();
  check('an owned thing shows as owned and cannot be bought again',
    besitz === 1 && await page.locator('.ware.hat').first().isDisabled());

  // Nothing here can ever leave a child worse off than they started.
  check('and no amount of tapping goes below zero', gekauft.muenzen >= 0);

  await page.locator('button', { hasText: 'Weiter' }).first().tap();
  await page.waitForTimeout(600);
  check('and it comes back out into the world',
    await page.locator('.hud').count() === 1);
}

// What is bought has to be VISIBLE, or it is a number and this game does
// not ask children to appreciate numbers. The boots are measured by
// walking with them.
{
  async function weite(ausruestung) {
    await inDieWelt();
    await page.evaluate((a) => {
      const k = 'funkelwelt.platz0.v1';
      const s = JSON.parse(localStorage.getItem(k));
      s.ort = { x: 14.5, y: 22.5 };
      s.ausruestung = a;
      localStorage.setItem(k, JSON.stringify(s));
    }, ausruestung);
    await inDieWelt();
    await laufe('ArrowRight', 1200);
    await page.locator('.hudKnopf').first().tap();
    await page.waitForTimeout(400);
    return (await slot()).ort.x - 14.5;
  }
  const ohne = await weite([]);
  const mit = await weite(['stiefel']);
  check('the boots are something you can feel',
    mit > ohne * 1.15, `${ohne.toFixed(2)} tiles -> ${mit.toFixed(2)} tiles`);
}

// --------------------------------------------------------------- gates
//
// The moment the per-subject stars pay off, and the reason they are per
// subject: a child who loves numbers opens the number gate. It is the
// first time the game says "being good at something opened something",
// so what it must never do is open early or stay shut late.

async function beiTor(sterne, wort = 0) {
  await inDieWelt();
  await page.evaluate(([st, w]) => {
    const k = 'funkelwelt.platz0.v1';
    const s = JSON.parse(localStorage.getItem(k));
    s.ort = { x: 43.5, y: 9.6 };
    s.sterne = { mathe: st, wort: w };
    localStorage.setItem(k, JSON.stringify(s));
  }, [sterne, wort]);
  await inDieWelt();
  // Luma explains the gate when he pushes at it, and she holds the world
  // still while she does — so a check that just holds the key down
  // measures the fairy. Both cases stopped at exactly the same spot,
  // which was the giveaway.
  await laufe('ArrowUp', 500);
  await lumaWeg();
  await laufe('ArrowUp', 2400);
  await lumaWeg();
  await page.locator('.hudKnopf').first().tap();
  await page.waitForTimeout(400);
  return (await slot()).ort;
}

{
  // Level 1: shut. The gate is at row 7, so anything above it means in.
  const zu = await beiTor(0);
  check('a gate the child has not earned is shut',
    zu.y > 7.6, `stopped at y ${zu.y.toFixed(2)}`);

  // 32 stars is Mathe 3 — floor(sqrt(32/8)) + 1.
  const auf = await beiTor(40);
  check('and it opens when they have earned it',
    auf.y < 7, `walked through to y ${auf.y.toFixed(2)}`);

  // What is behind it has to be worth the walk, or the lesson lands as a
  // locked door with nothing on the other side. Asserted by actually
  // picking something up in there — "the list is not empty" would have
  // passed on a save that had collected sparks somewhere else.
  await inDieWelt();
  await page.evaluate(() => {
    const k = 'funkelwelt.platz0.v1';
    const s = JSON.parse(localStorage.getItem(k));
    s.ort = { x: 43.5, y: 5.5 };
    s.sterne = { mathe: 40, wort: 0 };
    s.funken = [];
    localStorage.setItem(k, JSON.stringify(s));
  });
  await inDieWelt();
  await laufe('ArrowRight', 700);
  await lumaWeg();
  await laufe('ArrowUp', 500);
  await page.locator('.hudKnopf').first().tap();
  await page.waitForTimeout(400);
  const drin = (await slot()).funken;
  check('and there is something behind it worth the walk',
    drin.length > 0, `picked up ${JSON.stringify(drin)}`);
}

// -------------------------------------- Das Haus von links und rechts
//
// Patrick's: "Sprites seitlich von Vehikeln und Flugobjekten ... und die
// Kinder müssen antippen was nach rechts fährt und was nach links."
//
// The fourth house, and the only one in the meadow that asks for no
// counting. The check that matters is not that it opens — it is that a
// child who reads the arrow and the vehicles, and nothing else, is
// right. Everything here is a picture: get the direction cue wrong on
// one sprite and the question becomes unanswerable in a way no amount
// of maths knowledge would rescue.

{
  await inDieWelt();
  await stellAuf(40.5, 19.4);
  await inDieWelt();
  await laufe('ArrowUp', 900);
  await page.waitForTimeout(900);
  check('the east door opens Das Haus von links und rechts',
    await page.locator('.runde').count() === 1);

  // Rule 15 again: the sound goes off in two taps, so the question has
  // to be on the screen. It is an arrow, which is also not a word —
  // rule 14 — because the child cannot read "rechts".
  check('the question is an arrow, not a word and not only a voice',
    await page.locator('.pfeilfrage canvas').count() === 1
    && await page.locator('.buehne-q').first().evaluate(
      (e) => !/rechts|links/i.test(e.textContent ?? '')));

  let gestellt = 0, richtig = 0, gefragt = 0;
  const gesehen = new Set();
  for (let i = 0; i < 16; i++) {
    if (await page.locator('.blatt').count()) break;
    await lumaWeg();
    const karten = page.locator('.karten button');
    if (await karten.count() === 0) break;
    gestellt++;

    const labels = await karten.evaluateAll(
      (els) => els.map((e) => e.getAttribute('aria-label') ?? ''));
    for (const l of labels) gesehen.add(l.split(' ')[0]);

    // Which way is being asked. Read off the arrow's own alt text
    // rather than off the generator.
    const nach = await page.locator('.pfeilfrage canvas')
      .evaluate((e) => e.getAttribute('data-nach') ?? '');
    const passend = labels.filter((l) => l.endsWith(nach));
    if (passend.length !== 1) {
      check('exactly one vehicle goes the way the arrow points',
        false, `${passend.length} of ${labels.length} go ${nach}`);
      gefragt++;
    }
    const idx = labels.findIndex((l) => l.endsWith(nach));
    if (idx >= 0) {
      await karten.nth(idx).tap();
      await page.waitForTimeout(600);
      if (await page.locator('.karten button.richtig').count() === 1) richtig++;
      gefragt++;
      await page.waitForTimeout(2000);
      continue;
    }
    await karten.first().tap();
    await page.waitForTimeout(2400);
  }

  check('every question has exactly one vehicle going the right way',
    gefragt === gestellt, `${gefragt} of ${gestellt} were answerable`);
  check('and picking it by reading the arrow is RIGHT, every time',
    richtig > 0 && richtig === gefragt, `${richtig} of ${gefragt} correct`);
  check('the round shows more than one kind of vehicle',
    gesehen.size >= 3, `saw ${[...gesehen].join(', ')}`);
  check('answering ten of them finishes the round',
    await page.locator('.blatt').count() === 1, `answered ${gestellt}`);

  await page.waitForTimeout(1800);
  const sv = await slot();
  check('Das Haus von links und rechts pays Mathe-Sterne',
    sv.sterne.mathe > 0, `${sv.sterne.mathe} stars`);
  await page.locator('button', { hasText: 'Zurück in die Welt' }).first().tap();
  await page.waitForTimeout(600);
}

// ------------------------------------------------------- the steering
//
// Both of these are Patrick's, from the first time he actually played
// it: "das tippen aufs haus hat irgendwie nicht funktioniert" and
// "gedrückt halten sollte zum laufen auch funktionieren, nicht nur
// tippen. Also quasi wie die Steuerung in Diablo 2."
//
// They were one bug and one missing feature, and both had the same
// shape from the child's side: you touch the screen and nothing at all
// happens. That is the worst answer a game can give, because a
// six-year-old does not conclude "that tile is impassable" — they
// conclude it is broken, and they are more right than the game is.

{
  await inDieWelt();
  await stellAuf(7.5, 23.5);
  await inDieWelt();
  await lumaWeg();

  const mitte = await page.evaluate(() => ({
    w: window.innerWidth, h: window.innerHeight,
  }));

  // Where the house BODY is on screen — not its door. The door was
  // always tappable; the roof was not, and the roof is what you point
  // at when you mean "go in there".
  // The wall of Das Haus der verliebten Zahlen: tile (7,19), solid, one
  // row above its door.
  //
  // Deliberately the BOTTOM row of the house rather than the roof. The
  // camera centres on the adventurer, so aiming at the roof from where
  // he stands put the tap at screen y=20 — up among the HUD buttons,
  // where it never reached the world at all. The first version of this
  // check duly reported that tapping the house does nothing, which was
  // true of the check rather than of the game.
  const dach = await page.evaluate(() => window.weltOrt?.(7 * 16 + 8, 19 * 16 + 8) ?? null);

  if (!dach) {
    check('the world exposes a way to aim a tap in the test', false);
  } else {
    const vorher = (await slot()).ort;
    await page.mouse.click(dach[0], dach[1]);
    await page.waitForTimeout(2600);
    await lumaWeg();
    const nachher = (await slot()).ort;
    const weit = Math.hypot(nachher.x - vorher.x, nachher.y - vorher.y);
    check('tapping the HOUSE walks to its door rather than doing nothing',
      weit > 1, `moved ${weit.toFixed(2)} tiles; aimed at ${dach.map(Math.round).join(',')}`);
    check('and it goes to the door, not just somewhere nearer',
      Math.abs(nachher.x - 7.5) < 1.2 && Math.abs(nachher.y - 20.5) < 2.0,
      `ended at ${nachher.x.toFixed(2)}, ${nachher.y.toFixed(2)}`);
  }

  // Hold, do not tap. The finger goes down, stays down, and never
  // comes up — which under the old steering produced nothing whatever,
  // because a tap was only read on release.
  await inDieWelt();
  await stellAuf(7.5, 23.5);
  await inDieWelt();
  await lumaWeg();
  const start = (await slot()).ort;
  // Open meadow at tile (12,23), east of him — NOT the house.
  //
  // This aimed at a fraction of the screen height until a sabotage
  // showed why that was wrong: the point it picked happened to land on
  // the house, so breaking the tap-resolution broke this check too, and
  // it had never been testing the holding on its own. A check that
  // fails for someone else's reason is not a check, it is a rumour.
  const wiese = await page.evaluate(() => window.weltOrt?.(12 * 16 + 8, 23 * 16 + 8) ?? null);
  //
  // He will end up FURTHER east than tile 12, and that is correct.
  // The finger holds a point on the SCREEN, and the camera follows him,
  // so the patch of world under that point slides ahead as he walks and
  // he keeps going in that direction for as long as it is held. That is
  // what holding the mouse does in Diablo and it is what was asked for.
  // The check is therefore "did he walk", not "did he arrive".
  if (!wiese) check('the world can be aimed at for the hold check', false);
  await page.mouse.move(wiese[0], wiese[1]);
  await page.mouse.down();
  // Held for well over the 900ms that a tap is allowed to last, so the
  // release cannot be read as a tap. Anything he walks is the holding.
  await page.waitForTimeout(2200);
  await page.mouse.up();
  // And then wait for the world to write his position down.
  //
  // The slot is only saved every five seconds of play, so the first
  // version of this check read a position from before the walk and
  // reported that holding does nothing. The house check next to it
  // looked fine for the wrong reason: arriving at a door forces a save,
  // so it happened to be reading fresh numbers.
  await page.waitForTimeout(5400);
  const waehrend = (await slot()).ort;
  check('holding a finger down walks, without ever letting go',
    Math.hypot(waehrend.x - start.x, waehrend.y - start.y) > 1,
    `${start.x.toFixed(1)},${start.y.toFixed(1)} -> `
    + `${waehrend.x.toFixed(1)},${waehrend.y.toFixed(1)}`
    + ` (target tile 12,23; aimed at ${wiese ? wiese.map(Math.round).join(',') : '?'})`);
}

// ------------------------------------------ every generator has a door
//
// Four generators shipped to a child's iPad with nothing able to reach
// them: `zahlenreihe`, `rechenmeister`, `zwillinge` and `silben` sat in
// GAMES for weeks, bundled, unreachable, and contradicting the comment
// at the top of the file they lived in.
//
// It is a SOURCE-level property, so it is checked at source level. The
// parse is deliberately brittle in the loud direction: if either list
// comes back empty the check fails rather than passing on nothing,
// because a check that quietly measures zero things is worse than no
// check at all.

{
  const gamesSrc = readFileSync('src/games/games.ts', 'utf8');
  const hausSrc = readFileSync('src/ui/runde.ts', 'utf8');

  const record = gamesSrc.slice(gamesSrc.indexOf('export const GAMES'));
  const generatoren = [...record.slice(0, record.indexOf('};'))
    .matchAll(/^\s*'([a-z-]+)':/gm)].map((m) => m[1]);

  const verdrahtet = new Set(
    [...hausSrc.matchAll(/spiel:\s*(\[[^\]]*\]|'[a-z-]+')/g)]
      .flatMap((m) => [...m[1].matchAll(/'([a-z-]+)'/g)].map((x) => x[1])));

  check('the generator list and the house list both parsed',
    generatoren.length > 0 && verdrahtet.size > 0,
    `${generatoren.length} generators, ${verdrahtet.size} wired`);

  const verwaist = generatoren.filter((g) => !verdrahtet.has(g));
  check('every generator that ships has a door a child can walk through',
    verwaist.length === 0,
    verwaist.length ? `no door: ${verwaist.join(', ')}` : generatoren.join(', '));
}

// ------------------------------------------ Das Haus der Addition
//
// The fourth door, and the step up from the pairs that make ten. It
// stands next to that house on purpose, which makes the plaques the
// only thing telling them apart.

{
  await inDieWelt();
  await stellAuf(7.5, 13.4);
  await inDieWelt();
  await laufe('ArrowUp', 900);
  await page.waitForTimeout(900);
  check('the north door opens Das Haus der Addition',
    await page.locator('.runde').count() === 1);

  const arten = new Set();
  let gestellt = 0;
  let hoechste = 0;
  for (let i = 0; i < 16; i++) {
    if (await page.locator('.blatt').count()) break;
    await lumaWeg();
    const karten = page.locator('.karten button');
    if (await karten.count() === 0) break;
    gestellt++;

    // NOTHING ABOVE TEN, anywhere on the screen.
    //
    // Not in the question, not on a card a child might tap, and not on
    // a wrong card either — a distractor of fourteen teaches that
    // fourteen is a plausible answer. This is the one constraint that
    // drifts silently: every generator here takes a ceiling as an
    // argument, and a ceiling is exactly the kind of number that gets
    // raised by someone adding a game and copying the line above it.
    // Leaf elements only. Reading `.karten` whole gives "71098" — four
    // separate cards glued into one number — which the first version of
    // this check duly reported as being above ten.
    const zahlen = await page.locator('.buehne-q *, .karten button')
      .evaluateAll((els) => els
        .filter((e) => e.childElementCount === 0)
        .flatMap((e) => (e.textContent ?? '').match(/[0-9]+/g) ?? [])
        .map(Number));
    for (const z of zahlen) hoechste = Math.max(hoechste, z);
    // Which of the three generators asked this one. All three draw a
    // different picture, which is the point of putting them in one
    // house: a round here is not ten of the same thing.
    // `.rechnung` is drawn by BOTH the sums and the doubles, so the
    // doubles have to be recognised first by their two ten-frames —
    // otherwise every doubles question counts as a sum and a round of
    // ten doubles would pass as "not ten of the same thing".
    if (await page.locator('.doppelfeld').count()) arten.add('doppel');
    else if (await page.locator('.zahlenreihe').count()) arten.add('reihe');
    else if (await page.locator('.rechnung').count()) arten.add('rechnung');
    await karten.first().tap();
    await page.waitForTimeout(2400);
  }
  // One topic per house now: a door named after Addition that asks a
  // Nachbarzahlen question is a door that lied about what was inside.
  check('and it asks sums and nothing else',
    arten.size === 1 && arten.has('rechnung'),
    `asked: ${[...arten].join(', ') || 'nothing recognised'}`);
  check('and no number anywhere in it goes above ten',
    hoechste > 0 && hoechste <= 10, `highest seen: ${hoechste}`);
  check('answering ten of them finishes the round',
    await page.locator('.blatt').count() === 1, `answered ${gestellt}`);

  await page.waitForTimeout(1800);
  const sr = await slot();
  check('Das Haus der Addition pays Mathe-Sterne', sr.sterne.mathe > 0);
  check('the house counts how often it has been cleared',
    sr.geschafft['rechenmeister'] === 1, JSON.stringify(sr.geschafft));

  await page.locator('button', { hasText: 'Zurück in die Welt' }).first().tap();
  await page.waitForTimeout(600);
}

// The second gate wants the OTHER subject, and that is the whole point
// of making the stars per subject: a child who loves letters and finds
// numbers hard opens a different door from one who is the other way
// round, and neither of them is behind.
{
  async function beiWortTor(mathe, wort) {
    await inDieWelt();
    await page.evaluate(([m, w]) => {
      const k = 'funkelwelt.platz0.v1';
      const s = JSON.parse(localStorage.getItem(k));
      s.ort = { x: 39.4, y: 29.5 };
      s.sterne = { mathe: m, wort: w };
      localStorage.setItem(k, JSON.stringify(s));
    }, [mathe, wort]);
    await inDieWelt();
    await laufe('ArrowRight', 500);
    await lumaWeg();
    await laufe('ArrowRight', 2000);
    await lumaWeg();
    await page.locator('.hudKnopf').first().tap();
    await page.waitForTimeout(400);
    return (await slot()).ort;
  }

  const zu = await beiWortTor(0, 0);
  check('the second gate is shut to a child who has not earned it',
    zu.x < 41, `stopped at x ${zu.x.toFixed(2)}`);

  // The two gates want the SAME thing at different heights now. The far
  // one wanted Wörter until Deutsch moved to its own world, at which
  // point it became a door that could never be opened at all.
  // Forty stars is level three, which is exactly what the NEAR gate
  // wants. Stated against the other gate rather than against a number,
  // so the two cannot drift into wanting the same thing without this
  // noticing.
  const knapp = await beiWortTor(40, 0);
  check('and the far gate still wants more than the near one does',
    knapp.x < 41, `level-3 stars stopped at x ${knapp.x.toFixed(2)}`);

  const auf = await beiWortTor(100, 0);
  check('but it opens once it has been earned',
    auf.x > 41, `walked through to x ${auf.x.toFixed(2)}`);
}

// ------------------------------------------------------------- shadows
//
// KONZEPT.md calls this the single most important decision in the
// project, so it is the most heavily asserted screen in the suite:
//
//   A wrong answer must never cost the child anything.
//
// An RPG framing will keep trying to undo that, because taking something
// away on a mistake is what RPGs do. These checks are what stops it
// being undone by accident six months from now.

{
  await inDieWelt();
  await page.evaluate(() => {
    const k = 'funkelwelt.platz0.v1';
    const s = JSON.parse(localStorage.getItem(k));
    // From the NORTH. The language house was built directly below this
    // shadow, so the old approach seeded him inside a wall.
    s.ort = { x: 18.5, y: 10.4 };
    s.schatten = [];
    s.muenzen = 20;
    localStorage.setItem(k, JSON.stringify(s));
  });
  await inDieWelt();
  await laufe('ArrowDown', 700);
  await page.waitForTimeout(1200);
  await lumaWeg();

  check('walking into a shadow meets it', await page.locator('.begegnung').count() === 1);
  await measureButtons('shadow');
  check('there is a Mut bar, and it starts empty',
    await page.locator('.mut .fuellung').count() === 1
    && (await page.locator('.mut .fuellung').evaluate((e) => e.style.width)) === '0%');

  /** Answer, right or wrong. The numeral on screen is the question. */
  async function antworte(richtig) {
    const gezeigt = Number(await page.locator('.zahl-gross').first().textContent());
    const will = String(10 - gezeigt);
    const karten = page.locator('.karten button');
    const n = await karten.count();
    for (let i = 0; i < n; i++) {
      const txt = (await karten.nth(i).textContent()).trim();
      if (richtig === (txt === will)) { await karten.nth(i).tap(); return true; }
    }
    return false;
  }

  // THE CHECK THIS WHOLE DESIGN EXISTS FOR.
  //
  // One RIGHT answer first, so that Mut is above zero when the wrong one
  // lands. The first version of this asked the wrong question first, on
  // an empty bar — and a sabotage that did `mut = max(0, mut - 1)` on a
  // miss sailed straight through it, because there was nothing there to
  // take. A penalty check has to run from a state where the penalty
  // could actually bite.
  await antworte(true);
  await page.waitForTimeout(1100);
  const vorMut = await page.locator('.mut .fuellung').evaluate((e) => e.style.width);
  const vorSchatten = await page.locator('.begegnung .schatten canvas')
    .evaluate((c) => `${c.width}x${c.height}`);
  const vorGeld = (await slot()).muenzen;
  await antworte(false);
  await page.waitForTimeout(2600);
  const nachMut = await page.locator('.mut .fuellung').evaluate((e) => e.style.width);
  const nachSchatten = await page.locator('.begegnung .schatten canvas')
    .evaluate((c) => `${c.width}x${c.height}`);
  const s2 = await slot();
  check('a wrong answer costs nothing at all — Mut does not move',
    vorMut === nachMut && vorMut !== '0%', `${vorMut} -> ${nachMut}`);
  check('  …the shadow does not advance',
    vorSchatten === nachSchatten, `${vorSchatten} -> ${nachSchatten}`);
  check('  …no coin is taken', s2.muenzen === vorGeld, `${vorGeld} -> ${s2.muenzen}`);
  check('  …and nothing on the screen turns red',
    await page.locator('.begegnung .rot, .begegnung .falsch, .begegnung .gefahr').count() === 0);

  check('a right answer pushes the shadow back', vorMut !== '0%', `Mut ${vorMut}`);

  // Four more fills it, and full Mut ends the encounter at once.
  for (let i = 0; i < 6; i++) {
    if (await page.locator('.blatt').count()) break;
    if (!await antworte(true)) break;
    await page.waitForTimeout(1100);
  }
  check('full Mut chases it away', await page.locator('.blatt').count() === 1);
  const s3 = await slot();
  check('  …and it pays coins', s3.muenzen > vorGeld, `${vorGeld} -> ${s3.muenzen}`);
  check('  …and never stars, which it did not teach',
    s3.sterne.mathe === s2.sterne.mathe && s3.sterne.wort === s2.sterne.wort);
  check('  …and it is written down as gone',
    s3.schatten.length === 1, JSON.stringify(s3.schatten));

  await page.locator('button', { hasText: 'Zurück in die Welt' }).first().tap();
  await page.waitForTimeout(700);
  check('and it comes back out into the world',
    await page.locator('.hud').count() === 1);
}

// Leaving halfway costs nothing either: the shadow is still there and
// nothing has been taken. Patrick's own instinct from the design
// conversation — "wir müssen uns nur kurz ausruhen".
{
  await inDieWelt();
  await page.evaluate(() => {
    const k = 'funkelwelt.platz0.v1';
    const s = JSON.parse(localStorage.getItem(k));
    // From the NORTH. The language house was built directly below this
    // shadow, so the old approach seeded him inside a wall.
    s.ort = { x: 18.5, y: 10.4 };
    s.schatten = [];
    s.muenzen = 20;
    localStorage.setItem(k, JSON.stringify(s));
  });
  await inDieWelt();
  await laufe('ArrowDown', 700);
  await page.waitForTimeout(1200);
  await lumaWeg();
  await page.locator('.begegnung button', { hasText: 'Zurück' }).first().tap();
  await page.waitForTimeout(700);
  const s4 = await slot();
  check('walking out of an encounter takes nothing',
    s4.muenzen === 20 && s4.schatten.length === 0,
    `${s4.muenzen} coins, ${s4.schatten.length} chased`);
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
await page.waitForTimeout(1100);
await starten();
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
