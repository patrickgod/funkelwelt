// Things that drive and things that fly, seen from the side.
//
// Patrick: "Sprites seitlich von Vehikeln und Flugobjekten, also Auto,
// Bus, Fahrrad, Heli, Flugzeug und die Kinder müssen antippen was nach
// rechts fährt und was nach links."
//
// WHY THIS IS MATHS
//
// Links und rechts is Raumorientierung, and in a German first-grade
// syllabus it sits in the same strand as the numbers rather than
// beside them. It is also the only exercise in this game that needs no
// counting at all, which means a child who is slow with sums can be
// quick at it — and that is the same argument that put the stars per
// subject in the first place.
//
// HOW A DIRECTION IS DRAWN
//
// Every one of these is drawn facing RIGHT and mirrored for left, so a
// vehicle cannot accidentally read differently in its two directions —
// which it would if each were drawn by hand.
//
// Each carries the direction TWICE, because one cue is not enough at
// this size:
//
//   the SHAPE points  — a nose, a slanted screen, a handlebar
//   the SPEED LINES trail behind it
//
// The lines are the reliable one. A six-year-old who cannot yet tell a
// bus's front from its back can still see which way the wind is coming
// off it, and that is a cue every comic they have ever seen uses.

import { P, INK, shade } from '../core/palette.js';
import { Px } from '../core/px.js';

export type Fahrzeug = 'auto' | 'bus' | 'fahrrad' | 'heli' | 'flugzeug';
export type Richtung = 'links' | 'rechts';

export const FAHRZEUGE: Fahrzeug[] = ['auto', 'bus', 'fahrrad', 'heli', 'flugzeug'];

/** One canvas for all five, so the answer cards line up. */
export const FW = 38, FH = 26;

/**
 * A colour each, held for ever.
 *
 * The same reasoning as the shapes had: a child still learning the word
 * "Hubschrauber" can hold on to "the blue one" while they learn it, and
 * the two facts converge. None of them is `glow`, because that is the
 * colour of a star and a gold vehicle among the answer cards of a game
 * that pays gold stars is a card that says "pick me".
 */
const FARBE: Record<Fahrzeug, readonly string[]> = {
  auto: P.fruit,
  bus: P.citrus,
  fahrrad: P.leaf,
  heli: P.chalk,
  flugzeug: P.wool,
};

/** Mirror a buffer left-to-right, pixel for pixel. */
function spiegel(src: Px): Px {
  const p = new Px(src.w, src.h);
  for (let y = 0; y < src.h; y++) {
    for (let x = 0; x < src.w; x++) {
      const a = (y * src.w + x) * 4;
      const b = (y * src.w + (src.w - 1 - x)) * 4;
      p.data[b] = src.data[a];
      p.data[b + 1] = src.data[a + 1];
      p.data[b + 2] = src.data[a + 2];
      p.data[b + 3] = src.data[a + 3];
    }
  }
  return p;
}

/**
 * Speed lines, trailing behind a thing that is going right.
 *
 * Behind and never in front. This is the cue that carries the exercise
 * for a child who cannot read a vehicle's shape yet, so it has to be
 * unambiguous: three lines of different lengths, well clear of the
 * body, in a colour that is not the vehicle's own.
 */
function striche(p: Px, ys: number[], x = 0): void {
  const luft = shade(P.wool, 3);
  ys.forEach((y, i) => {
    const lang = 4 + (i % 2) * 3;
    p.rect(x, y, lang, 1, luft);
  });
}

function rad(p: Px, cx: number, cy: number, r: number): void {
  p.ellipse(cx, cy, r, r, INK);
  p.ellipse(cx, cy, r - 2, r - 2, shade(P.stone, 3));
}

/**
 * A bicycle wheel: a ring, not a disc.
 *
 * The first version used `rad` for these and the contact sheet showed
 * two grey blobs with green shrubbery on top. A car wheel is a solid
 * thing and a bicycle wheel is mostly air, and at this size that is the
 * entire difference between a bicycle and two stones.
 */
function reifen(p: Px, cx: number, cy: number, r: number): void {
  p.ellipse(cx, cy, r, r, INK);
  for (let y = -r; y <= r; y++) {
    for (let x = -r; x <= r; x++) {
      if (x * x + y * y <= (r - 2) * (r - 2)) p.clear(cx + x, cy + y);
    }
  }
  p.rect(cx - 1, cy - 1, 2, 2, INK);
}

