import { useStore } from '../store.js';

export function Menu() {
  const navigate = useStore((s) => s.navigate);

  return (
    <div className="screen menu">
      <header className="menu-header">
        <div className="logo-star">★</div>
        <h1 className="game-title">
          3D КРЕСТИКИ-
          <br />
          НОЛИКИ
        </h1>
        <p className="subtitle">Собери линию из рыбок в кубе!</p>
      </header>

      <div className="menu-buttons">
        <button className="btn btn-play" onClick={() => navigate('solo-select')}>
          🐟 ИГРАТЬ
        </button>
        <button className="btn btn-blue" onClick={() => navigate('rules')}>
          📖 ПРАВИЛА
        </button>
      </div>
    </div>
  );
}
