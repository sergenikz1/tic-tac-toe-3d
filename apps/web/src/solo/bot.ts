import {
  applyMove,
  canPlay,
  GameState,
  LINES,
  LINES_BY_CELL,
  Move,
  SIZE,
  pegIndex,
  index,
  type Color,
} from '@ttt3d/game-core';

/** All currently legal moves (pegs that are not full). */
function legalMoves(state: GameState): Move[] {
  const moves: Move[] = [];
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      if (state.heights[pegIndex(x, y)] < SIZE) moves.push({ x, y });
    }
  }
  return moves;
}

/** Would `color` win by playing `move` right now? */
function winsImmediately(state: GameState, move: Move, color: Color): boolean {
  const h = state.heights[pegIndex(move.x, move.y)];
  const cell = index(move.x, move.y, h);
  for (const li of LINES_BY_CELL[cell]) {
    const line = LINES[li];
    if (line.every((c) => c === cell || state.board[c] === color)) return true;
  }
  return false;
}

/**
 * Heuristic score for the bot landing on `cell`: sum over lines through the
 * cell, rewarding lines that already contain our beads (and no opponent's),
 * lightly penalising lines the opponent contests.
 */
function scoreCell(state: GameState, cell: number, me: Color): number {
  const opp: Color = me === 'black' ? 'white' : 'black';
  let score = 0;
  for (const li of LINES_BY_CELL[cell]) {
    let mine = 0;
    let theirs = 0;
    for (const c of LINES[li]) {
      if (state.board[c] === me) mine++;
      else if (state.board[c] === opp) theirs++;
    }
    if (theirs === 0) score += [1, 4, 16, 0][mine] ?? 0; // open line for us
    if (mine === 0 && theirs === 2) score += 3; // mild interference value
  }
  return score;
}

/**
 * Pick the bot's move:
 *  1) win immediately if possible;
 *  2) block the player's immediate win;
 *  3) among safe moves (that don't hand the player a win on the next reply),
 *     maximise a line-potential heuristic; prefer central pegs as a tiebreak.
 */
export function botMove(state: GameState, me: Color): Move {
  const opp: Color = me === 'black' ? 'white' : 'black';
  const moves = legalMoves(state);
  if (moves.length === 0) throw new Error('No legal moves');

  for (const m of moves) if (winsImmediately(state, m, me)) return m;
  for (const m of moves) if (winsImmediately(state, m, opp)) return m;

  // A move is unsafe if after playing it the player has an immediate win
  // (typically by stacking on top of our fresh bead).
  const safe = moves.filter((m) => {
    const next = applyMove(state, m).state;
    return !legalMoves(next).some((r) => winsImmediately(next, r, opp));
  });
  const pool = safe.length > 0 ? safe : moves;

  let best = pool[0];
  let bestScore = -Infinity;
  for (const m of pool) {
    const h = state.heights[pegIndex(m.x, m.y)];
    const cell = index(m.x, m.y, h);
    // Central pegs touch more lines; tiny jitter breaks ties unpredictably.
    const central = 1.5 - (Math.abs(m.x - 1.5) + Math.abs(m.y - 1.5)) / 2;
    const s = scoreCell(state, cell, me) + central + Math.random() * 0.5;
    if (s > bestScore) {
      bestScore = s;
      best = m;
    }
  }
  return best;
}

export { legalMoves, winsImmediately };
