import { describe, expect, it } from 'vitest';
import { areaCells } from '../src/games/food-frenzy-naija/engine/areas';
import { parseLayout } from '../src/games/food-frenzy-naija/engine/board';
import { applyBooster, createSession, playSwap, runFinale, type Session } from '../src/games/food-frenzy-naija/engine/game';
import { findGroups, hasAnyMatch, specialForGroup } from '../src/games/food-frenzy-naija/engine/match';
import { classifySwap, findValidMoves, hasValidMove } from '../src/games/food-frenzy-naija/engine/moves';
import { shuffleBoard } from '../src/games/food-frenzy-naija/engine/shuffle';
import type { ClearPhase, Food, Step } from '../src/games/food-frenzy-naija/engine/types';
import { at, boardIsFull, ids, sessionFrom } from './helpers';

/** 6x6 grid with food (r*3+c) % 7: contains no matches and no valid moves. */
function base(rows = 6, cols = 6): string[][] {
  return Array.from({ length: rows }, (_, r) => Array.from({ length: cols }, (_, c) => String((r * 3 + c) % 7)));
}
function build(grid: string[][], opts: Parameters<typeof sessionFrom>[1] = {}): Session {
  return sessionFrom(
    grid.map((r) => r.join(' ')),
    opts,
  );
}
function clears(steps: Step[]): ClearPhase[][] {
  return steps.filter((s): s is Extract<Step, { kind: 'clear' }> => s.kind === 'clear').map((s) => s.phases);
}
function firstPhase(steps: Step[]): ClearPhase {
  return clears(steps)[0][0];
}

/** Row 3 gets 0 0 _ ... and (2,2) holds a 0 that the player swaps down into (3,2). */
function lineSetup(extra: (g: string[][]) => void = () => {}) {
  const g = base();
  g[3][0] = '0';
  g[3][1] = '0';
  g[2][2] = '0';
  extra(g);
  return g;
}

describe('board generation', () => {
  it('starts with no matches, a full board and at least one valid move', () => {
    for (let seed = 1; seed <= 200; seed++) {
      const s = createSession({
        layout: ['..#..#..', '........', '..b..c..', '...ww...', '..oOx...', '........', '#......#', '..C.....'],
        foods: [0, 1, 2, 3, 4, 5] as Food[],
        moves: 20,
        goals: [],
        seed,
      });
      expect(hasAnyMatch(s.engine.board)).toBe(false);
      expect(hasValidMove(s.engine.board)).toBe(true);
      expect(boardIsFull(s)).toBe(true);
    }
  });

  it('is deterministic for a seed', () => {
    const cfg = { foods: [0, 1, 2, 3, 4] as Food[], moves: 20, goals: [], seed: 99 };
    const a = createSession(cfg).engine.board.cells.map((c) => c.tile?.food);
    const b = createSession(cfg).engine.board.cells.map((c) => c.tile?.food);
    expect(a).toEqual(b);
  });

  it('parses obstacles and restricted cells from the layout', () => {
    const b = parseLayout(['#bcC', 'wWoO', 'x...']);
    expect(b.cells[0].playable).toBe(false);
    expect(b.cells[1].blocker).toEqual({ kind: 'basket', hp: 1 });
    expect(b.cells[2].blocker).toEqual({ kind: 'crate', hp: 2 });
    expect(b.cells[3].blocker).toEqual({ kind: 'crate', hp: 3 });
    expect([b.cells[4].wrap, b.cells[5].wrap, b.cells[6].oil, b.cells[7].oil]).toEqual([1, 2, 1, 2]);
    expect([b.cells[8].wrap, b.cells[8].oil]).toEqual([1, 1]);
  });
});

describe('match detection', () => {
  it('finds lines and classifies special pieces', () => {
    const s = build(lineSetup());
    const board = s.engine.board;
    // simulate the swap result: 0 moves into (3,2), a 6 into (2,2)
    board.cells[at(s, 2, 2)].tile!.food = 6;
    board.cells[at(s, 3, 2)].tile!.food = 0;
    const groups = findGroups(board);
    expect(groups).toHaveLength(1);
    expect(groups[0].cells.sort((a, b) => a - b)).toEqual([at(s, 3, 0), at(s, 3, 1), at(s, 3, 2)]);
    expect(specialForGroup(groups[0])).toBeNull();
  });

  it('merges L shapes into one group that earns a Jollof Blast', () => {
    const s = build(base());
    const b = s.engine.board;
    for (const [r, c] of [
      [3, 0],
      [3, 1],
      [3, 2],
      [4, 2],
      [5, 2],
    ])
      b.cells[at(s, r, c)].tile!.food = 0;
    const groups = findGroups(b);
    expect(groups).toHaveLength(1);
    expect(groups[0].cells).toHaveLength(5);
    expect(specialForGroup(groups[0])).toBe('blast');
  });
});

