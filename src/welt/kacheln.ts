// The ground, and the things standing on it.
//
// Same rules as every other sprite in this project, and they are not
// negotiable at tile size either: one closed palette, shading is
// stepping along a ramp, light comes from the upper LEFT. What is new
// here is the problem tiles have and sprites do not — a tile is seen a
// thousand times at once, so anything wrong with it is wrong a thousand
// times, and anything REPEATED in it reads as wallpaper.
//
// Two decisions follow from that:
//
//   * Every ground tile takes the position it will occupy as its seed,
//     so no two patches of grass are the same patch of grass. They are
//     composited into the map buffer once at load, so this costs
//     nothing per frame.
//
//   * Anything with an edge — path, water, cliff — takes a mask of
//     which neighbours are the same kind, and draws its own boundary.
//     A path drawn as a square of brown is a carpet; a path that
//     dithers into the grass along the sides where there is no more
//     path is a path.

import { P, INK, shade, stepDown, mixSnap, type Ramp } from '../core/palette.js';
import { Px, rand } from '../core/px.js';

export const KACHEL = 16;

/** Neighbour bits, for the tiles that draw their own edges. */
export const N = 1, O = 2, S = 4, W = 8;

function finish(p: Px): void {
  p.rim(stepDown, INK);
  p.antialias(mixSnap);
}

/** Scatter n pixels of a colour, deterministically. */
function streu(p: Px, r: () => number, n: number, hex: string, hoch = 1): void {
  for (let i = 0; i < n; i++) {
    const x = Math.floor(r() * p.w), y = Math.floor(r() * p.h);
    for (let j = 0; j < hoch; j++) p.set(x, y + j, hex);
  }
}

// ============================================================= the ground

/**
 * Meadow. The most-seen surface in the game, so it carries the mood and
 * it is the one that must not read as a flat green rectangle.
 *
 * Blades rather than noise: two-pixel verticals, the lit ones a step up
 * the ramp and the shaded ones a step down. Noise at this density looks
 * like dirt; blades look like grass, and the difference is only that
 * they are two pixels tall.
 */
export function gras(seed: number): Px {
  const p = new Px(KACHEL, KACHEL);
  const r = rand(seed);
  p.rect(0, 0, KACHEL, KACHEL, shade(P.grass, 2));
  streu(p, r, 9, shade(P.grass, 3), 2);
  streu(p, r, 6, shade(P.grass, 1), 2);
  streu(p, r, 3, shade(P.grass, 4));
  return p;
}

/** Meadow with flowers. Three heads, and each one has a shaded pixel. */
export function blumen(seed: number): Px {
  const p = gras(seed);
  const r = rand(seed ^ 0x9e37);
  const ramps: Ramp[] = [P.blossom, P.glow, P.candy, P.plum];
  for (let i = 0; i < 3; i++) {
    const x = 2 + Math.floor(r() * (KACHEL - 4));
    const y = 2 + Math.floor(r() * (KACHEL - 4));
    const ramp = ramps[Math.floor(r() * ramps.length)];
    p.set(x, y + 1, shade(P.grass, 1));
    p.set(x, y, shade(ramp, 3));
    p.set(x - 1, y, shade(ramp, 2));
    p.set(x, y - 1, shade(ramp, 4));
  }
  return p;
}

/** A tuft of taller grass, for texture between the flowers. */
export function hochgras(seed: number): Px {
  const p = gras(seed);
  const r = rand(seed ^ 0x51ed);
  const cx = 3 + Math.floor(r() * (KACHEL - 6));
  const cy = 6 + Math.floor(r() * 6);
  for (let i = -3; i <= 3; i++) {
    const h = 4 - Math.abs(i);
    if (h <= 0) continue;
    p.rect(cx + i, cy - h, 1, h + 2, shade(P.grass, i < 0 ? 4 : 3));
    p.set(cx + i, cy + 2, shade(P.grass, 1));
  }
  return p;
}

