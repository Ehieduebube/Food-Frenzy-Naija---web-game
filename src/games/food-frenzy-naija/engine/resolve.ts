import { BIG_BLAST_RADIUS, BLAST_RADIUS, POT_RADIUS, areaCells, colCells, rowCells, uniqueCells } from './areas';
import { cloneBoard, colOf, neighbors4, rowOf } from './board';
import { applyGravity } from './gravity';
import { findGroups, placementForGroup, specialForGroup, type MatchGroup } from './match';
import { nextRandom, shuffleInPlace } from './rng';
import {
  POINTS_BLOCKER_DESTROYED,
  POINTS_COMBO_BONUS,
  POINTS_CREATE,
  POINTS_MATCH_TILE,
  POINTS_OBSTACLE_HIT,
  POINTS_SPECIAL_TILE,
  cascadeMultiplier,
} from './scoring';
import {
  emptyStats,
  type ClearCause,
  type ClearPhase,
  type Effect,
  type EngineState,
  type Food,
  type ResolveStats,
  type Special,
  type Step,
  type Tile,
} from './types';

/** Safety valve: a resolution never runs more than this many cascade waves. */
export const MAX_WAVES = 60;

function newPhase(): ClearPhase {
  return { cleared: [], effects: [], hits: [], created: [], converted: [], floaters: [], points: 0 };
}

function phaseIsEmpty(p: ClearPhase): boolean {
  return (
    p.cleared.length === 0 &&
    p.effects.length === 0 &&
    p.hits.length === 0 &&
    p.created.length === 0 &&
    p.converted.length === 0
  );
}

function cloneStats(s: ResolveStats): ResolveStats {
  return {
    points: s.points,
    collected: s.collected.slice(),
    destroyed: { ...s.destroyed },
    activated: { ...s.activated },
    created: { ...s.created },
    combos: s.combos,
    maxCascade: s.maxCascade,
    tilesCleared: s.tilesCleared,
  };
}

export interface PhaseWithTotals extends ClearPhase {
  /** Cumulative stats of this resolution up to and including this phase (only when recording). */
  totals?: ResolveStats;
}

/**
 * One cascade wave: everything that clears before gravity runs.
 * A wave is split into phases so chain reactions can be animated one generation at a time.
 */
export class Wave {
  readonly phases: PhaseWithTotals[] = [];
  cur: PhaseWithTotals = newPhase();
  private blockerHit = new Set<number>();
  private wrapHit = new Set<number>();
  private oilHit = new Set<number>();
  private protect = new Set<number>();
  private pending: { idx: number; tile: Tile }[] = [];

  constructor(
    readonly res: Resolver,
    readonly cascade: number,
  ) {}

  private get board() {
    return this.res.state.board;
  }

  get mult(): number {
    return cascadeMultiplier(this.cascade);
  }

  addPoints(n: number): void {
    this.cur.points += n;
    this.res.stats.points += n;
  }

  floater(idx: number, points: number): void {
    if (points > 0) this.cur.floaters.push({ idx, points });
  }

  finishPhase(): void {
    if (!phaseIsEmpty(this.cur)) {
      if (this.res.record) {
        this.cur.snapshot = cloneBoard(this.board);
        this.cur.totals = cloneStats(this.res.stats);
      }
      this.phases.push(this.cur);
    }
    this.cur = newPhase();
  }

  private damageBlocker(i: number, full: boolean): void {
    const cell = this.board.cells[i];
    const b = cell.blocker;
    if (!b || this.blockerHit.has(i)) return;
    this.blockerHit.add(i);
    const before = b.hp;
    const after = full ? 0 : b.hp - 1;
    this.cur.hits.push({ idx: i, layer: b.kind, before, after: Math.max(0, after) });
    this.addPoints(POINTS_OBSTACLE_HIT);
    if (after <= 0) {
      cell.blocker = null;
      this.res.stats.destroyed[b.kind]++;
      this.addPoints(POINTS_BLOCKER_DESTROYED);
    } else {
      b.hp = after;
    }
  }

  private damageWrap(i: number, full: boolean): void {
    const cell = this.board.cells[i];
    if (cell.wrap <= 0) return;
    if (!full && this.wrapHit.has(i)) return;
    this.wrapHit.add(i);
    const before = cell.wrap;
    cell.wrap = full ? 0 : cell.wrap - 1;
    this.cur.hits.push({ idx: i, layer: 'wrap', before, after: cell.wrap });
    this.addPoints(POINTS_OBSTACLE_HIT);
    if (cell.wrap === 0) this.res.stats.destroyed.wrap++;
  }

