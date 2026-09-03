// The adventurer.
//
// Top-down three-quarter, the Zelda view: you see the face, and you see
// the ground the character stands on. It is the only camera that lets a
// small sprite have a FACE — and a face is what makes a child say "that
// is me" rather than "that is a piece".
//
// Drawn in code like everything else, from the same closed palette, so
// that the character belongs to the world it walks around in and so a
// new outfit costs a ramp rather than a drawing.
//
// The proportions are deliberately chibi — the head is nearly half the
// height. At sixteen pixels wide that is not a style choice, it is the
// only way to fit two eyes and a hairstyle into a thing you can still
// tell apart from a shrub.

import { P, INK, shade, stepDown, mixSnap, type Ramp } from '../core/palette.js';
import { Px } from '../core/px.js';

export type Richtung = 'unten' | 'oben' | 'links' | 'rechts';

export interface Aussehen {
  /** Index into HAUT. */
  haut: number;
  /** Index into HAAR. */
  haar: number;
  /** Which hairstyle. */
  frisur: number;
  /** Index into KLEID — the tunic. */
  kleid: number;
}

/** Four skins, from the palette's own ramp. */
export const HAUT: Ramp[] = [
  ['#5c3a24', '#8f6141', '#b8865c', '#d9a97c'] as Ramp,
  ['#8f6141', '#b8865c', '#d9a97c', '#f0c79a'] as Ramp,
  ['#a8633a', '#cf8f5c', '#edc39a', '#f8f0dc'] as Ramp,
  ['#734f33', '#a8633a', '#cf8f5c', '#edc39a'] as Ramp,
];

/** Hair. Six, and two of them are not natural, because it is a game. */
export const HAAR: Ramp[] = [
  ['#241d2b', '#3c2a1c', '#573c27', '#734f33'] as Ramp,   // black
  ['#573c27', '#734f33', '#8f6944', '#ab875e'] as Ramp,   // brown
  ['#8f5a1c', '#c98a26', '#e8b447', '#ffe08a'] as Ramp,   // blond
  ['#6b2f28', '#8f4030', '#b5573f', '#d17550'] as Ramp,   // red
  ['#2e4360', '#4a6b8f', '#7a9cbd', '#bcd9e8'] as Ramp,   // blue
  ['#5c3a68', '#7d558f', '#a37cb3', '#c9a8d6'] as Ramp,   // purple
];

/** The tunic. Every one of these is available to every character. */
export const KLEID: Ramp[] = [
  ['#375c4e', '#5a8f7a', '#8fbda6', '#c9efe9'] as Ramp,   // green
  ['#2e4360', '#4a6b8f', '#7a9cbd', '#bcd9e8'] as Ramp,   // blue
  ['#8f3a4a', '#c25a5a', '#e08a80', '#f5907f'] as Ramp,   // red
  ['#5c4423', '#8f6b3a', '#c2996b', '#e6d093'] as Ramp,   // ochre
  ['#8f4a6b', '#bd6b91', '#dc93b3', '#f0bcd1'] as Ramp,   // pink
  ['#432e5c', '#6b4a8f', '#9a7abd', '#c9a8d6'] as Ramp,   // purple
];

export const W = 18;
export const H = 26;

function finish(p: Px): void {
  p.rim(stepDown, INK);
  p.antialias(mixSnap);
}

/**
 * One frame of the adventurer.
 *
 * `frame` is 0, 1 or 2: standing, left foot forward, right foot
 * forward. A three-frame walk with the stand in the middle is the
 * oldest trick there is and still reads better than four unique frames
 * at this size, because the eye fills in the rest.
 *
 * The anatomy below is the second attempt. The first one put a
 * full-width fringe two pixels above the eyes, so every character had
 * a dark bar across its face and read as a potato in a bowl cut; gave
 * the legs no gap between them, so the walk did not read at all; and
 * drew the side view as the front view with an extra eye, so three of
 * the four directions were the same picture. What fixed it:
 *
 *   * a FOREHEAD — three clear pixels of skin between hair and eyes;
 *   * a GAP between the legs, which is the whole walk cycle;
 *   * a genuinely narrower head in profile, with one eye and the hair
 *     wrapping the back of the skull;
 *   * and a lantern, which gives the silhouette something no shrub has.
 */
