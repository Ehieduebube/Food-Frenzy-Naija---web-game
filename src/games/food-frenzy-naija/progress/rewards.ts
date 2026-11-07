import type { BoosterId } from '../engine/game';
import type { LevelConfig } from '../levels/types';
import type { LevelRecord, SaveData } from './saveSchema';

export type BoosterBundle = Partial<Record<BoosterId, number>>;

export interface RewardSummary {
  coins: number;
  boosters: BoosterBundle;
}

export interface LevelResultReward extends RewardSummary {
  firstClear: boolean;
  newStars: number;
  newBest: boolean;
}

export const COINS_PER_STAR = 10;
export const REPLAY_COINS = 5;

/** Coins and boosters for completing a level. First clears pay the level reward; replays pay for improvements. */
export function levelReward(level: LevelConfig, prev: LevelRecord | undefined, stars: number, score: number): LevelResultReward {
  const firstClear = !prev?.completed;
  const prevStars = prev?.stars ?? 0;
  const newStars = Math.max(0, stars - prevStars);
  const newBest = score > (prev?.bestScore ?? 0);
  if (firstClear) {
    return {
      coins: level.reward.coins + stars * COINS_PER_STAR,
      boosters: { ...(level.reward.boosters ?? {}) },
      firstClear,
      newStars,
      newBest,
    };
  }
  return { coins: REPLAY_COINS + newStars * COINS_PER_STAR, boosters: {}, firstClear, newStars, newBest };
}

/** Seven-day reward cycle. Missing a day never resets the cycle: it simply continues next visit. */
export const DAILY_REWARDS: RewardSummary[] = [
  { coins: 100, boosters: {} },
  { coins: 0, boosters: { ladle: 1 } },
  { coins: 150, boosters: {} },
  { coins: 0, boosters: { shuffle: 1 } },
  { coins: 200, boosters: {} },
  { coins: 0, boosters: { moves: 1 } },
  { coins: 300, boosters: { pot: 1 } },
];

export function dailyRewardStatus(save: SaveData, today: string): { canClaim: boolean; dayIndex: number } {
  return { canClaim: save.daily.lastClaimDate !== today, dayIndex: save.daily.nextDay % DAILY_REWARDS.length };
}

/** Coin prices for boosters in the shop. */
export const BOOSTER_PRICES: Record<BoosterId, number> = {
  ladle: 120,
  shuffle: 100,
  pot: 300,
  moves: 250,
};

/** Level from which each booster can be used and bought. */
export const BOOSTER_UNLOCK_LEVEL: Record<BoosterId, number> = {
  ladle: 4,
  shuffle: 6,
  moves: 9,
  pot: 12,
};
