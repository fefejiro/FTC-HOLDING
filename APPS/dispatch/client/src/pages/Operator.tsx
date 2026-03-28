import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle, ArrowLeft, Bell, CheckCircle2, ChevronDown, CircleDot,
  Clock, Fuel, KeyRound, Loader2, LogOut, MapPin, Navigation2,
  Phone, RefreshCw, TriangleAlert, Wrench, X, Zap,
} from 'lucide-react';
import { cn } from '../lib/cn';
import { usePush } from '../hooks/usePush';
import { useEvents } from '../hooks/useEvents';

// ─── Audio alerts ─────────────────────────────────────────────────────────────

function playJobAlert() {
  try {
    const ctx = new AudioContext();
    const t = ctx.currentTime;
    // Two-tone dispatch beep: 660 Hz → 880 Hz
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
  } catch { /* AudioContext not available */ }
}

function playIncidentAlert() {
  try {
    const ctx = new AudioContext();
    const t = ctx.currentTime;
    // Three rapid urgent beeps
    [0, 0.16, 0.32].forEach(offset => {
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
  } catch { /* AudioContext not available */ }
}

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

interface OperatorSession {
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
  pending:   { label: 'Pending',   badge: 'bg-amber-500/15 text-amber-400',   bar: 'bg-orange-500' },
  accepted:  { label: 'Accepted',  badge: 'bg-blue-500/15 text-blue-400',     bar: 'bg-blue-500' },
  en_route:  { label: 'En Route',  badge: 'bg-purple-500/15 text-purple-400', bar: 'bg-purple-500' },
  completed: { label: 'Completed', badge: 'bg-green-500/15 text-green-400',   bar: 'bg-green-500' },
  cancelled: { label: 'Cancelled', badge: 'bg-slate-700/50 text-slate-500',   bar: 'bg-slate-700' },
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
  ROADWORK: 'Road Work Zone',
  ROAD_CLOSURE: 'Road Closure',
  ROAD_EVENT: 'Road Event',
  CONSTRUCTION: 'Construction Zone',
};

function incidentIsExactGps(incident: Incident) {
  return Boolean(
    incident.locationLat &&
      incident.locationLng &&
      !(Math.abs(incident.locationLat - 45.4215) < 0.001 && Math.abs(incident.locationLng + 75.6972) < 0.001),
  );
}

function incidentMapsUrl(incident: Incident) {
  if (incidentIsExactGps(incident)) {
    return `https://maps.google.com/?q=${incident.locationLat},${incident.locationLng}`;
  }
  if (incident.roadway) {
    return `https://maps.google.com/search/?api=1&query=${encodeURIComponent(`${incident.roadway}, Ottawa ON`)}`;
  }
  return null;
}

function incidentLabel(incident: Incident) {
  const key = incident.eventType?.toUpperCase() ?? '';
  return INCIDENT_LABELS[key] ?? incident.eventType ?? 'Incident';
}

function incidentIsHighPriority(incident: Incident) {
  const key = incident.eventType?.toUpperCase() ?? '';
  return ['ACCIDENT', 'COLLISION', 'VEHICLE_FIRE'].includes(key);
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min}m ago`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function fmt(dateStr: string): string {
  return new Date(dateStr).toLocaleString('en-CA', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// ─── PIN Screen ──────────────────────────────────────────────────────────────

function PinScreen({ onAuthenticated }: { onAuthenticated: (s: OperatorSession) => void }) {
  const [operators, setOperators] = useState<{ id: string; name: string }[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [opsLoading, setOpsLoading] = useState(true);

  useEffect(() => {
    fetch('/api/operators')
      .then(r => r.json())
      .then((data: unknown) => {
        if (Array.isArray(data)) {
          const ops = data as { id: string; name: string }[];
          setOperators(ops);
          if (ops.length > 0) setSelectedId(ops[0].id);
        }
      })
      .catch(() => setError('Could not load operators. Check your connection.'))
      .finally(() => setOpsLoading(false));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedId || !pin) { setError('Select your name and enter your PIN.'); return; }
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/operators/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ operatorId: selectedId, pin }),
      });
      const data = await res.json() as { ok?: boolean; operator?: OperatorSession; error?: string };
      if (!res.ok || !data.ok) {
        setError(data.error || 'Invalid PIN. Try again.');
        setPin('');
        return;
      }
      onAuthenticated(data.operator!);
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
          <h1 className="text-2xl font-bold text-white">Operator Login</h1>
          <p className="text-slate-500 text-sm mt-1">Ottawa Roadside Dispatch</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2.5 block">
              Select Operator
            </label>
            <div className="relative">
              <select
                value={selectedId}
                onChange={(e) => setSelectedId(e.target.value)}
                disabled={opsLoading || operators.length === 0}
                className="w-full bg-dispatch-surface border border-dispatch-border rounded-xl px-4 py-4 text-white focus:outline-none focus:border-orange-500 transition-colors disabled:text-slate-500"
              >
                {opsLoading && <option>Loading…</option>}
                {!opsLoading && operators.length === 0 && <option>No operators found</option>}
                {operators.map(op => (
                  <option key={op.id} value={op.id}>{op.name}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2.5 block">
              PIN
            </label>
            <input
              type="password"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="••••"
              inputMode="numeric"
              maxLength={8}
              autoComplete="current-password"
              className="w-full bg-dispatch-surface border border-dispatch-border rounded-xl px-4 py-4 text-white placeholder-slate-600 focus:outline-none focus:border-orange-500 transition-colors tracking-[0.5em] text-center text-xl"
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 text-red-400 text-sm">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || opsLoading || operators.length === 0}
            className={cn(
              'w-full py-4 rounded-xl font-bold text-base flex items-center justify-center gap-2.5 transition-all mt-1',
              loading || opsLoading || operators.length === 0
                ? 'bg-orange-500/40 text-orange-200 cursor-wait'
                : 'bg-orange-500 text-white hover:bg-orange-400 active:bg-orange-600 shadow-lg shadow-orange-500/20',
            )}
          >
            {loading ? <><Loader2 className="w-5 h-5 animate-spin" /> Verifying…</> : 'Sign In'}
          </button>
        </form>

        <p className="text-center text-slate-700 text-xs mt-8">
          Customer?{' '}
          <a href="/request" className="text-slate-500 hover:text-orange-400 transition-colors">
            Submit a request →
          </a>
        </p>
      </div>
    </div>
  );
}

// ─── Job Card ────────────────────────────────────────────────────────────────

function JobCard({
  request,
  operatorId,
  onStatusChange,
  isUpdating,
}: {
  request: ServiceRequest;
  operatorId: string;
  onStatusChange: (id: string, status: RequestStatus, operatorId: string) => void;
  isUpdating: boolean;
}) {
  const isMyJob = !request.operatorId || request.operatorId === operatorId;
  const mapsUrl =
    request.locationLat && request.locationLng
      ? `https://maps.google.com/?q=${request.locationLat},${request.locationLng}`
      : request.locationAddress
      ? `https://maps.google.com/?q=${encodeURIComponent(request.locationAddress)}`
      : null;

  const Icon = SERVICE_ICONS[request.serviceType];
  const { badge, bar } = STATUS_CONFIG[request.status];

  return (
    <div className="relative bg-dispatch-surface border border-dispatch-border rounded-2xl overflow-hidden">
      {/* Status bar — left edge accent */}
      <div className={cn('absolute left-0 top-0 bottom-0 w-1', bar)} />

      <div className="pl-5 pr-5 pt-4 pb-4 ml-1">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-slate-700/50 rounded-xl flex items-center justify-center flex-shrink-0">
              <Icon className="w-5 h-5 text-orange-400" />
            </div>
            <div>
              <div className="font-bold text-white text-[15px] leading-tight">
                {SERVICE_LABELS[request.serviceType]}
              </div>
              <div className="flex items-center gap-1.5 text-slate-500 text-xs mt-0.5">
                <Clock className="w-3 h-3" />
                {timeAgo(request.createdAt)}
              </div>
            </div>
          </div>
          <span className={cn('text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap', badge)}>
            {STATUS_CONFIG[request.status].label}
          </span>
        </div>

        {/* Customer */}
        <div className="flex flex-col gap-1.5 mb-3.5">
          <div className="text-white font-semibold text-sm">{request.customerName}</div>
          <a
            href={`tel:${request.customerPhone}`}
            className="inline-flex items-center gap-2 text-orange-400 text-sm font-medium hover:text-orange-300 transition-colors w-fit"
          >
            <Phone className="w-3.5 h-3.5" />
            {request.customerPhone}
          </a>
          {request.locationAddress && (
            <div className="flex items-start gap-2 text-slate-400 text-sm">
              <MapPin className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-slate-500" />
              <span className="leading-snug">{request.locationAddress}</span>
            </div>
          )}
          {request.notes && (
            <div className="text-slate-600 text-xs italic leading-snug mt-0.5">
              "{request.notes}"
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2">
          {request.status === 'pending' && (
            <button
              onClick={() => onStatusChange(request.id, 'accepted', operatorId)}
              disabled={isUpdating}
              className="w-full py-3 rounded-xl bg-orange-500 text-white font-bold text-sm hover:bg-orange-400 active:bg-orange-600 disabled:opacity-50 disabled:cursor-wait transition-all"
            >
              Accept Job
            </button>
          )}

          {(request.status === 'accepted' || request.status === 'en_route') && isMyJob && (
            <div className="flex gap-2">
              {mapsUrl && (
                <a
                  href={mapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-blue-600 text-white font-bold text-sm hover:bg-blue-500 transition-all"
                >
                  <Navigation2 className="w-4 h-4" />
                  Navigate
                </a>
              )}
              {request.status === 'accepted' && (
                <button
                  onClick={() => onStatusChange(request.id, 'en_route', operatorId)}
                  disabled={isUpdating}
                  className="flex-1 py-3 rounded-xl bg-purple-600 text-white font-bold text-sm hover:bg-purple-500 disabled:opacity-50 transition-all"
                >
                  En Route
                </button>
              )}
              {request.status === 'en_route' && (
                <button
                  onClick={() => onStatusChange(request.id, 'completed', operatorId)}
                  disabled={isUpdating}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-green-600 text-white font-bold text-sm hover:bg-green-500 disabled:opacity-50 transition-all"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Complete
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Incident Card ────────────────────────────────────────────────────────────

function IncidentCard({
  incident,
  selected,
  onDispatch,
  onSelect,
}: {
  incident: Incident;
  selected?: boolean;
  onDispatch?: (inc: Incident) => void;
  onSelect?: (inc: Incident) => void;
}) {
  const mapsUrl = incidentMapsUrl(incident);
  const label = incidentLabel(incident);
  const isHigh = incidentIsHighPriority(incident);

  return (
    <div className={cn(
      'relative bg-dispatch-surface border rounded-2xl overflow-hidden transition-all',
      selected
        ? 'border-orange-500/40 shadow-[0_0_0_1px_rgba(249,115,22,0.18)]'
        : incident.alerted ? 'border-orange-500/30' : 'border-dispatch-border',
    )}>
      <div className={cn('absolute left-0 top-0 bottom-0 w-1', incident.alerted ? 'bg-orange-500' : 'bg-slate-600')} />

      <div className="pl-5 pr-5 pt-4 pb-4 ml-1">
        <div className="flex items-start justify-between gap-3 mb-2.5">
          <div className="flex items-center gap-3">
            <div className={cn(
              'w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0',
              isHigh ? 'bg-red-500/15' : 'bg-amber-500/15',
            )}>
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
          {incident.alerted && (
            <span className="text-xs text-orange-400 font-semibold border border-orange-500/25 bg-orange-500/10 px-2.5 py-1 rounded-full whitespace-nowrap">
              Alerted
            </span>
          )}
        </div>

        {incident.roadway && (
          <div className="flex items-center gap-2 text-slate-300 text-sm mb-1.5">
            <MapPin className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
            <span className="font-medium">{incident.roadway}</span>
          </div>
        )}
        {incident.description && (
          <p className="text-slate-500 text-xs leading-relaxed line-clamp-2 mb-3">
            {incident.description}
          </p>
        )}

        <div className="flex gap-2">
          {onSelect && (
            <button
              onClick={() => onSelect(incident)}
              className={cn(
                'flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all',
                selected
                  ? 'bg-slate-700 text-white'
                  : 'bg-dispatch-bg text-slate-300 hover:text-white hover:bg-slate-800',
              )}
            >
              {selected ? 'Viewing details' : 'Open details'}
            </button>
          )}
          {mapsUrl && (
            <a
              href={mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-500 transition-all"
            >
              <Navigation2 className="w-4 h-4" />
              Navigate
            </a>
          )}
          {onDispatch && (
            <button
              onClick={() => onDispatch(incident)}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-orange-500 text-white text-sm font-bold hover:bg-orange-400 active:bg-orange-600 transition-all"
            >
              <Zap className="w-4 h-4" />
              Create Job
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function IncidentDetailCard({
  incident,
  onBack,
  onDispatch,
}: {
  incident: Incident;
  onBack: () => void;
  onDispatch?: (inc: Incident) => void;
}) {
  const mapsUrl = incidentMapsUrl(incident);
  const label = incidentLabel(incident);
  const isHigh = incidentIsHighPriority(incident);
  const severity = incident.severity ? String(incident.severity).replace(/_/g, ' ') : 'Not specified';

  return (
    <div className="bg-dispatch-surface border border-orange-500/30 rounded-2xl p-5">
      <div className="flex items-center justify-between gap-3 mb-4">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to road alerts
        </button>
        <div className={cn(
          'text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap',
          isHigh ? 'bg-red-500/15 text-red-400' : 'bg-amber-500/15 text-amber-400',
        )}>
          {label}
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-3 mb-3">
        <div className="bg-dispatch-bg border border-dispatch-border rounded-xl p-3">
          <div className="text-slate-600 text-[11px] uppercase tracking-[0.14em] font-semibold">Roadway</div>
          <div className="text-white text-sm font-semibold mt-2">{incident.roadway || 'Ottawa area'}</div>
        </div>
        <div className="bg-dispatch-bg border border-dispatch-border rounded-xl p-3">
          <div className="text-slate-600 text-[11px] uppercase tracking-[0.14em] font-semibold">Severity</div>
          <div className="text-slate-300 text-sm mt-2">{severity}</div>
        </div>
        <div className="bg-dispatch-bg border border-dispatch-border rounded-xl p-3">
          <div className="text-slate-600 text-[11px] uppercase tracking-[0.14em] font-semibold">Detected</div>
          <div className="text-slate-300 text-sm mt-2">{fmt(incident.createdAt)}</div>
        </div>
        <div className="bg-dispatch-bg border border-dispatch-border rounded-xl p-3">
          <div className="text-slate-600 text-[11px] uppercase tracking-[0.14em] font-semibold">Coordinates</div>
          <div className="text-slate-300 text-sm mt-2">
            {incident.locationLat && incident.locationLng
              ? `${incident.locationLat.toFixed(5)}, ${incident.locationLng.toFixed(5)}`
              : 'Coordinate precision unavailable'}
          </div>
        </div>
      </div>

      <div className="bg-dispatch-bg border border-dispatch-border rounded-xl p-3 mb-3">
        <div className="text-slate-600 text-[11px] uppercase tracking-[0.14em] font-semibold">Incident detail</div>
        <div className="text-slate-300 text-sm mt-2 leading-relaxed">
          {incident.description || 'No additional incident description was provided by the source feed.'}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {mapsUrl && (
          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 py-2.5 px-4 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-500 transition-all"
          >
            <Navigation2 className="w-4 h-4" />
            Open navigation
          </a>
        )}
        {onDispatch && (
          <button
            onClick={() => onDispatch(incident)}
            className="inline-flex items-center gap-2 py-2.5 px-4 rounded-xl bg-orange-500 text-white text-sm font-bold hover:bg-orange-400 active:bg-orange-600 transition-all"
          >
            <Zap className="w-4 h-4" />
            Create job from incident
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Operator View ────────────────────────────────────────────────────────────

interface Toast {
  id: number;
  message: string;
  type: 'job' | 'incident';
}

function OperatorView({ session, onSignOut }: { session: OperatorSession; onSignOut: () => void }) {
  const [filter, setFilter] = useState<'active' | 'all' | 'incidents'>('active');
  const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const queryClient = useQueryClient();
  const { isSubscribed, isSupported, subscribe } = usePush({ operatorId: session.id });

  function addToast(message: string, type: Toast['type']) {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 5000);
  }

  useEffect(() => {
    if (isSupported && !isSubscribed) subscribe();
  }, [isSupported, isSubscribed, subscribe]);

  // ── Real-time SSE ──────────────────────────────────────────────────────────
  const { connected: liveFeedConnected } = useEvents({
    onRequestNew: (data) => {
      const req = data as ServiceRequest;
      // Prepend to query cache — no round-trip needed
      queryClient.setQueryData<ServiceRequest[]>(['requests'], old =>
        old ? [req, ...old.filter(r => r.id !== req.id)] : [req]
      );
      playJobAlert();
      addToast(
        `New job: ${SERVICE_LABELS[req.serviceType]} — ${req.customerName}`,
        'job',
      );
    },
    onRequestUpdated: (data) => {
      const updated = data as ServiceRequest;
      queryClient.setQueryData<ServiceRequest[]>(['requests'], old =>
        old?.map(r => r.id === updated.id ? updated : r) ?? []
      );
    },
    onIncidentNew: (data) => {
      const inc = data as Incident;
      queryClient.setQueryData<Incident[]>(['incidents'], old =>
        old ? [inc, ...old.filter(i => i.id !== inc.id)] : [inc]
      );
      const isHigh = ['ACCIDENT', 'COLLISION', 'VEHICLE_FIRE']
        .includes((inc.eventType ?? '').toUpperCase());
      if (isHigh) {
        playIncidentAlert();
        addToast(
          `${INCIDENT_LABELS[inc.eventType?.toUpperCase() ?? ''] ?? 'Incident'} — ${inc.roadway ?? 'Ottawa area'}`,
          'incident',
        );
      }
    },
  });

  const { data: allRequests = [], isLoading } = useQuery<ServiceRequest[]>({
    queryKey: ['requests'],
    queryFn: async () => {
      const res = await fetch('/api/requests');
      if (!res.ok) throw new Error('Failed to load');
      return res.json() as Promise<ServiceRequest[]>;
    },
    refetchInterval: 60_000, // SSE handles live updates; this is just a safety net
  });

  const { data: incidentFeed = [], isLoading: incidentsLoading } = useQuery<Incident[]>({
    queryKey: ['incidents'],
    queryFn: async () => {
      const res = await fetch('/api/incidents?limit=30');
      if (!res.ok) throw new Error('Failed to load incidents');
      return res.json() as Promise<Incident[]>;
    },
    refetchInterval: 3 * 60 * 1_000,
    enabled: filter === 'incidents',
  });

  const { mutate: updateStatus, isPending: isUpdating } = useMutation({
    mutationFn: async ({ id, status, operatorId }: { id: string; status: RequestStatus; operatorId: string }) => {
      const res = await fetch(`/api/requests/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, operatorId }),
      });
      if (!res.ok) throw new Error('Failed to update');
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['requests'] }),
  });

  const handleStatusChange = useCallback(
    (id: string, status: RequestStatus, operatorId: string) => updateStatus({ id, status, operatorId }),
    [updateStatus],
  );

  const handleIncidentDispatch = useCallback(async (inc: Incident) => {
    const roadway = inc.roadway || 'Ottawa area';
    const toast = (message: string, type: Toast['type']) => {
      const id = Date.now();
      setToasts(prev => [...prev, { id, message, type }]);
      setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 5000);
    };
    try {
      const res = await fetch('/api/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: `Lead — ${roadway}`,
          customerPhone: '000-000-0000',
          serviceType: 'other',
          locationLat: inc.locationLat,
          locationLng: inc.locationLng,
          locationAddress: roadway,
          notes: inc.description || undefined,
        }),
      });
      if (res.ok) {
        toast(`Job created from incident on ${roadway}`, 'job');
        queryClient.invalidateQueries({ queryKey: ['requests'] });
      }
    } catch {
      toast('Failed to create job. Try again.', 'incident');
    }
  }, [queryClient, setToasts]);

  const activeStatuses: RequestStatus[] = ['pending', 'accepted', 'en_route'];
  // Operators see: unassigned pending jobs (available to claim) + their own assigned jobs
  const myRequests = allRequests.filter(r => {
    if (r.operatorId === null && r.status === 'pending') return true; // open pool
    return r.operatorId === session.id; // assigned to me
  });
  const displayRequests =
    filter === 'active' ? myRequests.filter(r => activeStatuses.includes(r.status)) : myRequests;
  const pendingCount = myRequests.filter(r => r.status === 'pending').length;
  const activeCount = myRequests.filter(r => ['accepted', 'en_route'].includes(r.status)).length;
  const selectedIncident =
    incidentFeed.find((incident) => incident.id === selectedIncidentId) ?? null;

  useEffect(() => {
    if (filter !== 'incidents') {
      setSelectedIncidentId(null);
      return;
    }

    if (!incidentFeed.length) {
      if (selectedIncidentId !== null) setSelectedIncidentId(null);
      return;
    }

    const stillVisible = incidentFeed.some((incident) => incident.id === selectedIncidentId);
    if (!stillVisible && selectedIncidentId !== null) {
      setSelectedIncidentId(null);
    }
  }, [filter, incidentFeed, selectedIncidentId]);

  return (
    <div className="min-h-dvh bg-dispatch-bg flex flex-col">

      {/* ── Toast banners ──────────────────────────────────────────────────── */}
      <div className="fixed top-0 left-0 right-0 z-50 flex flex-col gap-2 px-4 pt-4 pointer-events-none">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className={cn(
              'flex items-center gap-3 px-4 py-3.5 rounded-2xl shadow-2xl pointer-events-auto toast-slide',
              toast.type === 'job'
                ? 'bg-orange-500 text-white'
                : 'bg-red-600 text-white',
            )}
          >
            {toast.type === 'job'
              ? <Zap className="w-5 h-5 flex-shrink-0" />
              : <TriangleAlert className="w-5 h-5 flex-shrink-0 animate-pulse" />
            }
            <span className="font-semibold text-sm flex-1 leading-snug">{toast.message}</span>
            <button
              onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))}
              className="opacity-70 hover:opacity-100 transition-opacity"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>

      {/* Header */}
      <div className="bg-dispatch-bg border-b border-dispatch-border px-5 pt-12 pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-orange-500 rounded-xl flex items-center justify-center shadow-md shadow-orange-500/20">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <span className="text-white font-bold text-lg">Dispatch</span>
                {pendingCount > 0 && (
                  <span className="bg-orange-500 text-white text-xs font-bold px-2 py-0.5 rounded-full animate-pulse leading-none">
                    {pendingCount} new
                  </span>
                )}
              </div>
              <div className="text-slate-500 text-xs mt-0.5">{session.name}</div>
            </div>
          </div>
          <button
            onClick={onSignOut}
            className="flex items-center gap-1.5 text-slate-500 text-xs hover:text-slate-300 transition-colors py-2 px-3 rounded-xl hover:bg-dispatch-surface"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign out
          </button>
        </div>

        {/* Live status pills */}
        {(pendingCount > 0 || activeCount > 0) && (
          <div className="flex gap-2 mt-3 flex-wrap">
            {pendingCount > 0 && (
              <div className="flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                <span className="text-amber-400 text-xs font-semibold">{pendingCount} pending</span>
              </div>
            )}
            {activeCount > 0 && (
              <div className="flex items-center gap-1.5 bg-blue-500/10 border border-blue-500/20 rounded-lg px-3 py-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                <span className="text-blue-400 text-xs font-semibold">{activeCount} active</span>
              </div>
            )}
          </div>
        )}

        <div className="flex gap-2 mt-3 flex-wrap">
          <div className={cn(
            'flex items-center gap-1.5 rounded-lg px-3 py-1.5 border text-xs font-semibold',
            liveFeedConnected
              ? 'bg-green-500/10 border-green-500/20 text-green-400'
              : 'bg-amber-500/10 border-amber-500/20 text-amber-400',
          )}>
            <div className={cn('w-1.5 h-1.5 rounded-full', liveFeedConnected ? 'bg-green-400' : 'bg-amber-400 animate-pulse')} />
            {liveFeedConnected ? 'Live feed connected' : 'Reconnecting live feed'}
          </div>
        </div>

        {/* Push notification banner */}
        {isSupported && !isSubscribed && (
          <button
            onClick={subscribe}
            className="mt-3 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-400 text-sm font-medium hover:bg-orange-500/15 transition-all"
          >
            <Bell className="w-4 h-4" />
            Enable push notifications
          </button>
        )}
      </div>

      {/* Filter tabs */}
      <div className="px-5 py-3 flex gap-2 border-b border-dispatch-border overflow-x-auto">
        {([
          { key: 'active' as const,    label: 'Active',      badge: pendingCount, danger: false },
          { key: 'all' as const,       label: 'All Jobs',    badge: 0,            danger: false },
          { key: 'incidents' as const, label: 'Road Alerts', badge: 0,            danger: true  },
        ]).map(({ key, label, badge, danger }) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={cn(
              'px-4 py-2 rounded-xl text-sm font-semibold transition-all whitespace-nowrap flex items-center gap-2',
              filter === key
                ? danger ? 'bg-red-600 text-white' : 'bg-orange-500 text-white'
                : 'bg-dispatch-surface text-slate-400 hover:text-white',
            )}
          >
            {key === 'incidents' && <TriangleAlert className="w-3.5 h-3.5" />}
            {label}
            {badge > 0 && filter !== key && (
              <span className="bg-orange-500 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center leading-none">
                {badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 px-5 py-4 flex flex-col gap-3 overflow-y-auto pb-8">
        {filter === 'incidents' ? (
          <>
            {selectedIncident && (
              <IncidentDetailCard
                incident={selectedIncident}
                onBack={() => setSelectedIncidentId(null)}
                onDispatch={handleIncidentDispatch}
              />
            )}
            {incidentsLoading && (
              <div className="flex items-center justify-center py-16 text-slate-500 text-sm gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Loading Ottawa incidents…
              </div>
            )}
            {!incidentsLoading && incidentFeed.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-16 h-16 bg-green-500/10 border border-green-500/20 rounded-full flex items-center justify-center mb-4">
                  <CheckCircle2 className="w-8 h-8 text-green-500" />
                </div>
                <p className="text-slate-300 font-semibold">All clear</p>
                <p className="text-slate-600 text-sm mt-1">No incidents in the Ottawa area.</p>
                <p className="text-slate-700 text-xs mt-1">Ontario 511 · Refreshes every 3 min</p>
              </div>
            )}
            {incidentFeed.map(inc => (
              <IncidentCard
                key={inc.id}
                incident={inc}
                selected={selectedIncident?.id === inc.id}
                onSelect={(incident) => setSelectedIncidentId(incident.id)}
                onDispatch={handleIncidentDispatch}
              />
            ))}
          </>
        ) : (
          <>
            {isLoading && (
              <div className="flex items-center justify-center py-16 text-slate-500 text-sm gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Loading jobs…
              </div>
            )}
            {!isLoading && displayRequests.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-16 h-16 bg-dispatch-surface border border-dispatch-border rounded-full flex items-center justify-center mb-4">
                  {filter === 'active'
                    ? <CheckCircle2 className="w-8 h-8 text-slate-600" />
                    : <RefreshCw className="w-8 h-8 text-slate-600" />
                  }
                </div>
                <p className="text-slate-400 font-semibold">
                  {filter === 'active' ? 'No active jobs' : 'No jobs yet'}
                </p>
                <p className="text-slate-600 text-sm mt-1 max-w-xs">
                  {filter === 'active'
                    ? 'New requests appear here automatically.'
                    : 'Submitted customer requests will appear here.'}
                </p>
              </div>
            )}
            {displayRequests.map(request => (
              <JobCard
                key={request.id}
                request={request}
                operatorId={session.id}
                onStatusChange={handleStatusChange}
                isUpdating={isUpdating}
              />
            ))}
          </>
        )}
      </div>
    </div>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────

const SESSION_KEY = 'dispatch_operator_session';

export default function OperatorPage() {
  const [session, setSession] = useState<OperatorSession | null>(() => {
    try {
      const stored = localStorage.getItem(SESSION_KEY);
      return stored ? (JSON.parse(stored) as OperatorSession) : null;
    } catch {
      return null;
    }
  });

  function handleAuthenticated(op: OperatorSession) {
    localStorage.setItem(SESSION_KEY, JSON.stringify(op));
    setSession(op);
  }

  function handleSignOut() {
    localStorage.removeItem(SESSION_KEY);
    setSession(null);
  }

  return session
    ? <OperatorView session={session} onSignOut={handleSignOut} />
    : <PinScreen onAuthenticated={handleAuthenticated} />;
}
