import { useState } from 'react';

export default function CommentInput({ onSubmit, loading, persona }) {
  const [text, setText] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!text.trim() || loading) return;
    onSubmit(text);
    setText('');
  };

  return (
    <div className="bg-white rounded-lg border border-black/[0.05] shadow-card p-3">
      <form onSubmit={handleSubmit} className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-reddit-orange to-[#FF7B45] flex-shrink-0 mt-1 flex items-center justify-center text-white text-label-bold shadow-sm shadow-reddit-orange/25">
          Y
        </div>
        <div className="flex-1">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={persona ? `Writing as: ${persona.slice(0, 60)}...` : 'Join the conversation — the AI will reply...'}
            className="w-full bg-black/[0.02] border border-black/[0.08] rounded-lg p-3 text-body-lg min-h-[52px] resize-y focus:bg-white focus:border-reddit-blue/40 focus:ring-4 focus:ring-reddit-blue/[0.06] outline-none transition-all placeholder:text-on-surface-variant/40"
            rows={2}
          />
          <div className="flex justify-between items-center mt-2">
            <span className="text-meta-text text-on-surface-variant/50 tabular-nums">{text.length} chars</span>
            <button
              type="submit"
              disabled={!text.trim() || loading}
              className="bg-reddit-orange text-white text-label-bold font-label-bold px-6 py-2 rounded-full hover:bg-reddit-orange/90 transition-all disabled:opacity-40 shadow-sm shadow-reddit-orange/25 inline-flex items-center gap-2"
            >
              {loading && (
                <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="32" strokeDashoffset="8" opacity="0.4"/>
                </svg>
              )}
              {loading ? 'Generating…' : 'Comment'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
