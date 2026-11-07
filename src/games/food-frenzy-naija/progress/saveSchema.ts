import type { BoosterId } from '../engine/game';

/**
 * Save data format. Bump SAVE_VERSION and add a step to `migrate` when the shape changes.
 * `sanitizeSave` accepts anything (missing, partial, corrupted or older data) and always
 * returns a valid SaveData, so a bad save can never crash the game.
 */
export const SAVE_VERSION = 1;

export const BOOSTER_IDS: BoosterId[] = ['ladle', 'shuffle', 'pot', 'moves'];

export interface LevelRecord {
  completed: boolean;
  stars: 0 | 1 | 2 | 3;
  bestScore: number;
  plays: number;
}

export type ReducedMotionPref = 'system' | 'on' | 'off';

export interface Settings {
  sfx: boolean;
  music: boolean;
  reducedMotion: ReducedMotionPref;
  haptics: boolean;
}

export interface Stats {
  gamesPlayed: number;
  wins: number;
  losses: number;
  tilesCleared: number;
  rocketsActivated: number;
  blastsActivated: number;
  firesActivated: number;
  specialCombos: number;
  obstaclesCleared: number;
  boostersUsed: number;
  bestCascade: number;
  bestScore: number;
  dailyClaims: number;
  challengesCompleted: number;
  coinsEarned: number;
}

export interface SaveData {
  version: number;
  levels: Record<string, LevelRecord>;
  coins: number;
  boosters: Record<BoosterId, number>;
  daily: { lastClaimDate: string | null; nextDay: number };
  challenge: { completed: string[] };
  achievements: Record<string, { unlockedAt: string; claimed: boolean }>;
  stats: Stats;
  settings: Settings;
  tutorialsSeen: string[];
  createdAt: string;
  updatedAt: string;
}

export const STARTING_COINS = 150;

export function defaultStats(): Stats {
  return {
    gamesPlayed: 0,
    wins: 0,
    losses: 0,
    tilesCleared: 0,
    rocketsActivated: 0,
    blastsActivated: 0,
    firesActivated: 0,
    specialCombos: 0,
    obstaclesCleared: 0,
    boostersUsed: 0,
    bestCascade: 0,
    bestScore: 0,
    dailyClaims: 0,
    challengesCompleted: 0,
    coinsEarned: 0,
  };
}

export function defaultSettings(): Settings {
  return { sfx: true, music: true, reducedMotion: 'system', haptics: true };
}

export function defaultSave(now = new Date()): SaveData {
  const iso = now.toISOString();
  return {
    version: SAVE_VERSION,
    levels: {},
    coins: STARTING_COINS,
    boosters: { ladle: 0, shuffle: 0, pot: 0, moves: 0 },
    daily: { lastClaimDate: null, nextDay: 0 },
    challenge: { completed: [] },
    achievements: {},
    stats: defaultStats(),
    settings: defaultSettings(),
    tutorialsSeen: [],
    createdAt: iso,
    updatedAt: iso,
  };
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const num = (v: unknown, fallback: number, min = 0, max = Number.MAX_SAFE_INTEGER): number =>
  typeof v === 'number' && Number.isFinite(v) ? Math.min(max, Math.max(min, Math.floor(v))) : fallback;
const bool = (v: unknown, fallback: boolean): boolean => (typeof v === 'boolean' ? v : fallback);
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const dateKey = (v: unknown): string | null => (typeof v === 'string' && DATE_RE.test(v) ? v : null);

/** Upgrade older save formats in place. */
function migrate(raw: Record<string, unknown>): Record<string, unknown> {
  // version 0 (pre-release) had no version field and nothing to change yet.
  return raw;
}

export function sanitizeSave(input: unknown, now = new Date()): SaveData {
  const base = defaultSave(now);
  if (!isObj(input)) return base;
  const raw = migrate(input);

  const levels: Record<string, LevelRecord> = {};
  if (isObj(raw.levels)) {
    for (const [key, value] of Object.entries(raw.levels)) {
      const id = Number(key);
      if (!Number.isInteger(id) || id < 1 || id > 10000 || !isObj(value)) continue;
      const stars = num(value.stars, 0, 0, 3) as LevelRecord['stars'];
      const completed = bool(value.completed, stars > 0);
      levels[String(id)] = {
        completed,
        stars: completed ? (Math.max(1, stars) as LevelRecord['stars']) : 0,
        bestScore: num(value.bestScore, 0),
        plays: num(value.plays, 0),
      };
    }
  }

  const boosters = { ...base.boosters };
  if (isObj(raw.boosters)) for (const id of BOOSTER_IDS) boosters[id] = num(raw.boosters[id], 0, 0, 999);

  const daily = { ...base.daily };
  if (isObj(raw.daily)) {
    daily.lastClaimDate = dateKey(raw.daily.lastClaimDate);
    daily.nextDay = num(raw.daily.nextDay, 0, 0, 6);
  }

  const challenge = { completed: [] as string[] };
  if (isObj(raw.challenge) && Array.isArray(raw.challenge.completed)) {
    challenge.completed = raw.challenge.completed.map(dateKey).filter((d): d is string => d !== null).slice(-60);
  }

  const achievements: SaveData['achievements'] = {};
  if (isObj(raw.achievements)) {
    for (const [id, value] of Object.entries(raw.achievements)) {
      if (!isObj(value) || typeof value.unlockedAt !== 'string') continue;
      achievements[id] = { unlockedAt: value.unlockedAt, claimed: bool(value.claimed, false) };
    }
  }

  const stats = defaultStats();
  if (isObj(raw.stats)) for (const k of Object.keys(stats) as (keyof Stats)[]) stats[k] = num(raw.stats[k], 0);

  const settings = defaultSettings();
  if (isObj(raw.settings)) {
    settings.sfx = bool(raw.settings.sfx, settings.sfx);
    settings.music = bool(raw.settings.music, settings.music);
    settings.haptics = bool(raw.settings.haptics, settings.haptics);
    const rm = raw.settings.reducedMotion;
    settings.reducedMotion = rm === 'on' || rm === 'off' || rm === 'system' ? rm : 'system';
  }

  const tutorialsSeen = Array.isArray(raw.tutorialsSeen)
    ? [...new Set(raw.tutorialsSeen.filter((t): t is string => typeof t === 'string'))]
    : [];

  return {
    version: SAVE_VERSION,
    levels,
    coins: num(raw.coins, base.coins, 0, 9_999_999),
    boosters,
    daily,
    challenge,
    achievements,
    stats,
    settings,
    tutorialsSeen,
    createdAt: typeof raw.createdAt === 'string' ? raw.createdAt : base.createdAt,
    updatedAt: typeof raw.updatedAt === 'string' ? raw.updatedAt : base.updatedAt,
  };
}

/** Highest level the player may start: every level up to one past the furthest completed. */
export function highestUnlocked(save: SaveData, levelCount: number): number {
  let n = 1;
  while (n <= levelCount && save.levels[String(n)]?.completed) n++;
  return Math.min(n, levelCount);
}

export function totalStars(save: SaveData): number {
  return Object.values(save.levels).reduce((sum, l) => sum + l.stars, 0);
}

/**
 * The leaderboard score: the sum of the best score on every completed level. It only grows as the
 * player clears new levels or beats a best, which suits a board that keeps each player's highest number.
 */
export function totalBestScore(save: SaveData): number {
  return Object.values(save.levels).reduce((sum, l) => sum + (l.completed ? l.bestScore : 0), 0);
}

export function completedCount(save: SaveData): number {
  return Object.values(save.levels).filter((l) => l.completed).length;
}
