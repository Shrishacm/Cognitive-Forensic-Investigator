import os
import hashlib
import json
import sqlite3
import tempfile
from datetime import datetime
from typing import Generator
from backend.modules.entropy_analyzer import (
    calculate_shannon_entropy,
    HIGH_ENTROPY_THRESHOLD)
from backend.modules.file_store import (
    should_save_file,
    is_browser_viewable,
    save_file,
    get_stored_path,
    get_mime_type)

# These imports are conditional —
# wrap in try/except for graceful failure
try:
    import pyewf
    PYEWF_AVAILABLE = True
except ImportError:
    PYEWF_AVAILABLE = False
    print("WARNING: pyewf not available. "
          ".E01 support disabled.")

try:
    import pytsk3
    PYTSK3_AVAILABLE = True
except ImportError:
    PYTSK3_AVAILABLE = False
    print("WARNING: pytsk3 not available. "
          "Forensic disk images disabled.")

try:
    import exifread
    EXIFREAD_AVAILABLE = True
except ImportError:
    EXIFREAD_AVAILABLE = False

from pdfminer.high_level import (
    extract_text as pdf_extract)
from bs4 import BeautifulSoup

# File types we extract text from
TEXT_EXTENSIONS = {
    '.txt', '.log', '.csv', '.xml',
    '.json', '.md', '.py', '.js',
    '.html', '.htm'
    # NOTE: .eml and .msg are now handled
    # by media_extractor (email extractor)
    # which parses headers + body properly.
}
PDF_EXTENSIONS = {'.pdf'}
DB_EXTENSIONS = {'.db', '.sqlite', '.sqlite3'}
IMAGE_EXTENSIONS = {
    '.jpg', '.jpeg', '.png',
    '.tiff', '.tif', '.bmp',
    '.gif', '.webp'
}
HTML_EXTENSIONS = {'.html', '.htm'}

# New multimedia extension sets
OFFICE_EXTENSIONS = {
    '.docx', '.doc',
    '.xlsx', '.xls',
    '.pptx', '.ppt'
}
AUDIO_EXTENSIONS = {
    '.mp3', '.wav', '.m4a',
    '.flac', '.ogg', '.aac',
    '.wma', '.aiff'
}
VIDEO_EXTENSIONS = {
    '.mp4', '.avi', '.mov',
    '.mkv', '.wmv', '.flv',
    '.webm', '.m4v'
}
EMAIL_EXTENSIONS = {'.eml', '.msg'}

# Skip system/binary/archive files
# Audio and video are NO LONGER skipped —
# they are processed by media_extractor.
SKIP_EXTENSIONS = {
    '.exe', '.dll', '.sys', '.bin',
    '.so', '.dylib', '.o', '.a',
    '.zip', '.tar', '.gz', '.7z',
    '.rar', '.pkg', '.dmg', '.iso',
    '.psd', '.ai'
}

# Max file size for text/office/email (50 MB)
# Video files have a separate 2 GB limit.
MAX_FILE_SIZE = 50 * 1024 * 1024
VIDEO_MAX_FILE_SIZE = 2 * 1024 * 1024 * 1024


def compute_sha256(file_path: str) -> str:
    """Computes SHA-256 of a file on disk."""
    sha256 = hashlib.sha256()
    try:
        with open(file_path, "rb") as f:
            for chunk in iter(
                    lambda: f.read(8192), b""):
                sha256.update(chunk)
        return sha256.hexdigest()
    except Exception as e:
        print(f"[FORENSIC] SHA256 error: {e}")
        return ""


def compute_sha256_bytes(data: bytes) -> str:
    """Computes SHA-256 of bytes in memory."""
    return hashlib.sha256(data).hexdigest()


def format_timestamp(ts_value) -> str:
    """Converts pytsk3 timestamp to string."""
    try:
        if ts_value and ts_value > 0:
            return datetime.utcfromtimestamp(
                ts_value
            ).strftime('%Y-%m-%d %H:%M:%S UTC')
    except Exception:
        pass
    return "Unknown"


