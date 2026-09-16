import { createClient } from 'redis';

const KEY = 'quickmaths:scores';
const TOP = 20;
const NAME_MAX = 14;

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  });

// connect per request and close after: serverless invocations can't trust a cached socket
async function withRedis(fn) {
  const url = process.env.REDIS_URL || process.env.KV_URL;
  if (!url) return json({ error: 'leaderboard not configured' }, 503);
  const db = createClient({ url });
  try {
    await db.connect();
    return await fn(db);
  } catch (e) {
    console.error(e);
    return json({ error: 'leaderboard unavailable' }, 502);
  } finally {
    if (db.isOpen) await db.quit().catch(() => {});
  }
}

// members are "timestamp|name", scores are points; highest first, earlier wins ties
async function board(db) {
  const raw = await db.zRangeWithScores(KEY, 0, TOP - 1, { REV: true });
  const rows = raw.map(({ value, score }) => {
    const bar = value.indexOf('|');
    return { id: value, name: value.slice(bar + 1), score: Number(score), t: Number(value.slice(0, bar)) };
  });
  rows.sort((a, b) => b.score - a.score || a.t - b.t);
  return rows;
}

export async function GET() {
  return withRedis(async db => json(await board(db)));
}

export async function POST(request) {
  let body;
  try { body = await request.json(); } catch { return json({ error: 'bad json' }, 400); }

  const name = String(body?.name ?? '').replace(/[|\s]+/g, ' ').trim().slice(0, NAME_MAX) || 'anon';
  const score = Number(body?.score);
  if (!Number.isInteger(score) || score < -60 || score > 600) return json({ error: 'bad score' }, 400);

  return withRedis(async db => {
    const id = `${Date.now()}|${name}`;
    await db.zAdd(KEY, { score, value: id });
    return json({ id, board: await board(db) });
  });
}

export async function DELETE(request) {
  const key = process.env.ADMIN_KEY;
  if (!key || request.headers.get('x-admin-key') !== key) return json({ error: 'forbidden' }, 403);
  return withRedis(async db => { await db.del(KEY); return json({ ok: true }); });
}
