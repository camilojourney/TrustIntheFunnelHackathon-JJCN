from app.schemas import CandidateReport, Claim, EvidenceItem, InterviewQuestion


def assert_no_scores(value):
    if isinstance(value, dict):
        assert not {"score", "truth_score"}.intersection(value)
        for child in value.values():
            assert_no_scores(child)
    elif isinstance(value, list):
        for child in value:
            assert_no_scores(child)


def test_happy_path(client):
    response = client.post("/api/applications", json={"use_seed": True})
    assert response.status_code == 200, response.text
    application = response.json()
    candidate_id = application["candidate_id"]

    response = client.post(
        f"/api/applications/{application['application_id']}/extract-claims"
    )
    assert response.status_code == 200, response.text
    claims = [Claim.model_validate(item) for item in response.json()]
    assert len(claims) == 3
    claim_ids = {claim.id for claim in claims}
    assert len(claim_ids) == 3
    assert all(claim.candidate_id == candidate_id and claim.source_excerpt for claim in claims)

    response = client.post(
        "/api/interviews",
        json={"candidate_id": candidate_id, "claim_ids": [claim.id for claim in claims]},
    )
    assert response.status_code == 200, response.text
    interview_id = response.json()["interview_id"]
    base = f"/api/interviews/{interview_id}"
    transcripts = {
        "claim-rag-pipeline": "I used Neo4j for the RAG pipeline.",
        "claim-aws-service": (
            "I deployed the AWS service using EC2 behind a load balancer and S3 for "
            "storage, but someone else configured recovery and autoscaling."
        ),
        "claim-inference-throughput": (
            "I am not sure how the 10x inference throughput was measured; "
            "I do not know the baseline or load conditions."
        ),
    }
    rag_follow_up = (
        "Neo4j supplied graph relationships while vector retrieval found semantic "
        "matches for RAG. Across 200 held-out evaluation queries, F1 improved by "
        "2.75 percentage points over the vector-only baseline. Dual writes increased "
        "indexing latency, so I would batch updates and rerun the same evaluation."
    )
    seen_questions = {}
    seen_kinds = {claim_id: [] for claim_id in claim_ids}
    submitted_transcripts = {}
    pending_question = None
    last_action = None

    # Three openings plus at most three follow-ups, then a completion response.
    for _ in range(7):
        response = client.get(f"{base}/next-question")
        assert response.status_code == 200, response.text
        payload = response.json()
        if payload["completed"]:
            assert payload["question"] is None
            assert last_action == "completed"
            break

        question = InterviewQuestion.model_validate(payload["question"])
        assert question.claim_id in claim_ids
        assert question.id not in seen_questions
        if pending_question is not None:
            assert question.model_dump() == pending_question
        seen_questions[question.id] = question
        seen_kinds[question.claim_id].append(question.kind)
        transcript = (
            rag_follow_up
            if question.claim_id == "claim-rag-pipeline" and question.kind == "follow_up"
            else transcripts[question.claim_id]
        )
        submitted_transcripts[question.id] = transcript
        response = client.post(
            f"{base}/answers", json={"question_id": question.id, "transcript": transcript}
        )
        assert response.status_code == 200, response.text
        answer = response.json()
        last_action = answer["next_action"]
        assert last_action in {"follow_up", "next_claim", "completed"}
        pending_question = answer["question"]
        if last_action == "follow_up":
            follow_up = InterviewQuestion.model_validate(pending_question)
            assert follow_up.kind == "follow_up"
            assert follow_up.claim_id == question.claim_id
        else:
            assert pending_question is None
    else:
        raise AssertionError("Interview exceeded its six-question budget")

    assert all(kinds in (["opening"], ["opening", "follow_up"]) for kinds in seen_kinds.values())
    assert seen_kinds["claim-rag-pipeline"] == ["opening", "follow_up"]

    response = client.post(
        "/api/claims/claim-rag-pipeline/evidence",
        json={
            "type": "external_artifact",
            "source_label": "Controlled demo README fixture",
            "excerpt": "The demo README describes hybrid Neo4j and vector retrieval.",
            "supports": "The documented architecture matches the claim.",
            "limitations": "Controlled fixture; benchmark results were not independently verified.",
        },
    )
    assert response.status_code == 200, response.text
    evidence = EvidenceItem.model_validate(response.json())
    assert "artifact existence does not prove candidate authorship" in evidence.limitations.lower()

    response = client.post(f"{base}/complete")
    assert response.status_code == 200, response.text
    completed = CandidateReport.model_validate(response.json())
    assert_no_scores(response.json())

    response = client.get(f"/api/candidates/{candidate_id}/report")
    assert response.status_code == 200, response.text
    report = CandidateReport.model_validate(response.json())
    assert report == completed
    assert report.candidate_id == candidate_id
    assert {claim.id for claim in report.claims} == claim_ids
    assert len(report.assessments) == len(claim_ids)
    assert {assessment.claim_id for assessment in report.assessments} == claim_ids
    assert {question.id for question in report.questions} == set(seen_questions)
    assert len(report.answers) == len(submitted_transcripts)
    assert {answer.question_id: answer.transcript for answer in report.answers} == submitted_transcripts
    # The attached artifact is present; any other item is a labeled public-context fixture, never a live claim.
    assert evidence in report.evidence
    for item in report.evidence:
        if item != evidence:
            assert item.source_label.startswith("Synthetic search fixture")
            assert "does not verify" in item.limitations
    evidence_by_id = {item.id: item for item in report.evidence}
    for assessment in report.assessments:
        assert assessment.rationale.strip()
        for evidence_id in assessment.evidence_ids:
            item = evidence_by_id[evidence_id]
            assert item.claim_id == assessment.claim_id
            assert item.limitations.strip()
        if assessment.claim_id == "claim-rag-pipeline":
            assert evidence.id in assessment.evidence_ids
    assert_no_scores(response.json())
