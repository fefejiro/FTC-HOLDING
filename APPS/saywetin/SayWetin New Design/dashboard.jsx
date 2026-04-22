// dashboard.jsx — SayWetin admin dashboard (Module 2)
// Light surface, bone/ink palette, operational feel.

const DT = window.SW_TOKENS;

function DashChrome({ children, title, breadcrumb }) {
  return (
    <div style={{ width: '100%', height: '100%', background: DT.bone, fontFamily: DT.sans, color: DT.ink, display: 'flex', overflow: 'hidden' }}>
      {/* Sidebar */}
      <div style={{ width: 220, borderRight: '1px solid ' + DT.hair, background: DT.bone2, padding: '20px 0', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '0 20px 20px', borderBottom: '1px solid ' + DT.hair, display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 28, height: 28, borderRadius: 8, background: DT.ink, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontFamily: DT.serif, fontStyle: 'italic', fontSize: 18, color: DT.bone, lineHeight: 1 }}>S</span>
          </div>
          <div>
            <div style={{ fontFamily: DT.serif, fontSize: 15, lineHeight: 1 }}>SayWetin</div>
            <div style={{ fontFamily: DT.mono, fontSize: 9, color: DT.ink3, letterSpacing: 1, textTransform: 'uppercase', marginTop: 2 }}>Ops · v2.4</div>
          </div>
        </div>
        <div style={{ padding: '14px 12px', display: 'flex', flexDirection: 'column', gap: 2 }}>
          {[
            { k: 'over', l: 'Overview', i: 'grid' },
            { k: 'gaps', l: 'Content gaps', i: 'warn', badge: 42 },
            { k: 'rev',  l: 'Review queue', i: 'check', badge: 18 },
            { k: 'gh',   l: 'GitHub', i: 'github' },
            { k: 'mcp',  l: 'MCP · Automation', i: 'bolt' },
            { k: 'fb',   l: 'User feedback', i: 'flag' },
            { k: 'kb',   l: 'Knowledge base', i: 'layers' },
            { k: 'si',   l: 'Search intel', i: 'search' },
            { k: 'rr',   l: 'Release', i: 'shield' },
          ].map(it => (
            <div key={it.k} style={{
              padding: '8px 12px', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 10,
              background: it.k === 'over' ? 'rgba(20,19,26,0.06)' : 'transparent',
              color: it.k === 'over' ? DT.ink : DT.ink3,
              fontSize: 13, fontWeight: it.k === 'over' ? 500 : 400,
            }}>
              <SWIcon name={it.i} size={15} stroke={it.k === 'over' ? DT.ink : DT.ink3} sw={1.4}/>
              <span style={{ flex: 1 }}>{it.l}</span>
              {it.badge && <span style={{ fontFamily: DT.mono, fontSize: 10, padding: '1px 6px', borderRadius: 999, background: DT.ink, color: DT.bone }}>{it.badge}</span>}
            </div>
          ))}
        </div>
        <div style={{ flex: 1 }}/>
        <div style={{ padding: '12px 14px', borderTop: '1px solid ' + DT.hair, fontFamily: DT.mono, fontSize: 10, color: DT.ink3 }}>
          <div>CONTENT BUILD · #2847</div>
          <div style={{ color: '#2A8F5E', marginTop: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 6, height: 6, borderRadius: 3, background: '#2A8F5E' }}/>
            All systems green
          </div>
        </div>
      </div>

      {/* Main */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ height: 52, borderBottom: '1px solid ' + DT.hair, padding: '0 24px', display: 'flex', alignItems: 'center', gap: 14, background: DT.bone }}>
          <div style={{ fontFamily: DT.mono, fontSize: 10, color: DT.ink3, letterSpacing: 1.2, textTransform: 'uppercase' }}>{breadcrumb}</div>
          <div style={{ flex: 1 }}/>
          <div style={{ padding: '6px 12px', borderRadius: 8, background: DT.bone2, display: 'flex', alignItems: 'center', gap: 8, fontFamily: DT.mono, fontSize: 11, color: DT.ink3 }}>
            <SWIcon name="search" size={13} stroke={DT.ink3} sw={1.4}/>
            <span>Search · phrases, issues, PRs…</span>
            <span style={{ padding: '0 4px', border: '1px solid ' + DT.hair, borderRadius: 3, fontSize: 9 }}>⌘K</span>
          </div>
          <div style={{ width: 28, height: 28, borderRadius: 14, background: 'linear-gradient(135deg, #8B7CF6, #E8B84C)' }}/>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '28px 32px' }}>
          {children}
        </div>
      </div>
    </div>
  );
}

