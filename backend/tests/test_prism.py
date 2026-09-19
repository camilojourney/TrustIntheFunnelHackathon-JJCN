import httpx

from app.integrations import prism


def test_traces_include_prism_unconfigured(client):
    client.headers["X-Session-ID"] = "test-session"
    assert client.post("/api/applications", json={"use_seed": True}).status_code == 200
    body = client.get("/api/traces/test-session").json()
    assert body["prism"] == {"configured": False}
    assert "events" in body
    assert "PRISMTRACE_API_KEY" not in str(body)
    assert not any("api_key" in event for event in body["events"])


def test_record_event_forwards_to_prism_emit(client, monkeypatch):
    calls = []

    def capture(session_id, stage, status, details):
        calls.append((session_id, stage, status, details))

    monkeypatch.setattr("app.integrations.prism.emit_event", capture)
    from app.db import get_db
    from app.main import app
    from app.services.tracing import record_event

    with next(app.dependency_overrides[get_db]()) as db:
        event = record_event(db, "unit_stage", "cand-1", session_id="sess-1", status="ok", foo="bar")

    assert calls == [(event.session_id, "unit_stage", "ok", {"foo": "bar"})]
    assert event.stage == "unit_stage"


def test_prism_emit_failure_keeps_interview_and_traces_ok(client, monkeypatch):
    monkeypatch.setattr(
        "app.integrations.prism.emit_event",
        lambda *args, **kwargs: (_ for _ in ()).throw(RuntimeError("prism down")),
    )
    client.headers["X-Session-ID"] = "test-session"
    created = client.post("/api/applications", json={"use_seed": True})
    assert created.status_code == 200
    application = created.json()
    claims = client.post(f"/api/applications/{application['application_id']}/extract-claims")
    assert claims.status_code == 200
    interview = client.post(
        "/api/interviews",
        json={"candidate_id": application["candidate_id"], "claim_ids": [c["id"] for c in claims.json()]},
    )
    assert interview.status_code == 200
    traces = client.get("/api/traces/test-session")
    assert traces.status_code == 200
    body = traces.json()
    assert body["prism"] == {"configured": False}
    assert {event["stage"] for event in body["events"]} >= {"application_created", "claim_extraction", "interview_started"}


def test_emit_event_is_noop_without_credentials(monkeypatch):
    monkeypatch.setattr(prism.config, "PRISMTRACE_API_KEY", "")
    monkeypatch.setattr(prism.config, "PRISMTRACE_PROJECT_ID", "")

    def fail_post(*args, **kwargs):
        raise AssertionError("emit_event must not POST when PRISM is unconfigured")

    monkeypatch.setattr(httpx, "post", fail_post)
    prism.emit_event("sess", "stage", "ok", {"k": "v"})


def test_emit_event_posts_claimproof_demo_payload(monkeypatch):
    monkeypatch.setattr(prism.config, "PRISMTRACE_API_KEY", "test-key")
    monkeypatch.setattr(prism.config, "PRISMTRACE_PROJECT_ID", "proj-1")
    monkeypatch.setattr(prism.config, "PRISMTRACE_HOST", "https://prism.example")
    seen = {}

    def capture(url, json=None, headers=None, timeout=None, trust_env=None):
        seen.update(url=url, json=json, headers=headers, timeout=timeout, trust_env=trust_env)

    monkeypatch.setattr(httpx, "post", capture)
    prism.emit_event("sess", "interview_started", "ok", {"n": 1})
    assert seen["url"] == "https://prism.example/api/traces"
    assert seen["headers"] == {"X-PRISMtrace-Key": "test-key"}
    assert seen["timeout"] == 2.0
    assert seen["json"]["project_id"] == "proj-1"
    assert seen["json"]["session_id"] == "sess"
    assert seen["json"]["agent_id"] == "claimproof"
    assert seen["json"]["model"] == "claimproof-demo"
    assert seen["json"]["input_messages"] == [{"role": "user", "content": "interview_started"}]
    assert seen["json"]["output_message"] == '{"status": "ok", "details": {"n": 1}}'
    assert seen["json"]["metadata"] == {"stage": "interview_started", "status": "ok", "source": "claimproof-local"}


def test_emit_event_swallows_http_errors(monkeypatch):
    monkeypatch.setattr(prism.config, "PRISMTRACE_API_KEY", "test-key")
    monkeypatch.setattr(prism.config, "PRISMTRACE_PROJECT_ID", "proj-1")
    monkeypatch.setattr(prism.config, "PRISMTRACE_HOST", "https://prism.example")

    def boom(*args, **kwargs):
        raise httpx.ConnectError("down")

    monkeypatch.setattr(httpx, "post", boom)
    prism.emit_event("sess", "stage", "ok", {"k": "v"})
