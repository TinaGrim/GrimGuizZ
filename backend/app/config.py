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


settings = Settings()
