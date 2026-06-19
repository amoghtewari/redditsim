import VoteGutter from './VoteGutter';

function isImageUrl(url) {
  return /\.(jpg|jpeg|png|gif|webp|bmp)(\?|$)/i.test(url)
    || url.includes('preview.redd.it')
    || url.includes('i.redd.it')
    || url.includes('i.imgur.com');
}

function ActionButton({ icon, label, className = '' }) {
  return (
    <button className={`flex items-center gap-1.5 px-2.5 py-1.5 hover:bg-black/[0.04] rounded-md transition-colors text-meta-text font-label-bold text-on-surface-variant/80 hover:text-on-surface ${className}`}>
      {icon}
      {label && <span>{label}</span>}
    </button>
  );
}

export default function PostCard({ post }) {
  const timeAgo = (utc) => {
    if (!utc) return '';
    const d = Math.floor(Date.now() / 1000 - utc);
    if (d < 3600) return `${Math.floor(d / 60)}m ago`;
    if (d < 86400) return `${Math.floor(d / 3600)}h ago`;
    return `${Math.floor(d / 86400)}d ago`;
  };

  return (
    <article className="bg-white rounded-lg border border-black/[0.05] shadow-card hover:shadow-card-hover transition-shadow duration-200 flex overflow-hidden animate-fade-up">
      <VoteGutter score={post.score} />
      <div className="p-card-padding flex-1 flex flex-col min-w-0">
        <div className="flex items-center gap-1.5 text-meta-text font-meta-text text-on-surface-variant/70 mb-2 overflow-hidden whitespace-nowrap">
          <img
            alt="Subreddit"
            className="w-5 h-5 rounded-full ring-1 ring-black/[0.06]"
            src={`https://ui-avatars.com/api/?name=${post.subreddit || 'r'}&background=0079D3&color=fff&size=20`}
          />
          <span className="font-bold text-on-surface hover:underline cursor-pointer">r/{post.subreddit || 'all'}</span>
          <span className="text-on-surface-variant/40">·</span>
          <span>Posted by <span className="hover:underline cursor-pointer">u/{post.author || 'unknown'}</span></span>
          <span className="text-on-surface-variant/40">·</span>
          <span>{timeAgo(post.created_utc)}</span>
        </div>
        <h2 className="text-[19px] leading-[26px] font-semibold text-on-surface mb-2 pr-4 tracking-[-0.01em]">{post.title}</h2>
        {post.link_flair_text && (
          <div className="flex flex-wrap gap-1 mb-3">
            <span className="bg-secondary/[0.08] text-secondary text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide">{post.link_flair_text}</span>
          </div>
        )}
        {post.selftext && (
          <div className="text-body-lg leading-[21px] text-on-surface/80 flex flex-col gap-4 mb-4 relative" style={{ maxHeight: '300px', overflow: 'hidden' }}>
            <div className="whitespace-pre-wrap">{post.selftext}</div>
            {post.selftext.length > 800 && (
              <div className="absolute bottom-0 left-0 w-full h-24 bg-gradient-to-t from-white to-transparent pointer-events-none" />
            )}
          </div>
        )}
        {post.url && !post.is_self && (
          isImageUrl(post.url) ? (
            <a href={post.url} target="_blank" rel="noopener noreferrer" className="block mb-4 rounded-lg overflow-hidden ring-1 ring-black/[0.06]">
              <img src={post.url} alt={post.title} className="w-full max-h-[400px] object-cover" loading="lazy" />
            </a>
          ) : (
            <a href={post.url} target="_blank" rel="noopener noreferrer" className="text-secondary text-body-sm hover:underline mb-4 block break-all">{post.url}</a>
          )
        )}
        <div className="flex items-center gap-0.5 mt-auto pt-2 border-t border-black/[0.05]">
          <ActionButton
            label={`${post.num_comments || 0} Comments`}
            icon={
              <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 10a1.5 1.5 0 01-1.5 1.5H5l-3 3V3.5A1.5 1.5 0 013.5 2h9A1.5 1.5 0 0114 3.5V10z"/>
              </svg>
            }
          />
          <ActionButton
            label="Share"
            icon={
              <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 5.5L8 2 4 5.5"/>
                <path d="M8 2v8.5"/>
                <path d="M3 9v4a1 1 0 001 1h8a1 1 0 001-1V9"/>
              </svg>
            }
          />
          <ActionButton
            label="Save"
            icon={
              <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 2h8a0.5 0.5 0 01.5.5V14L8 11l-4.5 3V2.5A0.5 0.5 0 014 2z"/>
              </svg>
            }
          />
          <ActionButton
            className="ml-auto"
            icon={
              <svg width="15" height="15" viewBox="0 0 16 16" fill="currentColor">
                <circle cx="3.5" cy="8" r="1.25"/><circle cx="8" cy="8" r="1.25"/><circle cx="12.5" cy="8" r="1.25"/>
              </svg>
            }
          />
        </div>
      </div>
    </article>
  );
}
