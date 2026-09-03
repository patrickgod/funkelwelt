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

// And a slot with somebody in it.
if (want('titel-belegt')) {
  await page.locator('button', { hasText: 'Los geht es' }).first().tap();
  await page.waitForTimeout(600);
  await page.locator('button', { hasText: 'Zurück' }).first().tap();
  await page.waitForTimeout(700);
  await shot('titel-belegt');
}

await browser.close();
server.close();
console.log('done');
