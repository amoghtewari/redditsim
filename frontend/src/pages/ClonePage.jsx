import { useState, useEffect, useCallback } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import TopNavBar from '../components/TopNavBar';
import PostCard from '../components/PostCard';
import CommentTree from '../components/CommentTree';
import CommentInput from '../components/CommentInput';
import { respondToComment, getSession } from '../api';

const STORAGE_KEY_PREFIX = 'redditsim_';

function getSecondsRemaining(expiresAt) {
  if (!expiresAt) return 15 * 60;
  return Math.max(0, expiresAt - Math.floor(Date.now() / 1000));
}

export default function ClonePage() {
  const { sessionId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const [post, setPost] = useState(null);
  const [rules, setRules] = useState([]);
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [replyTarget, setReplyTarget] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [error, setError] = useState(null);
  const [sortBy, setSortBy] = useState('best');
  const [persona, setPersona] = useState('');
  const [expiresAt, setExpiresAt] = useState(null);
  const [countdown, setCountdown] = useState(15 * 60);
  const [restored, setRestored] = useState(false);

  // On mount: show localStorage instantly, then sync with backend
  useEffect(() => {
    const storageKey = STORAGE_KEY_PREFIX + sessionId;

    // 1. Show cached data immediately for instant render
    const cached = localStorage.getItem(storageKey);
    if (cached) {
      try {
        const data = JSON.parse(cached);
        setPost(data.post);
        setComments(data.comments);
        setRules(data.rules || []);
        setPersona(data.persona || '');
        if (data.expires_at) {
          setExpiresAt(data.expires_at);
          setCountdown(getSecondsRemaining(data.expires_at));
        }
        setRestored(true);
      } catch (e) { /* stale cache */ }
    }

    // 2. Try location.state (from navigation — fresh clone, has expires_at)
    const state = location.state || {};
    if (state.post && state.comments && !cached) {
      setPost(state.post);
      setComments(state.comments);
      setRules(state.rules || []);
      setPersona(state.persona || '');
      if (state.expires_at) {
        setExpiresAt(state.expires_at);
        setCountdown(getSecondsRemaining(state.expires_at));
      }
    }

    // 3. ALWAYS sync with backend to get latest state
    getSession(sessionId)
      .then((data) => {
        setPost(data.post);
        setComments(data.comments);
        setRules(data.rules || []);
        if (data.expires_at) {
          setExpiresAt(data.expires_at);
          setCountdown(getSecondsRemaining(data.expires_at));
        }
        setRestored(true);
      })
      .catch(() => {
        if (!cached && !(location.state || {}).post) {
          navigate('/', { replace: true });
        }
      });
  }, [sessionId]);

  // Persist to localStorage (including expires_at so refresh restores the real countdown)
  useEffect(() => {
    if (restored && post && comments.length > 0) {
      const storageKey = STORAGE_KEY_PREFIX + sessionId;
      localStorage.setItem(storageKey, JSON.stringify({ post, comments, rules, persona, expires_at: expiresAt }));
    }
  }, [comments, post, rules, persona, expiresAt, sessionId, restored]);

  // Countdown — ticks every second, derived from server-issued expires_at.
  // If expires_at is missing (legacy cache or direct navigation), treat as 15 min from now.
  useEffect(() => {
    if (!restored) return;
    const effectiveExpiry = expiresAt || (Math.floor(Date.now() / 1000) + 15 * 60);
    const timer = setInterval(() => {
      const remaining = getSecondsRemaining(effectiveExpiry);
      setCountdown(remaining);
      if (remaining <= 0) {
        clearInterval(timer);
        localStorage.removeItem(STORAGE_KEY_PREFIX + sessionId);
        navigate('/', { replace: true });
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [restored, expiresAt, sessionId, navigate]);

  const handleReplyClick = useCallback((commentId, author) => {
    setReplyTarget(commentId ? { id: commentId, author } : null);
    setReplyText('');
  }, []);

  const handleReplySubmit = useCallback(async () => {
    if (!replyText.trim() || loading || !replyTarget) return;

    const userCommentText = replyText;
    const targetId = replyTarget.id;

    // Show user's comment IMMEDIATELY in the tree
    const userComment = {
      id: `user-${Date.now()}`,
      author: 'You',
      body: userCommentText,
      score: 1,
      created_utc: Math.floor(Date.now() / 1000),
      is_user: true,
      parent_id: targetId,
      depth: 0,
      replies: [],
    };
    setComments((prev) => [...prev, userComment]);
    setReplyTarget(null);
    setReplyText('');
    setLoading(true);

    try {
      const result = await respondToComment(sessionId, userCommentText, persona, targetId, userComment.id);

      // Update user comment's score from backend prediction
      setComments((prev) => prev.map(c => 
        c.id === userComment.id ? { ...c, score: result.user_score ?? 3 } : c
      ));

      const aiComment = {
        id: result.comment_id || `ai-${Date.now()}`,
        author: result.author || 'RedditSim',
        body: result.response,
        score: result.score || 5,
        created_utc: Math.floor(Date.now() / 1000),
        is_ai: true,
        parent_id: userComment.id, // nests under user's comment, not the original target
        depth: 0,
        replies: [],
      };

      setComments((prev) => [...prev, aiComment]);
    } catch (err) {
      setError('Backend unreachable. Try again?');
    } finally {
      setLoading(false);
    }
  }, [replyText, loading, replyTarget, sessionId, persona]);

  // Top-level comment
  const handleTopLevelComment = useCallback(async (text) => {
    // Show user's comment immediately
    const userComment = {
      id: `user-${Date.now()}`,
      author: 'You',
      body: text,
      score: 1,
      created_utc: Math.floor(Date.now() / 1000),
      is_user: true,
      parent_id: post ? `t3_${post.id}` : '',
      depth: 0,
      replies: [],
    };
    setComments((prev) => [...prev, userComment]);
    setLoading(true);

    try {
      const result = await respondToComment(sessionId, text, persona, null, userComment.id);

      // Update user comment's score
      setComments((prev) => prev.map(c => 
        c.id === userComment.id ? { ...c, score: result.user_score ?? 3 } : c
      ));

      const aiComment = {
        id: result.comment_id || `ai-${Date.now()}`,
        author: result.author || 'RedditSim',
        body: result.response,
        score: result.score || 5,
        created_utc: Math.floor(Date.now() / 1000),
        is_ai: true,
        parent_id: userComment.id,
        depth: 0,
        replies: [],
      };

      setComments((prev) => [...prev, aiComment]);
    } catch (err) {
      setError('Backend unreachable. Try again?');
    } finally {
      setLoading(false);
    }
  }, [sessionId, persona, post]);

  if (!restored) {
    return (
      <div className="min-h-screen bg-reddit-bg flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-on-surface-variant/70">
          <svg className="animate-spin w-6 h-6 text-reddit-orange" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="40" strokeDashoffset="12" opacity="0.8"/>
          </svg>
          <div className="text-body-lg">Loading simulation…</div>
        </div>
      </div>
    );
  }

  if (!post) {
    navigate('/', { replace: true });
    return null;
  }

  return (
    <div className="min-h-screen bg-reddit-bg">
      <TopNavBar countdown={countdown} />
      <div className="max-w-container-max-width mx-auto px-0 sm:px-gutter flex flex-col lg:flex-row gap-gutter py-5">
        <main className="w-full lg:w-main-content-width flex-shrink-0 flex flex-col gap-stack-gap">
          <PostCard post={post} />
          {error && (
            <div className="bg-error-container/60 text-on-error-container text-body-sm px-4 py-3 rounded-lg border border-error/20 flex items-center justify-between shadow-card animate-fade-up">
              <span className="flex items-center gap-2">
                <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                  <circle cx="8" cy="8" r="6.25"/>
                  <path d="M8 5v3.5"/>
                  <circle cx="8" cy="11" r="0.5" fill="currentColor"/>
                </svg>
                {error}
              </span>
              <button onClick={() => setError(null)} className="text-on-error-container font-label-bold hover:underline">Dismiss</button>
            </div>
          )}
          <CommentInput onSubmit={handleTopLevelComment} loading={loading} persona={persona} />
          {/* Sort controls */}
          <div className="flex items-center gap-1 text-meta-text">
            <span className="text-on-surface-variant/40 mr-1">Sort by:</span>
            {['best', 'top', 'new'].map(mode => (
              <button
                key={mode}
                onClick={() => setSortBy(mode)}
                className={`px-3 py-1 rounded-full text-label-bold transition-all ${
                  sortBy === mode
                    ? 'bg-reddit-blue text-white shadow-sm'
                    : 'text-on-surface-variant/50 hover:bg-black/[0.04] hover:text-on-surface-variant'
                }`}
              >
                {mode.charAt(0).toUpperCase() + mode.slice(1)}
              </button>
            ))}
          </div>
          <CommentTree
            comments={comments}
            onReply={handleReplyClick}
            replyTarget={replyTarget?.id}
            replyText={replyText}
            onReplyTextChange={setReplyText}
            onReplySubmit={handleReplySubmit}
            replyLoading={loading}
            sortBy={sortBy}
          />
        </main>
        <aside className="hidden lg:block w-sidebar-width flex-shrink-0 flex flex-col gap-stack-gap">
          <div className="bg-white rounded-lg border border-black/[0.05] shadow-card overflow-hidden">
            <div className="px-4 pt-4 pb-3 border-b border-black/[0.05]">
              <h3 className="text-label-bold font-label-bold uppercase tracking-wider text-on-surface-variant/60">About Community</h3>
              <p className="text-headline-md font-semibold text-on-surface mt-1">r/{post?.subreddit || 'all'}</p>
            </div>
            <div className="p-4 flex flex-col gap-3">
              <p className="text-body-sm text-on-surface-variant/80 leading-relaxed">
                Cloned from Reddit for simulation. Reply anywhere and the AI responds in character.
              </p>
              <div className="flex justify-between py-3 border-y border-black/[0.05]">
                <div className="flex flex-col">
                  <span className="text-headline-md font-semibold text-on-surface tabular-nums">{comments.length}</span>
                  <span className="text-meta-text text-on-surface-variant/60">Comments</span>
                </div>
                <div className="flex flex-col">
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
                    <span className="text-headline-md font-semibold text-on-surface tabular-nums">1</span>
                  </div>
                  <span className="text-meta-text text-on-surface-variant/60">Simulating</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-headline-md font-semibold text-reddit-orange tabular-nums">
                    {Math.floor(countdown / 60)}:{String(countdown % 60).padStart(2, '0')}
                  </span>
                  <span className="text-meta-text text-on-surface-variant/60">Remaining</span>
                </div>
              </div>
              <div className="text-meta-text text-on-surface-variant/70 bg-black/[0.02] border border-black/[0.05] rounded-lg px-3 py-2">
                <span className="font-bold text-on-surface/70">Persona</span>
                <p className="mt-0.5 leading-relaxed">{persona || 'Default Redditor'}</p>
              </div>
            </div>
          </div>
          {rules.length > 0 && (
            <div className="bg-white rounded-lg border border-black/[0.05] shadow-card overflow-hidden">
              <div className="px-4 pt-4 pb-3 border-b border-black/[0.05]">
                <h3 className="text-label-bold font-label-bold uppercase tracking-wider text-on-surface-variant/60">r/{post?.subreddit} Rules</h3>
              </div>
              <div className="flex flex-col text-body-sm text-on-surface">
                {rules.map((r, i) => (
                  <div key={i} className="px-4 py-3 border-b border-black/[0.04] flex items-start gap-2.5 hover:bg-black/[0.015] transition-colors cursor-default last:border-b-0">
                    <span className="text-on-surface-variant/40 font-bold tabular-nums flex-shrink-0">{i + 1}</span>
                    <span className="text-on-surface/85 leading-relaxed">{r}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
