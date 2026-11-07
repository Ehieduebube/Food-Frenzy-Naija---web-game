import { memo, type CSSProperties } from 'react';
import { PROJECTILE_ART } from '../../art/foods';
import { BOOSTER_ART, OBSTACLE_ART, crateArt, oilArt, wrapArt } from '../../art/obstacles';
import type { Effect } from '../../engine/types';
import type { BreakFx, CellView, FloaterView, FxView, Ghost } from '../../session/view';
import { PieceArt, cellStyle } from './TileView';

/** Cell slots and palm-oil spills (under the food). */
export const CellLayer = memo(function CellLayer({ cells, cols }: { cells: CellView[]; cols: number }) {
  return (
    <div className="ffn-layer ffn-cells" aria-hidden="true">
      {cells.map((c, i) =>
        c.playable ? (
          <div key={i} className={`ffn-cell ${(Math.floor(i / cols) + (i % cols)) % 2 ? 'is-alt' : ''}`} style={cellStyle(i, cols)}>
            {c.oil > 0 && <img className={`ffn-oil is-${c.oil}`} src={oilArt(c.oil)} alt="" draggable={false} />}
          </div>
        ) : null,
      )}
    </div>
  );
});

/** Baskets, crates and leaf wraps (over the food). */
export const ObstacleLayer = memo(function ObstacleLayer({ cells, cols }: { cells: CellView[]; cols: number }) {
  return (
    <div className="ffn-layer ffn-obstacles" aria-hidden="true">
      {cells.map((c, i) => {
        if (c.blocker) {
          const src = c.blocker.kind === 'basket' ? OBSTACLE_ART.basket : crateArt(c.blocker.hp);
          return (
            <div key={i} className={`ffn-obstacle is-${c.blocker.kind}`} style={cellStyle(i, cols)}>
              <img key={`${c.blocker.kind}${c.blocker.hp}`} src={src} alt="" draggable={false} />
            </div>
          );
        }
        if (c.wrap > 0) {
          return (
            <div key={i} className="ffn-obstacle is-wrap" style={cellStyle(i, cols)}>
              <img key={`w${c.wrap}`} src={wrapArt(c.wrap)} alt="" draggable={false} />
            </div>
          );
        }
        return null;
      })}
    </div>
  );
});

