import { describe, expect, it } from 'vitest';
import { LINES, generateLines, index, deindex, pegIndex } from './lines.js';
import { applyMove, canPlay, createGame, findAnyWin } from './board.js';
import { Move, SIZE } from './types.js';

describe('line generation', () => {
  it('produces exactly 76 winning lines (Score Four / Qubic)', () => {
    expect(generateLines()).toHaveLength(76);
    expect(LINES).toHaveLength(76);
  });

  it('every line has 4 distinct in-bounds cells', () => {
    for (const line of LINES) {
      expect(line).toHaveLength(4);
      expect(new Set(line).size).toBe(4);
      for (const c of line) {
        expect(c).toBeGreaterThanOrEqual(0);
        expect(c).toBeLessThan(64);
      }
    }
  });

  it('has no duplicate lines', () => {
    const keys = LINES.map((l) => [...l].sort((a, b) => a - b).join(','));
    expect(new Set(keys).size).toBe(76);
  });

  it('breaks down into the expected categories', () => {
    let verticals = 0; // A: same peg, varying h
    let rowsCols = 0; // B: same layer, axis-aligned
    let layerDiag = 0; // C: same layer, diagonal
    let vertPlaneDiag = 0; // D: diagonal across layers in a vertical plane
    let spaceDiag = 0; // E: full 3D diagonal

    for (const line of LINES) {
      const cs = line.map(deindex);
      const dh = cs[3].h - cs[0].h;
      const dx = cs[3].x - cs[0].x;
      const dy = cs[3].y - cs[0].y;
      const movesX = dx !== 0;
      const movesY = dy !== 0;
      const movesH = dh !== 0;

      if (movesH && !movesX && !movesY) verticals++;
      else if (!movesH && (movesX !== movesY)) rowsCols++;
      else if (!movesH && movesX && movesY) layerDiag++;
      else if (movesH && movesX && movesY) spaceDiag++;
      else if (movesH && (movesX !== movesY)) vertPlaneDiag++;
    }

    expect(verticals).toBe(16);
    expect(rowsCols).toBe(32);
    expect(layerDiag).toBe(8);
    expect(vertPlaneDiag).toBe(16);
    expect(spaceDiag).toBe(4);
    expect(verticals + rowsCols + layerDiag + vertPlaneDiag + spaceDiag).toBe(76);
  });
});

describe('index helpers', () => {
  it('round-trips index/deindex', () => {
    for (let i = 0; i < 64; i++) {
      const { x, y, h } = deindex(i);
      expect(index(x, y, h)).toBe(i);
    }
  });
});

/** Play an explicit sequence of pegs, alternating colors (black first). */
function play(moves: Move[]) {
  let state = createGame('black');
  for (const m of moves) {
    state = applyMove(state, m).state;
  }
  return state;
}

