// The two currencies, drawn.
//
// They were CSS circles: a yellow dot for a star and a pink dot for a
// sweet. Which is fine as a placeholder and wrong as a shipped thing —
// the whole app is hand-drawn pixels and the two numbers a child looks
// at most often were the one place that was not. A yellow dot also does
// not say "star" to anybody; it says "dot".
//
// Same palette, same rules as every other sprite: light from the upper
// left, shading by stepping along a ramp.

import { P, INK, shade } from './palette.js';
import { Px } from './px.js';

export type Icon = 'stern' | 'sternWort' | 'bonbon' | 'muenze' | 'zurueck' | 'zahnrad' | 'herz'
  | 'wLaterne' | 'wStiefel' | 'wMutband' | 'wHut'
  | 'wUmhang' | 'wGlueck' | 'wKompass' | 'ohr';

/** A five-pointed star, filled by scanline so the points stay sharp. */
function stern(): Px {
  const S = 17;
  const p = new Px(S, S);
  const c = (S - 1) / 2;
  const pts: [number, number][] = [];
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const r = i % 2 === 0 ? c - 0.5 : (c - 0.5) * 0.44;
    pts.push([c + Math.cos(a) * r, c + Math.sin(a) * r]);
  }
  for (let y = 0; y < S; y++) {
    const xs: number[] = [];
    for (let i = 0; i < pts.length; i++) {
      const [x1, y1] = pts[i];
      const [x2, y2] = pts[(i + 1) % pts.length];
      if ((y1 <= y && y2 > y) || (y2 <= y && y1 > y)) {
        xs.push(x1 + ((y - y1) / (y2 - y1)) * (x2 - x1));
      }
    }
    xs.sort((a, b) => a - b);
    for (let i = 0; i + 1 < xs.length; i += 2) {
      for (let x = Math.round(xs[i]); x <= Math.round(xs[i + 1]); x++) {
        // Lit from the upper left like everything else, so it belongs
        // to the same world as the island behind it.
        const d = (x - c) + (y - c);
        p.set(x, y, shade(P.glow, d < -3 ? 4 : d > 3 ? 2 : 3));
      }
    }
  }
  p.outline(INK);
  return p;
}

/**
 * A wrapped sweet: a round middle with a twist at each end.
 *
 * The twists are the whole silhouette. Without them it is a pink
 * circle, which is what it was.
 */
function bonbon(): Px {
  const S = 17;
  const p = new Px(S, S);
  const c = (S - 1) / 2;

  // the twisted ends, drawn first so the body covers their roots
  for (const dir of [-1, 1]) {
    for (let i = 3; i <= 7; i++) {
      const h = Math.round(1 + (i - 3) * 0.7);
      for (let j = -h; j <= h; j++) {
        p.set(c + dir * i, c + j, shade(P.candy, j < 0 ? 3 : 1));
      }
    }
  }
  // the body
  p.ellipse(c, c, 5, 5, shade(P.candy, 2));
  p.ellipse(c - 1, c - 1, 3, 3, shade(P.candy, 3));
  p.ellipse(c - 2, c - 2, 1, 1, shade(P.candy, 4));
  p.ellipse(c + 2, c + 2, 2, 2, shade(P.candy, 1));
  // a stripe, because a sweet has a wrapper
  p.line(c - 2, c + 3, c + 3, c - 2, shade(P.candy, 4));

  p.outline(INK);
  return p;
}

/**
 * The Wort-Stern.
 *
 * Two subjects, two stars, and until now they were the same gold
 * five-pointed one — so a gate asking for three stars did not say WHICH
 * three, and the counter in a language round showed the maths icon.
 *
 * Different in SHAPE as well as colour, because a child sorting these
 * at speed is reading the silhouette: four long points instead of five
 * short ones, and the learning blue that the ten-frame and the answer
 * cards already use for nothing else.
 */
function sternWort(): Px {
  const S = 17;
  const p = new Px(S, S);
  const c = (S - 1) / 2;
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const dx = Math.abs(x - c), dy = Math.abs(y - c);
      // A four-pointed sparkle: the two axes stay wide near the middle
      // and pinch away fast, which is what gives it long points.
      const t = Math.min(dx, dy) / 7;
      const l = Math.max(dx, dy) / 8;
      if (l <= 1 && t <= (1 - l) * (1 - l) * 0.9) {
        const d = (x - c) + (y - c);
        p.set(x, y, shade(P.chalk, d < -4 ? 4 : d > 4 ? 2 : 3));
      }
    }
  }
  p.set(c - 1, c - 1, shade(P.plaster, 4));
  p.outline(INK);
  return p;
}

