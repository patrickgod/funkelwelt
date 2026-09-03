// Three save slots, and everything one of them holds.
//
// Zelda's shape, and it is the right one for a six-year-old: you come
// to a title screen and there are three doors, and behind one of them
// is YOUR adventurer with your name on it. A child who picks slot two
// and sees their own character is looking at something that belongs to
// them before they have done anything at all.
//
// It also solves a problem LernInseln had and never admitted: one
// device, one save. A brother, a classmate or a second go at a
// different character all had to overwrite the first. Three slots costs
// almost nothing and removes the whole question.
//
// Everything lives in localStorage, wrapped so that a private-window
// failure degrades to "this session only" rather than crashing.

import * as storage from './storage.js';
import type { Aussehen } from '../spiel/held.js';

/** The subjects experience is earned in. */
export type Fach = 'mathe' | 'wort';

export interface Stand {
  v: 1;
  /** Empty means the slot has never been used. */
  name: string;
  aussehen: Aussehen;
  /**
   * Experience, per subject.
   *
   * Per subject on purpose. A child who loves numbers and finds letters
   * hard is then visibly GOOD AT SOMETHING rather than behind — and the
   * gates that open are the ones they earned, which is honest about
   * what is actually true of them.
   *
   * Never spent, never reduced. Same rule as LernInseln's stars, and
   * for the same reason: nothing that measures a child may go down.
   */
  sterne: Record<Fach, number>;
  /** The spendable one. */
  muenzen: number;
  /**
   * Per-fact strength 0..3, lifted wholesale from LernInseln along with
   * the scheduler that reads it. The teaching is already built.
   */
  staerke: Record<string, number>;
  /** Where the hero was standing, in world tiles. */
  ort: { x: number; y: number };
  /**
   * Which lightsparks have been picked up.
   *
   * Kept per slot and never cleared. A spark a child found once must
   * still be found when they come back tomorrow, or the world un-learns
   * itself overnight — the same rule as the stars, applied to the map
   * instead of to the arithmetic.
   */
  funken: string[];
  /**
   * Which shadows have been chased away.
   *
   * Each one leaves a light behind it, permanently, so this list is
   * also how bright the world is. KONZEPT.md wanted progress that is
   * visible without being numeric; this is it at world scale.
   */
  schatten: string[];
  /**
   * Thumbstick or tap-to-walk. Stored per slot rather than globally,
   * because two children on one iPad will not agree and neither of them
   * is wrong.
   *
   * TAP is the default, and that is AGENTS.md rule 13 rather than a
   * preference: tap is the primary interaction in this game, a motor
   * slip must never read as a wrong answer, and a thumbstick is a thing
   * a child has to learn to hold before they can play. The stick is
   * still two taps away for anyone who prefers it.
   */
  steuerung: 'stick' | 'tippen';
  /** How many times each dungeon has been cleared. */
  geschafft: Record<string, number>;
  /** What has been bought. */
  ausruestung: string[];
  /** Which of Luma's lines have been heard, so she says each once. */
  gehoert: string[];
  ton: boolean;
  stimme: boolean;
  /** Seconds played, for the slot card. */
  spielzeit: number;
  /** Epoch millis, so the slots can be shown newest-first. */
  zuletzt: number;
}

export const PLAETZE = 3;

function frisch(): Stand {
  return {
    v: 1,
    name: '',
    aussehen: { haut: 1, haar: 1, frisur: 0, kleid: 0 },
    sterne: { mathe: 0, wort: 0 },
    muenzen: 0,
    staerke: {},
    ort: { x: 0, y: 0 },
    funken: [],
    schatten: [],
    steuerung: 'tippen',
    geschafft: {},
    ausruestung: [],
    gehoert: [],
    ton: true,
    stimme: true,
    spielzeit: 0,
    zuletzt: 0,
  };
}

function schluessel(i: number): string {
  return `funkelwelt.platz${i}.v1`;
}

/**
 * Read a slot, repairing anything missing.
 *
 * Every field is defaulted individually rather than the whole object
 * being trusted: a save written by an older build must never crash a
 * newer one, because the child would lose their adventurer over a
 * renamed field.
 */
