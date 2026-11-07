import type { Food, ObstacleLayer, ResolveStats } from './types';

export type SpecialFamily = 'rocket' | 'blast' | 'fire';

export type GoalSpec =
  | { kind: 'collect'; food: Food; count: number }
  /** Clear every obstacle of this kind placed on the board. */
  | { kind: 'clear'; layer: ObstacleLayer }
  | { kind: 'score'; score: number }
  /** Set off special pieces of a family (by any means). */
  | { kind: 'activate'; special: SpecialFamily; count: number };

export interface GoalState {
  spec: GoalSpec;
  current: number;
  required: number;
  done: boolean;
}

export type ObstacleCounts = Record<ObstacleLayer, number>;

export function activatedFamily(stats: ResolveStats, family: SpecialFamily): number {
  switch (family) {
    case 'rocket':
      return stats.activated.rocketH + stats.activated.rocketV;
    case 'blast':
      return stats.activated.blast;
    case 'fire':
      return stats.activated.fire;
  }
}

export function evaluateGoals(
  specs: readonly GoalSpec[],
  totals: ResolveStats,
  initial: ObstacleCounts,
  score: number,
): GoalState[] {
  return specs.map((spec) => {
    let current = 0;
    let required = 0;
    switch (spec.kind) {
      case 'collect':
        current = totals.collected[spec.food];
        required = spec.count;
        break;
      case 'clear':
        current = totals.destroyed[spec.layer];
        required = initial[spec.layer];
        break;
      case 'score':
        current = score;
        required = spec.score;
        break;
      case 'activate':
        current = activatedFamily(totals, spec.special);
        required = spec.count;
        break;
    }
    const capped = Math.min(current, required);
    return { spec, current: capped, required, done: capped >= required };
  });
}

export function allGoalsDone(goals: readonly GoalState[]): boolean {
  return goals.every((g) => g.done);
}

export function describeGoal(spec: GoalSpec, foodName: (f: Food) => string): string {
  switch (spec.kind) {
    case 'collect':
      return `Collect ${spec.count} ${foodName(spec.food)}`;
    case 'clear':
      return {
        basket: 'Clear all food baskets',
        crate: 'Break all pepper crates',
        wrap: 'Unwrap all leaf-wrapped food',
        oil: 'Clean all palm-oil spills',
      }[spec.layer];
    case 'score':
      return `Score ${spec.score.toLocaleString('en-US')} points`;
    case 'activate':
      return `Set off ${spec.count} ${{ rocket: 'Dodo Rockets', blast: 'Jollof Blasts', fire: 'Suya Fires' }[spec.special]}`;
  }
}
