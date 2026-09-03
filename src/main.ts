// Funkelwelt.
//
// Title screen, character, world. No framework: canvas draws the world,
// the DOM draws the buttons — the same split LernInseln used, for the
// same reason. The DOM is better at buttons and canvas is better at
// pixels.

import { t } from './core/i18n.js';
import * as stand from './core/spielstand.js';
import * as audio from './core/audio.js';
import * as fx from './core/fx.js';
import { iconCanvas } from './core/icons.js';
import { held, heldSchatten, HAUT, HAAR, KLEID, W as HW, H as HH,
  type Aussehen, type Richtung } from './spiel/held.js';
import { Steuerung } from './spiel/steuerung.js';
import { Welt } from './welt/welt.js';
import * as sprites from './welt/sprites.js';
import { el, tap, knopf } from './ui/dom.js';
import * as runde from './ui/runde.js';
import * as luma from './ui/luma.js';
import * as begegnung from './ui/begegnung.js';
import * as laden from './ui/laden.js';

const welt = document.getElementById('welt') as HTMLCanvasElement;
const fxCanvas = document.getElementById('fx') as HTMLCanvasElement;
const app = document.getElementById('app') as HTMLDivElement;
const ui = document.getElementById('ui') as HTMLDivElement;
const ctx = welt.getContext('2d', { willReadFrequently: true })!;
const fxCtx = fxCanvas.getContext('2d', { willReadFrequently: true })!;

type Schirm = 'start' | 'titel' | 'editor' | 'welt' | 'haus' | 'schatten' | 'laden';
let schirm: Schirm = 'titel';
let zeit = 0;
let gestartet = 0;
let letzterRahmen = 0;

/** The world screen, while it is the screen. */
let dieWelt: Welt | null = null;
let dieSteuerung: Steuerung | null = null;
let muenzZahl: HTMLElement | null = null;
let muenzenGezeigt = -1;

// ---------------------------------------------------------------- canvas

function groesse(): void {
  const dpr = Math.min(3, window.devicePixelRatio || 1);
  const w = welt.clientWidth || window.innerWidth;
  const h = welt.clientHeight || window.innerHeight;
  // The backing store is sized in DEVICE pixels and scaled down by CSS,
  // or the pixel art is blurry on every retina display there has ever
  // been.
  for (const c of [welt, fxCanvas]) {
    c.width = Math.round(w * dpr);
    c.height = Math.round(h * dpr);
  }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  fxCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
  if (dieWelt) dieWelt.groesse(w, h);
}

window.addEventListener('resize', groesse);
window.addEventListener('orientationchange', () => setTimeout(groesse, 120));

// ------------------------------------------------------------- helpers

// `el`, `tap` and `knopf` now live in src/ui/dom.ts — the round screen
// wanted them too, and two copies of `tap` would be two places that
// decide whether a button reacts on pointerdown or on click.

function leeren(): void {
  ui.replaceChildren();
}

/** A hero sprite as a DOM canvas, at an integer scale. */
function heldBild(a: Aussehen, dir: Richtung, frame: number, scale: number): HTMLCanvasElement {
  const c = el('canvas');
  c.width = HW * scale;
  c.height = (HH + 4) * scale;
  const cx = c.getContext('2d', { willReadFrequently: true })!;
  cx.imageSmoothingEnabled = false;
  const sch = heldSchatten().toCanvas();
  cx.drawImage(sch, 0, (HH - 3) * scale, HW * scale, 6 * scale);
  cx.drawImage(held(dir, frame, a).toCanvas(), 0, 0, HW * scale, HH * scale);
  c.style.width = `${c.width}px`;
  c.style.height = `${c.height}px`;
  return c;
}

// ----------------------------------------------------------- the door in
//
// One picture and one button.
//
// A six-year-old handed an iPad does not read a menu; they press the
// biggest thing on the screen. So the first screen has exactly one
// biggest thing, and everything else on it — the lantern in the dark,
// the lit cottage, the fairy at the child's shoulder — is doing the job
// of saying what kind of place this is before a word is spoken.

