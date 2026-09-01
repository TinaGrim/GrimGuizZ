# quizz-platform

React + Vite + Tailwind CSS project running inside Figma Make — "QuizZ Platform", a Math & Physics quiz site for students.

## Development Server

A Vite development server is **already running** on `$PORT` (default 8443). You don't need to start it manually.

- Preview URL: The user can access the running app through the preview panel
- Hot reload: Changes to source files are reflected immediately

## Project Structure

This is the canonical project structure. Start with task-relevant files below. Only follow imports or inspect other files when required, when a documented path is missing, or when the repository contradicts this guide.

### Frontend (Vite + React 19 + Tailwind v4)

- `src/main.tsx` - React entrypoint; imports `src/index.css` and mounts `src/App.tsx` into the `#root` element
- `src/App.tsx` - Primary application component and the usual starting point for UI work
- `src/routes.tsx` - React Router routes for both the student flow and `/admin/panel/*` (teacher panel)
- `src/pages/StudentLanding.tsx` - Entry page; student name entry, case-insensitive
- `src/pages/StudentLayout.tsx`, `StudentQuizList.tsx`, `PreQuiz.tsx`, `WheelSpin.tsx`, `QuestionScreen.tsx`, `Results.tsx` - Student quiz flow
- `src/pages/admin/AdminLogin.tsx` - Teacher login
- `src/pages/admin/AdminLayout.tsx` - Sidebar nav; the Security entry lives here
- `src/pages/admin/AdminDashboard.tsx`, `AdminStudents.tsx`, `AdminCategories.tsx`, `AdminLessons.tsx`, `AdminQuizzes.tsx`, `AdminQuestions.tsx`, `AdminAssets.tsx`, `AdminQuotes.tsx`, `AdminReports.tsx` - Teacher CRUD + reports
- `src/pages/admin/AdminSecurity.tsx` - **NEW** — teacher can change username + password
- `src/components/SpinWheel.tsx`, `TrollVideoModal.tsx`, `ProgressRing.tsx`, `MathText.tsx` - Shared UI
- `src/components/MathText.tsx` - **NEW** — KaTeX-rendered math for question prompts/options. Use `$...$` inline, `$$...$$` block.
- `src/components/AssetLibraryModal.tsx`, `ConfirmDialog.tsx`, `MessagesPanel.tsx`, `ResumePrompt.tsx`, `StudentProgressPanel.tsx`, `Chart.tsx`, `AdminHoverable.tsx` - Misc shared
- `src/api/client.ts` - Single API client; honours `VITE_API_BASE` for prod, falls back to the Vite `/api` proxy in dev
- `src/data/types.ts`, `useIsCompact.ts` - Shared types and hooks
- `src/store/AppContext.tsx` - Session state + actions for students and teachers (login, quiz flow, `addMessage`, `createQuiz`, `teacherUpdateUsername`, `teacherUpdatePassword`)
- `src/index.css` - Global CSS entrypoint and Tailwind CSS v4 import
- `index.html` - Vite HTML shell containing the `#root` element and loading `src/main.tsx`
- `package.json` - Project dependencies and the Vite build, development, preview, and formatting scripts
- `vite.config.ts` - Vite configuration with React, Tailwind CSS v4, and Figma Make plugins plus the `@` alias for `src`
- `.mise.toml` - Toolchain versions for Node.js and pnpm
- `MATH-IN-QUESTIONS.md` - Reference for `$...$` syntax
- `DEPLOY.md` - **NEW** — Vercel + Render + Atlas deploy guide
- `vercel.json` - **NEW** — Vercel SPA rewrite config

### Backend (FastAPI + MongoDB via Motor)

- `backend/app/main.py` - FastAPI app; lifespan refuses to boot with the dev `JWT_SECRET` when `QUIZZ_ENV=production`; security headers + CORS
- `backend/app/config.py` - pydantic-settings; env-var aliases for `MONGODB_URI` / `MONGO_URL`, `JWT_SECRET` / `QUIZZ_JWT_SECRET`, etc.
- `backend/app/auth.py` - `create_access_token` (teacher) + `create_student_token` (student) with role claims; `get_current_teacher` / `get_current_student` enforce role
- `backend/app/routers/students.py` - Student enter (`re.escape` on name) + per-student report
- `backend/app/routers/quiz_taking.py` - All routes gated with `Depends(get_current_student)`; server re-derives `questionsServed` from `quizId`+`wheelResult`
- `backend/app/routers/teacher.py` - Teacher CRUD; **NEW** `/me/username` and `/me/password` endpoints; rate-limited login
- `backend/app/routers/assets.py`, `quotes.py` - Media + motivational quotes
- `backend/app/ratelimit.py` - Sliding-window in-process rate limiter
- `backend/app/schemas.py` - Pydantic models
- `backend/Dockerfile` - **NEW** — Render build
- `render.yaml` - **NEW** — Render Blueprint
- `backend/requirements.txt` - Pinned deps

## Deploy

See `DEPLOY.md` for the full Vercel (frontend) + Render (backend) + Atlas (Mongo) flow.

In dev:
- `pnpm run dev` (Vite on `$PORT` / 8443)
- `cd backend && .venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8000`
- Vite proxies `/api/*` to `:8000`.

## Dependencies

- Runtime: React 19 and React DOM 19
- Styling: Tailwind CSS v4 with the `@tailwindcss/vite` plugin
- Build tooling: Vite 8, TypeScript 5.7, and `@vitejs/plugin-react`
- Formatting: oxfmt

## Styling

This project uses **Tailwind CSS v4** through the `@tailwindcss/vite` plugin configured in `vite.config.ts`. `src/index.css` imports Tailwind with `@import 'tailwindcss';`. Use Tailwind utility classes directly in JSX and put global CSS or Tailwind v4 theme customization in `src/index.css`. This scaffold does not need a Tailwind config file or PostCSS config.

`src/main.tsx` imports `src/index.css`, so global font wiring belongs in `src/index.css`. Keep CSS `@import` statements first, then add any `@font-face` rules and font-family defaults there.

## Code quality

- Use double quotes for strings containing apostrophes (`"We're here to help"`), or escape them in single-quoted strings. An unescaped apostrophe in a single-quoted string breaks the build.
- Ensure JSX tags are closed and braces are balanced.
- Export components as default exports.
