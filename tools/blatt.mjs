// Cut a generated sprite sheet into frames, and pixelise every one.
//
//   node tools/blatt.mjs art_raw/held-blatt.png assets/sprites/held.png \
//        --spalten 3 --zeilen 3 --hoch 34 --ramps skin,timber,glow,leaf,slate
//
// Patrick's point, and it is a good one: Zelda and the early Final
// Fantasies did their characters as sprite sheets and they are still
// the best-looking characters of their generation. The catch is that
// those were hand-pixelled. What is being asked here is whether a
// DOWNSAMPLED generation survives at character size, and the answer
// turned out to be a number: at 26 pixels the face is mush and the
// lantern is gone; at 34, with a brief that makes the lantern big, all
// of it reads.
//
// HOW THE FRAMES ARE KEPT IN LINE
//
// Each cell is pixelised on its own — trimmed, snapped, cleaned — and
// then placed into a fixed frame box aligned BOTTOM-CENTRE. That is the
// right registration for anything standing on the ground: the feet stay
// on the floor and the head is free to be a pixel taller in one frame
// than another, which is what a walk cycle actually does.
//
// Trimming each cell separately is deliberate. The alternative is to
// keep the model's own cell margins, and the model does not keep them:
// it centres each pose by eye, so the character slides half a cell
// sideways between frames and the walk looks like a skid.

import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync } from 'node:fs';
import { chromium } from 'playwright';

const args = process.argv.slice(2);
const [inFile, outFile] = args.filter((a) => !a.startsWith('--') && a.endsWith('.png'));
const opt = (n, d) => { const i = args.indexOf(`--${n}`); return i >= 0 ? args[i + 1] : d; };
const SPALTEN = Number(opt('spalten', 3));
const ZEILEN = Number(opt('zeilen', 3));
const HOCH = Number(opt('hoch', 34));
const RAMPS = opt('ramps', null);

if (!inFile || !outFile) {
  console.error('usage: node tools/blatt.mjs in.png out.png --spalten 3 --zeilen 3 --hoch 34');
  process.exit(1);
}

