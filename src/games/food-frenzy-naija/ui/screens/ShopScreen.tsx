import { useState } from 'react';
import { BackIcon, CoinIcon, LockIcon } from '../../art/icons';
import { BOOSTER_ART } from '../../art/obstacles';
import { audio } from '../../audio/audio';
import { LEVEL_COUNT } from '../../levels/levels';
import type { BuyResult } from '../../platform';
import { COIN_PACKS, type CoinPack } from '../../progress/coinPacks';
import { useProfile } from '../../progress/profileStore';
import { BOOSTER_PRICES, BOOSTER_UNLOCK_LEVEL } from '../../progress/rewards';
import { highestUnlocked } from '../../progress/saveSchema';
import { CoinPill } from '../common/bits';
import { Button, IconButton } from '../common/Button';
import { BOOSTER_DESCRIPTIONS, BOOSTER_NAMES, BOOSTER_ORDER } from '../common/boosterInfo';
import { useUi, type Toast } from '../uiStore';

const fmt = (n: number) => n.toLocaleString('en-US');

/** What to tell the player after a purchase attempt. A granted purchase shows its own "+coins" toast. */
function buyMessage(result: BuyResult): Omit<Toast, 'id'> | null {
  switch (result.status) {
    case 'granted':
    case 'cancelled':
      return null;
    case 'pending':
      return { title: 'Payment received', body: 'We are confirming it with LagosLife. Your coins will be added as soon as that is done.', icon: 'info' };
    case 'failed':
      switch (result.reason) {
        case 'payment_failed':
          return { title: "Payment didn't go through", body: 'Please try again.', icon: 'info' };
        case 'not_for_sale':
          return { title: "This pack isn't on sale right now", icon: 'info' };
        case 'owned':
          return { title: 'You already have this', icon: 'info' };
        case 'signed_out':
          return { title: 'Sign in to LagosLife to buy coins', icon: 'info' };
        case 'busy':
          return { title: 'Finish the payment that is already open first', icon: 'info' };
        case 'rate_limited':
          return { title: 'Please wait a few seconds and try again', icon: 'info' };
        case 'off':
          return { title: 'Purchases are turned off right now', icon: 'info' };
        case 'unavailable':
          return { title: 'Coins can only be bought inside LagosLife Games', icon: 'info' };
        case 'not_verified':
          return { title: "We couldn't confirm that purchase", body: 'Nothing was added. If you were charged, contact LagosLife support.', icon: 'info' };
        case 'error':
          return { title: 'Something went wrong', body: 'Please try again.', icon: 'info' };
      }
  }
}

/** Coin packs, paid on LagosLife's own pay sheet. Only shown while connected to LagosLife Games. */
function CoinPacks() {
  const platform = useUi((s) => s.platform);
  const player = useUi((s) => s.player);
  const toast = useUi((s) => s.toast);
  const [buying, setBuying] = useState<string | null>(null);
  if (!platform || !player) return null;

  const buy = async (pack: CoinPack) => {
    setBuying(pack.productId);
    try {
      const message = buyMessage(await platform.buy(pack.productId));
      if (message) toast(message);
    } finally {
      setBuying(null);
    }
  };

  return (
    <section className="ffn-shop-section" aria-labelledby="ffn-coin-packs">
      <h3 className="ffn-shop-heading" id="ffn-coin-packs">
        Coin packs
      </h3>
      {player.mode === 'test' && <p className="ffn-lb-test">Test mode: no real money</p>}
      <p className="ffn-page-intro ffn-shop-note">Paid securely through LagosLife. You see the price before you pay.</p>
      <ul className="ffn-card-list">
        {COIN_PACKS.map((pack) => (
          <li key={pack.productId} className="ffn-card ffn-coin-pack">
            <CoinIcon className="ffn-card-art" />
            <div className="ffn-card-text">
              <strong>{fmt(pack.coins)} coins</strong>
              <span>Spend them on boosters and extra moves.</span>
            </div>
            <Button
              variant="orange"
              size="sm"
              disabled={buying !== null}
              aria-label={`Buy ${fmt(pack.coins)} coins`}
              onClick={() => void buy(pack)}
            >
              {buying === pack.productId ? 'Wait…' : 'Buy'}
            </Button>
          </li>
        ))}
      </ul>
    </section>
  );
}

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
        <CoinPacks />
      </div>
    </div>
  );
}
