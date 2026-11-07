// @ts-check
/**
 * Server side of LagosLife purchases, using the Vatar Games API v1 as documented at
 * https://lagoslife.app/developers/docs ("The purchase flow" and "Your server: the API").
 *
 * The game asks this server to claim a purchase. The server:
 *   1. POST /session/verify  { session }   → who is asking (playerId, mode)
 *   2. GET  /purchases/{id}                 → is it real, paid, this player's, and a product we sell?
 *   3. POST /purchases/{id}/deliver         → marks it delivered (the docs: "safe to repeat")
 * and only then answers 200 { purchaseId, productId }. The game gives the item once per purchaseId
 * (it keeps the ids it has given in its save), because this game keeps coins on the player's device.
 *
 * Secrets: the test key (vtr_test_…) and live key (vtr_live_…) are read from separate server-side
 * environment variables and never leave this server. They are not in the code or the repository.
 */

/** "Base https://lagoslife.app/api/games/v1 for now: it may move to a Vatar address later, and we'll give notice first." */
export const VATAR_API = 'https://lagoslife.app/api/games/v1';

/**
 * Product ids this game knows how to give. Each must be created in the Vatar dashboard with exactly
 * this id. They must match COIN_PACKS in src/games/food-frenzy-naija/progress/coinPacks.ts (a test
 * checks). A paid purchase of any other product is never marked delivered, so it is never lost.
 */
export const PRODUCT_IDS = Object.freeze(['coins_500', 'coins_1500']);

/** Test and live keys are kept apart: each mode has its own environment variable. */
export const SECRET_ENV = Object.freeze({ test: 'VATAR_TEST_SECRET', live: 'VATAR_LIVE_SECRET' });
const SECRET_PREFIX = Object.freeze({ test: 'vtr_test_', live: 'vtr_live_' });

/** Request limits. The SDK caps its own messages at 8 KB, so a real claim is far smaller. */
export const MAX_BODY_BYTES = 8192;
const MAX_SESSION_LENGTH = 4096;
const PURCHASE_ID_RE = /^[A-Za-z0-9_-]{1,64}$/;
const DEFAULT_TIMEOUT_MS = 8000;

/**
 * @typedef {{ status: number, body: Record<string, unknown> }} ClaimResult
 * @typedef {{
 *   env: Record<string, string | undefined>,
 *   fetch: typeof fetch,
 *   timeoutMs?: number,
 *   log?: (message: string) => void,
 * }} ClaimDeps
 * @typedef {{ status: number, data: Record<string, unknown> | null }} ApiAnswer
 */

/** @param {unknown} v @returns {v is Record<string, unknown>} */
const isObj = (v) => typeof v === 'object' && v !== null && !Array.isArray(v);

/** @param {number} status @param {Record<string, unknown>} body @returns {ClaimResult} */
const reply = (status, body) => ({ status, body });
/** @param {number} status @param {string} error @returns {ClaimResult} */
const fail = (status, error) => reply(status, { error });

/**
 * One call to the Vatar API with the secret, as the docs' sample server does it.
 * Network failures and timeouts come back as status 0.
 * @param {ClaimDeps} deps @param {string} secret @param {string} path @param {object} [body]
 * @returns {Promise<ApiAnswer>}
 */
