import { cloneBoard, fillWithoutMatches, foodsCompletingLine, isMovable, randomFood } from './board';
import { hasAnyMatch } from './match';
import { hasValidMove } from './moves';
import { shuffleInPlace } from './rng';
import type { EngineState, FallMove, Tile } from './types';

/**
 * Rearrange the movable foods so there are no ready-made matches and at least one valid move.
 * Tile identities are kept (so the view can animate them to their new cells) and obstacles stay put.
 * Returns the moves made, or null if the board could not be made playable.
 */
export function shuffleBoard(state: EngineState): FallMove[] | null {
  const board = state.board;
  const slots: number[] = [];
  board.cells.forEach((c, i) => {
    if (isMovable(c)) slots.push(i);
  });
  const original = slots.map((i) => board.cells[i].tile!) as Tile[];
  const originalPos = new Map<number, number>();
  slots.forEach((s, k) => originalPos.set(original[k].id, s));

  const placeAll = (tiles: Tile[]) => slots.forEach((s, k) => (board.cells[s].tile = tiles[k]));
  const movesFor = (): FallMove[] => {
    const moves: FallMove[] = [];
    for (const s of slots) {
      const t = board.cells[s].tile!;
      const from = originalPos.get(t.id);
      if (from !== undefined && from !== s) moves.push({ id: t.id, from, to: s });
    }
    return moves;
  };

  // 1) permute existing tiles
  for (let attempt = 0; attempt < 150; attempt++) {
    const tiles = shuffleInPlace(state, original.slice());
    placeAll(tiles);
    if (!hasAnyMatch(board) && hasValidMove(board)) return movesFor();
  }

  // 2) permute, then re-roll plain foods that form matches (keeps specials)
  for (let attempt = 0; attempt < 100; attempt++) {
    const tiles = shuffleInPlace(state, original.slice());
    placeAll(tiles);
    for (const s of slots) {
      const t = board.cells[s].tile!;
      if (t.special) continue;
      const r = Math.floor(s / board.cols);
      const c = s % board.cols;
      board.cells[s].tile = null;
      const banned = foodsCompletingLine(board, r, c);
      board.cells[s].tile = t;
      if (t.food !== null && banned.has(t.food)) t.food = randomFood(state, banned);
    }
    if (!hasAnyMatch(board) && hasValidMove(board)) return movesFor();
  }

  // 3) last resort: fresh foods everywhere that can move
  const backup = cloneBoard(board);
  for (let attempt = 0; attempt < 100; attempt++) {
    for (const s of slots) board.cells[s].tile = null;
    fillWithoutMatches(state);
    if (hasValidMove(board)) {
      // treat refreshed tiles as brand new pieces
      return [];
    }
  }
  board.cells = backup.cells;
  return null;
}
