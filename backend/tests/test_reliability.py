from pathlib import Path
import json

from app.schemas import CandidateReport
from app.integrations.evidence import FIXTURE_URL, collect_evidence, CollectionError
import pytest


def seed(client, session="test-session"):
    client.headers["X-Session-ID"] = session
    response = client.post("/api/applications", json={"use_seed": True})
    assert response.status_code == 200
    application = response.json()
    claims = client.post(f"/api/applications/{application['application_id']}/extract-claims").json()
    interview = client.post("/api/interviews", json={"candidate_id": application["candidate_id"], "claim_ids": [c["id"] for c in claims]}).json()["interview_id"]
    return application, claims, interview


def test_trace_evidence_and_reset(client):
    application, claims, interview = seed(client)
    response = client.post(f"/api/interviews/{interview}/complete")
    assert response.status_code == 409
    fixture = json.loads((Path(__file__).resolve().parents[2] / "fixtures/report.json").read_text())
    for _ in range(7):
        payload = client.get(f"/api/interviews/{interview}/next-question").json()
        if payload["completed"]:
            break
        question = payload["question"]
        # Short on-topic openings force a follow-up, including under the offline heuristic.
        claim = next(c for c in claims if c["id"] == question["claim_id"])
        transcript = "I worked on " + claim["entities"][0]
        answer = client.post(f"/api/interviews/{interview}/answers", json={"question_id": question["id"], "transcript": transcript})
        assert answer.status_code == 200
    else:
        pytest.fail("Interview did not finish")
    response = client.post("/api/claims/claim-rag-pipeline/collect-evidence", json={"mode": "fixture", "url": FIXTURE_URL})
    assert response.status_code == 200, response.text
    assert "Synthetic" in response.json()["limitations"]
    evidence_id = response.json()["id"]
    report = client.post(f"/api/interviews/{interview}/complete")
    assert report.status_code == 200
    parsed = CandidateReport.model_validate(report.json())
    assert evidence_id in [e.id for e in parsed.evidence]
    assert parsed.candidate_id == fixture["candidate_id"]
    assert {c.id for c in parsed.claims} == {c["id"] for c in fixture["claims"]}
    events = client.get("/api/traces/test-session").json()["events"]
    assert {"claim_extraction", "question_generation", "answer_submission", "follow_up_generation", "evidence_collection", "assessment_generation"} <= {e["stage"] for e in events}
    assert client.post("/api/demo/reset").status_code == 200
    assert client.get(f"/api/interviews/{interview}/next-question").status_code == 404
    assert client.get(f"/api/candidates/{application['candidate_id']}/report").status_code == 404
    assert [e["stage"] for e in client.get("/api/traces/test-session").json()["events"]] == ["demo_reset"]
    _, _, new_interview = seed(client, "new-session")
    assert new_interview != interview


def test_collection_failure_is_explicit(client):
    seed(client)
    response = client.post("/api/claims/claim-rag-pipeline/collect-evidence", json={"mode": "live", "url": "http://127.0.0.1/secrets"})
    assert response.status_code == 422
    events = client.get("/api/traces/test-session").json()["events"]
    assert events[-1]["status"] == "unavailable"
    assert client.post("/api/claims/missing/collect-evidence", json={"mode": "fixture", "url": FIXTURE_URL}).status_code == 404
    assert client.post("/api/claims/claim-aws-service/collect-evidence", json={"mode": "fixture", "url": FIXTURE_URL}).status_code == 400


def test_fixture_has_no_network_or_fake_live_source():
    item = collect_evidence(FIXTURE_URL, "fixture")
    assert item["type"] == "document_excerpt"
    assert "source_url" not in item
    with pytest.raises(CollectionError):
        collect_evidence("https://unrelated.example", "fixture")


def test_audio_preview_does_not_submit(client, wav_file):
    with wav_file.open("rb") as audio:
        response = client.post("/api/transcribe", files={"audio": ("answer.wav", audio, "audio/wav")})
    assert response.status_code == 200
    assert response.json()["mode"] == "fixture"
    assert response.json()["transcript"]


def test_reset_disabled_outside_demo(client, monkeypatch):
    from app import config
    monkeypatch.setattr(config, "DEMO_MODE", False)
    assert client.post("/api/demo/reset").status_code == 403


def test_answer_retry_is_idempotent_and_keeps_original(client):
    _, _, interview = seed(client)
    path = f"/api/interviews/{interview}"
    question = client.get(f"{path}/next-question").json()["question"]
    payload = {"question_id": question["id"], "transcript": "I used Neo4j for RAG.", "original_transcript": "I used Neo four j for RAG."}
    first = client.post(f"{path}/answers", json=payload)
    retried = client.post(f"{path}/answers", json=payload)
    assert first.status_code == retried.status_code == 200
    assert first.json() == retried.json()
    from app.db import get_db
    from app.main import app
    from app.models import AnswerModel
    with next(app.dependency_overrides[get_db]()) as db:
        rows = db.query(AnswerModel).all()
        assert len(rows) == 1
        assert rows[0].grounding["original_transcript"] == payload["original_transcript"]
