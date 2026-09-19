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

# Optional sponsor integrations. Empty keys disable them; nothing is simulated in their place
# outside DEMO_MODE.
TAVILY_API_KEY: str = os.getenv("TAVILY_API_KEY", "")
SOLARI_API_KEY: str = os.getenv("SOLARI_API_KEY", "")
SOLARI_BASE_URL: str = os.getenv("SOLARI_BASE_URL", "https://api.getsolari.com")

# Interview budget: how many claims one session may cover. The demo uses three to fit
# fifteen minutes; a recruiter can raise it to include education or skill claims.
MAX_INTERVIEW_CLAIMS: int = max(1, min(5, int(os.getenv("MAX_INTERVIEW_CLAIMS", "3") or 3)))
