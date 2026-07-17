import { SIZE } from './types.js';

/** Flatten a (x, y, h) coordinate into a board index for an N-cube. */
export function index(x: number, y: number, h: number, size: number = SIZE): number {
  return h * size * size + y * size + x;
}

/** Inflate a board index back into (x, y, h). */
export function deindex(i: number, size: number = SIZE): { x: number; y: number; h: number } {
  const x = i % size;
  const y = Math.floor(i / size) % size;
  const h = Math.floor(i / (size * size));
  return { x, y, h };
}

/** Peg index 0..size²-1 from column (x, y). */
export function pegIndex(x: number, y: number, size: number = SIZE): number {
  return y * size + x;
}

/**
 * Generate every winning line in an N×N×N cube (win = N collinear cells).
 *
 * We iterate every start cell and every of the 13 canonical direction vectors
 * (half of the 26 neighbours, to avoid generating each line twice), keeping
 * only lines that fit entirely inside the cube.
 *
 * Line counts follow ((N+2)³ − N³) / 2:
 *   N=3 → 49,  N=4 → 76 (classic Score Four / Qubic),  N=5 → 109.
 */
export function generateLines(size: number = SIZE): number[][] {
  const inBounds = (v: number) => v >= 0 && v < size;
  const directions: [number, number, number][] = [];
  for (let dx = -1; dx <= 1; dx++) {
    for (let dy = -1; dy <= 1; dy++) {
      for (let dz = -1; dz <= 1; dz++) {
        if (dx === 0 && dy === 0 && dz === 0) continue;
        if (dx < 0) continue;
        if (dx === 0 && dy < 0) continue;
        if (dx === 0 && dy === 0 && dz < 0) continue;
        directions.push([dx, dy, dz]);
      }
    }
  }

  const lines: number[][] = [];
  for (let x = 0; x < size; x++) {
    for (let y = 0; y < size; y++) {
      for (let h = 0; h < size; h++) {
        for (const [dx, dy, dz] of directions) {
          const ex = x + dx * (size - 1);
          const ey = y + dy * (size - 1);
          const eh = h + dz * (size - 1);
          if (!inBounds(ex) || !inBounds(ey) || !inBounds(eh)) continue;
          const line: number[] = [];
          for (let k = 0; k < size; k++) {
            line.push(index(x + dx * k, y + dy * k, h + dz * k, size));
          }
          lines.push(line);
        }
      }
    }
  }
  return lines;
}

export interface LineTables {
  lines: number[][];
  /** For each cell, indices into `lines` of the lines passing through it. */
  byCell: number[][];
}

const cache = new Map<number, LineTables>();

/** Cached line tables for a given board size. */
export function linesFor(size: number = SIZE): LineTables {
  let t = cache.get(size);
  if (!t) {
    const lines = generateLines(size);
    const byCell: number[][] = Array.from({ length: size ** 3 }, () => []);
    lines.forEach((line, li) => {
      for (const cell of line) byCell[cell].push(li);
    });
    t = { lines, byCell };
    cache.set(size, t);
  }
  return t;
}

/** Legacy size-4 tables (used by the online 4×4×4 game). */
export const LINES: number[][] = linesFor(SIZE).lines;
export const LINES_BY_CELL: number[][] = linesFor(SIZE).byCell;
