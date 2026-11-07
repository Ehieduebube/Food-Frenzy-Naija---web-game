import { useMemo } from 'react';
import { BackIcon, CheckIcon, PlayIcon } from '../../art/icons';
import { Mama } from '../../art/Mama';
import { describeGoal } from '../../engine/goals';
import { FOOD_NAMES } from '../../engine/types';
import { dailyChallengeFor } from '../../levels/daily';
import { useProfile } from '../../progress/profileStore';
import { CoinPill, GoalArt, RewardList } from '../common/bits';
import { Button, IconButton } from '../common/Button';
import { useCountdownToTomorrow, useToday } from '../hooks';
import { useUi } from '../uiStore';

export function ChallengeScreen() {
  const save = useProfile((s) => s.save);
  const go = useUi((s) => s.go);
  const today = useToday();
  const challenge = useMemo(() => dailyChallengeFor(today), [today]);
  const done = save.challenge.completed.includes(today);
  const countdown = useCountdownToTomorrow();
  const { level } = challenge;
  return (
    <div className="ffn-screen ffn-page">
      <header className="ffn-topbar is-solid">
        <IconButton label="Back to menu" variant="purple" onClick={() => go({ id: 'menu' })}>
          <BackIcon />
        </IconButton>
        <h2 className="ffn-screen-title">Daily Challenge</h2>
        <CoinPill coins={save.coins} />
      </header>
      <div className="ffn-page-body">
        <article className="ffn-panel ffn-challenge">
          <p className="ffn-challenge-date">{new Date(`${today}T12:00:00`).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
          <h3>{level.name}</h3>
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
          <div className="ffn-intro-reward">
            <span>{done ? 'Reward claimed' : 'First win today earns'}</span>
            <RewardList reward={challenge.reward} />
          </div>
          {done ? (
            <div className="ffn-challenge-done">
              <CheckIcon /> Completed! A new challenge arrives in {countdown}.
            </div>
          ) : (
            <p className="ffn-muted">Same board for everyone today. New challenge in {countdown}.</p>
          )}
          <Button variant="green" size="lg" icon={<PlayIcon />} onClick={() => go({ id: 'playChallenge', dateKey: today })}>
            {done ? 'Play again' : 'Play'}
          </Button>
        </article>
        <div className="ffn-menu-mama is-inline">
          <Mama size={64} mood="wink" />
          <p className="ffn-bubble">Everybody gets the same board today. Show them how it is done!</p>
        </div>
      </div>
    </div>
  );
}
