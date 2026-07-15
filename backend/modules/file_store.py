import os
import re
import hashlib
from pathlib import Path

# Max size to save per extracted file
# Files larger than this are text-only
MAX_STORE_SIZE_BYTES = 100 * 1024 * 1024
# 100MB per file

# File types that are viewable in browser
VIEWABLE_TYPES = {
    # Images
    '.jpg', '.jpeg', '.png',
    '.gif', '.bmp', '.webp',
    # Documents
    '.pdf', '.txt', '.log',
    '.csv', '.xml', '.json',
    '.md', '.py', '.js',
    # Office
    '.docx', '.xlsx', '.pptx',
    # Media
    '.mp3', '.wav', '.m4a',
    '.mp4', '.avi', '.mov',
    '.mkv', '.ogg', '.flac',
    # Email
    '.eml', '.msg',
    # Web
    '.html', '.htm',
    # Database
    '.db', '.sqlite', '.sqlite3',
}

# File types to NOT save
# (system files, executables, etc.)
SKIP_SAVE_TYPES = {
    '.exe', '.dll', '.sys',
    '.so', '.dylib', '.o',
    '.a', '.lib', '.obj',
}


def sanitize_internal_path(internal_path: str) -> str:
    """
    Converts an internal disk path to a
    safe relative filesystem path.

    /Users/john/Documents/secret.pdf
    → Users/john/Documents/secret.pdf

    Prevents path traversal attacks.
    """
    # Remove leading slashes
    path = internal_path.lstrip('/')
    path = path.lstrip('\\')

    # Split and sanitize each component
    parts = re.split(r'[/\\]', path)
    safe_parts = []
    for part in parts:
        # Skip traversal attempts
        if part in ('..', '.', ''):
            continue
        # Replace unsafe characters
        safe = re.sub(
            r'[<>:"|?*\x00-\x1f]',
            '_', part)
        safe_parts.append(safe)

    return os.path.join(*safe_parts) \
        if safe_parts else 'unnamed_file'


def get_stored_path(base_dir: str, internal_path: str) -> str:
    """
    Returns the absolute path where
    a file should be stored.
    """
    safe_rel = sanitize_internal_path(internal_path)
    return os.path.join(base_dir, safe_rel)


def should_save_file(filename: str, size_bytes: int) -> bool:
    """
    Returns True if this file should
    be saved to disk.
    """
    ext = os.path.splitext(filename.lower())[1]

    if ext in SKIP_SAVE_TYPES:
        return False

    if size_bytes > MAX_STORE_SIZE_BYTES:
        return False

    return True


def is_browser_viewable(filename: str) -> bool:
    """
    Returns True if this file type
    can be displayed in the browser.
    """
    ext = os.path.splitext(filename.lower())[1]
    return ext in VIEWABLE_TYPES


def save_file(data: bytes, stored_path: str) -> bool:
    """
    Saves file bytes to disk.
    Creates parent directories as needed.
    Returns True on success.
    """
    try:
        os.makedirs(
            os.path.dirname(stored_path),
            exist_ok=True
        )
        with open(stored_path, 'wb') as f:
            f.write(data)
        return True
    except Exception as e:
        print(f"[FILESTORE] Save error {stored_path}: {e}")
        return False


def get_mime_type(filename: str) -> str:
    """
    Returns MIME type for serving files.
    """
    import mimetypes
    mime, _ = mimetypes.guess_type(filename)
    if mime:
        return mime

    ext = os.path.splitext(filename.lower())[1]
    MIME_MAP = {
        '.txt':    'text/plain',
        '.log':    'text/plain',
        '.csv':    'text/csv',
        '.json':   'application/json',
        '.xml':    'application/xml',
        '.html':   'text/html',
        '.htm':    'text/html',
        '.md':     'text/markdown',
        '.pdf':    'application/pdf',
        '.docx':   'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        '.xlsx':   'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        '.pptx':   'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        '.mp3':    'audio/mpeg',
        '.wav':    'audio/wav',
        '.m4a':    'audio/mp4',
        '.flac':   'audio/flac',
        '.ogg':    'audio/ogg',
        '.mp4':    'video/mp4',
        '.avi':    'video/x-msvideo',
        '.mov':    'video/quicktime',
        '.mkv':    'video/x-matroska',
        '.jpg':    'image/jpeg',
        '.jpeg':   'image/jpeg',
        '.png':    'image/png',
        '.gif':    'image/gif',
        '.bmp':    'image/bmp',
        '.tiff':   'image/tiff',
        '.webp':   'image/webp',
        '.eml':    'message/rfc822',
        '.db':     'application/x-sqlite3',
        '.sqlite': 'application/x-sqlite3',
        '.py':     'text/x-python',
        '.js':     'text/javascript',
    }
    return MIME_MAP.get(ext, 'application/octet-stream')


def get_case_storage_stats(extracted_dir: str) -> dict:
    """
    Returns total storage used by
    extracted files for a case.
    """
    total_bytes = 0
    total_files = 0
    try:
        for root, dirs, files in os.walk(extracted_dir):
            for f in files:
                fp = os.path.join(root, f)
                total_bytes += os.path.getsize(fp)
                total_files += 1
    except:
        pass
    return {
        "total_bytes": total_bytes,
        "total_mb": round(total_bytes / 1024 / 1024, 1),
        "total_files": total_files
    }