function Metric({ label, value, delta, deltaKind = 'up', sub, big }) {
  return (
    <div style={{ padding: 20, background: '#fff', borderRadius: 14, border: '1px solid ' + DT.hair, display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontFamily: DT.mono, fontSize: 10, color: DT.ink3, letterSpacing: 1.4, textTransform: 'uppercase' }}>{label}</div>
        {delta && (
          <div style={{ fontFamily: DT.mono, fontSize: 10, color: deltaKind === 'up' ? '#2A8F5E' : deltaKind === 'down' ? '#C9482D' : DT.ink3 }}>
            {deltaKind === 'up' ? '↑' : deltaKind === 'down' ? '↓' : '·'} {delta}
          </div>
        )}
      </div>
      <div style={{ fontFamily: DT.serif, fontSize: big ? 44 : 34, letterSpacing: -1, lineHeight: 1, color: DT.ink }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: DT.ink3 }}>{sub}</div>}
    </div>
  );
}

// A. OVERVIEW
function OverviewDash() {
  return (
    <DashChrome breadcrumb="Ops / Overview">
      {/* Hero strip */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 24 }}>
        <div>
          <div style={{ fontFamily: DT.mono, fontSize: 10, color: DT.ink3, letterSpacing: 1.6, textTransform: 'uppercase' }}>Wednesday · Apr 22</div>
          <div style={{ fontFamily: DT.serif, fontSize: 40, letterSpacing: -0.8, lineHeight: 1, marginTop: 6 }}>
            Good morning. <span style={{ fontStyle: 'italic', color: DT.ink3 }}>42 content gaps need a human.</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <div style={{ padding: '9px 14px', borderRadius: 8, border: '1px solid ' + DT.hair, fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
            <SWIcon name="download" size={13} stroke={DT.ink} sw={1.4}/> Export
          </div>
          <div style={{ padding: '9px 14px', borderRadius: 8, background: DT.ink, color: DT.bone, fontSize: 12, display: 'flex', alignItems: 'center', gap: 6, fontWeight: 500 }}>
            <SWIcon name="plus" size={13} stroke={DT.bone} sw={1.8}/> New entry
          </div>
        </div>
      </div>

      {/* Metrics row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, marginBottom: 16 }}>
        <Metric label="Listens (24h)" value="14,820" delta="+8.2%" sub="5,420 unique users" big/>
        <Metric label="Recognition rate" value="96.4%" delta="+0.3%" sub="Target: ≥ 95%" />
        <Metric label="Low-confidence" value="3.1%" delta="−0.4%" deltaKind="up" sub="below threshold" />
        <Metric label="Content gaps" value="42" delta="+6" deltaKind="down" sub="6 urgent" />
        <Metric label="Flagged" value="11" delta="−3" deltaKind="up" sub="by 8 users" />
      </div>

      {/* Two-column body */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 16 }}>
        {/* Listens chart */}
        <div style={{ padding: 20, background: '#fff', borderRadius: 14, border: '1px solid ' + DT.hair }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 18 }}>
            <div>
              <div style={{ fontFamily: DT.mono, fontSize: 10, color: DT.ink3, letterSpacing: 1.4, textTransform: 'uppercase' }}>Listen activity</div>
              <div style={{ fontFamily: DT.serif, fontSize: 22, lineHeight: 1, marginTop: 6 }}>Last 14 days</div>
            </div>
            <div style={{ display: 'flex', gap: 14, fontSize: 11, color: DT.ink3 }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><span style={{ width: 10, height: 2, background: DT.ink }}/> Listens</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><span style={{ width: 10, height: 2, background: DT.violet, borderTop: '1px dashed ' + DT.violet }}/> Explanations</span>
            </div>
          </div>
          {/* SVG chart */}
          <svg viewBox="0 0 600 180" width="100%" height="180" style={{ display: 'block' }}>
            <defs>
              <linearGradient id="lg1" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor={DT.ink} stopOpacity="0.12"/>
                <stop offset="100%" stopColor={DT.ink} stopOpacity="0"/>
              </linearGradient>
            </defs>
            {[0, 1, 2, 3].map(i => (
              <line key={i} x1="0" y1={i * 45 + 10} x2="600" y2={i * 45 + 10} stroke={DT.hair} strokeDasharray="2 4"/>
            ))}
            <path d="M0,120 L43,100 L86,110 L129,82 L172,94 L215,60 L258,72 L301,48 L344,66 L387,40 L430,55 L473,30 L516,42 L559,22 L600,18 L600,180 L0,180 Z" fill="url(#lg1)"/>
            <path d="M0,120 L43,100 L86,110 L129,82 L172,94 L215,60 L258,72 L301,48 L344,66 L387,40 L430,55 L473,30 L516,42 L559,22 L600,18" fill="none" stroke={DT.ink} strokeWidth="1.5"/>
            <path d="M0,145 L43,135 L86,142 L129,125 L172,130 L215,108 L258,118 L301,95 L344,110 L387,88 L430,100 L473,78 L516,90 L559,70 L600,65" fill="none" stroke={DT.violet} strokeWidth="1.5" strokeDasharray="3 3"/>
            {/* Data points */}
            {[[559,22],[559,70]].map(([x,y],i) => (
              <circle key={i} cx={x} cy={y} r="3" fill={i ? DT.violet : DT.ink}/>
            ))}
          </svg>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12, fontFamily: DT.mono, fontSize: 9, color: DT.ink3 }}>
            <span>APR 08</span><span>APR 12</span><span>APR 16</span><span>APR 20</span><span>TODAY</span>
          </div>
        </div>

        {/* Release readiness */}
        <div style={{ padding: 20, background: '#fff', borderRadius: 14, border: '1px solid ' + DT.hair }}>
          <div style={{ fontFamily: DT.mono, fontSize: 10, color: DT.ink3, letterSpacing: 1.4, textTransform: 'uppercase' }}>Release 2.5 · Readiness</div>
          <div style={{ fontFamily: DT.serif, fontSize: 22, lineHeight: 1, marginTop: 6 }}>Ready to ship in <span style={{ fontStyle: 'italic' }}>3 days</span></div>
          {/* Ring */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginTop: 18 }}>
            <svg width="96" height="96" viewBox="0 0 96 96">
              <circle cx="48" cy="48" r="40" fill="none" stroke={DT.hair2} strokeWidth="8"/>
              <circle cx="48" cy="48" r="40" fill="none" stroke={DT.ink} strokeWidth="8"
                strokeDasharray={`${2*Math.PI*40*0.87} ${2*Math.PI*40}`} strokeLinecap="round"
                transform="rotate(-90 48 48)"/>
              <text x="48" y="54" textAnchor="middle" fontFamily={DT.serif} fontSize="26">87%</text>
            </svg>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                { l: 'Content coverage', v: '94%', ok: true },
                { l: 'QA automations', v: 'pass', ok: true },
                { l: 'Editor sign-off', v: '12 pending', ok: false },
                { l: 'Blockers', v: '2 open', ok: false },
              ].map(r => (
                <div key={r.l} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
                  <span style={{ width: 6, height: 6, borderRadius: 3, background: r.ok ? '#2A8F5E' : DT.amber }}/>
                  <span style={{ flex: 1, color: DT.ink3 }}>{r.l}</span>
                  <span style={{ fontFamily: DT.mono, fontSize: 11 }}>{r.v}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginTop: 16 }}>
        {/* Top unknown phrases */}
        <div style={{ padding: 20, background: '#fff', borderRadius: 14, border: '1px solid ' + DT.hair }}>
          <div style={{ fontFamily: DT.mono, fontSize: 10, color: DT.ink3, letterSpacing: 1.4, textTransform: 'uppercase', marginBottom: 12 }}>Top unknown phrases</div>
          {[
            { p: 'shekpe', n: 184 },
            { p: 'e choke', n: 142 },
            { p: 'soft girl era', n: 96 },
            { p: 'yawa go gas', n: 72 },
          ].map((r,i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: i < 3 ? '1px solid ' + DT.hair : 'none' }}>
              <div style={{ fontFamily: DT.serif, fontStyle: 'italic', fontSize: 16, color: DT.ink, flex: 1 }}>"{r.p}"</div>
              <div style={{ flex: 1, height: 4, borderRadius: 2, background: DT.bone2, overflow: 'hidden' }}>
                <div style={{ width: (r.n / 200 * 100) + '%', height: '100%', background: DT.violet }}/>
              </div>
              <div style={{ fontFamily: DT.mono, fontSize: 11, color: DT.ink3, width: 32, textAlign: 'right' }}>{r.n}</div>
            </div>
          ))}
        </div>

        {/* Region coverage */}
        <div style={{ padding: 20, background: '#fff', borderRadius: 14, border: '1px solid ' + DT.hair }}>
          <div style={{ fontFamily: DT.mono, fontSize: 10, color: DT.ink3, letterSpacing: 1.4, textTransform: 'uppercase', marginBottom: 12 }}>Region coverage</div>
          {[
            { r: 'South-West (Yoruba)', v: 92 },
            { r: 'South-East (Igbo)', v: 78 },
            { r: 'South-South (Pidgin)', v: 85 },
            { r: 'North (Hausa)', v: 54, warn: true },
          ].map((r,i) => (
            <div key={i} style={{ marginBottom: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontSize: 12 }}>{r.r}</span>
                <span style={{ fontFamily: DT.mono, fontSize: 11, color: r.warn ? '#C9482D' : DT.ink3 }}>{r.v}%</span>
              </div>
              <div style={{ height: 4, borderRadius: 2, background: DT.bone2, overflow: 'hidden' }}>
                <div style={{ width: r.v + '%', height: '100%', background: r.warn ? '#C9482D' : DT.ink }}/>
              </div>
            </div>
          ))}
        </div>

        {/* Recent automations */}
        <div style={{ padding: 20, background: '#fff', borderRadius: 14, border: '1px solid ' + DT.hair }}>
          <div style={{ fontFamily: DT.mono, fontSize: 10, color: DT.ink3, letterSpacing: 1.4, textTransform: 'uppercase', marginBottom: 12 }}>MCP · Recent runs</div>
          {[
            { t: 'gap-to-issue', s: 'ok', m: '6 issues opened', time: '4m' },
            { t: 'lyric-scrape', s: 'ok', m: '2,840 lines indexed', time: '22m' },
            { t: 'confidence-sweep', s: 'warn', m: '14 entries flagged', time: '1h' },
            { t: 'review-nudge', s: 'ok', m: '3 reviewers paged', time: '2h' },
          ].map((r,i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: i < 3 ? '1px solid ' + DT.hair : 'none' }}>
              <span style={{ width: 6, height: 6, borderRadius: 3, background: r.s === 'ok' ? '#2A8F5E' : DT.amber }}/>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: DT.mono, fontSize: 11 }}>{r.t}</div>
                <div style={{ fontSize: 11, color: DT.ink3 }}>{r.m}</div>
              </div>
              <div style={{ fontFamily: DT.mono, fontSize: 10, color: DT.ink3 }}>{r.time}</div>
            </div>
          ))}
        </div>
      </div>
    </DashChrome>
  );
}

