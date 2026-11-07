import { afterEach, describe, expect, it, vi } from 'vitest';
import { emptyStats } from '../src/games/food-frenzy-naija/engine/types';
import { dailyChallengeFor } from '../src/games/food-frenzy-naija/levels/daily';
import { LEVELS, getLevel, starsForScore } from '../src/games/food-frenzy-naija/levels/levels';
import { bootProfile, flushProfile, shutdownProfile, useProfile, type GameResultInput } from '../src/games/food-frenzy-naija/progress/profileStore';
import { DAILY_REWARDS, levelReward } from '../src/games/food-frenzy-naija/progress/rewards';
import { SAVE_VERSION, highestUnlocked, sanitizeSave, totalStars } from '../src/games/food-frenzy-naija/progress/saveSchema';
import { LEGACY_SAVE_KEYS, SAVE_KEY, localProgressStorage, memoryStorage, type ProgressStorage } from '../src/games/food-frenzy-naija/progress/storage';
import { createSession } from '../src/games/food-frenzy-naija/engine/game';

const win = (score: number, stars: 1 | 2 | 3): GameResultInput => ({ won: true, score, stars, totals: emptyStats() });
const loss = (): GameResultInput => ({ won: false, score: 1000, stars: 0, totals: emptyStats() });

function fresh(storage: ProgressStorage = memoryStorage()) {
  shutdownProfile();
  bootProfile(storage);
  return storage;
}

afterEach(() => shutdownProfile());

describe('save data validation', () => {
  it('returns a clean default for missing or garbage data', () => {
    for (const input of [null, undefined, 42, 'x', [], { levels: 'nope', coins: -5, boosters: { pot: 'a' } }]) {
      const s = sanitizeSave(input);
      expect(s.version).toBe(SAVE_VERSION);
      expect(s.coins).toBeGreaterThanOrEqual(0);
      expect(s.boosters.pot).toBe(0);
      expect(s.levels).toEqual({});
    }
  });

  it('keeps valid fields and repairs broken ones', () => {
    const s = sanitizeSave({
      levels: { '1': { completed: true, stars: 7, bestScore: 5000.7, plays: 3 }, '2': { stars: 2 }, abc: {}, '-3': {} },
      coins: 320,
      boosters: { ladle: 2, shuffle: -1 },
      daily: { lastClaimDate: '2026-01-02', nextDay: 9 },
      settings: { sfx: false, reducedMotion: 'sometimes' },
      tutorialsSeen: ['swap', 'swap', 3],
    });
    expect(s.levels['1']).toEqual({ completed: true, stars: 3, bestScore: 5000, plays: 3 });
    expect(s.levels['2'].completed).toBe(true);
    expect(Object.keys(s.levels)).toEqual(['1', '2']);
    expect(s.coins).toBe(320);
    expect(s.boosters).toEqual({ ladle: 2, shuffle: 0, pot: 0, moves: 0 });
    expect(s.daily).toEqual({ lastClaimDate: '2026-01-02', nextDay: 6 });
    expect(s.settings.sfx).toBe(false);
    expect(s.settings.reducedMotion).toBe('system');
    expect(s.tutorialsSeen).toEqual(['swap']);
  });

  it('starts fresh (and keeps the bad data aside) when the stored JSON is corrupt', () => {
    const quarantined: string[] = [];
    const storage: ProgressStorage = { ...memoryStorage('{not json'), quarantine: (j) => quarantined.push(j) };
    fresh(storage);
    expect(useProfile.getState().notice).toMatch(/could not be read/);
    expect(quarantined).toEqual(['{not json']);
    expect(useProfile.getState().save.levels).toEqual({});
  });
});

