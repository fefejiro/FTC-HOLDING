import { useCallback, useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  ArrowLeft,
  Bell,
  CheckCircle2,
  CircleDot,
  Clock,
  Fuel,
  KeyRound,
  Loader2,
  LogOut,
  MapPin,
  Navigation2,
  Phone,
  RefreshCw,
  TriangleAlert,
  Wrench,
  X,
  Zap,
} from 'lucide-react';
import DemoFeedbackForm from '../components/DemoFeedbackForm';
import { useEvents } from '../hooks/useEvents';
import { usePush } from '../hooks/usePush';
import { cn } from '../lib/cn';
import {
  clearStoredDemoSessionId,
  getDemoSessionId,
  isDemoMode,
  makeDemoSessionId,
  readStoredDemoSessionId,
  requestMatchesDemoMode,
  storeDemoSessionId,
} from '../lib/demo';

type ServiceType = 'gas' | 'lockout' | 'jump' | 'tire' | 'other';
type RequestStatus = 'pending' | 'accepted' | 'en_route' | 'completed' | 'cancelled';
type OperatorFilter = 'active' | 'all' | 'incidents';

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
  demoMode?: boolean | null;
  demoSessionId?: string | null;
}

interface OperatorSession {
  id: string;
  name: string;
}

interface OperatorRecord {
  id: string;
  name: string;
}

interface Incident {
  id: string;
  eventType: string | null;
  description: string | null;
  roadway: string | null;
  locationLat: number | null;
  locationLng: number | null;
  severity: string | null;
  alerted: boolean | null;
  createdAt: string;
}

interface DispatchStatusResponse {
  ok: boolean;
  sseClients?: number;
  notifications?: { webPushConfigured?: boolean };
  incidentMonitor?: {
    running?: boolean;
    sourceCount?: number;
    pollIntervalMs?: number;
    lastSuccessAt?: string | null;
  };
}

interface Toast {
  id: number;
  message: string;
  type: 'job' | 'incident';
}

const LIVE_SESSION_KEY = 'dispatch_operator_session';
const DEMO_SESSION_KEY = 'dispatch_operator_demo_session';

const SERVICE_ICONS: Record<ServiceType, React.ComponentType<{ className?: string }>> = {
  gas: Fuel,
  lockout: KeyRound,
  jump: Zap,
  tire: CircleDot,
  other: Wrench,
};

const SERVICE_LABELS: Record<ServiceType, string> = {
  gas: 'Gas Delivery',
  lockout: 'Lockout',
  jump: 'Jump Start',
  tire: 'Tire Change',
  other: 'Other',
};

const STATUS_CONFIG: Record<RequestStatus, { label: string; badge: string; bar: string }> = {
  pending: { label: 'Pending', badge: 'bg-amber-500/15 text-amber-400', bar: 'bg-orange-500' },
  accepted: { label: 'Accepted', badge: 'bg-blue-500/15 text-blue-400', bar: 'bg-blue-500' },
  en_route: { label: 'En Route', badge: 'bg-purple-500/15 text-purple-400', bar: 'bg-purple-500' },
  completed: { label: 'Completed', badge: 'bg-green-500/15 text-green-400', bar: 'bg-green-500' },
  cancelled: { label: 'Cancelled', badge: 'bg-slate-700/50 text-slate-500', bar: 'bg-slate-700' },
};

const INCIDENT_LABELS: Record<string, string> = {
  VEHICLE_BREAKDOWN: 'Breakdown',
  STALLED_VEHICLE: 'Stalled Vehicle',
  DISABLED_VEHICLE: 'Disabled Vehicle',
  ACCIDENT: 'Accident',
  COLLISION: 'Collision',
  VEHICLE_FIRE: 'Vehicle Fire',
  HAZARD: 'Road Hazard',
  DEBRIS: 'Debris on Road',
  TRANSIT_ALERT: 'Transit Alert',
  ROAD_DETOUR: 'Transit Detour',
  ROADWORK: 'Road Work Zone',
  ROAD_CLOSURE: 'Road Closure',
};

function playJobAlert() {
  try {
    const ctx = new AudioContext();
    const t = ctx.currentTime;
    [[660, 0], [880, 0.18]].forEach(([freq, offset]) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, t + offset);
      gain.gain.linearRampToValueAtTime(0.45, t + offset + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, t + offset + 0.14);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t + offset);
      osc.stop(t + offset + 0.15);
    });
  } catch {}
}

