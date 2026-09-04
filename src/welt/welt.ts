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
import { kugel, KW as LUMA_W, KH as LUMA_H } from '../spiel/luma.js';
import { schatten as schattenPx, schattenFleck, artVon, ARTEN, SW, SH } from '../spiel/schatten.js';
import * as k from './kacheln.js';
import * as karte from './karte.js';
import * as sprites from './sprites.js';
import * as laden from '../ui/laden.js';

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
  /** Shadows still standing, and the images of them. */
  private readonly schattenBilder = new Map<string, HTMLCanvasElement[]>();
  private fleckBild: HTMLCanvasElement | null = null;
  private readonly wegSchatten = new Set<string>();
  /** So a shadow is met once, not sixty times a second. */
  private amSchatten: string | null = null;

  /** What happens when the adventurer walks into one. */
  anSchatten: ((id: string) => void) | null = null;

  /** Gates, and the pictures of them shut and open. */
  private readonly torBild = new Map<string, HTMLCanvasElement>();
  private amTor: string | null = null;
  /** Said when the child pushes at a gate they cannot open yet. */
  anTor: ((offen: boolean) => void) | null = null;

  /** The market cart. */
  private karrenBild: HTMLCanvasElement | null = null;
  private amKarren = false;
  private amStein = false;
  anKarren: (() => void) | null = null;
  /** Standing at the waypoint stone, having chosen it. */
  anStein: (() => void) | null = null;
  private readonly weg = new Set<string>();

  /** Tap-to-walk. */
  private route: { x: number; y: number }[] | null = null;
  private routeI = 0;
  private festGefahren = 0;

  /** So the door reacts once per visit rather than sixty times a second. */
  private inTuer: karte.Tuer | null = null;

  /**
   * Waking up: how far open the lantern is, 0 to 1.
   *
   * The world arrives dark and the light spreads out of the middle of
   * it. A child who has just pressed a button on a picture is not yet
   * in a place; this is the second and a half in which they become
   * somebody standing somewhere, and it costs one multiplier.
   */
  private oeffnung = 0;
  private oeffnungsDauer = 0.9;

  /**
   * A ring on the ground, for the one time the game asks for something.
   *
   * Used exactly once per adventurer, to teach the only control there
   * is. It is a PLACE rather than an instruction — a six-year-old who
   * cannot read a sentence can absolutely understand a glowing circle
   * that wants standing in.
   */
  private ziel: { x: number; y: number; dann: () => void } | null = null;
  private zielFunke = -1;
  /** Time since the held finger last asked for a route. */
  private haltenAlter = 0;
  /**
   * What the child has CHOSEN by tapping it, and has not reached yet.
   *
   * Nothing in this world acts on being touched any more. A door, the
   * cart and a shadow each act only if they are the thing that was
   * picked, which means walking past them is walking past them.
   */
  private auswahl: karte.Ziel | null = null;
  /** Seconds since the last puff of dust off the adventurer's feet. */
  private seitStaub = 0;

  /**
   * Luma, flying along beside him.
   *
   * Her own position rather than a fixed offset, chased towards a point
   * at his shoulder — because a companion pinned to the character moves
   * exactly as the character moves, which reads as a decal rather than
   * as somebody keeping up. The lag IS the character: she overshoots
   * when he stops and swings wide when he turns.
   */
  private lx = 0;
  private ly = 0;
  /** Where she has just been, for the little trail behind her. */
  private spur: [number, number][] = [];
  private readonly kugelBild: HTMLCanvasElement[] = [];

  /**
   * What happens when the adventurer steps into the doorway.
   *
   * Set by main.ts, because the world knows where the door is and has
   * no business knowing what is behind it. Left unset the door still
   * answers — a chime and a burst of sparks — because a child who walks
   * into a door and gets nothing at all decides the door is scenery.
   */
  anTuer: ((tuer: karte.Tuer) => void) | null = null;

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
    for (const id of stand.get().schatten) this.wegSchatten.add(id);
    // Which gates are open is decided here, once, from what the child
    // has actually learned. `karte.festAn` reads it every step.
    for (const tor of karte.tore) {
      if (stand.stufe(tor.fach) >= tor.stufe) karte.torOeffnen(tor.id);
    }
    // A shadow that has been chased away leaves a light where it stood,
    // for ever. That is KONZEPT.md's progress bar — the world visibly
    // gets brighter — and it is why this list is never cleared.
    for (const sch of karte.schatten) {
      if (this.wegSchatten.has(sch.id)) this.lampen.push({ x: sch.x, y: sch.y - 10 });
    }

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

  /**
   * Open the lantern from nothing.
   *
   * `lang` for a child who has never been here — long enough that the
   * dark registers as somewhere they are waking up in rather than as a
   * slow load.
   */
  wachAuf(lang: boolean): void {
    this.oeffnung = 0;
    this.oeffnungsDauer = lang ? 2.2 : 0.9;
  }

  /** Ask the child to walk to a spot, once. */
  zeigeZiel(x: number, y: number, dann: () => void): void {
    this.ziel = { x, y, dann };
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
    for (let f = 0; f < 4; f++) this.kugelBild.push(kugel(f).toCanvas());
    // One row of frames per KIND, so a shadow in the meadow looks like
    // the creature the encounter will show — built once here rather
    // than redrawn as the child walks past.
    for (const art of ARTEN) {
      const reihe: HTMLCanvasElement[] = [];
      for (let f = 0; f < 4; f++) reihe.push(schattenPx(f, 7, 1, art).toCanvas());
      this.schattenBilder.set(art, reihe);
    }
    this.karrenBild = k.karren().toCanvas();
    this.fleckBild = schattenFleck(1).toCanvas();
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
  /**
   * How many versions of a kind there are.
   *
   * Eight when they are drawn — a seeded generator gives variety for
   * free — and however many were generated when they are not, because
   * there a variant costs a drawing.
   */
  private variantenVon(art: karte.Art): number {
    const gen = sprites.varianten(art);
    if (gen) return gen;
    // A plaque has exactly three faces and they are chosen by the map,
    // not by a seed — variant 3 would be a blank board beside a door.
    if (art === 'tafel') return 5;
    return art === 'haus' || art === 'schild' || art === 'laterne' ? 1 : 8;
  }

  private bild(art: karte.Art, seed: number, stufe: number): HTMLCanvasElement {
    const v = (seed >>> 0) % this.variantenVon(art);
    const key = `${art}:${v}:${stufe}`;
    const hit = this.dingBild.get(key);
    if (hit) return hit;

    // The generated sprite if there is one, the drawn one if not. Both
    // are already on the closed palette, so everything below — the two
    // steps down the ramp for the lantern — works either way.
    let p = sprites.hol(art, v);
    if (p) {
      // A copy, because the loaded buffer is shared and `remap` is in
      // place. Dimming the original once would dim it for ever.
      const kopie = new Px(p.w, p.h);
      kopie.data.set(p.data);
      p = kopie;
    } else {
      switch (art) {
        case 'baum': p = k.baum(v * 2654435761); break;
        case 'busch': p = k.busch(v * 2654435761); break;
        case 'stein': p = k.stein(v * 2654435761); break;
        case 'zaun': p = k.zaun(v); break;
        case 'schild': p = k.schild(); break;
        case 'laterne': p = k.laterne(); break;
        case 'tafel': p = k.tafel(v); break;
        default: p = k.haus(); break;
      }
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
    const hut = laden.hat('hut');
    const key = `${dir}${frame}${hut ? 'h' : ''}`;
    let c = this.heldBild.get(key);
    if (!c) {
      c = held(dir, frame, this.aussehen, hut).toCanvas();
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
    if (this.oeffnung < 1) {
      this.oeffnung = Math.min(1, this.oeffnung + dt / this.oeffnungsDauer);
    }
    this.gespielt += dt;
    if (this.gespielt >= 5) {
      stand.get().spielzeit += Math.floor(this.gespielt);
      this.gespielt -= Math.floor(this.gespielt);
      this.ortSichern();
    }

    // A tap asks for a route. So does a finger that is simply held
    // down, four times a second — which is the whole of Diablo's
    // steering and the thing a child reaches for first.
    //
    // Held is re-ROUTED rather than steered straight at, so holding
    // towards the far bank still walks round by the bridge. Straight
    // steering would have walked into the water and stopped, and a
    // child holding their finger on a thing that will not be reached is
    // being told "no" by something that looks like a bug.
    this.haltenAlter += dt;
    const halten = st.gehalten();
    let tipp = st.nimmTipp();
    if (!tipp && halten && this.haltenAlter >= 0.25) tipp = halten;
    if (tipp) {
      this.haltenAlter = 0;
      const zx = this.camX + tipp.x / this.skala;
      const zy = this.camY + tipp.y / this.skala;

      // A TAP chooses; a held finger only walks.
      //
      // That split is the whole of the fix. Holding is how a child
      // crosses the meadow, and crossing the meadow must be able to go
      // straight past a shadow without picking a fight with it.
      if (!halten) {
        const gewaehlt = karte.zielAn(zx, zy, this.wegSchatten);
        this.auswahl = gewaehlt;
        if (gewaehlt) audio.chimeSoft();
      }

      // What the finger MEANT: a tap on a house is its door, and a tap
      // on a cliff is the foot of the cliff. Taken literally, both used
      // to route to a solid tile, come back null, and do nothing at all.
      const z = this.auswahl && !halten
        ? { x: this.auswahl.x, y: this.auswahl.y }
        : karte.zielFuerTipp(zx, zy);
      const r = karte.route(this.hx, this.hy, z.x, z.y);
      if (r) { this.route = r; this.routeI = 0; this.festGefahren = 0; if (!halten) audio.click(); }
      else if (!halten) { this.route = null; audio.chimeSoft(); }
    }

    // Steering by hand means going somewhere, not going to a THING.
    if ((st.vektor().x || st.vektor().y) && this.auswahl) this.auswahl = null;

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
      const schnell = TEMPO * laden.tempoFaktor();
      this.bewege(v.x * schnell * dt, v.y * schnell * dt);
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
        // The cloak turns the dust into light. The same beat, the same
        // place, the same "you are walking" — but it is the one upgrade
        // in the shop a child sees every single second they are moving,
        // which is worth more at six than any number.
        if (laden.spurLeuchtet()) {
          fx.burst('funke', sx, sy - 2,
            { n: 2, speed: 20, up: 0.5, gravity: -10, life: 0.7 });
        } else {
          fx.burst('staub', sx, sy,
            { n: 2, speed: 26, up: 0.15, gravity: 90, life: 0.34 });
        }
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

    this.lumaFliegen(dt);
    if (this.ziel && Math.hypot(this.ziel.x - this.hx, this.ziel.y - this.hy) < 18) {
      const dann = this.ziel.dann;
      const [sx, sy] = this.aufSchirm(this.ziel.x, this.ziel.y);
      this.ziel = null;
      fx.burst('stern', sx, sy, { n: 14, speed: 150, up: 0.7, life: 0.9 });
      audio.sparkle(5);
      dann();
    }
    this.funkenPruefen();
    this.schattenPruefen();
    this.torPruefen();
    this.karrenPruefen();
    this.steinPruefen();
    this.tuerPruefen();
  }

  /**
   * Luma keeps up.
   *
   * A spring towards a point off his leading shoulder, plus a slow bob
   * that is hers rather than his. She is deliberately a little slow: at
   * a stiffness where she stayed exactly in place she stopped looking
   * alive, and the half second she takes to catch up when he stops is
   * the entire difference between a companion and a sticker.
   */
  private lumaFliegen(dt: number): void {
    const seite = this.blick === 'links' ? 1 : this.blick === 'rechts' ? -1 : -1;
    const zx = this.hx + seite * 11;
    const zy = this.hy - 22 + Math.sin(this.zeit * 2.1) * 2.5;
    if (!this.lx && !this.ly) { this.lx = zx; this.ly = zy; }
    const k2 = Math.min(1, dt * 4.2);
    this.lx += (zx - this.lx) * k2;
    this.ly += (zy - this.ly) * k2;

    this.spur.push([this.lx, this.ly]);
    if (this.spur.length > 9) this.spur.shift();
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
      stand.muenzen(laden.funkeWert());
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

  /** Standing at the cart. */
  private karrenPruefen(): void {
    const kk = karte.LADEN;
    if (!kk) return;
    const drin = Math.abs(kk.mitte - this.hx) < 15 && Math.abs(kk.fuss - this.hy) < 20;
    if (!drin) { this.amKarren = false; return; }
    if (this.amKarren || !this.anKarren) return;
    if (this.auswahl?.art !== 'laden') return;
    this.amKarren = true;
    this.auswahl = null;
    audio.sparkle(3);
    const ruf = this.anKarren;
    setTimeout(() => ruf(), 320);
  }

  /** Standing at the waypoint stone. */
  private steinPruefen(): void {
    const st = karte.STEIN;
    if (!st) { this.amStein = false; return; }
    const drin = Math.abs(st.mitte - this.hx) < 16 && Math.abs(st.fuss + 8 - this.hy) < 20;
    if (!drin) { this.amStein = false; return; }
    if (this.amStein || !this.anStein) return;
    if (this.auswahl?.art !== 'stein') return;
    this.amStein = true;
    this.auswahl = null;
    audio.sparkle(6);
    const ruf = this.anStein;
    setTimeout(() => ruf(), 340);
  }

  /**
   * Pushing at a gate.
   *
   * A shut gate is solid, so the child cannot walk into it — which means
   * the only way to notice they are trying is that they are standing
   * against it. That is what this looks for, and it is why the box is
   * generous: a six-year-old aiming at a gap in a cliff does not aim
   * precisely.
   */
  private torPruefen(): void {
    let drin: string | null = null;
    for (const tor of karte.tore) {
      if (Math.abs(tor.mitte - this.hx) < 14 && Math.abs(tor.fuss - this.hy) < 22) {
        drin = tor.id;
        break;
      }
    }
    if (drin === this.amTor) return;
    this.amTor = drin;
    if (!drin || !this.anTor) return;
    const offen = karte.torIstOffen(drin);
    const tor = karte.tore.find((t) => t.id === drin)!;
    if (offen) {
      const [sx, sy] = this.aufSchirm(tor.mitte, tor.fuss - 14);
      fx.burst('stern', sx, sy, { n: 12, speed: 130, up: 0.8, life: 0.9 });
      audio.sparkle(5);
    } else {
      audio.thunk();
    }
    this.anTor(offen);
  }

  /**
   * Walking into a shadow.
   *
   * Into, not near: the trigger is a small box you have to actually
   * stand in, because KONZEPT.md's whole objection to random encounters
   * is the interruption tax. A shadow you can see from across the
   * meadow and choose to walk around is not a tax.
   */
  private schattenPruefen(): void {
    let drin: string | null = null;
    for (const sch of karte.schatten) {
      if (this.wegSchatten.has(sch.id)) continue;
      if (Math.abs(sch.x - this.hx) < 12 && Math.abs(sch.y - 6 - this.hy) < 12) {
        drin = sch.id;
        break;
      }
    }
    // The latch is only consumed once the encounter is ACTUALLY going
    // to happen. See `tuerPruefen` for why that ordering matters.
    if (!drin) { this.amSchatten = null; return; }
    if (drin === this.amSchatten || !this.anSchatten) return;
    // Only the shadow that was chosen. Brushing past one on the way
    // somewhere else is walking past it.
    if (this.auswahl?.art !== 'schatten' || this.auswahl.id !== drin) return;
    this.amSchatten = drin;
    this.auswahl = null;
    const sch = karte.schatten.find((x) => x.id === drin)!;
    const [sx, sy] = this.aufSchirm(sch.x, sch.y - 10);
    fx.burst('staub', sx, sy, { n: 10, speed: 90, up: 0.4, gravity: 160, life: 0.6 });
    audio.whoosh(0.34, 700);
    const ruf = this.anSchatten;
    setTimeout(() => ruf(drin), 420);
  }

  /** Chased away: it stops being drawn and starts being a light. */
  schattenWeg(id: string): void {
    if (this.wegSchatten.has(id)) return;
    this.wegSchatten.add(id);
    this.amSchatten = null;
    const sch = karte.schatten.find((x) => x.id === id);
    if (sch) this.lampen.push({ x: sch.x, y: sch.y - 10 });
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
    // THE ORDER HERE IS THE WHOLE THING.
    //
    // The latch that stops this firing twice must NOT be consumed by a
    // visit that is refused for want of a selection. The first version
    // set it first, so a child standing at the cart before tapping it
    // could never open it again: the latch said "already here" for ever
    // and the tap had nothing left to trigger. Refuse first, latch only
    // when it is really going to happen.
    if (!drin) { this.inTuer = null; return; }
    if (drin === this.inTuer) return;
    if (this.auswahl?.art !== 'tuer' || this.auswahl.id !== drin) return;
    this.inTuer = drin;
    this.auswahl = null;
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
    if (this.anTuer) { const f = this.anTuer; setTimeout(() => f(drin), 480); }
  }

  private aufSchirm(x: number, y: number): [number, number] {
    return [(x - this.camX) * this.skala, (y - this.camY) * this.skala];
  }

  /**
   * Where a point in the world is on the screen. For `tools/verify.mjs`.
   *
   * A bridge, and a deliberate one. The checks that matter most here are
   * Patrick's two — tapping the house, and holding a finger down — and
   * both of them are about a TAP LANDING IN A PARTICULAR PLACE. There
   * is no honest way to aim one from outside: the camera follows the
   * adventurer and clamps at the edges of the region, so working the
   * position out in the test would mean reimplementing that clamp, and
   * a test that reimplements the code it is checking agrees with its
   * bugs.
   *
   * It reads and returns two numbers, it changes nothing, and it costs
   * a few dozen bytes. That is a better trade than not checking the
   * steering at all.
   */
  schirmOrt(x: number, y: number): [number, number] {
    return this.aufSchirm(x, y);
  }

  /**
   * What is currently CHOSEN, for `tools/verify.mjs`. Read-only.
   *
   * The ring that shows a selection is drawn on the world canvas, which
   * nothing outside can look at — and a mark a child is supposed to
   * read is exactly the kind of thing that must not go unchecked. Three
   * attempts at photographing it all missed for a different reason each
   * time; this answers the question the photograph was being asked.
   */
  gewaehlt(): string | null {
    return this.auswahl ? `${this.auswahl.art}:${this.auswahl.id}` : null;
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

    // 4a. what the CHILD has chosen, if anything.
    //
    // A different mark from the one the game uses to ask for something,
    // deliberately: that one is a filled pool of light and shouts, this
    // one is a thin ring that waits. They mean opposite things — "go
    // here, I am telling you" against "here is where you said" — and a
    // child who cannot read has only the shape to tell them apart.
    if (this.auswahl) {
      const [ax, ay] = hin(this.auswahl.x, this.auswahl.y);
      const puls = 1 + Math.sin(this.zeit * 4.4) * 0.09;
      ctx.save();
      ctx.globalAlpha = 0.9;
      ctx.strokeStyle = '#fff6cf';
      ctx.lineWidth = Math.max(2, Math.round(S * 0.8));
      ctx.beginPath();
      ctx.ellipse(ax, ay, 11 * S * puls, 6 * S * puls, 0, 0, Math.PI * 2);
      ctx.stroke();
      // Two ticks of light at the sides, so it reads as a selection and
      // not as a puddle.
      ctx.globalAlpha = 0.75;
      ctx.fillStyle = '#ffe08a';
      for (const sx2 of [-1, 1]) {
        ctx.fillRect(ax + sx2 * 13 * S * puls - S, ay - S, 2 * S, 2 * S);
      }
      ctx.restore();
    }

    // 4b. the ring, if the game is asking for something
    if (this.ziel) {
      // Loud on purpose.
      //
      // The first version was one thin ellipse at half opacity, and on a
      // screen this busy it was invisible — which for the only thing the
      // game ever asks a child to do is the whole feature failing. It is
      // a filled pool of light with two rings round it now, and it
      // breathes.
      const [zx, zy] = hin(this.ziel.x, this.ziel.y);
      const puls = 1 + Math.sin(this.zeit * 3.2) * 0.13;
      ctx.save();
      ctx.globalAlpha = 0.30 + Math.sin(this.zeit * 3.2) * 0.08;
      ctx.fillStyle = '#ffe08a';
      ctx.beginPath();
      ctx.ellipse(zx, zy, 15 * S * puls, 8 * S * puls, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 0.95;
      ctx.strokeStyle = '#fff6cf';
      ctx.lineWidth = Math.max(3, Math.round(S * 1.1));
      for (const r of [15, 10]) {
        ctx.beginPath();
        ctx.ellipse(zx, zy, r * S * puls, r * S * 0.53 * puls, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();
      // And a spark out of it now and then, so it is alive rather than
      // painted on. Twice a second, which is often enough to catch an
      // eye and rare enough not to become weather.
      if (Math.floor(this.zeit * 2) !== this.zielFunke) {
        this.zielFunke = Math.floor(this.zeit * 2);
        fx.burst('funke', zx, zy, { n: 3, speed: 60, up: 1.1, life: 0.7 });
      }
    }

    // 4c. the shadows still standing
    for (const sch of karte.schatten) {
      if (this.wegSchatten.has(sch.id)) continue;
      if (sch.x < this.camX - 32 || sch.x > this.camX + vw + 32) continue;
      if (sch.y < this.camY - 40 || sch.y > this.camY + vh + 40) continue;
      const reihe = this.schattenBilder.get(artVon(sch.id));
      const b = reihe?.[Math.floor(this.zeit * 3.6) % 4];
      if (!b) continue;
      const bob = Math.round(Math.sin(this.zeit * 1.7 + sch.x) * 1.5);
      if (this.fleckBild) {
        const [fx2, fy2] = hin(sch.x - SW / 2, sch.y - 6);
        ctx.drawImage(this.fleckBild, fx2, fy2,
          this.fleckBild.width * S, this.fleckBild.height * S);
      }
      const [sx, sy] = hin(sch.x - SW / 2, sch.y - SH + bob);
      ctx.drawImage(b, sx, sy, SW * S, SH * S);
    }

    // 5. everything standing on it, back to front, with the adventurer
    //    in the middle of the sort — which is the whole reason he can
    //    walk behind a tree and in front of the next one.
    let i = 0;
    for (; i < karte.dinge.length; i++) {
      if (karte.dinge[i].fuss > this.hy) break;
      this.dingZeichnen(ctx, karte.dinge[i], vw, vh, hin, S);
    }
    // Gates go in the same sort. The first version drew them all before
    // the adventurer, and since a child pushing at a gate is standing
    // ON it, the gate was entirely behind him at the one moment it
    // matters.
    this.toreZeichnen(ctx, hin, S, true);
    this.heldZeichnen(ctx, hin, S);
    this.toreZeichnen(ctx, hin, S, false);
    this.lumaZeichnen(ctx, hin, S);
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
    // Eased, so it opens quickly and settles rather than creeping.
    const auf = 1 - Math.pow(1 - this.oeffnung, 3);
    // A better lantern reaches further, and it is the most visible thing
    // in the shop: the pool of light a child is standing in gets bigger.
    const rh = (ring === 0 ? LICHT_HELD : LICHT_HELD_WEIT) * laden.lichtFaktor();
    const rz = Math.max(1, Math.round(rh * auf));
    // Nearest-neighbour on a hard 0/255 mask stays a hard 0/255 mask, so
    // scaling it costs nothing and softens nothing.
    mc.drawImage(this.scheibeHeld[ring],
      Math.round(this.hx - this.camX - rz + flackern),
      Math.round(this.hy - 8 - this.camY - rz + flackern * 0.7),
      rz * 2, rz * 2);
    // She is a light too, and a small one. Enough that the ground under
    // her is a shade brighter than the ground beside it, which is what
    // makes her look like she is giving something off rather than
    // hovering in front of it.
    const rk = ring === 0 ? 13 : 22;
    mc.drawImage(this.scheibeLampe[ring],
      Math.round(this.lx - this.camX - rk), Math.round(this.ly - this.camY - rk),
      rk * 2, rk * 2);

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
    // The corner is worked out from the picture that actually exists,
    // because a generated sprite is whatever size the pixeliser made it.
    const dx = d.mitte - Math.round(probe.width / 2);
    const dy = d.fuss - probe.height;
    if (dx + probe.width < this.camX || dx > this.camX + vw) return;
    if (dy + probe.height < this.camY || dy > this.camY + vh) return;
    // A lamp post is never in its own shadow.
    const stufe = d.licht ? 2 : this.beleuchtet(d.mitte, d.fuss - 4);
    const b = this.bild(d.art, d.seed, stufe);
    const [sx, sy] = hin(dx, dy);
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

  /** The gates, on whichever side of the adventurer they belong. */
  private toreZeichnen(
    ctx: CanvasRenderingContext2D, hin: (x: number, y: number) => [number, number],
    S: number, hinten: boolean,
  ): void {
    const kk = karte.LADEN;
    if (kk && this.karrenBild && (kk.fuss <= this.hy) === hinten) {
      const b = this.karrenBild;
      const [sx, sy] = hin(kk.mitte - b.width / 2, kk.fuss - b.height + 3);
      ctx.drawImage(b, sx, sy, b.width * S, b.height * S);
    }
    for (const tor of karte.tore) {
      if ((tor.fuss <= this.hy) !== hinten) continue;
      const offen = karte.torIstOffen(tor.id);
      // How many of the gate's marks are already earned. Part of the
      // cache key, because the gate is now a PROGRESS display and a
      // picture cached before the child levelled up would keep saying
      // the old number.
      const erreicht = Math.max(0, Math.min(tor.stufe, stand.stufe(tor.fach)));
      const key = `${tor.id}:${offen ? 1 : 0}:${erreicht}`;
      let b = this.torBild.get(key);
      if (!b) {
        b = k.tor(offen, tor.stufe, tor.fach, erreicht).toCanvas();
        this.torBild.set(key, b);
      }
      const [sx, sy] = hin(tor.mitte - b.width / 2, tor.fuss - b.height + 4);
      ctx.drawImage(b, sx, sy, b.width * S, b.height * S);
    }
  }

  /** Luma, and the three fading motes she leaves behind her. */
  private lumaZeichnen(
    ctx: CanvasRenderingContext2D, hin: (x: number, y: number) => [number, number], S: number,
  ): void {
    const b = this.kugelBild[Math.floor(this.zeit * 9) % 4];
    if (!b) return;
    // The trail first, and only three of it. A longer one reads as a
    // comet and she is a fairy; three motes read as the air not quite
    // having caught up with her.
    ctx.save();
    for (let j = 0; j < 3; j++) {
      const p = this.spur[this.spur.length - 2 - j * 3];
      if (!p) continue;
      ctx.globalAlpha = 0.34 - j * 0.09;
      const [tx, ty] = hin(p[0] - LUMA_W / 2, p[1] - LUMA_H / 2);
      ctx.drawImage(b, tx, ty, LUMA_W * S, LUMA_H * S);
    }
    ctx.restore();
    const [sx, sy] = hin(this.lx - LUMA_W / 2, this.ly - LUMA_H / 2);
    ctx.drawImage(b, sx, sy, LUMA_W * S, LUMA_H * S);
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
