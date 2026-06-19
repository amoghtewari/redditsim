import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import PersonaSelector from '../components/PersonaSelector';
import { clonePost } from '../api';

const FEATURED = [
  {
    url: 'https://www.reddit.com/r/AskReddit/comments/1lgbhky/',
    sub: 'r/AskReddit',
    title: 'What would you do if a new asteroid was just discovered?',
    teaser: 'Space anxiety meets Reddit speculation. Preppers, optimists, and doomers collide in one thread.',
    tag: '🌌 Space',
  },
  {
    url: 'https://www.reddit.com/r/AmItheAsshole/comments/1l4s7rc/',
    sub: 'r/AmItheAsshole',
    title: 'AITA for refusing to give my sister my wedding date?',
    teaser: 'She wants the same venue. The jury is in session. Verdict may surprise you.',
    tag: '⚖️ AITA',
  },
  {
    url: 'https://www.reddit.com/r/unpopularopinion/comments/1l9tnln/',
    sub: 'r/unpopularopinion',
    title: 'Breakfast is overrated and nobody actually enjoys it',
    teaser: 'A hill someone is prepared to die on. Morning people are outraged.',
    tag: '🍳 Food takes',
  },
  {
    url: 'https://www.reddit.com/r/technology/comments/1lgq61p/',
    sub: 'r/technology',
    title: 'Google quietly removes "Don\'t be evil" from its code of conduct',
    teaser: 'The internet\'s favourite corporate callback. Comments range from outraged to "lol always knew it."',
    tag: '🤖 Tech',
  },
  {
    url: 'https://www.reddit.com/r/tifu/comments/1lgbv1b/',
    sub: 'r/tifu',
    title: 'TIFU by accidentally sending my boss a voice note meant for my therapist',
    teaser: 'One wrong tap. Unfiltered feelings. A Monday that will live in infamy.',
    tag: '😬 TIFU',
  },
  {
    url: 'https://www.reddit.com/r/relationship_advice/comments/1l9d4o5/',
    sub: 'r/relationship_advice',
    title: 'My partner of 3 years just admitted they\'ve been faking their accent this whole time',
    teaser: 'A slow reveal with chaotic energy. The comment section demands answers.',
    tag: '💔 Relationships',
  },
];

function ThreadCard({ thread, onSelect, hovered, onHover }) {
  return (
    <button
      type="button"
      onClick={() => onSelect(thread.url)}
      onMouseEnter={() => onHover(thread.url)}
      onMouseLeave={() => onHover(null)}
      className="relative text-left w-full bg-white border border-[#EDEFF1] rounded-xl p-3.5 hover:border-reddit-orange/40 hover:shadow-md hover:shadow-reddit-orange/[0.06] transition-all duration-150 group"
    >
      <div className="flex items-start gap-2.5">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-1">
            <span className="text-[10px] font-bold text-reddit-orange/80 tracking-wide">{thread.sub}</span>
          </div>
          <p className="text-[12px] font-semibold text-on-surface leading-snug line-clamp-2 group-hover:text-reddit-orange transition-colors">
            {thread.title}
          </p>
        </div>
        <span className="text-[10px] bg-[#F8F9FA] text-on-surface-variant/60 px-1.5 py-0.5 rounded-md whitespace-nowrap flex-shrink-0 border border-[#EDEFF1]">
          {thread.tag}
        </span>
      </div>

      {/* Hover tooltip */}
      {hovered === thread.url && (
        <div className="absolute left-0 right-0 bottom-[calc(100%+6px)] z-20 bg-on-surface text-white text-[11px] leading-relaxed rounded-xl px-3.5 py-2.5 shadow-xl pointer-events-none">
          <p className="font-medium mb-0.5 opacity-50 text-[10px] tracking-wide">{thread.sub}</p>
          <p>{thread.teaser}</p>
          <div className="absolute left-4 bottom-[-5px] w-2.5 h-2.5 bg-on-surface rotate-45 rounded-sm" />
        </div>
      )}
    </button>
  );
}

