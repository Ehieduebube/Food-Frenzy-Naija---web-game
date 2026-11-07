import { useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { BackIcon, GearIcon, GiftIcon, LockIcon, StarIcon, TrophyIcon } from '../../art/icons';
import { Mama } from '../../art/Mama';
import { LEVELS, LEVEL_COUNT, getLevel } from '../../levels/levels';
import { unclaimedCount } from '../../progress/achievements';
import { useProfile } from '../../progress/profileStore';
import { dailyRewardStatus } from '../../progress/rewards';
import { highestUnlocked, totalStars } from '../../progress/saveSchema';
import { audio } from '../../audio/audio';
import { CoinPill } from '../common/bits';
import { useToday } from '../hooks';
import { MapScenery } from '../map/MapScenery';
import { TRACK_MAX, computeLayout, groundStyle, pathThrough } from '../map/mapLayout';
import { LevelIntro } from '../modals/LevelIntro';
import { useUi } from '../uiStore';
import { Logo } from './MainMenu';

function MapAction({ label, icon, badge, onClick, tone = 'blue' }: { label: string; icon: ReactNode; badge?: ReactNode; onClick: () => void; tone?: 'blue' | 'gift' }) {
  return (
    <button
      type="button"
      className={`ffn-map-action is-${tone}`}
      onClick={() => {
        audio.play('click');
        onClick();
      }}
      aria-label={label}
    >
      <span className="ffn-map-action-icon">
        {icon}
        {badge ? <span className="ffn-badge">{badge}</span> : null}
      </span>
      <span className="ffn-map-action-label">{label}</span>
    </button>
  );
}

export function LevelMap({ focus }: { focus?: number }) {
  const save = useProfile((s) => s.save);
  const { go, open } = useUi();
  const today = useToday();
  const unlocked = highestUnlocked(save, LEVEL_COUNT);
  const [picked, setPicked] = useState<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const worldRef = useRef<HTMLDivElement>(null);
  const [worldW, setWorldW] = useState(() => (typeof window === 'undefined' ? 390 : window.innerWidth));
  const layout = useMemo(computeLayout, []);
  const { total, nodes, bands } = layout;
  const path = useMemo(() => pathThrough(layout.road), [layout]);
  const target = Math.min(focus ?? unlocked, unlocked);
  const dailyReady = dailyRewardStatus(save, today).canClaim;
  const awards = unclaimedCount(save);

  useLayoutEffect(() => {
    const el = scrollRef.current;
    const node = nodes.find((n) => n.id === target);
    if (el && node) el.scrollTop = Math.max(0, node.y - el.clientHeight * 0.58);
  }, [nodes, target]);

  // scenery is placed in pixels around the road, so follow the map's real width (resize, rotation)
  useLayoutEffect(() => {
    const el = worldRef.current;
    if (!el) return;
    const measure = () => setWorldW((prev) => (Math.abs(prev - el.clientWidth) > 1 ? el.clientWidth : prev));
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const pickedLevel = picked !== null ? getLevel(picked) : undefined;

  return (
    <div className="ffn-screen ffn-map">
      <div className="ffn-map-scroll" ref={scrollRef}>
        <div className="ffn-map-world" style={{ height: total }} ref={worldRef}>
          {bands.map(({ region, top, height }) => (
            <section key={region.id} className="ffn-region" style={{ top, height, ...groundStyle(region.id) }} aria-label={region.name} />
          ))}
          <div className="ffn-map-track">
            <MapScenery layout={layout} trackW={Math.min(worldW, TRACK_MAX)} worldW={worldW} />
            <svg className="ffn-map-path" viewBox={`0 0 100 ${total}`} preserveAspectRatio="none" aria-hidden="true">
              <path d={path} className="ffn-road-edge" />
              <path d={path} className="ffn-road" />
              <path d={path} className="ffn-road-light" />
              <path d={path} className="ffn-road-dash" />
            </svg>
            {bands.map(({ region, top, height, signY }) => {
              const locked = region.firstLevel > unlocked;
              const regionStars = LEVELS.filter((l) => l.region === region.id).reduce((s, l) => s + (save.levels[String(l.id)]?.stars ?? 0), 0);
              return (
                <div key={region.id}>
                  {locked && <div className="ffn-region-shade" style={{ top, height }} aria-hidden="true" />}
                  <div className={`ffn-region-sign ${locked ? 'is-locked' : ''}`} style={{ top: signY }}>
                    <strong>{region.name}</strong>
                    <small>
                      {locked ? (
                        <>
                          <LockIcon /> Reach level {region.firstLevel}
                        </>
                      ) : (
                        <>
                          <StarIcon /> {regionStars}/{(region.lastLevel - region.firstLevel + 1) * 3}
                        </>
                      )}
                    </small>
                  </div>
                </div>
              );
            })}
            <ol className="ffn-map-nodes">
              {nodes.map((n) => {
                const rec = save.levels[String(n.id)];
                const locked = n.id > unlocked;
                const current = n.id === unlocked && !rec?.completed;
                const state = locked ? 'locked' : rec?.completed ? 'done' : 'open';
                return (
                  <li key={n.id} className={`ffn-node-wrap ${current ? 'is-current' : ''}`} style={{ left: `${n.x}%`, top: n.y }}>
                    {current && (
                      <div className="ffn-node-marker" aria-hidden="true">
                        <Mama size={46} />
                      </div>
                    )}
                    {rec?.completed && (
                      <span className="ffn-node-stars" aria-hidden="true">
                        {[0, 1, 2].map((i) => (
                          <StarIcon key={i} filled={i < rec.stars} className={`is-${i}`} />
                        ))}
                      </span>
                    )}
                    <button
                      type="button"
                      data-level={n.id}
                      className={`ffn-node is-${state} ${current ? 'is-current' : ''}`}
                      disabled={locked}
                      onClick={() => {
                        audio.play('click');
                        setPicked(n.id);
                      }}
                      aria-label={`Level ${n.id}${locked ? ', locked' : rec?.completed ? `, ${rec.stars} stars` : current ? ', next level' : ''}`}
                    >
                      {locked ? <LockIcon /> : <span>{n.id}</span>}
                    </button>
                  </li>
                );
              })}
            </ol>
          </div>
        </div>
      </div>

      <header className="ffn-map-hud">
        <div className="ffn-map-hud-left">
          <CoinPill coins={save.coins} onAdd={() => go({ id: 'shop' })} />
          <span className="ffn-pill ffn-star-pill" aria-label={`${totalStars(save)} stars`}>
            <StarIcon className="ffn-pill-icon" />
            <span className="ffn-pill-value">{totalStars(save)}</span>
          </span>
        </div>
        <div className="ffn-map-hud-right">
          <MapAction label="Daily Reward" tone="gift" icon={<GiftIcon />} badge={dailyReady ? '1' : null} onClick={() => open('daily')} />
          <MapAction label="Achievements" icon={<TrophyIcon />} badge={awards > 0 ? awards : null} onClick={() => go({ id: 'achievements' })} />
          <MapAction label="Settings" icon={<GearIcon />} onClick={() => open('settings')} />
        </div>
      </header>
      <div className="ffn-map-logo" aria-hidden="true">
        <Logo />
      </div>
      <button
        type="button"
        className="ffn-map-back"
        aria-label="Back to menu"
        onClick={() => {
          audio.play('click');
          go({ id: 'menu' });
        }}
      >
        <BackIcon />
      </button>
      {pickedLevel && <LevelIntro level={pickedLevel} onClose={() => setPicked(null)} onPlay={() => go({ id: 'play', levelId: pickedLevel.id })} />}
    </div>
  );
}