describe('level progression', () => {
  it('unlocks levels in order only', () => {
    fresh();
    const p = useProfile.getState();
    expect(highestUnlocked(p.save, LEVELS.length)).toBe(1);
    p.recordLevelResult(1, win(9000, 2));
    expect(highestUnlocked(useProfile.getState().save, LEVELS.length)).toBe(2);
    useProfile.getState().recordLevelResult(2, loss());
    expect(highestUnlocked(useProfile.getState().save, LEVELS.length)).toBe(2);
    useProfile.getState().recordLevelResult(2, win(9000, 1));
    expect(highestUnlocked(useProfile.getState().save, LEVELS.length)).toBe(3);
  });

  it('pays the level reward once, then only for improvements, and keeps the best result', () => {
    fresh();
    const start = useProfile.getState().save.coins;
    const lvl3 = getLevel(3)!;
    const r1 = useProfile.getState().recordLevelResult(3, win(5000, 1))!;
    expect(r1.firstClear).toBe(true);
    expect(r1.coins).toBe(lvl3.reward.coins + 10);
    expect(useProfile.getState().save.boosters.ladle).toBe(2);
    const r2 = useProfile.getState().recordLevelResult(3, win(20000, 3))!;
    expect(r2.firstClear).toBe(false);
    expect(r2.newStars).toBe(2);
    expect(r2.coins).toBe(5 + 20);
    const r3 = useProfile.getState().recordLevelResult(3, win(100, 1))!;
    expect(r3.coins).toBe(5);
    const rec = useProfile.getState().save.levels['3'];
    expect(rec).toMatchObject({ completed: true, stars: 3, bestScore: 20000, plays: 3 });
    expect(useProfile.getState().save.coins).toBe(start + r1.coins + r2.coins + r3.coins);
    expect(useProfile.getState().save.boosters.ladle).toBe(2);
  });

  it('star ratings follow the thresholds and are at least 1 on completion', () => {
    const lvl = { stars: [1000, 2000, 3000] as [number, number, number] };
    expect(starsForScore(lvl, 0)).toBe(1);
    expect(starsForScore(lvl, 1999)).toBe(1);
    expect(starsForScore(lvl, 2000)).toBe(2);
    expect(starsForScore(lvl, 3000)).toBe(3);
    expect(levelReward(getLevel(1)!, undefined, 3, 10).coins).toBe(getLevel(1)!.reward.coins + 30);
  });

  it('progress survives a refresh', () => {
    const storage = fresh();
    useProfile.getState().recordLevelResult(1, win(12000, 3));
    useProfile.getState().buyBooster('ladle');
    useProfile.getState().setSettings({ sfx: false });
    const coins = useProfile.getState().save.coins;
    shutdownProfile(); // flushes the pending write
    const reloaded = memoryStorage(storage.read());
    fresh(reloaded);
    const s = useProfile.getState().save;
    expect(s.levels['1']).toMatchObject({ completed: true, stars: 3, bestScore: 12000 });
    expect(s.coins).toBe(coins);
    expect(s.boosters.ladle).toBe(1);
    expect(s.settings.sfx).toBe(false);
    expect(totalStars(s)).toBe(3);
  });
});

describe('daily rewards', () => {
  it('can be claimed once per day and cycles through seven days', () => {
    fresh();
    const p = () => useProfile.getState();
    const c0 = p().save.coins;
    expect(p().claimDaily('2026-11-07')).toEqual(DAILY_REWARDS[0]);
    expect(p().claimDaily('2026-11-07')).toBeNull();
    expect(p().save.coins).toBe(c0 + DAILY_REWARDS[0].coins);
    expect(p().claimDaily('2026-11-08')).toEqual(DAILY_REWARDS[1]);
    expect(p().save.boosters.ladle).toBe(1);
    // skipping days does not reset the cycle
    expect(p().claimDaily('2026-11-20')).toEqual(DAILY_REWARDS[2]);
    for (let d = 21; d <= 24; d++) p().claimDaily(`2026-11-${d}`);
    expect(p().save.daily.nextDay).toBe(0);
    expect(p().save.stats.dailyClaims).toBe(7);
    expect(p().save.achievements.loyal).toBeDefined();
  });
});

