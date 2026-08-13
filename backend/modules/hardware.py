"""
hardware.py — Single source-of-truth hardware detection for CFI
================================================================
Detects and reports available compute backends without any hardcoding.
Covers: NVIDIA CUDA, AMD ROCm, Apple MPS, Intel XPU (Arc), and CPU.

All other modules should import from here instead of calling torch directly.

Usage:
    from backend.modules.hardware import detect_device, get_hardware_info

    device = detect_device()          # "cuda" | "mps" | "xpu" | "cpu"
    info   = get_hardware_info()      # full dict for telemetry API
    modes  = list_available_backends()# ["auto","cuda","cpu"] etc.
"""

import os
import subprocess
import platform
import time
import threading
from typing import Optional

# ── Internal cache ────────────────────────────────────────────────────────────
_cache_lock   = threading.Lock()
_info_cache   = None          # cached get_hardware_info() result
_cache_time   = 0.0           # when it was last populated
_CACHE_TTL_S  = 10.0          # seconds before re-probing hardware

# ── Public API ────────────────────────────────────────────────────────────────

def detect_device() -> str:
    """
    Returns the best available compute device string respecting HARDWARE_MODE.

    Priority (auto mode):
        1. NVIDIA CUDA   (torch.cuda.is_available())
        2. AMD ROCm      (torch.cuda.is_available() with ROCm build)
        3. Apple MPS     (torch.backends.mps.is_available())
        4. Intel XPU     (torch.xpu.is_available() — PyTorch ≥ 2.4)
        5. CPU           (always available)

    HARDWARE_MODE overrides:
        "cpu"  → always CPU
        "cuda" → CUDA/ROCm if present, else CPU (graceful fallback)
        "mps"  → MPS if present, else CPU
        "auto" → best available (default)
    """
    mode = os.getenv("HARDWARE_MODE", "auto").lower().strip()

    # Forced CPU
    if mode == "cpu":
        return "cpu"

    try:
        import torch
    except ImportError:
        return "cpu"

    # Forced CUDA/ROCm
    if mode == "cuda":
        if torch.cuda.is_available():
            return "cuda"
        print("[HARDWARE] HARDWARE_MODE=cuda but CUDA not available — falling back to CPU")
        return "cpu"

    # Forced MPS
    if mode == "mps":
        if hasattr(torch.backends, "mps") and torch.backends.mps.is_available():
            return "mps"
        print("[HARDWARE] HARDWARE_MODE=mps but MPS not available — falling back to CPU")
        return "cpu"

    # Auto — probe in priority order
    # 1. NVIDIA CUDA or AMD ROCm (both surfaced via torch.cuda)
    if torch.cuda.is_available():
        return "cuda"

    # 2. Apple Silicon MPS
    if hasattr(torch.backends, "mps") and torch.backends.mps.is_available():
        return "mps"

    # 3. Intel XPU (Arc, Gaudi) — PyTorch 2.4+
    if hasattr(torch, "xpu") and torch.xpu.is_available():
        return "xpu"

    return "cpu"


def list_available_backends() -> list[str]:
    """
    Returns a list of compute backend IDs that are actually available
    on this machine. Always includes 'auto' and 'cpu'.

    Example returns:
        ["auto", "cuda", "cpu"]          # NVIDIA system
        ["auto", "mps", "cpu"]           # Apple Silicon
        ["auto", "cuda", "mps", "cpu"]   # rare dual-GPU
        ["auto", "cpu"]                  # CPU-only
    """
    backends = ["auto"]
    try:
        import torch
        if torch.cuda.is_available():
            backends.append("cuda")
        if hasattr(torch.backends, "mps") and torch.backends.mps.is_available():
            backends.append("mps")
        if hasattr(torch, "xpu") and torch.xpu.is_available():
            backends.append("xpu")
    except ImportError:
        pass
    backends.append("cpu")
    return backends