/** One vehicle, facing right. Mirror it for left. */
function nachRechts(f: Fahrzeug): Px {
  const p = new Px(FW, FH);
  const ramp = FARBE[f];
  const hell = shade(ramp, 3);
  const mitte = shade(ramp, 2);
  const tief = shade(ramp, 1);
  const glas = shade(P.sky, 3);

  switch (f) {
    case 'auto': {
      // Bonnet low at the front, cabin behind it, and a windscreen that
      // leans back over the driver — the one line that says which end
      // is the front on every car ever drawn.
      p.rect(9, 14, 25, 6, mitte);
      p.rect(9, 14, 25, 2, hell);
      p.rect(9, 19, 25, 1, tief);
      p.rect(14, 9, 12, 5, mitte);
      p.rect(14, 9, 12, 2, hell);
      for (let i = 0; i < 5; i++) p.rect(26 + i, 10 + i, 1, 4 - i, mitte);
      p.rect(16, 11, 5, 3, glas);
      p.rect(22, 11, 4, 3, glas);
      p.rect(33, 15, 2, 2, shade(P.glow, 3));   // headlight, at the front
      rad(p, 15, 20, 4);
      rad(p, 29, 20, 4);
      striche(p, [12, 16, 19], 1);
      break;
    }
    case 'bus': {
      // Long, tall, and full of windows. Its front is the rounded end
      // with the big screen; the back is square.
      p.rect(6, 7, 29, 13, mitte);
      p.rect(6, 7, 29, 2, hell);
      p.rect(6, 19, 29, 1, tief);
      p.rect(34, 8, 1, 11, hell);
      for (let i = 0; i < 4; i++) p.rect(8 + i * 5, 10, 4, 4, glas);
      p.rect(29, 10, 5, 6, glas);               // the driver's screen
      p.rect(34, 16, 1, 2, shade(P.glow, 3));
      rad(p, 12, 20, 4);
      rad(p, 29, 20, 4);
      striche(p, [9, 13, 17], 0);
      break;
    }
    case 'fahrrad': {
      // Two hollow wheels, a frame between them, the handlebar up at
      // the front and the saddle up at the back. No rider: a rider is a
      // second thing to read on a sprite this size, and the door
      // plaques already taught that lesson the hard way.
      reifen(p, 11, 18, 7);
      reifen(p, 29, 18, 7);
      // Frame in two pixels rather than one. A single-pixel line
      // between two rings vanishes at the size this is tapped.
      for (const [x0, y0, x1, y1] of [
        [11, 18, 20, 10], [20, 10, 29, 18], [20, 10, 15, 18], [15, 18, 11, 18],
      ] as const) {
        p.line(x0, y0, x1, y1, mitte);
        p.line(x0, y0 + 1, x1, y1 + 1, tief);
      }
      p.line(29, 18, 30, 8, mitte);             // the fork, up to the bars
      p.line(30, 8, 31, 8, mitte);
      p.rect(28, 7, 6, 2, tief);                // handlebar, in FRONT
      p.rect(17, 7, 6, 2, tief);                // saddle, BEHIND
      p.line(20, 10, 20, 8, mitte);
      striche(p, [9, 13, 17], 0);
      break;
    }
    case 'heli': {
      // Rotor ONE pixel thick and on a mast, a fat nose at the front, a
      // thin boom to a tail rotor at the back, and skids underneath.
      //
      // The first version had a two-pixel rotor running most of the
      // width with a blue blob under it, and the contact sheet showed a
      // table. The rotor has to read as something spinning — thin, and
      // clearly separate from the body — or it reads as a roof.
      const stahl = shade(P.stone, 2);
      p.rect(6, 6, 26, 1, stahl);               // main rotor
      p.rect(5, 7, 3, 1, stahl);
      p.rect(30, 7, 3, 1, stahl);
      p.rect(19, 7, 2, 4, shade(P.stone, 1));   // mast
      p.ellipse(24, 15, 9, 5, mitte);           // cabin, fat at the front
      p.ellipse(24, 14, 9, 3, hell);
      p.ellipse(29, 14, 4, 3, glas);            // screen, at the front
      p.rect(7, 13, 12, 3, mitte);              // boom, thin, trailing
      p.rect(7, 13, 12, 1, hell);
      p.rect(5, 8, 2, 7, tief);                 // tail fin
      p.rect(4, 8, 5, 1, stahl);                // tail rotor
      p.rect(4, 13, 5, 1, stahl);
      p.rect(17, 20, 14, 1, stahl);             // skids, not wheels
      p.rect(20, 18, 1, 2, stahl);
      p.rect(28, 18, 1, 2, stahl);
      striche(p, [17, 19], 0);
      break;
    }
    case 'flugzeug': {
      // A slim fuselage that comes to a POINT at the front, a swept
      // wing hanging well below it, and a tall fin at the back.
      //
      // The first version was an ellipse fifteen pixels across with a
      // wing tucked against it, and the contact sheet showed a Zeppelin.
      // What separates the two is that an aeroplane is mostly angles:
      // the nose narrows, the fin rises, the wing sticks out.
      p.rect(8, 12, 22, 5, mitte);
      p.rect(8, 12, 22, 2, hell);
      p.rect(8, 16, 22, 1, tief);
      for (let i = 0; i < 6; i++) {             // the nose, narrowing
        p.rect(30 + i, 12 + Math.floor(i / 2), 1, 5 - i + Math.ceil(i / 2), mitte);
      }
      p.rect(26, 12, 4, 2, glas);               // cockpit, at the front
      for (let i = 0; i < 7; i++) {             // tailfin, rising at the back
        p.rect(7 + i, 5 + i, 2, 8 - i, tief);
      }
      p.rect(4, 12, 5, 2, tief);                // tailplane
      for (let i = 0; i < 8; i++) {             // wing, swept back, below
        p.rect(14 + i, 17 + Math.floor(i / 2), 3, 2, tief);
      }
      p.rect(15, 18, 8, 1, mitte);
      striche(p, [8, 14, 19], 0);
      break;
    }
  }

  p.outline(INK);
  return p;
}