function zeigeStart(): void {
  schirm = 'start';
  leeren();
  fx.clear();
  ctx.clearRect(0, 0, welt.width, welt.height);

  const s = el('div', 'start');
  const bild = document.createElement('img');
  bild.className = 'startBild';
  bild.alt = '';
  bild.decoding = 'async';
  bild.src = 'assets/kunst/titel.webp';
  s.appendChild(bild);

  const vorn = el('div', 'startVorn');
  vorn.appendChild(el('h1', 'titel', t('spiel.name')));
  vorn.appendChild(el('p', 'unter', t('spiel.unter')));
  vorn.appendChild(knopf(t('start.spielen'), () => zeigeTitel(), 'gold gross'));
  s.appendChild(vorn);
  ui.appendChild(s);
}

// ---------------------------------------------------------- title screen

function zeigeTitel(): void {
  schirm = 'titel';
  leeren();
  titelHelden.length = 0;
  titelFrame = -1;
  const s = el('div', 'bildschirm');
  s.appendChild(el('h1', 'titel', t('spiel.name')));
  s.appendChild(el('p', 'unter', t('spiel.unter')));

  s.appendChild(el('p', 'unter', t('titel.waehle')));

  const reihe = el('div', 'plaetze');
  stand.alle().forEach((st, i) => {
    const karte = el('button', 'platz');
    if (st.name) {
      // Walking on the spot rather than standing still. A title screen
      // of three motionless portraits is a menu; three children shifting
      // their weight is a game waiting for somebody.
      const buehne = el('div', 'platzHeld');
      buehne.appendChild(heldBild(st.aussehen, 'unten', 0, 4));
      karte.appendChild(buehne);
      titelHelden.push({ el: buehne, a: st.aussehen });
      karte.appendChild(el('div', 'pname', st.name));
      const m = stand.stufe;
      // Read the slot without opening it: `stufe` works on the open
      // slot, so the level is computed here from the slot's own stars.
      const mathe = Math.max(1, Math.floor(Math.sqrt(st.sterne.mathe / 8)) + 1);
      const wort = Math.max(1, Math.floor(Math.sqrt(st.sterne.wort / 8)) + 1);
      karte.appendChild(el('div', 'pzeile',
        `${t('fach.mathe')} ${mathe} · ${t('fach.wort')} ${wort}`));
      const std = Math.floor(st.spielzeit / 3600);
      const min = Math.floor((st.spielzeit % 3600) / 60);
      karte.appendChild(el('div', 'pzeile', t('titel.spielzeit', { h: std, m: min })));
      void m;
    } else {
      karte.appendChild(el('div', 'pleer', t('titel.leer')));
    }
    tap(karte, () => {
      audio.click();
      if (st.name) {
        stand.oeffnen(i);
        zeigeWelt();
      } else {
        zeigeEditor(i);
      }
    });
    reihe.appendChild(karte);

    if (st.name) {
      const weg = el('button', 'pweg', t('titel.loeschen'));
      tap(weg, () => {
        audio.click();
        frage(t('titel.loeschenSicher'), () => {
          stand.loeschen(i);
          zeigeTitel();
        });
      });
      const spalte = el('div');
      spalte.style.display = 'flex';
      spalte.style.flexDirection = 'column';
      spalte.style.alignItems = 'center';
      reihe.removeChild(karte);
      spalte.append(karte, weg);
      reihe.appendChild(spalte);
    }
  });
  s.appendChild(reihe);
  ui.appendChild(s);
}

/** A yes/no, for the one destructive thing in the game. */
function frage(text: string, ja: () => void): void {
  const s = el('div', 'bildschirm');
  s.style.background = 'rgba(26, 22, 34, 0.9)';
  s.appendChild(el('h2', 'titel', text));
  const r = el('div');
  r.appendChild(knopf(t('titel.nein'), () => s.remove()));
  const j = knopf(t('titel.ja'), () => { s.remove(); ja(); }, 'gefahr');
  r.appendChild(j);
  s.appendChild(r);
  ui.appendChild(s);
}

// ------------------------------------------------------- the character

