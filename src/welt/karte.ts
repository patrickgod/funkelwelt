// The first region, and everything the game reads out of it.
//
// AUTHORED, not generated. KONZEPT.md is explicit about why, and it is
// the one place this project disagrees with almost every other game of
// its size: a world a child can learn by heart is worth more than a
// world that is different every time. Hyrule is the same Hyrule for
// everybody, and being able to say "the pond is past the big tree"
// is most of what makes a place a place.
//
// So the region is thirty-six lines of text below. That is deliberate:
// it can be read, edited and diffed by a person, which a tile array of
// 1728 numbers cannot. The first draft came out of a script (it is not
// in the repo; it did its job) and it has been hand-edited since.
//
// Its size is a decision that needs Patrick: HANDOVER.md lists "how big
// is the first region" as an open question and 48x36 is this file's
// answer until he gives a better one. It is about nine screens on an
// iPad — small enough to learn, big enough that the path has somewhere
// to go and back.
//
//   #  cliff          .  meadow        ,  meadow with flowers
//   ~  water          "  tall grass    =  path
//   s  shore          b  bridge        D  the door of the house
//   T  tree           t  bush          o  rock
//   H  the house      f  fence         ^  signpost
//   *  lamp post      F  a lightspark

import { KACHEL } from './kacheln.js';

export const KW = 48;
export const KH = 36;

export const ZEILEN: readonly string[] = [
  '################################################',
  '################################################',
  '##TTTT.T."TTTTTTTT.T...TTFTTs~~~s.TT.TT...TT..##',
  '##.T..T...T......TTT...TTTT,s~~~sTT.TT"TT#######',
  '##.TTT.....,...T.F..TT..Tt..s~~~sTTTTT.T..#.F."#',
  '##........T.,....T..T....,T"s~~~s.T"T.,.T.#,.*.#',
  '##...,.,.T.T........S....,..s~~~s...T...T.#...F#',
  '##...NNNNN....."".......o.*"s~~~s..........G####',
  '##...NNNNN.,...,......=======bbb======......####',
  '##..FNNNNN.......t.,,.=....,s~~~s....=..."..####',
  '##.".NNNNN.,.".,...,..=.."..s~~~s....=T....".###',
  '##...NNNNN....,..oS,.,=.tt..s~~~s..".=.....".###',
  '##.T,S.n.4.*...WWWWW..=.....s~~~s..S.=........##',
  '##."...........WWWWW.*=.....s~~~s....=MMMMM.F.##',
  '##.,.".......,.WWWWW..="....s~~~s...*=MMMMM...##',
  '##...HHHHH.....WWWWW..=...,,s~~~s"...=MMMMM...##',
  '##o."HHHHH.....WWWWW..=...sFs~~~sss."=MMMMMt..##',
  '##"."HHHHH.......E.2..=,.ss~~~~~~~ss.=MMMMM...##',
  '##...HHHHH"........"..=*ss~~~~~~~~~ss=..m.....##',
  '##,..HHHHH..T.tT......=ss~~~~~~~~~~~s====*.S..##',
  '##.....D..............=s~~~~~~~~~~~~~=3.."....##',
  '##.....=1.^.K*".."....=s~~~~~~~~~~~~~=.......F##',
  '##.....================s~~~~~~~~~~~~~=...,....##',
  '##.,..."......=...,....ss~~~~~~~~~~~s=t.......##',
  '##..ffffffff..=.........ss~~~~~~~~~ss=..,.."",##',
  '##T.t.....T...=T..T......ss~~~~~~~ss.=.......T##',
  '##.....T.t..T.=*,t..t.,...sssssssss..=.o########',
  '##TTTF...,,...=o...T...T.,....o.....*=..########',
  '##..T.t.S.t...=..,T.T..T.,"........."=,.#.F..###',
  '##TTT.........=..T.......,..,....."..=..g..*.###',
  '##..T.........========================.##....###',
  '##..T.,".....tTt.TTo...,".S..,....,...,##.S.F###',
  '##.T.....F.....ot.TF......."...T.......#########',
  '##...T"..t."...,T,t.t......".....,F.."##########',
  '################################################',
  '################################################',
];