def is_supported_file(filename: str,
                      size: int) -> bool:
    """
    Returns True if the file should be
    processed. Skips system files, empty
    files, and oversized files.
    Video files have a higher size limit
    (2 GB) since only the audio track
    is transcribed.
    Registry hive files (NTUSER.DAT, SYSTEM,
    SOFTWARE, SAM, etc.) have no extension
    but are explicitly allowed by name.
    """
    if not filename or filename.startswith('$'):
        return False  # Skip NTFS system files
    if size <= 0:
        return False
    ext = os.path.splitext(filename.lower())[1]
    if ext in SKIP_EXTENSIONS:
        return False
    # Video files: allow up to 2 GB
    if ext in VIDEO_EXTENSIONS:
        if size > VIDEO_MAX_FILE_SIZE:
            print(f"[FORENSIC] Skipping "
                  f"{filename}: "
                  f"{size / 1e9:.1f} GB "
                  f"exceeds 2 GB video limit")
            return False
        return True
    # Registry hives: no extension but matched by name
    if not ext:
        try:
            from backend.modules.registry_parser import REGISTRY_HIVES
            if filename.lower() in REGISTRY_HIVES:
                return True
        except ImportError:
            pass
        return False  # Unknown extensionless file — skip
    # All other files: max 50 MB
    if size > MAX_FILE_SIZE:
        return False
    return True


def extract_text_from_bytes(
        data: bytes,
        filename: str,
        temp_dir: str) -> tuple:
    """
    Extracts text from file bytes.
    Returns (extracted_text, extraction_type)
    Writes to temp file for libraries
    that need a file path.
    """
    ext = os.path.splitext(filename.lower())[1]

    # PDF files — check before text
    if ext in PDF_EXTENSIONS:
        try:
            tmp_path = os.path.join(
                temp_dir, f"tmp_{filename}")
            with open(tmp_path, 'wb') as f:
                f.write(data)
            text = pdf_extract(tmp_path)
            try:
                os.remove(tmp_path)
            except Exception:
                pass
            return (text[:50000] if text else ""), 'pdf'
        except Exception:
            return "", 'pdf'

    # SQLite databases — check before text
    if ext in DB_EXTENSIONS:
        try:
            from backend.modules.media_extractor import extract_browser_history
            browser_history = extract_browser_history(
                data, filename, temp_dir)
            if browser_history:
                return (browser_history,
                        'browser_history')

            tmp_path = os.path.join(
                temp_dir, f"tmp_{filename}")
            with open(tmp_path, 'wb') as f:
                f.write(data)
            text_parts = []
            conn = sqlite3.connect(tmp_path)
            cursor = conn.cursor()
            cursor.execute(
                "SELECT name FROM sqlite_master "
                "WHERE type='table'")
            tables = cursor.fetchall()
            for (table_name,) in tables[:10]:
                try:
                    cursor.execute(
                        f'SELECT * FROM "{table_name}" '
                        f"LIMIT 100")
                    rows = cursor.fetchall()
                    text_parts.append(
                        f"Table: {table_name}")
                    for row in rows:
                        text_parts.append(
                            ' | '.join(
                                str(c) for c in row
                                if c is not None
                            )
                        )
                except Exception:
                    continue
            conn.close()
            try:
                os.remove(tmp_path)
            except Exception:
                pass
            return (
                '\n'.join(text_parts)[:50000],
                'sqlite'
            )
        except Exception:
            return "", 'sqlite'

    # HTML files — check before text (.html is in both sets)
    if ext in HTML_EXTENSIONS:
        try:
            soup = BeautifulSoup(data, 'lxml')
            text = soup.get_text(
                separator=' ', strip=True)
            return text[:50000], 'html'
        except Exception:
            return "", 'html'

    # Image files — try OCR first,
    # then fall through to EXIF below
    if ext in IMAGE_EXTENSIONS:
        from backend.modules.media_extractor \
            import extract_image_ocr
        ocr_text = extract_image_ocr(data)
        if ocr_text and len(
                ocr_text.strip()) > 20:
            return ocr_text[:20000], 'ocr', {}
        # Fall through to EXIF + GPS extraction
        if EXIFREAD_AVAILABLE:
            try:
                import io
                tags = exifread.process_file(
                    io.BytesIO(data),
                    details=False
                )

                # Extract GPS coordinates
                gps_lat     = tags.get('GPS GPSLatitude')
                gps_lat_ref = tags.get('GPS GPSLatitudeRef')
                gps_lon     = tags.get('GPS GPSLongitude')
                gps_lon_ref = tags.get('GPS GPSLongitudeRef')

                lat = lon = None
                if gps_lat and gps_lat_ref:
                    lat = _convert_gps(
                        gps_lat, str(gps_lat_ref))
                if gps_lon and gps_lon_ref:
                    lon = _convert_gps(
                        gps_lon, str(gps_lon_ref))

                exif_dict = {
                    str(k): str(v)
                    for k, v in tags.items()
                    if not k.startswith('Thumbnail')
                }

                # Embed GPS in exif_dict for caller
                if lat is not None and lon is not None:
                    exif_dict['_gps_lat'] = lat
                    exif_dict['_gps_lon'] = lon

                # Build text output
                text_parts = []
                if lat is not None and lon is not None:
                    text_parts.append(
                        f"GPS Location: {lat:.6f}, {lon:.6f}")
                for k, v in list(exif_dict.items())[:20]:
                    if not k.startswith('_'):
                        text_parts.append(f"{k}: {v}")

                return (
                    '\n'.join(text_parts)[:10000],
                    'exif',
                    exif_dict
                )
            except Exception:
                pass
        return "", 'exif', {}

    # Plain text files
    # (txt, log, csv, json, py, js, md…)
    if ext in TEXT_EXTENSIONS:
        try:
            text = data.decode(
                'utf-8', errors='ignore')
            return text[:50000], 'text', {}
        except Exception:
            return "", 'text', {}

    # Office documents, audio, video, email
    # Route to media_extractor module
    if ext in (
        OFFICE_EXTENSIONS |
        AUDIO_EXTENSIONS |
        VIDEO_EXTENSIONS |
        EMAIL_EXTENSIONS
    ):
        from backend.modules.media_extractor \
            import extract_media
        result = extract_media(
            data, filename, temp_dir)
        # extract_media returns (text, type)
        return result[0], result[1], {}

    return "", 'unsupported', {}


