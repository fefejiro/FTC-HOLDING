import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  AlertTriangle,
  CheckCircle2,
  CircleDot,
  Clock,
  Fuel,
  KeyRound,
  Loader2,
  Lock,
  MapPin,
  Navigation2,
  Phone,
  Plus,
  RefreshCw,
  Shield,
  User,
  Wrench,
  X,
  Zap,
} from 'lucide-react';
import SourceMonitorSummary from '../components/SourceMonitorSummary';
import DispatchLoginShell from '../components/DispatchLoginShell';
import { loginRoleHref } from '../lib/loginRoleRoutes';
import { cn } from '../lib/cn';
import {
  SIGNAL_WORKFLOW_BADGES,
  SIGNAL_WORKFLOW_LABELS,
  type SignalWorkflowStatus,
  normalizeSignalWorkflowStatus,
} from '../lib/signalWorkflow';
import {
  DEFAULT_DISPATCH_REGION,
  DISPATCH_REGION_ORDER,
  type DispatchRegionKey,
  getDispatchRegion,
} from '../../../shared/dispatchRegions';

type ServiceType = 'gas' | 'lockout' | 'jump' | 'tire' | 'other';
type RequestStatus = 'pending' | 'accepted' | 'en_route' | 'completed' | 'cancelled';

interface ServiceRequest {
  id: string;
  customerName: string;
  customerPhone: string;
  locationLat: number | null;
  locationLng: number | null;
  locationAddress: string | null;
  serviceType: ServiceType;
  status: RequestStatus;
  operatorId: string | null;
  notes: string | null;
  createdAt: string;
  acceptedAt: string | null;
  completedAt: string | null;
}

interface Operator {
  id: string;
  name: string;
  phone: string | null;
  active: boolean;
}

interface OperatorLocationRecord {
  id: string;
  name: string;
  phone: string | null;
  active: boolean;
  lastLocationLat: number | null;
  lastLocationLng: number | null;
  lastLocationLabel: string | null;
  lastLocationAccuracyMeters: number | null;
  lastLocationAt: string | null;
}

interface IncidentSummaryItem {
  id: string;
  eventType: string | null;
  roadway: string | null;
  description: string | null;
  viewCount: number | null;
  actionCount: number | null;
  actioned: boolean | null;
  lastViewedAt: string | null;
  lastActionedAt: string | null;
}

interface IncidentSummaryResponse {
  region?: {
    key: DispatchRegionKey;
    label: string;
    coverageLabel: string;
  };
  total: number;
  received: number;
  beingPursued: number;
  handled: number;
  notLegit: number;
  viewed: number;
  actioned: number;
  notActioned: number;
  viewedNotActioned: number;
  totalViewEvents: number;
  totalActionEvents: number;
  recentViewed: IncidentSummaryItem[];
  recentActioned: IncidentSummaryItem[];
}

interface IncidentFeedItem {
  id: string;
  eventType: string | null;
  description: string | null;
  roadway: string | null;
  locationLat: number | null;
  locationLng: number | null;
  severity: string | null;
  alerted: boolean | null;
  startDate?: string | null;
  lastUpdated?: string | null;
  occurredAt?: string | null;
  isHistorical?: boolean;
  workflowStatus?: SignalWorkflowStatus | null;
  workflowOperatorId?: string | null;
  workflowStartedAt?: string | null;
  workflowResolvedAt?: string | null;
  createdAt: string;
  viewCount?: number | null;
  actionCount?: number | null;
}

interface IncidentSourceSummaryResponse {
  ok: boolean;
  region?: {
    key: DispatchRegionKey;
    label: string;
    coverageLabel: string;
  };
  date: string;
  dayLabel: string;
  sourceCount: number;
  items: Array<{
    key: string;
    label: string;
    rawCount: number;
    actionableCount: number;
    tierLabel?: string;
    statusLabel?: string;
    pollState?: string;
    lastError?: string | null;
  }>;
}

type AdminFilter = 'all' | 'pending' | 'active' | 'completed' | 'cancelled';
type IncidentListFilter = 'all' | 'received' | 'being_pursued' | 'handled' | 'not_legit';
type IncidentSourceFilter = 'on511' | 'ottawa_traffic' | 'octranspo' | 'tomtom' | 'waze';

const SERVICE_ICONS: Record<ServiceType, React.ComponentType<{ className?: string }>> = {
  gas: Fuel,
  lockout: KeyRound,
  jump: Zap,
  tire: CircleDot,
  other: Wrench,
};

const SERVICE_LABELS: Record<ServiceType, string> = {
  gas: 'Gas',
  lockout: 'Lockout',
  jump: 'Jump Start',
  tire: 'Tire',
  other: 'Other',
};

const STATUS_BADGE: Record<RequestStatus, string> = {
  pending: 'bg-amber-500/15 text-amber-400',
  accepted: 'bg-blue-500/15 text-blue-400',
  en_route: 'bg-purple-500/15 text-purple-400',
  completed: 'bg-green-500/15 text-green-400',
  cancelled: 'bg-slate-700/50 text-slate-500',
};

const STATUS_LABEL: Record<RequestStatus, string> = {
  pending: 'New',
  accepted: 'Claimed',
  en_route: 'Heading there',
  completed: 'Completed',
  cancelled: 'Unable / Ignored',
};

const ALL_STATUSES: RequestStatus[] = ['pending', 'accepted', 'en_route', 'completed', 'cancelled'];

