import importlib
import socket
import wave

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool


@pytest.fixture
def client(monkeypatch):
    """Run offline against a fresh database without touching claimproof.db."""
    monkeypatch.setenv("DEMO_MODE", "true")
    monkeypatch.setenv("PRISMTRACE_API_KEY", "")
    monkeypatch.setenv("PRISMTRACE_PROJECT_ID", "")

    from app import config, db
    from app.llm import client as llm_client, transcription

    for module in (config, llm_client, transcription):
        monkeypatch.setattr(module, "DEMO_MODE", True)
    monkeypatch.setattr(config, "PRISMTRACE_API_KEY", "")
    monkeypatch.setattr(config, "PRISMTRACE_PROJECT_ID", "")

    def reject_network(*args, **kwargs):
        pytest.fail("Demo tests must not make network calls")

    monkeypatch.setattr(socket.socket, "connect", reject_network)
    monkeypatch.setattr(socket.socket, "connect_ex", reject_network)

    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    # main creates tables on import; redirect that operation to the test engine too.
    monkeypatch.setattr(db, "engine", engine)
    app = importlib.import_module("app.main").app
    db.Base.metadata.create_all(engine)
    sessions = sessionmaker(bind=engine)

    def get_test_db():
        with sessions() as session:
            yield session

    previous_overrides = app.dependency_overrides.copy()
    app.dependency_overrides[db.get_db] = get_test_db
    try:
        with TestClient(app) as test_client:
            yield test_client
    finally:
        app.dependency_overrides.clear()
        app.dependency_overrides.update(previous_overrides)
        engine.dispose()


@pytest.fixture
def wav_file(tmp_path):
    """A small valid PCM WAV; demo transcription deliberately ignores its content."""
    path = tmp_path / "answer.wav"
    with wave.open(str(path), "wb") as audio:
        audio.setnchannels(1)
        audio.setsampwidth(2)
        audio.setframerate(8000)
        audio.writeframes(b"\x00\x00" * 800)
    return path
