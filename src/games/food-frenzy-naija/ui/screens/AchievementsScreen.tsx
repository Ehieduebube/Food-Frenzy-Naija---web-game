import { SPECIAL_ART, foodImage } from '../../art/foods';
import { BackIcon, CheckIcon, CoinIcon, GiftIcon, MapIcon, StarIcon, TrophyIcon } from '../../art/icons';
import { BOOSTER_ART, crateArt } from '../../art/obstacles';
import { audio } from '../../audio/audio';
import { ACHIEVEMENTS, achievementProgress, type AchievementIcon } from '../../progress/achievements';
import { useProfile } from '../../progress/profileStore';
import { CoinPill, shortNumber } from '../common/bits';
import { Button, IconButton } from '../common/Button';
import { useUi } from '../uiStore';

function AchievementArt({ icon }: { icon: AchievementIcon }) {
  switch (icon) {
    case 'plate':
      return <img src={foodImage(0)} alt="" />;
    case 'rocket':
      return <img src={SPECIAL_ART.rocket} alt="" />;
    case 'blast':
      return <img src={SPECIAL_ART.blast} alt="" />;
    case 'fire':
      return <img src={SPECIAL_ART.fire} alt="" />;
    case 'crate':
      return <img src={crateArt(3)} alt="" />;
    case 'pot':
      return <img src={BOOSTER_ART.pot} alt="" />;
    case 'combo':
      return <img src={foodImage(2)} alt="" />;
    case 'star':
      return <StarIcon />;
    case 'gift':
      return <GiftIcon />;
    case 'map':
      return <MapIcon />;
    case 'trophy':
      return <TrophyIcon />;
  }
}

export function AchievementsScreen() {
  const save = useProfile((s) => s.save);
  const claim = useProfile((s) => s.claimAchievement);
  const { go, toast } = useUi();
  const sorted = [...ACHIEVEMENTS].sort((a, b) => {
    const rank = (id: string) => {
      const e = save.achievements[id];
      return e && !e.claimed ? 0 : e ? 2 : 1;
    };
    return rank(a.id) - rank(b.id);
  });
  return (
    <div className="ffn-screen ffn-page">
      <header className="ffn-topbar is-solid">
        <IconButton label="Back to menu" variant="purple" onClick={() => go({ id: 'menu' })}>
          <BackIcon />
        </IconButton>
        <h2 className="ffn-screen-title">Awards</h2>
        <CoinPill coins={save.coins} />
      </header>
      <div className="ffn-page-body">
        <ul className="ffn-card-list">
          {sorted.map((a) => {
            const entry = save.achievements[a.id];
            const { value, done } = achievementProgress(a, save);
            return (
              <li key={a.id} className={`ffn-card ffn-award ${entry?.claimed ? 'is-claimed' : done ? 'is-ready' : ''}`}>
                <span className={`ffn-award-icon is-${a.icon}`}>
                  <AchievementArt icon={a.icon} />
                </span>
                <div className="ffn-card-text">
                  <strong>{a.title}</strong>
                  <span>{a.description}</span>
                  {!done && (
                    <span className="ffn-progress" role="progressbar" aria-valuemin={0} aria-valuemax={a.target} aria-valuenow={value}>
                      <span style={{ width: `${(value / a.target) * 100}%` }} />
                      <em>
                        {shortNumber(value)} / {shortNumber(a.target)}
                      </em>
                    </span>
                  )}
                </div>
                {entry?.claimed ? (
                  <span className="ffn-card-done" aria-label="Claimed">
                    <CheckIcon />
                  </span>
                ) : entry ? (
                  <Button
                    variant="orange"
                    size="sm"
                    icon={<CoinIcon />}
                    onClick={() => {
                      const coins = claim(a.id);
                      if (coins) {
                        audio.play('coin');
                        toast({ title: `+${coins} coins`, body: a.title, icon: 'coin' });
                      }
                    }}
                  >
                    {a.coins}
                  </Button>
                ) : (
                  <span className="ffn-card-reward">
                    <CoinIcon /> {a.coins}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
