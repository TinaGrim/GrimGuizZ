# QuizZ — production deploy

The frontend is a static Vite app; we ship it to **Vercel**.
The backend is a FastAPI + MongoDB service; we ship it to **Render**.
MongoDB lives on **MongoDB Atlas**.

This doc is the single source of truth for what env vars go where and
which deploy command to run. Follow it in order.

---

## 1. MongoDB Atlas

1. Create a free M0 cluster at <https://cloud.mongodb.com>.
2. Add a database user (`Database Access` → `Add New Database User`).
   - **Username / Password** — note both. They become part of the
     connection string.
   - Privilege: `Read and write to any database`.
3. Whitelist Render's outbound IPs (`Network Access` → `Add IP`).
   The free tier whitelists `0.0.0.0/0` for simplicity; tighten this
   once you know the Render egress range.
4. Copy the connection string from `Database Deployments → Connect →
   Drivers`. It looks like:
   ```
   mongodb+srv://USER:PASSWORD@cluster0.abc1.mongodb.net/quizz?retryWrites=true&w=majority
   ```
   Substitute `USER` and `PASSWORD` with the real values.

   This string becomes `MONGODB_URI` on Render.

---

## 2. Render (backend)

We deploy via `render.yaml` (Infrastructure as Code). Render reads the
file in your repo and creates the service.

1. Push the repo to GitHub (or GitLab / Bitbucket). The first time
   you do this, Render needs the URL.
2. In Render, click **New → Blueprint** and point it at the repo.
3. Render reads `render.yaml` and shows a single service (`quizz-api`).
4. Open its **Environment** tab and fill in:
   | Key                       | Value                                                             |
   | ------------------------- | ----------------------------------------------------------------- |
   | `MONGODB_URI`             | the Atlas connection string from step 1                           |
   | `MONGODB_DB`              | `quizz`                                                           |
   | `JWT_SECRET`              | a 64-byte URL-safe random string — see "Generating a JWT secret"  |
   | `CORS_ORIGINS`            | your Vercel URL, e.g. `https://quizz.vercel.app`                  |
   | `SEED_TEACHER_USERNAME`   | whatever you want to sign in as (default `teacher`)               |
   | `SEED_TEACHER_PASSWORD`   | a strong password (Render can `Generate Value` for you)           |

   Everything else (`PORT`, `PYTHONUNBUFFERED`, etc.) is set inside
   the Dockerfile.
5. Click **Apply**. The first build will:
   - pull the Dockerfile,
   - install Python deps,
   - run the seed on first boot (creates the teacher account, populates
     demo chapters / lessons / quizzes).
6. Once the deploy shows "Live", copy the public URL (e.g.
   `https://quizz-api.onrender.com`). It must respond to
   `GET /api/health` with `{ "status": "ok" }`.

### Generating a JWT secret

Anywhere with Python:

```bash
python3 -c "import secrets; print(secrets.token_urlsafe(48))"
```

The output is your `JWT_SECRET`. **Never commit it.**

### Persistent uploads

The starter plan resets the container's filesystem on redeploy — every
deploy wipes teacher uploads (assets vanish and the library shows
broken tiles until the asset rows are deleted). `render.yaml` already
declares a 1 GB persistent disk mounted at `/app/uploads`:
- If the service was created from that blueprint, click **Sync blueprint**
  in the Render service so the disk attaches (or add it manually under
  **Settings → Persistent Disks**: mount `/app/uploads`).
- `UPLOAD_DIR=/app/uploads` is already baked into the Dockerfile and
  env table; `PUBLIC_BASE_URL` must stay the deployed backend origin
  so the Vercel frontend can load the media.

For a fully managed setup, swap the upload handler for S3 — see
`backend/app/routers/assets.py`.

---

## 3. Vercel (frontend)

1. In Vercel, click **Add New → Project** and import the same repo.
2. Vercel auto-detects Vite. The defaults work; we override only:
   - **Output Directory**: `dist`
   - **Install Command**: leave Vercel's default
   - **Build Command**: leave Vercel's default
3. **Environment Variables** — add one for each environment
   (Production, Preview, Development):
   | Name             | Value                                  |
   | ---------------- | -------------------------------------- |
   | `VITE_API_BASE`  | the Render URL from step 2, no trailing slash, e.g. `https://quizz-api.onrender.com` |
