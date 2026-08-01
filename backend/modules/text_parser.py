from pdfminer.high_level import extract_text as pdf_extract
import re


def extract_text(file_path: str) -> str:
    """
    Extracts raw text from PDF or TXT file.
    Returns cleaned string.
    """
    try:
        if file_path.endswith(".pdf"):
            text = pdf_extract(file_path)
        else:
            with open(file_path, "r",
                      encoding="utf-8",
                      errors="ignore") as f:
                text = f.read()

        # Clean excessive whitespace
        lines = [line.strip()
                 for line in text.splitlines()
                 if line.strip()]
        return "\n".join(lines)

    except Exception as e:
        print(f"TEXT EXTRACTION ERROR: {e}")
        return ""


def chunk_text(text: str,
               chunk_size: int = 2000,
               overlap: int = 200) -> list[str]:
    """
    Splits text into overlapping chunks.
    Smaller chunk_size = fewer tokens per embedding = faster throughput.
    2000 chars ≈ 400 tokens, well within nomic-embed-text's 8192 token limit.
    """
    if not text:
        return []

    chunks = []
    start = 0
    while start < len(text):
        end = start + chunk_size
        chunks.append(text[start:end])
        start += chunk_size - overlap

    return [c for c in chunks if len(c.strip()) > 20]
