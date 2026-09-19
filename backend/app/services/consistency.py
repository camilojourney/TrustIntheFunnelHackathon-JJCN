"""Source-consistency scan: what public or stored records line up with the application.

Every check records what a source showed relative to the claim text and which
question a recruiter should ask next. Checks never change an interview
assessment status, never produce a score, and fail open to `unavailable`.
"""
import re
import uuid
from datetime import datetime, timezone
from itertools import permutations
from typing import Any

from sqlalchemy.orm import Session

from app import schemas
from app.integrations.evidence import CollectionError, collect_evidence
from app.integrations.github import fetch_repo_metadata
from app.models import (AnswerModel, ApplicationModel, CandidateModel, ClaimModel, ConsistencyCheckModel,
                        EvidenceModel, InterviewModel, QuestionModel)
from app.services.identity import extract_identity_hints, login_matches_name, name_variants_match
from app.services.tracing import record_event

_RATIO = re.compile(r"(\d+(?:\.\d+)?)\s*(?:x|×)\b", re.IGNORECASE)
_POINTS = re.compile(r"(\d+(?:\.\d+)?)\s*(?:percentage points?|points?|pp)\b", re.IGNORECASE)
_PERCENT = re.compile(r"(\d+(?:\.\d+)?)\s*%")
_NUMBER = re.compile(r"(?<![\w.])(\d+(?:\.\d+)?)(?![\w.])")
_HEDGES = ("not sure", "not certain", "don't know", "do not know", "do not remember", "don't remember", "someone else", "unclear")

_AUTHORSHIP = "Artifact existence does not prove candidate authorship."


def run_consistency_scan(candidate_id: str, db: Session, mode: str = "fixture",
                         source_urls: dict[str, str] | None = None) -> schemas.ConsistencyProfile:
    candidate = db.get(CandidateModel, candidate_id)
    if candidate is None:
        raise LookupError("Candidate not found")
    source_urls = source_urls or {}
    now = datetime.now(timezone.utc).isoformat()

    claims = [_claim_schema(row) for row in db.query(ClaimModel).filter_by(candidate_id=candidate_id).all()]
    applications = sorted(db.query(ApplicationModel).filter_by(candidate_id=candidate_id).all(),
                          key=lambda row: row.created_at or "")
    hints = [_hints_for(app) for app in applications]
    latest_hints = hints[-1] if hints else extract_identity_hints("")
    groundings = _groundings_by_claim(candidate_id, db)
    evidence = {claim.id: db.query(EvidenceModel).filter_by(claim_id=claim.id).all() for claim in claims}

    checks: list[dict[str, Any]] = []
    checks.append(_application_history(candidate, applications, hints))
    checks.append(_identity_aliases(hints))
    checks.extend(_education(claims, latest_hints, source_urls, mode))
    repo_text_by_claim: dict[str, str] = {}
    for claim in claims:
        if claim.category in {"project", "impact"}:
            check, repo_text = _github_project(claim, latest_hints, source_urls, mode)
            checks.append(check)
            if repo_text:
                repo_text_by_claim[claim.id] = repo_text
    for claim in claims:
        numeric = _numeric_check(claim, evidence.get(claim.id, []), repo_text_by_claim.get(claim.id))
        if numeric is not None:
            checks.append(numeric)
    for claim in claims:
        checks.append(_technical_relevance(claim, groundings.get(claim.id, [])))

    db.query(ConsistencyCheckModel).filter_by(candidate_id=candidate_id).delete()
    rows = []
    for check in checks:
        row = ConsistencyCheckModel(id=f"check-{uuid.uuid4().hex[:8]}", candidate_id=candidate_id,
                                    created_at=now, **check)
        db.add(row)
        rows.append(row)
    db.commit()

    profile = _profile(candidate_id, rows, now)
    record_event(db, "consistency_scan", candidate_id, mode=mode,
                 coverage=profile.coverage.model_dump(),
                 checks=[{"kind": c.kind, "outcome": c.outcome, "claim_id": c.claim_id} for c in profile.checks])
    return profile


