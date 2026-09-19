"""Public-context search for interview questions via Tavily.

Snippets are untrusted document text. They inform *what* to ask about a claim and
are stored as evidence with limitations; they never decide an assessment.
"""
from __future__ import annotations

import httpx

from app import config, schemas

SEARCH_URL = "https://api.tavily.com/search"
_TIMEOUT_SECONDS = 8.0
_MAX_RESULTS = 3
_SNIPPET_LIMIT = 600

FIXTURE_SNIPPETS: dict[str, list[dict]] = {
    "claim-rag-pipeline": [
        {
            "title": "hybrid-rag README (synthetic search fixture)",
            "url": "https://github.com/arivera-ml/hybrid-rag",
            "content": "Hybrid retrieval over Neo4j and a FAISS vector index for RAG. 200 labelled evaluation queries. "
                       "Token-level F1: vector-only 61.30, hybrid 64.05 (+2.75 points). Indexing latency increased because of dual writes.",
        }
    ],
}


class SearchUnavailable(Exception):
    pass


def is_configured() -> bool:
    return bool((getattr(config, "TAVILY_API_KEY", "") or "").strip())


def search_public_context(claim: schemas.Claim, hints: dict | None = None) -> tuple[list[dict], str]:
    """Return (snippets, mode). mode is "fixture" in DEMO_MODE, "live" otherwise.

    Raises SearchUnavailable when no key is configured or the request fails.
    """
    if config.DEMO_MODE:
        return [dict(s) for s in FIXTURE_SNIPPETS.get(claim.id, [])], "fixture"

    api_key = (getattr(config, "TAVILY_API_KEY", "") or "").strip()
    if not api_key:
        raise SearchUnavailable("TAVILY_API_KEY is not configured")

    hints = hints or {}
    name = next(iter(hints.get("names", [])), "")
    query = " ".join(part for part in [name, *claim.entities[:4]] if part).strip() or claim.statement
    include_domains = sorted({_domain(u) for u in hints.get("urls", []) if _domain(u)})
    body = {
        "query": query[:400],
        "search_depth": "basic",
        "max_results": _MAX_RESULTS,
        "include_answer": False,
        "include_raw_content": False,
    }
    if include_domains:
        body["include_domains"] = include_domains[:20]
        body["include_domains_mode"] = "prefer"
    try:
        response = httpx.post(
            SEARCH_URL,
            json=body,
            headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
            timeout=_TIMEOUT_SECONDS,
            trust_env=False,
        )
    except httpx.HTTPError as exc:
        raise SearchUnavailable("Tavily unavailable") from exc
    if response.status_code != 200:
        raise SearchUnavailable(f"Tavily returned HTTP {response.status_code}")
    try:
        results = response.json().get("results") or []
    except ValueError as exc:
        raise SearchUnavailable("Tavily returned a non-JSON body") from exc
    snippets = []
    for item in results[:_MAX_RESULTS]:
        url = str(item.get("url") or "")
        content = str(item.get("content") or "")[:_SNIPPET_LIMIT]
        if url.startswith("https://") and content.strip():
            snippets.append({"title": str(item.get("title") or url)[:200], "url": url, "content": content})
    return snippets, "live"


def _domain(url: str) -> str:
    from urllib.parse import urlparse

    host = urlparse(url if url.startswith("http") else f"https://{url}").hostname or ""
    return host.lower().removeprefix("www.")