mkdirSync('.blatt', { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage();

/**
 * Cut the raw sheet into cells — by FINDING them, not by dividing.
 *
 * The first version divided the image into even thirds, and the model
 * does not draw even thirds: it lays the poses out by eye, so one slice
 * came back with two characters in it and the next with half of one.
 * The background is a single flat field, so the gaps between the poses
 * are genuinely empty columns and rows and can simply be looked for.
 *
 * Rows first, then columns WITHIN each row, because the rows are not
 * split in the same places as each other — which was exactly the case
 * that broke.
 */
const zellen = await page.evaluate(async ({ src, sp, ze }) => {
  const img = await new Promise((res, rej) => {
    const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src;
  });
  const W = img.width, H = img.height;
  const cv0 = document.createElement('canvas');
  cv0.width = W; cv0.height = H;
  const x0 = cv0.getContext('2d');
  x0.drawImage(img, 0, 0);
  const d = x0.getImageData(0, 0, W, H).data;

  // What the background is, from the four corners.
  let rr = 0, gg = 0, bb = 0;
  for (const [cx, cy] of [[0, 0], [W - 1, 0], [0, H - 1], [W - 1, H - 1]]) {
    const i = (cy * W + cx) * 4; rr += d[i]; gg += d[i + 1]; bb += d[i + 2];
  }
  rr /= 4; gg /= 4; bb /= 4;
  const TOL = 52 * 52;
  const voll = (x, y) => {
    const i = (y * W + x) * 4;
    if (d[i + 3] < 24) return false;
    const dr = d[i] - rr, dg = d[i + 1] - gg, db = d[i + 2] - bb;
    return dr * dr + dg * dg + db * db > TOL;
  };

  /** Runs of occupied lines along one axis, with tiny specks ignored. */
  const baender = (n, m, dicht) => {
    const belegt = [];
    for (let a = 0; a < n; a++) {
      let c = 0;
      for (let b = 0; b < m; b++) c += dicht(a, b) ? 1 : 0;
      belegt.push(c > m * 0.012);
    }
    const out = [];
    let start = -1;
    for (let a = 0; a <= n; a++) {
      if (a < n && belegt[a]) { if (start < 0) start = a; }
      else if (start >= 0) { if (a - start > n * 0.04) out.push([start, a]); start = -1; }
    }
    return out;
  };

  const reihen = baender(H, W, (y, x) => voll(x, y));
  const out = [];
  const nimm = (x1, y1, x2, y2) => {
    const cv = document.createElement('canvas');
    cv.width = x2 - x1; cv.height = y2 - y1;
    cv.getContext('2d').drawImage(img, x1, y1, cv.width, cv.height, 0, 0, cv.width, cv.height);
    out.push(cv.toDataURL('image/png'));
  };

  if (reihen.length !== ze) {
    // Could not see the rows. Fall back to dividing, and say so.
    const cw = Math.floor(W / sp), ch = Math.floor(H / ze);
    for (let r = 0; r < ze; r++) for (let c = 0; c < sp; c++) {
      nimm(c * cw, r * ch, (c + 1) * cw, (r + 1) * ch);
    }
    return { zellen: out, gefunden: false };
  }

  for (const [y1, y2] of reihen) {
    const spalten = baender(W, y2 - y1, (x, b) => voll(x, y1 + b));
    if (spalten.length === sp) {
      for (const [x1, x2] of spalten) nimm(x1, y1, x2, y2);
    } else {
      const cw = Math.floor(W / sp);
      for (let c = 0; c < sp; c++) nimm(c * cw, y1, (c + 1) * cw, y2);
    }
  }
  return { zellen: out, gefunden: true };
}, { src: `data:image/png;base64,${readFileSync(inFile).toString('base64')}`, sp: SPALTEN, ze: ZEILEN });

if (!zellen.gefunden) console.log('  (could not see the grid — divided evenly instead)');

const roh = zellen.zellen;
for (let i = 0; i < roh.length; i++) {
  writeFileSync(`.blatt/z${i}.png`, Buffer.from(roh[i].split(',')[1], 'base64'));
}
console.log(`  ${roh.length} cells cut`);

// Pixelise each cell on its own.
const fertig = [];
for (let i = 0; i < roh.length; i++) {
  const ziel = `.blatt/p${i}.png`;
  const argv = ['tools/pixelise.mjs', `.blatt/z${i}.png`, ziel, '--height', String(HOCH), '--clean'];
  if (RAMPS) argv.push('--ramps', RAMPS);
  try {
    execFileSync('node', argv, { stdio: 'pipe' });
    fertig.push(ziel);
  } catch (e) {
    console.log(`  cell ${i}: FAILED — ${String(e.stderr ?? e.message).slice(0, 120).trim()}`);
    fertig.push(null);
  }
}

// Assemble, bottom-centre, into one sheet.
const blatt = await page.evaluate(async ({ bilder, sp, ze }) => {
  const geladen = await Promise.all(bilder.map((b) => b
    ? new Promise((res) => { const i = new Image(); i.onload = () => res(i); i.src = b; })
    : Promise.resolve(null)));
  const echt = geladen.filter(Boolean);
  if (!echt.length) return null;
  const fw = Math.max(...echt.map((i) => i.width));
  const fh = Math.max(...echt.map((i) => i.height));
  const c = document.createElement('canvas');
  c.width = fw * sp; c.height = fh * ze;
  const x = c.getContext('2d');
  x.imageSmoothingEnabled = false;
  geladen.forEach((img, i) => {
    if (!img) return;
    const col = i % sp, row = Math.floor(i / sp);
    // Bottom-centre: feet on the floor, head free to move.
    x.drawImage(img,
      col * fw + Math.round((fw - img.width) / 2),
      row * fh + (fh - img.height));
  });
  return { png: c.toDataURL('image/png'), fw, fh };
}, {
  bilder: fertig.map((p) => p && existsSync(p)
    ? `data:image/png;base64,${readFileSync(p).toString('base64')}` : null),
  sp: SPALTEN, ze: ZEILEN,
});

await browser.close();
rmSync('.blatt', { recursive: true, force: true });

if (!blatt) { console.error('  nothing survived'); process.exit(1); }
writeFileSync(outFile, Buffer.from(blatt.png.split(',')[1], 'base64'));
writeFileSync(outFile.replace(/\.png$/, '.json'),
  JSON.stringify({ breit: blatt.fw, hoch: blatt.fh, spalten: SPALTEN, zeilen: ZEILEN }, null, 2));
console.log(`  ${outFile} — ${SPALTEN}x${ZEILEN} frames of ${blatt.fw}x${blatt.fh}`);
