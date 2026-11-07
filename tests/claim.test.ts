import { afterEach, describe, expect, it, vi } from 'vitest';
import { POST } from '../api/claim.mjs';
import { PRODUCT_IDS, SECRET_ENV, VATAR_API, claimPurchase } from '../api/_lib/vatarClaim.mjs';
import { COIN_PACKS } from '../src/games/food-frenzy-naija/progress/coinPacks';

const TEST_KEY = 'vtr_test_example0000';
const LIVE_KEY = 'vtr_live_example0000';
const env = { [SECRET_ENV.test]: TEST_KEY, [SECRET_ENV.live]: LIVE_KEY };

type Answer = { status: number; body?: unknown } | 'network';
interface Call {
  method: string;
  path: string;
  auth: string | null;
  body: unknown;
}

/** A stand-in for the Vatar API with the documented answers. Override any step. */
function vatar(overrides: { verify?: Answer; purchase?: Answer; deliver?: Answer } = {}) {
  const calls: Call[] = [];
  const answers: Record<string, Answer> = {
    verify: { status: 200, body: { playerId: 't_ada', name: 'Ada', gameId: 'g1', exp: Date.now() + 60_000, mode: 'test' } },
    purchase: {
      status: 200,
      body: { id: 'pur_1', productId: 'coins_500', playerId: 't_ada', amount: 200, currency: 'NGN', status: 'paid', createdAt: 1, mode: 'test' },
    },
    deliver: { status: 200, body: { id: 'pur_1', status: 'delivered', deliveredAt: 2 } },
    ...overrides,
  };
  const fetch = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
    const path = String(url).replace(VATAR_API, '');
    const headers = new Headers(init?.headers);
    calls.push({ method: init?.method ?? 'GET', path, auth: headers.get('authorization'), body: init?.body ? JSON.parse(String(init.body)) : undefined });
    const step = path === '/session/verify' ? 'verify' : path.endsWith('/deliver') ? 'deliver' : 'purchase';
    const a = answers[step];
    if (a === 'network') throw new TypeError('fetch failed');
    return new Response(JSON.stringify(a.body ?? {}), { status: a.status, headers: { 'Content-Type': 'application/json' } });
  });
  return { fetch: fetch as unknown as typeof globalThis.fetch, calls };
}