/**
 * A coin.
 *
 * Muenzen are the spendable currency and they are NOT the sweets from
 * the previous project, so they do not get the sweet's sprite. Drawn
 * from the glow ramp, which is the family reserved for lit things — a
 * coin should look like it is catching the lantern.
 */
function muenze(): Px {
  const S = 17;
  const p = new Px(S, S);
  const c = (S - 1) / 2;
  p.ellipse(c, c, 7, 7, shade(P.glow, 1));
  p.ellipse(c, c, 6, 6, shade(P.glow, 2));
  p.ellipse(c - 1, c - 1, 4, 4, shade(P.glow, 3));
  p.ellipse(c - 2, c - 2, 2, 2, shade(P.glow, 4));
  p.ellipse(c + 2, c + 3, 3, 2, shade(P.glow, 1));
  p.outline(INK);
  return p;
}

/**
 * The two buttons the world screen needs, as pictures.
 *
 * AGENTS.md rule 14: no text is load-bearing, because the child cannot
 * reliably read yet. A button labelled "Einstellungen" is a button a
 * six-year-old cannot use, and one labelled with a glyph out of the
 * system font is the one thing on screen that did not come from the
 * palette.
 */
function zurueck(): Px {
  const S = 17;
  const p = new Px(S, S);
  const hell = shade(P.plaster, 4);
  for (const d of [0, 1, 2]) {
    p.line(4 + d, 8, 10 + d, 2, hell);
    p.line(4 + d, 8, 10 + d, 14, hell);
  }
  p.outline(INK);
  return p;
}

function zahnrad(): Px {
  const S = 17;
  const p = new Px(S, S);
  const c = (S - 1) / 2;
  for (let a = 0; a < 8; a++) {
    const w = (a * Math.PI) / 4;
    p.rect(Math.round(c + Math.cos(w) * 7) - 1, Math.round(c + Math.sin(w) * 7) - 1,
      3, 3, shade(P.stone, 3));
  }
  p.ellipse(c, c, 6, 6, shade(P.stone, 3));
  p.ellipse(c - 1, c - 1, 5, 5, shade(P.stone, 4));
  p.ellipse(c + 2, c + 2, 3, 3, shade(P.stone, 2));
  for (let y = -2; y <= 2; y++) {
    for (let x = -2; x <= 2; x++) if (x * x + y * y <= 5) p.clear(c + x, c + y);
  }
  p.outline(INK);
  return p;
}

/**
 * A heart, for the moment two numbers become friends.
 *
 * The same bitmap the ten-frame uses for its counters in the Haus der
 * verliebten Zahlen, so the celebration is made of the same shape the
 * child has been looking at for ten questions. Drawing a second,
 * prettier heart here would be a different object arriving to explain
 * the first one.
 */
function herz(): Px {
  const S = 17;
  const p = new Px(S, S);
  const M = [
    '.###...###.',
    '###########',
    '###########',
    '###########',
    '###########',
    '.#########.',
    '..#######..',
    '...#####...',
    '....###....',
    '.....#.....',
  ];
  for (let j = 0; j < M.length; j++) {
    for (let i = 0; i < M[j].length; i++) {
      if (M[j][i] !== '#') continue;
      const dx = i - 5, dy = j - 4;
      p.set(i + 3, j + 3, shade(P.blossom, dx + dy <= -5 ? 4 : dx + dy >= 5 ? 1 : 2));
    }
  }
  p.set(5, 5, shade(P.blossom, 4));
  p.set(6, 5, shade(P.blossom, 4));
  p.set(5, 6, shade(P.blossom, 4));
  p.outline(INK);
  return p;
}

// ------------------------------------------------------ what is for sale
//
// Drawn at 17 like every other icon and shown at 68, which is four
// times. The child is choosing by PICTURE — none of them can read the
// name underneath — so each one has to be recognisable as an object at a
// glance and different in silhouette from the other three.

function wLaterne(): Px {
  const p = new Px(17, 17);
  p.rect(6, 1, 5, 2, shade(P.slate, 2));
  p.set(8, 0, shade(P.slate, 3));
  p.rect(4, 3, 9, 10, shade(P.glow, 2));
  p.rect(5, 4, 7, 8, shade(P.glow, 3));
  p.rect(6, 5, 5, 6, shade(P.glow, 4));
  p.rect(4, 3, 1, 10, shade(P.slate, 3));
  p.rect(12, 3, 1, 10, shade(P.slate, 0));
  p.rect(3, 13, 11, 2, shade(P.slate, 1));
  p.outline(INK);
  return p;
}

