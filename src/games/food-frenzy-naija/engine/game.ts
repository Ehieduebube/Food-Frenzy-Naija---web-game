import { cloneBoard, countObstacles, createEngine, fillWithoutMatches, isMovable } from './board';
import { allGoalsDone, evaluateGoals, type GoalSpec, type GoalState, type ObstacleCounts } from './goals';
import { classifySwap, hasValidMove, type SwapKind } from './moves';
import { Resolver, comboInitial, finaleInitial, ladleInitial, potInitial } from './resolve';
import { shuffleBoard } from './shuffle';
import { emptyStats, mergeStats, type EngineState, type Food, type ResolveStats, type Step } from './types';

export type BoosterId = 'ladle' | 'shuffle' | 'pot' | 'moves';
export const EXTRA_MOVES = 5;
/** Flat points per unused move, on top of the finale rockets. */
export const POINTS_PER_SPARE_MOVE = 120;
/** At most this many leftover moves turn into finale rockets. */
export const MAX_FINALE_ROCKETS = 12;

export interface SessionConfig {
  layout?: readonly string[];
  foods: Food[];
  moves: number;
  goals: GoalSpec[];
  seed: number;
}

export type SessionStatus = 'playing' | 'won' | 'lost';

export interface Session {
  config: SessionConfig;
  engine: EngineState;
  score: number;
  movesLeft: number;
  movesUsed: number;
  totals: ResolveStats;
  initialObstacles: ObstacleCounts;
  status: SessionStatus;
}

export interface MoveResult {
  valid: boolean;
  kind: SwapKind | 'booster';
  steps: Step[];
  stats: ResolveStats;
  shuffled: boolean;
}

export function createSession(config: SessionConfig): Session {
  const engine = createEngine(config.layout, config.foods, config.seed);
  fillWithoutMatches(engine);
  for (let attempt = 0; attempt < 40 && !hasValidMove(engine.board); attempt++) {
    engine.board.cells.forEach((c) => {
      if (isMovable(c) && !c.tile?.special) c.tile = null;
    });
    fillWithoutMatches(engine);
  }
  if (!hasValidMove(engine.board)) shuffleBoard(engine);
  return {
    config,
    engine,
    score: 0,
    movesLeft: config.moves,
    movesUsed: 0,
    totals: emptyStats(),
    initialObstacles: countObstacles(engine.board),
    status: 'playing',
  };
}

export function sessionGoals(s: Session): GoalState[] {
  return evaluateGoals(s.config.goals, s.totals, s.initialObstacles, s.score);
}

function updateStatus(s: Session): void {
  if (allGoalsDone(sessionGoals(s))) s.status = 'won';
  else if (s.movesLeft <= 0) s.status = 'lost';
  else s.status = 'playing';
}

/** After the board settles: make sure the player has a move, shuffling if needed. */
function ensurePlayable(s: Session, steps: Step[], record: boolean): boolean {
  if (hasValidMove(s.engine.board)) return false;
  for (let attempt = 0; attempt < 3; attempt++) {
    const moves = shuffleBoard(s.engine);
    if (moves) {
      steps.push({ kind: 'banner', text: 'No moves left. Shuffling!' });
      steps.push({ kind: 'shuffle', moves, snapshot: record ? cloneBoard(s.engine.board) : undefined });
      // a fresh board can contain matches only in the re-roll fallback; resolve them for safety
      const r = new Resolver(s.engine, record);
      r.run();
      steps.push(...r.steps);
      applyStats(s, r.stats);
      if (hasValidMove(s.engine.board)) return true;
    }
  }
  // Last resort for very cramped boards: a Suya Fire can be swapped with any neighbour,
  // so placing one next to another movable piece always creates a valid move.
  const b = s.engine.board;
  for (let i = 0; i < b.cells.length; i++) {
    if (!isMovable(b.cells[i])) continue;
    const c = i % b.cols;
    const nb = [c < b.cols - 1 ? i + 1 : -1, i + b.cols < b.cells.length ? i + b.cols : -1, c > 0 ? i - 1 : -1, i - b.cols];
    if (nb.some((j) => j >= 0 && isMovable(b.cells[j]))) {
      const t = b.cells[i].tile!;
      t.special = 'fire';
      t.food = null;
      steps.push({ kind: 'banner', text: 'Mama sends a Suya Fire!' });
      steps.push({ kind: 'shuffle', moves: [], snapshot: record ? cloneBoard(b) : undefined });
      return true;
    }
  }
  return true;
}

