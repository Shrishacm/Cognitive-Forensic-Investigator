"""
Credential Scanner module.
Scans extracted text for passwords, API keys, private keys,
credit card numbers, tokens, and other sensitive credentials.
"""

import re
from typing import List, Dict


# ── Regex Patterns ──────────────────────────────────────────────────────────

PATTERNS = [
    {
        "type": "private_key_rsa",
        "label": "RSA / EC Private Key",
        "severity": "critical",
        "pattern": re.compile(
            r"-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----"
        ),
    },
    {
        "type": "ssh_private_key",
        "label": "SSH Private Key",
        "severity": "critical",
        "pattern": re.compile(
            r"-----BEGIN OPENSSH PRIVATE KEY-----"
        ),
    },
    {
        "type": "aws_access_key",
        "label": "AWS Access Key ID",
        "severity": "critical",
        "pattern": re.compile(
            r"(?:AKIA|ASIA|AROA|AIDA|AIPA|ANPA|ANVA|APKA)[A-Z0-9]{16}"
        ),
    },
    {
        "type": "aws_secret_key",
        "label": "AWS Secret Access Key",
        "severity": "critical",
        "pattern": re.compile(
            r"(?i)aws[_\-]?secret[_\-]?(?:access[_\-]?)?key[\s:=\'\"]+([A-Za-z0-9/+=]{40})"
        ),
    },
    {
        "type": "github_token",
        "label": "GitHub Personal Access Token",
        "severity": "critical",
        "pattern": re.compile(
            r"(?:ghp_[A-Za-z0-9]{36}|gho_[A-Za-z0-9]{36}|github_pat_[A-Za-z0-9_]{82})"
        ),
    },
    {
        "type": "google_api_key",
        "label": "Google API Key",
        "severity": "high",
        "pattern": re.compile(
            r"AIza[0-9A-Za-z\-_]{35}"
        ),
    },
    {
        "type": "slack_token",
        "label": "Slack Token",
        "severity": "high",
        "pattern": re.compile(
            r"xox[baprs]-[A-Za-z0-9\-]+"
        ),
    },
    {
        "type": "api_key_generic",
        "label": "Generic API Key / Secret",
        "severity": "high",
        "pattern": re.compile(
            r"(?i)(?:api[_\-]?key|api[_\-]?token|access[_\-]?key|secret[_\-]?key)"
            r"[\s:=\'\"]+([A-Za-z0-9\-_]{20,64})"
        ),
    },
    {
        "type": "password_assignment",
        "label": "Password Assignment",
        "severity": "high",
        "pattern": re.compile(
            r"(?i)(?:password|passwd|pwd|pass|secret)\s*[:=]\s*[\"']?"
            r"([^\s\"'<>{}\[\]]{6,64})[\"']?"
        ),
    },
    {
        "type": "credit_card",
        "label": "Credit Card Number",
        "severity": "high",
        "pattern": re.compile(
            r"\b(?:4[0-9]{12}(?:[0-9]{3})?|"
            r"[25][1-7][0-9]{14}|"
            r"6(?:011|5[0-9][0-9])[0-9]{12}|"
            r"3[47][0-9]{13}|"
            r"3(?:0[0-5]|[68][0-9])[0-9]{11}|"
            r"(?:2131|1800|35\d{3})\d{11})\b"
        ),
    },
    {
        "type": "connection_string",
        "label": "Database Connection String",
        "severity": "high",
        "pattern": re.compile(
            r"(?i)(?:mongodb|postgresql|mysql|mssql|redis|amqp|smtp)(?:\+\w+)?"
            r"://[^\s\"'\]>]+"
        ),
    },
    {
        "type": "jwt_token",
        "label": "JWT Token",
        "severity": "medium",
        "pattern": re.compile(
            r"eyJ[A-Za-z0-9\-_]+=*\.[A-Za-z0-9\-_]+=*\.[A-Za-z0-9\-_]+=*"
        ),
    },
    {
        "type": "private_ip_cred",
        "label": "Credential with Username/Password Pair",
        "severity": "medium",
        "pattern": re.compile(
            r"(?i)(?:login|user|username)[\s:=\'\"]+\w+[\s,;]+"
            r"(?:password|pass|pwd)[\s:=\'\"]+\S+"
        ),
    },
]


# ── Helpers ─────────────────────────────────────────────────────────────────

def _redact_value(value: str) -> str:
    """Partially redacts a sensitive value. Shows first 4 and last 4 characters."""
    value = value.strip()
    if len(value) <= 8:
        return "*" * len(value)
    return value[:4] + "*" * (len(value) - 8) + value[-4:]


def _get_context(text: str, match_start: int, match_end: int, context_size: int = 60) -> str:
    """Extracts surrounding context around a regex match."""
    start = max(0, match_start - context_size)
    end = min(len(text), match_end + context_size)
    prefix = "..." if start > 0 else ""
    suffix = "..." if end < len(text) else ""
    return prefix + text[start:end].replace("\n", " ").strip() + suffix


# ── Core Scanner ─────────────────────────────────────────────────────────────

def scan_text(
    text: str,
    source_file: str = "",
    internal_path: str = "",
) -> List[Dict]:
    """
    Scans a block of text for credential patterns.
    Returns a list of finding dicts with redacted values and context.
    """
    if not text:
        return []

    findings = []
    seen_values: set = set()

    for pattern_def in PATTERNS:
        try:
            for match in pattern_def["pattern"].finditer(text):
                # Prefer first capture group if available, else full match
                value = match.group(1) if match.groups() else match.group(0)
                value = value.strip()

                # Skip too-short or trivially short values
                if len(value) < 6:
                    continue

                # Deduplicate by (type, value prefix)
                dedup_key = (pattern_def["type"], value[:20])
                if dedup_key in seen_values:
                    continue
                seen_values.add(dedup_key)

                context = _get_context(text, match.start(), match.end())

                findings.append({
                    "credential_type": pattern_def["type"],
                    "label": pattern_def["label"],
                    "severity": pattern_def["severity"],
                    "matched_value": _redact_value(value),
                    "raw_length": len(value),
                    "context": context,
                    "source_file": source_file,
                    "internal_path": internal_path,
                })
        except Exception:
            continue

    return findings


def scan_chunks(chunks: List[str], source_file: str = "") -> List[Dict]:
    """
    Scans a list of text chunks and returns deduplicated findings.
    Suitable for calling directly from the ingestion pipeline.
    """
    all_findings: List[Dict] = []
    seen: set = set()

    for chunk in chunks:
        for finding in scan_text(chunk, source_file):
            dedup_key = (finding["credential_type"], finding["matched_value"])
            if dedup_key not in seen:
                seen.add(dedup_key)
                all_findings.append(finding)

    return all_findings
