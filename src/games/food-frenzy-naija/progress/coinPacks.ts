/**
 * Coin packs sold through LagosLife Games (Vatar purchases).
 *
 * Each productId must exist in the Vatar dashboard with exactly this id, as a consumable (a player
 * can buy it again). Its name and price are set in the dashboard and shown on LagosLife's own pay
 * sheet: they never come from the game. The game's server only delivers the ids listed in
 * api/_lib/vatarClaim.mjs (PRODUCT_IDS), and a test checks the two lists match.
 */
export interface CoinPack {
  productId: string;
  coins: number;
}

export const COIN_PACKS: readonly CoinPack[] = [
  { productId: 'coins_500', coins: 500 },
  { productId: 'coins_1500', coins: 1500 },
];

export function coinPackFor(productId: string): CoinPack | undefined {
  return COIN_PACKS.find((p) => p.productId === productId);
}
