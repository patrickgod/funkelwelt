// The walkable world.
//
// PLAN.md calls this the biggest risk in the project and it is right:
// *if the walking is not fun on its own, it is a corridor between
// quizzes and worse than a menu.* So it is built before anything is
// built on top of it, and the test is the one PLAN.md wrote down — a
// grown-up walks around for two minutes with nothing else in the game
// and does not get bored.
//
// Three things are here because of that test rather than because a
// world needs them:
//
//   THE LANTERN. The region is drawn twice, one step down the ramp and
//   at full brightness, and the bright copy is shown only through a
//   dithered disc around the adventurer. That is the fiction of the
//   whole game — a child arrives with a lantern and learns the world
//   bright again — doing a job in the level design instead of in a
//   cutscene. It is also, plainly, the thing that makes walking into
//   the dark feel like something.
//
//   THE LAMPS. Each lamp post is a light source on the same mask, so
//   the path is literally lit and following it means following the
//   lights. Level design that tells you where to go without a word,
//   which is AGENTS.md rule 14 taken seriously.
//
//   THE LIGHTSPARKS. Ten of them, off the path, in corners. The
//   playtest that started this project found that COLLECTING worked and
//   building did not, and a spark you walk into is collecting at its
//   most immediate — it happens to you, it is visible, and it is a
//   reason to leave the path. They pay coins, never stars: stars are
//   the record of what has been LEARNED and walking does not earn them.
//
// How it is drawn, and why it is fast enough for an old iPad: the
// region is composited into two 768x576 buffers ONCE, so the ground is
// a single blit per frame rather than 1728. Only the things standing on
// it are drawn per frame, only the ones on screen, and in one pass that
// puts the adventurer in the middle of the sort — which is what lets
// him walk behind a tree.

import { atNight } from '../core/palette.js';
import { Px } from '../core/px.js';
import * as audio from '../core/audio.js';
import * as fx from '../core/fx.js';
import * as stand from '../core/spielstand.js';
import { held, heldSchatten, W as HELD_W, H as HELD_H,
  type Aussehen, type Richtung } from '../spiel/held.js';
import { Steuerung, TOT, WEIT } from '../spiel/steuerung.js';
import * as k from './kacheln.js';
import * as karte from './karte.js';

/**
 * How far the lantern and a lamp post reach, in world pixels — an inner
 * radius at full brightness and an outer one at half.
 *
 * TWO rings rather than one, and the first version had one. A single
 * step down the ramp measured 84,133,68 lit against 63,108,58 unlit,
 * which is a real difference and still did not READ as a lantern: with
 * the whole screen either in or out of one disc there is nothing to
 * compare, and the eye needs the falloff more than it needs the depth.
 * Two steps of dark with a ring between them is what makes it a light.
 */
const LICHT_HELD = 50;
const LICHT_HELD_WEIT = 84;
const LICHT_LAMPE = 28;
const LICHT_LAMPE_WEIT = 50;

/** World pixels per second. Brisk: a slow character reads as a stuck one. */
const TEMPO = 46;

/** How close is close enough to pick a spark up. */
const GREIF = 13;

function leinwand(w: number, h: number): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = Math.max(1, w);
  c.height = Math.max(1, h);
  return c;
}

function kontext(c: HTMLCanvasElement): CanvasRenderingContext2D {
  const x = c.getContext('2d', { willReadFrequently: true })!;
  x.imageSmoothingEnabled = false;
  return x;
}

/**
 * The shape a light makes.
 *
 * Ordered dithering rather than a gradient, and it is not a stylistic
 * preference: a gradient introduces colours that are not in the palette,
 * which is the one rule the whole look rests on. A 4x4 Bayer threshold
 * gives a soft edge out of nothing but "this pixel is lit or it is not",
 * and at four device pixels per world pixel it reads as a glow.
 */
const BAYER = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
];

function scheibe(r: number): HTMLCanvasElement {
  const p = new Px(r * 2 + 1, r * 2 + 1);
  for (let y = 0; y <= r * 2; y++) {
    for (let x = 0; x <= r * 2; x++) {
      const d = Math.hypot(x - r, y - r) / r;
      // A narrow dithered band at the rim only. The soft falloff is the
      // job of the two rings; if the mask itself faded far in as well,
      // the two would fight and the whole thing would go to mush.
      const a = Math.max(0, Math.min(1, (1 - d) / 0.2));
      if (a * 16 > BAYER[y & 3][x & 3]) p.set(x, y, '#ffffff');
    }
  }
  return p.toCanvas();
}

