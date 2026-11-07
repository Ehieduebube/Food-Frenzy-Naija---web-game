import { useEffect, useMemo, type ReactNode } from 'react';
import { foodImage } from '../../art/foods';
import { BackIcon, GearIcon, PlayIcon, PodiumIcon, StarIcon } from '../../art/icons';
import { Mama } from '../../art/Mama';
import { MenuScene } from '../../art/MenuScene';
import { BagArt, CalendarArt, GiftArt, LogoBoard, Sparkle, TrophyArt } from '../../art/menuArt';
import { audio } from '../../audio/audio';
import type { Food } from '../../engine/types';
import { LEVEL_COUNT } from '../../levels/levels';
import { unclaimedCount } from '../../progress/achievements';
import { useProfile } from '../../progress/profileStore';
import { dailyRewardStatus } from '../../progress/rewards';
import { completedCount, highestUnlocked, totalStars } from '../../progress/saveSchema';
import { CoinPill } from '../common/bits';
import { Button, IconButton } from '../common/Button';
import { useToday } from '../hooks';
import { useUi } from '../uiStore';

const GREETINGS = [
  'Welcome! Let’s crush some food!',
  'Ẹ kú àbọ̀! Come and chop.',
  'Oya, let us cook something sweet!',
  'Your table is waiting. Match am!',
  'Fresh jollof just came out of the pot!',
];

/** Jollof, suya, dodo, puff-puff and moi moi, in the order shown under the logo. */
const MENU_FOODS: Food[] = [0, 4, 1, 2, 5];

/** Compact text logo (used on the level map). */
export function Logo() {
  return (
    <div className="ffn-logo" role="img" aria-label="Food Frenzy Naija. Swipe, match, enjoy!">
      <svg className="ffn-logo-hat" viewBox="0 0 80 50" aria-hidden="true">
        <path d="M14 34c-10-2-12-18 0-20 2-10 16-14 24-6 8-8 24-4 26 6 12 2 10 18 0 20z" fill="#fff" stroke="#3d1705" strokeWidth="3" />
        <rect x="16" y="32" width="48" height="12" rx="3" fill="#fff" stroke="#3d1705" strokeWidth="3" />
        <path d="M28 34v10M40 34v10M52 34v10" stroke="#d8d0c0" strokeWidth="2" />
      </svg>
      <span className="ffn-logo-main" aria-hidden="true">Food Frenzy</span>
      <span className="ffn-logo-naija" aria-hidden="true">Naija</span>
      <span className="ffn-logo-tag" aria-hidden="true">
        Swipe · Match · Enjoy!
      </span>
    </div>
  );
}

/** The full main-menu logo: lettering on a wooden board with leaves and a chef's hat. */
function BrandLogo() {
  return (
    <h1 className="ffn-brand" aria-label="Food Frenzy Naija. Swipe, match, enjoy!">
      <LogoBoard />
      <span className="ffn-brand-main" aria-hidden="true">
        Food Frenzy
      </span>
      <span className="ffn-brand-naija" aria-hidden="true">
        Naija
      </span>
      <span className="ffn-brand-tag" aria-hidden="true">
        Swipe · Match · Enjoy!
      </span>
    </h1>
  );
}

function NavButton({ label, short, tone, icon, badge, onClick }: { label: string; short: string; tone: string; icon: ReactNode; badge?: ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      className={`ffn-home-navbtn is-${tone}`}
      onClick={() => {
        audio.play('click');
        onClick();
      }}
      aria-label={badge ? `${label} (new)` : label}
    >
      <span className="ffn-home-navicon">
        {icon}
        {badge ? <span className="ffn-badge">{badge}</span> : null}
      </span>
      <span className="ffn-home-navlabel" aria-hidden="true">
        <span className="is-long">{label}</span>
        <span className="is-short">{short}</span>
      </span>
    </button>
  );
}

