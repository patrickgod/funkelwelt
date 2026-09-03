// The whole region, on one screen.
//
// Patrick: "since the world will be bigger in the future, maybe we need
// map overview in the pause menu? like in a real game? showing the
// complete map?"
//
// Yes — and it is already needed. The region is 48×36 tiles and about
// thirteen of them are on screen at a time, so a child holds nine
// tenths of this world in their head rather than in front of their
// eyes. That is fine for a meadow you cross in a minute and it stops
// being fine the moment there is a second world to get lost in.
//
// WHAT IT SHOWS, AND WHAT IT DOES NOT
//
// The LAND is all shown. The shape of the region is not a secret, it is
// the thing being learned, and a map that hides the stream teaches a
// child to distrust the map.
//
// The DOORS are shown as having been through or not. That is the one
// place a map can honestly say "you have not been here", and it is the
// only fog this needs: it turns the map into a list of things left to
// do without ever saying so in words.
//
// The lightsparks and the shadows are NOT on it. A map that marks every
// collectable turns exploring into shopping, and finding a spark
// tucked behind the woods is the reward for having walked there.
//
// NO LEGEND, no key, no labels. Rule 14: the child cannot read one. A
// house looks like the house, the gate looks like the gate, and the
// adventurer is the only thing on the map that pulses.

import { P, INK, shade } from '../core/palette.js';
import { Px } from '../core/px.js';
import * as karte from '../welt/karte.js';
import { KACHEL } from '../welt/kacheln.js';
import * as stand from '../core/spielstand.js';
import * as audio from '../core/audio.js';
import { t } from '../core/i18n.js';
import { el, knopf } from './dom.js';

/**
 * Four pixels a tile.
 *
 * One would be smaller and useless: a house is five tiles across, so at
 * one pixel per tile every marker on this map would be a single dot and
 * the four kinds of thing would be four identical dots. Four gives each
 * tile a shape, and 48×36 tiles becomes a 192×144 buffer that scales up
 * to fill a tablet with clean edges.
 */
const T = 4;

const BODEN: Record<number, readonly string[]> = {
  [karte.GRAS]: P.grass,
  [karte.BLUMEN]: P.grass,
  [karte.HOCHGRAS]: P.grass,
  [karte.WEG]: P.sand,
  [karte.BRUECKE]: P.timber,
  [karte.SAND]: P.sand,
  [karte.WASSER]: P.sea,
  [karte.FELS]: P.stone,
};

/** How light each ground is drawn, so the land reads as terrain. */
const STUFE: Record<number, number> = {
  [karte.GRAS]: 2,
  [karte.BLUMEN]: 3,
  [karte.HOCHGRAS]: 1,
  [karte.WEG]: 3,
  [karte.BRUECKE]: 3,
  [karte.SAND]: 2,
  [karte.WASSER]: 1,
  [karte.FELS]: 1,
};

/** A small mark, centred on a tile. */
function marke(p: Px, tx: number, ty: number, w: number, h: number, hex: string): void {
  p.rect(tx * T - Math.floor((w - T) / 2), ty * T - Math.floor((h - T) / 2), w, h, hex);
}