export function GhostLayer({ ghosts, cols }: { ghosts: Ghost[]; cols: number }) {
  return (
    <div className="ffn-layer ffn-ghosts" aria-hidden="true">
      {ghosts.map((g) => {
        const style = cellStyle(g.idx, cols) as CSSProperties & Record<string, string | number>;
        if (g.toIdx !== undefined) {
          style['--dx'] = (g.toIdx % cols) - (g.idx % cols);
          style['--dy'] = Math.floor(g.toIdx / cols) - Math.floor(g.idx / cols);
        }
        return (
          <div key={g.key} className="ffn-ghost" style={style}>
            <div className={`ffn-ghost-body is-${g.kind}`}>
              <PieceArt food={g.food} special={g.special} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function BreakLayer({ breaks, cols }: { breaks: BreakFx[]; cols: number }) {
  return (
    <div className="ffn-layer ffn-breaks" aria-hidden="true">
      {breaks.map((b) => {
        const src =
          b.layer === 'basket' ? OBSTACLE_ART.basket : b.layer === 'crate' ? crateArt(b.before) : b.layer === 'wrap' ? wrapArt(b.before) : oilArt(b.before);
        return (
          <div key={b.key} className="ffn-break" style={cellStyle(b.idx, cols)}>
            <img className={`ffn-break-img is-${b.layer}`} src={src} alt="" draggable={false} />
          </div>
        );
      })}
    </div>
  );
}

function pct(n: number, of: number): string {
  return `${(n / of) * 100}%`;
}

function Beam({ dir, line, origin, rows, cols, delay = 0 }: { dir: 'h' | 'v'; line: number; origin: number; rows: number; cols: number; delay?: number }) {
  const style: CSSProperties =
    dir === 'h'
      ? { top: pct(line, rows), height: pct(1, rows), left: 0, right: 0, animationDelay: `${delay}ms` }
      : { left: pct(line, cols), width: pct(1, cols), top: 0, bottom: 0, animationDelay: `${delay}ms` };
  const o = dir === 'h' ? (origin + 0.5) / cols : (origin + 0.5) / rows;
  return (
    <div className={`ffn-fx-beam is-${dir}`} style={{ ...style, '--o': `${o * 100}%` } as CSSProperties}>
      <span className="ffn-fx-beam-core" />
      <img className="ffn-fx-proj is-a" src={PROJECTILE_ART} alt="" />
      <img className="ffn-fx-proj is-b" src={PROJECTILE_ART} alt="" />
    </div>
  );
}

function FxItem({ effect, rows, cols }: { effect: Effect; rows: number; cols: number }) {
  const r = Math.floor(effect.idx / cols);
  const c = effect.idx % cols;
  const center = { left: pct(c + 0.5, cols), top: pct(r + 0.5, rows) };
  switch (effect.kind) {
    case 'rocketH':
      return <Beam dir="h" line={r} origin={c} rows={rows} cols={cols} />;
    case 'rocketV':
      return <Beam dir="v" line={c} origin={r} rows={rows} cols={cols} />;
    case 'cross':
      return (
        <>
          <Beam dir="h" line={r} origin={c} rows={rows} cols={cols} />
          <Beam dir="v" line={c} origin={r} rows={rows} cols={cols} />
        </>
      );
    case 'bigCross':
      return (
        <>
          {[-1, 0, 1].map((d) => (
            <Beam key={`h${d}`} dir="h" line={r + d} origin={c} rows={rows} cols={cols} delay={Math.abs(d) * 40} />
          ))}
          {[-1, 0, 1].map((d) => (
            <Beam key={`v${d}`} dir="v" line={c + d} origin={r} rows={rows} cols={cols} delay={Math.abs(d) * 40} />
          ))}
          <div className="ffn-fx-blast" style={{ ...center, width: pct(3, cols), height: pct(3, rows) }} />
        </>
      );
    case 'blast': {
      const size = (effect.radius ?? 2) * 2 + 1;
      return <div className="ffn-fx-blast" style={{ ...center, width: pct(size, cols), height: pct(size, rows) }} />;
    }
    case 'pot':
      return (
        <div className="ffn-fx-pot" style={{ ...center, width: pct(5, cols), height: pct(5, rows) }}>
          <img src={BOOSTER_ART.pot} alt="" />
        </div>
      );
    case 'ladle':
      return (
        <div className="ffn-fx-ladle" style={{ ...center, width: pct(1.6, cols), height: pct(1.6, rows) }}>
          <img src={BOOSTER_ART.ladle} alt="" />
        </div>
      );
    case 'mega':
      return <div className="ffn-fx-mega" />;
    case 'fire':
    case 'convert': {
      const targets = effect.targets ?? [];
      return (
        <svg className={`ffn-fx-fire ${effect.kind === 'convert' ? 'is-convert' : ''}`} viewBox={`0 0 ${cols} ${rows}`} preserveAspectRatio="none">
          {targets.map((t) => (
            <line key={t} x1={c + 0.5} y1={r + 0.5} x2={(t % cols) + 0.5} y2={Math.floor(t / cols) + 0.5} pathLength={1} />
          ))}
          {targets.map((t) => (
            <circle key={`c${t}`} cx={(t % cols) + 0.5} cy={Math.floor(t / cols) + 0.5} r={0.36} />
          ))}
        </svg>
      );
    }
  }
}

export function FxLayer({ fx, rows, cols }: { fx: FxView[]; rows: number; cols: number }) {
  return (
    <div className="ffn-layer ffn-fx" aria-hidden="true">
      {fx.map((f) => (
        <FxItem key={f.key} effect={f.effect} rows={rows} cols={cols} />
      ))}
    </div>
  );
}

export function FloaterLayer({ floaters, cols }: { floaters: FloaterView[]; cols: number }) {
  return (
    <div className="ffn-layer ffn-floaters" aria-hidden="true">
      {floaters.map((f) => (
        <div key={f.key} className="ffn-floater" style={cellStyle(f.idx, cols)}>
          <span>{f.text}</span>
        </div>
      ))}
    </div>
  );
}
