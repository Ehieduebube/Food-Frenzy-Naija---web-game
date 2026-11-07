import { nextRandom, randomInt } from './rng';
import type { Board, Cell, EngineState, Food, Special, Tile } from './types';

/**
 * Level layout legend (one character per cell):
 *   .  normal cell
 *   #  restricted cell (not part of the board)
 *   b  food basket (1 hit)
 *   c  pepper crate (2 hits)
 *   C  reinforced pepper crate (3 hits)
 *   w  leaf-wrapped food (1 layer)
 *   W  double leaf-wrapped food (2 layers)
 *   o  palm-oil spill under the food (1 layer)
 *   O  thick palm-oil spill (2 layers)
 *   x  leaf-wrapped food on a palm-oil spill
 *   h  pre-placed Dodo Rocket (clears its row)
 *   v  pre-placed Dodo Rocket (clears its column)
 *   j  pre-placed Jollof Blast
 *   f  pre-placed Suya Fire
 */
export const LAYOUT_CHARS = '.#bcCwWoOxhvjf';

const PRESET_SPECIALS: Record<string, Special> = { h: 'rocketH', v: 'rocketV', j: 'blast', f: 'fire' };

/** Special pieces placed by the level layout (used by tutorial levels). */
export function layoutPresets(layout: readonly string[] | undefined): { r: number; c: number; special: Special }[] {
  const out: { r: number; c: number; special: Special }[] = [];
  layout?.forEach((line, r) => {
    for (let c = 0; c < line.length; c++) {
      const sp = PRESET_SPECIALS[line[c]];
      if (sp) out.push({ r, c, special: sp });
    }
  });
  return out;
}

export function idxOf(board: Board, r: number, c: number): number {
  return r * board.cols + c;
}

export function rowOf(board: Board, i: number): number {
  return Math.floor(i / board.cols);
}

export function colOf(board: Board, i: number): number {
  return i % board.cols;
}

export function inBounds(board: Board, r: number, c: number): boolean {
  return r >= 0 && c >= 0 && r < board.rows && c < board.cols;
}

export function neighbors4(board: Board, i: number): number[] {
  const r = rowOf(board, i);
  const c = colOf(board, i);
  const out: number[] = [];
  if (r > 0) out.push(i - board.cols);
  if (r < board.rows - 1) out.push(i + board.cols);
  if (c > 0) out.push(i - 1);
  if (c < board.cols - 1) out.push(i + 1);
  return out;
}

export function areAdjacent(board: Board, a: number, b: number): boolean {
  const dr = Math.abs(rowOf(board, a) - rowOf(board, b));
  const dc = Math.abs(colOf(board, a) - colOf(board, b));
  return dr + dc === 1;
}

/** A tile can be swapped and falls with gravity. */
export function isMovable(cell: Cell): boolean {
  return cell.playable && cell.tile !== null && cell.blocker === null && cell.wrap === 0;
}

/** A playable cell that stays put and splits its column for gravity. */
export function isFixed(cell: Cell): boolean {
  return cell.blocker !== null || (cell.wrap > 0 && cell.tile !== null);
}

export function emptyCell(playable = true): Cell {
  return { playable, tile: null, blocker: null, wrap: 0, oil: 0 };
}

export function parseLayout(layout: readonly string[] | undefined, rows = 8, cols = 8): Board {
  const lines = layout && layout.length > 0 ? layout : Array.from({ length: rows }, () => '.'.repeat(cols));
  const r0 = lines.length;
  const c0 = Math.max(...lines.map((l) => l.length));
  const cells: Cell[] = [];
  for (let r = 0; r < r0; r++) {
    for (let c = 0; c < c0; c++) {
      const ch = lines[r][c] ?? '#';
      const cell = emptyCell(ch !== '#' && ch !== ' ');
      switch (ch) {
        case 'b':
          cell.blocker = { kind: 'basket', hp: 1 };
          break;
        case 'c':
          cell.blocker = { kind: 'crate', hp: 2 };
          break;
        case 'C':
          cell.blocker = { kind: 'crate', hp: 3 };
          break;
        case 'w':
          cell.wrap = 1;
          break;
        case 'W':
          cell.wrap = 2;
          break;
        case 'o':
          cell.oil = 1;
          break;
        case 'O':
          cell.oil = 2;
          break;
        case 'x':
          cell.wrap = 1;
          cell.oil = 1;
          break;
        default:
          break;
      }
      cells.push(cell);
    }
  }
  return { rows: r0, cols: c0, cells };
}

