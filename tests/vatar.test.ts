import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { PurchaseGrant } from '../src/games/food-frenzy-naija/platform';
import {
  CLAIM_RETRY_MS,
  PENDING_CLAIMS_KEY,
  SCORE_INTERVAL_MS,
  createVatarPlatform,
  errorCode,
  type VatarPlatformOptions,
  type VatarSdk,
} from '../src/vatar/vatarPlatform';

const vatarError = (code: string) => Object.assign(new Error(`Vatar: ${code}`), { code });

type Purchase = { purchaseId: string; productId: string };

/** A stand-in for window.Vatar with the documented shapes. */
function fakeSdk(overrides: Partial<VatarSdk> = {}) {
  const pause: (() => void)[] = [];
  const resume: (() => void)[] = [];
  const purchased: ((p: Purchase) => void)[] = [];
  let best = 0;
  const sdk = {
    init: vi.fn(async () => ({ player: { id: 't_abc', name: 'Ada', avatar: null }, session: 'tok', mode: 'test', theme: 'dark' })),
    session: vi.fn(async () => ({ session: 'fresh-token', exp: Date.now() + 900_000 })),
    submitScore: vi.fn(async (n: number) => {
      const accepted = n > best;
      best = Math.max(best, n);
      return { best, accepted };
    }),
    leaderboard: vi.fn(async () => ({ top: [{ rank: 1, name: 'Ada', score: 900 }], me: { rank: 1, label: '#1', score: 900 } })),
    purchase: vi.fn(async (productId: string) => ({ purchaseId: 'pur_1', productId })),
    purchases: vi.fn(async (): Promise<Purchase[]> => []),
    onPurchase: vi.fn((fn: (p: Purchase) => void) => {
      purchased.push(fn);
      return () => purchased.splice(purchased.indexOf(fn), 1);
    }),
    onPause: vi.fn((fn: () => void) => {
      pause.push(fn);
      return () => pause.splice(pause.indexOf(fn), 1);
    }),
    onResume: vi.fn((fn: () => void) => {
      resume.push(fn);
      return () => resume.splice(resume.indexOf(fn), 1);
    }),
    ...overrides,
  };
  return {
    sdk,
    firePause: () => pause.forEach((f) => f()),
    fireResume: () => resume.forEach((f) => f()),
    firePurchase: (p: Purchase) => purchased.forEach((f) => f(p)),
  };
}

