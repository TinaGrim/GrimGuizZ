"""Uploaded-media storage with a Cloudflare R2 (S3-compatible) backend.

Render's free plan has an ephemeral filesystem — every redeploy wipes
`/app/uploads` — so for production uploads live in an R2 bucket. When
R2 is configured (see `settings.r2_*`) media streams to the bucket and
`media_url()` serves it from the bucket's public base URL. Without R2
config (local dev), this module falls back to the local `upload_dir`
that the Vite proxy serves in dev.
"""
import logging
import os

from aiobotocore.session import AioSession

from .config import settings

logger = logging.getLogger("quizz")


class StorageError(Exception):
    """Media-store operation failed; message carries the underlying error."""


def is_remote() -> bool:
    """True when R2 credentials are fully configured (prod mode)."""
    return bool(
        settings.r2_account_id
        and settings.r2_bucket
        and settings.r2_access_key_id
        and settings.r2_secret_access_key
    )


def _object_key(key: str) -> str:
    # Stored refs look like `/uploads/<file>`; R2 object keys must not
    # start with a slash, but keep the `uploads/` folder prefix so the
    # bucket's public URL path lines up with stored refs.
    return key.lstrip("/")


def _local_path(key: str) -> str:
    # Local-disk fallback: upload_dir already IS the uploads folder, so
    # only the filename is meaningful (flat namespace like the R2 keys).
    return os.path.join(settings.upload_dir, os.path.basename(key))


def _s3_client_ctx():
    session = AioSession()
    # R2 wants region "auto". When an endpoint override is set (tests
    # against a local moto server) R2 isn't in play, so a concrete AWS
    # region keeps the mock happy.
    region = "us-east-1" if settings.s3_endpoint_url else "auto"
    return session.create_client(
        "s3",
        region_name=region,
        endpoint_url=settings.s3_endpoint_url
        or f"https://{settings.r2_account_id}.r2.cloudflarestorage.com",
        aws_access_key_id=settings.r2_access_key_id,
        aws_secret_access_key=settings.r2_secret_access_key,
    )


async def save(key: str, data: bytes, content_type: str) -> None:
    """Persist `data` at `/uploads/...` `key`. R2 when configured, else disk."""
    if is_remote():
        try:
            async with _s3_client_ctx() as client:
                await client.put_object(
                    Bucket=settings.r2_bucket,
                    Key=_object_key(key),
                    Body=data,
                    ContentType=content_type,
                )
        except Exception as exc:  # ClientError, BotoCoreError, ...
            logger.exception("R2 put_object(%s) failed", key)
            raise StorageError(f"R2 upload failed: {exc}") from exc
        return
    path = _local_path(key)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "wb") as fh:
        fh.write(data)


async def delete(key: str) -> None:
    """Remove the object behind `/uploads/...` `key` (R2 or disk)."""
    if is_remote():
        try:
            async with _s3_client_ctx() as client:
                await client.delete_object(Bucket=settings.r2_bucket, Key=_object_key(key))
        except Exception as exc:
            logger.exception("R2 delete_object(%s) failed", key)
            raise StorageError(f"R2 delete failed: {exc}") from exc
        return
    try:
        os.remove(_local_path(key))
    except OSError:
        pass