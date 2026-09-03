// Every string a child or a parent can see, in one table.
//
// The rule that earned itself on LernInseln and is here from the first
// commit: nothing user-facing is written inline. Retrofitting it cost a
// week on another project and costs nothing on day one.
//
// And a second reason it matters more here than usual: every line Luma
// speaks is a line ElevenLabs has to record at build time, and
// `tools/genvoice.mjs` reads this file to decide what to send. A string
// that is not in the table cannot be spoken.

export type Lang = 'de';

const DE = {
  'spiel.name': 'Funkelwelt',
  'spiel.unter': 'Ein kleines Abenteuer, in dem Wissen Licht macht',

  // -------------------------------------------------------- title screen
  'titel.waehle': 'Wähle deinen Platz',
  'titel.leer': 'Neues Abenteuer',
  'titel.stufe': 'Stufe {n}',
  'titel.spielzeit': '{h} Std {m} Min',
  'titel.loeschen': 'Löschen',
  'titel.loeschenSicher': 'Diesen Platz wirklich löschen?',
  'titel.ja': 'Ja, löschen',
  'titel.nein': 'Nein',
  'titel.weiter': 'Weiter',

  // ------------------------------------------------------- the character
  'held.titel': 'Wer bist du?',
  'held.name': 'Wie heißt du?',
  'held.namePlatz': 'Dein Name',
  'held.haut': 'Haut',
  'held.haar': 'Haare',
  'held.frisur': 'Frisur',
  'held.kleid': 'Kleidung',
  'held.fertig': 'Los geht es!',
  'held.zurueck': 'Zurück',
  'held.wuerfeln': 'Überrasch mich',

  // ------------------------------------------------------------ subjects
  'fach.mathe': 'Zahlen',
  'fach.wort': 'Wörter',

  // ----------------------------------------------------------- the world
  'welt.betreten': 'Hineingehen',
  'welt.zu': 'Noch zu',
  'welt.brauchtStufe': 'Ab Stufe {n} in {fach}',

  // ------------------------------------------------------------ settings
  'ein.ton': 'Ton',
  'ein.stimme': 'Stimme',
  'ein.an': 'an',
  'ein.aus': 'aus',

  // ------------------------------------------------- what Luma says
  //
  // Two sentences at a time, never more. Text-heavy is exactly what
  // makes children stop listening, and she is the only character in the
  // game who explains anything — so what she says has to be worth
  // waiting for.
  'say.willkommen':
    'Da bist du ja! Ich bin Luma. Die Welt ist dunkel geworden, und du bist die Erste seit langem, die eine Laterne trägt.',
  'say.erstesHaus':
    'Siehst du das Haus dort drüben? Da drinnen wohnen die verliebten Zahlen. Geh ruhig hinein.',
  'say.geschafft': 'Schau nur! Es wird heller.',
  'say.neueStufe': 'Du bist stärker geworden. Jetzt kommst du weiter als vorher.',
  'say.nochZu': 'Da hinten ist es noch zu dunkel. Werde erst ein bisschen stärker.',
  'say.schatten': 'Ein Schatten! Keine Sorge — er tut dir nichts. Zeig ihm, was du kannst.',
  'say.schattenWeg': 'Weg ist er. Das hast du gut gemacht.',
  'say.hilfe': 'Das ist knifflig, oder? Schau, ich zeig es dir.',
} as const;

export type Key = keyof typeof DE;

const TABLES: Record<Lang, Record<string, string>> = { de: DE };
let lang: Lang = 'de';

export function setLang(l: Lang): void {
  lang = l;
}

/**
 * Look a string up and fill its slots.
 *
 * A missing key returns the key rather than throwing: a wrong label on
 * screen is recoverable, a crash in front of a six-year-old is not.
 */
export function t(key: Key | string, slots?: Record<string, string | number>): string {
  const s = TABLES[lang][key];
  if (s === undefined) return String(key);
  if (!slots) return s;
  return s.replace(/\{(\w+)\}/g, (m, name) =>
    slots[name] !== undefined ? String(slots[name]) : m);
}

export function allKeys(): string[] {
  return Object.keys(DE);
}