function zeigeEditor(platz: number): void {
  schirm = 'editor';
  leeren();
  const a: Aussehen = { haut: 1, haar: 1, frisur: 0, kleid: 0 };
  let name = '';

  const s = el('div', 'bildschirm');
  s.appendChild(el('h1', 'titel', t('held.titel')));

  const zeile = el('div', 'editor');

  // The character, walking on the spot, so the choices are seen the way
  // they will actually be seen — in motion.
  const buehne = el('div', 'buehne');
  const vor = el('canvas');
  vor.width = HW * 8;
  vor.height = (HH + 4) * 8;
  vor.style.width = `${vor.width}px`;
  vor.style.height = `${vor.height}px`;
  const vctx = vor.getContext('2d', { willReadFrequently: true })!;
  buehne.appendChild(vor);
  zeile.appendChild(buehne);

  const male = (): void => {
    vctx.imageSmoothingEnabled = false;
    vctx.clearRect(0, 0, vor.width, vor.height);
    const frame = [0, 1, 0, 2][Math.floor(zeit * 6) % 4];
    const sch = heldSchatten().toCanvas();
    vctx.drawImage(sch, 0, (HH - 3) * 8, HW * 8, 6 * 8);
    vctx.drawImage(held('unten', frame, a).toCanvas(), 0, 0, HW * 8, HH * 8);
  };
  vorschau = male;

  // ------------------------------------------------------- the choices
  const regler = el('div', 'regler');

  const knopfGruppen: (() => void)[] = [];

  const gruppe = (
    label: string, n: number, farbe: ((i: number) => string) | null,
    lies: () => number, schreib: (i: number) => void,
    bild?: (i: number) => HTMLCanvasElement,
  ): void => {
    const r = el('div', 'reihe');
    r.appendChild(el('div', 'was', label));
    const knoepfe: HTMLButtonElement[] = [];
    const neuZeichnen = (): void => {
      if (!bild) return;
      knoepfe.forEach((k, i) => k.replaceChildren(bild(i)));
    };
    knopfGruppen.push(neuZeichnen);
    for (let i = 0; i < n; i++) {
      const b = el('button', 'probe');
      if (farbe) b.style.background = farbe(i);
      if (bild) b.appendChild(bild(i));
      tap(b, () => {
        audio.click();
        schreib(i);
        knoepfe.forEach((k, j) => k.classList.toggle('gewaehlt', j === lies()));
        // The hairstyle swatches show the hair in the CURRENT colour,
        // so they have to be repainted whenever the colour changes.
        for (const f of knopfGruppen) f();
        male();
      });
      knoepfe.push(b);
      r.appendChild(b);
    }
    knoepfe.forEach((k, j) => k.classList.toggle('gewaehlt', j === lies()));
    regler.appendChild(r);
  };

  /**
   * A hairstyle swatch: the character's own head wearing it.
   *
   * The first version painted all three the same cream colour, because
   * a hairstyle has no colour of its own — which left three identical
   * buttons and no way at all to tell what they did.
   */
  const frisurBild = (i: number): HTMLCanvasElement => {
    const c = el('canvas');
    c.width = 60;
    c.height = 60;
    const cc = c.getContext('2d', { willReadFrequently: true })!;
    cc.imageSmoothingEnabled = false;
    // Just the head: three times the size of the sprite, cropped to the
    // top, so the difference between the styles is all you see.
    const px = held('unten', 0, { ...a, frisur: i }).toCanvas();
    cc.drawImage(px, 0, 0, HW, 13, -7, -3, HW * 4.4, 13 * 4.4);
    c.style.width = '60px';
    c.style.height = '60px';
    return c;
  };

  gruppe(t('held.haut'), HAUT.length, (i) => HAUT[i][2],
    () => a.haut, (i) => { a.haut = i; });
  gruppe(t('held.haar'), HAAR.length, (i) => HAAR[i][2],
    () => a.haar, (i) => { a.haar = i; });
  gruppe(t('held.frisur'), 3, null,
    () => a.frisur, (i) => { a.frisur = i; }, frisurBild);
  gruppe(t('held.kleid'), KLEID.length, (i) => KLEID[i][2],
    () => a.kleid, (i) => { a.kleid = i; });

  const feld = el('input', 'namensfeld');
  feld.type = 'text';
  feld.placeholder = t('held.namePlatz');
  feld.maxLength = 12;
  feld.autocapitalize = 'words';
  feld.addEventListener('input', () => { name = feld.value; los.disabled = !name.trim(); });
  const nz = el('div', 'reihe');
  nz.appendChild(el('div', 'was', 'Name'));
  nz.appendChild(feld);
  regler.appendChild(nz);

  zeile.appendChild(regler);
  s.appendChild(zeile);

  const unten = el('div');
  unten.appendChild(knopf(t('held.zurueck'), () => zeigeTitel()));
  unten.appendChild(knopf(t('held.wuerfeln'), () => {
    a.haut = Math.floor(Math.random() * HAUT.length);
    a.haar = Math.floor(Math.random() * HAAR.length);
    a.frisur = Math.floor(Math.random() * 3);
    a.kleid = Math.floor(Math.random() * KLEID.length);
    // Rebuild so the chosen swatches move with it.
    zeigeEditorMit(platz, a, feld.value);
  }));
  const los = knopf(t('held.fertig'), () => {
    stand.neu(platz, name || 'Held', a);
    zeigeWelt();
  }, 'gold');
  los.disabled = true;
  unten.appendChild(los);
  s.appendChild(unten);

  ui.appendChild(s);
  male();
}

