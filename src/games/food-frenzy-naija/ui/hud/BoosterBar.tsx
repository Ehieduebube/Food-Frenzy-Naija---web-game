import { useState, type Ref } from 'react';
import { useStore } from 'zustand';
import { CoinIcon, LockIcon, PlusIcon } from '../../art/icons';
import { BOOSTER_ART } from '../../art/obstacles';
import { audio } from '../../audio/audio';
import type { BoosterId } from '../../engine/game';
import { useProfile } from '../../progress/profileStore';
import { BOOSTER_PRICES, BOOSTER_UNLOCK_LEVEL } from '../../progress/rewards';
import type { GameController } from '../../session/controller';
import { Button } from '../common/Button';
import { BOOSTER_DESCRIPTIONS, BOOSTER_NAMES, BOOSTER_ORDER, TARGETED } from '../common/boosterInfo';
import { Modal } from '../common/Modal';
import { useUi } from '../uiStore';

/** In-game booster controls. Locked boosters show when they unlock; empty ones offer a coin purchase. */
export function BoosterBar({ controller, unlockedLevel, barRef }: { controller: GameController; unlockedLevel: number; barRef?: Ref<HTMLDivElement> }) {
  const boosters = useProfile((s) => s.save.boosters);
  const coins = useProfile((s) => s.save.coins);
  const buyBooster = useProfile((s) => s.buyBooster);
  const mode = useStore(controller.store, (s) => s.boosterMode);
  const busy = useStore(controller.store, (s) => s.busy);
  const outcome = useStore(controller.store, (s) => s.outcome);
  const toast = useUi((s) => s.toast);
  const [buying, setBuying] = useState<BoosterId | null>(null);

  const press = (id: BoosterId) => {
    audio.play('click');
    if (unlockedLevel < BOOSTER_UNLOCK_LEVEL[id]) {
      toast({ title: `${BOOSTER_NAMES[id]} unlocks at level ${BOOSTER_UNLOCK_LEVEL[id]}`, icon: 'info' });
      return;
    }
    if (busy || outcome) return;
    if (mode === id) {
      controller.setBoosterMode(null);
      return;
    }
    if ((boosters[id] ?? 0) <= 0) {
      setBuying(id);
      return;
    }
    if (TARGETED.has(id)) controller.setBoosterMode(id);
    else void controller.useBooster(id, null);
  };

  return (
    <>
      <div className="ffn-boosters" role="toolbar" aria-label="Boosters" ref={barRef}>
        {BOOSTER_ORDER.map((id) => {
          const locked = unlockedLevel < BOOSTER_UNLOCK_LEVEL[id];
          const count = boosters[id] ?? 0;
          return (
            <button
              key={id}
              type="button"
              className={`ffn-booster ${mode === id ? 'is-active' : ''} ${locked ? 'is-locked' : ''}`}
              onClick={() => press(id)}
              aria-pressed={mode === id}
              aria-label={`${BOOSTER_NAMES[id]}${locked ? `, unlocks at level ${BOOSTER_UNLOCK_LEVEL[id]}` : `, ${count} left`}`}
              title={`${BOOSTER_NAMES[id]}: ${BOOSTER_DESCRIPTIONS[id]}`}
            >
              <img src={BOOSTER_ART[id]} alt="" draggable={false} />
              {locked ? (
                <span className="ffn-booster-lock">
                  <LockIcon />
                  <small>Lv {BOOSTER_UNLOCK_LEVEL[id]}</small>
                </span>
              ) : count > 0 ? (
                <span className="ffn-booster-count">{count}</span>
              ) : (
                <span className="ffn-booster-count is-buy">
                  <PlusIcon />
                </span>
              )}
            </button>
          );
        })}
      </div>
      {mode && (
        <div className="ffn-target-tip" role="status">
          <img src={BOOSTER_ART[mode]} alt="" />
          <span>Tap the board to use {BOOSTER_NAMES[mode]}</span>
          <button type="button" className="ffn-link-btn" onClick={() => controller.setBoosterMode(null)}>
            Cancel
          </button>
        </div>
      )}
      {buying && (
        <Modal title={BOOSTER_NAMES[buying]} onClose={() => setBuying(null)} tone="orange">
          <div className="ffn-buy">
            <img src={BOOSTER_ART[buying]} alt="" className="ffn-buy-art" />
            <p className="ffn-modal-text">{BOOSTER_DESCRIPTIONS[buying]}</p>
            <p className="ffn-modal-text ffn-muted">
              You have <CoinIcon /> {coins.toLocaleString('en-US')}
            </p>
            <Button
              variant="green"
              size="lg"
              icon={<CoinIcon />}
              disabled={coins < BOOSTER_PRICES[buying]}
              onClick={() => {
                if (buyBooster(buying)) {
                  audio.play('coin');
                  toast({ title: `Bought ${BOOSTER_NAMES[buying]}`, icon: 'coin' });
                  const id = buying;
                  setBuying(null);
                  if (TARGETED.has(id)) controller.setBoosterMode(id);
                  else void controller.useBooster(id, null);
                }
              }}
            >
              {coins < BOOSTER_PRICES[buying] ? `Need ${BOOSTER_PRICES[buying]}` : `Buy & use · ${BOOSTER_PRICES[buying]}`}
            </Button>
          </div>
        </Modal>
      )}
    </>
  );
}
