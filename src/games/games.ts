// The task generators — one per house.
//
// Lifted from LernInseln (`C:\Development\Lernkiste`), where this is the
// part of the project that was built, tested and played with a real
// six-year-old. KONZEPT.md is explicit that Funkelwelt is a new FRAME
// around the same teaching rather than a new app, and this file is
// where that promise gets kept: the didactics below are not being
// re-derived, they are being carried across unchanged.
//
// Everything here follows the didactics DESIGN.md set out over there,
// which are standard and well-evidenced, so we are not inventing our
// own:
//
//   Concrete before abstract. Never show `7 + _ = 10` alone to a child
//   at this stage. Show a ten-frame with seven cells filled: the gap is
//   VISIBLE, and the child sees "three missing" before they can
//   calculate it. The frame fades later.
//
//   Both directions. `7 -> 3` and `3 -> 7` are different retrievals to
//   a beginner even though they are the same fact to us.
//
//   The distractors are chosen, not random. A choice that is obviously
//   wrong teaches nothing; a choice that is off by one teaches the
//   child to look at the frame rather than to guess.
//
// WHAT IS HERE AND WHAT IS NOT
//
// The four number houses and the first two LANGUAGE ones — Anlaute and
// Silben, which came across when their door did. They brought the word
// list and the word pictures with them, and both of those are code, so
// they copied verbatim like everything else.
//
// Still over in LernInseln: the first words, the rhymes, the shapes, the
// patterns and the two writing houses. Same rule as before — they cross
// when their doors do.
//
// The four NUMBER houses, and the two language ones. LernInseln also has the
// letters, the syllables, the first words, the rhymes, the shapes, the
// patterns and the two writing houses, and every one of them implements
// the same `Game` interface and will drop in unchanged — but each also
// drags in its own word list, word pictures, shape drawings or writing
// font, which together are about forty kilobytes of source for doors
// that do not exist yet.
//
// Funkelwelt has three doors. Shipping the vocabulary for the rest of
// them
// to a child's iPad, with nothing calling it and nothing in the suite
// looking at it, is worse than not shipping it: AGENTS.md's definition
// of done requires somebody to have LOOKED at a thing, and nobody can
// look at a house with no door. They come across when their doors do.

import type { Game, Question, Prompt } from './types.js';
import { staerkeVon } from '../core/spielstand.js';
import { FAHRZEUGE, type Richtung } from './fahrzeuge.js';
import { WOERTER as SILBEN_WOERTER, andereTeilungen } from './silben.js';
import { silbenZumSchreiben } from './schrift.js';

function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Weighted pick over facts, favouring the shaky ones.
 *
 * Spaced repetition on the pairs that are shaky, not uniform random.
 * 5+5 is learned in a day; 7+3 and 6+4 take weeks. Strength 0 comes up
 * four times as often as strength 3, which is enough of a tilt to
 * matter over a fortnight and gentle enough that a round never feels
 * like it is drilling one thing.
 */
export function weightedPick(facts: string[]): string {
  const weights = facts.map((f) => 4 - staerkeVon(f));
  const total = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < facts.length; i++) {
    r -= weights[i];
    if (r <= 0) return facts[i];
  }
  return facts[facts.length - 1];
}

/** Three or four numeric cards, one right, the rest plausibly wrong. */
function numberChoices(correct: number, span: number, count: number, max: number): string[] {
  const wrong = new Set<number>();
  // Neighbours first: off-by-one is the mistake a child actually makes,
  // and a card that is off by one is the card that teaches them to
  // count the frame instead of guessing.
  const candidates = [correct - 1, correct + 1, correct - 2, correct + 2, correct + 3, correct - 3];
  for (const c of candidates) {
    if (wrong.size >= count - 1) break;
    if (c === correct || c < 0 || c > max) continue;
    if (Math.abs(c - correct) > span) continue;
    wrong.add(c);
  }
  while (wrong.size < count - 1) {
    const c = Math.floor(Math.random() * (max + 1));
    if (c !== correct) wrong.add(c);
  }
  return shuffle([correct, ...wrong]).map(String);
}

// ------------------------------------------- Haus der verliebten Zahlen

/**
 * Partners to ten, in both directions.
 *
 * The band a pair is in is per-pair and never announced. A child can be
 * remembering 5+5 while still seeing 7+3, which is exactly how it
 * really works.
 */
export const verliebteZahlen: Game = {
  id: 'verliebte-zahlen',
  facts: () => [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => `vz:${n}`),
  next(pick) {
    const fact = pick(this.facts());
    const n = Number(fact.slice(3));
    const partner = 10 - n;
    const s = staerkeVon(fact);

    // Seeing -> Knowing -> Remembering, per pair. The frame is filled,
    // then gone.
    // The ten-frame is ALWAYS shown.
    //
    // It used to vanish once a fact was strong (`s >= 3`), on the
    // didactic argument that the scaffold should fade as mastery
    // arrives. Patrick, playing it: "ich sehe manchmal 4 zahlen zur
    // auswahl und nicht immer die matrix mit den herzen. es sollte
    // immer die matrix zu sehen sein."
    //
    // He read it as a bug, which is the answer: a support that removes
    // itself without warning is indistinguishable from a broken screen,
    // and the child cannot know why the picture went away. Fading it
    // may still be right one day, but it has to be something the child
    // can SEE happening — a frame that dims, not one that is missing.
    const prompt: Prompt = { kind: 'tenframe', n, numeral: true };

    const count = s === 0 ? 3 : 4;
    return {
      fact,
      prompt,
      choices: numberChoices(partner, 3, count, 10),
      correct: -1,   // filled in by buildRound
      showOnMiss: { kind: 'tenframe', n: 10, numeral: false },
    } as Question;
  },
};

// -------------------------------------------- Haus der Nachbarzahlen

export const zahlenreihe: Game = {
  id: 'zahlenreihe',
  // Nachbarzahlen, and the whole of this game lives at ten or below.
  //
  // It used to run to twenty. First grade meets the numbers to ten and
  // stays there for a long while, and a child who is still finding the
  // number that comes after seven does not need seventeen in the same
  // exercise — the bigger numbers are not harder in kind, only in
  // reading, which is a different lesson and not this one.
  facts: () => Array.from({ length: 9 }, (_, i) => `zr:${i + 1}`),
  next(pick) {
    const fact = pick(this.facts());
    const missing = Number(fact.slice(3));
    // A window of five around the gap, clipped to 0..10, gap in the
    // middle where possible — a gap at the end is a different and
    // harder task, and this house is not that house.
    const start = Math.max(0, Math.min(6, missing - 2));
    const seq: (number | null)[] = [];
    for (let i = 0; i < 5; i++) seq.push(start + i === missing ? null : start + i);
    return {
      fact,
      prompt: { kind: 'reihe', seq },
      choices: numberChoices(missing, 3, 4, 10),
      correct: -1,
      showOnMiss: { kind: 'reihe', seq: seq.map((v) => (v === null ? missing : v)) },
    } as Question;
  },
};

// -------------------------------------------- Haus der Rechenmeister

export const rechenmeister: Game = {
  id: 'rechenmeister',
  facts: () => {
    const out: string[] = [];
    for (let a = 0; a <= 10; a++) for (let b = 0; a + b <= 10; b++) out.push(`rm:${a}+${b}`);
    return out;
  },
  next(pick) {
    const fact = pick(this.facts());
    const [a, b] = fact.slice(3).split('+').map(Number);
    // Addition, and only addition.
    //
    // Two in five of these used to run backwards as a subtraction, on
    // the argument that a child who can do 6+3 and not 9-3 has learned
    // a procedure rather than a fact. That argument is sound and it is
    // for later: the ask here is addition to ten, and mixing the minus
    // in means a child meets two operations in one round before they
    // are fluent in either.
    const prompt: Prompt = { kind: 'rechnung', a, b, op: '+' };
    const answer = a + b;
    return {
      fact,
      prompt,
      choices: numberChoices(answer, 3, 4, 10),
      correct: -1,
      showOnMiss: { kind: 'tenframe', n: answer, numeral: true },
    } as Question;
  },
};

// ------------------------------------------- Haus von links und rechts

/**
 * Which of these is going that way?
 *
 * Four vehicles, all five kinds and both directions available, and
 * exactly one of them going the way the arrow asks. The child scans the
 * row and taps it.
 *
 * The question is an ARROW rather than a word or a voice. Rule 14 says
 * the child cannot read "rechts"; rule 15 says the sound is switchable
 * off in two taps, so the question has to survive being silent. An
 * arrow is neither of those things, and it is the same arrow as the
 * signpost in the meadow.
 *
 * The fact is the DIRECTION and not the vehicle, because that is what
 * is being practised. A child who is shaky on left should meet left
 * again, whether it arrives on a bus or a bicycle.
 */
export const richtung: Game = {
  id: 'richtung',
  facts: () => ['ri:links', 'ri:rechts'],
  next(pick) {
    const fact = pick(this.facts());
    const nach = fact.slice(3) as Richtung;
    const weg: Richtung = nach === 'rechts' ? 'links' : 'rechts';
    // Four different vehicles, so the odd one out cannot be spotted by
    // "the only bus" instead of by which way it is pointing.
    const welche = shuffle(FAHRZEUGE.slice()).slice(0, 4);
    const karten = welche.map((f, i) => `fz:${f}:${i === 0 ? nach : weg}`);
    return {
      fact,
      prompt: { kind: 'richtung', nach },
      choices: shuffle(karten),
      correct: -1,
    } as Question;
  },
};

