import { colOf, idxOf, rowOf } from './board';
import type { Board, Food, Special } from './types';

export interface Run {
  cells: number[];
  dir: 'h' | 'v';
  food: Food;
}

export interface MatchGroup {
  food: Food;
  cells: number[];
  runs: Run[];
}

/** The food that participates in matching at a cell, or null. Suya Fire never matches. */
export function matchFood(board: Board, i: number): Food | null {
  const cell = board.cells[i];
  if (!cell.playable || !cell.tile || cell.tile.special === 'fire') return null;
  return cell.tile.food;
}

export function findRuns(board: Board): Run[] {
  const runs: Run[] = [];
  for (let r = 0; r < board.rows; r++) {
    let c = 0;
    while (c < board.cols) {
      const f = matchFood(board, idxOf(board, r, c));
      let end = c + 1;
      if (f !== null) {
        while (end < board.cols && matchFood(board, idxOf(board, r, end)) === f) end++;
        if (end - c >= 3) {
          const cells: number[] = [];
          for (let k = c; k < end; k++) cells.push(idxOf(board, r, k));
          runs.push({ cells, dir: 'h', food: f });
        }
      }
      c = end;
    }
  }
  for (let c = 0; c < board.cols; c++) {
    let r = 0;
    while (r < board.rows) {
      const f = matchFood(board, idxOf(board, r, c));
      let end = r + 1;
      if (f !== null) {
        while (end < board.rows && matchFood(board, idxOf(board, end, c)) === f) end++;
        if (end - r >= 3) {
          const cells: number[] = [];
          for (let k = r; k < end; k++) cells.push(idxOf(board, k, c));
          runs.push({ cells, dir: 'v', food: f });
        }
      }
      r = end;
    }
  }
  return runs;
}

/** Merge runs that share a cell into groups (L, T and + shapes become one group). */
export function findGroups(board: Board): MatchGroup[] {
  const runs = findRuns(board);
  if (runs.length === 0) return [];
  const parent = runs.map((_, i) => i);
  const find = (x: number): number => {
    while (parent[x] !== x) {
      parent[x] = parent[parent[x]];
      x = parent[x];
    }
    return x;
  };
  const owner = new Map<number, number>();
  runs.forEach((run, ri) => {
    for (const cell of run.cells) {
      const other = owner.get(cell);
      if (other === undefined) owner.set(cell, ri);
      else parent[find(ri)] = find(other);
    }
  });
  const byRoot = new Map<number, MatchGroup>();
  runs.forEach((run, ri) => {
    const root = find(ri);
    let g = byRoot.get(root);
    if (!g) {
      g = { food: run.food, cells: [], runs: [] };
      byRoot.set(root, g);
    }
    g.runs.push(run);
    for (const cell of run.cells) if (!g.cells.includes(cell)) g.cells.push(cell);
  });
  return [...byRoot.values()];
}

/** Which special a match group earns: 5 in a line = Suya Fire, L/T = Jollof Blast, 4 = Dodo Rocket. */
export function specialForGroup(group: MatchGroup): Special | null {
  let longest = 0;
  let longestDir: 'h' | 'v' = 'h';
  let hasH = false;
  let hasV = false;
  for (const run of group.runs) {
    if (run.cells.length > longest) {
      longest = run.cells.length;
      longestDir = run.dir;
    }
    if (run.dir === 'h') hasH = true;
    else hasV = true;
  }
  if (longest >= 5) return 'fire';
  if (hasH && hasV) return 'blast';
  if (longest === 4) return longestDir === 'h' ? 'rocketH' : 'rocketV';
  return null;
}

/** Cell where a group's special appears: a swapped cell if involved, else the L/T corner, else the middle of the line. */
export function placementForGroup(board: Board, group: MatchGroup, preferred: readonly number[]): number | null {
  const ok = (i: number) => {
    const cell = board.cells[i];
    return cell.tile !== null && cell.tile.special === null && cell.wrap === 0;
  };
  for (const p of preferred) if (group.cells.includes(p) && ok(p)) return p;
  const hRuns = group.runs.filter((r) => r.dir === 'h');
  const vRuns = group.runs.filter((r) => r.dir === 'v');
  for (const h of hRuns) for (const v of vRuns) for (const c of h.cells) if (v.cells.includes(c) && ok(c)) return c;
  const longest = group.runs.reduce((a, b) => (b.cells.length > a.cells.length ? b : a));
  const mid = Math.floor((longest.cells.length - 1) / 2);
  const order = [mid, mid + 1, mid - 1, mid + 2, mid - 2, 0, longest.cells.length - 1];
  for (const k of order) {
    const c = longest.cells[k];
    if (c !== undefined && ok(c)) return c;
  }
  for (const c of group.cells) if (ok(c)) return c;
  return null;
}

/** Length of the longest line through cell i if it held `food` (used for move validation). */
export function lineLengthsAt(board: Board, i: number, food: Food): { h: number; v: number } {
  const r = rowOf(board, i);
  const c = colOf(board, i);
  let h = 1;
  for (let k = c - 1; k >= 0 && matchFood(board, idxOf(board, r, k)) === food; k--) h++;
  for (let k = c + 1; k < board.cols && matchFood(board, idxOf(board, r, k)) === food; k++) h++;
  let v = 1;
  for (let k = r - 1; k >= 0 && matchFood(board, idxOf(board, k, c)) === food; k--) v++;
  for (let k = r + 1; k < board.rows && matchFood(board, idxOf(board, k, c)) === food; k++) v++;
  return { h, v };
}

export function hasMatchAt(board: Board, i: number): boolean {
  const f = matchFood(board, i);
  if (f === null) return false;
  const { h, v } = lineLengthsAt(board, i, f);
  return h >= 3 || v >= 3;
}

export function hasAnyMatch(board: Board): boolean {
  for (let i = 0; i < board.cells.length; i++) if (hasMatchAt(board, i)) return true;
  return false;
}