/**
 * Trodden path.
 *
 * The mask is doing the work: on any side where there is no more path,
 * the earth stops three pixels short and the last two are dithered into
 * the grass. That dithered band is the whole difference between a route
 * somebody wore into the meadow and a brown rectangle laid on top of it.
 */
export function weg(seed: number, maske: number): Px {
  const p = gras(seed);
  const r = rand(seed ^ 0x2f1d);
  const einzug = (bit: number): number => ((maske & bit) ? 0 : 3);
  const x0 = einzug(W), x1 = KACHEL - einzug(O);
  const y0 = einzug(N), y1 = KACHEL - einzug(S);
  p.rect(x0, y0, x1 - x0, y1 - y0, shade(P.dry, 2));
  // The dithered fringe, two pixels out from the solid earth.
  for (let y = 0; y < KACHEL; y++) {
    for (let x = 0; x < KACHEL; x++) {
      if (x >= x0 && x < x1 && y >= y0 && y < y1) continue;
      const dx = x < x0 ? x0 - x : x >= x1 ? x - x1 + 1 : 0;
      const dy = y < y0 ? y0 - y : y >= y1 ? y - y1 + 1 : 0;
      if (Math.max(dx, dy) > 2) continue;
      if (((x + y) & 1) === (Math.max(dx, dy) === 2 ? 1 : 0)) continue;
      p.set(x, y, shade(P.dry, 2));
    }
  }
  streu(p, r, 7, shade(P.dry, 3));
  streu(p, r, 5, shade(P.dry, 1));
  // Two pebbles, because a bare path is as flat as a bare meadow.
  for (let i = 0; i < 2; i++) {
    const x = x0 + 2 + Math.floor(r() * Math.max(1, x1 - x0 - 4));
    const y = y0 + 2 + Math.floor(r() * Math.max(1, y1 - y0 - 4));
    p.set(x, y, shade(P.stone, 3));
    p.set(x + 1, y, shade(P.stone, 2));
    p.set(x, y + 1, shade(P.stone, 1));
  }
  return p;
}

/** Shore. Warm, and the brightest large surface in the region. */
export function sand(seed: number): Px {
  const p = new Px(KACHEL, KACHEL);
  const r = rand(seed ^ 0x77a1);
  p.rect(0, 0, KACHEL, KACHEL, shade(P.sand, 2));
  streu(p, r, 10, shade(P.sand, 3));
  streu(p, r, 5, shade(P.sand, 4));
  streu(p, r, 4, shade(P.sand, 1));
  return p;
}

/**
 * Water.
 *
 * Two frames, swapped about twice a second. Still water reads as a hole
 * in the map; two frames of ripple and the same pond reads as water,
 * and it costs one extra prerender rather than anything per frame.
 *
 * `maske` is which neighbours are also water, so the tile can put foam
 * where it meets the land — which is also what stops a pond looking
 * like a blue polygon somebody pasted on.
 */
export function wasser(seed: number, maske: number, frame: number): Px {
  const p = new Px(KACHEL, KACHEL);
  const r = rand(seed ^ 0x3c9d);
  p.rect(0, 0, KACHEL, KACHEL, shade(P.sea, 1));
  for (let y = 0; y < KACHEL; y++) {
    for (let x = 0; x < KACHEL; x++) {
      if (((x + y + frame) & 3) === 0) p.set(x, y, shade(P.sea, 2));
    }
  }
  // Ripples: short dashes that step sideways between the two frames, so
  // the surface moves rather than flickers.
  for (let i = 0; i < 3; i++) {
    const y = Math.floor(r() * KACHEL);
    const x = Math.floor(r() * KACHEL);
    const len = 3 + Math.floor(r() * 3);
    for (let k = 0; k < len; k++) {
      p.set((x + k + frame * 2) % KACHEL, y, shade(P.sea, 3));
    }
    p.set((x - 1 + frame * 2 + KACHEL) % KACHEL, y + 1, shade(P.sea, 0));
  }
  // Foam, on every side where the water stops.
  const kante = (bit: number, fx: (i: number, d: number) => [number, number]): void => {
    if (maske & bit) return;
    for (let i = 0; i < KACHEL; i++) {
      for (let d = 0; d < 2; d++) {
        const [x, y] = fx(i, d);
        if (d === 1 && ((i + frame) & 1) === 0) continue;
        p.set(x, y, shade(P.foam, d === 0 ? 2 : 1));
      }
    }
  };
  kante(N, (i, d) => [i, d]);
  kante(S, (i, d) => [i, KACHEL - 1 - d]);
  kante(W, (i, d) => [d, i]);
  kante(O, (i, d) => [KACHEL - 1 - d, i]);
  return p;
}

