"""
Checks that site photos/videos were captured on site, just now, with the phone camera.

This is what stops a builder from uploading an old photo: every QR upload must carry
a GPS fix and per-file capture times, and the server rejects anything stale.

* Location   - a GPS fix (latitude/longitude, accuracy) is required.
* Freshness  - each file's capture time must be within UPLOAD_MAX_CAPTURE_AGE_MINUTES of now.
               For photos the camera's own EXIF "date taken" is checked too when present.
* Geofence   - optional: with UPLOAD_GEOFENCE_KM > 0 and project coordinates set, the fix must be
               within that distance of the project.

All results are returned so they can be stored with the upload for auditing.
"""
import io
import math
from datetime import datetime, timedelta, timezone as dt_timezone

from django.conf import settings
from django.utils import timezone

FUTURE_TOLERANCE = timedelta(minutes=2)  # small clock drift between phone and server


class CaptureRejected(Exception):
    def __init__(self, message, code):
        super().__init__(message)
        self.code = code


def _max_age():
    return timedelta(minutes=getattr(settings, 'UPLOAD_MAX_CAPTURE_AGE_MINUTES', 15))


def _parse_iso(value):
    if not value:
        return None
    try:
        parsed = datetime.fromisoformat(str(value).replace('Z', '+00:00'))
    except ValueError:
        return None
    if timezone.is_naive(parsed):
        parsed = parsed.replace(tzinfo=dt_timezone.utc)
    return parsed


def _check_fresh(when, now, label):
    if when > now + FUTURE_TOLERANCE:
        raise CaptureRejected(f'{label} has a capture time in the future. Check the phone clock.', 'CAPTURE_TIME_INVALID')
    if now - when > _max_age():
        minutes = int((now - when).total_seconds() // 60)
        raise CaptureRejected(
            f'{label} was captured {minutes} minutes ago. Only photos taken in the last '
            f'{int(_max_age().total_seconds() // 60)} minutes can be uploaded - take a new one on site.',
            'STALE_CAPTURE',
        )


def _exif_taken_at(data: bytes, tz_offset_minutes):
    """EXIF DateTimeOriginal as an aware datetime, or None if the photo has no EXIF date."""
    try:
        from PIL import Image
        exif = Image.open(io.BytesIO(data)).getexif()
    except Exception:
        return None
    sub = exif.get_ifd(0x8769) if hasattr(exif, 'get_ifd') else {}
    raw = sub.get(0x9003) or exif.get(0x0132)  # DateTimeOriginal, else DateTime
    if not raw:
        return None
    try:
        taken = datetime.strptime(str(raw).strip(), '%Y:%m:%d %H:%M:%S')
    except ValueError:
        return None
    offset = sub.get(0x9011)  # OffsetTimeOriginal, e.g. "+05:30"
    if offset:
        try:
            sign = 1 if offset[0] == '+' else -1
            hours, minutes = offset[1:].split(':')
            tz = dt_timezone(sign * timedelta(hours=int(hours), minutes=int(minutes)))
            return taken.replace(tzinfo=tz)
        except (ValueError, IndexError):
            pass
    # No offset in EXIF: the camera wrote local time, use the phone's reported offset
    if tz_offset_minutes is None:
        return None
    return taken.replace(tzinfo=dt_timezone(timedelta(minutes=-int(tz_offset_minutes))))


def _distance_km(lat1, lon1, lat2, lon2):
    r = 6371.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp, dl = math.radians(lat2 - lat1), math.radians(lon2 - lon1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * r * math.asin(math.sqrt(a))


def verify_capture(capture_metadata: dict, images, videos, project) -> dict:
    """Validate an upload. Raises CaptureRejected, otherwise returns the verification record."""
    now = timezone.now()
    meta = capture_metadata or {}

    # 1. Location
    location = meta.get('location') or {}
    try:
        lat, lng = float(location['latitude']), float(location['longitude'])
    except (KeyError, TypeError, ValueError):
        raise CaptureRejected(
            'Location is required: allow location access so the upload can be verified as taken on site.',
            'LOCATION_REQUIRED',
        )
    if not (-90 <= lat <= 90 and -180 <= lng <= 180):
        raise CaptureRejected('Invalid GPS coordinates.', 'LOCATION_INVALID')

    record = {
        'verified_at': now.isoformat(),
        'location': {'latitude': lat, 'longitude': lng, 'accuracy_m': location.get('accuracy')},
        'max_capture_age_minutes': int(_max_age().total_seconds() // 60),
        'files': [],
    }

    # 2. Optional geofence around the project
    radius = float(getattr(settings, 'UPLOAD_GEOFENCE_KM', 0) or 0)
    if project.latitude is not None and project.longitude is not None:
        distance = _distance_km(lat, lng, float(project.latitude), float(project.longitude))
        record['distance_from_project_km'] = round(distance, 3)
        if radius > 0 and distance > radius:
            raise CaptureRejected(
                f'You are {distance:.1f} km from the project site. Uploads must be made within {radius:g} km of it.',
                'OUTSIDE_GEOFENCE',
            )

    # 3. Freshness of every file
    file_times = {f.get('name'): f for f in meta.get('files') or [] if isinstance(f, dict)}
    tz_offset = meta.get('tz_offset_minutes')
    for kind, files in (('image', images), ('video', videos)):
        for upload in files:
            label = f'"{upload.name}"'
            info = file_times.get(upload.name) or {}
            client_time = _parse_iso(info.get('last_modified'))
            if client_time is None:
                raise CaptureRejected(f'{label} has no capture time.', 'CAPTURE_TIME_MISSING')
            _check_fresh(client_time, now, label)

            entry = {'name': upload.name, 'type': kind, 'captured_at': client_time.isoformat()}
            if kind == 'image':
                data = upload.read()
                upload.seek(0)
                taken = _exif_taken_at(data, tz_offset)
                if taken is not None:
                    _check_fresh(taken, now, f'{label} (camera timestamp)')
                    entry['exif_taken_at'] = taken.isoformat()
            record['files'].append(entry)

    return record
