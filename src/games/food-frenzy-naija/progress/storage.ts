/**
 * Where progress is kept. The game only talks to this interface, so the LagosLife
 * platform can later pass an adapter that syncs with user accounts.
 */
export interface ProgressStorage {
  /** Raw JSON string, or null if nothing has been saved yet. */
  read(): string | null;
  write(json: string): void;
  /** Keep unreadable data aside instead of silently destroying it. */
  quarantine?(json: string): void;
}

export const SAVE_KEY = 'lagoslife.foodFrenzyNaija.save';

/**
 * Keys used before the game was renamed. A save found under one of these (and none under
 * SAVE_KEY) is moved across on first load, so renaming never costs players their progress.
 */
export const LEGACY_SAVE_KEYS: readonly string[] = ['lagoslife.naijaFoodCrush.save'];

export function memoryStorage(initial: string | null = null): ProgressStorage {
  let value = initial;
  return {
    read: () => value,
    write: (json) => {
      value = json;
    },
  };
}

/** localStorage with graceful fallback (private mode, blocked storage, quota errors). */
export function localProgressStorage(key = SAVE_KEY, legacyKeys: readonly string[] = key === SAVE_KEY ? LEGACY_SAVE_KEYS : []): ProgressStorage {
  const fallback = memoryStorage();
  const ls = (): Storage | null => {
    try {
      return typeof window !== 'undefined' && window.localStorage ? window.localStorage : null;
    } catch {
      return null;
    }
  };
  return {
    read() {
      try {
        const store = ls();
        const current = store?.getItem(key);
        if (current != null) return current;
        for (const old of legacyKeys) {
          const legacy = store?.getItem(old);
          if (legacy != null) {
            store!.setItem(key, legacy);
            store!.removeItem(old);
            return legacy;
          }
        }
        return fallback.read();
      } catch {
        return fallback.read();
      }
    },
    write(json) {
      fallback.write(json);
      try {
        ls()?.setItem(key, json);
      } catch {
        /* storage full or blocked: progress stays in memory for this session */
      }
    },
    quarantine(json) {
      try {
        ls()?.setItem(`${key}.corrupt.${Date.now()}`, json);
      } catch {
        /* ignore */
      }
    },
  };
}

export function parseStoredSave(storage: ProgressStorage): { data: unknown; corrupt: boolean } {
  const raw = storage.read();
  if (raw === null || raw === '') return { data: null, corrupt: false };
  try {
    return { data: JSON.parse(raw), corrupt: false };
  } catch {
    storage.quarantine?.(raw);
    return { data: null, corrupt: true };
  }
}
