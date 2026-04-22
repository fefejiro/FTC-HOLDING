// tokens.jsx — SayWetin design system tokens + base icons + placeholder art
// Loaded first so everything else can reference window.SW.

const SW_TOKENS = {
  // Dark-rich mobile
  obsidian: '#0A0A0F',
  obsidian2: '#111118',
  obsidian3: '#16161F',
  obsidian4: '#1C1C28',
  line: 'rgba(255,255,255,0.08)',
  line2: 'rgba(255,255,255,0.14)',
  paper: '#EEEBF5',
  paperMute: 'rgba(238,235,245,0.62)',
  paperDim: 'rgba(238,235,245,0.38)',
  paperFaint: 'rgba(238,235,245,0.18)',
  violet: '#8B7CF6',
  violetDim: '#6B5CD6',
  violetWash: 'rgba(139,124,246,0.14)',
  violetEdge: 'rgba(139,124,246,0.32)',
  amber: '#E8B84C',
  rose: '#F07A95',
  mint: '#7AD6A5',
  // Light dashboard
  bone: '#F5F3EE',
  bone2: '#ECE9E1',
  ink: '#14131A',
  ink2: '#2A2833',
  ink3: '#4A4858',
  hair: 'rgba(20,19,26,0.08)',
  hair2: 'rgba(20,19,26,0.14)',
  // Type
  serif: '"Instrument Serif", "Cormorant Garamond", Georgia, serif',
  sans: '"Geist", "Inter Tight", "Helvetica Neue", Helvetica, Arial, sans-serif',
  mono: '"JetBrains Mono", "IBM Plex Mono", ui-monospace, monospace',
};

// Inject Google Fonts + base styles once
if (typeof document !== 'undefined' && !document.getElementById('sw-fonts')) {
  const l = document.createElement('link');
  l.id = 'sw-fonts';
  l.rel = 'stylesheet';
  l.href = 'https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Inter+Tight:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap';
  document.head.appendChild(l);

  const s = document.createElement('style');
  s.id = 'sw-base';
  s.textContent = `
    @keyframes sw-pulse { 0%,100%{transform:scale(1);opacity:.85} 50%{transform:scale(1.08);opacity:1} }
    @keyframes sw-ring { 0%{transform:scale(.6);opacity:.9} 100%{transform:scale(2.2);opacity:0} }
    @keyframes sw-bar { 0%,100%{transform:scaleY(.35)} 50%{transform:scaleY(1)} }
    @keyframes sw-shimmer { 0%{background-position:-200% 0} 100%{background-position:200% 0} }
    @keyframes sw-drift { 0%,100%{transform:translate3d(0,0,0)} 50%{transform:translate3d(0,-6px,0)} }
    @keyframes sw-orbit { to { transform: rotate(360deg); } }
    .sw-shimmer{background:linear-gradient(90deg,transparent 0%,rgba(255,255,255,.06) 50%,transparent 100%);background-size:200% 100%;animation:sw-shimmer 2.4s linear infinite}
    .sw-noise{background-image:radial-gradient(rgba(255,255,255,.025) 1px,transparent 1px);background-size:3px 3px}
  `;
  document.head.appendChild(s);
}