def load_profile(candidate_id: str, db: Session) -> schemas.ConsistencyProfile | None:
    rows = db.query(ConsistencyCheckModel).filter_by(candidate_id=candidate_id).order_by(ConsistencyCheckModel.created_at).all()
    if not rows:
        return None
    return _profile(candidate_id, rows, rows[-1].created_at)


def attach_consistency(report: schemas.CandidateReport, db: Session) -> schemas.CandidateReport:
    """Add the stored profile and surface its questions on the matching claims.

    Interview statuses are left untouched: a source conflict is a question for
    the recruiter, not a downgrade of what the candidate explained.
    """
    profile = load_profile(report.candidate_id, db)
    report.consistency = profile
    if profile is None:
        return report
    by_claim = {assessment.claim_id: assessment for assessment in report.assessments}
    for check in profile.checks:
        if check.claim_id is None or check.outcome == "aligned":
            continue
        assessment = by_claim.get(check.claim_id)
        if assessment is None:
            continue
        for question in check.recruiter_questions:
            if question not in assessment.unresolved_questions:
                assessment.unresolved_questions.append(question)
    return report


# --- individual checks -----------------------------------------------------

def _application_history(candidate: CandidateModel, applications: list[ApplicationModel], hints: list[dict]) -> dict:
    base = dict(claim_id=None, kind="application_history", mode="local", source_label="Stored application records", source_url=None)
    limitations = ("Application volume is context, not a signal about honesty or fit. ATS duplicates, "
                   "internal transfers, and career changes all inflate it.")
    if not applications:
        return {**base, "outcome": "insufficient", "summary": "No application record is stored for this candidate.",
                "excerpt": None, "limitations": limitations, "recruiter_questions": []}

    labels = [f"{app.role_title or candidate.role_title or 'Unspecified role'} ({(app.created_at or '')[:10] or 'undated'})" for app in applications]
    names = [name for hint in hints for name in hint.get("names", [])]
    consistent = all(name_variants_match(a, b) for a, b in permutations(names, 2)) if len(names) > 1 else True
    questions: list[str] = []
    if len(applications) > 1:
        shared = _shared_bullets(applications)
        span = _days_between(applications[0].created_at, applications[-1].created_at)
        roles = ", ".join(dict.fromkeys(app.role_title or candidate.role_title or "unspecified role" for app in applications))
        detail = f" They share {len(shared)} identical resume bullet{'s' if len(shared) != 1 else ''}." if shared else ""
        questions.append(
            f"{len(applications)} applications were filed {span} day{'s' if span != 1 else ''} apart ({roles}).{detail} "
            "Confirm they are the same person and which role they are pursuing; applying more than once is not a concern by itself.")
    if not consistent:
        questions.append("The applications carry names that do not obviously match. Confirm the records belong to one person before merging them.")
    summary = f"{len(applications)} application{'s' if len(applications) != 1 else ''} on record: {'; '.join(labels)}."
    return {**base, "outcome": "aligned" if consistent else "conflict", "summary": summary,
            "excerpt": None, "limitations": limitations, "recruiter_questions": questions}


def _identity_aliases(hints: list[dict]) -> dict:
    base = dict(claim_id=None, kind="identity_aliases", mode="local", source_label="Names, emails, and handles in the applications", source_url=None)
    limitations = ("Name variants, nicknames, initials, and transliterations are normal. Aliases exist for record linkage "
                   "only and must not be read as a risk signal.")
    names = list(dict.fromkeys(name for hint in hints for name in hint.get("names", [])))
    logins = list(dict.fromkeys(login for hint in hints for login in hint.get("github_logins", [])))
    emails = list(dict.fromkeys(email for hint in hints for email in hint.get("emails", [])))
    identifiers = names + logins + emails
    if len(identifiers) < 2:
        return {**base, "outcome": "insufficient", "summary": "Only one identifier is on record; there is nothing to cross-check.",
                "excerpt": ", ".join(identifiers) or None, "limitations": limitations, "recruiter_questions": []}
    mismatches = [f"{a} / {b}" for a, b in permutations(names, 2) if not name_variants_match(a, b)]
    mismatches += [f"{login} / {name}" for login in logins for name in names if not login_matches_name(login, name)]
    mismatches = list(dict.fromkeys(mismatches))
    if mismatches:
        return {**base, "outcome": "conflict",
                "summary": f"Identifiers that do not obviously refer to one person: {'; '.join(mismatches[:3])}.",
                "excerpt": ", ".join(identifiers), "limitations": limitations,
                "recruiter_questions": ["Confirm that the listed name variants and accounts belong to the candidate before treating the linked artifacts as theirs."]}
    return {**base, "outcome": "aligned",
            "summary": f"{len(identifiers)} identifiers are compatible variants of one person: {', '.join(identifiers)}.",
            "excerpt": ", ".join(identifiers), "limitations": limitations, "recruiter_questions": []}


