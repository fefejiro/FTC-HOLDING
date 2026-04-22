// architecture-live.jsx — Live Lyrics Follow system diagram
// A linear-loop architecture: recognition -> sync -> highlight -> tap -> meaning -> feedback
const ALT = window.SW_TOKENS;

function ArchitectureLive() {
  const T = ALT;
  const steps = [
    { n: '01', k: 'Listen', l: 'User listens', d: 'Audio captured from environment · 6s rolling window', icon: 'mic' },
    { n: '02', k: 'Recognize', l: 'Track identified', d: 'Fingerprint matched against 40M-song index', icon: 'wave' },
    { n: '03', k: 'Retrieve', l: 'Synced lyrics fetched', d: 'Line-level timing · region flags · artist context', icon: 'layers' },
    { n: '04', k: 'Estimate', l: 'Playback position', d: 'Continuous alignment · drift monitored · resync on demand', icon: 'bolt' },
    { n: '05', k: 'Highlight', l: 'Current line shown', d: 'Follow mode · previous + upcoming stream · smooth motion', icon: 'sparkle' },
    { n: '06', k: 'Tap', l: 'User taps a line', d: 'Intent captured · selected line pinned to sheet', icon: 'search' },
    { n: '07', k: 'Explain', l: 'Meaning engine fires', d: 'Literal · cultural · slang · region · tone · confidence', icon: 'sparkle' },
    { n: '08', k: 'Check', l: 'Confidence + ambiguity', d: 'Low-confidence → honest fallback · alternates surfaced', icon: 'shield' },
  ];

  return (
    <div style={{ width: '100%', height: '100%', background: T.obsidian, fontFamily: T.sans, color: T.paper, position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(70% 50% at 50% 30%, ${T.violetWash}, transparent 70%)` }}/>
      <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(rgba(255,255,255,.03) 1px, transparent 1px)', backgroundSize: '3px 3px', opacity: .5 }}/>

      {/* Header */}
      <div style={{ padding: '36px 44px 0' }}>
        <div style={{ fontFamily: T.mono, fontSize: 11, letterSpacing: 2, color: T.violet, textTransform: 'uppercase' }}>· Live lyrics · follow mode ·</div>
        <div style={{ fontFamily: T.serif, fontSize: 46, letterSpacing: -1, lineHeight: 1, marginTop: 8 }}>
          From song to <span style={{ fontStyle: 'italic', color: '#B5A8FF' }}>meaning</span>, in real time.
        </div>
        <div style={{ fontSize: 13, color: T.paperMute, marginTop: 8, maxWidth: 640, lineHeight: 1.5 }}>
          Eight steps. The user never sees most of them &mdash; that&apos;s the point. Tap a line, get the Nigerian reading, keep listening.
        </div>
      </div>

      {/* Flow grid 4×2 */}
      <div style={{ padding: '28px 44px 0', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
        {steps.map((s, i) => (
          <div key={i} style={{
            padding: 16, borderRadius: 12,
            background: i === 4 ? `linear-gradient(180deg, ${T.violetWash}, rgba(139,124,246,.02))` : 'rgba(255,255,255,.03)',
            border: '0.5px solid ' + (i === 4 ? T.violetEdge : T.line),
            position: 'relative', minHeight: 150,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <div style={{ fontFamily: T.mono, fontSize: 9, letterSpacing: 1.4, color: T.paperDim, textTransform: 'uppercase' }}>Step {s.n}</div>
              <div style={{ width: 30, height: 30, borderRadius: 15, background: T.obsidian2, border: '0.5px solid ' + T.violetEdge, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <SWIcon name={s.icon} size={14} stroke={T.violet} sw={1.5}/>
              </div>
            </div>
            <div style={{ fontFamily: T.mono, fontSize: 9, letterSpacing: 1.4, color: T.violet, textTransform: 'uppercase' }}>{s.k}</div>
            <div style={{ fontFamily: T.serif, fontSize: 19, letterSpacing: -0.3, lineHeight: 1.15, marginTop: 4, fontStyle: i === 4 ? 'italic' : 'normal' }}>{s.l}</div>
            <div style={{ fontSize: 11, color: T.paperMute, marginTop: 6, lineHeight: 1.4 }}>{s.d}</div>
            {i < 7 && i !== 3 && (
              <div style={{ position: 'absolute', right: -11, top: '50%', width: 18, height: 2, background: T.violetEdge, zIndex: 2 }}/>
            )}
          </div>
        ))}
      </div>

      {/* Feedback loop band */}
      <div style={{ position: 'absolute', bottom: 44, left: 44, right: 44 }}>
        <div style={{ padding: 20, borderRadius: 14, background: 'rgba(232,184,76,.06)', border: '0.5px dashed rgba(232,184,76,.35)', display: 'grid', gridTemplateColumns: '160px 1fr 1fr 1fr', gap: 20, alignItems: 'center' }}>
          <div>
            <div style={{ fontFamily: T.mono, fontSize: 10, letterSpacing: 1.6, color: T.amber, textTransform: 'uppercase' }}>Feedback loop ↻</div>
            <div style={{ fontFamily: T.serif, fontSize: 22, fontStyle: 'italic', letterSpacing: -0.4, marginTop: 4 }}>How we learn.</div>
          </div>
          {[
            { n: '09', t: 'User signals', d: 'Flags, corrections, dwell time, re-syncs — all captured.' },
            { n: '10', t: 'Gaps → queue', d: 'Low-confidence + ambiguous lines route to the review dashboard.' },
            { n: '11', t: 'Next play is sharper', d: 'Edits ship. Meaning engine improves. Coverage climbs weekly.' },
          ].map((f, i) => (
            <div key={i}>
              <div style={{ fontFamily: T.mono, fontSize: 9, letterSpacing: 1.4, color: T.amber, textTransform: 'uppercase' }}>{f.n}</div>
              <div style={{ fontSize: 13, fontWeight: 500, marginTop: 2 }}>{f.t}</div>
              <div style={{ fontSize: 11, color: T.paperMute, marginTop: 3, lineHeight: 1.4 }}>{f.d}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { ArchitectureLive });
