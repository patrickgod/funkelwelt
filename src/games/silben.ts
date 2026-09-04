// The first words, out of seven letters.
//
// Patrick: "und dann in der nächsten welt die silben? lesen und
// schreiben, und kombinationen wie Lea, lulu, Mama, Oma, etc. aber eben
// nur mit den buchstaben lLeEaAoOuUmMiI"
//
//     a A   e E   i I   l L   m M   o O   u U
//
// Seven letters and nothing else, which is the standard German
// Erstlesen starter set and is not an arbitrary restriction: every word
// a child meets here is built ONLY from letters they have already been
// taught, so a word is never a wall. It is also why the list is short
// and will stay short — adding a word that needs an eighth letter
// breaks the method rather than extending it.
//
// All of them are open syllables (consonant + vowel), which is the only
// syllable shape a first-grader reads before they read anything else,
// and every one is a name or a thing a six-year-old already says out
// loud.

/** A word, split where the syllables are. */
export interface Wort {
  /** As it is written. */
  wort: string;
  /** Its syllables, in order. */
  teile: string[];
}

/** The seven letters, and nothing outside them. */
export const BUCHSTABEN = 'aeilmou';

export const WOERTER: Wort[] = [
  { wort: 'Oma', teile: ['O', 'ma'] },
  { wort: 'Mama', teile: ['Ma', 'ma'] },
  { wort: 'Lea', teile: ['Le', 'a'] },
  { wort: 'Lulu', teile: ['Lu', 'lu'] },
  { wort: 'Mia', teile: ['Mi', 'a'] },
  { wort: 'Emil', teile: ['E', 'mil'] },
  { wort: 'Elli', teile: ['El', 'li'] },
  { wort: 'Lilo', teile: ['Li', 'lo'] },
  { wort: 'Uli', teile: ['U', 'li'] },
  { wort: 'Lama', teile: ['La', 'ma'] },
  { wort: 'Muli', teile: ['Mu', 'li'] },
  { wort: 'Eule', teile: ['Eu', 'le'] },
  { wort: 'Mimi', teile: ['Mi', 'mi'] },
  { wort: 'Ole', teile: ['O', 'le'] },
  { wort: 'Milo', teile: ['Mi', 'lo'] },
  { wort: 'Emma', teile: ['Em', 'ma'] },
  { wort: 'Ella', teile: ['El', 'la'] },
  { wort: 'Malu', teile: ['Ma', 'lu'] },
  { wort: 'Lilli', teile: ['Lil', 'li'] },
  { wort: 'Emilia', teile: ['E', 'mi', 'li', 'a'] },
  { wort: 'Amelie', teile: ['A', 'me', 'lie'] },
  { wort: 'Imme', teile: ['Im', 'me'] },
  { wort: 'Mila', teile: ['Mi', 'la'] },
  { wort: 'Leo', teile: ['Le', 'o'] },
  { wort: 'Lio', teile: ['Li', 'o'] },
  { wort: 'Mole', teile: ['Mo', 'le'] },
  { wort: 'Aloe', teile: ['A', 'lo', 'e'] },
];

/**
 * Every word, checked against the seven letters at load.
 *
 * A list like this is exactly where an eighth letter creeps in — one
 * "Ida", one "Nele", and the method is quietly broken for the child who
 * has only been taught seven. So the list checks itself, loudly, rather
 * than relying on whoever adds the next name to remember.
 *
 * It also checks that the syllables spell the word, because a split
 * that has drifted from its word is a reading exercise teaching a
 * spelling that does not exist.
 */
export function pruefen(): string[] {
  const klagen: string[] = [];
  for (const w of WOERTER) {
    for (const c of w.wort.toLowerCase()) {
      if (!BUCHSTABEN.includes(c)) {
        klagen.push(`${w.wort} uses "${c}", which is not one of the seven`);
      }
    }
    if (w.teile.join('') !== w.wort) {
      klagen.push(`${w.wort} is split as ${w.teile.join('-')}, which spells something else`);
    }
  }
  return klagen;
}

/** Every distinct syllable in the list, for building wrong answers. */
export function alleSilben(): string[] {
  const s = new Set<string>();
  for (const w of WOERTER) for (const t of w.teile) s.add(t);
  return [...s];
}

/**
 * Other ways this word could be cut up, all of them wrong.
 *
 * Wrong but PLAUSIBLE: the same letters in the same order, cut
 * somewhere else. A distractor that is obviously silly teaches a child
 * to answer by spotting the silly one, which is a skill about tests
 * rather than about reading.
 *
 * The first version could only move the FIRST boundary by one letter,
 * which for a three-part word like A-me-lie found exactly one
 * alternative — so the round showed two cards and became a coin toss.
 * This walks every way of cutting the word into the same number of
 * pieces, then every way of cutting it into one more or one fewer,
 * which is plenty even for a three-letter name.
 */
export function andereTeilungen(w: Wort): string[][] {
  const n = w.wort.length;
  const richtig = w.teile.join('|');
  const raus: string[][] = [];

  const schneide = (stellen: number[]): string[] => {
    const teile: string[] = [];
    let vorher = 0;
    for (const g of stellen) { teile.push(w.wort.slice(vorher, g)); vorher = g; }
    teile.push(w.wort.slice(vorher));
    return teile;
  };

  const waehle = (ab: number, uebrig: number, sofar: number[]): void => {
    if (uebrig === 0) {
      const teile = schneide(sofar);
      if (teile.every((t) => t.length > 0) && teile.join('|') !== richtig) raus.push(teile);
      return;
    }
    for (let g = ab; g <= n - uebrig; g++) waehle(g + 1, uebrig - 1, [...sofar, g]);
  };

  for (const teile of [w.teile.length, w.teile.length + 1, w.teile.length - 1]) {
    if (teile < 2 || teile > n) continue;
    waehle(1, teile - 1, []);
    if (raus.length >= 6) break;
  }
  return raus;
}
