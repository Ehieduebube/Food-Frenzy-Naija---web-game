import type { Special } from './types';

/** Points per food tile cleared by a match (before the cascade multiplier). */
export const POINTS_MATCH_TILE = 20;
/** Points per tile cleared by a special piece, combo or booster. */
export const POINTS_SPECIAL_TILE = 30;
/** Points per obstacle layer hit. */
export const POINTS_OBSTACLE_HIT = 40;
/** Extra points when a basket or crate is fully destroyed. */
export const POINTS_BLOCKER_DESTROYED = 60;
/** Bonus for building a special piece. */
export const POINTS_CREATE: Record<Special, number> = {
  rocketH: 60,
  rocketV: 60,
  blast: 90,
  fire: 150,
};
/** Bonus for swapping two special pieces together. */
export const POINTS_COMBO_BONUS = 300;
/** The cascade multiplier is capped so scores stay readable. */
export const MAX_MULTIPLIER = 8;

export function cascadeMultiplier(cascade: number): number {
  return Math.max(1, Math.min(MAX_MULTIPLIER, cascade));
}