async function api(deps, secret, path, body) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), deps.timeoutMs ?? DEFAULT_TIMEOUT_MS);
  try {
    const res = await deps.fetch(VATAR_API + path, {
      method: body ? 'POST' : 'GET',
      headers: { Authorization: `Bearer ${secret}`, 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
      // never follow a redirect with the secret attached
      redirect: 'error',
    });
    /** @type {unknown} */
    let data = null;
    try {
      data = await res.json();
    } catch {
      data = null;
    }
    return { status: res.status, data: isObj(data) ? data : null };
  } catch {
    return { status: 0, data: null };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Turn a Vatar API refusal into this server's answer to the game. 401, 429, 5xx and network
 * failures mean "try again later" (the game keeps the purchase and retries); the rest are final.
 * @param {string} step @param {ApiAnswer} res @param {(m: string) => void} log @returns {ClaimResult}
 */
function upstreamFailure(step, res, log) {
  const code = typeof res.data?.error === 'string' ? res.data.error : res.status ? `http_${res.status}` : 'network';
  log(`${step} failed: ${res.status || 'no answer'} ${code}`);
  if (res.status === 0 || res.status === 429 || res.status >= 500) return fail(502, 'vatar_unavailable');
  if (code === 'bad_secret') return fail(503, 'not_configured');
  if (code === 'expired' || code === 'invalid_token') return fail(401, 'session_expired');
  if (code === 'refunded') return fail(409, 'refunded');
  if (res.status === 404) return fail(404, 'not_found');
  if (res.status === 400) return fail(400, 'bad_request');
  return fail(403, code === 'wrong_mode' || code === 'wrong_game' || code === 'game_off' ? code : 'forbidden');
}

/**
 * Check one purchase with Vatar and mark it delivered.
 * @param {unknown} input the parsed request body: { session, purchaseId, mode }
 * @param {ClaimDeps} deps
 * @returns {Promise<ClaimResult>}
 */
export async function claimPurchase(input, deps) {
  const log = deps.log ?? ((m) => console.warn(`[claim] ${m}`));

  if (!isObj(input)) return fail(400, 'bad_request');
  const { session, purchaseId, mode } = input;
  if (
    typeof session !== 'string' ||
    session.length === 0 ||
    session.length > MAX_SESSION_LENGTH ||
    typeof purchaseId !== 'string' ||
    !PURCHASE_ID_RE.test(purchaseId) ||
    (mode !== 'test' && mode !== 'live')
  ) {
    return fail(400, 'bad_request');
  }

  // The game says which mode it is in (from Vatar.init()). It can't gain anything by lying:
  // a test key only sees test sessions and purchases, a live key only live ones (403 wrong_mode).
  const secret = deps.env[SECRET_ENV[mode]];
  if (typeof secret !== 'string' || !secret.startsWith(SECRET_PREFIX[mode])) {
    log(`${SECRET_ENV[mode]} is not set, or is not a ${SECRET_PREFIX[mode]}… key`);
    return fail(503, 'not_configured');
  }

  // 1. who is asking
  const me = await api(deps, secret, '/session/verify', { session });
  if (me.status !== 200 || !me.data) return upstreamFailure('session/verify', me, log);
  const playerId = me.data.playerId;
  if (typeof playerId !== 'string' || playerId === '' || me.data.mode !== mode) {
    log('session/verify answered without a matching player and mode');
    return fail(403, 'forbidden');
  }

  // 2. is the purchase real, paid, this player's, and something we sell?
  const p = await api(deps, secret, `/purchases/${encodeURIComponent(purchaseId)}`);
  if (p.status !== 200 || !p.data) return upstreamFailure('purchases', p, log);
  const { id, productId, status } = p.data;
  if (id !== purchaseId || (p.data.mode !== undefined && p.data.mode !== mode)) {
    log('purchases answered for a different purchase or mode');
    return fail(403, 'forbidden');
  }
  if (p.data.playerId !== playerId) {
    log(`purchase ${purchaseId} belongs to another player`);
    return fail(403, 'wrong_player');
  }
  if (status === 'refunded') return fail(409, 'refunded');
  if (status !== 'paid' && status !== 'delivered') {
    log(`purchase ${purchaseId} has status ${String(status)}`);
    return fail(409, 'not_paid');
  }
  if (typeof productId !== 'string' || !PRODUCT_IDS.includes(productId)) {
    log(`purchase ${purchaseId} is for unknown product ${String(productId)}: not delivered`);
    return fail(422, 'unknown_product');
  }

  // 3. mark it delivered (safe to repeat), then tell the game to give it
  const d = await api(deps, secret, `/purchases/${encodeURIComponent(purchaseId)}/deliver`, {});
  if (d.status !== 200) return upstreamFailure('deliver', d, log);

  return reply(200, { purchaseId, productId });
}
