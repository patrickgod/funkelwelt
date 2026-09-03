// Turn an image-model drawing into an actual pixel-art sprite.
//
// LIFTED WHOLESALE FROM TIDEGARDEN (`C:\Development\Tidegarden`), where
// it was built and where it earned every line of the reasoning below.
// The only edit is the path to the palette. Patrick's note when he asked
// for it here — "gemini generates, we lay a grid on top of it and then
// redraw so the look of the whole game is consistent" — is exactly what
// this does, and Tidegarden has already found the sharp edges.
//
//   node tools/pixelise.mjs in.png out.png --size 34 [--clean] [--sheet]
//
// Image models do not produce pixel art. They produce a high-resolution
// PICTURE OF pixel art: soft blocks that are roughly but not exactly on
// a grid, anti-aliased edges, and several hundred colours where the
// palette allows thirty-seven. Zoom in on a raw generation and it is
// mush.
//
// This is the pass that makes them usable. The model contributes shape
// and detail — the thing code is worst at — and this contributes the
// grid, the palette and the consistency, which is what the model is
// worst at. Neither half is sufficient alone.
//
// What it does, in order:
//   1. trims to the drawn content, so the subject fills the sprite
//   2. area-averages down to the target size — averaging, not sampling,
//      because point-sampling a soft image keeps whichever blurry pixel
//      it happened to land on
//   3. snaps every pixel to the nearest palette colour in a perceptual
//      space, so the result cannot contain an off-palette value
//   4. optionally removes stray single pixels and re-rims the sprite

import { chromium } from 'playwright';
import { readFileSync, writeFileSync } from 'node:fs';

const [inFile, outFile] = process.argv.slice(2).filter(a => !a.startsWith('--'));
if (!inFile || !outFile) {
  console.error('usage: node tools/pixelise.mjs in.png out.png --size 34 [--clean]');
  process.exit(1);
}
const arg0 = (n, d) => {
  const i = process.argv.indexOf(`--${n}`);
  return i >= 0 ? process.argv[i + 1] : d;
};
const SIZE = Number(arg0('size', 32));
// --height targets the sprite's HEIGHT rather than its longest side,
// which is what you want when sizing a set against each other: things
// are compared by how tall they are, not by whichever dimension happens
// to be bigger. A handcart is long and low; sized by its longest side it
// comes out as tall as a house.
const HEIGHT = arg0('height', null) ? Number(arg0('height', null)) : null;
const CLEAN = process.argv.includes('--clean');
// --auto detects the block grid the model drew on and uses it as the
// output resolution, instead of resampling to a size we picked.
const AUTO = process.argv.includes('--auto');
// --texture keeps the whole frame: no background removal, no trim to
// content. A ground texture has no subject and no background — every
// pixel is the material — so the flood fill would happily eat the lot.
const TEXTURE = process.argv.includes('--texture');

// The palette, read straight out of the source of truth so this tool can
// never drift from what the renderer draws with.
const paletteSrc = readFileSync('src/core/palette.ts', 'utf8');

