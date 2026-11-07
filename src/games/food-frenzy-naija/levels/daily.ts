import type { BoosterId } from '../engine/game';
import type { GoalSpec } from '../engine/goals';
import { hashSeed, nextRandom, shuffleInPlace } from '../engine/rng';
import type { Food } from '../engine/types';
import { weekdayName } from '../progress/dates';
import type { RewardSummary } from '../progress/rewards';
import { getLevel } from './levels';
import type { LevelConfig } from './types';

/**
 * The daily challenge is derived only from the date, so it is the same all day
 * (and on every device) and can never change while the player is looking at it.
 *
 * Each challenge is a remix of a tuned level (verified by the simulator): the board
 * may be mirrored and the foods relabelled, so the difficulty stays fair while the
 * puzzle feels new. The starting board is seeded from the date too.
 */
const TEMPLATE_LEVELS = [5, 10, 12, 14, 15, 16, 18, 21, 23, 24, 26, 27, 28, 29, 31, 33, 36];

const THEMES = [
  'Mama Put Special',
  'Owambe Rush',
  'Bukka Hustle',
  'Danfo Snack Run',
  'Street Grill Showdown',
  'Market Day Madness',
  'Small Chops Sprint',
];

const BOOSTER_ROTATION: BoosterId[] = ['ladle', 'shuffle', 'moves', 'pot'];

export const DAILY_CHALLENGE_ID = 1000;

export interface DailyChallenge {
  dateKey: string;
  level: LevelConfig;
  seed: number;
  reward: RewardSummary;
  sourceLevel: number;
}

function mirror(layout: string[] | undefined): string[] | undefined {
  return layout?.map((row) => row.split('').reverse().join(''));
}

export function dailyChallengeFor(dateKey: string): DailyChallenge {
  const seed = hashSeed(`food-frenzy-naija:${dateKey}`);
  const rng = { rng: seed };
  nextRandom(rng);
  const sourceLevel = TEMPLATE_LEVELS[Math.floor(nextRandom(rng) * TEMPLATE_LEVELS.length)];
  const src = getLevel(sourceLevel)!;

  // relabel foods: a permutation of all seven foods
  const perm = shuffleInPlace(rng, [0, 1, 2, 3, 4, 5, 6] as Food[]);
  const mapFood = (f: Food) => perm[f];
  const goals: GoalSpec[] = src.goals.map((g) => (g.kind === 'collect' ? { ...g, food: mapFood(g.food) } : { ...g }));
  const layout = nextRandom(rng) < 0.5 ? mirror(src.layout) : src.layout?.slice();
  const theme = THEMES[Math.floor(nextRandom(rng) * THEMES.length)];
  const booster = BOOSTER_ROTATION[Math.floor(nextRandom(rng) * BOOSTER_ROTATION.length)];

  const level: LevelConfig = {
    id: DAILY_CHALLENGE_ID,
    name: `${weekdayName(dateKey)} ${theme}`,
    region: src.region,
    moves: src.moves,
    foods: src.foods.map(mapFood),
    layout,
    goals,
    stars: [...src.stars] as [number, number, number],
    difficulty: src.difficulty,
    reward: { coins: 150 },
  };
  return { dateKey, level, seed, reward: { coins: 150, boosters: { [booster]: 1 } }, sourceLevel };
}
