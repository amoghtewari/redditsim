"""LangGraph responder with tone sensing, structured personas, multi-turn memory, progressive summarization, and hallucination hedging."""
from __future__ import annotations
import hashlib
import json
import os
import random
import uuid
import time
import re
from typing import TypedDict, Optional
from openai import OpenAI

from storage import get as blob_get, put as blob_put, is_expired
from lib.context_assembler import build_thread_context, linearize_context, estimate_tokens
from lib.web_search import search_web, has_factual_claims, extract_search_query

_client: Optional[OpenAI] = None
MAX_RETRIES = 2


def get_llm() -> OpenAI:
    global _client
    if _client is None:
        _client = OpenAI(
            api_key=os.getenv("DEEPSEEK_API_KEY"),
            base_url="https://api.deepseek.com/v1",
            # Vercel functions are capped at 10s — never let one call eat the budget,
            # and never let the SDK's default retry+backoff (2 retries) run.
            timeout=8.0,
            max_retries=0,
        )
    return _client


class ResponderState(TypedDict):
    session_id: str
    user_comment: str
    parent_comment_id: Optional[str]
    user_comment_id: Optional[str]   # id of the user's just-stored comment (excluded from context)
    ai_username: str                 # the AI's Reddit identity for this reply
    subreddit: str                   # for grounding web search queries
    post_title: str                  # for grounding web search queries
    persona: str
    context_text: str
    response: str
    token_count: int
    retry_count: int
    validation_passed: bool
    web_context: str
    fact_checked: bool
    toxicity_checked: bool
    thread_tone: str          # hostile/humorous/serious/supportive/neutral
    ai_history: str           # what the AI has already said in this session
    tone_checked: bool
    score: int                # predicted upvote score for the AI's response
    score_checked: bool
    user_score: int           # predicted upvote score for the user's comment
    is_toxic: bool            # toxicity verdict (own channel — never piggybacks on web_context)


# === Structured Persona Profiles ===
# Each persona defines: voice, vocabulary, sentence_style, emotional_range, knowledge
PERSONA_PROFILES = {
    "": {
        "voice": "casual Reddit user",
        "style": "mix of short and medium sentences, uses 'lol' and 'tbh' naturally",
        "range": "mild — can be sarcastic but not aggressive",
        "knowledge": "general internet culture, pop culture references",
    },
    "default": {
        "voice": "casual Reddit user",
        "style": "mix of short and medium sentences, uses 'lol' and 'tbh' naturally",
        "range": "mild — can be sarcastic but not aggressive",
        "knowledge": "general internet culture, pop culture references",
    },
    "expert": {
        "voice": "knowledgeable insider",
        "style": "longer analytical sentences, uses 'actually' and 'the thing is', cites specifics",
        "range": "confident but not arrogant, open to being corrected",
        "knowledge": "domain-specific facts, studies, historical examples",
    },
    "troll": {
        "voice": "provocative contrarian",
        "style": "short punchy sentences, rhetorical questions, dismissive 'lol' and 'bro'",
        "range": "edgy and sarcastic but stays PG-13 — no slurs, no threats",
        "knowledge": "surface-level, deliberately misses nuance to provoke",
    },
    "newbie": {
        "voice": "earnest curious newcomer",
        "style": "asks genuine questions, admits ignorance, uses 'wait' and 'ohh'",
        "range": "positive and eager, never confrontational",
        "knowledge": "limited, asks for explanations",
    },
    "comedian": {
        "voice": "witty jokester",
        "style": "puns, pop culture references, unexpected analogies, one-liners",
        "range": "playful, never mean-spirited, self-deprecating humor OK",
        "knowledge": "meme culture, dad jokes, current events for material",
    },
}


