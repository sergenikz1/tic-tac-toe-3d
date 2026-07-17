import {
  applyMove,
  GameState,
  linesFor,
  Move,
  pegIndex,
  index,
  type Color,
} from '@ttt3d/game-core';

/** All currently legal moves (pegs that are not full). */
function legalMoves(state: GameState): Move[] {
  const n = state.size;
  const moves: Move[] = [];
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      if (state.heights[pegIndex(x, y, n)] < n) moves.push({ x, y });
    }
  }
  return moves;
}

/** Would `color` win by playing `move` right now? */
function winsImmediately(state: GameState, move: Move, color: Color): boolean {
  const n = state.size;
  const { lines, byCell } = linesFor(n);
  const h = state.heights[pegIndex(move.x, move.y, n)];
  const cell = index(move.x, move.y, h, n);
  for (const li of byCell[cell]) {
    const line = lines[li];
    if (line.every((c) => c === cell || state.board[c] === color)) return true;
  }
  return false;
}

/**
 * Heuristic score for the bot landing on `cell`: reward lines through the cell
 * that already contain our beads (and none of the opponent's).
 */
function scoreCell(state: GameState, cell: number, me: Color): number {
  const opp: Color = me === 'black' ? 'white' : 'black';
  const { lines, byCell } = linesFor(state.size);
  let score = 0;
  for (const li of byCell[cell]) {
    let mine = 0;
    let theirs = 0;
    for (const c of lines[li]) {
      if (state.board[c] === me) mine++;
      else if (state.board[c] === opp) theirs++;
    }
    if (theirs === 0) score += mine >= 3 ? 16 : [1, 4][mine] ?? 8;
    if (mine === 0 && theirs === 2) score += 3;
  }
  return score;
}

/**
 * Pick the bot's move:
 *  1) win immediately if possible;
 *  2) block the player's immediate win;
 *  3) among safe moves (that don't hand the player a win in reply), maximise
 *     line potential; prefer central pegs as a tiebreak.
 */
export function botMove(state: GameState, me: Color): Move {
  const n = state.size;
  const opp: Color = me === 'black' ? 'white' : 'black';
  const moves = legalMoves(state);
  if (moves.length === 0) throw new Error('No legal moves');

  for (const m of moves) if (winsImmediately(state, m, me)) return m;
  for (const m of moves) if (winsImmediately(state, m, opp)) return m;

  const safe = moves.filter((m) => {
    const next = applyMove(state, m).state;
    return !legalMoves(next).some((r) => winsImmediately(next, r, opp));
  });
  const pool = safe.length > 0 ? safe : moves;

  const mid = (n - 1) / 2;
  let best = pool[0];
  let bestScore = -Infinity;
  for (const m of pool) {
    const h = state.heights[pegIndex(m.x, m.y, n)];
    const cell = index(m.x, m.y, h, n);
    const central = 1.5 - (Math.abs(m.x - mid) + Math.abs(m.y - mid)) / 2;
    const s = scoreCell(state, cell, me) + central + Math.random() * 0.5;
    if (s > bestScore) {
      bestScore = s;
      best = m;
    }
  }
  return best;
}

export { legalMoves, winsImmediately };
