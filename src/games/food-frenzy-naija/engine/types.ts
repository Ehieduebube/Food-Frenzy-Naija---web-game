/**
 * Core types for the Food Frenzy Naija match-3 engine.
 * The engine is pure TypeScript (no DOM, no React) so it can be unit tested,
 * simulated headlessly and driven by any renderer.
 */

/** The seven Nigerian foods, by index. */
export const FOOD_KEYS = ['jollof', 'dodo', 'puff', 'akara', 'suya', 'moimoi', 'chinchin'] as const;
export type FoodKey = (typeof FOOD_KEYS)[number];
export type Food = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export const FOOD_NAMES: Record<Food, string> = {
  0: 'Jollof Rice',
  1: 'Dodo',
  2: 'Puff-puff',
  3: 'Akara',
  4: 'Suya',
  5: 'Moi Moi',
  6: 'Chin-chin',
};

/**
 * Special pieces.
 * - rocketH / rocketV: Dodo Rocket, clears a row / column.
 * - blast: Jollof Blast, clears a surrounding area.
 * - fire: Suya Fire, clears every tile of one food type (has no food of its own).
 */
export type Special = 'rocketH' | 'rocketV' | 'blast' | 'fire';

export interface Tile {
  id: number;
  /** null only for Suya Fire, which matches nothing. */
  food: Food | null;
  special: Special | null;
}

export type BlockerKind = 'basket' | 'crate';

export interface Blocker {
  kind: BlockerKind;
  hp: number;
}

export interface Cell {
  /** false = restricted cell (not part of the board). */
  playable: boolean;
  tile: Tile | null;
  /** A basket or pepper crate occupies the cell; there is never a tile under it. */
  blocker: Blocker | null;
  /** Leaf wrap layers covering the tile. A wrapped tile cannot be swapped and does not fall. */
  wrap: number;
  /** Palm-oil spill layers on the floor under the tile. */
  oil: number;
}

export interface Board {
  rows: number;
  cols: number;
  cells: Cell[];
}

export interface EngineState {
  board: Board;
  /** Mulberry32 RNG state. */
  rng: number;
  nextId: number;
  /** Food types that can spawn on this level. */
  foods: Food[];
}

export type ObstacleLayer = 'basket' | 'crate' | 'wrap' | 'oil';

export type ClearCause = 'match' | 'special' | 'combo' | 'booster' | 'finale';

export interface ClearedTile {
  id: number;
  idx: number;
  food: Food | null;
  special: Special | null;
  cause: ClearCause;
  /** For tiles merged into a newly created special: the cell they fly into. */
  mergeTo?: number;
}

export type EffectKind =
  | 'rocketH'
  | 'rocketV'
  | 'blast'
  | 'fire'
  | 'cross'
  | 'bigCross'
  | 'mega'
  | 'convert'
  | 'pot'
  | 'ladle';

export interface Effect {
  kind: EffectKind;
  idx: number;
  /** Area radius for blasts. */
  radius?: number;
  /** Target cells (fire beams, conversions). */
  targets?: number[];
  food?: Food | null;
}

export interface ObstacleHit {
  idx: number;
  layer: ObstacleLayer;
  before: number;
  after: number;
}

export interface Floater {
  idx: number;
  points: number;
}

/** One visual beat of a clear: specials created, tiles popped, effects fired. */
export interface ClearPhase {
  cleared: ClearedTile[];
  effects: Effect[];
  hits: ObstacleHit[];
  created: { idx: number; tile: Tile }[];
  converted: { idx: number; tile: Tile }[];
  floaters: Floater[];
  points: number;
  /** Board after this phase (only when recording). */
  snapshot?: Board;
}

export interface FallMove {
  id: number;
  from: number;
  to: number;
}

export interface Spawn {
  id: number;
  to: number;
  /** Rows above its final cell that the tile starts from. */
  drop: number;
}

/** Statistics gathered while resolving, used for goals, achievements and scoring. */
export interface ResolveStats {
  points: number;
  collected: number[]; // per food index
  destroyed: Record<ObstacleLayer, number>;
  activated: Record<Special, number>;
  created: Record<Special, number>;
  combos: number; // special+special swaps
  maxCascade: number;
  tilesCleared: number;
}

export function emptyStats(): ResolveStats {
  return {
    points: 0,
    collected: [0, 0, 0, 0, 0, 0, 0],
    destroyed: { basket: 0, crate: 0, wrap: 0, oil: 0 },
    activated: { rocketH: 0, rocketV: 0, blast: 0, fire: 0 },
    created: { rocketH: 0, rocketV: 0, blast: 0, fire: 0 },
    combos: 0,
    maxCascade: 0,
    tilesCleared: 0,
  };
}

export function mergeStats(into: ResolveStats, from: ResolveStats): void {
  into.points += from.points;
  for (let i = 0; i < 7; i++) into.collected[i] += from.collected[i];
  for (const k of Object.keys(into.destroyed) as ObstacleLayer[]) into.destroyed[k] += from.destroyed[k];
  for (const k of Object.keys(into.activated) as Special[]) {
    into.activated[k] += from.activated[k];
    into.created[k] += from.created[k];
  }
  into.combos += from.combos;
  into.maxCascade = Math.max(into.maxCascade, from.maxCascade);
  into.tilesCleared += from.tilesCleared;
}

/** Animation-ready steps produced by a move. */
export type Step =
  | { kind: 'swap'; a: number; b: number; snapshot?: Board }
  | { kind: 'swapBack'; a: number; b: number; snapshot?: Board }
  | { kind: 'clear'; cascade: number; phases: ClearPhase[] }
  | { kind: 'fall'; moves: FallMove[]; spawns: Spawn[]; snapshot?: Board }
  | { kind: 'shuffle'; moves: FallMove[]; snapshot?: Board }
  | { kind: 'banner'; text: string };

export interface Move {
  a: number;
  b: number;
}
