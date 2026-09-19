from app.routes.interviews import AnswerResponse, AudioAnswerResponse


def test_audio_answer(client, wav_file):
    response = client.post("/api/applications", json={"use_seed": True})
    assert response.status_code == 200, response.text
    application = response.json()
    response = client.post(
        f"/api/applications/{application['application_id']}/extract-claims"
    )
    assert response.status_code == 200, response.text
    rag_claim = next(claim for claim in response.json() if "RAG" in claim["entities"])

    def start_question():
        response = client.post(
            "/api/interviews",
            json={"candidate_id": application["candidate_id"], "claim_ids": [rag_claim["id"]]},
        )
        assert response.status_code == 200, response.text
        base = f"/api/interviews/{response.json()['interview_id']}"
        response = client.get(f"{base}/next-question")
        assert response.status_code == 200, response.text
        return base, response.json()["question"]["id"]

    audio_base, question_id = start_question()
    with wav_file.open("rb") as audio:
        response = client.post(
            f"{audio_base}/answers/audio",
            data={"question_id": question_id},
            files={"audio": (wav_file.name, audio, "audio/wav")},
        )
    assert response.status_code == 200, response.text
    audio_payload = response.json()
    result = AudioAnswerResponse.model_validate(audio_payload)
    assert result.transcript.strip()
    assert result.next_action in {"follow_up", "next_claim", "completed"}

    text_base, text_question_id = start_question()
    response = client.post(
        f"{text_base}/answers",
        json={"question_id": text_question_id, "transcript": result.transcript},
    )
    assert response.status_code == 200, response.text
    text_result = AnswerResponse.model_validate(response.json())
    assert set(audio_payload) - {"transcript"} == set(response.json())
    assert result.next_action == text_result.next_action
    assert result.grounding == text_result.grounding
    if result.question is None:
        assert text_result.question is None
    else:
        assert result.question.model_dump(exclude={"id"}) == text_result.question.model_dump(exclude={"id"})

    response = client.post(f"{audio_base}/complete")
    assert response.status_code == 200, response.text
    answers = response.json()["answers"]
    assert len(answers) == 1
    assert answers[0]["question_id"] == question_id
    assert answers[0]["transcript"] == result.transcript
