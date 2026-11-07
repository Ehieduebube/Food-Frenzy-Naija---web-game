import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent } from 'react';
import { useStore } from 'zustand';
import { HandIcon } from '../../art/icons';
import { areAdjacent } from '../../engine/board';
import type { GameController } from '../../session/controller';
import { BreakLayer, CellLayer, FloaterLayer, FxLayer, GhostLayer, ObstacleLayer } from './Layers';
import { ParticleCanvas, type ParticleApi } from './ParticleCanvas';
import { TileView, pieceLabel } from './TileView';

/** Swipe distance (as a fraction of a tile) that counts as a swap gesture. */
const SWIPE_THRESHOLD = 0.32;

export function Board({ controller, reducedMotion, size }: { controller: GameController; reducedMotion: boolean; size: { w: number; h: number } | null }) {
  const store = controller.store;
  const rows = useStore(store, (s) => s.rows);
  const cols = useStore(store, (s) => s.cols);
  const tiles = useStore(store, (s) => s.tiles);
  const cells = useStore(store, (s) => s.cells);
  const ghosts = useStore(store, (s) => s.ghosts);
  const breaks = useStore(store, (s) => s.breaks);
  const fx = useStore(store, (s) => s.fx);
  const floaters = useStore(store, (s) => s.floaters);
  const selected = useStore(store, (s) => s.selected);
  const hint = useStore(store, (s) => s.hint);
  const shakeKey = useStore(store, (s) => s.shakeKey);
  const boosterMode = useStore(store, (s) => s.boosterMode);
  const banner = useStore(store, (s) => s.banner);

  const boardRef = useRef<HTMLDivElement>(null);
  const particles = useRef<ParticleApi>(null);
  const gesture = useRef<{ idx: number; x: number; y: number; id: number; used: boolean } | null>(null);
  const [cursor, setCursor] = useState<number | null>(null);

  // particle bursts requested by the controller
  useEffect(
    () =>
      controller.on((e) => {
        if (e.type !== 'burst') return;
        const r = Math.floor(e.idx / cols);
        const c = e.idx % cols;
        particles.current?.burst((c + 0.5) / cols, (r + 0.5) / rows, e.color, e.count, e.style);
      }),
    [controller, cols, rows],
  );

  const cellAt = (clientX: number, clientY: number): number | null => {
    const el = boardRef.current;
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    const c = Math.floor(((clientX - rect.left) / rect.width) * cols);
    const r = Math.floor(((clientY - rect.top) / rect.height) * rows);
    if (r < 0 || c < 0 || r >= rows || c >= cols) return null;
    const idx = r * cols + c;
    return cells[idx]?.playable ? idx : null;
  };

  const tap = (idx: number) => {
    if (!controller.canInteract) return;
    if (boosterMode === 'ladle' || boosterMode === 'pot') {
      void controller.useBooster(boosterMode, idx);
      return;
    }
    const sel = store.getState().selected;
    const board = controller.session.engine.board;
    if (sel === null) controller.select(idx);
    else if (sel === idx) controller.select(null);
    else if (areAdjacent(board, sel, idx)) void controller.trySwap(sel, idx);
    else controller.select(idx);
  };

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    const idx = cellAt(e.clientX, e.clientY);
    if (idx === null || !controller.canInteract) return;
    e.preventDefault();
    if (boosterMode) {
      tap(idx);
      return;
    }
    gesture.current = { idx, x: e.clientX, y: e.clientY, id: e.pointerId, used: false };
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  };

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const g = gesture.current;
    if (!g || g.used || g.id !== e.pointerId) return;
    const rect = boardRef.current!.getBoundingClientRect();
    const tile = rect.width / cols;
    const dx = e.clientX - g.x;
    const dy = e.clientY - g.y;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < tile * SWIPE_THRESHOLD) return;
    g.used = true;
    const r = Math.floor(g.idx / cols);
    const c = g.idx % cols;
    let tr = r;
    let tc = c;
    if (Math.abs(dx) > Math.abs(dy)) tc += dx > 0 ? 1 : -1;
    else tr += dy > 0 ? 1 : -1;
    if (tr < 0 || tc < 0 || tr >= rows || tc >= cols) return;
    void controller.trySwap(g.idx, tr * cols + tc);
  };

  const onPointerUp = (e: PointerEvent<HTMLDivElement>) => {
    const g = gesture.current;
    gesture.current = null;
    if (!g || g.used || g.id !== e.pointerId) return;
    tap(g.idx);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const moves: Record<string, [number, number]> = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] };
    const start = cursor ?? selected ?? Math.floor(rows / 2) * cols + Math.floor(cols / 2);
    if (moves[e.key]) {
      e.preventDefault();
      const [dr, dc] = moves[e.key];
      let r = Math.floor(start / cols);
      let c = start % cols;
      for (let step = 0; step < Math.max(rows, cols); step++) {
        r = Math.min(rows - 1, Math.max(0, r + dr));
        c = Math.min(cols - 1, Math.max(0, c + dc));
        if (cells[r * cols + c]?.playable) break;
      }
      setCursor(r * cols + c);
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (cursor === null) setCursor(start);
      else tap(cursor);
    } else if (e.key === 'Escape') {
      if (selected !== null) controller.select(null);
      if (boosterMode) controller.setBoosterMode(null);
    }
  };

  const hintSet = new Set(hint ?? []);
  const shakeClass = shakeKey && !reducedMotion ? (shakeKey % 2 ? 'is-shake-a' : 'is-shake-b') : '';
  const handStyle = hint
    ? ({
        '--hx': `${((hint[0] % cols) + 0.5) * (100 / cols)}%`,
        '--hy': `${(Math.floor(hint[0] / cols) + 0.55) * (100 / rows)}%`,
        '--hx2': `${((hint[1] % cols) + 0.5) * (100 / cols)}%`,
        '--hy2': `${(Math.floor(hint[1] / cols) + 0.55) * (100 / rows)}%`,
      } as CSSProperties)
    : undefined;
  const cursorTile = cursor !== null ? tiles.find((t) => t.idx === cursor) : undefined;

  return (
    <div className="ffn-board-wrap" style={size ? { width: size.w, height: size.h } : { visibility: 'hidden' }}>
      <div
        ref={boardRef}
        className={`ffn-board ${shakeClass} ${boosterMode ? 'is-targeting' : ''}`}
        style={{ '--cols': cols, '--rows': rows } as CSSProperties}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={() => (gesture.current = null)}
        onKeyDown={onKeyDown}
        onBlur={() => setCursor(null)}
        tabIndex={0}
        role="application"
        aria-label={`Game board, ${rows} rows by ${cols} columns. Swipe or tap two neighbouring foods to swap them. With a keyboard, use the arrow keys and Enter.`}
      >
        <CellLayer cells={cells} cols={cols} />
        <div className="ffn-layer ffn-tiles">
          {tiles.map((t) => (
            <TileView key={t.id} tile={t} cols={cols} selected={selected === t.idx} hinted={hintSet.has(t.idx)} focused={cursor === t.idx} />
          ))}
        </div>
        <ObstacleLayer cells={cells} cols={cols} />
        <BreakLayer breaks={breaks} cols={cols} />
        <GhostLayer ghosts={ghosts} cols={cols} />
        <FxLayer fx={fx} rows={rows} cols={cols} />
        <ParticleCanvas ref={particles} />
        <FloaterLayer floaters={floaters} cols={cols} />
        {hint && !boosterMode && (
          <div className="ffn-hand" style={handStyle} aria-hidden="true">
            <HandIcon />
          </div>
        )}
        {banner && (
          <div key={banner.key} className={`ffn-banner is-${banner.tone}`} role="status">
            <span>{banner.text}</span>
          </div>
        )}
      </div>
      <div className="ffn-sr" aria-live="polite">
        {cursorTile ? pieceLabel(cursorTile.food, cursorTile.special) : ''}
      </div>
    </div>
  );
}