def _education(claims: list[schemas.Claim], hints: dict, source_urls: dict[str, str], mode: str) -> list[dict]:
    limitations = "Public web pages do not confirm enrollment or graduation. Use a registry or transcript for verification."
    checks = []
    for entry in hints.get("education", []):
        claim_id = next((c.id for c in claims if c.category == "education" and (entry["text"] in c.source_excerpt or c.source_excerpt in entry["text"])), None)
        base = dict(claim_id=claim_id, kind="education_web", excerpt=entry["text"], limitations=limitations)
        if not entry.get("has_institution"):
            checks.append({**base, "outcome": "insufficient", "mode": "local", "source_label": "Application text", "source_url": None,
                           "summary": f"The application states \u201c{entry['text']}\u201d without naming an institution, so no public source can be checked.",
                           "recruiter_questions": [f"Which institution granted the \u201c{entry['text'].rstrip('.')}\u201d, and in what year?",
                                                   "Can the candidate provide a transcript or a registry/clearinghouse verification?"]})
            continue
        url = source_urls.get("education")
        if not url:
            checks.append({**base, "outcome": "not_found", "mode": "local", "source_label": "No public page supplied", "source_url": None,
                           "summary": f"No approved public page was supplied to check \u201c{entry['text']}\u201d.",
                           "recruiter_questions": ["Ask the candidate for a verifiable education record or an institution page that lists the program."]})
            continue
        try:
            item = collect_evidence(url, mode)
        except (CollectionError, ValueError) as exc:
            checks.append({**base, "outcome": "unavailable", "mode": mode, "source_label": "Education page", "source_url": url,
                           "summary": f"The education page could not be retrieved: {exc}", "recruiter_questions": ["Retry the education source or ask for a transcript."]})
            continue
        page = item["excerpt"].lower()
        tokens = [t for t in re.findall(r"[a-z]{4,}", entry["text"].lower())]
        matched = [t for t in tokens if t in page]
        aligned = len(matched) >= max(1, len(tokens) // 2)
        checks.append({**base, "outcome": "aligned" if aligned else "conflict", "mode": mode, "source_label": item["source_label"], "source_url": url,
                       "excerpt": item["excerpt"][:400],
                       "summary": (f"The page mentions {', '.join(matched)}." if aligned else f"The page does not mention the stated degree or institution terms ({', '.join(tokens)})."),
                       "recruiter_questions": [] if aligned else ["The supplied page does not corroborate the stated degree. Ask for a transcript or registry verification."]})
    return checks


def _github_project(claim: schemas.Claim, hints: dict, source_urls: dict[str, str], mode: str) -> tuple[dict, str | None]:
    base = dict(claim_id=claim.id, kind="github_project")
    limitations = f"Public metadata and README text only. {_AUTHORSHIP} Reported figures were not reproduced."
    explicit = source_urls.get(claim.id)
    candidates = [explicit] if explicit else list(hints.get("github_repos", []))
    if not candidates:
        return ({**base, "outcome": "not_found", "mode": "local", "source_label": "No repository link", "source_url": None, "excerpt": None,
                 "summary": "No repository or project link was supplied for this claim.", "limitations": limitations,
                 "recruiter_questions": [f"Is there a repository, README, or design document that shows \u201c{claim.statement}\u201d? Ask for a sanitized artifact if the code is private."]}, None)

    best: dict | None = None
    best_matched: list[str] = []
    errors: list[str] = []
    for url in candidates:
        try:
            meta = fetch_repo_metadata(url, mode)
        except (CollectionError, ValueError) as exc:
            errors.append(f"{url}: {exc}")
            continue
        haystack = " ".join([meta.get("readme", ""), meta.get("description", ""), " ".join(meta.get("topics", [])), meta.get("language", "")]).lower()
        matched = [entity for entity in claim.entities if _entity_present(entity, haystack)]
        if best is None or len(matched) > len(best_matched):
            best, best_matched = meta, matched
    if best is None:
        return ({**base, "outcome": "unavailable", "mode": mode, "source_label": "GitHub", "source_url": candidates[0], "excerpt": None,
                 "summary": "No repository metadata could be retrieved: " + "; ".join(errors), "limitations": limitations,
                 "recruiter_questions": ["Retry the repository check or ask the candidate for a reachable artifact."]}, None)

    ratio = len(best_matched) / max(1, len(claim.entities))
    facts = f"Language: {best.get('language') or 'unknown'}; topics: {', '.join(best.get('topics') or []) or 'none'}; {'fork' if best.get('fork') else 'not a fork'}; created {(best.get('created_at') or '')[:10] or 'unknown'}; last push {(best.get('pushed_at') or '')[:10] or 'unknown'}."
    excerpt = (best.get("readme") or best.get("description") or "")[:400] or None
    questions: list[str] = []
    if ratio >= 0.5:
        outcome = "aligned"
        summary = f"{best['full_name']} mentions {', '.join(best_matched)}. {facts}"
    elif best_matched:
        outcome = "insufficient"
        summary = f"{best['full_name']} mentions only {', '.join(best_matched)} of {', '.join(claim.entities)}. {facts}"
        questions.append(f"The linked repository covers part of the claim. Ask where {', '.join(e for e in claim.entities if e not in best_matched)} is shown.")
    elif explicit:
        outcome = "conflict"
        summary = f"The supplied repository {best['full_name']} does not mention {', '.join(claim.entities)}. {facts}"
        questions.append("The repository supplied for this claim does not mention its key terms. Confirm the right repository was linked and where the work lives.")
    else:
        outcome = "not_found"
        summary = f"No linked repository mentions {', '.join(claim.entities)}; checked {best['full_name']}. {facts}"
        questions.append(f"Which repository, benchmark, or document supports \u201c{claim.statement}\u201d? Ask for the before/after artifact.")
    if best.get("fork") and outcome == "aligned":
        outcome = "insufficient"
        questions.append(f"{best['full_name']} is a fork. Ask what the candidate added beyond the upstream project.")
    # Only a repository that addresses the claim can supply figures for the numeric check.
    repo_text = " ".join([best.get("readme", ""), best.get("description", "")]) if best_matched else None
    return ({**base, "outcome": outcome, "mode": best["mode"], "source_label": f"GitHub: {best['full_name']}", "source_url": best["url"],
             "excerpt": excerpt, "summary": summary, "limitations": limitations, "recruiter_questions": questions},
            repo_text)


def _numeric_check(claim: schemas.Claim, evidence: list[EvidenceModel], repo_text: str | None) -> dict | None:
    text = f"{claim.statement} {claim.source_excerpt}"
    kind = None
    claimed = None
    for pattern, label in ((_RATIO, "ratio"), (_POINTS, "points"), (_PERCENT, "percent")):
        match = pattern.search(text)
        if match:
            kind, claimed = label, float(match.group(1))
            break
    if kind is None:
        return None
    unit = {"ratio": "\u00d7", "points": " points", "percent": "%"}[kind]
    limitations = ("Arithmetic on figures quoted in a source. Matching numbers do not show the experiment was run, "
                   "that conditions were comparable, or that the work was the candidate's own.")
    base = dict(claim_id=claim.id, kind="numeric_source_check", mode="local", limitations=limitations)

    sources = [(row.source_label, row.source_url, row.excerpt) for row in evidence if row.type in {"document_excerpt", "external_artifact"}]
    if repo_text:
        sources.append(("Linked repository README", None, repo_text))
    if not sources:
        return {**base, "outcome": "not_found", "source_label": "No numeric source collected", "source_url": None, "excerpt": None,
                "summary": f"The claim states {claimed:g}{unit}, but no source with figures has been collected for it.",
                "recruiter_questions": [f"Which benchmark, log, or dashboard produced the {claimed:g}{unit} figure? Ask for the before and after measurements and their conditions."]}

    tolerance = max(0.05 * abs(claimed), 0.01) if kind == "ratio" else (0.011 if kind == "points" else 1.0)
    # Closest before/after pair across every collected source. Years are dropped so dates never form a pair.
    best_pair: tuple[float, float, float] | None = None
    best_source = sources[0]
    for label, url, excerpt in sources:
        numbers = [float(n) for n in _NUMBER.findall(excerpt or "") if not (len(n) == 4 and n.startswith(("19", "20")))]
        for a, b in permutations(numbers, 2):
            if a <= 0:
                continue
            observed = b / a if kind == "ratio" else (b - a if kind == "points" else (b - a) / a * 100)
            if observed > 0 and (best_pair is None or abs(observed - claimed) < abs(best_pair[2] - claimed)):
                best_pair, best_source = (a, b, observed), (label, url, excerpt)

    label, url, excerpt = best_source
    if best_pair is None:
        return {**base, "outcome": "insufficient", "source_label": label, "source_url": url, "excerpt": (excerpt or "")[:400],
                "summary": f"The collected source has no pair of figures to compare against the claimed {claimed:g}{unit}.",
                "recruiter_questions": [f"Ask for the before and after figures behind {claimed:g}{unit} and where they were recorded."]}
    a, b, observed = best_pair
    observed_text = f"{observed:.2f}".rstrip("0").rstrip(".")
    if abs(observed - claimed) <= tolerance:
        return {**base, "outcome": "aligned", "source_label": label, "source_url": url, "excerpt": (excerpt or "")[:400],
                "summary": f"Source figures {a:g} \u2192 {b:g} give {observed_text}{unit}, matching the claimed {claimed:g}{unit}.",
                "recruiter_questions": []}
    return {**base, "outcome": "conflict", "source_label": label, "source_url": url, "excerpt": (excerpt or "")[:400],
            "summary": f"Source figures {a:g} \u2192 {b:g} give {observed_text}{unit}; the claim states {claimed:g}{unit}.",
            "recruiter_questions": [f"The inspected source shows {observed_text}{unit}, not {claimed:g}{unit}. Does the claim refer to a different experiment, baseline, or conditions?"]}


def _technical_relevance(claim: schemas.Claim, groundings: list[dict]) -> dict:
    base = dict(claim_id=claim.id, kind="technical_relevance", mode="local", source_label="Interview transcripts", source_url=None)
    limitations = "Judges answer content against the claim's terms only. No tone, fluency, pace, accent, or delivery signals are used."
    if not groundings:
        return {**base, "outcome": "insufficient", "summary": "Not yet interviewed; there is no answer to check against the claim.",
                "excerpt": None, "limitations": limitations, "recruiter_questions": []}
    matched = sorted({term for g in groundings for term in (g.get("matched_terms") or [])})
    off_topic = [g for g in groundings if not g.get("on_topic", True)]
    hedged = [g for g in groundings if any(h in (g.get("transcript") or "").lower() for h in _HEDGES)]
    missing = [e for e in claim.entities if e.lower() not in {m.lower() for m in matched}]
    excerpt = (groundings[0].get("transcript") or "")[:300] or None
    if off_topic:
        return {**base, "outcome": "insufficient", "excerpt": excerpt, "limitations": limitations,
                "summary": f"{len(off_topic)} of {len(groundings)} answers did not address the claim's subject.",
                "recruiter_questions": [f"Ask the candidate to explain {claim.statement.rstrip('.')} directly, with one concrete example."]}
    if hedged or not matched:
        detail = f"mentioned {', '.join(matched)}" if matched else "did not name the claim's key terms"
        return {**base, "outcome": "insufficient", "excerpt": excerpt, "limitations": limitations,
                "summary": f"Answers {detail}; {'the candidate said they were unsure about part of it' if hedged else 'the specifics were thin'}.",
                "recruiter_questions": [f"Ask for the specifics still missing: {', '.join(missing) if missing else 'mechanism, measurement, and the candidate\u2019s own part'}."]}
    return {**base, "outcome": "aligned", "excerpt": excerpt, "limitations": limitations,
            "summary": (f"The answer engaged the claim's terms: {', '.join(matched)}." if len(groundings) == 1
                        else f"All {len(groundings)} answers engaged the claim's terms: {', '.join(matched)}."),
            "recruiter_questions": []}


# --- helpers ----------------------------------------------------------------

def _claim_schema(row: ClaimModel) -> schemas.Claim:
    return schemas.Claim(id=row.id, candidate_id=row.candidate_id, source_document=row.source_document,
                         source_excerpt=row.source_excerpt, category=row.category, statement=row.statement,
                         importance=row.importance, entities=row.entities or [])


def _hints_for(app: ApplicationModel) -> dict:
    if app.identity_hints:
        return app.identity_hints
    return extract_identity_hints(app.resume_text or "")


def _groundings_by_claim(candidate_id: str, db: Session) -> dict[str, list[dict]]:
    rows = (db.query(AnswerModel, QuestionModel)
            .join(QuestionModel, AnswerModel.question_id == QuestionModel.id)
            .join(InterviewModel, AnswerModel.interview_id == InterviewModel.id)
            .filter(InterviewModel.candidate_id == candidate_id)
            .order_by(AnswerModel.created_at).all())
    result: dict[str, list[dict]] = {}
    for answer, question in rows:
        grounding = dict(answer.grounding or {})
        grounding.setdefault("on_topic", True)
        grounding["transcript"] = answer.transcript
        result.setdefault(question.claim_id, []).append(grounding)
    return result


def _entity_present(entity: str, haystack: str) -> bool:
    needle = entity.lower().strip()
    if needle in haystack:
        return True
    words = [w for w in re.findall(r"[a-z0-9]+", needle) if len(w) >= 3]
    return bool(words) and all(w in haystack for w in words)


def _shared_bullets(applications: list[ApplicationModel]) -> list[str]:
    bullet_sets = []
    for app in applications:
        bullets = {line.strip().lstrip("-• ").strip() for line in (app.resume_text or "").splitlines() if line.strip().startswith(("-", "•"))}
        bullet_sets.append(bullets)
    shared = set.intersection(*bullet_sets) if bullet_sets else set()
    return sorted(shared)


def _days_between(first: str | None, last: str | None) -> int:
    try:
        a = datetime.fromisoformat((first or "").replace("Z", "+00:00"))
        b = datetime.fromisoformat((last or "").replace("Z", "+00:00"))
        return abs((b - a).days)
    except ValueError:
        return 0


def _profile(candidate_id: str, rows: list[ConsistencyCheckModel], generated_at: str) -> schemas.ConsistencyProfile:
    checks = [schemas.ConsistencyCheck(
        id=row.id, candidate_id=row.candidate_id, claim_id=row.claim_id, kind=row.kind, outcome=row.outcome,
        summary=row.summary, source_label=row.source_label, source_url=row.source_url, excerpt=row.excerpt,
        limitations=row.limitations, recruiter_questions=list(row.recruiter_questions or []), mode=row.mode,
        created_at=row.created_at) for row in rows]
    coverage = schemas.ConsistencyCoverage()
    for check in checks:
        setattr(coverage, check.outcome, getattr(coverage, check.outcome) + 1)
    return schemas.ConsistencyProfile(candidate_id=candidate_id, generated_at=generated_at, coverage=coverage, checks=checks)
