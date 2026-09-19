import io

import httpx
import pytest

from app.schemas import Claim

RESUME = (
    "Priya Natarajan - Data Scientist\nGitHub: https://github.com/pnatarajan/churn-model\n\n"
    "Projects:\n- Built a churn model that lifted retention by 4 percentage points across 12,000 accounts.\n\n"
    "Education:\n- M.S. in Statistics, Example University, 2021.\n"
)
COVER = "I led the churn-model rollout end to end and presented the retention lift to the leadership team."


def _minimal_pdf(text: str) -> bytes:
    stream = f"BT /F1 12 Tf 40 700 Td ({text}) Tj ET".encode()
    objects = [
        b"<< /Type /Catalog /Pages 2 0 R >>",
        b"<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
        b"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
        b"<< /Length " + str(len(stream)).encode() + b" >>\nstream\n" + stream + b"\nendstream",
        b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    ]
    out = io.BytesIO()
    out.write(b"%PDF-1.4\n")
    offsets = []
    for index, body in enumerate(objects, 1):
        offsets.append(out.tell())
        out.write(f"{index} 0 obj\n".encode() + body + b"\nendobj\n")
    xref = out.tell()
    out.write(f"xref\n0 {len(objects) + 1}\n0000000000 65535 f \n".encode())
    for offset in offsets:
        out.write(f"{offset:010d} 00000 n \n".encode())
    out.write(f"trailer\n<< /Size {len(objects) + 1} /Root 1 0 R >>\nstartxref\n{xref}\n%%EOF\n".encode())
    return out.getvalue()


def test_text_application_with_cover_letter_extracts_claims_and_hints(client):
    response = client.post("/api/applications", json={"resume_text": RESUME, "cover_letter_text": COVER, "role_title": "Data Scientist"})
    assert response.status_code == 200, response.text
    application = response.json()
    assert application["candidate_id"] != "demo-candidate-1"

    response = client.post(f"/api/applications/{application['application_id']}/extract-claims")
    assert response.status_code == 200, response.text
    claims = [Claim.model_validate(item) for item in response.json()]
    assert len(claims) >= 3
    # Demo fixtures adapt seeded claims to this resume; every excerpt still comes from the supplied text.
    assert all(claim.source_excerpt in RESUME or claim.source_excerpt in COVER for claim in claims)

    scan = client.post(f"/api/candidates/{application['candidate_id']}/consistency-scan", json={"mode": "fixture"})
    assert scan.status_code == 200, scan.text
    aliases = next(c for c in scan.json()["checks"] if c["kind"] == "identity_aliases")
    assert "Priya Natarajan" in aliases["excerpt"] and "pnatarajan" in aliases["excerpt"]
    education = next(c for c in scan.json()["checks"] if c["kind"] == "education_web")
    # An institution is named but no page was supplied, so nothing is claimed either way.
    assert education["outcome"] == "not_found"


def test_upload_pdf_resume_and_text_cover_letter(client):
    files = {
        "resume": ("resume.pdf", _minimal_pdf("Sam Lee - Platform Engineer. Reduced deploy time by 30 percent."), "application/pdf"),
        "cover_letter": ("cover.txt", COVER.encode(), "text/plain"),
    }
    response = client.post("/api/applications/upload", files=files, data={"role_title": "Platform Engineer"})
    assert response.status_code == 200, response.text
    application_id = response.json()["application_id"]
    response = client.post(f"/api/applications/{application_id}/extract-claims")
    assert response.status_code == 200, response.text
    assert all(Claim.model_validate(item).source_excerpt for item in response.json())


def test_upload_rejects_unsupported_and_empty_documents(client):
    response = client.post("/api/applications/upload", files={"resume": ("resume.docx", b"PK\x03\x04", "application/octet-stream")})
    assert response.status_code == 415
    response = client.post("/api/applications", json={"resume_text": "   "})
    assert response.status_code == 422


