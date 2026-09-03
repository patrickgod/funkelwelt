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
import { formCanvas, silhouetteCanvas, type Form } from '../games/formen.js';
import { hasBild, bildCanvas } from '../games/wortbilder.js';
import type { Prompt, Question } from '../games/types.js';
import { el, tap, knopf, zentrumVon } from './dom.js';
import * as luma from './luma.js';

export interface Haus {
  /** Save-slot key, so a house can count how often it has been cleared. */
  id: string;
  /**
   * Which generator in `src/games/games.ts`, or several in rotation.
   * See `buildRound` for why the rotation is by position.
   */
  spiel: string | string[];
  /** i18n key for the name shown over the door. */
  name: string;
  fach: stand.Fach;
}

/** The three doors that exist. */
export const HAUS_VERLIEBTE_ZAHLEN: Haus = {
  id: 'verliebte-zahlen',
  spiel: 'verliebte-zahlen',
  name: 'haus.verliebteZahlen',
  fach: 'mathe',
};

/**
 * Das Haus der ersten Laute.
 *
 * The first house that pays Wort-Sterne, and until it existed the
 * per-subject design had exactly one subject.
 */
export const HAUS_ERSTE_LAUTE: Haus = {
  id: 'anlaute',
  // Anlaute and Silben together, alternating. Both are phonologische
  // Bewusstheit — hearing the shape of a spoken word — and German first
  // grade teaches them side by side rather than as two subjects, so one
  // house asking both is the ordinary arrangement and not a shortcut.
  // The word is HIDDEN for the first-sound question and SHOWN for the
  // syllable one, which the prompt already carries per question.
  spiel: ['anlaute', 'silben'],
  name: 'haus.ersteLaute',
  fach: 'wort',
};

/**
 * Das Haus der Formen.
 *
 * Shapes and patterns are maths — they are in the same strand of the
 * curriculum as counting — so this house pays Mathe-Sterne rather than
 * introducing a third kind of star and a third gate.
 *
 * That is not a filing decision, it is the design one. A child who
 * finds adding hard and sees shapes instantly now has a second way to
 * earn the star that opens the Zahlen gate, and can be visibly good at
 * maths without being fast at sums. A third currency would have said
 * the opposite: that the thing they are good at is a different, lesser
 * subject.
 *
 * It is also the only house that works with the sound switched off, so
 * it is the one to point a parent at in a waiting room.
 */
export const HAUS_FORMEN: Haus = {
  id: 'formen',
  spiel: ['formen', 'muster'],
  name: 'haus.formen',
  fach: 'mathe',
};

/**
 * Das Haus der Rechenmeister.
 *
 * The step up from the pairs that make ten, and it stands next door to
 * that house on purpose: the beginner's door and the harder one are
 * neighbours in the same corner of the meadow, told apart by their
 * plaques rather than by a sign a child would have to read.
 *
 * Three generators, all of them within twenty and all of them ported
 * from Lernkiste with their didactics intact: plus and minus to ten
 * (with some of it running backwards, because a child who can do 6+3
 * and not 9-3 has learned a procedure rather than a fact), the number
 * line with a gap in the middle, and the doubles.
 *
 * Nothing gates this door. A child who is not ready walks in, finds it
 * hard, and walks out — and neither the walking out nor a wrong answer
 * costs them anything, which is the whole reason it is safe to leave it
 * open.
 */
export const HAUS_RECHENMEISTER: Haus = {
  id: 'rechenmeister',
  spiel: ['rechenmeister', 'zahlenreihe', 'zwillinge'],
  name: 'haus.rechenmeister',
  fach: 'mathe',
};

