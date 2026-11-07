import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react';
import { useStore } from 'zustand';
import { PauseIcon, SoundIcon } from '../../art/icons';
import { LagosSkyline } from '../../art/Scenery';
import { audio } from '../../audio/audio';
import { randomSeed } from '../../engine/rng';
import type { DailyChallenge } from '../../levels/daily';
import { LEVEL_COUNT, getLevel, starsForScore } from '../../levels/levels';
import type { LevelConfig, TutorialId } from '../../levels/types';
import { useProfile } from '../../progress/profileStore';
import type { RewardSummary } from '../../progress/rewards';
import { highestUnlocked } from '../../progress/saveSchema';
import { GameController } from '../../session/controller';
import { Board } from '../board/Board';
import { IconButton } from '../common/Button';
import { ConfirmDialog } from '../common/Modal';
import { BoosterBar } from '../hud/BoosterBar';
import { Hud } from '../hud/Hud';
import { reducedMotionNow, useReducedMotion } from '../hooks';
import { PauseMenu } from '../modals/PauseMenu';
import { FailModal, PLAY_ON_COST, WinModal, failTip } from '../modals/ResultModals';
import { TutorialModal } from '../modals/TutorialModal';
import { useUi } from '../uiStore';

/**
 * Largest whole-pixel board that fits the play area next to (landscape) or above (portrait)
 * the booster bar. Recomputed on every resize and orientation change.
 */
