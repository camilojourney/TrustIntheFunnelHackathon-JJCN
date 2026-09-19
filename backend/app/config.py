import os

from dotenv import load_dotenv

load_dotenv()


def _env_bool(name: str, default: bool = False) -> bool:
    value = os.getenv(name)
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


DEMO_MODE: bool = _env_bool("DEMO_MODE", default=True)
LLM_PROVIDER: str = os.getenv("LLM_PROVIDER", "openai")
OPENAI_API_KEY: str | None = os.getenv("OPENAI_API_KEY")
GEMINI_API_KEY: str | None = os.getenv("GEMINI_API_KEY")
PRISMTRACE_HOST: str = os.getenv("PRISMTRACE_HOST", "https://prism.blockconvey.com")
PRISMTRACE_PROJECT_ID: str = os.getenv("PRISMTRACE_PROJECT_ID", "")
PRISMTRACE_API_KEY: str = os.getenv("PRISMTRACE_API_KEY", "")
