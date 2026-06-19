import { useState } from 'react';

const PRESETS = [
  { id: 'default', emoji: '🧑', label: 'Default Redditor', desc: 'Blends into the subreddit naturally' },
  { id: 'expert', emoji: '🎓', label: 'Subject Expert', desc: 'Knowledgeable, cites sources, academic' },
  { id: 'troll', emoji: '👹', label: 'Troll / Contrarian', desc: 'Argumentative, dismissive, provocative' },
  { id: 'newbie', emoji: '🌱', label: 'Curious Newbie', desc: 'Asks questions, eager to learn' },
  { id: 'comedian', emoji: '😂', label: 'Comedian', desc: 'Witty one-liners, puns, references' },
  { id: 'custom', emoji: '✏️', label: 'Custom Persona', desc: 'Write your own description' },
];

const PERSONA_PROMPTS = {
  default: '',
  expert: 'a subject matter expert with deep knowledge. You cite specific facts, studies, or examples. Your tone is authoritative but not condescending.',
  troll: 'a Reddit troll who disagrees with everything. You are sarcastic, dismissive, and provoke arguments. You use short, cutting responses.',
  newbie: 'a curious newcomer to the topic. You ask genuine follow-up questions, admit what you don\'t know, and are eager to learn.',
  comedian: 'a witty Reddit comedian. You make clever jokes, puns, and pop culture references. Every response should get a laugh.',
};

export default function PersonaSelector({ onChange }) {
  const [selected, setSelected] = useState('default');
  const [customText, setCustomText] = useState('');

  const handleSelect = (id) => {
    setSelected(id);
    onChange(id === 'custom' ? customText : (PERSONA_PROMPTS[id] || ''));
  };

  return (
    <div className="space-y-3">
      <label className="text-body-sm font-medium text-on-surface-variant block">
        Bot Persona
      </label>
      <div className="space-y-1.5 max-h-[240px] overflow-y-auto">
        {PRESETS.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => handleSelect(p.id)}
            className={`w-full text-left p-3 rounded-xl border transition-all duration-150 flex items-center gap-3 ${
              selected === p.id
                ? 'border-reddit-orange/30 bg-reddit-orange/[0.04] ring-1 ring-reddit-orange/20'
                : 'border-transparent bg-[#F8F9FA] hover:bg-[#EDEFF1] hover:border-[#EDEFF1]'
            }`}
          >
            <span className="text-xl flex-shrink-0">{p.emoji}</span>
            <div className="min-w-0">
              <div className="text-body-lg font-medium text-on-surface">{p.label}</div>
              <div className="text-body-sm text-on-surface-variant/60 truncate">{p.desc}</div>
            </div>
            {selected === p.id && (
              <div className="ml-auto flex-shrink-0 w-5 h-5 rounded-full bg-reddit-orange flex items-center justify-center">
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M2 6l3 3 5-6"/>
                </svg>
              </div>
            )}
          </button>
        ))}
      </div>
      {selected === 'custom' && (
        <textarea
          value={customText}
          onChange={(e) => { setCustomText(e.target.value); onChange(e.target.value); }}
          placeholder="Describe the persona... e.g., 'a retired Navy SEAL who relates everything to tactical operations'"
          className="w-full bg-[#F8F9FA] border border-[#EDEFF1] rounded-xl p-3 text-body-sm h-20 resize-none focus:bg-white focus:border-reddit-orange/30 focus:ring-4 focus:ring-reddit-orange/[0.06] outline-none transition-all mt-2"
          autoFocus
        />
      )}
    </div>
  );
}
