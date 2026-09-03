// The generated sprites, loaded once and handed over as pixel buffers.
//
// These are PNGs on disk and pixel art in memory. `tools/pixelise.mjs`
// has already snapped every pixel in them to the closed palette, so
// once they are read back into a `Px` they are indistinguishable from
// something drawn in code — and in particular the SAME machinery can
// step them down a ramp for the lantern's three brightnesses. That is
// the whole reason this returns `Px` rather than an `HTMLImageElement`:
// a sprite that cannot be dimmed is a sprite that glows in the dark.
//
// Anything missing here falls back to the coded version in
// `kacheln.ts`, so the game is never broken by a file that did not
// generate, and the two can be compared side by side by deleting one.

import { Px } from '../core/px.js';

/** Which generated sprite stands in for which drawn one. */
const DATEIEN: Record<string, string> = {
  haus: 'haus',
  laterne: 'laterne',
  schild: 'schild',
  stein: 'stein',
  // Three trees rather than eight. The variants used to come out of a
  // seeded generator, so eight cost nothing; a generated one costs a
  // drawing, and three distinct silhouettes — broadleaf, conifer, fruit
  // — read as more variety than eight versions of the same shape did.
  'baum:0': 'baum1',
  'baum:1': 'baum2',
  'baum:2': 'baum3',
};

const geladen = new Map<string, Px>();
let fertig = false;

/** Read one PNG into a pixel buffer. */
function lies(pfad: string): Promise<Px | null> {
  return new Promise((auf) => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => {
      const c = document.createElement('canvas');
      c.width = img.naturalWidth;
      c.height = img.naturalHeight;
      const x = c.getContext('2d', { willReadFrequently: true })!;
      x.imageSmoothingEnabled = false;
      x.drawImage(img, 0, 0);
      const d = x.getImageData(0, 0, c.width, c.height);
      const p = new Px(c.width, c.height);
      p.data.set(d.data);
      auf(p);
    };
    // A missing sprite is not an error. It is the coded one being used.
    img.onerror = () => auf(null);
    img.src = pfad;
  });
}

/**
 * Load them all, once, before the world is built.
 *
 * Awaited rather than raced, because the world composites its sprites
 * synchronously at construction and a tree that arrives afterwards
 * would be a tree that is never drawn.
 */
export async function laden(): Promise<void> {
  if (fertig) return;
  fertig = true;
  await Promise.all(Object.entries(DATEIEN).map(async ([schluessel, datei]) => {
    const p = await lies(`assets/sprites/${datei}.png`);
    if (p) geladen.set(schluessel, p);
  }));
}

/** The generated sprite for a thing, or null if it is drawn in code. */
export function hol(art: string, variante = 0): Px | null {
  return geladen.get(`${art}:${variante}`) ?? geladen.get(art) ?? null;
}

/** How many variants of a kind there are, for choosing one by seed. */
export function varianten(art: string): number {
  let n = 0;
  while (geladen.has(`${art}:${n}`)) n++;
  return n;
}
