from app.schemas import CandidateReport, ConsistencyProfile
from tests.test_happy_path import assert_no_scores


def _seed_and_extract(client):
    application = client.post("/api/applications", json={"use_seed": True}).json()
    client.post(f"/api/applications/{application['application_id']}/extract-claims")
    return application["candidate_id"]


def _by_kind(profile: ConsistencyProfile, kind: str, claim_id: str | None = None):
    return [c for c in profile.checks if c.kind == kind and (claim_id is None or c.claim_id == claim_id)]


def test_scan_before_interview_uses_fixtures_only(client):
    candidate_id = _seed_and_extract(client)
    response = client.post(f"/api/candidates/{candidate_id}/consistency-scan", json={"mode": "fixture"})
    assert response.status_code == 200, response.text
    profile = ConsistencyProfile.model_validate(response.json())
    assert_no_scores(response.json())

    # Two applications (current + prior) with compatible name variants.
    history = _by_kind(profile, "application_history")[0]
    assert history.outcome == "aligned" and history.claim_id is None
    assert "2 applications" in history.summary
    assert history.recruiter_questions and "not a concern by itself" in history.recruiter_questions[0]

    aliases = _by_kind(profile, "identity_aliases")[0]
    assert aliases.outcome == "aligned"
    assert "arivera-ml" in aliases.excerpt

    # Degree without an institution cannot be checked anywhere.
    education = _by_kind(profile, "education_web")[0]
    assert education.outcome == "insufficient"
    assert any("institution" in q.lower() for q in education.recruiter_questions)

    # Fixture README lines up with the RAG claim; nothing supports the 10x claim.
    rag_repo = _by_kind(profile, "github_project", "claim-rag-pipeline")[0]
    assert rag_repo.outcome == "aligned" and rag_repo.mode == "fixture"
    assert "authorship" in rag_repo.limitations.lower()
    throughput_repo = _by_kind(profile, "github_project", "claim-inference-throughput")[0]
    assert throughput_repo.outcome == "not_found"

    rag_numbers = _by_kind(profile, "numeric_source_check", "claim-rag-pipeline")[0]
    assert rag_numbers.outcome == "aligned" and "2.75" in rag_numbers.summary
    throughput_numbers = _by_kind(profile, "numeric_source_check", "claim-inference-throughput")[0]
    assert throughput_numbers.outcome == "not_found"
    assert "10" in throughput_numbers.recruiter_questions[0]

    # No interview yet, so relevance cannot be assessed.
    assert all(c.outcome == "insufficient" for c in _by_kind(profile, "technical_relevance"))
    assert all(c.limitations for c in profile.checks)
    assert profile.coverage.aligned == 4 and profile.coverage.not_found == 2

    fetched = client.get(f"/api/candidates/{candidate_id}/consistency")
    assert fetched.status_code == 200
    assert ConsistencyProfile.model_validate(fetched.json()) == profile


def test_scan_fails_open_on_unknown_repo_and_rejects_fixture_outside_demo(client, monkeypatch):
    candidate_id = _seed_and_extract(client)
    response = client.post(
        f"/api/candidates/{candidate_id}/consistency-scan",
        json={"mode": "fixture", "source_urls": {"claim-inference-throughput": "https://github.com/someone/private-bench"}},
    )
    assert response.status_code == 200, response.text
    profile = ConsistencyProfile.model_validate(response.json())
    check = _by_kind(profile, "github_project", "claim-inference-throughput")[0]
    assert check.outcome == "unavailable"
    assert check.recruiter_questions

    from app import config
    from app.routes import consistency as route

    monkeypatch.setattr(route.config, "DEMO_MODE", False)
    assert client.post(f"/api/candidates/{candidate_id}/consistency-scan", json={"mode": "fixture"}).status_code == 400
    monkeypatch.setattr(config, "DEMO_MODE", True)
    assert client.post("/api/candidates/nobody/consistency-scan", json={"mode": "fixture"}).status_code == 404


def test_completed_report_carries_checks_without_changing_statuses(client):
    candidate_id = _seed_and_extract(client)
    claims = client.get(f"/api/candidates/{candidate_id}/claims").json()
    interview_id = client.post("/api/interviews", json={"candidate_id": candidate_id, "claim_ids": [c["id"] for c in claims]}).json()["interview_id"]
    answers = {
        "claim-rag-pipeline": "Neo4j supplied graph relationships while vector retrieval found semantic matches for RAG. Across 200 evaluation queries, F1 improved by 2.75 percentage points. Dual writes raised indexing latency, so I would batch updates and rerun the evaluation.",
        "claim-aws-service": "I deployed an AWS service on EC2 behind a load balancer. S3 held files and a queue buffered jobs. The load balancer stopped sending traffic to a failed instance.",
        "claim-inference-throughput": "I am not sure how the 10x inference throughput was measured; I do not know the baseline or load conditions.",
    }
    for _ in range(7):
        step = client.get(f"/api/interviews/{interview_id}/next-question").json()
        if step["completed"]:
            break
        question = step["question"]
        client.post(f"/api/interviews/{interview_id}/answers", json={"question_id": question["id"], "transcript": answers[question["claim_id"]]})

    response = client.post(f"/api/interviews/{interview_id}/complete")
    assert response.status_code == 200, response.text
    report = CandidateReport.model_validate(response.json())
    assert_no_scores(response.json())
    assert report.consistency is not None
    assert {a.claim_id: a.status for a in report.assessments} == {
        "claim-rag-pipeline": "demonstrated",
        "claim-aws-service": "partially_demonstrated",
        "claim-inference-throughput": "unresolved",
    }

    # Source questions reach the matching claim; aligned checks add nothing.
    throughput = next(a for a in report.assessments if a.claim_id == "claim-inference-throughput")
    assert any("repository" in q.lower() or "benchmark" in q.lower() for q in throughput.unresolved_questions)
    rag = next(a for a in report.assessments if a.claim_id == "claim-rag-pipeline")
    assert not any("repository" in q.lower() for q in rag.unresolved_questions)

    relevance = {c.claim_id: c for c in report.consistency.checks if c.kind == "technical_relevance"}
    assert relevance["claim-rag-pipeline"].outcome == "aligned"
    assert relevance["claim-inference-throughput"].outcome == "insufficient"
    assert "tone" in relevance["claim-rag-pipeline"].limitations.lower()

    fetched = client.get(f"/api/candidates/{candidate_id}/report")
    assert CandidateReport.model_validate(fetched.json()) == report

    session = response.headers["X-Session-ID"]
    stages = {event["stage"] for event in client.get(f"/api/traces/{session}").json()["events"]}
    assert "consistency_scan" in stages
