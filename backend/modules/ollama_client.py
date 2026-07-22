import requests
from backend.dependencies import get_settings


def _settings():
    return get_settings()


def is_ollama_running() -> bool:
    try:
        r = requests.get(
            f"{_settings().ollama_base_url}/api/tags",
            timeout=3
        )
        return r.status_code == 200
    except Exception:
        return False


def is_model_available() -> bool:
    if not is_ollama_running():
        return False
    try:
        r = requests.get(
            f"{_settings().ollama_base_url}/api/tags",
            timeout=3
        )
        model_name = _settings().ollama_model
        models = [m["name"] for m in
                  r.json().get("models", [])]
        return any(model_name in m
                   for m in models)
    except Exception:
        return False


def generate_response(prompt: str,
                      system_prompt: str = "",
                      model: str = None
                      ) -> str:
    if model is None:
        model = _settings().ollama_model
    try:
        r = requests.post(
            f"{_settings().ollama_base_url}/api/generate",
            json={
                "model": model,
                "prompt": prompt,
                "system": system_prompt,
                "stream": False,
                "options": {
                    "temperature": 0.1,
                    "num_predict": 1024
                }
            },
            timeout=120
        )
        return r.json().get("response", "")
    except Exception as e:
        return (f"Error: Could not reach Ollama. "
                f"Is it running? ({e})")
