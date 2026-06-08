import { CELL_COUNT, Color, GameState, Move, SIZE } from './types.js';
import { LINES, LINES_BY_CELL, index, pegIndex } from './lines.js';

/** Create a fresh game. Black moves first by convention. */
export function createGame(first: Color = 'black'): GameState {
  return {
    board: new Array(CELL_COUNT).fill(null),
    heights: new Array(SIZE * SIZE).fill(0),
    turn: first,
    winner: null,
    winningLine: null,
    draw: false,
    moveCount: 0,
  };
}

/** Is the peg (x, y) within bounds and not yet full (height < 4)? */
export function canPlay(state: GameState, move: Move): boolean {
  if (state.winner || state.draw) return false;
  const { x, y } = move;
  if (x < 0 || x >= SIZE || y < 0 || y >= SIZE) return false;
  return state.heights[pegIndex(x, y)] < SIZE;
}

export interface ApplyResult {
  state: GameState;
  /** The height at which the bead landed (0..3). */
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
  const { x, y } = move;
  const peg = pegIndex(x, y);
  const h = state.heights[peg];
  const cell = index(x, y, h);
  const color = state.turn;

  const board = state.board.slice();
  const heights = state.heights.slice();
  board[cell] = color;
  heights[peg] = h + 1;

  const winningLine = findWinThroughCell(board, cell, color);
  const moveCount = state.moveCount + 1;
  const winner = winningLine ? color : null;
  const draw = !winner && moveCount === CELL_COUNT;

  const next: GameState = {
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
 * Check only the lines passing through `cell` for four of `color`.
 * Returns the winning line's cell indices, or null.
 */
export function findWinThroughCell(
  board: Array<Color | null>,
  cell: number,
  color: Color,
): number[] | null {
  for (const li of LINES_BY_CELL[cell]) {
    const line = LINES[li];
    if (line.every((c) => board[c] === color)) return line;
  }
  return null;
}

/** Full-board scan for any winning line (used for validation / loading state). */
export function findAnyWin(board: Array<Color | null>): { color: Color; line: number[] } | null {
  for (const line of LINES) {
    const first = board[line[0]];
    if (first && line.every((c) => board[c] === first)) {
      return { color: first, line };
    }
  }
  return null;
}
