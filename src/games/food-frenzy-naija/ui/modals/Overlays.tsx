import { useState } from 'react';
import { CheckIcon, CoinIcon, GiftIcon, MusicIcon, SoundIcon } from '../../art/icons';
import { BOOSTER_ART } from '../../art/obstacles';
import { audio } from '../../audio/audio';
import type { BoosterId } from '../../engine/game';
import { useProfile } from '../../progress/profileStore';
import { DAILY_REWARDS, dailyRewardStatus } from '../../progress/rewards';
import type { ReducedMotionPref } from '../../progress/saveSchema';
import { Button } from '../common/Button';
import { ConfirmDialog, Modal } from '../common/Modal';
import { Segmented, Toggle } from '../common/Toggle';
import { useCountdownToTomorrow, useToday } from '../hooks';
import { useUi } from '../uiStore';

export function SettingsModal() {
  const settings = useProfile((s) => s.save.settings);
  const setSettings = useProfile((s) => s.setSettings);
  const reset = useProfile((s) => s.resetProgress);
  const boughtCoins = useProfile((s) => s.save.purchases.length > 0);
  const { close, toast } = useUi();
  const [confirmReset, setConfirmReset] = useState(false);
  if (confirmReset) {
    return (
      <ConfirmDialog
        title="Reset progress?"
        message={`This deletes your levels, stars, coins, boosters and awards on this device${
          boughtCoins ? ', including coins you bought' : ''
        }. Your settings are kept.`}
        confirmLabel="Reset"
        danger
        onCancel={() => setConfirmReset(false)}
        onConfirm={() => {
          reset();
          setConfirmReset(false);
          close();
          toast({ title: 'Progress reset', icon: 'info' });
        }}
      />
    );
  }
  return (
    <Modal title="Settings" onClose={close} className="ffn-settings">
      <div className="ffn-settings-list">
        <Toggle label="Sound effects" icon={<SoundIcon muted={!settings.sfx} />} checked={settings.sfx} onChange={(v) => setSettings({ sfx: v })} />
        <Toggle label="Music" icon={<MusicIcon muted={!settings.music} />} checked={settings.music} onChange={(v) => setSettings({ music: v })} />
        <Toggle label="Vibration" checked={settings.haptics} onChange={(v) => setSettings({ haptics: v })} />
        <Segmented<ReducedMotionPref>
          label="Reduce motion"
          value={settings.reducedMotion}
          options={[
            { value: 'system', label: 'Auto' },
            { value: 'on', label: 'On' },
            { value: 'off', label: 'Off' },
          ]}
          onChange={(v) => setSettings({ reducedMotion: v })}
        />
      </div>
      <p className="ffn-muted ffn-small">Progress is saved on this device. All artwork, music and sounds are original to Food Frenzy Naija.</p>
      <div className="ffn-modal-actions">
        <Button variant="red" size="sm" onClick={() => setConfirmReset(true)}>
          Reset progress
        </Button>
        <Button variant="green" onClick={close}>
          Done
        </Button>
      </div>
    </Modal>
  );
}

function RewardIcon({ index }: { index: number }) {
  const r = DAILY_REWARDS[index];
  const booster = Object.keys(r.boosters)[0] as BoosterId | undefined;
  return (
    <span className="ffn-day-art">
      {booster ? <img src={BOOSTER_ART[booster]} alt="" /> : <CoinIcon />}
      {booster && r.coins > 0 && <CoinIcon className="ffn-day-coin" />}
    </span>
  );
}

function rewardText(index: number): string {
  const r = DAILY_REWARDS[index];
  const parts: string[] = [];
  if (r.coins) parts.push(`${r.coins}`);
  for (const [id, n] of Object.entries(r.boosters)) if (n) parts.push(`${n} ${{ ladle: 'Ladle', shuffle: 'Shuffle', pot: 'Pot', moves: '+5 Moves' }[id as BoosterId]}`);
  return parts.join(' + ');
}

export function DailyRewardModal() {
  const save = useProfile((s) => s.save);
  const claimDaily = useProfile((s) => s.claimDaily);
  const { close, toast } = useUi();
  const today = useToday();
  const countdown = useCountdownToTomorrow();
  const { canClaim, dayIndex } = dailyRewardStatus(save, today);
  // the day just claimed is shown as the highlighted one after claiming
  const shownDay = canClaim ? dayIndex : (dayIndex + 6) % 7;
  return (
    <Modal title="Daily Reward" tone="red" onClose={close} className="ffn-daily" wide>
      <p className="ffn-modal-text">{canClaim ? 'Come and collect today’s goodies!' : `Come back tomorrow for more goodies (${countdown}).`}</p>
      <ol className="ffn-days">
        {DAILY_REWARDS.map((_, i) => {
          const claimed = canClaim ? i < dayIndex : i <= shownDay;
          const current = i === shownDay;
          return (
            <li key={i} className={`ffn-day ${claimed ? 'is-claimed' : ''} ${current ? 'is-today' : ''} ${i === 6 ? 'is-big' : ''}`}>
              <span className="ffn-day-label">Day {i + 1}</span>
              <RewardIcon index={i} />
              <span className="ffn-day-text">{rewardText(i)}</span>
              {claimed && (
                <span className="ffn-day-check" aria-label="claimed">
                  <CheckIcon />
                </span>
              )}
            </li>
          );
        })}
      </ol>
      <Button
        variant="green"
        size="lg"
        icon={<GiftIcon />}
        disabled={!canClaim}
        onClick={() => {
          const r = claimDaily(today);
          if (r) {
            audio.play('coin');
            toast({ title: 'Daily reward collected!', body: rewardText(dayIndex), icon: 'gift' });
          }
        }}
      >
        {canClaim ? 'Claim' : 'Claimed today'}
      </Button>
      <p className="ffn-muted ffn-small">Missed a day? No wahala, your streak simply continues.</p>
    </Modal>
  );
}