def _match_persona_profile(persona_text: str) -> dict:
    """Match a persona string to a structured profile."""
    if not persona_text:
        return PERSONA_PROFILES["default"]
    text_lower = persona_text.lower()
    for key, profile in PERSONA_PROFILES.items():
        if key and key != "default" and key in text_lower:
            return profile
    # Custom persona — use the text directly but with structure hints
    return {
        "voice": persona_text,
        "style": "natural Reddit comment style, mix of short and medium sentences",
        "range": "match the persona's natural emotional range",
        "knowledge": "whatever the persona would reasonably know",
    }


# === AI Username Roster ===
# Multiple AI voices: each persona gets a small pool of plausible usernames
# (stored in session["ai_roster"]) so replies don't all come from one bot.

_USERNAME_ADJ = [
    "Spicy", "Quiet", "Salty", "Crispy", "Mellow", "Rogue", "Sleepy", "Turbo",
    "Lucky", "Grumpy", "Cosmic", "Pixel", "Retro", "Sneaky", "Velvet", "Feral",
    "Mild", "Chaotic", "Sad", "Angry", "Soggy", "Local", "Ancient", "Brave",
]
_USERNAME_NOUN = [
    "Otter", "Falcon", "Noodle", "Wizard", "Badger", "Pickle", "Comet", "Walrus",
    "Goblin", "Panda", "Biscuit", "Raven", "Mango", "Yeti", "Ferret", "Cactus",
    "Penguin", "Donut", "Lobster", "Hamster", "Gremlin", "Toaster", "Burrito",
]
_ROSTER_POOL_SIZE = 3  # max distinct usernames per persona


def _persona_key(persona: str) -> str:
    """Stable key for a persona string (used for roster lookup)."""
    text = (persona or "").strip().lower()
    if not text:
        return "default"
    return hashlib.md5(text.encode()).hexdigest()[:8]


def _mint_username(taken: set[str]) -> str:
    """Generate a plausible Reddit username not already in use."""
    for _ in range(50):
        adj = random.choice(_USERNAME_ADJ)
        noun = random.choice(_USERNAME_NOUN)
        style = random.random()
        if style < 0.35:
            name = f"{adj}{noun}{random.randint(2, 99)}"
        elif style < 0.65:
            name = f"{adj.lower()}_{noun.lower()}"
        elif style < 0.85:
            name = f"{adj}{noun}"
        else:
            name = f"{noun.lower()}{random.randint(1980, 2012)}"
        if name not in taken:
            return name
    return f"redditor_{uuid.uuid4().hex[:6]}"  # pathological collision fallback


def _resolve_ai_username(session: dict, persona_key: str, parent_comment_id: Optional[str]) -> str:
    """Pick the AI's identity for this reply.

    Priority:
      1. Thread continuity — if an AI comment with the same persona already
         exists in the parent chain, reuse that author (same voice in-thread).
      2. Roster reuse — pick from this persona's existing username pool.
      3. Mint a new username (pool capped at _ROSTER_POOL_SIZE per persona).
    """
    comments = session.get("comments", [])
    by_id = {c["id"]: c for c in comments}

    # 1. Walk up the parent chain looking for a same-persona AI comment
    current = parent_comment_id
    for _ in range(20):
        if not current or current not in by_id:
            break
        c = by_id[current]
        if c.get("is_ai") and c.get("persona_key") == persona_key:
            return c["author"]
        current = c.get("parent_id")

    # 2/3. Roster reuse or mint
    roster = session.get("ai_roster", {})
    pool = roster.get(persona_key, [])
    if pool and (len(pool) >= _ROSTER_POOL_SIZE or random.random() < 0.6):
        return random.choice(pool)
    taken = {c.get("author", "") for c in comments}
    for names in roster.values():
        taken.update(names)
    return _mint_username(taken)


# === Subreddit Culture Detection (regex, no LLM call) ===