interface Lauf {
  haus: Haus;
  fragen: Question[];
  i: number;
  richtig: number;
  /** Locked while an answer animates, so a double tap cannot answer twice. */
  beschaeftigt: boolean;
  daneben: number;
  /**
   * Which pairs to ten were already solid when this round STARTED.
   *
   * Captured here and not at the end, which is where it was first
   * written and where it could never have worked: `stand.merken` runs as
   * each question is answered, so by the time the payout is calculated
   * the pair has already been known for several minutes and "what is
   * new" is always empty. The celebration was unreachable, and it looked
   * completely correct — it was only found by trying to take a
   * screenshot of it.
   */
  paareVorher: number[];
  /**
   * Whether Luma has turned up to help.
   *
   * KONZEPT.md: a child who is struggling does not lose — the encounter
   * simply takes longer, and after a few Luma turns up and helps. What
   * "helps" means here is that the ten-frame comes BACK for the rest of
   * the round even on facts the child had got to the remembering band,
   * which is concrete-before-abstract being re-offered rather than a
   * hint being given. Nothing is taken away and nothing is marked.
   */
  hilft: boolean;
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

/** Letters and numbers want different card shapes. */
function kartenKlasse(q: Question): string {
  if (q.choices.some((c) => c.startsWith('form:'))) return ' formen';
  if (q.choices.some((c) => c.length > 2)) return ' worte';
  return '';
}

/**
 * How big a shape is drawn on a card.
 *
 * Derived from the viewport rather than fixed, for the same reason the
 * ten-frame is: this runs on a phone in a waiting room and on an iPad
 * on a kitchen table, and rule 12 wants the card to stay a 64-pixel
 * touch target on both.
 */
function formSkala(): number {
  return Math.max(2, Math.min(6, Math.floor((window.innerHeight * 0.13) / 34)));
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
/** File stems have no umlauts, because file names on a server do not. */
export function stamm(wort: string): string {
  return wort.toLowerCase()
    .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss');
}

/** Which star this house pays. Two subjects, two stars. */
function sternIcon(fach: stand.Fach): 'stern' | 'sternWort' {
  return fach === 'wort' ? 'sternWort' : 'stern';
}

function bildSkala(): number {
  return Math.max(2, Math.min(6, Math.floor(window.innerHeight / 190)));
}

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
    daneben: 0,
    hilft: false,
    paareVorher: bekanntePaare(),
  };
  wurzel = ui;
  frageZeichnen();
  // Said once per adventurer, not once per round. Luma repeating herself
  // every three minutes is exactly the "must not talk too much" that
  // KONZEPT.md worries about.
  luma.einmal('say.imHaus');
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

  // Luma is helping: the frame comes back, even on a fact the child had
  // got past needing it. Concrete before abstract, offered again.
  if (lauf.hilft && q.prompt.kind === 'tenframe' && q.prompt.n < 0) {
    q.prompt.n = Number(q.fact.slice(3));
  }

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

  const karten = el('div', `karten${kartenKlasse(q)}`);
  q.choices.forEach((label, idx) => {
    const b = el('button');
    if (label.startsWith('form:')) {
      // The card IS the shape. Nothing is written on it, which is the
      // whole point of this house — rule 14, and a six-year-old who
      // cannot yet read "Rechteck" can still answer every question in
      // here correctly.
      b.appendChild(formCanvas(label.slice(5) as Form, formSkala()));
      b.setAttribute('aria-label', label.slice(5));
    } else {
      b.textContent = label;
    }
    tap(b, () => antwort(idx, b, buehne, karten));
    karten.appendChild(b);
  });
  s.appendChild(karten);

  wurzel.appendChild(s);
}

