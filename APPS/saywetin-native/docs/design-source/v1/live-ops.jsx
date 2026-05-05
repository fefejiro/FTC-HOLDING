// live-ops.jsx — Live Lyrics operations dashboard (single consolidated view)
const LOT = window.SW_TOKENS;

function LiveLyricsOps() {
  const DT = LOT;
  return (
    <div style={{ width: '100%', height: '100%', background: DT.bone, fontFamily: DT.sans, color: DT.ink, display: 'flex', overflow: 'hidden' }}>
      {/* Sidebar — compact version */}
      <div style={{ width: 220, borderRight: '1px solid ' + DT.hair, background: DT.bone2, padding: '20px 0', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '0 20px 20px', borderBottom: '1px solid ' + DT.hair, display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 28, height: 28, borderRadius: 8, background: DT.ink, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontFamily: DT.serif, fontStyle: 'italic', fontSize: 18, color: DT.bone, lineHeight: 1 }}>S</span>
          </div>
          <div>
            <div style={{ fontFamily: DT.serif, fontSize: 15, lineHeight: 1 }}>SayWetin</div>
            <div style={{ fontFamily: DT.mono, fontSize: 9, color: DT.ink3, letterSpacing: 1, textTransform: 'uppercase', marginTop: 2 }}>Live · v2.5</div>
          </div>
        </div>
        <div style={{ padding: '14px 12px', display: 'flex', flexDirection: 'column', gap: 2 }}>
          {[
            { k: 'over', l: 'Overview' },
            { k: 'live', l: 'Live lyrics', active: true, badge: 'NEW' },
            { k: 'gaps', l: 'Content gaps', badge: 42 },
            { k: 'rev',  l: 'Review queue', badge: 18 },
            { k: 'gh',   l: 'GitHub' },
            { k: 'mcp',  l: 'MCP · Automation' },
          ].map(it => (
            <div key={it.k} style={{
              padding: '8px 12px', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 10,
              background: it.active ? 'rgba(20,19,26,0.06)' : 'transparent',
              color: it.active ? DT.ink : DT.ink3,
              fontSize: 13, fontWeight: it.active ? 500 : 400,
            }}>
              <span style={{ flex: 1 }}>{it.l}</span>
              {it.badge && (
                <span style={{ fontFamily: DT.mono, fontSize: 9, padding: '1px 6px', borderRadius: 999, background: typeof it.badge === 'string' ? DT.violet : DT.ink, color: DT.bone }}>
                  {it.badge}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Main */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ height: 52, borderBottom: '1px solid ' + DT.hair, padding: '0 24px', display: 'flex', alignItems: 'center', gap: 14, background: DT.bone }}>
          <div style={{ fontFamily: DT.mono, fontSize: 10, color: DT.ink3, letterSpacing: 1.2, textTransform: 'uppercase' }}>Ops / Live lyrics</div>
          <div style={{ padding: '2px 6px', borderRadius: 3, background: DT.violet, color: '#fff', fontFamily: DT.mono, fontSize: 8, letterSpacing: 1.2 }}>NEW</div>
          <div style={{ flex: 1 }}/>
          <div style={{ fontFamily: DT.mono, fontSize: 10, color: DT.ink3 }}>LIVE · 1,420 sessions now</div>
          <span style={{ width: 6, height: 6, borderRadius: 3, background: '#2A8F5E' }}/>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '24px 28px' }}>
          {/* Header */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontFamily: DT.mono, fontSize: 10, color: DT.ink3, letterSpacing: 1.6, textTransform: 'uppercase' }}>Live lyrics · Operations</div>
            <div style={{ fontFamily: DT.serif, fontSize: 34, letterSpacing: -0.7, lineHeight: 1, marginTop: 6 }}>
              Follow mode, <span style={{ fontStyle: 'italic', color: DT.ink3 }}>at a glance.</span>
            </div>
          </div>

          {/* KPI strip */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 16 }}>
            {[
              { l: 'Sync coverage', v: '84%', d: '+2.1% wk', ok: true },
              { l: 'Sync confidence', v: '91.2%', d: '+0.8% wk', ok: true },
              { l: 'Tap-to-explain', v: '38k', d: '+14% wk', ok: true },
              { l: 'Fallback rate', v: '9.4%', d: '−1.2% wk', ok: true },
            ].map((m, i) => (
              <div key={i} style={{ padding: 18, background: '#fff', borderRadius: 12, border: '1px solid ' + DT.hair }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontFamily: DT.mono, fontSize: 10, color: DT.ink3, letterSpacing: 1.4, textTransform: 'uppercase' }}>{m.l}</div>
                  <div style={{ fontFamily: DT.mono, fontSize: 10, color: '#2A8F5E' }}>↑ {m.d}</div>
                </div>
                <div style={{ fontFamily: DT.serif, fontSize: 32, letterSpacing: -0.8, lineHeight: 1, marginTop: 8 }}>{m.v}</div>
              </div>
            ))}
          </div>

          {/* 4-quadrant consolidated panel */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            {/* Sync coverage */}
            <div style={{ padding: 18, background: '#fff', borderRadius: 12, border: '1px solid ' + DT.hair }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 }}>
                <div>
                  <div style={{ fontFamily: DT.mono, fontSize: 10, color: DT.ink3, letterSpacing: 1.4, textTransform: 'uppercase' }}>Synced lyrics coverage</div>
                  <div style={{ fontFamily: DT.serif, fontSize: 20, lineHeight: 1, marginTop: 4 }}>84% of matched songs</div>
                </div>
                <div style={{ fontFamily: DT.mono, fontSize: 10, color: DT.ink3 }}>2,140 missing</div>
              </div>
              {[
                { r: 'Afrobeats mainstream', v: 96 },
                { r: 'Alté / experimental', v: 72, warn: true },
                { r: 'Northern (Hausa)', v: 48, warn: true },
                { r: 'Gospel', v: 88 },
              ].map((r, i) => (
                <div key={i} style={{ marginBottom: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 3 }}>
                    <span>{r.r}</span>
                    <span style={{ fontFamily: DT.mono, fontSize: 10, color: r.warn ? '#C9482D' : DT.ink3 }}>{r.v}%</span>
                  </div>
                  <div style={{ height: 4, borderRadius: 2, background: DT.bone2, overflow: 'hidden' }}>
                    <div style={{ width: r.v + '%', height: '100%', background: r.warn ? '#C9482D' : DT.ink }}/>
                  </div>
                </div>
              ))}
            </div>

            {/* Sync health */}
            <div style={{ padding: 18, background: '#fff', borderRadius: 12, border: '1px solid ' + DT.hair }}>
              <div style={{ fontFamily: DT.mono, fontSize: 10, color: DT.ink3, letterSpacing: 1.4, textTransform: 'uppercase', marginBottom: 12 }}>Sync health · drift issues</div>
              {[
                { t: 'Essence · Wizkid ft. Tems', d: '+0.8s drift at 2:14', sev: 'high' },
                { t: 'Joha · Ajebo Hustlers', d: 'Re-sync failed 3×', sev: 'high' },
                { t: 'Ojuelegba · Wizkid', d: 'Flagged by 14 users', sev: 'med' },
                { t: 'Soft Life · Seyi Shay', d: 'Timing off on bridge', sev: 'med' },
              ].map((r, i) => (
                <div key={i} style={{ padding: '8px 0', borderBottom: i < 3 ? '1px solid ' + DT.hair : 'none', display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ width: 6, height: 6, borderRadius: 3, background: r.sev === 'high' ? '#C9482D' : DT.amber }}/>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, fontWeight: 500 }}>{r.t}</div>
                    <div style={{ fontSize: 11, color: DT.ink3, fontFamily: DT.mono }}>{r.d}</div>
                  </div>
                  <SWIcon name="chevron" size={13} stroke={DT.ink3} sw={1.4}/>
                </div>
              ))}
            </div>

            {/* Ambiguous line queue */}
            <div style={{ padding: 18, background: '#fff', borderRadius: 12, border: '1px solid ' + DT.hair }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 }}>
                <div>
                  <div style={{ fontFamily: DT.mono, fontSize: 10, color: DT.ink3, letterSpacing: 1.4, textTransform: 'uppercase' }}>Ambiguous lines · review</div>
                  <div style={{ fontFamily: DT.serif, fontSize: 20, lineHeight: 1, marginTop: 4 }}>14 lines need nuance</div>
                </div>
                <span style={{ padding: '3px 8px', borderRadius: 4, background: DT.bone2, fontFamily: DT.mono, fontSize: 9, color: DT.ink3 }}>QUEUE</span>
              </div>
              {[
                { l: 'she dey do like say she sabi', a: 'AO', p: 'high' },
                { l: 'e don cast for am', a: 'TB', p: 'med' },
                { l: 'na who dey plan this gist', a: '—', p: 'med' },
                { l: 'we dey shekpe till dawn', a: 'NE', p: 'low' },
              ].map((r, i) => (
                <div key={i} style={{ padding: '8px 0', borderBottom: i < 3 ? '1px solid ' + DT.hair : 'none', display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ width: 5, height: 5, borderRadius: 3, background: r.p === 'high' ? '#C9482D' : r.p === 'med' ? DT.amber : DT.ink3 }}/>
                  <div style={{ flex: 1, fontFamily: DT.serif, fontStyle: 'italic', fontSize: 14 }}>&ldquo;{r.l}&rdquo;</div>
                  <span style={{ fontFamily: DT.mono, fontSize: 10, color: DT.ink3, width: 20, textAlign: 'right' }}>{r.a}</span>
                </div>
              ))}
            </div>

            {/* Tap-to-explain performance */}
            <div style={{ padding: 18, background: '#fff', borderRadius: 12, border: '1px solid ' + DT.hair }}>
              <div style={{ fontFamily: DT.mono, fontSize: 10, color: DT.ink3, letterSpacing: 1.4, textTransform: 'uppercase', marginBottom: 12 }}>Most-tapped lines · 24h</div>
              {[
                { l: 'everything don cast', n: 840 },
                { l: 'baby calm down', n: 620 },
                { l: 'my people dey shine', n: 512 },
                { l: 'e choke', n: 384 },
              ].map((r, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 0', borderBottom: i < 3 ? '1px solid ' + DT.hair : 'none' }}>
                  <div style={{ fontFamily: DT.serif, fontStyle: 'italic', fontSize: 14, flex: 1 }}>&ldquo;{r.l}&rdquo;</div>
                  <div style={{ flex: 1, height: 4, borderRadius: 2, background: DT.bone2, maxWidth: 90 }}>
                    <div style={{ width: (r.n / 900 * 100) + '%', height: '100%', background: DT.violet, borderRadius: 2 }}/>
                  </div>
                  <span style={{ fontFamily: DT.mono, fontSize: 10, color: DT.ink3, width: 32, textAlign: 'right' }}>{r.n}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { LiveLyricsOps });
