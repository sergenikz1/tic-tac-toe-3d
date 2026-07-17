import { useStore } from './store.js';
import { Menu } from './screens/Menu.js';
import { Rules } from './screens/Rules.js';
import { SoloSelect } from './screens/SoloSelect.js';
import { Solo } from './screens/Solo.js';

/**
 * Telegram auth is disabled for now, so only the offline screens are routed.
 * The multiplayer screens stay in src/ for when online play returns.
 */
export function App() {
  const screen = useStore((s) => s.screen);

  switch (screen) {
    case 'solo-select':
      return <SoloSelect />;
    case 'solo':
      return <Solo />;
    case 'rules':
      return <Rules />;
    default:
      return <Menu />;
  }
}
