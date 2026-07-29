#!/usr/bin/env python3
import platform
import subprocess
import sys
import os

def run_command(cmd):
    try:
        return subprocess.check_output(cmd, shell=True, text=True, stderr=subprocess.DEVNULL)
    except Exception:
        return ""

def main():
    system = platform.system().lower()
    machine = platform.machine().lower()
    
    print("[INSTALLER] Detecting hardware architecture for optimal ML acceleration...")

    install_cmd = ["pip", "install", "torch", "torchvision", "torchaudio"]
    cupy_pkg = None
    index_url = None

    if system == "darwin" and machine == "arm64":
        print("[INSTALLER] Detected Apple Silicon (M-series). Enabling MPS support natively.")
        # torch on macOS natively supports MPS. No extra index URL or cupy needed.
    
    elif system in ["linux", "windows"]:
        # Check NVIDIA
        nvidia_smi = run_command("nvidia-smi")
        if "CUDA Version" in nvidia_smi:
            print("[INSTALLER] Detected NVIDIA GPU.")
            # Basic parsing of CUDA version from nvidia-smi
            # e.g., "CUDA Version: 12.4"
            cuda_version = None
            for line in nvidia_smi.split('\n'):
                if "CUDA Version:" in line:
                    parts = line.split("CUDA Version:")
                    if len(parts) > 1:
                        cuda_version = parts[1].strip().split()[0]
            
            if cuda_version:
                print(f"[INSTALLER] Driver CUDA Version: {cuda_version}")
                major, minor = cuda_version.split('.')[:2]
                major = int(major)
                minor = int(minor)
                
                if major == 12:
                    if minor >= 4:
                        index_url = "https://download.pytorch.org/whl/cu124"
                    else:
                        index_url = "https://download.pytorch.org/whl/cu121"
                    cupy_pkg = "cupy-cuda12x"
                elif major == 11:
                    index_url = "https://download.pytorch.org/whl/cu118"
                    cupy_pkg = "cupy-cuda11x"
                else:
                    print("[INSTALLER] Unsupported CUDA version, falling back to CPU.")
                    index_url = "https://download.pytorch.org/whl/cpu"
            else:
                index_url = "https://download.pytorch.org/whl/cu121"
                cupy_pkg = "cupy-cuda12x"

        else:
            # Check AMD ROCm
            rocm_info = run_command("rocminfo")
            if rocm_info:
                print("[INSTALLER] Detected AMD GPU. Enabling ROCm support.")
                index_url = "https://download.pytorch.org/whl/rocm6.0"
            else:
                print("[INSTALLER] No discrete GPU detected. Falling back to CPU-only packages.")
                index_url = "https://download.pytorch.org/whl/cpu"
    else:
        print("[INSTALLER] Unknown platform. Falling back to default CPU packages.")
        index_url = "https://download.pytorch.org/whl/cpu"

    if index_url:
        install_cmd.extend(["--index-url", index_url])

    print(f"\n[INSTALLER] Running: {' '.join(install_cmd)}")
    try:
        subprocess.check_call(install_cmd)
        print("[INSTALLER] Successfully installed PyTorch.")
    except subprocess.CalledProcessError as e:
        print(f"[INSTALLER] Failed to install PyTorch: {e}")
        sys.exit(1)

    if cupy_pkg:
        print(f"\n[INSTALLER] Installing SpaCy GPU bridge: {cupy_pkg}")
        try:
            subprocess.check_call(["pip", "install", cupy_pkg])
            print("[INSTALLER] Successfully installed CuPy.")
        except subprocess.CalledProcessError as e:
            print(f"[INSTALLER] Failed to install CuPy: {e}")
            sys.exit(1)

    print("\n[INSTALLER] Hardware-agnostic dependency resolution complete!")

if __name__ == "__main__":
    main()