/** In world pixels. */
export const BREITE = KW * KACHEL;
export const HOEHE = KH * KACHEL;

// ------------------------------------------------------------ the ground

export const GRAS = 0, BLUMEN = 1, HOCHGRAS = 2, WEG = 3,
  BRUECKE = 4, SAND = 5, WASSER = 6, FELS = 7;

/** Everything a hero cannot walk through. */
const FEST_ZEICHEN = '#~TtoHf^*GgKWMN1234';
/** Everything that reads as water for the purpose of drawing an edge. */
const NASS = '~b';
/** Everything that reads as path for the purpose of drawing an edge. */
const PFAD = '=Db';

export const boden = new Uint8Array(KW * KH);
export const fest = new Uint8Array(KW * KH);

function zeichen(x: number, y: number): string {
  if (x < 0 || y < 0 || x >= KW || y >= KH) return '#';
  return ZEILEN[y][x];
}

/** Is there sand or water next door? Used to bed objects into the shore. */
function amWasser(x: number, y: number): boolean {
  for (let j = -1; j <= 1; j++) {
    for (let i = -1; i <= 1; i++) {
      const c = zeichen(x + i, y + j);
      if (c === '~' || c === 's') return true;
    }
  }
  return false;
}

// ------------------------------------------------------------ the things

/** Which door he is standing in, if any. */
export type Tuer = 'mathe' | 'wort' | 'formen' | 'rechnen';

export type Art =
  | 'baum' | 'busch' | 'stein' | 'haus' | 'zaun' | 'schild' | 'laterne' | 'tafel';

export interface Ding {
  art: Art;
  /**
   * Where it stands, in world pixels: the middle of its footprint and
   * the line it meets the ground on.
   *
   * NOT a top-left corner any more. A generated sprite is whatever size
   * the pixeliser made it, and that is not known when this module is
   * read — so the corner is computed at draw time from the picture that
   * actually exists, and this stores only the two numbers that are
   * decided by the map rather than by the art.
   */
  mitte: number;
  /** Where it meets the ground — the key everything is sorted by. */
  fuss: number;
  seed: number;
  /** Lamp posts light the world; everything else only stands in it. */
  licht: { x: number; y: number } | null;
}

export const dinge: Ding[] = [];

export interface Funke {
  id: string;
  /** Centre, in world pixels. */
  x: number;
  y: number;
}

export const funken: Funke[] = [];

/**
 * A shadow, standing where the lights went out.
 *
 * NOT solid. KONZEPT.md is emphatic that an encounter is walked into on
 * purpose rather than sprung out of the grass — its worry about the
 * interruption tax is the reason Pokemon's random encounters are
 * famously annoying — so a shadow is a thing you can see from across the
 * meadow and decide about.
 */
export const schatten: Funke[] = [];

export interface Tor {
  id: string;
  tx: number;
  ty: number;
  /** Where its sprite stands, in world pixels. */
  mitte: number;
  fuss: number;
  /** What it wants before it opens. */
  fach: 'mathe' | 'wort';
  stufe: number;
}

export const tore: Tor[] = [];

/** The market cart. One, beside the path out of the house. */
export let LADEN: { mitte: number; fuss: number } | null = null;

/**
 * Gates that have been opened, so `festAn` can let the child through.
 *
 * Held here rather than in the tile grid because whether a gate is shut
 * is not a property of the map — it is a property of how much the child
 * has learned, and it changes while they are standing in front of it.
 */
const offen = new Set<string>();

export function torOeffnen(id: string): void {
  offen.add(id);
}

export function torIstOffen(id: string): boolean {
  return offen.has(id);
}

/** Where a new adventurer starts, and where each door is. */
export let START = { x: 0, y: 0 };
export let TUER = { tx: 0, ty: 0 };
/** The language house's door. */
export let TUER_WORT = { tx: -1, ty: -1 };

/** Das Haus der Formen. */
export let TUER_FORMEN = { tx: -1, ty: -1 };

/** Das Haus der Rechenmeister. */
export let TUER_RECHNEN = { tx: -1, ty: -1 };