// --ramps leaf,pine,timber restricts the snap to named ramps.
//
// This matters more than it sounds. A tree generated with olive-green
// foliage snapped to the DRY GRASS ramp rather than the leaf ramp,
// because olive is genuinely nearer to dry grass in colour space — and
// came out a muddy brown bush. A model cannot be told to hold a palette,
// but it can be told which drawer to put a sprite in afterwards, and
// that is the whole trick: the model chooses the shapes, we choose the
// colours it is allowed to have chosen.
const wanted = arg0('ramps', null);
const RAMPS = {};
for (const m of paletteSrc.matchAll(/^\s*(\w+):\s*\[([^\]]+)\]/gm)) {
  RAMPS[m[1]] = [...m[2].matchAll(/#[0-9a-f]{6}/gi)].map(x => x[0]);
}
const INK_M = paletteSrc.match(/INK\s*=\s*'(#[0-9a-f]{6})'/i);
let PALETTE;
if (wanted) {
  const names = wanted.split(',').map(x => x.trim());
  const missing = names.filter(n => !RAMPS[n]);
  if (missing.length) {
    console.error('unknown ramp(s):', missing.join(', '));
    console.error('available:', Object.keys(RAMPS).join(', '));
    process.exit(1);
  }
  PALETTE = [...new Set(names.flatMap(n => RAMPS[n]).concat(INK_M ? [INK_M[1]] : []))];
  console.log(`restricted to ramps: ${names.join(', ')}`);
} else {
  PALETTE = [...new Set(paletteSrc.match(/#[0-9a-f]{6}/gi) ?? [])];
}
// The guard is on the FULL palette, not on the restricted one.
//
// It came across checking `PALETTE`, which is the restricted set when
// --ramps is given — so asking for a boulder in nothing but the `stone`
// ramp (five colours and an ink) tripped a check meant to catch "the
// palette file could not be parsed at all". Two different questions,
// and only one of them is about the file.
if ((paletteSrc.match(/#[0-9a-f]{6}/gi) ?? []).length < 10) {
  console.error('could not read the palette from src/core/palette.ts');
  process.exit(1);
}
console.log(`palette: ${PALETTE.length} colours, target ${SIZE}px`);

const b64 = readFileSync(inFile).toString('base64');
const browser = await chromium.launch();
const page = await browser.newPage();

const result = await page.evaluate(async ({ src, size, palette, clean, auto, height, texture }) => {
  const img = await new Promise((res, rej) => {
    const i = new Image(); i.onload = () => res(i); i.onerror = rej;
    i.src = src;
  });
  const c0 = document.createElement('canvas');
  c0.width = img.width; c0.height = img.height;
  const x0 = c0.getContext('2d');
  x0.drawImage(img, 0, 0);
  const src0 = x0.getImageData(0, 0, img.width, img.height);

  // --- 0. remove whatever background survived the key -----------------
  if (!texture)
  // The prompt asks for a flat magenta ground so it can be chroma-keyed,
  // and the model obeys perhaps half the time — the rest come back on
  // white, cream or pale blue, which the key leaves completely intact.
  // Half a sprite set arrived as pictures of sprites sitting on cards.
  //
  // Flood-fill from the four corners instead, which does not care what
  // colour the background is, only that it is connected to the edge and
  // uniform. Anything the sprite touches the border with is lost, which
  // is why the prompt also asks for the subject centred.
  {
    const W0 = img.width, H0 = img.height;
    const seen = new Uint8Array(W0 * H0);
    const stack = [];
    const push = (x, y) => {
      if (x < 0 || y < 0 || x >= W0 || y >= H0) return;
      if (seen[y * W0 + x]) return;
      stack.push(x, y);
    };
    let rr = 0, gg = 0, bb = 0;
    const corners = [[0, 0], [W0 - 1, 0], [0, H0 - 1], [W0 - 1, H0 - 1]];
    for (const [cxp, cyp] of corners) {
      const i = (cyp * W0 + cxp) * 4;
      rr += src0.data[i]; gg += src0.data[i + 1]; bb += src0.data[i + 2];
    }
    rr /= 4; gg /= 4; bb /= 4;
    const TOL = 46 * 46;
    for (const [cxp, cyp] of corners) push(cxp, cyp);
    let cleared = 0;
    while (stack.length) {
      const y = stack.pop(), x = stack.pop();
      if (x < 0 || y < 0 || x >= W0 || y >= H0) continue;
      const k = y * W0 + x;
      if (seen[k]) continue;
      const i = k * 4;
      if (src0.data[i + 3] < 24) {
        seen[k] = 1;
        push(x + 1, y); push(x - 1, y); push(x, y + 1); push(x, y - 1);
        continue;
      }
      const dr = src0.data[i] - rr, dg = src0.data[i + 1] - gg, db = src0.data[i + 2] - bb;
      if (dr * dr + dg * dg + db * db > TOL) continue;
      seen[k] = 1;
      src0.data[i + 3] = 0;
      cleared++;
      push(x + 1, y); push(x - 1, y); push(x, y + 1); push(x, y - 1);
    }
    // 0.992, not 0.92.
    //
    // The guard is for "the key removed everything", and it was set at a
    // level a slender subject trips honestly: a lamp post or a signpost
    // on a square field really is ninety-five per cent background, and
    // both of them failed here with a perfectly good sprite in the
    // middle. The real "nothing left" case is caught two steps down by
    // the trim, which reports an image that is fully transparent.
    if (cleared > W0 * H0 * 0.992) return { error: 'flood fill ate the whole image' };
  }

  // --- 1. trim to content -------------------------------------------
  let minX = img.width, minY = img.height, maxX = -1, maxY = -1;
  for (let y = 0; y < img.height; y++) {
    for (let x = 0; x < img.width; x++) {
      if (src0.data[(y * img.width + x) * 4 + 3] > 24) {
        if (x < minX) minX = x; if (x > maxX) maxX = x;
        if (y < minY) minY = y; if (y > maxY) maxY = y;
      }
    }
  }
  if (texture) { minX = 0; minY = 0; maxX = img.width - 1; maxY = img.height - 1; }
  if (maxX < 0) return { error: 'image is fully transparent — was it keyed?' };
  const cw = maxX - minX + 1, ch = maxY - minY + 1;

  // --- 1b. find the grid the model actually drew on -------------------
  // An image model does not draw on a grid, but it draws something that
  // strongly implies one: blocks of roughly equal size with edges that
  // line up. That period is recoverable.
  //
  // Build an edge-energy profile per column (and per row), then
  // autocorrelate it. A quasi-pixel-art image correlates sharply at its
  // own block size, because that is the spacing at which its edges
  // repeat. Sampling at those block CENTRES afterwards is the whole
  // point: downsampling to an arbitrary size instead resamples straight
  // across block boundaries and mushes every edge the model drew.
  const lum = (i) => 0.299 * src0.data[i] + 0.587 * src0.data[i + 1] + 0.114 * src0.data[i + 2];
  const profile = (horizontal) => {
    const n = horizontal ? cw : ch;
    const m = horizontal ? ch : cw;
    const prof = new Float64Array(n);
    for (let a2 = 1; a2 < n; a2++) {
      let sum = 0;
      for (let b2 = 0; b2 < m; b2++) {
        const x1 = horizontal ? minX + a2 : minX + b2;
        const y1 = horizontal ? minY + b2 : minY + a2;
        const x2 = horizontal ? x1 - 1 : x1;
        const y2 = horizontal ? y1 : y1 - 1;
        const i1 = (y1 * img.width + x1) * 4, i2 = (y2 * img.width + x2) * 4;
        if (src0.data[i1 + 3] < 24 || src0.data[i2 + 3] < 24) continue;
        sum += Math.abs(lum(i1) - lum(i2));
      }
      prof[a2] = sum;
    }
    return prof;
  };
  // The block size is the SPACING BETWEEN EDGES, so measure that
  // directly rather than autocorrelating. A quasi-pixel-art image has a
  // near-empty edge profile with sharp spikes where blocks meet, and the
  // distance between consecutive spikes is the answer.
  //
  // Autocorrelation was the first attempt and it locked onto a 5px
  // harmonic of a 20px grid — a signal that repeats every 20 also
  // repeats every 5 if the blocks have internal structure, and no amount
  // of normalising reliably tells you which is the fundamental. Gaps
  // cannot make that mistake: the modal distance between adjacent edges
  // IS the block size.
  const bestPeriod = (prof) => {
    const n = prof.length;
    let mean = 0, sq = 0;
    for (const v of prof) { mean += v; sq += v * v; }
    mean /= n;
    const sd = Math.sqrt(Math.max(0, sq / n - mean * mean));
    const thresh = mean + sd * 0.6;
    // local maxima above the threshold
    const peaks = [];
    for (let i = 1; i < n - 1; i++) {
      if (prof[i] >= thresh && prof[i] >= prof[i - 1] && prof[i] >= prof[i + 1]) {
        if (peaks.length && i - peaks[peaks.length - 1] < 2) continue;   // one per ridge
        peaks.push(i);
      }
    }
    if (peaks.length < 4) return 0;
    // histogram of consecutive gaps; the mode is the grid
    const hist = new Map();
    for (let i = 1; i < peaks.length; i++) {
      const g = peaks[i] - peaks[i - 1];
      if (g < 3 || g > 90) continue;
      // vote for the gap and its immediate neighbours, so a grid that
      // wobbles by a pixel still concentrates on one bucket
      for (const d of [-1, 0, 1]) hist.set(g + d, (hist.get(g + d) ?? 0) + (d === 0 ? 2 : 1));
    }
    let best = 0, bc = 0;
    for (const [g, c] of hist) if (c > bc) { bc = c; best = g; }
    return best;
  };

  const gx = bestPeriod(profile(true));
  const gy = bestPeriod(profile(false));
  const grid = (gx && gy) ? (gx + gy) / 2 : (gx || gy);
  const ok = grid >= 3 && grid <= 90 && cw / grid >= 8 && cw / grid <= 400;
  const detected = ok
    ? { gx, gy, grid, blocksX: Math.round(cw / grid), blocksY: Math.round(ch / grid), ok }
    : { gx, gy, grid, blocksX: 0, blocksY: 0, ok };

  // --- 2. area-average down ------------------------------------------
  // Keep the aspect ratio: the taller side becomes `size`.
  // In auto mode the output size IS the detected block count, so one
  // output pixel is exactly one block the model drew.
  const scale = height ? size / ch : size / Math.max(cw, ch);
  const useAuto = auto && detected.ok;
  const ow = useAuto ? detected.blocksX : Math.max(1, Math.round(cw * scale));
  const oh = useAuto ? detected.blocksY : Math.max(1, Math.round(ch * scale));
  const out = new Uint8ClampedArray(ow * oh * 4);
  for (let oy = 0; oy < oh; oy++) {
    for (let ox = 0; ox < ow; ox++) {
      const sx0 = minX + Math.floor(ox * cw / ow), sx1 = minX + Math.ceil((ox + 1) * cw / ow);
      const sy0 = minY + Math.floor(oy * ch / oh), sy1 = minY + Math.ceil((oy + 1) * ch / oh);
      let r = 0, g = 0, b = 0, a = 0, n = 0;
      for (let sy = sy0; sy < sy1; sy++) {
        for (let sx = sx0; sx < sx1; sx++) {
          const i = (sy * img.width + sx) * 4;
          const al = src0.data[i + 3] / 255;
          r += src0.data[i] * al; g += src0.data[i + 1] * al; b += src0.data[i + 2] * al;
          a += al; n++;
        }
      }
      const o = (oy * ow + ox) * 4;
      if (a < n * 0.42) { out[o + 3] = 0; continue; }   // mostly empty → empty
      if (!useAuto) {
        out[o] = r / a; out[o + 1] = g / a; out[o + 2] = b / a; out[o + 3] = 255;
        continue;
      }
      // Auto: take the MODE of the block's inner core rather than its
      // mean. A block the model drew is meant to be one flat colour, and
      // averaging it with the soft ramp at its border invents a shade
      // that was never intended — which is what turns a crisp generation
      // into mush. Quantise coarsely first so near-identical shades vote
      // together.
      const votes = new Map();
      const ix0 = sx0 + Math.floor((sx1 - sx0) * 0.25), ix1 = sx1 - Math.floor((sx1 - sx0) * 0.25);
      const iy0 = sy0 + Math.floor((sy1 - sy0) * 0.25), iy1 = sy1 - Math.floor((sy1 - sy0) * 0.25);
      for (let sy = Math.max(sy0, iy0); sy < Math.max(iy1, iy0 + 1); sy++) {
        for (let sx = Math.max(sx0, ix0); sx < Math.max(ix1, ix0 + 1); sx++) {
          const i = (sy * img.width + sx) * 4;
          if (src0.data[i + 3] < 128) continue;
          const key = ((src0.data[i] >> 3) << 10) | ((src0.data[i + 1] >> 3) << 5) | (src0.data[i + 2] >> 3);
          const e = votes.get(key);
          if (e) { e.n++; e.r += src0.data[i]; e.g += src0.data[i + 1]; e.b += src0.data[i + 2]; }
          else votes.set(key, { n: 1, r: src0.data[i], g: src0.data[i + 1], b: src0.data[i + 2] });
        }
      }
      let win = null;
      for (const e of votes.values()) if (!win || e.n > win.n) win = e;
      if (!win) { out[o] = r / a; out[o + 1] = g / a; out[o + 2] = b / a; out[o + 3] = 255; continue; }
      out[o] = win.r / win.n; out[o + 1] = win.g / win.n; out[o + 2] = win.b / win.n; out[o + 3] = 255;
    }
  }

  // --- 2b. integer-decimate to the target -----------------------------
  // The model's native grid is usually FINER than the sprite we want —
  // it drew about 150 blocks across where we need 40. Decimating that
  // clean matrix by a whole number, taking the most common colour in
  // each group, keeps every edge on the grid. Resampling the original
  // blurry image straight to 40 would have crossed block boundaries and
  // reinvented the mush this whole pass exists to remove.
  let W = ow, H = oh, buf2 = out;
  const targetMax = height ? Math.max(1, Math.round(oh ? size * (ow / oh) : size)) : size;
  void targetMax;
  if (useAuto && (height ? oh : Math.max(ow, oh)) > size * 1.25) {
    // Factor of 1 means "keep the model's own grid", which is a real and
    // useful answer — asking for the native block count should give you
    // the native block count, not a forced halving.
    const k = Math.max(1, Math.round((height ? oh : Math.max(ow, oh)) / size));
    const nw = Math.max(1, Math.round(ow / k)), nh = Math.max(1, Math.round(oh / k));
    const dec = new Uint8ClampedArray(nw * nh * 4);
    for (let y = 0; y < nh; y++) {
      for (let x = 0; x < nw; x++) {
        const votes = new Map();
        let solid = 0, cells = 0;
        for (let j = 0; j < k; j++) {
          for (let i = 0; i < k; i++) {
            const sx = x * k + i, sy = y * k + j;
            if (sx >= ow || sy >= oh) continue;
            cells++;
            const o2 = (sy * ow + sx) * 4;
            if (out[o2 + 3] < 128) continue;
            solid++;
            const key = `${out[o2]},${out[o2 + 1]},${out[o2 + 2]}`;
            votes.set(key, (votes.get(key) ?? 0) + 1);
          }
        }
        const o3 = (y * nw + x) * 4;
        if (!cells || solid < cells * 0.42) { dec[o3 + 3] = 0; continue; }
        let bk = null, bc = 0;
        for (const [kk, v] of votes) if (v > bc) { bc = v; bk = kk; }
        const [r2, g2, b2] = bk.split(',').map(Number);
        dec[o3] = r2; dec[o3 + 1] = g2; dec[o3 + 2] = b2; dec[o3 + 3] = 255;
      }
    }
    W = nw; H = nh; buf2 = dec;
  }

  // --- 3. snap to the palette ----------------------------------------
  // Weighted RGB distance, green weighted highest, which tracks human
  // sensitivity far better than a plain euclidean distance and stops
  // greens collapsing onto each other.
  const pal = palette.map(h => {
    const n = parseInt(h.slice(1), 16);
    return { hex: h, r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
  });
  const snap = (r, g, b) => {
    let best = pal[0], bd = Infinity;
    for (const p of pal) {
      const dr = (p.r - r) * 0.9, dg = (p.g - g) * 1.6, db = (p.b - b) * 0.7;
      const d = dr * dr + dg * dg + db * db;
      if (d < bd) { bd = d; best = p; }
    }
    return best;
  };
  const used = new Set();
  for (let i = 0; i < W * H; i++) {
    if (buf2[i * 4 + 3] === 0) continue;
    const p = snap(buf2[i * 4], buf2[i * 4 + 1], buf2[i * 4 + 2]);
    buf2[i * 4] = p.r; buf2[i * 4 + 1] = p.g; buf2[i * 4 + 2] = p.b;
    used.add(p.hex);
  }

  // --- 4. clean up ----------------------------------------------------
  // Models leave orphan pixels along every edge. A single pixel with no
  // matching neighbour is noise, not detail, and at this size noise
  // reads as dirt.
  let removed = 0;
  if (clean) {
    const copy = new Uint8ClampedArray(buf2);
    const idx = (x, y) => (y * W + x) * 4;
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const i = idx(x, y);
        if (copy[i + 3] === 0) continue;
        let same = 0, solid = 0;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nx = x + dx, ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
          const j = idx(nx, ny);
          if (copy[j + 3] === 0) continue;
          solid++;
          if (copy[j] === copy[i] && copy[j + 1] === copy[i + 1] && copy[j + 2] === copy[i + 2]) same++;
        }
        if (solid <= 1) { buf2[i + 3] = 0; removed++; continue; }   // stray speck
        if (same === 0 && solid >= 3) {
          // an orphan colour surrounded by others: take the majority
          const counts = new Map();
          for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
            const nx = x + dx, ny = y + dy;
            if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
            const j = idx(nx, ny);
            if (copy[j + 3] === 0) continue;
            const k = `${copy[j]},${copy[j + 1]},${copy[j + 2]}`;
            counts.set(k, (counts.get(k) ?? 0) + 1);
          }
          let bk = null, bc = 0;
          for (const [k, v] of counts) if (v > bc) { bc = v; bk = k; }
          if (bk && bc >= 3) {
            const [r, g, b] = bk.split(',').map(Number);
            buf2[i] = r; buf2[i + 1] = g; buf2[i + 2] = b;
            removed++;
          }
        }
      }
    }
  }

  const c1 = document.createElement('canvas');
  c1.width = W; c1.height = H;
  const x1 = c1.getContext('2d');
  const im = x1.createImageData(W, H);
  im.data.set(buf2);
  x1.putImageData(im, 0, 0);
  return { url: c1.toDataURL('image/png'), ow: W, oh: H, used: used.size, removed, detected };
}, { src: `data:image/png;base64,${b64}`, size: HEIGHT ?? SIZE, palette: PALETTE,
     clean: CLEAN, auto: AUTO, height: HEIGHT !== null, texture: TEXTURE });

await browser.close();

if (result.error) {
  console.error(result.error);
  process.exit(1);
}
writeFileSync(outFile, Buffer.from(result.url.split(',')[1], 'base64'));
console.log(`detected block grid: ${result.detected.gx}x${result.detected.gy}px `
  + `(${result.detected.blocksX}x${result.detected.blocksY} blocks)`);
console.log(`saved ${outFile}  ${result.ow}x${result.oh}, ${result.used} palette colours used`
  + (CLEAN ? `, ${result.removed} stray pixels cleaned` : ''));
