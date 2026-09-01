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

The starter plan resets the container's filesystem on redeploy. Demo
quizzes ship with a pre-seeded set of media, so the app is usable out
of the box. If teachers upload new images/videos in prod and expect
them to survive a deploy, mount a Render Persistent Disk at
`/app/uploads` (and set `UPLOAD_DIR=/app/uploads` in the env table).
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