/** Planks over the stream. The one place you may walk on water. */
export function bruecke(seed: number, maske: number, frame: number): Px {
  const p = wasser(seed, maske, frame);
  const r = rand(seed ^ 0x1abc);
  p.rect(0, 2, KACHEL, 12, shade(P.timber, 2));
  p.rect(0, 2, KACHEL, 2, shade(P.timber, 3));
  p.rect(0, 12, KACHEL, 2, shade(P.timber, 1));
  // Planks run across the way you walk, which is what a bridge does and
  // also what tells your eye which way it goes.
  for (let x = (seed & 1); x < KACHEL; x += 3) p.rect(x, 3, 1, 10, shade(P.timber, 1));
  streu(p, r, 4, shade(P.timber, 3));
  // Rails, top and bottom, in ink so the deck has an edge to it.
  p.rect(0, 1, KACHEL, 1, shade(P.timber, 4));
  p.rect(0, 14, KACHEL, 1, INK);
  return p;
}

/**
 * Cliff.
 *
 * A cliff seen from three-quarters above is two surfaces: a top you
 * could stand on and a face you could not. Which one this tile shows
 * depends entirely on whether there is more cliff below it, so the mask
 * is not decoration here — it is the difference between a wall and a
 * grey square.
 */
export function fels(seed: number, maske: number): Px {
  const p = new Px(KACHEL, KACHEL);
  const r = rand(seed ^ 0x5eed);
  p.rect(0, 0, KACHEL, KACHEL, shade(P.stone, 3));
  // Blotches before speckle. Speckle alone reads as static — it needs
  // shapes of two or three pixels for the eye to call it rock.
  for (let i = 0; i < 4; i++) {
    const x = Math.floor(r() * (KACHEL - 3)), y = Math.floor(r() * (KACHEL - 3));
    p.rect(x, y, 2 + Math.floor(r() * 2), 2, shade(P.stone, r() > 0.5 ? 4 : 2));
  }
  streu(p, r, 8, shade(P.stone, 4));
  streu(p, r, 6, shade(P.stone, 2));
  if (!(maske & N)) {
    // The top edge catches the light, being the part that faces it.
    p.rect(0, 0, KACHEL, 2, shade(P.stone, 4));
    p.rect(0, 2, KACHEL, 1, shade(P.stone, 3));
  }
  if (!(maske & S)) {
    // The face. Ten pixels of rock turned away from the light, with a
    // lip where it breaks and vertical cracks so it has a grain.
    p.rect(0, 5, KACHEL, 1, shade(P.stone, 2));
    p.rect(0, 6, KACHEL, KACHEL - 6, shade(P.stone, 1));
    for (let i = 0; i < 3; i++) {
      const x = 1 + Math.floor(r() * (KACHEL - 2));
      const h = 4 + Math.floor(r() * 6);
      p.rect(x, 6, 1, h, shade(P.stone, 0));
      p.rect(x + 1, 6, 1, Math.max(2, h - 3), shade(P.stone, 2));
    }
    p.rect(0, KACHEL - 1, KACHEL, 1, INK);
  }
  // The sides. One pixel of edge is not an edge: the first draft left a
  // border cliff reading as a flat grey slab with a hairline against the
  // meadow, which is exactly the "the screen ran out" it was there to
  // avoid. Light comes from the upper left, so the west side catches it
  // and the east side turns away and takes ink.
  if (!(maske & W)) {
    p.rect(0, 0, 2, KACHEL, shade(P.stone, 4));
    p.rect(2, 0, 1, KACHEL, shade(P.stone, 3));
  }
  if (!(maske & O)) {
    p.rect(KACHEL - 3, 0, 2, KACHEL, shade(P.stone, 1));
    p.rect(KACHEL - 1, 0, 1, KACHEL, INK);
  }
  return p;
}

