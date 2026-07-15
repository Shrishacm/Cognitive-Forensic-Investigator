import math
from collections import Counter

HIGH_ENTROPY_THRESHOLD = 7.5
# Above this = likely encrypted
SUSPICIOUS_THRESHOLD = 7.0
# Above this = possibly packed/obfuscated


def calculate_shannon_entropy(data: bytes) -> float:
    """
    Calculates Shannon entropy of bytes.
    Returns float between 0.0 and 8.0.

    0.0 = completely uniform (all same byte)
    8.0 = perfectly random (encrypted/compressed)

    Thresholds:
      < 5.0: Plain text, structured data
      5.0-6.5: Compressed or mixed content
      6.5-7.0: Possibly packed/obfuscated
      7.0-7.5: Likely compressed archive
      > 7.5: Almost certainly encrypted
    """
    if not data or len(data) == 0:
        return 0.0

    # Count byte frequencies
    byte_counts = Counter(data)
    total = len(data)

    # Calculate entropy
    entropy = 0.0
    for count in byte_counts.values():
        if count > 0:
            probability = count / total
            entropy -= probability * math.log2(probability)

    return round(entropy, 4)


def classify_entropy(entropy: float) -> str:
    """
    Returns human-readable classification.
    """
    if entropy >= HIGH_ENTROPY_THRESHOLD:
        return "encrypted"
    elif entropy >= SUSPICIOUS_THRESHOLD:
        return "compressed_or_packed"
    elif entropy >= 5.0:
        return "mixed_content"
    elif entropy >= 3.0:
        return "structured_data"
    else:
        return "plain_text"


def is_high_entropy(data: bytes) -> tuple:
    """
    Returns (is_suspicious, entropy_value).
    """
    entropy = calculate_shannon_entropy(data)
    return (
        entropy >= SUSPICIOUS_THRESHOLD,
        entropy
    )


def analyze_entropy_batch(
        file_data_list: list) -> list:
    """
    Calculates entropy for a list of
    byte arrays. Used for batch processing.
    """
    return [
        calculate_shannon_entropy(data)
        for data in file_data_list
    ]