def _convert_gps(coord, ref) -> float:
    """
    Converts an exifread GPS coordinate
    value to decimal degrees.
    Returns None on failure.
    """
    try:
        from fractions import Fraction

        def to_float(val):
            if hasattr(val, 'num'):
                return float(
                    Fraction(val.num, val.den))
            return float(val)

        vals = coord.values
        degrees = to_float(vals[0])
        minutes = to_float(vals[1])
        seconds = to_float(vals[2])
        decimal = (degrees +
                   minutes / 60 +
                   seconds / 3600)
        if ref in ('S', 'W'):
            decimal = -decimal
        return round(decimal, 6)
    except Exception:
        return None


# ---------------------------------------------------------------------------
# EWFImageInfo — bridge between pyewf and pytsk3
# ---------------------------------------------------------------------------

if PYTSK3_AVAILABLE:
    class EWFImageInfo(pytsk3.Img_Info):
        """
        Bridge class between pyewf and pytsk3.
        Allows pytsk3 to read from an open
        pyewf handle.
        """
        def __init__(self, ewf_handle):
            self._ewf_handle = ewf_handle
            super().__init__(
                url="",
                type=pytsk3.TSK_IMG_TYPE_EXTERNAL
            )

        def get_size(self):
            return self._ewf_handle.get_media_size()

        def read(self, offset, length):
            self._ewf_handle.seek(offset)
            return self._ewf_handle.read(length)

else:
    class EWFImageInfo:
        """Stub when pytsk3 is not installed."""
        def __init__(self, ewf_handle):
            raise RuntimeError(
                "pytsk3 is not installed.")


