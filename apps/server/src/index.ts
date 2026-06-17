import express from 'express';
import cors from 'cors';
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { existsSync } from 'node:fs';
import { config } from './config.js';
import { validateInitData, signSession } from './auth.js';
import { upsertUser, getLeaderboard } from './db.js';
import { ensureSchema } from './directus-bootstrap.js';
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
    return res.json({ token, user });
  } catch (err) {
    console.error('[auth] error', err);
    return res.status(500).json({ error: 'server error' });
  }
});

/** Top players by rating, for a simple leaderboard. */
app.get('/leaderboard', async (_req, res) => {
  try {
    res.json(await getLeaderboard(20));
  } catch (err) {
    console.error('[leaderboard] error', err);
    res.json([]);
  }
});

// --- Serve the built web client (fullstack: API + SPA from one origin) ---
// WEB_DIST overrides the location; by default it's apps/web/dist relative to the
// compiled server (apps/server/dist/index.js -> ../../web/dist).
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const webDist = config.webDist ?? path.resolve(__dirname, '../../web/dist');

if (existsSync(webDist)) {
  app.use(express.static(webDist));
  // SPA fallback: anything not matched above returns index.html so the client
  // router can take over. API routes and /socket.io are handled before this.
  app.get('*', (_req, res) => res.sendFile(path.join(webDist, 'index.html')));
  console.log(`[server] serving web client from ${webDist}`);
} else {
  console.log(`[server] web client not found at ${webDist} (API-only mode)`);
}

const httpServer = createServer(app);
attachSocket(httpServer);

// Make sure the Directus collections exist, then start listening.
void ensureSchema().finally(() => {
  httpServer.listen(config.port, () => {
    console.log(`[server] listening on http://localhost:${config.port}`);
    console.log(`[server] using Directus at ${config.directusUrl}`);
    if (config.devAuth) console.log('[server] DEV_AUTH enabled — mock login allowed');
  });
});
