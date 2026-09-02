from typing import Annotated

from pydantic import AliasChoices, Field, field_validator
from pydantic_settings import BaseSettings, NoDecode

DEFAULT_JWT_SECRET = "change-me-in-production-quizz-secret"


class Settings(BaseSettings):
    app_name: str = "QuizZ API"
    # `production` causes `main.lifespan` to refuse to boot if
    # `jwt_secret` is still the dev default. Anything else is treated
    # as a development / preview environment (warning only).
    env: str = Field(
        default="development",
        validation_alias=AliasChoices("QUIZZ_ENV", "ENV"),
    )
    # `MONGO_URL` is the historical name (matches the seed_runner docs);
    # `MONGODB_URI` is the Atlas-style name. We accept either.
    mongo_url: str = Field(
        default="mongodb://127.0.0.1:27017",
        validation_alias=AliasChoices("MONGO_URL", "MONGODB_URI"),
    )
    # Same dual-name story for the DB — `mongo_db` (legacy) or `MONGODB_DB`
    # (Atlas-style / render.yaml default).
    mongo_db: str = Field(
        default="quizz",
        validation_alias=AliasChoices("MONGO_DB", "MONGODB_DB"),
    )
    jwt_secret: str = Field(
        default=DEFAULT_JWT_SECRET,
        validation_alias=AliasChoices("JWT_SECRET", "QUIZZ_JWT_SECRET"),
    )
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 60 * 24  # 24h teacher sessions
    student_jwt_expire_minutes: int = 60 * 8  # 8h student sessions

    # Seed-only dev teacher credential. Override via `SEED_TEACHER_USERNAME`
    # / `SEED_TEACHER_PASSWORD` in a production .env; never reuse these
    # defaults outside a local demo database.
    seed_teacher_username: str = Field(
        default="teacher",
        validation_alias=AliasChoices("SEED_TEACHER_USERNAME", "QUIZZ_SEED_TEACHER_USERNAME"),
    )
    seed_teacher_password: str = Field(
        default="lenlen",
        validation_alias=AliasChoices("SEED_TEACHER_PASSWORD", "QUIZZ_SEED_TEACHER_PASSWORD"),
    )
    upload_dir: str = Field(
        default="uploads",
        validation_alias=AliasChoices("UPLOAD_DIR", "QUIZZ_UPLOAD_DIR"),
    )
    # Origin the frontend loads uploaded media through. In dev the Vite
    # proxy forwards both `/api` and `/uploads` to the backend, so a
    # relative URL is fine. In prod the frontend is on Vercel and the
    # backend is on Render, so media URLs must be absolute — set this
    # to the backend's public origin, e.g. `https://grimguizz.onrender.com`.
    # Almost all HTTP clients fail to load `img src="/uploads/x.jpg"` as
    # a Vercel-relative URL (it 404s on the SPA rewrite), which is why
    # the hint exists.
    public_base_url: str = Field(
        default="",
        validation_alias=AliasChoices("PUBLIC_BASE_URL", "QUIZZ_PUBLIC_BASE_URL"),
    )
    # ─── Cloudflare R2 (S3-compatible) object storage ─────────────────
    # Where uploaded images/videos live in prod. Render's free plan has
    # an ephemeral filesystem (every redeploy wipes /app/uploads), so
    # upload persistence goes through R2's free tier. When ALL of
    # account/bucket/access-key/secret are set, uploads stream to R2 and
    # are served from the bucket's public base URL (r2_public_base) via
    # media_url(). Otherwise uploads stay on the local disk (dev mode,
    # served by the Vite proxy through the `/uploads` mount).
    r2_account_id: str = Field(
        default="",
        validation_alias=AliasChoices("R2_ACCOUNT_ID", "QUIZZ_R2_ACCOUNT_ID"),
    )
    r2_bucket: str = Field(
        default="",
        validation_alias=AliasChoices("R2_BUCKET", "QUIZZ_R2_BUCKET"),
    )
    r2_access_key_id: str = Field(
        default="",
        validation_alias=AliasChoices("R2_ACCESS_KEY_ID", "QUIZZ_R2_ACCESS_KEY_ID"),
    )
    r2_secret_access_key: str = Field(
        default="",
        validation_alias=AliasChoices("R2_SECRET_ACCESS_KEY", "QUIZZ_R2_SECRET_ACCESS_KEY"),
    )
    # Public base URL for the bucket: `https://pub-<hash>.r2.dev` (public
    # bucket) or a custom domain on R2. media_url() prefers this over
    # public_base_url when set.
    r2_public_base: str = Field(
        default="",
        validation_alias=AliasChoices("R2_PUBLIC_BASE_URL", "QUIZZ_R2_PUBLIC_BASE_URL"),
    )
    # Optional S3-compatible endpoint override. Only for tests against a
    # local moto server — production R2 must leave this empty (the real
    # endpoint is derived from r2_account_id).
    s3_endpoint_url: str = Field(
        default="",
        validation_alias=AliasChoices("S3_ENDPOINT_URL", "QUIZZ_S3_ENDPOINT_URL"),
    )
    max_upload_bytes: int = 2 * 1024 * 1024  # 2MB
    max_video_upload_bytes: int = 20 * 1024 * 1024  # 20MB
    allowed_image_types: set[str] = {"image/png", "image/jpeg", "image/webp"}
    allowed_video_types: set[str] = {"video/mp4", "video/webm", "video/quicktime"}
    target_width: int = 800
    target_height: int = 450  # 16:9
    # Comma-separated list of allowed origins, e.g.
    # `CORS_ORIGINS=https://quizz.vercel.app,https://*.vercel.app`.
    # `NoDecode` tells pydantic-settings to skip the JSON-list decode
    # step for this field so we can split on commas ourselves.
    cors_origins: Annotated[list[str], NoDecode] = [
        "http://localhost:8443",
        "http://127.0.0.1:8443",
    ]

    class Config:
        env_file = ".env"

    @field_validator("cors_origins", mode="before")
    @classmethod
    def _split_cors_origins(cls, v):
        # Accept either a JSON-style list (`["a","b"]`) or a comma-separated
        # string (`a,b`). The latter is what Render's `CORS_ORIGINS` env
        # var will look like in the wild.
        if isinstance(v, str):
            v = v.strip()
            if v.startswith("["):
                return v  # let pydantic parse the JSON
            return [s.strip() for s in v.split(",") if s.strip()]
        return v

    @field_validator("cors_origins", mode="after")
    @classmethod
    def _normalize_cors_origins(cls, v: list[str]) -> list[str]:
        # Strip a single trailing slash from each origin. Browsers send
        # `Origin: https://example.com` (no slash); users almost always
        # paste `https://example.com/` into env-var UIs. The two
        # strings are byte-different and Starlette's CORSMiddleware
        # compares them with a strict `==`, so a trailing slash turns
        # the entire Vercel <-> Render request path into a 400.
        # "https://" never carries a meaningful trailing slash anyway,
        # so removing it is safe and unblocks the common foot-gun.
        out: list[str] = []
        for o in v:
            if isinstance(o, str) and o.endswith("/") and not o.endswith("://"):
                o = o[:-1]
            out.append(o)
        return out


def media_url(path: str | None) -> str | None:
    """Turn a stored `/uploads/...` path into a client-usable URL.

    Passes absolute URLs through unchanged. When `r2_public_base` is set
    (R2 prod), a relative stored path gets the bucket's public origin
    prepended, so the Vercel frontend can fetch it directly from
    Cloudflare's edge (a relative `/uploads/x` would 404 on the Vercel
    SPA rewrite). Falls back to `public_base_url` (Render-served mode),
    then to the relative path in dev (matching how the Vite proxy serves
    uploads).
    """
    if not path:
        return path
    if path.startswith("http://") or path.startswith("https://"):
        return path
    base = settings.r2_public_base or settings.public_base_url
    if base:
        return base.rstrip("/") + "/" + path.lstrip("/")
    return path


settings = Settings()
