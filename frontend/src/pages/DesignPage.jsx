import { Link } from 'react-router-dom';

const COLORS = {
  primary: { hex: '#FF4500', name: 'Primary / Action Orange', usage: 'Brand identity, upvote states, CTA buttons' },
  secondary: { hex: '#0079D3', name: 'Secondary / Link Blue', usage: 'Links, user handles, secondary interactions' },
  'reddit-bg': { hex: '#DAE0E6', name: 'Background Canvas', usage: 'Main application background' },
  'surface': { hex: '#FFFFFF', name: 'Card Surface', usage: 'Content cards, widgets, modals' },
  'reddit-text': { hex: '#1A1A1B', name: 'Primary Text', usage: 'Headlines, body text, high-emphasis content' },
  'reddit-periwinkle': { hex: '#7193FF', name: 'Downvote Periwinkle', usage: 'Downvote active state' },
  'reddit-input-bg': { hex: '#F6F7F8', name: 'Input Background', usage: 'Search bars, comment inputs' },
  'reddit-card-border': { hex: '#EDEFF1', name: 'Card Border', usage: '1px borders on cards and widgets' },
};

const TYPOGRAPHY = [
  { name: 'Display LG', className: 'text-[22px] font-semibold leading-7', sample: 'How Hans cheated. A mirror on the...', usage: 'Post titles, community names' },
  { name: 'Headline MD', className: 'text-[18px] font-medium leading-6', sample: 'The Fragile Monopoly of High-End Logic', usage: 'Section headers, card titles' },
  { name: 'Body LG', className: 'text-[14px] font-normal leading-5', sample: 'Standard body text for comments and content. The quick brown fox jumps over the lazy dog.', usage: 'Post body, comment text' },
  { name: 'Body SM', className: 'text-[12px] font-normal leading-4', sample: 'Secondary body text for less important content. Pack my box with five dozen liquor jugs.', usage: 'Sidebar text, descriptions' },
  { name: 'Label Bold', className: 'text-[12px] font-bold leading-4 tracking-[0.5px]', sample: 'LABEL TEXT', usage: 'Buttons, navigation, metadata labels' },
  { name: 'Meta Text', className: 'text-[12px] font-normal leading-4', sample: 'Posted by u/username · 4 hours ago', usage: 'Timestamps, usernames, subreddit tags' },
];

const COMPONENTS = [
  {
    name: 'Post Card',
    desc: 'Core content unit with left-aligned vote gutter, metadata row, bold title, selftext with fade-out, and action bar.',
    preview: (
      <div className="bg-white rounded border border-[#EDEFF1] flex overflow-hidden">
        <div className="w-10 bg-[#F8F9FA] flex flex-col items-center py-2 gap-1 border-r border-transparent flex-shrink-0">
          <span className="text-on-surface-variant/40 text-xs">▲</span>
          <span className="text-[11px] font-bold">24.5k</span>
          <span className="text-[#7193FF]/40 text-xs">▼</span>
        </div>
        <div className="p-3 flex-1 min-w-0">
          <div className="flex items-center gap-1 text-[11px] text-on-surface-variant/50 mb-1">
            <span className="font-bold text-on-surface">r/Technology</span>
            <span>· Posted by u/TechAnalyst · 4h ago</span>
          </div>
          <div className="text-[15px] font-semibold mb-1">Post title goes here</div>
          <div className="text-[12px] text-on-surface-variant/60">Selftext content with a fade-out gradient at the bottom to indicate more content...</div>
          <div className="flex items-center gap-3 mt-2 pt-2 border-t border-[#EDEFF1] text-[11px] text-on-surface-variant/40">
            <span>💬 1.2k Comments</span><span>↗ Share</span><span>🔖 Save</span>
          </div>
        </div>
      </div>
    ),
  },
  {
    name: 'Comment Thread',
    desc: 'Nested comments with vote arrows, author metadata, body text, and inline reply capability. Depth indicated by left border.',
    preview: (
      <div className="space-y-0">
        <div className="flex items-start gap-2 py-2">
          <div className="flex flex-col items-center gap-0.5 min-w-[20px]"><span className="text-[10px] text-on-surface-variant/30">▲</span><span className="text-[10px] font-bold">2136</span><span className="text-[10px] text-on-surface-variant/30">▼</span></div>
          <div><span className="text-[11px] font-medium text-[#0079D3]">u/Mysterious-Ad9178</span><span className="text-[11px] text-on-surface-variant/40"> · 1370d</span><div className="text-[13px]">The queens gambit movie style</div></div>
        </div>
        <div className="ml-4 pl-3 border-l-2 border-[#EDEFF1]">
          <div className="flex items-start gap-2 py-2">
            <div className="flex flex-col items-center gap-0.5 min-w-[20px]"><span className="text-[10px] text-on-surface-variant/30">▲</span><span className="text-[10px] font-bold">492</span><span className="text-[10px] text-on-surface-variant/30">▼</span></div>
            <div><span className="text-[11px] font-medium text-[#0079D3]">u/JillsACheatNMean</span><span className="text-[11px] text-on-surface-variant/40"> · 1370d</span><div className="text-[13px]">I've seen a couple memes but did magnus get beat?</div></div>
          </div>
        </div>
      </div>
    ),
  },
  {
    name: 'Sidebar Widget',
    desc: 'Boxed component with shaded header, used for About Community, Rules, Moderators.',
    preview: (
      <div className="bg-white rounded border border-[#EDEFF1] overflow-hidden">
        <div className="bg-[#0079D3] px-3 py-2"><span className="text-[13px] font-bold text-white">About Community</span></div>
        <div className="p-3 space-y-2">
          <div className="text-[11px] text-on-surface-variant/60">Subreddit description goes here with brief info about the community.</div>
          <div className="flex justify-between py-1.5 border-y border-[#EDEFF1]">
            <div><span className="text-[15px] font-semibold">14.8m</span><div className="text-[10px] text-on-surface-variant/40">Members</div></div>
            <div><div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-green-500" /><span className="text-[15px] font-semibold">12.4k</span></div><div className="text-[10px] text-on-surface-variant/40">Online</div></div>
          </div>
          <div className="w-full bg-[#FF4500] text-white text-[11px] font-bold py-1.5 rounded-full text-center">Create Post</div>
        </div>
      </div>
    ),
  },
  {
    name: 'Primary Button',
    desc: 'Pill-shaped, solid orange (#FF4500) with white text. Used for primary actions.',
    preview: (
      <div className="flex gap-2">
        <div className="bg-[#FF4500] text-white text-[11px] font-bold px-6 py-1.5 rounded-full">Join</div>
        <div className="bg-[#FF4500] text-white text-[11px] font-bold px-6 py-1.5 rounded-full opacity-90">Hover</div>
        <div className="bg-[#FF4500] text-white text-[11px] font-bold px-6 py-1.5 rounded-full opacity-50">Disabled</div>
      </div>
    ),
  },
];

