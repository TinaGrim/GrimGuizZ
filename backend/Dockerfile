# Render builds from this Dockerfile. The image is kept small (slim
# base, no build tools after the wheel step), and runs uvicorn as a
# non-root user. Pinned to Python 3.12 to match the dev venv.
FROM python:3.12-slim AS base

# Pillow + bcrypt build wheels cleanly on slim; nothing else needs
# system libs at install time. If you add libs (e.g. lxml) add them
# to this list.
RUN apt-get update \
 && apt-get install -y --no-install-recommends curl ca-certificates \
 && rm -rf /var/lib/apt/lists/*

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PORT=8000

WORKDIR /app

# Install deps first so this layer is cached when only the app source
# changes. requirements.txt is the canonical list — keep it in sync
# with any new server-side imports.
COPY requirements.txt ./
RUN pip install -r requirements.txt

# App source
COPY app ./app

# Uploads directory — only used as the local-disk fallback when R2 is
# not configured (dev). In prod the container filesystem is ephemeral
# anyway, so real media goes to Cloudflare R2; see render.yaml.
RUN mkdir -p /app/uploads
ENV UPLOAD_DIR=/app/uploads

# Non-root. The numeric UID matches Render's default; the unprivileged
# user is required for any service that runs as `web`.
RUN useradd --create-home --uid 10001 --shell /bin/bash app
# /app/uploads is created by root (RUN above runs as root) but the
# container later switches to `app` — without a chown, directory writes
# (local-fallback asset uploads) fail with PermissionError → HTTP 500
# with no CORS headers, which the browser reports as "CORS header missing".
RUN chown -R app:app /app/uploads
USER app

EXPOSE 8000

# Container-level health check pings /api/health; Render also pings
# it independently. The 3-attempt window absorbs slow startup.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD curl -fsS http://127.0.0.1:${PORT}/api/health || exit 1

CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT}"]
