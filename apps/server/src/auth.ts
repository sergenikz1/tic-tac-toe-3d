import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import { config } from './config.js';
import { TelegramProfile } from './db.js';

const MAX_AUTH_AGE_SECONDS = 24 * 60 * 60; // reject initData older than 24h

/**
 * Validate Telegram Mini App `initData` per
 * https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
 *
 * Returns the parsed Telegram profile, or null if invalid.
 */
export function validateInitData(initData: string): TelegramProfile | null {
  if (!config.botToken) return null;
  let params: URLSearchParams;
  try {
    params = new URLSearchParams(initData);
  } catch {
    return null;
  }

  const hash = params.get('hash');
  if (!hash) return null;

  // Build the data-check-string: all fields except `hash`, sorted, joined by \n.
  const pairs: string[] = [];
  for (const [key, value] of params.entries()) {
    if (key === 'hash') continue;
    pairs.push(`${key}=${value}`);
  }
  pairs.sort();
  const dataCheckString = pairs.join('\n');

  const secretKey = crypto
    .createHmac('sha256', 'WebAppData')
    .update(config.botToken)
    .digest();
  const computed = crypto
    .createHmac('sha256', secretKey)
    .update(dataCheckString)
    .digest('hex');

  // Constant-time comparison.
  if (
    computed.length !== hash.length ||
    !crypto.timingSafeEqual(Buffer.from(computed), Buffer.from(hash))
  ) {
    return null;
  }

  // Freshness check.
  const authDate = Number(params.get('auth_date') ?? 0);
  if (!authDate || Date.now() / 1000 - authDate > MAX_AUTH_AGE_SECONDS) {
    return null;
  }

  const userJson = params.get('user');
  if (!userJson) return null;
  try {
    const u = JSON.parse(userJson) as {
      id: number;
      username?: string;
      first_name?: string;
      photo_url?: string;
    };
    return {
      telegramId: String(u.id),
      username: u.username,
      firstName: u.first_name,
      photoUrl: u.photo_url,
    };
  } catch {
    return null;
  }
}

export interface SessionToken {
  userId: string;
}

export function signSession(userId: string): string {
  return jwt.sign({ userId } satisfies SessionToken, config.jwtSecret, {
    expiresIn: '30d',
  });
}

export function verifySession(token: string): SessionToken | null {
  try {
    return jwt.verify(token, config.jwtSecret) as SessionToken;
  } catch {
    return null;
  }
}
