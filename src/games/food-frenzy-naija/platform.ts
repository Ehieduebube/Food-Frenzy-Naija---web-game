/**
 * Optional hooks into the site or app that hosts the game: the signed-in player, a leaderboard,
 * pause/resume and purchases. The game never calls a platform SDK itself. The host passes an adapter
 * (the same way it can pass a ProgressStorage), so the game also runs on its own with no platform.
 */
export interface PlatformPlayer {
  /** Display name shown by the platform. */
  name: string;
  /** 'test' in a developer sandbox, 'live' for real players. */
  mode: 'live' | 'test';
}

export interface LeaderboardRow {
  rank: number;
  name: string;
  score: number;
}

export interface LeaderboardView {
  top: LeaderboardRow[];
  /** The current player's place, or null if they have no score on the board yet. */
  me: { rank: number | null; label: string; score: number } | null;
}

/** A purchase the game's server has checked with the platform and marked delivered. Give it once per purchaseId. */
export interface PurchaseGrant {
  purchaseId: string;
  productId: string;
}

export type BuyFailure =
  | 'unavailable' // not connected to the platform
  | 'payment_failed'
  | 'not_for_sale'
  | 'owned'
  | 'signed_out'
  | 'busy' // a pay sheet is already open
  | 'rate_limited'
  | 'off'
  | 'not_verified' // paid, but the server would not confirm it, so nothing is given
  | 'error';

export type BuyResult =
  /** Checked and delivered: the item has been handed to the game through onGrant. */
  | { status: 'granted' }
  /** Paid, but the check couldn't finish yet. It keeps trying (and again on the next visit); the item arrives through onGrant. */
  | { status: 'pending' }
  /** The player closed the pay sheet. */
  | { status: 'cancelled' }
  | { status: 'failed'; reason: BuyFailure };

export interface GamePlatform {
  /**
   * Connect to the host. Resolves to the signed-in player, or null when the game is running
   * on its own (or the platform is unavailable). Never rejects. Safe to call more than once.
   */
  connect(): Promise<PlatformPlayer | null>;
  /** Report the player's leaderboard score. Fire and forget: the adapter handles rate limits and retries. */
  submitScore(score: number): void;
  /** Rejects if the board can't be loaded right now. */
  leaderboard(): Promise<LeaderboardView>;
  /** The host backgrounded or covered the game: stop sound and timers. Returns an unsubscribe function. */
  onPause(fn: () => void): () => void;
  /** The game is visible and interactive again. Returns an unsubscribe function. */
  onResume(fn: () => void): () => void;
  /** Buy a product on the platform's own pay sheet. Never rejects. */
  buy(productId: string): Promise<BuyResult>;
  /**
   * Purchases checked and delivered by the game's server, including ones restored from an earlier
   * visit. Grants that arrive before anyone listens are kept for the first listener.
   * The game must give each purchaseId only once. Returns an unsubscribe function.
   */
  onGrant(fn: (grant: PurchaseGrant) => void): () => void;
}
