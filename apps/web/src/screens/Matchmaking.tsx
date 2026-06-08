import { useStore } from '../store.js';

export function Matchmaking() {
  const leaveQueue = useStore((s) => s.leaveQueue);

  return (
    <div className="screen matchmaking">
      <div className="spinner" />
      <h2>Ищем соперника…</h2>
      <p className="subtitle">Подбираем игрока со схожим рейтингом</p>
      <button className="btn" onClick={leaveQueue}>
        Отменить
      </button>
    </div>
  );
}
