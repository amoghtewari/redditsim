"""Web search for fact-checking — DuckDuckGo HTML scrape (keyless, free)."""
from __future__ import annotations
import re
from html import unescape

import requests

USER_AGENT = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) RedditSim/1.0"

# Claim verbs that carry checkable real-world assertions. Used both for
# detection and for building search queries from lowercase Reddit-speak.
CLAIM_VERBS = (
    "fired|sacked|hired|appointed|resigned|retired|quit|suspended|banned|"
    "signed|sold|released|transferred|relegated|promoted|"
    "died|passed away|arrested|injured|"
    "won|lost|beat|defeated|eliminated|"
    "announced|confirmed|revealed|leaked"
)

_CLAIM_PATTERNS = [
    # Event verbs in any tense ("been fired", "got sacked", "he resigned")
    rf'(?i)\b(?:been|got|was|were|just)\s+(?:{CLAIM_VERBS})\b',
    rf'(?i)\b(?:{CLAIM_VERBS})\b',
    # Status assertions ("still in charge", "still at the club", "currently the manager")
    r'(?i)\b(?:still|currently|no longer)\s+(?:in charge|at|with|the|a)\b',
    r'(?i)\bin charge\b',
    # Movement / affiliation claims
    r'(?i)(?:joined|moved to|signed with|transferred to|going to|heading to)\s',
    r'(?i)(?:staying at|staying with|remaining at|staying put|still at)\s',
    r'(?i)(?:said no|rejected|declined|refused|turned down)\s',
    r'(?i)(?:is at|plays for|manages|coaches|coaching)\s',
    r'(?i)(?:\bis\b.*\b(?:manager|coach|player|captain)\b)',
    # Third-person factual questions ("hasn't he been fired?", "is she still the coach?")
    r"(?i)\b(?:hasn't|hasn’t|didn't|didn’t|wasn't|wasn’t|isn't|isn’t|is|has|did|was)\s+(?:he|she|they|it)\b.*\?",
    # Dates
    r'(?i)(?:\b(?:19|20)\d{2}\b)',
    r'(?i)(?:as of|since|from)\s(?:january|february|march|april|may|june|july|august|september|october|november|december)',
]


def _strip_html(text: str) -> str:
    return unescape(re.sub(r'<[^>]+>', '', text or '')).strip()


def search_web(query: str, max_results: int = 3) -> list[str]:
    """Search the web and return result snippets (DuckDuckGo HTML, no key)."""
    try:
        resp = requests.post(
            "https://html.duckduckgo.com/html/",
            data={"q": query},
            headers={"User-Agent": USER_AGENT},
            timeout=4,  # Vercel functions have a 10s budget — fail fast
        )
        resp.raise_for_status()

        snippets = []
        for match in re.finditer(
            r'<a[^>]*class="result__snippet"[^>]*>(.*?)</a>',
            resp.text,
            re.DOTALL,
        ):
            text = _strip_html(match.group(1))
            if text and text not in snippets:
                snippets.append(text)
            if len(snippets) >= max_results:
                break
        return snippets
    except Exception:
        return []


def has_factual_claims(text: str) -> bool:
    """Detect checkable real-world claims — in assertions OR questions.

    Works on lowercase Reddit-speak: claim verbs and status phrases match
    regardless of capitalization; proper nouns are a fallback signal only.
    """
    if not text:
        return False
    for pattern in _CLAIM_PATTERNS:
        if re.search(pattern, text):
            return True
    # Fallback: capitalized multi-word proper nouns (people, teams)
    if re.findall(r'\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)\b', text):
        return True
    return False


_ENTITY_STOP = {
    'The', 'A', 'An', 'This', 'That', 'It', 'He', 'She', 'They', 'We', 'You', 'I',
    'And', 'But', 'Or', 'RedditSim', 'AI', 'Earlier', 'Thread', 'Reddit', 'Comment',
    'User', 'Rules', 'Subreddit', 'OP', 'Posted', 'Contains',
}


def _entities(text: str) -> list[str]:
    found = re.findall(r'\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\b', text or "")
    # Reject any entity containing a stop word ("Reddit Thread", "Earlier")
    return [
        e for e in found
        if len(e) > 3 and not any(w in _ENTITY_STOP for w in e.split())
    ]


def extract_search_query(
    user_comment: str,
    ai_response: str = "",
    extra_context: str = "",
    subreddit: str = "",
) -> str | None:
    """Build a search query from the exchange plus thread context.

    Lowercase questions like "hasn't he been fired?" carry no entities —
    the subject lives in the thread (post title, nearby comments) and the
    subreddit name, so those are first-class query sources.
    """
    entities = _entities(ai_response) + _entities(user_comment) + _entities(extra_context)

    # Claim verbs from the exchange itself ("fired", "signed", ...)
    claim_words = re.findall(rf'(?i)\b({CLAIM_VERBS})\b', f"{user_comment} {ai_response}")
    claim_words = [w.lower() for w in dict.fromkeys(claim_words)]  # dedupe, keep order

    if not entities and not claim_words and not subreddit:
        return None

    parts: list[str] = []
    if subreddit:
        parts.append(subreddit)
    parts.extend(dict.fromkeys(entities[:3]))
    parts.extend(claim_words[:2])

    if not parts:
        return None
    return f"{' '.join(parts)} 2025 2026"  # bias toward recent news
