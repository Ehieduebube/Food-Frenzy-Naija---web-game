/**
 * Plays every level many times with a greedy bot and reports win rate, moves used
 * and score percentiles. Used to check that every level is solvable and to tune
 * move counts and star thresholds.
 *
 *   npm run simulate                 # all levels, 30 runs each
 *   npm run simulate -- 12 20        # levels 12..20
 *   npm run simulate -- 5 5 100      # level 5, 100 runs
 */
import { chooseBotMove } from '../src/games/food-frenzy-naija/engine/bot';
import { createSession, playSwap, runFinale, sessionGoals } from '../src/games/food-frenzy-naija/engine/game';
import { LEVELS } from '../src/games/food-frenzy-naija/levels/levels';
import type { LevelConfig } from '../src/games/food-frenzy-naija/levels/types';

const [fromArg, toArg, runsArg] = process.argv.slice(2).map(Number);
const from = fromArg || 1;
const to = toArg || LEVELS.length;
const runs = runsArg || 30;

let stalls = 0;

interface RunResult {
  won: boolean;
  movesUsed: number;
  score: number;
  goalPct: number;
}

function playLevel(level: LevelConfig, seed: number): RunResult {
  const s = createSession({ layout: level.layout, foods: level.foods, moves: level.moves, goals: level.goals, seed });
  const noise = { rng: seed * 7919 };
  let guard = 0;
  while (s.status === 'playing' && guard++ < 200) {
    const m = chooseBotMove(s, noise);
    if (!m) {
      stalls++;
      break;
    }
    playSwap(s, m.a, m.b, false);
  }
  const movesUsed = s.movesUsed;
  if (s.status === 'won') runFinale(s, false);
  const goals = level.goals.length;
  // progress toward goals at the end (for diagnosing lost runs)
  let pct = 0;
  for (const g of sessionGoals(s)) pct += g.current / Math.max(1, g.required);
  return { won: s.status === 'won', movesUsed, score: s.score, goalPct: Math.round((pct / goals) * 100) };
}

function pctile(values: number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = values.slice().sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))];
}

const round500 = (n: number) => Math.max(500, Math.round(n / 500) * 500);

console.log(`level  name                     diff        moves  win%  avgUsed  goal%(lost)  score p10/p50/p85   stars now          suggested`);
const t0 = Date.now();
for (const level of LEVELS.filter((l) => l.id >= from && l.id <= to)) {
  const results: RunResult[] = [];
  for (let i = 0; i < runs; i++) results.push(playLevel(level, 1000 + i * 31 + level.id * 7));
  const wins = results.filter((r) => r.won);
  const lost = results.filter((r) => !r.won);
  const winRate = Math.round((wins.length / runs) * 100);
  const avgUsed = wins.length ? (wins.reduce((a, r) => a + r.movesUsed, 0) / wins.length).toFixed(1) : '-';
  const lostPct = lost.length ? Math.round(lost.reduce((a, r) => a + r.goalPct, 0) / lost.length) : '-';
  const scores = wins.map((r) => r.score);
  const p10 = pctile(scores, 10);
  const p45 = pctile(scores, 45);
  const p75 = pctile(scores, 75);
  const p50 = pctile(scores, 50);
  const p85 = pctile(scores, 85);
  const suggested = [round500(p10 * 0.8), round500(p45), round500(p75)];
  console.log(
    `${String(level.id).padStart(5)}  ${level.name.padEnd(24)} ${level.difficulty.padEnd(10)} ${String(level.moves).padStart(5)}  ${String(winRate).padStart(4)}  ${String(avgUsed).padStart(7)}  ${String(lostPct).padStart(11)}  ${`${p10}/${p50}/${p85}`.padEnd(19)} ${JSON.stringify(level.stars).padEnd(18)} ${JSON.stringify(suggested)}`,
  );
}
console.log(`done in ${((Date.now() - t0) / 1000).toFixed(1)}s, boards with no valid move: ${stalls}`);
