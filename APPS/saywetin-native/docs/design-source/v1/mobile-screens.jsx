// mobile-screens.jsx — SayWetin mobile screens (Module 1)
// Each screen is a pure component returning a 402x874 (or inner 390x812) frame
// designed to sit inside an IOSDevice bezel.

const T = window.SW_TOKENS;

// ─── Shared atoms ──────────────────────────────────────────────
function Chip({ children, tone = 'violet', size = 'sm' }) {
  const toneMap = {
    violet: { bg: T.violetWash, fg: '#CFC6FF', br: T.violetEdge },
    mute:   { bg: 'rgba(255,255,255,.04)', fg: T.paperMute, br: T.line },
    amber:  { bg: 'rgba(232,184,76,.12)', fg: T.amber, br: 'rgba(232,184,76,.32)' },
    rose:   { bg: 'rgba(240,122,149,.12)', fg: T.rose, br: 'rgba(240,122,149,.32)' },
    mint:   { bg: 'rgba(122,214,165,.12)', fg: T.mint, br: 'rgba(122,214,165,.3)' },
  }[tone];
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      fontFamily: T.sans, fontSize: size === 'xs' ? 10 : 11, fontWeight: 500,
      letterSpacing: 0.2,
      padding: size === 'xs' ? '3px 7px' : '4px 9px',
      borderRadius: 999, color: toneMap.fg, background: toneMap.bg,
      border: `0.5px solid ${toneMap.br}`,
    }}>{children}</span>
  );
}

function Wordmark({ size = 16, color = T.paper }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 2 }}>
      <span style={{ fontFamily: T.serif, fontSize: size * 1.2, fontStyle: 'italic', color, letterSpacing: -0.5, lineHeight: 1 }}>S</span>
      <span style={{ fontFamily: T.sans, fontSize: size, fontWeight: 600, color, letterSpacing: -0.3 }}>ay·</span>
      <span style={{ fontFamily: T.serif, fontSize: size * 1.2, fontStyle: 'italic', color, letterSpacing: -0.5, lineHeight: 1 }}>W</span>
      <span style={{ fontFamily: T.sans, fontSize: size, fontWeight: 600, color, letterSpacing: -0.3 }}>etin</span>
    </div>
  );
}

function TabBar({ active = 'home' }) {
  const tabs = [
    { id: 'home', label: 'Listen', icon: 'listen' },
    { id: 'search', label: 'Explore', icon: 'search' },
    { id: 'history', label: 'History', icon: 'clock' },
    { id: 'me', label: 'You', icon: 'shield' },
  ];
  return (
    <div style={{
      position: 'absolute', bottom: 0, left: 0, right: 0,
      height: 86, paddingBottom: 24,
      background: 'linear-gradient(180deg, rgba(10,10,15,0) 0%, rgba(10,10,15,.85) 40%, ' + T.obsidian + ' 100%)',
      display: 'flex', alignItems: 'flex-start', justifyContent: 'space-around',
      paddingTop: 10, zIndex: 5,
    }}>
      {tabs.map(t => (
        <div key={t.id} style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
          color: active === t.id ? T.paper : T.paperDim, width: 64,
        }}>
          <SWIcon name={t.icon} size={20} sw={active === t.id ? 1.8 : 1.4} />
          <span style={{ fontFamily: T.sans, fontSize: 10, fontWeight: 500, letterSpacing: 0.1 }}>{t.label}</span>
        </div>
      ))}
    </div>
  );
}

// Frame wrapper — 390x812 inner area (iOS content area inside IOSDevice bezel)
function Screen({ children, bg = T.obsidian, statusDark = true }) {
  return (
    <div style={{
      width: '100%', height: '100%', background: bg, position: 'relative',
      overflow: 'hidden', fontFamily: T.sans, color: T.paper,
    }}>
      {children}
    </div>
  );
}

// Subtle obsidian vignette + violet glow
function AmbientBg({ intensity = 1, hue = 272 }) {
  return (
    <>
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: `radial-gradient(90% 60% at 50% 0%, oklch(0.3 0.18 ${hue} / ${0.35 * intensity}) 0%, transparent 60%)`,
      }} />
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none', opacity: 0.4,
        backgroundImage: 'radial-gradient(rgba(255,255,255,.04) 1px, transparent 1px)',
        backgroundSize: '3px 3px',
      }} />
    </>
  );
}

