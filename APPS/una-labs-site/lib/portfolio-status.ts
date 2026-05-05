import { STRIPE_API_URL } from '@/lib/stripe-config';

export type Rag = 'green' | 'yellow' | 'red';

export type StatusMetric = {
  label: string;
  value: string;
  detail: string;
  status?: Rag;
};

export type StatusRow = {
  name: string;
  status: Rag;
  detail: string;
};

export type StatusConnection = {
  name: string;
  status: Rag;
  url: string;
  detail: string;
  probeMode?: 'live' | 'manual';
  liveOkDetail?: string;
};

export type QuickLink = {
  label: string;
  href: string;
  external?: boolean;
};

export type ProjectStatusSummary = {
  key: string;
  name: string;
  tag: string;
  description: string;
  sourceLabel: string;
  refreshNote: string;
  generatedAt: string;
  metrics: StatusMetric[];
  delivery: StatusRow[];
  testing: StatusRow[];
  connections: StatusConnection[];
  blockers: string[];
  nextActions: string[];
  quickLinks: QuickLink[];
};

type WorkerModuleRow = {
  id: number;
  name: string;
  status: Rag;
  detail: string;
};

type WorkerTestingLane = {
  name: string;
  status: Rag;
  detail: string;
};

type WorkerConnection = {
  name: string;
  status: Rag;
  url: string;
  detail: string;
};

type WorkerAutoCollectHealth = {
  queue_total: number;
  queue_pending: number;
  queue_invite_sent: number;
  queue_paid: number;
  escalations: number;
  sent_today: number;
  daily_cap: number;
  remaining_daily_budget: number;
};

type WorkerSummary = {
  generated_at: string;
  score: { done: number; in_progress: number; not_started: number; total: number };
  modules: WorkerModuleRow[];
  testing: WorkerTestingLane[];
  connections: WorkerConnection[];
  autocollect: WorkerAutoCollectHealth | null;
};

function countStatuses(rows: Array<{ status: Rag }>) {
  return rows.reduce(
    (acc, row) => {
      acc[row.status] += 1;
      return acc;
    },
    { green: 0, yellow: 0, red: 0 }
  );
}

function projectTimestamp(): string {
  return new Date().toISOString();
}

async function fetchWorkerSummary(token?: string): Promise<WorkerSummary | null> {
  try {
    if (!token) return null;
    const res = await fetch(`${STRIPE_API_URL}/api/admin/status-summary`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    });
    const payload = (await res.json()) as { ok?: boolean; summary?: WorkerSummary };
    if (!res.ok || !payload.summary) return null;
    return payload.summary;
  } catch {
    return null;
  }
}

type E2ESuite = {
  id: string;
  status: string;
  checksPassed: number;
  checksTotal: number;
  reason?: string;
};

type E2EArtifact = {
  generatedAt?: string;
  suites?: E2ESuite[];
};

async function fetchE2EArtifact(): Promise<E2EArtifact | null> {
  try {
    const res = await fetch('/ops/portfolio-e2e-status.json', { cache: 'no-store' });
    if (!res.ok) return null;
    return (await res.json()) as E2EArtifact;
  } catch {
    return null;
  }
}

function applyE2ESuiteToConnections(
  connections: StatusConnection[],
  suites: E2ESuite[],
  suiteIds: string[],
): StatusConnection[] {
  const relevantSuites = suites.filter((s) => suiteIds.includes(s.id));
  if (relevantSuites.length === 0) return connections;
  const anyFailing = relevantSuites.some((s) => s.status === 'failing');
  const allPassing = relevantSuites.every((s) => s.status === 'passing');
  const passRate = relevantSuites.reduce((sum, s) => sum + s.checksPassed, 0) /
    Math.max(1, relevantSuites.reduce((sum, s) => sum + s.checksTotal, 0));

  return connections.map((conn) => {
    if (conn.probeMode !== 'manual') return conn;
    const rag: Rag = allPassing ? 'green' : anyFailing ? (passRate < 0.5 ? 'red' : 'yellow') : 'yellow';
    const detail = relevantSuites.map((s) => `${s.id}: ${s.reason ?? s.status}`).join(' | ');
    return { ...conn, status: rag, detail: `[CI] ${detail}` };
  });
}

