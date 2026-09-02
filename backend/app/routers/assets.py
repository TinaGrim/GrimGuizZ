from io import BytesIO

from bson import ObjectId
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from PIL import Image, ImageOps
from pymongo import DESCENDING

from ..auth import get_current_teacher
from ..config import media_url, settings
from ..db import get_db
from ..ratelimit import limit
from ..schemas import now_iso, obj_id
from .. import storage

router = APIRouter(prefix="/api/teacher/assets", tags=["assets"])


@router.post(
    "/upload",
    dependencies=[Depends(limit("asset-upload", max_calls=30, window_seconds=60))],
)
async def upload_asset(file: UploadFile = File(...), teacher_id: str = Depends(get_current_teacher)):
    db = get_db()

    is_image = file.content_type in settings.allowed_image_types
    is_video = file.content_type in settings.allowed_video_types

    if is_image:
        return await _store_image(db, file)
    if is_video:
        return await _store_video(db, file)

    raise HTTPException(
        status_code=400,
        detail="Only PNG/JPEG/WebP images or MP4/WebM videos are allowed.",
    )


async def _store_image(db, file: UploadFile) -> dict:
    if file.content_type not in settings.allowed_image_types:
        raise HTTPException(status_code=400, detail="Only PNG, JPEG, or WebP images are allowed.")

    data = await file.read()
    if len(data) > settings.max_upload_bytes:
        raise HTTPException(status_code=400, detail="Image exceeds the 2MB limit.")

    if len(data) == 0:
        raise HTTPException(status_code=400, detail="Empty file.")

    # Re-validate with Pillow (server-side, never trust the client header).
    try:
        img = Image.open(BytesIO(data))
        img.verify()
        img = Image.open(BytesIO(data))  # reopen after verify
    except Exception:
        raise HTTPException(status_code=400, detail="File is not a valid image.")

    # Strip EXIF + convert to RGB, then crop/resize to fixed 16:9.
    img = ImageOps.exif_transpose(img)
    img = img.convert("RGB")

    target_w = settings.target_width
    target_h = settings.target_height

    # Cover-crop to 16:9.
    src_w, src_h = img.size
    src_ratio = src_w / src_h
    target_ratio = target_w / target_h
    if src_ratio > target_ratio:
        new_w = int(src_h * target_ratio)
        offset = (src_w - new_w) // 2
        img = img.crop((offset, 0, offset + new_w, src_h))
    else:
        new_h = int(src_w / target_ratio)
        offset = (src_h - new_h) // 2
        img = img.crop((0, offset, src_w, offset + new_h))

    img = img.resize((target_w, target_h), Image.LANCZOS)

    import uuid
    ext_map = {"image/png": "png", "image/jpeg": "jpg", "image/webp": "webp"}
    ext = ext_map.get(file.content_type, "jpg")
    filename = f"{uuid.uuid4().hex}.{ext}"

    save_kwargs = {}
    if ext == "webp":
        save_kwargs = {"format": "WEBP", "quality": 85}
    elif ext == "png":
        save_kwargs = {"format": "PNG"}
    else:
        save_kwargs = {"format": "JPEG", "quality": 85}

    out = BytesIO()
    img.save(out, **save_kwargs)
    url = f"/uploads/{filename}"
    try:
        await storage.save(url, out.getvalue(), file.content_type)
    except storage.StorageError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    asset_id = ObjectId()
    await db.assets.insert_one({
        "_id": asset_id,
        "type": "image",
        "url": url,
        "usedIn": [],
        "uploadedAt": now_iso(),
    })

    return {
        "id": str(asset_id),
        "type": "image",
        "url": media_url(url),
        "usedIn": [],
        "uploadedAt": now_iso(),
    }


