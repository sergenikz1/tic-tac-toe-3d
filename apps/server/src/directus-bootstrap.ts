import { directus, PLAYERS, MATCHES } from './db.js';

/**
 * Ensure the Directus collections used by the game exist. Runs once on startup.
 * Requires the static token to belong to an admin (schema-management) role.
 * Best-effort: if it fails (e.g. token lacks permission) we log instructions
 * and let the server keep running so you can create the collections manually.
 */
export async function ensureSchema(): Promise<void> {
  try {
    await ensureCollection(PLAYERS, playersCollection);
    await ensureCollection(MATCHES, matchesCollection);
    console.log('[directus] collections ready:', PLAYERS, MATCHES);
  } catch (err) {
    console.warn(
      `[directus] could not auto-create collections (${(err as Error).message}).\n` +
        '         Create them manually in the Directus admin, or use an admin static token.',
    );
  }
}

async function ensureCollection(name: string, payload: unknown): Promise<void> {
  try {
    await directus(`collections/${name}`); // 200 -> already exists
    return;
  } catch {
    // Not found (or no read access) -> try to create it.
  }
  await directus('collections', { method: 'POST', body: JSON.stringify(payload) });
  console.log(`[directus] created collection "${name}"`);
}

const idField = {
  field: 'id',
  type: 'integer',
  meta: { hidden: true, interface: 'input', readonly: true },
  schema: { is_primary_key: true, has_auto_increment: true },
};

const str = (field: string, extra: Record<string, unknown> = {}) => ({
  field,
  type: 'string',
  meta: { interface: 'input' },
  schema: extra,
});

const int = (field: string, def: number) => ({
  field,
  type: 'integer',
  meta: { interface: 'input' },
  schema: { default_value: def },
});

const playersCollection = {
  collection: PLAYERS,
  meta: { icon: 'casino', note: 'Игроки 3D крестики-нолики' },
  schema: { name: PLAYERS },
  fields: [
    idField,
    str('telegram_id', { is_unique: true }),
    str('username'),
    str('first_name'),
    str('photo_url'),
    int('rating', 1000),
    int('wins', 0),
    int('losses', 0),
    int('draws', 0),
  ],
};

const matchesCollection = {
  collection: MATCHES,
  meta: { icon: 'sports_esports', note: 'История матчей' },
  schema: { name: MATCHES },
  fields: [
    idField,
    str('player1_id'),
    str('player2_id'),
    str('winner_id'),
    str('result'),
    str('reason'),
    { field: 'moves', type: 'text', meta: { interface: 'input-multiline' }, schema: {} },
    {
      field: 'ended_at',
      type: 'timestamp',
      meta: { interface: 'datetime' },
      schema: {},
    },
  ],
};