// ============================================================== the things

/**
 * A tree.
 *
 * Wider than its tile on purpose. A wood built out of sprites that fit
 * inside their own squares is a grid of lollipops; letting the canopies
 * overlap their neighbours is what turns twenty trees into one wood.
 */
export function baum(seed: number): Px {
  const p = new Px(26, 34);
  const r = rand(seed ^ 0xb00f);
  const gross = r() > 0.4;
  const ramp = r() > 0.72 ? P.pine : P.leaf;

  // trunk
  p.rect(11, 19, 4, 14, shade(P.timber, 1));
  p.rect(11, 19, 1, 14, shade(P.timber, 3));
  p.rect(14, 19, 1, 14, shade(P.timber, 0));
  p.rect(9, 31, 8, 2, shade(P.timber, 1));
  p.set(9, 32, shade(P.timber, 0));
  p.set(16, 32, shade(P.timber, 0));

  // canopy: three overlapping masses, not one ellipse, so the outline
  // is a tree rather than a balloon
  const cy = gross ? 12 : 15;
  const rx = gross ? 12 : 10;
  p.ellipse(13, cy, rx, gross ? 10 : 8, shade(ramp, 2));
  p.ellipse(8, cy - 3, rx - 4, 6, shade(ramp, 3));
  p.ellipse(18, cy + 2, rx - 5, 6, shade(ramp, 1));
  p.ellipse(7, cy - 5, 4, 3, shade(ramp, 4));
  p.ellipse(15, cy + 6, 7, 3, shade(ramp, 0));
  // sun coming through the leaves, upper left, three specks and no more
  for (let i = 0; i < 3; i++) p.set(5 + Math.floor(r() * 6), cy - 6 + Math.floor(r() * 5), shade(P.backlit, 3));

  finish(p);
  return p;
}

/** A bush. Some of them have berries; a wood of plain green is boring. */
export function busch(seed: number): Px {
  const p = new Px(18, 15);
  const r = rand(seed ^ 0xc0de);
  p.ellipse(9, 9, 8, 5, shade(P.leaf, 2));
  p.ellipse(6, 7, 5, 4, shade(P.leaf, 3));
  p.ellipse(5, 6, 3, 2, shade(P.leaf, 4));
  p.ellipse(11, 12, 6, 2, shade(P.leaf, 0));
  if (r() > 0.55) {
    for (let i = 0; i < 3; i++) {
      const x = 4 + Math.floor(r() * 10), y = 5 + Math.floor(r() * 6);
      p.set(x, y, shade(P.fruit, 3));
      p.set(x, y + 1, shade(P.fruit, 1));
      p.set(x - 1, y, shade(P.fruit, 4));
    }
  }
  finish(p);
  return p;
}

/** A rock. */
export function stein(seed: number): Px {
  const p = new Px(16, 13);
  const r = rand(seed ^ 0x7011);
  p.ellipse(8, 8, 7, 4, shade(P.stone, 2));
  p.ellipse(6, 6, 5, 3, shade(P.stone, 3));
  p.ellipse(5, 5, 3, 2, shade(P.stone, 4));
  p.ellipse(10, 10, 5, 2, shade(P.stone, 1));
  streu(p, r, 3, shade(P.stone, 0));
  finish(p);
  return p;
}

