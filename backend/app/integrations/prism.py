"""Optional Block Convey PRISM mirror for local execution events.

Local SQLite traces remain the source of truth. This module never raises to
callers: missing credentials, timeouts, and PRISM outages are ignored.
"""
from __future__ import annotations

import json

import httpx

from app import config

DEFAULT_HOST = "https://prism.blockconvey.com"
_TIMEOUT_SECONDS = 2.0


def is_configured() -> bool:
    return bool(_api_key() and _project_id())


def emit_event(session_id: str, stage: str, status: str, details: dict) -> None:
    try:
        api_key = _api_key()
        project_id = _project_id()
        if not api_key or not project_id:
            return
        host = (getattr(config, "PRISMTRACE_HOST", None) or DEFAULT_HOST).strip().rstrip("/") or DEFAULT_HOST
        payload = {
            "project_id": project_id,
            "session_id": session_id,
            "agent_id": "claimproof",
            "model": "claimproof-demo",
            "input_messages": [{"role": "user", "content": stage}],
            "output_message": json.dumps({"status": status, "details": details or {}}),
            "metadata": {"stage": stage, "status": status, "source": "claimproof-local"},
        }
        httpx.post(
            f"{host}/api/traces",
            json=payload,
            headers={"X-PRISMtrace-Key": api_key},
            timeout=_TIMEOUT_SECONDS,
            trust_env=False,
        )
    except Exception:
        return


def _api_key() -> str:
    return (getattr(config, "PRISMTRACE_API_KEY", None) or "").strip()


def _project_id() -> str:
    return (getattr(config, "PRISMTRACE_PROJECT_ID", None) or "").strip()
