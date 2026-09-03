// What Luma says, and how it appears.
//
// KONZEPT.md gives her a shape and a warning in the same paragraph:
//
//   Luma, the fairy, appears at the bottom of the screen with a portrait
//   and a text box, JRPG-style, and says everything out loud. She is the
//   only character who explains anything.
//
//   Luma must not talk too much. Text-heavy is exactly what makes
//   children skip. Two sentences, spoken, and only when something has
//   actually changed.
//
// So this module is mostly about NOT showing her. Three rules, all of
// them enforced here rather than remembered by every caller:
//
//   * `einmal` says a line once per adventurer and never again. A line
//     repeated on every entry is a line a child learns to sit through,
//     and `spielstand.gehoert` has tracked this since the save format
//     was written — it was put there for exactly this.
//
//   * The text is NOT load-bearing. It is spoken, and the same words are
//     printed for the grown-up in the room. AGENTS.md rule 14: if an
//     instruction cannot be heard, it is the wrong instruction. Nothing
//     she says is ever the only way to know something.
//
//   * She goes away on her own. A box a child has to dismiss to keep
//     playing is a toll gate; the tap is an accelerator, not a
//     requirement, and it is the whole width of the screen because a
//     six-year-old aiming at a small "next" arrow is a six-year-old
//     tapping the world behind it.

import { t } from '../core/i18n.js';
import * as stand from '../core/spielstand.js';
import * as audio from '../core/audio.js';
import { iconCanvas } from '../core/icons.js';
import { portraitCanvas } from '../spiel/luma.js';
import { el, tap } from './dom.js';

let kasten: HTMLElement | null = null;
let schliessen: number | null = null;
let danachRuf: (() => void) | null = null;

function buehne(): HTMLElement {
  return document.getElementById('app') as HTMLElement;
}

/**
 * How big her portrait is drawn.
 *
 * Whole numbers only, like everything else here: the one thing that
 * would give her away as not belonging to the world is a fractional
 * scale, which puts some of her outlines two pixels thick and some
 * three.
 */
function skala(): number {
  return Math.max(2, Math.min(4, Math.floor(window.innerHeight / 260)));
}

/**
 * How long she stays.
 *
 * Read from the length of what she is saying, because that is what the
 * child is waiting for. Floored at 2.6 s so a short line is not a flash,
 * capped at 9 s so a slow reader is never stuck behind her — and by then
 * the audio has finished anyway, since she is never given more than two
 * sentences.
 */
function dauer(text: string): number {
  return Math.max(2600, Math.min(9000, text.length * 62 + 900));
}

/**
 * Her portrait: the painting, with the coded sprite behind it.
 *
 * She is the ONE exception to "every pixel in this game is drawn in
 * code", and it is a deliberate one — see `tools/genluma.mjs` for the
 * argument. In short: she is not part of the world, she is a painting in
 * a box in front of it, which is exactly where Final Fantasy, Persona
 * and modern Zelda put their illustrated art. Pixels in the world, a
 * painting in the dialogue box; the contrast is the convention.
 *
 * The coded 46x46 version stays as the fallback, so a missing or
 * unsupported file leaves her a slightly plainer fairy rather than an
 * empty square. It is also the only thing that will render if WebP ever
 * turns out not to be there.
 */
function gemalt(): HTMLElement {
  const img = document.createElement('img');
  img.className = 'luma-gemalt';
  img.alt = '';
  img.decoding = 'async';
  img.src = 'assets/luma/luma.webp';
  img.addEventListener('error', () => {
    img.replaceWith(portraitCanvas(skala()));
  }, { once: true });
  return img;
}

export function sichtbar(): boolean {
  return kasten !== null;
}

/** Take her away, and run whatever was waiting on her. */
export function weg(): void {
  if (schliessen !== null) { clearTimeout(schliessen); schliessen = null; }
  if (kasten) {
    kasten.remove();
    kasten = null;
  }
  const f = danachRuf;
  danachRuf = null;
  if (f) f();
}

/**
 * Say a line.
 *
 * `danach` runs when she leaves, which is how one line follows another:
 * the welcome hands over to "look at the house over there" without
 * either of them knowing about the other.
 */
export function zeige(key: string, danach?: () => void): void {
  // A second line replaces the first rather than queueing behind it. If
  // two things happened at once, the newer one is the one that matters.
  if (kasten) {
    if (schliessen !== null) clearTimeout(schliessen);
    schliessen = null;
    kasten.remove();
    kasten = null;
    danachRuf = null;
  }
  const text = t(key);
  danachRuf = danach ?? null;

  const b = el('button', 'luma');
  const bild = el('span', 'luma-bild');
  bild.appendChild(gemalt());
  const wort = el('span', 'luma-text', text);
  const pfeil = el('span', 'luma-weiter');
  pfeil.appendChild(iconCanvas('zurueck', 30));
  b.append(bild, wort, pfeil);
  tap(b, () => weg());

  // Above the interface and below the particles, so a burst of hearts
  // still lands in front of her.
  const app = buehne();
  const fx = document.getElementById('fx');
  app.insertBefore(b, fx);
  kasten = b;

  audio.sagen(key);
  schliessen = window.setTimeout(() => weg(), dauer(text));
}

/**
 * Say a line once per adventurer, ever.
 *
 * Returns whether she actually said anything, so a caller can chain
 * something else when she did not.
 */
export function einmal(key: string, danach?: () => void): boolean {
  if (stand.gehoert(key)) return false;
  stand.merkeGehoert(key);
  zeige(key, danach);
  return true;
}