const quiet = { log: () => {} };

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('Vatar platform adapter', () => {
  it('works without the SDK (script blocked or offline)', async () => {
    const p = createVatarPlatform(undefined, quiet);
    expect(await p.connect()).toBeNull();
    p.submitScore(500); // no throw, nothing to send to
    await expect(p.leaderboard()).rejects.toBeTruthy();
    const off = p.onPause(() => {});
    expect(typeof off).toBe('function');
    off();
  });

  it('plays standalone when init rejects with not_framed', async () => {
    const { sdk } = fakeSdk({ init: vi.fn(() => Promise.reject(vatarError('not_framed'))) });
    const p = createVatarPlatform(sdk, quiet);
    expect(await p.connect()).toBeNull();
    p.submitScore(500);
    await vi.advanceTimersByTimeAsync(60_000);
    expect(sdk.submitScore).not.toHaveBeenCalled();
    await expect(p.leaderboard()).rejects.toMatchObject({ code: 'not_framed' });
  });

  it('survives an SDK that throws synchronously', async () => {
    const { sdk } = fakeSdk({
      init: vi.fn(() => {
        throw new Error('boom');
      }),
      onPurchase: vi.fn(() => {
        throw new Error('boom');
      }),
    });
    expect(await createVatarPlatform(sdk, quiet).connect()).toBeNull();
  });

  it('calls init once and reports the player and mode', async () => {
    const { sdk } = fakeSdk();
    const p = createVatarPlatform(sdk, quiet);
    const [a, b] = await Promise.all([p.connect(), p.connect()]);
    expect(a).toEqual({ name: 'Ada', mode: 'test' });
    expect(b).toBe(a);
    expect(sdk.init).toHaveBeenCalledTimes(1);
  });

  it('sends only the highest of several quick scores, and whole numbers only', async () => {
    const { sdk } = fakeSdk();
    const p = createVatarPlatform(sdk, quiet);
    await p.connect();
    p.submitScore(100);
    p.submitScore(250.7);
    p.submitScore(200);
    await vi.advanceTimersByTimeAsync(0);
    expect(sdk.submitScore).toHaveBeenCalledTimes(1);
    expect(sdk.submitScore).toHaveBeenCalledWith(250);
  });

  it('waits out the 20-second limit between scores', async () => {
    const { sdk } = fakeSdk();
    const p = createVatarPlatform(sdk, quiet);
    await p.connect();
    p.submitScore(100);
    await vi.advanceTimersByTimeAsync(0);
    p.submitScore(300);
    await vi.advanceTimersByTimeAsync(SCORE_INTERVAL_MS - 1000);
    expect(sdk.submitScore).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1000);
    expect(sdk.submitScore).toHaveBeenCalledTimes(2);
    expect(sdk.submitScore).toHaveBeenLastCalledWith(300);
  });

  it('retries after too_soon, but drops scores the board rejects as invalid', async () => {
    let calls = 0;
    const { sdk } = fakeSdk({
      submitScore: vi.fn(async (n: number) => {
        calls++;
        if (calls === 1) throw vatarError('too_soon');
        if (n === 999) throw vatarError('bad_request');
        return { best: n, accepted: true };
      }),
    });
    const p = createVatarPlatform(sdk, quiet);
    await p.connect();
    p.submitScore(400);
    await vi.advanceTimersByTimeAsync(0);
    await vi.advanceTimersByTimeAsync(SCORE_INTERVAL_MS);
    expect(sdk.submitScore).toHaveBeenCalledTimes(2);
    expect(sdk.submitScore).toHaveBeenLastCalledWith(400);

    p.submitScore(999);
    await vi.advanceTimersByTimeAsync(SCORE_INTERVAL_MS);
    await vi.advanceTimersByTimeAsync(SCORE_INTERVAL_MS * 3);
    expect(sdk.submitScore).toHaveBeenCalledTimes(3); // not retried
  });

  it('skips scores at or below the best the board already has', async () => {
    const { sdk } = fakeSdk({ submitScore: vi.fn(async () => ({ best: 5000, accepted: false })) });
    const p = createVatarPlatform(sdk, quiet);
    await p.connect();
    p.submitScore(1200);
    await vi.advanceTimersByTimeAsync(0);
    p.submitScore(4000);
    await vi.advanceTimersByTimeAsync(SCORE_INTERVAL_MS * 2);
    expect(sdk.submitScore).toHaveBeenCalledTimes(1);
    p.submitScore(0);
    p.submitScore(Number.NaN);
    await vi.advanceTimersByTimeAsync(SCORE_INTERVAL_MS * 2);
    expect(sdk.submitScore).toHaveBeenCalledTimes(1);
  });

  it('reads the leaderboard, caches it for 30 s and ignores malformed rows', async () => {
    const { sdk } = fakeSdk({
      leaderboard: vi.fn(async () => ({
        top: [{ rank: 1, name: 'Ada', score: 900 }, { rank: 'x', name: 3 } as never, { rank: 2, name: 'Chidi', score: 800 }],
        me: { rank: null, label: '1,000+', score: 12 },
      })),
    });
    const p = createVatarPlatform(sdk, quiet);
    await p.connect();
    const board = await p.leaderboard();
    expect(board.top).toEqual([
      { rank: 1, name: 'Ada', score: 900 },
      { rank: 2, name: 'Chidi', score: 800 },
    ]);
    expect(board.me).toEqual({ rank: null, label: '1,000+', score: 12 });
    await p.leaderboard();
    expect(sdk.leaderboard).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(30_000);
    await p.leaderboard();
    expect(sdk.leaderboard).toHaveBeenCalledTimes(2);
  });

  it('passes leaderboard errors to the caller', async () => {
    const { sdk } = fakeSdk({ leaderboard: vi.fn(() => Promise.reject(vatarError('rate_limited'))) });
    const p = createVatarPlatform(sdk, quiet);
    await p.connect();
    await expect(p.leaderboard()).rejects.toMatchObject({ code: 'rate_limited' });
  });

  it('forwards pause and resume, and unsubscribes', () => {
    const { sdk, firePause, fireResume } = fakeSdk();
    const p = createVatarPlatform(sdk, quiet);
    const paused = vi.fn();
    const resumed = vi.fn();
    const offPause = p.onPause(paused);
    const offResume = p.onResume(resumed);
    firePause();
    fireResume();
    expect(paused).toHaveBeenCalledTimes(1);
    expect(resumed).toHaveBeenCalledTimes(1);
    offPause();
    offResume();
    firePause();
    fireResume();
    expect(paused).toHaveBeenCalledTimes(1);
    expect(resumed).toHaveBeenCalledTimes(1);
  });

  it('reads error codes the way the SDK reports them', () => {
    expect(errorCode(vatarError('too_soon'))).toBe('too_soon');
    expect(errorCode(new Error('x'))).toBe('error');
    expect(errorCode(null)).toBe('error');
  });
});

