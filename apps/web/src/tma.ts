/**
 * Thin wrapper around the Telegram WebApp JS bridge (loaded in index.html).
 * We read initData for auth and apply the Telegram theme / viewport.
 */
interface TelegramWebApp {
  initData: string;
  initDataUnsafe: {
    user?: { id: number; first_name?: string; username?: string };
    start_param?: string;
  };
  colorScheme: 'light' | 'dark';
  themeParams: Record<string, string>;
  ready: () => void;
  expand: () => void;
  disableVerticalSwipes?: () => void;
  openTelegramLink?: (url: string) => void;
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
  if (wa.colorScheme) root.dataset.theme = wa.colorScheme;
  // themeParams is undefined outside a real Telegram client — guard every access.
  const tp = wa.themeParams ?? {};
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

/** Deep-link start parameter (e.g. an invite code), if the app was opened with one. */
export function getStartParam(): string | null {
  const fromTg = getWebApp()?.initDataUnsafe?.start_param;
  if (fromTg) return fromTg;
  // Fallback for plain-browser dev: ?startapp=CODE or ?code=CODE
  const params = new URLSearchParams(window.location.search);
  return params.get('startapp') ?? params.get('code');
}

const BOT_USERNAME = import.meta.env.VITE_BOT_USERNAME as string | undefined;

/**
 * Share an invite code. Inside Telegram we open the native share dialog with a
 * deep link into the Mini App (requires VITE_BOT_USERNAME); otherwise we copy a
 * link to the clipboard and return false so the UI can show the raw code.
 */
export function shareInvite(code: string): boolean {
  const wa = getWebApp();
  const deepLink = BOT_USERNAME
    ? `https://t.me/${BOT_USERNAME}/app?startapp=${code}`
    : `${window.location.origin}/?code=${code}`;
  const text = `Сыграй со мной в 3D крестики-нолики! Код комнаты: ${code}`;

  if (wa?.openTelegramLink && BOT_USERNAME) {
    const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(
      deepLink,
    )}&text=${encodeURIComponent(text)}`;
    wa.openTelegramLink(shareUrl);
    return true;
  }
  void navigator.clipboard?.writeText(deepLink).catch(() => {});
  return false;
}
