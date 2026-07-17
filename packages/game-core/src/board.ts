import { Color, GameState, Move, SIZE } from './types.js';
import { linesFor, index, pegIndex } from './lines.js';

/** Create a fresh game on an N×N×N board. Black moves first by convention. */
export function createGame(first: Color = 'black', size: number = SIZE): GameState {
  return {
    size,
    board: new Array(size ** 3).fill(null),
    heights: new Array(size * size).fill(0),
    turn: first,
    winner: null,
    winningLine: null,
    draw: false,
    moveCount: 0,
  };
}

/** Is the peg (x, y) within bounds and not yet full (height < size)? */
export function canPlay(state: GameState, move: Move): boolean {
  if (state.winner || state.draw) return false;
  const { x, y } = move;
  const n = state.size;
  if (x < 0 || x >= n || y < 0 || y >= n) return false;
  return state.heights[pegIndex(x, y, n)] < n;
}

export interface ApplyResult {
  state: GameState;
  /** The height at which the bead landed. */
  landedHeight: number;
  /** The board index where the bead landed. */
  landedCell: number;
}

/**
 * Apply a move, returning a NEW state (pure). Throws if the move is illegal.
 * Detects a win or a draw and fills in the relevant fields.
 */
export function applyMove(state: GameState, move: Move): ApplyResult {
  if (!canPlay(state, move)) {
    throw new Error(`Illegal move at (${move.x}, ${move.y})`);
  }
  const n = state.size;
  const { x, y } = move;
  const peg = pegIndex(x, y, n);
  const h = state.heights[peg];
  const cell = index(x, y, h, n);
  const color = state.turn;

  const board = state.board.slice();
  const heights = state.heights.slice();
  board[cell] = color;
  heights[peg] = h + 1;

  const winningLine = findWinThroughCell(board, cell, color, n);
  const moveCount = state.moveCount + 1;
  const winner = winningLine ? color : null;
  const draw = !winner && moveCount === n ** 3;

  const next: GameState = {
    size: n,
    board,
    heights,
    turn: winner ? color : color === 'black' ? 'white' : 'black',
    winner,
    winningLine,
    draw,
    moveCount,
  };
  return { state: next, landedHeight: h, landedCell: cell };
}

/**
 * Check only the lines passing through `cell` for a full line of `color`.
 * Returns the winning line's cell indices, or null.
 */
export function findWinThroughCell(
  board: Array<Color | null>,
  cell: number,
  color: Color,
  size: number = SIZE,
): number[] | null {
  const { lines, byCell } = linesFor(size);
  for (const li of byCell[cell]) {
    const line = lines[li];
    if (line.every((c) => board[c] === color)) return line;
  }
  return null;
}

/** Full-board scan for any winning line (used for validation / loading state). */
export function findAnyWin(
  board: Array<Color | null>,
  size: number = SIZE,
): { color: Color; line: number[] } | null {
  for (const line of linesFor(size).lines) {
    const first = board[line[0]];
    if (first && line.every((c) => board[c] === first)) {
      return { color: first, line };
    }
  }
  return null;
}
