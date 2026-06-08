import { PrismaClient } from '@prisma/client';
import type { PublicUser } from '@ttt3d/game-core';

export const prisma = new PrismaClient();

export interface TelegramProfile {
  telegramId: string;
  username?: string;
  firstName?: string;
  photoUrl?: string;
}

/** Create the user on first login, otherwise refresh mutable profile fields. */
export async function upsertUser(p: TelegramProfile) {
  return prisma.user.upsert({
    where: { telegramId: p.telegramId },
    create: {
      telegramId: p.telegramId,
      username: p.username,
      firstName: p.firstName,
      photoUrl: p.photoUrl,
    },
    update: {
      username: p.username,
      firstName: p.firstName,
      photoUrl: p.photoUrl,
    },
  });
}

export function toPublicUser(u: {
  id: string;
  username: string | null;
  firstName: string | null;
  photoUrl: string | null;
  rating: number;
  wins: number;
  losses: number;
  draws: number;
}): PublicUser {
  return {
    id: u.id,
    username: u.username,
    firstName: u.firstName,
    photoUrl: u.photoUrl,
    rating: u.rating,
    wins: u.wins,
    losses: u.losses,
    draws: u.draws,
  };
}

export async function getPublicUser(id: string): Promise<PublicUser | null> {
  const u = await prisma.user.findUnique({ where: { id } });
  return u ? toPublicUser(u) : null;
}

/** Standard Elo update with K=32. */
function elo(ra: number, rb: number, scoreA: number): [number, number] {
  const ea = 1 / (1 + 10 ** ((rb - ra) / 400));
  const eb = 1 - ea;
  const K = 32;
  const na = Math.round(ra + K * (scoreA - ea));
  const nb = Math.round(rb + K * (1 - scoreA - eb));
  return [na, nb];
}

export interface RecordMatchInput {
  player1Id: string;
  player2Id: string;
  result: 'p1' | 'p2' | 'draw';
  reason: 'line' | 'timeout' | 'resign';
  moves: { x: number; y: number }[];
}

/** Persist a finished match and update both players' rating / W-L-D. */
export async function recordMatch(input: RecordMatchInput) {
  const [p1, p2] = await Promise.all([
    prisma.user.findUnique({ where: { id: input.player1Id } }),
    prisma.user.findUnique({ where: { id: input.player2Id } }),
  ]);
  if (!p1 || !p2) return;

  const scoreP1 = input.result === 'p1' ? 1 : input.result === 'p2' ? 0 : 0.5;
  const [r1, r2] = elo(p1.rating, p2.rating, scoreP1);
  const winnerId =
    input.result === 'p1' ? p1.id : input.result === 'p2' ? p2.id : null;

  await prisma.$transaction([
    prisma.match.create({
      data: {
        player1Id: p1.id,
        player2Id: p2.id,
        winnerId,
        result: input.result,
        reason: input.reason,
        moves: JSON.stringify(input.moves),
        endedAt: new Date(),
      },
    }),
    prisma.user.update({
      where: { id: p1.id },
      data: {
        rating: r1,
        wins: { increment: input.result === 'p1' ? 1 : 0 },
        losses: { increment: input.result === 'p2' ? 1 : 0 },
        draws: { increment: input.result === 'draw' ? 1 : 0 },
      },
    }),
    prisma.user.update({
      where: { id: p2.id },
      data: {
        rating: r2,
        wins: { increment: input.result === 'p2' ? 1 : 0 },
        losses: { increment: input.result === 'p1' ? 1 : 0 },
        draws: { increment: input.result === 'draw' ? 1 : 0 },
      },
    }),
  ]);
}
