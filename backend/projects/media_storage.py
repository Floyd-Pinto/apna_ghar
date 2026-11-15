"""
Single place for storing uploaded photos/videos.

* Cloudinary is used when CLOUDINARY_CLOUD_NAME / API_KEY / API_SECRET are set.
* Otherwise files are written to MEDIA_ROOT ("local mode") and served from MEDIA_URL.

Files are named by their SHA-256, so identical uploads are stored once and the
name doubles as the integrity hash that gets anchored on the blockchain.
"""
import logging
import mimetypes
import os
from glob import glob

from django.conf import settings
from django.core.files.base import ContentFile
from django.core.files.storage import FileSystemStorage

logger = logging.getLogger(__name__)

# Folder prefix kept identical to the old Cloudinary public_ids
_PREFIX = 'estate_platform/'


def cloudinary_enabled() -> bool:
    return bool(
        getattr(settings, 'CLOUDINARY_CLOUD_NAME', None)
        and getattr(settings, 'CLOUDINARY_API_KEY', None)
        and getattr(settings, 'CLOUDINARY_API_SECRET', None)
    )


def _local_storage() -> FileSystemStorage:
    return FileSystemStorage(location=settings.MEDIA_ROOT, base_url=settings.MEDIA_URL)


def _local_name(public_id: str) -> str:
    """'estate_platform/units/<sha>' -> 'units/<sha>'"""
    return public_id[len(_PREFIX):] if public_id.startswith(_PREFIX) else public_id


def _guess_extension(upload, resource_type: str) -> str:
    name = getattr(upload, 'name', '') or ''
    ext = os.path.splitext(name)[1].lower()
    if ext:
        return ext
    content_type = getattr(upload, 'content_type', '') or ''
    return mimetypes.guess_extension(content_type) or ('.mp4' if resource_type == 'video' else '.jpg')


def upload_media(data: bytes, public_id: str, resource_type: str, upload=None) -> str:
    """Store bytes under `public_id` (e.g. 'estate_platform/units/<sha256>') and return a URL."""
    if cloudinary_enabled():
        import io

        import cloudinary
        import cloudinary.api
        import cloudinary.uploader

        try:
            cloudinary.api.resource(public_id, resource_type=resource_type)
            existing = True
        except Exception:
            existing = False

        if not existing:
            res = cloudinary.uploader.upload(
                io.BytesIO(data), resource_type=resource_type, public_id=public_id, overwrite=False
            )
            return res.get('secure_url')
        builder = cloudinary.CloudinaryVideo if resource_type == 'video' else cloudinary.CloudinaryImage
        return builder(public_id).build_url(secure=True)

    storage = _local_storage()
    name = _local_name(public_id) + _guess_extension(upload, resource_type)
    if not storage.exists(name):
        storage.save(name, ContentFile(data))
    return storage.url(name)


def media_url(public_id: str, resource_type: str, stored_url: str | None = None) -> str | None:
    """URL for a previously uploaded file identified by its public_id."""
    if cloudinary_enabled():
        import cloudinary.utils

        url, _ = cloudinary.utils.cloudinary_url(public_id, resource_type=resource_type, secure=True)
        return url

    # Local mode: prefer the URL saved at upload time, else look the file up by hash
    if stored_url and not stored_url.startswith('https://res.cloudinary.com'):
        return stored_url
    matches = glob(os.path.join(str(settings.MEDIA_ROOT), glob_escape(_local_name(public_id)) + '.*'))
    if matches:
        rel = os.path.relpath(matches[0], str(settings.MEDIA_ROOT)).replace(os.sep, '/')
        return _local_storage().url(rel)
    return stored_url


def glob_escape(path: str) -> str:
    from glob import escape
    return escape(path)
