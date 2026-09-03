// The home-screen icons, drawn here rather than in a paint program.
//
//   node tools/icons.mjs
//
// Written as a build tool for the same reason the sprites are written
// in code: the icon has to agree with the palette, and a PNG exported
// once from somewhere else drifts the moment the palette moves.
//
// The PNG encoder below is about forty lines because a PNG is a zlib
// stream of filtered scanlines wrapped in four chunks, and Node ships
// both zlib and crc32-able buffers. That is cheaper than a dependency.

import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';

// ------------------------------------------------------------ encoder

const CRC = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();

function crc32(buf) {
  let c = -1;
  for (let i = 0; i < buf.length; i++) c = CRC[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}

/** rgba is a Uint8ClampedArray of w*h*4. */
function png(w, h, rgba) {
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (w * 4 + 1)] = 0;                       // filter: none
    Buffer.from(rgba.buffer, y * w * 4, w * 4).copy(raw, y * (w * 4 + 1) + 1);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;      // bit depth
  ihdr[9] = 6;      // colour type: RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// ----------------------------------------------------------- the icon
//
// What the icon has to say, in the sixty pixels iOS gives it on a home
// screen next to ANTON and YouTube: a lantern, alight, in a dark world.
// That is the whole story of the game — the world has gone dim and a
// child carries the light back into it — and it is the one shape in the
// project that nothing else on a home screen looks like.
//
// This deliberately REPLACES the island icon inherited from LernInseln.
// Two different games with the same icon is a bug the moment both are
// on the same home screen, which is exactly where these two will live.
//
// Composition, decided by rendering it at 60 pixels and squinting:
//   * the lantern is centred and about half the icon tall, so it still
//     reads as a lantern rather than as a bright smudge;
//   * the light pool is DITHERED rather than a smooth gradient, because
//     iOS downsamples the icon and a smooth ramp turns to mush while a
//     dither keeps its texture;
//   * a ground line and two firs sit at the bottom, so it reads as a
//     place rather than as a logo;
//   * everything stays well inside the middle, because iOS masks the
//     icon into a squircle and the manifest offers it as `maskable`.

// Straight from src/core/palette.ts. Kept short on purpose: an icon
// that needs more than eight colours is not an icon.
const INK = '#241d2b';
const C = {
  night: INK,
  nightDeep: '#1b1620',   // ink, one step further down its own ramp
  glow0: '#8f5a1c',
  glow1: '#c98a26',
  glow2: '#e8b447',
  glow3: '#ffe08a',
  glow4: '#fff6cf',
  amber0: '#6b3a1c',
  amber1: '#8f5423',
  amber2: '#b5722f',
  amber3: '#d19546',
  leafDark: '#15301f',
  leaf: '#22482a',
  pine: '#1a3325',
  earth: '#3c2a1c',
};

const N = 64;                       // the icon is drawn at 64 and scaled
const buf = new Uint8ClampedArray(N * N * 4);
const lantern = new Uint8Array(N * N);   // mask, for the ink outline

function px(x, y, hex, mark) {
  x |= 0; y |= 0;
  if (x < 0 || y < 0 || x >= N || y >= N) return;
  const n = parseInt(hex.slice(1), 16);
  const i = (y * N + x) * 4;
  buf[i] = (n >> 16) & 255;
  buf[i + 1] = (n >> 8) & 255;
  buf[i + 2] = n & 255;
  buf[i + 3] = 255;
  if (mark) lantern[y * N + x] = 1;
}

function rect(x, y, w, h, hex, mark) {
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) px(x + i, y + j, hex, mark);
}

