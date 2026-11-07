import { countObstacles, emptyCell } from '../src/games/food-frenzy-naija/engine/board';
import type { GoalSpec } from '../src/games/food-frenzy-naija/engine/goals';
import type { Session } from '../src/games/food-frenzy-naija/engine/game';
import { emptyStats, type Board, type Cell, type Food, type Special } from '../src/games/food-frenzy-naija/engine/types';

/**
 * Build a session from a readable grid. Tokens are separated by spaces:
 *   0-6     food
 *   suffix  h = Dodo Rocket (row), v = Dodo Rocket (column), x = Jollof Blast, w = leaf wrap, o = palm oil
 *   F       Suya Fire
 *   #       restricted cell
 *   b       basket, c = crate (2 hits), C = crate (3 hits)
 *   .       empty playable cell
 */
export function sessionFrom(rows: string[], opts: { goals?: GoalSpec[]; moves?: number; foods?: Food[]; seed?: number } = {}): Session {
  let nextId = 1;
  const grid = rows.map((r) => r.trim().split(/\s+/));
  const cells: Cell[] = [];
  for (const row of grid) {
    for (const tok of row) {
      const cell = emptyCell(tok !== '#');
      if (tok === 'b') cell.blocker = { kind: 'basket', hp: 1 };
      else if (tok === 'c') cell.blocker = { kind: 'crate', hp: 2 };
      else if (tok === 'C') cell.blocker = { kind: 'crate', hp: 3 };
      else if (tok === 'F') cell.tile = { id: nextId++, food: null, special: 'fire' };
      else if (/^[0-6]/.test(tok)) {
        const food = Number(tok[0]) as Food;
        let special: Special | null = null;
        if (tok.includes('h')) special = 'rocketH';
        if (tok.includes('v')) special = 'rocketV';
        if (tok.includes('x')) special = 'blast';
        cell.tile = { id: nextId++, food, special };
        if (tok.includes('w')) cell.wrap = 1;
        if (tok.includes('W')) cell.wrap = 2;
        if (tok.includes('o')) cell.oil = 1;
      }
      cells.push(cell);
    }
  }
  const board: Board = { rows: grid.length, cols: grid[0].length, cells };
  const foods = opts.foods ?? ([0, 1, 2, 3, 4, 5, 6] as Food[]);
  return {
    config: { foods, moves: opts.moves ?? 20, goals: opts.goals ?? [], seed: opts.seed ?? 1 },
    engine: { board, rng: opts.seed ?? 12345, nextId, foods },
    score: 0,
    movesLeft: opts.moves ?? 20,
    movesUsed: 0,
    totals: emptyStats(),
    initialObstacles: countObstacles(board),
    status: 'playing',
  };
}

export const at = (s: Session, r: number, c: number) => r * s.engine.board.cols + c;

export function ids(s: Session): Set<number> {
  const out = new Set<number>();
  for (const c of s.engine.board.cells) if (c.tile) out.add(c.tile.id);
  return out;
}

export function boardIsFull(s: Session): boolean {
  return s.engine.board.cells.every((c) => !c.playable || c.blocker !== null || c.tile !== null);
}
