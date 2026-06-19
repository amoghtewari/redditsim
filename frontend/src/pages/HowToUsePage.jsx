import { Link } from 'react-router-dom';

const steps = [
  {
    n: '01',
    title: 'Find a Reddit thread',
    body: 'Browse Reddit and copy the URL of any post you find interesting — hot debates, wild stories, spicy opinions. The more comments the original has, the richer the simulation.',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
      </svg>
    ),
  },
  {
    n: '02',
    title: 'Paste the URL',
    body: 'Drop it into the input on the home page. RedditSim fetches the original post and its top comments via Arctic Shift — a free Reddit archive — and builds a local clone of the thread.',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
      </svg>
    ),
  },
  {
    n: '03',
    title: 'Pick a persona',
    body: 'Choose the type of Redditor you want to interact with — a chill casual, a sharp analyst, a contrarian, or a chaotic troll. Each persona shapes the voice, vocabulary, and emotional range of every AI reply.',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
      </svg>
    ),
  },
  {
    n: '04',
    title: 'Jump into the thread',
    body: 'Hit Reply on any comment — the original post\'s top-level comments, or even deep nested replies. Type your take, click Post, and watch an AI Redditor fire back in character.',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="m3 21 1.9-5.7a8.5 8.5 0 1 1 3.8 3.8z"/>
      </svg>
    ),
  },
  {
    n: '05',
    title: 'Keep the conversation going',
    body: 'You can reply to AI comments too. The bot remembers its own previous messages in the thread and maintains a consistent identity — same username, same voice — throughout the session.',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 2H7a2 2 0 0 0-2 2v16l4-2 3 2 3-2 4 2V4a2 2 0 0 0-2-2z"/>
      </svg>
    ),
  },
  {
    n: '06',
    title: 'Watch the scores',
    body: 'Every reply — yours and the AI\'s — gets a predicted upvote score. The AI judges how well each comment lands given the thread\'s culture and tone. Think of it as a vibe-check from the crowd.',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14z"/><path d="M7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/>
      </svg>
    ),
  },
];

const tips = [
  { emoji: '🔥', text: 'Controversial threads make the best simulations — the AI leans into the drama.' },
  { emoji: '🧵', text: 'Threads with 50+ comments give the AI more personality to mimic.' },
  { emoji: '🎭', text: 'Try the same comment with different personas to see how the tone shifts.' },
  { emoji: '⏱️', text: 'Sessions last 15 minutes — enough for a full back-and-forth conversation.' },
  { emoji: '🤫', text: 'The AI fact-checks claims before replying — try dropping a false "fact" and see what happens.' },
];

export default function HowToUsePage() {
  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(135deg, #E7EBEF 0%, #F0F2F5 50%, #F8F9FA 100%)' }}>
      {/* Nav */}
      <div className="border-b border-black/[0.06] bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-6 py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-on-surface hover:text-reddit-orange transition-colors">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M10 12L6 8l4-4"/>
            </svg>
            <span className="text-label-bold">Back to home</span>
          </Link>
          <Link to="/" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-reddit-orange flex items-center justify-center">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
                <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                <path d="M2 17l10 5 10-5"/>
                <path d="M2 12l10 5 10-5"/>
              </svg>
            </div>
            <span className="text-label-bold text-on-surface">RedditSim</span>
          </Link>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="mb-12 text-center">
          <h1 className="text-[32px] font-black tracking-tight text-on-surface mb-3">How to use RedditSim</h1>
          <p className="text-body-lg text-on-surface-variant/70 max-w-xl mx-auto">
            Clone any Reddit thread and argue with AI bots that actually sound like Redditors.
          </p>
        </div>

        {/* Steps */}
        <div className="space-y-4 mb-14">
          {steps.map((s, i) => (
            <div key={i} className="bg-white rounded-2xl border border-black/[0.05] shadow-sm p-6 flex gap-5">
              <div className="flex-shrink-0 flex flex-col items-center gap-2">
                <div className="w-11 h-11 rounded-xl bg-reddit-orange/10 text-reddit-orange flex items-center justify-center">
                  {s.icon}
                </div>
                {i < steps.length - 1 && (
                  <div className="w-px flex-1 min-h-[24px] bg-[#EDEFF1]" />
                )}
              </div>
              <div className="pt-1 pb-2">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-[11px] font-bold tracking-widest text-on-surface-variant/40">{s.n}</span>
                  <h2 className="text-body-lg font-bold text-on-surface">{s.title}</h2>
                </div>
                <p className="text-body-sm text-on-surface-variant/70 leading-relaxed">{s.body}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Tips */}
        <div className="bg-white rounded-2xl border border-black/[0.05] shadow-sm p-6 mb-10">
          <h2 className="text-label-bold text-on-surface mb-4">Pro tips</h2>
          <ul className="space-y-3">
            {tips.map((t, i) => (
              <li key={i} className="flex items-start gap-3 text-body-sm text-on-surface-variant/80">
                <span className="text-base leading-none mt-0.5">{t.emoji}</span>
                <span>{t.text}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* CTA */}
        <div className="text-center">
          <Link
            to="/"
            className="inline-flex items-center gap-2 bg-reddit-orange text-white text-label-bold px-8 py-3.5 rounded-xl hover:bg-reddit-orange/90 transition-colors shadow-lg shadow-reddit-orange/20"
          >
            Try it now
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M6 4l4 4-4 4"/>
            </svg>
          </Link>
        </div>
      </div>
    </div>
  );
}
