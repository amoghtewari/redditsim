import { Link } from 'react-router-dom';

export default function AboutPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6"
         style={{ background: 'linear-gradient(135deg, #E7EBEF 0%, #F0F2F5 50%, #F8F9FA 100%)' }}>

      <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
           style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, #1A1A1B 1px, transparent 0)', backgroundSize: '24px 24px' }} />

      <div className="relative w-full max-w-2xl">
        <div className="text-center mb-8">
          <Link to="/" className="text-on-surface-variant/40 text-body-sm hover:text-on-surface-variant transition-colors mb-4 inline-block">
            ← Back
          </Link>
          <h1 className="text-[32px] font-black tracking-tight text-on-surface">How RedditSim Works</h1>
          <p className="text-body-lg text-on-surface-variant/50 mt-2">Architecture & AI Pipeline</p>
        </div>

        <div className="space-y-4">
          <Section title="Architecture">
            <Item label="Frontend" value="React 18 + Vite + Tailwind CSS (DOMPurify-sanitized Reddit HTML)" />
            <Item label="Backend" value="Python serverless functions (Vercel) · Flask wrapper for local dev" />
            <Item label="Pipeline" value="LangGraph state machine around DeepSeek (8s timeout, zero SDK retries)" />
            <Item label="Data" value="Arctic Shift API (Reddit archive) · DuckDuckGo for live fact grounding" />
            <Item label="Storage" value="Vercel Blob (15-min TTL) · local JSON files in dev" />
            <Item label="Deploy" value="Vercel Hobby (free tier) — every request fits the 10s budget" />
          </Section>

          <Section title="Request Flow">
            <FlowStep step="1" label="Clone" desc="Paste a Reddit URL → Arctic Shift fetches the full post, comment tree, and subreddit rules; the tree is flattened and stored as a session" />
            <FlowStep step="2" label="Context" desc="Structural retrieval walks the parent chain to the root, detects subreddit culture (regex, zero tokens), resolves which AI voice is speaking, and dedupes your comment from the thread" />
            <FlowStep step="3" label="Pre-Fact-Check" desc="If your comment asks about real-world events ('hasn't he been fired?'), a live web search runs BEFORE generation and the results are injected into the prompt — the model is told to trust them over its training data" />
            <FlowStep step="4" label="Generate" desc="ONE structured DeepSeek call returns JSON: the reply, thread tone, a toxicity flag, and predicted karma for both your comment and the AI's — four signals, one round-trip" />
            <FlowStep step="5" label="Validate" desc="Regex guardrails reject code blocks, markdown, AI-assistant language, and raw JSON — up to 2 plain-text retries" />
            <FlowStep step="6" label="Fact Check" desc="Safety net for claims the AI volunteered on its own: search, regenerate with corrections, then re-validate (never rubber-stamped)" />
            <FlowStep step="7" label="Toxicity" desc="The structured flag handles the common case for free; a regex-gated LLM fallback catches the rest — toxic replies are regenerated with civility guardrails" />
            <FlowStep step="8" label="Post" desc="The reply is posted under a minted Reddit voice (e.g. salty_otter) — per-persona username pools with thread stickiness, so conversations keep a consistent voice" />
          </Section>

          <Section title="LangGraph Pipeline">
            <PipelineDiagram />
          </Section>

          <Section title="Intelligence Layer (all token-efficient)">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <IntelCard
                title="Single Structured Call"
                desc="Reply, tone, toxicity flag, and both karma predictions come back as one JSON object — what used to take 4 sequential LLM calls is now 1 on the happy path."
                cost="1 LLM call"
              />
              <IntelCard
                title="Multi-Voice Identities"
                desc="Each persona keeps a pool of up to 3 minted usernames (salty_otter, MildPickle42). Replying in a thread reuses the same voice; other AI voices read as strangers."
                cost="0 tokens"
              />
              <IntelCard
                title="Live Fact Grounding"
                desc="Factual questions trigger a pre-generation web search — lowercase Reddit-speak included ('hasn't he been fired?'). Queries are built from the subreddit, post title, and thread entities."
                cost="~1s search"
              />
              <IntelCard
                title="Structured Personas"
                desc="Each persona (troll, expert, comedian, etc.) defines voice, writing style, emotional range, and knowledge domain — not just a one-line string."
                cost="0 tokens"
              />
              <IntelCard
                title="Subreddit Culture"
                desc="Regex-based detection of slang density, all-caps ratio, and emoji usage from the first 20 comments. The AI matches the subreddit's vibe."
                cost="0 tokens"
              />
              <IntelCard
                title="Per-Voice Memory"
                desc="Each AI username remembers only its own last 5 replies — so a voice stays self-consistent without knowing what the other voices said."
                cost="0 tokens"
              />
              <IntelCard
                title="Progressive Summarization"
                desc="Threads with 8+ comments compress the oldest to one-line summaries. Recent comments stay full-text. Keeps context under ~2K tokens."
                cost="0 tokens"
              />
              <IntelCard
                title="Hallucination Hedging"
                desc="When search can't settle it, the AI hedges with 'I think' or 'could be wrong' rather than fabricating dates, names, or events."
                cost="0 tokens"
              />
            </div>
          </Section>

          <Section title="Token Efficiency">
            <p className="text-body-sm text-on-surface-variant leading-relaxed">
              Instead of dumping the full comment tree (100K+ tokens for large threads), the context assembler uses
              <strong> structural retrieval</strong>: it walks only the parent chain from the target comment to the root
              (~8 levels max) and includes direct replies. Progressive summarization compresses the oldest comments
              in deep threads while keeping recent ones full-text. Average context size: <strong>~2,000 tokens</strong> per
              response. The happy path is <strong>exactly one LLM call</strong> — tone sensing, toxicity, and karma
              prediction are folded into the structured generation call instead of separate round-trips. Extra calls
              only fire when something goes wrong: a validation retry, a fact correction, or a civility rewrite.
            </p>
          </Section>

          <Section title="Safety & Hardening">
            <p className="text-body-sm text-on-surface-variant leading-relaxed">
              All archived Reddit HTML is sanitized with <strong>DOMPurify</strong> (allowlisted tags, hardened links)
              before rendering. AI replies pass regex toxicity prefilters plus an LLM check, and regenerate with
              civility guardrails when flagged. Every AI comment is visibly badged <span className="text-reddit-orange text-[10px] font-bold bg-reddit-orange/[0.08] border border-reddit-orange/15 px-1.5 py-px rounded-full uppercase tracking-wide">AI</span> in
              the UI — simulation, not deception.
            </p>
          </Section>

          <Section title="Design System">
            <p className="text-body-sm text-on-surface-variant leading-relaxed">
              The UI follows a refined Reddit card-based layout with IBM Plex Sans typography —
              shadow-based elevation, threaded comment trees with collapsible branches, vote gutters,
              inline image rendering, and sidebar widgets.
            </p>
            <Link to="/design" className="text-body-sm text-secondary hover:underline inline-block mt-1">
              View full design system →
            </Link>
          </Section>

          <Section title="Session Model">
            <p className="text-body-sm text-on-surface-variant leading-relaxed">
              Each simulation lives for 15 minutes, anchored to a <strong>server-issued expiry timestamp</strong> —
              the countdown survives page refreshes instead of resetting. Your comments appear instantly while
              the AI responds; the full thread state (including the AI voice roster) persists in Vercel Blob
              Storage, with a localStorage cache for instant rendering. When the clock runs out, the session
              and its cache are cleared.
            </p>
          </Section>
        </div>

        <p className="text-center text-body-sm text-on-surface-variant/30 mt-10 mb-8">
          Built with React · LangGraph · DeepSeek · Arctic Shift
        </p>
      </div>
    </div>
  );
}