export class Welt {
  /** The adventurer's feet, in world pixels. */
  private hx = 0;
  private hy = 0;
  private blick: Richtung = 'unten';
  private schrittZeit = 0;
  private zeit = 0;
  private gespielt = 0;

  private camX = 0;
  private camY = 0;
  private skala = 4;
  private bw = 0;
  private bh = 0;

  private readonly aussehen: Aussehen;

  /** The region: [brightness 0..2][frame of ripple 0..1]. */
  private stufen: HTMLCanvasElement[][] = [[], [], []];
  private readonly dingBild = new Map<string, HTMLCanvasElement>();
  private readonly heldBild = new Map<string, HTMLCanvasElement>();
  private schattenBild: HTMLCanvasElement | null = null;
  private funkeBild: HTMLCanvasElement[] = [];
  private readonly scheibeHeld: HTMLCanvasElement[];
  private readonly scheibeLampe: HTMLCanvasElement[];
  private lichtC = leinwand(1, 1);
  private maskeC = leinwand(1, 1);
  private lichtCtx = kontext(this.lichtC);
  private maskeCtx = kontext(this.maskeC);
  private ringBild: HTMLCanvasElement | null = null;
  private knaufBild: HTMLCanvasElement | null = null;

  private readonly lampen: { x: number; y: number }[] = [];
  private readonly weg = new Set<string>();

  /** Tap-to-walk. */
  private route: { x: number; y: number }[] | null = null;
  private routeI = 0;
  private festGefahren = 0;

  /** So the door reacts once per visit rather than sixty times a second. */
  private inTuer = false;
  /** Seconds since the last puff of dust off the adventurer's feet. */
  private seitStaub = 0;

  /**
   * What happens when the adventurer steps into the doorway.
   *
   * Set by main.ts, because the world knows where the door is and has
   * no business knowing what is behind it. Left unset the door still
   * answers — a chime and a burst of sparks — because a child who walks
   * into a door and gets nothing at all decides the door is scenery.
   */
  anTuer: (() => void) | null = null;

  /** Where the purse is on screen, so a coin knows where to fly. */
  anBeutel: (() => { x: number; y: number } | null) | null = null;
  /** Nudge the purse when one lands. */
  beutelStups: (() => void) | null = null;

  constructor(aussehen: Aussehen) {
    this.aussehen = aussehen;
    this.scheibeHeld = [scheibe(LICHT_HELD), scheibe(LICHT_HELD_WEIT)];
    this.scheibeLampe = [scheibe(LICHT_LAMPE), scheibe(LICHT_LAMPE_WEIT)];
    for (const d of karte.dinge) if (d.licht) this.lampen.push(d.licht);
    for (const id of stand.get().funken) this.weg.add(id);

    const ort = stand.get().ort;
    if (ort.x > 0 && ort.y > 0 && karte.frei(ort.x * k.KACHEL, ort.y * k.KACHEL)) {
      this.hx = ort.x * k.KACHEL;
      this.hy = ort.y * k.KACHEL;
    } else {
      this.hx = karte.START.x;
      this.hy = karte.START.y;
    }
    this.bauen();
  }

  // -------------------------------------------------------- prerendering

  /**
   * Composite the region, once.
   *
   * The dark copy is made by remapping the bright one in place rather
   * than by drawing every tile twice — same tiles, same seeds, and
   * guaranteed to be the same picture, which drawing it twice is not.
   */
  private bauen(): void {
    // Frame one of the ripple, whole.
    const eins = new Px(karte.BREITE, karte.HOEHE);
    for (let ty = 0; ty < karte.KH; ty++) {
      for (let tx = 0; tx < karte.KW; tx++) {
        eins.draw(this.kachel(tx, ty, 0), tx * k.KACHEL, ty * k.KACHEL);
      }
    }
    // Frame two is the same region with the water redrawn — a copy plus
    // two hundred tiles rather than seventeen hundred. Building both
    // from scratch measured 430 ms to open the world on a desktop, and
    // whatever that is on a five-year-old iPad it is the child staring
    // at a title screen that has stopped responding.
    const zwei = new Px(karte.BREITE, karte.HOEHE);
    zwei.data.set(eins.data);
    for (let ty = 0; ty < karte.KH; ty++) {
      for (let tx = 0; tx < karte.KW; tx++) {
        const b = karte.bodenAn(tx, ty);
        if (b !== karte.WASSER && b !== karte.BRUECKE) continue;
        zwei.draw(this.kachel(tx, ty, 1), tx * k.KACHEL, ty * k.KACHEL);
      }
    }
    for (const m of [eins, zwei]) {
      this.stufen[2].push(m.toCanvas());
      m.remap((c) => atNight(c, -1));
      this.stufen[1].push(m.toCanvas());
      m.remap((c) => atNight(c, -1));
      this.stufen[0].push(m.toCanvas());
    }
    for (let f = 0; f < 2; f++) this.funkeBild.push(k.funke(f).toCanvas());
    this.schattenBild = heldSchatten().toCanvas();
  }

