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
import { iconCanvas, type Icon } from '../core/icons.js';
import { tenFrameCanvas } from '../core/tenframe.js';
import { buildRound, rundenLaenge, bekanntePaare } from '../games/games.js';
import type { Question } from '../games/types.js';
import { el, tap, knopf, zentrumVon } from './dom.js';
import * as luma from './luma.js';
import { fragebild, karteFuer, kartenKlasse, rahmenSkala, type Fuellung } from './frage.js';

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

/**
 * The three doors that exist, and all three of them are maths.
 *
 * Patrick, after playing it: "ich denke das wörter haus kann erstmal zu.
 * stattdessen drei mathe häuser: verliebte zahlen, nachbarzahlen,
 * addition" — and then, about German: "und dann in der nächsten welt
 * die silben?"
 *
 * So the two subjects are not two doors in one meadow any more, they
 * are two WORLDS. This region is maths, one topic per house, and
 * Deutsch gets a region of its own. That is a better shape than the one
 * it replaces: a house here no longer has to justify what it teaches
 * against the house next door, because every house next door teaches
 * the same subject a step further on.
 *
 * One generator each, deliberately. `Haus.spiel` still takes a list and
 * the Burg will need it, but a house named after a topic should ask
 * that topic — Das Haus der Nachbarzahlen asking a sum is a door that
 * lied about what was inside.
 */
export const HAUS_VERLIEBTE_ZAHLEN: Haus = {
  id: 'verliebte-zahlen',
  spiel: 'verliebte-zahlen',
  name: 'haus.verliebteZahlen',
  fach: 'mathe',
};

/** The middle building, which used to be Das Haus der ersten Laute. */
export const HAUS_NACHBARZAHLEN: Haus = {
  id: 'zahlenreihe',
  spiel: 'zahlenreihe',
  name: 'haus.nachbarzahlen',
  fach: 'mathe',
};

/** The step up, north of the first. Plus, to ten, and nothing else. */
export const HAUS_ADDITION: Haus = {
  id: 'rechenmeister',
  spiel: 'rechenmeister',
  name: 'haus.addition',
  fach: 'mathe',
};

/**
 * Links und rechts, east of the path.
 *
 * The fourth, and the only one in the meadow that asks for no counting
 * at all — which is the point of it. Links und rechts is
 * Raumorientierung and sits in the same first-grade strand as the
 * numbers, so a child who is slow with sums can be quick here and still
 * be earning the star that opens the gates.
 */
export const HAUS_RICHTUNG: Haus = {
  id: 'richtung',
  spiel: 'richtung',
  name: 'haus.richtung',
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
function form(): Fuellung {
  return lauf?.haus.spiel === 'verliebte-zahlen' ? 'herz' : 'perle';
}

/** Letters and numbers want different card shapes. */

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
  buehne.appendChild(fragebild(q.prompt, q, form()));
  s.appendChild(buehne);

  const karten = el('div', `karten${kartenKlasse(q)}`);
  q.choices.forEach((label, idx) => {
    const b = karteFuer(label);
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

/**
 * Which star this house pays, as an icon.
 *
 * Gold and five-pointed for numbers, blue and four-pointed for words.
 * Same shape in two colours was not enough at icon size.
 */
function sternIcon(fach: stand.Fach): Icon {
  return fach === 'wort' ? 'sternWort' : 'stern';
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
