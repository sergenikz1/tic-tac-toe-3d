/**
 * Thin wrapper around the Telegram WebApp JS bridge (loaded in index.html).
 * We read initData for auth and apply the Telegram theme / viewport.
 */
interface TelegramWebApp {
  initData: string;
  initDataUnsafe: { user?: { id: number; first_name?: string; username?: string } };
  colorScheme: 'light' | 'dark';
  themeParams: Record<string, string>;
  ready: () => void;
  expand: () => void;
  disableVerticalSwipes?: () => void;
  HapticFeedback?: { impactOccurred: (s: 'light' | 'medium' | 'heavy') => void };
}

declare global {
  interface Window {
    Telegram?: { WebApp?: TelegramWebApp };
  }
}

export function getWebApp(): TelegramWebApp | null {
  return window.Telegram?.WebApp ?? null;
}

export function initTelegram() {
  const wa = getWebApp();
  if (!wa) return;
  wa.ready();
  wa.expand();
  wa.disableVerticalSwipes?.();
  applyTheme(wa);
}

function applyTheme(wa: TelegramWebApp) {
  const root = document.documentElement;
  root.dataset.theme = wa.colorScheme;
  const tp = wa.themeParams;
  if (tp.bg_color) root.style.setProperty('--tg-bg', tp.bg_color);
  if (tp.text_color) root.style.setProperty('--tg-text', tp.text_color);
  if (tp.button_color) root.style.setProperty('--tg-accent', tp.button_color);
}

export function haptic(style: 'light' | 'medium' | 'heavy' = 'light') {
  getWebApp()?.HapticFeedback?.impactOccurred(style);
}

/** Returns the raw initData string for backend validation, or '' outside Telegram. */
export function getInitData(): string {
  return getWebApp()?.initData ?? '';
}
