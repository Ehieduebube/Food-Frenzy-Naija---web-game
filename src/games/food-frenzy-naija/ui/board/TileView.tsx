import { memo, type CSSProperties } from 'react';
import { foodImage, SPECIAL_ART } from '../../art/foods';
import { FOOD_NAMES, type Food, type Special } from '../../engine/types';
import type { VisualTile } from '../../session/view';

export function cellStyle(idx: number, cols: number): CSSProperties {
  const r = Math.floor(idx / cols);
  const c = idx % cols;
  return { transform: `translate(${c * 100}%, ${r * 100}%)` };
}

export function pieceLabel(food: Food | null, special: Special | null): string {
  if (special === 'fire') return 'Suya Fire';
  const name = food === null ? 'Food' : FOOD_NAMES[food];
  if (special === 'rocketH') return `${name} Dodo Rocket (row)`;
  if (special === 'rocketV') return `${name} Dodo Rocket (column)`;
  if (special === 'blast') return `${name} Jollof Blast`;
  return name;
}

/** The artwork of one piece: food, plus its special-piece overlay. */
export function PieceArt({ food, special }: { food: Food | null; special: Special | null }) {
  if (special === 'fire') return <img className="ffn-piece-img ffn-fire-img" src={SPECIAL_ART.fire} alt="" draggable={false} />;
  return (
    <>
      {special === 'blast' && <span className="ffn-blast-glow" />}
      {food !== null && <img className="ffn-piece-img" src={foodImage(food)} alt="" draggable={false} />}
      {(special === 'rocketH' || special === 'rocketV') && (
        <img className={`ffn-piece-ov ffn-rocket-ov ${special === 'rocketV' ? 'is-v' : ''}`} src={SPECIAL_ART.rocket} alt="" draggable={false} />
      )}
      {special === 'blast' && <img className="ffn-piece-ov ffn-blast-ov" src={SPECIAL_ART.blast} alt="" draggable={false} />}
    </>
  );
}

/**
 * One tile. Nested layers keep animations independent:
 *   outer  -> position (CSS transition)
 *   drop   -> spawn drop-in, replayed via key
 *   land   -> landing squash after a fall
 *   face   -> selection, hint wiggle and special glow
 */
export const TileView = memo(function TileView({
  tile,
  cols,
  selected,
  hinted,
  focused,
}: {
  tile: VisualTile;
  cols: number;
  selected: boolean;
  hinted: boolean;
  focused: boolean;
}) {
  const style: CSSProperties = {
    ...cellStyle(tile.idx, cols),
    transitionDuration: `${tile.dur}ms`,
  };
  const dropStyle = { '--drop': tile.drop, animationDuration: `${tile.dur}ms` } as CSSProperties;
  const landStyle = { animationDelay: `${Math.max(0, tile.dur - 30)}ms` } as CSSProperties;
  return (
    <div className={`ffn-tile is-${tile.motion}`} style={style} data-idx={tile.idx}>
      <div key={tile.landSeq} className={`ffn-tile-drop ${tile.drop > 0 ? 'is-dropping' : ''}`} style={dropStyle}>
        <div className={`ffn-tile-land ${tile.landSeq > 0 ? 'is-landing' : ''}`} style={landStyle}>
          <div
            className={`ffn-tile-face ${selected ? 'is-selected' : ''} ${hinted ? 'is-hinted' : ''} ${focused ? 'is-focused' : ''} ${
              tile.special ? `is-special is-${tile.special}` : ''
            }`}
          >
            <PieceArt food={tile.food} special={tile.special} />
          </div>
        </div>
      </div>
    </div>
  );
});
