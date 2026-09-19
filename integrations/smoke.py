"""Exercise the real API without sponsor services. Run against a DEMO_MODE backend."""
import argparse
import json
from urllib.request import Request, urlopen
from uuid import uuid4


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--base-url", default="http://127.0.0.1:8000")
    args = parser.parse_args()
    session = str(uuid4())

    def call(path, body=None):
        request = Request(args.base_url.rstrip("/") + "/api/" + path,
                          data=None if body is None else json.dumps(body).encode(),
                          headers={"Content-Type": "application/json", "X-Session-ID": session})
        with urlopen(request, timeout=30) as response:
            return json.load(response)

    application = call("applications", {"use_seed": True})
    claims = call(f"applications/{application['application_id']}/extract-claims", {})
    interview = call("interviews", {"candidate_id": application["candidate_id"], "claim_ids": [c["id"] for c in claims]})["interview_id"]
    path = f"interviews/{interview}"
    for _ in range(7):
        step = call(f"{path}/next-question")
        if step["completed"]:
            break
        q = step["question"]
        claim = next(c for c in claims if c["id"] == q["claim_id"])
        call(f"{path}/answers", {"question_id": q["id"], "transcript": "I worked on " + claim["entities"][0]})
    else:
        raise RuntimeError("Interview exceeded six questions")
    evidence = call("claims/claim-rag-pipeline/collect-evidence", {"mode": "fixture", "url": "https://demo.claimproof.example/hybrid-rag"})
    report = call(f"{path}/complete", {})
    fetched = call(f"candidates/{application['candidate_id']}/report")
    assert fetched == report and len(report["claims"]) == 3
    assert evidence["id"] in {e["id"] for e in report["evidence"]}
    consistency = report["consistency"]
    assert consistency and consistency["checks"], "completed report should carry source-consistency checks"
    assert all(check["limitations"] for check in consistency["checks"])
    events = call(f"traces/{session}")["events"]
    assert {"claim_extraction", "follow_up_generation", "evidence_collection", "assessment_generation", "consistency_scan"} <= {e["stage"] for e in events}
    print(json.dumps({"result": "passed", "candidate_id": report["candidate_id"], "session_id": session, "trace_events": len(events), "report_url": f"/recruiter/{report['candidate_id']}?source=live&session={session}"}, indent=2))


if __name__ == "__main__":
    main()