export default function DesignPage() {
  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(135deg, #DAE0E6 0%, #EDEFF1 50%, #F6F7F8 100%)' }}>
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
           style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, #1A1A1B 1px, transparent 0)', backgroundSize: '24px 24px' }} />
      
      <div className="relative max-w-4xl mx-auto px-6 py-12">
        <Link to="/" className="text-on-surface-variant/40 text-body-sm hover:text-on-surface-variant transition-colors inline-block mb-8">← Back to RedditSim</Link>
        
        <div className="mb-10">
          <h1 className="text-[36px] font-black tracking-tight text-on-surface">Design System</h1>
          <p className="text-body-lg text-on-surface-variant/50 mt-2">Community Centric — Corporate Modern with Card-Based Layout</p>
          <p className="text-body-sm text-on-surface-variant/30 mt-1 max-w-lg">
            The design system focuses on information density, community identity, and rapid content consumption. 
            Targets a digitally-native audience that values utility over decoration. Built with IBM Plex Sans across all levels.
          </p>
        </div>

        <div className="space-y-8">
          {/* Colors */}
          <section>
            <h2 className="text-headline-md font-headline-md text-on-surface mb-4">Color Palette</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {Object.entries(COLORS).map(([key, c]) => (
                <div key={key} className="bg-white rounded-xl border border-[#EDEFF1] overflow-hidden shadow-sm">
                  <div className="h-20" style={{ backgroundColor: c.hex }} />
                  <div className="p-3">
                    <div className="text-label-bold text-on-surface">{c.name}</div>
                    <div className="text-body-sm text-on-surface-variant/50 font-mono mt-0.5">{c.hex}</div>
                    <div className="text-body-sm text-on-surface-variant/40 mt-1 leading-snug">{c.usage}</div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Typography */}
          <section>
            <h2 className="text-headline-md font-headline-md text-on-surface mb-4">Typography · IBM Plex Sans</h2>
            <div className="bg-white rounded-xl border border-[#EDEFF1] shadow-sm divide-y divide-[#EDEFF1]">
              {TYPOGRAPHY.map((t, i) => (
                <div key={i} className="p-5 flex flex-col md:flex-row md:items-start gap-4">
                  <div className="min-w-[120px]">
                    <div className="text-label-bold text-on-surface">{t.name}</div>
                    <div className="text-body-sm text-on-surface-variant/40">{t.usage}</div>
                  </div>
                  <div className="flex-1">
                    <div className={t.className + ' text-on-surface'}>{t.sample}</div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Components */}
          <section>
            <h2 className="text-headline-md font-headline-md text-on-surface mb-4">Components</h2>
            <div className="space-y-4">
              {COMPONENTS.map((c, i) => (
                <div key={i} className="bg-white rounded-xl border border-[#EDEFF1] shadow-sm overflow-hidden">
                  <div className="px-5 py-3 border-b border-[#EDEFF1] bg-[#F8F9FA] flex items-baseline justify-between">
                    <div>
                      <h3 className="text-label-bold text-on-surface">{c.name}</h3>
                      <p className="text-body-sm text-on-surface-variant/50 mt-0.5">{c.desc}</p>
                    </div>
                  </div>
                  <div className="p-5">
                    {c.preview}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Spacing */}
          <section>
            <h2 className="text-headline-md font-headline-md text-on-surface mb-4">Layout & Spacing</h2>
            <div className="bg-white rounded-xl border border-[#EDEFF1] shadow-sm p-5">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-body-sm">
                {[
                  { label: 'Main Content', value: '640px' },
                  { label: 'Sidebar', value: '312px' },
                  { label: 'Max Width', value: '1248px' },
                  { label: 'Card Padding', value: '12px' },
                  { label: 'Stack Gap', value: '10px' },
                  { label: 'Gutter', value: '16px' },
                  { label: 'Border Radius', value: '4px' },
                  { label: 'Button Radius', value: '9999px' },
                ].map((s, i) => (
                  <div key={i} className="bg-[#F8F9FA] rounded-lg p-3 border border-[#EDEFF1]">
                    <div className="text-on-surface-variant/40 text-xs">{s.label}</div>
                    <div className="text-label-bold text-on-surface font-mono">{s.value}</div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>

        <p className="text-center text-body-sm text-on-surface-variant/20 mt-12 mb-8">
          RedditSim Design System · Generated from DESIGN.md
        </p>
      </div>
    </div>
  );
}