function wStiefel(): Px {
  const p = new Px(17, 17);
  // one boot, in profile — a pair at this size is two brown smudges
  p.rect(5, 2, 5, 9, shade(P.timber, 2));
  p.rect(5, 2, 2, 9, shade(P.timber, 3));
  p.rect(3, 10, 10, 4, shade(P.timber, 1));
  p.rect(3, 10, 10, 1, shade(P.timber, 3));
  p.rect(2, 13, 12, 2, shade(P.timber, 0));
  p.rect(5, 5, 5, 1, shade(P.glow, 3));
  p.outline(INK);
  return p;
}

function wMutband(): Px {
  const p = new Px(17, 17);
  // a ribbon with a heart on it — Mut is measured in hearts elsewhere
  p.rect(1, 6, 15, 4, shade(P.candy, 2));
  p.rect(1, 6, 15, 1, shade(P.candy, 3));
  p.rect(1, 9, 15, 1, shade(P.candy, 1));
  for (const x of [0, 14]) {
    p.set(x + 1, 4, shade(P.candy, 1));
    p.set(x + 1, 11, shade(P.candy, 1));
  }
  const M = ['.#.#.', '#####', '#####', '.###.', '..#..'];
  for (let j = 0; j < M.length; j++) {
    for (let i = 0; i < M[j].length; i++) {
      if (M[j][i] !== '#') continue;
      p.set(i + 6, j + 5, shade(P.fruit, i + j < 3 ? 4 : 2));
    }
  }
  p.outline(INK);
  return p;
}

function wHut(): Px {
  const p = new Px(17, 17);
  p.ellipse(8, 11, 8, 3, shade(P.leaf, 2));
  p.ellipse(6, 10, 6, 2, shade(P.leaf, 3));
  p.rect(4, 3, 9, 8, shade(P.leaf, 2));
  p.rect(4, 3, 3, 8, shade(P.leaf, 3));
  p.ellipse(8, 3, 5, 2, shade(P.leaf, 4));
  p.rect(3, 8, 11, 2, shade(P.timber, 1));
  // a feather, which is the whole silhouette cue
  for (let i = 0; i < 6; i++) p.set(13 + Math.round(i * 0.4), 6 - i, shade(P.glow, 3));
  p.outline(INK);
  return p;
}

/**
 * A HOODED cloak.
 *
 * The first version was a plain flare with a small clasp and the
 * contact sheet showed a purple dress. A hood is what makes a cloak a
 * cloak at this size — it is the one part of the silhouette no other
 * garment has.
 */
function wUmhang(): Px {
  const p = new Px(17, 17);
  const tuch = shade(P.plum, 2);
  // The hood: a dome with a dark opening under it.
  p.ellipse(8, 5, 5, 4, shade(P.plum, 3));
  p.ellipse(8, 6, 3, 3, shade(P.plum, 0));
  // Shoulders, wider than the hood, then the body falling away.
  for (let y = 0; y < 8; y++) {
    const w = 11 + Math.round(y * 0.4);
    p.rect(8 - Math.floor(w / 2), 8 + y, w, 1, tuch);
  }
  p.rect(2, 9, 2, 7, shade(P.plum, 1));
  p.rect(13, 9, 2, 7, shade(P.plum, 3));
  // A ragged hem, so it is cloth and not a bell.
  for (let i = 0; i < 13; i++) {
    if ((i & 1) === 0) p.set(2 + i, 16, shade(P.plum, 1));
  }
  p.rect(7, 8, 3, 2, shade(P.glow, 3));
  p.outline(INK);
  return p;
}

/**
 * A band with a BOW in it.
 *
 * The first version was a braid drawn as a sine wave with a square in
 * the middle, and at seventeen pixels the contact sheet showed a green
 * frog. A bow is the shape that says "tied on" and it survives being
 * tiny, because it is two loops and nothing else.
 */
