import { PublicUser } from '@ttt3d/game-core';

export interface QueueEntry {
  user: PublicUser;
  socketId: string;
  /** When the player entered the queue (for widening the rating window). */
  since: number;
}

/** Generate a short, unambiguous invite code (no easily-confused characters). */
function makeCode(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return code;
}

/**
 * Rating-based matchmaking with a tolerance window that widens the longer a
 * player waits, plus private invite rooms joined by a short code.
 */
export class Matchmaker {
  private queue: QueueEntry[] = [];
  /** code -> waiting host of a private room */
  private privateRooms = new Map<string, QueueEntry>();

  /**
   * Add a user to the public queue and return the best available opponent,
   * or null if none is acceptable yet.
   */
  enqueue(entry: Omit<QueueEntry, 'since'>): QueueEntry | null {
    this.remove(entry.user.id); // drop stale entry (reconnect / double tap)
    const full: QueueEntry = { ...entry, since: Date.now() };

    let best: QueueEntry | null = null;
    let bestDiff = Infinity;
    for (const other of this.queue) {
      if (other.user.id === full.user.id) continue;
      const diff = Math.abs(other.user.rating - full.user.rating);
      if (diff < bestDiff && diff <= acceptableWindow(other, full)) {
        best = other;
        bestDiff = diff;
      }
    }

    if (best) {
      this.queue = this.queue.filter((e) => e.socketId !== best!.socketId);
      return best;
    }
    this.queue.push(full);
    return null;
  }

  /** Remove a user from the public queue (by user id). */
  remove(userId: string) {
    this.queue = this.queue.filter((e) => e.user.id !== userId);
  }

  /** Remove from queue and any pending private room (on disconnect). */
  removeSocket(socketId: string) {
    this.queue = this.queue.filter((e) => e.socketId !== socketId);
    for (const [code, host] of this.privateRooms) {
      if (host.socketId === socketId) this.privateRooms.delete(code);
    }
  }

  has(userId: string): boolean {
    return this.queue.some((e) => e.user.id === userId);
  }

  // ----- Private invite rooms -----

  /** Create a private room for `host` and return its invite code. */
  createPrivate(host: Omit<QueueEntry, 'since'>): string {
    this.cancelPrivateByUser(host.user.id);
    let code = makeCode();
    while (this.privateRooms.has(code)) code = makeCode();
    this.privateRooms.set(code, { ...host, since: Date.now() });
    return code;
  }

  /** Join a private room by code; returns the host entry or null if invalid. */
  joinPrivate(code: string, userId: string): QueueEntry | null {
    const host = this.privateRooms.get(code.toUpperCase());
    if (!host) return null;
    if (host.user.id === userId) return null; // can't join your own room
    this.privateRooms.delete(code.toUpperCase());
    return host;
  }

  cancelPrivateByUser(userId: string) {
    for (const [code, host] of this.privateRooms) {
      if (host.user.id === userId) this.privateRooms.delete(code);
    }
  }
}

/**
 * Acceptable rating gap grows by 100 every 5s of waiting (by the longer-waiting
 * player), starting at 100, so isolated players still get matched eventually.
 */
function acceptableWindow(a: QueueEntry, b: QueueEntry): number {
  const waitedMs = Date.now() - Math.min(a.since, b.since);
  return 100 + Math.floor(waitedMs / 5000) * 100;
}
