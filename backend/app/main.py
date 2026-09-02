from contextlib import asynccontextmanager
import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from .config import DEFAULT_JWT_SECRET, settings
from .db import close_db, get_db
from .migrations import run_migrations
from .routers import assets, quiz_taking, quotes, students, teacher
from .seed_runner import seed_if_empty
from . import storage

logger = logging.getLogger("quizz")
# Default to INFO so the startup CORS / JWT-secret messages make it into
# Render's log feed. Uvicorn already configures root logging at
# WARNING+ by default, so the dedicated "quizz" logger needs its own
# handler. Using `getEffectiveLevel()` guards against reconfiguration
# by tests / app code that called `basicConfig` first.
if logger.level == logging.NOTSET and not logger.handlers:
    handler = logging.StreamHandler()
    handler.setFormatter(
        logging.Formatter("%(asctime)s %(levelname)s %(name)s: %(message)s")
    )
    logger.addHandler(handler)
    logger.setLevel(logging.INFO)
    logger.propagate = False


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Refuse to boot in any non-dev environment with the public dev
    # default — a misconfigured prod deploy must not run with a
    # publicly-known secret. `QUIZZ_ENV=production` flips the warning
    # into a hard error. Anything else (dev, preview, unset) keeps
    # the legacy warning-only behaviour for convenience.
    if settings.jwt_secret == DEFAULT_JWT_SECRET:
        if settings.env.lower() in ("production", "prod"):
            raise RuntimeError(
                "Refusing to start: JWT_SECRET is the public dev default. "
                "Set JWT_SECRET in the environment before running in "
                "production."
            )
        logger.warning(
            "JWT_SECRET is the public dev default. Set JWT_SECRET in the "
            "environment before exposing this server."
        )

    # Print the live CORS config at startup. This is the single most
    # common misconfiguration in prod (browser sees a valid request,
    # preflight fails with "Disallowed CORS origin" because the
    # Vercel origin isn't in `CORS_ORIGINS`). Logging it means the
    # next time someone gets a 400 from OPTIONS, they can grep the
    # Render logs to see exactly what's allowed.
    logger.info("CORS allow_origins = %s", settings.cors_origins)

    # In production, the dev-only localhost origins mean the deploy is
    # misconfigured. Warn loudly so it shows up in Render's log feed.
    if settings.env.lower() in ("production", "prod"):
        dev_only = {"http://localhost:8443", "http://127.0.0.1:8443"}
        if set(settings.cors_origins) <= dev_only:
            logger.warning(
                "CORS_ORIGINS is still the dev defaults (%s) under "
                "QUIZZ_ENV=production. Browser requests from your "
                "Vercel frontend will be rejected with 'Disallowed "
                "CORS origin'. Set CORS_ORIGINS to your frontend URL, "
                "e.g. CORS_ORIGINS=https://quizz-quick.vercel.app",
                sorted(dev_only),
            )

    # Ensure DB connectivity + seed on first run, then migrate.
    await seed_if_empty()
    await run_migrations()
    yield
    await close_db()


app = FastAPI(title=settings.app_name, lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)

# Minimal security response headers. Strict CSP is impractical for a dev demo
# (Vite injects inline styles in HMR mode); the values below are tight enough
# for production and loosened in dev only by the Vite proxy being
# in-process.
@app.middleware("http")
async def _security_headers(request, call_next):
    response = await call_next(request)
    response.headers.setdefault("X-Content-Type-Options", "nosniff")
    response.headers.setdefault("X-Frame-Options", "DENY")
    response.headers.setdefault("Referrer-Policy", "no-referrer")
    # HSTS only fires in prod: tells browsers (and the Cloudflare edge)
    # to refuse plain-HTTP for a year. Dev runs on http://localhost so
    # HSTS there would just block local 8443 → 8000 debugging.
    if settings.env.lower() in ("production", "prod"):
        response.headers.setdefault(
            "Strict-Transport-Security",
            "max-age=31536000; includeSubDomains",
        )
    if request.url.path.startswith("/api/"):
        response.headers.setdefault(
            "Cache-Control", "no-store, no-cache, must-revalidate"
        )
        response.headers.setdefault("Pragma", "no-cache")
    return response

app.mount("/uploads", StaticFiles(directory=settings.upload_dir), name="uploads")


@app.get("/api/health")
async def health():
    db = get_db()
    try:
        await db.command("ping")
        return {"status": "ok", "db": "connected"}
    except Exception as exc:  # pragma: no cover
        return {"status": "error", "db": "disconnected", "detail": str(exc)}


# Same data as the CORS log line at startup, but queryable from the
# browser console for fast debugging when preflight requests start
# failing in prod. The endpoint itself is not CORS-restricted
# (CORSMiddleware adds the headers *after* the route runs), so a
# failed preflight from `https://quizz-quick.vercel.app` will still
# see the response.
@app.get("/api/health/cors")
async def cors_health():
    return {
        "cors_origins": settings.cors_origins,
        "env": settings.env,
        "media_storage": "r2" if storage.is_remote() else "local",
        "r2_bucket": storage.is_remote() and settings.r2_bucket or None,
        "r2_public_base": settings.r2_public_base or None,
        "public_base_url": settings.public_base_url or None,
        "hint": (
            "If your frontend is being blocked with 'Disallowed CORS "
            "origin', add its origin to CORS_ORIGINS on this service "
            "and restart."
        ),
    }


app.include_router(students.router)
app.include_router(quiz_taking.router)
app.include_router(teacher.auth_router)
app.include_router(teacher.router)
app.include_router(assets.router)
app.include_router(quotes.public_router)
app.include_router(quotes.router)
