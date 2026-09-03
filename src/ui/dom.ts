// The four DOM helpers every screen needs.
//
// Pulled out of main.ts the moment a second screen wanted them. Two
// copies of `tap` would be two places that decide whether a button
// reacts on pointerdown or on click, and that decision is not cosmetic:
// a child who is not certain a tap registered taps again, so the sooner
// the button reacts the fewer double answers.

import * as audio from '../core/audio.js';

export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K, cls?: string, text?: string,
): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
}

/**
 * Wire a tap.
 *
 * `pointerdown`, not `click`. The audio unlock rides along, because iOS
 * only resumes an AudioContext inside a real user gesture and the first
 * tap of the session is the only chance to do it.
 */
export function tap(e: HTMLElement, fn: () => void): void {
  e.addEventListener('pointerdown', (ev) => {
    ev.preventDefault();
    audio.unlock();
    fn();
  });
}

export function knopf(label: string, fn: () => void, cls = ''): HTMLButtonElement {
  const b = el('button', cls, label);
  tap(b, () => { audio.click(); fn(); });
  return b;
}

/** The middle of an element in CSS pixels, for aiming an effect at it. */
export function zentrumVon(e: Element): { x: number; y: number } {
  const r = e.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}