function useBoardSize(play: RefObject<HTMLDivElement | null>, bar: RefObject<HTMLDivElement | null>, rows: number, cols: number) {
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  useLayoutEffect(() => {
    const el = play.current;
    if (!el) return;
    const FRAME = 20; // room for the board's wooden frame
    const measure = () => {
      const area = el.getBoundingClientRect();
      const b = bar.current?.getBoundingClientRect();
      const style = getComputedStyle(el);
      const row = style.flexDirection === 'row';
      const gap = parseFloat(row ? style.columnGap : style.rowGap) || 0;
      const w = area.width - FRAME - (row && b ? b.width + gap : 0);
      const h = area.height - FRAME - (!row && b ? b.height + gap : 0);
      const tile = Math.max(20, Math.floor(Math.min(w / cols, h / rows)));
      setSize((prev) => (prev && prev.w === tile * cols && prev.h === tile * rows ? prev : { w: tile * cols, h: tile * rows }));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    if (bar.current) ro.observe(bar.current);
    return () => ro.disconnect();
  }, [play, bar, rows, cols]);
  return size;
}

/** Runs a level (or the daily challenge). A new controller is made for every attempt. */
export function GameScreen({ level, challenge }: { level: LevelConfig; challenge?: DailyChallenge }) {
  const [attempt, setAttempt] = useState(0);
  const [controller, setController] = useState<GameController | null>(null);

  useEffect(() => {
    const c = new GameController({
      level,
      seed: challenge ? challenge.seed : randomSeed(),
      reducedMotion: reducedMotionNow,
      haptics: () => useProfile.getState().save.settings.haptics,
      hasBooster: (id) => (useProfile.getState().save.boosters[id] ?? 0) > 0,
      consumeBooster: (id) => {
        useProfile.getState().useBooster(id);
      },
    });
    if (level.id <= 2) c.hintDelay = 4500;
    // development-only handle for automated browser tests (removed from production builds)
    if (import.meta.env.DEV) (window as unknown as { __ffnController?: GameController }).__ffnController = c;
    setController(c);
    return () => c.dispose();
  }, [level, challenge, attempt]);

  if (!controller) return <div className="ffn-screen ffn-game" />;
  return <GameView key={attempt} controller={controller} level={level} challenge={challenge} onRestart={() => setAttempt((a) => a + 1)} firstAttempt={attempt === 0} />;
}

interface WinResult {
  score: number;
  stars: 1 | 2 | 3;
  reward: RewardSummary | null;
  newBest: boolean;
}

function GameView({
  controller,
  level,
  challenge,
  onRestart,
  firstAttempt,
}: {
  controller: GameController;
  level: LevelConfig;
  challenge?: DailyChallenge;
  onRestart: () => void;
  firstAttempt: boolean;
}) {
  const reduced = useReducedMotion();
  const go = useUi((s) => s.go);
  const hostPaused = useUi((s) => s.hostPaused);
  const save = useProfile((s) => s.save);
  const profile = useProfile.getState;
  const outcome = useStore(controller.store, (s) => s.outcome);
  const finalScore = useStore(controller.store, (s) => s.finalScore);
  const goals = useStore(controller.store, (s) => s.hud.goals);

  const [tutorial, setTutorial] = useState<TutorialId[] | null>(() => {
    if (!firstAttempt || !level.tutorials) return null;
    const unseen = level.tutorials.filter((t) => !profile().save.tutorialsSeen.includes(t));
    return unseen.length > 0 ? unseen : null;
  });
  const [paused, setPaused] = useState(false);
  const [confirm, setConfirm] = useState<null | 'restart' | 'exit'>(null);
  const [win, setWin] = useState<WinResult | null>(null);
  const recorded = useRef(false);
  const unlocked = highestUnlocked(save, LEVEL_COUNT);
  const playRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const boardSize = useBoardSize(playRef, barRef, controller.session.engine.board.rows, controller.session.engine.board.cols);

  // tutorials and pausing both stop hints and input
  useEffect(() => {
    controller.setPaused(paused || tutorial !== null || confirm !== null || hostPaused);
  }, [controller, paused, tutorial, confirm, hostPaused]);

  // the host paused the game (app in the background, a sheet over it): show the pause menu so the
  // player comes back to a calm board and resumes when ready
  useEffect(() => {
    if (hostPaused && !outcome && !tutorial && !confirm) setPaused(true);
  }, [hostPaused, outcome, tutorial, confirm]);

  useEffect(() => {
    if (!tutorial) controller.scheduleHint(level.id === 1 ? 1200 : controller.hintDelay);
  }, [controller, tutorial, level.id]);

  // the result screen replaces the pause menu if the level ends behind it
  useEffect(() => {
    if (outcome) setPaused(false);
  }, [outcome]);

  // Escape or P pauses (when nothing else is open; open dialogs handle Escape themselves)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' && e.key !== 'p' && e.key !== 'P') return;
      if (paused || tutorial || confirm || outcome || controller.store.getState().boosterMode) return;
      if (document.querySelector('.ffn-modal')) return;
      setPaused(true);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [controller, paused, tutorial, confirm, outcome]);

  // record a win exactly once
  useEffect(() => {
    if (outcome !== 'won' || recorded.current) return;
    recorded.current = true;
    const stars = starsForScore(level, finalScore);
    const input = { won: true, score: finalScore, stars, totals: controller.session.totals };
    if (challenge) {
      const reward = profile().recordChallengeResult(challenge, input);
      setWin({ score: finalScore, stars, reward, newBest: false });
    } else {
      const res = profile().recordLevelResult(level.id, input);
      setWin({ score: finalScore, stars, reward: res && (res.coins > 0 || Object.keys(res.boosters).length > 0) ? res : null, newBest: !!res?.newBest && !res.firstClear });
    }
  }, [outcome, finalScore, level, challenge, controller, profile]);

  /** Count an unfinished attempt (failed or abandoned) in the stats. */
  const recordLoss = () => {
    if (recorded.current || controller.session.movesUsed === 0) return;
    recorded.current = true;
    const input = { won: false, score: controller.session.score, stars: 0 as const, totals: controller.session.totals };
    if (challenge) profile().recordChallengeResult(challenge, input);
    else profile().recordLevelResult(level.id, input);
  };

  const exit = () => {
    recordLoss();
    if (challenge) go({ id: 'challenge' });
    else go({ id: 'map', focus: level.id });
  };
  const restart = () => {
    recordLoss();
    onRestart();
  };

  const sfx = save.settings.sfx || save.settings.music;
  const toggleSound = () => {
    profile().setSettings({ sfx: !sfx, music: !sfx });
  };

  const next = !challenge && level.id < LEVEL_COUNT ? getLevel(level.id + 1) : undefined;

  return (
    <div className="ffn-screen ffn-game">
      <div className="ffn-game-bg" aria-hidden="true">
        <LagosSkyline className="ffn-skyline" />
      </div>
      <header className="ffn-game-top">
        <IconButton label="Pause" variant="purple" onClick={() => setPaused(true)}>
          <PauseIcon />
        </IconButton>
        <div className="ffn-game-title">
          <small>{challenge ? 'Daily Challenge' : `Level ${level.id}`}</small>
          <span>{level.name}</span>
        </div>
        <IconButton label={sfx ? 'Mute sound' : 'Turn sound on'} variant="purple" onClick={toggleSound} aria-pressed={!sfx}>
          <SoundIcon muted={!sfx} />
        </IconButton>
      </header>
      <Hud controller={controller} level={level} />
      <div className="ffn-play" ref={playRef}>
        <Board controller={controller} reducedMotion={reduced} size={boardSize} />
        <BoosterBar controller={controller} unlockedLevel={challenge ? LEVEL_COUNT : unlocked} barRef={barRef} />
      </div>

      {tutorial && (
        <TutorialModal
          ids={tutorial}
          onDone={() => {
            profile().markTutorialsSeen(tutorial);
            setTutorial(null);
          }}
        />
      )}
      {paused && !confirm && (
        <PauseMenu
          onResume={() => setPaused(false)}
          onRestart={() => (controller.session.movesUsed > 0 ? setConfirm('restart') : (setPaused(false), restart()))}
          onExit={() => (controller.session.movesUsed > 0 ? setConfirm('exit') : exit())}
          exitLabel={challenge ? 'Exit challenge' : 'Exit to map'}
        />
      )}
      {confirm && (
        <ConfirmDialog
          title={confirm === 'restart' ? 'Restart level?' : 'Leave level?'}
          message="Your progress in this level will be lost."
          confirmLabel={confirm === 'restart' ? 'Restart' : 'Leave'}
          danger
          onCancel={() => setConfirm(null)}
          onConfirm={() => {
            const what = confirm;
            setConfirm(null);
            setPaused(false);
            if (what === 'restart') restart();
            else exit();
          }}
        />
      )}
      {outcome === 'won' && win && (
        <WinModal
          title={challenge ? 'Challenge Complete!' : 'Level Complete!'}
          score={win.score}
          stars={win.stars}
          newBest={win.newBest}
          reward={win.reward}
          reducedMotion={reduced}
          onNext={next ? () => go({ id: 'play', levelId: next.id }) : undefined}
          onReplay={onRestart}
          onMap={() => (challenge ? go({ id: 'challenge' }) : go({ id: 'map', focus: level.id + (next ? 1 : 0) }))}
        />
      )}
      {outcome === 'lost' && !paused && (
        <FailModal
          goals={goals}
          level={level}
          extraMovesOwned={challenge || unlocked >= 9 ? save.boosters.moves : 0}
          coins={save.coins}
          tip={failTip(goals, challenge ? LEVEL_COUNT : unlocked)}
          onUseBooster={() => void controller.useBooster('moves', null)}
          onBuyMoves={() => {
            if (profile().spendCoins(PLAY_ON_COST)) {
              audio.play('coin');
              controller.grantExtraMoves();
            }
          }}
          onRetry={restart}
          onMap={exit}
        />
      )}
    </div>
  );
}
