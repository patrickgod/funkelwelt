// A round inside a house.
//
// Ten questions, three minutes, and the machinery is lifted from
// LernInseln because it was built there, tested there and played by a
// real six-year-old there. What is NEW is only what the round is worth:
// over there it paid stars and sweets, here it pays **Mathe-Sterne** and
// **Muenzen**, and the level bar for the subject moves.
//
// That distinction is the whole reason this project exists as a
// separate frame. Sterne are per-subject experience — the record of
// what has been LEARNED — and a gate that wants Mathe 3 is a gate the
// child opened by knowing something. Muenzen are the spendable half.
// Walking about pays coins; only this screen pays stars.
//
// The rule this file must never break, and the one an RPG framing keeps
// trying to undo:
//
//   DAMAGE GOES ONE WAY. A wrong answer costs nothing. No health, no
//   coins, no progress, no red, no buzzer. The card lifts back to where
//   it came from and the CORRECTION IS A PICTURE — the ten-frame
//   filling itself in with the partner that was actually needed — and
//   then the round moves on.

import { t } from '../core/i18n.js';
import * as stand from '../core/spielstand.js';
import * as audio from '../core/audio.js';
import * as fx from '../core/fx.js';
import { iconCanvas } from '../core/icons.js';
import { tenFrameCanvas } from '../core/tenframe.js';
import { buildRound, rundenLaenge, bekanntePaare } from '../games/games.js';
import type { Prompt, Question } from '../games/types.js';
import { el, tap, knopf, zentrumVon } from './dom.js';

export interface Haus {
  /** Save-slot key, so a house can count how often it has been cleared. */
  id: string;
  /** Which generator in `src/games/games.ts`. */
  spiel: string;
  /** i18n key for the name shown over the door. */
  name: string;
  fach: stand.Fach;
}

/** The one door that exists. PLAN.md item 2. */
export const HAUS_VERLIEBTE_ZAHLEN: Haus = {
  id: 'verliebte-zahlen',
  spiel: 'verliebte-zahlen',
  name: 'haus.verliebteZahlen',
  fach: 'mathe',
};

interface Lauf {
  haus: Haus;
  fragen: Question[];
  i: number;
  richtig: number;
  /** Locked while an answer animates, so a double tap cannot answer twice. */
  beschaeftigt: boolean;
}

let lauf: Lauf | null = null;
let wurzel: HTMLElement | null = null;
let raus: (() => void) | null = null;

/**
 * The counters are hearts in this house and beads everywhere else.
 *
 * A heart in a plain addition frame would be decoration; a heart in
 * THIS frame is the metaphor the house is named after, and a
 * six-year-old reads it without being told.
 */
function form(): 'perle' | 'herz' {
  return lauf?.haus.spiel === 'verliebte-zahlen' ? 'herz' : 'perle';
}

/**
 * How big the ten-frame is drawn.
 *
 * Sized from the viewport rather than fixed, and generously: the frame
 * IS the question in this house, and the first version drew it at scale
 * 4 on an iPad, which left it floating in the middle of a mostly empty
 * screen looking like a footnote. It is 68 by 30 source pixels; this
 * aims it at about half the width and a fifth of the height, whichever
 * is the tighter, and keeps to whole numbers because a pixel drawing at
 * a fractional scale has some lines two pixels thick and some three.
 */
function rahmenSkala(): number {
  const nachBreite = (window.innerWidth * 0.5) / 68;
  const nachHoehe = (window.innerHeight * 0.22) / 30;
  return Math.max(3, Math.min(8, Math.floor(Math.min(nachBreite, nachHoehe))));
}

/** Open a house. `zurueck` is called when the child is done with it. */
export function starten(ui: HTMLElement, haus: Haus, zurueck: () => void): void {
  raus = zurueck;
  lauf = {
    haus,
    fragen: buildRound(haus.spiel, rundenLaenge(haus.spiel)),
    i: 0,
    richtig: 0,
    beschaeftigt: false,
  };
  wurzel = ui;
  // Said once per slot, not once per round. Luma repeating herself
  // every three minutes is exactly the "must not talk too much" that
  // KONZEPT.md worries about.
  if (!stand.gehoert('say.imHaus')) {
    stand.merkeGehoert('say.imHaus');
    audio.sagen('say.imHaus');
  }
  frageZeichnen();
}

