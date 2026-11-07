import { useEffect, useState } from 'react';
import { CoinIcon, MapIcon, PlayIcon, RetryIcon, StarIcon } from '../../art/icons';
import { Mama } from '../../art/Mama';
import { BOOSTER_ART } from '../../art/obstacles';
import { audio } from '../../audio/audio';
import type { BoosterId } from '../../engine/game';
import type { GoalState } from '../../engine/goals';
import type { LevelConfig } from '../../levels/types';
import type { RewardSummary } from '../../progress/rewards';
import { GoalArt, RewardList, goalLabel, goalRemainingText } from '../common/bits';
import { Button } from '../common/Button';
import { BOOSTER_NAMES } from '../common/boosterInfo';
import { Modal } from '../common/Modal';

export function WinModal({
  title,
  score,
  stars,
  newBest,
  reward,
  onNext,
  onReplay,
  onMap,
  reducedMotion,
}: {
  title: string;
  score: number;
  stars: number;
  newBest: boolean;
  reward: RewardSummary | null;
  onNext?: () => void;
  onReplay: () => void;
  onMap: () => void;
  reducedMotion: boolean;
}) {
  const [shown, setShown] = useState(reducedMotion ? stars : 0);
  useEffect(() => {
    if (reducedMotion) return;
    const ids: ReturnType<typeof setTimeout>[] = [];
    for (let i = 0; i < stars; i++) {
      ids.push(
        setTimeout(() => {
          setShown(i + 1);
          audio.play('star', i);
        }, 350 + i * 380),
      );
    }
    if (reward && reward.coins > 0) ids.push(setTimeout(() => audio.play('coin'), 450 + stars * 380));
    return () => ids.forEach(clearTimeout);
  }, [stars, reward, reducedMotion]);

  return (
    <Modal title={title} tone="red" className="ffn-result is-win">
      <div className="ffn-confetti" aria-hidden="true">
        {Array.from({ length: 14 }, (_, i) => (
          <i key={i} style={{ left: `${(i * 7.3) % 100}%`, animationDelay: `${(i % 5) * 0.18}s` }} />
        ))}
      </div>
      <div className="ffn-result-stars" role="img" aria-label={`${stars} of 3 stars`}>
        {[0, 1, 2].map((i) => (
          <span key={i} className={`ffn-big-star is-${i} ${i < shown ? 'is-on' : ''}`}>
            <StarIcon filled={i < shown} />
          </span>
        ))}
      </div>
      <p className="ffn-result-title">{stars === 3 ? 'Chop life!' : stars === 2 ? 'Great job!' : 'Well done!'}</p>
      <div className="ffn-result-score">
        <span>Score</span>
        <strong>{score.toLocaleString('en-US')}</strong>
        {newBest && <em className="ffn-new-best">New best!</em>}
      </div>
      {reward && <RewardList reward={reward} className="ffn-result-rewards" />}
      <div className="ffn-modal-actions is-stack">
        {onNext && (
          <Button variant="green" size="lg" icon={<PlayIcon />} onClick={onNext} autoFocus>
            Next Level
          </Button>
        )}
        <div className="ffn-modal-actions">
          <Button variant="cream" icon={<RetryIcon />} onClick={onReplay}>
            Replay
          </Button>
          <Button variant="purple" icon={<MapIcon />} onClick={onMap} autoFocus={!onNext}>
            Map
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export const PLAY_ON_COST = 250;

export function FailModal({
  goals,
  level,
  extraMovesOwned,
  coins,
  tip,
  onUseBooster,
  onBuyMoves,
  onRetry,
  onMap,
}: {
  goals: GoalState[];
  level: LevelConfig;
  extraMovesOwned: number;
  coins: number;
  tip: { booster: BoosterId; text: string } | null;
  onUseBooster: () => void;
  onBuyMoves: () => void;
  onRetry: () => void;
  onMap: () => void;
}) {
  const missed = goals.filter((g) => !g.done);
  return (
    <Modal title="Out of moves!" tone="purple" className="ffn-result is-fail">
      <div className="ffn-fail-head">
        <Mama size={72} mood="wink" />
        <p className="ffn-bubble">So close! {missed.length === 1 ? 'Just one goal left.' : 'Keep going, you can do it.'}</p>
      </div>
      <ul className="ffn-fail-goals" aria-label="Goals not finished">
        {missed.map((g, i) => (
          <li key={i}>
            <GoalArt spec={g.spec} />
            <span>{goalLabel(g.spec)}</span>
            <b>{g.spec.kind === 'score' ? goalRemainingText(g) : `${goalRemainingText(g)} left`}</b>
          </li>
        ))}
      </ul>
      <div className="ffn-play-on">
        {extraMovesOwned > 0 ? (
          <Button variant="orange" size="lg" icon={<img src={BOOSTER_ART.moves} alt="" />} onClick={onUseBooster} autoFocus>
            Use Extra Moves ({extraMovesOwned})
          </Button>
        ) : (
          <Button variant="orange" size="lg" icon={<CoinIcon />} onClick={onBuyMoves} disabled={coins < PLAY_ON_COST} autoFocus>
            {coins < PLAY_ON_COST ? `+5 moves needs ${PLAY_ON_COST}` : `+5 moves · ${PLAY_ON_COST}`}
          </Button>
        )}
      </div>
      {tip && (
        <p className="ffn-tip">
          <img src={BOOSTER_ART[tip.booster]} alt="" />
          <span>
            <b>Tip:</b> {tip.text}
          </span>
        </p>
      )}
      <div className="ffn-modal-actions">
        <Button variant="green" icon={<RetryIcon />} onClick={onRetry}>
          Retry
        </Button>
        <Button variant="purple" icon={<MapIcon />} onClick={onMap}>
          {level.id >= 1000 ? 'Back' : 'Map'}
        </Button>
      </div>
    </Modal>
  );
}

/** Suggest a booster that suits the goal the player missed. */
export function failTip(goals: GoalState[], unlockedLevel: number): { booster: BoosterId; text: string } | null {
  const missed = goals.filter((g) => !g.done);
  const hasObstacle = missed.some((g) => g.spec.kind === 'clear');
  if (hasObstacle && unlockedLevel >= 12)
    return { booster: 'pot', text: `${BOOSTER_NAMES.pot} wipes every obstacle layer in a 5×5 area.` };
  if (hasObstacle && unlockedLevel >= 4) return { booster: 'ladle', text: `${BOOSTER_NAMES.ladle} knocks a layer off any obstacle.` };
  if (unlockedLevel >= 9) return { booster: 'moves', text: 'Start your next try with Extra Moves in reserve for the last few goals.' };
  if (unlockedLevel >= 6) return { booster: 'shuffle', text: `${BOOSTER_NAMES.shuffle} mixes up the board when good moves are hard to find.` };
  return null;
}
