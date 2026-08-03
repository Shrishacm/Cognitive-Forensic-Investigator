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


def get_available_models(filter_embeddings: bool = True) -> list[str]:
    """Return installed Ollama models. Optionally filter out text embedding models."""
    try:
        r = requests.get(
            f"{_settings().ollama_base_url}/api/tags",
            timeout=3
        )
        if r.status_code == 200:
            models = [m["name"] for m in r.json().get("models", [])]
            if filter_embeddings:
                # Exclude embedding models that cannot perform generation
                embedding_keywords = ["embed", "bge", "minilm", "e5-"]
                models = [
                    m for m in models
                    if not any(k in m.lower() for k in embedding_keywords)
                ]
            return models
    except Exception:
        pass
    return []


def is_model_available() -> bool:
    if not is_ollama_running():
        return False
    available = get_available_models(filter_embeddings=True)
    model_name = _settings().ollama_model
    return any(model_name in m for m in available) if available else False


def generate_response(prompt: str,
                      system_prompt: str = "",
                      model: str = None,
                      max_tokens: int = 600
                      ) -> str:
    if model is None:
        model = _settings().ollama_model

    available_gen_models = get_available_models(filter_embeddings=True)
    
    if available_gen_models and not any(model in m for m in available_gen_models):
        # Auto-fallback to first available generation model (e.g. phi4-mini)
        model = available_gen_models[0]
    elif not available_gen_models:
        return "⚠️ No generation model found in Ollama. Please pull a model (e.g. `ollama pull phi4-mini`)."

    try:
        r = requests.post(
            f"{_settings().ollama_base_url}/api/generate",
            json={
                "model": model,
                "prompt": prompt,
                "system": system_prompt,
                "stream": False,
                "options": {
                    "temperature": 0.55,
                    "num_predict": max_tokens,
                    "stop": [
                        "Investigator Question:",
                        "Investigator:",
                        "\nQuestion:",
                        "\nUser:",
                        "\nDirect Answer:",
                        "\nCFI:"
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
