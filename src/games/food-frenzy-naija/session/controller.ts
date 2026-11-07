import { createStore, type StoreApi } from 'zustand/vanilla';
import { audio } from '../audio/audio';
import { FOOD_COLORS } from '../art/foods';
import { rowOf } from '../engine/board';
import { evaluateMove } from '../engine/bot';
import {
  applyBooster,
  createSession,
  playSwap,
  runFinale,
  type BoosterId,
  type MoveResult,
  type Session,
} from '../engine/game';
import { evaluateGoals } from '../engine/goals';
import { findValidMoves } from '../engine/moves';
import type { PhaseWithTotals } from '../engine/resolve';
import { emptyStats, mergeStats, type Board, type FallMove, type ResolveStats, type Spawn, type Step } from '../engine/types';
import type { LevelConfig } from '../levels/types';
import { NORMAL_TIMING, REDUCED_TIMING, type Timing } from './timing';
import { cellsFrom, type HudView, type SessionView, type VisualTile } from './view';

export type ControllerEvent =
  | { type: 'burst'; idx: number; color: string; count: number; style: 'crumbs' | 'sparks' | 'smoke' }
  | { type: 'finished'; outcome: 'won' | 'lost' };

export interface ControllerOptions {
  level: LevelConfig;
  seed: number;
  reducedMotion: () => boolean;
  haptics: () => boolean;
  hasBooster: (id: BoosterId) => boolean;
  consumeBooster: (id: BoosterId) => void;
}

const COMBO_WORDS = ['', '', 'Tasty!', 'Correct!', 'Omo!', 'Na fire!', 'Chop life!', 'Owambe!'];

function cloneTotals(t: ResolveStats): ResolveStats {
  const out = emptyStats();
  mergeStats(out, t);
  return out;
}

/**
 * Runs one level: owns the engine session, turns its steps into timed visual beats,
 * plays sounds and decides when the level is won or lost.
 * The engine resolves a move instantly; the controller only paces how it is shown,
 * so an animation can never leave the game in a broken state.
 */
export class GameController {
  readonly store: StoreApi<SessionView>;
  readonly session: Session;
  private timers = new Set<ReturnType<typeof setTimeout>>();
  private listeners = new Set<(e: ControllerEvent) => void>();
  private disposed = false;
  private paused = false;
  private seq = 0;
  private hintTimer: ReturnType<typeof setTimeout> | null = null;
  private hudBase = { totals: emptyStats(), score: 0 };
  private noise = { rng: 987654 };
  hintDelay = NORMAL_TIMING.hintDelay;

  constructor(private readonly opts: ControllerOptions) {
    const { level, seed } = opts;
    this.session = createSession({ layout: level.layout, foods: level.foods, moves: level.moves, goals: level.goals, seed });
    const board = this.session.engine.board;
    this.store = createStore<SessionView>(() => ({
      rows: board.rows,
      cols: board.cols,
      tiles: this.tilesFrom(board, [], { dur: 0 }),
      cells: cellsFrom(board),
      ghosts: [],
      breaks: [],
      fx: [],
      floaters: [],
      banner: null,
      hud: this.exactHud(),
      busy: false,
      selected: null,
      hint: null,
      shakeKey: 0,
      boosterMode: null,
      outcome: null,
      finalScore: 0,
    }));
  }

  // ───────────── plumbing ─────────────

  private get t(): Timing {
    return this.opts.reducedMotion() ? REDUCED_TIMING : NORMAL_TIMING;
  }

  private get view(): SessionView {
    return this.store.getState();
  }

  private set(patch: Partial<SessionView> | ((s: SessionView) => Partial<SessionView>)): void {
    if (this.disposed) return;
    this.store.setState(patch as Partial<SessionView>);
  }

  private later(ms: number, fn: () => void): void {
    const id = setTimeout(() => {
      this.timers.delete(id);
      if (!this.disposed) fn();
    }, ms);
    this.timers.add(id);
  }

  private wait(ms: number): Promise<void> {
    return new Promise((resolve) => {
      const id = setTimeout(() => {
        this.timers.delete(id);
        resolve();
      }, ms);
      this.timers.add(id);
    });
  }

  private key(prefix: string): string {
    return `${prefix}${++this.seq}`;
  }

