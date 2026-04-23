// architecture.jsx — SayWetin system architecture (Module 3)
// Hub + spokes diagram on dark surface, editorial labels.

const AT = window.SW_TOKENS;

function ArchitectureDiagram() {
  // Hub at center, 8 spokes around it
  const spokes = [
    { id: 1, l: 'User layer',         s: 'Mobile app · listen · search', angle: -90, icon: 'mic' },
    { id: 2, l: 'Recognition',         s: 'Audio capture · fingerprint · match', angle: -45, icon: 'wave' },
    { id: 3, l: 'Intelligence',        s: 'Meaning · literal vs cultural · confidence', angle: 0, icon: 'sparkle' },
    { id: 4, l: 'Knowledge base',      s: 'Slang + lyric entries · region · artist', angle: 45, icon: 'layers' },
    { id: 5, l: 'Workflow · GitHub',   s: 'Issues · PRs · evals · releases', angle: 90, icon: 'github' },
    { id: 6, l: 'Automation · MCP',    s: 'Agent tools · QA · gap creation', angle: 135, icon: 'bolt' },
    { id: 7, l: 'Human review',        s: 'Linguist · editor · publisher', angle: 180, icon: 'shield' },
    { id: 8, l: 'Feedback loop',       s: 'Reports · low-confidence · new content', angle: -135, icon: 'heart' },
  ];
  const cx = 500, cy = 390, r = 270;

  return (
    <div style={{ width: '100%', height: '100%', background: AT.obsidian, fontFamily: AT.sans, color: AT.paper, position: 'relative', overflow: 'hidden' }}>
      {/* ambient */}
      <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(60% 60% at 50% 50%, ${AT.violetWash}, transparent 70%)` }}/>
      <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(rgba(255,255,255,.03) 1px, transparent 1px)', backgroundSize: '3px 3px', opacity: .6 }}/>

      {/* Header */}
      <div style={{ padding: '40px 48px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontFamily: AT.mono, fontSize: 11, letterSpacing: 2, color: AT.violet, textTransform: 'uppercase' }}>· System architecture ·</div>
          <div style={{ fontFamily: AT.serif, fontSize: 52, letterSpacing: -1.2, lineHeight: 1, marginTop: 10 }}>
            How <span style={{ fontStyle: 'italic', color: '#B5A8FF' }}>SayWetin</span> thinks.
          </div>
          <div style={{ fontSize: 14, color: AT.paperMute, marginTop: 10, maxWidth: 560, lineHeight: 1.5 }}>
            Eight layers working as one. Audio in, meaning out — with humans, GitHub, and MCP-powered agents closing the quality loop.
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
          <div style={{ fontFamily: AT.mono, fontSize: 10, letterSpacing: 1.4, color: AT.paperDim, textTransform: 'uppercase' }}>v2.4 · Apr 2026</div>
          <div style={{ fontFamily: AT.mono, fontSize: 10, letterSpacing: 1.4, color: AT.paperDim, textTransform: 'uppercase' }}>ships cultural intelligence</div>
        </div>
      </div>

      {/* Hub + spokes */}
      <div style={{ position: 'relative', width: 1000, height: 780, margin: '-20px auto 0' }}>
        <svg viewBox="0 0 1000 780" width="1000" height="780" style={{ position: 'absolute', inset: 0 }}>
          <defs>
            <radialGradient id="hubG" cx="0.3" cy="0.3">
              <stop offset="0%" stopColor="#A89AFF"/>
              <stop offset="60%" stopColor={AT.violet}/>
              <stop offset="100%" stopColor={AT.violetDim}/>
            </radialGradient>
            <filter id="hubGlow">
              <feGaussianBlur stdDeviation="16"/>
            </filter>
          </defs>

          {/* orbit ring */}
          <circle cx={cx} cy={cy} r={r} fill="none" stroke={AT.violetEdge} strokeDasharray="3 6"/>
          <circle cx={cx} cy={cy} r={r - 60} fill="none" stroke={AT.line} strokeDasharray="2 8"/>

          {/* spokes lines */}
          {spokes.map(sp => {
            const rad = sp.angle * Math.PI / 180;
            const x2 = cx + Math.cos(rad) * r;
            const y2 = cy + Math.sin(rad) * r;
            const x1 = cx + Math.cos(rad) * 70;
            const y1 = cy + Math.sin(rad) * 70;
            return <line key={sp.id} x1={x1} y1={y1} x2={x2} y2={y2} stroke={AT.violetEdge} strokeWidth="1"/>
          })}

          {/* feedback loop arc (user -> feedback -> intelligence) */}
          <path d={`M ${cx + Math.cos(-90 * Math.PI/180) * r} ${cy + Math.sin(-90 * Math.PI/180) * r}
                    A ${r+40} ${r+40} 0 0 0
                    ${cx + Math.cos(-135 * Math.PI/180) * r} ${cy + Math.sin(-135 * Math.PI/180) * r}`}
                fill="none" stroke={AT.amber} strokeWidth="1" strokeDasharray="4 4"/>

          {/* Hub glow */}
          <circle cx={cx} cy={cy} r="100" fill={AT.violet} opacity="0.3" filter="url(#hubGlow)"/>
          {/* Hub */}
          <circle cx={cx} cy={cy} r="70" fill="url(#hubG)" stroke="rgba(255,255,255,.2)" strokeWidth="1"/>
        </svg>

        {/* Hub content */}
        <div style={{ position: 'absolute', left: cx - 70, top: cy - 70, width: 140, height: 140, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
          <div style={{ fontFamily: AT.mono, fontSize: 9, letterSpacing: 1.6, color: AT.obsidian, textTransform: 'uppercase', opacity: 0.75 }}>the core</div>
          <div style={{ fontFamily: AT.serif, fontSize: 22, color: AT.obsidian, fontStyle: 'italic', letterSpacing: -0.4, lineHeight: 1, marginTop: 4 }}>SayWetin</div>
          <div style={{ fontFamily: AT.sans, fontSize: 10, color: AT.obsidian, opacity: 0.75, marginTop: 6 }}>Orchestrator</div>
        </div>

        {/* Spoke nodes */}
        {spokes.map(sp => {
          const rad = sp.angle * Math.PI / 180;
          const x = cx + Math.cos(rad) * r;
          const y = cy + Math.sin(rad) * r;
          // Label offsets so text stays outside node
          const offX = Math.cos(rad) * 88;
          const offY = Math.sin(rad) * 88;
          const isRight = Math.cos(rad) >= 0;
          return (
            <div key={sp.id}>
              {/* Node */}
              <div style={{
                position: 'absolute', left: x - 28, top: y - 28,
                width: 56, height: 56, borderRadius: '50%',
                background: AT.obsidian2, border: '1px solid ' + AT.violetEdge,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: `0 0 24px ${AT.violet}40`,
              }}>
                <SWIcon name={sp.icon} size={22} stroke={AT.violet} sw={1.5}/>
              </div>
              {/* Label */}
              <div style={{
                position: 'absolute', left: x + offX - (isRight ? 0 : 180), top: y + offY - 22,
                width: 180, textAlign: isRight ? 'left' : 'right',
              }}>
                <div style={{ fontFamily: AT.mono, fontSize: 9, letterSpacing: 1.6, color: AT.violet, textTransform: 'uppercase' }}>Layer {sp.id.toString().padStart(2, '0')}</div>
                <div style={{ fontFamily: AT.serif, fontSize: 20, letterSpacing: -0.3, marginTop: 2, lineHeight: 1.1 }}>{sp.l}</div>
                <div style={{ fontSize: 11, color: AT.paperMute, marginTop: 4, lineHeight: 1.4 }}>{sp.s}</div>
              </div>
            </div>
          );
        })}

        {/* Little caption for feedback arc */}
        <div style={{ position: 'absolute', top: 60, right: 200, fontFamily: AT.mono, fontSize: 10, letterSpacing: 1.4, color: AT.amber, textTransform: 'uppercase' }}>
          feedback loop ↻
        </div>
      </div>

      {/* Bottom data flow */}
      <div style={{ position: 'absolute', bottom: 36, left: 48, right: 48, display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
        {[
          { k: 'In', l: 'Audio + text', d: '6s fingerprint · free-text phrase · lyric tap' },
          { k: 'Think', l: 'Match + explain', d: '40M tracks matched · meaning generated with confidence' },
          { k: 'Verify', l: 'Human + agent', d: 'Linguist · editor · MCP confidence-sweep' },
          { k: 'Out', l: 'Premium meaning', d: 'Literal + cultural · region · tone · related' },
        ].map((s, i) => (
          <div key={i} style={{ padding: '14px 16px', borderRadius: 10, background: 'rgba(255,255,255,.03)', border: '0.5px solid ' + AT.line, position: 'relative' }}>
            <div style={{ fontFamily: AT.mono, fontSize: 9, letterSpacing: 1.6, color: AT.paperDim, textTransform: 'uppercase' }}>Step {i + 1} · {s.k}</div>
            <div style={{ fontFamily: AT.serif, fontSize: 17, letterSpacing: -0.3, marginTop: 3, fontStyle: 'italic' }}>{s.l}</div>
            <div style={{ fontSize: 11, color: AT.paperMute, marginTop: 4, lineHeight: 1.4 }}>{s.d}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

Object.assign(window, { ArchitectureDiagram });
