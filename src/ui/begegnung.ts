// Meeting a shadow.
//
// This is the screen the whole design has been arranged around, and the
// one an RPG framing will keep trying to ruin. KONZEPT.md, at length,
// because every line of it is load-bearing:
//
//   An RPG says: get it wrong, take damage, and eventually lose. Applied
//   to a maths question that reads as *not knowing this hurts you*,
//   which is precisely the lesson that makes a child decide at seven
//   that they are bad at maths.
//
//   Correct answers push the shadow back. Wrong answers do NOTHING AT
//   ALL — the right answer is shown, as a picture, and the next question
//   comes. The shadow never advances.
//
//   There is no health bar on the child. What there is instead is MUT —
//   courage — a bar that ONLY EVER FILLS.
//
// So there are exactly two numbers on this screen and both of them go
// one way: Mut, which rises, and how awake the shadow is, which falls.
// Nothing here can be lost, spent, drained or reduced. `mut` is written
// in one place and the only operator applied to it is `+`.
//
// Leaving is free, too. Walk out halfway through and the shadow is
// still where it was, at full strength, and nothing has been taken —
// which is Patrick's own instinct from the design conversation: *wir
// müssen uns nur kurz ausruhen*.

import { t } from '../core/i18n.js';
import * as stand from '../core/spielstand.js';
import * as audio from '../core/audio.js';
import * as fx from '../core/fx.js';
import { iconCanvas } from '../core/icons.js';
import { tenFrameCanvas } from '../core/tenframe.js';
import { buildRound, bekanntePaare } from '../games/games.js';
import type { Question } from '../games/types.js';
import { schatten as schattenPx, SW, SH } from '../spiel/schatten.js';
import { el, tap, knopf, zentrumVon } from './dom.js';
import * as luma from './luma.js';

/** How many right answers fill the bar. Five is about ninety seconds. */
const MUT_VOLL = 5;

interface Lauf {
  id: string;
  fragen: Question[];
  i: number;
  /** Only ever incremented. Never reduced, never reset by a mistake. */
  mut: number;
  beschaeftigt: boolean;
  paareVorher: number[];
}

let lauf: Lauf | null = null;
let wurzel: HTMLElement | null = null;
let raus: ((geschafft: boolean) => void) | null = null;

/** The shadow, drawn at whatever size the screen can spare. */
function schattenSkala(): number {
  return Math.max(3, Math.min(7, Math.floor((window.innerHeight * 0.24) / SH)));
}

function rahmenSkala(): number {
  const b = (window.innerWidth * 0.42) / 68;
  const h = (window.innerHeight * 0.17) / 30;
  return Math.max(3, Math.min(7, Math.floor(Math.min(b, h))));
}

/** Walk into a shadow. `zurueck(true)` when it has been chased away. */
export function starten(ui: HTMLElement, id: string, zurueck: (weg: boolean) => void): void {
  wurzel = ui;
  raus = zurueck;
  lauf = {
    id,
    // Deliberately more questions than it can take, so the round never
    // runs out from under a child who is finding it hard. The encounter
    // ends when Mut is full, not when the questions do.
    fragen: buildRound('verliebte-zahlen', MUT_VOLL * 4),
    i: 0,
    mut: 0,
    beschaeftigt: false,
    paareVorher: bekanntePaare(),
  };
  luma.einmal('say.schatten');
  zeichnen();
}

export function beenden(): void {
  lauf = null;
  wurzel = null;
  raus = null;
}

// ------------------------------------------------------------ the screen

function zeichnen(): void {
  if (!lauf || !wurzel) return;
  wurzel.replaceChildren();
  const q = lauf.fragen[lauf.i % lauf.fragen.length];

  const s = el('div', 'runde begegnung');

  const oben = el('div', 'oben');
  // Leaving costs nothing and is always available. A screen a child
  // cannot get out of is a screen a child can be trapped on.
  oben.appendChild(knopf(t('runde.raus'), () => verlassen(false)));
  oben.appendChild(el('div', 'pips'));
  const beutel = el('div', 'beutel-q');
  const m = el('div', 'muenzchen');
  m.append(iconCanvas('muenze', 30), el('span', undefined, String(stand.get().muenzen)));
  beutel.appendChild(m);
  oben.appendChild(beutel);
  s.appendChild(oben);

  // The shadow itself, shrinking as it is pushed back. It is never
  // marked, never reddened and never shown as hurt — it gets smaller
  // and its eyes dim, and then it is gone.
  const wach = 1 - lauf.mut / MUT_VOLL;
  const buehne = el('div', 'buehne-q');
  const sBox = el('div', 'schatten');
  const sk = schattenSkala();
  const c = schattenPx(Math.floor(performance.now() / 260) % 4, 7, wach).toCanvas();
  const cc = el('canvas');
  cc.width = SW * sk;
  cc.height = SH * sk;
  const cx = cc.getContext('2d', { willReadFrequently: true })!;
  cx.imageSmoothingEnabled = false;
  cx.drawImage(c, 0, 0, cc.width, cc.height);
  cc.style.width = `${cc.width}px`;
  cc.style.height = `${cc.height}px`;
  sBox.appendChild(cc);
  buehne.appendChild(sBox);

  // MUT. The one bar in this game, and it only ever fills.
  const mut = el('div', 'mut');
  mut.appendChild(el('div', 'mut-name', t('runde.mut')));
  const balken = el('div', 'balken');
  const fuell = el('div', 'fuellung');
  fuell.style.width = `${Math.round((lauf.mut / MUT_VOLL) * 100)}%`;
  balken.appendChild(fuell);
  mut.appendChild(balken);
  buehne.appendChild(mut);

  const frage = el('div', 'frage');
  if (q.prompt.kind === 'tenframe' && q.prompt.n >= 0) {
    const f = el('div', 'zehnerfeld');
    f.appendChild(tenFrameCanvas({ n: q.prompt.n, shape: 'herz' }, rahmenSkala()));
    frage.appendChild(f);
  }
  frage.appendChild(el('div', 'zahl-gross',
    String(q.prompt.kind === 'tenframe' && q.prompt.n >= 0
      ? q.prompt.n : Number(q.fact.slice(3)))));
  buehne.appendChild(frage);
  s.appendChild(buehne);

  const karten = el('div', 'karten');
  q.choices.forEach((label, idx) => {
    const b = el('button', undefined, label);
    tap(b, () => antwort(idx, b, frage, karten));
    karten.appendChild(b);
  });
  s.appendChild(karten);

  wurzel.appendChild(s);
}