/** A fence panel: two posts and two rails. */
export function zaun(seed: number): Px {
  const p = new Px(16, 18);
  // Rails first, posts over them and standing proud above the top rail —
  // the other way round is a ladder lying in the grass, which is what
  // the first version looked like.
  for (const y of [8, 13]) {
    p.rect(0, y, 16, 2, shade(P.timber, 2));
    p.rect(0, y, 16, 1, shade(P.timber, 3));
  }
  for (const x of [2, 11]) {
    p.rect(x, 2, 3, 15, shade(P.timber, 2));
    p.rect(x, 2, 1, 15, shade(P.timber, 4));
    p.rect(x + 2, 2, 1, 15, shade(P.timber, 0));
    p.set(x + 1, 1, shade(P.timber, 3));
  }
  void seed;
  finish(p);
  return p;
}

/**
 * The signpost.
 *
 * A picture, not a word. AGENTS.md rule 14: the child cannot reliably
 * read yet, so a sign saying "Haus" is a sign saying nothing. It shows
 * a little house and an arrow, and the arrow points the way the house
 * actually is.
 */
export function schild(): Px {
  const p = new Px(18, 24);
  p.rect(7, 11, 3, 13, shade(P.timber, 2));
  p.rect(7, 11, 1, 13, shade(P.timber, 4));
  p.rect(9, 11, 1, 13, shade(P.timber, 0));
  p.rect(1, 2, 16, 11, shade(P.timber, 3));
  p.rect(1, 2, 16, 2, shade(P.timber, 4));
  p.rect(1, 11, 16, 2, shade(P.timber, 1));

  // ONE arrow, and nothing else.
  //
  // The first version had a little house AND an arrow on a board fifteen
  // pixels wide, and at the size it is actually seen the two merged into
  // a smudge. A sign a child cannot read at a glance is a sign that says
  // nothing, so it says the one thing that is useful — that way — and it
  // says it in strokes three pixels thick.
  const hell = shade(P.plaster, 4);
  const tief = shade(P.timber, 0);
  p.rect(6, 6, 9, 3, tief);
  p.rect(5, 6, 9, 3, hell);
  for (let i = 0; i < 4; i++) {
    p.rect(4 + i, 4 + i, 3, 1, hell);
    p.rect(4 + i, 10 - i, 3, 1, hell);
  }
  finish(p);
  return p;
}

/**
 * A lamp post.
 *
 * These are not decoration: each one is a light source, so the path is
 * literally lit and following it at dusk means following the lamps.
 * That is the fiction of the whole game doing a job in the level design
 * rather than in a cutscene.
 */
export function laterne(): Px {
  const p = new Px(13, 34);
  p.rect(5, 12, 3, 21, shade(P.slate, 1));
  p.rect(5, 12, 1, 21, shade(P.slate, 2));
  p.rect(3, 32, 7, 2, shade(P.slate, 0));
  // the housing
  p.rect(3, 4, 7, 9, shade(P.glow, 2));
  p.rect(4, 5, 5, 7, shade(P.glow, 3));
  p.rect(5, 6, 3, 5, shade(P.glow, 4));
  p.rect(2, 2, 9, 2, shade(P.slate, 2));
  p.rect(2, 12, 9, 2, shade(P.slate, 1));
  p.rect(6, 0, 1, 2, shade(P.slate, 2));
  // corner posts, so it reads as a lantern and not as a glowing brick
  p.rect(3, 4, 1, 9, shade(P.slate, 3));
  p.rect(9, 4, 1, 9, shade(P.slate, 0));
  finish(p);
  return p;
}

/**
 * Das Haus der verliebten Zahlen.
 *
 * Five tiles of wall and a lit door, because the door is the argument.
 * A child on the path should be able to see from across the meadow that
 * this is a place you go INTO — which at this size means one warm
 * rectangle at ground level and two more up in the wall.
 */
