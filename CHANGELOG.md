# Changelog

All notable changes to QuizZ Platform will be documented in this file.

## [1.1.0] - 2026-09-02

### Features
- Compact the admin panel for mobile (< 768px) (`30a6bc1`)
- Upload progress bars + snappier student question submit (`76e0a8a`)
- Store uploads in Cloudflare R2 (free tier) instead of ephemeral disk (`7333968`)
- Security Panel, case-insensitive login, Vercel/Render deploy (`821b9d0`)

### Performance
- Cut report latency by batching catalog lookups; wake backend on boot (`9b95e98`)
- Parallelize remaining student/admin request chains (`cdc7493`)
- Admin reports — fetch per-student reports in parallel; paint stats + recent attempts from the single class report (`78e81a2`)
- Progress panel — stale-while-revalidate cache, no loading flash on re-entry (`1dda9b7`)
- Student side — parallelize & dedupe catalogue fetches, optimistic quiz completion (`87522bb`)

### Bug Fixes
- Admin reports crash — class report omits recent for students with no attempts (`0c945bd`)
- Stop results navigation from being clobbered by the question-screen redirect (`e01f993`)
- Surface R2 store errors as readable 502s (keeps CORS headers); add storage diagnostics to /api/health/cors (`fd416a7`)
- Remove demo names; make asset uploads/media load in prod (Render chown + PUBLIC_BASE_URL + media_url) (`9ee577c`)
- End quiz gracefully when attempt is already completed (`bb9c594`)
- Vercel SPA rewrite, ship favicon.ico (`70d8401`)
- Tolerate trailing slash in CORS_ORIGINS env var (`a65363a`)
- Surface CORS misconfig in prod, add HSTS, debug endpoint (`42d098c`)

### Chore
- Render: declare persistent uploads disk; document upload persistence (`15ff2d7`)
- Render: sync PUBLIC_BASE_URL into existing service on deploy (`1a48ea9`)

## [1.0.0] - 2025-XX-XX

Initial release of QuizZ Platform — Math & Physics quiz site for students.