describe('swapping', () => {
  it('reverts an invalid swap without using a move', () => {
    const s = build(base(), { moves: 10 });
    const before = s.engine.board.cells.map((c) => c.tile?.id);
    const res = playSwap(s, at(s, 0, 0), at(s, 0, 1));
    expect(res.valid).toBe(false);
    expect(res.steps.map((x) => x.kind)).toEqual(['swap', 'swapBack']);
    expect(s.movesLeft).toBe(10);
    expect(s.engine.board.cells.map((c) => c.tile?.id)).toEqual(before);
  });

  it('rejects non-adjacent swaps and wrapped or blocked tiles', () => {
    const g = base();
    g[0][0] = '0w';
    g[0][3] = 'b';
    const s = build(g);
    expect(classifySwap(s.engine.board, at(s, 0, 0), at(s, 0, 1))).toBe('blocked');
    expect(classifySwap(s.engine.board, at(s, 0, 2), at(s, 0, 3))).toBe('blocked');
    expect(classifySwap(s.engine.board, at(s, 1, 1), at(s, 3, 1))).toBe('blocked');
  });

  it('clears a three-match, drops the tiles above and refills from the top', () => {
    const s = build(lineSetup(), { moves: 10 });
    const above = s.engine.board.cells[at(s, 2, 0)].tile!.id;
    const res = playSwap(s, at(s, 2, 2), at(s, 3, 2));
    expect(res.valid).toBe(true);
    expect(s.movesLeft).toBe(9);
    const p = firstPhase(res.steps);
    expect(p.cleared.map((c) => c.idx).sort((a, b) => a - b)).toEqual([at(s, 3, 0), at(s, 3, 1), at(s, 3, 2)]);
    const fall = res.steps.find((x) => x.kind === 'fall') as Extract<Step, { kind: 'fall' }>;
    expect(fall.moves).toContainEqual({ id: above, from: at(s, 2, 0), to: at(s, 3, 0) });
    expect(fall.spawns.filter((sp) => sp.drop === 1).map((sp) => sp.to).sort((a, b) => a - b)).toEqual(
      expect.arrayContaining([at(s, 0, 0), at(s, 0, 1), at(s, 0, 2)]),
    );
    expect(boardIsFull(s)).toBe(true);
    expect(hasAnyMatch(s.engine.board)).toBe(false);
    expect(s.score).toBeGreaterThanOrEqual(60);
  });
});