// -------------------------------------------- Das Haus der Silben

/**
 * Where do the syllables go?
 *
 * The word is shown whole and the cards are three ways of cutting it
 * up, one of which is right. This is Silbenbögen — the exercise a
 * German first-grader does before they read anything else — and it is
 * chosen over "hear the word and pick it" for one reason: it needs no
 * sound at all.
 *
 * Rule 15 says the sound is switchable off in two taps, and reading
 * exercises are where that rule is hardest to keep, because reading
 * usually needs the word delivered somehow. Splitting a word you can
 * SEE needs nothing delivered. The voice is still there for a child who
 * wants to hear it, and it adds the sound of the syllables to the sight
 * of them, which is the whole point of the method — but nothing breaks
 * when it is off.
 */
export const silbenLesen: Game = {
  id: 'silben-lesen',
  facts: () => SILBEN_WOERTER.map((w) => `sl:${w.wort}`),
  next(pick) {
    const fact = pick(this.facts());
    const w = SILBEN_WOERTER.find((x) => x.wort === fact.slice(3)) ?? SILBEN_WOERTER[0];
    const gut = w.teile.join('·');
    const falsch: string[] = [];
    for (const t of shuffle(andereTeilungen(w))) {
      const wie = t.join('·');
      if (wie !== gut && !falsch.includes(wie)) falsch.push(wie);
      if (falsch.length === 2) break;
    }
    return {
      fact,
      prompt: { kind: 'silbenwort', wort: w.wort },
      choices: shuffle([gut, ...falsch]),
      correct: -1,
    } as Question;
  },
};

/**
 * Write this syllable, with a finger.
 *
 * The only exercise in the game with no answer cards at all: the answer
 * IS the tracing, and the round moves on when the last stroke lands.
 *
 * It asks for a SYLLABLE and not a whole word, and not a single letter.
 * A letter on its own is handwriting drill; a whole word is four
 * letters of motor control before anything happens. A syllable is the
 * unit the reading house next door is teaching, so a child writes the
 * thing they have just learned to see — which is the entire argument
 * for putting these two houses in the same village.
 */
export const silbenSchreiben: Game = {
  id: 'silben-schreiben',
  facts: () => silbenZumSchreiben().map((t) => `ss:${t}`),
  next(pick) {
    const fact = pick(this.facts());
    const teil = fact.slice(3);
    return {
      fact,
      prompt: { kind: 'schreiben', text: teil },
      // No cards. `runde.ts` draws a writing surface instead, and
      // `answerOf` never runs — there is nothing to be right about
      // except having drawn it.
      choices: [],
      correct: 0,
    } as Question;
  },
};

/**
 * The correct index, resolved once here rather than in every generator.
 *
 * The generators above build their choices with `shuffle`, so none of
 * them KNOWS where the right card ended up; asking each of them to
 * track it was four chances to get it wrong. Instead each one states
 * the answer as a value, and this finds it.
 */
export function answerOf(gameId: string, q: Question): number {
  const want = expectedAnswer(gameId, q);
  const i = q.choices.indexOf(want);
  // The fallback stays, and it is a landmine worth naming.
  //
  // If the answer cannot be found among the cards, something upstream
  // is wrong — and this quietly marks the FIRST card correct instead of
  // saying so. A sabotage run that resolved every question with the
  // wrong generator sailed through the first version of the shapes
  // check because of exactly this: the bug picks card zero, and card
  // zero happened to be right that time.
  //
  // It is not a throw, because the alternative to a wrong card is a
  // six-year-old looking at a crashed screen, and that is worse. So the
  // safety net stays here and the alarm lives in `tools/verify.mjs`,
  // which answers a pattern question by reading the row rather than by
  // asking this function — every one of them in the round, because one
  // of them is a coin toss.
  if (i < 0) notfall(gameId, q.fact);
  return i >= 0 ? i : 0;
}

/**
 * Leave a breadcrumb when the fallback above fires.
 *
 * The fallback is a safety net for a child — a wrong card beats a
 * crashed screen — and it is also the perfect place for a bug to hide,
 * because from the outside it looks like a working game. It has hidden
 * one already: a round that resolved every question with the wrong
 * generator marked card zero correct, and nothing on screen said so.
 *
 * Written to `localStorage` rather than counted in memory, because the
 * thing that needs to survive is the EVIDENCE, not the number: the
 * suite reloads the page dozens of times, and a counter that resets on
 * every reload only ever reports the last one. In a healthy game this
 * key never exists at all.
 *
 * It also means that if this ever fires on a real device, the reason is
 * sitting there afterwards instead of having happened silently to a
 * child mid-round.
 */
