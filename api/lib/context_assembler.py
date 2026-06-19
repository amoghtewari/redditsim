"""Structural context assembly for Reddit comment trees.

Replaces embedding-based retrieval with tree-structure-aware context building.
Faster, zero dependencies, equally effective for tree-structured discussions.
"""
from __future__ import annotations
import re
from typing import Optional


def build_thread_context(
    comments: list[dict],
    target_comment_id: Optional[str],
    max_depth: int = 8,
    sibling_limit: int = 0,
    top_level_limit: int = 3,
) -> list[dict]:
    """Build context around a target comment using tree structure."""
    if not comments:
        return []

    by_id = {c["id"]: c for c in comments}
    children_by_parent = {}
    for c in comments:
        pid = c["parent_id"]
        children_by_parent.setdefault(pid, []).append(c)

    context_ids = set()

    if target_comment_id and target_comment_id in by_id:
        current_id = target_comment_id
        depth_count = 0
        while current_id and depth_count < max_depth:
            comment = by_id.get(current_id)
            if not comment:
                break
            context_ids.add(current_id)

            pid = comment["parent_id"]
            siblings = sorted(
                children_by_parent.get(pid, []),
                key=lambda x: x["score"],
                reverse=True,
            )[:sibling_limit]
            for sib in siblings:
                context_ids.add(sib["id"])

            current_id = pid
            depth_count += 1

        children = children_by_parent.get(target_comment_id, [])
        for child in sorted(children, key=lambda x: x["score"], reverse=True)[:5]:
            context_ids.add(child["id"])

    else:
        post_id = comments[0]["parent_id"] if comments else ""
        top_level = sorted(
            children_by_parent.get(post_id, []),
            key=lambda x: x["score"],
            reverse=True,
        )[:top_level_limit]
        for c in top_level:
            context_ids.add(c["id"])

    result = [c for c in comments if c["id"] in context_ids]
    result.sort(key=lambda x: (x["depth"], -x["score"]))
    return result


def linearize_context(
    context_comments: list[dict],
    post_title: str,
    post_body: str,
    rules: Optional[list[str]] = None,
    max_comment_chars: int = 500,
) -> str:
    """Convert context comments into a linearized prompt string."""
    lines = [
        f"# r/Reddit Thread: {post_title}",
        f"**OP:** {post_body[:2000]}",
        "",
        "--- Comment Thread ---",
    ]
    
    for i, c in enumerate(context_comments):
        indent = "  " * min(c["depth"], 8)
        author = c["author"]
        body = c["body"][:max_comment_chars]
        score = f" [{c['score']} pts]" if c["score"] else ""
        
        # Progressive summarization: compress oldest comments in deep threads
        total_comments = len(context_comments)
        if total_comments > 8 and i < total_comments - 6:
            # Old comments get compressed to one line
            lines.append(f"{indent}[Earlier: u/{author} said: {body[:80]}...]")
        else:
            # Keep full text for recent comments
            image_urls = []
            urls = re.findall(r'(https?://[^\s]+)', body)
            for url in urls:
                if re.search(r'\.(jpg|jpeg|png|gif|webp)(\?|$)', url, re.I) or 'redd.it' in url or 'imgur.com' in url:
                    image_urls.append(url)
            
            lines.append(f"{indent}u/{author}{score}: {body}")
            
            if image_urls:
                for img in image_urls[:2]:
                    lines.append(f"{indent}  [contains image]")
    
    if rules:
        lines.append("")
        lines.append("--- Subreddit Rules ---")
        for i, r in enumerate(rules, 1):
            lines.append(f"{i}. {r}")

    return "\n".join(lines)


def estimate_tokens(text: str) -> int:
    """Rough token estimate: ~4 chars per token."""
    return max(1, len(text) // 4)