export function laden(i: number): Stand {
  const text = storage.load(schluessel(i));
  const basis = frisch();
  if (!text) return basis;
  try {
    const roh = JSON.parse(text) as Partial<Stand>;
    return {
      v: 1,
      name: typeof roh.name === 'string' ? roh.name.slice(0, 12) : basis.name,
      aussehen: roh.aussehen && typeof roh.aussehen === 'object'
        ? {
            haut: Number(roh.aussehen.haut) || 0,
            haar: Number(roh.aussehen.haar) || 0,
            frisur: Number(roh.aussehen.frisur) || 0,
            kleid: Number(roh.aussehen.kleid) || 0,
          }
        : basis.aussehen,
      sterne: {
        mathe: Math.max(0, Math.floor(Number(roh.sterne?.mathe) || 0)),
        wort: Math.max(0, Math.floor(Number(roh.sterne?.wort) || 0)),
      },
      muenzen: Math.max(0, Math.floor(Number(roh.muenzen) || 0)),
      staerke: roh.staerke && typeof roh.staerke === 'object' ? { ...roh.staerke } : {},
      ort: roh.ort && typeof roh.ort === 'object'
        ? { x: Number(roh.ort.x) || 0, y: Number(roh.ort.y) || 0 }
        : basis.ort,
      funken: Array.isArray(roh.funken)
        ? roh.funken.filter((x) => typeof x === 'string') : [],
      schatten: Array.isArray(roh.schatten)
        ? roh.schatten.filter((x) => typeof x === 'string') : [],
      steuerung: roh.steuerung === 'stick' ? 'stick' : 'tippen',
      geschafft: roh.geschafft && typeof roh.geschafft === 'object' ? { ...roh.geschafft } : {},
      ausruestung: Array.isArray(roh.ausruestung)
        ? roh.ausruestung.filter((x) => typeof x === 'string') : [],
      gehoert: Array.isArray(roh.gehoert)
        ? roh.gehoert.filter((x) => typeof x === 'string') : [],
      ton: roh.ton !== false,
      stimme: roh.stimme !== false,
      spielzeit: Math.max(0, Math.floor(Number(roh.spielzeit) || 0)),
      zuletzt: Math.max(0, Math.floor(Number(roh.zuletzt) || 0)),
    };
  } catch {
    return basis;
  }
}

/** All three, for the title screen. */
export function alle(): Stand[] {
  const out: Stand[] = [];
  for (let i = 0; i < PLAETZE; i++) out.push(laden(i));
  return out;
}

// ------------------------------------------------------- the open slot

let platz = 0;
let stand: Stand = frisch();

export function oeffnen(i: number): Stand {
  platz = i;
  stand = laden(i);
  return stand;
}

export function neu(i: number, name: string, aussehen: Aussehen): Stand {
  platz = i;
  stand = frisch();
  stand.name = name.trim().slice(0, 12);
  stand.aussehen = aussehen;
  stand.zuletzt = Date.now();
  sichern();
  return stand;
}

export function get(): Stand {
  return stand;
}

export function derPlatz(): number {
  return platz;
}

export function sichern(): void {
  stand.zuletzt = Date.now();
  storage.save(schluessel(platz), JSON.stringify(stand));
}

export function loeschen(i: number): void {
  storage.clear(schluessel(i));
}

// ------------------------------------------------------------ earning

/** Experience. Only ever up. */
export function sterne(fach: Fach, n: number): void {
  if (n <= 0) return;
  stand.sterne[fach] += Math.floor(n);
  sichern();
}

export function muenzen(n: number): void {
  if (n <= 0) return;
  stand.muenzen += Math.floor(n);
  sichern();
}

/** Spend. Changes nothing and returns false if there is not enough. */
export function bezahlen(n: number): boolean {
  if (n <= 0 || stand.muenzen < n) return false;
  stand.muenzen -= Math.floor(n);
  sichern();
  return true;
}

/**
 * The level in a subject.
 *
 * A gentle curve: level 2 after four good rounds, and each level a
 * little further than the last. Deliberately not exponential — the
 * point is that it keeps moving, not that it becomes a grind.
 */
export function stufe(fach: Fach): number {
  const s = stand.sterne[fach];
  return Math.max(1, Math.floor(Math.sqrt(s / 8)) + 1);
}

/** How far through the current level, 0..1, for the bar. */
export function stufenFortschritt(fach: Fach): number {
  const s = stand.sterne[fach];
  const jetzt = stufe(fach);
  const von = (jetzt - 1) ** 2 * 8;
  const bis = jetzt ** 2 * 8;
  return Math.max(0, Math.min(1, (s - von) / Math.max(1, bis - von)));
}

// ------------------------------------------------------------ mastery

export function staerkeVon(fakt: string): number {
  return stand.staerke[fakt] ?? 0;
}

export function merken(fakt: string, richtig: boolean): void {
  const jetzt = stand.staerke[fakt] ?? 0;
  stand.staerke[fakt] = richtig ? Math.min(3, jetzt + 1) : Math.max(0, jetzt - 1);
  sichern();
}

/** A shadow, chased away. Only ever added to; it never comes back. */
export function schattenWeg(id: string): void {
  if (stand.schatten.includes(id)) return;
  stand.schatten.push(id);
  sichern();
}

/** A lightspark, picked up. Only ever added to. */
export function funkeGefunden(id: string): void {
  if (stand.funken.includes(id)) return;
  stand.funken.push(id);
  sichern();
}

export function gehoert(id: string): boolean {
  return stand.gehoert.includes(id);
}

export function merkeGehoert(id: string): void {
  if (stand.gehoert.includes(id)) return;
  stand.gehoert.push(id);
  sichern();
}
