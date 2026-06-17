import type { PublicUser } from '@ttt3d/game-core';
import { config } from './config.js';

/** Directus collection names. */
export const PLAYERS = 'players';
export const MATCHES = 'matches';

export interface TelegramProfile {
  telegramId: string;
  username?: string;
  firstName?: string;
  photoUrl?: string;
}

/** Raw Directus row for a player (snake_case as stored in the collection). */
interface RawPlayer {
  id: number | string;
  telegram_id: string;
  username: string | null;
  first_name: string | null;
  photo_url: string | null;
  rating: number;
  wins: number;
  losses: number;
  draws: number;
}

/**
 * Minimal Directus REST helper. The server authenticates with a static admin
 * token; the web client never talks to Directus directly.
 */
export async function directus<T = any>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${config.directusUrl}/${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.directusToken}`,
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Directus ${init?.method ?? 'GET'} /${path} -> ${res.status} ${body}`);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

/** Map a raw Directus player row to the camelCase shape shared with the client. */
export function toPublicUser(r: RawPlayer): PublicUser {
  return {
    id: String(r.id),
    username: r.username,
    firstName: r.first_name,
    photoUrl: r.photo_url,
    rating: r.rating,
    wins: r.wins,
    losses: r.losses,
    draws: r.draws,
  };
}

/** Create the player on first login, otherwise refresh mutable profile fields. */
export async function upsertUser(p: TelegramProfile): Promise<PublicUser> {
  const found = await directus<{ data: RawPlayer[] }>(
    `items/${PLAYERS}?filter[telegram_id][_eq]=${encodeURIComponent(p.telegramId)}&limit=1`,
  );
  const existing = found.data?.[0];

  if (existing) {
    const updated = await directus<{ data: RawPlayer }>(`items/${PLAYERS}/${existing.id}`, {
      method: 'PATCH',
      body: JSON.stringify({
        username: p.username ?? null,
        first_name: p.firstName ?? null,
        photo_url: p.photoUrl ?? null,
      }),
    });
    return toPublicUser(updated.data);
  }

  const created = await directus<{ data: RawPlayer }>(`items/${PLAYERS}`, {
    method: 'POST',
    body: JSON.stringify({
      telegram_id: p.telegramId,
      username: p.username ?? null,
      first_name: p.firstName ?? null,
      photo_url: p.photoUrl ?? null,
      rating: 1000,
      wins: 0,
      losses: 0,
      draws: 0,
    }),
  });
  return toPublicUser(created.data);
}

export async function getPublicUser(id: string): Promise<PublicUser | null> {
  try {
    const r = await directus<{ data: RawPlayer }>(`items/${PLAYERS}/${id}`);
    return r.data ? toPublicUser(r.data) : null;
  } catch {
    return null;
  }
}

export async function getLeaderboard(limit = 20): Promise<PublicUser[]> {
  const r = await directus<{ data: RawPlayer[] }>(
    `items/${PLAYERS}?sort=-rating&limit=${limit}`,
  );
  return (r.data ?? []).map(toPublicUser);
}

/** Standard Elo update with K=32. */
function elo(ra: number, rb: number, scoreA: number): [number, number] {
  const ea = 1 / (1 + 10 ** ((rb - ra) / 400));
  const eb = 1 - ea;
  const K = 32;
  return [Math.round(ra + K * (scoreA - ea)), Math.round(rb + K * (1 - scoreA - eb))];
}

export interface RecordMatchInput {
  player1Id: string;
  player2Id: string;
  result: 'p1' | 'p2' | 'draw';
  reason: 'line' | 'timeout' | 'resign';
  moves: { x: number; y: number }[];
}

/** Persist a finished match and update both players' rating / W-L-D. */
export async function recordMatch(input: RecordMatchInput): Promise<void> {
  const [p1, p2] = await Promise.all([
    getPublicUser(input.player1Id),
    getPublicUser(input.player2Id),
  ]);
  if (!p1 || !p2) return;

  const scoreP1 = input.result === 'p1' ? 1 : input.result === 'p2' ? 0 : 0.5;
  const [r1, r2] = elo(p1.rating, p2.rating, scoreP1);
  const winnerId =
    input.result === 'p1' ? p1.id : input.result === 'p2' ? p2.id : null;

  await directus(`items/${MATCHES}`, {
    method: 'POST',
    body: JSON.stringify({
      player1_id: p1.id,
      player2_id: p2.id,
      winner_id: winnerId,
      result: input.result,
      reason: input.reason,
      moves: JSON.stringify(input.moves),
      ended_at: new Date().toISOString(),
    }),
  });

  await Promise.all([
    directus(`items/${PLAYERS}/${p1.id}`, {
      method: 'PATCH',
      body: JSON.stringify({
        rating: r1,
        wins: p1.wins + (input.result === 'p1' ? 1 : 0),
        losses: p1.losses + (input.result === 'p2' ? 1 : 0),
        draws: p1.draws + (input.result === 'draw' ? 1 : 0),
      }),
    }),
    directus(`items/${PLAYERS}/${p2.id}`, {
      method: 'PATCH',
      body: JSON.stringify({
        rating: r2,
        wins: p2.wins + (input.result === 'p2' ? 1 : 0),
        losses: p2.losses + (input.result === 'p1' ? 1 : 0),
        draws: p2.draws + (input.result === 'draw' ? 1 : 0),
      }),
    }),
  ]);
}