function applyStats(s: Session, stats: ResolveStats): void {
  s.score += stats.points;
  mergeStats(s.totals, stats);
}

function finish(s: Session, r: Resolver, kind: MoveResult['kind'], steps: Step[], record: boolean): MoveResult {
  steps.push(...r.steps);
  applyStats(s, r.stats);
  const stats = r.stats;
  const shuffled = ensurePlayable(s, steps, record);
  updateStatus(s);
  return { valid: true, kind, steps, stats, shuffled };
}

/** The player drags the tile at `a` onto the neighbouring cell `b`. */
export function playSwap(s: Session, a: number, b: number, record = true): MoveResult {
  const none: MoveResult = { valid: false, kind: 'blocked', steps: [], stats: emptyStats(), shuffled: false };
  if (s.status !== 'playing' || s.movesLeft <= 0) return none;
  const board = s.engine.board;
  const kind = classifySwap(board, a, b);
  if (kind === 'blocked') return none;

  const before = record ? cloneBoard(board) : undefined;
  const ta = board.cells[a].tile;
  board.cells[a].tile = board.cells[b].tile;
  board.cells[b].tile = ta;
  const afterSwap = record ? cloneBoard(board) : undefined;
  const steps: Step[] = [{ kind: 'swap', a, b, snapshot: afterSwap }];

  if (kind === 'invalid') {
    board.cells[b].tile = board.cells[a].tile;
    board.cells[a].tile = ta;
    steps.push({ kind: 'swapBack', a, b, snapshot: before });
    return { valid: false, kind, steps, stats: emptyStats(), shuffled: false };
  }

  s.movesLeft--;
  s.movesUsed++;
  const r = new Resolver(s.engine, record);
  if (kind === 'match') r.run({ preferred: [b, a] });
  else r.run({ initial: comboInitial(s.engine, a, b) });
  return finish(s, r, kind, steps, record);
}

/** Use an in-game booster. Boosters never cost a move. */
export function applyBooster(s: Session, booster: BoosterId, target: number | null, record = true): MoveResult {
  const none: MoveResult = { valid: false, kind: 'booster', steps: [], stats: emptyStats(), shuffled: false };
  const board = s.engine.board;
  if (booster === 'moves') {
    if (s.status === 'won') return none;
    s.movesLeft += EXTRA_MOVES;
    updateStatus(s);
    return { valid: true, kind: 'booster', steps: [], stats: emptyStats(), shuffled: false };
  }
  if (s.status !== 'playing') return none;
  if (booster === 'shuffle') {
    const moves = shuffleBoard(s.engine);
    if (!moves) return none;
    const steps: Step[] = [{ kind: 'shuffle', moves, snapshot: record ? cloneBoard(board) : undefined }];
    const r = new Resolver(s.engine, record);
    r.run();
    return finish(s, r, 'booster', steps, record);
  }
  if (target === null || target < 0 || target >= board.cells.length) return none;
  const cell = board.cells[target];
  if (!cell.playable) return none;
  if (booster === 'ladle' && !cell.tile && !cell.blocker) return none;
  const r = new Resolver(s.engine, record);
  r.run({ initial: booster === 'ladle' ? ladleInitial(target) : potInitial(s.engine, target) });
  return finish(s, r, 'booster', [], record);
}

/** Owambe finale after a win: leftover moves become rockets and every special goes off. */
export function runFinale(s: Session, record = true): MoveResult {
  const none: MoveResult = { valid: false, kind: 'booster', steps: [], stats: emptyStats(), shuffled: false };
  if (s.status !== 'won') return none;
  const spare = s.movesLeft;
  const hasSpecials = s.engine.board.cells.some((c) => c.tile?.special);
  if (spare <= 0 && !hasSpecials) return none;
  const steps: Step[] = [{ kind: 'banner', text: 'Owambe Finale!' }];
  const r = new Resolver(s.engine, record);
  r.run({ initial: finaleInitial(s.engine, Math.min(spare, MAX_FINALE_ROCKETS)) });
  steps.push(...r.steps);
  r.stats.points += spare * POINTS_PER_SPARE_MOVE;
  applyStats(s, r.stats);
  s.movesLeft = 0;
  return { valid: true, kind: 'booster', steps, stats: r.stats, shuffled: false };
}
