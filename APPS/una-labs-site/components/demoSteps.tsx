import { ScreenBar, ScreenBadge, ScreenPulse, ScreenRow, ScreenSub, ScreenTitle } from './WorkflowAnimation';

export const demoSteps: Record<string, { label: string; screen: React.ReactNode }[]> = {
  intake: [
    {
      label: 'You describe what you need',
      screen: (
        <div className="space-y-3">
          <ScreenTitle>Tell us about your project</ScreenTitle>
          <ScreenRow label="Name" value="Alex Chen" />
          <ScreenRow label="Company" value="Meridian Co." />
          <ScreenRow label="What are you building?" value="Redesign our client onboarding experience" />
          <ScreenRow label="Timeline in mind?" value="About 3 weeks" />
          <div className="mt-4">
            <ScreenPulse label="Reviewing your request…" />
          </div>
        </div>
      ),
    },
    {
      label: 'We scope it before any commitment',
      screen: (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <ScreenTitle>Your scoped plan</ScreenTitle>
            <ScreenBadge variant="teal">Ready to review</ScreenBadge>
          </div>
          <ScreenSub>Client onboarding refresh · 3 week delivery</ScreenSub>
          <div className="grid grid-cols-2 gap-2 mt-3">
            {[
              { label: 'What we deliver', value: '4 milestones' },
              { label: 'Timeline', value: '3 weeks' },
              { label: 'How it works', value: 'Fixed scope' },
              { label: 'Pricing', value: 'Sent on approval', accent: true },
            ].map((f) => (
              <div key={f.label} className="rounded-xl bg-white/5 px-3 py-2">
                <p className="text-[10px] text-white/40">{f.label}</p>
                <p className={['text-[12px] font-semibold mt-0.5', f.accent ? 'text-[#4DB8A8]' : 'text-white'].join(' ')}>{f.value}</p>
              </div>
            ))}
          </div>
          <div className="mt-2 flex justify-end">
            <ScreenBadge variant="teal">Approve and start</ScreenBadge>
          </div>
        </div>
      ),
    },
    {
      label: 'Your workspace opens immediately',
      screen: (
        <div className="space-y-2">
          <ScreenTitle>Delivery milestones</ScreenTitle>
          {[
            { name: 'Discovery and audit complete', status: 'Done', color: 'green' as const },
            { name: 'Prototype under review', status: 'In progress', color: 'yellow' as const },
            { name: 'Staging handoff', status: 'Up next', color: 'default' as const },
            { name: 'Final delivery', status: 'Scheduled', color: 'default' as const },
          ].map((m) => (
            <div key={m.name} className="flex items-center justify-between py-1.5 border-b border-white/8 last:border-0">
              <span className="text-[12px] text-white/70">{m.name}</span>
              <ScreenBadge variant={m.color}>{m.status}</ScreenBadge>
            </div>
          ))}
          <div className="mt-2">
            <ScreenBar pct={50} />
          </div>
        </div>
      ),
    },
    {
      label: 'You get a clean handoff report',
      screen: (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <ScreenTitle>Handoff report</ScreenTitle>
            <ScreenBadge variant="green">Delivered</ScreenBadge>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[
              { value: '4', label: 'Milestones' },
              { value: 'On time', label: 'Delivery' },
              { value: 'Full docs', label: 'Handoff' },
            ].map((s) => (
              <div key={s.label} className="rounded-xl bg-white/5 px-2 py-2 text-center">
                <p className="text-[14px] font-bold text-[#4DB8A8]">{s.value}</p>
                <p className="text-[10px] text-white/40 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
          <ScreenBar pct={100} />
          <div className="mt-1">
            <ScreenBadge variant="teal">Download your handoff package</ScreenBadge>
          </div>
        </div>
      ),
    },
  ],

  dispatch: [
    {
      label: 'Step 1 — Customer submits request',
      screen: (
        <div className="space-y-3">
          <ScreenTitle>New service request</ScreenTitle>
          <ScreenRow label="Customer" value="Sophie L." />
          <ScreenRow label="Issue" value="Flat tire — won't inflate" />
          <ScreenRow label="Location" value="Bank St & Slater, Ottawa" />
          <ScreenRow label="Status" value="Submitted" />
          <div className="mt-4">
            <ScreenPulse label="Entering operator queue…" />
          </div>
        </div>
      ),
    },
    {
      label: 'Step 2 — Operator queue updates live',
      screen: (
        <div className="space-y-3">
          <ScreenTitle>Operator dashboard</ScreenTitle>
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] text-white/40">Active requests</span>
            <ScreenBadge variant="yellow">3 open</ScreenBadge>
          </div>
          {[
            { id: '#1041', issue: 'Dead battery', status: 'In progress', color: 'yellow' as const },
            { id: '#1042', issue: 'Flat tire', status: 'New', color: 'teal' as const },
            { id: '#1039', issue: 'Keys locked in', status: 'Resolved', color: 'green' as const },
          ].map((r) => (
            <div key={r.id} className="flex items-center justify-between py-1.5 border-b border-white/8 last:border-0">
              <span className="text-[11px] text-white/40">{r.id}</span>
              <span className="text-[12px] text-white/70">{r.issue}</span>
              <ScreenBadge variant={r.color}>{r.status}</ScreenBadge>
            </div>
          ))}
        </div>
      ),
    },
    {
      label: 'Step 3 — Status update, real-time',
      screen: (
        <div className="space-y-3">
          <ScreenTitle>Request #1042 — In Progress</ScreenTitle>
          <ScreenBar pct={60} />
          <ScreenSub>Technician dispatched · ETA 12 min</ScreenSub>
          <div className="mt-4 space-y-2">
            <ScreenRow label="Technician" value="Kwame A." />
            <ScreenRow label="Vehicle" value="White van · ON 4JKL22" />
            <ScreenRow label="Customer notified" value="Yes — SMS sent" accent />
          </div>
          <ScreenPulse label="Live — no manual refresh needed" />
        </div>
      ),
    },
    {
      label: 'Step 4 — Resolved & logged automatically',
      screen: (
        <div className="space-y-3">
          <ScreenTitle>Request #1042 — Resolved</ScreenTitle>
          <ScreenBar pct={100} color="#10b981" />
          <ScreenRow label="Resolution" value="Tire changed on-site" />
          <ScreenRow label="Duration" value="38 min" />
          <ScreenRow label="Logged at" value="14:22 EST" accent />
          <ScreenRow label="No manual entry" value="Auto-logged ✓" accent />
          <ScreenSub>Customer rated: ★★★★★</ScreenSub>
        </div>
      ),
    },
  ],

  peacepad: [
    {
      label: 'Step 1 — Structured data capture',
      screen: (
        <div className="space-y-3">
          <ScreenTitle>Situation intake</ScreenTitle>
          <ScreenRow label="Parties" value="2 residents" />
          <ScreenRow label="Context" value="Lease dispute — noise & damages" />
          <ScreenRow label="Prior attempts" value="1 mediation, unresolved" />
          <ScreenRow label="Urgency" value="Moderate" />
          <div className="mt-4">
            <ScreenPulse label="Sending to AI analysis…" />
          </div>
        </div>
      ),
    },
    {
      label: 'Step 2 — AI processing',
      screen: (
        <div className="flex flex-col items-center justify-center py-6 space-y-4 text-center">
          <div className="space-y-2 w-full max-w-xs">
            <ScreenSub>Parsing conflict structure</ScreenSub>
            <ScreenBar pct={100} />
            <ScreenSub>Identifying common ground</ScreenSub>
            <ScreenBar pct={78} />
            <ScreenSub>Generating resolution options</ScreenSub>
            <ScreenBar pct={45} />
          </div>
          <ScreenPulse label="AI working — calm, structured output ahead" />
        </div>
      ),
    },
    {
      label: 'Step 3 — Insights surfaced',
      screen: (
        <div className="space-y-3">
          <ScreenTitle>Key findings</ScreenTitle>
          {[
            'Core dispute is financial, not personal',
            'Both parties want to avoid tribunal',
            'Noise issue secondary — damages primary',
          ].map((item) => (
            <div key={item} className="flex items-start gap-2">
              <span className="text-[#4DB8A8] mt-0.5 text-[11px]">✦</span>
              <span className="text-[12px] text-white/70">{item}</span>
            </div>
          ))}
          <div className="mt-3">
            <ScreenBadge variant="teal">3 resolution paths identified</ScreenBadge>
          </div>
        </div>
      ),
    },
    {
      label: 'Step 4 — Report ready',
      screen: (
        <div className="space-y-3">
          <ScreenTitle>Mediation report</ScreenTitle>
          <ScreenRow label="Status" value="Complete" accent />
          <ScreenRow label="Pages" value="4" />
          <ScreenRow label="Options" value="3 resolution paths" />
          <ScreenRow label="Tone" value="Neutral, legally aware" />
          <div className="mt-4">
            <ScreenBadge variant="green">Ready to share with parties</ScreenBadge>
          </div>
          <ScreenSub>AI-backed. Human-reviewed. Trusted.</ScreenSub>
        </div>
      ),
    },
  ],

  saywetin: [
    {
      label: 'Step 1 — Input received',
      screen: (
        <div className="space-y-3">
          <ScreenTitle>Language input</ScreenTitle>
          <div className="rounded-xl bg-white/5 border border-white/10 px-4 py-3">
            <p className="text-[13px] text-white/80 italic">"Wetin dey happen for the area?"</p>
          </div>
          <ScreenRow label="Source" value="Voice input" />
          <ScreenRow label="Region hint" value="West Africa" />
          <div className="mt-4">
            <ScreenPulse label="Detecting language…" />
          </div>
        </div>
      ),
    },
    {
      label: 'Step 2 — Language identified',
      screen: (
        <div className="space-y-3">
          <ScreenTitle>Language detection</ScreenTitle>
          <ScreenRow label="Detected" value="Nigerian Pidgin" accent />
          <ScreenRow label="Confidence" value="97%" accent />
          <ScreenRow label="Variant" value="Lagos / Rivers blend" />
          <ScreenBar pct={97} />
          <div className="mt-3 flex gap-2 flex-wrap">
            <ScreenBadge variant="teal">Pidgin</ScreenBadge>
            <ScreenBadge>Yoruba influence</ScreenBadge>
            <ScreenBadge>Informal register</ScreenBadge>
          </div>
        </div>
      ),
    },
    {
      label: 'Step 3 — Cultural context mapped',
      screen: (
        <div className="space-y-3">
          <ScreenTitle>Cultural mapping</ScreenTitle>
          {[
            'Colloquial greeting — casual inquiry about local events',
            '"The area" = neighbourhood, not region',
            'Tone: friendly, not urgent',
          ].map((item) => (
            <div key={item} className="flex items-start gap-2">
              <span className="text-[#4DB8A8] mt-0.5 text-[11px]">✦</span>
              <span className="text-[12px] text-white/70">{item}</span>
            </div>
          ))}
          <div className="mt-3">
            <ScreenBadge variant="teal">Context-aware — not just translated</ScreenBadge>
          </div>
        </div>
      ),
    },
    {
      label: 'Step 4 — Response generated',
      screen: (
        <div className="space-y-3">
          <ScreenTitle>AI response</ScreenTitle>
          <div className="rounded-xl bg-white/5 border border-white/10 px-4 py-3">
            <p className="text-[12px] text-white/80">"Nothing do, area dey cool. You hear say market dey open again tomorrow?"</p>
          </div>
          <ScreenRow label="Register" value="Matched — informal" accent />
          <ScreenRow label="Cultural fit" value="High" accent />
          <ScreenSub>Generic AI can't do this. SayWetin can.</ScreenSub>
        </div>
      ),
    },
  ],
};
