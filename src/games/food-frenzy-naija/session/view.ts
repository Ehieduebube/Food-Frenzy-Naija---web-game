import type { BoosterId } from '../engine/game';
import type { GoalState } from '../engine/goals';
import type { Blocker, Board, Effect, Food, ObstacleLayer, Special } from '../engine/types';

/** A food piece as the renderer sees it. Positions are cell indices; the view converts to rows/cols. */
export interface VisualTile {
  id: number;
  food: Food | null;
  special: Special | null;
  idx: number;
  /** Duration of the current position transition. */
  dur: number;
  /** Rows above its cell that a freshly spawned tile drops from (0 = not spawned this beat). */
  drop: number;
  /** Bumped whenever the tile lands, to replay the landing squash. */
  landSeq: number;
  /** 'fall' accelerates like gravity; 'slide' is used for swaps and shuffles. */
  motion: 'fall' | 'slide';
}

export interface CellView {
  playable: boolean;
  blocker: Blocker | null;
  wrap: number;
  oil: number;
}

export interface Ghost {
  key: string;
  idx: number;
  /** Fly toward this cell while vanishing (pieces merging into a new special). */
  toIdx?: number;
  food: Food | null;
  special: Special | null;
  kind: 'pop' | 'merge' | 'burn';
}

export interface BreakFx {
  key: string;
  idx: number;
  layer: ObstacleLayer;
  before: number;
}

export interface FxView {
  key: string;
  effect: Effect;
}

export interface FloaterView {
  key: string;
  idx: number;
  text: string;
}

export interface BannerView {
  key: string;
  text: string;
  tone: 'combo' | 'info' | 'finale';
}

export interface HudView {
  score: number;
  movesLeft: number;
  goals: GoalState[];
}

export type Outcome = null | 'won' | 'lost';

export interface SessionView {
  rows: number;
  cols: number;
  tiles: VisualTile[];
  cells: CellView[];
  ghosts: Ghost[];
  breaks: BreakFx[];
  fx: FxView[];
  floaters: FloaterView[];
  banner: BannerView | null;
  hud: HudView;
  busy: boolean;
  selected: number | null;
  hint: [number, number] | null;
  shakeKey: number;
  boosterMode: BoosterId | null;
  outcome: Outcome;
  finalScore: number;
}

export function cellsFrom(board: Board): CellView[] {
  return board.cells.map((c) => ({
    playable: c.playable,
    blocker: c.blocker ? { ...c.blocker } : null,
    wrap: c.wrap,
    oil: c.oil,
  }));
}