export function held(dir: Richtung, frame: number, a: Aussehen, hut = false): Px {
  const p = new Px(W, H);
  const haut = HAUT[a.haut % HAUT.length];
  const haar = HAAR[a.haar % HAAR.length];
  const kleid = KLEID[a.kleid % KLEID.length];

  const spiegel = dir === 'rechts';
  const d: Richtung = spiegel ? 'links' : dir;
  const seite = d === 'links';
  const hinten = d === 'oben';
  const cx = 9;

  // A one-pixel bob on the walking frames. Without it the character
  // slides along the ground; with it, it walks.
  const bob = frame === 0 ? 0 : -1;

  // -------------------------------------------------------------- legs
  const schritt = frame === 0 ? 0 : frame === 1 ? 1 : -1;
  if (seite) {
    // In profile a walk is legs swinging FORWARD and BACK, not up and
    // down, and the far leg has to be a step darker or the two read as
    // one shape. The first version put them side by side, at the same
    // height, in one colour — and the moment the world existed and the
    // character was actually watched walking east for four seconds, it
    // was obvious: he was moving about inside a barrel. Same lesson as
    // the front view's missing gap, in the one direction the contact
    // sheet had only ever been asked to show standing still.
    //
    // Darker leg first, so the near one covers it.
    const beine: [number, number][] = [[cx - 3 - schritt * 2, 2], [cx - 3 + schritt * 2, 0]];
    for (const [bx, tiefer] of beine) {
      const fuss = 24 + bob;
      p.rect(bx, 19 + bob, 3, fuss - 19 - bob, shade(P.timber, 2 - tiefer));
      p.rect(bx, 19 + bob, 1, fuss - 19 - bob, shade(P.timber, 3 - tiefer));
      // The foot points the way the character is facing.
      p.rect(bx - 1, fuss, 4, 2, shade(P.timber, 1 - tiefer));
      p.rect(bx - 1, fuss + 1, 4, 1, shade(P.timber, 0));
    }
  } else {
    // Facing the camera, the GAP between them is what makes the walk
    // read. Two blocks touching are a skirt.
    const beine: [number, number][] = [[cx - 4, schritt], [cx + 1, -schritt]];
    for (const [bx, off] of beine) {
      const fuss = 24 + bob - Math.max(0, off);
      p.rect(bx, 19 + bob, 3, fuss - 19 - bob, shade(P.timber, 2));
      p.rect(bx, 19 + bob, 1, fuss - 19 - bob, shade(P.timber, 3));
      p.rect(bx - (off > 0 ? 1 : 0), fuss, 4, 2, shade(P.timber, 1));
      p.rect(bx - (off > 0 ? 1 : 0), fuss + 1, 4, 1, shade(P.timber, 0));
    }
  }

  // -------------------------------------------------------------- body
  const koerperY = 12 + bob;
  const bh = 7;
  const bw = seite ? 6 : 9;
  const bx0 = cx - Math.floor(bw / 2);
  p.rect(bx0, koerperY, bw, bh, shade(kleid, 2));
  p.rect(bx0, koerperY, Math.ceil(bw / 2.5), bh, shade(kleid, 3));
  p.rect(bx0 + bw - 2, koerperY, 2, bh, shade(kleid, 1));
  // a belt with a buckle: most of what says "adventurer" at this size
  p.rect(bx0, koerperY + bh - 2, bw, 1, shade(P.timber, 1));
  p.set(cx, koerperY + bh - 2, shade(P.glow, 3));

  // arms, swinging opposite to the legs
  const arm = frame === 0 ? 0 : frame === 1 ? -1 : 1;
  if (seite) {
    p.rect(bx0 + 1, koerperY + 1 + arm, 2, 4, shade(kleid, 3));
    p.rect(bx0 + 1, koerperY + 5 + arm, 2, 1, shade(haut, 2));
  } else {
    p.rect(bx0 - 2, koerperY + 1 + arm, 2, 4, shade(kleid, 3));
    p.rect(bx0 + bw, koerperY + 1 - arm, 2, 4, shade(kleid, 1));
    p.rect(bx0 - 2, koerperY + 5 + arm, 2, 1, shade(haut, 2));
    p.rect(bx0 + bw, koerperY + 5 - arm, 2, 1, shade(haut, 2));
  }
  void bh;

  // -------------------------------------------------------------- head
  const kopfY = 2 + bob;
  const kw = seite ? 4 : 5;
  p.ellipse(cx, kopfY + 5, kw, 5, shade(haut, 2));
  p.ellipse(cx - 2, kopfY + 4, kw - 2, 3, shade(haut, 3));
  if (seite) {
    // a nose, which is the whole reason a profile reads as a profile
    p.set(cx - kw - 1, kopfY + 5, shade(haut, 2));
    p.set(cx - kw - 1, kopfY + 6, shade(haut, 1));
  }

  // ------------------------------------------------------------- hair
  // Drawn BEFORE the eyes and stopping three pixels above them, so
  // there is a forehead. That gap is the difference between a face and
  // a bar of shadow.
  if (hinten) {
    p.ellipse(cx, kopfY + 5, kw, 5, shade(haar, 2));
    p.ellipse(cx - 2, kopfY + 4, kw - 2, 3, shade(haar, 3));
  } else {
    p.ellipse(cx, kopfY + 3, kw, 3, shade(haar, 2));
    p.ellipse(cx - 2, kopfY + 2, kw - 2, 2, shade(haar, 3));
    p.rect(cx - kw, kopfY + 2, kw * 2 + 1, 2, shade(haar, 2));
    p.rect(cx - kw, kopfY + 2, kw, 1, shade(haar, 3));
  }

  // sides and styles
  const seitenHaar = (yTop: number, tief: number): void => {
    p.rect(cx - kw - 1, yTop, 2, tief, shade(haar, 2));
    if (!seite) p.rect(cx + kw, yTop, 2, tief, shade(haar, 1));
  };
  switch (a.frisur % 3) {
    case 0:
      seitenHaar(kopfY + 3, 4);
      break;
    case 1:
      // long, past the shoulders
      seitenHaar(kopfY + 3, 11);
      p.rect(cx - kw - 1, kopfY + 3, 1, 8, shade(haar, 3));
      break;
    default:
      // two bunches
      seitenHaar(kopfY + 3, 4);
      p.ellipse(cx - kw - 2, kopfY + 8, 2, 2, shade(haar, 2));
      if (!seite) p.ellipse(cx + kw + 1, kopfY + 8, 2, 2, shade(haar, 1));
      break;
  }

  // -------------------------------------------------------------- face
  if (!hinten) {
    const ey = kopfY + 6;
    if (seite) {
      // One eye, and it is forward of centre.
      p.rect(cx - 3, ey, 2, 2, INK);
      p.set(cx - 3, ey, shade(P.plaster, 4));
    } else {
      for (const ex of [cx - 3, cx + 2]) {
        p.rect(ex, ey, 2, 2, INK);
        p.set(ex, ey, shade(P.plaster, 4));
      }
      // a cheek, so the face is not only eyes
      p.set(cx - 4, ey + 2, shade(P.blossom, 3));
      p.set(cx + 3, ey + 2, shade(P.blossom, 3));
    }
  }

  // ----------------------------------------------------------- lantern
  // The one thing in the silhouette that no bush, rock or shrub has —
  // and it is the story: this is a child who carries the light back
  // into a world that has gone dim.
  if (!hinten) {
    // Held out in FRONT at chest height in profile, not down at the hip.
    //
    // At the hip it hangs over the back leg, and since the back leg is
    // the whole walk cycle in a side view, the character stopped walking
    // and started carrying a briefcase. Nobody could have seen that from
    // a contact sheet of a standing sprite; it took watching him walk
    // east for four seconds in the finished world.
    const lx = seite ? cx - 8 : bx0 - 4;
    const ly = koerperY + (seite ? 1 : 4 + arm);
    if (seite) p.rect(lx + 3, ly + 2, bx0 - lx - 2, 2, shade(haut, 2));
    p.set(lx + 1, ly - 1, shade(P.timber, 1));
    p.rect(lx, ly, 3, 4, shade(P.glow, 3));
    p.rect(lx, ly + 1, 3, 2, shade(P.glow, 4));
    p.rect(lx, ly + 4, 3, 1, shade(P.slate, 1));
    p.rect(lx, ly - 1, 3, 1, shade(P.slate, 3));
  }

  // ------------------------------------------------------------- the hat
  //
  // Bought at the cart, and this is the half of that purchase that was
  // MISSING: the shop shipped saying "the hat is on your head" and it
  // was on nothing at all. An upgrade a child cannot see is a number,
  // and this one was not even that.
  if (hut) {
    const kw2 = seite ? 4 : 5;
    const hy = kopfY + 1;
    p.ellipse(cx - (seite ? 1 : 0), hy + 3, kw2 + 3, 2, shade(P.leaf, 1));
    p.ellipse(cx - 2, hy + 2, kw2 + 1, 1, shade(P.leaf, 2));
    p.rect(cx - kw2 + 1, hy - 2, kw2 * 2 - 2, 5, shade(P.leaf, 2));
    p.rect(cx - kw2 + 1, hy - 2, kw2 - 1, 5, shade(P.leaf, 3));
    p.rect(cx - kw2 + 1, hy + 1, kw2 * 2 - 2, 1, shade(P.timber, 1));
    // the feather, which is the whole silhouette cue at this size
    for (let i = 0; i < 4; i++) {
      p.set(cx + kw2 - 2 + Math.round(i * 0.5), hy - 2 - i, shade(P.glow, 3));
    }
  }

  finish(p);

  if (spiegel) {
    const q = new Px(W, H);
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const i = (y * W + (W - 1 - x)) * 4;
        const j = (y * W + x) * 4;
        q.data[j] = p.data[i];
        q.data[j + 1] = p.data[i + 1];
        q.data[j + 2] = p.data[i + 2];
        q.data[j + 3] = p.data[i + 3];
      }
    }
    return q;
  }
  return p;
}

/** A soft shadow on the ground, drawn under the character by the map. */
export function heldSchatten(): Px {
  const p = new Px(W, 6);
  for (let y = 0; y < 6; y++) {
    for (let x = 0; x < W; x++) {
      const dx = (x - W / 2) / 6, dy = (y - 3) / 2.4;
      const d = dx * dx + dy * dy;
      if (d > 1) continue;
      p.blend(x, y, INK, 0.26 * (1 - d) + 0.05);
    }
  }
  return p;
}