def _detect_culture(comments: list[dict]) -> str:
    """Detect subreddit culture from comment patterns — zero tokens."""
    if not comments:
        return ""
    sample = [c["body"] for c in comments[:20] if c.get("body") and not c.get("is_ai") and not c.get("is_user")]
    if not sample:
        return ""
    
    combined = " ".join(sample)
    all_caps_ratio = len(re.findall(r'\b[A-Z]{3,}\b', combined)) / max(len(combined.split()), 1)
    slang_hits = len(re.findall(r'(?i)\b(lol|lmao|bruh|bro|fr|ngl|tbh|wtf|yeet|based|cringe|sus|cap|no cap|goat|w|L)\b', combined))
    emoji_count = len(re.findall(r'[😀-🙏🌀-🗿🚀-🛿]', combined))
    
    indicators = []
    if all_caps_ratio > 0.05:
        indicators.append("aggressive/all-caps humor style")
    if slang_hits > 5:
        indicators.append("heavy internet slang and memes")
    if emoji_count > 3:
        indicators.append("emoji-heavy casual tone")
    
    if not indicators:
        return "This subreddit has a neutral, discussion-oriented tone."
    return "This subreddit uses " + ", ".join(indicators) + "."


# === Attack / validation patterns ===

CODE_PATTERNS = [
    r'```', r'`[^`]+`', r'print\(', r'def ', r'import ',
    r'console\.log', r'System\.out', r'let |const |var ',
]

AI_TELL_PATTERNS = [
    r'(?i)there you go', r'(?i)here(\'s| is) (a|the|your|some)',
    r'(?i)i hope (this|that) helps', r'(?i)let me (know|explain|break|show)',
    r'(?i)feel free to', r'(?i)as an AI', r'(?i)as a language model',
    r'(?i)i\'m an AI', r'(?i)that said,', r'(?i)to answer your question',
    r'(?i)great question', r'(?i)happy to help', r'(?i)certainly!',
    r'(?i)of course!', r'^#+\s', r'\*\*[^*]+\*\*', r'^\d+\.\s', r'^[-*]\s',
]

TOXICITY_PATTERNS = [
    r'(?i)\b(fuck|fucking|shit|shitty|bitch|bastard|asshole|dick|cunt|piss|damn)\b',
    r'(?i)\b(kill|murder|die|death|suicide)\b.*\b(you|your|yourself|him|her|them)\b',
    r'(?i)\b(slut|whore|retard|idiot|moron|stupid|dumb)\b',
    r'(?i)\b(nigger|faggot|tranny|chink|kike|spic|wetback)\b',
    r'(?i)(go\s+(fuck|kill|die)|shut\s+(the|up)|piss\s+off)',
    r'(?i)\b(rape|molest|abuse|assault)\b',
]


def validate_response(response: str) -> tuple[bool, str]:
    if response.lstrip().startswith("{"):
        return False, "Looks like raw JSON, not a Reddit comment"
    for pattern in CODE_PATTERNS:
        if re.search(pattern, response):
            return False, f"Contains code/technical syntax"
    for pattern in AI_TELL_PATTERNS:
        if re.search(pattern, response):
            return False, f"Contains AI-assistant language"
    if len(response) < 10:
        return False, "Response too short"
    if response.count('\n') > 3:
        return False, "Contains multi-line formatting"
    return True, ""


# === LangGraph Nodes ===

