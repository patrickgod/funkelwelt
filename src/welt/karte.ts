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

const WIESE: readonly string[] = [
  '################################################',
  '################################################',
  '##TTTT.T."TTTTTTTT.T...TTFTTs~~~s.TT.TT...TT..##',
  '##.T..T...T......TTT...TTTT,s~~~sTT.TT"TT#######',
  '##.TTT.....,...T.F..TT..Tt..s~~~sTTTTT.T..#.F."#',
  '##........T.,....T..T....,T"s~~~s.T"T.,.T..,.*.#',
  '##...,.,.T.T........S.Z..,..s~~~s...T...T.....F#',
  '##...NNNNN....."".......o.*"s~~~s........GGG####',
  '##...NNNNN.,...,......=======bbb======......####',
  '##..FNNNNN.......t.,,.=....,s~~~s....=..."..####',
  '##.".NNNNN.,.".,...,..=.."..s~~~s....=T....".###',
  '##...NNNNN....,..oS,.,=.tt..s~~~s..".=.....".###',
  '##.T,S.n.3.*...WWWWW..=.....s~~~s..S.=........##',
  '##."...........WWWWW.*=.....s~~~s....=MMMMM.F.##',
  '##.,.".......,.WWWWW..="....s~~~s...*=MMMMM...##',
  '##...HHHHH.....WWWWW..=...,,s~~~s"...=MMMMM...##',
  '##o."HHHHH.....WWWWW..=...sFs~~~sss."=MMMMMt..##',
  '##"."HHHHH.......E.2..=,.ss~~~~~~~ss.=MMMMM...##',
  '##...HHHHH"........"..=*ss~~~~~~~~~ss=..m.....##',
  '##,..HHHHH..T.tT......=ss~~~~~~~~~~~s====*.S..##',
  '##.....D..............=s~~~~~~~~~~~~~=4.."....##',
  '##.....=1.^.K*".."....=s~~~~~~~~~~~~~=.......F##',
  '##.....================s~~~~~~~~~~~~~=...,....##',
  '##.,..."......=...,....ss~~~~~~~~~~~s=t.......##',
  '##..ffffffff..=.........ss~~~~~~~~~ss=..,.."",##',
  '##T.t.....T...=T..T......ss~~~~~~~ss.=.......T##',
  '##.....T.t..T.=*,t..t.,...sssssssss..=.o########',
  '##TTTF...,,...=o...T...T.,....o.....*=..########',
  '##..T.t.S.t...=..,T.T..T.,"........."=,.#.F..###',
  '##TTT.........=..T.......,..,....."..=...ggg*###',
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
const FEST_ZEICHEN = '#~TtoHf^*GgKWMNPQ123456Z';
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
/**
 * Which door he is standing in. One per house, and all four of them
 * are maths: this region IS the maths world, and Deutsch gets its own.
 */
export type Tuer =
  | 'verliebte' | 'nachbarn' | 'addition' | 'richtung' | 'silben' | 'schreiben';

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

/**
 * Which gate each gate TILE belongs to.
 *
 * A gate is two tiles wide and there is one `Tor` for it, so a tile
 * needs to know whose it is before it can be asked whether it is open.
 */
const torTeil = new Map<number, string>();

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


/** Das Haus der Addition. */
export let TUER_RECHNEN = { tx: -1, ty: -1 };

/** Das Haus von links und rechts. */
export let TUER_RICHTUNG = { tx: -1, ty: -1 };

/** Das Haus der Silben, in the second region. */
export let TUER_SILBEN = { tx: -1, ty: -1 };

/** Das Haus der Schreiber, next door to it. */
export let TUER_SCHREIBEN = { tx: -1, ty: -1 };

/**
 * The waypoint stone.
 *
 * One in each region, and tapping it goes to the other. Patrick asked
 * for waypoints when there was one world and nothing to connect; now
 * there are two, and this is the whole of the connection — no map
 * screen to choose from, no list. There are two worlds, so a stone that
 * says "the other one" is complete.
 */
export let STEIN: { mitte: number; fuss: number; tx: number; ty: number } | null = null;

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

/**
 * DAS UFER — the second region, where Deutsch lives.
 *
 * Authored by hand like the meadow, on the same grid, and deliberately
 * a different KIND of place: the meadow has a stream you cross and a
 * pond you walk round, this has a lagoon you stand at the edge of, a
 * jetty out over it, and sand instead of grass along the whole south.
 * A child should know which world they are in from one screen without
 * being told, and the ground is the cheapest way to say it.
 */
const UFER: readonly string[] = [
  '################################################',
  '################################################',
  '##............................................##',
  '##......T.T.T.T.T.T.T.T.T.T.T.T.T.T.T.T.T.T...##',
  '##..F....T..T..TT.T..T..T..T..T..o..T..T..T...##',
  '##..........................T.................##',
  '##....Z.............T...............T......F..##',
  '##.......t..............T.....................##',
  '##....=........o................T.....TTTTTTT.##',
  '##....=...............................TTTTTTT.##',
  '##...*=...PPPPP.......QQQQQ....F........T.T.T.##',
  '##....=...PPPPP.......QQQQQ...................##',
  '##....=,..PPPPP.......QQQQQ.......t...........##',
  '##....=.."PPPPP....F..QQQQQ...................##',
  '##....=...PPPPP.......QQQQQ.................T.##',
  '##....=.....p.5.........q.6.."................##',
  '##...*=.....=...........=.....................##',
  '##....=..o..=.....t.....=..o..................##',
  '##....=.....=...........=.................T...##',
  '##....=.,...=.*.......*.=,*.*.................##',
  '##....=========================,.....F........##',
  '##...........,..."......F.....=...............##',
  '##..."............ssssssssssssbssss.....t.....##',
  '##................s~~~~~~~~~~~b~~~s...........##',
  '##.........t...ssss~~~~~~~~~~~b~~~ssss........##',
  '##.............s~~~~~~~~~~~~~~~~~~~~~s........##',
  '##.............s~~~~~~~~~~~~~~~~~~~~~s........##',
  '##.............s~~~~~~~~~~~~~~~~~~~~~s........##',
  '##......t......s~~~~~~~~~~~~~~~~~~~~~so.......##',
  '##............Fs~~~~~~~~~~~~~~~~~~~~~s........##',
  '##...F.........s~~~~~~~~~~~~~~~~~~~~~s........##',
  '##.............s~~~~~~~~~~~~~~~~~~~~~s........##',
  '##........sssssssssssssssssssssssssssssssss...##',
  '##...................t.............t..........##',
  '################################################',
  '################################################',
];

// ---------------------------------------------------------------- derive

/**
 * The regions, in the order a child meets them.
 *
 * Patrick: "und dann in der nächsten welt die silben?" — so the two
 * subjects are two WORLDS, and this is where they live. Both are
 * authored by hand on the same 48x36 grid: a world a child can learn by
 * heart is worth more than a world nobody has ever walked across, and
 * the same grid means everything derived from a map works on both
 * without an argument.
 */
export const REGIONEN = ['wiese', 'ufer'] as const;
export type Region = (typeof REGIONEN)[number];

const KARTEN: Record<Region, readonly string[]> = { wiese: WIESE, ufer: UFER };

/** Which region is currently built. Everything below describes it. */
export let REGION: Region = 'wiese';

/** The rows of the region currently built. */
export let ZEILEN: readonly string[] = WIESE;

/**
 * Build a region, replacing whatever was built before.
 *
 * Every export in this file describes ONE region at a time. That is a
 * deliberate choice over holding both in memory: the world screen only
 * ever draws one, the save only ever remembers one, and a module that
 * quietly serves two would need every caller to say which — including
 * the forty places that currently just ask `festAn`.
 */
export function ladeRegion(r: Region): void {
  REGION = r;
  ZEILEN = KARTEN[r];
  dinge.length = 0;
  funken.length = 0;
  schatten.length = 0;
  tore.length = 0;
  offen.clear();
  torTeil.clear();
  LADEN = null;
  TUER = { tx: -1, ty: -1 };
  TUER_WORT = { tx: -1, ty: -1 };
  TUER_RECHNEN = { tx: -1, ty: -1 };
  TUER_RICHTUNG = { tx: -1, ty: -1 };
  TUER_SILBEN = { tx: -1, ty: -1 };
  TUER_SCHREIBEN = { tx: -1, ty: -1 };
  STEIN = null;
  bauen();
}

function bauen(): void {
  // Every id a save remembers carries its REGION.
  //
  // Both maps are 48x36 and both have a lightspark at tile 4,4 — so
  // without this, picking one up in the meadow would pick up its twin
  // on the shore, and a shadow chased on one map would be gone from the
  // other. The prefix is the cheapest fix and it is also the honest
  // one: these ids ARE per-region facts and always were.
  const r = REGION;
  for (const z of ZEILEN) {
    if (z.length !== KW) throw new Error(`a map row is ${z.length} long, not ${KW}`);
  }
  if (ZEILEN.length !== KH) throw new Error(`the map is ${ZEILEN.length} rows, not ${KH}`);

  let hausX0 = KW, hausX1 = -1, hausY1 = -1;
  let wortX0 = KW, wortX1 = -1, wortY1 = -1;
  let rechX0 = KW, rechX1 = -1, rechY1 = -1;
  let richX0 = KW, richX1 = -1, richY1 = -1;
  let silbX0 = KW, silbX1 = -1, silbY1 = -1;
  let schrX0 = KW, schrX1 = -1, schrY1 = -1;

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
        case '=': case 'D': case 'E': case 'm': case 'n': case 'p': case 'q':
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
          funken.push({ id: `${r}:f${x},${y}`, x: x * KACHEL + 8, y: y * KACHEL + 9 });
          break;
        case 'S':
          schatten.push({ id: `${r}:s${x},${y}`, x: x * KACHEL + 8, y: (y + 1) * KACHEL });
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
          // Two tiles wide, and only the LEFT one makes a Tor.
          //
          // A gate used to be one tile. The adventurer's foot box is
          // eleven pixels on a sixteen-pixel tile, so getting through a
          // one-tile gap meant putting his centre inside a six-pixel
          // window — and Patrick, playing it: "wenn ein tor
          // freigeschaltet wird, muss die öffnung größer sein, sonst
          // kommt man nicht durch." He was right, and the arithmetic
          // says so: it was threading a needle.
          //
          // Every tile of the run reports to the leftmost one's id, so
          // opening the gate opens the whole opening.
          torTeil.set(y * KW + x, `${r}:g${zeichen(x - 1, y) === c ? x - 1 : x},${y}`);
          if (zeichen(x - 1, y) === c) break;
          tore.push({
            id: `${r}:g${x},${y}`, tx: x, ty: y,
            mitte: x * KACHEL + 8, fuss: (y + 1) * KACHEL,
            // Both gates are maths now, at different heights. The
            // second used to want Wörter 2, which stopped being
            // openable the moment Deutsch moved to its own world — a
            // permanently locked door with two lightsparks behind it.
            fach: 'mathe',
            // One level past the near gate, not six. Levels go as the
            // square root of the stars — level 3 is 32 stars and level
            // 6 is two hundred — so a far gate at 6 would have been
            // sixty-odd rounds away in a region you can cross in a
            // minute. Four is a thing to come back for; six was a wall.
            stufe: c === 'g' ? 4 : 3,
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
        case 'n':
          TUER_RECHNEN = { tx: x, ty: y };
          break;
        case 'm':
          TUER_RICHTUNG = { tx: x, ty: y };
          break;
        case 'p':
          TUER_SILBEN = { tx: x, ty: y };
          break;
        case 'q':
          TUER_SCHREIBEN = { tx: x, ty: y };
          break;
        case 'Z':
          STEIN = { mitte: x * KACHEL + 8, fuss: (y + 1) * KACHEL, tx: x, ty: y };
          break;
        // The plaques beside the three doors. Not decoration: the house
        // sprite is the same building three times, so without these the
        // only way to find the shapes house is to walk into two wrong
        // ones and remember which. See `tafel()` in kacheln.ts.
        case '1': stell('tafel', x, y, 0); break;
        case '2': stell('tafel', x, y, 1); break;
        case '3': stell('tafel', x, y, 2); break;
        case '4': stell('tafel', x, y, 3); break;
        case '5': stell('tafel', x, y, 4); break;
        case '6': stell('tafel', x, y, 5); break;
        case 'W':
          wortX0 = Math.min(wortX0, x);
          wortX1 = Math.max(wortX1, x);
          wortY1 = Math.max(wortY1, y);
          break;
        case 'Q':
          schrX0 = Math.min(schrX0, x);
          schrX1 = Math.max(schrX1, x);
          schrY1 = Math.max(schrY1, y);
          break;
        case 'P':
          silbX0 = Math.min(silbX0, x);
          silbX1 = Math.max(silbX1, x);
          silbY1 = Math.max(silbY1, y);
          break;
        case 'M':
          richX0 = Math.min(richX0, x);
          richX1 = Math.max(richX1, x);
          richY1 = Math.max(richY1, y);
          break;
        case 'N':
          rechX0 = Math.min(rechX0, x);
          rechX1 = Math.max(rechX1, x);
          rechY1 = Math.max(rechY1, y);
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

  // The meadow's first house is where a new adventurer starts; the
  // shore's is not, so only the region that HAS one insists on it.
  if (REGION === 'wiese' && hausX1 < 0) throw new Error('the map has no house');
  if (hausX1 >= 0) stell('haus', hausX0, hausY1, 1, hausX1 - hausX0 + 1);
  if (wortX1 >= 0) stell('haus', wortX0, wortY1, 2, wortX1 - wortX0 + 1);
  if (rechX1 >= 0) stell('haus', rechX0, rechY1, 4, rechX1 - rechX0 + 1);
  if (richX1 >= 0) stell('haus', richX0, richY1, 5, richX1 - richX0 + 1);
  if (silbX1 >= 0) stell('haus', silbX0, silbY1, 6, silbX1 - silbX0 + 1);
  if (schrX1 >= 0) stell('haus', schrX0, schrY1, 7, schrX1 - schrX0 + 1);

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
  if (z === 'G' || z === 'g') {
    const id = torTeil.get(ty * KW + tx);
    if (id && offen.has(id)) return false;
  }
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
/**
 * The door of the house this tile belongs to, if it is a house at all.
 *
 * Each house block has its own character in the map — 'H', 'W', 'N' —
 * so this needs no bounds and no search. That is the whole reason they
 * are different letters.
 */
export function tuerVon(tx: number, ty: number): { tx: number; ty: number } | null {
  switch (zeichen(tx, ty)) {
    case 'H': return TUER;
    case 'W': return TUER_WORT;
    case 'N': return TUER_RECHNEN;
    case 'M': return TUER_RICHTUNG;
    case 'P': return TUER_SILBEN;
    case 'Q': return TUER_SCHREIBEN;
    default: return null;
  }
}

/**
 * Where a child MEANT when they tapped there.
 *
 * A tap used to be taken literally: the tile under the finger became
 * the target, and if that tile was solid the route came back null and
 * the adventurer did not move at all. Patrick tapped a house — the most
 * obvious thing in the picture, and the thing he wanted to walk into —
 * and nothing happened.
 *
 * Nothing happening is the worst possible answer. A six-year-old does
 * not conclude "that tile is impassable", they conclude the game is
 * broken, and they are more right than the game is.
 *
 * So a tap on something solid is READ rather than obeyed:
 *
 *   a house  → its door, because that is what tapping a house means
 *   anything else → the nearest place he could actually stand
 *
 * The second one is a spiral outwards, nearest first, so tapping a
 * cliff walks to the foot of it and tapping the far bank of the stream
 * walks to the near one. Both are what the finger was pointing at.
 */
export function zielFuerTipp(zx: number, zy: number): { x: number; y: number } {
  const tx = Math.floor(zx / KACHEL), ty = Math.floor(zy / KACHEL);
  if (!festAn(tx, ty)) return { x: zx, y: zy };

  const tuer = tuerVon(tx, ty);
  if (tuer) return { x: tuer.tx * KACHEL + KACHEL / 2, y: tuer.ty * KACHEL + KACHEL / 2 };

  let best: { x: number; y: number } | null = null;
  let bestD = Infinity;
  for (let r = 1; r <= 6 && !best; r++) {
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
        const x = tx + dx, y = ty + dy;
        if (x < 0 || y < 0 || x >= KW || y >= KH || festAn(x, y)) continue;
        const cx = x * KACHEL + KACHEL / 2, cy = y * KACHEL + KACHEL / 2;
        const d = (cx - zx) * (cx - zx) + (cy - zy) * (cy - zy);
        if (d < bestD) { bestD = d; best = { x: cx, y: cy }; }
      }
    }
  }
  return best ?? { x: zx, y: zy };
}

/** Something a tap can CHOOSE, and what happens when he gets there. */
export interface Ziel {
  art: 'tuer' | 'laden' | 'schatten' | 'stein';
  /** The door, the cart, or the shadow's own id. */
  id: string;
  /** Where to walk to, in world pixels. */
  x: number;
  y: number;
}

/**
 * What a tap at this point picks out, if anything.
 *
 * Patrick, after playing it: "wir sollten häuser, karren, gegner etc mit
 * antippen aktiv auswählen. unser character läuft dann hin und die
 * aktion tritt ein. einfach nur hinlaufen kann frustrierend sein, wenn
 * es nicht funktioniert oder man unabsichtlich gegner oder karren
 * auslöst."
 *
 * Everything used to trigger on TOUCH: cross a doorway and you were in
 * a round, brush a shadow and you were in a fight. That is fine when
 * you meant it and a trap when you did not — and the world gave a child
 * no way to say "I am going past that, not into it".
 *
 * So a tap now CHOOSES, and only the chosen thing acts. This function
 * is the whole of the choosing: it is deliberately generous, because a
 * six-year-old aiming at a house on a tablet does not hit the doorway,
 * they hit the roof.
 */
export function zielAn(zx: number, zy: number, weg: ReadonlySet<string>): Ziel | null {
  const tx = Math.floor(zx / KACHEL), ty = Math.floor(zy / KACHEL);

  // A shadow first: it is the smallest thing here and it stands in
  // front of whatever is behind it, so a tap that could be either is a
  // tap on the creature.
  for (const sch of schatten) {
    if (weg.has(sch.id)) continue;
    if (Math.abs(sch.x - zx) < 14 && Math.abs(sch.y - 12 - zy) < 18) {
      return { art: 'schatten', id: sch.id, x: sch.x, y: sch.y - 6 };
    }
  }

  if (STEIN && Math.abs(STEIN.mitte - zx) < 20 && Math.abs(STEIN.fuss - 10 - zy) < 24) {
    // Stand BELOW the stone, as with the cart: the stone itself is
    // solid, and routing onto it finds no route at all.
    return { art: 'stein', id: 'stein', x: STEIN.mitte, y: STEIN.fuss + KACHEL / 2 };
  }

  if (LADEN && Math.abs(LADEN.mitte - zx) < 20 && Math.abs(LADEN.fuss - 8 - zy) < 22) {
    // Stand IN FRONT of the cart, not on it. The cart's own tile is
    // solid — you cannot walk through a market stall — so routing to it
    // came back with no route and the tap did nothing at all.
    return { art: 'laden', id: 'laden', x: LADEN.mitte, y: LADEN.fuss + KACHEL / 2 };
  }

  // A house, whether the tap landed on the doorway or anywhere on the
  // building. `tuerVon` maps any tile of a house to its door.
  const haus = tuerVon(tx, ty);
  const tuer = haus ?? (inTuer(zx, zy) ? { tx, ty } : null);
  if (tuer && tuer.tx >= 0) {
    const t = inTuer(tuer.tx * KACHEL + KACHEL / 2, tuer.ty * KACHEL + KACHEL / 2);
    if (t) {
      // The MIDDLE of the doorway, not its bottom edge.
      //
      // Aiming two pixels inside the tile put him two pixels outside it:
      // the route follower counts a waypoint reached at 2.5 pixels, so
      // he stopped short by more than the margin and stood one
      // hundredth of a tile below the door, with nothing happening. A
      // target has to be further inside the thing than the tolerance
      // that decides you have arrived.
      return {
        art: 'tuer', id: t,
        x: tuer.tx * KACHEL + KACHEL / 2,
        y: tuer.ty * KACHEL + KACHEL / 2,
      };
    }
  }
  return null;
}

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
  if (tx === TUER.tx && ty === TUER.ty) return 'verliebte';
  if (tx === TUER_WORT.tx && ty === TUER_WORT.ty) return 'nachbarn';
  if (tx === TUER_RECHNEN.tx && ty === TUER_RECHNEN.ty) return 'addition';
  if (tx === TUER_RICHTUNG.tx && ty === TUER_RICHTUNG.ty) return 'richtung';
  if (tx === TUER_SILBEN.tx && ty === TUER_SILBEN.ty) return 'silben';
  if (tx === TUER_SCHREIBEN.tx && ty === TUER_SCHREIBEN.ty) return 'schreiben';
  return null;
}

ladeRegion('wiese');