export function beenden(): void {
  lauf = null;
  wurzel = null;
  raus = null;
}

// ------------------------------------------------------------ the round

function frageZeichnen(): void {
  if (!lauf || !wurzel) return;
  wurzel.replaceChildren();
  const q = lauf.fragen[lauf.i];

  const s = el('div', 'runde');

  const oben = el('div', 'oben');
  oben.appendChild(knopf(t('runde.raus'), () => verlassen()));

  // Progress is ten pips, not "3 / 10". A child who cannot read a
  // fraction can count beads, and the beads say the same thing.
  const pips = el('div', 'pips');
  for (let i = 0; i < lauf.fragen.length; i++) {
    const gerade = i === lauf.i - 1;
    pips.appendChild(el('div',
      `pip ${i < lauf.i ? 'fertig' : i === lauf.i ? 'jetzt' : ''}${gerade ? ' eben' : ''}`));
  }
  oben.appendChild(pips);
  oben.appendChild(beutel(stand.get().sterne[lauf.haus.fach], stand.get().muenzen));
  s.appendChild(oben);

  const buehne = el('div', 'buehne-q');
  buehne.appendChild(fragebild(q.prompt, q));
  s.appendChild(buehne);

  const karten = el('div', 'karten');
  q.choices.forEach((label, idx) => {
    const b = el('button', undefined, label);
    tap(b, () => antwort(idx, b, buehne, karten));
    karten.appendChild(b);
  });
  s.appendChild(karten);

  wurzel.appendChild(s);
}

function beutel(sterne: number, muenzen: number): HTMLElement {
  const p = el('div', 'beutel-q');
  const a = el('div', 'muenzchen');
  a.append(iconCanvas('stern', 30), el('span', undefined, String(sterne)));
  const b = el('div', 'muenzchen');
  b.append(iconCanvas('muenze', 30), el('span', undefined, String(muenzen)));
  p.append(a, b);
  return p;
}