  private kachel(tx: number, ty: number, frame: number): Px {
    const seed = (tx * 73856093) ^ (ty * 19349663);
    switch (karte.bodenAn(tx, ty)) {
      case karte.BLUMEN: return k.blumen(seed);
      case karte.HOCHGRAS: return k.hochgras(seed);
      case karte.WEG: return k.weg(seed, karte.maske(tx, ty, karte.PFAD));
      case karte.BRUECKE: return k.bruecke(seed, karte.maske(tx, ty, karte.NASS), frame);
      case karte.SAND: return k.sand(seed);
      case karte.WASSER: return k.wasser(seed, karte.maske(tx, ty, karte.NASS), frame);
      case karte.FELS: return k.fels(seed, karte.maske(tx, ty, '#'));
      default: return k.gras(seed);
    }
  }

  /**
   * One of the things standing in the world, at one of two brightnesses.
   *
   * Eight variants of each kind rather than one per position: a wood of
   * two hundred trees does not need two hundred different trees, it
   * needs enough that the eye stops finding the repeat, and the canopies
   * overlap so heavily that eight is already more than enough. The
   * difference is two hundred sprite builds at load or sixteen.
   */
  private bild(art: karte.Art, seed: number, stufe: number): HTMLCanvasElement {
    const v = art === 'haus' || art === 'schild' || art === 'laterne' ? 0 : seed & 7;
    const key = `${art}:${v}:${stufe}`;
    const hit = this.dingBild.get(key);
    if (hit) return hit;

    let p: Px;
    switch (art) {
      case 'baum': p = k.baum(v * 2654435761); break;
      case 'busch': p = k.busch(v * 2654435761); break;
      case 'stein': p = k.stein(v * 2654435761); break;
      case 'zaun': p = k.zaun(v); break;
      case 'schild': p = k.schild(); break;
      case 'laterne': p = k.laterne(); break;
      default: p = k.haus(); break;
    }
    // Build the lit one and step the SAME buffer down for the other two,
    // exactly as the region is built, so a tree and the grass it stands
    // in can never disagree about how dark it is out there.
    this.dingBild.set(`${art}:${v}:2`, p.toCanvas());
    p.remap((c) => atNight(c, -1));
    this.dingBild.set(`${art}:${v}:1`, p.toCanvas());
    p.remap((c) => atNight(c, -1));
    this.dingBild.set(`${art}:${v}:0`, p.toCanvas());
    return this.dingBild.get(key)!;
  }

  private heldC(dir: Richtung, frame: number): HTMLCanvasElement {
    const key = `${dir}${frame}`;
    let c = this.heldBild.get(key);
    if (!c) {
      c = held(dir, frame, this.aussehen).toCanvas();
      this.heldBild.set(key, c);
    }
    return c;
  }

  // ------------------------------------------------------------- layout

  groesse(bw: number, bh: number): void {
    this.bw = bw;
    this.bh = bh;
    // About thirteen tiles from top to bottom. Pixel art wants an
    // integer scale and nothing else will do: a fractional one staggers
    // every straight edge in the region, which is the same lesson the
    // home-screen icon paid for at a smaller size.
    this.skala = Math.max(3, Math.min(5, Math.round(bh / (13 * k.KACHEL))));
    fx.setScale(this.skala);
    const vw = Math.ceil(bw / this.skala);
    const vh = Math.ceil(bh / this.skala);
    this.lichtC = leinwand(vw, vh);
    this.maskeC = leinwand(vw, vh);
    this.lichtCtx = kontext(this.lichtC);
    this.maskeCtx = kontext(this.maskeC);
  }

