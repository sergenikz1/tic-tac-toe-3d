import { useEffect } from 'react';
import { useStore } from './store.js';
import { Menu } from './screens/Menu.js';
import { Matchmaking } from './screens/Matchmaking.js';
import { Profile } from './screens/Profile.js';
import { Rules } from './screens/Rules.js';
import { Friend } from './screens/Friend.js';
import { Solo } from './screens/Solo.js';
import { Game } from './game/Game.js';

export function App() {
  const screen = useStore((s) => s.screen);
  const init = useStore((s) => s.init);
  const authError = useStore((s) => s.authError);

  useEffect(() => {
    void init();
  }, [init]);

  switch (screen) {
    case 'loading':
      return <Centered>Загрузка…</Centered>;
    case 'auth-error':
      return (
        <Centered>
          <div className="auth-error">
            <h2>Не удалось войти</h2>
            <p>{authError}</p>
            <button className="btn" onClick={() => useStore.getState().init()}>
              Повторить
            </button>
          </div>
        </Centered>
      );
    case 'menu':
      return <Menu />;
    case 'matchmaking':
      return <Matchmaking />;
    case 'game':
      return <Game />;
    case 'profile':
      return <Profile />;
    case 'rules':
      return <Rules />;
    case 'friend':
      return <Friend />;
    case 'solo':
      return <Solo />;
  }
}

function Centered({ children }: { children: React.ReactNode }) {
  return <div className="centered">{children}</div>;
}
