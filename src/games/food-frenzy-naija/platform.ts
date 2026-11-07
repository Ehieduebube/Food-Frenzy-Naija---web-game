/**
 * Optional hooks into the site or app that hosts the game: the signed-in player, a leaderboard,
 * and pause/resume. The game never calls a platform SDK itself. The host passes an adapter
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
}