  private sicht(): { vw: number; vh: number } {
    return {
      vw: Math.min(karte.BREITE, Math.ceil(this.bw / this.skala)),
      vh: Math.min(karte.HOEHE, Math.ceil(this.bh / this.skala)),
    };
  }

  // ---------------------------------------------------------- the walking

  schritt(dt: number, st: Steuerung): void {
    this.zeit += dt;
    this.gespielt += dt;
    if (this.gespielt >= 5) {
      stand.get().spielzeit += Math.floor(this.gespielt);
      this.gespielt -= Math.floor(this.gespielt);
      this.ortSichern();
    }

    // A tap in tap-to-walk mode asks for a route.
    const tipp = st.nimmTipp();
    if (tipp) {
      const wx = this.camX + tipp.x / this.skala;
      const wy = this.camY + tipp.y / this.skala;
      const r = karte.route(this.hx, this.hy, wx, wy);
      if (r) { this.route = r; this.routeI = 0; this.festGefahren = 0; audio.click(); }
      else { this.route = null; audio.chimeSoft(); }
    }

    let v = st.vektor();
    if (v.x || v.y) this.route = null;          // a thumb always wins
    else if (this.route) {
      const z = this.route[this.routeI];
      const dx = z.x - this.hx, dy = z.y - this.hy;
      const d = Math.hypot(dx, dy);
      if (d < 2.5) {
        this.routeI++;
        if (this.routeI >= this.route.length) this.route = null;
      } else {
        v = { x: dx / d, y: dy / d };
      }
    }

    if (v.x || v.y) {
      // Facing follows the dominant axis. Four directions, because the
      // adventurer is only drawn in four and a diagonal sprite at this
      // size would be a fifth that reads as none of them.
      this.blick = Math.abs(v.x) > Math.abs(v.y)
        ? (v.x > 0 ? 'rechts' : 'links')
        : (v.y > 0 ? 'unten' : 'oben');
      const vorX = this.hx, vorY = this.hy;
      this.bewege(v.x * TEMPO * dt, v.y * TEMPO * dt);
      this.schrittZeit += dt;
      // Dust off the feet, twice a second while walking.
      //
      // The cheapest juice in the whole game and the one that does the
      // most: without it the adventurer is a picture being moved across
      // a picture, and with it he is somebody walking on ground. It only
      // ever fires as a RESPONSE to the child moving him, which is the
      // line fx.ts draws — nothing in this game starts on its own.
      this.seitStaub += dt;
      if (this.seitStaub > 0.42) {
        this.seitStaub = 0;
        const [sx, sy] = this.aufSchirm(this.hx, this.hy - 1);
        fx.burst('staub', sx, sy,
          { n: 2, speed: 26, up: 0.15, gravity: 90, life: 0.34 });
      }
      // A route that is getting nowhere is a route the hero cannot walk.
      // Better to stop than to grind against a rock for a minute.
      if (this.route) {
        const kam = Math.hypot(this.hx - vorX, this.hy - vorY);
        this.festGefahren = kam < TEMPO * dt * 0.3 ? this.festGefahren + dt : 0;
        if (this.festGefahren > 0.4) this.route = null;
      }
    } else {
      this.schrittZeit = 0;
    }

    this.funkenPruefen();
    this.tuerPruefen();
  }

  /**
   * Move, one axis at a time, with a nudge.
   *
   * The axes are resolved separately so that walking into a wall at an
   * angle slides along it instead of stopping dead — without that, every
   * corner in the region is a trap. The nudge is the other half: if the
   * way ahead is blocked but it is clear four pixels to one side, the
   * adventurer steps one pixel that way. It is what makes a doorway
   * something a child can walk through rather than something they have
   * to aim at, and it is invisible when it is working.
   */
  private bewege(dx: number, dy: number): void {
    if (dx) {
      if (karte.frei(this.hx + dx, this.hy)) this.hx += dx;
      else {
        for (let n = 1; n <= 4; n++) {
          let raus = false;
          for (const s of [-1, 1]) {
            if (karte.frei(this.hx + dx, this.hy + s * n) && karte.frei(this.hx, this.hy + s)) {
              this.hy += s; raus = true; break;
            }
          }
          if (raus) break;
        }
      }
    }
    if (dy) {
      if (karte.frei(this.hx, this.hy + dy)) this.hy += dy;
      else {
        for (let n = 1; n <= 4; n++) {
          let raus = false;
          for (const s of [-1, 1]) {
            if (karte.frei(this.hx + s * n, this.hy + dy) && karte.frei(this.hx + s, this.hy)) {
              this.hx += s; raus = true; break;
            }
          }
          if (raus) break;
        }
      }
    }
  }

