/**
 * LagosLife Games integration through the Vatar Games SDK v1.
 * Docs: https://lagoslife.app/developers/docs
 *
 * index.html loads the SDK with the documented tag
 *   <script src="https://lagoslife.app/sdk/vatar-games-v1.js"></script>
 * which defines `window.Vatar`. This adapter uses only these documented calls:
 *   Vatar.init(), Vatar.submitScore(n), Vatar.leaderboard(), Vatar.onPause(fn), Vatar.onResume(fn)
 *
 * No keys live here. The SDK has no browser key: test or live mode is decided by where the game
 * is opened (the Vatar sandbox gives "test", the Games app gives "live"). Secret keys
 * (vtr_test_… / vtr_live_…) belong only on a server, and this game has no server calls yet.
 *
 * When the SDK is missing (blocked or offline) or the game is opened outside the LagosLife
 * player (every call rejects with code "not_framed"), the adapter reports "not connected" and the
 * game plays normally without a leaderboard.
 */
import type { GamePlatform, LeaderboardView, PlatformPlayer } from '../games/food-frenzy-naija/platform';

/** The part of the Vatar Games SDK v1 this game uses, as documented. */
export interface VatarSdk {
  /** → { player: { id, name, avatar }, session, mode: "live" | "test", theme } */
  init(): Promise<{ player: { id: string; name: string; avatar: string | null }; session: string; mode: string; theme?: string }>;
  /** Keeps each player's best (highest) whole number. One score every 20 s; sooner is "too_soon". */
  submitScore(n: number): Promise<{ best: number; accepted: boolean }>;
  /** → { top: [{ rank, name, score }], me: { rank, label, score } | null }. Refreshed at most every 30 s. */
  leaderboard(): Promise<{ top: { rank: number; name: string; score: number }[]; me: { rank: number | null; label: string; score: number } | null }>;
  onPause(fn: () => void): () => void;
  onResume(fn: () => void): () => void;
}

declare global {
  interface Window {
    Vatar?: VatarSdk;
  }
}

/** Documented limit: at most one score a player every 20 seconds. A little margin avoids "too_soon". */
export const SCORE_INTERVAL_MS = 20_500;
/** Documented: the board is refreshed at most every 30 seconds, so asking more often gains nothing. */
export const LEADERBOARD_CACHE_MS = 30_000;
/** Failures worth trying again after the interval. Anything else (bad_request, signed_out, off…) is final. */
const RETRYABLE = new Set(['too_soon', 'rate_limited', 'timeout', 'busy']);
const MAX_RETRIES = 5;

/** SDK errors are Errors with a `.code`; anything else counts as "error". */
export function errorCode(e: unknown): string {
  const code = typeof e === 'object' && e !== null ? (e as { code?: unknown }).code : undefined;
  return typeof code === 'string' ? code : 'error';
}

const noop = () => {};

export interface VatarPlatformOptions {
  now?: () => number;
  log?: (message: string) => void;
}

