import { useState } from 'react';
import { useStore } from '../store.js';
import { shareInvite } from '../tma.js';

export function Friend() {
  const inviteCode = useStore((s) => s.inviteCode);
  const privateError = useStore((s) => s.privateError);
  const privateJoining = useStore((s) => s.privateJoining);
  const createPrivate = useStore((s) => s.createPrivate);
  const joinPrivate = useStore((s) => s.joinPrivate);
  const cancelPrivate = useStore((s) => s.cancelPrivate);
  const navigate = useStore((s) => s.navigate);

  const [code, setCode] = useState('');
  const [copied, setCopied] = useState(false);

  return (
    <div className="screen friend">
      <button className="btn-back" onClick={cancelPrivate}>
        ← Назад
      </button>
      <h2>Игра с другом</h2>

      {inviteCode ? (
        <div className="invite-box">
          <p className="subtitle">Поделись кодом с другом и ждите соединения:</p>
          <div className="invite-code">{inviteCode}</div>
          <button
            className="btn btn-primary"
            onClick={() => {
              const shared = shareInvite(inviteCode);
              if (!shared) {
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              }
            }}
          >
            {copied ? '✓ Ссылка скопирована' : '📨 Поделиться'}
          </button>
          <div className="waiting-row">
            <div className="spinner spinner-sm" />
            <span className="subtitle">Ожидаем соперника…</span>
          </div>
        </div>
      ) : (
        <>
          <button className="btn btn-primary" onClick={createPrivate}>
            ➕ Создать комнату
          </button>

          <div className="divider">или</div>

          <div className="join-box">
            <input
              className="code-input"
              placeholder="КОД"
              value={code}
              maxLength={6}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
            />
            <button
              className="btn"
              disabled={code.trim().length < 4 || privateJoining}
              onClick={() => joinPrivate(code)}
            >
              {privateJoining ? 'Подключение…' : 'Войти'}
            </button>
          </div>
          {privateError && <p className="error-text">{privateError}</p>}
        </>
      )}

      <button className="btn-back" onClick={() => navigate('menu')}>
        В меню
      </button>
    </div>
  );
}