  /** Walk into a spark and it is yours. Nothing to press. */
  private funkenPruefen(): void {
    for (const f of karte.funken) {
      if (this.weg.has(f.id)) continue;
      if (Math.hypot(f.x - this.hx, f.y - (this.hy - 8)) > GREIF) continue;
      this.weg.add(f.id);
      stand.funkeGefunden(f.id);
      stand.muenzen(3);
      const [sx, sy] = this.aufSchirm(f.x, f.y);
      fx.burst('funke', sx, sy, { n: 14, speed: 150, up: 0.5, life: 0.7 });
      fx.burst('stern', sx, sy, { n: 4, speed: 90, up: 0.8, life: 0.9 });
      audio.sparkle(4);
      // And three coins fly to the purse, so the number going up is
      // something the child WATCHES arrive rather than something they
      // notice later. The playtest that started this project found that
      // collecting worked; this is the part of collecting that worked.
      if (this.anBeutel) {
        const ziel = this.anBeutel();
        if (ziel) {
          for (let i = 0; i < 3; i++) {
            fx.fly('funke', { x: sx, y: sy }, ziel, 0.12 + i * 0.09, () => {
              audio.ping(i);
              if (this.beutelStups) this.beutelStups();
            });
          }
        }
      }
    }
  }

  /**
   * The door.
   *
   * It does not open yet — the house is PLAN.md item 2 and inventing a
   * room to put behind it would be worse than leaving it shut. What it
   * must not do is nothing at all: a child who walks into a door and
   * gets no answer decides the door is scenery. So it answers warmly,
   * once per visit, and the honest work happens next.
   */
  private tuerPruefen(): void {
    const drin = karte.inTuer(this.hx, this.hy);
    if (drin === this.inTuer) return;
    this.inTuer = drin;
    if (!drin) return;
    const [sx, sy] = this.aufSchirm(this.hx, this.hy - 10);
    fx.burst('funke', sx, sy, { n: 16, speed: 130, up: 0.9, life: 0.8 });
    fx.burst('staub', sx, sy + 8, { n: 8, speed: 70, up: 0.1, gravity: 200, life: 0.5 });
    // Three pixels. A door being stepped through is the one moment in
    // the world with any weight to it, and fx.ts is explicit that a
    // shake is for the good things only, where it reads as weight
    // rather than as alarm.
    fx.shake(3, 0.26);
    audio.land();
    audio.sparkle(3);
    // The sparks first, then the house. Going straight in swallows the
    // reaction to the tap, and the half second is what makes stepping
    // through a door feel like stepping through a door.
    if (this.anTuer) setTimeout(this.anTuer, 480);
  }

  private aufSchirm(x: number, y: number): [number, number] {
    return [(x - this.camX) * this.skala, (y - this.camY) * this.skala];
  }

  ortSichern(): void {
    const s = stand.get();
    s.ort = { x: this.hx / k.KACHEL, y: this.hy / k.KACHEL };
    stand.sichern();
  }

  // ------------------------------------------------------------ drawing

