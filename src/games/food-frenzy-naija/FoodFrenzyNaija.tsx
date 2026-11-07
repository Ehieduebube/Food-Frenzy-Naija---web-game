import '@fontsource/fredoka/400.css';
import '@fontsource/fredoka/600.css';
import '@fontsource/fredoka/700.css';
import './styles/game.css';

import { Component, useEffect, useMemo, type ErrorInfo, type ReactNode } from 'react';
import { CoinIcon, GiftIcon, TrophyIcon } from './art/icons';
import { audio } from './audio/audio';
import { dailyChallengeFor } from './levels/daily';
import { LEVEL_COUNT, getLevel } from './levels/levels';
import { bootProfile, shutdownProfile, useProfile } from './progress/profileStore';
import { highestUnlocked, totalBestScore } from './progress/saveSchema';
import { localProgressStorage, type ProgressStorage } from './progress/storage';
import type { GamePlatform } from './platform';
import { Button } from './ui/common/Button';
import { Modal } from './ui/common/Modal';
import { useReducedMotion } from './ui/hooks';
import { LeaderboardModal } from './ui/modals/LeaderboardModal';
import { DailyRewardModal, SettingsModal } from './ui/modals/Overlays';
import { AchievementsScreen } from './ui/screens/AchievementsScreen';
import { ChallengeScreen } from './ui/screens/ChallengeScreen';
import { GameScreen } from './ui/screens/GameScreen';
import { LevelMap } from './ui/screens/LevelMap';
import { MainMenu } from './ui/screens/MainMenu';
import { ShopScreen } from './ui/screens/ShopScreen';
import { useUi, type Screen } from './ui/uiStore';

export interface FoodFrenzyNaijaProps {
  /** Called when the player leaves the game (e.g. back to the LagosLife Games hub). */
  onExit?: () => void;
  /** Where progress is saved. Defaults to this browser's localStorage. */
  storage?: ProgressStorage;
  /** Host platform hooks (player, leaderboard, pause/resume). Without one the game runs on its own. */
  platform?: GamePlatform;
}

function Toasts() {
  const toasts = useUi((s) => s.toasts);
  // toasts never block the board: they are click-through and dismiss themselves
  return (
    <div className="ffn-toasts" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className="ffn-toast">
          <span className={`ffn-toast-icon is-${t.icon ?? 'info'}`}>
            {t.icon === 'trophy' ? <TrophyIcon /> : t.icon === 'gift' ? <GiftIcon /> : t.icon === 'coin' ? <CoinIcon /> : 'i'}
          </span>
          <span className="ffn-toast-text">
            <strong>{t.title}</strong>
            {t.body && <small>{t.body}</small>}
          </span>
        </div>
      ))}
    </div>
  );
}

function ScreenView({ screen }: { screen: Screen }) {
  const save = useProfile((s) => s.save);
  const challengeDate = screen.id === 'playChallenge' ? screen.dateKey : null;
  const challenge = useMemo(() => (challengeDate ? dailyChallengeFor(challengeDate) : undefined), [challengeDate]);
  switch (screen.id) {
    case 'menu':
      return <MainMenu />;
    case 'map':
      return <LevelMap focus={screen.focus} />;
    case 'play': {
      const level = getLevel(screen.levelId);
      // never start a locked or unknown level
      if (!level || screen.levelId > highestUnlocked(save, LEVEL_COUNT)) return <LevelMap />;
      return <GameScreen key={`level-${level.id}`} level={level} />;
    }
    case 'playChallenge':
      return challenge ? <GameScreen key={`challenge-${challenge.dateKey}`} level={challenge.level} challenge={challenge} /> : <ChallengeScreen />;
    case 'challenge':
      return <ChallengeScreen />;
    case 'shop':
      return <ShopScreen />;
    case 'achievements':
      return <AchievementsScreen />;
  }
}

class ErrorBoundary extends Component<{ children: ReactNode; onReset: () => void }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Food Frenzy Naija crashed', error, info.componentStack);
  }
  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="ffn-screen ffn-crash" role="alert">
        <h2>Wahala! Something went wrong.</h2>
        <p>Your saved progress is safe. Go back to the menu to keep playing.</p>
        <Button
          variant="green"
          onClick={() => {
            this.setState({ error: null });
            this.props.onReset();
          }}
        >
          Back to menu
        </Button>
      </div>
    );
  }
}