function wGlueck(): Px {
  const p = new Px(17, 17);
  // Blue, because every other thing on this cart has taken a colour:
  // the hat is green, the boot brown, the ribbon pink, the cloak purple
  // and the compass grey. Two green loops beside a green hat read as
  // leaves, which is what the first version looked like.
  const band = shade(P.sky, 2);
  const hell = shade(P.sky, 3);
  // The strap runs the whole width and is drawn LAST at the ends, so it
  // is visible past the loops — otherwise it is a bow floating in air.
  for (const s2 of [-1, 1]) {
    p.ellipse(8 + s2 * 3, 8, 3, 3, hell);
    p.ellipse(8 + s2 * 3, 8, 1, 1, band);
    p.rect(8 + s2 * 4, 11, 2, 5, band);
  }
  p.rect(0, 7, 4, 3, band);
  p.rect(13, 7, 4, 3, band);
  p.rect(0, 7, 4, 1, hell);
  p.rect(13, 7, 4, 1, hell);
  // A gold knot: the luck, and the one warm thing on it.
  p.rect(7, 6, 3, 5, shade(P.glow, 3));
  p.rect(7, 6, 3, 1, shade(P.glow, 4));
  p.outline(INK);
  return p;
}

/** A compass: a round case and one needle. */
function wKompass(): Px {
  const p = new Px(17, 17);
  p.ellipse(8, 8, 7, 7, shade(P.stone, 2));
  p.ellipse(8, 8, 5, 5, shade(P.plaster, 4));
  p.rect(7, 0, 3, 2, shade(P.stone, 1));
  // ONE needle and no compass rose. A rose at seventeen pixels is four
  // grey specks; a needle is a direction.
  for (let i = 0; i < 5; i++) p.set(8 - Math.floor(i / 2), 8 - i, shade(P.fruit, 3));
  for (let i = 0; i < 4; i++) p.set(8 + Math.floor(i / 2), 8 + i, shade(P.wool, 3));
  p.set(8, 8, INK);
  p.outline(INK);
  return p;
}

/**
 * Hear it again.
 *
 * A speaker or a "play" triangle both mean "media control" to an adult
 * and nothing at all to a six-year-old. An EAR means listen.
 */
function ohr(): Px {
  const p = new Px(17, 17);
  // Bold and simple. At seventeen pixels an ear has room for exactly one
  // curve and one hole, and the first two attempts both spent that room
  // on anatomy nobody can see: a tragus and a lobe came out as a smudge.
  // What reads is the C of the outer ear and the dark of the canal.
  const tief = INK;
  for (let y = 1; y <= 15; y++) {
    for (let x = 4; x <= 15; x++) {
      const dx = (x - 9.5) / 5.5, dy = (y - 8) / 7;
      const d = dx * dx + dy * dy;
      if (d <= 1) p.set(x, y, tief);
    }
  }
  // the hollow, open towards the sound
  for (let y = 4; y <= 12; y++) {
    for (let x = 7; x <= 14; x++) {
      const dx = (x - 11) / 3.2, dy = (y - 8) / 4.2;
      if (dx * dx + dy * dy <= 1) p.set(x, y, shade(P.glow, 4));
    }
  }
  p.rect(7, 6, 3, 5, tief);
  // two waves arriving
  for (const [r, h] of [[1, 2], [3, 4]] as [number, number][]) {
    for (let i = -h; i <= h; i++) {
      p.set(r + Math.round(Math.abs(i) * 0.35), 8 + i, tief);
    }
  }
  return p;
}

const ZEICHNER: Record<Icon, () => Px> = {
  stern, sternWort, bonbon, muenze, zurueck, zahnrad, herz,
  wLaterne, wStiefel, wMutband, wHut, wUmhang, wGlueck, wKompass, ohr,
};

const cache = new Map<string, HTMLCanvasElement>();

/** An icon at an integer scale, ready to drop into the DOM. */
export function iconCanvas(which: Icon, size: number): HTMLCanvasElement {
  const scale = Math.max(1, Math.round(size / 17));
  const key = `${which}:${scale}`;
  let src = cache.get(key);
  if (!src) {
    const px = ZEICHNER[which]();
    const base = px.toCanvas();
    src = document.createElement('canvas');
    src.width = base.width * scale;
    src.height = base.height * scale;
    const ctx = src.getContext('2d', { willReadFrequently: true })!;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(base, 0, 0, src.width, src.height);
    cache.set(key, src);
  }
  // A fresh element per call: the same canvas cannot be in the document
  // twice, and the purse is rebuilt on every screen.
  const out = document.createElement('canvas');
  out.width = src.width;
  out.height = src.height;
  out.className = 'icon';
  out.getContext('2d')!.drawImage(src, 0, 0);
  out.style.width = `${src.width}px`;
  out.style.height = `${src.height}px`;
  return out;
}
