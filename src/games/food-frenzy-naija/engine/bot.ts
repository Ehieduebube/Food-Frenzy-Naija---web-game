import { cloneEngine } from './board';
import { playSwap, sessionGoals, type Session } from './game';
import { findValidMoves } from './moves';
import { nextRandom, type RngHolder } from './rng';
import type { Move, ResolveStats } from './types';

export function cloneSession(s: Session): Session {
  const t: ResolveStats = s.totals;
  return {
    config: s.config,
    engine: cloneEngine(s.engine),
    score: s.score,
    movesLeft: s.movesLeft,
    movesUsed: s.movesUsed,
    totals: {
      points: t.points,
      collected: t.collected.slice(),
      destroyed: { ...t.destroyed },
      activated: { ...t.activated },
      created: { ...t.created },
      combos: t.combos,
      maxCascade: t.maxCascade,
      tilesCleared: t.tilesCleared,
    },
    initialObstacles: s.initialObstacles,
    status: s.status,
  };
}

/**
 * Value of a move for the current goals. Refills are simulated with a different random stream,
 * so the bot cannot "see" the tiles that will drop in.
 */
export function evaluateMove(s: Session, m: Move, noise: RngHolder): number {
  const before = sessionGoals(s);
  const sim = cloneSession(s);
  sim.engine.rng = (sim.engine.rng ^ 0x5bd1e995) + Math.floor(nextRandom(noise) * 1e6);
  const res = playSwap(sim, m.a, m.b, false);
  if (!res.valid) return -Infinity;
  const after = sessionGoals(sim);
  let value = 0;
  before.forEach((g, i) => {
    const need = g.required - g.current;
    if (need <= 0) return;
    const gained = Math.min(after[i].current - g.current, need);
    value += (gained / Math.max(1, g.required)) * 1000;
  });
  if (sim.status === 'won') value += 100000;
  const c = res.stats.created;
  value += (c.rocketH + c.rocketV) * 30 + c.blast * 45 + c.fire * 80;
  value += res.stats.points * 0.02;
  value += nextRandom(noise) * 2;
  return value;
}

export function chooseBotMove(s: Session, noise: RngHolder): Move | null {
  const moves = findValidMoves(s.engine.board);
  let best: Move | null = null;
  let bestValue = -Infinity;
  for (const m of moves) {
    for (const mm of [m, { a: m.b, b: m.a }]) {
      const v = evaluateMove(s, mm, noise);
      if (v > bestValue) {
        bestValue = v;
        best = mm;
      }
    }
  }
  return best;
}