def assemble_context(state: ResponderState) -> ResponderState:
    """Load session, detect culture, inject AI history, build context."""
    session_id = state["session_id"]
    blob_path = f"sessions/{session_id}.json"
    try:
        blob_data = blob_get(blob_path, token=os.getenv("BLOB_READ_WRITE_TOKEN"))
        session = json.loads(blob_data)
    except Exception as e:
        raise ValueError(f"Session {session_id} not found or expired: {e}")

    if is_expired(session):
        raise ValueError(f"Session {session_id} has expired")

    post = session["post"]
    comments = session["comments"]
    rules = session.get("rules", [])

    # Stash search-grounding metadata for the fact-check nodes
    state["subreddit"] = post.get("subreddit", "") or ""
    state["post_title"] = post.get("title", "") or ""

    # Resolve this reply's AI identity (thread-sticky, persona-keyed roster)
    persona_key = _persona_key(state.get("persona", ""))
    state["ai_username"] = _resolve_ai_username(session, persona_key, state.get("parent_comment_id"))

    # Detect subreddit culture (zero-token, regex-based)
    culture = _detect_culture(comments)

    # Multi-turn memory: only what THIS username has said — other AI voices
    # are just other redditors from this identity's point of view
    ai_history = []
    for c in comments:
        if c.get("is_ai") and c.get("body") and c.get("author") == state["ai_username"]:
            ai_history.append(c["body"][:100])
    state["ai_history"] = " | ".join(ai_history[-5:]) if ai_history else ""  # last 5 responses

    # Build thread context, excluding the user's just-stored comment — it's
    # passed separately as "## User's Comment" and must not appear twice
    context_comments = build_thread_context(comments, state.get("parent_comment_id"))
    user_comment_id = state.get("user_comment_id")
    if user_comment_id:
        context_comments = [c for c in context_comments if c["id"] != user_comment_id]
    post_body = post.get("selftext", "") or ""
    post_title = post.get("title", "")

    context_text = linearize_context(context_comments, post_title, post_body, rules)

    # Append culture and AI history to context
    if culture:
        context_text += f"\n\n[subreddit culture: {culture}]"
    if state["ai_history"]:
        context_text += f"\n\n[you previously said: {state['ai_history']}]"

    state["context_text"] = context_text
    state["token_count"] = estimate_tokens(context_text)
    state["retry_count"] = 0
    state["validation_passed"] = False
    return state


def _build_structured_system_prompt(state: ResponderState) -> str:
    """Variant of the system prompt that requests JSON output.

    Combines tone detection, response generation, toxicity check, and score
    prediction into a single call — eliminating 3 extra round-trips.
    """
    profile = _match_persona_profile(state.get("persona", ""))
    persona_block = (
        f"Voice: {profile['voice']}\n"
        f"Writing style: {profile['style']}\n"
        f"Emotional range: {profile['range']}\n"
        f"Knowledge: {profile['knowledge']}"
    )
    username = state.get("ai_username", "") or "a Reddit user"
    return f"""You are u/{username}, a Reddit user in a comment thread. Respond with ONLY a JSON object (no markdown, no wrapping).

Required JSON fields:
- "reply": your plain-text Reddit reply (4-8 sentences, can be 1-2 paragraphs, no markdown, no code, no lists)
- "tone": ONE word describing the thread's tone — exactly one of: hostile, humorous, serious, supportive, neutral
- "is_toxic": true if your reply contains slurs, explicit threats, or clear hate speech; otherwise false
- "estimated_score": integer — predicted upvotes for YOUR reply (negative for toxic/off-topic, 1-15 average, 15-100 good, 100-500 very good)
- "user_score": integer — predicted upvotes for the USER's comment shown below, judged against this thread (same scale)

HARD RULES for the reply field:
- NO code blocks, backticks, markdown, bullet points, numbered lists, headers
- NO "Here's", "There you go", "I hope this helps", "Let me explain"
- NO "Great question!", "Happy to help!", "Certainly!", "Of course!"
- NEVER acknowledge being an AI or language model
- NEVER break persona — stay in character 100%
- If you don't know something, hedge: "I think", "from what I remember", "could be wrong but"
- NEVER fabricate specific facts, dates, or names you're unsure of

## YOUR PERSONA
{persona_block}

## Thread Context
{state['context_text']}

## User's Comment
"{state['user_comment']}"
"""