def get_hardware_info() -> dict:
    """
    Returns a rich hardware info dict used by the telemetry API.
    Results are cached for _CACHE_TTL_S seconds to avoid repeated probing.

    Fields returned:
        has_gpu          bool
        gpu_name         str
        backend_type     str  ("NVIDIA CUDA" | "AMD ROCm" | "Apple MPS" | "Intel XPU" | "CPU")
        torch_device     str  ("cuda" | "mps" | "xpu" | "cpu")
        cuda_version     str | None
        rocm_version     str | None
        vram_total_mb    int
        vram_used_mb     int
        vram_free_mb     int
        gpu_util_percent int
        gpu_temp_c       int | None
        ollama_gpu_active bool
        hardware_mode    str
        available_backends list[str]
        embedding_device str  (the device the current embedding model is on)
    """
    global _info_cache, _cache_time

    with _cache_lock:
        now = time.monotonic()
        if _info_cache is not None and (now - _cache_time) < _CACHE_TTL_S:
            return dict(_info_cache)

    info = _probe_hardware()

    with _cache_lock:
        _info_cache = info
        _cache_time = time.monotonic()

    return dict(info)


def invalidate_cache():
    """Call this when HARDWARE_MODE changes so next poll re-probes immediately."""
    global _cache_time
    with _cache_lock:
        _cache_time = 0.0


# ── Internal probing ──────────────────────────────────────────────────────────

def _probe_hardware() -> dict:
    """Does the actual hardware probing. Called inside the cache logic."""
    has_gpu          = False
    gpu_name         = "No Discrete GPU Detected"
    backend_type     = "CPU"
    torch_device     = "cpu"
    cuda_version     = None
    rocm_version     = None
    vram_total_mb    = 0
    vram_used_mb     = 0
    vram_free_mb     = 0
    gpu_util_percent = 0
    gpu_temp_c       = None
    ollama_gpu_active = False

    # ── 1. Try nvidia-smi (NVIDIA) ────────────────────────────────────────────
    try:
        cmd = [
            "nvidia-smi",
            "--query-gpu=utilization.gpu,memory.used,memory.total,temperature.gpu,name",
            "--format=csv,noheader,nounits"
        ]
        res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE,
                             text=True, timeout=2)
        if res.returncode == 0 and res.stdout.strip():
            parts = [p.strip() for p in res.stdout.strip().split(",")]
            if len(parts) >= 5:
                gpu_util_percent = int(parts[0])
                vram_used_mb     = int(parts[1])
                vram_total_mb    = int(parts[2])
                vram_free_mb     = max(0, vram_total_mb - vram_used_mb)
                gpu_temp_c       = int(parts[3])
                gpu_name         = parts[4]
                has_gpu          = True
                backend_type     = "NVIDIA CUDA"
    except Exception:
        pass

    # ── 2. Try rocm-smi (AMD ROCm) ───────────────────────────────────────────
    if not has_gpu:
        try:
            res = subprocess.run(
                ["rocm-smi", "--showmeminfo", "vram", "--showtemp",
                 "--showuse", "--showproductname", "--csv"],
                stdout=subprocess.PIPE, stderr=subprocess.PIPE,
                text=True, timeout=2
            )
            if res.returncode == 0 and res.stdout.strip():
                lines = [l for l in res.stdout.strip().splitlines() if l.strip()]
                if len(lines) >= 2:
                    # Parse CSV — columns vary by ROCm version; be permissive
                    headers = [h.strip().lower() for h in lines[0].split(",")]
                    values  = [v.strip() for v in lines[1].split(",")]
                    row = dict(zip(headers, values))

                    gpu_name     = row.get("card series", row.get("gpu", "AMD GPU"))
                    backend_type = "AMD ROCm"
                    has_gpu      = True

                    # VRAM
                    for key in ("vram total memory (b)", "vram total (b)"):
                        if key in row:
                            vram_total_mb = int(row[key]) // (1024 * 1024)
                    for key in ("vram used memory (b)", "vram used (b)"):
                        if key in row:
                            vram_used_mb = int(row[key]) // (1024 * 1024)
                    vram_free_mb = max(0, vram_total_mb - vram_used_mb)

                    # Temp
                    for key in ("temperature (edge)", "temp (c)"):
                        if key in row:
                            try:
                                gpu_temp_c = int(float(row[key]))
                            except Exception:
                                pass
        except Exception:
            pass

    # ── 3. PyTorch backend probe ──────────────────────────────────────────────
    try:
        import torch

        if torch.cuda.is_available():
            torch_device = "cuda"
            has_gpu      = True
            cuda_version = torch.version.cuda

            # Detect if this is actually AMD ROCm under the cuda namespace
            is_rocm = hasattr(torch.version, "hip") and torch.version.hip is not None
            if is_rocm:
                backend_type = "AMD ROCm"
                rocm_version = torch.version.hip
            elif not has_gpu or backend_type == "CPU":
                backend_type = "NVIDIA CUDA"

            # Fill GPU name from torch if nvidia-smi wasn't available
            if gpu_name == "No Discrete GPU Detected":
                try:
                    gpu_name = torch.cuda.get_device_name(0)
                except Exception:
                    pass

            # Fill VRAM from torch if smi wasn't available
            if vram_total_mb == 0:
                try:
                    free_b, total_b = torch.cuda.mem_get_info(0)
                    vram_total_mb = int(total_b / 1024 / 1024)
                    vram_free_mb  = int(free_b  / 1024 / 1024)
                    vram_used_mb  = vram_total_mb - vram_free_mb
                except Exception:
                    pass

        elif hasattr(torch.backends, "mps") and torch.backends.mps.is_available():
            torch_device = "mps"
            has_gpu      = True
            backend_type = "Apple Silicon MPS"
            gpu_name     = _get_apple_chip_name()

            # MPS shares system RAM — report unified memory
            try:
                import psutil
                mem = psutil.virtual_memory()
                vram_total_mb = int(mem.total   / 1024 / 1024)
                vram_used_mb  = int(mem.used    / 1024 / 1024)
                vram_free_mb  = int(mem.available / 1024 / 1024)
            except Exception:
                pass

        elif hasattr(torch, "xpu") and torch.xpu.is_available():
            torch_device = "xpu"
            has_gpu      = True
            backend_type = "Intel XPU"
            try:
                gpu_name = torch.xpu.get_device_name(0)
            except Exception:
                gpu_name = "Intel XPU Device"

    except ImportError:
        pass

    # ── 4. Ollama GPU status ──────────────────────────────────────────────────
    try:
        import requests
        r = requests.get("http://localhost:11434/api/ps", timeout=1)
        if r.status_code == 200:
            models = r.json().get("models", [])
            ollama_gpu_active = len(models) > 0
    except Exception:
        pass

    # ── 5. Determine the actual device the embedding model is on ──────────────
    # Import lazily to avoid circular imports
    embedding_device = torch_device
    try:
        from backend.modules import vector_store as _vs
        embedding_device = getattr(_vs, "_model_device", None) or torch_device
    except Exception:
        pass

    current_mode = os.getenv("HARDWARE_MODE", "auto").lower()

    return {
        "has_gpu":             has_gpu,
        "gpu_name":            gpu_name,
        "backend_type":        backend_type,
        "torch_device":        torch_device,
        "cuda_version":        cuda_version,
        "rocm_version":        rocm_version,
        "vram_total_mb":       vram_total_mb,
        "vram_used_mb":        vram_used_mb,
        "vram_free_mb":        vram_free_mb,
        "gpu_util_percent":    gpu_util_percent,
        "gpu_temp_c":          gpu_temp_c,
        "ollama_gpu_active":   ollama_gpu_active,
        "hardware_mode":       current_mode,
        "available_backends":  list_available_backends(),
        "embedding_device":    embedding_device,
    }


def _get_apple_chip_name() -> str:
    """Returns the Apple Silicon chip name (e.g. 'Apple M2 Pro')."""
    try:
        res = subprocess.run(
            ["sysctl", "-n", "machdep.cpu.brand_string"],
            stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, timeout=2
        )
        if res.returncode == 0 and res.stdout.strip():
            return res.stdout.strip()
    except Exception:
        pass
    try:
        res = subprocess.run(
            ["system_profiler", "SPHardwareDataType"],
            stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, timeout=5
        )
        for line in res.stdout.splitlines():
            if "Chip" in line or "Processor" in line:
                return line.split(":")[-1].strip()
    except Exception:
        pass
    return f"Apple Silicon ({platform.processor() or 'Metal'})"
