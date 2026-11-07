// @ts-check
/**
 * POST /api/claim  (a Vercel Function; .mjs so Vercel runs it as plain ESM with no compile step)
 *
 * Body: { session, purchaseId, mode }  where session comes from Vatar.session() and mode from Vatar.init().
 * 200 { purchaseId, productId }: checked with Vatar and marked delivered, so the game gives it once.
 * Anything else is { error } with a status; see api/_lib/vatarClaim.mjs.
 *
 * Needs the server-side environment variable VATAR_TEST_SECRET (sandbox) and, after approval,
 * VATAR_LIVE_SECRET. Set them in Vercel → Project → Settings → Environment Variables.
 */
import { MAX_BODY_BYTES, claimPurchase } from './_lib/vatarClaim.mjs';

const HEADERS = { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' };

/** @param {Request} request */
export async function POST(request) {
  /** @type {unknown} */
  let input = null;
  try {
    const text = await request.text();
    if (text.length <= MAX_BODY_BYTES) input = JSON.parse(text);
  } catch {
    input = null;
  }
  const { status, body } = await claimPurchase(input, { env: process.env, fetch: globalThis.fetch });
  return new Response(JSON.stringify(body), { status, headers: HEADERS });
}