export function haus(): Px {
  const B = 80, H = 100;
  const p = new Px(B, H);
  const wandY = 40;
  // walls
  p.rect(4, wandY, B - 8, H - wandY - 2, shade(P.plaster, 3));
  p.rect(4, wandY, 26, H - wandY - 2, shade(P.plaster, 4));
  p.rect(B - 14, wandY, 10, H - wandY - 2, shade(P.plaster, 2));
  p.rect(4, H - 6, B - 8, 4, shade(P.stone, 2));
  p.rect(4, H - 6, B - 8, 1, shade(P.stone, 3));
  // timber framing: three uprights and a mid rail
  for (const x of [16, 38, 60]) {
    p.rect(x, wandY + 4, 3, H - wandY - 10, shade(P.timber, 2));
    p.rect(x, wandY + 4, 1, H - wandY - 10, shade(P.timber, 3));
  }
  p.rect(6, wandY + 22, B - 12, 3, shade(P.timber, 2));
  p.rect(6, wandY + 22, B - 12, 1, shade(P.timber, 3));

  // roof: a gable, drawn as rows so the eave overhangs the wall
  for (let i = 0; i < wandY; i++) {
    const w = Math.round(2 + (i / wandY) * (B - 4));
    const x = Math.round((B - w) / 2);
    const h = i < 6 ? 4 : 3;
    p.rect(x, i, w, 1, shade(P.terracotta, i < wandY * 0.45 ? h : h - 1));
  }
  // tile courses, so the roof has a texture and a direction
  for (let i = 6; i < wandY; i += 5) {
    const w = Math.round(2 + (i / wandY) * (B - 4));
    const x = Math.round((B - w) / 2);
    p.rect(x, i, w, 1, shade(P.terracotta, 1));
  }
  p.rect(Math.round(B / 2) - 1, 0, 3, 3, shade(P.terracotta, 4));
  // the eave shadow: what makes the roof sit ON the house
  p.rect(2, wandY, B - 4, 2, shade(P.terracotta, 0));

  // the door, and the light coming out of it
  const dx = Math.round(B / 2) - 8;
  p.rect(dx - 2, H - 30, 20, 28, shade(P.timber, 1));
  p.rect(dx, H - 28, 16, 26, shade(P.glow, 3));
  p.rect(dx + 2, H - 26, 12, 24, shade(P.glow, 4));
  p.rect(dx, H - 28, 16, 2, shade(P.glow, 2));
  // two lit windows
  for (const wx of [18, B - 32]) {
    p.rect(wx, wandY + 8, 14, 12, shade(P.timber, 1));
    p.rect(wx + 2, wandY + 10, 10, 8, shade(P.glow, 3));
    p.rect(wx + 2, wandY + 10, 10, 3, shade(P.glow, 4));
    p.rect(wx + 6, wandY + 10, 2, 8, shade(P.timber, 1));
  }
  finish(p);
  return p;
}

/**
 * The market cart.
 *
 * KONZEPT.md is blunt about what this must not be: the playtest that
 * started this whole project failed on a shop, and it failed because a
 * child who had just answered ten questions was handed a catalogue of
 * twenty-seven things and an empty meadow. So this is a CART — small,
 * one of them, standing beside the path, with four things on it.
 */
export function karren(): Px {
  const p = new Px(30, 30);
  // wheels first, behind the body
  for (const x of [4, 20]) {
    p.ellipse(x + 3, 25, 4, 4, shade(P.timber, 1));
    p.ellipse(x + 3, 25, 2, 2, shade(P.timber, 3));
  }
  // the box of the cart
  p.rect(2, 15, 26, 9, shade(P.timber, 2));
  p.rect(2, 15, 26, 2, shade(P.timber, 3));
  p.rect(2, 22, 26, 2, shade(P.timber, 0));
  for (let x = 4; x < 28; x += 5) p.rect(x, 17, 1, 5, shade(P.timber, 1));
  // an awning, because a stall needs a roof to read as a stall
  p.rect(1, 8, 28, 4, shade(P.terracotta, 3));
  for (let x = 1; x < 29; x += 6) p.rect(x, 8, 3, 4, shade(P.plaster, 4));
  p.rect(1, 11, 28, 1, shade(P.terracotta, 1));
  p.rect(2, 9, 2, 14, shade(P.timber, 2));
  p.rect(26, 9, 2, 14, shade(P.timber, 1));
  // and the goods: three bright things, which is what says SHOP at
  // thirty pixels far better than any sign would
  p.ellipse(8, 14, 3, 2, shade(P.glow, 3));
  p.ellipse(15, 13, 2, 2, shade(P.fruit, 3));
  p.ellipse(21, 14, 3, 2, shade(P.chalk, 3));
  finish(p);
  return p;
}