  private cleanOil(i: number, full: boolean): void {
    const cell = this.board.cells[i];
    if (cell.oil <= 0 || this.oilHit.has(i)) return;
    this.oilHit.add(i);
    const before = cell.oil;
    cell.oil = full ? 0 : cell.oil - 1;
    this.cur.hits.push({ idx: i, layer: 'oil', before, after: cell.oil });
    this.addPoints(POINTS_OBSTACLE_HIT);
    if (cell.oil === 0) this.res.stats.destroyed.oil++;
  }

  /** Remove the tile in cell i. Its special (if any) is queued for activation unless `silent`. */
  removeTile(i: number, cause: ClearCause, mergeTo?: number, full = false, silent = false): Tile | null {
    const cell = this.board.cells[i];
    const tile = cell.tile;
    if (!tile) return null;
    cell.tile = null;
    this.cur.cleared.push({ id: tile.id, idx: i, food: tile.food, special: tile.special, cause, mergeTo });
    this.res.stats.tilesCleared++;
    if (tile.food !== null) this.res.stats.collected[tile.food]++;
    this.addPoints((cause === 'match' ? POINTS_MATCH_TILE : POINTS_SPECIAL_TILE) * this.mult);
    this.cleanOil(i, full);
    if (tile.special && !silent) this.pending.push({ idx: i, tile });
    return tile;
  }

  /** A special effect, combo or booster reaches cell i. */
  hitCell(i: number, cause: ClearCause, full = false): void {
    const cell = this.board.cells[i];
    if (!cell || !cell.playable) return;
    if (cell.blocker) {
      this.damageBlocker(i, full);
      return;
    }
    if (!cell.tile || this.protect.has(i)) {
      if (full) this.cleanOil(i, true);
      return;
    }
    if (cell.wrap > 0) {
      this.damageWrap(i, full);
      if (!full) return;
    }
    this.removeTile(i, cause, undefined, full);
  }

  /** Clear match groups, create special pieces and damage neighbouring obstacles. */
  applyMatches(groups: MatchGroup[], preferred: readonly number[]): void {
    const plans = groups.map((g) => {
      const special = specialForGroup(g);
      let place: number | null = null;
      if (special) {
        place = placementForGroup(this.board, g, preferred);
        if (place !== null && this.protect.has(place)) place = null;
        if (place !== null) this.protect.add(place);
      }
      return { g, special: place !== null ? special : null, place };
    });

    for (const { g, special, place } of plans) {
      const before = this.res.stats.points;
      const inGroup = new Set(g.cells);
      for (const i of g.cells) {
        if (i === place) continue;
        const cell = this.board.cells[i];
        if (!cell.tile || this.protect.has(i)) continue;
        if (cell.wrap > 0) {
          this.damageWrap(i, false);
          continue;
        }
        this.removeTile(i, 'match', place ?? undefined);
      }
      for (const i of g.cells) {
        for (const n of neighbors4(this.board, i)) {
          if (inGroup.has(n)) continue;
          const nc = this.board.cells[n];
          if (nc.blocker) this.damageBlocker(n, false);
          else if (nc.wrap > 0 && nc.tile) this.damageWrap(n, false);
        }
      }
      if (special && place !== null) {
        const tile = this.board.cells[place].tile!;
        tile.special = special;
        if (special === 'fire') tile.food = null;
        this.cleanOil(place, false);
        this.cur.created.push({ idx: place, tile: { ...tile } });
        this.res.stats.created[special]++;
        this.addPoints(POINTS_CREATE[special] * this.mult);
      }
      const anchor = place ?? g.cells[Math.floor(g.cells.length / 2)];
      this.floater(anchor, this.res.stats.points - before);
    }
  }

  /** Most common food on the board (Suya Fire's target when it is set off by another effect). */
  private mostCommonFood(): Food | null {
    const counts = new Map<Food, number>();
    for (let i = 0; i < this.board.cells.length; i++) {
      const t = this.board.cells[i].tile;
      if (!t || t.food === null || this.protect.has(i)) continue;
      counts.set(t.food, (counts.get(t.food) ?? 0) + 1);
    }
    let best: Food | null = null;
    let bestN = 0;
    for (const [f, n] of counts) {
      if (n > bestN) {
        best = f;
        bestN = n;
      }
    }
    return best;
  }

  cellsWithFood(food: Food): number[] {
    const out: number[] = [];
    this.board.cells.forEach((c, i) => {
      if (c.tile && c.tile.food === food && c.tile.special !== 'fire' && !this.protect.has(i)) out.push(i);
    });
    return out;
  }

