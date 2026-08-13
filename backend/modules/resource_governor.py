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
    Returns full GPU/hardware telemetry dict.
    Delegates to hardware.py — the single source of truth.
    Covers NVIDIA CUDA, AMD ROCm, Apple MPS, Intel XPU, and CPU.
    """
    from backend.modules.hardware import get_hardware_info
    return get_hardware_info()


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
