import { SIZE } from './types.js';

/** Flatten a (x, y, h) coordinate into a board index 0..63. */
export function index(x: number, y: number, h: number): number {
  return h * SIZE * SIZE + y * SIZE + x;
}

/** Inflate a board index 0..63 back into (x, y, h). */
export function deindex(i: number): { x: number; y: number; h: number } {
  const x = i % SIZE;
  const y = Math.floor(i / SIZE) % SIZE;
  const h = Math.floor(i / (SIZE * SIZE));
  return { x, y, h };
}

/** Peg index 0..15 from column (x, y). */
export function pegIndex(x: number, y: number): number {
  return y * SIZE + x;
}

const inBounds = (v: number) => v >= 0 && v < SIZE;

/**
 * Generate every winning line in the 4x4x4 cube.
 *
 * A line is 4 collinear cells. We iterate every start cell and every of the 13
 * canonical direction vectors (half of the 26 neighbours, to avoid generating
 * each line twice), keeping only lines that fit entirely inside the cube.
 *
 * For a 4x4x4 board this yields exactly 76 lines, matching Score Four / Qubic:
 *   - 48 axis-aligned  (16 vertical pegs + 16 rows + 16 columns)
 *   - 24 face diagonals (8 within horizontal layers + 16 in vertical planes)
 *   -  4 space diagonals
 */
export function generateLines(): number[][] {
  // 13 canonical directions: for each (dx,dy,dz) in {-1,0,1}^3, take the first
  // of each antipodal pair (skip the zero vector).
  const directions: [number, number, number][] = [];
  for (let dx = -1; dx <= 1; dx++) {
    for (let dy = -1; dy <= 1; dy++) {
      for (let dz = -1; dz <= 1; dz++) {
        if (dx === 0 && dy === 0 && dz === 0) continue;
        // Keep only one direction per antipodal pair.
        if (dx < 0) continue;
        if (dx === 0 && dy < 0) continue;
        if (dx === 0 && dy === 0 && dz < 0) continue;
        directions.push([dx, dy, dz]);
      }
    }
  }

  const lines: number[][] = [];
  for (let x = 0; x < SIZE; x++) {
    for (let y = 0; y < SIZE; y++) {
      for (let h = 0; h < SIZE; h++) {
        for (const [dx, dy, dz] of directions) {
          const ex = x + dx * (SIZE - 1);
          const ey = y + dy * (SIZE - 1);
          const eh = h + dz * (SIZE - 1);
          if (!inBounds(ex) || !inBounds(ey) || !inBounds(eh)) continue;
          const line: number[] = [];
          for (let k = 0; k < SIZE; k++) {
            line.push(index(x + dx * k, y + dy * k, h + dz * k));
          }
          lines.push(line);
        }
      }
    }
  }
  return lines;
}

/** All 76 winning lines, computed once. */
export const LINES: number[][] = generateLines();

/**
 * For each board cell, the list of lines (by their position in LINES) that pass
 * through it. Lets us check only the relevant lines after a single move.
 */
export const LINES_BY_CELL: number[][] = (() => {
  const byCell: number[][] = Array.from({ length: SIZE * SIZE * SIZE }, () => []);
  LINES.forEach((line, li) => {
    for (const cell of line) byCell[cell].push(li);
  });
  return byCell;
})();
