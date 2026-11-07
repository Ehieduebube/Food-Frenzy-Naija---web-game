import { BackIcon, CoinIcon, LockIcon } from '../../art/icons';
import { BOOSTER_ART } from '../../art/obstacles';
import { audio } from '../../audio/audio';
import { LEVEL_COUNT } from '../../levels/levels';
import { useProfile } from '../../progress/profileStore';
import { BOOSTER_PRICES, BOOSTER_UNLOCK_LEVEL } from '../../progress/rewards';
import { highestUnlocked } from '../../progress/saveSchema';
import { CoinPill } from '../common/bits';
import { Button, IconButton } from '../common/Button';
import { BOOSTER_DESCRIPTIONS, BOOSTER_NAMES, BOOSTER_ORDER } from '../common/boosterInfo';
import { useUi } from '../uiStore';

export function ShopScreen() {
  const save = useProfile((s) => s.save);
  const buy = useProfile((s) => s.buyBooster);
  const { go, toast } = useUi();
  const unlocked = highestUnlocked(save, LEVEL_COUNT);
  return (
    <div className="ffn-screen ffn-page">
      <header className="ffn-topbar is-solid">
        <IconButton label="Back to menu" variant="purple" onClick={() => go({ id: 'menu' })}>
          <BackIcon />
        </IconButton>
        <h2 className="ffn-screen-title">Boosters</h2>
        <CoinPill coins={save.coins} />
      </header>
      <div className="ffn-page-body">
        <p className="ffn-page-intro">Boosters never cost a move. Earn coins by finishing levels, daily rewards, challenges and awards.</p>
        <ul className="ffn-card-list">
          {BOOSTER_ORDER.map((id) => {
            const locked = unlocked < BOOSTER_UNLOCK_LEVEL[id];
            const price = BOOSTER_PRICES[id];
            return (
              <li key={id} className={`ffn-card ${locked ? 'is-locked' : ''}`}>
                <img className="ffn-card-art" src={BOOSTER_ART[id]} alt="" />
                <div className="ffn-card-text">
                  <strong>{BOOSTER_NAMES[id]}</strong>
                  <span>{BOOSTER_DESCRIPTIONS[id]}</span>
                  <small>You have {save.boosters[id] ?? 0}</small>
                </div>
                {locked ? (
                  <span className="ffn-card-lock">
                    <LockIcon /> Level {BOOSTER_UNLOCK_LEVEL[id]}
                  </span>
                ) : (
                  <Button
                    variant="green"
                    size="sm"
                    icon={<CoinIcon />}
                    disabled={save.coins < price}
                    aria-label={`Buy ${BOOSTER_NAMES[id]} for ${price} coins`}
                    onClick={() => {
                      if (buy(id)) {
                        audio.play('coin');
                        toast({ title: `+1 ${BOOSTER_NAMES[id]}`, icon: 'coin' });
                      }
                    }}
                  >
                    {price}
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
