# quick maths

Sixty-second mental arithmetic sprint with a shared leaderboard. Static page in `public/`,
one serverless function in `api/scores.js`, scores kept in Upstash Redis (a sorted set).

## Deploy to Vercel

1. Push this folder to a GitHub repo and import it at https://vercel.com/new
   (or run `npx vercel` in this folder and accept the defaults).
2. In the Vercel project: **Storage → Create Database → Upstash Redis** (free tier is plenty).
   Connect it to the project. This sets `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN`
   (older stores use `KV_REST_API_URL` / `KV_REST_API_TOKEN`; both work).
3. **Settings → Environment Variables**: add `ADMIN_KEY` = any password you choose.
   Typing it into the "reset leaderboard" box on the title screen wipes every score.
4. Redeploy (Deployments → ⋯ → Redeploy) so the new variables take effect.

Open the URL on any device; everyone sees the same leaderboard.
If the API is unreachable the page keeps working with a leaderboard stored on that device only.

## API

| method | path          | body / header                | returns                          |
|--------|---------------|------------------------------|----------------------------------|
| GET    | `/api/scores` |                              | top 20 `[{id, name, score, t}]`  |
| POST   | `/api/scores` | `{name, score}`              | `{id, board}`                    |
| DELETE | `/api/scores` | header `x-admin-key: <key>`  | `{ok: true}`                     |

## Local development

```
npx vercel dev
```

Copy the env variables from the Vercel project first (`npx vercel env pull`), or the API answers
503 and the page falls back to device-local storage.