function stell(art: Art, tx: number, ty: number, seed: number, tiles = 1): void {
  const mitte = tx * KACHEL + (tiles * KACHEL) / 2;
  const fuss = (ty + 1) * KACHEL;
  dinge.push({
    art,
    mitte: Math.round(mitte),
    fuss,
    seed,
    // A lamp lights from its lantern, which is near the top of a
    // thirty-four pixel post. Measured from the foot rather than from
    // the sprite, so it does not move when the sprite is redrawn.
    licht: art === 'laterne' ? { x: Math.round(mitte), y: fuss - 26 } : null,
  });
}

// ---------------------------------------------------------------- derive
{
  for (const z of ZEILEN) {
    if (z.length !== KW) throw new Error(`a map row is ${z.length} long, not ${KW}`);
  }
  if (ZEILEN.length !== KH) throw new Error(`the map is ${ZEILEN.length} rows, not ${KH}`);

  let hausX0 = KW, hausX1 = -1, hausY1 = -1;
  let wortX0 = KW, wortX1 = -1, wortY1 = -1;
  let formX0 = KW, formX1 = -1, formY1 = -1;
  let rechX0 = KW, rechX1 = -1, rechY1 = -1;

  for (let y = 0; y < KH; y++) {
    for (let x = 0; x < KW; x++) {
      const c = zeichen(x, y);
      const i = y * KW + x;
      const seed = (x * 73856093) ^ (y * 19349663) ^ 0x5f3a;

      // the ground under it
      let b = GRAS;
      switch (c) {
        case '.': b = GRAS; break;
        case ',': b = BLUMEN; break;
        case '"': b = HOCHGRAS; break;
        case '=': case 'D': case 'E': case 'm': case 'n':
        case 'G': case 'g': b = WEG; break;
        case 'b': b = BRUECKE; break;
        case 's': b = SAND; break;
        case '~': b = WASSER; break;
        case '#': b = FELS; break;
        default: b = amWasser(x, y) ? SAND : GRAS; break;
      }
      boden[i] = b;
      fest[i] = FEST_ZEICHEN.includes(c) ? 1 : 0;

      // and the thing standing on it
      switch (c) {
        case 'T': stell('baum', x, y, seed); break;
        case 't': stell('busch', x, y, seed); break;
        case 'o': stell('stein', x, y, seed); break;
        case 'f': stell('zaun', x, y, seed); break;
        case '^': stell('schild', x, y, seed); break;
        case '*': stell('laterne', x, y, seed); break;
        case 'F':
          funken.push({ id: `f${x},${y}`, x: x * KACHEL + 8, y: y * KACHEL + 9 });
          break;
        case 'S':
          schatten.push({ id: `s${x},${y}`, x: x * KACHEL + 8, y: (y + 1) * KACHEL });
          break;
        case 'K':
          LADEN = { mitte: x * KACHEL + 8, fuss: (y + 1) * KACHEL };
          break;
        // Two gates, one per subject, and that is the entire argument
        // for making the stars per subject in the first place: a child
        // who loves letters and finds numbers hard opens a DIFFERENT
        // door from one who is the other way round, and neither of them
        // is behind.
        case 'G':
        case 'g':
          tore.push({
            id: `g${x},${y}`, tx: x, ty: y,
            mitte: x * KACHEL + 8, fuss: (y + 1) * KACHEL,
            fach: c === 'g' ? 'wort' : 'mathe',
            stufe: c === 'g' ? 2 : 3,
          });
          break;
        case 'D':
          TUER = { tx: x, ty: y };
          // The adventurer starts one step out of the door, facing the
          // world, because a game that opens on a wall is a game a child
          // walks the wrong way out of.
          START = { x: x * KACHEL + 8, y: (y + 2) * KACHEL + 8 };
          break;
        case 'E':
          TUER_WORT = { tx: x, ty: y };
          break;
        case 'm':
          TUER_FORMEN = { tx: x, ty: y };
          break;
        case 'n':
          TUER_RECHNEN = { tx: x, ty: y };
          break;
        // The plaques beside the three doors. Not decoration: the house
        // sprite is the same building three times, so without these the
        // only way to find the shapes house is to walk into two wrong
        // ones and remember which. See `tafel()` in kacheln.ts.
        case '1': stell('tafel', x, y, 0); break;
        case '2': stell('tafel', x, y, 1); break;
        case '3': stell('tafel', x, y, 2); break;
        case '4': stell('tafel', x, y, 3); break;
        case 'W':
          wortX0 = Math.min(wortX0, x);
          wortX1 = Math.max(wortX1, x);
          wortY1 = Math.max(wortY1, y);
          break;
        case 'N':
          rechX0 = Math.min(rechX0, x);
          rechX1 = Math.max(rechX1, x);
          rechY1 = Math.max(rechY1, y);
          break;
        case 'M':
          formX0 = Math.min(formX0, x);
          formX1 = Math.max(formX1, x);
          formY1 = Math.max(formY1, y);
          break;
        case 'H':
          hausX0 = Math.min(hausX0, x);
          hausX1 = Math.max(hausX1, x);
          hausY1 = Math.max(hausY1, y);
          break;
        default: break;
      }
    }
  }

  if (hausX1 < 0) throw new Error('the map has no house');
  stell('haus', hausX0, hausY1, 1, hausX1 - hausX0 + 1);
  if (wortX1 >= 0) stell('haus', wortX0, wortY1, 2, wortX1 - wortX0 + 1);
  if (formX1 >= 0) stell('haus', formX0, formY1, 3, formX1 - formX0 + 1);
  if (rechX1 >= 0) stell('haus', rechX0, rechY1, 4, rechX1 - rechX0 + 1);

  // Back to front. Sorted once here rather than every frame: the world
  // is authored and nothing in it ever moves, so the order it is drawn
  // in was decided the moment the map was written.
  dinge.sort((a, b) => a.fuss - b.fuss);
}