function fmt(str: string | null) {
  if (!str) return 'Not available';
  return new Date(str).toLocaleString('en-CA', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function fmtOptional(str?: string | null) {
  if (!str) return 'Not available';
  return fmt(str);
}

function incidentOccurredAt(incident: IncidentFeedItem) {
  return incident.occurredAt || incident.lastUpdated || incident.startDate || incident.createdAt;
}

function incidentLabel(incident: IncidentFeedItem) {
  const eventType = String(incident.eventType || '').trim();
  if (!eventType) return 'Incident';
  return eventType
    .toLowerCase()
    .split('_')
    .map((word) => (word ? `${word[0]?.toUpperCase()}${word.slice(1)}` : ''))
    .join(' ');
}

function incidentSourceLabel(incident: IncidentFeedItem) {
  if (incident.id.startsWith('on511:')) return 'Ontario 511';
  if (incident.id.startsWith('ottawa_traffic:')) return 'City of Ottawa traffic';
  if (incident.id.startsWith('octranspo:')) return 'OC Transpo service alerts';
  if (incident.id.startsWith('tomtom:')) return 'TomTom traffic';
  if (incident.id.startsWith('waze:')) return 'Waze (experimental)';
  return 'Live incident feed';
}

function incidentMapsUrl(incident: IncidentFeedItem, regionKey: DispatchRegionKey) {
  if (incident.locationLat !== null && incident.locationLng !== null) {
    return `https://maps.google.com/?q=${incident.locationLat},${incident.locationLng}`;
  }
  if (incident.roadway) {
    return `https://maps.google.com/search/?api=1&query=${encodeURIComponent(`${incident.roadway}, ${getDispatchRegion(regionKey).locationSuffix}`)}`;
  }
  return null;
}

function timeAgo(str?: string | null) {
  if (!str) return 'Unknown';
  const ms = Date.now() - new Date(str).getTime();
  if (!Number.isFinite(ms)) return 'Unknown';
  const mins = Math.round(ms / 60000);
  if (mins < 1) return 'Now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.round(hrs / 24)}d ago`;
}

function shortId(id: string) {
  return id.split('-')[0] || id;
}

function mapsUrl(lat: number | null, lng: number | null) {
  if (lat === null || lng === null) return null;
  return `https://maps.google.com/?q=${lat},${lng}`;
}

function filterRequests(requests: ServiceRequest[], filter: AdminFilter) {
  if (filter === 'pending') {
    return requests.filter((request) => request.status === 'pending');
  }
  if (filter === 'active') {
    return requests.filter((request) => ['accepted', 'en_route'].includes(request.status));
  }
  if (filter === 'completed') {
    return requests.filter((request) => request.status === 'completed');
  }
  if (filter === 'cancelled') {
    return requests.filter((request) => request.status === 'cancelled');
  }
  return requests;
}

// ── Admin Login ───────────────────────────────────────────────────────────────

function AdminLogin({ onSuccess }: { onSuccess: (token: string | null) => void }) {
  const [pin, setPin] = useState('8701');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showResetHelp, setShowResetHelp] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!pin) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin }),
      });
      const data = (await res.json()) as { ok?: boolean; token?: string | null; error?: string };
      if (!res.ok || !data.ok) {
        setError(data.error || 'Incorrect PIN');
        return;
      }
      sessionStorage.setItem('dispatch_admin_authenticated', '1');
      if (data.token) {
        sessionStorage.setItem('dispatch_admin_token', data.token);
      }
      onSuccess(data.token ?? null);
    } catch {
      setError('Network error. Try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <DispatchLoginShell
      activeRole="admin"
      icon={<Shield className="w-7 h-7" />}
      eyebrow="Ottawa roadside operations"
      title="Dispatch sign in"
      subtitle="Use the oversight PIN to review live jobs, operator coverage, and incident activity across Dispatch."
      footer={
        <div className="space-y-3">
          <button
            type="button"
            onClick={() => setShowResetHelp((current) => !current)}
            className="text-sm font-semibold text-orange-300 hover:text-orange-200 transition-colors"
          >
            {showResetHelp ? 'Hide PIN reset help' : 'Reset PIN'}
          </button>
          {showResetHelp ? (
            <div className="rounded-xl border border-dispatch-border bg-dispatch-bg/70 p-3 text-sm text-slate-400 leading-relaxed">
              <div className="font-semibold text-white">Admin reset</div>
              <p className="mt-1">The current backup admin PIN is <span className="font-semibold text-white">8701</span>. We can move this back to environment-only later if you want a tighter setup.</p>
            </div>
          ) : null}
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="relative">
            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
            <input
              type="password"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="Admin PIN"
              inputMode="numeric"
              autoFocus
              className="w-full bg-dispatch-surface border border-dispatch-border rounded-xl pl-10 pr-4 py-3.5 text-white placeholder-slate-600 focus:outline-none focus:border-orange-500 text-sm tracking-widest transition-colors text-center"
            />
          </div>
          {error && (
            <div className="flex items-center gap-1.5 text-red-400 text-xs justify-center">
              <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}
          <button
            type="submit"
            disabled={loading || !pin}
            className="py-3.5 rounded-xl bg-orange-500 text-white font-bold text-sm hover:bg-orange-400 active:bg-orange-600 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Checking...
              </>
            ) : (
              'Continue'
            )}
          </button>
      </form>
    </DispatchLoginShell>
  );
}

// ── Add Operator Form ─────────────────────────────────────────────────────────

function AddOperatorForm({
  onClose,
  adminToken,
}: {
  onClose: () => void;
  adminToken: string | null;
}) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('9090');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name || !pin || pin.length < 4) {
      setError('Name and a 4+ digit PIN are required.');
      return;
    }
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (adminToken) headers['x-dispatch-admin-proxy-key'] = adminToken;
      const res = await fetch('/api/operators', {
        method: 'POST',
        headers,
        body: JSON.stringify({ name, phone, pin }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok) {
        setError(data.error || 'Failed to create operator.');
        return;
      }
      setSuccess(`Operator "${name}" created.`);
      setName('');
      setPhone('');
      setPin('9090');
      setTimeout(onClose, 1500);
    } catch {
      setError('Network error. Try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-dispatch-surface border border-dispatch-border rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-white font-bold text-[15px]">New Operator</h2>
        <button
          onClick={onClose}
          className="text-slate-500 hover:text-slate-300 transition-colors p-1 rounded-lg hover:bg-slate-700/50"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <div className="relative">
          <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Full name"
            className="w-full bg-dispatch-bg border border-dispatch-border rounded-xl pl-10 pr-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:border-orange-500 text-sm transition-colors"
          />
        </div>
        <div className="relative">
          <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Phone (optional)"
            className="w-full bg-dispatch-bg border border-dispatch-border rounded-xl pl-10 pr-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:border-orange-500 text-sm transition-colors"
          />
        </div>
        <div className="relative">
          <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
          <input
            type="password"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            placeholder="PIN (min 4 digits)"
            inputMode="numeric"
            className="w-full bg-dispatch-bg border border-dispatch-border rounded-xl pl-10 pr-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:border-orange-500 text-sm tracking-widest transition-colors"
          />
        </div>
        <p className="-mt-1 text-[11px] text-slate-500">Default operator PIN is 9090. You can set a different one here if needed.</p>
        {error && (
          <div className="flex items-center gap-1.5 text-red-400 text-xs">
            <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}
        {success && (
          <div className="flex items-center gap-1.5 text-green-400 text-xs">
            <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
            <span>{success}</span>
          </div>
        )}
        <button
          type="submit"
          disabled={loading}
          className="py-3 rounded-xl bg-orange-500 text-white font-bold text-sm hover:bg-orange-400 active:bg-orange-600 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" /> Creating...
            </>
          ) : (
            'Create Operator'
          )}
        </button>
      </form>
    </div>
  );
}

// ── Admin Dashboard ───────────────────────────────────────────────────────────

