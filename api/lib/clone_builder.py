"""Clone builder: fetch, flatten, serialize — no ML, no heavy deps."""
import json
import uuid
from lib.arctic_shift import (
    extract_post_id, extract_subreddit, fetch_post,
    fetch_comment_tree, fetch_subreddit_rules,
)


def flatten_tree(children: list, depth: int = 0, parent_id: str = None) -> list[dict]:
    """Flatten nested comment tree into a list of flat dicts.

    Each dict: {id, author, body, body_html, score, depth, parent_id, created_utc}
    """
    comments = []
    for child in children:
        if child.get("kind") != "t1":
            continue
        data = child["data"]
        cid = data.get("id", "")
        comments.append({
            "id": cid,
            "author": data.get("author", "[deleted]"),
            "body": data.get("body", "") or "",
            "body_html": data.get("body_html", ""),
            "score": data.get("score", 0),
            "depth": depth,
            "parent_id": parent_id or data.get("parent_id", ""),
            "created_utc": data.get("created_utc", 0),
        })
        replies = data.get("replies")
        if replies and isinstance(replies, dict):
            reply_kids = replies.get("data", {}).get("children", [])
            comments.extend(flatten_tree(reply_kids, depth + 1, cid))
    return comments


def build_clone(reddit_url: str) -> dict:
    """Fetch and flatten a Reddit post clone. Returns serializable dict.

    The caller is responsible for storing this in Vercel Blob.
    Does NOT touch disk — designed for serverless.
    """
    post_id = extract_post_id(reddit_url)
    subreddit = extract_subreddit(reddit_url)
    session_id = str(uuid.uuid4())[:8]

    post = fetch_post(post_id)
    tree = fetch_comment_tree(post_id)
    rules = fetch_subreddit_rules(subreddit)

    comments = flatten_tree(tree)

    session = {
        "session_id": session_id,
        "post": {
            "id": post_id,
            "title": post.get("title", ""),
            "author": post.get("author", ""),
            "selftext": (post.get("selftext", "") or "")[:5000],
            "selftext_html": post.get("selftext_html", ""),
            "score": post.get("score", 0),
            "num_comments": post.get("num_comments", len(comments)),
            "created_utc": post.get("created_utc", 0),
            "url": post.get("url", ""),
            "permalink": post.get("permalink", ""),
            "is_self": post.get("is_self", True),
            "subreddit": subreddit,
            "link_flair_text": post.get("link_flair_text", ""),
        },
        "comments": comments,
        "rules": rules,
    }

    return session