const zwischen = new Map<string, Px>();

/** One vehicle, facing the way it is going. */
export function fahrzeug(f: Fahrzeug, nach: Richtung): Px {
  const key = `${f}:${nach}`;
  const hit = zwischen.get(key);
  if (hit) return hit;
  const p = nach === 'rechts' ? nachRechts(f) : spiegel(nachRechts(f));
  zwischen.set(key, p);
  return p;
}

/** A canvas of one, ready for an answer card. */
export function fahrzeugCanvas(f: Fahrzeug, nach: Richtung, scale: number): HTMLCanvasElement {
  const src = fahrzeug(f, nach).toCanvas();
  const c = document.createElement('canvas');
  c.width = src.width * scale;
  c.height = src.height * scale;
  const ctx = c.getContext('2d', { willReadFrequently: true })!;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(src, 0, 0, c.width, c.height);
  c.style.width = `${c.width}px`;
  c.style.height = `${c.height}px`;
  return c;
}

/**
 * The question: a big arrow, pointing the way that is being asked for.
 *
 * Drawn rather than written, and drawn rather than spoken. Rule 15 says
 * the sound is off-switchable in two taps, so the question has to exist
 * on the screen — and rule 14 says it cannot be the word "rechts",
 * because the child cannot read it. An arrow is neither, and it is the
 * same arrow the signpost in the meadow uses.
 */
export function pfeil(nach: Richtung, size = 34): Px {
  const p = new Px(size, size);
  const c = Math.floor(size / 2);
  const hell = shade(P.glow, 3);
  const kern = shade(P.glow, 2);
  p.rect(4, c - 2, size - 12, 5, kern);
  p.rect(4, c - 2, size - 12, 2, hell);
  for (let i = 0; i < 9; i++) {
    p.rect(size - 13 + i, c - 9 + i, 2, (9 - i) * 2, kern);
    p.rect(size - 13 + i, c - 9 + i, 2, 2, hell);
  }
  p.outline(INK);
  return nach === 'rechts' ? p : spiegel(p);
}

/** A canvas of the arrow, for the question stage. */
export function pfeilCanvas(nach: Richtung, scale: number): HTMLCanvasElement {
  const src = pfeil(nach).toCanvas();
  const c = document.createElement('canvas');
  c.width = src.width * scale;
  c.height = src.height * scale;
  const ctx = c.getContext('2d', { willReadFrequently: true })!;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(src, 0, 0, c.width, c.height);
  c.style.width = `${c.width}px`;
  c.style.height = `${c.height}px`;
  return c;
}
