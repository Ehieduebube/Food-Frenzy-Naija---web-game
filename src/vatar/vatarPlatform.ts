/**
 * LagosLife Games integration through the Vatar Games SDK v1.
 * Docs: https://lagoslife.app/developers/docs
 *
 * index.html loads the SDK with the documented tag
 *   <script src="https://lagoslife.app/sdk/vatar-games-v1.js"></script>
 * which defines `window.Vatar`. This adapter uses only these documented calls:
 *   Vatar.init(), Vatar.session(), Vatar.submitScore(n), Vatar.leaderboard(),
 *   Vatar.purchase(productId), Vatar.purchases(), Vatar.onPurchase(fn), Vatar.onPause(fn), Vatar.onResume(fn)
 *
 * No keys live here. The SDK has no browser key: test or live mode is decided by where the game
 * is opened (the Vatar sandbox gives "test", the Games app gives "live"). Secret keys
 * (vtr_test_… / vtr_live_…) live only on the game's server (api/claim.mjs), which this adapter
 * asks to check every purchase before the game gives anything ("The purchase flow" in the docs).
 *
 * When the SDK is missing (blocked or offline) or the game is opened outside the LagosLife
 * player (every call rejects with code "not_framed"), the adapter reports "not connected" and the
 * game plays normally without a leaderboard or purchases.
 */
import type { BuyFailure, BuyResult, GamePlatform, LeaderboardView, PlatformPlayer, PurchaseGrant } from '../games/food-frenzy-naija/platform';

