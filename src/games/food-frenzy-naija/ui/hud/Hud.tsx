import { memo } from 'react';
import { useStore } from 'zustand';
import { CheckIcon, StarIcon } from '../../art/icons';
import type { GoalState } from '../../engine/goals';
import type { LevelConfig } from '../../levels/types';
import type { GameController } from '../../session/controller';
import { GoalArt, goalLabel, goalRemainingText } from '../common/bits';

export const GoalChip = memo(function GoalChip({ goal }: { goal: GoalState }) {
  const label = goalLabel(goal.spec);
  return (
    <div className={`ffn-goal ${goal.done ? 'is-done' : ''}`} title={label}>
      <GoalArt spec={goal.spec} />
      <span className="ffn-goal-count" aria-label={goal.done ? `${label}: done` : `${label}: ${goalRemainingText(goal)} to go`}>
        {goal.done ? <CheckIcon /> : goalRemainingText(goal)}
      </span>
    </div>
  );
});

function ScoreMeter({ score, stars }: { score: number; stars: [number, number, number] }) {
  const max = stars[2] * 1.08;
  const pct = Math.min(100, (score / max) * 100);
  return (
    <div className="ffn-score">
      <div className="ffn-score-head">
        <span>Score</span>
        <strong>{score.toLocaleString('en-US')}</strong>
      </div>
      <div className="ffn-meter" role="progressbar" aria-valuemin={0} aria-valuemax={stars[2]} aria-valuenow={Math.min(score, stars[2])} aria-label="Score toward three stars">
        <div className="ffn-meter-fill" style={{ width: `${pct}%` }} />
        {stars.map((s, i) => (
          <span key={i} className={`ffn-meter-star ${score >= s ? 'is-on' : ''}`} style={{ left: `${(s / max) * 100}%` }}>
            <StarIcon filled={score >= s} />
          </span>
        ))}
      </div>
    </div>
  );
}

export function Hud({ controller, level }: { controller: GameController; level: LevelConfig }) {
  const hud = useStore(controller.store, (s) => s.hud);
  const low = hud.movesLeft <= 5;
  return (
    <div className="ffn-hud">
      <div className={`ffn-moves ${low ? 'is-low' : ''}`} aria-live="polite">
        <span>Moves</span>
        <strong key={hud.movesLeft}>{hud.movesLeft}</strong>
      </div>
      <div className="ffn-goals-panel">
        <span className="ffn-goals-title">Goal</span>
        <div className="ffn-goals">
          {hud.goals.map((g, i) => (
            <GoalChip key={i} goal={g} />
          ))}
        </div>
      </div>
      <ScoreMeter score={hud.score} stars={level.stars} />
    </div>
  );
}