describe('special pieces', () => {
  it('a 4-match makes a Dodo Rocket where the moved food lands', () => {
    const s = build(lineSetup((g) => (g[3][3] = '0')));
    const moved = s.engine.board.cells[at(s, 2, 2)].tile!.id;
    const res = playSwap(s, at(s, 2, 2), at(s, 3, 2));
    const p = firstPhase(res.steps);
    expect(p.created).toHaveLength(1);
    expect(p.created[0].idx).toBe(at(s, 3, 2));
    expect(p.created[0].tile.special).toBe('rocketH');
    expect(p.created[0].tile.id).toBe(moved);
    expect(res.stats.created.rocketH).toBe(1);
  });

  it('a 5-match makes Suya Fire and an L makes a Jollof Blast', () => {
    const five = build(
      lineSetup((g) => {
        g[3][3] = '0';
        g[3][4] = '0';
        g[3][5] = '1';
      }),
    );
    const r5 = playSwap(five, at(five, 2, 2), at(five, 3, 2));
    expect(firstPhase(r5.steps).created[0].tile.special).toBe('fire');
    expect(firstPhase(r5.steps).created[0].tile.food).toBeNull();

    const ell = build(lineSetup((g) => (g[5][2] = '0')));
    const rl = playSwap(ell, at(ell, 2, 2), at(ell, 3, 2));
    expect(firstPhase(rl.steps).created[0].tile.special).toBe('blast');
    expect(firstPhase(rl.steps).created[0].idx).toBe(at(ell, 3, 2));
  });

  it('a Dodo Rocket clears its whole row when set off', () => {
    const g = base();
    g[2][3] = '3h';
    const s = build(g);
    const res = applyBooster(s, 'ladle', at(s, 2, 3));
    expect(res.valid).toBe(true);
    const phases = clears(res.steps)[0];
    const clearedIdx = phases.flatMap((p) => p.cleared.map((c) => c.idx));
    for (let c = 0; c < 6; c++) expect(clearedIdx).toContain(at(s, 2, c));
    expect(phases.flatMap((p) => p.effects).some((e) => e.kind === 'rocketH')).toBe(true);
    expect(res.stats.activated.rocketH).toBe(1);
  });

  it('a Jollof Blast clears a rounded 5x5 area', () => {
    const s = build(base(8, 8));
    expect(areaCells(s.engine.board, at(s, 4, 4), 2, true)).toHaveLength(21);
    s.engine.board.cells[at(s, 4, 4)].tile!.special = 'blast';
    const res = applyBooster(s, 'ladle', at(s, 4, 4));
    const cleared = new Set(clears(res.steps)[0].flatMap((p) => p.cleared.map((c) => c.idx)));
    expect(cleared.size).toBe(21);
  });

  it('Suya Fire swapped with a food clears every tile of that food', () => {
    const g = base();
    g[0][0] = 'F';
    const s = build(g);
    const food = s.engine.board.cells[at(s, 0, 1)].tile!.food!;
    const targets = s.engine.board.cells.map((c, i) => (c.tile?.food === food ? i : -1)).filter((i) => i >= 0);
    const res = playSwap(s, at(s, 0, 0), at(s, 0, 1));
    expect(res.kind).toBe('fire');
    const cleared = firstPhase(res.steps).cleared.map((c) => c.idx);
    // both swapped pieces plus every tile of that food
    expect(cleared.length).toBe(targets.length + 1);
    expect(res.stats.collected[food]).toBeGreaterThanOrEqual(targets.length);
  });

  it('a set-off Suya Fire also counts toward collecting the burned food', () => {
    const g = base();
    g[0][0] = 'F';
    const s = build(g, { goals: [{ kind: 'collect', food: 1, count: 3 }] });
    const res = playSwap(s, at(s, 0, 0), at(s, 0, 1));
    expect(res.stats.collected[1]).toBeGreaterThanOrEqual(5);
  });
});

describe('special combinations', () => {
  it('Rocket + Rocket clears a cross', () => {
    const g = base();
    g[2][2] = '1h';
    g[2][3] = '4v';
    const s = build(g);
    const res = playSwap(s, at(s, 2, 2), at(s, 2, 3));
    expect(res.kind).toBe('combo');
    expect(res.stats.combos).toBe(1);
    const cleared = new Set(clears(res.steps)[0].flatMap((p) => p.cleared.map((c) => c.idx)));
    for (let i = 0; i < 6; i++) {
      expect(cleared.has(at(s, 2, i))).toBe(true);
      expect(cleared.has(at(s, i, 3))).toBe(true);
    }
  });

  it('Rocket + Blast clears three rows and three columns, more than either alone', () => {
    const g = base(8, 8);
    g[4][3] = '1h';
    g[4][4] = '2x';
    const s = build(g);
    const res = playSwap(s, at(s, 4, 3), at(s, 4, 4));
    const cleared = new Set(clears(res.steps)[0].flatMap((p) => p.cleared.map((c) => c.idx)));
    // 3 rows + 3 cols of an 8x8 board = 48 - 9 overlap = 39 cells
    expect(cleared.size).toBeGreaterThanOrEqual(39);
    expect(cleared.size).toBeGreaterThan(21);
  });

  it('Blast + Blast makes a bigger blast', () => {
    const g = base(8, 8);
    g[4][3] = '1x';
    g[4][4] = '2x';
    const s = build(g);
    const res = playSwap(s, at(s, 4, 3), at(s, 4, 4));
    const effects = clears(res.steps)[0].flatMap((p) => p.effects);
    expect(effects.some((e) => e.kind === 'blast' && e.radius === 3)).toBe(true);
  });

  it('Suya Fire + Rocket turns a whole food into rockets that all go off', () => {
    const g = base(8, 8);
    g[0][0] = 'F';
    g[0][1] = '1v';
    const s = build(g);
    const res = playSwap(s, at(s, 0, 0), at(s, 0, 1));
    const phases = clears(res.steps)[0];
    expect(phases[0].converted.length).toBeGreaterThan(3);
    expect(res.stats.activated.rocketH + res.stats.activated.rocketV).toBeGreaterThan(3);
  });

  it('Suya Fire + Suya Fire clears the whole board', () => {
    const g = base();
    g[1][1] = 'F';
    g[1][2] = 'F';
    const s = build(g);
    const res = playSwap(s, at(s, 1, 1), at(s, 1, 2));
    const cleared = new Set(clears(res.steps)[0].flatMap((p) => p.cleared.map((c) => c.idx)));
    expect(cleared.size).toBe(36);
  });

  it('chains: a rocket sweeping through a blast sets the blast off', () => {
    const g = base(8, 8);
    g[2][0] = '3h';
    g[2][6] = '5x';
    const s = build(g);
    const res = applyBooster(s, 'ladle', at(s, 2, 0));
    const phases = clears(res.steps)[0];
    expect(phases.length).toBeGreaterThanOrEqual(2);
    expect(res.stats.activated.blast).toBe(1);
  });
});