  on(fn: (e: ControllerEvent) => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private emit(e: ControllerEvent): void {
    for (const fn of this.listeners) fn(e);
  }

  dispose(): void {
    this.disposed = true;
    for (const id of this.timers) clearTimeout(id);
    this.timers.clear();
    if (this.hintTimer) clearTimeout(this.hintTimer);
    this.listeners.clear();
  }

  // ───────────── view building ─────────────

  private tilesFrom(board: Board, prev: VisualTile[], o: { dur: number; moves?: FallMove[]; spawns?: Spawn[]; swapped?: number[] }): VisualTile[] {
    const before = new Map(prev.map((t) => [t.id, t]));
    const moves = new Map((o.moves ?? []).map((m) => [m.id, m]));
    const spawns = new Map((o.spawns ?? []).map((s) => [s.id, s]));
    const out: VisualTile[] = [];
    board.cells.forEach((c, idx) => {
      const tile = c.tile;
      if (!tile) return;
      const p = before.get(tile.id);
      const m = moves.get(tile.id);
      const sp = spawns.get(tile.id);
      let dur = p ? p.dur : 0;
      let drop = p ? p.drop : 0;
      let landSeq = p ? p.landSeq : 0;
      let motion: VisualTile['motion'] = p ? p.motion : 'slide';
      if (m) {
        motion = 'fall';
        dur = this.t.fall(rowOf(board, m.to) - rowOf(board, m.from));
        drop = 0;
        landSeq++;
      } else if (sp) {
        motion = 'fall';
        dur = this.t.fall(sp.drop);
        drop = sp.drop;
        landSeq++;
      } else if (p && p.idx !== idx) {
        motion = 'slide';
        dur = o.dur;
        drop = 0;
      } else if (!p) {
        dur = 0;
        drop = 0;
      }
      out.push({ id: tile.id, food: tile.food, special: tile.special, idx, dur, drop, landSeq, motion });
    });
    return out;
  }

  private hudFrom(totals: ResolveStats, score: number, movesLeft: number): HudView {
    return {
      score,
      movesLeft,
      goals: evaluateGoals(this.session.config.goals, totals, this.session.initialObstacles, score),
    };
  }

  private exactHud(): HudView {
    return this.hudFrom(this.session.totals, this.session.score, this.session.movesLeft);
  }

  // ───────────── input ─────────────

  get canInteract(): boolean {
    const v = this.view;
    return !this.disposed && !this.paused && !v.busy && v.outcome === null;
  }

  select(idx: number | null): void {
    this.clearHint();
    this.set({ selected: idx });
    if (idx !== null) audio.play('select');
  }

  setBoosterMode(mode: BoosterId | null): void {
    this.clearHint();
    this.set({ boosterMode: mode, selected: null });
    if (mode === null) this.scheduleHint();
  }

  setPaused(paused: boolean): void {
    this.paused = paused;
    if (paused) this.clearHint();
    else this.scheduleHint();
  }

  /** The player drags the tile at `a` toward its neighbour `b`. */
  async trySwap(a: number, b: number): Promise<void> {
    if (!this.canInteract) return;
    this.clearHint();
    this.set({ selected: null });
    const before = { totals: cloneTotals(this.session.totals), score: this.session.score };
    const res = playSwap(this.session, a, b, true);
    if (res.steps.length === 0) {
      audio.play('invalid');
      return;
    }
    this.hudBase = before;
    this.set({ busy: true });
    await this.playSteps(res.steps, res);
    if (this.disposed) return;
    await this.afterResolve();
  }

  /** Use a booster. Ladle and Mama's Pot need a target cell. */
  async useBooster(id: BoosterId, target: number | null): Promise<boolean> {
    if (!this.canInteract && !(id === 'moves' && this.view.outcome === 'lost' && !this.view.busy)) return false;
    if (!this.opts.hasBooster(id)) return false;
    this.clearHint();
    const before = { totals: cloneTotals(this.session.totals), score: this.session.score };
    const res = applyBooster(this.session, id, target, true);
    if (!res.valid) {
      audio.play('invalid');
      return false;
    }
    this.opts.consumeBooster(id);
    audio.play('booster');
    this.audioHaptic(30);
    this.set({ boosterMode: null, selected: null });
    if (id === 'moves') {
      this.set({ hud: this.exactHud(), outcome: null });
      this.showBanner(`+5 moves!`, 'info');
      this.scheduleHint();
      return true;
    }
    this.hudBase = before;
    this.set({ busy: true });
    await this.playSteps(res.steps, res);
    if (this.disposed) return true;
    await this.afterResolve();
    return true;
  }

  /** Continue a lost level with extra moves (bought with coins or an Extra Moves booster). */
  grantExtraMoves(): void {
    if (this.view.outcome !== 'lost') return;
    const res = applyBooster(this.session, 'moves', null, true);
    if (!res.valid) return;
    this.set({ hud: this.exactHud(), outcome: null });
    this.showBanner('+5 moves!', 'info');
    this.scheduleHint();
  }

  // ───────────── playback ─────────────

  private async playSteps(steps: Step[], res: MoveResult): Promise<void> {
    let lastTotals = emptyStats();
    for (const step of steps) {
      if (this.disposed) return;
      switch (step.kind) {
        case 'swap':
        case 'swapBack': {
          if (!step.snapshot) break;
          audio.play(step.kind === 'swap' ? 'swap' : 'invalid');
          this.set((s) => ({
            tiles: this.tilesFrom(step.snapshot!, s.tiles, { dur: this.t.swap }),
            hud: step.kind === 'swap' && res.valid ? { ...s.hud, movesLeft: this.session.movesLeft } : s.hud,
          }));
          await this.wait(this.t.swap + 20);
          break;
        }
        case 'clear': {
          for (let i = 0; i < step.phases.length; i++) {
            const phase = step.phases[i] as PhaseWithTotals;
            if (phase.totals) {
              if (phase.totals.points < lastTotals.points) {
                // a new resolution started (after a shuffle): rebase the running HUD totals
                mergeStats(this.hudBase.totals, lastTotals);
                this.hudBase.score += lastTotals.points;
              }
              lastTotals = phase.totals;
            }
            this.showPhase(phase, step.cascade, i);
            await this.wait(i === step.phases.length - 1 ? this.t.phase : this.t.chainGap);
            if (this.disposed) return;
          }
          break;
        }
        case 'fall': {
          if (!step.snapshot) break;
          const snap = step.snapshot;
          let longest = 0;
          for (const m of step.moves) longest = Math.max(longest, rowOf(snap, m.to) - rowOf(snap, m.from));
          for (const sp of step.spawns) longest = Math.max(longest, sp.drop);
          this.set((s) => ({ tiles: this.tilesFrom(snap, s.tiles, { dur: 0, moves: step.moves, spawns: step.spawns }), cells: cellsFrom(snap) }));
          await this.wait(this.t.fall(longest) + 40);
          break;
        }
        case 'shuffle': {
          if (!step.snapshot) break;
          audio.play('shuffle');
          mergeStats(this.hudBase.totals, lastTotals);
          this.hudBase.score += lastTotals.points;
          lastTotals = emptyStats();
          const snap = step.snapshot;
          this.set((s) => ({ tiles: this.tilesFrom(snap, s.tiles, { dur: this.t.shuffle }), cells: cellsFrom(snap) }));
          await this.wait(this.t.shuffle + 40);
          break;
        }
        case 'banner':
          this.showBanner(step.text, step.text.includes('Owambe') ? 'finale' : 'info');
          await this.wait(this.t.banner);
          break;
      }
    }
  }

  private showPhase(phase: PhaseWithTotals, cascade: number, index: number): void {
    const snap = phase.snapshot;
    if (!snap) return;
    const ghosts = phase.cleared.map((c) => ({
      key: this.key('g'),
      idx: c.idx,
      toIdx: c.mergeTo,
      food: c.food,
      special: c.special,
      kind: (c.mergeTo !== undefined ? 'merge' : c.cause === 'match' ? 'pop' : 'burn') as 'merge' | 'pop' | 'burn',
    }));
    const breaks = phase.hits
      .filter((h) => h.layer === 'basket' || h.layer === 'crate' || h.after < h.before)
      .map((h) => ({ key: this.key('b'), idx: h.idx, layer: h.layer, before: h.before }));
    const fx = phase.effects.map((e) => ({ key: this.key('f'), effect: e }));
    const floaters = phase.floaters.map((f) => ({ key: this.key('p'), idx: f.idx, text: `+${f.points.toLocaleString('en-US')}` }));

    const totals = cloneTotals(this.hudBase.totals);
    let score = this.hudBase.score;
    if (phase.totals) {
      mergeStats(totals, phase.totals);
      score += phase.totals.points;
    }

    this.set((s) => ({
      tiles: this.tilesFrom(snap, s.tiles, { dur: 0 }),
      cells: cellsFrom(snap),
      ghosts: [...s.ghosts, ...ghosts],
      breaks: [...s.breaks, ...breaks],
      fx: [...s.fx, ...fx],
      floaters: [...s.floaters, ...floaters],
      hud: phase.totals ? { score, movesLeft: s.hud.movesLeft, goals: this.hudFrom(totals, score, 0).goals } : s.hud,
      shakeKey: phase.effects.some((e) => e.kind === 'blast' || e.kind === 'mega' || e.kind === 'bigCross' || e.kind === 'pot')
        ? s.shakeKey + 1
        : s.shakeKey,
    }));
    const expire = (items: { key: string }[], field: 'ghosts' | 'breaks' | 'fx' | 'floaters', ms: number) => {
      if (items.length === 0) return;
      const keys = new Set(items.map((i) => i.key));
      this.later(ms, () =>
        this.set((s) => ({ [field]: (s[field] as { key: string }[]).filter((i) => !keys.has(i.key)) }) as Partial<SessionView>),
      );
    };
    expire(ghosts, 'ghosts', 520);
    expire(breaks, 'breaks', 650);
    expire(fx, 'fx', 900);
    expire(floaters, 'floaters', 1000);

    // sound, particles, haptics
    const matched = phase.cleared.filter((c) => c.cause === 'match').length;
    if (matched > 0) audio.play('match', cascade - 1);
    if (phase.created.length > 0) audio.play('special');
    if (phase.hits.length > 0) audio.play('obstacle');
    for (const e of phase.effects) {
      if (e.kind === 'rocketH' || e.kind === 'rocketV' || e.kind === 'cross') audio.play('rocket');
      if (e.kind === 'blast' || e.kind === 'bigCross' || e.kind === 'pot') {
        audio.play('blast');
        this.audioHaptic(40);
      }
      if (e.kind === 'fire' || e.kind === 'convert' || e.kind === 'mega') {
        audio.play('fire');
        this.audioHaptic([20, 30, 20]);
      }
    }
    const reduce = this.opts.reducedMotion();
    if (!reduce) {
      const budget = phase.cleared.length > 24 ? 4 : 8;
      for (const c of phase.cleared) {
        this.emit({ type: 'burst', idx: c.idx, color: c.food === null ? '#ff7a1a' : FOOD_COLORS[c.food], count: budget, style: c.cause === 'match' ? 'crumbs' : 'sparks' });
      }
      for (const h of phase.hits) {
        const color = h.layer === 'oil' ? '#e2541c' : h.layer === 'wrap' ? '#3aac44' : '#b8763a';
        this.emit({ type: 'burst', idx: h.idx, color, count: 6, style: h.layer === 'oil' ? 'smoke' : 'crumbs' });
      }
    }
    if (index === 0 && cascade >= 2) {
      const word = COMBO_WORDS[Math.min(cascade, COMBO_WORDS.length - 1)];
      this.showBanner(`${word} x${cascade}`, 'combo');
    }
    if (phase.effects.some((e) => e.kind === 'cross' || e.kind === 'bigCross' || e.kind === 'mega' || (e.kind === 'convert' && phase.cleared.some((c) => c.cause === 'combo')))) {
      this.showBanner('Power combo!', 'combo');
    }
  }

  private showBanner(text: string, tone: 'combo' | 'info' | 'finale'): void {
    const key = this.key('n');
    this.set({ banner: { key, text, tone } });
    this.later(tone === 'finale' ? 1300 : 1000, () => {
      if (this.view.banner?.key === key) this.set({ banner: null });
    });
  }

  private audioHaptic(pattern: number | number[]): void {
    audio.haptic(pattern, this.opts.haptics());
  }

  private async afterResolve(): Promise<void> {
    this.set({ hud: this.exactHud(), cells: cellsFrom(this.session.engine.board) });
    if (this.session.status === 'won') {
      await this.wait(350);
      const before = { totals: cloneTotals(this.session.totals), score: this.session.score };
      const fin = runFinale(this.session, true);
      if (fin.valid) {
        this.hudBase = before;
        await this.playSteps(fin.steps, fin);
        if (this.disposed) return;
        this.set({ hud: this.exactHud() });
        await this.wait(250);
      }
      audio.play('win');
      this.set({ busy: false, outcome: 'won', finalScore: this.session.score });
      this.emit({ type: 'finished', outcome: 'won' });
      return;
    }
    if (this.session.status === 'lost') {
      await this.wait(300);
      audio.play('lose');
      this.set({ busy: false, outcome: 'lost', finalScore: this.session.score });
      this.emit({ type: 'finished', outcome: 'lost' });
      return;
    }
    this.set({ busy: false });
    this.scheduleHint();
  }

  // ───────────── hints ─────────────

  private clearHint(): void {
    if (this.hintTimer) clearTimeout(this.hintTimer);
    this.hintTimer = null;
    if (this.view.hint) this.set({ hint: null });
  }

  scheduleHint(delay = this.hintDelay): void {
    if (this.hintTimer) clearTimeout(this.hintTimer);
    this.hintTimer = setTimeout(() => {
      this.hintTimer = null;
      if (!this.canInteract || this.view.boosterMode) return;
      const best = this.bestMove();
      if (best) this.set({ hint: best });
    }, delay);
  }

  /** A good move for the current goals (the same evaluation the level-tuning bot uses). */
  bestMove(): [number, number] | null {
    const moves = findValidMoves(this.session.engine.board);
    let best: [number, number] | null = null;
    let bestValue = -Infinity;
    for (const m of moves.slice(0, 40)) {
      const v = evaluateMove(this.session, m, this.noise);
      if (v > bestValue) {
        bestValue = v;
        best = [m.a, m.b];
      }
    }
    return best;
  }
}