// ─── Icon system (lightweight stroke icons) ───────────────────────
function SWIcon({ name, size = 20, stroke = 'currentColor', sw = 1.5 }) {
  const p = {
    listen: <><circle cx="12" cy="12" r="3" /><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></>,
    search: <><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></>,
    sparkle: <><path d="M12 3v6M12 15v6M3 12h6M15 12h6M5.6 5.6l4.2 4.2M14.2 14.2l4.2 4.2M5.6 18.4l4.2-4.2M14.2 9.8l4.2-4.2"/></>,
    clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
    flag: <><path d="M4 22V4h13l-2 5 2 5H4"/></>,
    chevron: <><path d="m9 6 6 6-6 6"/></>,
    chevronDown: <><path d="m6 9 6 6 6-6"/></>,
    close: <><path d="m6 6 12 12M18 6 6 18"/></>,
    arrowUp: <><path d="M12 19V5M5 12l7-7 7 7"/></>,
    arrowRight: <><path d="M5 12h14M13 5l7 7-7 7"/></>,
    mic: <><rect x="9" y="3" width="6" height="12" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></>,
    wave: <><path d="M3 12h2M7 7v10M11 4v16M15 8v8M19 10v4M21 12h0"/></>,
    heart: <><path d="M20.8 6.6a5.4 5.4 0 0 0-8.8-1.7L12 5l-0-.1a5.4 5.4 0 0 0-8.8 6.2C5 16 12 21 12 21s7-5 8.8-10.2a5.4 5.4 0 0 0 0-4.2Z"/></>,
    plus: <><path d="M12 5v14M5 12h14"/></>,
    check: <><path d="m5 12 5 5L20 7"/></>,
    warn: <><path d="M12 3 2 20h20L12 3zM12 10v5M12 18v.5"/></>,
    info: <><circle cx="12" cy="12" r="9"/><path d="M12 8v.5M11 12h1v5h1"/></>,
    github: <><path d="M12 2a10 10 0 0 0-3.2 19.5c.5.1.7-.2.7-.5v-1.8c-2.8.6-3.4-1.4-3.4-1.4-.5-1.1-1.1-1.5-1.1-1.5-.9-.6.1-.6.1-.6 1 .1 1.5 1 1.5 1 .9 1.6 2.4 1.1 3 .8.1-.7.4-1.1.7-1.4-2.2-.3-4.6-1.1-4.6-5 0-1.1.4-2 1-2.7-.1-.2-.4-1.2.1-2.6 0 0 .8-.3 2.7 1a9.4 9.4 0 0 1 5 0c1.9-1.3 2.7-1 2.7-1 .5 1.4.2 2.4.1 2.6.6.7 1 1.6 1 2.7 0 3.9-2.4 4.7-4.6 5 .4.3.7.9.7 1.9v2.8c0 .3.2.6.7.5A10 10 0 0 0 12 2z"/></>,
    layers: <><path d="m12 3 10 5-10 5L2 8l10-5zM2 12l10 5 10-5M2 16l10 5 10-5"/></>,
    menu: <><path d="M3 6h18M3 12h18M3 18h18"/></>,
    more: <><circle cx="5" cy="12" r="1.2"/><circle cx="12" cy="12" r="1.2"/><circle cx="19" cy="12" r="1.2"/></>,
    filter: <><path d="M3 5h18l-7 9v5l-4 2v-7L3 5z"/></>,
    download: <><path d="M12 4v12M6 10l6 6 6-6M4 20h16"/></>,
    grid: <><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></>,
    bolt: <><path d="M13 2 3 14h8l-1 8 10-12h-8l1-8z"/></>,
    shield: <><path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6l-8-3z"/></>,
    pin: <><path d="M12 21s-7-7-7-12a7 7 0 0 1 14 0c0 5-7 12-7 12zM12 11a2 2 0 1 0 0-4 2 2 0 0 0 0 4z"/></>,
    play: <><path d="M6 4v16l14-8L6 4z"/></>,
  }[name];
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={stroke} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
      {p}
    </svg>
  );
}

// ─── Album art placeholder (striped, monospace caption) ──────────
function AlbumArt({ size = 64, seed = 1, caption = 'cover', radius = 12, tone = 'dark' }) {
  const hues = [272, 258, 42, 12, 340];
  const h1 = hues[seed % hues.length];
  const h2 = hues[(seed + 2) % hues.length];
  const light = tone === 'light';
  return (
    <div style={{
      width: size, height: size, borderRadius: radius, overflow: 'hidden', position: 'relative',
      background: light
        ? `linear-gradient(135deg, oklch(0.9 0.04 ${h1}), oklch(0.85 0.05 ${h2}))`
        : `linear-gradient(135deg, oklch(0.38 0.12 ${h1}), oklch(0.22 0.08 ${h2}))`,
      flexShrink: 0,
    }}>
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: `repeating-linear-gradient(45deg, ${light ? 'rgba(0,0,0,.06)' : 'rgba(255,255,255,.07)'} 0 1px, transparent 1px 7px)`,
      }} />
      {caption && size >= 44 && (
        <div style={{
          position: 'absolute', left: 6, bottom: 5, fontFamily: SW_TOKENS.mono,
          fontSize: Math.max(8, Math.min(10, size / 8)), color: light ? 'rgba(0,0,0,.55)' : 'rgba(255,255,255,.6)',
          letterSpacing: 0.2, textTransform: 'uppercase',
        }}>{caption}</div>
      )}
    </div>
  );
}

Object.assign(window, { SW_TOKENS, SWIcon, AlbumArt });