describe('obstacles', () => {
  it('adjacent matches break baskets, damage crates and unwrap food', () => {
    const s = build(
      lineSetup((g) => {
        g[4][0] = 'b';
        g[4][1] = 'c';
        g[2][0] = '6w';
      }),
      { goals: [{ kind: 'clear', layer: 'basket' }] },
    );
    const wrappedId = s.engine.board.cells[at(s, 2, 0)].tile!.id;
    const res = playSwap(s, at(s, 2, 2), at(s, 3, 2));
    const hits = firstPhase(res.steps).hits;
    expect(hits).toContainEqual({ idx: at(s, 4, 0), layer: 'basket', before: 1, after: 0 });
    expect(hits).toContainEqual({ idx: at(s, 4, 1), layer: 'crate', before: 2, after: 1 });
    expect(hits).toContainEqual({ idx: at(s, 2, 0), layer: 'wrap', before: 1, after: 0 });
    expect(s.engine.board.cells[at(s, 4, 0)].blocker).toBeNull();
    expect(s.engine.board.cells[at(s, 4, 1)].blocker?.hp).toBe(1);
    // the unwrapped food was not destroyed, it just fell into the gap
    expect(ids(s).has(wrappedId)).toBe(true);
    expect(res.stats.destroyed.basket).toBe(1);
    expect(s.status).toBe('won');
  });

  it('wrapped food in a match loses its wrap but stays on the board', () => {
    const s = build(lineSetup((g) => (g[3][0] = '0w')));
    const id = s.engine.board.cells[at(s, 3, 0)].tile!.id;
    playSwap(s, at(s, 2, 2), at(s, 3, 2));
    expect(ids(s).has(id)).toBe(true);
    expect(s.engine.board.cells.every((c) => c.wrap === 0)).toBe(true);
  });

  it('matches on palm oil clean it', () => {
    const s = build(lineSetup((g) => (g[3][1] = '0o')), { goals: [{ kind: 'clear', layer: 'oil' }] });
    const res = playSwap(s, at(s, 2, 2), at(s, 3, 2));
    expect(res.stats.destroyed.oil).toBe(1);
    expect(s.status).toBe('won');
  });

  it('a crate splits its column: tiles below are refilled from behind it', () => {
    const s = build(
      lineSetup((g) => {
        g[2][0] = 'C';
      }),
    );
    const topId = s.engine.board.cells[at(s, 1, 0)].tile!.id;
    const res = playSwap(s, at(s, 2, 2), at(s, 3, 2));
    const fall = res.steps.find((x) => x.kind === 'fall') as Extract<Step, { kind: 'fall' }>;
    // the food above the crate does not move, a new food enters (3,0) from behind the crate
    expect(fall.moves.some((m) => m.id === topId)).toBe(false);
    expect(fall.spawns.some((sp) => sp.to === at(s, 3, 0))).toBe(true);
    expect(s.engine.board.cells[at(s, 2, 0)].blocker?.hp).toBe(2);
  });

  it('Mama’s Pot clears every layer in a 5x5 square', () => {
    const g = base(8, 8);
    g[3][3] = 'C';
    g[4][4] = '1W';
    g[5][5] = '2o';
    const s = build(g);
    const res = applyBooster(s, 'pot', at(s, 4, 4));
    expect(res.valid).toBe(true);
    expect(res.stats.destroyed.crate).toBe(1);
    expect(res.stats.destroyed.wrap).toBe(1);
    expect(res.stats.destroyed.oil).toBe(1);
    expect(boardIsFull(s)).toBe(true);
  });
});