/** Food Frenzy Naija, ready to mount inside the LagosLife Games platform. */
export function FoodFrenzyNaija({ onExit, storage, platform }: FoodFrenzyNaijaProps) {
  const store = useMemo(() => storage ?? localProgressStorage(), [storage]);
  // load progress before the first render so no screen ever shows default data
  useMemo(() => bootProfile(store), [store]);
  useEffect(() => {
    bootProfile(store);
    return () => shutdownProfile();
  }, [store]);

  const screen = useUi((s) => s.screen);
  const overlay = useUi((s) => s.overlay);
  const go = useUi((s) => s.go);
  const setExit = useUi((s) => s.setExit);
  const player = useUi((s) => s.player);
  const hostPaused = useUi((s) => s.hostPaused);
  const leaderboardScore = useProfile((s) => totalBestScore(s.save));
  const settings = useProfile((s) => s.save.settings);
  const notice = useProfile((s) => s.notice);
  const dismissNotice = useProfile((s) => s.dismissNotice);
  const unlockedQueue = useProfile((s) => s.unlockedQueue);
  const reduced = useReducedMotion();

  useEffect(() => {
    setExit(onExit ?? null);
    return () => setExit(null);
  }, [onExit, setExit]);

  useEffect(() => {
    audio.configure({ sfx: settings.sfx, music: settings.music });
  }, [settings.sfx, settings.music]);

  // Connect to the host platform. The game is fully playable before and without it: if the
  // platform never answers, the leaderboard button simply doesn't appear.
  useEffect(() => {
    if (!platform) return;
    const ui = useUi.getState();
    let live = true;
    void platform.connect().then((p) => {
      if (live && p) ui.setPlatform(platform, p);
    });
    const offPause = platform.onPause(() => ui.setHostPaused(true));
    const offResume = platform.onResume(() => ui.setHostPaused(false));
    return () => {
      live = false;
      offPause();
      offResume();
      ui.setPlatform(null, null);
      ui.setHostPaused(false);
    };
  }, [platform]);

  // keep the leaderboard up to date: sent on connect, then whenever the total grows
  useEffect(() => {
    if (platform && player && leaderboardScore > 0) platform.submitScore(leaderboardScore);
  }, [platform, player, leaderboardScore]);

  // silence everything while the host has the game paused
  useEffect(() => {
    audio.setHidden(document.hidden || hostPaused);
  }, [hostPaused]);

  // pause audio when the tab is hidden; release it when the game unmounts
  useEffect(() => {
    const onVis = () => audio.setHidden(document.hidden || useUi.getState().hostPaused);
    document.addEventListener('visibilitychange', onVis);
    return () => {
      document.removeEventListener('visibilitychange', onVis);
      audio.configure({ sfx: false, music: false });
    };
  }, []);

  // announce newly unlocked achievements (several at once become one toast)
  useEffect(() => {
    if (unlockedQueue.length === 0) return;
    const items = [];
    for (let a = useProfile.getState().shiftUnlocked(); a; a = useProfile.getState().shiftUnlocked()) items.push(a);
    if (items.length === 0) return;
    const coins = items.reduce((sum, a) => sum + a.coins, 0);
    useUi.getState().toast(
      items.length === 1
        ? { title: `Award unlocked: ${items[0].title}`, body: `Claim ${coins} coins in Awards`, icon: 'trophy' }
        : { title: `${items.length} awards unlocked!`, body: `Claim ${coins} coins in Awards`, icon: 'trophy' },
    );
  }, [unlockedQueue]);

  return (
    <div className={`ffn ${reduced ? 'is-reduced' : ''}`} onPointerDownCapture={() => audio.unlock()} onKeyDownCapture={() => audio.unlock()}>
      <ErrorBoundary onReset={() => go({ id: 'menu' })}>
        <ScreenView screen={screen} />
        {overlay === 'settings' && <SettingsModal />}
        {overlay === 'daily' && <DailyRewardModal />}
        {overlay === 'leaderboard' && <LeaderboardModal />}
        {notice && (
          <Modal title="Heads up" onClose={dismissNotice}>
            <p className="ffn-modal-text">{notice}</p>
            <Button onClick={dismissNotice}>OK</Button>
          </Modal>
        )}
      </ErrorBoundary>
      <Toasts />
    </div>
  );
}