/** Rebuild the editor with a given look — used by the dice button. */
function zeigeEditorMit(platz: number, a: Aussehen, name: string): void {
  zeigeEditor(platz);
  // The editor owns its own state, so the simplest correct thing is to
  // rebuild and then poke the new one. Anything cleverer would mean two
  // places that know what a character is.
  const feld = ui.querySelector('.namensfeld') as HTMLInputElement | null;
  if (feld) { feld.value = name; feld.dispatchEvent(new Event('input')); }
  void a;
}

/** Set by the editor so the animation loop can repaint the preview. */
let vorschau: (() => void) | null = null;

/** The occupied slots on the title screen, so they can walk on the spot. */
const titelHelden: { el: HTMLElement; a: Aussehen }[] = [];
let titelFrame = -1;

// ------------------------------------------------------------- the world

function zeigeWelt(): void {
  // The generated sprites are read before the world is built, because
  // the world composites its sprites synchronously and a tree that
  // arrives afterwards is a tree that is never drawn. They are loaded
  // once per session; the second call resolves immediately.
  void sprites.laden().then(() => weltBauen());
}

function weltBauen(): void {
  schirm = 'welt';
  vorschau = null;
  leeren();
  fx.clear();
  dieWelt = new Welt(stand.get().aussehen);
  dieWelt.groesse(welt.clientWidth || window.innerWidth, welt.clientHeight || window.innerHeight);
  // The steering listens on the canvas rather than on the document, so
  // that a tap on the HUD is a tap on the HUD and not also a step to the
  // left. #ui is transparent to pointers except where a control is.
  dieSteuerung = new Steuerung(welt);
  dieSteuerung.modus = stand.get().steuerung;
  dieWelt.anTuer = () => zeigeHaus();
  dieWelt.anSchatten = (id) => zeigeSchatten(id);
  // A shut gate explains itself once; an open one is celebrated once.
  // Both go through `einmal`, so neither becomes something a child
  // learns to walk through without listening.
  dieWelt.anTor = (offen) => luma.einmal(offen ? 'say.torAuf' : 'say.nochZu');
  dieWelt.anKarren = () => zeigeLaden();
  muenzenGezeigt = -1;
  hudBauen();
  // The world arrives dark and opens. Long the first time, because that
  // is a child waking up somewhere; short after that, because it is a
  // child coming back.
  const neu = !stand.gehoert('say.willkommen');
  dieWelt.wachAuf(neu);

  // Three beats, and each one only knows what happens after it: hello,
  // then how to walk, then where to go. Nothing here is a tutorial
  // screen — every step is Luma saying two sentences and then a thing
  // on the ground to walk to.
  setTimeout(() => {
    luma.einmal('say.willkommen', () => lernenZuLaufen());
  }, neu ? 1500 : 650);
}

/**
 * The only thing the game ever teaches, and it teaches it by asking.
 *
 * A glowing ring on the path a few steps away, and the line that matches
 * whichever control this slot is actually set to. A six-year-old who
 * cannot read a sentence understands a circle that wants standing in
 * perfectly well, so the ring is the instruction and the words are for
 * the grown-up in the room.
 */
function lernenZuLaufen(): void {
  if (!dieWelt) return;
  const wie = stand.get().steuerung === 'stick' ? 'say.daumen' : 'say.tippen';
  if (stand.gehoert(wie)) { zeigeAufHaus(); return; }
  stand.merkeGehoert(wie);
  luma.zeige(wie);
  // Seven tiles east along the path — far enough to be a walk, near
  // enough to be on the same screen as the child standing still.
  dieWelt.zeigeZiel(15 * 16 + 8, 22 * 16 + 8, () => zeigeAufHaus());
}

/** And then the door, unless they have already been through it. */
function zeigeAufHaus(): void {
  if (stand.get().geschafft['verliebte-zahlen']) return;
  luma.einmal('say.erstesHaus');
}