describe('moves, goals and outcome', () => {
  it('wins when goals are met and loses when moves run out', () => {
    const win = build(lineSetup(), { goals: [{ kind: 'collect', food: 0, count: 3 }], moves: 5 });
    playSwap(win, at(win, 2, 2), at(win, 3, 2));
    expect(win.status).toBe('won');

    const lose = build(lineSetup(), { goals: [{ kind: 'collect', food: 0, count: 500 }], moves: 1 });
    playSwap(lose, at(lose, 2, 2), at(lose, 3, 2));
    expect(lose.status).toBe('lost');
    expect(playSwap(lose, 0, 1).valid).toBe(false);

    applyBooster(lose, 'moves', null);
    expect(lose.status).toBe('playing');
    expect(lose.movesLeft).toBe(5);
  });

  it('the finale turns spare moves into points', () => {
    const s = build(lineSetup(), { goals: [{ kind: 'collect', food: 0, count: 3 }], moves: 6 });
    playSwap(s, at(s, 2, 2), at(s, 3, 2));
    const before = s.score;
    const res = runFinale(s);
    expect(res.valid).toBe(true);
    expect(s.score).toBeGreaterThan(before + 5 * 120);
    expect(s.movesLeft).toBe(0);
  });
});

describe('dead boards', () => {
  it('detects a dead board and shuffles it into a playable one', () => {
    const s = build(base());
    expect(hasValidMove(s.engine.board)).toBe(false);
    const before = ids(s);
    const moves = shuffleBoard(s.engine);
    expect(moves).not.toBeNull();
    expect(hasAnyMatch(s.engine.board)).toBe(false);
    expect(hasValidMove(s.engine.board)).toBe(true);
    expect(ids(s)).toEqual(before);
  });

  it('shuffles automatically after a move leaves no moves', () => {
    // after this move the 7-food board is very likely dead; if not, still verify the invariant
    const s = build(lineSetup());
    playSwap(s, at(s, 2, 2), at(s, 3, 2));
    expect(hasValidMove(s.engine.board)).toBe(true);
  });
});

describe('random play invariants', () => {
  it('never leaves the board broken, stuck or full of matches', () => {
    const layouts = [
      undefined,
      ['b..bb..b', '........', '.w....w.', '..oooo..', '..oOOo..', '.c....c.', '........', '##....##'],
      ['#..##..#', '........', '.C.ww.C.', '........', 'xxx..xxx', '........', '..b..b..', '........'],
    ];
    for (let seed = 1; seed <= 30; seed++) {
      const s = createSession({
        layout: layouts[seed % layouts.length],
        foods: [0, 1, 2, 3, 4, 5] as Food[],
        moves: 30,
        goals: [{ kind: 'collect', food: 0, count: 9999 }],
        seed,
      });
      let guard = 0;
      while (s.status === 'playing' && guard++ < 40) {
        const moves = findValidMoves(s.engine.board);
        expect(moves.length).toBeGreaterThan(0);
        const m = moves[(seed * 7 + guard * 13) % moves.length];
        const res = playSwap(s, m.a, m.b, false);
        expect(res.valid).toBe(true);
        expect(boardIsFull(s)).toBe(true);
        expect(hasAnyMatch(s.engine.board)).toBe(false);
        const seen = new Set<number>();
        for (const c of s.engine.board.cells) {
          if (c.blocker) expect(c.tile).toBeNull();
          if (c.wrap > 0) expect(c.tile).not.toBeNull();
          if (c.tile) {
            expect(seen.has(c.tile.id)).toBe(false);
            seen.add(c.tile.id);
          }
        }
        if (seed % 5 === 0 && guard === 3) applyBooster(s, 'pot', 27, false);
      }
      expect(s.status).toBe('lost');
    }
  });
});