function playIncidentAlert() {
  try {
    const ctx = new AudioContext();
    const t = ctx.currentTime;
    [0, 0.16, 0.32].forEach((offset) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.value = 520;
      gain.gain.setValueAtTime(0.25, t + offset);
      gain.gain.exponentialRampToValueAtTime(0.001, t + offset + 0.12);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t + offset);
      osc.stop(t + offset + 0.13);
    });
  } catch {}
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function fmt(dateStr: string) {
  return new Date(dateStr).toLocaleString('en-CA', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function formatPoll(value?: string | null) {
  return value ? fmt(value) : 'Waiting for first successful poll';
}

function requestMapsUrl(request: ServiceRequest) {
  if (request.locationLat && request.locationLng) return `https://maps.google.com/?q=${request.locationLat},${request.locationLng}`;
  if (request.locationAddress) return `https://maps.google.com/?q=${encodeURIComponent(request.locationAddress)}`;
  return null;
}

function incidentMapsUrl(incident: Incident) {
  if (incident.locationLat && incident.locationLng) return `https://maps.google.com/?q=${incident.locationLat},${incident.locationLng}`;
  if (incident.roadway) return `https://maps.google.com/search/?api=1&query=${encodeURIComponent(`${incident.roadway}, Ottawa ON`)}`;
  return null;
}

function incidentLabel(incident: Incident) {
  return INCIDENT_LABELS[incident.eventType?.toUpperCase() || ''] || incident.eventType || 'Incident';
}

function incidentIsHighPriority(incident: Incident) {
  return ['ACCIDENT', 'COLLISION', 'VEHICLE_FIRE'].includes(incident.eventType?.toUpperCase() || '');
}

function readDemoContext() {
  if (typeof window === 'undefined') return { demoMode: false, demoSessionId: null as string | null };
  const demoMode = isDemoMode(window.location.search);
  if (!demoMode) {
    clearStoredDemoSessionId();
    return { demoMode: false, demoSessionId: null };
  }
  const demoSessionId = getDemoSessionId(window.location.search) || readStoredDemoSessionId() || makeDemoSessionId();
  storeDemoSessionId(demoSessionId);
  return { demoMode: true, demoSessionId };
}

function sessionKey(demoMode: boolean) {
  return demoMode ? DEMO_SESSION_KEY : LIVE_SESSION_KEY;
}

function PinScreen({
  demoMode,
  demoSessionId,
  onAuthenticated,
}: {
  demoMode: boolean;
  demoSessionId?: string | null;
  onAuthenticated: (session: OperatorSession) => void;
}) {
  const [operators, setOperators] = useState<OperatorRecord[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [opsLoading, setOpsLoading] = useState(true);

  useEffect(() => {
    fetch('/api/operators')
      .then((response) => response.json())
      .then((data: unknown) => {
        if (Array.isArray(data)) setOperators(data as OperatorRecord[]);
      })
      .catch(() => setError('Could not load operators. Check your connection.'))
      .finally(() => setOpsLoading(false));
  }, []);

  const visibleOperators = useMemo(() => {
    if (!demoMode) return operators;
    const demoOperators = operators.filter((operator) => /demo/i.test(operator.name));
    return demoOperators.length ? demoOperators : operators;
  }, [demoMode, operators]);

  useEffect(() => {
    if (!visibleOperators.length) return;
    if (!visibleOperators.some((operator) => operator.id === selectedId)) {
      setSelectedId(visibleOperators[0].id);
    }
  }, [selectedId, visibleOperators]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!selectedId || !pin) {
      setError('Select your operator name and enter the PIN.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/operators/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ operatorId: selectedId, pin }),
      });
      const data = (await response.json()) as { ok?: boolean; operator?: OperatorSession; error?: string };
      if (!response.ok || !data.ok || !data.operator) {
        setError(data.error || 'Invalid PIN. Try again.');
        setPin('');
        return;
      }
      onAuthenticated(data.operator);
    } catch {
      setError('Authentication failed. Check your connection.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-dvh bg-dispatch-bg flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-10">
          <div className="w-16 h-16 bg-orange-500 rounded-2xl flex items-center justify-center mb-5 shadow-xl shadow-orange-500/25">
            <Zap className="w-8 h-8 text-white" />
          </div>
          {demoMode ? (
            <>
              <div className="inline-flex items-center gap-2 rounded-full border border-orange-500/20 bg-orange-500/10 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-orange-300 mb-4">
                Client demo mode
              </div>
              <h1 className="text-2xl font-bold text-white text-center">Dispatch demo operator sign in</h1>
              <p className="text-slate-500 text-sm mt-2 text-center">
                Use the invited sandbox credentials to work only the demo requests tied to this session.
              </p>
              <p className="text-slate-700 text-xs mt-2 text-center">Session {demoSessionId || 'demo'}</p>
            </>
          ) : (
            <>
              <h1 className="text-2xl font-bold text-white">Operator Login</h1>
              <p className="text-slate-500 text-sm mt-1">Ottawa Roadside Dispatch</p>
            </>
          )}
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2.5 block">
              Select Operator
            </label>
            <select
              value={selectedId}
              onChange={(event) => setSelectedId(event.target.value)}
              disabled={opsLoading || visibleOperators.length === 0}
              className="w-full bg-dispatch-surface border border-dispatch-border rounded-xl px-4 py-4 text-white focus:outline-none focus:border-orange-500 transition-colors disabled:text-slate-500"
            >
              {opsLoading ? <option>Loading...</option> : null}
              {!opsLoading && visibleOperators.length === 0 ? <option>No operators found</option> : null}
              {visibleOperators.map((operator) => (
                <option key={operator.id} value={operator.id}>
                  {operator.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2.5 block">
              PIN
            </label>
            <input
              type="password"
              value={pin}
              onChange={(event) => setPin(event.target.value)}
              placeholder="...."
              inputMode="numeric"
              maxLength={8}
              autoComplete="current-password"
              className="w-full bg-dispatch-surface border border-dispatch-border rounded-xl px-4 py-4 text-white placeholder-slate-600 focus:outline-none focus:border-orange-500 tracking-[0.5em] text-center text-xl"
            />
          </div>

          {error ? (
            <div className="flex items-center gap-2 text-red-400 text-sm">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          ) : null}

          <button
            type="submit"
            disabled={loading || opsLoading || visibleOperators.length === 0}
            className={cn(
              'w-full py-4 rounded-xl font-bold text-base flex items-center justify-center gap-2.5 transition-all mt-1',
              loading || opsLoading || visibleOperators.length === 0
                ? 'bg-orange-500/40 text-orange-200 cursor-wait'
                : 'bg-orange-500 text-white hover:bg-orange-400 active:bg-orange-600 shadow-lg shadow-orange-500/20',
            )}
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" /> Verifying...
              </>
            ) : (
              'Sign In'
            )}
          </button>
        </form>

        <p className="text-center text-slate-700 text-xs mt-8">
          Need a request to test?{' '}
          <a
            href={demoMode ? `/request?mode=demo${demoSessionId ? `&demoSession=${encodeURIComponent(demoSessionId)}` : ''}` : '/request'}
            className="text-slate-500 hover:text-orange-400 transition-colors"
          >
            Open the request form
          </a>
        </p>
      </div>
    </div>
  );
}

function JobCard({ request, onOpen }: { request: ServiceRequest; onOpen: () => void }) {
  const Icon = SERVICE_ICONS[request.serviceType];
  return (
    <div className="relative bg-dispatch-surface border border-dispatch-border rounded-2xl overflow-hidden">
      <div className={cn('absolute left-0 top-0 bottom-0 w-1', STATUS_CONFIG[request.status].bar)} />
      <div className="pl-5 pr-5 pt-4 pb-4 ml-1">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-slate-700/50 rounded-xl flex items-center justify-center flex-shrink-0">
              <Icon className="w-5 h-5 text-orange-400" />
            </div>
            <div>
              <div className="font-bold text-white text-[15px] leading-tight">{request.customerName}</div>
              <div className="text-slate-500 text-xs mt-0.5">{SERVICE_LABELS[request.serviceType]}</div>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            <span className={cn('text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap', STATUS_CONFIG[request.status].badge)}>
              {STATUS_CONFIG[request.status].label}
            </span>
            {request.demoMode ? <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-orange-300">Demo</span> : null}
          </div>
        </div>
        <div className="flex flex-col gap-1.5 mb-4 text-sm">
          <a href={`tel:${request.customerPhone}`} className="inline-flex items-center gap-2 text-orange-400 font-medium hover:text-orange-300 transition-colors w-fit">
            <Phone className="w-3.5 h-3.5" />
            {request.customerPhone}
          </a>
          {request.locationAddress ? (
            <div className="flex items-start gap-2 text-slate-400">
              <MapPin className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-slate-500" />
              <span className="leading-snug">{request.locationAddress}</span>
            </div>
          ) : null}
          <div className="flex items-center gap-2 text-slate-500 text-xs">
            <Clock className="w-3.5 h-3.5" />
            {timeAgo(request.createdAt)}
          </div>
        </div>
        <button type="button" onClick={onOpen} className="w-full py-3 rounded-xl bg-dispatch-bg text-slate-200 font-semibold text-sm hover:bg-slate-800 transition-all">
          Open details
        </button>
      </div>
    </div>
  );
}

function RequestDetailCard({
  request,
  operatorId,
  operatorName,
  demoMode,
  demoSessionId,
  isUpdating,
  showFeedback,
  onBack,
  onToggleFeedback,
  onStatusChange,
}: {
  request: ServiceRequest;
  operatorId: string;
  operatorName: string;
  demoMode: boolean;
  demoSessionId?: string | null;
  isUpdating: boolean;
  showFeedback: boolean;
  onBack: () => void;
  onToggleFeedback: () => void;
  onStatusChange: (id: string, status: RequestStatus, operatorId: string) => void;
}) {
  const Icon = SERVICE_ICONS[request.serviceType];
  const mapsUrl = requestMapsUrl(request);
  const isMyJob = !request.operatorId || request.operatorId === operatorId;

  return (
    <div className="bg-dispatch-surface border border-orange-500/30 rounded-2xl p-5">
      <div className="flex items-center justify-between gap-3 mb-4">
        <button type="button" onClick={onBack} className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Back to queue
        </button>
        <div className="flex items-center gap-2">
          {demoMode ? <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-orange-300">Demo request</span> : null}
          <span className={cn('text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap', STATUS_CONFIG[request.status].badge)}>
            {STATUS_CONFIG[request.status].label}
          </span>
        </div>
      </div>

      <div className="flex items-start gap-3 mb-4">
        <div className="w-11 h-11 rounded-xl bg-slate-700/50 flex items-center justify-center flex-shrink-0">
          <Icon className="w-5 h-5 text-orange-400" />
        </div>
        <div>
          <h2 className="text-white font-bold text-xl">{request.customerName}</h2>
          <p className="text-slate-400 text-sm mt-1">{SERVICE_LABELS[request.serviceType]}</p>
          {request.demoSessionId ? <p className="text-slate-600 text-xs mt-1">Session {request.demoSessionId}</p> : null}
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-3 mb-3">
        <div className="bg-dispatch-bg border border-dispatch-border rounded-xl p-3">
          <div className="text-slate-600 text-[11px] uppercase tracking-[0.14em] font-semibold">Phone</div>
          <a href={`tel:${request.customerPhone}`} className="text-orange-400 text-sm font-medium mt-2 inline-flex items-center gap-2 hover:text-orange-300 transition-colors">
            <Phone className="w-3.5 h-3.5" />
            {request.customerPhone}
          </a>
        </div>
        <div className="bg-dispatch-bg border border-dispatch-border rounded-xl p-3">
          <div className="text-slate-600 text-[11px] uppercase tracking-[0.14em] font-semibold">Location</div>
          <div className="text-slate-300 text-sm mt-2 leading-snug">{request.locationAddress || 'Location not attached'}</div>
        </div>
        <div className="bg-dispatch-bg border border-dispatch-border rounded-xl p-3">
          <div className="text-slate-600 text-[11px] uppercase tracking-[0.14em] font-semibold">Created</div>
          <div className="text-slate-300 text-sm mt-2">{fmt(request.createdAt)}</div>
        </div>
        <div className="bg-dispatch-bg border border-dispatch-border rounded-xl p-3">
          <div className="text-slate-600 text-[11px] uppercase tracking-[0.14em] font-semibold">Accepted</div>
          <div className="text-slate-300 text-sm mt-2">{request.acceptedAt ? fmt(request.acceptedAt) : 'Not yet accepted'}</div>
        </div>
      </div>

      <div className="bg-dispatch-bg border border-dispatch-border rounded-xl p-3 mb-3">
        <div className="text-slate-600 text-[11px] uppercase tracking-[0.14em] font-semibold">Notes</div>
        <div className="text-slate-300 text-sm mt-2 leading-relaxed">{request.notes || 'No customer notes attached to this request.'}</div>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        {mapsUrl ? (
          <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 py-2.5 px-4 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-500 transition-all">
            <Navigation2 className="w-4 h-4" />
            Open navigation
          </a>
        ) : null}
        <a href={`tel:${request.customerPhone}`} className="inline-flex items-center gap-2 py-2.5 px-4 rounded-xl bg-dispatch-bg text-slate-200 text-sm font-bold hover:bg-slate-800 transition-all">
          <Phone className="w-4 h-4" />
          Call customer
        </a>
        {demoMode ? (
          <button type="button" onClick={onToggleFeedback} className="inline-flex items-center gap-2 py-2.5 px-4 rounded-xl bg-dispatch-bg text-slate-200 text-sm font-bold hover:bg-slate-800 transition-all">
            {showFeedback ? 'Hide demo feedback' : 'Send demo feedback'}
          </button>
        ) : null}
      </div>

      {request.status === 'pending' ? (
        <button type="button" onClick={() => onStatusChange(request.id, 'accepted', operatorId)} disabled={isUpdating} className="w-full py-3 rounded-xl bg-orange-500 text-white font-bold text-sm hover:bg-orange-400 active:bg-orange-600 disabled:opacity-50 transition-all">
          {isUpdating ? 'Accepting...' : 'Accept job'}
        </button>
      ) : null}

      {(request.status === 'accepted' || request.status === 'en_route') && isMyJob ? (
        <div className="flex flex-wrap gap-2">
          {request.status === 'accepted' ? (
            <button type="button" onClick={() => onStatusChange(request.id, 'en_route', operatorId)} disabled={isUpdating} className="inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-purple-600 text-white text-sm font-bold hover:bg-purple-500 disabled:opacity-50 transition-all">
              {isUpdating ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Mark en route
            </button>
          ) : null}
          {request.status === 'en_route' ? (
            <button type="button" onClick={() => onStatusChange(request.id, 'completed', operatorId)} disabled={isUpdating} className="inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-green-600 text-white text-sm font-bold hover:bg-green-500 disabled:opacity-50 transition-all">
              {isUpdating ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              Complete job
            </button>
          ) : null}
        </div>
      ) : null}

      {showFeedback ? (
        <div className="mt-5">
          <DemoFeedbackForm
            context={{
              context: request.status === 'completed' ? 'dispatch-demo-operator-complete' : 'dispatch-demo-operator',
              operatorName,
              demoSessionId,
              requestId: request.id,
              completedRequestId: request.status === 'completed' ? request.id : undefined,
            }}
          />
        </div>
      ) : null}
    </div>
  );
}

function IncidentCard({ incident, selected, onDispatch, onSelect }: { incident: Incident; selected?: boolean; onDispatch?: (incident: Incident) => void; onSelect?: (incident: Incident) => void }) {
  const mapsUrl = incidentMapsUrl(incident);
  const label = incidentLabel(incident);
  const isHigh = incidentIsHighPriority(incident);

  return (
    <div className={cn('relative bg-dispatch-surface border rounded-2xl overflow-hidden transition-all', selected ? 'border-orange-500/40 shadow-[0_0_0_1px_rgba(249,115,22,0.18)]' : incident.alerted ? 'border-orange-500/30' : 'border-dispatch-border')}>
      <div className={cn('absolute left-0 top-0 bottom-0 w-1', incident.alerted ? 'bg-orange-500' : 'bg-slate-600')} />
      <div className="pl-5 pr-5 pt-4 pb-4 ml-1">
        <div className="flex items-start justify-between gap-3 mb-2.5">
          <div className="flex items-center gap-3">
            <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0', isHigh ? 'bg-red-500/15' : 'bg-amber-500/15')}>
              <TriangleAlert className={cn('w-5 h-5', isHigh ? 'text-red-400' : 'text-amber-400')} />
            </div>
            <div>
              <div className="font-bold text-white text-sm">{label}</div>
              <div className="flex items-center gap-1.5 text-slate-500 text-xs mt-0.5">
                <Clock className="w-3 h-3" />
                {timeAgo(incident.createdAt)}
              </div>
            </div>
          </div>
          {incident.alerted ? <span className="text-xs text-orange-400 font-semibold border border-orange-500/25 bg-orange-500/10 px-2.5 py-1 rounded-full whitespace-nowrap">Alerted</span> : null}
        </div>
        {incident.roadway ? (
          <div className="flex items-center gap-2 text-slate-300 text-sm mb-1.5">
            <MapPin className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
            <span className="font-medium">{incident.roadway}</span>
          </div>
        ) : null}
        {incident.description ? <p className="text-slate-500 text-xs leading-relaxed line-clamp-2 mb-3">{incident.description}</p> : null}
        <div className="flex gap-2">
          {onSelect ? <button type="button" onClick={() => onSelect(incident)} className={cn('flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all', selected ? 'bg-slate-700 text-white' : 'bg-dispatch-bg text-slate-300 hover:text-white hover:bg-slate-800')}>{selected ? 'Viewing details' : 'Open details'}</button> : null}
          {mapsUrl ? <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-500 transition-all"><Navigation2 className="w-4 h-4" />Navigate</a> : null}
          {onDispatch ? <button type="button" onClick={() => onDispatch(incident)} className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-orange-500 text-white text-sm font-bold hover:bg-orange-400 transition-all"><Zap className="w-4 h-4" />Create job</button> : null}
        </div>
      </div>
    </div>
  );
}

function IncidentDetailCard({ incident, onBack, onDispatch }: { incident: Incident; onBack: () => void; onDispatch?: (incident: Incident) => void }) {
  const mapsUrl = incidentMapsUrl(incident);
  const severity = incident.severity ? String(incident.severity).replace(/_/g, ' ') : 'Not specified';
  return (
    <div className="bg-dispatch-surface border border-orange-500/30 rounded-2xl p-5">
      <div className="flex items-center justify-between gap-3 mb-4">
        <button type="button" onClick={onBack} className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Back to road alerts
        </button>
        <div className="text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap bg-amber-500/15 text-amber-400">{incidentLabel(incident)}</div>
      </div>
      <div className="grid md:grid-cols-2 gap-3 mb-3">
        <div className="bg-dispatch-bg border border-dispatch-border rounded-xl p-3"><div className="text-slate-600 text-[11px] uppercase tracking-[0.14em] font-semibold">Roadway</div><div className="text-white text-sm font-semibold mt-2">{incident.roadway || 'Ottawa area'}</div></div>
        <div className="bg-dispatch-bg border border-dispatch-border rounded-xl p-3"><div className="text-slate-600 text-[11px] uppercase tracking-[0.14em] font-semibold">Severity</div><div className="text-slate-300 text-sm mt-2">{severity}</div></div>
        <div className="bg-dispatch-bg border border-dispatch-border rounded-xl p-3"><div className="text-slate-600 text-[11px] uppercase tracking-[0.14em] font-semibold">Detected</div><div className="text-slate-300 text-sm mt-2">{fmt(incident.createdAt)}</div></div>
        <div className="bg-dispatch-bg border border-dispatch-border rounded-xl p-3"><div className="text-slate-600 text-[11px] uppercase tracking-[0.14em] font-semibold">Coordinates</div><div className="text-slate-300 text-sm mt-2">{incident.locationLat && incident.locationLng ? `${incident.locationLat.toFixed(5)}, ${incident.locationLng.toFixed(5)}` : 'Coordinate precision unavailable'}</div></div>
      </div>
      <div className="bg-dispatch-bg border border-dispatch-border rounded-xl p-3 mb-3"><div className="text-slate-600 text-[11px] uppercase tracking-[0.14em] font-semibold">Incident detail</div><div className="text-slate-300 text-sm mt-2 leading-relaxed">{incident.description || 'No additional incident description was provided by the source feed.'}</div></div>
      <div className="flex flex-wrap gap-2">
        {mapsUrl ? <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 py-2.5 px-4 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-500 transition-all"><Navigation2 className="w-4 h-4" />Open navigation</a> : null}
        {onDispatch ? <button type="button" onClick={() => onDispatch(incident)} className="inline-flex items-center gap-2 py-2.5 px-4 rounded-xl bg-orange-500 text-white text-sm font-bold hover:bg-orange-400 transition-all"><Zap className="w-4 h-4" />Create job from incident</button> : null}
      </div>
    </div>
  );
}

function OperatorView({ session, onSignOut, demoMode, demoSessionId }: { session: OperatorSession; onSignOut: () => void; demoMode: boolean; demoSessionId?: string | null }) {
  const [filter, setFilter] = useState<OperatorFilter>('active');
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const queryClient = useQueryClient();
  const { isSubscribed, isSupported, subscribe } = usePush({ operatorId: session.id });
  const requestQueryKey = useMemo(() => ['requests', demoMode ? `demo:${demoSessionId || 'demo'}` : 'live'], [demoMode, demoSessionId]);
  const requestsUrl = useMemo(() => {
    if (!demoMode) return '/api/requests?mode=live';
    const params = new URLSearchParams({ mode: 'demo' });
    if (demoSessionId) params.set('demoSessionId', demoSessionId);
    return `/api/requests?${params.toString()}`;
  }, [demoMode, demoSessionId]);

  function addToast(message: string, type: Toast['type']) {
    const id = Date.now() + Math.round(Math.random() * 1000);
    setToasts((current) => [...current, { id, message, type }]);
    setTimeout(() => setToasts((current) => current.filter((toast) => toast.id !== id)), 5000);
  }

  useEffect(() => {
    if (isSupported && !isSubscribed) subscribe();
  }, [isSubscribed, isSupported, subscribe]);

  const { connected: liveFeedConnected } = useEvents({
    onRequestNew: (data) => {
      const request = data as ServiceRequest;
      if (!requestMatchesDemoMode(request, demoMode, demoSessionId)) return;
      queryClient.setQueryData<ServiceRequest[]>(requestQueryKey, (current) => current ? [request, ...current.filter((item) => item.id !== request.id)] : [request]);
      playJobAlert();
      addToast(`New job: ${SERVICE_LABELS[request.serviceType]} - ${request.customerName}`, 'job');
    },
    onRequestUpdated: (data) => {
      const request = data as ServiceRequest;
      queryClient.setQueryData<ServiceRequest[]>(requestQueryKey, (current) => {
        const currentList = current ?? [];
        if (!requestMatchesDemoMode(request, demoMode, demoSessionId)) return currentList.filter((item) => item.id !== request.id);
        return currentList.some((item) => item.id === request.id) ? currentList.map((item) => item.id === request.id ? request : item) : [request, ...currentList];
      });
    },
    onIncidentNew: (data) => {
      const incident = data as Incident;
      queryClient.setQueryData<Incident[]>(['incidents'], (current) => current ? [incident, ...current.filter((item) => item.id !== incident.id)] : [incident]);
      if (incidentIsHighPriority(incident)) {
        playIncidentAlert();
        addToast(`${incidentLabel(incident)} - ${incident.roadway || 'Ottawa area'}`, 'incident');
      }
    },
    onIncidentUpdated: (data) => {
      const incident = data as Incident;
      queryClient.setQueryData<Incident[]>(['incidents'], (current) => {
        const currentList = current ?? [];
        return [incident, ...currentList.filter((item) => item.id !== incident.id)];
      });
    },
  });

  const { data: status } = useQuery<DispatchStatusResponse>({ queryKey: ['dispatch-status'], queryFn: async () => { const response = await fetch('/api/status'); if (!response.ok) throw new Error('Failed to load dispatch status'); return response.json() as Promise<DispatchStatusResponse>; }, refetchInterval: 60_000, staleTime: 30_000 });
  const { data: allRequests = [], isLoading } = useQuery<ServiceRequest[]>({ queryKey: requestQueryKey, queryFn: async () => { const response = await fetch(requestsUrl); if (!response.ok) throw new Error('Failed to load requests'); return response.json() as Promise<ServiceRequest[]>; }, refetchInterval: 60_000 });
  const { data: incidentFeed = [], isLoading: incidentsLoading } = useQuery<Incident[]>({ queryKey: ['incidents'], queryFn: async () => { const response = await fetch('/api/incidents?limit=30'); if (!response.ok) throw new Error('Failed to load incidents'); return response.json() as Promise<Incident[]>; }, refetchInterval: 60_000, staleTime: 30_000 });

  const { mutate: updateStatus, isPending: isUpdating } = useMutation({
    mutationFn: async ({ id, status, operatorId }: { id: string; status: RequestStatus; operatorId: string }) => {
      const response = await fetch(`/api/requests/${id}/status`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status, operatorId }) });
      if (!response.ok) throw new Error('Failed to update request status');
      return response.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: requestQueryKey }),
  });

  const handleIncidentDispatch = useCallback(async (incident: Incident) => {
    const roadway = incident.roadway || 'Ottawa area';
    try {
      const response = await fetch('/api/requests', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ customerName: `Lead - ${roadway}`, customerPhone: '000-000-0000', serviceType: 'other', locationLat: incident.locationLat, locationLng: incident.locationLng, locationAddress: roadway, notes: incident.description || undefined, mode: demoMode ? 'demo' : 'live', demoSessionId: demoMode ? demoSessionId || undefined : undefined }) });
      if (!response.ok) throw new Error('Failed to create job');
      addToast(`Job created from incident on ${roadway}`, 'job');
      queryClient.invalidateQueries({ queryKey: requestQueryKey });
    } catch {
      addToast('Failed to create job. Try again.', 'incident');
    }
  }, [demoMode, demoSessionId, queryClient, requestQueryKey]);

  const myRequests = allRequests.filter((request) => (request.operatorId === null && request.status === 'pending') || request.operatorId === session.id);
  const displayRequests = filter === 'active' ? myRequests.filter((request) => ['pending', 'accepted', 'en_route'].includes(request.status)) : filter === 'all' ? myRequests : [];
  const pendingCount = myRequests.filter((request) => request.status === 'pending').length;
  const activeCount = myRequests.filter((request) => ['accepted', 'en_route'].includes(request.status)).length;
  const completedDemoRequest = demoMode ? [...myRequests].find((request) => request.status === 'completed') || null : null;
  const selectedRequest = displayRequests.find((request) => request.id === selectedRequestId) || myRequests.find((request) => request.id === selectedRequestId) || null;
  const selectedIncident = incidentFeed.find((incident) => incident.id === selectedIncidentId) || null;
  const sourceCount = status?.incidentMonitor?.sourceCount ?? 3;
  const pollSeconds = Math.max(1, Math.round((status?.incidentMonitor?.pollIntervalMs ?? 60_000) / 1000));
  const lastPoll = formatPoll(status?.incidentMonitor?.lastSuccessAt);

  useEffect(() => {
    if (filter === 'incidents') {
      setSelectedRequestId(null);
      if (selectedIncidentId && !incidentFeed.some((incident) => incident.id === selectedIncidentId)) setSelectedIncidentId(null);
      return;
    }
    setSelectedIncidentId(null);
    if (selectedRequestId && !myRequests.some((request) => request.id === selectedRequestId)) setSelectedRequestId(null);
  }, [filter, incidentFeed, myRequests, selectedIncidentId, selectedRequestId]);

  return (
    <div className="min-h-dvh bg-dispatch-bg flex flex-col">
      <div className="fixed top-0 left-0 right-0 z-50 flex flex-col gap-2 px-4 pt-4 pointer-events-none">
        {toasts.map((toast) => (
          <div key={toast.id} className={cn('flex items-center gap-3 px-4 py-3.5 rounded-2xl shadow-2xl pointer-events-auto', toast.type === 'job' ? 'bg-orange-500 text-white' : 'bg-red-600 text-white')}>
            {toast.type === 'job' ? <Zap className="w-5 h-5 flex-shrink-0" /> : <TriangleAlert className="w-5 h-5 flex-shrink-0 animate-pulse" />}
            <span className="font-semibold text-sm flex-1 leading-snug">{toast.message}</span>
            <button type="button" onClick={() => setToasts((current) => current.filter((item) => item.id !== toast.id))} className="opacity-70 hover:opacity-100 transition-opacity"><X className="w-4 h-4" /></button>
          </div>
        ))}
      </div>

      <div className="bg-dispatch-bg border-b border-dispatch-border px-5 pt-12 pb-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-orange-500 rounded-xl flex items-center justify-center shadow-md shadow-orange-500/20"><Zap className="w-5 h-5 text-white" /></div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="text-white font-bold text-lg">Dispatch</span>
                {demoMode ? <span className="rounded-full border border-orange-500/20 bg-orange-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-orange-300">Demo mode</span> : null}
                {pendingCount > 0 ? <span className="bg-orange-500 text-white text-xs font-bold px-2 py-0.5 rounded-full animate-pulse leading-none">{pendingCount} new</span> : null}
              </div>
              <div className="text-slate-500 text-xs mt-0.5">{session.name}{demoMode ? ' - invited sandbox operator view' : ''}</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {demoMode ? <button type="button" onClick={() => setShowFeedback((current) => !current)} className="flex items-center gap-1.5 text-slate-200 text-xs border border-dispatch-border rounded-xl px-3 py-2 hover:border-slate-500 transition-colors">{showFeedback ? 'Hide feedback' : 'Send demo feedback'}</button> : null}
            <button type="button" onClick={onSignOut} className="flex items-center gap-1.5 text-slate-500 text-xs hover:text-slate-300 transition-colors py-2 px-3 rounded-xl hover:bg-dispatch-surface"><LogOut className="w-3.5 h-3.5" />Sign out</button>
          </div>
        </div>

        {demoMode ? <div className="mt-3 rounded-2xl border border-orange-500/20 bg-orange-500/10 px-4 py-3 text-sm text-orange-100">Only requests from this demo session are shown in the queue. The incident watch remains live so the client can see real system movement while testing.</div> : null}

        <div className="flex gap-2 mt-3 flex-wrap">
          <div className={cn('flex items-center gap-1.5 rounded-lg px-3 py-1.5 border text-xs font-semibold', liveFeedConnected ? 'bg-green-500/10 border-green-500/20 text-green-400' : 'bg-amber-500/10 border-amber-500/20 text-amber-400')}>
            <div className={cn('w-1.5 h-1.5 rounded-full', liveFeedConnected ? 'bg-green-400' : 'bg-amber-400 animate-pulse')} />
            {liveFeedConnected ? 'Live feed connected' : 'Reconnecting live feed'}
          </div>
          <div className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 border border-orange-500/20 bg-orange-500/10 text-orange-300 text-xs font-semibold">
            <TriangleAlert className="w-3.5 h-3.5" />
            {sourceCount} official sources - about every {pollSeconds}s
          </div>
          <div className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 border border-dispatch-border bg-dispatch-surface text-slate-400 text-xs font-semibold">
            <Clock className="w-3.5 h-3.5" />
            Last incident poll {lastPoll}
          </div>
          {activeCount > 0 ? <div className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold">{activeCount} active</div> : null}
        </div>

        {isSupported && !isSubscribed ? <button type="button" onClick={subscribe} className="mt-3 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-400 text-sm font-medium hover:bg-orange-500/15 transition-all"><Bell className="w-4 h-4" />Enable push notifications</button> : null}
      </div>

      <div className="px-5 py-3 flex gap-2 border-b border-dispatch-border overflow-x-auto">
        {[{ key: 'active' as const, label: demoMode ? 'Active demo' : 'Active', badge: pendingCount, danger: false }, { key: 'all' as const, label: demoMode ? 'All demo' : 'All jobs', badge: 0, danger: false }, { key: 'incidents' as const, label: 'Road alerts', badge: 0, danger: true }].map(({ key, label, badge, danger }) => (
          <button key={key} type="button" onClick={() => setFilter(key)} className={cn('px-4 py-2 rounded-xl text-sm font-semibold transition-all whitespace-nowrap flex items-center gap-2', filter === key ? danger ? 'bg-red-600 text-white' : 'bg-orange-500 text-white' : 'bg-dispatch-surface text-slate-400 hover:text-white')}>
            {key === 'incidents' ? <TriangleAlert className="w-3.5 h-3.5" /> : null}
            {label}
            {badge > 0 && filter !== key ? <span className="bg-orange-500 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center leading-none">{badge}</span> : null}
          </button>
        ))}
      </div>

      <div className="flex-1 px-5 py-4 flex flex-col gap-3 overflow-y-auto pb-8">
        {demoMode && showFeedback && !selectedRequest ? <DemoFeedbackForm context={{ context: 'dispatch-demo-operator-header', operatorName: session.name, demoSessionId, requestId: completedDemoRequest?.id || undefined, completedRequestId: completedDemoRequest?.status === 'completed' ? completedDemoRequest.id : undefined }} /> : null}

        {filter === 'incidents' ? (
          <>
            {selectedIncident ? <IncidentDetailCard incident={selectedIncident} onBack={() => setSelectedIncidentId(null)} onDispatch={handleIncidentDispatch} /> : null}
            {incidentsLoading ? <div className="flex items-center justify-center py-16 text-slate-500 text-sm gap-2"><Loader2 className="w-4 h-4 animate-spin" />Loading Ottawa incidents...</div> : null}
            {!incidentsLoading && incidentFeed.length === 0 ? <div className="flex flex-col items-center justify-center py-16 text-center"><div className="w-16 h-16 bg-green-500/10 border border-green-500/20 rounded-full flex items-center justify-center mb-4"><CheckCircle2 className="w-8 h-8 text-green-500" /></div><p className="text-slate-300 font-semibold">All clear</p><p className="text-slate-600 text-sm mt-1">No incidents in the Ottawa area.</p></div> : null}
            {incidentFeed.map((incident) => <IncidentCard key={incident.id} incident={incident} selected={selectedIncident?.id === incident.id} onSelect={(value) => setSelectedIncidentId(value.id)} onDispatch={handleIncidentDispatch} />)}
          </>
        ) : (
          <>
            {selectedRequest ? <RequestDetailCard request={selectedRequest} operatorId={session.id} operatorName={session.name} demoMode={demoMode} demoSessionId={demoSessionId} isUpdating={isUpdating} showFeedback={showFeedback} onBack={() => setSelectedRequestId(null)} onToggleFeedback={() => setShowFeedback((current) => !current)} onStatusChange={(id, statusValue, operatorId) => updateStatus({ id, status: statusValue, operatorId })} /> : null}
            {isLoading ? <div className="flex items-center justify-center py-16 text-slate-500 text-sm gap-2"><Loader2 className="w-4 h-4 animate-spin" />Loading jobs...</div> : null}
            {!isLoading && displayRequests.length === 0 ? <div className="flex flex-col items-center justify-center py-16 text-center"><div className="w-16 h-16 bg-dispatch-surface border border-dispatch-border rounded-full flex items-center justify-center mb-4">{filter === 'active' ? <CheckCircle2 className="w-8 h-8 text-slate-600" /> : <RefreshCw className="w-8 h-8 text-slate-600" />}</div><p className="text-slate-400 font-semibold">{filter === 'active' ? demoMode ? 'No active demo jobs' : 'No active jobs' : demoMode ? 'No demo jobs yet' : 'No jobs yet'}</p><p className="text-slate-600 text-sm mt-1 max-w-xs">{demoMode ? 'Submit a sample roadside request from the demo link, then it will appear here automatically.' : 'Submitted customer requests will appear here.'}</p></div> : null}
            {displayRequests.map((request) => <JobCard key={request.id} request={request} onOpen={() => setSelectedRequestId(request.id)} />)}
          </>
        )}
      </div>
    </div>
  );
}

export default function OperatorPage() {
  const [{ demoMode, demoSessionId }] = useState(readDemoContext);
  const storageKey = sessionKey(demoMode);
  const [session, setSession] = useState<OperatorSession | null>(() => {
    if (typeof window === 'undefined') return null;
    try {
      const stored = localStorage.getItem(storageKey);
      return stored ? (JSON.parse(stored) as OperatorSession) : null;
    } catch {
      return null;
    }
  });

  function handleAuthenticated(operator: OperatorSession) {
    localStorage.setItem(storageKey, JSON.stringify(operator));
    setSession(operator);
  }

  function handleSignOut() {
    localStorage.removeItem(storageKey);
    setSession(null);
  }

  return session ? <OperatorView session={session} onSignOut={handleSignOut} demoMode={demoMode} demoSessionId={demoSessionId} /> : <PinScreen demoMode={demoMode} demoSessionId={demoSessionId} onAuthenticated={handleAuthenticated} />;
}