export default function HomePage() {
  const navigate = useNavigate();
  const [url, setUrl] = useState(FEATURED[0].url);
  const [persona, setPersona] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState('url');
  const [hovered, setHovered] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!url.trim() || loading) return;
    if (step === 'url') { setStep('persona'); return; }
    setLoading(true);
    setError('');
    try {
      const result = await clonePost(url);
      navigate(`/clone/${result.session_id}`, { state: { ...result, persona } });
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  const handleSelectThread = (threadUrl) => {
    setUrl(threadUrl);
    setError('');
    setStep('persona');
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6"
         style={{ background: 'linear-gradient(135deg, #E7EBEF 0%, #F0F2F5 50%, #F8F9FA 100%)' }}>

      <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
           style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, #1A1A1B 1px, transparent 0)', backgroundSize: '24px 24px' }} />

      <div className="relative w-full max-w-xl">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2.5 mb-2">
            <div className="w-10 h-10 rounded-xl bg-reddit-orange flex items-center justify-center shadow-lg shadow-reddit-orange/20">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
                <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                <path d="M2 17l10 5 10-5"/>
                <path d="M2 12l10 5 10-5"/>
              </svg>
            </div>
            <span className="text-[26px] font-black tracking-tight text-on-surface">RedditSim</span>
          </div>
          <p className="text-body-sm text-on-surface-variant/60">
            Simulate Reddit threads with AI-powered responses
          </p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl border border-black/[0.05] shadow-xl shadow-black/[0.05] overflow-hidden animate-fade-up">
          {/* Steps tab */}
          <div className="flex border-b border-[#EDEFF1]">
            <button onClick={() => setStep('url')}
              className={`flex-1 py-3 text-center text-label-bold transition-colors ${step === 'url' ? 'text-on-surface border-b-2 border-reddit-orange -mb-[1px]' : 'text-on-surface-variant/40 hover:text-on-surface-variant/60'}`}>
              1. Paste URL
            </button>
            <button onClick={() => url.trim() && setStep('persona')}
              className={`flex-1 py-3 text-center text-label-bold transition-colors ${step === 'persona' ? 'text-on-surface border-b-2 border-reddit-orange -mb-[1px]' : 'text-on-surface-variant/40'}`}>
              2. Configure
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6">
            {step === 'url' ? (
              <div className="space-y-5">
                <div>
                  <label className="text-body-sm font-medium text-on-surface-variant block mb-2">
                    Reddit Post URL
                  </label>
                  <input
                    type="url"
                    value={url}
                    onChange={(e) => { setUrl(e.target.value); setError(''); }}
                    onKeyDown={(e) => e.key === 'Enter' && url.trim() && setStep('persona')}
                    placeholder="https://www.reddit.com/r/.../comments/..."
                    className="w-full bg-[#F8F9FA] border border-[#EDEFF1] rounded-xl px-4 py-3 text-body-lg text-on-surface placeholder:text-on-surface-variant/30 focus:bg-white focus:border-reddit-orange/30 focus:ring-4 focus:ring-reddit-orange/[0.06] transition-all outline-none"
                    autoFocus
                    required
                  />
                </div>

                {/* Featured threads */}
                <div>
                  <p className="text-[11px] font-bold tracking-widest text-on-surface-variant/40 uppercase mb-2.5">
                    Or try one of these
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {FEATURED.map((t) => (
                      <ThreadCard
                        key={t.url}
                        thread={t}
                        onSelect={handleSelectThread}
                        hovered={hovered}
                        onHover={setHovered}
                      />
                    ))}
                  </div>
                </div>

                {error && (
                  <div className="bg-red-50 text-red-700 text-body-sm p-3 rounded-xl border border-red-100">{error}</div>
                )}

                <button type="submit" disabled={!url.trim()}
                  className="w-full bg-on-surface text-white text-label-bold py-3 rounded-xl hover:bg-on-surface/90 disabled:opacity-30 transition-all duration-200 flex items-center justify-center gap-2">
                  Continue
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <path d="M6 4l4 4-4 4"/>
                  </svg>
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-[#F8F9FA] rounded-xl px-3 py-2 text-body-sm text-on-surface-variant truncate border border-[#EDEFF1]">
                  {url}
                </div>
                <PersonaSelector onChange={setPersona} />
                {error && (
                  <div className="bg-red-50 text-red-700 text-body-sm p-3 rounded-xl border border-red-100">{error}</div>
                )}
                <div className="flex gap-3">
                  <button type="button" onClick={() => setStep('url')}
                    className="flex-1 bg-[#F8F9FA] text-on-surface-variant text-label-bold py-3 rounded-xl hover:bg-[#EDEFF1] transition-colors">
                    Back
                  </button>
                  <button type="submit" disabled={loading}
                    className="flex-[2] bg-reddit-orange text-white text-label-bold py-3 rounded-xl hover:bg-reddit-orange/90 disabled:opacity-50 transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-reddit-orange/20">
                    {loading ? (
                      <>
                        <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="32" strokeDashoffset="8" opacity="0.3"/>
                          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="32" strokeDashoffset="8" className="opacity-70"/>
                        </svg>
                        Building...
                      </>
                    ) : 'Build Simulation'}
                  </button>
                </div>
              </div>
            )}
          </form>
        </div>

        {/* Footer */}
        <p className="text-center text-body-sm text-on-surface-variant/30 mt-6">
          Powered by Arctic Shift · DeepSeek v4 · LangGraph
          <br />
          <Link to="/how-to-use" className="hover:text-on-surface-variant/60 transition-colors">
            How to use
          </Link>
          {' · '}
          <Link to="/about" className="hover:text-on-surface-variant/60 transition-colors">
            How it works
          </Link>
          {' · '}
          <a href="https://github.com/amoghtewari/redditsim" target="_blank" rel="noopener noreferrer"
             className="hover:text-on-surface-variant/60 transition-colors inline-flex items-center gap-1">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" className="opacity-70">
              <path d="M12 2C6.477 2 2 6.477 2 12c0 4.418 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.342-3.369-1.342-.454-1.155-1.11-1.463-1.11-1.463-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0 1 12 6.836a9.59 9.59 0 0 1 2.504.337c1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.202 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.742 0 .267.18.578.688.48C19.138 20.163 22 16.418 22 12c0-5.523-4.477-10-10-10z"/>
            </svg>
            GitHub
          </a>
          {' · '}
          <a href="https://www.linkedin.com/in/amogh-tewari-571113108/" target="_blank" rel="noopener noreferrer"
             className="text-reddit-orange/50 hover:text-reddit-orange transition-colors">
            Amogh Tewari
          </a>
        </p>
      </div>
    </div>
  );
}
