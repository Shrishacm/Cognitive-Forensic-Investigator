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


def get_available_models() -> list[str]:
    try:
        r = requests.get(
            f"{_settings().ollama_base_url}/api/tags",
            timeout=3
        )
        if r.status_code == 200:
            return [m["name"] for m in r.json().get("models", [])]
    except Exception:
        pass
    return []


def is_model_available() -> bool:
    if not is_ollama_running():
        return False
    available = get_available_models()
    model_name = _settings().ollama_model
    return any(model_name in m for m in available) if available else False


def generate_response(prompt: str,
                      system_prompt: str = "",
                      model: str = None
                      ) -> str:
    if model is None:
        model = _settings().ollama_model

    available = get_available_models()
    if available and not any(model in m for m in available):
        # Auto-fallback to first available installed model
        model = available[0]

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
                    "num_predict": 300,
                    "stop": [
                        "Investigator Question:",
                        "Investigator:",
                        "\nQuestion:",
                        "\nUser:",
                        "\nDirect Answer:"
                    ]
                }
            },
            timeout=120
        )
        if r.status_code == 200:
            return r.json().get("response", "")
        else:
            err = r.json().get("error", r.text)
            return f"Ollama error ({r.status_code}): {err}"
    except Exception as e:
        return (f"Error: Could not reach Ollama. "
                f"Is it running? ({e})")
