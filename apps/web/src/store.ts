import { create } from 'zustand';
import type { GameSnapshot, Move, PublicUser } from '@ttt3d/game-core';
import { authenticate, connectSocket, GameSocket } from './api.js';
import { haptic, getStartParam } from './tma.js';

export type Screen =
  | 'loading'
  | 'auth-error'
  | 'menu'
  | 'matchmaking'
  | 'game'
  | 'profile'
  | 'rules'
  | 'friend'
  | 'solo';

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

  init: () => Promise<void>;
  navigate: (screen: Screen) => void;
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

export const useStore = create<AppState>((set, get) => ({
  screen: 'loading',
  user: null,
  authError: null,
  socket: null,
  snapshot: null,
  searching: false,
  rematchOfferBy: null,
  inviteCode: null,
  privateError: null,
  privateJoining: false,

  async init() {
    try {
      const { token, user } = await authenticate();
      const socket = connectSocket(token);

      socket.on('queue:waiting', () => set({ searching: true }));
      socket.on('match:found', (snapshot) => {
        haptic('medium');
        set({
          snapshot,
          searching: false,
          screen: 'game',
          rematchOfferBy: null,
          inviteCode: null,
          privateError: null,
          privateJoining: false,
        });
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

      // If opened via an invite deep link, jump straight into that room.
      const startCode = getStartParam();
      if (startCode) {
        set({ screen: 'friend' });
        get().joinPrivate(startCode);
      }
    } catch (err) {
      // No server / no Telegram: still open the menu in offline mode so the
      // solo game (and the Android build) works. Online buttons show the error.
      set({ authError: (err as Error).message, screen: 'menu' });
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

  createPrivate() {
    set({ screen: 'friend', privateError: null, inviteCode: null });
    get().socket?.emit('private:create', (code) => set({ inviteCode: code }));
  },

  joinPrivate(code) {
    const clean = code.trim().toUpperCase();
    if (!clean) return;
    set({ privateJoining: true, privateError: null });
    get().socket?.emit('private:join', clean, (res) => {
      // On success, the 'match:found' handler switches to the game screen.
      if (!res.ok) set({ privateError: res.error ?? 'Не удалось войти', privateJoining: false });
    });
  },

  cancelPrivate() {
    get().socket?.emit('private:cancel');
    set({ inviteCode: null, privateError: null, privateJoining: false, screen: 'menu' });
  },
}));
