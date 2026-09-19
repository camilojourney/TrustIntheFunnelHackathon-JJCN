"""Retrieve an approved public page through a Solari cloud browser.

Lifecycle is REST (POST/DELETE /sessions); the page is driven over the session's
CDP endpoint with Playwright. Only visible text is returned. Failures raise
CollectionError so the caller records `unavailable` instead of inventing evidence.
"""
from __future__ import annotations

from urllib.parse import quote

import httpx

from app import config
from app.integrations.evidence import CollectionError

_SESSION_TIMEOUT = 20.0
_PAGE_TIMEOUT_MS = 20_000
_TEXT_LIMIT = 250_000


def is_configured() -> bool:
    return bool((getattr(config, "SOLARI_API_KEY", "") or "").strip())


def fetch_page_text(url: str) -> dict:
    """Return {"text", "title", "final_url", "session_id"} for an already-validated HTTPS URL."""
    api_key = (getattr(config, "SOLARI_API_KEY", "") or "").strip()
    if not api_key:
        raise CollectionError("Solari retrieval requires SOLARI_API_KEY")
    base = (getattr(config, "SOLARI_BASE_URL", "") or "https://api.getsolari.com").rstrip("/")
    headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}

    try:
        created = httpx.post(f"{base}/sessions", json={"stealth": False}, headers=headers,
                             timeout=_SESSION_TIMEOUT, trust_env=False)
    except httpx.HTTPError as exc:
        raise CollectionError("Solari unavailable; no evidence collected") from exc
    if created.status_code != 201:
        raise CollectionError(f"Solari session request returned HTTP {created.status_code}")
    session = created.json()
    session_id = session.get("sessionId") or session.get("id") or ""
    cdp_endpoint = session.get("cdpEndpoint")
    if not session_id or not cdp_endpoint:
        raise CollectionError("Solari session response lacked a CDP endpoint")

    try:
        return {**_drive(cdp_endpoint, url), "session_id": session_id}
    finally:
        _release(base, headers, session_id)


def _drive(cdp_endpoint: str, url: str) -> dict:
    try:
        from playwright.sync_api import sync_playwright
    except ImportError as exc:  # pragma: no cover - depends on the environment
        raise CollectionError("Solari retrieval requires the playwright package") from exc
    try:
        with sync_playwright() as playwright:
            browser = playwright.chromium.connect_over_cdp(cdp_endpoint, timeout=_PAGE_TIMEOUT_MS)
            try:
                context = browser.contexts[0] if browser.contexts else browser.new_context()
                page = context.new_page()
                response = page.goto(url, wait_until="domcontentloaded", timeout=_PAGE_TIMEOUT_MS)
                if response is not None and response.status != 200:
                    raise CollectionError(f"Source returned HTTP {response.status}; no evidence collected")
                text = page.evaluate("() => document.body ? document.body.innerText : ''") or ""
                return {"text": text[:_TEXT_LIMIT], "title": page.title(), "final_url": page.url}
            finally:
                browser.close()
    except CollectionError:
        raise
    except Exception as exc:  # Playwright raises many concrete types; none should leak upward.
        raise CollectionError("Solari browser could not load the source; no evidence collected") from exc


def _release(base: str, headers: dict, session_id: str) -> None:
    try:
        httpx.delete(f"{base}/sessions/{quote(session_id, safe='')}", headers=headers, timeout=10, trust_env=False)
    except httpx.HTTPError:
        pass