const logs: string[] = [];
const deps = (v: ReturnType<typeof vatar>, e: Record<string, string | undefined> = env) => ({ env: e, fetch: v.fetch, log: (m: string) => logs.push(m) });
const claimBody = { session: 'sess.token.abc', purchaseId: 'pur_1', mode: 'test' };

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('purchase claim (server)', () => {
  it('verifies the session, checks the purchase, marks it delivered, then answers with the product', async () => {
    const v = vatar();
    const r = await claimPurchase(claimBody, deps(v));
    expect(r).toEqual({ status: 200, body: { purchaseId: 'pur_1', productId: 'coins_500' } });
    expect(v.calls.map((c) => `${c.method} ${c.path}`)).toEqual(['POST /session/verify', 'GET /purchases/pur_1', 'POST /purchases/pur_1/deliver']);
    expect(v.calls[0].body).toEqual({ session: 'sess.token.abc' });
    for (const c of v.calls) expect(c.auth).toBe(`Bearer ${TEST_KEY}`);
  });

  it('uses the live key only for live claims, and never the other mode', async () => {
    const v = vatar({
      verify: { status: 200, body: { playerId: 'p_ada', mode: 'live' } },
      purchase: { status: 200, body: { id: 'pur_1', productId: 'coins_1500', playerId: 'p_ada', status: 'paid', mode: 'live' } },
    });
    const r = await claimPurchase({ ...claimBody, mode: 'live' }, deps(v));
    expect(r.status).toBe(200);
    for (const c of v.calls) expect(c.auth).toBe(`Bearer ${LIVE_KEY}`);
  });

  it('refuses to run without the right key for that mode, and calls nothing', async () => {
    const v = vatar();
    expect(await claimPurchase(claimBody, deps(v, {}))).toEqual({ status: 503, body: { error: 'not_configured' } });
    // a live key put in the test variable (or the reverse) is refused too
    expect((await claimPurchase(claimBody, deps(v, { [SECRET_ENV.test]: LIVE_KEY }))).status).toBe(503);
    expect((await claimPurchase({ ...claimBody, mode: 'live' }, deps(v, { [SECRET_ENV.live]: TEST_KEY }))).status).toBe(503);
    expect(v.calls).toHaveLength(0);
  });

  it('rejects malformed requests before calling Vatar', async () => {
    const v = vatar();
    const bad = [
      null,
      'x',
      [],
      { ...claimBody, session: '' },
      { ...claimBody, session: 'x'.repeat(5000) },
      { ...claimBody, purchaseId: '../session/verify' },
      { ...claimBody, purchaseId: 'a'.repeat(65) },
      { ...claimBody, mode: 'prod' },
      { session: 'a', purchaseId: 'b' },
    ];
    for (const input of bad) expect((await claimPurchase(input, deps(v))).status).toBe(400);
    expect(v.calls).toHaveLength(0);
  });

  it("never delivers another player's purchase", async () => {
    const v = vatar({ purchase: { status: 200, body: { id: 'pur_1', productId: 'coins_500', playerId: 't_someone_else', status: 'paid', mode: 'test' } } });
    expect(await claimPurchase(claimBody, deps(v))).toEqual({ status: 403, body: { error: 'wrong_player' } });
    expect(v.calls.some((c) => c.path.endsWith('/deliver'))).toBe(false);
  });

  it('never delivers a refunded purchase or a product the game does not sell', async () => {
    const refunded = vatar({ purchase: { status: 200, body: { id: 'pur_1', productId: 'coins_500', playerId: 't_ada', status: 'refunded', mode: 'test' } } });
    expect(await claimPurchase(claimBody, deps(refunded))).toEqual({ status: 409, body: { error: 'refunded' } });
    const unknown = vatar({ purchase: { status: 200, body: { id: 'pur_1', productId: 'gold_crown', playerId: 't_ada', status: 'paid', mode: 'test' } } });
    expect(await claimPurchase(claimBody, deps(unknown))).toEqual({ status: 422, body: { error: 'unknown_product' } });
    for (const v of [refunded, unknown]) expect(v.calls.some((c) => c.path.endsWith('/deliver'))).toBe(false);
  });

  it('answers again for a purchase already delivered (the game gives each purchase id once)', async () => {
    const v = vatar({ purchase: { status: 200, body: { id: 'pur_1', productId: 'coins_500', playerId: 't_ada', status: 'delivered', mode: 'test' } } });
    expect((await claimPurchase(claimBody, deps(v))).status).toBe(200);
    expect(v.calls.filter((c) => c.path.endsWith('/deliver'))).toHaveLength(1); // the docs: safe to repeat
  });

  it('refuses a session from the other mode and a purchase answer for another id', async () => {
    const liveSession = vatar({ verify: { status: 200, body: { playerId: 't_ada', mode: 'live' } } });
    expect((await claimPurchase(claimBody, deps(liveSession))).status).toBe(403);
    const otherId = vatar({ purchase: { status: 200, body: { id: 'pur_2', productId: 'coins_500', playerId: 't_ada', status: 'paid', mode: 'test' } } });
    expect((await claimPurchase(claimBody, deps(otherId))).status).toBe(403);
  });

  it('maps Vatar errors to final or try-again answers', async () => {
    const cases: [Partial<Record<'verify' | 'purchase' | 'deliver', Answer>>, number, string][] = [
      [{ verify: { status: 401, body: { error: 'expired' } } }, 401, 'session_expired'],
      [{ verify: { status: 401, body: { error: 'invalid_token' } } }, 401, 'session_expired'],
      [{ verify: { status: 401, body: { error: 'bad_secret' } } }, 503, 'not_configured'],
      [{ verify: { status: 403, body: { error: 'wrong_mode' } } }, 403, 'wrong_mode'],
      [{ verify: { status: 403, body: { error: 'game_off' } } }, 403, 'game_off'],
      [{ verify: { status: 429, body: { error: 'rate_limited' } } }, 502, 'vatar_unavailable'],
      [{ verify: 'network' }, 502, 'vatar_unavailable'],
      [{ purchase: { status: 404, body: { error: 'not_found' } } }, 404, 'not_found'],
      [{ purchase: { status: 500, body: { error: 'error' } } }, 502, 'vatar_unavailable'],
      [{ deliver: { status: 409, body: { error: 'refunded' } } }, 409, 'refunded'],
      [{ deliver: { status: 503 } }, 502, 'vatar_unavailable'],
      [{ deliver: 'network' }, 502, 'vatar_unavailable'],
    ];
    for (const [over, status, error] of cases) {
      expect(await claimPurchase(claimBody, deps(vatar(over))), JSON.stringify(over)).toEqual({ status, body: { error } });
    }
  });

  it('never writes the secret or the session token to the logs', () => {
    expect(logs.length).toBeGreaterThan(0);
    for (const line of logs) {
      expect(line).not.toContain(TEST_KEY);
      expect(line).not.toContain(LIVE_KEY);
      expect(line).not.toContain('sess.token.abc');
    }
  });
});

describe('POST /api/claim (Vercel function)', () => {
  const request = (body: string) => new Request('https://game.example/api/claim', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body });

  it('reads the JSON body and the key from the environment, and is never cached', async () => {
    const v = vatar();
    vi.stubGlobal('fetch', v.fetch);
    vi.stubEnv(SECRET_ENV.test, TEST_KEY);
    const res = await POST(request(JSON.stringify(claimBody)));
    expect(res.status).toBe(200);
    expect(res.headers.get('cache-control')).toBe('no-store');
    expect(await res.json()).toEqual({ purchaseId: 'pur_1', productId: 'coins_500' });
    expect(v.calls[0].auth).toBe(`Bearer ${TEST_KEY}`);
  });

  it('answers 400 to bad or oversized JSON', async () => {
    vi.stubEnv(SECRET_ENV.test, TEST_KEY);
    expect((await POST(request('{nope'))).status).toBe(400);
    expect((await POST(request(JSON.stringify({ ...claimBody, pad: 'x'.repeat(9000) })))).status).toBe(400);
  });
});

describe('coin pack products', () => {
  it('the server delivers exactly the packs the game sells', () => {
    expect([...PRODUCT_IDS].sort()).toEqual(COIN_PACKS.map((p) => p.productId).sort());
  });

  it('use product ids the SDK accepts, with positive coin amounts', () => {
    for (const p of COIN_PACKS) {
      expect(p.productId).toMatch(/^[a-z0-9][a-z0-9_-]{1,31}$/); // Vatar.purchase()'s own check
      expect(Number.isInteger(p.coins) && p.coins > 0).toBe(true);
    }
  });
});