function feld(frage: HTMLElement, n: number, extra: number): void {
  const f = frage.querySelector('.zehnerfeld');
  if (f) f.replaceChildren(tenFrameCanvas({ n, extra, shape: 'herz' }, rahmenSkala()));
}

function antwort(idx: number, btn: HTMLButtonElement, frage: HTMLElement, karten: HTMLElement): void {
  if (!lauf || lauf.beschaeftigt) return;
  const q = lauf.fragen[lauf.i % lauf.fragen.length];
  const richtig = idx === q.correct;
  lauf.beschaeftigt = true;
  stand.merken(q.fact, richtig);

  if (richtig) {
    // The ONLY place `mut` is written, and the only operator is `+`.
    lauf.mut++;
    btn.classList.add('richtig');
    audio.chimeRight();
    audio.pop();
    const c = zentrumVon(btn);
    fx.burst('stern', c.x, c.y, { n: 12, speed: 200, up: 0.7, life: 0.85 });
    if (q.prompt.kind === 'tenframe' && q.prompt.n >= 0) {
      feld(frage, q.prompt.n, 10 - q.prompt.n);
    }
    if (lauf.mut >= MUT_VOLL) { setTimeout(geschafft, 700); return; }
    setTimeout(weiter, 820);
    return;
  }

  // A miss.
  //
  // Nothing below this line changes a number. The shadow does not
  // advance, the Mut bar does not move, no coin is lost and nothing goes
  // red. The frame fills in with the partner that was actually needed —
  // the correction is a picture — and then the next question comes.
  btn.classList.add('daneben');
  audio.chimeSoft();
  const gewaehlt = Number(btn.textContent);
  if (q.prompt.kind === 'tenframe' && q.prompt.n >= 0 && Number.isFinite(gewaehlt)) {
    feld(frage, q.prompt.n, Math.min(gewaehlt, 10 - q.prompt.n));
  }
  setTimeout(() => {
    if (!lauf) return;
    btn.classList.remove('daneben');
    const gut = karten.children[q.correct] as HTMLButtonElement | undefined;
    if (gut) gut.classList.add('richtig');
    if (q.prompt.kind === 'tenframe' && q.prompt.n >= 0) {
      feld(frage, q.prompt.n, 10 - q.prompt.n);
    }
    audio.sagEinesVon(['say.schauMal1', 'say.schauMal2', 'say.schauMal3']);
    setTimeout(weiter, 1400);
  }, 700);
}

function weiter(): void {
  if (!lauf) return;
  lauf.i++;
  lauf.beschaeftigt = false;
  zeichnen();
}

/**
 * Full Mut. The lantern flares and the shadow goes at once.
 *
 * "At once" is the design: KONZEPT.md wants a finishing move that comes
 * round often enough to be worth having, and a shadow that lingers
 * after the bar is full would be a boss fight, which this is not.
 */
function geschafft(): void {
  if (!lauf || !wurzel) return;
  const id = lauf.id;
  const neuePaare = bekanntePaare().filter((n) => !lauf!.paareVorher.includes(n));
  stand.schattenWeg(id);
  stand.muenzen(4);

  audio.chimeRound();
  fx.clear();
  fx.rain(window.innerWidth, 22);
  fx.shake(4, 0.34);
  audio.sparkle(6);

  wurzel.replaceChildren();
  const blatt = el('div', 'blatt');
  blatt.appendChild(el('h2', undefined, t('runde.weg')));
  const lohn = el('div', 'lohn');
  const l = el('div', 'muenzchen gross');
  l.append(iconCanvas('muenze', 40), el('span', undefined, '+4'));
  lohn.appendChild(l);
  blatt.appendChild(lohn);
  blatt.appendChild(knopf(t('runde.inDieWelt'), () => verlassen(true), 'gold'));
  wurzel.appendChild(blatt);
  lauf = null;

  luma.zeige('say.schattenWeg');
  void neuePaare;
}

function verlassen(weg: boolean): void {
  const zurueck = raus;
  beenden();
  fx.clear();
  luma.weg();
  if (zurueck) zurueck(weg);
}