function AdminDashboard({
  adminToken,
  onSignOut,
}: {
  adminToken: string | null;
  onSignOut: () => void;
}) {
  const queryClient = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [activeFilter, setActiveFilter] = useState<AdminFilter>('all');
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const [selectedOperatorId, setSelectedOperatorId] = useState<string>('unassigned');
  const [assigningId, setAssigningId] = useState<string | null>(null);
  const [statusChangingId, setStatusChangingId] = useState<string | null>(null);
  const [testPushState, setTestPushState] = useState<'idle' | 'sending' | 'ok' | 'error'>('idle');
  const [testPushResult, setTestPushResult] = useState('');
  const [activeIncidentId, setActiveIncidentId] = useState<string | null>(null);
  const [incidentListFilter, setIncidentListFilter] = useState<IncidentListFilter>('all');
  const [incidentSource, setIncidentSource] = useState<IncidentSourceFilter | null>(null);
  const [regionKey, setRegionKey] = useState<DispatchRegionKey>(DEFAULT_DISPATCH_REGION);
  const [probeState, setProbeState] = useState<'idle' | 'probing' | 'ok' | 'error'>('idle');
  const [probeResult, setProbeResult] = useState('');
  const activeRegion = getDispatchRegion(regionKey);

  const adminFetch = useCallback(
    (url: string, options: RequestInit = {}) => {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (adminToken) headers['x-dispatch-admin-proxy-key'] = adminToken;
      return fetch(url, { ...options, headers: { ...headers, ...(options.headers as Record<string, string> ?? {}) } });
    },
    [adminToken],
  );

  async function handleTestPush() {
    setTestPushState('sending');
    setTestPushResult('');
    try {
      const res = await adminFetch('/api/admin/test-push', { method: 'POST' });
      const data = (await res.json()) as { ok?: boolean; sent?: number; skipped?: number; error?: string };
      if (!res.ok || !data.ok) {
        setTestPushState('error');
        setTestPushResult(data.error || 'Push failed');
      } else {
        setTestPushState('ok');
        setTestPushResult(`Sent to ${data.sent ?? 0} operator(s), ${data.skipped ?? 0} skipped (no subscription)`);
      }
    } catch {
      setTestPushState('error');
      setTestPushResult('Network error');
    }
    setTimeout(() => setTestPushState('idle'), 5000);
  }

  async function handleSourceProbe() {
    setProbeState('probing');
    setProbeResult('');
    try {
      const res = await adminFetch('/api/admin/sources/probe', {
        method: 'POST',
        body: JSON.stringify({ source: incidentSource ?? 'waze', region: regionKey }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        rawCount?: number;
        actionableCount?: number;
        inserted?: number;
        error?: string;
        rateLimited?: boolean;
      };
      if (!res.ok || !data.ok) {
        setProbeState('error');
        setProbeResult(data.error || 'Source probe failed');
      } else {
        setProbeState('ok');
        setProbeResult(`Raw ${data.rawCount ?? 0} • actionable ${data.actionableCount ?? 0} • inserted ${data.inserted ?? 0}`);
        await queryClient.invalidateQueries({ queryKey: ['incident-source-summary', regionKey] });
        await queryClient.invalidateQueries({ queryKey: ['admin-incidents', regionKey] });
      }
    } catch {
      setProbeState('error');
      setProbeResult('Network error');
    }
    setTimeout(() => setProbeState('idle'), 6000);
  }

  const { data: requests = [], isLoading, refetch, isFetching } = useQuery<ServiceRequest[]>({
    queryKey: ['admin-requests'],
    queryFn: async () => {
      const res = await adminFetch('/api/requests');
      if (!res.ok) throw new Error('Failed to load');
      return res.json() as Promise<ServiceRequest[]>;
    },
    refetchInterval: 30_000,
  });

  const { data: operators = [] } = useQuery<Operator[]>({
    queryKey: ['operators'],
    queryFn: async () => {
      const res = await fetch('/api/operators');
      if (!res.ok) throw new Error('Failed to load operators');
      return res.json() as Promise<Operator[]>;
    },
  });

  const { data: operatorLocations = [] } = useQuery<OperatorLocationRecord[]>({
    queryKey: ['admin-operator-locations'],
    queryFn: async () => {
      const res = await adminFetch('/api/admin/operators/locations');
      if (!res.ok) throw new Error('Failed to load operator locations');
      return res.json() as Promise<OperatorLocationRecord[]>;
    },
    refetchInterval: 30_000,
  });

  const { data: status } = useQuery<{
    incidentMonitor?: {
      sources?: Array<{
        key: string;
        tierLabel?: string;
        statusLabel?: string;
        pollState?: string;
        lastError?: string | null;
      }>;
    };
  }>({
    queryKey: ['dispatch-status', regionKey],
    queryFn: async () => {
      const res = await adminFetch(`/api/status?region=${regionKey}`);
      if (!res.ok) throw new Error('Failed to load source status');
      return res.json();
    },
    refetchInterval: 30_000,
    staleTime: 15_000,
  });

  const { data: sourceSummary } = useQuery<IncidentSourceSummaryResponse>({
    queryKey: ['incident-source-summary', regionKey],
    queryFn: async () => {
      const res = await adminFetch(`/api/incidents/source-summary?region=${regionKey}`);
      if (!res.ok) throw new Error('Failed to load source summary');
      return res.json() as Promise<IncidentSourceSummaryResponse>;
    },
    refetchInterval: 60_000,
    staleTime: 30_000,
  });

  const { data: incidentSummary } = useQuery<IncidentSummaryResponse>({
    queryKey: ['admin-incident-summary', regionKey],
    queryFn: async () => {
      const res = await adminFetch(`/api/admin/incidents/summary?region=${regionKey}`);
      if (!res.ok) throw new Error('Failed to load incident summary');
      return res.json() as Promise<IncidentSummaryResponse>;
    },
    refetchInterval: 30_000,
  });

  const {
    data: incidentFeed = [],
    isLoading: incidentsLoading,
    isFetching: incidentsFetching,
    refetch: refetchIncidents,
  } = useQuery<IncidentFeedItem[]>({
    queryKey: ['admin-incidents', regionKey, incidentSource],
    queryFn: async () => {
      const params = new URLSearchParams({ mode: 'all', limit: '80', region: regionKey, scope: 'all' });
      if (incidentSource) params.set('source', incidentSource);
      if (sourceSummary?.date) params.set('date', sourceSummary.date);
      const res = await adminFetch(`/api/incidents?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to load incidents');
      return res.json() as Promise<IncidentFeedItem[]>;
    },
    refetchInterval: 30_000,
    staleTime: 10_000,
  });

  const stats = {
    total: requests.length,
    pending: requests.filter((r) => r.status === 'pending').length,
    active: requests.filter((r) => ['accepted', 'en_route'].includes(r.status)).length,
    completed: requests.filter((r) => r.status === 'completed').length,
    cancelled: requests.filter((r) => r.status === 'cancelled').length,
  };

  const filteredRequests = filterRequests(requests, activeFilter);
  const filteredIncidents = useMemo(() => {
    if (incidentListFilter === 'received') {
      return incidentFeed.filter(
        (incident) => normalizeSignalWorkflowStatus(incident.workflowStatus) === 'new_signal',
      );
    }
    if (incidentListFilter === 'being_pursued') {
      return incidentFeed.filter(
        (incident) => normalizeSignalWorkflowStatus(incident.workflowStatus) === 'heading_there',
      );
    }
    if (incidentListFilter === 'handled') {
      return incidentFeed.filter(
        (incident) => normalizeSignalWorkflowStatus(incident.workflowStatus) === 'handled',
      );
    }
    if (incidentListFilter === 'not_legit') {
      return incidentFeed.filter(
        (incident) =>
          normalizeSignalWorkflowStatus(incident.workflowStatus) ===
          'not_legit_or_not_serviceable',
      );
    }
    return incidentFeed;
  }, [incidentFeed, incidentListFilter]);
  const operatorNameById = useMemo(
    () =>
      new Map(
        operators.map((operator) => [operator.id, operator.name] as const),
      ),
    [operators],
  );
  const sourceCount = sourceSummary?.sourceCount ?? 5;
  const sourceMonitorItems = useMemo(
    () =>
      (sourceSummary?.items ?? []).map((item) => {
        const liveSource = status?.incidentMonitor?.sources?.find((source) => source.key === item.key);
        return {
          ...item,
          tierLabel: liveSource?.tierLabel ?? item.tierLabel,
          statusLabel: liveSource?.statusLabel ?? item.statusLabel,
          pollState: liveSource?.pollState ?? item.pollState,
          lastError: liveSource?.lastError ?? item.lastError ?? null,
        };
      }),
    [sourceSummary?.items, status?.incidentMonitor?.sources],
  );
  const sourceSummaryDayLabel = sourceSummary?.dayLabel ?? 'today';
  const selectedIncidentSourceLabel =
    sourceMonitorItems.find((item) => item.key === incidentSource)?.label ?? null;
  const selectedRequest =
    filteredRequests.find((request) => request.id === selectedRequestId) ?? filteredRequests[0] ?? null;

  // Sync assign dropdown to the selected request's current operator
  useEffect(() => {
    setSelectedOperatorId(selectedRequest?.operatorId ?? 'unassigned');
  }, [selectedRequest?.id]);

  useEffect(() => {
    if (!filteredRequests.length) {
      if (selectedRequestId !== null) setSelectedRequestId(null);
      return;
    }
    const stillVisible = filteredRequests.some((request) => request.id === selectedRequestId);
    if (!stillVisible) setSelectedRequestId(filteredRequests[0].id);
  }, [filteredRequests, selectedRequestId]);

  useEffect(() => {
    if (!filteredIncidents.length) {
      if (activeIncidentId !== null) setActiveIncidentId(null);
      return;
    }
    const stillVisible = filteredIncidents.some((incident) => incident.id === activeIncidentId);
    if (!stillVisible) setActiveIncidentId(filteredIncidents[0].id);
  }, [filteredIncidents, activeIncidentId]);

  async function handleAssign(requestId: string) {
    setAssigningId(requestId);
    try {
      await adminFetch(`/api/requests/${requestId}/assign`, {
        method: 'PATCH',
        body: JSON.stringify({
          operatorId: selectedOperatorId === 'unassigned' ? null : selectedOperatorId,
          accept: selectedOperatorId !== 'unassigned',
        }),
      });
      await queryClient.invalidateQueries({ queryKey: ['admin-requests'] });
    } finally {
      setAssigningId(null);
    }
  }

  async function handleStatusChange(requestId: string, status: RequestStatus) {
    setStatusChangingId(requestId);
    try {
      await adminFetch(`/api/requests/${requestId}/admin-status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      await queryClient.invalidateQueries({ queryKey: ['admin-requests'] });
    } finally {
      setStatusChangingId(null);
    }
  }

  const filterMeta: Array<{
    key: AdminFilter;
    label: string;
    value: number;
    cls: string;
    emptyLabel: string;
    listLabel: string;
  }> = [
    {
      key: 'all',
      label: 'Total',
      value: stats.total,
      cls: 'text-white',
      emptyLabel: 'No jobs yet.',
      listLabel: 'All Jobs',
    },
    {
      key: 'pending',
      label: 'New',
      value: stats.pending,
      cls: 'text-amber-400',
      emptyLabel: 'No new jobs right now.',
      listLabel: 'New Jobs',
    },
    {
      key: 'active',
      label: 'In progress',
      value: stats.active,
      cls: 'text-blue-400',
      emptyLabel: 'No in-progress jobs right now.',
      listLabel: 'Jobs In Progress',
    },
    {
      key: 'completed',
      label: 'Completed',
      value: stats.completed,
      cls: 'text-green-400',
      emptyLabel: 'No completed jobs yet.',
      listLabel: 'Completed Jobs',
    },
    {
      key: 'cancelled',
      label: 'Unable / Ignored',
      value: stats.cancelled,
      cls: 'text-slate-300',
      emptyLabel: 'No ignored or unable-to-complete jobs yet.',
      listLabel: 'Unable / Ignored Jobs',
    },
  ];

  const activeFilterMeta = filterMeta.find((item) => item.key === activeFilter) ?? filterMeta[0];

  return (
    <div className="min-h-dvh bg-dispatch-bg">
      <div className="border-b border-dispatch-border px-5 pt-12 pb-5">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-dispatch-surface border border-dispatch-border rounded-xl flex items-center justify-center">
              <Shield className="w-5 h-5 text-slate-300" />
            </div>
            <div>
              <h1 className="text-white font-bold text-xl">Admin oversight</h1>
              <p className="text-slate-500 text-xs">Monitor live signal pursuit, operator movement, and simple field outcomes across {activeRegion.label}.</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <a href={loginRoleHref('operator')} className="text-xs text-slate-500 hover:text-slate-300 transition-colors">
              Operator view
            </a>
            <button
              type="button"
              onClick={onSignOut}
              className="text-xs text-slate-500 hover:text-white transition-colors"
            >
              Sign out
            </button>
          </div>
        </div>
      </div>

      <div className="px-5 py-5 flex flex-col gap-5 pb-10">
        <div className="flex flex-wrap items-center gap-2">
          {DISPATCH_REGION_ORDER.map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setRegionKey(key)}
              className={cn(
                'rounded-xl border px-3 py-2 text-xs font-semibold transition-colors',
                regionKey === key
                  ? 'border-orange-500/40 bg-orange-500/10 text-orange-100'
                  : 'border-dispatch-border bg-dispatch-surface text-slate-400 hover:text-white',
              )}
            >
              {getDispatchRegion(key).label}
            </button>
          ))}
          <span className="text-[11px] text-slate-500">{activeRegion.coverageLabel}</span>
          <button
            type="button"
            onClick={handleSourceProbe}
            className={cn(
              'ml-auto inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold transition-colors',
              probeState === 'probing'
                ? 'border-orange-500/40 text-orange-200'
                : 'border-dispatch-border bg-dispatch-surface text-slate-300 hover:text-white',
            )}
          >
            <RefreshCw className={cn('w-3.5 h-3.5', probeState === 'probing' && 'animate-spin')} />
            Probe {incidentSource ? sourceMonitorItems.find((item) => item.key === incidentSource)?.label ?? incidentSource : 'Waze'}
          </button>
        </div>
        {probeResult ? (
          <div className={cn(
            'rounded-xl border px-3 py-2 text-xs',
            probeState === 'error'
              ? 'border-red-500/20 bg-red-500/10 text-red-200'
              : 'border-cyan-500/20 bg-cyan-500/10 text-cyan-200',
          )}>
            {probeResult}
          </div>
        ) : null}

        <SourceMonitorSummary
          sourceCount={sourceCount}
          items={sourceMonitorItems}
          dayLabel={sourceSummaryDayLabel}
          selectedKey={incidentSource}
          onSelect={(key) => {
            setIncidentSource((key as IncidentSourceFilter | null) ?? null);
            setActiveIncidentId(null);
          }}
        />

        <div className="grid grid-cols-2 lg:grid-cols-5 gap-2">
          {filterMeta.map((stat) => (
            <button
              key={stat.label}
              type="button"
              onClick={() => setActiveFilter(stat.key)}
              aria-pressed={activeFilter === stat.key}
              className={cn(
                'bg-dispatch-surface border rounded-xl p-3 text-center transition-all',
                activeFilter === stat.key
                  ? 'border-orange-500/50 shadow-[0_0_0_1px_rgba(249,115,22,0.15)]'
                  : 'border-dispatch-border hover:border-slate-600',
              )}
            >
              <div className={cn('text-2xl font-bold tabular-nums leading-none', stat.cls)}>
                {stat.value}
              </div>
              <div className="text-slate-600 text-[11px] font-medium mt-1.5">{stat.label}</div>
              <div className="text-[10px] text-slate-700 mt-1">
                {activeFilter === stat.key ? 'Showing now' : 'Open view'}
              </div>
            </button>
          ))}
        </div>

        <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
          <section className="bg-dispatch-surface border border-dispatch-border rounded-2xl p-5">
            <div className="flex items-center justify-between gap-3 mb-4">
              <div>
                <h2 className="text-white font-bold text-[15px]">Signal workflow</h2>
                <p className="text-slate-500 text-xs mt-1">Simple field truth for received signals, pursuit, handled outcomes, and signals that were not legitimate or serviceable.</p>
              </div>
              <div className="text-[11px] text-slate-600">
                {incidentSummary ? `${incidentSummary.total} tracked incidents in ${activeRegion.label}` : 'Loading...'}
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
              {[
                { key: 'all' as const, label: 'All tracked', value: incidentSummary?.total ?? 0, tone: 'text-white' },
                { key: 'received' as const, label: 'Received', value: incidentSummary?.received ?? 0, tone: 'text-amber-300' },
                { key: 'being_pursued' as const, label: 'Being pursued', value: incidentSummary?.beingPursued ?? 0, tone: 'text-blue-300' },
                { key: 'handled' as const, label: 'Handled', value: incidentSummary?.handled ?? 0, tone: 'text-green-300' },
                { key: 'not_legit' as const, label: 'Not legit / not serviceable', value: incidentSummary?.notLegit ?? 0, tone: 'text-slate-200' },
              ].map((stat) => (
                <button
                  key={stat.label}
                  type="button"
                  onClick={() => setIncidentListFilter(stat.key)}
                  className={cn(
                    'bg-dispatch-bg border rounded-xl p-3 text-left transition-all',
                    incidentListFilter === stat.key
                      ? 'border-orange-500/40 shadow-[0_0_0_1px_rgba(249,115,22,0.15)]'
                      : 'border-dispatch-border hover:border-slate-600',
                  )}
                >
                  <div className={cn('text-2xl font-bold tabular-nums', stat.tone)}>{stat.value}</div>
                  <div className="text-slate-600 text-[11px] uppercase tracking-[0.14em] font-semibold mt-1.5">{stat.label}</div>
                </button>
              ))}
            </div>
            <div className="grid md:grid-cols-2 gap-3 mt-4">
              <div className="bg-dispatch-bg border border-dispatch-border rounded-xl p-3">
                <div className="text-slate-600 text-[11px] uppercase tracking-[0.14em] font-semibold mb-2">Recent viewed</div>
                <div className="space-y-2">
                  {(incidentSummary?.recentViewed ?? []).length === 0 ? (
                    <div className="text-slate-600 text-xs">No incident views tracked yet.</div>
                  ) : (
                    (incidentSummary?.recentViewed ?? []).map((incident) => (
                      <div key={`view-${incident.id}`} className="text-xs text-slate-300">
                        <div className="font-semibold text-white">{incident.roadway || incident.eventType || 'Incident'}</div>
                        <div className="text-slate-500 mt-0.5">{fmt(incident.lastViewedAt)} • {(incident.viewCount ?? 0)} view(s)</div>
                      </div>
                    ))
                  )}
                </div>
              </div>
              <div className="bg-dispatch-bg border border-dispatch-border rounded-xl p-3">
                <div className="text-slate-600 text-[11px] uppercase tracking-[0.14em] font-semibold mb-2">Recent actioned</div>
                <div className="space-y-2">
                  {(incidentSummary?.recentActioned ?? []).length === 0 ? (
                    <div className="text-slate-600 text-xs">No incident actions tracked yet.</div>
                  ) : (
                    (incidentSummary?.recentActioned ?? []).map((incident) => (
                      <div key={`action-${incident.id}`} className="text-xs text-slate-300">
                        <div className="font-semibold text-white">{incident.roadway || incident.eventType || 'Incident'}</div>
                        <div className="text-slate-500 mt-0.5">{fmt(incident.lastActionedAt)} • {(incident.actionCount ?? 0)} action(s)</div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
            <div className="mt-4 bg-dispatch-bg border border-dispatch-border rounded-xl p-3">
              <div className="flex items-center justify-between gap-3 mb-2">
                <div>
                  <div className="text-white text-sm font-semibold">Live incident feed</div>
                  <div className="text-slate-500 text-xs mt-0.5">
                    {selectedIncidentSourceLabel
                      ? `Filtered to persisted ${selectedIncidentSourceLabel} incidents for ${sourceSummaryDayLabel}.`
                      : `${activeRegion.label} slice from the configured live incident sources.`}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => refetchIncidents()}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-lg border border-dispatch-border px-3 py-2 text-xs transition-colors',
                    incidentsFetching ? 'text-orange-300 border-orange-500/40' : 'text-slate-400 hover:text-white',
                  )}
                >
                  <RefreshCw className={cn('w-3.5 h-3.5', incidentsFetching && 'animate-spin')} />
                  {incidentsFetching ? 'Refreshing...' : 'Refresh incidents'}
                </button>
              </div>
              {selectedIncidentSourceLabel ? (
                <div className="mb-2 flex items-center justify-between gap-3 rounded-xl border border-orange-500/20 bg-orange-500/10 px-3 py-2.5 text-[11px] text-orange-200">
                  <span>Source filter active: {selectedIncidentSourceLabel}</span>
                  <button
                    type="button"
                    onClick={() => setIncidentSource(null)}
                    className="font-semibold text-orange-100 hover:text-white"
                  >
                    Show all sources
                  </button>
                </div>
              ) : null}
              {incidentsLoading ? (
                <div className="text-slate-500 text-xs py-3 flex items-center gap-2">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Loading incidents...
                </div>
              ) : filteredIncidents.length === 0 ? (
                <div className="text-slate-500 text-xs py-3">
                  {selectedIncidentSourceLabel
                    ? `No ${selectedIncidentSourceLabel} incidents for this filter right now.`
                    : `No ${activeRegion.label} incidents for this filter right now.`}
                </div>
              ) : (
                <div className="space-y-2 max-h-[32rem] overflow-y-auto pr-1">
                  {filteredIncidents.map((incident) => {
                    const selected = activeIncidentId === incident.id;
                    const mapsLink = incidentMapsUrl(incident, regionKey);
                    return (
                      <Fragment key={incident.id}>
                        <button
                          type="button"
                          onClick={() => setActiveIncidentId((current) => (current === incident.id ? null : incident.id))}
                          className={cn(
                            'w-full rounded-xl border bg-dispatch-surface px-3 py-3 text-left transition-all',
                            selected
                              ? 'border-orange-500/40 shadow-[0_0_0_1px_rgba(249,115,22,0.12)]'
                              : 'border-dispatch-border hover:border-slate-600',
                          )}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <div className="text-white text-sm font-semibold truncate">{incident.roadway || incidentLabel(incident)}</div>
                              <div className="text-slate-500 text-xs mt-1 line-clamp-1">
                                {incident.description || incidentLabel(incident)}
                              </div>
                              <div className="text-cyan-300 text-[11px] mt-1">{incidentSourceLabel(incident)}</div>
                            </div>
                            <div className="flex flex-col items-end gap-1">
                              <span className={cn('rounded-full border px-2 py-1 text-[10px] font-semibold whitespace-nowrap', SIGNAL_WORKFLOW_BADGES[normalizeSignalWorkflowStatus(incident.workflowStatus)])}>
                                {SIGNAL_WORKFLOW_LABELS[normalizeSignalWorkflowStatus(incident.workflowStatus)]}
                              </span>
                              <div className="text-[11px] text-slate-500 whitespace-nowrap">{timeAgo(incidentOccurredAt(incident))}</div>
                            </div>
                          </div>
                        </button>
                        {selected ? (
                          <div className="rounded-xl border border-dispatch-border bg-dispatch-surface px-3 py-3">
                            <div className="grid md:grid-cols-2 gap-2">
                              <div className="rounded-lg border border-dispatch-border bg-dispatch-bg px-2.5 py-2">
                                <div className="text-[10px] uppercase tracking-[0.14em] text-slate-600 font-semibold">Source</div>
                                <div className="text-cyan-300 text-xs mt-1">{incidentSourceLabel(incident)}</div>
                              </div>
                              <div className="rounded-lg border border-dispatch-border bg-dispatch-bg px-2.5 py-2">
                                <div className="text-[10px] uppercase tracking-[0.14em] text-slate-600 font-semibold">Reported</div>
                                <div className="text-slate-300 text-xs mt-1">{fmtOptional(incidentOccurredAt(incident))}</div>
                              </div>
                              <div className="rounded-lg border border-dispatch-border bg-dispatch-bg px-2.5 py-2">
                                <div className="text-[10px] uppercase tracking-[0.14em] text-slate-600 font-semibold">Type</div>
                                <div className="text-slate-300 text-xs mt-1">{incidentLabel(incident)}</div>
                              </div>
                              <div className="rounded-lg border border-dispatch-border bg-dispatch-bg px-2.5 py-2">
                                <div className="text-[10px] uppercase tracking-[0.14em] text-slate-600 font-semibold">Coordinates</div>
                                <div className="text-slate-300 text-xs mt-1">
                                  {incident.locationLat !== null && incident.locationLng !== null
                                    ? `${incident.locationLat.toFixed(5)}, ${incident.locationLng.toFixed(5)}`
                                    : 'Coordinate precision unavailable'}
                                </div>
                              </div>
                            </div>
                            <div className="rounded-lg border border-dispatch-border bg-dispatch-bg px-2.5 py-2 mt-2">
                              <div className="text-[10px] uppercase tracking-[0.14em] text-slate-600 font-semibold">Workflow</div>
                              <div className="mt-1 flex flex-wrap items-center gap-2">
                                <span className={cn('rounded-full border px-2.5 py-1 text-[10px] font-semibold', SIGNAL_WORKFLOW_BADGES[normalizeSignalWorkflowStatus(incident.workflowStatus)])}>
                                  {SIGNAL_WORKFLOW_LABELS[normalizeSignalWorkflowStatus(incident.workflowStatus)]}
                                </span>
                                <span className="text-slate-500 text-xs">
                                  {incident.workflowOperatorId ? `Operator: ${operatorNameById.get(incident.workflowOperatorId) ?? 'Assigned operator'}` : 'No operator committed yet'}
                                </span>
                              </div>
                            </div>
                            <div className="rounded-lg border border-dispatch-border bg-dispatch-bg px-2.5 py-2 mt-2">
                              <div className="text-[10px] uppercase tracking-[0.14em] text-slate-600 font-semibold">Detail</div>
                              <div className="text-slate-300 text-xs mt-1 leading-relaxed">
                                {incident.description || 'No additional detail provided by this source.'}
                              </div>
                            </div>
                            <div className="flex flex-wrap gap-2 mt-2">
                              {mapsLink ? (
                                <a
                                  href={mapsLink}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-2 rounded-lg border border-dispatch-border px-3 py-2 text-xs font-semibold text-blue-300 hover:text-blue-200 transition-colors"
                                >
                                  <Navigation2 className="w-3.5 h-3.5" />
                                  Open map
                                </a>
                              ) : null}
                              <button
                                type="button"
                                onClick={() => setActiveIncidentId(null)}
                                className="inline-flex items-center gap-2 rounded-lg border border-dispatch-border px-3 py-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
                              >
                                <ArrowLeft className="w-3.5 h-3.5" />
                                Close
                              </button>
                            </div>
                          </div>
                        ) : null}
                      </Fragment>
                    );
                  })}
                </div>
              )}
            </div>
          </section>

          <section className="bg-dispatch-surface border border-dispatch-border rounded-2xl p-5">
            <div className="flex items-center justify-between gap-3 mb-4">
              <div>
                <h2 className="text-white font-bold text-[15px]">Operator tracker</h2>
                <p className="text-slate-500 text-xs mt-1">Most recent field heartbeat from each operator device.</p>
              </div>
            </div>
            <div className="space-y-2">
              {operatorLocations.length === 0 ? (
                <div className="text-slate-600 text-sm">No operators available yet.</div>
              ) : (
                operatorLocations.map((operator) => {
                  const url = mapsUrl(operator.lastLocationLat, operator.lastLocationLng);
                  const hasLocation = operator.lastLocationLat !== null && operator.lastLocationLng !== null;
                  return (
                    <div key={operator.id} className="bg-dispatch-bg border border-dispatch-border rounded-xl p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-white font-semibold text-sm">{operator.name}</div>
                          <div className="text-slate-500 text-xs mt-1">
                            {hasLocation
                              ? operator.lastLocationLabel || `${operator.lastLocationLat?.toFixed(4)}, ${operator.lastLocationLng?.toFixed(4)}`
                              : 'No device location shared yet'}
                          </div>
                          <div className="text-slate-600 text-[11px] mt-1">
                            {operator.lastLocationAt ? `Last seen ${fmt(operator.lastLocationAt)}` : 'Waiting for first device heartbeat'}
                            {typeof operator.lastLocationAccuracyMeters === 'number' ? ` • ±${Math.round(operator.lastLocationAccuracyMeters)}m` : ''}
                          </div>
                        </div>
                        {url ? (
                          <a
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 rounded-lg border border-dispatch-border px-3 py-2 text-xs text-cyan-300 hover:text-cyan-200 transition-colors"
                          >
                            <MapPin className="w-3.5 h-3.5" />
                            Open map
                          </a>
                        ) : null}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </section>
        </div>

        {!showAdd ? (
          <div className="flex gap-2">
            <button
              onClick={() => setShowAdd(true)}
              className="flex-1 py-3 rounded-xl flex items-center justify-center gap-2 border border-dashed border-dispatch-border text-slate-500 text-sm font-medium hover:border-orange-500/40 hover:text-orange-400 transition-all"
            >
              <Plus className="w-4 h-4" />
              Add Operator
            </button>
            <button
              type="button"
              onClick={handleTestPush}
              disabled={testPushState === 'sending'}
              className={cn(
                'px-4 py-3 rounded-xl border text-sm font-medium flex items-center gap-2 transition-all',
                testPushState === 'ok' ? 'border-green-500/40 bg-green-500/10 text-green-400' :
                testPushState === 'error' ? 'border-red-500/40 bg-red-500/10 text-red-400' :
                'border-dispatch-border text-slate-500 hover:border-slate-500 hover:text-slate-300',
              )}
            >
              {testPushState === 'sending' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
              {testPushState === 'sending' ? 'Sending...' : testPushState === 'ok' ? 'Sent' : testPushState === 'error' ? 'Failed' : 'Test Push'}
            </button>
          </div>
        ) : (
          <AddOperatorForm onClose={() => setShowAdd(false)} adminToken={adminToken} />
        )}
        {testPushResult ? (
          <p className={cn('text-xs -mt-2', testPushState === 'error' ? 'text-red-400' : 'text-slate-500')}>{testPushResult}</p>
        ) : null}

        <div>
          <div className="flex items-center justify-between mb-3.5">
            <div className="flex items-center gap-2">
              <h2 className="text-white font-bold text-[15px]">{activeFilterMeta.listLabel}</h2>
              <span className="text-slate-600 text-xs">
                {filteredRequests.length} shown
              </span>
            </div>
            <button
              onClick={() => refetch()}
              className={cn(
                'flex items-center gap-1.5 text-xs transition-colors',
                isFetching ? 'text-orange-400' : 'text-slate-500 hover:text-slate-300',
              )}
            >
              <RefreshCw className={cn('w-3.5 h-3.5', isFetching && 'animate-spin')} />
              {isFetching ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>

          {selectedRequest && (
            <div className="bg-dispatch-surface border border-dispatch-border rounded-2xl p-5 mb-4">
              <div className="flex items-start justify-between gap-3 mb-4">
                <div>
                  <div className="text-slate-500 text-[11px] uppercase tracking-[0.18em] font-semibold">
                    Request detail
                  </div>
                  <h3 className="text-white font-bold text-lg mt-1">{selectedRequest.customerName}</h3>
                  <div className="flex items-center gap-2 text-slate-500 text-xs mt-1">
                    <span>Event {shortId(selectedRequest.id)}</span>
                  </div>
                </div>
                <div className="text-slate-600 text-xs">
                  {filteredRequests.length} in this view
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-3 mb-3">
                <div className="bg-dispatch-bg border border-dispatch-border rounded-xl p-3">
                  <div className="text-slate-600 text-[11px] uppercase tracking-[0.14em] font-semibold">
                    Service
                  </div>
                  <div className="text-white text-sm font-semibold mt-2">
                    {SERVICE_LABELS[selectedRequest.serviceType]}
                  </div>
                </div>
                <div className="bg-dispatch-bg border border-dispatch-border rounded-xl p-3">
                  <div className="text-slate-600 text-[11px] uppercase tracking-[0.14em] font-semibold">
                    Status
                  </div>
                  <div className="mt-2">
                    <span
                      className={cn(
                        'text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap',
                        STATUS_BADGE[selectedRequest.status],
                      )}
                    >
                      {STATUS_LABEL[selectedRequest.status]}
                    </span>
                  </div>
                </div>
                <div className="bg-dispatch-bg border border-dispatch-border rounded-xl p-3">
                  <div className="text-slate-600 text-[11px] uppercase tracking-[0.14em] font-semibold">
                    Phone
                  </div>
                  <a
                    href={`tel:${selectedRequest.customerPhone}`}
                    className="text-orange-400 text-sm font-medium mt-2 inline-flex items-center gap-2 hover:text-orange-300 transition-colors"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    {selectedRequest.customerPhone}
                  </a>
                </div>
                <div className="bg-dispatch-bg border border-dispatch-border rounded-xl p-3">
                  <div className="text-slate-600 text-[11px] uppercase tracking-[0.14em] font-semibold">
                    Location
                  </div>
                  <div className="text-slate-300 text-sm mt-2 leading-snug">
                    {selectedRequest.locationAddress || 'Location not attached'}
                  </div>
                </div>
              </div>

              <div className="bg-dispatch-bg border border-dispatch-border rounded-xl p-3 mb-3">
                <div className="text-slate-600 text-[11px] uppercase tracking-[0.14em] font-semibold mb-2">
                  Activity history
                </div>
                <div className="space-y-2 text-xs text-slate-300">
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-slate-500">Job created</span>
                    <span>{fmt(selectedRequest.createdAt)}</span>
                  </div>
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-slate-500">Operator first viewed</span>
                    <span>{selectedRequest.acceptedAt ? fmt(selectedRequest.acceptedAt) : 'Not viewed yet'}</span>
                  </div>
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-slate-500">Current outcome</span>
                    <span>{STATUS_LABEL[selectedRequest.status]}</span>
                  </div>
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-slate-500">Completed at</span>
                    <span>{selectedRequest.completedAt ? fmt(selectedRequest.completedAt) : 'Not completed'}</span>
                  </div>
                </div>
              </div>

              {/* Assign operator */}
              <div className="bg-dispatch-bg border border-dispatch-border rounded-xl p-3 mb-3">
                <div className="text-slate-600 text-[11px] uppercase tracking-[0.14em] font-semibold mb-2">
                  Operator coverage
                </div>
                <p className="mb-2 text-xs text-slate-500">
                  Use this only when operations need a manual coverage override.
                </p>
                <div className="flex gap-2">
                  <select
                    value={selectedOperatorId}
                    onChange={(e) => setSelectedOperatorId(e.target.value)}
                    className="flex-1 bg-dispatch-surface border border-dispatch-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500 transition-colors"
                  >
                    <option value="unassigned">Unassigned</option>
                    {operators.map((op) => (
                      <option key={op.id} value={op.id}>
                        {op.name}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() => handleAssign(selectedRequest.id)}
                    disabled={assigningId === selectedRequest.id}
                    className="px-4 py-2 rounded-lg bg-orange-500 text-white text-sm font-semibold hover:bg-orange-400 disabled:opacity-50 transition-all flex items-center gap-1.5 whitespace-nowrap"
                  >
                    {assigningId === selectedRequest.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <User className="w-3.5 h-3.5" />
                    )}
                    Update coverage
                  </button>
                </div>
                {selectedRequest.operatorId && (
                  <div className="text-slate-600 text-xs mt-1.5">
                    Current operator:{' '}
                    {operators.find((o) => o.id === selectedRequest.operatorId)?.name ??
                      'Unknown operator'}
                  </div>
                )}
              </div>

              {/* Change status */}
              <div className="bg-dispatch-bg border border-dispatch-border rounded-xl p-3 mb-3">
                <div className="text-slate-600 text-[11px] uppercase tracking-[0.14em] font-semibold mb-2">
                  Status override
                </div>
                <p className="mb-2 text-xs text-slate-500">
                  Reflect the real field outcome if an operator update needs manual correction.
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {ALL_STATUSES.map((s) => (
                    <button
                      key={s}
                      onClick={() => s !== selectedRequest.status && handleStatusChange(selectedRequest.id, s)}
                      disabled={statusChangingId === selectedRequest.id || s === selectedRequest.status}
                      className={cn(
                        'text-xs font-semibold px-2.5 py-1.5 rounded-full transition-all',
                        STATUS_BADGE[s],
                        s === selectedRequest.status
                          ? 'opacity-100 cursor-default ring-1 ring-inset ring-current/30'
                          : 'opacity-40 hover:opacity-80 cursor-pointer',
                        statusChangingId === selectedRequest.id && 'pointer-events-none',
                      )}
                    >
                      {statusChangingId === selectedRequest.id && s === selectedRequest.status ? (
                        <span className="flex items-center gap-1">
                          <Loader2 className="w-3 h-3 animate-spin" />
                          {STATUS_LABEL[s]}
                        </span>
                      ) : (
                        STATUS_LABEL[s]
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid md:grid-cols-3 gap-3 mb-3">
                <div className="bg-dispatch-bg border border-dispatch-border rounded-xl p-3">
                  <div className="text-slate-600 text-[11px] uppercase tracking-[0.14em] font-semibold">
                    Created
                  </div>
                  <div className="text-slate-300 text-sm mt-2">{fmt(selectedRequest.createdAt)}</div>
                </div>
                <div className="bg-dispatch-bg border border-dispatch-border rounded-xl p-3">
                  <div className="text-slate-600 text-[11px] uppercase tracking-[0.14em] font-semibold">
                    Viewed
                  </div>
                  <div className="text-slate-300 text-sm mt-2">
                    {selectedRequest.acceptedAt ? fmt(selectedRequest.acceptedAt) : 'Not viewed yet'}
                  </div>
                </div>
                <div className="bg-dispatch-bg border border-dispatch-border rounded-xl p-3">
                  <div className="text-slate-600 text-[11px] uppercase tracking-[0.14em] font-semibold">
                    Completed
                  </div>
                  <div className="text-slate-300 text-sm mt-2">
                    {selectedRequest.completedAt ? fmt(selectedRequest.completedAt) : 'Not completed'}
                  </div>
                </div>
              </div>

              <div className="bg-dispatch-bg border border-dispatch-border rounded-xl p-3">
                <div className="text-slate-600 text-[11px] uppercase tracking-[0.14em] font-semibold">
                  Notes
                </div>
                <div className="text-slate-300 text-sm mt-2 leading-relaxed">
                  {selectedRequest.notes || 'No customer notes attached to this request.'}
                </div>
              </div>
            </div>
          )}

          {isLoading && (
            <div className="flex items-center justify-center py-12 text-slate-500 text-sm gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              Loading...
            </div>
          )}

          {!isLoading && filteredRequests.length === 0 && (
            <div className="text-center py-12">
              <p className="text-slate-500 text-sm">{activeFilterMeta.emptyLabel}</p>
            </div>
          )}

          <div className="flex flex-col gap-2">
            {filteredRequests.map((r) => {
              const Icon = SERVICE_ICONS[r.serviceType];
              return (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setSelectedRequestId(r.id)}
                  className={cn(
                    'bg-dispatch-surface border rounded-xl p-4 text-left transition-all',
                    selectedRequest?.id === r.id
                      ? 'border-orange-500/50 shadow-[0_0_0_1px_rgba(249,115,22,0.15)]'
                      : 'border-dispatch-border hover:border-slate-600',
                  )}
                >
                  <div className="flex items-start justify-between gap-2 mb-2.5">
                    <div className="flex items-center gap-3">
                      <Icon className="w-4 h-4 text-orange-400 flex-shrink-0" />
                      <div>
                        <div className="text-white font-semibold text-sm leading-tight">
                          {r.customerName}
                        </div>
                        <div className="flex items-center gap-2 text-slate-600 text-xs mt-0.5">
                          <span>{SERVICE_LABELS[r.serviceType]}</span>
                        </div>
                      </div>
                    </div>
                    <span
                      className={cn(
                        'text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap',
                        STATUS_BADGE[r.status],
                      )}
                    >
                      {STATUS_LABEL[r.status]}
                    </span>
                  </div>
                  {r.locationAddress && (
                    <div className="flex items-start gap-1.5 text-slate-500 text-xs mb-1.5">
                      <MapPin className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                      <span className="leading-snug line-clamp-1">{r.locationAddress}</span>
                    </div>
                  )}
                  {r.operatorId && (
                    <div className="flex items-center gap-1.5 text-slate-600 text-xs mb-1.5">
                      <User className="w-3.5 h-3.5" />
                      <span>
                        {operators.find((o) => o.id === r.operatorId)?.name ?? 'Operator attached'}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center gap-1.5 text-slate-700 text-xs">
                    <Clock className="w-3.5 h-3.5" />
                    {fmt(r.createdAt)}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Admin Page (auth gate) ────────────────────────────────────────────────────

export default function AdminPage() {
  const isRemoteAdminHost =
    typeof window !== 'undefined' && window.location.hostname === 'dispatch-admin.unalabs.cloud';
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(
    () =>
      typeof window !== 'undefined' && window.location.hostname === 'dispatch-admin.unalabs.cloud'
        ? false
        : sessionStorage.getItem('dispatch_admin_authenticated') === '1',
  );
  const [adminToken, setAdminToken] = useState<string | null>(
    () =>
      typeof window !== 'undefined' && window.location.hostname === 'dispatch-admin.unalabs.cloud'
        ? null
        : sessionStorage.getItem('dispatch_admin_token'),
  );
  const [sessionChecking, setSessionChecking] = useState<boolean>(isRemoteAdminHost);

  useEffect(() => {
    if (!isRemoteAdminHost) {
      setSessionChecking(false);
      return;
    }

    let active = true;
    fetch('/api/admin/session', { cache: 'no-store' })
      .then(async (res) => {
        if (!active) return;
        if (!res.ok) {
          sessionStorage.removeItem('dispatch_admin_authenticated');
          sessionStorage.removeItem('dispatch_admin_token');
          setIsAuthenticated(false);
          setAdminToken(null);
          return;
        }

        sessionStorage.setItem('dispatch_admin_authenticated', '1');
        setIsAuthenticated(true);
      })
      .catch(() => {
        if (!active) return;
        setIsAuthenticated(false);
        setAdminToken(null);
      })
      .finally(() => {
        if (active) setSessionChecking(false);
      });

    return () => {
      active = false;
    };
  }, [isRemoteAdminHost]);

  function handleLoginSuccess(token: string | null) {
    setAdminToken(token);
    setIsAuthenticated(true);
  }

  function handleSignOut() {
    sessionStorage.removeItem('dispatch_admin_authenticated');
    sessionStorage.removeItem('dispatch_admin_token');
    setAdminToken(null);
    setIsAuthenticated(false);
    if (isRemoteAdminHost) {
      fetch('/api/admin/logout', { method: 'POST' }).catch(() => undefined);
    }
  }

  if (sessionChecking) {
    return (
      <div className="min-h-dvh bg-dispatch-bg flex items-center justify-center px-5">
        <div className="flex items-center gap-2 text-slate-400 text-sm">
          <Loader2 className="w-4 h-4 animate-spin" />
          Checking admin session...
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <AdminLogin onSuccess={handleLoginSuccess} />;
  }

  return <AdminDashboard adminToken={adminToken} onSignOut={handleSignOut} />;
}