/** The part of the Vatar Games SDK v1 this game uses, as documented. */
export interface VatarSdk {
  /** → { player: { id, name, avatar }, session, mode: "live" | "test", theme } */
  init(): Promise<{ player: { id: string; name: string; avatar: string | null }; session: string; mode: string; theme?: string }>;
  /** A fresh session token (they last 15 minutes) for the game's server → { session, exp } */
  session(): Promise<{ session: string; exp: number }>;
  /** Keeps each player's best (highest) whole number. One score every 20 s; sooner is "too_soon". */
  submitScore(n: number): Promise<{ best: number; accepted: boolean }>;
  /** → { top: [{ rank, name, score }], me: { rank, label, score } | null }. Refreshed at most every 30 s. */
  leaderboard(): Promise<{ top: { rank: number; name: string; score: number }[]; me: { rank: number | null; label: string; score: number } | null }>;
  /** Opens the world's own pay sheet → { purchaseId, productId } once the payment is confirmed. */
  purchase(productId: string): Promise<{ purchaseId: string; productId: string }>;
  /** This player's paid purchases the game's server hasn't marked delivered yet. */
  purchases(): Promise<{ purchaseId: string; productId: string }[]>;
  /** A purchase confirmed while no purchase() call was waiting (e.g. after paying on the provider's page). */
  onPurchase(fn: (p: { purchaseId: string; productId: string }) => void): () => void;
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

/** The game's own server endpoint that checks and delivers purchases (api/claim.mjs). */
export const CLAIM_URL = '/api/claim';
/** Waits between tries when the server can't confirm a purchase yet. After the last, it waits for the next visit. */
export const CLAIM_RETRY_MS = [3_000, 10_000, 30_000, 60_000];
const CLAIM_TIMEOUT_MS = 15_000;
/** Our server's answers that mean "not now, try again": session expired, rate limited, Vatar or config unavailable. */
const CLAIM_RETRY_STATUS = new Set([401, 408, 429, 500, 502, 503, 504]);
/** Purchases being checked are remembered here, so a reload or a lost answer never loses one. */
export const PENDING_CLAIMS_KEY = 'vatar.pendingClaims.v1';
const MAX_PENDING = 50;

/** SDK errors are Errors with a `.code`; anything else counts as "error". */
export function errorCode(e: unknown): string {
  const code = typeof e === 'object' && e !== null ? (e as { code?: unknown }).code : undefined;
  return typeof code === 'string' ? code : 'error';
}

const BUY_FAILURES = new Set<string>(['payment_failed', 'not_for_sale', 'owned', 'signed_out', 'busy', 'rate_limited', 'off']);
const buyFailure = (code: string): BuyFailure =>
  code === 'not_framed' ? 'unavailable' : BUY_FAILURES.has(code) ? (code as BuyFailure) : 'error';

const isId = (v: unknown): v is string => typeof v === 'string' && /^[A-Za-z0-9_-]{1,64}$/.test(v);

const noop = () => {};

type Mode = PlatformPlayer['mode'];
type PendingClaim = PurchaseGrant & { mode: Mode };
type ClaimOutcome = 'granted' | 'retry' | 'dropped';
type KeyValueStore = Pick<Storage, 'getItem' | 'setItem'>;

export interface VatarPlatformOptions {
  now?: () => number;
  log?: (message: string) => void;
  /** Where the game's server checks purchases. */
  claimUrl?: string;
  fetch?: (input: string, init: RequestInit) => Promise<Response>;
  /** Keeps purchases that are still being checked. Defaults to localStorage; null keeps them in memory only. */
  storage?: KeyValueStore | null;
}

function defaultStorage(): KeyValueStore | null {
  try {
    return typeof window !== 'undefined' && window.localStorage ? window.localStorage : null;
  } catch {
    return null; // storage blocked in this frame
  }
}

export function createVatarPlatform(sdk: VatarSdk | undefined, opts: VatarPlatformOptions = {}): GamePlatform {
  const now = opts.now ?? (() => Date.now());
  const log = opts.log ?? ((message: string) => console.info(`[Vatar] ${message}`));
  const claimUrl = opts.claimUrl ?? CLAIM_URL;
  const doFetch = opts.fetch ?? ((input: string, init: RequestInit) => fetch(input, init));
  const storage = opts.storage === undefined ? defaultStorage() : opts.storage;

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
        (res): PlatformPlayer => {
          const player: PlatformPlayer = {
            name: typeof res?.player?.name === 'string' && res.player.name ? res.player.name : 'Player',
            mode: res?.mode === 'test' ? 'test' : 'live',
          };
          // the docs: call purchases() after init() to restore anything a crash or a reload interrupted
          setTimeout(() => void restore(player), 0);
          return player;
        },
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

  // ── purchases: every one is checked and delivered by our server before the game gives it ──
  const readPending = (): PendingClaim[] => {
    try {
      const raw: unknown = JSON.parse(storage?.getItem(PENDING_CLAIMS_KEY) ?? '[]');
      return Array.isArray(raw)
        ? raw.filter((c): c is PendingClaim => !!c && isId(c.purchaseId) && isId(c.productId) && (c.mode === 'test' || c.mode === 'live'))
        : [];
    } catch {
      return [];
    }
  };
  const writePending = (list: PendingClaim[]) => {
    try {
      storage?.setItem(PENDING_CLAIMS_KEY, JSON.stringify(list.slice(-MAX_PENDING)));
    } catch {
      // storage full or blocked: Vatar.purchases() still restores anything not yet delivered
    }
  };
  const remember = (c: PendingClaim) => {
    const list = readPending();
    if (!list.some((x) => x.purchaseId === c.purchaseId)) writePending([...list, c]);
  };
  const forget = (purchaseId: string) => {
    const list = readPending();
    if (list.some((x) => x.purchaseId === purchaseId)) writePending(list.filter((x) => x.purchaseId !== purchaseId));
  };

  const grantListeners = new Set<(g: PurchaseGrant) => void>();
  const waitingGrants: PurchaseGrant[] = [];
  const granted = new Set<string>(); // handed to the game during this page load
  const claiming = new Map<string, Promise<ClaimOutcome>>();
  const attempts = new Map<string, number>();

  const handToGame = (g: PurchaseGrant) => {
    for (const fn of [...grantListeners]) {
      try {
        fn(g);
      } catch (e) {
        log(`A purchase listener failed: ${String(e)}`);
      }
    }
    forget(g.purchaseId);
  };

  const grant = (g: PurchaseGrant) => {
    granted.add(g.purchaseId);
    if (grantListeners.size > 0) handToGame(g);
    else waitingGrants.push(g); // stays remembered in storage until the game takes it
  };

  const retryLater = (p: PurchaseGrant): ClaimOutcome => {
    const n = attempts.get(p.purchaseId) ?? 0;
    if (n < CLAIM_RETRY_MS.length) {
      attempts.set(p.purchaseId, n + 1);
      setTimeout(() => void claim(p), CLAIM_RETRY_MS[n]);
    } else {
      log(`Purchase ${p.purchaseId} is still unconfirmed: it will be checked again next time the game opens.`);
    }
    return 'retry';
  };

  const attemptClaim = async (p: PurchaseGrant): Promise<ClaimOutcome> => {
    const player = await connect();
    if (!sdk || !player) return 'retry';
    remember({ ...p, mode: player.mode });

    let session: unknown;
    try {
      session = (await sdk.session())?.session;
    } catch (e) {
      log(`No session for purchase ${p.purchaseId} (${errorCode(e)}).`);
      return retryLater(p);
    }
    if (typeof session !== 'string' || session === '') return retryLater(p);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), CLAIM_TIMEOUT_MS);
    let res: Response;
    try {
      res = await doFetch(claimUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session, purchaseId: p.purchaseId, mode: player.mode }),
        signal: controller.signal,
      });
    } catch {
      return retryLater(p); // offline, or the answer was lost: the purchase stays remembered
    } finally {
      clearTimeout(timeout);
    }

    if (res.ok) {
      const data = (await res.json().catch(() => null)) as { purchaseId?: unknown; productId?: unknown } | null;
      if (data?.purchaseId === p.purchaseId && isId(data.productId)) {
        // the product comes from Vatar's record (via our server), not from the game's own guess
        grant({ purchaseId: p.purchaseId, productId: data.productId });
        return 'granted';
      }
      return retryLater(p);
    }
    if (CLAIM_RETRY_STATUS.has(res.status)) return retryLater(p);

    // refunded, not this player's, unknown product…: nothing to give. Our server only marks a
    // purchase delivered on a 200, so anything still owed comes back through Vatar.purchases().
    const why = ((await res.json().catch(() => null)) as { error?: unknown } | null)?.error;
    log(`Purchase ${p.purchaseId} was not given: the server said ${res.status}${typeof why === 'string' ? ` ${why}` : ''}.`);
    forget(p.purchaseId);
    return 'dropped';
  };

  /** Check one purchase with our server. Calls for the same purchase share one check. */
  const claim = (p: PurchaseGrant): Promise<ClaimOutcome> => {
    if (granted.has(p.purchaseId)) return Promise.resolve('granted');
    const running = claiming.get(p.purchaseId);
    if (running) return running;
    const run = attemptClaim(p).finally(() => claiming.delete(p.purchaseId));
    claiming.set(p.purchaseId, run);
    return run;
  };

  /** After init: anything paid but not delivered (Vatar's list) plus anything we were still checking. */
  const restore = async (player: PlatformPlayer) => {
    if (!sdk) return;
    const todo = new Map<string, PurchaseGrant>();
    for (const c of readPending()) if (c.mode === player.mode) todo.set(c.purchaseId, { purchaseId: c.purchaseId, productId: c.productId });
    try {
      const list: unknown = await sdk.purchases();
      if (Array.isArray(list)) {
        for (const x of list as { purchaseId?: unknown; productId?: unknown }[]) {
          if (x && isId(x.purchaseId)) todo.set(x.purchaseId, { purchaseId: x.purchaseId, productId: String(x.productId) });
        }
      }
    } catch (e) {
      log(`Could not list undelivered purchases (${errorCode(e)}).`);
    }
    // one at a time: session() is limited to 10 a minute
    for (const p of todo.values()) await claim(p);
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

  // a purchase confirmed while no purchase() call was waiting (after paying on the provider's page)
  try {
    sdk?.onPurchase((p) => {
      if (p && isId(p.purchaseId)) void claim({ purchaseId: p.purchaseId, productId: String(p.productId) });
    });
  } catch {
    // an SDK without onPurchase: purchases() still restores these on the next visit
  }

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

    async buy(productId): Promise<BuyResult> {
      const player = await connect();
      if (!sdk || !player) return { status: 'failed', reason: 'unavailable' };
      let paid: { purchaseId?: unknown; productId?: unknown } | null;
      try {
        paid = await sdk.purchase(productId);
      } catch (e) {
        const code = errorCode(e);
        if (code === 'cancelled') return { status: 'cancelled' };
        log(`Purchase of ${productId} did not go through (${code}).`);
        return { status: 'failed', reason: buyFailure(code) };
      }
      if (!paid || !isId(paid.purchaseId)) return { status: 'failed', reason: 'error' };
      const outcome = await claim({ purchaseId: paid.purchaseId, productId: isId(paid.productId) ? paid.productId : productId });
      if (outcome === 'granted') return { status: 'granted' };
      if (outcome === 'retry') return { status: 'pending' };
      return { status: 'failed', reason: 'not_verified' };
    },

    onGrant(fn) {
      grantListeners.add(fn);
      for (const g of waitingGrants.splice(0)) handToGame(g);
      return () => {
        grantListeners.delete(fn);
      };
    },
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