def generate_structured(state: ResponderState) -> ResponderState:
    """Single LLM call: generate reply + detect tone + toxicity flag + score.

    On retries (validation failed), falls back to plain-text generation so
    the retry prompt can be more directive without JSON overhead.
    """
    client = get_llm()
    is_retry = state.get("retry_count", 0) > 0

    if is_retry:
        # Plain-text retry — tone/score already set from first attempt
        response = client.chat.completions.create(
            model="deepseek-chat",
            messages=[
                {"role": "system", "content": _build_system_prompt(state, is_retry=True)},
                {"role": "user", "content": state["user_comment"]},
            ],
            max_tokens=250,
            temperature=0.4,
        )
        state["response"] = response.choices[0].message.content.strip()
        return state

    # First attempt: structured JSON — reply + tone + toxicity + score in one call
    response = client.chat.completions.create(
        model="deepseek-chat",
        messages=[
            {"role": "system", "content": _build_structured_system_prompt(state)},
            {"role": "user", "content": state["user_comment"]},
        ],
        max_tokens=400,
        temperature=0.8,
        response_format={"type": "json_object"},
    )

    raw = response.choices[0].message.content
    try:
        data = json.loads(raw)
        state["response"] = str(data.get("reply", "")).strip()

        # Tone
        tone = str(data.get("tone", "neutral")).lower().strip()
        valid_tones = {"hostile", "humorous", "serious", "supportive", "neutral"}
        state["thread_tone"] = tone if tone in valid_tones else "neutral"
        state["tone_checked"] = True

        # Scores (AI reply + user comment) — clamped to the same range as before
        def _clamp_score(value, default):
            try:
                return max(-50, min(5000, int(value)))
            except (ValueError, TypeError):
                return default
        state["score"] = _clamp_score(data.get("estimated_score"), 5)
        state["user_score"] = _clamp_score(data.get("user_score"), 3)
        state["score_checked"] = True

        # Toxicity — own state channel; must NOT touch web_context, which
        # fact_check routing treats as "web results exist".
        state["is_toxic"] = bool(data.get("is_toxic", False))
        state["toxicity_checked"] = True

    except (json.JSONDecodeError, KeyError, TypeError):
        # Parse failed. Try to salvage the reply field from malformed JSON
        # so a raw JSON blob never gets posted as the comment.
        m = re.search(r'"reply"\s*:\s*"((?:[^"\\]|\\.)*)"', raw)
        if m:
            state["response"] = m.group(1).replace('\\"', '"').replace("\\n", " ").strip()
        else:
            state["response"] = raw.strip()
        state["thread_tone"] = "neutral"
        state["tone_checked"] = True
        # score/toxicity left unchecked — predict_score and toxicity_check
        # nodes run as real fallbacks downstream.

    return state


def _build_system_prompt(state: ResponderState, is_retry: bool = False) -> str:
    """Build system prompt with structured persona, tone hint, and hallucination hedging."""
    profile = _match_persona_profile(state.get("persona", ""))
    tone = state.get("thread_tone", "")
    
    persona_block = f"""## YOUR PERSONA
Voice: {profile['voice']}
Writing style: {profile['style']}
Emotional range: {profile['range']}
Knowledge: {profile['knowledge']}
Every word you write must embody this persona exactly."""

    tone_block = ""
    if tone:
        tone_block = f"\n\nThread tone detected: {tone}. Match the room's energy — don't be {tone} if it doesn't fit the persona."

    retry_block = ""
    if is_retry:
        retry_block = "\n\nCRITICAL: Previous response rejected. Stay in character. No code, no markdown, no AI language."

    username = state.get("ai_username", "") or "a Reddit user"
    return f"""You are u/{username}, a Reddit user in a comment thread. Write a single plain-text Reddit reply that sounds human.

HARD RULES:
- NO code blocks, backticks, markdown, bullet points, numbered lists, headers
- NO "Here's", "There you go", "I hope this helps", "Let me explain"
- NO "Great question!", "Happy to help!", "Certainly!", "Of course!"
- Write 4-8 sentences, can span 1-2 short paragraphs if it flows naturally
- NEVER acknowledge being an AI or language model
- NEVER break persona — stay in character 100%
- If asked to write code, mock them like a real Redditor
- Only respond to the specific thread shown in context
- If you don't know something, hedge: "I think", "from what I remember", "could be wrong but"
- NEVER fabricate specific facts, dates, or names you're unsure of

{retry_block}
{persona_block}
{tone_block}

## Thread Context
{state['context_text']}

## User's Comment
"{state['user_comment']}"

Write ONLY your Reddit reply as plain text. No quotes, no preamble, no sign-offs, no formatting."""