// -------------------------------------------------------------- querying

export function bodenAn(tx: number, ty: number): number {
  if (tx < 0 || ty < 0 || tx >= KW || ty >= KH) return FELS;
  return boden[ty * KW + tx];
}

export function festAn(tx: number, ty: number): boolean {
  if (tx < 0 || ty < 0 || tx >= KW || ty >= KH) return true;
  if (fest[ty * KW + tx] !== 1) return false;
  // A gate is solid until it is not. Everything else in `fest` is a
  // fact about the map; this one is a fact about the child.
  const z = ZEILEN[ty][tx];
  if ((z === 'G' || z === 'g') && offen.has(`g${tx},${ty}`)) return false;
  return true;
}

/**
 * Which neighbours match, as a bitmask, for the tiles that draw their
 * own edges. `gruppe` is the set of characters that count as the same
 * material — water and a bridge are both "water" to the tile under it.
 */
export function maske(tx: number, ty: number, gruppe: string): number {
  const gleich = (x: number, y: number): boolean => gruppe.includes(zeichen(x, y));
  return (gleich(tx, ty - 1) ? 1 : 0)
    | (gleich(tx + 1, ty) ? 2 : 0)
    | (gleich(tx, ty + 1) ? 4 : 0)
    | (gleich(tx - 1, ty) ? 8 : 0);
}

export { NASS, PFAD };

// ------------------------------------------------------------- collision

/**
 * The adventurer's feet, and only the feet.
 *
 * `x, y` is the point on the ground the character stands on. The box is
 * eleven pixels across and six tall, which is roughly the shoes and
 * nothing else — so the head can pass in front of a tree trunk and
 * behind a canopy, which is the entire reason a top-down game is drawn
 * from three-quarters in the first place.
 */
export const FUSS_B = 11;
export const FUSS_H = 6;

export function frei(x: number, y: number): boolean {
  const x0 = Math.floor((x - FUSS_B / 2) / KACHEL);
  const x1 = Math.floor((x + FUSS_B / 2 - 1) / KACHEL);
  const y0 = Math.floor((y - FUSS_H) / KACHEL);
  const y1 = Math.floor((y - 1) / KACHEL);
  for (let ty = y0; ty <= y1; ty++) {
    for (let tx = x0; tx <= x1; tx++) if (festAn(tx, ty)) return false;
  }
  return true;
}

