import type { BoosterId } from '../engine/game';
import type { GoalSpec } from '../engine/goals';
import type { Food } from '../engine/types';

export type RegionId = 'mainland' | 'balogun' | 'lekki' | 'carnival';
export type Difficulty = 'easy' | 'medium' | 'hard' | 'super hard';

export type TutorialId =
  | 'swap'
  | 'goals'
  | 'cascade'
  | 'ladle'
  | 'shuffle'
  | 'rocket'
  | 'blast'
  | 'fire'
  | 'combo'
  | 'moves'
  | 'score'
  | 'basket'
  | 'pot'
  | 'wrap'
  | 'oil'
  | 'crate'
  | 'restricted';

export interface LevelReward {
  /** Coins on first completion. Replays pay a smaller amount (see progress/rewards). */
  coins: number;
  boosters?: Partial<Record<BoosterId, number>>;
}

export interface LevelConfig {
  id: number;
  name: string;
  region: RegionId;
  moves: number;
  foods: Food[];
  /** Board layout; see engine/board.ts for the legend. Defaults to an open 8x8 board. */
  layout?: string[];
  goals: GoalSpec[];
  /** Score needed for 1, 2 and 3 stars. Completing the goals always earns at least 1 star. */
  stars: [number, number, number];
  difficulty: Difficulty;
  reward: LevelReward;
  tutorials?: TutorialId[];
}

export interface RegionConfig {
  id: RegionId;
  name: string;
  tagline: string;
  firstLevel: number;
  lastLevel: number;
}
