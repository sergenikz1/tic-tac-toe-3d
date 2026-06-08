/** Board size: 4x4x4 (Score Four / Qubic). */
export const SIZE = 4;

/** Total number of cells in the cube. */
export const CELL_COUNT = SIZE * SIZE * SIZE; // 64

/** Bead colors. `null` means empty cell. */
export type Color = 'black' | 'white';

/** A cell value: a bead color or empty. */
export type CellValue = Color | null;

/** A peg position on the 4x4 base (column). */
export interface Peg {
  x: number; // 0..3
  y: number; // 0..3
}

/** A full cell coordinate including height. */
export interface Coord {
  x: number; // 0..3
  y: number; // 0..3
  h: number; // 0..3  (0 = bottom bead)
}

/** A move: a player drops a bead onto peg (x, y). */
export interface Move {
  x: number;
  y: number;
}

/**
 * Serializable game state. The board is a flat array of 64 cells.
 * Use `index(x, y, h)` to address cells.
 */
export interface GameState {
  /** Flat board of length 64. */
  board: CellValue[];
  /** Per-peg stack heights, length 16 (indexed by y*4 + x). */
  heights: number[];
  /** Whose turn it is. */
  turn: Color;
  /** Winner color, or null if none yet. */
  winner: Color | null;
  /** Cell indices of the winning line, if any. */
  winningLine: number[] | null;
  /** True if the board is full with no winner. */
  draw: boolean;
  /** Number of moves played so far. */
  moveCount: number;
}

/** Edge color markers used to orient the rotatable 3D model and the bottom grid. */
export const EDGE_COLORS = {
  north: '#22c55e', // green
  east: '#ef4444', // red
  south: '#eab308', // yellow
  west: '#3b82f6', // blue
} as const;