async function probeConnection(connection: StatusConnection): Promise<StatusConnection> {
  if (connection.probeMode !== 'live') return connection;

  try {
    const response = await fetch(connection.url, {
      method: 'GET',
      cache: 'no-store',
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    return {
      ...connection,
      status: 'green',
      detail: connection.liveOkDetail ?? connection.detail,
    };
  } catch {
    return {
      ...connection,
      status: connection.status === 'green' ? 'yellow' : connection.status,
      detail: `${connection.detail} Live browser probe could not verify this endpoint yet.`,
    };
  }
}

async function applyConnectionProbes(project: ProjectStatusSummary): Promise<ProjectStatusSummary> {
  const connections = await Promise.all(project.connections.map(probeConnection));
  return { ...project, connections };
}

function transformWorkerSummary(summary: WorkerSummary): ProjectStatusSummary {
  const counts = countStatuses(summary.modules);
  const blockers = summary.modules
    .filter((item) => item.status !== 'green')
    .slice(0, 4)
    .map((item) => `${item.name}: ${item.detail}`);

  const nextActions = [
    'Keep AutoCollect telemetry green and preserve signed webhook delivery.',
    'Aggregate unit and integration lanes into the same live summary feed.',
    'Move release readiness from yellow to green with automated gates.',
  ];

  if (summary.autocollect) {
    nextActions.unshift(
      `AutoCollect queue ${summary.autocollect.queue_total}, escalations ${summary.autocollect.escalations}, remaining daily budget ${summary.autocollect.remaining_daily_budget}.`
    );
  }

  return {
    key: 'una-labs',
    name: 'Una Labs',
    tag: 'Platform',
    description: 'Live platform delivery board backed by the worker status summary.',
    sourceLabel: 'Live worker summary',
    refreshNote: 'This view auto-refreshes every 60 seconds from the live worker feed.',
    generatedAt: summary.generated_at,
    metrics: [
      {
        label: 'Sprint Score',
        value: `${summary.score.done}/${summary.score.total}`,
        detail: 'Modules marked done against the tracked parity board.',
        status: summary.score.not_started === 0 ? 'green' : 'yellow',
      },
      {
        label: 'Operational',
        value: `${counts.green}`,
        detail: 'Green modules currently operating as expected.',
        status: 'green',
      },
      {
        label: 'In Progress',
        value: `${counts.yellow}`,
        detail: 'Yellow modules still being hardened or aggregated.',
        status: counts.yellow > 0 ? 'yellow' : 'green',
      },
      {
        label: 'Not Started',
        value: `${counts.red}`,
        detail: 'Red modules or gates that still need implementation.',
        status: counts.red > 0 ? 'red' : 'green',
      },
    ],
    delivery: summary.modules.map((module) => ({
      name: `${module.id}. ${module.name}`,
      status: module.status,
      detail: module.detail,
    })),
    testing: summary.testing.map((lane) => ({
      name: lane.name,
      status: lane.status,
      detail: lane.detail,
    })),
    connections: summary.connections.map((connection) => ({
      name: connection.name,
      status: connection.status,
      url: connection.url,
      detail: connection.detail,
      probeMode: 'manual',
    })),
    blockers,
    nextActions,
    quickLinks: [
      { label: 'Open Status Endpoint', href: `${STRIPE_API_URL}/api/admin/status-summary`, external: true },
      { label: 'Start Your Project', href: '/start-project' },
      { label: 'Open Admin', href: '/admin' },
    ],
  };
}

function buildSayWetinSummary(): ProjectStatusSummary {
  return {
    key: 'saywetin',
    name: 'SayWetin',
    tag: 'Mobile App',
    description: 'Android-first product rescue lane focused on listen-mode quality and pure React Native migration readiness.',
    sourceLabel: 'Portfolio baseline + live endpoint probes',
    refreshNote: 'Connections refresh every 60 seconds. Delivery and testing lanes stay curated until CI and app telemetry are wired in.',
    generatedAt: projectTimestamp(),
    metrics: [
      {
        label: 'Priority Bug',
        value: 'Listen UI',
        detail: 'Broken Android listen-mode experience remains the top issue.',
        status: 'red',
      },
      {
        label: 'Mobile Strategy',
        value: 'RN active build',
        detail: 'React Native workspace bootstrapped, feature branch merged, EAS CI wired to Play Store.',
        status: 'yellow',
      },
      {
        label: 'Android Release',
        value: '1.3.4 / 37',
        detail: 'Latest EAS-built production release shipped via CI on 2026-05-01.',
        status: 'green',
      },
      {
        label: 'Feed Mode',
        value: 'Manual + probes',
        detail: 'Build velocity and release telemetry will become live after CI feed hookup.',
        status: 'yellow',
      },
    ],
    delivery: [
      {
        name: 'Pure React Native migration',
        status: 'yellow',
        detail: 'RN workspace active; headphone/vibe-search feature branch merged; audio, navigation, and state foundations in place.',
      },
      {
        name: 'Current Capacitor containment',
        status: 'yellow',
        detail: 'Capacitor remains active only to preserve service continuity while native replacement is underway.',
      },
      {
        name: 'Backend contract reuse',
        status: 'green',
        detail: 'Recognition, lyrics, and analysis APIs confirmed reusable by the RN client.',
      },
      {
        name: 'EAS CI release automation',
        status: 'yellow',
        detail: 'EAS build + submit pipeline wired to Play Store production track; credentials fixed, lock file stabilised.',
      },
      {
        name: 'Portfolio feed integration',
        status: 'yellow',
        detail: 'Dashboard tracks the project; repo-emitted build and test telemetry still pending.',
      },
    ],
    testing: [
      {
        name: 'Android listen regression',
        status: 'red',
        detail: 'Broken premium listen-mode experience on Android is still the top unresolved user-facing defect.',
      },
      {
        name: 'API recognition smoke',
        status: 'yellow',
        detail: 'Recognition pipeline reused successfully; confidence, timeout, and no-result behaviour still need tracked metrics.',
      },
      {
        name: 'RN feature parity',
        status: 'yellow',
        detail: 'Headphones detection, vibe search, and ritual navigator screens merged; full feature parity still in progress.',
      },
      {
        name: 'EAS Play Store pipeline',
        status: 'yellow',
        detail: 'EAS build + submit CI workflow is wired; last deployment was v1.3.4 (code 37) on 2026-05-01.',
      },
    ],
    connections: [
      {
        name: 'Public site',
        status: 'green',
        url: 'https://saywetin.app',
        detail: 'Cloudflare Pages contract is live for the public web surface.',
        probeMode: 'live',
        liveOkDetail: 'Public site responded to the live browser probe.',
      },
      {
        name: 'API health',
        status: 'yellow',
        url: 'https://api.saywetin.app/health',
        detail: 'Railway API is the split-host backend surface and may be intentionally lean outside active delivery windows.',
        probeMode: 'live',
        liveOkDetail: 'API health endpoint responded to the live browser probe.',
      },
      {
        name: 'EAS CI workflow',
        status: 'yellow',
        url: 'https://github.com/fefejiro/FTC-HOLDING/actions/workflows/saywetin-native-qa-playstore-prod.yml',
        detail: 'EAS build and Play Store submit workflow is active; last run triggered on push to main.',
        probeMode: 'manual',
      },
    ],
    blockers: [
      'Android listen-mode UI defect is still unresolved for existing Capacitor users.',
      'EAS CI stabilisation in progress — lock file and credentials fixes just pushed.',
      'No CI-fed mobile telemetry yet for build velocity or device pass rate.',
    ],
    nextActions: [
      'Confirm clean EAS CI run after lock file fix (run #25258457394).',
      'Complete RN feature parity for listen-mode and publish a CI status-summary artifact.',
      'Add Samsung device regression lanes and wire results into this dashboard.',
    ],
    quickLinks: [
      { label: 'Open SayWetin', href: 'https://saywetin.app', external: true },
      { label: 'API Health', href: 'https://api.saywetin.app/health', external: true },
      { label: 'Current Status Board', href: '/status?project=saywetin' },
    ],
  };
}

function buildPeacePadSummary(): ProjectStatusSummary {
  return {
    key: 'peacepad',
    name: 'PeacePad',
    tag: 'Mobile App',
    description: 'Guest-first co-parenting app with active production surfaces and a deeper testing toolkit already documented.',
    sourceLabel: 'Portfolio baseline + live endpoint probes',
    refreshNote: 'Connections refresh every 60 seconds. Delivery lanes are seeded from the current release handoff and package scripts.',
    generatedAt: projectTimestamp(),
    metrics: [
      {
        label: 'Android Release',
        value: '1.0.9 / 41',
        detail: 'Prepared next Android version from the current release status note.',
        status: 'green',
      },
      {
        label: 'Production Web',
        value: 'Live',
        detail: 'Web surface is live on peacepad.ca.',
        status: 'green',
      },
      {
        label: 'Testing Tooling',
        value: 'Playwright + Vitest',
        detail: 'Project already carries smoke, E2E, and test-report scripts.',
        status: 'green',
      },
      {
        label: 'Feed Mode',
        value: 'Manual + probes',
        detail: 'Ready to graduate into the shared repo-emitted status schema.',
        status: 'yellow',
      },
    ],
    delivery: [
      {
        name: 'MVP refocus release',
        status: 'green',
        detail: 'Messages, Prep Chat, Calendar, and Settings are live in the current MVP focus.',
      },
      {
        name: 'Android release cadence',
        status: 'yellow',
        detail: 'Play Store flow is documented and prepared, but not yet feeding the shared dashboard automatically.',
      },
      {
        name: 'Status feed onboarding',
        status: 'yellow',
        detail: 'Project is a strong second candidate for the portfolio status schema after SayWetin.',
      },
    ],
    testing: [
      {
        name: 'Vitest lane',
        status: 'green',
        detail: 'Unit test command exists in package scripts.',
      },
      {
        name: 'Playwright smoke lanes',
        status: 'green',
        detail: 'Critical and production-readiness smoke lanes already exist in scripts.',
      },
      {
        name: 'Portfolio telemetry hookup',
        status: 'yellow',
        detail: 'Need normalized output so the shared board reflects current test results without manual updates.',
      },
    ],
    connections: [
      {
        name: 'Public site',
        status: 'green',
        url: 'https://peacepad.ca',
        detail: 'Public web surface is reported live in the release status handoff.',
        probeMode: 'live',
        liveOkDetail: 'Public site responded to the live browser probe.',
      },
      {
        name: 'API health',
        status: 'green',
        url: 'https://api.peacepad.ca',
        detail: 'API production surface is reported live in the release status handoff.',
        probeMode: 'live',
        liveOkDetail: 'API endpoint responded to the live browser probe.',
      },
    ],
    blockers: [
      'Shared status schema is not yet emitted directly from the repo.',
      'Release and test telemetry still live in scripts and docs instead of one machine-readable feed.',
    ],
    nextActions: [
      'Reuse the SayWetin status-summary schema once the first feed is stable.',
      'Push smoke and test report outputs into the portfolio dashboard automatically.',
    ],
    quickLinks: [
      { label: 'Open PeacePad', href: 'https://peacepad.ca', external: true },
      { label: 'Open API', href: 'https://api.peacepad.ca', external: true },
      { label: 'Current Status Board', href: '/status?project=peacepad' },
    ],
  };
}

function buildDispatchSummary(): ProjectStatusSummary {
  return {
    key: 'dispatch',
    name: 'Dispatch',
    tag: 'Operations App',
    description: 'Roadside assistance product with public request flow, operator console, private admin host, and a documented Capacitor Android release lane.',
    sourceLabel: 'Portfolio baseline + live endpoint probes',
    refreshNote: 'Connections refresh every 60 seconds. Delivery lanes are seeded from the current live-product and release workflow docs.',
    generatedAt: projectTimestamp(),
    metrics: [
      {
        label: 'Production Surface',
        value: 'Live',
        detail: 'Dispatch public, operator, and admin routes are documented as active.',
        status: 'green',
      },
      {
        label: 'Android Workflow',
        value: 'AAB automation',
        detail: 'One-command Capacitor Android bundling is already documented in the repo.',
        status: 'green',
      },
      {
        label: 'Test Lane',
        value: 'Road alerts smoke',
        detail: 'Focused mobile smoke test exists for operator tab and Road Alerts logic.',
        status: 'green',
      },
      {
        label: 'Feed Mode',
        value: 'Manual + probes',
        detail: 'Project still needs normalized status-summary output for velocity and release telemetry.',
        status: 'yellow',
      },
    ],
    delivery: [
      {
        name: 'Public production runtime',
        status: 'green',
        detail: 'Public request intake and operator surfaces are live on dispatch.unalabs.cloud.',
      },
      {
        name: 'Private admin host',
        status: 'green',
        detail: 'Remote admin is split onto the private host with server-side upstream protection.',
      },
      {
        name: 'Capacitor mobile update workflow',
        status: 'green',
        detail: 'Native/plugin changes still flow through a documented one-command Android bundle path.',
      },
      {
        name: 'Portfolio feed integration',
        status: 'yellow',
        detail: 'Dispatch should emit the shared status schema so build, deploy, and smoke telemetry stop living only in docs.',
      },
    ],
    testing: [
      {
        name: 'Road alerts smoke',
        status: 'green',
        detail: 'Playwright smoke command exists for operator tab logic and road-alert rendering.',
      },
      {
        name: 'Desktop troubleshooting lane',
        status: 'green',
        detail: 'Desktop-first local debugging workflow is explicitly documented for rapid iteration.',
      },
      {
        name: 'Shared telemetry onboarding',
        status: 'yellow',
        detail: 'Need CI-fed outputs for smoke, build, and deploy status in the common dashboard.',
      },
    ],
    connections: [
      {
        name: 'Public site',
        status: 'green',
        url: 'https://dispatch.unalabs.cloud',
        detail: 'Primary live request surface for roadside operations.',
        probeMode: 'live',
        liveOkDetail: 'Public site responded to the live browser probe.',
      },
      {
        name: 'Public health',
        status: 'green',
        url: 'https://dispatch.unalabs.cloud/health',
        detail: 'Public health endpoint is documented as returning 200 on the branded host.',
        probeMode: 'live',
        liveOkDetail: 'Public health endpoint responded to the live browser probe.',
      },
      {
        name: 'Railway fallback',
        status: 'yellow',
        url: 'https://dispatch-api-production.up.railway.app/health',
        detail: 'Railway origin exists as the fallback runtime behind the branded route layer.',
        probeMode: 'live',
        liveOkDetail: 'Railway fallback health endpoint responded to the live browser probe.',
      },
    ],
    blockers: [
      'Dispatch is not yet publishing a normalized status-summary artifact into the portfolio board.',
      'Build and smoke outcomes still require repo-level feed wiring instead of direct dashboard ingestion.',
    ],
    nextActions: [
      'Emit Dispatch build, smoke, and deploy results into the shared status-summary schema.',
      'Add operator/admin availability metrics and queue health once the first machine-readable feed exists.',
    ],
    quickLinks: [
      { label: 'Open Dispatch', href: 'https://dispatch.unalabs.cloud', external: true },
      { label: 'Public Health', href: 'https://dispatch.unalabs.cloud/health', external: true },
      { label: 'Current Status Board', href: '/status?project=dispatch' },
    ],
  };
}

function buildAteamSummary(): ProjectStatusSummary {
  return {
    key: 'ateam',
    name: 'ATEAM',
    tag: 'Ops Platform',
    description: 'AI-native operating system with private operator surfaces, workflow engine, public app host, and managed storage cutover tracks.',
    sourceLabel: 'Portfolio baseline + live endpoint probes',
    refreshNote: 'Connections refresh every 60 seconds. Delivery lanes are seeded from the canonical README and runbook until a project feed is wired.',
    generatedAt: projectTimestamp(),
    metrics: [
      {
        label: 'Runtime Model',
        value: 'Hybrid app + engine',
        detail: 'ATEAM is both a product surface and a reusable operations engine.',
        status: 'green',
      },
      {
        label: 'Storage Cutover',
        value: 'Postgres preferred',
        detail: 'Managed runtime path now prefers direct Postgres with safe fallback support.',
        status: 'yellow',
      },
      {
        label: 'Test Tooling',
        value: 'Jest + verify',
        detail: 'Backend tests and server verification commands are already defined.',
        status: 'green',
      },
      {
        label: 'Feed Mode',
        value: 'Manual + probes',
        detail: 'Workflow health, public app health, and storage posture should be emitted into the portfolio schema next.',
        status: 'yellow',
      },
    ],
    delivery: [
      {
        name: 'Mission Control UI',
        status: 'green',
        detail: 'Office, Team, Factory, and command-station surfaces are already part of the canonical app shell.',
      },
      {
        name: 'Public and private route split',
        status: 'green',
        detail: 'ops.unalabs.cloud and ateam.unalabs.cloud runtime boundaries are documented in the runbook.',
      },
      {
        name: 'Managed storage cutover',
        status: 'yellow',
        detail: 'Preferred Postgres path is defined, but dashboard-level telemetry is not yet wired to show cutover posture live.',
      },
      {
        name: 'Portfolio feed integration',
        status: 'yellow',
        detail: 'ATEAM should export workflow, health, and deploy summary data into the shared schema.',
      },
    ],
    testing: [
      {
        name: 'Backend tests',
        status: 'green',
        detail: 'Jest backend test command exists at the root package.',
      },
      {
        name: 'Server verification',
        status: 'green',
        detail: 'Dedicated syntax and entrypoint verification command already exists.',
      },
      {
        name: 'Managed runtime confidence',
        status: 'yellow',
        detail: 'Need live health/status fields for storage backend, workflow queue, and operator route confidence.',
      },
    ],
    connections: [
      {
        name: 'Public app host',
        status: 'yellow',
        url: 'https://ateam.unalabs.cloud',
        detail: 'Preferred standalone public host is documented, but live browser probe still needs confirmation from the deployed runtime.',
        probeMode: 'live',
        liveOkDetail: 'Public app host responded to the live browser probe.',
      },
      {
        name: 'Private ops host',
        status: 'yellow',
        url: 'https://ops.unalabs.cloud',
        detail: 'Private operator host is documented behind Access or fallback auth.',
        probeMode: 'live',
        liveOkDetail: 'Private ops host responded to the live browser probe.',
      },
    ],
    blockers: [
      'ATEAM does not yet emit a shared portfolio status artifact.',
      'Storage backend posture and workflow-run telemetry are not surfaced in one shared JSON feed yet.',
    ],
    nextActions: [
      'Publish ATEAM /health-backed status fields into the portfolio schema.',
      'Add workflow-run counts, storage backend mode, and operator route readiness to the control tower.',
    ],
    quickLinks: [
      { label: 'Open ATEAM', href: 'https://ateam.unalabs.cloud', external: true },
      { label: 'Open Ops Host', href: 'https://ops.unalabs.cloud', external: true },
      { label: 'Current Status Board', href: '/status?project=ateam' },
    ],
  };
}

function buildAnionSummary(): ProjectStatusSummary {
  return {
    key: 'anion',
    name: 'Anion Class App',
    tag: 'Education Product',
    description: 'Premium classroom and tutoring platform foundation with repo-native governance, schema planning, and status-feed scaffolding.',
    sourceLabel: 'Repo baseline + pending shared feed',
    refreshNote: 'This project already has a status artifact and master snapshot contract. Live deployment probes remain pending until the first runtime is shipped.',
    generatedAt: projectTimestamp(),
    metrics: [
      {
        label: 'Foundation',
        value: 'scaffolded',
        detail: 'Docs, app shells, schema proposal, and shared packages are in place.',
        status: 'green',
      },
      {
        label: 'Dashboard Feed',
        value: 'contract ready',
        detail: 'Repo status artifact and master snapshot path exist; live portfolio feed remains the next step.',
        status: 'yellow',
      },
      {
        label: 'Web Runtime',
        value: 'pending',
        detail: 'No deployed Cloudflare runtime yet.',
        status: 'yellow',
      },
      {
        label: 'Mobile Runtime',
        value: 'pending',
        detail: 'React Native scaffold exists but app-store delivery is not active yet.',
        status: 'yellow',
      },
    ],
    delivery: [
      {
        name: 'Governance wrapper',
        status: 'green',
        detail: 'FTC project-governance skill now exists and can be reused on future product scaffolds.',
      },
      {
        name: 'Web and mobile shell',
        status: 'green',
        detail: 'Initial route, screen, component, and shared package stubs are in the repo.',
      },
      {
        name: 'Portfolio feed integration',
        status: 'yellow',
        detail: 'Status contract and master sync exist, but live deployed telemetry is not wired yet.',
      },
    ],
    testing: [
      {
        name: 'Schema review readiness',
        status: 'green',
        detail: 'The initial data model is documented and mirrored in a reference SQL migration.',
      },
      {
        name: 'Status sync readiness',
        status: 'green',
        detail: 'Repo script can synchronize the status artifact into docs and FTC master snapshot.',
      },
      {
        name: 'Runtime validation',
        status: 'yellow',
        detail: 'No live build, smoke, or deployment validation exists yet for the new app.',
      },
    ],
    connections: [
      {
        name: 'Portfolio status board',
        status: 'green',
        url: '/status?project=anion',
        detail: 'The shared dashboard now has a first-pass Anion slot and narrative placeholder.',
        probeMode: 'manual',
      },
      {
        name: 'Canonical repo status',
        status: 'green',
        url: '/status?project=anion',
        detail: 'Anion status lives in repo docs and the master snapshot until a live runtime is deployed.',
        probeMode: 'manual',
      },
    ],
    blockers: [
      'No deployed runtime exists yet for health probes or live telemetry.',
      'Auth, discovery, booking, subscription, and lesson flows are still TODO-backed stubs.',
    ],
    nextActions: [
      'Implement Supabase auth and role-aware profile setup.',
      'Implement tutor discovery, availability, and booking flows.',
      'Attach deployed health endpoints and feed them into the shared portfolio board.',
    ],
    quickLinks: [
      { label: 'Current Status Board', href: '/status?project=anion' },
      { label: 'FTC Master Snapshot', href: '/status?project=anion' },
    ],
  };
}

function buildFallbackUnaLabsSummary(): ProjectStatusSummary {
  return {
    key: 'una-labs',
    name: 'Una Labs',
    tag: 'Platform',
    description: 'Fallback portfolio view when the live worker summary is temporarily unavailable.',
    sourceLabel: 'Fallback view',
    refreshNote: 'Worker summary could not be loaded in this browser session, so the page is showing the dashboard shell and static links.',
    generatedAt: projectTimestamp(),
    metrics: [
      {
        label: 'Worker Feed',
        value: 'Unavailable',
        detail: 'Live platform summary could not be loaded right now.',
        status: 'yellow',
      },
      {
        label: 'Dashboard Mode',
        value: 'Fallback',
        detail: 'The control tower shell is still active so projects remain visible.',
        status: 'yellow',
      },
      {
        label: 'Current Focus',
        value: 'Portfolio control tower',
        detail: 'This page is now the shared status surface for all products.',
        status: 'green',
      },
      {
        label: 'Next Step',
        value: 'Restore live feed',
        detail: 'Worker summary endpoint should be checked if this persists.',
        status: 'yellow',
      },
    ],
    delivery: [
      {
        name: 'Portfolio dashboard shell',
        status: 'green',
        detail: 'Project switching and shared status layout are now implemented.',
      },
      {
        name: 'Worker summary ingest',
        status: 'yellow',
        detail: 'Retry loading the live summary if the fallback view persists.',
      },
    ],
    testing: [
      {
        name: 'Dashboard smoke',
        status: 'yellow',
        detail: 'Validate the page after build and refresh cycles.',
      },
    ],
    connections: [
      {
        name: 'Worker status endpoint',
        status: 'yellow',
        url: `${STRIPE_API_URL}/api/admin/status-summary`,
        detail: 'Open the admin endpoint directly to confirm payload availability.',
        probeMode: 'manual',
      },
    ],
    blockers: ['Live worker summary was not available in this browser session.'],
    nextActions: ['Verify the worker endpoint and keep the shared dashboard shell active.'],
    quickLinks: [
      { label: 'Open Worker Summary', href: `${STRIPE_API_URL}/api/admin/status-summary`, external: true },
      { label: 'Open Admin', href: '/admin' },
    ],
  };
}

export async function loadPortfolioStatus(token?: string): Promise<ProjectStatusSummary[]> {
  const [workerSummary, e2eArtifact] = await Promise.all([
    fetchWorkerSummary(token),
    fetchE2EArtifact(),
  ]);

  const suites = e2eArtifact?.suites ?? [];

  function withE2E(project: ProjectStatusSummary, ids: string[]): ProjectStatusSummary {
    if (suites.length === 0 || ids.length === 0) return project;
    return { ...project, connections: applyE2ESuiteToConnections(project.connections, suites, ids) };
  }

  const projects = [
    workerSummary ? transformWorkerSummary(workerSummary) : buildFallbackUnaLabsSummary(),
    buildAnionSummary(),
    withE2E(buildSayWetinSummary(), ['saywetin', 'saywetin-api']),
    withE2E(buildPeacePadSummary(), ['peacepad', 'peacepad-api']),
    withE2E(buildDispatchSummary(), ['dispatch']),
    withE2E(buildAteamSummary(), ['ateam']),
  ];

  return Promise.all(projects.map(applyConnectionProbes));
}