# ---------------------------------------------------------------------------
# Filesystem walker
# ---------------------------------------------------------------------------

def walk_filesystem(
        img_info,
        fs_info,
        directory=None,
        path="/",
        include_deleted: bool = False) -> Generator:
    """
    Recursively walks the filesystem.
    Yields dict for each regular file found.
    When include_deleted=True, also yields
    files marked as unallocated/deleted.
    """
    if not PYTSK3_AVAILABLE:
        return

    if directory is None:
        directory = fs_info.open_dir(path="/")

    for entry in directory:
        try:
            # Skip . and .. entries
            name = entry.info.name.name
            if isinstance(name, bytes):
                name = name.decode(
                    'utf-8', errors='replace')
            if name in ('.', '..'):
                continue

            # Skip if no metadata
            if (not entry.info.meta or
                    entry.info.meta.type is None):
                continue

            full_path = os.path.join(path, name)

            # If directory, recurse
            if (entry.info.meta.type ==
                    pytsk3.TSK_FS_META_TYPE_DIR):
                try:
                    sub_dir = entry.as_directory()
                    yield from walk_filesystem(
                        img_info, fs_info,
                        sub_dir, full_path,
                        include_deleted=include_deleted)
                except Exception:
                    continue

            # If regular file
            elif (entry.info.meta.type ==
                  pytsk3.TSK_FS_META_TYPE_REG):
                size = entry.info.meta.size

                # Detect if deleted/unallocated
                is_deleted = bool(
                    entry.info.meta.flags &
                    pytsk3.TSK_FS_META_FLAG_UNALLOC
                )

                # Skip deleted files unless explicitly requested
                if is_deleted and not include_deleted:
                    continue

                if not is_supported_file(name, size):
                    if not (is_deleted and include_deleted):
                        continue

                # Get MACB timestamps
                meta = entry.info.meta
                yield {
                    "filename": name,
                    "internal_path": full_path,
                    "size": size,
                    "modified": format_timestamp(
                        meta.mtime),
                    "accessed": format_timestamp(
                        meta.atime),
                    "created": format_timestamp(
                        meta.crtime),
                    "born": format_timestamp(
                        meta.ctime),
                    "entry": entry,
                    "is_deleted": is_deleted
                }

        except Exception as e:
            print(f"[FORENSIC] Walk error "
                  f"at {path}: {e}")
            continue


# ---------------------------------------------------------------------------
# E01 ingestion
# ---------------------------------------------------------------------------

def ingest_e01(image_path: str,
               temp_dir: str,
               include_deleted: bool = False) -> Generator:
    """
    Opens .E01 image and yields file info
    dicts for all extractable files.
    Requires pyewf and pytsk3.
    """
    if not PYEWF_AVAILABLE:
        raise RuntimeError(
            "pyewf not installed. "
            "Run: pip install pyewf")
    if not PYTSK3_AVAILABLE:
        raise RuntimeError(
            "pytsk3 not installed. "
            "Run: pip install pytsk3")

    filenames = pyewf.glob(image_path)
    ewf_handle = pyewf.handle()
    ewf_handle.open(filenames)

    try:
        img_info = EWFImageInfo(ewf_handle)

        # Try to detect partition table
        try:
            volume = pytsk3.Volume_Info(img_info)
            for part in volume:
                if (part.flags ==
                        pytsk3.TSK_VS_PART_FLAG_ALLOC):
                    try:
                        fs = pytsk3.FS_Info(
                            img_info,
                            offset=(part.start * 512)
                        )
                        yield from walk_filesystem(
                            img_info, fs,
                            include_deleted=include_deleted)
                        fs.close()
                    except Exception:
                        continue
        except Exception:
            # No partition table —
            # try opening filesystem directly
            try:
                fs = pytsk3.FS_Info(img_info)
                yield from walk_filesystem(
                    img_info, fs,
                    include_deleted=include_deleted)
                fs.close()
            except Exception as e:
                raise RuntimeError(
                    f"Cannot read filesystem: {e}")
    finally:
        ewf_handle.close()


