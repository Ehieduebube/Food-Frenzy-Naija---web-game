import { colOf, idxOf, inBounds, rowOf } from './board';
import type { Board } from './types';

export function rowCells(board: Board, r: number): number[] {
  const out: number[] = [];
  if (r < 0 || r >= board.rows) return out;
  for (let c = 0; c < board.cols; c++) out.push(idxOf(board, r, c));
  return out;
}

export function colCells(board: Board, c: number): number[] {
  const out: number[] = [];
  if (c < 0 || c >= board.cols) return out;
  for (let r = 0; r < board.rows; r++) out.push(idxOf(board, r, c));
  return out;
}

/**
 * Cells around `center` within a square of the given radius.
 * With `cutCorners`, the corners are rounded off (|dr| + |dc| <= 2 * radius - 1), giving a round blast.
 */
export function areaCells(board: Board, center: number, radius: number, cutCorners: boolean): number[] {
  const r0 = rowOf(board, center);
  const c0 = colOf(board, center);
  const out: number[] = [];
  for (let dr = -radius; dr <= radius; dr++) {
    for (let dc = -radius; dc <= radius; dc++) {
      if (cutCorners && radius > 1 && Math.abs(dr) + Math.abs(dc) > 2 * radius - 1) continue;
      const r = r0 + dr;
      const c = c0 + dc;
      if (inBounds(board, r, c)) out.push(idxOf(board, r, c));
    }
  }
  return out;
}

export function uniqueCells(lists: number[][]): number[] {
  const seen = new Set<number>();
  const out: number[] = [];
  for (const list of lists) {
    for (const i of list) {
      if (!seen.has(i)) {
        seen.add(i);
        out.push(i);
      }
    }
  }
  return out;
}

export const BLAST_RADIUS = 2;
export const BIG_BLAST_RADIUS = 3;
export const POT_RADIUS = 2;
