import type { BoosterId } from '../../engine/game';

export const BOOSTER_ORDER: BoosterId[] = ['ladle', 'shuffle', 'moves', 'pot'];

export const BOOSTER_NAMES: Record<BoosterId, string> = {
  ladle: "Chef's Ladle",
  shuffle: 'Food Shuffle',
  pot: "Mama's Pot",
  moves: 'Extra Moves',
};

export const BOOSTER_DESCRIPTIONS: Record<BoosterId, string> = {
  ladle: 'Scoop out any single food, or knock one layer off an obstacle.',
  shuffle: 'Rearrange the foods when the board gets difficult.',
  pot: 'Clears a big 5×5 area and removes every obstacle layer in it.',
  moves: 'Adds 5 more moves when you are close to finishing.',
};

/** Boosters that need the player to pick a cell. */
export const TARGETED: ReadonlySet<BoosterId> = new Set<BoosterId>(['ladle', 'pot']);