export function MainMenu() {
  const save = useProfile((s) => s.save);
  const { go, open, exitToHost, player, dailyPrompted, setDailyPrompted } = useUi();
  const today = useToday();
  const daily = dailyRewardStatus(save, today);
  const next = highestUnlocked(save, LEVEL_COUNT);
  const allDone = completedCount(save) >= LEVEL_COUNT;
  const stars = totalStars(save);
  const achievements = unclaimedCount(save);
  const challengeDone = save.challenge.completed.includes(today);
  const greeting = useMemo(() => GREETINGS[Math.floor(Math.random() * GREETINGS.length)], []);
  const dayOfMonth = Number(today.slice(8, 10));

  // offer the daily reward once per session
  useEffect(() => {
    if (!daily.canClaim || dailyPrompted) return;
    const id = setTimeout(() => {
      setDailyPrompted();
      open('daily');
    }, 500);
    return () => clearTimeout(id);
  }, [daily.canClaim, dailyPrompted, open, setDailyPrompted]);

  return (
    <div className="ffn-screen ffn-home">
      <MenuScene />

      <header className="ffn-home-top">
        {exitToHost ? (
          <IconButton label="Back to LagosLife Games" variant="purple" className="ffn-home-round" onClick={exitToHost}>
            <BackIcon />
          </IconButton>
        ) : player ? (
          <IconButton label="Leaderboard" variant="purple" className="ffn-home-round" onClick={() => open('leaderboard')}>
            <PodiumIcon />
          </IconButton>
        ) : (
          <span className="ffn-home-round-spacer" />
        )}
        <CoinPill coins={save.coins} onAdd={() => go({ id: 'shop' })} />
        <IconButton label="Settings" variant="purple" className="ffn-home-round" onClick={() => open('settings')}>
          <GearIcon />
        </IconButton>
      </header>

      <main className="ffn-home-main">
        <BrandLogo />
        <div className="ffn-home-side">
          <div className="ffn-home-foods" aria-hidden="true">
            <Sparkle />
            {MENU_FOODS.map((f, i) => (
              <img key={f} src={foodImage(f)} alt="" draggable={false} style={{ animationDelay: `${0.35 + i * 0.08}s, ${1.2 + i * 0.3}s` }} />
            ))}
            <Sparkle flip />
          </div>
          <div className="ffn-home-playwrap">
            <Button variant="green" size="lg" icon={<PlayIcon />} className="ffn-play-btn ffn-home-play" onClick={() => go({ id: 'map', focus: next })}>
              Play
            </Button>
            <div className="ffn-home-progress">
              <span>{allDone ? 'All levels complete!' : `Level ${next}`}</span>
              <span className="ffn-home-dot" aria-hidden="true" />
              <span className="ffn-inline-star" aria-label={`${stars} of ${LEVEL_COUNT * 3} stars`}>
                <StarIcon /> {stars} / {LEVEL_COUNT * 3}
              </span>
            </div>
          </div>
        </div>
      </main>

      <footer className="ffn-home-bottom">
        <div className="ffn-home-mama">
          <Mama size={80} mood="wink" />
          <p className="ffn-home-bubble">{greeting}</p>
        </div>
        <nav className="ffn-home-nav" aria-label="Rewards and extras">
          <NavButton label="Daily Rewards" short="Rewards" tone="red" icon={<GiftArt />} badge={daily.canClaim ? '1' : null} onClick={() => open('daily')} />
          <NavButton label="Challenges" short="Challenge" tone="blue" icon={<CalendarArt day={dayOfMonth} />} badge={!challengeDone ? '1' : null} onClick={() => go({ id: 'challenge' })} />
          <NavButton label="Boosters" short="Boosters" tone="magenta" icon={<BagArt />} onClick={() => go({ id: 'shop' })} />
          <NavButton label="Achievements" short="Awards" tone="purple" icon={<TrophyArt />} badge={achievements > 0 ? achievements : null} onClick={() => go({ id: 'achievements' })} />
        </nav>
        <span className="ffn-home-bottom-spacer" aria-hidden="true" />
      </footer>
    </div>
  );
}
