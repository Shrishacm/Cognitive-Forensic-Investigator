import json
from datetime import datetime
from collections import defaultdict

# Hour range considered suspicious
# (11 PM to 5 AM UTC)
SUSPICIOUS_HOURS = set(
    list(range(23, 24)) + 
    list(range(0, 6))
)

# If more than this many files share
# the exact same modified timestamp,
# flag as mass modification
MASS_MOD_THRESHOLD = 5

# If more than this many files are
# modified within a single minute,
# flag as rapid modification
RAPID_MOD_THRESHOLD = 10

def _parse_timestamp(ts_str: str):
    """
    Parses timestamp string to datetime.
    Returns None if unparseable.
    Expected format: YYYY-MM-DD HH:MM:SS UTC
    """
    if not ts_str or ts_str == "Unknown":
        return None
    try:
        clean = ts_str.replace(" UTC", "")
        return datetime.strptime(
            clean, "%Y-%m-%d %H:%M:%S")
    except:
        try:
            return datetime.strptime(
                ts_str[:19],
                "%Y-%m-%d %H:%M:%S")
        except:
            return None

def detect_after_hours(
        modified_at: str) -> bool:
    """
    Returns True if file was modified
    during suspicious hours (11PM-5AM UTC).
    Indicators: anti-forensics, exfiltration
    during off hours, malware activity.
    """
    dt = _parse_timestamp(modified_at)
    if not dt:
        return False
    return dt.hour in SUSPICIOUS_HOURS

def detect_backdated(
        modified_at: str,
        born_at: str) -> bool:
    """
    Returns True if file's born (metadata
    creation) time is AFTER its modified
    time. Indicates timestamp manipulation
    — a classic anti-forensics technique.
    """
    mod = _parse_timestamp(modified_at)
    born = _parse_timestamp(born_at)
    if not mod or not born:
        return False
    # Born should always be <= modified
    # If born > modified, timestamps
    # were manipulated
    return born > mod

def detect_future_timestamp(
        modified_at: str) -> bool:
    """
    Returns True if file was modified
    in the future relative to ingestion.
    Indicates severe timestamp tampering.
    """
    dt = _parse_timestamp(modified_at)
    if not dt:
        return False
    return dt > datetime.utcnow()

def detect_epoch_timestamp(
        modified_at: str) -> bool:
    """
    Returns True if timestamp is at or
    near Unix epoch (Jan 1 1970).
    Indicates wiped/zeroed timestamps.
    """
    dt = _parse_timestamp(modified_at)
    if not dt:
        return False
    return dt.year < 1975

def analyze_artifact(
        artifact: dict) -> list[str]:
    """
    Runs all single-artifact checks.
    Returns list of anomaly reason strings.
    artifact dict must have keys:
      modified_at, accessed_at,
      created_at_ts, born_at
    """
    reasons = []

    modified = artifact.get("modified_at")
    born = artifact.get("born_at")
    created = artifact.get("created_at_ts")

    if detect_after_hours(modified):
        reasons.append("after_hours")

    if detect_backdated(modified, born):
        reasons.append("backdated")

    if detect_future_timestamp(modified):
        reasons.append("future_timestamp")

    if detect_epoch_timestamp(modified):
        reasons.append("zeroed_timestamp")

    # Check if accessed before modified
    # (impossible under normal conditions)
    accessed = artifact.get("accessed_at")
    mod_dt = _parse_timestamp(modified)
    acc_dt = _parse_timestamp(accessed)
    if mod_dt and acc_dt:
        if acc_dt < mod_dt:
            reasons.append(
                "accessed_before_modified")

    return reasons

