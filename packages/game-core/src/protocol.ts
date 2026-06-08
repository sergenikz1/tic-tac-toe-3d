import { Color, GameState, Move } from './types.js';

/** Public profile shape shared with the client. */
export interface PublicUser {
  id: string;
  username: string | null;
  firstName: string | null;
  photoUrl: string | null;
  rating: number;
  wins: number;
  losses: number;
  draws: number;
}

/** Per-move time budget in milliseconds (1 minute). */
export const TURN_MS = 60_000;

/** A player as seen inside a game room. */
export interface RoomPlayer {
  user: PublicUser;
  color: Color;
}

/** Snapshot of a live game pushed to clients. */
export interface GameSnapshot {
  roomId: string;
  state: GameState;
  players: RoomPlayer[];
  /** Epoch ms when the current turn's clock expires. */
  turnDeadline: number;
  /** Remaining clock per color in ms, captured at snapshot time. */
  clocks: Record<Color, number>;
  /** Set when the game is over. */
  ended?: {
    result: 'black' | 'white' | 'draw';
    reason: 'line' | 'timeout' | 'resign';
  };
  /** Describes the last bead placed, for drop animation. */
  lastMove?: { x: number; y: number; h: number; color: Color };
}

/** Result of trying to join a private room by code. */
export interface PrivateJoinResult {
  ok: boolean;
  error?: string;
}

/** Client -> Server events. */
export interface ClientToServerEvents {
  'queue:join': () => void;
  'queue:leave': () => void;
  'game:move': (move: Move) => void;
  'game:resign': () => void;
  'game:rematch': () => void;
  'profile:get': (cb: (user: PublicUser) => void) => void;
  /** Create a private room and receive a short invite code. */
  'private:create': (cb: (code: string) => void) => void;
  /** Join a private room by its invite code. */
  'private:join': (code: string, cb: (res: PrivateJoinResult) => void) => void;
  /** Cancel a pending private room you created. */
  'private:cancel': () => void;
}

/** Server -> Client events. */
export interface ServerToClientEvents {
  'queue:waiting': () => void;
  'match:found': (snapshot: GameSnapshot) => void;
  'game:update': (snapshot: GameSnapshot) => void;
  'game:error': (message: string) => void;
  'rematch:offered': (byUserId: string) => void;
}
