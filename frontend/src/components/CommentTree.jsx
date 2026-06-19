import { useState, useCallback } from 'react';
import DOMPurify from 'dompurify';

const ALLOWED_TAGS = ['p', 'a', 'em', 'strong', 'code', 'pre', 'blockquote', 'ul', 'ol', 'li', 'br', 'del', 'sup', 'table', 'thead', 'tbody', 'tr', 'td', 'th'];
const ALLOWED_ATTR = ['href'];

// Harden outbound links added by DOMPurify hook
DOMPurify.addHook('afterSanitizeAttributes', (node) => {
  if (node.tagName === 'A') {
    node.setAttribute('target', '_blank');
    node.setAttribute('rel', 'noopener noreferrer');
  }
});

function sanitizeHtml(html) {
  return DOMPurify.sanitize(html, { ALLOWED_TAGS, ALLOWED_ATTR });
}

function isImageUrl(url) {
  return /\.(jpg|jpeg|png|gif|webp|bmp)(\?|$)/i.test(url)
    || url.includes('preview.redd.it')
    || url.includes('i.redd.it')
    || url.includes('i.imgur.com');
}

function extractImages(text) {
  if (!text) return { cleanText: text, images: [] };
  const urlPattern = /(https?:\/\/[^\s]+)/g;
  const images = [];
  const matches = text.match(urlPattern) || [];
  for (const url of matches) {
    if (isImageUrl(url)) images.push(url);
  }
  const cleanText = images.reduce((t, url) => t.replace(url, '').replace(/\s+/g, ' ').trim(), text);
  return { cleanText, images };
}

function AuthorBadge({ comment }) {
  if (comment.is_ai) {
    return (
      <span className="inline-flex items-center gap-1 text-reddit-orange text-[10px] font-bold bg-reddit-orange/[0.08] border border-reddit-orange/15 px-1.5 py-px rounded-full uppercase tracking-wide">
        <span className="w-1 h-1 rounded-full bg-reddit-orange" />
        AI
      </span>
    );
  }
  if (comment.is_user) {
    return (
      <span className="inline-flex items-center gap-1 text-reddit-blue text-[10px] font-bold bg-reddit-blue/[0.08] border border-reddit-blue/15 px-1.5 py-px rounded-full uppercase tracking-wide">
        You
      </span>
    );
  }
  return null;
}

