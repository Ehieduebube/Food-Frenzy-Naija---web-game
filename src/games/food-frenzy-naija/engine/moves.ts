import { areAdjacent, isMovable } from './board';
import { hasMatchAt } from './match';
import type { Board, Move } from './types';

export type SwapKind = 'match' | 'combo' | 'fire' | 'invalid' | 'blocked';

/**
 * Classify a swap without changing the board.
 * - blocked: not adjacent, or one side cannot move (empty, basket/crate, leaf wrap, restricted cell)
 * - combo: two special pieces
 * - fire: Suya Fire swapped with a normal food
 * - match: the swap lines up 3+ foods
 * - invalid: nothing happens, the tiles swap back
 */
export function classifySwap(board: Board, a: number, b: number): SwapKind {
  if (a === b || !areAdjacent(board, a, b)) return 'blocked';
  const ca = board.cells[a];
  const cb = board.cells[b];
  if (!isMovable(ca) || !isMovable(cb)) return 'blocked';
  const ta = ca.tile!;
  const tb = cb.tile!;
  if (ta.special && tb.special) return 'combo';
  if (ta.special === 'fire' || tb.special === 'fire') return 'fire';
  ca.tile = tb;
  cb.tile = ta;
  const ok = hasMatchAt(board, a) || hasMatchAt(board, b);
  ca.tile = ta;
  cb.tile = tb;
  return ok ? 'match' : 'invalid';
}

export function isValidSwap(board: Board, a: number, b: number): boolean {
  const k = classifySwap(board, a, b);
  return k === 'match' || k === 'combo' || k === 'fire';
}

/** Every valid swap on the board (each pair listed once). */
export function findValidMoves(board: Board, limit = Infinity): Move[] {
  const out: Move[] = [];
  for (let i = 0; i < board.cells.length; i++) {
    if (!isMovable(board.cells[i])) continue;
    const c = i % board.cols;
    const right = c < board.cols - 1 ? i + 1 : -1;
    const down = i + board.cols < board.cells.length ? i + board.cols : -1;
    for (const j of [right, down]) {
      if (j < 0) continue;
      if (isValidSwap(board, i, j)) {
        out.push({ a: i, b: j });
        if (out.length >= limit) return out;
      }
    }
  }
  return out;
}

export function hasValidMove(board: Board): boolean {
  return findValidMoves(board, 1).length > 0;
}