function notfall(spiel: string, fakt: string): void {
  try {
    const k = 'funkelwelt.notfall';
    const alt = localStorage.getItem(k);
    const liste: string[] = alt ? JSON.parse(alt) : [];
    const eintrag = `${spiel}:${fakt}`;
    if (!liste.includes(eintrag)) liste.push(eintrag);
    localStorage.setItem(k, JSON.stringify(liste.slice(0, 20)));
  } catch {
    // A private window with storage refused. The fallback still works;
    // only the breadcrumb is lost, and losing it must never be the
    // thing that breaks a child's round.
  }
}

function expectedAnswer(gameId: string, q: Question): string {
  switch (gameId) {
    case 'verliebte-zahlen':
      return String(10 - Number(q.fact.slice(3)));
    case 'zahlenreihe':
      return q.fact.slice(3);
    case 'rechenmeister': {
      const p = q.prompt as Extract<Prompt, { kind: 'rechnung' }>;
      return String(p.a + p.b);
    }
    case 'silben-lesen': {
      const w = SILBEN_WOERTER.find((x) => x.wort === q.fact.slice(3));
      return w ? w.teile.join('·') : q.choices[0];
    }
    case 'richtung': {
      // Whichever card is going the way the arrow points. Read off the
      // CARDS rather than off the generator, so a card list that was
      // built wrong is a wrong answer here too instead of being quietly
      // agreed with.
      const p = q.prompt as Extract<Prompt, { kind: 'richtung' }>;
      return q.choices.find((c) => c.endsWith(`:${p.nach}`)) ?? q.choices[0];
    }
    default:
      return q.choices[0];
  }
}

export const GAMES: Record<string, Game> = {
  'verliebte-zahlen': verliebteZahlen,
  'zahlenreihe': zahlenreihe,
  'rechenmeister': rechenmeister,
  'richtung': richtung,
  'silben-lesen': silbenLesen,
  'silben-schreiben': silbenSchreiben,
};

/** How many questions a round of this house has. About three minutes. */
export function rundenLaenge(_spiel: string | string[]): number {
  return 10;
}

/** Build a whole round: ten questions, no fact twice in a row. */
/**
 * Ten questions, from one generator or from several in rotation.
 *
 * A house may name more than one game. Das Haus der Rechenmeister does:
 * Nachbarzahlen, then a sum, then Nachbarzahlen. Ten of either alone is
 * a worksheet, and the two are close enough that alternating them reads
 * as one lesson rather than as two.
 *
 * The rotation is by POSITION, not random, so the rhythm is the same
 * every time. A child who has worked out that the pattern one comes
 * after the shape one is a child who is being taught by the structure.
 */
export function buildRound(spiel: string | string[], n = 10): Question[] {
  const ids = Array.isArray(spiel) ? spiel : [spiel];
  const out: Question[] = [];
  let last = '';
  let guard = 0;
  while (out.length < n && guard++ < n * 20) {
    // The id of the generator that actually made this question, so the
    // answer is resolved by the game that asked. Passing the house's
    // first game here would silently answer every pattern question
    // with a shape.
    const id = ids[out.length % ids.length];
    const q = GAMES[id].next(weightedPick);
    if (q.fact === last) continue;
    // A question with NO CARDS has no correct index to compute.
    //
    // The writing exercise is answered by tracing, and asking
    // `answerOf` to find its answer among an empty list sent it down
    // the fallback path every single time. Harmless — nothing reads
    // `correct` for that prompt — but it drowned the breadcrumb the
    // fallback leaves, which is the one thing that would show a REAL
    // resolution bug. Found by that breadcrumb on its first run.
    q.correct = q.choices.length ? answerOf(id, q) : 0;
    out.push(q);
    last = q.fact;
  }
  return out;
}

/**
 * Which pairs to ten are known in BOTH directions.
 *
 * The one measurement in the whole app that is about the child rather
 * than about the game, and the reason the fact ids are per-number
 * rather than per-pair: a child who can do 7 -> 3 and freezes on
 * 3 -> 7 has not learned the pair, and this is what notices.
 */
export function bekanntePaare(): number[] {
  const out: number[] = [];
  for (let n = 0; n <= 5; n++) {
    if (staerkeVon(`vz:${n}`) >= 3 && staerkeVon(`vz:${10 - n}`) >= 3) out.push(n);
  }
  return out;
}