describe('daily challenge', () => {
  it('is deterministic for a date and differs between dates', () => {
    const a = dailyChallengeFor('2026-11-07');
    const b = dailyChallengeFor('2026-11-07');
    expect(a).toEqual(b);
    const sa = createSession({ ...a.level, seed: a.seed }).engine.board.cells.map((c) => c.tile?.food);
    const sb = createSession({ ...b.level, seed: b.seed }).engine.board.cells.map((c) => c.tile?.food);
    expect(sa).toEqual(sb);
    const days = new Set(Array.from({ length: 14 }, (_, i) => JSON.stringify(dailyChallengeFor(`2026-12-${String(i + 1).padStart(2, '0')}`).level)));
    expect(days.size).toBeGreaterThan(5);
  });

  it('rewards only the first win of the day', () => {
    fresh();
    const ch = dailyChallengeFor('2026-11-07');
    expect(useProfile.getState().recordChallengeResult(ch, win(1, 1))).toEqual(ch.reward);
    expect(useProfile.getState().recordChallengeResult(ch, win(1, 1))).toBeNull();
    expect(useProfile.getState().save.stats.challengesCompleted).toBe(1);
  });
});

describe('boosters, coins and achievements', () => {
  it('only spends what the player has', () => {
    fresh();
    const p = () => useProfile.getState();
    expect(p().useBooster('pot')).toBe(false);
    p().spendCoins(p().save.coins);
    expect(p().buyBooster('ladle')).toBe(false);
    expect(p().spendCoins(1)).toBe(false);
  });

  it('unlocks achievements and pays them out once', () => {
    fresh();
    const p = () => useProfile.getState();
    p().recordLevelResult(1, win(9000, 3));
    expect(p().save.achievements['first-bite']).toMatchObject({ claimed: false });
    expect(p().unlockedQueue.map((a) => a.id)).toEqual(expect.arrayContaining(['first-bite', 'three-star']));
    const coins = p().save.coins;
    expect(p().claimAchievement('first-bite')).toBe(25);
    expect(p().claimAchievement('first-bite')).toBe(0);
    expect(p().save.coins).toBe(coins + 25);
  });
});

describe('save key after the rename', () => {
  function fakeLocalStorage() {
    const data = new Map<string, string>();
    vi.stubGlobal('window', {
      localStorage: {
        getItem: (k: string) => data.get(k) ?? null,
        setItem: (k: string, v: string) => void data.set(k, v),
        removeItem: (k: string) => void data.delete(k),
      },
    });
    return data;
  }
  afterEach(() => vi.unstubAllGlobals());

  it('moves a save from the previous key to the new one', () => {
    const data = fakeLocalStorage();
    data.set(LEGACY_SAVE_KEYS[0], '{"coins":999}');
    const storage = localProgressStorage();
    expect(storage.read()).toBe('{"coins":999}');
    expect(data.get(SAVE_KEY)).toBe('{"coins":999}');
    expect(data.has(LEGACY_SAVE_KEYS[0])).toBe(false);
    // a second read comes from the new key, and the save is still valid progress
    expect(sanitizeSave(JSON.parse(storage.read()!)).coins).toBe(999);
  });

  it('prefers a save that already uses the new key', () => {
    const data = fakeLocalStorage();
    data.set(SAVE_KEY, '{"coins":5}');
    data.set(LEGACY_SAVE_KEYS[0], '{"coins":999}');
    expect(localProgressStorage().read()).toBe('{"coins":5}');
  });
});

describe('bought coins', () => {
  it('adds the coins once per purchase id, written to storage right away, and not as earned coins', () => {
    const storage = fresh();
    const start = useProfile.getState().save.coins;
    expect(useProfile.getState().grantPurchase('pur_1', 500)).toBe(true);
    expect(useProfile.getState().grantPurchase('pur_1', 500)).toBe(false);
    expect(useProfile.getState().grantPurchase('pur_2', 0)).toBe(false);
    const save = useProfile.getState().save;
    expect(save.coins).toBe(start + 500);
    expect(save.purchases).toEqual(['pur_1']);
    expect(save.stats.coinsEarned).toBe(0);
    flushProfile();
    expect(JSON.parse(storage.read()!).purchases).toEqual(['pur_1']);
  });

  it('remembers given purchases through a progress reset, so none is ever given twice', () => {
    fresh();
    useProfile.getState().grantPurchase('pur_1', 500);
    useProfile.getState().resetProgress();
    expect(useProfile.getState().save.purchases).toEqual(['pur_1']);
    expect(useProfile.getState().grantPurchase('pur_1', 500)).toBe(false);
  });
});
