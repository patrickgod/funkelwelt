// How a question is DRAWN, for every screen that asks one.
//
// This lived inside the round screen, which meant the shadow encounter
// could not use it — and so the encounter had its own hard-coded
// ten-frame and could only ever ask verliebte Zahlen. Patrick noticed
// from the outside: "the schatten opponents, they always have the
// verliebte zahlen task. why not randomize the tasks?"
//
// He was looking at a rendering limitation and calling it a design
// choice, which is exactly what it had become. A screen that can only
// draw one kind of question can only ask one kind of question, and
// nobody decided that.
//
// So it lives here, both screens use it, and adding a prompt kind
// teaches every screen at once.
//
// Nothing in this file is a sentence the child must read.

import { t } from '../core/i18n.js';
import * as audio from '../core/audio.js';
import { iconCanvas } from '../core/icons.js';
import { tenFrameCanvas } from '../core/tenframe.js';
import { fahrzeugCanvas, pfeilCanvas, type Fahrzeug, type Richtung } from '../games/fahrzeuge.js';
import type { Prompt, Question } from '../games/types.js';
import { el, tap } from './dom.js';

/**
 * How big the ten-frame is drawn. Derived from the viewport, because
 * this runs on a phone in a waiting room and on an iPad on a table.
 */
export function rahmenSkala(): number {
  return Math.max(3, Math.min(7, Math.floor((window.innerHeight * 0.22) / 34)));
}

/** How big a vehicle or an arrow is drawn. */
export function fahrSkala(): number {
  return Math.max(2, Math.min(5, Math.floor((window.innerHeight * 0.11) / 26)));
}

/**
 * Which shape fills the ten-frame.
 *
 * Hearts in Das Haus der verliebten Zahlen, because the pairs that make
 * ten are the "verliebte" ones and a six-year-old reads that without
 * being told. Beads everywhere else.
 */
export type Fuellung = 'perle' | 'herz';

/** The cards. A picture where the answer is a picture, else the text. */
export function karteFuer(label: string): HTMLButtonElement {
  const b = el('button') as HTMLButtonElement;
  if (label.startsWith('fz:')) {
    const [, art, nach] = label.split(':');
    b.appendChild(fahrzeugCanvas(art as Fahrzeug, nach as Richtung, fahrSkala()));
    b.setAttribute('aria-label', `${art} ${nach}`);
  } else {
    b.textContent = label;
  }
  return b;
}

/** Which class the row of cards wants. */
export function kartenKlasse(q: Question): string {
  if (q.choices.some((c) => c.startsWith('fz:'))) return ' fahrzeuge';
  if (q.choices.some((c) => c.length > 2)) return ' worte';
  return '';
}

/** How a prompt is drawn. Nothing here is a sentence the child must read. */
export function fragebild(p: Prompt, q: Question, fuellung: Fuellung = 'perle'): HTMLElement {
  const box = el('div', 'frage');
  switch (p.kind) {
    case 'tenframe': {
      if (p.n >= 0) {
        const f = el('div', 'zehnerfeld');
        f.appendChild(tenFrameCanvas({ n: p.n, shape: fuellung }, rahmenSkala()));
        box.appendChild(f);
      }
      if (p.numeral) {
        const n = p.n >= 0 ? p.n : Number(q.fact.slice(3));
        // Named as well as drawn, so `tools/verify.mjs` can ANSWER this
        // question rather than tapping a card and hoping. It tapped and
        // hoped for weeks, and passed on luck.
        box.setAttribute('data-zahl', String(n));
        box.appendChild(el('div', 'zahl-gross', String(n)));
      }
      break;
    }
    case 'silbenwort': {
      // The word, whole and big, and a way to hear it. The question is
      // "where does this come apart", so the word has to be readable as
      // one thing first.
      box.appendChild(el('div', 'silbenwort', p.wort));
      const hoeren = el('button', 'hoeren');
      hoeren.appendChild(iconCanvas('ohr', 68));
      const sag = (): void => { audio.say(`wort-${p.wort.toLowerCase()}`, p.wort); };
      tap(hoeren, sag);
      box.appendChild(hoeren);
      break;
    }
    case 'richtung': {
      // The whole question, and it is one arrow. It is spoken as well,
      // for a child who wants it read to them, but it does not need to
      // be: with the sound off the arrow still says which way.
      const holder = el('div', 'pfeilfrage');
      const bild = pfeilCanvas(p.nach, fahrSkala() + 2);
      // Named as well as drawn: a screen reader gets the question, and
      // `tools/verify.mjs` can tell which way it was asked WITHOUT
      // asking the code that decides the answer.
      bild.setAttribute('data-nach', p.nach);
      bild.setAttribute('aria-label', p.nach);
      holder.appendChild(bild);
      box.appendChild(holder);
      const key = `say.nach${p.nach === 'rechts' ? 'Rechts' : 'Links'}`;
      const hoeren = el('button', 'hoeren');
      hoeren.appendChild(iconCanvas('ohr', 68));
      const sag = (): void => { audio.say(key.replace(/\./g, '-').toLowerCase(), t(key)); };
      tap(hoeren, sag);
      box.appendChild(hoeren);
      setTimeout(sag, 260);
      break;
    }
    case 'reihe': {
      const row = el('div', 'zahlenreihe');
      for (const v of p.seq) {
        row.appendChild(el('span', v === null ? 'luecke' : undefined,
          v === null ? '?' : String(v)));
      }
      box.appendChild(row);
      break;
    }
    case 'rechnung': {
      const r = el('div', 'rechnung');
      r.append(
        el('span', undefined, String(p.a)),
        el('span', undefined, p.op),
        el('span', undefined, String(p.b)),
        el('span', undefined, '='),
        el('span', undefined, '?'),
      );
      box.appendChild(r);
      const f = el('div', 'zehnerfeld');
      f.appendChild(tenFrameCanvas({ n: p.a }, Math.max(2, rahmenSkala() - 1)));
      f.setAttribute('data-n', String(p.a));
      box.appendChild(f);
      break;
    }
    case 'doppel': {
      const r = el('div', 'rechnung');
      r.append(
        el('span', undefined, String(p.n)),
        el('span', undefined, '+'),
        el('span', undefined, String(p.n)),
        el('span', undefined, '='),
        el('span', undefined, '?'),
      );
      box.appendChild(r);
      const zwei = el('div', 'doppelfeld');
      for (let i = 0; i < 2; i++) {
        const f = el('div', 'zehnerfeld');
        f.appendChild(tenFrameCanvas({ n: p.n }, Math.max(2, rahmenSkala() - 1)));
        zwei.appendChild(f);
      }
      box.appendChild(zwei);
      break;
    }
    default:
      // `wort` and `schreiben` are still declared and have no generator
      // in this world: Deutsch moved to a region of its own and has not
      // been built yet. See PLAN.md.
      break;
  }
  return box;
}

