"""Arctic Shift API client — zero heavy deps, just requests."""
import re
import requests

ARCTIC_SHIFT_BASE = "https://arctic-shift.photon-reddit.com"


def extract_post_id(reddit_url: str) -> str:
    """Extract Reddit post ID from URL.

    Accepts:
      https://www.reddit.com/r/chess/comments/x8i09x/title/
      https://old.reddit.com/r/chess/comments/x8i09x/
      /r/chess/comments/x8i09x/title/
    Returns: 'x8i09x'
    """
    for pat in [r'/comments/([a-z0-9]+)/', r'/comments/([a-z0-9]+)$']:
        m = re.search(pat, reddit_url)
        if m:
            return m.group(1)
    if re.match(r'^[a-z0-9]{5,8}$', reddit_url.strip()):
        return reddit_url.strip()
    raise ValueError(f"Could not extract post ID from: {reddit_url}")


def extract_subreddit(url: str) -> str:
    """Extract subreddit name from URL."""
    m = re.search(r'/r/([^/]+)/', url)
    return m.group(1) if m else ""


def fetch_post(post_id: str) -> dict:
    """Fetch post metadata by ID."""
    resp = requests.get(
        f"{ARCTIC_SHIFT_BASE}/api/posts/ids",
        params={"ids": post_id, "md2html": "true"},
        timeout=20,
    )
    resp.raise_for_status()
    posts = resp.json().get("data", [])
    if not posts:
        raise ValueError(f"Post {post_id} not found")
    return posts[0]


def fetch_comment_tree(post_id: str, limit: int = 9999) -> list:
    """Fetch full comment tree.

    Returns list of {'kind': 't1'|'more', 'data': {...}} objects.
    Nested replies in data['replies']['data']['children'].
    """
    resp = requests.get(
        f"{ARCTIC_SHIFT_BASE}/api/comments/tree",
        params={"link_id": f"t3_{post_id}", "limit": limit, "md2html": "true"},
        timeout=30,
    )
    resp.raise_for_status()
    return resp.json()["data"]


def fetch_subreddit_rules(subreddit: str) -> list[str]:
    """Fetch rules for a subreddit. Returns list of rule strings."""
    try:
        resp = requests.get(
            f"{ARCTIC_SHIFT_BASE}/api/subreddits/rules",
            params={"subreddits": subreddit},
            timeout=10,
        )
        resp.raise_for_status()
        data = resp.json().get("data", {})
        rules = data.get(subreddit, {}).get("rules", [])
        return [r.get("description", r.get("short_name", "")) for r in rules]
    except Exception:
        return []