/* Inline SVG of the actual responder graph — kept in JSX so it can't go
   stale as an opaque image. Mirrors build_graph() in api/lib/responder.py. */
function PipelineDiagram() {
  const spine = [
    { id: 'assemble_context', sub: 'load session · pick AI voice · structural context' },
    { id: 'pre_fact_check', sub: 'user asks about real events? → live web search first' },
    { id: 'generate', sub: 'ONE structured call: reply + tone + toxicity + scores' },
    { id: 'validate', sub: 'regex guards: code · markdown · AI-tells · raw JSON' },
    { id: 'fact_check', sub: 'post-hoc net for claims the AI volunteered' },
    { id: 'toxicity_check', sub: 'structured flag · regex-gated LLM fallback' },
    { id: 'format_output', sub: 'strip quotes · scrub anything that failed' },
    { id: 'predict_score', sub: 'fallback scoring (normally free via generate)' },
  ];
  const BOX_H = 48, GAP = 26, TOP = 12;
  const boxY = (i) => TOP + i * (BOX_H + GAP);
  const H = boxY(spine.length) + 54;

  return (
    <svg viewBox={`0 0 640 ${H}`} className="w-full" role="img" aria-label="LangGraph responder pipeline diagram">
      <defs>
        <marker id="arr" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto">
          <path d="M0 0 L8 4 L0 8 z" fill="#9AA0A6" />
        </marker>
        <marker id="arrOrange" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto">
          <path d="M0 0 L8 4 L0 8 z" fill="#FF4500" />
        </marker>
        <marker id="arrBlue" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto">
          <path d="M0 0 L8 4 L0 8 z" fill="#0079D3" />
        </marker>
      </defs>

      {/* Spine boxes + connectors */}
      {spine.map((n, i) => (
        <g key={n.id}>
          <rect x="44" y={boxY(i)} width="280" height={BOX_H} rx="8" fill="#FFFFFF" stroke="#E2E5E9" />
          <text x="184" y={boxY(i) + 20} textAnchor="middle" fontFamily="ui-monospace, monospace" fontSize="12.5" fontWeight="600" fill="#1b1b1c">{n.id}</text>
          <text x="184" y={boxY(i) + 36} textAnchor="middle" fontFamily="IBM Plex Sans, sans-serif" fontSize="9.5" fill="#8A8F94">{n.sub}</text>
          {i < spine.length - 1 && (
            <line x1="184" y1={boxY(i) + BOX_H} x2="184" y2={boxY(i + 1) - 3} stroke="#9AA0A6" strokeWidth="1.4" markerEnd="url(#arr)" />
          )}
        </g>
      ))}

      {/* Retry loop: validate -> generate (fail ≤2) */}
      <path
        d={`M 44 ${boxY(3) + BOX_H / 2} H 22 V ${boxY(2) + BOX_H / 2} H 41`}
        fill="none" stroke="#FF4500" strokeWidth="1.4" strokeDasharray="4 3" markerEnd="url(#arrOrange)"
      />
      <text x="18" y={boxY(2) + BOX_H + 10} fontFamily="IBM Plex Sans, sans-serif" fontSize="9" fill="#FF4500" transform={`rotate(-90 18 ${boxY(2) + BOX_H + 10})`}>
        fail → retry (≤2)
      </text>

      {/* Side branch: fact_check -> regenerate_with_facts -> toxicity_check */}
      <rect x="420" y={boxY(4) + 10} width="196" height="42" rx="8" fill="#F0F7FF" stroke="#0079D3" strokeOpacity="0.35" />
      <text x="518" y={boxY(4) + 27} textAnchor="middle" fontFamily="ui-monospace, monospace" fontSize="11" fontWeight="600" fill="#0060a9">regenerate_with_facts</text>
      <text x="518" y={boxY(4) + 42} textAnchor="middle" fontFamily="IBM Plex Sans, sans-serif" fontSize="9" fill="#5d8ab8">rewrite with search results · re-validate</text>
      <path d={`M 324 ${boxY(4) + BOX_H / 2 - 6} H 417`} fill="none" stroke="#0079D3" strokeWidth="1.3" strokeDasharray="4 3" markerEnd="url(#arrBlue)" />
      <text x="342" y={boxY(4) + BOX_H / 2 - 11} fontFamily="IBM Plex Sans, sans-serif" fontSize="9" fill="#0079D3">claims found</text>
      <path d={`M 518 ${boxY(4) + 52} V ${boxY(5) + BOX_H / 2} H 327`} fill="none" stroke="#0079D3" strokeWidth="1.3" strokeDasharray="4 3" markerEnd="url(#arrBlue)" />

      {/* Side branch: toxicity_check -> regenerate_civil -> format_output */}
      <rect x="420" y={boxY(5) + 30} width="196" height="42" rx="8" fill="#FFF3EE" stroke="#FF4500" strokeOpacity="0.35" />
      <text x="518" y={boxY(5) + 47} textAnchor="middle" fontFamily="ui-monospace, monospace" fontSize="11" fontWeight="600" fill="#ad2c00">regenerate_civil</text>
      <text x="518" y={boxY(5) + 62} textAnchor="middle" fontFamily="IBM Plex Sans, sans-serif" fontSize="9" fill="#c27a5f">stay in persona · keep it PG-13</text>
      <path d={`M 324 ${boxY(5) + BOX_H / 2 + 6} H 417 V ${boxY(5) + 40}`} fill="none" stroke="#FF4500" strokeWidth="1.3" strokeDasharray="4 3" markerEnd="url(#arrOrange)" />
      <text x="342" y={boxY(5) + BOX_H / 2 + 20} fontFamily="IBM Plex Sans, sans-serif" fontSize="9" fill="#FF4500">flagged toxic</text>
      <path d={`M 518 ${boxY(5) + 72} V ${boxY(6) + BOX_H / 2} H 327`} fill="none" stroke="#FF4500" strokeWidth="1.3" strokeDasharray="4 3" markerEnd="url(#arrOrange)" />

      {/* Terminal pill */}
      <rect x="84" y={boxY(spine.length) - 4} width="200" height="36" rx="18" fill="#1b1b1c" />
      <text x="184" y={boxY(spine.length) + 18} textAnchor="middle" fontFamily="IBM Plex Sans, sans-serif" fontSize="11" fontWeight="600" fill="#FFFFFF">
        reply posted as u/salty_otter
      </text>
      <line x1="184" y1={boxY(spine.length - 1) + BOX_H} x2="184" y2={boxY(spine.length) - 7} stroke="#9AA0A6" strokeWidth="1.4" markerEnd="url(#arr)" />
    </svg>
  );
}