async def _store_video(db, file: UploadFile) -> dict:
    if file.content_type not in settings.allowed_video_types:
        raise HTTPException(status_code=400, detail="Only MP4, WebM, or MOV videos are allowed.")

    data = await file.read()
    if len(data) > settings.max_video_upload_bytes:
        raise HTTPException(
            status_code=400,
            detail="Video exceeds the 20MB limit — keep troll clips short.",
        )

    if len(data) == 0:
        raise HTTPException(status_code=400, detail="Empty file.")

    # Basic magic-number check so the extension matches a real video container.
    # MP4/fMP4 (ftyp), WebM (EBML), MOV (ftyp). Enough to reject plain junk.
    magic = data[:12]
    if not (
        magic[4:8] == b"ftyp"
        or magic[0:4] == b"\x1a\x45\xdf\xa3"  # EBML/WebM
        or magic[4:8] == b"moov"
    ):
        raise HTTPException(status_code=400, detail="File is not a valid video.")

    import uuid
    ext_map = {"video/mp4": "mp4", "video/webm": "webm", "video/quicktime": "mov"}
    ext = ext_map.get(file.content_type, "mp4")
    filename = f"{uuid.uuid4().hex}.{ext}"
    url = f"/uploads/{filename}"
    try:
        await storage.save(url, data, file.content_type)
    except storage.StorageError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    asset_id = ObjectId()
    await db.assets.insert_one({
        "_id": asset_id,
        "type": "video",
        "url": url,
        "usedIn": [],
        "uploadedAt": now_iso(),
    })

    return {
        "id": str(asset_id),
        "type": "video",
        "url": media_url(url),
        "usedIn": [],
        "uploadedAt": now_iso(),
    }


@router.get("")
async def list_assets(teacher_id: str = Depends(get_current_teacher)):
    db = get_db()
    out = []
    async for a in db.assets.find().sort("uploadedAt", DESCENDING):
        # compute usage: which questions use this asset (as image or as troll
        # video). Questions store whatever the picker returned — relative
        # /uploads/... paths in dev, absolute PUBLIC_BASE_URL URLs in prod —
        # while the asset row keeps the relative path, so match both variants.
        u = a.pop("_id")
        rel = a["url"]
        variants = list({rel, media_url(rel)} - {None, ""})
        a["url"] = media_url(rel)
        used_in = []
        if variants:
            qfilter = {"$or": []}
            for v in variants:
                qfilter["$or"].append({"imageUrl": v})
                qfilter["$or"].append({"trollVideoId": v})
            async for q in db.questions.find(qfilter):
                used_in.append(
                    {
                        "questionId": str(q["_id"]),
                        "prompt": q.get("prompt", ""),
                        "role": (
                            "image" if q.get("imageUrl") in variants else "troll video"
                        ),
                    }
                )
        a["usedIn"] = used_in
        a["id"] = str(u)
        out.append(a)
    return out


@router.delete("/{asset_id}")
async def delete_asset(asset_id: str, teacher_id: str = Depends(get_current_teacher)):
    db = get_db()
    asset = await db.assets.find_one({"_id": ObjectId(asset_id)})
    if asset is None:
        raise HTTPException(status_code=404, detail="Asset not found")

    # Warn before deleting in-use asset (used as a question image or troll video).
    # Questions hold whatever the picker returned — relative /uploads/... paths
    # in dev, absolute PUBLIC_BASE_URL URLs in prod — while the asset row keeps
    # the relative path, so normalize both sides and match either variant.
    rel = asset.get("url") or ""
    variants = list({rel, media_url(rel)} - {None, ""})
    qfilter = {"$or": []}
    for v in variants:
        qfilter["$or"].append({"imageUrl": v})
        qfilter["$or"].append({"trollVideoId": v})
    in_use = await db.questions.count_documents(qfilter) if variants else 0
    if in_use > 0:
        raise HTTPException(
            status_code=409,
            detail=f"Cannot delete — this asset is used by {in_use} question(s). Remove it from those questions first.",
        )

    try:
        await storage.delete(asset["url"])
    except storage.StorageError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    await db.assets.delete_one({"_id": asset["_id"]})
    return {"ok": True}