  /** Fire the effect of a special piece that was removed from cell `idx`. */
  activate(idx: number, tile: Tile, cause: ClearCause = 'special'): void {
    const sp = tile.special;
    if (!sp) return;
    const b = this.board;
    const before = this.res.stats.points;
    this.res.stats.activated[sp]++;
    let targets: number[] = [];
    let effect: Effect;
    switch (sp) {
      case 'rocketH':
        targets = rowCells(b, rowOf(b, idx));
        effect = { kind: 'rocketH', idx };
        break;
      case 'rocketV':
        targets = colCells(b, colOf(b, idx));
        effect = { kind: 'rocketV', idx };
        break;
      case 'blast':
        targets = areaCells(b, idx, BLAST_RADIUS, true);
        effect = { kind: 'blast', idx, radius: BLAST_RADIUS };
        break;
      case 'fire': {
        const food = this.mostCommonFood();
        targets = food === null ? [] : this.cellsWithFood(food);
        effect = { kind: 'fire', idx, targets, food };
        break;
      }
    }
    this.cur.effects.push(effect);
    for (const t of targets) if (t !== idx) this.hitCell(t, cause);
    this.floater(idx, this.res.stats.points - before);
  }

  /** Activate queued specials, one generation per phase, until the chain ends. */
  processPending(): void {
    while (this.pending.length > 0) {
      this.finishPhase();
      const batch = this.pending;
      this.pending = [];
      for (const p of batch) this.activate(p.idx, p.tile);
    }
    this.finishPhase();
  }

  /** Turn cells into special pieces (Suya Fire combos and the finale). */
  convert(cells: number[], make: () => Special): number[] {
    const done: number[] = [];
    for (const i of cells) {
      const t = this.board.cells[i].tile;
      if (!t || t.special === 'fire') continue;
      if (t.special === null) t.special = make();
      this.cur.converted.push({ idx: i, tile: { ...t } });
      done.push(i);
    }
    return done;
  }

  /** Remove converted pieces and fire them all at once. */
  detonate(cells: number[], cause: ClearCause): void {
    this.finishPhase();
    for (const i of cells) {
      const cell = this.board.cells[i];
      if (!cell.tile) continue;
      if (cell.wrap > 0) {
        this.damageWrap(i, true);
      }
      const tile = this.removeTile(i, cause, undefined, false, true);
      if (tile) this.activate(i, tile, cause);
    }
  }

  protectCell(i: number): void {
    this.protect.add(i);
  }
}

export class Resolver {
  readonly steps: Step[] = [];
  readonly stats: ResolveStats = emptyStats();
  constructor(
    readonly state: EngineState,
    readonly record: boolean,
  ) {}

  pushWave(wave: Wave): void {
    wave.finishPhase();
    if (wave.phases.length > 0) this.steps.push({ kind: 'clear', cascade: wave.cascade, phases: wave.phases });
  }

  gravity(): void {
    const { moves, spawns } = applyGravity(this.state);
    if (moves.length > 0 || spawns.length > 0) {
      this.steps.push({
        kind: 'fall',
        moves,
        spawns,
        snapshot: this.record ? cloneBoard(this.state.board) : undefined,
      });
    }
  }

  /**
   * Resolve the board until it is stable.
   * `initial` runs first (combos, boosters, finale) as cascade 1; matches then cascade from there.
   */
  run(opts: { preferred?: readonly number[]; initial?: (wave: Wave) => void } = {}): void {
    let cascade = 1;
    if (opts.initial) {
      const wave = new Wave(this, cascade);
      opts.initial(wave);
      wave.processPending();
      this.pushWave(wave);
      this.gravity();
      cascade++;
    }
    let waves = 0;
    while (waves < MAX_WAVES) {
      const groups = findGroups(this.state.board);
      if (groups.length === 0) break;
      const wave = new Wave(this, cascade);
      wave.applyMatches(groups, cascade === 1 ? (opts.preferred ?? []) : []);
      wave.processPending();
      this.pushWave(wave);
      this.gravity();
      this.stats.maxCascade = Math.max(this.stats.maxCascade, cascade);
      cascade++;
      waves++;
    }
  }
}