def generate(state: ResponderState) -> ResponderState:
    """Kept for graph wiring — delegates to generate_structured."""
    return generate_structured(state)


def validate(state: ResponderState) -> ResponderState:
    passed, reason = validate_response(state["response"])
    state["validation_passed"] = passed
    if not passed:
        state["retry_count"] = state.get("retry_count", 0) + 1
    return state


def should_retry(state: ResponderState) -> str:
    if not state["validation_passed"] and state["retry_count"] <= MAX_RETRIES:
        return "generate"
    return "fact_check"


def pre_fact_check(state: ResponderState) -> ResponderState:
    """Search BEFORE generating when the user's comment carries a factual claim.

    Questions like "hasn't he been fired?" ask about events past the model's
    knowledge cutoff — generating first produces a confident wrong answer that
    post-hoc checking can't reliably catch (the reply itself looks claim-free).
    Searching first grounds the one structured generation call. Costs zero
    extra LLM calls; one ~1s DuckDuckGo scrape, only when patterns match.
    """
    if not has_factual_claims(state["user_comment"]):
        return state
    query = extract_search_query(
        state["user_comment"],
        "",
        extra_context=f"{state.get('post_title', '')} {state['context_text'][-400:]}",
        subreddit=state.get("subreddit", ""),
    )
    if not query:
        return state
    try:
        results = search_web(query, max_results=3)
    except Exception:
        results = []
    if results:
        bullets = "\n".join(f"- {r}" for r in results)
        state["context_text"] += (
            "\n\n--- LIVE WEB SEARCH RESULTS (today) ---\n"
            "Your training data may be outdated. If these results contradict what "
            "you believe, TRUST THE SEARCH RESULTS. If they don't settle it, hedge.\n"
            f"{bullets}"
        )
        state["fact_checked"] = True  # generation is grounded; skip post-hoc search
    return state


def fact_check(state: ResponderState) -> ResponderState:
    """Post-generation safety net for claims the AI volunteered on its own."""
    if state.get("fact_checked"):
        return state
    state["fact_checked"] = True
    if not has_factual_claims(state["response"]):
        return state
    query = extract_search_query(
        state["user_comment"],
        state["response"],
        extra_context=state.get("post_title", ""),
        subreddit=state.get("subreddit", ""),
    )
    if not query:
        return state
    try:
        results = search_web(query, max_results=3)
        if results:
            state["web_context"] = "\n".join(f"- {r}" for r in results)
    except Exception:
        pass
    return state


def should_regenerate(state: ResponderState) -> str:
    if state.get("web_context"):
        return "regenerate_with_facts"
    return "toxicity_check"


def toxicity_check(state: ResponderState) -> ResponderState:
    """Fallback toxicity check — normally resolved by generate_structured.

    Only burns an LLM call when the structured verdict is missing AND the
    cheap regex prefilter actually flags something suspicious.
    """
    if state.get("toxicity_checked"):
        return state
    state["toxicity_checked"] = True

    # Regex prefilter: if nothing matches, skip the LLM call entirely
    if not any(re.search(p, state["response"]) for p in TOXICITY_PATTERNS):
        return state

    client = get_llm()
    result = client.chat.completions.create(
        model="deepseek-chat",
        messages=[
            {"role": "system", "content": "Classify: TOXIC or SAFE. One word only."},
            {"role": "user", "content": f"Classify: \"{state['response']}\""},
        ],
        max_tokens=5,
        temperature=0,
    )
    verdict = result.choices[0].message.content.strip().upper()
    if "TOXIC" in verdict:
        state["is_toxic"] = True
    return state


def should_detoxify(state: ResponderState) -> str:
    if state.get("is_toxic"):
        state["is_toxic"] = False
        return "regenerate_civil"
    return "format_output"