function Section({ title, children }) {
  return (
    <div className="bg-white rounded-2xl border border-black/[0.05] shadow-card overflow-hidden">
      <div className="px-5 py-3 border-b border-black/[0.05] bg-[#F8F9FA]">
        <h2 className="text-label-bold text-on-surface">{title}</h2>
      </div>
      <div className="p-5 space-y-3">
        {children}
      </div>
    </div>
  );
}

function Item({ label, value }) {
  return (
    <div className="flex items-baseline gap-3">
      <span className="text-body-sm font-medium text-on-surface min-w-[80px] flex-shrink-0">{label}</span>
      <span className="text-body-sm text-on-surface-variant">{value}</span>
    </div>
  );
}

function FlowStep({ step, label, desc }) {
  return (
    <div className="flex gap-3">
      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-reddit-orange/10 text-reddit-orange text-label-bold flex items-center justify-center mt-0.5">
        {step}
      </div>
      <div>
        <span className="text-body-sm font-medium text-on-surface">{label}</span>
        <p className="text-body-sm text-on-surface-variant/70">{desc}</p>
      </div>
    </div>
  );
}

function IntelCard({ title, desc, cost }) {
  return (
    <div className="bg-[#F8F9FA] rounded-xl p-3 border border-black/[0.05]">
      <div className="flex items-center justify-between mb-1 gap-2">
        <span className="text-body-sm font-medium text-on-surface">{title}</span>
        <span className="text-[10px] text-on-surface-variant/40 font-mono flex-shrink-0">{cost}</span>
      </div>
      <p className="text-body-sm text-on-surface-variant/60 leading-snug">{desc}</p>
    </div>
  );
}
