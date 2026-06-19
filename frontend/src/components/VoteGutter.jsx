export default function VoteGutter({ score = 0 }) {
  const fmt = (s) => (s >= 1000 ? `${(s / 1000).toFixed(1)}k` : String(s));
  return (
    <div className="w-10 bg-black/[0.015] flex flex-col items-center py-3 gap-1 flex-shrink-0">
      <button className="p-1 text-on-surface-variant/50 hover:text-reddit-orange hover:bg-reddit-orange/[0.08] rounded-md transition-colors">
        <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 12l6-7 6 7"/>
        </svg>
      </button>
      <span className="text-label-bold font-label-bold text-on-surface tabular-nums">{fmt(score)}</span>
      <button className="p-1 text-on-surface-variant/50 hover:text-reddit-periwinkle hover:bg-reddit-periwinkle/[0.08] rounded-md transition-colors">
        <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 8l6 7 6-7"/>
        </svg>
      </button>
    </div>
  );
}