function beutel(sterne: number, muenzen: number): HTMLElement {
  const p = el('div', 'beutel-q');
  const a = el('div', 'muenzchen');
  a.append(iconCanvas(sternIcon(lauf!.haus.fach), 30), el('span', undefined, String(sterne)));
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
    case 'form': {
      // The question is the shape in flat grey, at a different size
      // from the cards, with its name spoken over it. See
      // `silhouette()` in games/formen.ts for why it is shown at all:
      // Lernkiste asked this with a voice and an empty stage, which
      // stops being a question the moment a parent switches the sound
      // off — and this is the house to point a parent at in a waiting
      // room precisely because it does not need the sound.
      const holder = el('div', 'formfrage');
      holder.appendChild(silhouetteCanvas(p.frage as Form, formSkala() + 1));
      box.appendChild(holder);
      const key = `say.form${p.frage[0].toUpperCase()}${p.frage.slice(1)}`;
      const hoeren = el('button', 'hoeren');
      hoeren.appendChild(iconCanvas('ohr', 68));
      tap(hoeren, () => audio.say(key.replace(/\./g, '-').toLowerCase(), t(key)));
      box.appendChild(hoeren);
      setTimeout(() => audio.say(key.replace(/\./g, '-').toLowerCase(), t(key)), 260);
      break;
    }
    case 'muster': {
      const skala = formSkala();
      const zeile = el('div', 'muster');
      for (const f of p.reihe) {
        const zelle = el('div', 'zelle');
        // Named as well as drawn. A screen reader gets a row it can
        // read out, and `tools/verify.mjs` gets a way to work out what
        // the row continues with WITHOUT asking the code that answers
        // it — which is the only way that check is worth anything.
        zelle.setAttribute('aria-label', f);
        zelle.appendChild(formCanvas(f as Form, skala));
        zeile.appendChild(zelle);
      }
      // The gap is at the END and it is drawn as an empty frame, so the
      // question reads as "what goes HERE" rather than as "what comes
      // after" — which is a question about the row rather than about
      // the last shape in it.
      const luecke = el('div', 'zelle luecke');
      // Sized from the same scale the shapes were drawn at rather than
      // from its own clamp, so the gap is exactly one shape wide at
      // every viewport instead of nearly one.
      luecke.style.width = `${34 * skala}px`;
      luecke.style.height = `${34 * skala}px`;
      luecke.textContent = '?';
      zeile.appendChild(luecke);
      box.appendChild(zeile);
      break;
    }
    case 'wort': {
      // A picture AND a spoken word — two channels for the same thing,
      // and both are here on purpose. AGENTS.md rule 15 says the sound
      // must be switchable off in two taps, and an exercise that stops
      // working when a parent uses that switch in a waiting room is a
      // broken exercise. So the picture carries it when the sound is
      // off, and the ear button is there for a child who is not sure
      // what the drawing is.
      const bild = hasBild(p.wort) ? bildCanvas(p.wort, bildSkala()) : null;
      if (bild) {
        const holder = el('div', 'wortbild');
        holder.appendChild(bild);
        box.appendChild(holder);
      }
      const hoeren = el('button', 'hoeren');
      hoeren.appendChild(iconCanvas('ohr', 68));
      tap(hoeren, () => audio.say(`wort-${stamm(p.wort)}`, p.wort));
      box.appendChild(hoeren);
      // The word is shown in the syllable house and hidden in the
      // letters house: clapping a word you can SEE is the exercise a
      // teacher actually sets, and guessing a first sound from a written
      // word is not a listening exercise at all.
      if (p.zeige) box.appendChild(el('div', 'wortzeile', p.wort));
      setTimeout(() => audio.say(`wort-${stamm(p.wort)}`, p.wort), 260);
      break;
    }
    default:
      // The shapes, patterns and writing houses use the remaining prompt
      // kinds. Their generators are still in LernInseln and come across
      // when their doors do; see src/games/games.ts.
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
  lauf.daneben++;
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
    // Three misses and Luma turns up. Once per round at most: she is
    // help, and help that arrives every time a child slips is somebody
    // standing over them.
    if (lauf && lauf.daneben === 3 && !lauf.hilft) {
      lauf.hilft = true;
      setTimeout(() => luma.zeige('say.hilfe', weiter), 900);
    } else {
      setTimeout(weiter, 1400);
    }
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
  const paareVorher = lauf.paareVorher;

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

  fx.clear();

  // A pair coming good outranks the payout, so it is shown FIRST.
  //
  // This is the thing the whole app is actually for. Stars and coins are
  // a round being finished; two numbers becoming friends in BOTH
  // directions is a child having learned something they will still know
  // next year, and it happens perhaps a dozen times in the life of the
  // save. It gets the bigger screen.
  if (neuePaare.length) {
    paarZeigen(neuePaare[0], () => blattZeigen(haus, fach, alle, sterne, muenzen,
      sterneVorher, muenzenVorher, fortschrittVorher, aufgestiegen));
    lauf = null;
    return;
  }

  audio.chimeRound();
  audio.sagEinesVon(['say.gutGemacht1', 'say.gutGemacht2', 'say.gutGemacht3']);
  fx.rain(window.innerWidth, alle ? 46 : 26);
  blattZeigen(haus, fach, alle, sterne, muenzen,
    sterneVorher, muenzenVorher, fortschrittVorher, aufgestiegen);
  lauf = null;
}