/** The cart. Four things, no placing, and no way to spend badly. */
function zeigeLaden(): void {
  if (schirm !== 'welt' || !dieWelt) return;
  luma.weg();
  schirm = 'laden';
  dieWelt.ortSichern();
  leeren();
  fx.clear();
  laden.starten(ui, () => {
    schirm = 'welt';
    leeren();
    fx.clear();
    muenzenGezeigt = -1;
    hudBauen();
  });
  luma.einmal('say.karren');
}

/**
 * Meeting a shadow.
 *
 * The same shape as going into the house: the world is left standing so
 * that coming back out is instant and the adventurer is still exactly
 * where he chose to walk.
 */
function zeigeSchatten(id: string): void {
  if (schirm !== 'welt' || !dieWelt) return;
  luma.weg();
  schirm = 'schatten';
  dieWelt.ortSichern();
  leeren();
  fx.clear();
  begegnung.starten(ui, id, (weg) => {
    // Chased away, or simply walked out of. Either way nothing was lost
    // — leaving costs nothing and the shadow is still there to come back
    // to, which is the whole of "wir müssen uns nur kurz ausruhen".
    if (weg && dieWelt) dieWelt.schattenWeg(id);
    schirm = 'welt';
    audio.whoosh(0.34, 900);
    leeren();
    fx.clear();
    muenzenGezeigt = -1;
    hudBauen();
  });
}

/**
 * Inside the house.
 *
 * The world is left standing rather than torn down: the region is
 * already composited, the adventurer is already in the doorway, and
 * rebuilding all of it to come back out costs 155 ms for nothing. The
 * frame loop simply stops stepping it, so nothing moves while the child
 * is answering — including the arrow keys, which would otherwise walk
 * him about behind the round screen.
 */
function zeigeHaus(): void {
  if (schirm !== 'welt' || !dieWelt) return;
  luma.weg();
  audio.whoosh(0.3, 1200);
  schirm = 'haus';
  dieWelt.ortSichern();
  leeren();
  fx.clear();
  runde.starten(ui, runde.HAUS_VERLIEBTE_ZAHLEN, () => {
    schirm = 'welt';
    audio.whoosh(0.34, 900);
    leeren();
    fx.clear();
    muenzenGezeigt = -1;
    hudBauen();
  });
}

/**
 * The world's own interface: out, the purse, and the settings.
 *
 * Three things and no more. Everything else a child needs to know is in
 * the picture — where they are, how dark it still is, and what is worth
 * walking towards.
 */
function hudBauen(): void {
  const hud = el('div', 'hud');

  const raus = el('button', 'hudKnopf');
  raus.appendChild(iconCanvas('zurueck', 40));
  tap(raus, () => { audio.click(); weltVerlassen(); zeigeTitel(); });

  const beutel = el('div', 'beutel');
  beutel.appendChild(iconCanvas('muenze', 34));
  muenzZahl = el('span', 'zahl', String(stand.get().muenzen));
  beutel.appendChild(muenzZahl);

  const zahn = el('button', 'hudKnopf');
  zahn.appendChild(iconCanvas('zahnrad', 40));
  tap(zahn, () => { audio.click(); zeigeEinstellungen(); });

  hud.append(raus, beutel, zahn);
  ui.appendChild(hud);

  // The world tells the coins where to go. It knows a spark was picked
  // up; only the interface knows where the purse ended up on screen.
  if (dieWelt) {
    dieWelt.anBeutel = () => {
      const r = beutel.getBoundingClientRect();
      return r.width ? { x: r.left + r.width / 2, y: r.top + r.height / 2 } : null;
    };
    dieWelt.beutelStups = () => {
      beutel.classList.add('stups');
      setTimeout(() => beutel.classList.remove('stups'), 220);
    };
  }
}

function weltVerlassen(): void {
  luma.weg();
  runde.beenden();
  begegnung.beenden();
  laden.beenden();
  if (dieWelt) dieWelt.ortSichern();
  if (dieSteuerung) dieSteuerung.loesen();
  dieWelt = null;
  dieSteuerung = null;
  muenzZahl = null;
  fx.clear();
  ctx.clearRect(0, 0, welt.width, welt.height);
}

/**
 * Sound, voice, and which way the adventurer is steered.
 *
 * The steering being HERE rather than buried somewhere is the point:
 * HANDOVER.md's first open question is which of the two a six-year-old
 * gets on with, and the only way anyone finds out is if it can be
 * swapped in the middle of walking about and swapped straight back.
 */
