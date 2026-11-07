import { create } from 'zustand';
import type { BoosterId } from '../engine/game';
import type { ResolveStats } from '../engine/types';
import type { DailyChallenge } from '../levels/daily';
import { getLevel } from '../levels/levels';
import { ACHIEVEMENTS, newlyUnlocked, type AchievementDef } from './achievements';
import {
  BOOSTER_PRICES,
  DAILY_REWARDS,
  dailyRewardStatus,
  levelReward,
  type BoosterBundle,
  type LevelResultReward,
  type RewardSummary,
} from './rewards';
import { defaultSave, sanitizeSave, type SaveData, type Settings } from './saveSchema';
import { parseStoredSave, type ProgressStorage } from './storage';

export interface GameResultInput {
  won: boolean;
  score: number;
  stars: 0 | 1 | 2 | 3;
  totals: ResolveStats;
}

interface ProfileState {
  save: SaveData;
  /** Shown once if the stored save could not be read. */
  notice: string | null;
  /** Achievements unlocked since the UI last looked. */
  unlockedQueue: AchievementDef[];

  recordLevelResult(levelId: number, result: GameResultInput): LevelResultReward | null;
  recordChallengeResult(challenge: DailyChallenge, result: GameResultInput): RewardSummary | null;
  useBooster(id: BoosterId): boolean;
  buyBooster(id: BoosterId): boolean;
  spendCoins(amount: number): boolean;
  claimDaily(today: string): RewardSummary | null;
  claimAchievement(id: string): number;
  markTutorialsSeen(ids: string[]): void;
  setSettings(patch: Partial<Settings>): void;
  resetProgress(): void;
  dismissNotice(): void;
  shiftUnlocked(): AchievementDef | undefined;
}

function grant(save: SaveData, coins: number, boosters: BoosterBundle | undefined): void {
  save.coins += coins;
  save.stats.coinsEarned += coins;
  if (boosters) {
    for (const [id, n] of Object.entries(boosters) as [BoosterId, number][]) save.boosters[id] = (save.boosters[id] ?? 0) + n;
  }
}

function addGameStats(save: SaveData, r: GameResultInput): void {
  const st = save.stats;
  const t = r.totals;
  st.gamesPlayed++;
  if (r.won) st.wins++;
  else st.losses++;
  st.tilesCleared += t.tilesCleared;
  st.rocketsActivated += t.activated.rocketH + t.activated.rocketV;
  st.blastsActivated += t.activated.blast;
  st.firesActivated += t.activated.fire;
  st.specialCombos += t.combos;
  st.obstaclesCleared += t.destroyed.basket + t.destroyed.crate + t.destroyed.wrap + t.destroyed.oil;
  st.bestCascade = Math.max(st.bestCascade, t.maxCascade);
  st.bestScore = Math.max(st.bestScore, r.score);
}

