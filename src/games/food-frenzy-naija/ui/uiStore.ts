import { create } from 'zustand';
import type { GamePlatform, PlatformPlayer } from '../platform';

export type Screen =
  | { id: 'menu' }
  | { id: 'map'; focus?: number }
  | { id: 'play'; levelId: number }
  | { id: 'challenge' }
  | { id: 'playChallenge'; dateKey: string }
  | { id: 'shop' }
  | { id: 'achievements' };

export type Overlay = null | 'settings' | 'daily' | 'leaderboard';

export interface Toast {
  id: number;
  title: string;
  body?: string;
  icon?: 'trophy' | 'coin' | 'gift' | 'info';
}

interface UiState {
  screen: Screen;
  overlay: Overlay;
  toasts: Toast[];
  /** The daily-reward popup opens by itself at most once per session. */
  dailyPrompted: boolean;
  /** Provided by the host platform: leave the game. */
  exitToHost: (() => void) | null;
  /** Set once the host platform has connected (leaderboard available). Null when playing on its own. */
  platform: GamePlatform | null;
  player: PlatformPlayer | null;
  /** The host paused the game (app in the background, a sheet over the game). */
  hostPaused: boolean;
  go(screen: Screen): void;
  open(overlay: Overlay): void;
  close(): void;
  toast(t: Omit<Toast, 'id'>): void;
  dismissToast(id: number): void;
  setDailyPrompted(): void;
  setExit(fn: (() => void) | null): void;
  setPlatform(platform: GamePlatform | null, player: PlatformPlayer | null): void;
  setHostPaused(paused: boolean): void;
}

let toastId = 0;

export const useUi = create<UiState>((set, get) => ({
  screen: { id: 'menu' },
  overlay: null,
  toasts: [],
  dailyPrompted: false,
  exitToHost: null,
  platform: null,
  player: null,
  hostPaused: false,
  go: (screen) => set({ screen, overlay: null }),
  open: (overlay) => set({ overlay }),
  close: () => set({ overlay: null }),
  toast: (t) => {
    const id = ++toastId;
    set({ toasts: [...get().toasts.slice(-2), { ...t, id }] });
    setTimeout(() => get().dismissToast(id), 3600);
  },
  dismissToast: (id) => set({ toasts: get().toasts.filter((t) => t.id !== id) }),
  setDailyPrompted: () => set({ dailyPrompted: true }),
  setExit: (fn) => set({ exitToHost: fn }),
  setPlatform: (platform, player) => set({ platform, player, overlay: !player && get().overlay === 'leaderboard' ? null : get().overlay }),
  setHostPaused: (paused) => set({ hostPaused: paused }),
}));
