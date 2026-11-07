import { idxOf, isFixed, newTile, randomFood, rowOf } from './board';
import type { EngineState, FallMove, Spawn } from './types';

/**
 * Drop tiles into empty cells and refill from the top.
 *
 * Each column is split into segments by fixed cells (baskets, crates, wrapped food).
 * Tiles fall within their segment, passing over restricted cells, and fresh food
 * enters at the top of the segment (from above the board, or from behind the fixed cell).
 * This guarantees every empty cell is refilled, so the board can never stall.
 */
export function applyGravity(state: EngineState): { moves: FallMove[]; spawns: Spawn[] } {
  const b = state.board;
  const moves: FallMove[] = [];
  const spawns: Spawn[] = [];

  const processSegment = (seg: number[]) => {
    if (seg.length === 0) return;
    // tiles from bottom to top
    const stack: { id: number; from: number }[] = [];
    const tiles = [];
    for (let k = seg.length - 1; k >= 0; k--) {
      const t = b.cells[seg[k]].tile;
      if (t) {
        stack.push({ id: t.id, from: seg[k] });
        tiles.push(t);
        b.cells[seg[k]].tile = null;
      }
    }
    let w = seg.length - 1;
    for (let n = 0; n < tiles.length; n++) {
      const to = seg[w--];
      b.cells[to].tile = tiles[n];
      if (to !== stack[n].from) moves.push({ id: tiles[n].id, from: stack[n].from, to });
    }
    const missing = w + 1;
    const topRow = rowOf(b, seg[0]);
    for (let k = w; k >= 0; k--) {
      const to = seg[k];
      const tile = newTile(state, randomFood(state));
      b.cells[to].tile = tile;
      const startRow = topRow - (missing - k);
      spawns.push({ id: tile.id, to, drop: rowOf(b, to) - startRow });
    }
  };

  for (let c = 0; c < b.cols; c++) {
    let seg: number[] = [];
    for (let r = 0; r < b.rows; r++) {
      const i = idxOf(b, r, c);
      const cell = b.cells[i];
      if (!cell.playable) continue;
      if (isFixed(cell)) {
        processSegment(seg);
        seg = [];
      } else {
        seg.push(i);
      }
    }
    processSegment(seg);
  }
  return { moves, spawns };
}