// C. REVIEW QUEUE — hi-fi
function ReviewQueueDash() {
  const rows = [
    { id: '#4821', phrase: 'shekpe', song: 'Shekpe Remix', artist: 'Zinoleesky', state: 'Lang review', assignee: 'AO', urgency: 'high', conf: 62 },
    { id: '#4819', phrase: 'soft life', song: 'Soft Life', artist: 'Seyi Shay', state: 'Editor', assignee: 'NE', urgency: 'med', conf: 78 },
    { id: '#4817', phrase: 'e choke', song: 'Buga', artist: 'Kizz Daniel', state: 'Lang review', assignee: 'TB', urgency: 'med', conf: 70 },
    { id: '#4815', phrase: 'japa', song: 'Japa Rock', artist: 'Odumodublvck', state: 'Publish', assignee: 'MA', urgency: 'low', conf: 94 },
    { id: '#4812', phrase: 'case don enter', song: 'Joha', artist: 'Ajebo Hustlers', state: 'Editor', assignee: '—', urgency: 'high', conf: 55 },
    { id: '#4810', phrase: 'wahala be like bicycle', song: 'Wahala Dey', artist: 'Reminisce', state: 'Lang review', assignee: 'AO', urgency: 'low', conf: 81 },
    { id: '#4808', phrase: 'soji', song: 'Soji', artist: 'Bella Shmurda', state: 'Publish', assignee: 'NE', urgency: 'low', conf: 92 },
  ];
  const stateColors = { 'Lang review': DT.violet, 'Editor': DT.amber, 'Publish': '#2A8F5E' };
  const urgencyColors = { high: '#C9482D', med: DT.amber, low: DT.ink3 };
  return (
    <DashChrome breadcrumb="Ops / Review queue">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 18 }}>
        <div>
          <div style={{ fontFamily: DT.mono, fontSize: 10, color: DT.ink3, letterSpacing: 1.6, textTransform: 'uppercase' }}>Review queue</div>
          <div style={{ fontFamily: DT.serif, fontSize: 36, letterSpacing: -0.8, lineHeight: 1, marginTop: 6 }}>
            18 entries awaiting your eye
          </div>
          <div style={{ fontSize: 12, color: DT.ink3, marginTop: 6 }}>4 flagged urgent · 6 assigned to you · avg time-to-publish 2.4h</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <div style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid ' + DT.hair, fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
            <SWIcon name="filter" size={13} stroke={DT.ink} sw={1.4}/> Filter · 3
          </div>
          <div style={{ padding: '8px 12px', borderRadius: 8, background: DT.ink, color: DT.bone, fontSize: 12, fontWeight: 500 }}>Claim next</div>
        </div>
      </div>

      {/* Column of state tallies */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 20 }}>
        {[
          { l: 'Language review', n: 8, c: DT.violet, sub: 'Native Nigerian linguist' },
          { l: 'Editor approval', n: 7, c: DT.amber, sub: 'Culture + tone check' },
          { l: 'Ready to publish', n: 3, c: '#2A8F5E', sub: 'Final sign-off' },
        ].map((s,i) => (
          <div key={i} style={{ padding: 16, background: '#fff', borderRadius: 12, border: '1px solid ' + DT.hair, display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 44, height: 44, borderRadius: 10, background: s.c + '1f', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ fontFamily: DT.serif, fontSize: 22, color: s.c }}>{s.n}</div>
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 500 }}>{s.l}</div>
              <div style={{ fontSize: 11, color: DT.ink3 }}>{s.sub}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div style={{ background: '#fff', borderRadius: 14, border: '1px solid ' + DT.hair, overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '70px 1.6fr 1.4fr 140px 120px 80px 60px', padding: '12px 18px', borderBottom: '1px solid ' + DT.hair, background: DT.bone2, fontFamily: DT.mono, fontSize: 10, color: DT.ink3, letterSpacing: 1.2, textTransform: 'uppercase', gap: 12 }}>
          <div>ID</div><div>Phrase / song</div><div>Context</div><div>State</div><div>Assignee</div><div>Conf</div><div/>
        </div>
        {rows.map((r, i) => (
          <div key={r.id} style={{ display: 'grid', gridTemplateColumns: '70px 1.6fr 1.4fr 140px 120px 80px 60px', padding: '14px 18px', borderBottom: i < rows.length - 1 ? '1px solid ' + DT.hair : 'none', alignItems: 'center', gap: 12 }}>
            <div style={{ fontFamily: DT.mono, fontSize: 11, color: DT.ink3 }}>{r.id}</div>
            <div>
              <div style={{ fontFamily: DT.serif, fontSize: 17, fontStyle: 'italic' }}>"{r.phrase}"</div>
              <div style={{ fontSize: 11, color: DT.ink3, marginTop: 2 }}>{r.song} · {r.artist}</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 6, height: 6, borderRadius: 3, background: urgencyColors[r.urgency] }}/>
              <span style={{ fontSize: 11, color: DT.ink3, textTransform: 'capitalize' }}>{r.urgency} priority</span>
            </div>
            <div>
              <span style={{ padding: '4px 8px', borderRadius: 6, fontSize: 11, fontWeight: 500, background: stateColors[r.state] + '1a', color: stateColors[r.state] }}>{r.state}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {r.assignee === '—' ? (
                <span style={{ fontSize: 11, color: DT.ink3, fontFamily: DT.mono }}>Unassigned</span>
              ) : (
                <>
                  <div style={{ width: 22, height: 22, borderRadius: 11, background: `linear-gradient(135deg, oklch(0.7 0.1 ${(r.id.charCodeAt(3) * 30) % 360}), oklch(0.5 0.12 ${(r.id.charCodeAt(4) * 25) % 360}))`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 9, fontWeight: 600 }}>{r.assignee}</div>
                  <span style={{ fontSize: 12 }}>{r.assignee}</span>
                </>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 28, height: 3, borderRadius: 2, background: DT.bone2, overflow: 'hidden' }}>
                <div style={{ width: r.conf + '%', height: '100%', background: r.conf >= 80 ? '#2A8F5E' : r.conf >= 65 ? DT.amber : '#C9482D' }}/>
              </div>
              <span style={{ fontFamily: DT.mono, fontSize: 10, color: DT.ink3 }}>{r.conf}</span>
            </div>
            <div style={{ textAlign: 'right' }}><SWIcon name="chevron" size={14} stroke={DT.ink3} sw={1.4}/></div>
          </div>
        ))}
      </div>

      {/* Inline entry drawer preview */}
      <div style={{ marginTop: 16, padding: 20, background: '#fff', borderRadius: 14, border: '1px solid ' + DT.hair, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <div>
          <div style={{ fontFamily: DT.mono, fontSize: 10, color: DT.ink3, letterSpacing: 1.4, textTransform: 'uppercase' }}>#4821 · Preview</div>
          <div style={{ fontFamily: DT.serif, fontSize: 28, fontStyle: 'italic', marginTop: 6, letterSpacing: -0.4 }}>"shekpe"</div>
          <div style={{ marginTop: 12, fontSize: 13, lineHeight: 1.5, color: DT.ink2 }}>
            A heightened party mood — specifically the energy of alcohol, music, and a dancefloor hitting at the same moment. Often used as an exclamation: "we dey shekpe."
          </div>
          <div style={{ marginTop: 12, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {['Pidgin','Party','Yoruba-derived','South-West'].map(x => (
              <span key={x} style={{ padding: '4px 8px', border: '1px solid ' + DT.hair, borderRadius: 6, fontSize: 11 }}>{x}</span>
            ))}
          </div>
        </div>
        <div>
          <div style={{ fontFamily: DT.mono, fontSize: 10, color: DT.ink3, letterSpacing: 1.4, textTransform: 'uppercase' }}>Actions</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 10 }}>
            {[
              { l: 'Approve · send to editor', ok: true },
              { l: 'Request changes', ok: false },
              { l: 'Reassign to another reviewer', ok: false },
              { l: 'Open linked GitHub issue #847', ok: false, mono: true },
            ].map((a,i) => (
              <div key={i} style={{ padding: '10px 14px', borderRadius: 8, background: a.ok ? DT.ink : 'transparent', color: a.ok ? DT.bone : DT.ink, border: a.ok ? 'none' : '1px solid ' + DT.hair, fontSize: 12, fontFamily: a.mono ? DT.mono : DT.sans, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span>{a.l}</span>
                <SWIcon name="arrowRight" size={13} stroke={a.ok ? DT.bone : DT.ink3} sw={1.4}/>
              </div>
            ))}
          </div>
        </div>
      </div>
    </DashChrome>
  );
}

// Wireframe card for other sections
function WireCard({ title, label, children, h = 300 }) {
  return (
    <div style={{ padding: 18, background: '#fff', borderRadius: 12, border: '1px dashed ' + DT.hair2, display: 'flex', flexDirection: 'column', gap: 10, minHeight: h }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontFamily: DT.mono, fontSize: 9, color: DT.ink3, letterSpacing: 1.6, textTransform: 'uppercase' }}>{label}</div>
          <div style={{ fontFamily: DT.serif, fontSize: 18, lineHeight: 1.1, marginTop: 4 }}>{title}</div>
        </div>
        <div style={{ padding: '3px 8px', borderRadius: 4, background: DT.bone2, fontFamily: DT.mono, fontSize: 9, color: DT.ink3 }}>WIREFRAME</div>
      </div>
      {children}
    </div>
  );
}

function WireframesDash() {
  const skel = (lines, w = '100%') => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {Array.from({length: lines}).map((_, i) => (
        <div key={i} style={{ height: 8, borderRadius: 2, background: DT.bone2, width: typeof w === 'function' ? w(i) : w }}/>
      ))}
    </div>
  );
  return (
    <DashChrome breadcrumb="Ops / Sections overview">
      <div style={{ marginBottom: 18 }}>
        <div style={{ fontFamily: DT.mono, fontSize: 10, color: DT.ink3, letterSpacing: 1.6, textTransform: 'uppercase' }}>Dashboard map</div>
        <div style={{ fontFamily: DT.serif, fontSize: 32, letterSpacing: -0.7, lineHeight: 1, marginTop: 4 }}>The other seven panels</div>
        <div style={{ fontSize: 12, color: DT.ink3, marginTop: 6 }}>Wireframes — information architecture for each section. Hi-fi designs ship with the content-ops launch.</div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
        {/* B. Content Gaps */}
        <WireCard label="B" title="Content gaps queue">
          <div style={{ display: 'flex', gap: 8 }}>
            <span style={{ padding: '3px 8px', borderRadius: 4, background: DT.bone2, fontSize: 10, fontFamily: DT.mono }}>URGENT · 6</span>
            <span style={{ padding: '3px 8px', borderRadius: 4, background: DT.bone2, fontSize: 10, fontFamily: DT.mono }}>NEW · 14</span>
          </div>
          {['"shekpe" · 184 searches','"e choke" · 142 searches','"yawa go gas" · 72 searches','"soft girl era" · 96 searches'].map(p => (
            <div key={p} style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '6px 0', borderBottom: '1px solid ' + DT.hair }}>
              <div style={{ fontFamily: DT.serif, fontStyle: 'italic', fontSize: 13, flex: 1 }}>{p}</div>
              <div style={{ width: 28, height: 3, borderRadius: 2, background: DT.bone2 }}><div style={{ width: '60%', height: '100%', background: DT.violet, borderRadius: 2 }}/></div>
            </div>
          ))}
        </WireCard>

        {/* D. GitHub */}
        <WireCard label="D" title="GitHub workflow panel">
          <div style={{ fontFamily: DT.mono, fontSize: 10, color: DT.ink3 }}>SYNC · 2m ago · main @ a7f2e9c</div>
          {[
            { t: '#847 · Add definition for "shekpe"', s: 'open' },
            { t: '#846 · Fix region for "wahala"', s: 'pr' },
            { t: '#844 · Update tone for "yawa"', s: 'merged' },
            { t: '#843 · 14 gaps batch', s: 'open' },
          ].map(r => (
            <div key={r.t} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0', borderBottom: '1px solid ' + DT.hair, fontSize: 11 }}>
              <span style={{ width: 8, height: 8, borderRadius: 4, background: r.s === 'merged' ? '#6F42C1' : r.s === 'pr' ? '#2A8F5E' : DT.amber }}/>
              <span style={{ flex: 1, fontFamily: DT.mono }}>{r.t}</span>
            </div>
          ))}
        </WireCard>

        {/* E. MCP */}
        <WireCard label="E" title="MCP · Automation">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
            {['gap-to-issue','lyric-scrape','conf-sweep','nudge-bot','qa-check','tag-region'].map((t,i) => (
              <div key={t} style={{ padding: '6px 8px', background: DT.bone2, borderRadius: 6, fontFamily: DT.mono, fontSize: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 5, height: 5, borderRadius: 3, background: i % 4 === 2 ? DT.amber : '#2A8F5E' }}/>
                {t}
              </div>
            ))}
          </div>
          {skel(3)}
        </WireCard>

        {/* F. Feedback */}
        <WireCard label="F" title="User feedback">
          {['Incorrect meaning — 12','Incomplete — 18','Wrong region — 6','Wrong tone — 4','Offensive — 1'].map(s => {
            const [l,n] = s.split(' — ');
            return (
              <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, padding: '4px 0' }}>
                <span style={{ flex: 1 }}>{l}</span>
                <div style={{ flex: 2, height: 4, borderRadius: 2, background: DT.bone2 }}><div style={{ width: (Number(n)*5)+'%', height: '100%', background: DT.ink, borderRadius: 2 }}/></div>
                <span style={{ fontFamily: DT.mono, fontSize: 10, color: DT.ink3, width: 24, textAlign: 'right' }}>{n}</span>
              </div>
            );
          })}
        </WireCard>

        {/* G. KB Quality */}
        <WireCard label="G" title="Knowledge base quality">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <svg width="64" height="64" viewBox="0 0 64 64">
              <circle cx="32" cy="32" r="26" fill="none" stroke={DT.hair2} strokeWidth="6"/>
              <circle cx="32" cy="32" r="26" fill="none" stroke={DT.ink} strokeWidth="6"
                strokeDasharray={`${2*Math.PI*26*0.82} ${2*Math.PI*26}`} strokeLinecap="round" transform="rotate(-90 32 32)"/>
              <text x="32" y="37" textAnchor="middle" fontFamily={DT.serif} fontSize="16">82</text>
            </svg>
            <div style={{ flex: 1, fontSize: 11, color: DT.ink3, lineHeight: 1.5 }}>
              Health score across 12,840 entries. Low-confidence clusters: Northern slang, Gen Z terms.
            </div>
          </div>
          {skel(3)}
        </WireCard>

        {/* H. Search Intel */}
        <WireCard label="H" title="Search intelligence">
          <div style={{ fontFamily: DT.mono, fontSize: 10, color: DT.ink3 }}>TRENDING · 24H</div>
          {['"shekpe" ↑ 184','"soft girl era" ↑ 96','"e choke" ↑ 142','"japa" → 68'].map(s => (
            <div key={s} style={{ fontFamily: DT.serif, fontStyle: 'italic', fontSize: 14, padding: '4px 0', borderBottom: '1px solid ' + DT.hair }}>{s}</div>
          ))}
        </WireCard>

        {/* I. Release */}
        <WireCard label="I" title="Release readiness / QA" h={240}>
          {[
            { l: 'Content coverage', v: 94, ok: true },
            { l: 'Editor sign-off', v: 72, ok: false },
            { l: 'Evals passing', v: 100, ok: true },
            { l: 'Blockers resolved', v: 60, ok: false },
          ].map(r => (
            <div key={r.l} style={{ marginBottom: 6 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
                <span>{r.l}</span>
                <span style={{ fontFamily: DT.mono, fontSize: 10, color: r.ok ? '#2A8F5E' : DT.amber }}>{r.v}%</span>
              </div>
              <div style={{ height: 4, borderRadius: 2, background: DT.bone2, marginTop: 3 }}>
                <div style={{ width: r.v + '%', height: '100%', background: r.ok ? '#2A8F5E' : DT.amber, borderRadius: 2 }}/>
              </div>
            </div>
          ))}
        </WireCard>
      </div>
    </DashChrome>
  );
}

Object.assign(window, { OverviewDash, ReviewQueueDash, WireframesDash });