/** The region, drawn once. */
export function bild(): Px {
  const p = new Px(karte.KW * T, karte.KH * T);

  for (let y = 0; y < karte.KH; y++) {
    for (let x = 0; x < karte.KW; x++) {
      const b = karte.bodenAn(x, y);
      const ramp = BODEN[b] ?? P.grass;
      p.rect(x * T, y * T, T, T, shade(ramp, STUFE[b] ?? 2));
      // A speck of the lighter step in one corner, so a big field of
      // grass has some grain in it rather than being a flat slab.
      if (((x * 7 + y * 13) & 3) === 0) {
        p.set(x * T + 1, y * T + 1, shade(ramp, (STUFE[b] ?? 2) + 1));
      }
    }
  }

  // The woods, the rocks and the hedges.
  //
  // Added after looking at the first version, which drew only the
  // GROUND — grass, path, water, cliff — and left a child navigating a
  // green rectangle. The two woods are the biggest landmarks in this
  // region and they are objects rather than terrain, so a map without
  // them cannot answer "am I north or south of the trees", which is the
  // question a map is for.
  //
  // Trees dark, everything else a shade lighter, and none of them
  // outlined: this is texture that says "wooded here", not a survey of
  // every trunk.
  for (const d of karte.dinge) {
    if (d.art === 'haus') continue;
    const tx = Math.floor(d.mitte / KACHEL);
    const ty = Math.floor((d.fuss - 1) / KACHEL);
    if (d.art === 'baum') {
      marke(p, tx, ty, 4, 5, shade(P.pine, 1));
      marke(p, tx, ty, 2, 2, shade(P.pine, 2));
    } else if (d.art === 'busch') {
      marke(p, tx, ty, 3, 3, shade(P.leaf, 3));
    } else if (d.art === 'stein') {
      marke(p, tx, ty, 3, 3, shade(P.stone, 3));
    } else if (d.art === 'laterne') {
      marke(p, tx, ty, 2, 3, shade(P.glow, 3));
    }
  }

  // The doors, and whether they have been walked through.
  //
  // `geschafft` counts the clears per house, which until now nothing
  // read except one of Luma's tutorial lines. This is the first thing
  // in the game that uses it, and it is a good use: a lit door is one a
  // child has finished, an unlit one is somewhere to go.
  const g = stand.get().geschafft;
  const tueren: [{ tx: number; ty: number }, string][] = [
    [karte.TUER, 'verliebte-zahlen'],
    [karte.TUER_WORT, 'zahlenreihe'],
    [karte.TUER_RECHNEN, 'rechenmeister'],
    [karte.TUER_RICHTUNG, 'richtung'],
  ];
  for (const [tuer, id] of tueren) {
    if (tuer.tx < 0) continue;
    const fertig = (g[id] ?? 0) > 0;
    // A house: a block with a roof on it, drawn big enough to be a
    // building rather than a dot.
    marke(p, tuer.tx, tuer.ty - 1, 14, 12, shade(P.plaster, fertig ? 4 : 2));
    marke(p, tuer.tx, tuer.ty - 2, 16, 5, shade(P.terracotta, fertig ? 3 : 1));
    // And a lit doorway if it has been finished.
    marke(p, tuer.tx, tuer.ty, 4, 5, fertig ? shade(P.glow, 3) : shade(P.timber, 1));
  }

  for (const tor of karte.tore) {
    const auf = stand.stufe(tor.fach) >= tor.stufe;
    marke(p, tor.tx, tor.ty, 6, 8, auf ? shade(P.glow, 2) : shade(P.stone, 3));
    marke(p, tor.tx, tor.ty, 2, 8, auf ? shade(P.glow, 3) : shade(P.stone, 1));
  }

  if (karte.LADEN) {
    const tx = Math.floor(karte.LADEN.mitte / KACHEL);
    const ty = Math.floor(karte.LADEN.fuss / KACHEL) - 1;
    marke(p, tx, ty, 10, 7, shade(P.amber, 3));
    marke(p, tx, ty + 1, 10, 2, shade(P.timber, 1));
  }

  p.outline(INK);
  return p;
}

let wurzel: HTMLElement | null = null;
let raus: (() => void) | null = null;
let schlag = 0;

export function beenden(): void {
  if (schlag) { cancelAnimationFrame(schlag); schlag = 0; }
  wurzel = null;
  raus = null;
}

export function starten(ui: HTMLElement, zurueck: () => void): void {
  wurzel = ui;
  raus = zurueck;
  ui.replaceChildren();

  const s = el('div', 'bildschirm dunkel karte');
  s.appendChild(el('h2', 'titel', t('karte.titel')));

  const halter = el('div', 'kartenbild');
  const c = document.createElement('canvas');
  const grund = bild().toCanvas();
  c.width = grund.width;
  c.height = grund.height;
  halter.appendChild(c);
  s.appendChild(halter);

  s.appendChild(knopf(t('karte.fertig'), () => {
    const z = raus;
    beenden();
    if (z) z();
  }, 'gold'));
  ui.appendChild(s);

  // Where he is, pulsing, drawn every frame on top of the still map.
  //
  // The pulse is the whole reason this is a canvas that keeps drawing
  // rather than one picture: a dot that does not move is a dot a child
  // has to be TOLD is them. One that breathes is the only thing alive
  // on the page, and the eye goes to it before anything else.
  const ctx = c.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  const ort = stand.get().ort;
  const t0 = performance.now();

  const male = (): void => {
    if (!wurzel) return;
    ctx.clearRect(0, 0, c.width, c.height);
    ctx.drawImage(grund, 0, 0);
    const puls = 0.5 + 0.5 * Math.sin((performance.now() - t0) / 260);
    const r = 3 + puls * 3;
    ctx.fillStyle = '#ffe08a';
    ctx.globalAlpha = 0.35 + 0.35 * (1 - puls);
    ctx.beginPath();
    ctx.arc(ort.x * T, ort.y * T, r + 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.beginPath();
    ctx.arc(ort.x * T, ort.y * T, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#2a2030';
    ctx.lineWidth = 1;
    ctx.stroke();
    schlag = requestAnimationFrame(male);
  };
  male();
  audio.whoosh(0.22, 1400);
}
