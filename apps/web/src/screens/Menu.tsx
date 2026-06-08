import { useStore } from '../store.js';

export function Menu() {
  const user = useStore((s) => s.user);
  const joinQueue = useStore((s) => s.joinQueue);
  const navigate = useStore((s) => s.navigate);

  return (
    <div className="screen menu">
      <header className="menu-header">
        <h1>3D Крестики-нолики</h1>
        <p className="subtitle">Собери 4 в ряд в пространстве 4×4×4</p>
      </header>

      {user && (
        <div className="profile-chip" onClick={() => navigate('profile')}>
          {user.photoUrl ? (
            <img src={user.photoUrl} alt="" className="avatar" />
          ) : (
            <div className="avatar avatar-fallback">
              {(user.firstName ?? '?').charAt(0)}
            </div>
          )}
          <div>
            <div className="chip-name">{user.firstName ?? user.username ?? 'Игрок'}</div>
            <div className="chip-rating">Рейтинг {user.rating}</div>
          </div>
        </div>
      )}

      <div className="menu-buttons">
        <button className="btn btn-primary" onClick={joinQueue}>
          🎮 Найти соперника
        </button>
        <button className="btn" onClick={() => navigate('profile')}>
          👤 Профиль
        </button>
        <button className="btn" onClick={() => navigate('rules')}>
          📖 Правила
        </button>
      </div>
    </div>
  );
}