/** How a prompt is drawn. Nothing here is a sentence the child must read. */
function fragebild(p: Prompt, q: Question): HTMLElement {
  const box = el('div', 'frage');
  switch (p.kind) {
    case 'tenframe': {
      if (p.n >= 0) {
        const f = el('div', 'zehnerfeld');
        f.appendChild(tenFrameCanvas({ n: p.n, shape: form() }, rahmenSkala()));
        box.appendChild(f);
      }
      if (p.numeral) {
        const n = p.n >= 0 ? p.n : Number(q.fact.slice(3));
        box.appendChild(el('div', 'zahl-gross', String(n)));
      }
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
      // The letters, syllables, shapes and writing houses use the other
      // prompt kinds. Their generators are still in LernInseln and come
      // across when their doors do; see src/games/games.ts.
      break;
  }
  return box;
}

function feldErsetzen(buehne: HTMLElement, n: number, extra: number): void {
  const f = buehne.querySelector('.zehnerfeld');
  if (f) f.replaceChildren(tenFrameCanvas({ n, extra, shape: form() }, rahmenSkala()));
}

function antwort(idx: number, btn: HTMLButtonElement, buehne: HTMLElement, karten: HTMLElement): void {
  if (!lauf || lauf.beschaeftigt) return;
  const q = lauf.fragen[lauf.i];
  const richtig = idx === q.correct;
  lauf.beschaeftigt = true;

  stand.merken(q.fact, richtig);

  if (richtig) {
    lauf.richtig++;
    btn.classList.add('richtig');
    audio.chimeRight();
    audio.pop();
    // The burst comes off the CARD the child touched, not off the middle
    // of the screen, so the reaction belongs to the tap.
    const c = zentrumVon(btn);
    fx.burst(form() === 'herz' ? 'herz' : 'stern', c.x, c.y,
      { n: 12, speed: 200, up: 0.7, life: 0.85 });
    // The frame completes itself, which is the reward: the picture of
    // the fact the child has just recalled.
    if (q.prompt.kind === 'tenframe' && q.prompt.n >= 0) {
      feldErsetzen(buehne, q.prompt.n, 10 - q.prompt.n);
    }
    setTimeout(weiter, 820);
    return;
  }

  // A miss. Nothing is taken away, nothing turns red, no buzzer.
  btn.classList.add('daneben');
  audio.chimeSoft();
  const gewaehlt = Number(btn.textContent);
  if (q.prompt.kind === 'tenframe' && q.prompt.n >= 0 && Number.isFinite(gewaehlt)) {
    // What that choice WOULD have made, in the frame. The correction is
    // a picture of the child's own answer, not a word for it.
    feldErsetzen(buehne, q.prompt.n, Math.min(gewaehlt, 10 - q.prompt.n));
  }
  setTimeout(() => {
    if (!lauf) return;
    btn.classList.remove('daneben');
    const gut = karten.children[q.correct] as HTMLButtonElement | undefined;
    if (gut) gut.classList.add('richtig');
    if (q.prompt.kind === 'tenframe' && q.prompt.n >= 0) {
      feldErsetzen(buehne, q.prompt.n, 10 - q.prompt.n);
    }
    // Not one of these says wrong. The frame is already showing what
    // the answer was; a voice saying it again would be a grown-up
    // pointing at it.
    audio.sagEinesVon(['say.schauMal1', 'say.schauMal2', 'say.schauMal3']);
    setTimeout(weiter, 1400);
  }, 700);
}

function weiter(): void {
  if (!lauf) return;
  lauf.i++;
  lauf.beschaeftigt = false;
  if (lauf.i >= lauf.fragen.length) fertig();
  else frageZeichnen();
}

function verlassen(): void {
  const zurueck = raus;
  beenden();
  fx.clear();
  if (zurueck) zurueck();
}

// ----------------------------------------------------------- the payout

function fertig(): void {
  if (!lauf || !wurzel) return;
  const haus = lauf.haus;
  const fach = haus.fach;

  const sterneVorher = stand.get().sterne[fach];
  const muenzenVorher = stand.get().muenzen;
  const stufeVorher = stand.stufe(fach);
  const fortschrittVorher = stand.stufenFortschritt(fach);
  const paareVorher = bekanntePaare();

  const alle = lauf.richtig === lauf.fragen.length;
  const sterne = lauf.richtig;
  const muenzen = lauf.richtig + (alle ? 5 : 2);

  stand.sterne(fach, sterne);
  stand.muenzen(muenzen);
  const s = stand.get();
  s.geschafft[haus.id] = (s.geschafft[haus.id] ?? 0) + 1;
  stand.sichern();

  const stufeNachher = stand.stufe(fach);
  const aufgestiegen = stufeNachher > stufeVorher;
  const neuePaare = bekanntePaare().filter((n) => !paareVorher.includes(n));

  audio.chimeRound();
  audio.sagEinesVon(['say.gutGemacht1', 'say.gutGemacht2', 'say.gutGemacht3']);
  fx.clear();
  fx.rain(window.innerWidth, alle ? 46 : 26);

  wurzel.replaceChildren();
  const blatt = el('div', 'blatt');
  blatt.appendChild(el('h2', undefined, t('runde.fertig')));
  // Which house this was, for the grown-up in the room. The child does
  // not need it and cannot read it; the parent glancing over at a
  // screen full of hearts very much does.
  blatt.appendChild(el('p', 'wo', t(haus.name)));

  // The purse starts on what the child had BEFORE the round and the
  // stars fly into it one by one. Showing the new total straight away
  // with a "+7" beside it is a receipt; watching seven stars arrive is
  // the reward actually happening.
  const kasse = el('div', 'kasse');
  const sternMuenze = el('div', 'muenzchen gross');
  const sternZahl = el('span', undefined, String(sterneVorher));
  sternMuenze.append(iconCanvas('stern', 40), sternZahl);
  const geldMuenze = el('div', 'muenzchen gross');
  const geldZahl = el('span', undefined, String(muenzenVorher));
  geldMuenze.append(iconCanvas('muenze', 40), geldZahl);
  kasse.append(sternMuenze, geldMuenze);
  blatt.appendChild(kasse);

  const lohn = el('div', 'lohn');
  const l1 = el('div', 'muenzchen');
  l1.append(iconCanvas('stern', 34), el('span', undefined, `+${sterne}`));
  const l2 = el('div', 'muenzchen');
  l2.append(iconCanvas('muenze', 34), el('span', undefined, `+${muenzen}`));
  lohn.append(l1, l2);
  blatt.appendChild(lohn);

  // The level bar. This is the RPG half of the promise — getting
  // stronger happens to you, and it happens where you can see it.
  const leiste = el('div', 'stufe');
  leiste.appendChild(el('div', 'stufe-name',
    `${t(fach === 'mathe' ? 'fach.mathe' : 'fach.wort')} ${stufeNachher}`));
  const balken = el('div', 'balken');
  const fuell = el('div', 'fuellung');
  fuell.style.width = `${Math.round(fortschrittVorher * 100)}%`;
  balken.appendChild(fuell);
  leiste.appendChild(balken);
  blatt.appendChild(leiste);

  const reihe = el('div');
  reihe.appendChild(knopf(t('runde.nochmal'), () => {
    if (!wurzel || !raus) return;
    const ui = wurzel, zurueck = raus;
    beenden();
    fx.clear();
    starten(ui, haus, zurueck);
  }));
  reihe.appendChild(knopf(t('runde.inDieWelt'), () => verlassen(), 'gold'));
  blatt.appendChild(reihe);
  wurzel.appendChild(blatt);
  lauf = null;

  // Now that the sheet is in the document it has a position, so the
  // flight can be aimed.
  requestAnimationFrame(() => {
    fliegen('stern', l1, sternMuenze, sternZahl, sterne, sterneVorher, 0.28);
    fliegen('funke', l2, geldMuenze, geldZahl, muenzen, muenzenVorher, 0.55);
    setTimeout(() => {
      // The bar moves after the stars have landed in it, because that
      // is the order the child would tell the story in.
      fuell.style.width = `${Math.round(
        (aufgestiegen ? 1 : stand.stufenFortschritt(fach)) * 100)}%`;
      if (aufgestiegen) {
        setTimeout(() => {
          fuell.classList.add('sofort');
          fuell.style.width = `${Math.round(stand.stufenFortschritt(fach) * 100)}%`;
          leiste.classList.add('neu');
          audio.sparkle(6);
          fx.shake(4, 0.3);
          audio.sagen('say.neueStufe');
        }, 620);
      }
    }, 900);
    if (neuePaare.length) {
      setTimeout(() => {
        audio.sparkle(6);
        fx.burst('herz', window.innerWidth / 2, window.innerHeight / 2,
          { n: 18, speed: 190, up: 0.8, life: 1.1 });
      }, 1500);
    }
  });
}

/**
 * Fly a reward into its counter, and count the counter up as they land.
 *
 * The number does not simply become the new total: each arrival adds its
 * share, so the digits climb in step with the things hitting them.
 * Capped at eight, because ten stars arriving one after another is a
 * queue and a child waits for a queue rather than enjoying it.
 */
function fliegen(
  art: 'stern' | 'funke',
  von: Element, nach: Element, zahl: HTMLElement,
  menge: number, start: number, warten: number,
): void {
  if (menge <= 0) { zahl.textContent = String(start); return; }
  const schuss = Math.min(8, menge);
  const a = zentrumVon(von);
  const b = zentrumVon(nach);
  let gelandet = 0;
  for (let i = 0; i < schuss; i++) {
    fx.fly(art, a, b, warten + i * 0.08, () => {
      gelandet++;
      const anteil = Math.round((menge * gelandet) / schuss);
      zahl.textContent = String(start + anteil);
      nach.classList.add('stups');
      setTimeout(() => nach.classList.remove('stups'), 220);
      audio.ping(gelandet - 1);
    });
  }
}
