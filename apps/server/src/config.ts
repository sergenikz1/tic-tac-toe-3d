export const config = {
  port: Number(process.env.PORT ?? 3001),
  botToken: process.env.BOT_TOKEN ?? '',
  jwtSecret: process.env.JWT_SECRET ?? 'dev-insecure-secret',
  webUrl: process.env.WEB_URL ?? 'http://localhost:5173',
  /** Allow logging in with a mock user without Telegram (local dev only). */
  devAuth: process.env.DEV_AUTH === '1',
};

if (!config.botToken && !config.devAuth) {
  console.warn(
    '[config] BOT_TOKEN is not set and DEV_AUTH is off. Telegram auth will reject all logins.',
  );
}
