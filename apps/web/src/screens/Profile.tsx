import { useEffect, useState } from 'react';
import type { PublicUser } from '@ttt3d/game-core';
import { useStore } from '../store.js';
import { fetchLeaderboard } from '../api.js';

export function Profile() {
  const user = useStore((s) => s.user);
  const navigate = useStore((s) => s.navigate);
  const refreshProfile = useStore((s) => s.refreshProfile);
  const [leaders, setLeaders] = useState<PublicUser[]>([]);

  useEffect(() => {
    refreshProfile();
    void fetchLeaderboard().then(setLeaders);
  }, [refreshProfile]);

  if (!user) return null;
  const games = user.wins + user.losses + user.draws;
  const winRate = games ? Math.round((user.wins / games) * 100) : 0;

  return (
    <div className="screen profile">
      <button className="btn-back" onClick={() => navigate('menu')}>
        ← Назад
      </button>
      <div className="profile-head">
        {user.photoUrl ? (
          <img src={user.photoUrl} alt="" className="avatar avatar-lg" />
        ) : (
          <div className="avatar avatar-lg avatar-fallback">
            {(user.firstName ?? '?').charAt(0)}
          </div>
        )}
        <h2>{user.firstName ?? user.username ?? 'Игрок'}</h2>
        <div className="rating-big">{user.rating}</div>
      </div>

      <div className="stats-grid">
        <Stat label="Победы" value={user.wins} />
        <Stat label="Поражения" value={user.losses} />
        <Stat label="Ничьи" value={user.draws} />
        <Stat label="Винрейт" value={`${winRate}%`} />
      </div>

      <h3 className="leaderboard-title">🏆 Топ игроков</h3>
      <ol className="leaderboard">
        {leaders.map((p, i) => (
          <li key={p.id} className={p.id === user.id ? 'me' : ''}>
            <span className="rank">{i + 1}</span>
            <span className="lb-name">{p.firstName ?? p.username ?? 'Игрок'}</span>
            <span className="lb-rating">{p.rating}</span>
          </li>
        ))}
        {leaders.length === 0 && <p className="subtitle">Пока нет данных</p>}
      </ol>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="stat">
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
}
