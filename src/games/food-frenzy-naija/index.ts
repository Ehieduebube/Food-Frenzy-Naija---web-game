/**
 * Food Frenzy Naija - public entry point for the LagosLife Games platform.
 *
 *   import { FoodFrenzyNaija } from './games/food-frenzy-naija';
 *   <FoodFrenzyNaija onExit={() => navigate('/games')} />
 *
 * To sync progress with LagosLife accounts later, pass a `storage` that implements
 * ProgressStorage (read/write of a JSON string), e.g. backed by an API.
 * Pass a `platform` (GamePlatform) for a player name, leaderboard, pause/resume and coin purchases;
 * src/vatar/vatarPlatform.ts is the LagosLife Games (Vatar SDK) adapter.
 */
export { FoodFrenzyNaija, type FoodFrenzyNaijaProps } from './FoodFrenzyNaija';
export type { ProgressStorage } from './progress/storage';
export type { BuyResult, GamePlatform, LeaderboardView, PlatformPlayer, PurchaseGrant } from './platform';
export { localProgressStorage, memoryStorage } from './progress/storage';

export { FOOD_FRENZY_NAIJA_META } from './meta';
