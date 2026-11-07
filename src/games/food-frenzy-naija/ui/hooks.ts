import { useEffect, useState, useSyncExternalStore } from 'react';
import { useProfile } from '../progress/profileStore';
import { localDateKey, msUntilTomorrow } from '../progress/dates';

const RM_QUERY = '(prefers-reduced-motion: reduce)';

function subscribeRM(cb: () => void) {
  if (typeof window === 'undefined' || !window.matchMedia) return () => {};
  const mq = window.matchMedia(RM_QUERY);
  mq.addEventListener?.('change', cb);
  return () => mq.removeEventListener?.('change', cb);
}
const systemRM = () => (typeof window !== 'undefined' && window.matchMedia ? window.matchMedia(RM_QUERY).matches : false);

/** Reduced motion: the player's setting, falling back to the operating-system preference. */
export function useReducedMotion(): boolean {
  const pref = useProfile((s) => s.save.settings.reducedMotion);
  const system = useSyncExternalStore(subscribeRM, systemRM, () => false);
  return pref === 'on' ? true : pref === 'off' ? false : system;
}

/** Non-hook version for code that runs outside React render (the controller). */
export function reducedMotionNow(): boolean {
  const pref = useProfile.getState().save.settings.reducedMotion;
  return pref === 'on' ? true : pref === 'off' ? false : systemRM();
}

/** Today's local date key; updates itself at midnight. */
export function useToday(): string {
  const [today, setToday] = useState(localDateKey);
  useEffect(() => {
    const id = setTimeout(() => setToday(localDateKey()), msUntilTomorrow() + 1000);
    return () => clearTimeout(id);
  }, [today]);
  return today;
}

/** Countdown text until local midnight, refreshed every 30 s. */
export function useCountdownToTomorrow(): string {
  const [ms, setMs] = useState(msUntilTomorrow);
  useEffect(() => {
    const id = setInterval(() => setMs(msUntilTomorrow()), 30000);
    return () => clearInterval(id);
  }, []);
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  return `${h}h ${String(m).padStart(2, '0')}m`;
}
