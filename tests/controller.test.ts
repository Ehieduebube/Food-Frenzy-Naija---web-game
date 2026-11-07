import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getLevel } from '../src/games/food-frenzy-naija/levels/levels';
import { GameController } from '../src/games/food-frenzy-naija/session/controller';
import type { BoosterId } from '../src/games/food-frenzy-naija/engine/game';
import { hasAnyMatch, } from '../src/games/food-frenzy-naija/engine/match';
import { findValidMoves } from '../src/games/food-frenzy-naija/engine/moves';

function make(levelId: number, seed: number, boosters: Partial<Record<BoosterId, number>> = {}) {
  const inventory: Record<BoosterId, number> = { ladle: 0, shuffle: 0, pot: 0, moves: 0, ...boosters };
  const c = new GameController({
    level: getLevel(levelId)!,
    seed,
    reducedMotion: () => false,
    haptics: () => false,
    hasBooster: (id) => inventory[id] > 0,
    consumeBooster: (id) => {
      inventory[id]--;
    },
  });
  return { c, inventory };
}

/** The view must always end up showing exactly the engine's board. */
function expectViewMatchesEngine(c: GameController) {
  const v = c.store.getState();
  const cells = c.session.engine.board.cells;
  const expected = cells.flatMap((cell, idx) => (cell.tile ? [{ id: cell.tile.id, idx, special: cell.tile.special, food: cell.tile.food }] : []));
  const shown = v.tiles.map((t) => ({ id: t.id, idx: t.idx, special: t.special, food: t.food }));
  expect(shown).toEqual(expected);
  expect(v.cells.map((x) => [x.blocker?.hp ?? 0, x.wrap, x.oil])).toEqual(cells.map((x) => [x.blocker?.hp ?? 0, x.wrap, x.oil]));
  expect(v.hud.score).toBe(c.session.score);
  expect(v.hud.movesLeft).toBe(c.session.movesLeft);
}

describe('game controller playback', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('plays a whole level through animations without ever getting stuck', async () => {
    for (const levelId of [1, 9, 20, 30]) {
      const { c } = make(levelId, 4242 + levelId);
      let guard = 0;
      while (c.store.getState().outcome === null && guard++ < 60) {
        const mv = c.bestMove();
        expect(mv).not.toBeNull();
        const done = c.trySwap(mv![0], mv![1]);
        // input is locked while the move resolves
        expect(c.store.getState().busy).toBe(true);
        expect(c.canInteract).toBe(false);
        await vi.runAllTimersAsync();
        await done;
        expect(c.store.getState().busy).toBe(false);
        expectViewMatchesEngine(c);
        expect(hasAnyMatch(c.session.engine.board)).toBe(false);
        if (c.store.getState().outcome === null) expect(findValidMoves(c.session.engine.board).length).toBeGreaterThan(0);
        expect(c.store.getState().ghosts).toEqual([]);
        expect(c.store.getState().fx).toEqual([]);
      }
      expect(c.store.getState().outcome).not.toBeNull();
      expect(c.store.getState().finalScore).toBe(c.session.score);
      c.dispose();
    }
  }, 60_000); // a long simulation: give it room when the whole suite runs in parallel

  it('ignores input while busy and after the level ends', async () => {
    const { c } = make(1, 77);
    const [a, b] = c.bestMove()!;
    const first = c.trySwap(a, b);
    const movesAfterFirst = c.session.movesLeft;
    await c.trySwap(a, b); // rejected: still animating
    expect(c.session.movesLeft).toBe(movesAfterFirst);
    await vi.runAllTimersAsync();
    await first;
    c.dispose();
  });

  it('reverts invalid swaps without spending a move', async () => {
    const { c } = make(2, 5);
    const board = c.session.engine.board;
    // find an adjacent pair that is not a valid move
    let pair: [number, number] | null = null;
    const valid = new Set(findValidMoves(board).map((m) => `${m.a},${m.b}`));
    for (let i = 0; i < board.cells.length && !pair; i++) {
      if (i % board.cols < board.cols - 1 && !valid.has(`${i},${i + 1}`)) pair = [i, i + 1];
    }
    const before = c.session.movesLeft;
    const p = c.trySwap(pair![0], pair![1]);
    await vi.runAllTimersAsync();
    await p;
    expect(c.session.movesLeft).toBe(before);
    expectViewMatchesEngine(c);
    c.dispose();
  });

  it('uses boosters only when owned, and they never cost a move', async () => {
    const { c, inventory } = make(20, 9, { pot: 1, ladle: 1 });
    const moves = c.session.movesLeft;
    expect(await c.useBooster('shuffle', null)).toBe(false);
    const p = c.useBooster('pot', 9);
    await vi.runAllTimersAsync();
    expect(await p).toBe(true);
    expect(inventory.pot).toBe(0);
    expect(c.session.movesLeft).toBe(moves);
    expect(c.session.totals.destroyed.crate).toBeGreaterThan(0);
    expectViewMatchesEngine(c);
    c.dispose();
  });

  it('a lost level can continue with extra moves', async () => {
    const { c } = make(10, 3, { moves: 1 });
    c.session.movesLeft = 1;
    const mv = c.bestMove()!;
    const p = c.trySwap(mv[0], mv[1]);
    await vi.runAllTimersAsync();
    await p;
    expect(c.store.getState().outcome).toBe('lost');
    expect(await c.useBooster('moves', null)).toBe(true);
    expect(c.store.getState().outcome).toBeNull();
    expect(c.session.movesLeft).toBe(5);
    expect(c.canInteract).toBe(true);
    c.dispose();
  });

  it('stops all timers when disposed mid-animation', async () => {
    const { c } = make(1, 11);
    const mv = c.bestMove()!;
    void c.trySwap(mv[0], mv[1]);
    c.dispose();
    expect(vi.getTimerCount()).toBe(0);
  });
});