  zeichnen(ctx: CanvasRenderingContext2D, st: Steuerung): void {
    const S = this.skala;
    const { vw, vh } = this.sicht();

    // The camera follows, snapped to whole world pixels. A fractional
    // camera offset on pixel art is the same bug as a fractional scale:
    // every straight edge in the region shimmers as you walk.
    this.camX = Math.round(Math.max(0, Math.min(karte.BREITE - vw, this.hx - vw / 2)));
    this.camY = Math.round(Math.max(0, Math.min(karte.HOEHE - vh, this.hy - vh / 2 - 6)));
    // If the region is smaller than the screen, centre it rather than
    // letting the edge slide about.
    const randX = Math.max(0, Math.floor((this.bw - vw * S) / 2));
    const randY = Math.max(0, Math.floor((this.bh - vh * S) / 2));

    const wf = Math.floor(this.zeit * 2.2) % 2;
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = '#1a1622';
    ctx.fillRect(0, 0, this.bw, this.bh);

    // The region three times over: dark everywhere, then a ring of half
    // light, then full light in the middle of it. Each ring is the same
    // finished picture shown through a dithered mask, so there is never
    // a colour on screen that is not in the palette — which is what a
    // gradient overlay would have cost, and it is the one rule the whole
    // look rests on.
    ctx.drawImage(this.stufen[0][wf], this.camX, this.camY, vw, vh,
      randX, randY, vw * S, vh * S);
    for (const ring of [1, 0] as const) {
      this.maskeMalen(vw, vh, ring);
      const lc = this.lichtCtx;
      lc.globalCompositeOperation = 'source-over';
      lc.clearRect(0, 0, vw, vh);
      lc.drawImage(this.stufen[ring === 1 ? 1 : 2][wf], this.camX, this.camY, vw, vh, 0, 0, vw, vh);
      lc.globalCompositeOperation = 'destination-in';
      lc.drawImage(this.maskeC, 0, 0);
      lc.globalCompositeOperation = 'source-over';
      ctx.drawImage(this.lichtC, 0, 0, vw, vh, randX, randY, vw * S, vh * S);
    }

    const hin = (x: number, y: number): [number, number] =>
      [randX + Math.round(x - this.camX) * S, randY + Math.round(y - this.camY) * S];

    // 4. the sparks, on the ground, under everything standing on it
    const ff = Math.floor(this.zeit * 5) % 2;
    for (const f of karte.funken) {
      if (this.weg.has(f.id)) continue;
      if (f.x < this.camX - 16 || f.x > this.camX + vw + 16) continue;
      if (f.y < this.camY - 16 || f.y > this.camY + vh + 16) continue;
      const bob = Math.round(Math.sin(this.zeit * 2.4 + f.x) * 1.5);
      const b = this.funkeBild[ff];
      const [sx, sy] = hin(f.x - 5, f.y - 5 + bob);
      ctx.drawImage(b, sx, sy, b.width * S, b.height * S);
    }

    // 5. everything standing on it, back to front, with the adventurer
    //    in the middle of the sort — which is the whole reason he can
    //    walk behind a tree and in front of the next one.
    let i = 0;
    for (; i < karte.dinge.length; i++) {
      if (karte.dinge[i].fuss > this.hy) break;
      this.dingZeichnen(ctx, karte.dinge[i], vw, vh, hin, S);
    }
    this.heldZeichnen(ctx, hin, S);
    for (; i < karte.dinge.length; i++) {
      this.dingZeichnen(ctx, karte.dinge[i], vw, vh, hin, S);
    }

    // 6. the thumbstick, if there is one under a thumb
    this.stickZeichnen(ctx, st);
  }

  /** Paint every light in view into the mask, at one of the two radii. */
  private maskeMalen(vw: number, vh: number, ring: 0 | 1): void {
    const mc = this.maskeCtx;
    mc.clearRect(0, 0, vw, vh);
    // The lantern breathes. Two slow sines that do not share a period,
    // so it never settles into a pulse a child could count — a light
    // that throbs regularly is a warning light, and this one is a
    // flame. One world pixel of wander is enough to see and not enough
    // to notice.
    const flackern = Math.sin(this.zeit * 2.3) * 0.6 + Math.sin(this.zeit * 5.1) * 0.4;
    const rh = (ring === 0 ? LICHT_HELD : LICHT_HELD_WEIT);
    mc.drawImage(this.scheibeHeld[ring],
      Math.round(this.hx - this.camX - rh + flackern),
      Math.round(this.hy - 8 - this.camY - rh + flackern * 0.7));
    const rl = ring === 0 ? LICHT_LAMPE : LICHT_LAMPE_WEIT;
    for (const l of this.lampen) {
      if (l.x < this.camX - rl || l.x > this.camX + vw + rl) continue;
      if (l.y < this.camY - rl || l.y > this.camY + vh + rl) continue;
      mc.drawImage(this.scheibeLampe[ring],
        Math.round(l.x - this.camX - rl), Math.round(l.y - this.camY - rl));
    }
  }

