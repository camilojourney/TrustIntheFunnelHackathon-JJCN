"""Explicit fixture collection and bounded retrieval of approved public pages."""
import ipaddress
import os
import socket
from html.parser import HTMLParser
from urllib.parse import urlparse

import httpx

FIXTURE_URL = "https://demo.claimproof.example/hybrid-rag"
FIXTURE_EXCERPT = "Hybrid retrieval over Neo4j and a vector index. Evaluation: 200 labelled queries. F1: vector-only 61.30, hybrid 64.05."


class CollectionError(ValueError):
    pass


class PageText(HTMLParser):
    def __init__(self):
        super().__init__()
        self.parts = []
        self.hidden = 0

    def handle_starttag(self, tag, attrs):
        if tag in {"script", "style"}:
            self.hidden += 1

    def handle_endtag(self, tag):
        if tag in {"script", "style"}:
            self.hidden = max(0, self.hidden - 1)

    def handle_data(self, data):
        if not self.hidden and data.strip():
            self.parts.append(data.strip())


def collect_evidence(url: str, mode: str) -> dict:
    if mode == "fixture":
        if url != FIXTURE_URL:
            raise CollectionError("The fixture mode only supports the controlled demo artifact")
        return dict(type="document_excerpt", source_label="Synthetic demo artifact (fixture; not live-collected)",
                    excerpt=FIXTURE_EXCERPT, supports="The fictional figures illustrate a 2.75 point F1 difference.",
                    limitations="Synthetic data: no real project or benchmark was verified. Artifact existence does not prove candidate authorship.")
    parsed = urlparse(url)
    allowed = {host.strip().lower() for host in os.getenv("EVIDENCE_ALLOWED_HOSTS", "").split(",") if host.strip()}
    if parsed.scheme != "https" or parsed.hostname not in allowed or parsed.username or parsed.password or parsed.port not in (None, 443):
        raise CollectionError("Live retrieval requires an HTTPS URL on EVIDENCE_ALLOWED_HOSTS")
    if mode == "solari":
        # Same allowlist and truthfulness rules; only the transport differs. A Solari failure
        # never falls back to a direct fetch, so the source label stays accurate.
        from app.integrations.solari import fetch_page_text

        page = fetch_page_text(url)
        excerpt = " ".join(page["text"].split())[:2000]
        if not excerpt:
            raise CollectionError("Source contained no readable text")
        return dict(type="external_artifact", source_label=f"Public page via Solari browser: {parsed.hostname}", source_url=url,
                    excerpt=excerpt, supports="This text was rendered on the supplied page in a Solari cloud browser when retrieved.",
                    limitations="Page content is untrusted and may be incomplete. Claims and benchmarks were not independently verified. Artifact existence does not prove candidate authorship.")
    try:
        addresses = socket.getaddrinfo(parsed.hostname, 443, type=socket.SOCK_STREAM)
        if not addresses or any(not ipaddress.ip_address(row[4][0]).is_global for row in addresses):
            raise CollectionError("Only public network addresses are supported")
        with httpx.stream("GET", url, timeout=8, follow_redirects=False, trust_env=False) as response:
            if response.status_code != 200:
                raise CollectionError(f"Source returned HTTP {response.status_code}; no evidence collected")
            if not any(t in response.headers.get("content-type", "") for t in ("text/html", "text/plain")):
                raise CollectionError("Source must be HTML or plain text")
            body = bytearray()
            for chunk in response.iter_bytes():
                body.extend(chunk)
                if len(body) > 250_000:
                    raise CollectionError("Source exceeds the 250 KB collection limit")
    except (httpx.HTTPError, OSError) as exc:
        raise CollectionError("Source unavailable; no evidence collected") from exc
    parser = PageText()
    parser.feed(body.decode("utf-8", errors="replace"))
    excerpt = " ".join(parser.parts)[:2000]
    if not excerpt:
        raise CollectionError("Source contained no readable text")
    return dict(type="external_artifact", source_label=f"Public page: {parsed.hostname}", source_url=url,
                excerpt=excerpt, supports="This text was present on the supplied page when retrieved.",
                limitations="Page content is untrusted and may be incomplete. Claims and benchmarks were not independently verified. Artifact existence does not prove candidate authorship.")