/** Swapping two special pieces (or Suya Fire with anything) fires a combo at cell `b`. */
export function comboInitial(state: EngineState, a: number, b: number): (wave: Wave) => void {
  return (wave) => {
    const cells = state.board.cells;
    const ta = cells[a].tile!;
    const tb = cells[b].tile!;
    const board = state.board;
    const sa = ta.special;
    const sb = tb.special;
    wave.removeTile(a, 'combo', b, false, true);
    wave.removeTile(b, 'combo', undefined, false, true);
    const before = wave.res.stats.points;
    const stats = wave.res.stats;
    const isRocket = (s: Special | null) => s === 'rocketH' || s === 'rocketV';

    if (sa && sb) {
      stats.combos++;
      wave.addPoints(POINTS_COMBO_BONUS);
    }

    // Suya Fire + Suya Fire: the whole board.
    if (sa === 'fire' && sb === 'fire') {
      stats.activated.fire += 2;
      const all = board.cells.map((_, i) => i);
      wave.cur.effects.push({ kind: 'mega', idx: b, targets: all });
      for (const i of all) wave.hitCell(i, 'combo');
      wave.floater(b, stats.points - before);
      return;
    }

    if (sa === 'fire' || sb === 'fire') {
      const other = sa === 'fire' ? tb : ta;
      const food = other.food;
      stats.activated.fire++;
      const targets = food === null ? [] : wave.cellsWithFood(food);
      if (other.special === null) {
        wave.cur.effects.push({ kind: 'fire', idx: b, targets, food });
        for (const i of targets) wave.hitCell(i, 'combo');
        wave.floater(b, stats.points - before);
        return;
      }
      // Suya Fire + Rocket / Blast: every tile of that food becomes one, then they all go off.
      wave.cur.effects.push({ kind: 'convert', idx: b, targets, food });
      const make = (): Special =>
        isRocket(other.special) ? (nextRandom(state) < 0.5 ? 'rocketH' : 'rocketV') : 'blast';
      const converted = wave.convert(targets, make);
      wave.floater(b, stats.points - before);
      wave.detonate(converted, 'combo');
      return;
    }

    // Two of rocket / blast.
    const r = rowOf(board, b);
    const c = colOf(board, b);
    let targets: number[];
    if (isRocket(sa) && isRocket(sb)) {
      stats.activated[sa!] += 1;
      stats.activated[sb!] += 1;
      targets = uniqueCells([rowCells(board, r), colCells(board, c)]);
      wave.cur.effects.push({ kind: 'cross', idx: b });
    } else if (sa === 'blast' && sb === 'blast') {
      stats.activated.blast += 2;
      targets = areaCells(board, b, BIG_BLAST_RADIUS, true);
      wave.cur.effects.push({ kind: 'blast', idx: b, radius: BIG_BLAST_RADIUS });
    } else {
      // rocket + blast: three rows and three columns
      stats.activated.blast += 1;
      stats.activated[(isRocket(sa) ? sa : sb)!] += 1;
      targets = uniqueCells([
        rowCells(board, r - 1),
        rowCells(board, r),
        rowCells(board, r + 1),
        colCells(board, c - 1),
        colCells(board, c),
        colCells(board, c + 1),
      ]);
      wave.cur.effects.push({ kind: 'bigCross', idx: b });
    }
    for (const i of targets) wave.hitCell(i, 'combo');
    wave.floater(b, stats.points - before);
  };
}

export function ladleInitial(target: number): (wave: Wave) => void {
  return (wave) => {
    wave.cur.effects.push({ kind: 'ladle', idx: target });
    wave.hitCell(target, 'booster');
  };
}

export function potInitial(state: EngineState, target: number): (wave: Wave) => void {
  return (wave) => {
    const targets = areaCells(state.board, target, POT_RADIUS, false);
    wave.cur.effects.push({ kind: 'pot', idx: target, radius: POT_RADIUS, targets });
    for (const i of targets) wave.hitCell(i, 'booster', true);
  };
}

/** Owambe finale: leftover moves turn random foods into Dodo Rockets, and every special on the board goes off. */
export function finaleInitial(state: EngineState, rockets: number): (wave: Wave) => void {
  return (wave) => {
    const cells = state.board.cells;
    const plain: number[] = [];
    const existing: number[] = [];
    cells.forEach((c, i) => {
      if (!c.tile || c.wrap > 0) return;
      if (c.tile.special) existing.push(i);
      else if (c.tile.food !== null) plain.push(i);
    });
    shuffleInPlace(state, plain);
    const chosen = plain.slice(0, rockets);
    const converted = wave.convert(chosen, () => (nextRandom(state) < 0.5 ? 'rocketH' : 'rocketV'));
    if (converted.length > 0) wave.cur.effects.push({ kind: 'convert', idx: converted[0], targets: converted });
    wave.detonate([...existing, ...converted], 'finale');
  };
}
