from pathlib import Path
from typing import Protocol

from app.config import DEMO_MODE, OPENAI_API_KEY


class TranscriptionError(Exception):
    """Raised when audio cannot be transcribed."""


class Transcriber(Protocol):
    def transcribe(self, audio_bytes: bytes, mime_type: str) -> str: ...


class WhisperTranscriber:
    def __init__(self, api_key: str, model: str = "whisper-1") -> None:
        from openai import OpenAI

        self._client = OpenAI(api_key=api_key)
        self._model = model

    def transcribe(self, audio_bytes: bytes, mime_type: str) -> str:
        extension = mime_type.split("/")[-1] or "wav"
        buffer = ("audio." + extension, audio_bytes, mime_type)
        try:
            response = self._client.audio.transcriptions.create(
                model=self._model, file=buffer
            )
        except Exception as exc:  # noqa: BLE001 - surface as a TranscriptionError
            raise TranscriptionError(f"Whisper transcription failed: {exc}") from exc

        text = getattr(response, "text", "") or ""
        if not text.strip():
            raise TranscriptionError("Whisper returned an empty transcript")
        return text


class FixtureTranscriber:
    """Deterministic offline transcriber used in DEMO_MODE or when no provider key is set."""

    def __init__(self, transcript: str | Path) -> None:
        if isinstance(transcript, Path):
            self._transcript = transcript.read_text().strip()
        else:
            self._transcript = transcript.strip()

    def transcribe(self, audio_bytes: bytes, mime_type: str) -> str:
        if not self._transcript:
            raise TranscriptionError("Fixture transcript is empty")
        return self._transcript


_DEFAULT_FIXTURE_TRANSCRIPT = (
    "I built the pipeline using Neo4j for graph retrieval and a vector index for "
    "semantic search, evaluated it on 200 queries, and saw F1 improve by 2.75 points, "
    "though indexing latency increased because of the dual-write."
)


def get_transcriber(fixture_transcript: str | Path | None = None) -> Transcriber:
    if DEMO_MODE or not OPENAI_API_KEY:
        return FixtureTranscriber(fixture_transcript or _DEFAULT_FIXTURE_TRANSCRIPT)
    return WhisperTranscriber(api_key=OPENAI_API_KEY)
