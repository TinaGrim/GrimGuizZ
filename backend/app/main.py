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

logger = logging.getLogger("quizz")


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
    # No HSTS here — that only makes sense behind TLS. Add it in your reverse
    # proxy (nginx, Caddy) for prod.
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


app.include_router(students.router)
app.include_router(quiz_taking.router)
app.include_router(teacher.auth_router)
app.include_router(teacher.router)
app.include_router(assets.router)
app.include_router(quotes.public_router)
app.include_router(quotes.router)