describe('win detection by category', () => {
  it('A: vertical — 4 beads on one peg', () => {
    // Black plays peg (0,0) four times; white plays elsewhere in between.
    const state = play([
      { x: 0, y: 0 }, { x: 1, y: 0 },
      { x: 0, y: 0 }, { x: 1, y: 0 },
      { x: 0, y: 0 }, { x: 1, y: 0 },
      { x: 0, y: 0 },
    ]);
    expect(state.winner).toBe('black');
    expect(state.winningLine).toEqual([
      index(0, 0, 0), index(0, 0, 1), index(0, 0, 2), index(0, 0, 3),
    ]);
  });

  it('B: row on the bottom layer', () => {
    // Black fills (0..3, 0) at h=0; white stacks on peg (0,1).
    const state = play([
      { x: 0, y: 0 }, { x: 0, y: 1 },
      { x: 1, y: 0 }, { x: 0, y: 1 },
      { x: 2, y: 0 }, { x: 0, y: 1 },
      { x: 3, y: 0 },
    ]);
    expect(state.winner).toBe('black');
    expect(state.winningLine).toEqual([
      index(0, 0, 0), index(1, 0, 0), index(2, 0, 0), index(3, 0, 0),
    ]);
  });

  it('C: diagonal within the bottom layer', () => {
    const state = play([
      { x: 0, y: 0 }, { x: 0, y: 3 },
      { x: 1, y: 1 }, { x: 0, y: 3 },
      { x: 2, y: 2 }, { x: 0, y: 3 },
      { x: 3, y: 3 },
    ]);
    expect(state.winner).toBe('black');
    expect(state.winningLine).toEqual([
      index(0, 0, 0), index(1, 1, 0), index(2, 2, 0), index(3, 3, 0),
    ]);
  });

  it('D: diagonal across layers in a vertical plane', () => {
    // Win along x and h with y fixed at 0: cells (0,0,0)(1,0,1)(2,0,2)(3,0,3).
    // To place black at increasing heights we build up the lower beads first.
    const state = play([
      // h=0 layer prep so black can reach the needed heights
      { x: 0, y: 0 }, { x: 1, y: 0 }, // B(0,0,0)  W(1,0,0)
      { x: 1, y: 0 }, { x: 2, y: 0 }, // B(1,0,1)  W(2,0,0)
      { x: 2, y: 0 }, { x: 3, y: 0 }, // B(2,0,1)  W(3,0,0)
      { x: 2, y: 0 }, { x: 3, y: 0 }, // B(2,0,2)  W(3,0,1)
      { x: 3, y: 0 }, { x: 0, y: 1 }, // B(3,0,2)  W(0,1,0)
      { x: 3, y: 0 },                 // B(3,0,3)  -> line (0,0,0)(1,0,1)(2,0,2)(3,0,3)
    ]);
    expect(state.winner).toBe('black');
    expect(state.winningLine).toEqual([
      index(0, 0, 0), index(1, 0, 1), index(2, 0, 2), index(3, 0, 3),
    ]);
  });

  it('E: space diagonal corner-to-corner', () => {
    // Target cells (0,0,0)(1,1,1)(2,2,2)(3,3,3).
    const state = play([
      { x: 0, y: 0 }, { x: 1, y: 1 }, // B(0,0,0) W(1,1,0)
      { x: 1, y: 1 }, { x: 2, y: 2 }, // B(1,1,1) W(2,2,0)
      { x: 2, y: 2 }, { x: 3, y: 3 }, // B(2,2,1) W(3,3,0)
      { x: 2, y: 2 }, { x: 3, y: 3 }, // B(2,2,2) W(3,3,1)
      { x: 3, y: 3 }, { x: 0, y: 1 }, // B(3,3,2) W(0,1,0)
      { x: 3, y: 3 },                 // B(3,3,3) -> space diagonal
    ]);
    expect(state.winner).toBe('black');
    expect(state.winningLine).toEqual([
      index(0, 0, 0), index(1, 1, 1), index(2, 2, 2), index(3, 3, 3),
    ]);
  });
});

describe('rules', () => {
  it('rejects moves on a full peg (height === 4)', () => {
    let state = createGame('black');
    // Stack mixed colors on peg (0,0) so it fills (B,W,B,W) without a vertical win.
    const seq: Move[] = [
      { x: 0, y: 0 }, { x: 0, y: 0 },
      { x: 0, y: 0 }, { x: 0, y: 0 },
    ];
    for (const m of seq) state = applyMove(state, m).state;
    expect(state.heights[pegIndex(0, 0)]).toBe(SIZE);
    expect(canPlay(state, { x: 0, y: 0 })).toBe(false);
    expect(() => applyMove(state, { x: 0, y: 0 })).toThrow();
  });

  it('no win on an empty/partial board', () => {
    const state = play([{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 0 }]);
    expect(state.winner).toBeNull();
    expect(findAnyWin(state.board)).toBeNull();
  });

  it('alternates turns starting with black', () => {
    let state = createGame('black');
    expect(state.turn).toBe('black');
    state = applyMove(state, { x: 0, y: 0 }).state;
    expect(state.turn).toBe('white');
    state = applyMove(state, { x: 1, y: 0 }).state;
    expect(state.turn).toBe('black');
  });
});