# ---------------------------------------------------------------------------
# Raw image ingestion (.001 / .dd)
# ---------------------------------------------------------------------------

def ingest_raw(image_path: str,
               temp_dir: str,
               include_deleted: bool = False) -> Generator:
    """
    Opens .001 or .dd raw image.
    Yields file info dicts.
    """
    if not PYTSK3_AVAILABLE:
        raise RuntimeError(
            "pytsk3 not installed.")

    img_info = pytsk3.Img_Info(image_path)

    try:
        # Try partition table first
        try:
            volume = pytsk3.Volume_Info(img_info)
            for part in volume:
                if (part.flags ==
                        pytsk3.TSK_VS_PART_FLAG_ALLOC):
                    try:
                        fs = pytsk3.FS_Info(
                            img_info,
                            offset=(part.start * 512)
                        )
                        yield from walk_filesystem(
                            img_info, fs,
                            include_deleted=include_deleted)
                        fs.close()
                    except Exception:
                        continue
        except Exception:
            fs = pytsk3.FS_Info(img_info)
            yield from walk_filesystem(
                img_info, fs,
                include_deleted=include_deleted)
            fs.close()
    finally:
        img_info.close()


# ---------------------------------------------------------------------------
# Per-file content extraction
# ---------------------------------------------------------------------------

def extract_file_content(
        file_entry: dict,
        temp_dir: str,
        extracted_base_dir: str = None) -> dict:
    """
    Reads file bytes from disk image entry
    and extracts text, metadata, GPS coords,
    Shannon entropy, and optionally saves
    the raw file to disk for browser viewing.
    Returns enriched dict.
    """
    try:
        entry = file_entry["entry"]
        size = file_entry["size"]

        # Read file bytes
        file_obj = entry.as_file()
        data = file_obj.read_random(0, size)

        # Compute artifact hash
        artifact_hash = compute_sha256_bytes(data)

        # Calculate Shannon entropy before text extraction
        entropy = calculate_shannon_entropy(data)
        is_high = entropy >= HIGH_ENTROPY_THRESHOLD

        # Save file to disk if appropriate
        stored_path = None
        stored_size = 0
        viewable = is_browser_viewable(file_entry["filename"])

        if (extracted_base_dir and
                should_save_file(
                    file_entry["filename"],
                    file_entry["size"])):
            stored_path = get_stored_path(
                extracted_base_dir,
                file_entry["internal_path"]
            )
            success = save_file(data, stored_path)
            if success:
                stored_size = len(data)
            else:
                stored_path = None

        # Extract text — now returns 3-tuple
        # (text, extraction_type, exif_dict)
        result = extract_text_from_bytes(
            data,
            file_entry["filename"],
            temp_dir
        )
        if len(result) == 3:
            text, extraction_type, exif_dict = result
        else:
            text, extraction_type = result
            exif_dict = {}

        # If very high entropy and no text extracted,
        # mark the type clearly so analysts know.
        if is_high and not text:
            extraction_type = "high_entropy_binary"

        # Extract GPS from exif_dict if present
        gps_lat = exif_dict.get('_gps_lat')
        gps_lon = exif_dict.get('_gps_lon')

        return {
            **file_entry,
            "sha256_hash": artifact_hash,
            "extracted_text": text,
            "extraction_type": extraction_type,
            "data_size": len(data),
            "shannon_entropy": entropy,
            "is_high_entropy": is_high,
            "gps_latitude": gps_lat,
            "gps_longitude": gps_lon,
            "stored_file_path": stored_path,
            "stored_file_size": stored_size,
            "is_viewable": viewable
        }
    except Exception as e:
        return {
            **file_entry,
            "sha256_hash": "",
            "extracted_text": "",
            "extraction_type": "error",
            "shannon_entropy": None,
            "is_high_entropy": False,
            "gps_latitude": None,
            "gps_longitude": None,
            "stored_file_path": None,
            "stored_file_size": 0,
            "is_viewable": False,
            "error": str(e)
        }