function zeigeEinstellungen(): void {
  const s = el('div', 'bildschirm dunkel');
  s.appendChild(el('h2', 'titel', t('ein.titel')));

  const reihe = (
    label: string,
    optionen: { text: string; an: () => boolean; tu: () => void }[],
  ): void => {
    const r = el('div', 'reihe');
    r.appendChild(el('div', 'was', label));
    const knoepfe: HTMLButtonElement[] = [];
    const auffrischen = (): void =>
      knoepfe.forEach((b, j) => b.classList.toggle('gewaehlt', optionen[j].an()));
    for (const o of optionen) {
      const b = knopf(o.text, () => { o.tu(); auffrischen(); });
      knoepfe.push(b);
      r.appendChild(b);
    }
    auffrischen();
    s.appendChild(r);
  };

  const setzen = (fn: (st: stand.Stand) => void): void => {
    fn(stand.get());
    stand.sichern();
  };

  reihe(t('ein.ton'), [
    { text: t('ein.an'), an: () => stand.get().ton, tu: () => setzen((x) => { x.ton = true; }) },
    { text: t('ein.aus'), an: () => !stand.get().ton, tu: () => setzen((x) => { x.ton = false; }) },
  ]);
  reihe(t('ein.stimme'), [
    { text: t('ein.an'), an: () => stand.get().stimme, tu: () => setzen((x) => { x.stimme = true; }) },
    { text: t('ein.aus'), an: () => !stand.get().stimme, tu: () => setzen((x) => { x.stimme = false; }) },
  ]);
  reihe(t('ein.steuerung'), [
    {
      text: t('ein.stick'),
      an: () => stand.get().steuerung === 'stick',
      tu: () => {
        setzen((x) => { x.steuerung = 'stick'; });
        if (dieSteuerung) dieSteuerung.modus = 'stick';
      },
    },
    {
      text: t('ein.tippen'),
      an: () => stand.get().steuerung === 'tippen',
      tu: () => {
        setzen((x) => { x.steuerung = 'tippen'; });
        if (dieSteuerung) dieSteuerung.modus = 'tippen';
      },
    },
  ]);

  s.appendChild(knopf(t('ein.fertig'), () => s.remove(), 'gold'));
  ui.appendChild(s);
}

// ---------------------------------------------------------------- frame

function frame(now: number): void {
  if (!gestartet) gestartet = now;
  zeit = (now - gestartet) / 1000;
  // Real elapsed time, clamped. A tab that has been in the background
  // comes back with a dt of several seconds, and an unclamped one walks
  // the adventurer straight through whatever was in the way.
  const dt = letzterRahmen ? Math.min(0.05, (now - letzterRahmen) / 1000) : 1 / 60;
  letzterRahmen = now;

  const off = fx.shakeOffset(now);
  app.style.transform = off.x || off.y ? `translate(${off.x}px, ${off.y}px)` : '';

  if (schirm === 'editor' && vorschau) vorschau();

  if (schirm === 'titel' && titelHelden.length) {
    // Six frames a second, and only when the frame actually changes —
    // rebuilding three canvases sixty times a second to show a
    // three-frame walk is fifty-four wasted rebuilds.
    const f = [0, 1, 0, 2][Math.floor(zeit * 6) % 4];
    if (f !== titelFrame) {
      titelFrame = f;
      for (const h of titelHelden) h.el.replaceChildren(heldBild(h.a, 'unten', f, 4));
    }
  }

  if (schirm === 'welt' && dieWelt && dieSteuerung) {
    // While she is talking the world holds still. She turns up two or
    // three times in a session and never mid-stride, and a character
    // who wanders off behind the person explaining something is a
    // character the child is watching instead of listening.
    if (!luma.sichtbar()) dieWelt.schritt(dt, dieSteuerung);
    dieWelt.zeichnen(ctx, dieSteuerung);
    const m = stand.get().muenzen;
    if (muenzZahl && m !== muenzenGezeigt) {
      muenzZahl.textContent = String(m);
      muenzenGezeigt = m;
    }
  }

  const dpr = Math.min(3, window.devicePixelRatio || 1);
  fxCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
  fxCtx.clearRect(0, 0, fxCanvas.width, fxCanvas.height);
  fx.update(dt);
  fx.draw(fxCtx);

  requestAnimationFrame(frame);
}

// -------------------------------------------------------------- startup

groesse();
requestAnimationFrame(frame);
zeigeStart();

if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => { /* silent */ });
  });
}