/** Deterministic 0..1 noise, so the dither is stable across builds. */
function hash(x, y) {
  let h = (x * 374761393 + y * 668265263) | 0;
  h = ((h ^ (h >>> 13)) * 1274126177) | 0;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

// The flame. Everything below is measured from it.
const FX = 32, FY = 33;

// -------------------------------------------------------------- night

for (let y = 0; y < N; y++) {
  for (let x = 0; x < N; x++) {
    // Darkest at the corners, so the light pool has something to win
    // against. Two steps only — a night sky with a smooth gradient in
    // it stops looking like this game.
    const v = Math.hypot(x - 32, y - 32);
    const deep = v > 38 ? 1 : v > 30 ? (v - 30) / 8 : 0;
    px(x, y, hash(x + 101, y + 57) < deep ? C.nightDeep : C.night);
  }
}

// ------------------------------------------------------------- ground

for (let x = 0; x < N; x++) {
  const top = 50 + Math.round(2 * Math.sin(x / 9));
  for (let y = top; y < N; y++) {
    px(x, y, y === top ? C.leaf : y > top + 6 ? C.earth : C.leafDark);
  }
}

// Two firs, one each side, as silhouettes. They are here to give the
// icon a horizon; if they draw attention to themselves they are wrong.
for (const [tx, base, h] of [[11, 52, 15], [53, 53, 12]]) {
  rect(tx - 1, base - 3, 2, 4, C.earth);
  for (let j = 0; j < h; j++) {
    const w = Math.round((j / h) * 5.5);
    for (let x = -w; x <= w; x++) px(tx + x, base - 3 - j, j > h - 4 ? C.pine : C.leafDark);
  }
}

// ---------------------------------------------------------- light pool

// Rings of dither rather than a gradient. The densities were tuned by
// rendering the icon at 60 pixels and looking at it, not by taste at
// full size: at 64 the outer rings look like dirt, and at 60 they are
// the difference between a lantern and a sticker.
for (let y = 0; y < N; y++) {
  for (let x = 0; x < N; x++) {
    const r = Math.hypot(x - FX, (y - FY) * 1.05);
    let density, hex;
    if (r < 11) { density = 1.00; hex = C.glow1; }
    else if (r < 15) { density = 0.55; hex = C.glow0; }
    else if (r < 20) { density = 0.30; hex = C.glow0; }
    else if (r < 26) { density = 0.15; hex = C.amber0; }
    else if (r < 33) { density = 0.05; hex = C.amber0; }
    else continue;
    if (hash(x, y) < density) px(x, y, hex);
  }
}

// ----------------------------------------------------------- sparkles
//
// Funkelwelt means "sparkling world". Five of them, out in the dark the
// lantern has not reached yet, which is also the promise the game makes.
for (const [sx, sy, big] of [[12, 14, 1], [50, 11, 0], [56, 26, 1], [7, 31, 0], [43, 6, 0]]) {
  px(sx, sy, C.glow4);
  if (big) {
    px(sx - 1, sy, C.glow2); px(sx + 1, sy, C.glow2);
    px(sx, sy - 1, C.glow2); px(sx, sy + 1, C.glow2);
  }
}

// ------------------------------------------------------------ lantern

// Handle: an arch two pixels thick, because a one-pixel handle vanishes
// completely once iOS has finished downsampling.
for (let a = 195; a <= 345; a += 2) {
  const rad = (a * Math.PI) / 180;
  for (const rr of [6, 7]) {
    px(FX + Math.cos(rad) * rr, 25 + Math.sin(rad) * rr * 1.1, C.amber1, true);
  }
}
rect(FX - 1, 16, 3, 2, C.amber2, true);          // the ring at the top

// Cap: a trapezoid widening downward. Light comes from the upper LEFT,
// so the left face sits two steps up the ramp from the right one.
for (let j = 0; j < 5; j++) {
  const w = 5 + j;
  for (let x = -w; x <= w; x++) {
    px(FX + x, 21 + j, x < 0 ? C.amber3 : x === 0 ? C.amber2 : C.amber1, true);
  }
}

// Glass: filled from the flame outward along the glow ramp.
for (let y = 27; y <= 41; y++) {
  const w = y > 39 ? 5 : 6;
  for (let x = -w; x <= w; x++) {
    const d = Math.hypot(x * 1.15, (y - FY) * 0.9);
    // No glow4 in here: the flame is the only thing in the icon allowed
    // the brightest colour, or the two merge into one glowing arch.
    px(FX + x, y, d < 3 ? C.glow3 : d < 5.5 ? C.glow2 : C.glow1, true);
  }
}
// Frame: two uprights and a lintel, so the glass reads as glass held in
// metal rather than as a glowing brick.
for (let y = 27; y <= 41; y++) {
  px(FX - 7, y, C.amber2, true);
  px(FX + 7, y, C.amber0, true);
}
for (let x = -7; x <= 7; x++) px(FX + x, 26, x < 0 ? C.amber3 : C.amber1, true);

// The flame: a teardrop, brightest at its heart.
for (let j = 0; j < 7; j++) {
  const w = j < 2 ? 0 : 1;
  for (let x = -w; x <= w; x++) px(FX + x, 30 + j, j < 3 ? C.glow4 : C.glow3, true);
}

// Base: a trapezoid widening downward, and a foot.
for (let j = 0; j < 4; j++) {
  const w = 5 + j;
  for (let x = -w; x <= w; x++) px(FX + x, 42 + j, x < 0 ? C.amber2 : C.amber0, true);
}
rect(FX - 9, 46, 18, 2, C.amber1, true);

// ------------------------------------------------------------ outline

// One ink outline around the whole lantern, drawn LAST and from a mask
// so it cannot trace anything else. On LernInseln the same routine ran
// before the ground shadows and put every tree in a little black box.
{
  const edge = [];
  for (let y = 1; y < N - 1; y++) {
    for (let x = 1; x < N - 1; x++) {
      if (lantern[y * N + x]) continue;
      if (
        lantern[y * N + x - 1] || lantern[y * N + x + 1] ||
        lantern[(y - 1) * N + x] || lantern[(y + 1) * N + x]
      ) edge.push([x, y]);
    }
  }
  for (const [x, y] of edge) px(x, y, INK);
}

// --------------------------------------------------------------- out

/** Nearest neighbour. Only ever used at integer factors. */
function scale(src, from, factor) {
  const to = from * factor;
  const out = new Uint8ClampedArray(to * to * 4);
  for (let y = 0; y < to; y++) {
    for (let x = 0; x < to; x++) {
      const si = (((y / factor) | 0) * from + ((x / factor) | 0)) * 4;
      const di = (y * to + x) * 4;
      out[di] = src[si]; out[di + 1] = src[si + 1];
      out[di + 2] = src[si + 2]; out[di + 3] = src[si + 3];
    }
  }
  return out;
}

/**
 * Area average, for the one size that is not an integer multiple of 64.
 *
 * iOS draws the home-screen icon at 180 on an iPad, and 180/64 is
 * 2.8125. Nearest neighbour at a fractional factor gives some source
 * pixels three output pixels and others two, which shows as a visible
 * stagger along every straight edge — and this icon is almost entirely
 * straight edges. Scaling up to 512 first and then box-filtering down
 * means every output pixel averages a whole 2.84-pixel block, which is
 * roughly what Safari would do anyway, done once here where it can be
 * looked at.
 */
function box(src, from, to) {
  const out = new Uint8ClampedArray(to * to * 4);
  const f = from / to;
  for (let y = 0; y < to; y++) {
    const y0 = Math.floor(y * f), y1 = Math.max(y0 + 1, Math.floor((y + 1) * f));
    for (let x = 0; x < to; x++) {
      const x0 = Math.floor(x * f), x1 = Math.max(x0 + 1, Math.floor((x + 1) * f));
      let r = 0, g = 0, b = 0, n = 0;
      for (let sy = y0; sy < y1; sy++) {
        for (let sx = x0; sx < x1; sx++) {
          const si = (sy * from + sx) * 4;
          r += src[si]; g += src[si + 1]; b += src[si + 2]; n++;
        }
      }
      const di = (y * to + x) * 4;
      out[di] = r / n; out[di + 1] = g / n; out[di + 2] = b / n; out[di + 3] = 255;
    }
  }
  return out;
}

mkdirSync('public/icons', { recursive: true });

const master = scale(buf, N, 8);                   // 512, exact

for (const [size, factor] of [[192, 3], [512, 8]]) {
  if (size / factor !== N) {
    // Nearest neighbour only stays crisp at integer factors, so this
    // asserts rather than quietly producing a blurry icon.
    throw new Error(`icon size ${size} is not an integer multiple of ${N}`);
  }
  writeFileSync(`public/icons/icon-${size}.png`, png(size, size, scale(buf, N, factor)));
  console.log(`  public/icons/icon-${size}.png`);
}

// The sizes iOS actually draws a home-screen icon at, shipped rather
// than left to Safari: 152 is an iPad at 2x, 167 an iPad Pro, 180 an
// iPhone at 3x, 120 an iPhone at 2x. None of them is a multiple of 64,
// so they all come down from the 512 master through the box filter.
// 32 and 64 are the browser tab.
for (const size of [180, 167, 152, 120, 64, 32]) {
  writeFileSync(`public/icons/icon-${size}.png`, png(size, size, box(master, 512, size)));
  console.log(`  public/icons/icon-${size}.png`);
}
