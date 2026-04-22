// live-lyrics.jsx — Live Lyrics Follow module (mobile)
// 3 screens: Live Active, Tap-to-Explain sheet, Meaning-First Detail
// Plus a MiniPlayer component that can overlay other screens.

const LT = window.SW_TOKENS;

// Shared chip — matches mobile-screens.jsx style
function LLChip({ children, tone = 'violet', size = 'sm' }) {
  const map = {
    violet: { bg: LT.violetWash, fg: '#CFC6FF', br: LT.violetEdge },
    mute:   { bg: 'rgba(255,255,255,.04)', fg: LT.paperMute, br: LT.line },
    amber:  { bg: 'rgba(232,184,76,.12)', fg: LT.amber, br: 'rgba(232,184,76,.32)' },
    mint:   { bg: 'rgba(122,214,165,.12)', fg: LT.mint, br: 'rgba(122,214,165,.3)' },
  }[tone];
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      fontFamily: LT.sans, fontSize: size === 'xs' ? 10 : 11, fontWeight: 500, letterSpacing: 0.2,
      padding: size === 'xs' ? '3px 7px' : '4px 9px',
      borderRadius: 999, color: map.fg, background: map.bg,
      border: `0.5px solid ${map.br}`,
    }}>{children}</span>
  );
}

// Live Indicator — pulsing dot + LIVE text
function LiveIndicator() {
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 999, background: 'rgba(255,255,255,.05)', border: '0.5px solid ' + LT.line2 }}>
      <span style={{ width: 6, height: 6, borderRadius: 3, background: LT.mint, boxShadow: `0 0 8px ${LT.mint}`, animation: 'sw-pulse 1.2s ease-in-out infinite' }}/>
      <span style={{ fontFamily: LT.mono, fontSize: 9, letterSpacing: 1.6, color: LT.paper, textTransform: 'uppercase' }}>Live</span>
    </div>
  );
}

// Progress bar — song playhead
function SongProgress({ pct = 40, cur = '1:24', tot = '3:12' }) {
  return (
    <div>
      <div style={{ height: 2, borderRadius: 1, background: 'rgba(255,255,255,.08)', overflow: 'hidden' }}>
        <div style={{ width: pct + '%', height: '100%', background: `linear-gradient(90deg, ${LT.violet}, #B5A8FF)`, boxShadow: `0 0 8px ${LT.violet}` }}/>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontFamily: LT.mono, fontSize: 10, color: LT.paperDim }}>
        <span>{cur}</span>
        <span>{tot}</span>
      </div>
    </div>
  );
}