/**
 * A stand-in for our /api/claim server: answers in order, then keeps repeating the last answer.
 * 'echo' confirms whichever purchase was asked about.
 */
function claimServer(...answers: ({ status: number; body?: unknown } | 'network' | 'echo')[]) {
  const requests: { url: string; body: Record<string, unknown> }[] = [];
  const fetch = vi.fn(async (url: string, init: RequestInit) => {
    const body = JSON.parse(String(init.body)) as Record<string, unknown>;
    requests.push({ url, body });
    const a = answers.length > 1 ? answers.shift()! : answers[0];
    if (a === 'network') throw new TypeError('Failed to fetch');
    const answer = a === 'echo' ? ok(String(body.purchaseId)) : a;
    return new Response(JSON.stringify(answer.body ?? {}), { status: answer.status });
  });
  return { fetch, requests };
}

/** Connect and let the start-up restore (Vatar.purchases()) finish, as it does before a player can tap Buy. */
async function connected(p: ReturnType<typeof createVatarPlatform>) {
  await p.connect();
  await vi.advanceTimersByTimeAsync(0);
}
const ok = (purchaseId: string, productId = 'coins_500') => ({ status: 200, body: { purchaseId, productId } });

function memStore(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));
  return {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => {
      data.set(k, v);
    },
    data,
  };
}
const pendingIds = (store: ReturnType<typeof memStore>) =>
  (JSON.parse(store.data.get(PENDING_CLAIMS_KEY) ?? '[]') as { purchaseId: string }[]).map((c) => c.purchaseId).sort();

function setup(sdkOverrides: Partial<VatarSdk>, server: ReturnType<typeof claimServer>, opts: VatarPlatformOptions = {}) {
  const fake = fakeSdk(sdkOverrides);
  const storage = memStore();
  const p = createVatarPlatform(fake.sdk, { ...quiet, fetch: server.fetch, storage, ...opts });
  const grants: PurchaseGrant[] = [];
  p.onGrant((g) => grants.push(g));
  return { ...fake, p, storage, grants };
}

