// How a six-year-old moves the adventurer.
//
// HANDOVER.md's first open question for Patrick is which of these two a
// child actually prefers, and the honest answer is that nobody knows —
// so both are here and the switch is two taps away, and his son can
// settle it in ninety seconds. That is much cheaper than arguing about
// it, and the argument would have been wrong: adults pick the stick.
//
//   STICK    a thumbstick that appears wherever the thumb lands. Not a
//            fixed one in a corner, because a fixed control is a thing
//            a child has to FIND before they can play, and they will
//            put their thumb where they put it.
//
//   TIPPEN   tap a spot and walk there. No dexterity at all, which for
//            some children is the whole difference.
//
// Two decisions inside the stick that are not obvious and are both
// about children rather than about input:
//
//   * The direction is analogue and the SPEED is not. A small push
//     walks at exactly the same pace as a big one. Analogue speed
//     punishes a light touch by making the character crawl, and a child
//     reads a crawling character as a broken one.
//
//   * Only the first finger down owns the stick. A second finger is
//     ignored rather than fighting it. Children put both hands on a
//     tablet.

export type Modus = 'stick' | 'tippen';

/** Dead zone and full deflection, in CSS pixels. */
export const TOT = 10;
export const WEIT = 44;

export interface StickBild {
  aktiv: boolean;
  /** Where the thumb went down, and where it is now. CSS pixels. */
  ox: number; oy: number;
  x: number; y: number;
}

export class Steuerung {
  modus: Modus = 'stick';

  readonly stick: StickBild = { aktiv: false, ox: 0, oy: 0, x: 0, y: 0 };

  /** A completed tap, in CSS pixels, waiting to be read exactly once. */
  private tipp: { x: number; y: number } | null = null;

  private zeiger = -1;
  private ab = { x: 0, y: 0, t: 0 };
  private tasten = new Set<string>();
  private readonly ziel: HTMLElement;
  private readonly weg: (() => void)[] = [];

  constructor(ziel: HTMLElement) {
    this.ziel = ziel;
    const an = <K extends keyof WindowEventMap>(
      wo: EventTarget, art: K, fn: (e: WindowEventMap[K]) => void,
    ): void => {
      const h = fn as EventListener;
      wo.addEventListener(art, h, { passive: false });
      this.weg.push(() => wo.removeEventListener(art, h));
    };

    an(ziel, 'pointerdown', (e) => this.runter(e));
    an(window, 'pointermove', (e) => this.bewegt(e));
    an(window, 'pointerup', (e) => this.hoch(e));
    an(window, 'pointercancel', (e) => this.hoch(e));
    an(window, 'keydown', (e) => {
      const k = this.taste(e.key);
      if (!k) return;
      e.preventDefault();
      this.tasten.add(k);
    });
    an(window, 'keyup', (e) => {
      const k = this.taste(e.key);
      if (k) this.tasten.delete(k);
    });
  }

  /** Arrows and WASD, so the thing can be driven on a desk as well. */
  private taste(k: string): string | null {
    switch (k) {
      case 'ArrowLeft': case 'a': case 'A': return 'l';
      case 'ArrowRight': case 'd': case 'D': return 'r';
      case 'ArrowUp': case 'w': case 'W': return 'o';
      case 'ArrowDown': case 's': case 'S': return 'u';
      default: return null;
    }
  }

  private runter(e: PointerEvent): void {
    if (this.zeiger !== -1) return;        // one thumb owns the controls
    this.zeiger = e.pointerId;
    this.ab = { x: e.clientX, y: e.clientY, t: performance.now() };
    if (this.modus === 'stick') {
      this.stick.aktiv = true;
      this.stick.ox = e.clientX; this.stick.oy = e.clientY;
      this.stick.x = e.clientX; this.stick.y = e.clientY;
    }
    e.preventDefault();
  }

  private bewegt(e: PointerEvent): void {
    if (e.pointerId !== this.zeiger) return;
    if (this.modus !== 'stick') return;
    let dx = e.clientX - this.stick.ox;
    let dy = e.clientY - this.stick.oy;
    const d = Math.hypot(dx, dy);
    if (d > WEIT) { dx = (dx / d) * WEIT; dy = (dy / d) * WEIT; }
    this.stick.x = this.stick.ox + dx;
    this.stick.y = this.stick.oy + dy;
    e.preventDefault();
  }

  private hoch(e: PointerEvent): void {
    if (e.pointerId !== this.zeiger) return;
    this.zeiger = -1;
    this.stick.aktiv = false;
    if (this.modus !== 'tippen') return;
    // A tap, not a drag and not a rest: a child leaning on the screen
    // must not send the adventurer across the meadow.
    const weit = Math.hypot(e.clientX - this.ab.x, e.clientY - this.ab.y);
    if (weit < 16 && performance.now() - this.ab.t < 900) {
      this.tipp = { x: e.clientX, y: e.clientY };
    }
  }

  /** Where the adventurer should walk, as a unit vector or nothing. */
  vektor(): { x: number; y: number } {
    let x = 0, y = 0;
    if (this.tasten.has('l')) x -= 1;
    if (this.tasten.has('r')) x += 1;
    if (this.tasten.has('o')) y -= 1;
    if (this.tasten.has('u')) y += 1;
    if (x || y) {
      const d = Math.hypot(x, y);
      return { x: x / d, y: y / d };
    }
    if (!this.stick.aktiv) return { x: 0, y: 0 };
    const dx = this.stick.x - this.stick.ox;
    const dy = this.stick.y - this.stick.oy;
    const d = Math.hypot(dx, dy);
    if (d < TOT) return { x: 0, y: 0 };
    return { x: dx / d, y: dy / d };
  }

  /** Read a pending tap, and clear it. */
  nimmTipp(): { x: number; y: number } | null {
    const t = this.tipp;
    this.tipp = null;
    return t;
  }

  /** Forget everything. Used when the world screen goes away. */
  loesen(): void {
    for (const f of this.weg) f();
    this.weg.length = 0;
    this.tasten.clear();
    this.stick.aktiv = false;
    this.zeiger = -1;
    void this.ziel;
  }
}
