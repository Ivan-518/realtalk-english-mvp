import os
from pathlib import Path
from typing import Any, Dict

from dotenv import load_dotenv


BASE_DIR = Path(__file__).resolve().parent.parent
WEB_DIR = BASE_DIR / "web"

load_dotenv(BASE_DIR / ".env")

OPENAI_BASE_URL = os.getenv("OPENAI_BASE_URL", "https://api.openai.com/v1").rstrip("/")
OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-5-mini")


def get_openai_api_key() -> str:
    return os.getenv("OPENAI_API_KEY", "")


def health_payload() -> Dict[str, Any]:
    return {
        "status": "ok",
        "model": OPENAI_MODEL,
        "baseUrl": OPENAI_BASE_URL,
        "envFileExists": str((BASE_DIR / ".env").exists()).lower(),
        "openaiKeyConfigured": str(bool(get_openai_api_key())).lower(),
    }
