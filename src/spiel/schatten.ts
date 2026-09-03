// A shadow.
//
// The thing this game has instead of a monster, and every decision in
// this file is downstream of one sentence in KONZEPT.md:
//
//   Not dangerous, not threatening: dim.
//
// So it is not a monster. It has no teeth, no claws, no spikes and no
// red. It is a soft dark shape with two worried eyes that got braver
// than it should have while the lights were out, and what happens to it
// is that it is CHASED AWAY — never killed, never hurt, never defeated.
//
// That matters more than it sounds. A six-year-old who is answering
// arithmetic to make something suffer has been taught something about
// arithmetic. A six-year-old who is answering arithmetic to turn the
// lights back on has been taught something else.
//
// It is drawn from `plum` — the one ramp in the palette that is dark
// without being ink, so the shape reads as absence of light rather than
// as a black sticker. The eyes come from `glow`, which is the family
// reserved for lit things: even the shadow has a little of the light in
// it, which is the whole reason it can be sent home rather than ended.

import { P, INK, shade, stepDown, mixSnap } from '../core/palette.js';
import { Px, rand } from '../core/px.js';

export const SW = 30;
export const SH = 30;

/**
 * One frame of a shadow.
 *
 * `frame` 0..3 is a slow drift, not a walk: it breathes and its fringe
 * moves, and it never travels. A shadow that came at the child would be
 * a shadow the child has to get away from, and this whole design is
 * built so that nothing ever has to be got away from.
 *
 * `wach` is how alert it is — 1 when the child arrives, and falling
 * towards 0 as they push it back. At 0 it is barely there. The eyes
 * narrow and the body shrinks; nothing about it is ever damaged.
 */
export function schatten(frame: number, seed = 1, wach = 1): Px {
  const p = new Px(SW, SH);
  const r = rand(seed ^ 0x5ad0);
  const cx = 15;
  const atmen = [0, 1, 2, 1][frame % 4];
  // It gets smaller as it is pushed back, never wounded.
  const gr = 0.55 + 0.45 * Math.max(0, Math.min(1, wach));
  const rx = Math.round(11 * gr);
  const ry = Math.round(9 * gr);
  const cy = 17 + Math.round((1 - gr) * 5) + atmen;

  // The body: three overlapping masses so the silhouette is soft and
  // uneven, the way a shadow on grass is.
  p.ellipse(cx, cy, rx, ry, shade(P.plum, 1));
  p.ellipse(cx - 2, cy - 2, rx - 2, ry - 2, shade(P.plum, 2));
  p.ellipse(cx - 3, cy - 4, Math.max(2, rx - 5), Math.max(2, ry - 4), shade(P.plum, 3));
  // The shaded underside, kept LOW and WIDE.
  //
  // It was a smaller ellipse higher up, and on a round purple shape with
  // two eyes above it that is not shading, it is an open mouth — which
  // turned the one thing in this game that must not be a monster into a
  // monster. Wide and near the bottom edge reads as the light not
  // reaching underneath.
  p.ellipse(cx + 1, cy + ry - 3, rx - 1, 3, shade(P.plum, 0));

  // A ragged fringe along the bottom, drifting with the frame. This is
  // the only thing that moves, and it is what makes it read as
  // something made of dark rather than as a stone.
  for (let i = -rx; i <= rx; i++) {
    const t = Math.abs(i) / Math.max(1, rx);
    const zack = Math.round((1 - t * t) * (2 + r() * 2))
      + (((i + frame) & 3) === 0 ? 1 : 0);
    for (let j = 0; j < zack; j++) p.set(cx + i, cy + ry - 1 + j, shade(P.plum, j > 1 ? 0 : 1));
  }

  // Two little horns of dark at the top, so the silhouette is not a
  // pebble. They droop as it is pushed back.
  const hoch = Math.round(5 * gr);
  for (const s of [-1, 1]) {
    for (let j = 0; j < hoch; j++) {
      const bx = cx + s * (rx - 4) + Math.round(s * j * 0.5);
      p.set(bx, cy - ry - j + 2, shade(P.plum, 2));
      if (j < hoch - 1) p.set(bx - s, cy - ry - j + 2, shade(P.plum, 1));
    }
  }

  // The eyes. Worried, never angry: round, wide apart, and set LOW in
  // the mass — high narrow eyes are a glare and this thing is not
  // glaring at anybody. They dim as it goes.
  const augY = cy - Math.round(ry * 0.35);
  const hell = wach > 0.5 ? 4 : wach > 0.15 ? 3 : 2;
  for (const s of [-1, 1]) {
    const ax = cx + s * Math.max(2, Math.round(rx * 0.42));
    p.rect(ax - 1, augY, 3, 3, shade(P.glow, hell));
    p.set(ax, augY + 1, INK);
    // a catchlight, upper left, like every other eye in this game
    p.set(ax - 1, augY, shade(P.plaster, 4));
  }

  p.rim(stepDown, INK);
  p.antialias(mixSnap);
  return p;
}

/** The soft patch of dark it sits in, drawn on the ground beneath it. */
export function schattenFleck(wach = 1): Px {
  const p = new Px(SW, 10);
  const gr = 0.55 + 0.45 * Math.max(0, Math.min(1, wach));
  for (let y = 0; y < 10; y++) {
    for (let x = 0; x < SW; x++) {
      const dx = (x - SW / 2) / (12 * gr), dy = (y - 5) / (4 * gr);
      const d = dx * dx + dy * dy;
      if (d > 1) continue;
      p.blend(x, y, INK, 0.34 * (1 - d) + 0.07);
    }
  }
  return p;
}
