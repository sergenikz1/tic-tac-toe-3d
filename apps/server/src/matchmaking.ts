import { PublicUser } from '@ttt3d/game-core';

export interface QueueEntry {
  user: PublicUser;
  socketId: string;
}

/**
 * Trivial FIFO matchmaking queue. A real ranked system would bucket by rating;
 * for now the first two distinct users waiting are paired.
 */
export class Matchmaker {
  private queue: QueueEntry[] = [];

  /** Add a user to the queue and return an opponent if one is available. */
  enqueue(entry: QueueEntry): QueueEntry | null {
    // Drop any stale entry for the same user (e.g. reconnect / double tap).
    this.remove(entry.user.id);
    const opponent = this.queue.find((e) => e.user.id !== entry.user.id);
    if (opponent) {
      this.queue = this.queue.filter((e) => e.socketId !== opponent.socketId);
      return opponent;
    }
    this.queue.push(entry);
    return null;
  }

  /** Remove a user from the queue (by user id). */
  remove(userId: string) {
    this.queue = this.queue.filter((e) => e.user.id !== userId);
  }

  /** Remove by socket id (on disconnect). */
  removeSocket(socketId: string) {
    this.queue = this.queue.filter((e) => e.socketId !== socketId);
  }

  has(userId: string): boolean {
    return this.queue.some((e) => e.user.id === userId);
  }
}