def regenerate_civil(state: ResponderState) -> ResponderState:
    client = get_llm()
    prompt = _build_system_prompt(state, is_retry=True)
    prompt += "\n\nCIVILITY OVERRIDE: Remove toxic/abusive language. Stay in persona but keep it PG-13."
    response = client.chat.completions.create(
        model="deepseek-chat",
        messages=[
            {"role": "system", "content": prompt},
            {"role": "user", "content": state["user_comment"]},
        ],
        max_tokens=250,
        temperature=0.4,
    )
    state["response"] = response.choices[0].message.content.strip()
    return state


def regenerate_with_facts(state: ResponderState) -> ResponderState:
    client = get_llm()
    prompt = _build_system_prompt(state, is_retry=True)
    prompt += f"\n\nRECENT WEB SEARCH RESULTS:\n{state['web_context']}\n\nRewrite using verified facts. Correct errors. Stay in character."
    response = client.chat.completions.create(
        model="deepseek-chat",
        messages=[
            {"role": "system", "content": prompt},
            {"role": "user", "content": state["user_comment"]},
        ],
        max_tokens=250,
        temperature=0.4,
    )
    state["response"] = response.choices[0].message.content.strip()
    # Re-validate the fact-corrected reply — never rubber-stamp it. If it
    # fails (markdown, AI tells), format_output's cleanup path scrubs it.
    state["validation_passed"], _ = validate_response(state["response"])
    return state


def _predict_score_for_text(text: str, context_sample: str, tone: str, persona: str) -> int:
    """Predict upvotes for any comment text (user or AI) given context."""
    client = get_llm()
    result = client.chat.completions.create(
        model="deepseek-chat",
        messages=[
            {"role": "system", "content": (
                "You are scoring a Reddit comment. Return ONLY a number (estimated upvotes). "
                "MOST comments should be positive (1-100). Only downvote if the comment is GENUINELY toxic, "
                "spam, completely off-topic, or nonsensical. "
                "Scale: negative only for toxic/spam/off-topic. 1-3 for low-effort. 3-15 for average. "
                "15-100 for good. 100-500 for very good. 500-2000 for excellent. 2000+ for exceptional."
            )},
            {"role": "user", "content": (
                f"Thread tone: {tone}\nPersona: {persona}\n"
                f"Context: {context_sample[:300]}\nComment: \"{text[:300]}\"\n\nScore:"
            )},
        ],
        max_tokens=10,
        temperature=0,
    )
    try:
        score = int(re.search(r'-?\d+', result.choices[0].message.content).group())
        return max(-50, min(5000, score))
    except (ValueError, AttributeError):
        return 3


def predict_score(state: ResponderState) -> ResponderState:
    """Predict how many upvotes the AI response would get."""
    if state.get("score_checked"):
        return state
    state["score_checked"] = True
    tone = state.get("thread_tone", "neutral")
    persona = state.get("persona", "")[:60]
    state["score"] = _predict_score_for_text(
        state["response"], state["context_text"], tone, persona
    )
    # Also score the user's comment
    state["user_score"] = _predict_score_for_text(
        state["user_comment"], state["context_text"], tone, persona
    )
    return state


def format_output(state: ResponderState) -> ResponderState:
    resp = state["response"]
    if resp.startswith('"') and resp.endswith('"'):
        resp = resp[1:-1]
    if not state["validation_passed"]:
        resp = re.sub(r'```.*?```', '', resp, flags=re.DOTALL)
        resp = re.sub(r'`[^`]+`', '', resp)
        resp = resp.split('\n\n')[0].strip()
        if not resp or len(resp) < 5:
            resp = "lol what"
    state["response"] = resp
    return state


# === Graph ===

from langgraph.graph import StateGraph, END

_responder_graph = None


