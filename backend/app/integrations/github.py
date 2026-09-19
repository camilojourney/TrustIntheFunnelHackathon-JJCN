"""Public GitHub repository metadata: fixture in DEMO_MODE, bounded live retrieval otherwise.

Only metadata and README text are read. Nothing is cloned or executed, and the
result never establishes that the candidate authored the repository.
"""
import os
import re
from urllib.parse import urlparse

import httpx

from app.integrations.evidence import CollectionError

FIXTURE_REPOS: dict[str, dict] = {
    "https://github.com/arivera-ml/hybrid-rag": {
        "full_name": "arivera-ml/hybrid-rag",
        "owner_login": "arivera-ml",
        "description": "Hybrid graph + vector retrieval for RAG (synthetic demo repository).",
        "language": "Python",
        "topics": ["rag", "neo4j", "faiss", "retrieval"],
        "fork": False,
        "created_at": "2025-11-02T14:10:00Z",
        "pushed_at": "2026-08-30T09:41:00Z",
        "readme": (
            "# hybrid-rag\n\nHybrid retrieval over Neo4j and a FAISS vector index for RAG. "
            "Entities and relations are stored in Neo4j; semantic matches come from vector retrieval; "
            "results are merged and re-ranked.\n\n## Evaluation\n\n200 labelled evaluation queries. "
            "Token-level F1: vector-only 61.30, hybrid 64.05 (+2.75 points). "
            "Indexing latency increased because of dual writes.\n\nThis is a fictional demo repository."
        ),
    },
}

_README_LIMIT = 6000


def parse_repo_url(url: str) -> tuple[str, str] | None:
    parsed = urlparse(url if url.startswith("http") else f"https://{url}")
    if parsed.hostname not in {"github.com", "www.github.com"}:
        return None
    parts = [part for part in parsed.path.split("/") if part]
    if len(parts) < 2:
        return None
    return parts[0], re.sub(r"\.git$", "", parts[1])


def fetch_repo_metadata(url: str, mode: str) -> dict:
    """Return repository metadata. Raises CollectionError when nothing was retrieved."""
    parsed = parse_repo_url(url)
    if parsed is None:
        raise CollectionError("Not a GitHub repository URL")
    owner, repo = parsed
    canonical = f"https://github.com/{owner}/{repo}"

    if mode == "fixture":
        fixture = FIXTURE_REPOS.get(canonical)
        if fixture is None:
            raise CollectionError("No fixture exists for this repository; nothing was retrieved")
        return {**fixture, "url": canonical, "mode": "fixture"}

    allowed = {host.strip().lower() for host in os.getenv("EVIDENCE_ALLOWED_HOSTS", "").split(",") if host.strip()}
    if "api.github.com" not in allowed:
        raise CollectionError("Live GitHub retrieval requires api.github.com on EVIDENCE_ALLOWED_HOSTS")

    headers = {"Accept": "application/vnd.github+json", "User-Agent": "claimproof-demo"}
    token = os.getenv("GITHUB_TOKEN", "").strip()
    if token:
        headers["Authorization"] = f"Bearer {token}"
    try:
        with httpx.Client(timeout=8, follow_redirects=False, trust_env=False, headers=headers) as client:
            response = client.get(f"https://api.github.com/repos/{owner}/{repo}")
            if response.status_code == 404:
                raise CollectionError("Repository not found or not public")
            if response.status_code != 200:
                raise CollectionError(f"GitHub returned HTTP {response.status_code}; no metadata collected")
            data = response.json()
            readme = ""
            readme_response = client.get(
                f"https://api.github.com/repos/{owner}/{repo}/readme",
                headers={"Accept": "application/vnd.github.raw+json"},
            )
            if readme_response.status_code == 200:
                readme = readme_response.text[:_README_LIMIT]
    except httpx.HTTPError as exc:
        raise CollectionError("GitHub unavailable; no metadata collected") from exc

    return {
        "url": canonical,
        "mode": "live",
        "full_name": data.get("full_name", f"{owner}/{repo}"),
        "owner_login": (data.get("owner") or {}).get("login", owner),
        "description": data.get("description") or "",
        "language": data.get("language") or "",
        "topics": list(data.get("topics") or []),
        "fork": bool(data.get("fork")),
        "created_at": data.get("created_at") or "",
        "pushed_at": data.get("pushed_at") or "",
        "readme": readme,
    }
