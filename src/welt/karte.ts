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
  '##.TTT.....,...T.F..TT..Tt..s~~~sTTTTT.T..######',
  '##........T.,....T..T....,T"s~~~s.T"T.,.T.######',
  '##...,.,.T.T.............,..s~~~s...T...T..#####',
  '##............."".......o.*"s~~~s..........#####',
  '##.......,.,...,......=======bbb======......####',
  '##..F............t.,,.=....,s~~~s....=..."..####',
  '##.".......,.".,...,..=.."..s~~~s....=T....".###',
  '##....".......,..o.,.,=.tt..s~~~s..".=.....".###',
  '##.T,..,..............=.....s~~~s....=........##',
  '##."............"....*=.....s~~~s....=......F.##',
  '##.,.".......,...,....="....s~~~s...*=,.".....##',
  '##...HHHHH......".....=...,,s~~~s"...=........##',
  '##o."HHHHH............=...sFs~~~sss."=.....t..##',
  '##"."HHHHH............=,.ss~~~~~~~ss.=........##',
  '##...HHHHH"........"..=*ss~~~~~~~~~ss=........##',
  '##,..HHHHH..T.tT......=ss~~~~~~~~~~~s=.,......##',
  '##.....D..............=s~~~~~~~~~~~~~=..."....##',
  '##.....=..^..*".."....=s~~~~~~~~~~~~~=.......F##',
  '##.....================s~~~~~~~~~~~~~=...,....##',
  '##.,..."......=...,....ss~~~~~~~~~~~s=t.......##',
  '##..ffffffff..=.........ss~~~~~~~~~ss=..,.."",##',
  '##T.t.....T...=T..T......ss~~~~~~~ss.=.......T##',
  '##.....T.t..T.=*,t..t.,...sssssssss..=.o########',
  '##TTTF...,,...=o...T...T.,....o.....*=..########',
  '##..T.t...t...=..,T.T..T.,"........."=,.########',
  '##TTT.........=..T.......,..,....."..=..########',
  '##..T.........========================.#########',
  '##..T.,".....tTt.TTo...,"....,....,...,#########',
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
const FEST_ZEICHEN = '#~TtoHf^*';
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

export type Art = 'baum' | 'busch' | 'stein' | 'haus' | 'zaun' | 'schild' | 'laterne';

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

/** Where a new adventurer starts, and where the one door is. */
export let START = { x: 0, y: 0 };
export let TUER = { tx: 0, ty: 0 };

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
        case '=': case 'D': b = WEG; break;
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
        case 'D':
          TUER = { tx: x, ty: y };
          // The adventurer starts one step out of the door, facing the
          // world, because a game that opens on a wall is a game a child
          // walks the wrong way out of.
          START = { x: x * KACHEL + 8, y: (y + 2) * KACHEL + 8 };
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
  return fest[ty * KW + tx] === 1;
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

/** Is this point standing in the doorway? */
export function inTuer(x: number, y: number): boolean {
  return Math.floor(x / KACHEL) === TUER.tx && Math.floor(y / KACHEL) === TUER.ty;
}