4. Click **Deploy**. The first build takes a couple of minutes.
5. After deploy, visit the Vercel URL — you should see the student
   landing page and be able to sign in as the teacher.

### Deep links

`vercel.json` includes a SPA rewrite (`/(.*) → /index.html`), so
direct links like `https://quizz.vercel.app/admin/panel/security`
work without 404'ing.

### CORS — most common prod bug

The browser blocks every API call with **"Disallowed CORS origin"**
when `CORS_ORIGINS` on Render does not contain the Vercel origin.
This is the single most common prod deploy bug. Two ways to fix:

1. **Set the env var** on Render to the exact Vercel URL:
   ```
   CORS_ORIGINS = https://quizz-quick.vercel.app
   ```
   (no trailing slash, no path; the value must match what the
   browser sends in the `Origin` header byte-for-byte). For
   preview deploys on Vercel, you can also add
   `https://*-<team-slug>.vercel.app` but the Starlette CORS
   middleware does not support globs — list each preview origin
   explicitly, or use one Vercel "production" deployment URL.

2. **Diagnose without redeploying.** Hit
   `https://<render-url>/api/health/cors` — it returns the live
   config as JSON:
   ```json
   {
     "cors_origins": ["http://localhost:8443"],
     "env": "production",
     "hint": "If your frontend is being blocked..."
   }
   ```
   If the array doesn't contain your Vercel URL, the env var
   wasn't set or wasn't parsed.

3. **Quick check via curl** (no browser needed):
   ```bash
   curl -i -X OPTIONS https://<render-url>/api/students/enter \
     -H "Origin: https://quizz-quick.vercel.app" \
     -H "Access-Control-Request-Method: POST" \
     -H "Access-Control-Request-Headers: content-type"
   ```
   Look for `HTTP/2 200` and `access-control-allow-origin:
   https://quizz-quick.vercel.app`. A `400 Disallowed CORS
   origin` means Render's allow list still doesn't include your
   Vercel URL.

The backend logs a warning at startup if `CORS_ORIGINS` is still
the dev defaults (`http://localhost:8443`, `http://127.0.0.1:8443`)
while `QUIZZ_ENV=production`. Check Render's log feed for the line
`CORS_ORIGINS is still the dev defaults ...` to catch this before
any browser ever does.

---

## 4. After deploy — smoke test

Open the Vercel URL and walk through this:

1. **Student flow** — type the demo name, pick a quiz, spin, answer.
   - This exercises the full request chain: Vercel → Render → Atlas.
2. **Teacher flow** — sign in with `SEED_TEACHER_USERNAME` /
   `SEED_TEACHER_PASSWORD`. Verify the dashboard loads and you can
   change your username / password under the **Security** nav item.
3. **CORS** — open the browser devtools network tab. Every API call
   should return 200. A CORS misconfig surfaces as
   `Access-Control-Allow-Origin` errors; fix it by adding the
   offending Vercel URL to `CORS_ORIGINS` on Render and redeploying.

---

## 5. Env-var cheat sheet

| Where       | Key                       | Notes                                       |
| ----------- | ------------------------- | ------------------------------------------- |
| Atlas       | n/a                       | you create the cluster there                |
| Render      | `MONGODB_URI`             | `mongodb+srv://…` from Atlas                |
| Render      | `MONGODB_DB`              | `quizz`                                     |
| Render      | `JWT_SECRET`              | generate with `secrets.token_urlsafe(48)`   |
| Render      | `CORS_ORIGINS`            | comma-separated Vercel URLs                 |
| Render      | `SEED_TEACHER_USERNAME`   | e.g. `teacher`                              |
| Render      | `SEED_TEACHER_PASSWORD`   | strong, never reuse the dev `lenlen`        |
| Vercel      | `VITE_API_BASE`           | Render URL, no trailing slash               |

---

## 6. Local dev

The defaults in `backend/app/config.py` and `src/api/client.ts` are
both wired for `localhost`:

- Backend reads `mongodb://127.0.0.1:27017` and listens on `:8000`.
- Vite proxies `/api/*` to `:8000` (see `vite.config.ts`).
- `VITE_API_BASE` is unset in dev, so the frontend hits the proxy.

So `pnpm run dev` and the existing `backend/run.sh` keep working
without any new env files.
