import { create } from 'zustand';
import type { GameSnapshot, Move, PublicUser } from '@ttt3d/game-core';
import { authenticate, connectSocket, GameSocket } from './api.js';
import { haptic } from './tma.js';

export type Screen =
  | 'loading'
  | 'auth-error'
  | 'menu'
  | 'matchmaking'
  | 'game'
  | 'profile'
  | 'rules';

interface AppState {
  screen: Screen;
  user: PublicUser | null;
  authError: string | null;
  socket: GameSocket | null;
  snapshot: GameSnapshot | null;
  searching: boolean;
  rematchOfferBy: string | null;

  init: () => Promise<void>;
  navigate: (screen: Screen) => void;
  joinQueue: () => void;
  leaveQueue: () => void;
  move: (move: Move) => void;
  resign: () => void;
  rematch: () => void;
  refreshProfile: () => void;
}

export const useStore = create<AppState>((set, get) => ({
  screen: 'loading',
  user: null,
  authError: null,
  socket: null,
  snapshot: null,
  searching: false,
  rematchOfferBy: null,

  async init() {
    try {
      const { token, user } = await authenticate();
      const socket = connectSocket(token);

      socket.on('queue:waiting', () => set({ searching: true }));
      socket.on('match:found', (snapshot) => {
        haptic('medium');
        set({ snapshot, searching: false, screen: 'game', rematchOfferBy: null });
      });
      socket.on('game:update', (snapshot) => {
        const prev = get().snapshot;
        if (snapshot.lastMove && (!prev || prev.state.moveCount !== snapshot.state.moveCount)) {
          haptic('light');
        }
        set({ snapshot, screen: 'game' });
      });
      socket.on('rematch:offered', (byUserId) => set({ rematchOfferBy: byUserId }));
      socket.on('game:error', (message) => console.warn('[game:error]', message));

      set({ user, socket, screen: 'menu', authError: null });
    } catch (err) {
      set({ authError: (err as Error).message, screen: 'auth-error' });
    }
  },

  navigate: (screen) => set({ screen }),

  joinQueue() {
    get().socket?.emit('queue:join');
    set({ searching: true, screen: 'matchmaking' });
  },

  leaveQueue() {
    get().socket?.emit('queue:leave');
    set({ searching: false, screen: 'menu' });
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

  refreshProfile() {
    get().socket?.emit('profile:get', (user) => set({ user }));
  },
}));