def build_graph():
    graph = StateGraph(ResponderState)
    graph.add_node("assemble_context", assemble_context)
    graph.add_node("pre_fact_check", pre_fact_check)
    graph.add_node("generate", generate)
    graph.add_node("validate", validate)
    graph.add_node("fact_check", fact_check)
    graph.add_node("regenerate_with_facts", regenerate_with_facts)
    graph.add_node("toxicity_check", toxicity_check)
    graph.add_node("regenerate_civil", regenerate_civil)
    graph.add_node("format_output", format_output)
    graph.add_node("predict_score", predict_score)

    graph.set_entry_point("assemble_context")
    graph.add_edge("assemble_context", "pre_fact_check")
    graph.add_edge("pre_fact_check", "generate")
    graph.add_edge("generate", "validate")
    graph.add_conditional_edges("validate", should_retry, {
        "generate": "generate",
        "fact_check": "fact_check",
    })
    graph.add_conditional_edges("fact_check", should_regenerate, {
        "regenerate_with_facts": "regenerate_with_facts",
        "toxicity_check": "toxicity_check",
    })
    graph.add_edge("regenerate_with_facts", "toxicity_check")
    graph.add_conditional_edges("toxicity_check", should_detoxify, {
        "regenerate_civil": "regenerate_civil",
        "format_output": "format_output",
    })
    graph.add_edge("regenerate_civil", "format_output")
    graph.add_edge("format_output", "predict_score")
    graph.add_edge("predict_score", END)

    return graph.compile()


def respond(session_id: str, user_comment: str, persona: str = "", parent_comment_id: str = None, user_comment_id: str = None) -> dict:
    global _responder_graph
    if _responder_graph is None:
        _responder_graph = build_graph()

    state: ResponderState = {
        "session_id": session_id,
        "user_comment": user_comment,
        "parent_comment_id": parent_comment_id,
        "user_comment_id": user_comment_id,
        "ai_username": "",
        "subreddit": "",
        "post_title": "",
        "persona": persona,
        "context_text": "",
        "response": "",
        "token_count": 0,
        "retry_count": 0,
        "validation_passed": False,
        "web_context": "",
        "fact_checked": False,
        "toxicity_checked": False,
        "thread_tone": "",
        "ai_history": "",
        "tone_checked": False,
        "score": 0,
        "score_checked": False,
        "user_score": 0,
        "is_toxic": False,
    }

    result = _responder_graph.invoke(state)

    ai_comment = {
        "id": f"ai-{uuid.uuid4().hex[:8]}",
        "author": result.get("ai_username") or "RedditSim",
        "body": result["response"],
        "score": result.get("score", 5),
        "depth": 0,
        "parent_id": user_comment_id or parent_comment_id or "",
        "created_utc": int(time.time()),
        "is_ai": True,
        "persona_key": _persona_key(persona),
    }
    _append_ai_comment_to_session(session_id, ai_comment)

    return {
        "response": result["response"],
        "comment_id": ai_comment["id"],
        "author": ai_comment["author"],
        "token_count": result["token_count"],
        "retries": result.get("retry_count", 0),
        "score": ai_comment["score"],
        "user_score": result.get("user_score", 3),
    }


def _append_ai_comment_to_session(session_id: str, ai_comment: dict):
    blob_path = f"sessions/{session_id}.json"
    blob_data = blob_get(blob_path, token=os.getenv("BLOB_READ_WRITE_TOKEN"))
    session = json.loads(blob_data)
    if ai_comment["parent_id"]:
        by_id = {c["id"]: c for c in session["comments"]}
        parent = by_id.get(ai_comment["parent_id"])
        ai_comment["depth"] = (parent["depth"] + 1) if parent else 1
    session["comments"].append(ai_comment)

    # Keep the persona→usernames roster up to date so future replies reuse voices
    persona_key = ai_comment.get("persona_key", "default")
    roster = session.setdefault("ai_roster", {})
    pool = roster.setdefault(persona_key, [])
    if ai_comment["author"] not in pool and len(pool) < _ROSTER_POOL_SIZE:
        pool.append(ai_comment["author"])
    blob_put(
        f"sessions/{session_id}.json",
        json.dumps(session).encode("utf-8"),
        token=os.getenv("BLOB_READ_WRITE_TOKEN"),
    )
