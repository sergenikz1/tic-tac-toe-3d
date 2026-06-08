import express from 'express';
import cors from 'cors';
import { createServer } from 'node:http';
import { config } from './config.js';
import { validateInitData, signSession } from './auth.js';
import { prisma, upsertUser, toPublicUser } from './db.js';
import { attachSocket } from './socket.js';

const app = express();
app.use(cors({ origin: config.webUrl, credentials: true }));
app.use(express.json());

app.get('/health', (_req, res) => res.json({ ok: true }));

/**
 * Exchange Telegram initData (or a dev login) for a session JWT + public user.
 * Body: { initData?: string, dev?: { id, username?, firstName? } }
 */
app.post('/auth', async (req, res) => {
  try {
    let profile = null as null | {
      telegramId: string;
      username?: string;
      firstName?: string;
      photoUrl?: string;
    };

    if (config.devAuth && req.body?.dev) {
      const d = req.body.dev;
      profile = {
        telegramId: `dev-${d.id}`,
        username: d.username,
        firstName: d.firstName ?? `Dev ${d.id}`,
      };
    } else if (typeof req.body?.initData === 'string') {
      profile = validateInitData(req.body.initData);
    }

    if (!profile) {
      return res.status(401).json({ error: 'invalid auth' });
    }

    const user = await upsertUser(profile);
    const token = signSession(user.id);
    return res.json({ token, user: toPublicUser(user) });
  } catch (err) {
    console.error('[auth] error', err);
    return res.status(500).json({ error: 'server error' });
  }
});

/** Top players by rating, for a simple leaderboard. */
app.get('/leaderboard', async (_req, res) => {
  const top = await prisma.user.findMany({
    orderBy: { rating: 'desc' },
    take: 20,
  });
  res.json(top.map(toPublicUser));
});

const httpServer = createServer(app);
attachSocket(httpServer);

httpServer.listen(config.port, () => {
  console.log(`[server] listening on http://localhost:${config.port}`);
  if (config.devAuth) console.log('[server] DEV_AUTH enabled — mock login allowed');
});
