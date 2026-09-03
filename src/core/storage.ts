// localStorage, wrapped so that a private-window failure degrades to
// "this session only" instead of crashing.
//
// Keyed, unlike LernInseln's version, because this game has three save
// slots and that one was written for exactly one.
//
// AGENTS.md rule 8: nothing leaves the device. This file is the only
// persistence in the app, and it writes to exactly one key.
//
// Safari throws on `localStorage.setItem` in private mode, and it does
// it on the WRITE rather than on the read, so a naive implementation
// works perfectly through a whole round and then explodes on the save
// at the end — which is the worst possible moment for a six-year-old.
// So: probe once at startup, and if the probe fails, keep the state in
// memory and never touch storage again.

let available: boolean | null = null;
/** The in-memory fallback, per key. */
const memory = new Map<string, string>();

function probe(): boolean {
  if (available !== null) return available;
  try {
    const k = '__li_probe__';
    window.localStorage.setItem(k, '1');
    window.localStorage.removeItem(k);
    available = true;
  } catch {
    available = false;
  }
  return available;
}

export function load(key: string): string | null {
  if (!probe()) return memory.get(key) ?? null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return memory.get(key) ?? null;
  }
}

export function save(key: string, text: string): void {
  memory.set(key, text);
  if (!probe()) return;
  try {
    window.localStorage.setItem(key, text);
  } catch {
    // Quota, or private mode changing its mind. The in-memory copy
    // above still holds, so the session continues.
    available = false;
  }
}

export function clear(key: string): void {
  memory.delete(key);
  if (!probe()) return;
  try {
    window.localStorage.removeItem(key);
  } catch {
    /* nothing to do; the memory copy is already gone */
  }
}

/** True when progress will actually survive a reload. Shown in settings. */
export function persists(): boolean {
  return probe();
}