export const useProfile = create<ProfileState>((set, get) => {
  /** Apply a change to a copy of the save, unlock achievements, then publish it. */
  const mutate = <T>(fn: (draft: SaveData) => T): T => {
    const draft = structuredClone(get().save);
    const result = fn(draft);
    draft.updatedAt = new Date().toISOString();
    const unlocked = newlyUnlocked(draft);
    for (const a of unlocked) draft.achievements[a.id] = { unlockedAt: draft.updatedAt, claimed: false };
    set((s) => ({ save: draft, unlockedQueue: unlocked.length ? [...s.unlockedQueue, ...unlocked] : s.unlockedQueue }));
    return result;
  };

  return {
    save: defaultSave(),
    notice: null,
    unlockedQueue: [],

    recordLevelResult(levelId, result) {
      const level = getLevel(levelId);
      if (!level) return null;
      return mutate((d) => {
        addGameStats(d, result);
        const key = String(levelId);
        const prev = d.levels[key];
        const rec = prev ? { ...prev } : { completed: false, stars: 0 as const, bestScore: 0, plays: 0 };
        rec.plays++;
        if (!result.won) {
          d.levels[key] = rec;
          return null;
        }
        const reward = levelReward(level, prev, result.stars, result.score);
        rec.completed = true;
        rec.stars = Math.max(rec.stars, result.stars) as SaveData['levels'][string]['stars'];
        rec.bestScore = Math.max(rec.bestScore, result.score);
        d.levels[key] = rec;
        grant(d, reward.coins, reward.boosters);
        return reward;
      });
    },

    recordChallengeResult(challenge, result) {
      return mutate((d) => {
        addGameStats(d, result);
        if (!result.won || d.challenge.completed.includes(challenge.dateKey)) return null;
        d.challenge.completed = [...d.challenge.completed, challenge.dateKey].slice(-60);
        d.stats.challengesCompleted++;
        grant(d, challenge.reward.coins, challenge.reward.boosters);
        return challenge.reward;
      });
    },

    useBooster(id) {
      if ((get().save.boosters[id] ?? 0) <= 0) return false;
      mutate((d) => {
        d.boosters[id]--;
        d.stats.boostersUsed++;
      });
      return true;
    },

    buyBooster(id) {
      const price = BOOSTER_PRICES[id];
      if (get().save.coins < price) return false;
      mutate((d) => {
        d.coins -= price;
        d.boosters[id] = (d.boosters[id] ?? 0) + 1;
      });
      return true;
    },

    spendCoins(amount) {
      if (amount <= 0 || get().save.coins < amount) return false;
      mutate((d) => {
        d.coins -= amount;
      });
      return true;
    },

    claimDaily(today) {
      const { canClaim, dayIndex } = dailyRewardStatus(get().save, today);
      if (!canClaim) return null;
      const reward = DAILY_REWARDS[dayIndex];
      mutate((d) => {
        grant(d, reward.coins, reward.boosters);
        d.daily = { lastClaimDate: today, nextDay: (dayIndex + 1) % DAILY_REWARDS.length };
        d.stats.dailyClaims++;
      });
      return reward;
    },

    claimAchievement(id) {
      const entry = get().save.achievements[id];
      const def = ACHIEVEMENTS.find((a) => a.id === id);
      if (!entry || entry.claimed || !def) return 0;
      mutate((d) => {
        d.achievements[id] = { ...d.achievements[id], claimed: true };
        grant(d, def.coins, undefined);
      });
      return def.coins;
    },

    markTutorialsSeen(ids) {
      const seen = get().save.tutorialsSeen;
      if (ids.every((id) => seen.includes(id))) return;
      mutate((d) => {
        d.tutorialsSeen = [...new Set([...d.tutorialsSeen, ...ids])];
      });
    },

    setSettings(patch) {
      mutate((d) => {
        d.settings = { ...d.settings, ...patch };
      });
    },

    resetProgress() {
      const settings = get().save.settings;
      const fresh = defaultSave();
      fresh.settings = settings;
      set({ save: fresh, unlockedQueue: [] });
    },

    dismissNotice() {
      set({ notice: null });
    },

    shiftUnlocked() {
      const [first, ...rest] = get().unlockedQueue;
      if (first) set({ unlockedQueue: rest });
      return first;
    },
  };
});

let activeStorage: ProgressStorage | null = null;
let stopPersisting: (() => void) | null = null;

/**
 * Load progress from storage and keep it saved. Safe to call more than once:
 * calling it again with the same storage is a no-op.
 */
export function bootProfile(storage: ProgressStorage): void {
  if (activeStorage === storage) return;
  stopPersisting?.();
  activeStorage = storage;

  const { data, corrupt } = parseStoredSave(storage);
  const save = sanitizeSave(data);
  useProfile.setState({
    save,
    unlockedQueue: [],
    notice: corrupt ? 'Your saved game could not be read, so a fresh one was started. The old data was kept aside.' : null,
  });

  let timer: ReturnType<typeof setTimeout> | null = null;
  let last = useProfile.getState().save;
  const flush = () => {
    if (timer) clearTimeout(timer);
    timer = null;
    storage.write(JSON.stringify(useProfile.getState().save));
  };
  const unsub = useProfile.subscribe((state) => {
    if (state.save === last) return;
    last = state.save;
    if (timer) clearTimeout(timer);
    timer = setTimeout(flush, 150);
  });
  const onHide = () => {
    if (timer) flush();
  };
  if (typeof window !== 'undefined') {
    window.addEventListener('pagehide', onHide);
    document.addEventListener('visibilitychange', onHide);
  }
  // write once so a sanitized/migrated save replaces whatever was there
  flush();

  stopPersisting = () => {
    if (timer) flush();
    unsub();
    if (typeof window !== 'undefined') {
      window.removeEventListener('pagehide', onHide);
      document.removeEventListener('visibilitychange', onHide);
    }
    activeStorage = null;
  };
}

/** Flush pending writes and stop persisting (when the game is unmounted by the host). */
export function shutdownProfile(): void {
  stopPersisting?.();
  stopPersisting = null;
}
