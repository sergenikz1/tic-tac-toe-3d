import { EDGE_COLORS, GameState, pegIndex, type Move } from '@ttt3d/game-core';
import { haptic } from '../tma.js';

interface BottomGridProps {
  state: GameState;
  canPlay: boolean;
  onPlay: (move: Move) => void;
}

/**
 * Top-down N×N input grid. Rows map to peg-y (0 = north/green at top), columns
 * to peg-x (0 = west/blue at left), matching the orientation of the 3D model.
 * The border colors mirror the 3D edge markers.
 */
export function BottomGrid({ state, canPlay, onPlay }: BottomGridProps) {
  const n = state.size;
  const cells = [];
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      const peg = pegIndex(x, y, n);
      const height = state.heights[peg];
      const full = height >= n;
      // Top bead color on this peg (the last placed), for a quick read.
      const topColor =
        height > 0 ? state.board[(height - 1) * n * n + y * n + x] : null;
      cells.push(
        <button
          key={peg}
          className={`grid-cell ${full ? 'full' : ''}`}
          disabled={!canPlay || full}
          onClick={() => {
            haptic('light');
            onPlay({ x, y });
          }}
        >
          <span className="cell-count">
            {height}/{n}
          </span>
          <span className="stack-dots">
            {Array.from({ length: n }).map((_, i) => {
              const filled = i < height;
              const c =
                filled && i === height - 1 ? topColor : filled ? 'filled' : 'empty';
              return <i key={i} className={`dot dot-${c}`} />;
            })}
          </span>
        </button>,
      );
    }
  }

  return (
    <div className="grid-wrap">
      <div className="edge edge-top" style={{ background: EDGE_COLORS.north }} />
      <div className="edge edge-bottom" style={{ background: EDGE_COLORS.south }} />
      <div className="edge edge-left" style={{ background: EDGE_COLORS.west }} />
      <div className="edge edge-right" style={{ background: EDGE_COLORS.east }} />
      <div className="grid" style={{ gridTemplateColumns: `repeat(${n}, 1fr)` }}>
        {cells}
      </div>
    </div>
  );
}
