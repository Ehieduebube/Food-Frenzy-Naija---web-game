import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SCORE_INTERVAL_MS, createVatarPlatform, errorCode, type VatarSdk } from '../src/vatar/vatarPlatform';

const vatarError = (code: string) => Object.assign(new Error(`Vatar: ${code}`), { code });

/** A stand-in for window.Vatar with the documented shapes. */
function fakeSdk(overrides: Partial<VatarSdk> = {}) {
  const pause: (() => void)[] = [];
  const resume: (() => void)[] = [];
  let best = 0;
  const sdk = {
    init: vi.fn(async () => ({ player: { id: 't_abc', name: 'Ada', avatar: null }, session: 'tok', mode: 'test', theme: 'dark' })),
    submitScore: vi.fn(async (n: number) => {
      const accepted = n > best;
      best = Math.max(best, n);
      return { best, accepted };
    }),
    leaderboard: vi.fn(async () => ({ top: [{ rank: 1, name: 'Ada', score: 900 }], me: { rank: 1, label: '#1', score: 900 } })),
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
  return { sdk, firePause: () => pause.forEach((f) => f()), fireResume: () => resume.forEach((f) => f()) };
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
