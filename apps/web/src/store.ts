import { create } from 'zustand';
import type { GameSnapshot, Move, PublicUser } from '@ttt3d/game-core';
import type { GameSocket } from './api.js';

export type Screen =
  | 'menu'
  | 'solo-select'
  | 'solo'
  | 'rules'
  // Online screens are kept for the future multiplayer build; Telegram auth is
  // currently disabled, so they are not reachable from the menu.
  | 'loading'
  | 'auth-error'
  | 'matchmaking'
  | 'game'
  | 'profile'
  | 'friend';

export type BoardSize = 3 | 4 | 5;

interface AppState {
  screen: Screen;
  user: PublicUser | null;
  authError: string | null;
  socket: GameSocket | null;
  snapshot: GameSnapshot | null;
  searching: boolean;
  rematchOfferBy: string | null;
  inviteCode: string | null;
  privateError: string | null;
  privateJoining: boolean;
  /** Board size for the next solo game (3 = easy, 4 = classic, 5 = hard). */
  soloSize: BoardSize;

  init: () => Promise<void>;
  navigate: (screen: Screen) => void;
  setSoloSize: (size: BoardSize) => void;
  joinQueue: () => void;
  leaveQueue: () => void;
  move: (move: Move) => void;
  resign: () => void;
  rematch: () => void;
  refreshProfile: () => void;
  createPrivate: () => void;
  joinPrivate: (code: string) => void;
  cancelPrivate: () => void;
}

/**
 * Telegram auth is disabled for now: the app boots straight into the menu and
 * only the offline solo mode is exposed. The online actions below are inert
 * stubs so the multiplayer screens keep compiling until auth returns.
 */
export const useStore = create<AppState>((set, get) => ({
  screen: 'menu',
  user: null,
  authError: null,
  socket: null,
  snapshot: null,
  searching: false,
  rematchOfferBy: null,
  inviteCode: null,
  privateError: null,
  privateJoining: false,
  soloSize: 4,

  async init() {
    set({ screen: 'menu' });
  },

  navigate: (screen) => set({ screen }),
  setSoloSize: (size) => set({ soloSize: size }),

  joinQueue() {},
  leaveQueue() {
    set({ screen: 'menu' });
  },
  move(move) {
    get().socket?.emit('game:move', move);
  },
  resign() {
    get().socket?.emit('game:resign');
  },
  rematch() {
    get().socket?.emit('game:rematch');
  },
  refreshProfile() {},
  createPrivate() {},
  joinPrivate() {},
  cancelPrivate() {
    set({ screen: 'menu' });
  },
}));