export function createVatarPlatform(sdk: VatarSdk | undefined, opts: VatarPlatformOptions = {}): GamePlatform {
  const now = opts.now ?? (() => Date.now());
  const log = opts.log ?? ((message: string) => console.info(`[Vatar] ${message}`));

  let connecting: Promise<PlatformPlayer | null> | null = null;

  /** init() is called once per page load (it is rate limited to 10 a minute). */
  const connect = (): Promise<PlatformPlayer | null> => {
    if (connecting) return connecting;
    if (!sdk) {
      log('SDK not loaded: playing without LagosLife features.');
      connecting = Promise.resolve(null);
      return connecting;
    }
    connecting = Promise.resolve()
      .then(() => sdk.init())
      .then(
        (res): PlatformPlayer => ({
          name: typeof res?.player?.name === 'string' && res.player.name ? res.player.name : 'Player',
          mode: res?.mode === 'test' ? 'test' : 'live',
        }),
        (e: unknown) => {
          const code = errorCode(e);
          log(code === 'not_framed' ? 'Not inside the LagosLife game player: playing standalone.' : `Not connected (${code}): playing without LagosLife features.`);
          return null;
        },
      );
    return connecting;
  };

  // ── score queue: keeps only the highest pending score and respects the 20-second limit ──
  let best = 0; // highest score the board has confirmed for this player
  let pending = 0; // highest score waiting to be sent (0 = nothing waiting)
  let lastSentAt = -Infinity;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let inFlight = false;
  let failures = 0;

  const schedule = () => {
    if (timer !== null || inFlight || pending <= best) return;
    timer = setTimeout(() => void send(), Math.max(0, lastSentAt + SCORE_INTERVAL_MS - now()));
  };

  const send = async () => {
    timer = null;
    if (!sdk || pending <= best || !(await connect())) return;
    const n = pending;
    pending = 0;
    inFlight = true;
    lastSentAt = now();
    try {
      const res = await sdk.submitScore(n);
      if (typeof res?.best === 'number') best = Math.max(best, res.best);
      failures = 0;
      cache = null; // the next board read may include the new score
    } catch (e) {
      const code = errorCode(e);
      if (RETRYABLE.has(code) && ++failures <= MAX_RETRIES) {
        pending = Math.max(pending, n);
      } else {
        log(`Score ${n} not sent (${code}).`);
        failures = 0;
      }
    } finally {
      inFlight = false;
      schedule();
    }
  };

  // ── leaderboard ──
  let cache: { at: number; board: LeaderboardView } | null = null;
  let loading: Promise<LeaderboardView> | null = null;

  const leaderboard = (): Promise<LeaderboardView> => {
    if (cache && now() - cache.at < LEADERBOARD_CACHE_MS) return Promise.resolve(cache.board);
    if (loading) return loading;
    loading = connect()
      .then((player) => {
        if (!sdk || !player) throw Object.assign(new Error('Vatar: not connected'), { code: 'not_framed' });
        return sdk.leaderboard();
      })
      .then((raw) => {
        const board = normalizeBoard(raw);
        cache = { at: now(), board };
        return board;
      })
      .finally(() => {
        loading = null;
      });
    return loading;
  };

  const listen = (subscribe: ((fn: () => void) => () => void) | undefined, fn: () => void): (() => void) => {
    if (!subscribe) return noop;
    try {
      const off = subscribe(fn);
      return typeof off === 'function' ? off : noop;
    } catch {
      return noop;
    }
  };

  return {
    connect,
    submitScore(score) {
      const n = Math.floor(score); // the board keeps whole numbers
      if (!sdk || !Number.isFinite(n) || n <= 0 || n <= best || n <= pending) return;
      pending = n;
      schedule();
    },
    leaderboard,
    onPause: (fn) => listen(sdk && ((f) => sdk.onPause(f)), fn),
    onResume: (fn) => listen(sdk && ((f) => sdk.onResume(f)), fn),
  };
}

/** Accept only well-formed rows so a surprising reply can't break the UI. */
function normalizeBoard(raw: unknown): LeaderboardView {
  const r = (typeof raw === 'object' && raw !== null ? raw : {}) as { top?: unknown; me?: unknown };
  const top = Array.isArray(r.top)
    ? r.top
        .filter((x): x is { rank: number; name: string; score: number } => {
          const row = x as Record<string, unknown> | null;
          return !!row && typeof row.rank === 'number' && typeof row.name === 'string' && typeof row.score === 'number';
        })
        .map(({ rank, name, score }) => ({ rank, name, score }))
    : [];
  const m = r.me as Record<string, unknown> | null | undefined;
  const me =
    m && typeof m === 'object' && typeof m.score === 'number'
      ? {
          rank: typeof m.rank === 'number' ? m.rank : null,
          label: typeof m.label === 'string' ? m.label : typeof m.rank === 'number' ? `#${m.rank}` : '',
          score: m.score,
        }
      : null;
  return { top, me };
}