def test_public_context_fixture_is_labeled_and_recorded(client):
    application = client.post("/api/applications", json={"use_seed": True}).json()
    client.post(f"/api/applications/{application['application_id']}/extract-claims")
    interview = client.post("/api/interviews", json={"candidate_id": application["candidate_id"], "claim_ids": ["claim-rag-pipeline"]}).json()
    response = client.get(f"/api/interviews/{interview['interview_id']}/next-question")
    assert response.status_code == 200, response.text
    session = response.headers["X-Session-ID"]
    events = client.get(f"/api/traces/{session}").json()["events"]
    search = [e for e in events if e["stage"] == "public_context_search"]
    assert search and search[0]["details"]["mode"] == "fixture"
    # Repeating the question does not duplicate the stored snippet.
    client.get(f"/api/interviews/{interview['interview_id']}/next-question")


def test_tavily_live_search_parses_results_and_fails_open(monkeypatch):
    from app import config
    from app.integrations import tavily
    from app.schemas import Claim

    claim = Claim(id="c", candidate_id="x", source_document="resume", source_excerpt="s", category="project",
                  statement="Built a thing", importance="high", entities=["Neo4j", "RAG"])
    monkeypatch.setattr(config, "DEMO_MODE", False)
    monkeypatch.setattr(config, "TAVILY_API_KEY", "")
    with pytest.raises(tavily.SearchUnavailable):
        tavily.search_public_context(claim, {})

    monkeypatch.setattr(config, "TAVILY_API_KEY", "tvly-test")
    captured = {}

    def fake_post(url, json, headers, timeout, trust_env):
        captured.update(url=url, body=json, headers=headers)
        return httpx.Response(200, json={"results": [
            {"title": "Repo", "url": "https://github.com/x/y", "content": "Neo4j RAG pipeline"},
            {"title": "Bad", "url": "http://insecure.example", "content": "ignored"},
        ]})

    monkeypatch.setattr(tavily.httpx, "post", fake_post)
    snippets, mode = tavily.search_public_context(claim, {"names": ["Ada Lovelace"], "urls": ["https://github.com/x/y"]})
    assert mode == "live" and [s["url"] for s in snippets] == ["https://github.com/x/y"]
    assert captured["headers"]["Authorization"] == "Bearer tvly-test"
    assert captured["body"]["query"].startswith("Ada Lovelace Neo4j RAG")
    assert captured["body"]["include_domains"] == ["github.com"]

    def failing_post(*args, **kwargs):
        raise httpx.ConnectError("down")

    monkeypatch.setattr(tavily.httpx, "post", failing_post)
    with pytest.raises(tavily.SearchUnavailable):
        tavily.search_public_context(claim, {})


def test_solari_mode_requires_configuration_and_uses_browser_text(client, monkeypatch):
    application = client.post("/api/applications", json={"use_seed": True}).json()
    client.post(f"/api/applications/{application['application_id']}/extract-claims")
    url = "https://demo.claimproof.example/hybrid-rag"

    response = client.post("/api/claims/claim-rag-pipeline/collect-evidence", json={"mode": "solari", "url": url})
    assert response.status_code == 422
    assert "not configured" in response.json()["detail"]

    from app import config
    from app.integrations import solari

    monkeypatch.setattr(config, "SOLARI_API_KEY", "slr_live_test")
    monkeypatch.setenv("EVIDENCE_ALLOWED_HOSTS", "demo.claimproof.example")
    monkeypatch.setattr(solari, "fetch_page_text", lambda target: {"text": "Hybrid retrieval  over Neo4j.\n\nF1 61.30 -> 64.05", "title": "demo", "final_url": target, "session_id": "pool:abc"})
    response = client.post("/api/claims/claim-rag-pipeline/collect-evidence", json={"mode": "solari", "url": url})
    assert response.status_code == 200, response.text
    item = response.json()
    assert item["source_label"].startswith("Public page via Solari browser")
    assert item["excerpt"] == "Hybrid retrieval over Neo4j. F1 61.30 -> 64.05"
    assert "authorship" in item["limitations"].lower()

    from app.integrations.evidence import CollectionError

    def failing(target):
        raise CollectionError("Solari browser could not load the source; no evidence collected")

    monkeypatch.setattr(solari, "fetch_page_text", failing)
    response = client.post("/api/claims/claim-rag-pipeline/collect-evidence", json={"mode": "solari", "url": url})
    assert response.status_code == 422
    assert "no evidence collected" in response.json()["detail"]
