// A one-off measurement, not a suite check.
//
// LernInseln shipped a frame-time check that turned out to be measuring
// the harness rather than the app, and two confident theories died
// before anybody instrumented anything. So this is deliberately NOT in
// verify.mjs: a headless Chromium on a desktop under software rendering
// is not an iPad, and a number from it must be read as a bound on the
// WORK the app does, never as a frame rate a child would see.
//
// What it reports:
//   * how long the world takes to open — compositing the region into
//     six buffers is the one big up-front cost, and it is the wait a
//     child actually experiences;
//   * scripting milliseconds per frame while walking, from Chrome's own
//     Performance domain rather than from wall-clock deltas.

import { chromium, devices } from 'playwright';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join } from 'node:path';

const PORT = 8398;
const MIME = {
  '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
  '.png': 'image/png', '.json': 'application/json', '.map': 'application/json',
  '.webmanifest': 'application/manifest+json',
};
const server = createServer(async (req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (p === '/') p = '/index.html';
  try {
    const data = await readFile(join('dist', p));
    res.writeHead(200, { 'content-type': MIME[extname(p)] ?? 'application/octet-stream' });
    res.end(data);
  } catch { res.writeHead(404); res.end('no'); }
});
await new Promise((r) => server.listen(PORT, r));

const browser = await chromium.launch();
const ctx = await browser.newContext({
  ...devices['iPad (gen 7) landscape'],
  hasTouch: true, isMobile: true,
  viewport: { width: 1080, height: 810 }, deviceScaleFactor: 2,
});
const page = await ctx.newPage();
await page.goto(`http://localhost:${PORT}/`);
// The title screen came AFTER this tool was last run, which is how the
// numbers in PLAN and HANDOVER came to be months of features out of
// date: a measuring tool nobody runs is a tool that has stopped
// working, and the only sign is that the documented figures never
// change.
await page.locator('.start, .platz').first()
  .waitFor({ state: 'visible', timeout: 10000 }).catch(() => {});
if (await page.locator('.start').count()) {
  await page.locator('button', { hasText: 'Spiel starten' }).first().tap();
  await page.locator('.platz').first()
    .waitFor({ state: 'visible', timeout: 10000 }).catch(() => {});
}
await page.locator('.platz').first().tap();
await page.waitForTimeout(500);
await page.locator('.namensfeld').fill('Messung');
await page.waitForTimeout(200);

// WHICH WORLD. There are two now, and the shore is mostly lagoon —
// water is the one ground that animates, so it is the one worth
// measuring separately rather than assuming the meadow speaks for both.
//
//   node tools/messen.mjs          the meadow
//   node tools/messen.mjs ufer     the shore
const REGION = process.argv[2] === 'ufer' ? 'ufer' : 'wiese';
if (REGION === 'ufer') {
  await page.evaluate(() => {
    const k = 'funkelwelt.platz0.v1';
    const s = JSON.parse(localStorage.getItem(k) ?? '{}');
    s.region = 'ufer';
    s.ort = { x: 30.5, y: 21.5 };
    localStorage.setItem(k, JSON.stringify(s));
  });
}
console.log(`  measuring: ${REGION}`);

// Opening the world: from the tap to the first frame with the region on
// it. Polled on the canvas itself, so it is the wait, not a guess.
const auf = await page.evaluate(async () => {
  const t0 = performance.now();
  document.querySelectorAll('button').forEach((b) => {
    if (b.textContent.startsWith('Los geht')) b.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
  });
  const c = document.getElementById('welt');
  const x = c.getContext('2d', { willReadFrequently: true });
  for (let i = 0; i < 400; i++) {
    await new Promise((r) => requestAnimationFrame(r));
    const d = x.getImageData(Math.round(c.width / 2), Math.round(c.height / 2), 1, 1).data;
    // Anything that is not the black of an empty canvas means the
    // region is composited and on screen.
    if (d[0] + d[1] + d[2] > 90) return performance.now() - t0;
  }
  return -1;
});
console.log(`  the world opens in ${auf.toFixed(0)} ms`);

const cdp = await ctx.newCDPSession(page);
await cdp.send('Performance.enable');
const lies = async () => Object.fromEntries(
  (await cdp.send('Performance.getMetrics')).metrics.map((m) => [m.name, m.value]));

await page.waitForTimeout(400);
const a = await lies();
const rahmenA = await page.evaluate(() => {
  window.__n = 0;
  const tick = () => { window.__n++; requestAnimationFrame(tick); };
  requestAnimationFrame(tick);
  return 0;
});
void rahmenA;
await page.keyboard.down('ArrowRight');
await page.waitForTimeout(3000);
await page.keyboard.up('ArrowRight');
const b = await lies();
const rahmen = await page.evaluate(() => window.__n);

const skript = (b.ScriptDuration - a.ScriptDuration) * 1000;
const malen = (b.LayoutDuration + b.RecalcStyleDuration
  - a.LayoutDuration - a.RecalcStyleDuration) * 1000;
console.log(`  ${rahmen} frames while walking for 3 s`);
console.log(`  scripting ${(skript / rahmen).toFixed(2)} ms per frame`);
console.log(`  layout and style ${(malen / rahmen).toFixed(3)} ms per frame`);
console.log('  (a desktop under software rendering, not an iPad: this bounds');
console.log('   the work the app does, it is not a frame rate a child sees)');

await browser.close();
server.close();
