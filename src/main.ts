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
import { held, heldSchatten, HAUT, HAAR, KLEID, W as HW, H as HH,
  type Aussehen, type Richtung } from './spiel/held.js';

const welt = document.getElementById('welt') as HTMLCanvasElement;
const fxCanvas = document.getElementById('fx') as HTMLCanvasElement;
const app = document.getElementById('app') as HTMLDivElement;
const ui = document.getElementById('ui') as HTMLDivElement;
const ctx = welt.getContext('2d', { willReadFrequently: true })!;
const fxCtx = fxCanvas.getContext('2d', { willReadFrequently: true })!;

type Schirm = 'titel' | 'editor' | 'welt';
let schirm: Schirm = 'titel';
let zeit = 0;
let gestartet = 0;

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
}

window.addEventListener('resize', groesse);
window.addEventListener('orientationchange', () => setTimeout(groesse, 120));

// ------------------------------------------------------------- helpers

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K, cls?: string, text?: string,
): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
}

function leeren(): void {
  ui.replaceChildren();
}

/**
 * Wire a tap.
 *
 * `pointerdown`, not `click`: a child who is not certain a tap
 * registered taps again, so the sooner the button reacts the fewer
 * double answers. The audio unlock rides along, because iOS only
 * resumes an AudioContext inside a real user gesture.
 */
function tap(e: HTMLElement, fn: () => void): void {
  e.addEventListener('pointerdown', (ev) => {
    ev.preventDefault();
    audio.unlock();
    fn();
  });
}

function knopf(label: string, fn: () => void, cls = ''): HTMLButtonElement {
  const b = el('button', cls, label);
  tap(b, () => { audio.click(); fn(); });
  return b;
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

// ---------------------------------------------------------- title screen

function zeigeTitel(): void {
  schirm = 'titel';
  leeren();
  const s = el('div', 'bildschirm');
  s.appendChild(el('h1', 'titel', t('spiel.name')));
  s.appendChild(el('p', 'unter', t('spiel.unter')));

  const reihe = el('div', 'plaetze');
  stand.alle().forEach((st, i) => {
    const karte = el('button', 'platz');
    if (st.name) {
      karte.appendChild(heldBild(st.aussehen, 'unten', 0, 4));
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

// ------------------------------------------------------------- the world

function zeigeWelt(): void {
  schirm = 'welt';
  vorschau = null;
  leeren();
  const s = el('div', 'bildschirm');
  s.appendChild(el('h1', 'titel', stand.get().name));
  s.appendChild(el('p', 'unter', 'Die Welt wird als Nächstes gebaut.'));
  s.appendChild(knopf(t('held.zurueck'), () => zeigeTitel()));
  ui.appendChild(s);
}

// ---------------------------------------------------------------- frame

function frame(now: number): void {
  if (!gestartet) gestartet = now;
  zeit = (now - gestartet) / 1000;

  const off = fx.shakeOffset(now);
  app.style.transform = off.x || off.y ? `translate(${off.x}px, ${off.y}px)` : '';

  if (schirm === 'editor' && vorschau) vorschau();

  const dpr = Math.min(3, window.devicePixelRatio || 1);
  fxCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
  fxCtx.clearRect(0, 0, fxCanvas.width, fxCanvas.height);
  fx.update(1 / 60);
  fx.draw(fxCtx);

  requestAnimationFrame(frame);
}

// -------------------------------------------------------------- startup

groesse();
requestAnimationFrame(frame);
zeigeTitel();

if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => { /* silent */ });
  });
}
