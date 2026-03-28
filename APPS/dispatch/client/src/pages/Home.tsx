import { useQuery } from '@tanstack/react-query';
import {
  BellRing,
  Fuel,
  KeyRound,
  MapPin,
  PhoneCall,
  ShieldCheck,
  Siren,
  TriangleAlert,
  Zap,
} from 'lucide-react';

type StatusResponse = {
  ok: boolean;
  sseClients: number;
  notifications?: {
    webPushConfigured?: boolean;
  };
  incidentMonitor?: {
    running?: boolean;
    sourceCount?: number;
    lastSuccessAt?: string | null;
  };
};

const roadsideServices = [
  { label: 'Gas delivery', Icon: Fuel },
  { label: 'Lockout help', Icon: KeyRound },
  { label: 'Jump start', Icon: Zap },
  { label: 'Tire change', Icon: TriangleAlert },
];

const publicFlow = [
  {
    title: 'Request help',
    body: 'The stranded driver shares the need and location in one quick intake.',
  },
  {
    title: 'System routes it',
    body: 'Dispatch classifies the job, checks incident signals, and pushes the next action.',
  },
  {
    title: 'Operator moves',
    body: 'The nearest operator sees the job, claims it, and updates the status live.',
  },
];

function formatTime(value?: string | null) {
  if (!value) return 'Waiting for the first successful poll';
  return new Date(value).toLocaleString('en-CA', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export default function HomePage() {
  const { data } = useQuery<StatusResponse>({
    queryKey: ['dispatch-status'],
    queryFn: async () => {
      const response = await fetch('/api/status');
      if (!response.ok) throw new Error('Unable to load Dispatch status');
      return response.json();
    },
    staleTime: 30_000,
  });

  const sourceCount = data?.incidentMonitor?.sourceCount ?? 2;
  const liveSourcesLabel = `${sourceCount} official incident source${sourceCount === 1 ? '' : 's'}`;

  return (
    <div className="min-h-dvh bg-dispatch-bg text-white">
      <div className="mx-auto flex max-w-6xl flex-col gap-10 px-6 pb-16 pt-10">
        <header className="flex flex-col gap-4 border-b border-dispatch-border pb-8 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-500 shadow-xl shadow-orange-500/25">
              <Siren className="h-6 w-6 text-white" />
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.3em] text-orange-400">
                Ottawa Roadside
              </div>
              <div className="text-lg font-semibold text-white">Dispatch</div>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <a
              href="/request"
              className="inline-flex items-center justify-center rounded-xl bg-orange-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-orange-400"
            >
              Get help now
            </a>
            <a
              href="/operator"
              className="inline-flex items-center justify-center rounded-xl border border-dispatch-border bg-dispatch-surface px-5 py-3 text-sm font-semibold text-slate-200 transition hover:border-slate-500"
            >
              Operator sign in
            </a>
          </div>
        </header>

        <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-orange-500/20 bg-orange-500/10 px-4 py-2 text-sm font-medium text-orange-300">
              <BellRing className="h-4 w-4" />
              Roadside requests plus live incident watch
            </div>
            <div className="space-y-4">
              <h1 className="max-w-3xl text-4xl font-bold leading-tight tracking-tight md:text-6xl">
                Fast roadside help for Ottawa, with real dispatch behind it.
              </h1>
              <p className="max-w-2xl text-lg leading-8 text-slate-300">
                Dispatch handles direct roadside requests first, then layers in live incident monitoring
                so operators can respond faster when the right opportunity appears.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {roadsideServices.map(({ label, Icon }) => (
                <div
                  key={label}
                  className="flex items-center gap-3 rounded-2xl border border-dispatch-border bg-dispatch-surface px-4 py-4"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500/10">
                    <Icon className="h-5 w-5 text-orange-400" />
                  </div>
                  <div className="font-medium text-slate-100">{label}</div>
                </div>
              ))}
            </div>
          </div>

          <aside className="rounded-3xl border border-dispatch-border bg-dispatch-surface p-6 shadow-2xl shadow-black/20">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <div className="text-sm font-semibold uppercase tracking-[0.25em] text-orange-400">
                  Live system
                </div>
                <h2 className="mt-2 text-2xl font-semibold">Dispatch status</h2>
              </div>
              <div className="rounded-full bg-emerald-500/10 px-3 py-1 text-sm font-medium text-emerald-300">
                {data?.incidentMonitor?.running ? 'Running' : 'Starting'}
              </div>
            </div>

            <div className="space-y-3">
              <div className="rounded-2xl border border-dispatch-border bg-dispatch-bg/70 p-4">
                <div className="text-sm text-slate-400">Incident watch</div>
                <div className="mt-1 text-lg font-semibold text-white">{liveSourcesLabel}</div>
              </div>
              <div className="rounded-2xl border border-dispatch-border bg-dispatch-bg/70 p-4">
                <div className="text-sm text-slate-400">Operator browser feed</div>
                <div className="mt-1 text-lg font-semibold text-white">
                  {data?.sseClients ?? 0} live connection{data?.sseClients === 1 ? '' : 's'}
                </div>
              </div>
              <div className="rounded-2xl border border-dispatch-border bg-dispatch-bg/70 p-4">
                <div className="text-sm text-slate-400">Push delivery</div>
                <div className="mt-1 text-lg font-semibold text-white">
                  {data?.notifications?.webPushConfigured ? 'Configured' : 'Not configured'}
                </div>
              </div>
              <div className="rounded-2xl border border-dispatch-border bg-dispatch-bg/70 p-4">
                <div className="text-sm text-slate-400">Last successful poll</div>
                <div className="mt-1 text-lg font-semibold text-white">
                  {formatTime(data?.incidentMonitor?.lastSuccessAt)}
                </div>
              </div>
            </div>
          </aside>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          {publicFlow.map((step) => (
            <div
              key={step.title}
              className="rounded-3xl border border-dispatch-border bg-dispatch-surface p-6"
            >
              <div className="text-sm font-semibold uppercase tracking-[0.25em] text-orange-400">
                Flow
              </div>
              <h3 className="mt-3 text-2xl font-semibold">{step.title}</h3>
              <p className="mt-3 leading-7 text-slate-300">{step.body}</p>
            </div>
          ))}
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          <div className="rounded-3xl border border-dispatch-border bg-dispatch-surface p-6">
            <div className="mb-3 flex items-center gap-3">
              <MapPin className="h-5 w-5 text-orange-400" />
              <h3 className="text-xl font-semibold">Built for Ottawa roadside work</h3>
            </div>
            <p className="leading-7 text-slate-300">
              The product starts with direct customer requests for fuel delivery, lockouts, jump
              starts, and tire changes. Incident feeds support the workflow, but they do not replace
              the main intake.
            </p>
          </div>

          <div className="rounded-3xl border border-dispatch-border bg-dispatch-surface p-6">
            <div className="mb-3 flex items-center gap-3">
              <ShieldCheck className="h-5 w-5 text-orange-400" />
              <h3 className="text-xl font-semibold">Lean, practical, no app-store dependency</h3>
            </div>
            <p className="leading-7 text-slate-300">
              The public side works in the browser right now. Operators can still get live updates,
              and the system can grow into towing and broader dispatch later without rebuilding the
              core.
            </p>
          </div>
        </section>

        <section className="rounded-3xl border border-dispatch-border bg-gradient-to-r from-orange-500/10 to-amber-500/10 p-6 md:p-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="flex items-center gap-2 text-orange-300">
                <PhoneCall className="h-4 w-4" />
                Start the real flow
              </div>
              <h3 className="mt-2 text-2xl font-semibold">Need roadside help right now?</h3>
              <p className="mt-2 max-w-2xl leading-7 text-slate-300">
                Open the request form, share the issue and location, and Dispatch will move it into
                the operator workflow immediately.
              </p>
            </div>
            <a
              href="/request"
              className="inline-flex items-center justify-center rounded-xl bg-orange-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-orange-400"
            >
              Open request form
            </a>
          </div>
        </section>
      </div>
    </div>
  );
}