def analyze_corpus(
        artifacts: list[dict]
) -> dict[str, list[str]]:
    """
    Runs corpus-level anomaly detection
    across all artifacts together.
    Detects patterns that only appear
    when looking at the full set.

    Returns dict mapping artifact_id
    to list of additional anomaly reasons.
    """
    corpus_anomalies = defaultdict(list)

    # Group by exact modified timestamp
    # (mass modification detection)
    by_timestamp = defaultdict(list)
    for a in artifacts:
        ts = a.get("modified_at", "Unknown")
        if ts and ts != "Unknown":
            # Group by minute precision
            minute_key = ts[:16]
            by_timestamp[minute_key].append(
                a["id"])

    for minute_key, ids in \
            by_timestamp.items():
        if len(ids) >= RAPID_MOD_THRESHOLD:
            for artifact_id in ids:
                corpus_anomalies[
                    artifact_id
                ].append("mass_modification")

    # Detect exact same timestamp on
    # multiple files (timestamp wiping)
    by_exact = defaultdict(list)
    for a in artifacts:
        ts = a.get("modified_at", "Unknown")
        if ts and ts != "Unknown":
            by_exact[ts].append(a["id"])

    for ts, ids in by_exact.items():
        if len(ids) >= MASS_MOD_THRESHOLD:
            for artifact_id in ids:
                if "mass_modification" \
                        not in \
                        corpus_anomalies[
                            artifact_id]:
                    corpus_anomalies[
                        artifact_id
                    ].append(
                        "identical_timestamps")

    return dict(corpus_anomalies)

def run_anomaly_detection(
        artifacts: list[dict]
) -> list[dict]:
    """
    Main entry point. Runs all detection
    on a list of artifact dicts.

    Each artifact dict must have:
      id, modified_at, accessed_at,
      created_at_ts, born_at

    Returns list of dicts:
      {
        "id": artifact_id,
        "is_anomaly": bool,
        "reasons": [list of strings]
      }
    """
    results = []

    # Per-artifact analysis
    per_artifact = {}
    for a in artifacts:
        reasons = analyze_artifact(a)
        per_artifact[a["id"]] = reasons

    # Corpus-level analysis
    corpus = analyze_corpus(artifacts)

    # Merge results
    for a in artifacts:
        aid = a["id"]
        all_reasons = list(set(
            per_artifact.get(aid, []) +
            corpus.get(aid, [])
        ))
        results.append({
            "id": aid,
            "is_anomaly": 
                len(all_reasons) > 0,
            "reasons": all_reasons
        })

    return results

def anomaly_summary(
        results: list[dict]) -> dict:
    """
    Produces a summary of all anomalies
    found across the artifact set.
    """
    total = len(results)
    flagged = [r for r in results 
               if r["is_anomaly"]]

    reason_counts = defaultdict(int)
    for r in flagged:
        for reason in r["reasons"]:
            reason_counts[reason] += 1

    return {
        "total_artifacts": total,
        "anomaly_count": len(flagged),
        "anomaly_rate": round(
            len(flagged) / total * 100, 1
        ) if total > 0 else 0,
        "by_type": dict(reason_counts),
        "anomaly_ids": [
            r["id"] for r in flagged]
    }

ANOMALY_DESCRIPTIONS = {
    "after_hours":
        "File modified between 11PM–5AM UTC. "
        "May indicate off-hours unauthorized "
        "access or automated malware activity.",
    "backdated":
        "File born timestamp is later than "
        "modified timestamp. Indicates "
        "deliberate timestamp manipulation "
        "(anti-forensics).",
    "future_timestamp":
        "File shows a modification time in "
        "the future. Severe timestamp "
        "tampering detected.",
    "zeroed_timestamp":
        "Timestamp is at or near Unix epoch "
        "(1970). Timestamps were wiped or "
        "zeroed — classic anti-forensics.",
    "accessed_before_modified":
        "File was accessed before it was "
        "modified. Impossible under normal "
        "conditions — indicates timestamp "
        "manipulation.",
    "mass_modification":
        "More than 10 files share the same "
        "modification minute. May indicate "
        "bulk file operations, malware "
        "encryption, or data staging.",
    "identical_timestamps":
        "Multiple files share the exact same "
        "timestamp. Indicates timestamp "
        "wiping tools were used."
}