describe('Vatar purchases', () => {
  it('buys on the pay sheet, has our server check it, then hands the purchase to the game', async () => {
    const server = claimServer(ok('pur_1'));
    const { sdk, p, grants, storage } = setup({}, server);
    await p.connect();
    expect(await p.buy('coins_500')).toEqual({ status: 'granted' });
    expect(sdk.purchase).toHaveBeenCalledWith('coins_500');
    expect(server.requests).toEqual([{ url: '/api/claim', body: { session: 'fresh-token', purchaseId: 'pur_1', mode: 'test' } }]);
    expect(grants).toEqual([{ purchaseId: 'pur_1', productId: 'coins_500' }]);
    expect(pendingIds(storage)).toEqual([]);
  });

  it("gives the product from the server (Vatar's record), not the one the game asked for", async () => {
    const { p, grants } = setup({}, claimServer(ok('pur_1', 'coins_1500')));
    await p.buy('coins_500');
    expect(grants).toEqual([{ purchaseId: 'pur_1', productId: 'coins_1500' }]);
  });

  it('reports a closed pay sheet and payment problems without calling the server', async () => {
    const server = claimServer(ok('pur_1'));
    const cases = [
      ['cancelled', { status: 'cancelled' }],
      ['payment_failed', { status: 'failed', reason: 'payment_failed' }],
      ['not_for_sale', { status: 'failed', reason: 'not_for_sale' }],
      ['busy', { status: 'failed', reason: 'busy' }],
      ['signed_out', { status: 'failed', reason: 'signed_out' }],
      ['timeout', { status: 'failed', reason: 'error' }],
    ] as const;
    for (const [code, result] of cases) {
      const { p, grants } = setup({ purchase: vi.fn(() => Promise.reject(vatarError(code))) }, server);
      expect(await p.buy('coins_500')).toEqual(result);
      expect(grants).toEqual([]);
    }
    expect(server.fetch).not.toHaveBeenCalled();
  });

  it('cannot buy without LagosLife', async () => {
    const server = claimServer(ok('pur_1'));
    expect(await createVatarPlatform(undefined, { ...quiet, fetch: server.fetch, storage: null }).buy('coins_500')).toEqual({ status: 'failed', reason: 'unavailable' });
    const outside = createVatarPlatform(fakeSdk({ init: vi.fn(() => Promise.reject(vatarError('not_framed'))) }).sdk, { ...quiet, fetch: server.fetch, storage: null });
    expect(await outside.buy('coins_500')).toEqual({ status: 'failed', reason: 'unavailable' });
    expect(server.fetch).not.toHaveBeenCalled();
  });

  it('keeps a paid purchase while the server is unavailable, retries with a fresh session, then gives it', async () => {
    const server = claimServer({ status: 503, body: { error: 'not_configured' } }, 'network', ok('pur_1'));
    const { sdk, p, grants, storage } = setup({}, server);
    await connected(p);
    expect(await p.buy('coins_500')).toEqual({ status: 'pending' });
    expect(grants).toEqual([]);
    expect(pendingIds(storage)).toEqual(['pur_1']);
    await vi.advanceTimersByTimeAsync(CLAIM_RETRY_MS[0]);
    expect(grants).toEqual([]);
    await vi.advanceTimersByTimeAsync(CLAIM_RETRY_MS[1]);
    expect(grants).toEqual([{ purchaseId: 'pur_1', productId: 'coins_500' }]);
    expect(server.fetch).toHaveBeenCalledTimes(3);
    expect(sdk.session).toHaveBeenCalledTimes(3);
    expect(pendingIds(storage)).toEqual([]);
  });

  it('stops retrying after a while but remembers the purchase for the next visit', async () => {
    const server = claimServer('network');
    const { p, storage } = setup({}, server);
    await connected(p);
    await p.buy('coins_500');
    await vi.advanceTimersByTimeAsync(CLAIM_RETRY_MS.reduce((a, b) => a + b, 0) * 2);
    expect(server.fetch).toHaveBeenCalledTimes(CLAIM_RETRY_MS.length + 1);
    expect(pendingIds(storage)).toEqual(['pur_1']);
  });

  it('gives nothing when the server refuses the purchase', async () => {
    const server = claimServer({ status: 403, body: { error: 'wrong_player' } });
    const { p, grants, storage } = setup({}, server);
    expect(await p.buy('coins_500')).toEqual({ status: 'failed', reason: 'not_verified' });
    await vi.advanceTimersByTimeAsync(120_000);
    expect(server.fetch).toHaveBeenCalledTimes(1);
    expect(grants).toEqual([]);
    expect(pendingIds(storage)).toEqual([]);
  });

  it('does not trust a malformed answer from the server', async () => {
    const server = claimServer({ status: 200, body: { purchaseId: 'someone_else' } }, ok('pur_1'));
    const { p, grants } = setup({}, server);
    expect(await p.buy('coins_500')).toEqual({ status: 'pending' });
    expect(grants).toEqual([]);
    await vi.advanceTimersByTimeAsync(CLAIM_RETRY_MS[0]);
    expect(grants).toEqual([{ purchaseId: 'pur_1', productId: 'coins_500' }]);
  });

  it('restores paid-but-undelivered purchases and unfinished checks after init, for this mode only', async () => {
    const server = claimServer('echo');
    const fake = fakeSdk({ purchases: vi.fn(async () => [{ purchaseId: 'pur_a', productId: 'coins_500' }]) });
    const storage = memStore({
      [PENDING_CLAIMS_KEY]: JSON.stringify([
        { purchaseId: 'pur_b', productId: 'coins_1500', mode: 'test' },
        { purchaseId: 'pur_live', productId: 'coins_500', mode: 'live' },
      ]),
    });
    const p = createVatarPlatform(fake.sdk, { ...quiet, fetch: server.fetch, storage });
    await connected(p);
    expect(server.requests.map((r) => r.body.purchaseId).sort()).toEqual(['pur_a', 'pur_b']);

    // nobody was listening yet: the grants wait for the game, and stay remembered until it takes them
    expect(pendingIds(storage)).toEqual(['pur_a', 'pur_b', 'pur_live']);
    const grants: PurchaseGrant[] = [];
    p.onGrant((g) => grants.push(g));
    expect(grants.map((g) => g.purchaseId).sort()).toEqual(['pur_a', 'pur_b']);
    expect(pendingIds(storage)).toEqual(['pur_live']);
  });

  it('claims a purchase confirmed after a trip to the payment page (onPurchase), once', async () => {
    const server = claimServer(ok('pur_9'));
    const { p, grants, firePurchase } = setup({ purchases: vi.fn(async () => [{ purchaseId: 'pur_9', productId: 'coins_500' }]) }, server);
    firePurchase({ purchaseId: 'pur_9', productId: 'coins_500' });
    await connected(p);
    firePurchase({ purchaseId: 'pur_9', productId: 'coins_500' });
    await vi.advanceTimersByTimeAsync(0);
    expect(server.fetch).toHaveBeenCalledTimes(1);
    expect(grants).toEqual([{ purchaseId: 'pur_9', productId: 'coins_500' }]);
  });
});
