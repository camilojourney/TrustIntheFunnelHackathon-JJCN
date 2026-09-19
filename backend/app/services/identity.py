"""Deterministic identity hints from application text: names, emails, URLs, education lines.

These are record-linkage hints for the recruiter, not identity verification.
"""
import re

_EMAIL = re.compile(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}")
_URL = re.compile(r"(?:https?://)?(?:www\.)?(?:github\.com|linkedin\.com|gitlab\.com|[A-Za-z0-9.-]+\.[a-z]{2,})/[^\s)>\"']+", re.IGNORECASE)
_GITHUB_REPO = re.compile(r"(?:https?://)?(?:www\.)?github\.com/([A-Za-z0-9_.-]+)/([A-Za-z0-9_.-]+)", re.IGNORECASE)
_DEGREE = re.compile(
    r"\b(B\.?S\.?|B\.?A\.?|M\.?S\.?|M\.?A\.?|MBA|Ph\.?D\.?|Bachelor(?:'s)?|Master(?:'s)?|Doctorate|Associate(?:'s)?|Bootcamp)\b",
    re.IGNORECASE,
)
_INSTITUTION = re.compile(r"\b(University|College|Institute|School|Polytechnic|Academy)\b", re.IGNORECASE)
_YEAR = re.compile(r"\b(19|20)\d{2}\b")


def extract_identity_hints(resume_text: str) -> dict:
    lines = [line.strip() for line in (resume_text or "").splitlines()]
    non_empty = [line for line in lines if line]

    names: list[str] = []
    if non_empty:
        head = re.split(r"\s+[-–—|]\s+", non_empty[0], maxsplit=1)[0].strip()
        # A plausible person name: two to four capitalised tokens, optional initials.
        if re.fullmatch(r"(?:[A-Z][A-Za-z'’.-]*\.?\s+){1,3}[A-Z][A-Za-z'’-]+", head):
            names.append(head)

    emails = sorted({match.lower() for match in _EMAIL.findall(resume_text or "")})
    urls = sorted({_normalise_url(match) for match in _URL.findall(resume_text or "") if not match.lower().endswith("@")})
    github_repos = sorted({f"https://github.com/{owner}/{repo.rstrip('.')}" for owner, repo in _GITHUB_REPO.findall(resume_text or "")})
    github_logins = sorted({owner.lower() for owner, _repo in _GITHUB_REPO.findall(resume_text or "")})

    education = []
    for line in non_empty:
        if _DEGREE.search(line):
            institution = _INSTITUTION.search(line)
            years = [int(match.group(0)) for match in _YEAR.finditer(line)]
            education.append({
                "text": line.lstrip("-• ").strip(),
                "degree": _DEGREE.search(line).group(0),
                "has_institution": institution is not None,
                "years": years,
            })

    return {
        "names": names,
        "emails": emails,
        "urls": urls,
        "github_repos": github_repos,
        "github_logins": github_logins,
        "education": education,
    }


def _normalise_url(raw: str) -> str:
    url = raw.rstrip(".,;")
    if not url.lower().startswith("http"):
        url = "https://" + url
    return url


def name_variants_match(a: str, b: str) -> bool:
    """True when two names plausibly refer to one person (shared surname, compatible initials)."""
    ta = _tokens(a)
    tb = _tokens(b)
    if not ta or not tb:
        return False
    if ta[-1] != tb[-1]:
        return False
    return ta[0][0] == tb[0][0]


def login_matches_name(login: str, name: str) -> bool:
    """A handle such as `arivera-ml` is compatible with `Alex Rivera`."""
    tokens = _tokens(name)
    if not tokens:
        return False
    handle = re.sub(r"[^a-z]", "", login.lower())
    surname = tokens[-1]
    return surname in handle or (tokens[0][0] + surname) in handle or "".join(tokens) in handle


def _tokens(name: str) -> list[str]:
    return [re.sub(r"[^a-z]", "", part.lower()) for part in name.split() if re.sub(r"[^a-z]", "", part.lower())]
