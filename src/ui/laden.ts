// The cart, and what is on it.
//
// This is the screen that failed the playtest that started this whole
// project, so it is worth quoting KONZEPT.md at length on exactly WHY it
// failed, because the wrong diagnosis leads straight back to it:
//
//   Building failed because it is a second job. A child who has just
//   answered ten questions is handed a shop, a currency, a catalogue of
//   twenty-seven things, an empty meadow, and no goal — and asked to
//   make an aesthetic decision. That is a blank page.
//
//   If there is spending, it must be a SHORT LIST OF OBVIOUSLY-BETTER
//   CHOICES, not a canvas.
//
// So, four rules, and every one of them is a reaction to that:
//
//   FOUR THINGS. Not twenty-seven. All four fit on one screen with no
//   scrolling, and a six-year-old can hold four things in their head.
//
//   EVERY ONE IS BETTER THAN NOTHING, AND NONE IS BETTER THAN ANOTHER.
//   There is no wrong purchase and no purchase to regret, so the choice
//   is never a test. A child cannot spend badly here.
//
//   NOTHING IS PLACED. You buy it and you have it. There is no meadow
//   to arrange it in, no second decision, and no blank page.
//
//   EVERY EFFECT IS VISIBLE IN THE WORLD. A bigger pool of lantern
//   light, walking faster, a shorter courage bar, a hat on your head.
//   An upgrade a child cannot see is a number, and this game does not
//   ask children to appreciate numbers.

import { t } from '../core/i18n.js';
import * as stand from '../core/spielstand.js';
import * as audio from '../core/audio.js';
import * as fx from '../core/fx.js';
import { iconCanvas, type Icon } from '../core/icons.js';
import { el, tap, knopf, zentrumVon } from './dom.js';

export interface Ware {
  id: string;
  icon: Icon;
  /** i18n key for the name. For the grown-up; the icon is for the child. */
  name: string;
  preis: number;
}

/**
 * The four. Deliberately priced within reach of an afternoon rather than
 * a fortnight: a shop a child cannot afford anything in is a shop that
 * teaches them the game is not for them.
 */
export const WAREN: Ware[] = [
  { id: 'laterne', icon: 'wLaterne', name: 'laden.laterne', preis: 24 },
  { id: 'stiefel', icon: 'wStiefel', name: 'laden.stiefel', preis: 20 },
  { id: 'mutband', icon: 'wMutband', name: 'laden.mutband', preis: 30 },
  { id: 'hut', icon: 'wHut', name: 'laden.hut', preis: 16 },
];

let wurzel: HTMLElement | null = null;
let raus: (() => void) | null = null;

export function starten(ui: HTMLElement, zurueck: () => void): void {
  wurzel = ui;
  raus = zurueck;
  zeichnen();
}

export function beenden(): void {
  wurzel = null;
  raus = null;
}

function zeichnen(): void {
  if (!wurzel) return;
  wurzel.replaceChildren();
  const s = el('div', 'bildschirm dunkel laden');
  s.appendChild(el('h2', 'titel', t('laden.titel')));

  const beutel = el('div', 'muenzchen gross');
  beutel.append(iconCanvas('muenze', 40),
    el('span', undefined, String(stand.get().muenzen)));
  s.appendChild(beutel);

  const reihe = el('div', 'waren');
  for (const w of WAREN) {
    const hat = stand.get().ausruestung.includes(w.id);
    const kann = stand.get().muenzen >= w.preis;
    // A card, not a list row: at this age a thing you can buy should
    // look like a thing, and the picture is the whole label.
    const karte = el('button', `ware${hat ? ' hat' : ''}`);
    karte.appendChild(iconCanvas(w.icon, 68));
    karte.appendChild(el('div', 'wname', t(w.name)));
    const preis = el('div', 'wpreis');
    if (hat) {
      // Owned. No price, no tick to interpret — the card is simply lit.
      preis.appendChild(el('span', 'wdein', t('laden.dein')));
    } else {
      preis.append(iconCanvas('muenze', 26), el('span', undefined, String(w.preis)));
    }
    karte.appendChild(preis);
    if (hat) {
      karte.disabled = true;
    } else if (!kann) {
      // Not disabled — TAPPABLE, and it says what is missing.
      //
      // A greyed-out card a child taps and nothing happens is a broken
      // game as far as they are concerned. Tapping this one shows how
      // many more coins, as coins, which is a thing to go and do rather
      // than a wall.
      karte.classList.add('zuteuer');
      tap(karte, () => {
        audio.chimeSoft();
        karte.classList.remove('wackeln');
        void karte.offsetWidth;
        karte.classList.add('wackeln');
      });
    } else {
      tap(karte, () => kaufen(w, karte));
    }
    reihe.appendChild(karte);
  }
  s.appendChild(reihe);
  s.appendChild(knopf(t('laden.fertig'), () => {
    const z = raus;
    beenden();
    fx.clear();
    if (z) z();
  }, 'gold'));
  wurzel.appendChild(s);
}

function kaufen(w: Ware, karte: HTMLElement): void {
  // `bezahlen` refuses and changes nothing if there is not enough, so a
  // double tap cannot spend twice and a race cannot go negative.
  if (!stand.bezahlen(w.preis)) return;
  const s = stand.get();
  if (!s.ausruestung.includes(w.id)) s.ausruestung.push(w.id);
  stand.sichern();
  audio.sparkle(5);
  audio.pop();
  const c = zentrumVon(karte);
  fx.burst('stern', c.x, c.y, { n: 16, speed: 190, up: 0.7, life: 0.95 });
  zeichnen();
}

// ------------------------------------------------------- what they do

/** Everything the world needs to know about what has been bought. */
export function hat(id: string): boolean {
  return stand.get().ausruestung.includes(id);
}

/** The lantern reaches further. The most visible upgrade in the game. */
export function lichtFaktor(): number {
  return hat('laterne') ? 1.35 : 1;
}

/** Boots. */
export function tempoFaktor(): number {
  return hat('stiefel') ? 1.3 : 1;
}

/** A shorter courage bar, so the finishing move comes round sooner. */
export function mutVoll(): number {
  return hat('mutband') ? 4 : 5;
}

/** The hat is worn, and it is also lucky. */
export function funkeWert(): number {
  return hat('hut') ? 5 : 3;
}
