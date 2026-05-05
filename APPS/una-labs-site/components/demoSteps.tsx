import { ScreenBar, ScreenBadge, ScreenPulse, ScreenRow, ScreenSub, ScreenTitle } from './WorkflowAnimation';

export const demoSteps: Record<string, { label: string; screen: React.ReactNode }[]> = {
  intake: [
    {
      label: 'Step 1 — Client submits request',
      screen: (
        <div className="space-y-3">
          <ScreenTitle>New inquiry</ScreenTitle>
          <ScreenRow label="Name" value="Jordan Mensah" />
          <ScreenRow label="Company" value="Meridian Group" />
          <ScreenRow label="Need" value="Client portal + workflow automation" />
          <ScreenRow label="Team size" value="12–50" />
          <div className="mt-4">
            <ScreenPulse label="Submitting intake…" />
          </div>
        </div>
      ),
    },
    {
      label: 'Step 2 — Scope generated instantly',
      screen: (
        <div className="space-y-3">
          <ScreenTitle>AI scope summary</ScreenTitle>
          {['Client portal with role-based access', 'Automated onboarding workflow', 'Stripe billing integration', 'Admin reporting dashboard'].map((item) => (
            <div key={item} className="flex items-start gap-2">
              <span className="text-[#4DB8A8] mt-0.5 text-[11px]">✦</span>
              <span className="text-[12px] text-white/70">{item}</span>
            </div>
          ))}
          <div className="mt-3">
            <ScreenBadge variant="teal">Scope confirmed — no back-and-forth</ScreenBadge>
          </div>
        </div>
      ),
    },
    {
      label: 'Step 3 — Plan selected',
      screen: (
        <div className="space-y-2">
          <ScreenTitle>Choose a plan</ScreenTitle>
          {[
            { name: 'Starter', price: '$67/mo', active: false },
            { name: 'Professional', price: '$135/mo', active: true },
            { name: 'Agency', price: '$339/mo', active: false },
          ].map((plan) => (
            <div key={plan.name} className={['flex items-center justify-between rounded-xl px-3 py-2.5 border', plan.active ? 'border-[#4DB8A8] bg-[#4DB8A8]/10' : 'border-white/10'].join(' ')}>
              <span className={['text-[12px] font-medium', plan.active ? 'text-[#4DB8A8]' : 'text-white/50'].join(' ')}>{plan.name}</span>
              <span className={['text-[12px]', plan.active ? 'text-white' : 'text-white/30'].join(' ')}>{plan.price}</span>
            </div>
          ))}
        </div>
      ),
    },
    {
      label: 'Step 4 — Trial activated',
      screen: (
        <div className="flex flex-col items-center justify-center py-4 space-y-3 text-center">
          <div className="w-12 h-12 rounded-full bg-[#4DB8A8]/20 flex items-center justify-center">
            <span className="text-[#4DB8A8] text-xl">✓</span>
          </div>
          <ScreenTitle>14-day trial active</ScreenTitle>
          <ScreenRow label="Client" value="jordan@meridiangroup.co" />
          <ScreenRow label="Plan" value="Professional" accent />
          <ScreenRow label="Next step" value="Onboarding call booked" accent />
          <ScreenPulse label="No invoice chasing. Just delivery." />
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
          <ScreenSub>Generic AI can't do this. Saywetin can.</ScreenSub>
        </div>
      ),
    },
  ],
};
