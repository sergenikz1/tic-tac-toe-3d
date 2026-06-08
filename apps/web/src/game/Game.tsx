import { index } from '@ttt3d/game-core';
import { useStore } from '../store.js';
import { Board3D } from './Board3D.js';
import { BottomGrid } from './BottomGrid.js';
import { Hud } from './Hud.js';

export function Game() {
  const snapshot = useStore((s) => s.snapshot);
  const user = useStore((s) => s.user);
  const move = useStore((s) => s.move);
  const resign = useStore((s) => s.resign);
  const rematch = useStore((s) => s.rematch);
  const rematchOfferBy = useStore((s) => s.rematchOfferBy);
  const navigate = useStore((s) => s.navigate);

  if (!snapshot || !user) return null;

  const me = snapshot.players.find((p) => p.user.id === user.id) ?? null;
  const myColor = me?.color ?? null;
  const { state } = snapshot;
  const myTurn = !snapshot.ended && myColor === state.turn;

  const lastCell = snapshot.lastMove
    ? index(snapshot.lastMove.x, snapshot.lastMove.y, snapshot.lastMove.h)
    : null;

  return (
    <div className="screen game">
      <Hud snapshot={snapshot} myColor={myColor} />

      <div className="board-top">
        <Board3D state={state} lastCell={lastCell} canPlay={myTurn} onPlay={move} />
        <div className="turn-banner">
          {snapshot.ended
            ? 'Игра окончена'
            : myTurn
              ? 'Ваш ход'
              : 'Ход соперника'}
        </div>
      </div>

      <div className="board-bottom">
        <BottomGrid state={state} canPlay={myTurn} onPlay={move} />
        {!snapshot.ended && (
          <button className="btn btn-ghost resign" onClick={resign}>
            Сдаться
          </button>
        )}
      </div>

      {snapshot.ended && (
        <EndModal
          result={resultText(snapshot.ended.result, snapshot.ended.reason, myColor)}
          rematchPending={rematchOfferBy !== null && rematchOfferBy !== user.id}
          rematchSent={rematchOfferBy === user.id}
          onRematch={rematch}
          onMenu={() => navigate('menu')}
        />
      )}
    </div>
  );
}

function resultText(
  result: 'black' | 'white' | 'draw',
  reason: 'line' | 'timeout' | 'resign',
  myColor: 'black' | 'white' | null,
): string {
  if (result === 'draw') return '🤝 Ничья';
  const win = result === myColor;
  const why =
    reason === 'timeout' ? ' (время вышло)' : reason === 'resign' ? ' (сдача)' : '';
  return win ? `🎉 Вы выиграли!${why}` : `Поражение${why}`;
}

function EndModal({
  result,
  rematchPending,
  rematchSent,
  onRematch,
  onMenu,
}: {
  result: string;
  rematchPending: boolean;
  rematchSent: boolean;
  onRematch: () => void;
  onMenu: () => void;
}) {
  return (
    <div className="modal-overlay">
      <div className="modal">
        <h2>{result}</h2>
        {rematchPending && <p className="subtitle">Соперник предлагает реванш!</p>}
        {rematchSent && <p className="subtitle">Ожидаем соперника…</p>}
        <div className="modal-buttons">
          <button className="btn btn-primary" onClick={onRematch}>
            {rematchPending ? 'Принять реванш' : 'Реванш'}
          </button>
          <button className="btn" onClick={onMenu}>
            В меню
          </button>
        </div>
      </div>
    </div>
  );
}
