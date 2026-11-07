import { PlayIcon } from '../../art/icons';
import { describeGoal } from '../../engine/goals';
import { FOOD_NAMES } from '../../engine/types';
import type { RewardSummary } from '../../progress/rewards';
import type { LevelConfig } from '../../levels/types';
import { useProfile } from '../../progress/profileStore';
import { GoalArt, RewardList, StarRow } from '../common/bits';
import { Button } from '../common/Button';
import { Modal } from '../common/Modal';

export function LevelIntro({
  level,
  title,
  reward,
  onPlay,
  onClose,
}: {
  level: LevelConfig;
  title?: string;
  reward?: RewardSummary;
  onPlay: () => void;
  onClose: () => void;
}) {
  const record = useProfile((s) => s.save.levels[String(level.id)]);
  return (
    <Modal title={title ?? `Level ${level.id}`} onClose={onClose} className="ffn-intro">
      <h3 className="ffn-intro-name">{level.name}</h3>
      <div className="ffn-intro-meta">
        <span className={`ffn-tag is-${level.difficulty.replace(' ', '-')}`}>{level.difficulty}</span>
        <span className="ffn-tag is-moves">{level.moves} moves</span>
      </div>
      <ul className="ffn-intro-goals">
        {level.goals.map((g, i) => (
          <li key={i}>
            <GoalArt spec={g} />
            <span>{describeGoal(g, (f) => FOOD_NAMES[f])}</span>
          </li>
        ))}
      </ul>
      {record?.completed && (
        <div className="ffn-intro-best">
          <StarRow stars={record.stars} size="1.2em" />
          <span>Best {record.bestScore.toLocaleString('en-US')}</span>
        </div>
      )}
      {reward && (
        <div className="ffn-intro-reward">
          <span>Reward</span>
          <RewardList reward={reward} />
        </div>
      )}
      <Button variant="green" size="lg" icon={<PlayIcon />} onClick={onPlay} autoFocus>
        Play
      </Button>
    </Modal>
  );
}