/**
 * Two numbers have become friends.
 *
 * Shown as a PICTURE, and it has to be: the line Luma speaks over it
 * cannot contain the numbers, because every line she says is a fixed
 * MP3 generated at build time. That constraint turned out to be the
 * right design anyway — AGENTS.md rule 14 says no text may be
 * load-bearing, and "7 and 3" spoken aloud would have been exactly that.
 * So the two numerals sit either side of a heart, and underneath them
 * the ten-frame shows the fact itself, in the same hearts the child has
 * been looking at for ten questions.
 */
function paarZeigen(n: number, danach: () => void): void {
  if (!wurzel) return;
  audio.chimeRound();
  fx.rain(window.innerWidth, 40);

  wurzel.replaceChildren();
  const blatt = el('div', 'blatt paar');
  blatt.appendChild(el('h2', undefined, t('runde.freunde')));

  const zeile = el('div', 'paar-zeile');
  zeile.appendChild(el('span', 'paar-zahl', String(n)));
  zeile.appendChild(iconCanvas('herz', 102));
  zeile.appendChild(el('span', 'paar-zahl', String(10 - n)));
  blatt.appendChild(zeile);

  const feld = el('div', 'zehnerfeld');
  feld.appendChild(tenFrameCanvas({ n, extra: 10 - n, shape: 'herz' }, rahmenSkala()));
  blatt.appendChild(feld);

  blatt.appendChild(knopf(t('runde.weiter'), () => { luma.weg(); danach(); }, 'gold'));
  wurzel.appendChild(blatt);

  requestAnimationFrame(() => {
    const c = zentrumVon(zeile);
    fx.burst('herz', c.x, c.y, { n: 22, speed: 210, up: 0.8, life: 1.2 });
    audio.sparkle(6);
    setTimeout(() => luma.zeige('say.neuesPaar'), 500);
  });
}

function blattZeigen(
  haus: Haus, fach: stand.Fach, alle: boolean,
  sterne: number, muenzen: number,
  sterneVorher: number, muenzenVorher: number,
  fortschrittVorher: number, aufgestiegen: boolean,
): void {
  if (!wurzel) return;
  void alle;
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
  sternMuenze.append(iconCanvas(sternIcon(fach), 40), sternZahl);
  const geldMuenze = el('div', 'muenzchen gross');
  const geldZahl = el('span', undefined, String(muenzenVorher));
  geldMuenze.append(iconCanvas('muenze', 40), geldZahl);
  kasse.append(sternMuenze, geldMuenze);
  blatt.appendChild(kasse);

  const lohn = el('div', 'lohn');
  const l1 = el('div', 'muenzchen');
  l1.append(iconCanvas(sternIcon(fach), 34), el('span', undefined, `+${sterne}`));
  const l2 = el('div', 'muenzchen');
  l2.append(iconCanvas('muenze', 34), el('span', undefined, `+${muenzen}`));
  lohn.append(l1, l2);
  blatt.appendChild(lohn);

  // The level bar. This is the RPG half of the promise — getting
  // stronger happens to you, and it happens where you can see it.
  const leiste = el('div', 'stufe');
  leiste.appendChild(el('div', 'stufe-name',
    `${t(fach === 'mathe' ? 'fach.mathe' : 'fach.wort')} ${stand.stufe(fach)}`));
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
          luma.zeige('say.neueStufe');
        }, 620);
      }
    }, 900);
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