function CommentNode({ comment, depth = 0, onReply, replyTarget, replyText, onReplyTextChange, onReplySubmit, replyLoading, collapsed, onToggleCollapse }) {
  const maxDepth = 12;
  const currentDepth = Math.min(depth, maxDepth);
  const isReplying = replyTarget === comment.id;
  const isCollapsed = collapsed.has(comment.id);
  const hasReplies = comment.replies && comment.replies.length > 0;

  const timeAgo = (utc) => {
    if (!utc) return '';
    const d = Math.floor(Date.now() / 1000 - utc);
    if (d < 3600) return `${Math.floor(d / 60)}m`;
    if (d < 86400) return `${Math.floor(d / 3600)}h`;
    return `${Math.floor(d / 86400)}d`;
  };

  const authorColor = comment.is_ai
    ? 'text-reddit-orange'
    : comment.is_user
      ? 'text-reddit-blue'
      : 'text-on-surface';

  return (
    <div className="relative">
      {/* Clickable vertical thread line — every comment has one */}
      <button
        onClick={(e) => { e.stopPropagation(); onToggleCollapse(comment.id); }}
        className="absolute left-0 top-1 bottom-1 w-[10px] -ml-[6px] group cursor-pointer z-10"
        style={{ background: 'transparent' }}
        aria-label="Collapse thread"
      >
        <div className="absolute left-[4px] top-0 bottom-0 w-px bg-black/[0.08] group-hover:bg-reddit-blue/50 group-hover:w-[2px] transition-all rounded-full" />
      </button>

      <div className={depth > 0 ? 'ml-4 pl-3' : 'pl-3'}>
        {/* Collapsed view */}
        {isCollapsed ? (
          <div className="flex items-center gap-2 py-1.5">
            <button
              onClick={(e) => { e.stopPropagation(); onToggleCollapse(comment.id); }}
              className="w-5 h-5 rounded-md bg-black/[0.03] border border-black/[0.07] flex items-center justify-center text-on-surface-variant/70 hover:border-reddit-blue/40 hover:text-reddit-blue transition-colors flex-shrink-0"
            >
              <span className="text-[10px] leading-none font-bold">+</span>
            </button>
            <div className="flex items-center gap-1.5 text-meta-text flex-wrap min-w-0">
              <span className={`font-semibold ${comment.is_ai ? 'text-reddit-orange' : comment.is_user ? 'text-reddit-blue' : 'text-on-surface/70'}`}>
                {comment.is_user ? 'You' : `u/${comment.author || 'unknown'}`}
              </span>
              <span className="text-on-surface-variant/40">· {timeAgo(comment.created_utc)}</span>
              <span className="text-on-surface-variant/40 text-body-sm truncate italic">{comment.body.substring(0, 60)}</span>
              {hasReplies && (
                <span className="text-on-surface-variant/40 text-[10px]">({comment.replies.length} replies)</span>
              )}
            </div>
          </div>
        ) : (
          /* Expanded view */
          <>
            <div className="flex items-start gap-2.5 py-2">
              <div className="flex flex-col items-center gap-0.5 min-w-[24px] pt-0.5">
                <button className="text-on-surface-variant/40 hover:text-reddit-orange transition-colors leading-none p-0.5">
                  <svg width="13" height="13" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 12l6-7 6 7"/>
                  </svg>
                </button>
                <span className="text-meta-text font-bold tabular-nums text-on-surface/80">{comment.score || 0}</span>
                <button className="text-on-surface-variant/40 hover:text-reddit-periwinkle transition-colors leading-none p-0.5">
                  <svg width="13" height="13" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 8l6 7 6-7"/>
                  </svg>
                </button>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 text-meta-text mb-1 flex-wrap">
                  <span className={`font-semibold ${authorColor}`}>
                    {comment.is_user ? 'You' : `u/${comment.author || 'unknown'}`}
                  </span>
                  <span className="text-on-surface-variant/40">· {timeAgo(comment.created_utc)}</span>
                  <AuthorBadge comment={comment} />
                </div>
                {/* Real comments: render Reddit HTML. AI/user: plain text */}
                {comment.is_ai || comment.is_user ? (
                  <div className="text-body-lg leading-[21px] text-on-surface/90 whitespace-pre-wrap">{comment.body}</div>
                ) : comment.body_html ? (
                  <div className="text-body-lg leading-[21px] text-on-surface/90 [&_p]:mb-1 [&_a]:text-secondary [&_a]:underline"
                       dangerouslySetInnerHTML={{ __html: sanitizeHtml(comment.body_html) }} />
                ) : (
                  <div className="text-body-lg leading-[21px] text-on-surface/90 whitespace-pre-wrap">{comment.body}</div>
                )}
                {/* Always scan for image URLs and render them below */}
                {(() => {
                  const body = comment.body || '';
                  const urls = body.match(/(https?:\/\/[^\s]+)/g) || [];
                  const images = urls.filter(u => /\.(jpg|jpeg|png|gif|webp)(\?|$)/i.test(u) || u.includes('preview.redd.it') || u.includes('i.redd.it'));
                  return images.map((url, i) => (
                    <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="block mt-2 rounded-lg overflow-hidden ring-1 ring-black/[0.06] max-w-[400px]">
                      <img src={url} alt="" className="w-full max-h-[300px] object-cover" loading="lazy" />
                    </a>
                  ));
                })()}

                <div className="flex items-center gap-1 mt-1.5 -ml-1">
                  <button
                    onClick={() => onReply(comment.id, comment.author)}
                    className="text-meta-text text-on-surface-variant/70 hover:text-on-surface hover:bg-black/[0.04] font-label-bold px-2 py-1 rounded-md transition-colors inline-flex items-center gap-1"
                  >
                    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14 10a1.5 1.5 0 01-1.5 1.5H5l-3 3V3.5A1.5 1.5 0 013.5 2h9A1.5 1.5 0 0114 3.5V10z"/>
                    </svg>
                    Reply
                  </button>
                  {hasReplies && (
                    <button
                      onClick={(e) => { e.stopPropagation(); onToggleCollapse(comment.id); }}
                      className="text-meta-text text-on-surface-variant/50 hover:text-reddit-blue hover:bg-reddit-blue/[0.05] font-label-bold px-2 py-1 rounded-md transition-colors"
                    >
                      Collapse
                    </button>
                  )}
                </div>

                {isReplying && (
                  <div className="mt-2 flex items-start gap-2 animate-fade-up">
                    <div className="flex-1">
                      <textarea
                        value={replyText}
                        onChange={(e) => onReplyTextChange(e.target.value)}
                        placeholder={`Reply to u/${comment.author}...`}
                        className="w-full bg-black/[0.02] border border-black/[0.08] rounded-lg p-2.5 text-body-sm min-h-[44px] resize-y focus:bg-white focus:border-reddit-blue/40 focus:ring-4 focus:ring-reddit-blue/[0.06] outline-none transition-all"
                        rows={2}
                        autoFocus
                      />
                      <div className="flex justify-end gap-2 mt-1.5">
                        <button onClick={() => onReply(null, null)} className="text-meta-text text-on-surface-variant/70 font-label-bold px-3 py-1.5 hover:bg-black/[0.04] rounded-full transition-colors">Cancel</button>
                        <button onClick={() => onReplySubmit()} disabled={!replyText.trim() || replyLoading} className="bg-reddit-orange text-white text-label-bold font-label-bold px-4 py-1.5 rounded-full hover:bg-reddit-orange/90 disabled:opacity-40 transition-all shadow-sm shadow-reddit-orange/20">
                          {replyLoading ? 'Posting…' : 'Reply'}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Nested replies (hidden when collapsed) */}
            {comment.replies?.map((r) => (
              <CommentNode
                key={r.id}
                comment={r}
                depth={depth + 1}
                onReply={onReply}
                replyTarget={replyTarget}
                replyText={replyText}
                onReplyTextChange={onReplyTextChange}
                onReplySubmit={onReplySubmit}
                replyLoading={replyLoading}
                collapsed={collapsed}
                onToggleCollapse={onToggleCollapse}
              />
            ))}
            {hasReplies && currentDepth >= maxDepth && (
              <div className="text-secondary text-body-sm ml-6 mt-1 hover:underline cursor-pointer">Continue this thread →</div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function buildTree(flatComments, sortBy = 'best') {
  const byId = {};
  const roots = [];
  for (const c of flatComments) {
    byId[c.id] = { ...c, replies: [] };
  }
  for (const c of flatComments) {
    const node = byId[c.id];
    const parentId = c.parent_id;
    if (parentId && byId[parentId]) {
      if (c.is_user || c.is_ai) {
        byId[parentId].replies.unshift(node);
      } else {
        byId[parentId].replies.push(node);
      }
    } else {
      roots.push(node);
    }
  }
  
  // Sort children at every level based on sort mode
  // Synthetic (user/AI) comments are excluded from sorting — they stay where posted
  const sortChildren = (node) => {
    if (!node.replies || node.replies.length === 0) return;
    const synthetic = node.replies.filter(c => c.is_user || c.is_ai);
    const real = node.replies.filter(c => !c.is_user && !c.is_ai);
    if (sortBy === 'top') {
      real.sort((a, b) => b.score - a.score);
    } else if (sortBy === 'new') {
      real.sort((a, b) => (b.created_utc || 0) - (a.created_utc || 0));
    }
    node.replies = [...synthetic, ...real];
    node.replies.forEach(sortChildren);
  };
  
  // Sort roots too — but keep synthetic at top
  const syntheticRoots = roots.filter(c => c.is_user || c.is_ai);
  const realRoots = roots.filter(c => !c.is_user && !c.is_ai);
  if (sortBy === 'top') {
    realRoots.sort((a, b) => b.score - a.score);
  } else if (sortBy === 'new') {
    realRoots.sort((a, b) => (b.created_utc || 0) - (a.created_utc || 0));
  }
  const sortedRoots = [...syntheticRoots, ...realRoots];
  sortedRoots.forEach(sortChildren);
  
  return sortedRoots;
}

export default function CommentTree({ comments, onReply, replyTarget, replyText, onReplyTextChange, onReplySubmit, replyLoading, sortBy = 'best' }) {
  const [collapsed, setCollapsed] = useState(new Set());

  const onToggleCollapse = useCallback((id) => {
    setCollapsed(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const tree = buildTree(comments, sortBy);
  if (!tree.length) {
    return (
      <div className="bg-white rounded-lg border border-black/[0.05] shadow-card text-center py-12 text-on-surface-variant/60 text-body-lg">
        No comments yet — start the conversation below.
      </div>
    );
  }
  return (
    <div className="bg-white rounded-lg border border-black/[0.05] shadow-card px-card-padding py-2">
      <div className="divide-y divide-black/[0.04]">
        {tree.map((c) => (
          <div key={c.id} className="py-1">
            <CommentNode
              comment={c}
              depth={0}
              onReply={onReply}
              replyTarget={replyTarget}
              replyText={replyText}
              onReplyTextChange={onReplyTextChange}
              onReplySubmit={onReplySubmit}
              replyLoading={replyLoading}
              collapsed={collapsed}
              onToggleCollapse={onToggleCollapse}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
