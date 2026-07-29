import psutil
import time
import os
import platform
import requests
import subprocess
from typing import Optional
from backend.dependencies import get_settings

def get_gpu_info() -> dict:
    """
    Dynamically auto-detects GPU hardware across any system/vendor:
    - NVIDIA CUDA (Linux / Windows)
    - Apple Silicon MPS (macOS M1/M2/M3/M4)
    - AMD ROCm
    - CPU Fallback
    Zero hardcoded values or assumptions.
    """
    has_gpu = False
    gpu_name = "No Discrete GPU Detected"
    vram_total_mb = 0
    vram_used_mb = 0
    vram_free_mb = 0
    gpu_util_percent = 0
    gpu_temp_c = None
    cuda_version = None
    torch_device = "cpu"
    backend_type = "CPU"

    # 1. Check NVIDIA GPU via nvidia-smi
    try:
        cmd = ["nvidia-smi", "--query-gpu=utilization.gpu,memory.used,memory.total,temperature.gpu,name", "--format=csv,noheader,nounits"]
        res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, timeout=1)
        if res.returncode == 0 and res.stdout.strip():
            parts = [p.strip() for p in res.stdout.strip().split(",")]
            if len(parts) >= 5:
                gpu_util_percent = int(parts[0])
                vram_used_mb = int(parts[1])
                vram_total_mb = int(parts[2])
                vram_free_mb = max(0, vram_total_mb - vram_used_mb)
                gpu_temp_c = int(parts[3])
                gpu_name = parts[4]
                has_gpu = True
                backend_type = "NVIDIA CUDA"
    except Exception:
        pass

    # 2. Check PyTorch Acceleration (CUDA, MPS, or ROCm)
    try:
        import torch

        if torch.cuda.is_available():
            torch_device = "cuda"
            has_gpu = True
            cuda_version = torch.version.cuda
            if gpu_name == "No Discrete GPU Detected":
                gpu_name = torch.cuda.get_device_name(0)
                backend_type = "NVIDIA CUDA"
            if vram_total_mb == 0:
                try:
                    free_b, total_b = torch.cuda.mem_get_info(0)
                    vram_free_mb = int(free_b / 1024 / 1024)
                    vram_total_mb = int(total_b / 1024 / 1024)
                    vram_used_mb = vram_total_mb - vram_free_mb
                except Exception:
                    pass

        elif hasattr(torch.backends, "mps") and torch.backends.mps.is_available():
            torch_device = "mps"
            has_gpu = True
            backend_type = "Apple Silicon MPS"
            gpu_name = f"Apple Silicon ({platform.processor() or 'Metal'})"
            mem = psutil.virtual_memory()
            vram_total_mb = int(mem.total / 1024 / 1024)
            vram_used_mb = int(mem.used / 1024 / 1024)
            vram_free_mb = int(mem.available / 1024 / 1024)
    except Exception:
        pass

    # 3. Detect Ollama GPU status
    ollama_gpu_active = False
    try:
        r = requests.get("http://localhost:11434/api/ps", timeout=1)
        if r.status_code == 200:
            models = r.json().get("models", [])
            ollama_gpu_active = len(models) > 0
    except Exception:
        pass

    current_mode = os.getenv("HARDWARE_MODE", "auto").lower()

    return {
        "has_gpu": has_gpu,
        "gpu_name": gpu_name,
        "backend_type": backend_type,
        "torch_device": torch_device,
        "cuda_version": cuda_version,
        "vram_total_mb": vram_total_mb,
        "vram_used_mb": vram_used_mb,
        "vram_free_mb": vram_free_mb,
        "gpu_util_percent": gpu_util_percent,
        "gpu_temp_c": gpu_temp_c,
        "ollama_gpu_active": ollama_gpu_active,
        "hardware_mode": current_mode
    }


def get_system_info() -> dict:
    """
    Auto-detects system hardware specs including RAM, CPU, and GPU.
    """
    mem = psutil.virtual_memory()
    cpu_count = psutil.cpu_count(logical=True)
    cpu_freq = psutil.cpu_freq()
    gpu_info = get_gpu_info()

    return {
        "total_ram_mb": int(mem.total / 1024 / 1024),
        "available_ram_mb": int(mem.available / 1024 / 1024),
        "used_ram_mb": int(mem.used / 1024 / 1024),
        "ram_percent": mem.percent,
        "cpu_count": cpu_count,
        "cpu_percent": psutil.cpu_percent(interval=0.1),
        "cpu_freq_mhz": int(cpu_freq.current) if cpu_freq else None,
        "platform": os.uname().machine if hasattr(os, 'uname') else "unknown",
        "gpu": gpu_info
    }


