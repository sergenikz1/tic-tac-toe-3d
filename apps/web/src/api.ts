import { io, Socket } from 'socket.io-client';
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  PublicUser,
} from '@ttt3d/game-core';
import { getInitData } from './tma.js';

const SERVER_URL = import.meta.env.VITE_SERVER_URL ?? 'http://localhost:3001';
const DEV_AUTH = import.meta.env.VITE_DEV_AUTH === '1';

export type GameSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

export interface AuthResult {
  token: string;
  user: PublicUser;
}

/**
 * Exchange Telegram initData (or a dev identity) for a session token.
 * In dev mode (no Telegram, VITE_DEV_AUTH=1) we mint a random local user so the
 * game can be played from a plain browser.
 */
export async function authenticate(): Promise<AuthResult> {
  const initData = getInitData();
  let body: Record<string, unknown>;
  if (initData) {
    body = { initData };
  } else if (DEV_AUTH) {
    const id = localStorage.getItem('devUserId') ?? String(Math.floor(Math.random() * 1e6));
    localStorage.setItem('devUserId', id);
    body = { dev: { id, firstName: `Player ${id.slice(-3)}` } };
  } else {
    throw new Error('Открой приложение внутри Telegram, чтобы войти.');
  }

  const res = await fetch(`${SERVER_URL}/auth`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error('Не удалось авторизоваться');
  return res.json();
}

export function connectSocket(token: string): GameSocket {
  return io(SERVER_URL, { auth: { token }, transports: ['websocket', 'polling'] });
}

export async function fetchLeaderboard(): Promise<PublicUser[]> {
  const res = await fetch(`${SERVER_URL}/leaderboard`);
  if (!res.ok) return [];
  return res.json();
}