// ─── A. HOME ───────────────────────────────────────────────────
function ScreenHome() {
  return (
    <Screen>
      <AmbientBg />
      {/* Header */}
      <div style={{ padding: '58px 20px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Wordmark size={15} />
        <div style={{ width: 36, height: 36, borderRadius: 18, background: 'rgba(255,255,255,.06)', border: '0.5px solid ' + T.line2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <SWIcon name="more" size={16} stroke={T.paperMute} />
        </div>
      </div>

      {/* Greeting */}
      <div style={{ padding: '28px 20px 0' }}>
        <div style={{ fontFamily: T.sans, fontSize: 11, letterSpacing: 1.4, color: T.paperDim, textTransform: 'uppercase', marginBottom: 10 }}>Wednesday · Lagos</div>
        <div style={{ fontFamily: T.serif, fontSize: 38, lineHeight: 1.05, letterSpacing: -1, color: T.paper }}>
          What's playing,<br/>
          <span style={{ fontStyle: 'italic', color: '#B5A8FF' }}>wetin dem dey talk?</span>
        </div>
      </div>

      {/* Listen CTA — big pressable disc */}
      <div style={{ display: 'flex', justifyContent: 'center', marginTop: 36, position: 'relative' }}>
        <div style={{ position: 'absolute', width: 240, height: 240, borderRadius: '50%', background: `radial-gradient(circle, ${T.violet} 0%, transparent 60%)`, opacity: 0.25, filter: 'blur(28px)' }} />
        <div style={{
          width: 168, height: 168, borderRadius: '50%', position: 'relative',
          background: `radial-gradient(circle at 30% 30%, #A89AFF 0%, ${T.violet} 45%, ${T.violetDim} 100%)`,
          boxShadow: `0 24px 60px -10px ${T.violet}80, inset 0 -12px 24px rgba(0,0,0,.35), inset 0 2px 4px rgba(255,255,255,.35)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 6,
        }}>
          <SWIcon name="mic" size={46} stroke={T.obsidian} sw={1.3} />
          <div style={{ fontFamily: T.serif, fontSize: 19, color: T.obsidian, fontStyle: 'italic' }}>Listen</div>
        </div>
      </div>

      <div style={{ textAlign: 'center', marginTop: 18, fontFamily: T.sans, fontSize: 12, color: T.paperMute }}>
        Tap to identify what's playing around you
      </div>

      {/* Search row */}
      <div style={{ margin: '26px 20px 0', padding: '14px 16px', borderRadius: 14, background: 'rgba(255,255,255,.04)', border: '0.5px solid ' + T.line, display: 'flex', alignItems: 'center', gap: 10 }}>
        <SWIcon name="search" size={16} stroke={T.paperMute} />
        <span style={{ fontFamily: T.sans, fontSize: 14, color: T.paperMute }}>Search a lyric, slang, or artist</span>
      </div>

      {/* Recent listens */}
      <div style={{ padding: '22px 20px 0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 }}>
          <div style={{ fontFamily: T.sans, fontSize: 11, letterSpacing: 1.4, color: T.paperDim, textTransform: 'uppercase' }}>Recent</div>
          <div style={{ fontFamily: T.sans, fontSize: 11, color: T.violet }}>See all</div>
        </div>
        {[
          { t: 'No Wahala', a: 'Ajebo Hustlers', snip: '"everything don cast"', seed: 0 },
          { t: 'Calm Down', a: 'Rema', snip: '"baby calm down, calm down"', seed: 1 },
          { t: 'Ojuelegba', a: 'Wizkid', snip: '"my people dem no dey carry last"', seed: 2 },
        ].map((r, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: i < 2 ? '0.5px solid ' + T.line : 'none' }}>
            <AlbumArt size={44} seed={r.seed} caption="" radius={8} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 500, color: T.paper }}>{r.t}</div>
              <div style={{ fontSize: 11, color: T.paperMute, fontFamily: T.mono, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.snip}</div>
            </div>
            <SWIcon name="chevron" size={14} stroke={T.paperDim} />
          </div>
        ))}
      </div>

      <TabBar active="home" />
    </Screen>
  );
}

// ─── B. LISTENING STATE ────────────────────────────────────────
function ScreenListening() {
  return (
    <Screen>
      <AmbientBg intensity={1.6} />
      {/* Top nav */}
      <div style={{ padding: '58px 20px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <SWIcon name="close" size={20} stroke={T.paperMute} />
        <div style={{ fontFamily: T.mono, fontSize: 10, letterSpacing: 2, color: T.paperDim, textTransform: 'uppercase' }}>· listening ·</div>
        <div style={{ width: 20 }} />
      </div>

      {/* Pulsing rings */}
      <div style={{ position: 'relative', height: 360, display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 60 }}>
        {[0, 1, 2, 3].map(i => (
          <div key={i} style={{
            position: 'absolute', width: 180 + i * 50, height: 180 + i * 50,
            borderRadius: '50%', border: `1px solid ${T.violet}`,
            opacity: 0.35 - i * 0.07,
            animation: `sw-ring 3s ${i * 0.6}s infinite cubic-bezier(.2,.8,.2,1)`,
          }} />
        ))}
        <div style={{
          width: 160, height: 160, borderRadius: '50%',
          background: `radial-gradient(circle at 30% 30%, #A89AFF 0%, ${T.violet} 50%, ${T.violetDim} 100%)`,
          boxShadow: `0 0 80px 10px ${T.violet}60`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          animation: 'sw-pulse 1.4s ease-in-out infinite',
        }}>
          {/* Equalizer bars */}
          <div style={{ display: 'flex', gap: 5, alignItems: 'center', height: 56 }}>
            {[0.7, 1, 0.5, 0.85, 0.6, 0.9, 0.55].map((h, i) => (
              <div key={i} style={{
                width: 4, height: 44 * h, borderRadius: 2, background: T.obsidian,
                transformOrigin: 'center', animation: `sw-bar ${0.6 + i * 0.1}s ${i * 0.05}s ease-in-out infinite`,
              }} />
            ))}
          </div>
        </div>
      </div>

      {/* Big serif */}
      <div style={{ position: 'absolute', bottom: 220, left: 0, right: 0, textAlign: 'center', padding: '0 24px' }}>
        <div style={{ fontFamily: T.serif, fontSize: 42, fontStyle: 'italic', lineHeight: 1, letterSpacing: -1, color: T.paper }}>Listening…</div>
        <div style={{ marginTop: 12, fontFamily: T.sans, fontSize: 13, color: T.paperMute, letterSpacing: 0.2 }}>
          Hold your phone close to the sound
        </div>
      </div>

      {/* Live waveform */}
      <div style={{ position: 'absolute', bottom: 150, left: 32, right: 32, height: 40, display: 'flex', gap: 2, alignItems: 'center', justifyContent: 'center' }}>
        {Array.from({ length: 48 }).map((_, i) => {
          const h = 4 + Math.abs(Math.sin(i * 0.7)) * 28 + Math.random() * 4;
          return (
            <div key={i} style={{
              width: 2, height: h, borderRadius: 1,
              background: `linear-gradient(180deg, ${T.violet}, ${T.violet}80)`,
              animation: `sw-bar ${0.4 + (i % 5) * 0.1}s ${(i % 7) * 0.05}s ease-in-out infinite`,
              transformOrigin: 'center',
            }}/>
          );
        })}
      </div>

      {/* Cancel button */}
      <div style={{ position: 'absolute', bottom: 76, left: 0, right: 0, display: 'flex', justifyContent: 'center' }}>
        <div style={{
          padding: '12px 24px', borderRadius: 999,
          background: 'rgba(255,255,255,.05)', border: '0.5px solid ' + T.line2,
          fontFamily: T.sans, fontSize: 14, color: T.paperMute,
        }}>Cancel</div>
      </div>
    </Screen>
  );
}

// ─── C. MATCHING STATE ─────────────────────────────────────────
function ScreenMatching() {
  return (
    <Screen>
      <AmbientBg intensity={1.2} />
      <div style={{ padding: '58px 20px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <SWIcon name="close" size={20} stroke={T.paperMute} />
        <div style={{ fontFamily: T.mono, fontSize: 10, letterSpacing: 2, color: T.paperDim, textTransform: 'uppercase' }}>· matching ·</div>
        <div style={{ width: 20 }} />
      </div>

      {/* Orbiting fingerprint */}
      <div style={{ position: 'relative', marginTop: 80, height: 240, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{
          width: 200, height: 200, borderRadius: '50%', border: `1px dashed ${T.violetEdge}`,
          animation: 'sw-orbit 12s linear infinite', position: 'absolute',
        }}>
          <div style={{ position: 'absolute', top: -5, left: '50%', width: 10, height: 10, borderRadius: '50%', background: T.violet, boxShadow: `0 0 16px ${T.violet}` }} />
        </div>
        <div style={{
          width: 140, height: 140, borderRadius: '50%',
          background: `conic-gradient(from 0deg, ${T.violet}, transparent 70%, ${T.violet})`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          animation: 'sw-orbit 2.4s linear infinite',
        }}>
          <div style={{ width: 128, height: 128, borderRadius: '50%', background: T.obsidian2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {/* stacked arcs — fingerprint motif */}
            <svg width="58" height="58" viewBox="0 0 58 58" fill="none" stroke={T.violet} strokeWidth="1.5" strokeLinecap="round">
              <path d="M29 8c11.6 0 21 9.4 21 21"/>
              <path d="M29 16c7.2 0 13 5.8 13 13"/>
              <path d="M29 24c2.8 0 5 2.2 5 5"/>
              <path d="M29 8c-11.6 0-21 9.4-21 21"/>
              <path d="M29 16c-7.2 0-13 5.8-13 13"/>
              <path d="M29 24c-2.8 0-5 2.2-5 5"/>
              <path d="M8 29c0 11.6 9.4 21 21 21s21-9.4 21-21"/>
            </svg>
          </div>
        </div>
      </div>

      {/* Pipeline ticks */}
      <div style={{ margin: '40px 36px 0' }}>
        <div style={{ fontFamily: T.serif, fontSize: 34, fontStyle: 'italic', textAlign: 'center', letterSpacing: -0.6, lineHeight: 1.1 }}>
          Matching the sound…
        </div>
        <div style={{ marginTop: 26, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[
            { s: 'done', l: 'Captured 6.2s of audio', m: '0.3s' },
            { s: 'done', l: 'Fingerprint extracted', m: '0.1s' },
            { s: 'active', l: 'Searching 40M+ tracks', m: '…' },
            { s: 'pending', l: 'Verifying confidence', m: '' },
          ].map((st, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 13 }}>
              <div style={{
                width: 14, height: 14, borderRadius: '50%',
                background: st.s === 'done' ? T.mint : st.s === 'active' ? T.violet : 'transparent',
                border: st.s === 'pending' ? `1px dashed ${T.paperFaint}` : 'none',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: st.s === 'active' ? `0 0 12px ${T.violet}` : 'none',
                animation: st.s === 'active' ? 'sw-pulse 1.2s ease-in-out infinite' : '',
              }}>
                {st.s === 'done' && <SWIcon name="check" size={10} stroke={T.obsidian} sw={2.4}/>}
              </div>
              <span style={{ flex: 1, color: st.s === 'pending' ? T.paperDim : T.paper, fontFamily: T.sans }}>{st.l}</span>
              <span style={{ fontFamily: T.mono, fontSize: 10, color: T.paperDim }}>{st.m}</span>
            </div>
          ))}
        </div>
      </div>
    </Screen>
  );
}

// ─── D. SONG RESULT ────────────────────────────────────────────
function ScreenResult() {
  return (
    <Screen>
      <AmbientBg intensity={0.8} hue={258} />
      {/* Header */}
      <div style={{ padding: '58px 20px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <SWIcon name="chevron" size={20} stroke={T.paperMute} style={{ transform: 'rotate(180deg)' }} />
        <div style={{ fontFamily: T.mono, fontSize: 10, letterSpacing: 2, color: T.paperDim, textTransform: 'uppercase' }}>matched in 1.4s</div>
        <SWIcon name="more" size={20} stroke={T.paperMute} />
      </div>

      {/* Cover */}
      <div style={{ padding: '26px 20px 0', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={{ position: 'relative' }}>
          <div style={{ position: 'absolute', inset: -20, borderRadius: 24, background: `radial-gradient(circle, ${T.violet}60, transparent 70%)`, filter: 'blur(20px)' }}/>
          <AlbumArt size={168} seed={0} caption="album art" radius={16} />
        </div>
        <div style={{ marginTop: 22, textAlign: 'center' }}>
          <Chip tone="mint"><span style={{width:5,height:5,borderRadius:5,background:T.mint,display:'inline-block'}}/>98% match</Chip>
        </div>
        <div style={{ fontFamily: T.serif, fontSize: 34, letterSpacing: -0.5, marginTop: 14, lineHeight: 1 }}>No Wahala</div>
        <div style={{ fontFamily: T.sans, fontSize: 14, color: T.paperMute, marginTop: 6 }}>Ajebo Hustlers · 2021</div>
      </div>

      {/* Lyric snippet card */}
      <div style={{ margin: '22px 20px 0', padding: 18, borderRadius: 16, background: 'linear-gradient(180deg, rgba(139,124,246,.08), rgba(139,124,246,.02))', border: '0.5px solid ' + T.violetEdge, position: 'relative' }}>
        <div style={{ position: 'absolute', top: -8, left: 16, fontFamily: T.mono, fontSize: 9, letterSpacing: 1.4, textTransform: 'uppercase', color: T.violet, background: T.obsidian, padding: '2px 6px' }}>
          playing now · 1:24
        </div>
        <div style={{ fontFamily: T.serif, fontSize: 20, lineHeight: 1.35, letterSpacing: -0.2, fontStyle: 'italic' }}>
          "<span style={{ color: T.paper }}>No wahala, no wahala o —</span><br/>
          <span style={{ color: T.paper, background: 'linear-gradient(90deg, rgba(139,124,246,.35), rgba(139,124,246,.12))', padding: '2px 4px', borderRadius: 4 }}>everything don cast</span>, <span style={{ color: T.paperMute }}>my people dey shine."</span>
        </div>
        <div style={{ marginTop: 12, display: 'flex', gap: 6 }}>
          <Chip tone="violet">3 cultural references</Chip>
          <Chip tone="mute">Pidgin</Chip>
        </div>
      </div>

      {/* CTA */}
      <div style={{ position: 'absolute', bottom: 44, left: 20, right: 20 }}>
        <div style={{
          height: 56, borderRadius: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
          background: T.paper, color: T.obsidian, boxShadow: `0 14px 40px -10px ${T.violet}80`,
        }}>
          <SWIcon name="sparkle" size={18} stroke={T.obsidian} sw={1.8} />
          <span style={{ fontFamily: T.sans, fontWeight: 600, fontSize: 15 }}>Understand this line</span>
        </div>
        <div style={{ textAlign: 'center', marginTop: 10, fontFamily: T.sans, fontSize: 11, color: T.paperMute }}>
          Tap any lyric above to explain it
        </div>
      </div>
    </Screen>
  );
}

// ─── E. MEANING ────────────────────────────────────────────────
function ScreenMeaning() {
  return (
    <Screen>
      {/* Header */}
      <div style={{ padding: '58px 20px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '0.5px solid ' + T.line }}>
        <SWIcon name="chevron" size={20} stroke={T.paperMute} style={{ transform: 'rotate(180deg)' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <AlbumArt size={22} seed={0} caption="" radius={4} />
          <div style={{ fontFamily: T.sans, fontSize: 12, color: T.paperMute }}>No Wahala</div>
        </div>
        <SWIcon name="heart" size={18} stroke={T.paperMute} />
      </div>

      {/* The phrase — editorial */}
      <div style={{ padding: '28px 20px 0' }}>
        <div style={{ fontFamily: T.mono, fontSize: 10, letterSpacing: 1.6, color: T.violet, textTransform: 'uppercase', marginBottom: 10 }}>The line</div>
        <div style={{ fontFamily: T.serif, fontSize: 30, lineHeight: 1.15, letterSpacing: -0.6, fontStyle: 'italic' }}>
          "everything don cast"
        </div>
        <div style={{ marginTop: 10, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <Chip tone="mute">Pidgin</Chip>
          <Chip tone="mute">South-South</Chip>
          <Chip tone="violet">Cultural idiom</Chip>
        </div>
      </div>

      {/* Two-column split: Literal vs Cultural */}
      <div style={{ padding: '26px 20px 0', display: 'grid', gridTemplateColumns: '1fr', gap: 14 }}>
        <div style={{ padding: 16, borderRadius: 14, background: 'rgba(255,255,255,.03)', border: '0.5px solid ' + T.line }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <div style={{ width: 18, height: 18, borderRadius: 4, background: 'rgba(255,255,255,.06)', display:'flex',alignItems:'center',justifyContent:'center' }}>
              <span style={{ fontFamily: T.mono, fontSize: 10, color: T.paperMute }}>A</span>
            </div>
            <div style={{ fontFamily: T.sans, fontSize: 11, color: T.paperMute, letterSpacing: 1.2, textTransform: 'uppercase' }}>Literal</div>
          </div>
          <div style={{ fontFamily: T.serif, fontSize: 17, lineHeight: 1.4, color: T.paper }}>
            Everything has been <em>exposed</em> or <em>thrown open</em> — as if a net was cast and pulled in everything at once.
          </div>
        </div>

        <div style={{ padding: 16, borderRadius: 14, background: `linear-gradient(180deg, ${T.violetWash}, rgba(139,124,246,.03))`, border: '0.5px solid ' + T.violetEdge }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <div style={{ width: 18, height: 18, borderRadius: 4, background: T.violet, display:'flex',alignItems:'center',justifyContent:'center' }}>
              <span style={{ fontFamily: T.mono, fontSize: 10, color: T.obsidian, fontWeight: 600 }}>B</span>
            </div>
            <div style={{ fontFamily: T.sans, fontSize: 11, color: T.violet, letterSpacing: 1.2, textTransform: 'uppercase' }}>Cultural meaning</div>
          </div>
          <div style={{ fontFamily: T.serif, fontSize: 17, lineHeight: 1.4, color: T.paper }}>
            "Everything don cast" means <em>the situation has fallen apart</em> — secrets are out, plans have collapsed, and there's no going back. Often said with wry acceptance, not panic.
          </div>
        </div>
      </div>

      {/* Confidence */}
      <div style={{ margin: '20px 20px 0', padding: '14px 16px', borderRadius: 12, background: 'rgba(255,255,255,.03)', border: '0.5px solid ' + T.line, display: 'flex', alignItems: 'center', gap: 12 }}>
        <SWIcon name="shield" size={18} stroke={T.mint} />
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: T.sans, fontSize: 12, color: T.paper }}>High confidence · reviewed by 2 editors</div>
          <div style={{ height: 3, borderRadius: 2, background: 'rgba(255,255,255,.06)', marginTop: 6, overflow: 'hidden' }}>
            <div style={{ width: '92%', height: '100%', background: T.mint }} />
          </div>
        </div>
        <span style={{ fontFamily: T.mono, fontSize: 11, color: T.mint }}>92</span>
      </div>

      {/* Bottom actions */}
      <div style={{ position: 'absolute', bottom: 32, left: 20, right: 20, display: 'flex', gap: 10 }}>
        <div style={{ flex: 1, height: 48, borderRadius: 12, background: 'rgba(255,255,255,.06)', border: '0.5px solid ' + T.line2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, color: T.paper, fontSize: 13, fontWeight: 500 }}>
          <SWIcon name="layers" size={16} stroke={T.paper} />
          Go deeper
        </div>
        <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(255,255,255,.06)', border: '0.5px solid ' + T.line2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <SWIcon name="flag" size={16} stroke={T.paperMute} />
        </div>
      </div>
    </Screen>
  );
}

// ─── F. DEEPER CONTEXT ─────────────────────────────────────────
function ScreenDeeper() {
  return (
    <Screen>
      <div style={{ padding: '58px 20px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '0.5px solid ' + T.line }}>
        <SWIcon name="chevron" size={20} stroke={T.paperMute} style={{ transform: 'rotate(180deg)' }} />
        <div style={{ fontFamily: T.mono, fontSize: 10, letterSpacing: 1.6, color: T.paperDim, textTransform: 'uppercase' }}>Deeper context</div>
        <SWIcon name="more" size={18} stroke={T.paperMute} />
      </div>

      <div style={{ padding: '22px 20px 120px', overflowY: 'auto', height: 'calc(100% - 96px)' }}>
        {/* Phrase header */}
        <div style={{ fontFamily: T.serif, fontSize: 26, lineHeight: 1.15, fontStyle: 'italic', letterSpacing: -0.4 }}>
          "everything don cast"
        </div>

        {/* Region + tone grid */}
        <div style={{ marginTop: 20, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div style={{ padding: 14, borderRadius: 12, background: 'rgba(255,255,255,.03)', border: '0.5px solid ' + T.line }}>
            <div style={{ fontFamily: T.mono, fontSize: 9, letterSpacing: 1.2, color: T.paperDim, textTransform: 'uppercase' }}>Region</div>
            <div style={{ fontFamily: T.serif, fontSize: 16, marginTop: 6 }}>South-South</div>
            <div style={{ fontSize: 11, color: T.paperMute, marginTop: 2 }}>Port Harcourt origin</div>
          </div>
          <div style={{ padding: 14, borderRadius: 12, background: 'rgba(255,255,255,.03)', border: '0.5px solid ' + T.line }}>
            <div style={{ fontFamily: T.mono, fontSize: 9, letterSpacing: 1.2, color: T.paperDim, textTransform: 'uppercase' }}>Tone</div>
            <div style={{ fontFamily: T.serif, fontSize: 16, marginTop: 6 }}>Resigned, wry</div>
            <div style={{ fontSize: 11, color: T.paperMute, marginTop: 2 }}>Not angry</div>
          </div>
        </div>

        {/* Breakdown */}
        <div style={{ marginTop: 22 }}>
          <div style={{ fontFamily: T.mono, fontSize: 10, letterSpacing: 1.4, color: T.paperDim, textTransform: 'uppercase', marginBottom: 10 }}>Word-by-word</div>
          {[
            { w: 'everything', m: 'all things / the whole situation' },
            { w: 'don', m: 'has (perfective marker — completed action)' },
            { w: 'cast', m: 'been exposed, revealed, or fallen apart' },
          ].map((r, i) => (
            <div key={i} style={{ padding: '12px 0', borderBottom: i < 2 ? '0.5px solid ' + T.line : 'none', display: 'flex', gap: 14 }}>
              <div style={{ fontFamily: T.serif, fontSize: 18, fontStyle: 'italic', color: T.violet, minWidth: 96 }}>{r.w}</div>
              <div style={{ fontSize: 13, color: T.paper, lineHeight: 1.4 }}>{r.m}</div>
            </div>
          ))}
        </div>

        {/* Related */}
        <div style={{ marginTop: 22 }}>
          <div style={{ fontFamily: T.mono, fontSize: 10, letterSpacing: 1.4, color: T.paperDim, textTransform: 'uppercase', marginBottom: 10 }}>Related expressions</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {['e don red', 'case don enter', 'the gist don burst', 'matter don scatter', 'na wa o'].map(s => (
              <div key={s} style={{ padding: '8px 12px', borderRadius: 10, background: 'rgba(255,255,255,.04)', border: '0.5px solid ' + T.line, fontFamily: T.serif, fontStyle: 'italic', fontSize: 14 }}>
                "{s}"
              </div>
            ))}
          </div>
        </div>

        {/* Heard in */}
        <div style={{ marginTop: 22 }}>
          <div style={{ fontFamily: T.mono, fontSize: 10, letterSpacing: 1.4, color: T.paperDim, textTransform: 'uppercase', marginBottom: 10 }}>Also heard in</div>
          {[
            { t: 'Joha', a: 'Ajebo Hustlers', y: '2020' },
            { t: 'Koroba', a: 'Tiwa Savage', y: '2020' },
          ].map((r, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0' }}>
              <AlbumArt size={36} seed={i + 3} caption="" radius={6} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 500 }}>{r.t}</div>
                <div style={{ fontSize: 11, color: T.paperMute }}>{r.a} · {r.y}</div>
              </div>
              <SWIcon name="play" size={14} stroke={T.paperMute} />
            </div>
          ))}
        </div>
      </div>
    </Screen>
  );
}

// ─── G. LOW CONFIDENCE / AMBIGUOUS ─────────────────────────────
function ScreenAmbiguous() {
  return (
    <Screen>
      <div style={{ padding: '58px 20px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '0.5px solid ' + T.line }}>
        <SWIcon name="chevron" size={20} stroke={T.paperMute} style={{ transform: 'rotate(180deg)' }} />
        <div style={{ fontFamily: T.mono, fontSize: 10, letterSpacing: 1.6, color: T.paperDim, textTransform: 'uppercase' }}>Meaning</div>
        <div style={{ width: 20 }}/>
      </div>

      <div style={{ padding: '24px 20px 0' }}>
        <div style={{ fontFamily: T.mono, fontSize: 10, letterSpacing: 1.6, color: T.amber, textTransform: 'uppercase', marginBottom: 8 }}>The line</div>
        <div style={{ fontFamily: T.serif, fontSize: 26, lineHeight: 1.15, letterSpacing: -0.4, fontStyle: 'italic' }}>
          "she dey do like say she sabi"
        </div>

        {/* Honest fallback card */}
        <div style={{ marginTop: 22, padding: 18, borderRadius: 14, background: 'rgba(232,184,76,.06)', border: '0.5px dashed rgba(232,184,76,.4)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <SWIcon name="info" size={18} stroke={T.amber} />
            <div style={{ fontFamily: T.sans, fontSize: 13, fontWeight: 600, color: T.amber }}>This one has nuance</div>
          </div>
          <div style={{ fontFamily: T.serif, fontSize: 17, lineHeight: 1.45 }}>
            The meaning depends on tone and who's speaking. We're showing the two most likely readings — one is usually the right fit.
          </div>
          <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ flex: 1, height: 4, borderRadius: 3, background: 'rgba(255,255,255,.06)', overflow: 'hidden', display: 'flex' }}>
              <div style={{ width: '55%', background: T.amber }} />
              <div style={{ width: '38%', background: T.violet, opacity: 0.7 }} />
            </div>
            <span style={{ fontFamily: T.mono, fontSize: 10, color: T.paperMute }}>55 · 38</span>
          </div>
        </div>

        {/* Two interpretations */}
        <div style={{ marginTop: 18, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[
            { pct: 55, label: 'Most likely', tone: 'amber', title: 'She is pretending to know / faking expertise',
              body: 'Dismissive or playful — calling out someone who is putting on airs about a subject.' },
            { pct: 38, label: 'Alternate', tone: 'violet', title: 'She is acting like she understands the situation',
              body: 'Neutral or mildly sympathetic — said about someone who has read the room.' },
          ].map((i, idx) => (
            <div key={idx} style={{ padding: 14, borderRadius: 12, background: 'rgba(255,255,255,.03)', border: '0.5px solid ' + T.line }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 6 }}>
                <span style={{ fontFamily: T.mono, fontSize: 18, color: i.tone === 'amber' ? T.amber : T.violet, fontWeight: 500 }}>{i.pct}%</span>
                <span style={{ fontFamily: T.sans, fontSize: 10, letterSpacing: 1.2, color: T.paperDim, textTransform: 'uppercase' }}>{i.label}</span>
              </div>
              <div style={{ fontFamily: T.serif, fontSize: 17, lineHeight: 1.3, marginBottom: 6 }}>{i.title}</div>
              <div style={{ fontSize: 12, color: T.paperMute, lineHeight: 1.5 }}>{i.body}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ position: 'absolute', bottom: 32, left: 20, right: 20, display: 'flex', gap: 10 }}>
        <div style={{ flex: 1, height: 48, borderRadius: 12, background: T.paper, color: T.obsidian, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontSize: 13, fontWeight: 600 }}>
          <SWIcon name="plus" size={16} stroke={T.obsidian} />
          Suggest the right meaning
        </div>
      </div>
    </Screen>
  );
}

// ─── H. REPORT WRONG ───────────────────────────────────────────
function ScreenReport() {
  const cats = [
    { k: 'incorrect', l: 'Incorrect meaning', d: 'The cultural meaning is wrong' },
    { k: 'incomplete', l: 'Incomplete', d: 'Missing nuance or context', active: true },
    { k: 'region', l: 'Wrong region', d: 'Attribution to the wrong area' },
    { k: 'tone', l: 'Wrong tone', d: 'Mood or intent feels off' },
    { k: 'offensive', l: 'Offensive', d: 'Explanation is harmful' },
    { k: 'other', l: 'Something else', d: 'Tell us more below' },
  ];
  return (
    <Screen>
      <div style={{ padding: '58px 20px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '0.5px solid ' + T.line }}>
        <div style={{ fontFamily: T.sans, fontSize: 14, color: T.paperMute }}>Cancel</div>
        <div style={{ fontFamily: T.sans, fontSize: 13, fontWeight: 500 }}>Report</div>
        <div style={{ fontFamily: T.sans, fontSize: 14, color: T.paperDim }}>Send</div>
      </div>

      <div style={{ padding: '24px 20px 0' }}>
        <div style={{ fontFamily: T.serif, fontSize: 28, lineHeight: 1.15, letterSpacing: -0.5 }}>
          Help us get this right.
        </div>
        <div style={{ fontFamily: T.sans, fontSize: 13, color: T.paperMute, marginTop: 8, lineHeight: 1.5 }}>
          A reviewer in Nigeria will take a look. Thank you for keeping the knowledge sharp.
        </div>

        {/* Context card */}
        <div style={{ marginTop: 20, padding: 12, borderRadius: 10, background: 'rgba(255,255,255,.03)', border: '0.5px solid ' + T.line, display: 'flex', gap: 10, alignItems: 'center' }}>
          <AlbumArt size={38} seed={0} caption="" radius={6} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 500 }}>"everything don cast"</div>
            <div style={{ fontSize: 10, color: T.paperMute, fontFamily: T.mono }}>No Wahala · Ajebo Hustlers</div>
          </div>
        </div>

        {/* Categories */}
        <div style={{ marginTop: 20, fontFamily: T.mono, fontSize: 10, letterSpacing: 1.4, color: T.paperDim, textTransform: 'uppercase', marginBottom: 10 }}>What's wrong?</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {cats.map(c => (
            <div key={c.k} style={{
              padding: '12px 14px', borderRadius: 12,
              background: c.active ? T.violetWash : 'rgba(255,255,255,.03)',
              border: '0.5px solid ' + (c.active ? T.violetEdge : T.line),
              display: 'flex', alignItems: 'center', gap: 12,
            }}>
              <div style={{
                width: 18, height: 18, borderRadius: '50%',
                border: '1.5px solid ' + (c.active ? T.violet : T.paperFaint),
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {c.active && <div style={{ width: 8, height: 8, borderRadius: 4, background: T.violet }}/>}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: T.paper }}>{c.l}</div>
                <div style={{ fontSize: 11, color: T.paperMute, marginTop: 1 }}>{c.d}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Note */}
        <div style={{ marginTop: 18, padding: 14, borderRadius: 12, background: 'rgba(255,255,255,.03)', border: '0.5px solid ' + T.line, minHeight: 80 }}>
          <div style={{ fontFamily: T.mono, fontSize: 9, letterSpacing: 1.2, color: T.paperDim, textTransform: 'uppercase', marginBottom: 6 }}>Optional note</div>
          <div style={{ fontFamily: T.serif, fontSize: 15, fontStyle: 'italic', color: T.paperMute, lineHeight: 1.4 }}>
            "It misses the part about pretending — the whole phrase turns on that…"
          </div>
        </div>
      </div>
    </Screen>
  );
}

// ─── I. SEARCH / EXPLORE ───────────────────────────────────────
function ScreenExplore() {
  const cats = [
    { t: 'Pidgin', n: 2840, c: T.violet },
    { t: 'Yoruba', n: 1920, c: T.amber },
    { t: 'Igbo', n: 1450, c: T.mint },
    { t: 'Hausa', n: 980, c: T.rose },
  ];
  return (
    <Screen>
      <div style={{ padding: '58px 20px 0' }}>
        <div style={{ fontFamily: T.serif, fontSize: 32, letterSpacing: -0.6, lineHeight: 1 }}>Explore</div>
        <div style={{ fontFamily: T.sans, fontSize: 12, color: T.paperMute, marginTop: 6 }}>
          12,840 expressions · 840 artists
        </div>

        {/* Search */}
        <div style={{ marginTop: 18, padding: '14px 16px', borderRadius: 14, background: 'rgba(255,255,255,.05)', border: '0.5px solid ' + T.line2, display: 'flex', alignItems: 'center', gap: 10 }}>
          <SWIcon name="search" size={16} stroke={T.paperMute} />
          <span style={{ fontFamily: T.serif, fontSize: 15, fontStyle: 'italic', color: T.paper }}>"wahala"</span>
          <div style={{ flex: 1 }}/>
          <div style={{ width: 1, height: 16, background: T.line }}/>
          <SWIcon name="filter" size={14} stroke={T.paperMute} />
        </div>

        {/* Category chips */}
        <div style={{ marginTop: 16, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {cats.map(c => (
            <div key={c.t} style={{ padding: 14, borderRadius: 12, background: 'rgba(255,255,255,.03)', border: '0.5px solid ' + T.line, position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', right: -10, top: -10, width: 40, height: 40, borderRadius: '50%', background: c.c, opacity: 0.15, filter: 'blur(12px)' }}/>
              <div style={{ fontFamily: T.serif, fontSize: 18, color: T.paper }}>{c.t}</div>
              <div style={{ fontFamily: T.mono, fontSize: 10, color: T.paperDim, marginTop: 2 }}>{c.n.toLocaleString()} entries</div>
            </div>
          ))}
        </div>
      </div>

      {/* Featured phrases */}
      <div style={{ padding: '22px 20px 0' }}>
        <div style={{ fontFamily: T.mono, fontSize: 10, letterSpacing: 1.4, color: T.paperDim, textTransform: 'uppercase', marginBottom: 10 }}>Featured today</div>
        {[
          { ph: 'gbas gbos', m: 'Back-and-forth drama, usually verbal', r: 'Pan-Nigerian' },
          { ph: 'e choke', m: 'Something is overwhelming (good or bad)', r: 'Youth slang' },
          { ph: 'japa', m: 'To leave the country, to flee abroad', r: 'Yoruba · Pidgin' },
        ].map((r, i) => (
          <div key={i} style={{ padding: '12px 0', borderBottom: i < 2 ? '0.5px solid ' + T.line : 'none' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
              <div style={{ fontFamily: T.serif, fontSize: 18, fontStyle: 'italic', color: T.paper }}>"{r.ph}"</div>
              <div style={{ fontFamily: T.mono, fontSize: 9, color: T.paperDim, letterSpacing: 0.8 }}>{r.r.toUpperCase()}</div>
            </div>
            <div style={{ fontSize: 12, color: T.paperMute, marginTop: 3, lineHeight: 1.4 }}>{r.m}</div>
          </div>
        ))}
      </div>

      <TabBar active="search" />
    </Screen>
  );
}

// ─── J. HISTORY ────────────────────────────────────────────────
function ScreenHistory() {
  const groups = [
    { day: 'TODAY', items: [
      { t: 'No Wahala', a: 'Ajebo Hustlers', time: '14:22', snip: '"everything don cast"', seed: 0 },
      { t: 'Calm Down', a: 'Rema', time: '11:08', snip: '"who be that fine geh"', seed: 1 },
    ]},
    { day: 'YESTERDAY', items: [
      { t: 'Essence', a: 'Wizkid ft. Tems', time: '22:41', snip: '"you don port to another network"', seed: 2 },
      { t: 'Joha', a: 'Ajebo Hustlers', time: '18:15', snip: '"case don enter"', seed: 3 },
    ]},
    { day: 'MARCH 12', items: [
      { t: 'Ojuelegba', a: 'Wizkid', time: '09:32', snip: '"shayo dey sweet"', seed: 4 },
    ]},
  ];
  return (
    <Screen>
      <div style={{ padding: '58px 20px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <div style={{ fontFamily: T.serif, fontSize: 32, letterSpacing: -0.6, lineHeight: 1 }}>History</div>
        <div style={{ fontFamily: T.sans, fontSize: 12, color: T.violet }}>Edit</div>
      </div>
      <div style={{ fontFamily: T.sans, fontSize: 12, color: T.paperMute, padding: '6px 20px 0' }}>
        38 listens · 12 saved
      </div>

      {/* Tabs */}
      <div style={{ margin: '18px 20px 0', display: 'flex', gap: 6, padding: 4, background: 'rgba(255,255,255,.04)', borderRadius: 10 }}>
        {['All', 'Songs', 'Lyrics', 'Saved'].map((t, i) => (
          <div key={t} style={{
            flex: 1, padding: '8px 0', borderRadius: 7, textAlign: 'center',
            background: i === 0 ? 'rgba(255,255,255,.08)' : 'transparent',
            fontFamily: T.sans, fontSize: 12, fontWeight: i === 0 ? 600 : 400,
            color: i === 0 ? T.paper : T.paperMute,
          }}>{t}</div>
        ))}
      </div>

      <div style={{ padding: '18px 20px 120px' }}>
        {groups.map(g => (
          <div key={g.day} style={{ marginBottom: 18 }}>
            <div style={{ fontFamily: T.mono, fontSize: 10, letterSpacing: 1.6, color: T.paperDim, marginBottom: 8 }}>{g.day}</div>
            {g.items.map((r, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: i < g.items.length - 1 ? '0.5px solid ' + T.line : 'none' }}>
                <AlbumArt size={40} seed={r.seed} caption="" radius={7} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>{r.t}</div>
                    <div style={{ fontFamily: T.mono, fontSize: 10, color: T.paperDim }}>{r.time}</div>
                  </div>
                  <div style={{ fontSize: 11, color: T.paperMute, marginTop: 1 }}>{r.a}</div>
                  <div style={{ fontFamily: T.serif, fontStyle: 'italic', fontSize: 13, color: T.paperMute, marginTop: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.snip}</div>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>

      <TabBar active="history" />
    </Screen>
  );
}

Object.assign(window, {
  ScreenHome, ScreenListening, ScreenMatching, ScreenResult,
  ScreenMeaning, ScreenDeeper, ScreenAmbiguous, ScreenReport,
  ScreenExplore, ScreenHistory,
});