def suggest_resource_budget(total_ram_mb: int) -> dict:
    """
    Suggests sensible default resource budget based on total RAM.
    """
    if total_ram_mb <= 8192:
        return {
            "min_free_ram_mb": 2048,
            "cpu_throttle_percent": 70,
            "batch_size": 30,
            "description": "Conservative (8GB RAM)"
        }
    elif total_ram_mb <= 16384:
        return {
            "min_free_ram_mb": 3072,
            "cpu_throttle_percent": 80,
            "batch_size": 50,
            "description": "Balanced (16GB RAM)"
        }
    else:
        return {
            "min_free_ram_mb": 4096,
            "cpu_throttle_percent": 90,
            "batch_size": 100,
            "description": "Performance (32GB+ RAM)"
        }


class ResourceGovernor:
    """
    Monitors system resources during ingestion and throttles processing.
    """

    def __init__(
            self,
            min_free_ram_mb: int = 2048,
            cpu_throttle_percent: int = 100,
            check_interval: int = 5,
            force_override: bool = False):
        self.min_free_ram_mb = min_free_ram_mb
        self.cpu_throttle_percent = cpu_throttle_percent
        self.check_interval = check_interval
        self.force_override = force_override
        self._last_check = 0
        self._pause_count = 0

    def get_sleep_seconds(self) -> float:
        if self.cpu_throttle_percent >= 100:
            return 0.0
        elif self.cpu_throttle_percent >= 75:
            return 0.5
        elif self.cpu_throttle_percent >= 50:
            return 1.0
        elif self.cpu_throttle_percent >= 25:
            return 3.0
        else:
            return 5.0

    def get_optimal_batch_size(self, base_batch: int = 500) -> int:
        mem = psutil.virtual_memory()
        total_mb = int(mem.total / 1024 / 1024)
        
        # Override the hardcoded base_batch with a safe baseline based on total host RAM
        budget = suggest_resource_budget(total_mb)
        safe_base_batch = budget.get("batch_size", 50)
        
        if self.force_override:
            return safe_base_batch * 2  # Max speed

        available_mb = int(mem.available / 1024 / 1024)

        if available_mb < self.min_free_ram_mb:
            return max(10, safe_base_batch // 4)  # Emergency scale down
        elif available_mb < self.min_free_ram_mb * 1.5:
            return max(20, safe_base_batch // 2) # Caution scale down
        elif available_mb > self.min_free_ram_mb * 3:
            return int(safe_base_batch * 1.5)     # Plenty of RAM, scale up
        
        return safe_base_batch

    def check_and_throttle(self, stop_check=None):
        _check = stop_check or getattr(self, '_stop_check', None)
        if _check and _check():
            raise StopIteration("Ingestion stopped by user")

        if self.force_override:
            return True

        now = time.time()
        
        # Dynamic CPU Throttling
        if now - self._last_check >= self.check_interval:
            self._last_check = now
            cpu_usage = psutil.cpu_percent(interval=None)
            mem = psutil.virtual_memory()
            available_mb = int(mem.available / 1024 / 1024)

            # Check if RAM is dangerously low (below absolute minimum floor of 512MB)
            if available_mb < 512:
                print(f"[GOVERNOR] CRITICAL RAM low: {available_mb}MB. Pausing briefly to recover...")
                self._pause_count += 1
                for _ in range(2):
                    time.sleep(2)
                    if _check and _check():
                        raise StopIteration("Ingestion stopped by user during RAM pause")

            # Dynamic sleep based on CPU load if not heavily throttled by user
            if cpu_usage > 90 and self.cpu_throttle_percent >= 50:
                time.sleep(0.5)
            elif cpu_usage > 95:
                time.sleep(1.0)
        else:
            # Fallback to static sleep if CPU check interval hasn't passed
            sleep_time = self.get_sleep_seconds()
            if sleep_time > 0:
                time.sleep(sleep_time)

        return True

    @property
    def total_pauses(self) -> int:
        return self._pause_count
