import json
from pathlib import Path
from typing import Any, Protocol

from app.config import DEMO_MODE, GEMINI_API_KEY, LLM_PROVIDER, OPENAI_API_KEY


class LLMOutputError(Exception):
    """Raised when a provider's response cannot be parsed as JSON."""


class LLMClient(Protocol):
    def generate_json(
        self, system_prompt: str, user_prompt: str, schema_hint: str
    ) -> dict[str, Any]: ...


def _parse_json(text: str) -> dict[str, Any]:
    try:
        return json.loads(text)
    except (json.JSONDecodeError, TypeError) as exc:
        raise LLMOutputError(f"Model output was not valid JSON: {text!r}") from exc


class OpenAIClient:
    def __init__(self, api_key: str, model: str = "gpt-4o-mini") -> None:
        from openai import OpenAI

        self._client = OpenAI(api_key=api_key)
        self._model = model

    def generate_json(
        self, system_prompt: str, user_prompt: str, schema_hint: str
    ) -> dict[str, Any]:
        response = self._client.chat.completions.create(
            model=self._model,
            response_format={"type": "json_object"},
            messages=[
                {"role": "system", "content": f"{system_prompt}\n\nSchema:\n{schema_hint}"},
                {"role": "user", "content": user_prompt},
            ],
        )
        content = response.choices[0].message.content
        return _parse_json(content)


class GeminiClient:
    def __init__(self, api_key: str, model: str = "gemini-1.5-flash") -> None:
        import google.generativeai as genai

        genai.configure(api_key=api_key)
        self._model = genai.GenerativeModel(model)

    def generate_json(
        self, system_prompt: str, user_prompt: str, schema_hint: str
    ) -> dict[str, Any]:
        prompt = f"{system_prompt}\n\nSchema:\n{schema_hint}\n\n{user_prompt}"
        response = self._model.generate_content(
            prompt,
            generation_config={"response_mime_type": "application/json"},
        )
        return _parse_json(response.text)


class FixtureLLMClient:
    """Deterministic offline client used in DEMO_MODE or when no provider key is set."""

    def __init__(self, fixture: dict[str, Any] | str | Path) -> None:
        if isinstance(fixture, (str, Path)):
            self._fixture: dict[str, Any] = json.loads(Path(fixture).read_text())
        else:
            self._fixture = fixture

    def generate_json(
        self, system_prompt: str, user_prompt: str, schema_hint: str
    ) -> dict[str, Any]:
        return self._fixture


def get_llm_client(fixture: dict[str, Any] | str | Path | None = None) -> LLMClient:
    if DEMO_MODE:
        return FixtureLLMClient(fixture or {})

    if LLM_PROVIDER == "gemini":
        if not GEMINI_API_KEY:
            return FixtureLLMClient(fixture or {})
        return GeminiClient(api_key=GEMINI_API_KEY)

    if not OPENAI_API_KEY:
        return FixtureLLMClient(fixture or {})
    return OpenAIClient(api_key=OPENAI_API_KEY)