/** Is the whole straight run from A to B walkable? */
function sicht(ax: number, ay: number, bx: number, by: number): boolean {
  const d = Math.hypot(bx - ax, by - ay);
  const n = Math.max(1, Math.ceil(d / 3));
  for (let i = 1; i <= n; i++) {
    if (!frei(ax + ((bx - ax) * i) / n, ay + ((by - ay) * i) / n)) return false;
  }
  return true;
}

/**
 * A walkable route from one point to another, as world-pixel waypoints.
 *
 * This exists for the tap-to-walk steering, and it exists as a real
 * search rather than as "walk towards the tap" because the cheap version
 * answers the wrong question. HANDOVER.md's open question is which
 * steering a six-year-old prefers, and a tap-to-walk that grinds along
 * the edge of the pond when you tap the far bank would lose that
 * comparison for the wrong reason.
 *
 * Breadth-first over the tile grid — 1728 tiles, so it is instant — and
 * then the corners are pulled straight against the SAME collision test
 * the walking uses, so a shortcut can never be one the hero cannot
 * actually take.
 */
export function route(vx: number, vy: number, zx: number, zy: number): { x: number; y: number }[] | null {
  const zt = { x: Math.floor(zx / KACHEL), y: Math.floor(zy / KACHEL) };
  const vt = { x: Math.floor(vx / KACHEL), y: Math.floor(vy / KACHEL) };
  if (festAn(zt.x, zt.y)) return null;
  if (vt.x === zt.x && vt.y === zt.y) return [{ x: zx, y: zy }];

  const von = new Int32Array(KW * KH).fill(-1);
  const start = vt.y * KW + vt.x;
  von[start] = start;
  const queue: number[] = [start];
  const ziel = zt.y * KW + zt.x;
  let gefunden = false;
  for (let head = 0; head < queue.length && !gefunden; head++) {
    const i = queue[head];
    const x = i % KW, y = (i / KW) | 0;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as [number, number][]) {
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= KW || ny >= KH) continue;
      const j = ny * KW + nx;
      if (von[j] !== -1 || fest[j] === 1) continue;
      von[j] = i;
      if (j === ziel) { gefunden = true; break; }
      queue.push(j);
    }
  }
  if (!gefunden) return null;

  const roh: { x: number; y: number }[] = [];
  for (let i = ziel; i !== von[i]; i = von[i]) {
    roh.push({ x: (i % KW) * KACHEL + KACHEL / 2, y: ((i / KW) | 0) * KACHEL + KACHEL - 2 });
  }
  roh.reverse();
  roh[roh.length - 1] = { x: zx, y: zy };

  // Pull it straight: keep only the corners you cannot see past.
  const glatt: { x: number; y: number }[] = [];
  let ax = vx, ay = vy, i = 0;
  while (i < roh.length) {
    let weit = i;
    for (let k = roh.length - 1; k > i; k--) {
      if (sicht(ax, ay, roh[k].x, roh[k].y)) { weit = k; break; }
    }
    glatt.push(roh[weit]);
    ax = roh[weit].x; ay = roh[weit].y;
    i = weit + 1;
  }
  return glatt;
}

/**
 * Which doorway this point is standing in, if any.
 *
 * Two now, and the second is the whole reason the stars were made
 * per-subject in the first place: until today nothing in the game could
 * award a Wort-Stern, so "Wörter 1" sat on the title screen for ever
 * and half the design was a promise.
 */
export function inTuer(x: number, y: number): Tuer | null {
  const tx = Math.floor(x / KACHEL), ty = Math.floor(y / KACHEL);
  if (tx === TUER.tx && ty === TUER.ty) return 'mathe';
  if (tx === TUER_WORT.tx && ty === TUER_WORT.ty) return 'wort';
  if (tx === TUER_FORMEN.tx && ty === TUER_FORMEN.ty) return 'formen';
  if (tx === TUER_RECHNEN.tx && ty === TUER_RECHNEN.ty) return 'rechnen';
  return null;
}
