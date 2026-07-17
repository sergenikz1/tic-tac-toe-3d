import { useEffect, useRef, useState } from 'react';
import {
  applyMove,
  createGame,
  GameState,
  Move,
  TURN_MS,
  type Color,
} from '@ttt3d/game-core';
import { useStore } from '../store.js';
import { haptic } from '../tma.js';
import { Board3D } from '../game/Board3D.js';
import { BottomGrid } from '../game/BottomGrid.js';
import { botMove } from '../solo/bot.js';

const PLAYER: Color = 'black';
const BOT: Color = 'white';

interface Ended {
  result: Color | 'draw';
  reason: 'line' | 'timeout';
}

/**
 * Fully local single-player game vs the bot. No server or network needed —
 * this is what the Android build runs offline.
 */
export function Solo() {
  const navigate = useStore((s) => s.navigate);
  const soloSize = useStore((s) => s.soloSize);
  const [state, setState] = useState<GameState>(() => createGame('black', soloSize));
  const [lastCell, setLastCell] = useState<number | null>(null);
  const [deadline, setDeadline] = useState<number>(() => Date.now() + TURN_MS);
  const [ended, setEnded] = useState<Ended | null>(null);
  const [, tick] = useState(0);
  const botTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Re-render 4x/sec for the countdown, and enforce the per-move timeout.
  useEffect(() => {
    if (ended) return;
    const id = setInterval(() => {
      tick((n) => n + 1);
      if (Date.now() > deadline) {
        const winner: Color = state.turn === 'black' ? 'white' : 'black';
        setEnded({ result: winner, reason: 'timeout' });
      }
    }, 250);
    return () => clearInterval(id);
  }, [deadline, ended, state.turn]);

  function commit(move: Move) {
    const { state: next, landedCell } = applyMove(state, move);
    setState(next);
    setLastCell(landedCell);
    setDeadline(Date.now() + TURN_MS);
    if (next.winner) setEnded({ result: next.winner, reason: 'line' });
    else if (next.draw) setEnded({ result: 'draw', reason: 'line' });
  }

  // Bot replies after a short "thinking" pause.
  useEffect(() => {
    if (ended || state.turn !== BOT) return;
    botTimer.current = setTimeout(() => {
      try {
        const { state: next, landedCell } = applyMove(state, botMove(state, BOT));
        haptic('light');
        setState(next);
        setLastCell(landedCell);
        setDeadline(Date.now() + TURN_MS);
        if (next.winner) setEnded({ result: next.winner, reason: 'line' });
        else if (next.draw) setEnded({ result: 'draw', reason: 'line' });
      } catch {
        /* board full — draw is already handled */
      }
    }, 550 + Math.random() * 500);
    return () => {
      if (botTimer.current) clearTimeout(botTimer.current);
    };
  }, [state, ended]);

  const myTurn = !ended && state.turn === PLAYER;

  function onPlay(move: Move) {
    if (!myTurn) return;
    haptic('light');
    commit(move);
  }

  function restart() {
    setState(createGame('black', soloSize));
    setLastCell(null);
    setEnded(null);
    setDeadline(Date.now() + TURN_MS);
  }

  const remaining = Math.max(0, deadline - Date.now());

  return (
    <div className="screen game">
      <div className="hud">
        <SoloCard
          name="Вы"
          color={PLAYER}
          active={!ended && state.turn === PLAYER}
          remaining={state.turn === PLAYER ? remaining : TURN_MS}
        />
        <SoloCard
          name="Бот 🤖"
          color={BOT}
          active={!ended && state.turn === BOT}
          remaining={state.turn === BOT ? remaining : TURN_MS}
        />
      </div>

      <div className="board-top">
        <Board3D state={state} lastCell={lastCell} canPlay={myTurn} onPlay={onPlay} />
        <div className="turn-banner">
          {ended ? 'Игра окончена' : myTurn ? 'Ваш ход' : 'Бот думает…'}
        </div>
      </div>

      <div className="board-bottom">
        <BottomGrid state={state} canPlay={myTurn} onPlay={onPlay} />
        <button className="btn btn-ghost resign" onClick={() => navigate('menu')}>
          Выйти
        </button>
      </div>

      {ended && (
        <div className="modal-overlay">
          <div className="modal">
            <h2>
              {ended.result === 'draw'
                ? '🤝 Ничья'
                : ended.result === PLAYER
                  ? `🎉 Вы выиграли!${ended.reason === 'timeout' ? ' (у бота вышло время)' : ''}`
                  : `Поражение${ended.reason === 'timeout' ? ' (время вышло)' : ''}`}
            </h2>
            <div className="modal-buttons">
              <button className="btn btn-primary" onClick={restart}>
                Ещё раз
              </button>
              <button className="btn" onClick={() => navigate('menu')}>
                В меню
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SoloCard({
  name,
  color,
  active,
  remaining,
}: {
  name: string;
  color: Color;
  active: boolean;
  remaining: number;
}) {
  const secs = Math.ceil(remaining / 1000);
  const low = active && remaining <= 10_000;
  const pct = Math.max(0, Math.min(100, (remaining / TURN_MS) * 100));
  const clock = `${Math.floor(secs / 60)}:${(secs % 60).toString().padStart(2, '0')}`;
  return (
    <div className={`player-card ${active ? 'active' : ''}`}>
      <div className="pc-top">
        <span className={`bead-chip bead-${color}`} />
        <span className="pc-name">{name}</span>
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
