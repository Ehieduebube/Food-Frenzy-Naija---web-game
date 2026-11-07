/** Small deterministic RNG (mulberry32). State lives in EngineState so boards can be cloned and replayed. */

export interface RngHolder {
  rng: number;
}

export function nextRandom(h: RngHolder): number {
  h.rng = (h.rng + 0x6d2b79f5) | 0;
  let t = h.rng;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

export function randomInt(h: RngHolder, maxExclusive: number): number {
  return Math.floor(nextRandom(h) * maxExclusive);
}

export function pick<T>(h: RngHolder, items: readonly T[]): T {
  return items[randomInt(h, items.length)];
}

export function shuffleInPlace<T>(h: RngHolder, items: T[]): T[] {
  for (let i = items.length - 1; i > 0; i--) {
    const j = randomInt(h, i + 1);
    const t = items[i];
    items[i] = items[j];
    items[j] = t;
  }
  return items;
}

/** Hash a string into a 32-bit seed (FNV-1a). */
export function hashSeed(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h | 0;
}

export function randomSeed(): number {
  return (Math.random() * 0xffffffff) | 0;
}
