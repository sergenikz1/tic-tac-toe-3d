import {
  applyMove,
  canPlay,
  createGame,
  GameSnapshot,
  GameState,
  Move,
  PublicUser,
  RoomPlayer,
  TURN_MS,
  Color,
} from '@ttt3d/game-core';
import { recordMatch } from './db.js';

let roomSeq = 0;

export interface RoomEndInfo {
  result: 'black' | 'white' | 'draw';
  reason: 'line' | 'timeout' | 'resign';
}

/**
 * One live match. Owns the authoritative game state and the per-move clocks,
 * and is the single source of truth for win / timeout decisions.
 */
export class GameRoom {
  readonly id: string;
  readonly players: RoomPlayer[];
  state: GameState;
  private clocks: Record<Color, number> = { black: TURN_MS, white: TURN_MS };
  private turnStart = Date.now();
  private timer: NodeJS.Timeout | null = null;
  private moves: Move[] = [];
  private ended: RoomEndInfo | null = null;
  private lastMove?: GameSnapshot['lastMove'];
  /** userId that has offered a rematch, if any. */
  rematchOfferBy: string | null = null;

  constructor(
    a: { user: PublicUser },
    b: { user: PublicUser },
    private emit: (snapshot: GameSnapshot) => void,
  ) {
    this.id = `room-${++roomSeq}`;
    // Randomize who plays black (moves first).
    const blackFirst = Math.random() < 0.5;
    this.players = [
      { user: a.user, color: blackFirst ? 'black' : 'white' },
      { user: b.user, color: blackFirst ? 'white' : 'black' },
    ];
    this.state = createGame('black');
    this.startTurnTimer();
  }

  hasPlayer(userId: string): boolean {
    return this.players.some((p) => p.user.id === userId);
  }

  colorOf(userId: string): Color | null {
    return this.players.find((p) => p.user.id === userId)?.color ?? null;
  }

  private startTurnTimer() {
    this.clearTimer();
    this.turnStart = Date.now();
    const remaining = this.clocks[this.state.turn];
    this.timer = setTimeout(() => this.onTimeout(), remaining);
  }

  private clearTimer() {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  private get turnDeadline(): number {
    return this.turnStart + this.clocks[this.state.turn];
  }

  /** Capture the live clocks (deducting the time the current player has used). */
  private liveClocks(): Record<Color, number> {
    const used = Date.now() - this.turnStart;
    const turn = this.state.turn;
    return {
      black: turn === 'black' ? Math.max(0, this.clocks.black - used) : this.clocks.black,
      white: turn === 'white' ? Math.max(0, this.clocks.white - used) : this.clocks.white,
    };
  }

  snapshot(): GameSnapshot {
    return {
      roomId: this.id,
      state: this.state,
      players: this.players,
      turnDeadline: this.turnDeadline,
      clocks: this.liveClocks(),
      lastMove: this.lastMove,
      ended: this.ended ?? undefined,
    };
  }

  private broadcast() {
    this.emit(this.snapshot());
  }

  /** Apply a move from `userId`. Returns an error message, or null on success. */
  move(userId: string, move: Move): string | null {
    if (this.ended) return 'Game is already over';
    const color = this.colorOf(userId);
    if (!color) return 'Not a player in this room';
    if (color !== this.state.turn) return 'Not your turn';
    if (!canPlay(this.state, move)) return 'Illegal move';

    // Reset the per-move budget to a fresh minute each turn.
    this.clocks[this.state.turn] = TURN_MS;

    const { state, landedHeight } = applyMove(this.state, move);
    this.state = state;
    this.moves.push(move);
    this.lastMove = { x: move.x, y: move.y, h: landedHeight, color };

    if (state.winner) {
      this.finish({ result: state.winner, reason: 'line' });
    } else if (state.draw) {
      this.finish({ result: 'draw', reason: 'line' });
    } else {
      this.startTurnTimer();
      this.broadcast();
    }
    return null;
  }

  resign(userId: string) {
    if (this.ended) return;
    const color = this.colorOf(userId);
    if (!color) return;
    const winner: Color = color === 'black' ? 'white' : 'black';
    this.finish({ result: winner, reason: 'resign' });
  }

  private onTimeout() {
    if (this.ended) return;
    // The player on the clock ran out; the opponent wins.
    const loser = this.state.turn;
    const winner: Color = loser === 'black' ? 'white' : 'black';
    this.finish({ result: winner, reason: 'timeout' });
  }

  private finish(info: RoomEndInfo) {
    this.clearTimer();
    this.ended = info;
    this.broadcast();

    const p1 = this.players[0];
    const p2 = this.players[1];
    const result: 'p1' | 'p2' | 'draw' =
      info.result === 'draw' ? 'draw' : info.result === p1.color ? 'p1' : 'p2';
    void recordMatch({
      player1Id: p1.user.id,
      player2Id: p2.user.id,
      result,
      reason: info.reason,
      moves: this.moves,
    });
  }

  isOver(): boolean {
    return this.ended !== null;
  }

  /** Re-send the current snapshot to a (re)connecting client. */
  resend() {
    this.broadcast();
  }

  dispose() {
    this.clearTimer();
  }
}