/**
 * A gate.
 *
 * The moment the per-subject stars pay off, and the whole reason they
 * are per subject: a child who loves numbers and finds letters hard
 * opens the number gate, and that is honest about what is actually true
 * of them.
 *
 * What it wants is drawn as STARS rather than written as a level.
 * AGENTS.md rule 14 — no text is load-bearing — and a six-year-old who
 * cannot read "ab Stufe 3" can count three stars perfectly well. When
 * the gate opens they light up, which is the only feedback needed:
 * the thing you were short of, you now have.
 */
export function tor(offen: boolean, sterne: number): Px {
  const p = new Px(22, 30);
  // Two stone posts, set into the cliff either side.
  for (const x of [0, 17]) {
    p.rect(x, 6, 5, 24, shade(P.stone, 2));
    p.rect(x, 6, 2, 24, shade(P.stone, 3));
    p.rect(x + 4, 6, 1, 24, shade(P.stone, 1));
    p.rect(x, 4, 5, 3, shade(P.stone, 4));
    p.rect(x, 6, 5, 1, shade(P.stone, 1));
  }
  if (offen) {
    // The bar is swung up out of the way and the posts are lit. Nothing
    // is broken, nothing is destroyed — it is simply open now.
    p.rect(5, 5, 12, 2, shade(P.timber, 2));
    p.rect(5, 5, 12, 1, shade(P.timber, 4));
    for (let i = 0; i < sterne; i++) {
      const sx = 4 + i * 5;
      p.set(sx + 1, 13, shade(P.glow, 4));
      p.line(sx, 13, sx + 2, 13, shade(P.glow, 3));
      p.line(sx + 1, 12, sx + 1, 14, shade(P.glow, 3));
    }
  } else {
    // Three bars across, and the stars it is waiting for.
    for (const y of [10, 17, 24]) {
      p.rect(4, y, 14, 3, shade(P.timber, 2));
      p.rect(4, y, 14, 1, shade(P.timber, 3));
      p.rect(4, y + 2, 14, 1, shade(P.timber, 0));
    }
    for (let i = 0; i < sterne; i++) {
      const sx = 5 + i * 5;
      p.line(sx, 14, sx + 2, 14, shade(P.stone, 4));
      p.line(sx + 1, 13, sx + 1, 15, shade(P.stone, 4));
      p.set(sx + 1, 14, shade(P.plaster, 4));
    }
  }
  finish(p);
  return p;
}

/**
 * A lightspark: one of the old lights, fallen and still burning, lying
 * in the grass waiting to be picked up.
 *
 * Four frames rather than a scale animation, because a sprite scaled by
 * a fraction stops being a pixel sprite — this is the same lesson the
 * icons paid for, in a smaller place.
 */
export function funke(frame: number): Px {
  const p = new Px(11, 11);
  const r = 3 + (frame % 2);
  p.line(5 - r, 5, 5 + r, 5, shade(P.glow, 3));
  p.line(5, 5 - r, 5, 5 + r, shade(P.glow, 3));
  for (let i = 1; i < r - 1; i++) {
    p.set(5 - i, 5 - i, shade(P.glow, 2));
    p.set(5 + i, 5 - i, shade(P.glow, 2));
    p.set(5 - i, 5 + i, shade(P.glow, 2));
    p.set(5 + i, 5 + i, shade(P.glow, 2));
  }
  p.rect(4, 4, 3, 3, shade(P.glow, 4));
  p.set(5, 5, shade(P.plaster, 4));
  return p;
}