// ─── 1. LIVE LYRICS ACTIVE ─────────────────────────────────────
// Uses an inline syncWarn prop to show Low Sync Confidence state (same screen).
// Uses noLyrics prop to show No Lyrics Available fallback.
function ScreenLiveLyrics({ syncWarn = false, noLyrics = false }) {
  // Lyric lines — current at index 2
  const lines = [
    { t: "baby calm down, calm down", passed: true },
    { t: "girl, wetin dey worry you", passed: true },
    { t: "everything don cast, my people dey shine", current: true, tappable: true },
    { t: "no wahala, no wahala o", upcoming: true },
    { t: "shayo dey sweet for Lagos tonight", upcoming: true },
    { t: "we dey shekpe till the sun come up", upcoming: true, tappable: true },
  ];

  return (
    <div style={{ width: '100%', height: '100%', background: LT.obsidian, position: 'relative', overflow: 'hidden', fontFamily: LT.sans, color: LT.paper }}>
      {/* Ambient glow */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: `radial-gradient(80% 50% at 50% 30%, ${LT.violetWash}, transparent 70%)` }}/>
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', opacity: 0.4, backgroundImage: 'radial-gradient(rgba(255,255,255,.04) 1px, transparent 1px)', backgroundSize: '3px 3px' }}/>

      {/* Top — song chip + live */}
      <div style={{ padding: '58px 20px 0', display: 'flex', alignItems: 'center', gap: 10 }}>
        <SWIcon name="chevronDown" size={20} stroke={LT.paperMute}/>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 10 }}>
          <AlbumArt size={32} seed={1} caption="" radius={6}/>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Calm Down</div>
            <div style={{ fontSize: 10, color: LT.paperMute, fontFamily: LT.mono, letterSpacing: 0.4 }}>Rema · Rave &amp; Roses</div>
          </div>
          <LiveIndicator/>
        </div>
      </div>

      {/* Inline sync warning (same screen, not a new page) */}
      {syncWarn && (
        <div style={{ margin: '14px 20px 0', padding: '10px 14px', borderRadius: 10, background: 'rgba(232,184,76,.08)', border: '0.5px dashed rgba(232,184,76,.4)', display: 'flex', alignItems: 'center', gap: 10 }}>
          <SWIcon name="info" size={14} stroke={LT.amber}/>
          <div style={{ flex: 1, fontSize: 11, color: LT.paper, lineHeight: 1.4 }}>
            Sync may be slightly off. We&apos;re following, but not fully sure.
          </div>
          <div style={{ fontFamily: LT.mono, fontSize: 10, color: LT.amber, textTransform: 'uppercase', letterSpacing: 1 }}>Re-sync</div>
        </div>
      )}

      {/* Lyric stream */}
      {!noLyrics ? (
        <div style={{ position: 'absolute', top: 150, left: 0, right: 0, bottom: 180, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '0 28px', overflow: 'hidden' }}>
          {/* Top + bottom fade masks */}
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 60, background: `linear-gradient(180deg, ${LT.obsidian} 0%, transparent 100%)`, pointerEvents: 'none', zIndex: 2 }}/>
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 60, background: `linear-gradient(0deg, ${LT.obsidian} 0%, transparent 100%)`, pointerEvents: 'none', zIndex: 2 }}/>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
            {lines.map((l, i) => {
              const isCurrent = l.current;
              const isPassed = l.passed;
              return (
                <div key={i} style={{
                  fontFamily: LT.serif,
                  fontSize: isCurrent ? 28 : 22,
                  lineHeight: 1.2,
                  letterSpacing: -0.3,
                  color: isCurrent ? LT.paper : isPassed ? LT.paperFaint : LT.paperMute,
                  opacity: isCurrent ? 1 : 0.75,
                  fontStyle: isCurrent ? 'italic' : 'normal',
                  position: 'relative',
                  paddingLeft: l.tappable ? 12 : 0,
                  transition: 'all .4s cubic-bezier(.2,.7,.3,1)',
                }}>
                  {isCurrent && (
                    <div style={{
                      position: 'absolute', left: -4, top: 6, bottom: 6, width: 3, borderRadius: 2,
                      background: LT.violet, boxShadow: `0 0 16px ${LT.violet}`,
                    }}/>
                  )}
                  {l.t}
                  {l.tappable && !isPassed && (
                    <span style={{
                      display: 'inline-flex', marginLeft: 8, verticalAlign: 'middle',
                      width: 18, height: 18, borderRadius: 9,
                      background: isCurrent ? LT.violet : 'rgba(255,255,255,.06)',
                      border: '0.5px solid ' + (isCurrent ? 'transparent' : LT.line2),
                      alignItems: 'center', justifyContent: 'center',
                    }}>
                      <SWIcon name="sparkle" size={10} stroke={isCurrent ? LT.obsidian : LT.paperMute} sw={2}/>
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        // No Lyrics Available — elegant fallback, same screen pattern
        <div style={{ position: 'absolute', top: 150, left: 0, right: 0, bottom: 180, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '0 28px' }}>
          <div style={{ fontFamily: LT.mono, fontSize: 10, letterSpacing: 1.6, color: LT.amber, textTransform: 'uppercase', marginBottom: 10 }}>No synced lyrics · yet</div>
          <div style={{ fontFamily: LT.serif, fontStyle: 'italic', fontSize: 32, lineHeight: 1.15, letterSpacing: -0.6 }}>
            We hear the song —<br/>
            <span style={{ color: LT.paperMute }}>but the lyrics never dropped in our library.</span>
          </div>
          <div style={{ fontSize: 13, color: LT.paperMute, marginTop: 14, lineHeight: 1.5 }}>
            Explore the vibe instead. Search a line you remember, or dive into Rema&apos;s slang footprint.
          </div>
          <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[
              { l: 'Understand the vibe', i: 'sparkle', primary: true },
              { l: 'Artist · Rema · context', i: 'layers' },
              { l: 'Search a remembered line', i: 'search' },
            ].map((a, i) => (
              <div key={i} style={{
                padding: '14px 16px', borderRadius: 12,
                background: a.primary ? LT.paper : 'rgba(255,255,255,.04)',
                border: a.primary ? 'none' : '0.5px solid ' + LT.line,
                display: 'flex', alignItems: 'center', gap: 10,
                color: a.primary ? LT.obsidian : LT.paper,
              }}>
                <SWIcon name={a.i} size={16} stroke={a.primary ? LT.obsidian : LT.paperMute} sw={1.6}/>
                <span style={{ flex: 1, fontSize: 14, fontWeight: a.primary ? 600 : 500 }}>{a.l}</span>
                <SWIcon name="chevron" size={14} stroke={a.primary ? LT.obsidian : LT.paperDim}/>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bottom — tap hint + progress */}
      {!noLyrics && (
        <div style={{ position: 'absolute', bottom: 34, left: 20, right: 20 }}>
          <div style={{ textAlign: 'center', fontFamily: LT.mono, fontSize: 10, color: LT.paperDim, letterSpacing: 1.4, textTransform: 'uppercase', marginBottom: 14 }}>
            Tap any line to understand it
          </div>
          <SongProgress pct={syncWarn ? 38 : 42} cur="1:24" tot="3:12"/>
          <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center', marginTop: 14 }}>
            <SWIcon name="heart" size={20} stroke={LT.paperMute}/>
            <div style={{ width: 56, height: 56, borderRadius: 28, background: 'rgba(255,255,255,.06)', border: '0.5px solid ' + LT.line2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="12" height="14" viewBox="0 0 12 14"><rect width="4" height="14" rx="1" fill={LT.paper}/><rect x="8" width="4" height="14" rx="1" fill={LT.paper}/></svg>
            </div>
            <SWIcon name="flag" size={18} stroke={LT.paperMute}/>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── 2. TAP-TO-EXPLAIN BOTTOM SHEET ────────────────────────────
// Shown over the live lyrics screen. Includes a tab for Alternate Meanings.
function ScreenTapExplain({ alternate = false }) {
  return (
    <div style={{ width: '100%', height: '100%', background: LT.obsidian, position: 'relative', overflow: 'hidden', fontFamily: LT.sans, color: LT.paper }}>
      {/* Blurred backdrop showing lyrics underneath */}
      <div style={{ position: 'absolute', inset: 0, opacity: 0.4, filter: 'blur(8px)' }}>
        <div style={{ padding: '90px 28px 0', display: 'flex', flexDirection: 'column', gap: 22 }}>
          {['baby calm down, calm down','girl, wetin dey worry you','everything don cast, my people dey shine','no wahala, no wahala o'].map((t, i) => (
            <div key={i} style={{ fontFamily: LT.serif, fontSize: i === 2 ? 28 : 22, color: LT.paperFaint, fontStyle: i === 2 ? 'italic' : 'normal' }}>{t}</div>
          ))}
        </div>
      </div>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(10,10,15,.55)' }}/>

      {/* Sheet */}
      <div style={{
        position: 'absolute', left: 0, right: 0, bottom: 0, top: 90,
        background: LT.obsidian2,
        borderRadius: '24px 24px 0 0',
        border: '0.5px solid ' + LT.line2,
        borderBottom: 'none',
        boxShadow: '0 -20px 60px rgba(0,0,0,.5)',
        padding: '10px 0 20px',
        display: 'flex', flexDirection: 'column',
      }}>
        {/* Grabber */}
        <div style={{ width: 40, height: 4, borderRadius: 2, background: 'rgba(255,255,255,.18)', margin: '4px auto 14px' }}/>

        {/* Line hero */}
        <div style={{ padding: '0 22px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <LLChip tone="violet"><span style={{ width: 5, height: 5, borderRadius: 3, background: LT.violet }}/>Current line · 1:24</span>
            {alternate && <LLChip tone="amber">Nuance</LLChip>}
          </div>
          <div style={{ fontFamily: LT.serif, fontSize: 24, lineHeight: 1.2, letterSpacing: -0.4, fontStyle: 'italic' }}>
            &ldquo;everything don cast, my people dey shine&rdquo;
          </div>
        </div>

        {/* Tabs */}
        <div style={{ padding: '18px 22px 0', display: 'flex', gap: 18, borderBottom: '0.5px solid ' + LT.line }}>
          {['Meaning', alternate ? 'Alternates · 2' : 'Breakdown', 'Related'].map((t, i) => {
            const active = (alternate && i === 1) || (!alternate && i === 0);
            return (
              <div key={t} style={{ padding: '8px 0', borderBottom: active ? `1.5px solid ${LT.paper}` : 'none', marginBottom: -0.5, fontFamily: LT.sans, fontSize: 12, fontWeight: active ? 600 : 400, color: active ? LT.paper : LT.paperMute }}>
                {t}
              </div>
            );
          })}
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '18px 22px' }}>
          {!alternate ? (
            <>
              {/* Literal */}
              <div style={{ marginBottom: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <div style={{ width: 16, height: 16, borderRadius: 3, background: 'rgba(255,255,255,.06)', display:'flex',alignItems:'center',justifyContent:'center' }}>
                    <span style={{ fontFamily: LT.mono, fontSize: 9, color: LT.paperMute }}>A</span>
                  </div>
                  <div style={{ fontFamily: LT.mono, fontSize: 9, letterSpacing: 1.2, color: LT.paperMute, textTransform: 'uppercase' }}>Literal</div>
                </div>
                <div style={{ fontFamily: LT.serif, fontSize: 16, lineHeight: 1.4 }}>
                  Everything has been exposed &mdash; but my people are still thriving anyway.
                </div>
              </div>

              {/* Cultural */}
              <div style={{ padding: 14, borderRadius: 12, background: `linear-gradient(180deg, ${LT.violetWash}, rgba(139,124,246,.03))`, border: '0.5px solid ' + LT.violetEdge, marginBottom: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <div style={{ width: 16, height: 16, borderRadius: 3, background: LT.violet, display:'flex',alignItems:'center',justifyContent:'center' }}>
                    <span style={{ fontFamily: LT.mono, fontSize: 9, color: LT.obsidian, fontWeight: 600 }}>B</span>
                  </div>
                  <div style={{ fontFamily: LT.mono, fontSize: 9, letterSpacing: 1.2, color: LT.violet, textTransform: 'uppercase' }}>Cultural meaning · why it hits</div>
                </div>
                <div style={{ fontFamily: LT.serif, fontSize: 16, lineHeight: 1.4 }}>
                  A classic Nigerian flex: even when things fall apart around you, your circle keeps winning. Wry acceptance + quiet pride, stacked in one line.
                </div>
              </div>

              {/* Slang map */}
              <div style={{ fontFamily: LT.mono, fontSize: 9, letterSpacing: 1.2, color: LT.paperMute, textTransform: 'uppercase', marginBottom: 8 }}>Slang map</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }}>
                {[
                  { w: 'don cast', m: 'exposed / fallen apart' },
                  { w: 'dey shine', m: 'thriving, glowing up' },
                ].map((r, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'baseline', gap: 12, padding: '6px 0' }}>
                    <span style={{ fontFamily: LT.serif, fontStyle: 'italic', fontSize: 15, color: LT.violet, minWidth: 82 }}>{r.w}</span>
                    <span style={{ fontSize: 12, color: LT.paperMute, lineHeight: 1.4 }}>{r.m}</span>
                  </div>
                ))}
              </div>

              {/* Region + confidence */}
              <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
                <LLChip tone="mute">Pidgin</LLChip>
                <LLChip tone="mute">South-South</LLChip>
                <LLChip tone="mint">92% confident</LLChip>
              </div>
            </>
          ) : (
            <>
              {/* Alternate interpretations — in-place, not a new screen */}
              <div style={{ padding: 12, borderRadius: 10, background: 'rgba(232,184,76,.06)', border: '0.5px dashed rgba(232,184,76,.4)', marginBottom: 14 }}>
                <div style={{ fontSize: 12, color: LT.amber, fontFamily: LT.sans, fontWeight: 600, marginBottom: 4 }}>Multiple meanings dey here</div>
                <div style={{ fontSize: 12, color: LT.paperMute, lineHeight: 1.4 }}>This line lands differently depending on tone. Here are the two most likely readings.</div>
              </div>

              {[
                { pct: 58, tone: 'amber', title: 'Defiant pride', body: 'Everything has fallen apart, but we&apos;re still winning &mdash; said with a smirk.' },
                { pct: 34, tone: 'violet', title: 'Wry resignation', body: 'Exposed, chaotic, but we keep moving. Said more softly, with acceptance.' },
              ].map((x, i) => (
                <div key={i} style={{ padding: 14, borderRadius: 12, background: 'rgba(255,255,255,.03)', border: '0.5px solid ' + LT.line, marginBottom: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 4 }}>
                    <span style={{ fontFamily: LT.mono, fontSize: 18, color: x.tone === 'amber' ? LT.amber : LT.violet, fontWeight: 500 }}>{x.pct}%</span>
                    <span style={{ fontFamily: LT.mono, fontSize: 9, letterSpacing: 1.2, color: LT.paperDim, textTransform: 'uppercase' }}>{i === 0 ? 'Most likely' : 'Alternate'}</span>
                  </div>
                  <div style={{ fontFamily: LT.serif, fontSize: 16, marginBottom: 4, fontStyle: 'italic' }}>{x.title}</div>
                  <div style={{ fontSize: 12, color: LT.paperMute, lineHeight: 1.4 }} dangerouslySetInnerHTML={{ __html: x.body }}/>
                </div>
              ))}
            </>
          )}
        </div>

        {/* Footer CTA */}
        <div style={{ padding: '0 22px' }}>
          <div style={{
            height: 48, borderRadius: 12, background: 'rgba(255,255,255,.06)', border: '0.5px solid ' + LT.line2,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontSize: 13, fontWeight: 500,
          }}>
            <SWIcon name="layers" size={15} stroke={LT.paper}/>
            Open full meaning
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── 3. MEANING-FIRST DETAIL ───────────────────────────────────
function ScreenMeaningDetail() {
  return (
    <div style={{ width: '100%', height: '100%', background: LT.obsidian, position: 'relative', overflow: 'hidden', fontFamily: LT.sans, color: LT.paper }}>
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: `radial-gradient(80% 40% at 50% 0%, ${LT.violetWash}, transparent 60%)` }}/>

      {/* Header */}
      <div style={{ padding: '58px 20px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <SWIcon name="chevron" size={20} stroke={LT.paperMute} style={{ transform: 'rotate(180deg)' }}/>
        <div style={{ fontFamily: LT.mono, fontSize: 10, letterSpacing: 1.6, color: LT.paperDim, textTransform: 'uppercase' }}>Line · Deep read</div>
        <SWIcon name="heart" size={18} stroke={LT.paperMute}/>
      </div>

      <div style={{ padding: '22px 20px 100px', height: 'calc(100% - 74px)', overflowY: 'auto' }}>
        {/* Eyebrow */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
          <AlbumArt size={28} seed={1} caption="" radius={5}/>
          <div>
            <div style={{ fontSize: 12, fontWeight: 500 }}>Calm Down</div>
            <div style={{ fontFamily: LT.mono, fontSize: 9, color: LT.paperMute, letterSpacing: 0.6 }}>REMA · 1:24</div>
          </div>
        </div>

        {/* Hero line */}
        <div style={{ fontFamily: LT.serif, fontSize: 32, lineHeight: 1.15, letterSpacing: -0.7, fontStyle: 'italic' }}>
          &ldquo;everything don cast,<br/>
          <span style={{ color: LT.violet }}>my people dey shine</span>&rdquo;
        </div>

        {/* Why it hits */}
        <div style={{ marginTop: 22, padding: 16, borderRadius: 14, background: `linear-gradient(180deg, ${LT.violetWash}, rgba(139,124,246,.03))`, border: '0.5px solid ' + LT.violetEdge }}>
          <div style={{ fontFamily: LT.mono, fontSize: 9, letterSpacing: 1.4, color: LT.violet, textTransform: 'uppercase', marginBottom: 6 }}>Why it hits</div>
          <div style={{ fontFamily: LT.serif, fontSize: 17, lineHeight: 1.4 }}>
            Two truths stacked. The room is in chaos &mdash; and your crew is <em>still</em> winning. Nigerian optimism compressed into seven words.
          </div>
        </div>

        {/* Plain vs Cultural — side by side vertical */}
        <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ padding: 14, borderRadius: 12, background: 'rgba(255,255,255,.03)', border: '0.5px solid ' + LT.line }}>
            <div style={{ fontFamily: LT.mono, fontSize: 9, letterSpacing: 1.2, color: LT.paperMute, textTransform: 'uppercase', marginBottom: 6 }}>Plain meaning</div>
            <div style={{ fontFamily: LT.serif, fontSize: 16, lineHeight: 1.4 }}>
              Everything has been exposed, but my circle is thriving.
            </div>
          </div>
          <div style={{ padding: 14, borderRadius: 12, background: 'rgba(255,255,255,.03)', border: '0.5px solid ' + LT.line }}>
            <div style={{ fontFamily: LT.mono, fontSize: 9, letterSpacing: 1.2, color: LT.paperMute, textTransform: 'uppercase', marginBottom: 6 }}>Cultural meaning</div>
            <div style={{ fontFamily: LT.serif, fontSize: 16, lineHeight: 1.4 }}>
              A flex. Even when the whole situation has scattered, <em>my</em> people are shining &mdash; quiet pride, no apologies.
            </div>
          </div>
        </div>

        {/* Slang map */}
        <div style={{ marginTop: 22, fontFamily: LT.mono, fontSize: 10, letterSpacing: 1.4, color: LT.paperDim, textTransform: 'uppercase', marginBottom: 10 }}>Slang map</div>
        {[
          { w: 'don cast', m: 'exposed, revealed, fallen apart', r: 'Pidgin · South-South' },
          { w: 'my people', m: 'my circle, my crew', r: 'Pan-Nigerian' },
          { w: 'dey shine', m: 'thriving, glowing up, winning', r: 'Gen Z · Pidgin' },
        ].map((r, i) => (
          <div key={i} style={{ padding: '10px 0', borderBottom: i < 2 ? '0.5px solid ' + LT.line : 'none', display: 'flex', gap: 14 }}>
            <div style={{ fontFamily: LT.serif, fontSize: 17, fontStyle: 'italic', color: LT.violet, minWidth: 92 }}>{r.w}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, lineHeight: 1.4 }}>{r.m}</div>
              <div style={{ fontFamily: LT.mono, fontSize: 9, color: LT.paperDim, letterSpacing: 0.6, marginTop: 2 }}>{r.r.toUpperCase()}</div>
            </div>
          </div>
        ))}

        {/* Related phrases */}
        <div style={{ marginTop: 22, fontFamily: LT.mono, fontSize: 10, letterSpacing: 1.4, color: LT.paperDim, textTransform: 'uppercase', marginBottom: 10 }}>Nigerian phrases that rhyme</div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {['we dey outside','my guys dey ball','na my circle dey shine','e don red, we still dey'].map(p => (
            <div key={p} style={{ padding: '8px 12px', borderRadius: 10, background: 'rgba(255,255,255,.04)', border: '0.5px solid ' + LT.line, fontFamily: LT.serif, fontStyle: 'italic', fontSize: 13 }}>
              &ldquo;{p}&rdquo;
            </div>
          ))}
        </div>

        {/* Artist context */}
        <div style={{ marginTop: 22, padding: 14, borderRadius: 12, background: 'rgba(255,255,255,.03)', border: '0.5px solid ' + LT.line, display: 'flex', gap: 12, alignItems: 'center' }}>
          <AlbumArt size={44} seed={1} caption="" radius={8}/>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: LT.mono, fontSize: 9, letterSpacing: 1.2, color: LT.paperDim, textTransform: 'uppercase' }}>Artist note</div>
            <div style={{ fontSize: 12, color: LT.paper, marginTop: 3, lineHeight: 1.4 }}>
              Rema leans on Pidgin affirmations like this across <em>Rave &amp; Roses</em> &mdash; optimistic, confident, Lagos-coded.
            </div>
          </div>
          <SWIcon name="chevron" size={14} stroke={LT.paperDim}/>
        </div>
      </div>
    </div>
  );
}

// ─── Mini Player overlay (proof of persistent live mode) ───────
// Renders on top of a screen. Used on Home / Explore to prove the pattern.
function MiniPlayerOverlay({ children }) {
  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      {children}
      <div style={{
        position: 'absolute', bottom: 94, left: 12, right: 12,
        padding: '10px 12px', borderRadius: 14,
        background: 'rgba(22,22,31,.92)',
        backdropFilter: 'blur(20px) saturate(180%)',
        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
        border: '0.5px solid ' + LT.line2,
        boxShadow: '0 10px 30px rgba(0,0,0,.4)',
        display: 'flex', alignItems: 'center', gap: 10, zIndex: 10,
      }}>
        <AlbumArt size={36} seed={1} caption="" radius={7}/>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
            <span style={{ width: 5, height: 5, borderRadius: 3, background: LT.mint, boxShadow: `0 0 6px ${LT.mint}`, animation: 'sw-pulse 1.2s ease-in-out infinite' }}/>
            <span style={{ fontFamily: LT.mono, fontSize: 8, letterSpacing: 1.4, color: LT.mint, textTransform: 'uppercase' }}>Live · Calm Down</span>
          </div>
          <div style={{ fontFamily: LT.serif, fontStyle: 'italic', fontSize: 13, color: LT.paper, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            &ldquo;everything don cast&rdquo;
          </div>
        </div>
        <div style={{ width: 34, height: 34, borderRadius: 17, background: LT.violet, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <SWIcon name="sparkle" size={14} stroke={LT.obsidian} sw={2}/>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, {
  ScreenLiveLyrics, ScreenTapExplain, ScreenMeaningDetail, MiniPlayerOverlay,
});
