import type { ReactNode } from 'react';
import { foodImage, SPECIAL_ART } from '../../art/foods';
import { CoinIcon, PlusIcon, StarIcon, TrophyIcon } from '../../art/icons';
import { BOOSTER_ART, OBSTACLE_ART, crateArt, oilArt, wrapArt } from '../../art/obstacles';
import type { BoosterId } from '../../engine/game';
import type { GoalSpec, GoalState } from '../../engine/goals';
import { FOOD_NAMES } from '../../engine/types';
import type { RewardSummary } from '../../progress/rewards';
import { BOOSTER_NAMES } from './boosterInfo';

export function CoinPill({ coins, onAdd }: { coins: number; onAdd?: () => void }) {
  return (
    <div className="ffn-pill ffn-coin-pill">
      <CoinIcon className="ffn-pill-icon" />
      <span className="ffn-pill-value">{coins.toLocaleString('en-US')}</span>
      {onAdd && (
        <button type="button" className="ffn-pill-add" aria-label="Get boosters with coins" onClick={onAdd}>
          <PlusIcon />
        </button>
      )}
    </div>
  );
}

export function StarRow({ stars, size = '1.4em', max = 3, className = '' }: { stars: number; size?: string; max?: number; className?: string }) {
  return (
    <span className={`ffn-star-row ${className}`} aria-label={`${stars} of ${max} stars`} role="img">
      {Array.from({ length: max }, (_, i) => (
        <StarIcon key={i} filled={i < stars} size={size} />
      ))}
    </span>
  );
}

/** Artwork that represents a goal, shared by the HUD, level intro, results and daily challenge. */
export function GoalArt({ spec, className = '' }: { spec: GoalSpec; className?: string }) {
  let src = '';
  switch (spec.kind) {
    case 'collect':
      src = foodImage(spec.food);
      break;
    case 'clear':
      src =
        spec.layer === 'basket'
          ? OBSTACLE_ART.basket
          : spec.layer === 'crate'
            ? crateArt(2)
            : spec.layer === 'wrap'
              ? wrapArt(1)
              : oilArt(1);
      break;
    case 'activate':
      src = spec.special === 'fire' ? SPECIAL_ART.fire : spec.special === 'rocket' ? SPECIAL_ART.rocket : SPECIAL_ART.blast;
      break;
    case 'score':
      return (
        <span className={`ffn-goal-art ffn-goal-art-score ${className}`}>
          <TrophyIcon />
        </span>
      );
  }
  return (
    <span className={`ffn-goal-art ${className}`}>
      {spec.kind === 'activate' && spec.special !== 'fire' && <img src={foodImage(1)} alt="" className="ffn-goal-art-under" />}
      <img src={src} alt="" />
    </span>
  );
}

export function goalLabel(spec: GoalSpec): string {
  switch (spec.kind) {
    case 'collect':
      return FOOD_NAMES[spec.food];
    case 'clear':
      return { basket: 'Food baskets', crate: 'Pepper crates', wrap: 'Leaf wraps', oil: 'Palm-oil spills' }[spec.layer];
    case 'activate':
      return { rocket: 'Dodo Rockets', blast: 'Jollof Blasts', fire: 'Suya Fires' }[spec.special];
    case 'score':
      return 'Score';
  }
}

export function shortNumber(n: number): string {
  if (n >= 10000) return `${(n / 1000).toFixed(n >= 100000 ? 0 : 1).replace(/\.0$/, '')}k`;
  return n.toLocaleString('en-US');
}

/** "12 left" style remaining count, or the score target. */
export function goalRemainingText(g: GoalState): string {
  if (g.spec.kind === 'score') return `${shortNumber(g.current)}/${shortNumber(g.required)}`;
  return String(Math.max(0, g.required - g.current));
}

export function RewardList({ reward, className = '' }: { reward: RewardSummary; className?: string }) {
  const items: ReactNode[] = [];
  if (reward.coins > 0)
    items.push(
      <span key="coins" className="ffn-reward-item">
        <CoinIcon /> <b>+{reward.coins}</b>
      </span>,
    );
  for (const [id, n] of Object.entries(reward.boosters) as [BoosterId, number][]) {
    if (!n) continue;
    items.push(
      <span key={id} className="ffn-reward-item" title={BOOSTER_NAMES[id]}>
        <img src={BOOSTER_ART[id]} alt="" /> <b>+{n}</b>
        <span className="ffn-sr">{BOOSTER_NAMES[id]}</span>
      </span>,
    );
  }
  if (items.length === 0) return null;
  return <div className={`ffn-reward-list ${className}`}>{items}</div>;
}
