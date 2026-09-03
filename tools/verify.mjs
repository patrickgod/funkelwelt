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

// ------------------------------------------------------------- offline

await page.goto(BASE);
await page.waitForTimeout(1500);
await ctx.setOffline(true);
await page.goto(BASE).catch(() => { /* the assertion below is the test */ });
await page.waitForTimeout(900);
check('the game starts with the network disabled',
  await page.locator('.platz').count() === 3);
await ctx.setOffline(false);

// -------------------------------------------------------------- silence

check('nothing threw', errors.length === 0, errors.slice(0, 3).join(' | '));
check('nothing 404s', notFound.length === 0, [...new Set(notFound)].slice(0, 5).join(', '));
check('the game talks to nobody', offsite.size === 0, [...offsite].join(', '));

await browser.close();
server.close();
console.log(failures ? `\n${failures} failed` : '\nall good');
process.exit(failures ? 1 : 0);