  /** How lit a spot is: 2 in the lantern, 1 in its halo, 0 out in the dim. */
  private beleuchtet(x: number, y: number): number {
    let d = Math.hypot(x - this.hx, y - (this.hy - 8));
    if (d < LICHT_HELD * 0.9) return 2;
    let stufe = d < LICHT_HELD_WEIT * 0.9 ? 1 : 0;
    for (const l of this.lampen) {
      d = Math.hypot(x - l.x, y - l.y);
      if (d < LICHT_LAMPE * 0.9) return 2;
      if (d < LICHT_LAMPE_WEIT * 0.9) stufe = Math.max(stufe, 1);
    }
    return stufe;
  }

  private dingZeichnen(
    ctx: CanvasRenderingContext2D, d: karte.Ding, vw: number, vh: number,
    hin: (x: number, y: number) => [number, number], S: number,
  ): void {
    const probe = this.bild(d.art, d.seed, 2);
    if (d.x + probe.width < this.camX || d.x > this.camX + vw) return;
    if (d.y + probe.height < this.camY || d.y > this.camY + vh) return;
    // A lamp post is never in its own shadow.
    const stufe = d.licht ? 2 : this.beleuchtet(d.x + probe.width / 2, d.fuss - 4);
    const b = this.bild(d.art, d.seed, stufe);
    const [sx, sy] = hin(d.x, d.y);
    ctx.drawImage(b, sx, sy, b.width * S, b.height * S);
  }

  private heldZeichnen(
    ctx: CanvasRenderingContext2D, hin: (x: number, y: number) => [number, number], S: number,
  ): void {
    const frame = this.schrittZeit > 0 ? [0, 1, 0, 2][Math.floor(this.schrittZeit * 7) % 4] : 0;
    const b = this.heldC(this.blick, frame);
    const x = this.hx - HELD_W / 2;
    const y = this.hy - HELD_H;
    if (this.schattenBild) {
      const [sx, sy] = hin(x, this.hy - 4);
      ctx.drawImage(this.schattenBild, sx, sy,
        this.schattenBild.width * S, this.schattenBild.height * S);
    }
    const [px, py] = hin(x, y);
    ctx.drawImage(b, px, py, b.width * S, b.height * S);
  }

  /**
   * The thumbstick.
   *
   * Drawn as pixels at the world's own scale rather than as two smooth
   * CSS circles, because a smooth circle on top of a pixel scene is the
   * one thing on screen that did not come from the palette and the eye
   * goes straight to it. Half-transparent, so it never hides the thing
   * it is being used to walk towards.
   */
  private stickZeichnen(ctx: CanvasRenderingContext2D, st: Steuerung): void {
    if (!st.stick.aktiv || st.modus !== 'stick') return;
    if (!this.ringBild) this.ringBild = ring(WEIT / 2);
    if (!this.knaufBild) this.knaufBild = knauf(TOT + 4);
    // Drawn at exactly 2x, like everything else here. A ring at 1.94x
    // would have some edges two device pixels thick and some three,
    // which is the fractional-scale bug the icons already paid for.
    for (const [b, cx, cy] of [
      [this.ringBild, st.stick.ox, st.stick.oy],
      [this.knaufBild, st.stick.x, st.stick.y],
    ] as [HTMLCanvasElement, number, number][]) {
      ctx.drawImage(b, Math.round(cx - b.width), Math.round(cy - b.height),
        b.width * 2, b.height * 2);
    }
  }
}

// ------------------------------------------------------------ the stick

function ring(r: number): HTMLCanvasElement {
  const n = Math.ceil(r) * 2 + 1;
  const p = new Px(n, n);
  const c = Math.floor(n / 2);
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      const d = Math.hypot(x - c, y - c);
      if (d > r) continue;
      // A three-pixel rim at three quarters. The first version was two
      // pixels at 0.55 and was very nearly invisible on grass, which
      // for the one control the child is holding is not a small thing.
      if (d > r - 3) p.blend(x, y, '#f8f0dc', 0.78);
      else if (((x + y) & 1) === 0) p.blend(x, y, '#241d2b', 0.20);
    }
  }
  return p.toCanvas();
}

function knauf(r: number): HTMLCanvasElement {
  const n = Math.ceil(r) * 2 + 1;
  const p = new Px(n, n);
  const c = Math.floor(n / 2);
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      const d = Math.hypot(x - c, y - c);
      if (d > r) continue;
      p.blend(x, y, d > r - 2 ? '#241d2b' : '#e8b447', d > r - 2 ? 0.7 : 0.72);
    }
  }
  return p.toCanvas();
}
