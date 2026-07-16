import { useEffect, useState } from 'react';
import { Color, GameSnapshot, RoomPlayer, TURN_MS } from '@ttt3d/game-core';

function useNow(running: boolean) {
  const [, force] = useState(0);
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => force((n) => n + 1), 250);
    return () => clearInterval(id);
  }, [running]);
  return Date.now();
}

interface HudProps {
  snapshot: GameSnapshot;
  myColor: Color | null;
}

export function Hud({ snapshot, myColor }: HudProps) {
  const live = !snapshot.ended;
  const now = useNow(live);
  const { state, players, turnDeadline } = snapshot;

  function remainingMs(color: Color): number {
    if (!live) return snapshot.clocks[color];
    if (state.turn === color) return Math.max(0, turnDeadline - now);
    return snapshot.clocks[color];
  }

  // Show "me" on the left when we know our color.
  const ordered = [...players].sort((a) =>
    myColor && a.color === myColor ? -1 : 1,
  );

  return (
    <div className="hud">
      {ordered.map((p) => (
        <PlayerCard
          key={p.user.id}
          player={p}
          active={live && state.turn === p.color}
          remaining={remainingMs(p.color)}
          isMe={myColor === p.color}
        />
      ))}
    </div>
  );
}

function PlayerCard({
  player,
  active,
  remaining,
  isMe,
}: {
  player: RoomPlayer;
  active: boolean;
  remaining: number;
  isMe: boolean;
}) {
  const secs = Math.ceil(remaining / 1000);
  const low = remaining <= 10_000;
  const pct = Math.max(0, Math.min(100, (remaining / TURN_MS) * 100));
  const clock = `${Math.floor(secs / 60)}:${(secs % 60).toString().padStart(2, '0')}`;
  const name = player.user.firstName ?? player.user.username ?? 'Игрок';

  return (
    <div className={`player-card ${active ? 'active' : ''}`}>
      <div className="pc-top">
        <span className={`bead-chip bead-${player.color}`} />
        <span className="pc-name">
          {name}
          {isMe ? ' (вы)' : ''}
        </span>
        <span className={`pc-timer ${low ? 'low' : ''}`}>{clock}</span>
      </div>
      <div className="timer-bar">
        <div
          className={`timer-fill ${low ? 'low' : ''}`}
          style={{ width: `${active ? pct : 100}%` }}
        />
      </div>
    </div>
  );
}
