import { Link } from 'react-router-dom';

export default function TopNavBar({ countdown }) {
  const mins = Math.floor(countdown / 60);
  const secs = countdown % 60;
  const expiring = countdown <= 120;

  return (
    <nav className="sticky top-0 z-50 w-full bg-white/85 backdrop-blur-md border-b border-black/[0.06] shadow-nav">
      <div className="flex justify-between items-center w-full px-gutter max-w-container-max-width mx-auto h-12">
        <Link to="/" className="flex items-center gap-2 group">
          <div className="w-7 h-7 rounded-lg bg-reddit-orange flex items-center justify-center shadow-sm shadow-reddit-orange/30 group-hover:scale-105 transition-transform">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
              <path d="M12 2L2 7l10 5 10-5-10-5z"/>
              <path d="M2 17l10 5 10-5"/>
              <path d="M2 12l10 5 10-5"/>
            </svg>
          </div>
          <span className="text-on-surface text-[18px] font-bold tracking-tight">
            Reddit<span className="text-reddit-orange">Sim</span>
          </span>
        </Link>
        <div className="flex items-center gap-3">
          <span
            className={`hidden sm:inline-flex items-center gap-1.5 text-meta-text tabular-nums px-3 py-1 rounded-full border transition-colors ${
              expiring
                ? 'text-reddit-orange border-reddit-orange/20 bg-reddit-orange/[0.06]'
                : 'text-on-surface-variant/70 border-black/[0.06] bg-black/[0.02]'
            }`}
          >
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <circle cx="8" cy="8" r="6.25"/>
              <path d="M8 5v3l2 1.5"/>
            </svg>
            {mins}:{String(secs).padStart(2, '0')}
          </span>
          <Link
            to="/"
            className="bg-on-surface text-white text-label-bold font-label-bold px-4 py-1.5 rounded-full hover:bg-on-surface/85 transition-colors shadow-sm"
          >
            New Simulation
          </Link>
        </div>
      </div>
    </nav>
  );
}
