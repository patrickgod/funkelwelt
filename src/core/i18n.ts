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
  'start.spielen': 'Spiel starten',

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
  'welt.muenzen': 'Münzen',

  // ------------------------------------------------------- the houses
  'haus.verliebteZahlen': 'Das Haus der verliebten Zahlen',

  // -------------------------------------------------------- a round
  'runde.raus': 'Zurück',
  'runde.fertig': 'Geschafft!',
  'runde.nochmal': 'Noch mal',
  'runde.inDieWelt': 'Zurück in die Welt',
  'runde.weiter': 'Weiter',
  'runde.freunde': 'Verliebt!',
  'runde.mut': 'Mut',
  'runde.weg': 'Weg ist er!',

  // ------------------------------------------------------------ the cart
  'laden.titel': 'Der Karren',
  'laden.fertig': 'Weiter',
  'laden.dein': 'Gehört dir',
  'laden.laterne': 'Bessere Laterne',
  'laden.stiefel': 'Schnelle Stiefel',
  'laden.mutband': 'Mut-Band',
  'laden.hut': 'Hut mit Feder',

  // The steering is a QUESTION, not a preference: nobody knows which of
  // these a six-year-old gets on with, so both are built and the switch
  // is two taps away. See src/spiel/steuerung.ts.
  'ein.titel': 'Einstellungen',
  'ein.steuerung': 'Laufen',
  'ein.stick': 'Daumen',
  'ein.tippen': 'Tippen',
  'ein.fertig': 'Weiter spielen',

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
  // "das erste KIND", not "die Erste" or "der Erste".
  //
  // Patrick caught this one. Every other line in this table is already
  // genderless, and the character editor deliberately offers every
  // outfit to every child — so the single line that assumed a girl was
  // also the only line that would have told a boy the game had him
  // wrong. Neuter by way of the noun is the cheapest fix in German and
  // it costs nothing to read aloud.
  'say.willkommen':
    'Da bist du ja! Ich bin Luma. Die Welt ist dunkel geworden, und du bist das erste Kind seit langem, das eine Laterne trägt.',
  // One per steering, because the instruction has to match the control
  // the child actually has. A fairy telling a thumbstick user to tap is
  // worse than a fairy saying nothing.
  'say.tippen':
    'Tipp einfach dorthin, wo du hingehen möchtest. Probier es mal — ich komme mit.',
  'say.daumen':
    'Leg deinen Daumen irgendwo auf die Wiese und schieb ihn. Probier es mal — ich komme mit.',
  'say.erstesHaus':
    'Siehst du das Haus dort drüben? Da drinnen wohnen die verliebten Zahlen. Geh ruhig hinein.',
  'say.imHaus':
    'Hier wohnen die verliebten Zahlen. Zwei, die zusammen zehn ergeben, gehören für immer zusammen.',
  'say.geschafft': 'Schau nur! Es wird heller.',

  // Three of each, because a child hears these dozens of times and the
  // same sentence every single time stops being praise and becomes a
  // noise the app makes.
  'say.gutGemacht1': 'Das hast du gut gemacht.',
  'say.gutGemacht2': 'Schau mal, wie viele du geschafft hast.',
  'say.gutGemacht3': 'Prima. Die Zahlen mögen dich.',

  // What is said after a miss. Not one of these is a correction, and
  // none of them says wrong: the ten-frame is already showing what the
  // answer was, and a voice saying it again would be a grown-up
  // pointing at it. AGENTS.md rule 10.
  'say.schauMal1': 'Schau mal, so sieht es aus.',
  'say.schauMal2': 'Fast. Sieh dir das Feld an.',
  'say.schauMal3': 'Das merkst du dir beim nächsten Mal.',

  'say.neueStufe': 'Du bist stärker geworden. Jetzt kommst du weiter als vorher.',
  'say.nochZu': 'Da hinten ist es noch zu dunkel. Werde erst ein bisschen stärker.',
  'say.schatten': 'Ein Schatten! Keine Sorge — er tut dir nichts. Zeig ihm, was du kannst.',
  'say.schattenWeg': 'Weg ist er. Das hast du gut gemacht.',
  'say.karren':
    'Der Karren! Für die Münzen, die du findest, gibt es hier vier gute Sachen.',
  'say.torAuf':
    'Schau, das Tor ist offen! Du hast genug gelernt, um da hineinzukommen.',
  'say.hilfe': 'Das ist knifflig, oder? Schau, ich zeig es dir.',

  // No slots, on purpose. Every one of these becomes a fixed MP3 at
  // build time, so a line with a number in it could never be spoken —
  // and the two numbers are shown as a PICTURE instead, which is what
  // rule 14 wanted in the first place.
  'say.neuesPaar':
    'Schau! Diese beiden haben sich gefunden. Die vergisst du jetzt nicht mehr.',
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
