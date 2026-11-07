import { describe, expect, it } from 'vitest';
import { LAYOUT_CHARS, countObstacles, parseLayout } from '../src/games/food-frenzy-naija/engine/board';
import { chooseBotMove } from '../src/games/food-frenzy-naija/engine/bot';
import { createSession, playSwap } from '../src/games/food-frenzy-naija/engine/game';
import { dailyChallengeFor } from '../src/games/food-frenzy-naija/levels/daily';
import { LEVELS, REGIONS } from '../src/games/food-frenzy-naija/levels/levels';
import type { LevelConfig } from '../src/games/food-frenzy-naija/levels/types';

function botWins(level: LevelConfig, seed: number): boolean {
  const s = createSession({ layout: level.layout, foods: level.foods, moves: level.moves, goals: level.goals, seed });
  const noise = { rng: seed * 31 };
  let guard = 0;
  while (s.status === 'playing' && guard++ < 120) {
    const m = chooseBotMove(s, noise);
    expect(m, `level ${level.id} stalled with no valid move`).not.toBeNull();
    playSwap(s, m!.a, m!.b, false);
  }
  return s.status === 'won';
}

describe('level data', () => {
  it('has at least 30 levels, numbered in order, covering every region', () => {
    expect(LEVELS.length).toBeGreaterThanOrEqual(30);
    LEVELS.forEach((l, i) => expect(l.id).toBe(i + 1));
    for (const r of REGIONS) {
      const inRegion = LEVELS.filter((l) => l.region === r.id).map((l) => l.id);
      expect(inRegion[0]).toBe(r.firstLevel);
      expect(inRegion[inRegion.length - 1]).toBe(r.lastLevel);
    }
  });

  it('every level is well formed', () => {
    for (const l of LEVELS) {
      const ctx = `level ${l.id}`;
      if (l.layout) {
        expect(new Set(l.layout.map((r) => r.length)).size, ctx).toBe(1);
        for (const row of l.layout) for (const ch of row) expect(LAYOUT_CHARS, `${ctx} char ${ch}`).toContain(ch);
      }
      expect(l.foods.length, ctx).toBeGreaterThanOrEqual(5);
      expect(new Set(l.foods).size, ctx).toBe(l.foods.length);
      expect(l.moves, ctx).toBeGreaterThan(10);
      expect(l.stars[0] < l.stars[1] && l.stars[1] < l.stars[2], ctx).toBe(true);
      const obstacles = countObstacles(parseLayout(l.layout));
      for (const g of l.goals) {
        if (g.kind === 'collect') expect(l.foods, ctx).toContain(g.food);
        if (g.kind === 'clear') expect(obstacles[g.layer], `${ctx} has no ${g.layer}`).toBeGreaterThan(0);
      }
      expect(l.goals.length, ctx).toBeGreaterThan(0);
    }
  });

  it('introduces mechanics gradually', () => {
    const firstWith = (pred: (l: LevelConfig) => boolean) => LEVELS.find(pred)?.id ?? Infinity;
    const hasLayer = (layer: 'basket' | 'crate' | 'wrap' | 'oil') => (l: LevelConfig) => countObstacles(parseLayout(l.layout))[layer] > 0;
    expect(firstWith(hasLayer('basket'))).toBeGreaterThanOrEqual(11);
    expect(firstWith(hasLayer('wrap'))).toBeGreaterThanOrEqual(11);
    expect(firstWith(hasLayer('crate'))).toBeGreaterThanOrEqual(16);
    expect(firstWith((l) => !!l.layout?.some((r) => r.includes('#')))).toBeGreaterThanOrEqual(16);
    expect(firstWith((l) => l.goals.some((g) => g.kind === 'activate'))).toBeGreaterThanOrEqual(6);
  });

  it('every level can be won by the tuning bot', () => {
    for (const l of LEVELS) {
      let wins = 0;
      for (let k = 0; k < 8 && wins === 0; k++) if (botWins(l, 9000 + l.id * 101 + k)) wins++;
      expect(wins, `level ${l.id} (${l.name}) was never won`).toBeGreaterThan(0);
    }
  }, 60_000); // a long simulation: give it room when the whole suite runs in parallel

  it('daily challenges for a month are all winnable', () => {
    for (let d = 1; d <= 30; d++) {
      const ch = dailyChallengeFor(`2026-11-${String(d).padStart(2, '0')}`);
      let won = false;
      for (let k = 0; k < 6 && !won; k++) won = botWins(ch.level, ch.seed + k);
      expect(won, `challenge for day ${d} (from level ${ch.sourceLevel})`).toBe(true);
    }
  });
});