export function cloneTile(t: Tile | null): Tile | null {
  return t ? { id: t.id, food: t.food, special: t.special } : null;
}

export function cloneBoard(board: Board): Board {
  return {
    rows: board.rows,
    cols: board.cols,
    cells: board.cells.map((c) => ({
      playable: c.playable,
      tile: cloneTile(c.tile),
      blocker: c.blocker ? { kind: c.blocker.kind, hp: c.blocker.hp } : null,
      wrap: c.wrap,
      oil: c.oil,
    })),
  };
}

export function cloneEngine(state: EngineState): EngineState {
  return { board: cloneBoard(state.board), rng: state.rng, nextId: state.nextId, foods: state.foods.slice() };
}

export function newTile(state: EngineState, food: Food | null, special: Special | null = null): Tile {
  return { id: state.nextId++, food, special };
}

export function randomFood(state: EngineState, exclude?: ReadonlySet<Food>): Food {
  const options = exclude && exclude.size > 0 ? state.foods.filter((f) => !exclude.has(f)) : state.foods;
  const list = options.length > 0 ? options : state.foods;
  return list[randomInt(state, list.length)];
}

/** Foods that would complete a line of three at (r, c) if placed there, looking at every direction. */
export function foodsCompletingLine(board: Board, r: number, c: number): Set<Food> {
  const out = new Set<Food>();
  const foodAt = (rr: number, cc: number): Food | null => {
    if (!inBounds(board, rr, cc)) return null;
    const t = board.cells[idxOf(board, rr, cc)].tile;
    return t && t.special !== 'fire' ? t.food : null;
  };
  const check = (a: Food | null, b: Food | null) => {
    if (a !== null && a === b) out.add(a);
  };
  check(foodAt(r, c - 1), foodAt(r, c - 2));
  check(foodAt(r, c + 1), foodAt(r, c + 2));
  check(foodAt(r, c - 1), foodAt(r, c + 1));
  check(foodAt(r - 1, c), foodAt(r - 2, c));
  check(foodAt(r + 1, c), foodAt(r + 2, c));
  check(foodAt(r - 1, c), foodAt(r + 1, c));
  return out;
}

/** Fill every empty playable cell with a food that does not create a match. */
export function fillWithoutMatches(state: EngineState): void {
  const b = state.board;
  for (let r = 0; r < b.rows; r++) {
    for (let c = 0; c < b.cols; c++) {
      const cell = b.cells[idxOf(b, r, c)];
      if (!cell.playable || cell.blocker || cell.tile) continue;
      cell.tile = newTile(state, randomFood(state, foodsCompletingLine(b, r, c)));
    }
  }
}

export function createEngine(layout: readonly string[] | undefined, foods: Food[], seed: number): EngineState {
  const board = parseLayout(layout);
  const state: EngineState = { board, rng: seed | 0, nextId: 1, foods: foods.slice() };
  // warm the generator so nearby seeds diverge quickly
  nextRandom(state);
  for (const p of layoutPresets(layout)) {
    const cell = board.cells[idxOf(board, p.r, p.c)];
    const food = p.special === 'fire' ? null : randomFood(state, foodsCompletingLine(board, p.r, p.c));
    cell.tile = newTile(state, food, p.special);
  }
  return state;
}

export function countObstacles(board: Board): { basket: number; crate: number; wrap: number; oil: number } {
  const out = { basket: 0, crate: 0, wrap: 0, oil: 0 };
  for (const c of board.cells) {
    if (c.blocker?.kind === 'basket') out.basket++;
    if (c.blocker?.kind === 'crate') out.crate++;
    if (c.wrap > 0) out.wrap++;
    if (c.oil > 0) out.oil++;
  }
  return out;
}
