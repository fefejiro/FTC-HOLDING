import { useCallback, useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import L from 'leaflet';
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  CircleDot,
  Clock,
  Fuel,
  KeyRound,
  Loader2,
  LocateFixed,
  LogOut,
  MapPin,
  Navigation2,
  Phone,
  RefreshCw,
  Search,
  TriangleAlert,
  Wrench,
  X,
  Zap,
} from 'lucide-react';
import {
  CircleMarker,
  MapContainer,
  Polyline,
  Popup,
  TileLayer,
  Tooltip,
  useMap,
} from 'react-leaflet';
import DispatchAccessPanel from '../components/DispatchAccessPanel';
import DemoFeedbackForm from '../components/DemoFeedbackForm';
import { useEvents } from '../hooks/useEvents';
import { usePush } from '../hooks/usePush';
import { cn } from '../lib/cn';
import { requestMatchesDemoMode } from '../lib/demo';

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
  startDate?: string | null;
  lastUpdated?: string | null;
  occurredAt?: string | null;
  isHistorical?: boolean;
  createdAt: string;
}

interface IncidentWithMeta extends Incident {
  city: string;
  distanceKm: number | null;
  roadsideType: 'accident' | 'battery' | 'lockout' | 'gas' | 'tire' | 'general';
  roadsideScore: number;
}

interface ProximityPoint {
  lat: number;
  lng: number;
  label: string;
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
  LOCKOUT_ASSIST: 'Lockout Assist',
  BATTERY_ASSIST: 'Battery Assist',
  FUEL_ASSIST: 'Fuel Assist',
  TIRE_ASSIST: 'Tire Assist',
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

function parseTimestamp(value?: string | null) {
  if (!value) return null;
  const ts = Date.parse(value);
  return Number.isFinite(ts) ? ts : null;
}

function incidentOccurredAt(incident: Incident) {
  return incident.occurredAt || incident.lastUpdated || incident.startDate || incident.createdAt;
}

function incidentOccurredMs(incident: Incident) {
  const ts =
    parseTimestamp(incident.occurredAt) ??
    parseTimestamp(incident.lastUpdated) ??
    parseTimestamp(incident.startDate) ??
    parseTimestamp(incident.createdAt);
  return ts ?? 0;
}

function timeAgo(dateStr?: string | null, nowMs = Date.now()) {
  const ts = parseTimestamp(dateStr);
  if (ts === null) return 'time unknown';
  const diff = Math.max(0, nowMs - ts);
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function fmt(dateStr?: string | null) {
  if (!dateStr) return 'Unknown time';
  const ts = parseTimestamp(dateStr);
  if (ts === null) return 'Unknown time';
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

const OTTAWA_CENTER: ProximityPoint = {
  lat: 45.4215,
  lng: -75.6972,
  label: 'Ottawa centre',
};

const ONTARIO_CITY_HINTS = [
  'Ottawa',
  'Toronto',
  'Mississauga',
  'Brampton',
  'Hamilton',
  'London',
  'Markham',
  'Vaughan',
  'Kitchener',
  'Windsor',
  'Richmond Hill',
  'Oakville',
  'Burlington',
  'Oshawa',
  'Barrie',
  'Kingston',
  'Guelph',
  'Waterloo',
  'Ajax',
  'Whitby',
  'Milton',
  'Cambridge',
  'Thunder Bay',
  'Niagara Falls',
  'Sudbury',
  'Belleville',
  'Peterborough',
  'Kanata',
  'Orleans',
] as const;

const OTTAWA_AREA_ALIASES = new Set([
  'Ottawa',
  'Kanata',
  'Orleans',
]);

const ONTARIO_CITY_COORDS: Record<string, { lat: number; lng: number }> = {
  Ottawa: { lat: 45.4215, lng: -75.6972 },
  Toronto: { lat: 43.6532, lng: -79.3832 },
  Mississauga: { lat: 43.589, lng: -79.6441 },
  Brampton: { lat: 43.7315, lng: -79.7624 },
  Hamilton: { lat: 43.2557, lng: -79.8711 },
  London: { lat: 42.9849, lng: -81.2453 },
  Markham: { lat: 43.8561, lng: -79.337 },
  Vaughan: { lat: 43.8372, lng: -79.5083 },
  Kitchener: { lat: 43.4516, lng: -80.4925 },
  Windsor: { lat: 42.3149, lng: -83.0364 },
  'Richmond Hill': { lat: 43.8828, lng: -79.4403 },
  Oakville: { lat: 43.4675, lng: -79.6877 },
  Burlington: { lat: 43.3255, lng: -79.799 },
  Oshawa: { lat: 43.8971, lng: -78.8658 },
  Barrie: { lat: 44.3894, lng: -79.6903 },
  Kingston: { lat: 44.2312, lng: -76.486 },
  Guelph: { lat: 43.5448, lng: -80.2482 },
  Waterloo: { lat: 43.4643, lng: -80.5204 },
  Ajax: { lat: 43.8509, lng: -79.0204 },
  Whitby: { lat: 43.8975, lng: -78.9429 },
  Milton: { lat: 43.5183, lng: -79.8774 },
  Cambridge: { lat: 43.3616, lng: -80.3144 },
  'Thunder Bay': { lat: 48.3809, lng: -89.2477 },
  'Niagara Falls': { lat: 43.0896, lng: -79.0849 },
  Sudbury: { lat: 46.4917, lng: -80.993 },
  Belleville: { lat: 44.1628, lng: -77.3832 },
  Peterborough: { lat: 44.3091, lng: -78.3197 },
};

const CITY_NAME_LOOKUP = new Map(
  ONTARIO_CITY_HINTS.map((city) => [city.toLowerCase(), OTTAWA_AREA_ALIASES.has(city) ? 'Ottawa' : city]),
);

const REGION_CITY_ALIASES = new Map<string, string>([
  ['kanata', 'Ottawa'],
  ['orleans', 'Ottawa'],
  ['nepean', 'Ottawa'],
  ['barrhaven', 'Ottawa'],
  ['gloucester', 'Ottawa'],
  ['vanier', 'Ottawa'],
  ['manotick', 'Ottawa'],
  ['north york', 'Toronto'],
  ['scarborough', 'Toronto'],
  ['etobicoke', 'Toronto'],
  ['york', 'Toronto'],
  ['east york', 'Toronto'],
  ['streetsville', 'Mississauga'],
  ['port credit', 'Mississauga'],
  ['meadowvale', 'Mississauga'],
  ['ancaster', 'Hamilton'],
  ['stoney creek', 'Hamilton'],
  ['dundas', 'Hamilton'],
]);

function toNumber(value: number | null) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatDistance(km: number | null) {
  if (km === null || !Number.isFinite(km)) return 'Distance unavailable';
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(1)} km`;
}

function normalizeIncidentCityLabel(city: string) {
  const cleaned = city.trim();
  if (!cleaned) return 'Ontario';
  return CITY_NAME_LOOKUP.get(cleaned.toLowerCase()) || REGION_CITY_ALIASES.get(cleaned.toLowerCase()) || cleaned;
}

function inferCityFromCoordinates(lat: number, lng: number) {
  let bestCity: string | null = null;
  let bestDistance = Number.POSITIVE_INFINITY;

  for (const [city, coords] of Object.entries(ONTARIO_CITY_COORDS)) {
    const distanceKm = haversineKm(lat, lng, coords.lat, coords.lng);
    if (distanceKm < bestDistance) {
      bestDistance = distanceKm;
      bestCity = city;
    }
  }

  if (!bestCity || bestDistance > 60) return null;
  return bestCity;
}

function extractIncidentCity(incident: Incident) {
  const lat = toNumber(incident.locationLat);
  const lng = toNumber(incident.locationLng);
  if (lat !== null && lng !== null) {
    const inferredCity = inferCityFromCoordinates(lat, lng);
    if (inferredCity) return inferredCity;
  }

  const text = `${incident.roadway || ''} ${incident.description || ''}`.trim();
  if (!text) return 'Ontario';

  for (const [alias, city] of REGION_CITY_ALIASES.entries()) {
    const match = new RegExp(`\\b${alias.replace(/\s+/g, '\\s+')}\\b`, 'i');
    if (match.test(text)) return city;
  }

  for (const city of ONTARIO_CITY_HINTS) {
    const match = new RegExp(`\\b${city.replace(/\s+/g, '\\s+')}\\b`, 'i');
    if (match.test(text)) return normalizeIncidentCityLabel(city);
  }

  const commaParts = text.split(',').map((part) => part.trim()).filter(Boolean);
  if (commaParts.length > 1) {
    const guess = commaParts[commaParts.length - 1]
      .replace(/\b(near|at|on|route|hwy|highway|road|rd|street|st|avenue|ave)\b/gi, '')
      .trim();
    if (guess.length >= 3 && guess.length <= 24) {
      return normalizeIncidentCityLabel(guess);
    }
  }

  return 'Ontario';
}

function incidentMatchesCity(incident: IncidentWithMeta, city: string) {
  if (city === 'Ottawa') {
    return incident.city === 'Ottawa';
  }
  return incident.city === city;
}

function classifyRoadside(incident: IncidentWithMeta | Incident): {
  roadsideType: 'accident' | 'battery' | 'lockout' | 'gas' | 'tire' | 'general';
  roadsideScore: number;
} {
  const haystack = `${incident.eventType || ''} ${incident.description || ''} ${incident.roadway || ''}`.toLowerCase();

  const scores = {
    accident: 0,
    battery: 0,
    lockout: 0,
    gas: 0,
    tire: 0,
  };

  if (/(accident|collision|crash|vehicle fire|incident)/i.test(haystack)) scores.accident += 70;
  if (/(dead battery|battery boost|jump start|no start|stalled|disabled)/i.test(haystack)) scores.battery += 65;
  if (/(lockout|locked out|key stuck|keys? in car|vehicle lock)/i.test(haystack)) scores.lockout += 75;
  if (/(out of gas|ran out of gas|fuel empty|no fuel|need fuel|gas delivery)/i.test(haystack)) scores.gas += 75;
  if (/(flat tire|puncture|blowout|tire change|wheel damage)/i.test(haystack)) scores.tire += 75;

  if ((incident.eventType || '').toUpperCase() === 'BATTERY_ASSIST') scores.battery += 25;
  if ((incident.eventType || '').toUpperCase() === 'LOCKOUT_ASSIST') scores.lockout += 25;
  if ((incident.eventType || '').toUpperCase() === 'FUEL_ASSIST') scores.gas += 25;
  if ((incident.eventType || '').toUpperCase() === 'TIRE_ASSIST') scores.tire += 25;
  if (['ACCIDENT', 'COLLISION', 'VEHICLE_FIRE'].includes((incident.eventType || '').toUpperCase())) scores.accident += 20;
  if ((incident as Incident).alerted) {
    scores.accident += 5;
    scores.battery += 5;
    scores.lockout += 5;
    scores.gas += 5;
    scores.tire += 5;
  }

  const ranked = Object.entries(scores).sort((a, b) => b[1] - a[1]) as Array<[
    'accident' | 'battery' | 'lockout' | 'gas' | 'tire',
    number,
  ]>;
  const [topType, rawScore] = ranked[0];
  const roadsideType = rawScore >= 45 ? topType : 'general';
  const roadsideScore = Math.max(0, Math.min(100, rawScore));
  return { roadsideType, roadsideScore };
}

function roadsideLabel(type: IncidentWithMeta['roadsideType']) {
  if (type === 'accident') return 'Accident likely';
  if (type === 'battery') return 'Battery assist likely';
  if (type === 'lockout') return 'Lockout likely';
  if (type === 'gas') return 'Fuel assist likely';
  if (type === 'tire') return 'Tire assist likely';
  return 'General roadside';
}

function readDemoContext() {
  return { demoMode: false, demoSessionId: null as string | null };
}

function sessionKey() {
  return LIVE_SESSION_KEY;
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
          <DispatchAccessPanel
            activeRole="operator"
            className="mb-5 w-full"
          />
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
              <p className="text-slate-500 text-sm mt-1">Dispatch - Ottawa</p>
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

function IncidentMapViewport({
  incidents,
  proximityPoint,
  selectedIncidentId,
}: {
  incidents: IncidentWithMeta[];
  proximityPoint: ProximityPoint;
  selectedIncidentId: string | null;
}) {
  const map = useMap();

  useEffect(() => {
    if (!incidents.length) {
      map.setView([proximityPoint.lat, proximityPoint.lng], 11, { animate: true });
      return;
    }

    const bounds = L.latLngBounds(
      incidents.map((incident) => [incident.locationLat as number, incident.locationLng as number]),
    );
    bounds.extend([proximityPoint.lat, proximityPoint.lng]);
    map.fitBounds(bounds.pad(0.2), {
      animate: true,
      duration: 0.45,
      maxZoom: 14,
    });
  }, [incidents, map, proximityPoint.lat, proximityPoint.lng]);

  useEffect(() => {
    if (!selectedIncidentId) return;
    const selected = incidents.find((incident) => incident.id === selectedIncidentId);
    if (!selected) return;
    map.flyTo([selected.locationLat as number, selected.locationLng as number], Math.max(map.getZoom(), 13), {
      animate: true,
      duration: 0.35,
    });
  }, [incidents, map, selectedIncidentId]);

  return null;
}

function IncidentMapPanel({
  incidents,
  selectedIncidentId,
  onSelect,
  proximityPoint,
}: {
  incidents: IncidentWithMeta[];
  selectedIncidentId: string | null;
  onSelect: (incident: IncidentWithMeta) => void;
  proximityPoint: ProximityPoint;
}) {
  const plotted = incidents.filter(
    (incident) =>
      toNumber(incident.locationLat) !== null && toNumber(incident.locationLng) !== null,
  );

  if (!plotted.length) {
    return (
      <div className="bg-dispatch-surface border border-dispatch-border rounded-2xl p-4">
        <div className="text-white text-sm font-semibold">Incident map</div>
        <p className="text-slate-500 text-xs mt-1">No coordinate-ready incidents for this filter.</p>
      </div>
    );
  }

  const selected = plotted.find((incident) => incident.id === selectedIncidentId) || null;

  return (
    <div className="bg-dispatch-surface border border-dispatch-border rounded-2xl p-4">
      <div className="flex items-center justify-between gap-3 mb-3">
        <div>
          <div className="text-white text-sm font-semibold">Live incident map</div>
          <div className="text-slate-500 text-xs mt-1">Pan, zoom, and tap markers like a normal map.</div>
        </div>
        <div className="text-right">
          <div className="text-slate-500 text-[11px] uppercase tracking-[0.14em]">Reference point</div>
          <div className="text-slate-200 text-xs mt-1">{proximityPoint.label}</div>
        </div>
      </div>

      <MapContainer
        center={[proximityPoint.lat, proximityPoint.lng]}
        zoom={11}
        scrollWheelZoom
        className="h-64 sm:h-72 w-full rounded-xl overflow-hidden border border-dispatch-border"
      >
        <TileLayer
          attribution='&copy; OpenStreetMap contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <IncidentMapViewport
          incidents={plotted}
          proximityPoint={proximityPoint}
          selectedIncidentId={selectedIncidentId}
        />

        <CircleMarker
          center={[proximityPoint.lat, proximityPoint.lng]}
          radius={8}
          pathOptions={{
            color: '#22d3ee',
            fillColor: '#22d3ee',
            fillOpacity: 0.35,
            weight: 2,
          }}
        >
          <Tooltip direction="top" offset={[0, -8]} opacity={0.95}>
            {proximityPoint.label}
          </Tooltip>
        </CircleMarker>

        {plotted.map((incident) => {
          const selectedMarker = incident.id === selectedIncidentId;
          return (
            <CircleMarker
              key={incident.id}
              center={[incident.locationLat as number, incident.locationLng as number]}
              radius={selectedMarker ? 9 : 7}
              eventHandlers={{
                click: () => onSelect(incident),
              }}
              pathOptions={{
                color: selectedMarker ? '#fb923c' : '#f59e0b',
                fillColor: selectedMarker ? '#fb923c' : '#f59e0b',
                fillOpacity: selectedMarker ? 0.75 : 0.6,
                weight: selectedMarker ? 3 : 2,
              }}
            >
              <Tooltip direction="top" offset={[0, -8]} opacity={0.95}>
                {incidentLabel(incident)}
              </Tooltip>
              <Popup>
                <div className="text-sm">
                  <div className="font-semibold">{incidentLabel(incident)}</div>
                  <div className="mt-1">{incident.roadway || incident.city}</div>
                  <div className="mt-1 text-slate-600">{formatDistance(incident.distanceKm)} from {proximityPoint.label}</div>
                </div>
              </Popup>
            </CircleMarker>
          );
        })}

        {selected ? (
          <Polyline
            positions={[
              [proximityPoint.lat, proximityPoint.lng],
              [selected.locationLat as number, selected.locationLng as number],
            ]}
            pathOptions={{ color: '#22d3ee', dashArray: '6 6', weight: 2 }}
          />
        ) : null}
      </MapContainer>

      <div className="flex items-center gap-4 mt-3 text-xs text-slate-400">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-amber-400 border border-amber-200/80" />
          Incident marker
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-cyan-400/30 border-2 border-cyan-300" />
          Distance reference
        </div>
      </div>
    </div>
  );
}

function IncidentCard({ incident, selected, onDispatch, onSelect, proximityLabel }: { incident: IncidentWithMeta; selected?: boolean; onDispatch?: (incident: Incident) => void; onSelect?: (incident: IncidentWithMeta) => void; proximityLabel: string }) {
  const mapsUrl = incidentMapsUrl(incident);
  const label = incidentLabel(incident);
  const isHigh = incidentIsHighPriority(incident);
  const occurredAt = incidentOccurredAt(incident);

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
                {timeAgo(occurredAt)}
              </div>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            {incident.alerted ? <span className="text-xs text-orange-400 font-semibold border border-orange-500/25 bg-orange-500/10 px-2.5 py-1 rounded-full whitespace-nowrap">Alerted</span> : null}
            <span className="text-[11px] text-cyan-300 font-semibold">{formatDistance(incident.distanceKm)}</span>
            <span className="text-[11px] text-lime-300 font-semibold">{roadsideLabel(incident.roadsideType)} ({incident.roadsideScore}%)</span>
          </div>
        </div>
        {incident.roadway ? (
          <div className="flex items-center gap-2 text-slate-300 text-sm mb-1.5">
            <MapPin className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
            <span className="font-medium">{incident.roadway}</span>
          </div>
        ) : null}
        <div className="text-[11px] text-slate-500 mb-2">
          {incident.city} - {formatDistance(incident.distanceKm)} from {proximityLabel}
        </div>
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

function IncidentDetailCard({
  incident,
  onBack,
  onDispatch,
  proximityLabel,
}: {
  incident: IncidentWithMeta;
  onBack: () => void;
  onDispatch?: (incident: Incident) => void;
  proximityLabel: string;
}) {
  const mapsUrl = incidentMapsUrl(incident);
  const severity = incident.severity ? String(incident.severity).replace(/_/g, ' ') : 'Not specified';
  const occurredAt = incidentOccurredAt(incident);
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
        <div className="bg-dispatch-bg border border-dispatch-border rounded-xl p-3"><div className="text-slate-600 text-[11px] uppercase tracking-[0.14em] font-semibold">Roadway</div><div className="text-white text-sm font-semibold mt-2">{incident.roadway || 'Ontario area'}</div></div>
        <div className="bg-dispatch-bg border border-dispatch-border rounded-xl p-3"><div className="text-slate-600 text-[11px] uppercase tracking-[0.14em] font-semibold">Severity</div><div className="text-slate-300 text-sm mt-2">{severity}</div></div>
        <div className="bg-dispatch-bg border border-dispatch-border rounded-xl p-3"><div className="text-slate-600 text-[11px] uppercase tracking-[0.14em] font-semibold">Reported</div><div className="text-slate-300 text-sm mt-2">{fmt(occurredAt)} ({timeAgo(occurredAt)})</div></div>
        <div className="bg-dispatch-bg border border-dispatch-border rounded-xl p-3"><div className="text-slate-600 text-[11px] uppercase tracking-[0.14em] font-semibold">Coordinates</div><div className="text-slate-300 text-sm mt-2">{incident.locationLat && incident.locationLng ? `${incident.locationLat.toFixed(5)}, ${incident.locationLng.toFixed(5)}` : 'Coordinate precision unavailable'}</div></div>
        <div className="bg-dispatch-bg border border-dispatch-border rounded-xl p-3"><div className="text-slate-600 text-[11px] uppercase tracking-[0.14em] font-semibold">City</div><div className="text-slate-300 text-sm mt-2">{incident.city}</div></div>
        <div className="bg-dispatch-bg border border-dispatch-border rounded-xl p-3"><div className="text-slate-600 text-[11px] uppercase tracking-[0.14em] font-semibold">Distance</div><div className="text-slate-300 text-sm mt-2">{formatDistance(incident.distanceKm)} from {proximityLabel}</div></div>
        <div className="bg-dispatch-bg border border-dispatch-border rounded-xl p-3"><div className="text-slate-600 text-[11px] uppercase tracking-[0.14em] font-semibold">Likely assist</div><div className="text-lime-300 text-sm mt-2">{roadsideLabel(incident.roadsideType)} ({incident.roadsideScore}%)</div></div>
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
  const { isSubscribed, isSupported, subscribe } = usePush({ operatorId: session.id });
  const [incidentMode, setIncidentMode] = useState<'active' | 'history' | 'all'>('active');
  const [incidentCategory, setIncidentCategory] = useState<'all' | 'emergency' | 'breakdown' | 'traffic' | 'transit'>('all');
  const [incidentCity, setIncidentCity] = useState('all');
  const [incidentSort, setIncidentSort] = useState<'roadside' | 'newest' | 'proximity'>('proximity');
  const [incidentRadiusKm, setIncidentRadiusKm] = useState(0);
  const [proximityPoint, setProximityPoint] = useState<ProximityPoint>(OTTAWA_CENTER);
  const [locatingProximity, setLocatingProximity] = useState(false);
  const [proximityError, setProximityError] = useState('');
  const [incidentSearch, setIncidentSearch] = useState('');
  const [showFeedback, setShowFeedback] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [, setNowTick] = useState(0);
  const queryClient = useQueryClient();
  const requestQueryKey = useMemo(() => ['requests', demoMode ? `demo:${demoSessionId || 'demo'}` : 'live'], [demoMode, demoSessionId]);
  const requestsUrl = useMemo(() => {
    if (!demoMode) return '/api/requests?mode=live';
    const params = new URLSearchParams({ mode: 'demo' });
    if (demoSessionId) params.set('demoSessionId', demoSessionId);
    return `/api/requests?${params.toString()}`;
  }, [demoMode, demoSessionId]);

  const incidentsUrl = useMemo(() => {
    const params = new URLSearchParams({ mode: incidentMode, limit: '80' });
    const q = incidentSearch.trim();
    if (q) params.set('q', q);
    return `/api/incidents?${params.toString()}`;
  }, [incidentMode, incidentSearch]);

  const useMyLocationForProximity = useCallback(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setProximityError('Location is not supported on this device. Using Ottawa centre.');
      setProximityPoint(OTTAWA_CENTER);
      return;
    }
    setLocatingProximity(true);
    setProximityError('');
    const gpsPromise = new Promise<GeolocationPosition>((resolve, reject) => {
      const timeoutId = setTimeout(() => reject(new Error('GPS timeout')), 15000);
      navigator.geolocation.getCurrentPosition(
        (position) => {
          clearTimeout(timeoutId);
          resolve(position);
        },
        (error) => {
          clearTimeout(timeoutId);
          reject(error);
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 },
      );
    });

    gpsPromise
      .then(async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        let label = 'your location';

        try {
          const response = await fetch(`/api/geocode/reverse?lat=${lat}&lng=${lng}`, {
            credentials: 'include',
          });
          if (response.ok) {
            const data = (await response.json()) as { city?: string; displayName?: string };
            label = data.city || data.displayName || label;
          }
        } catch {
          // Keep generic label if reverse geocoding fails.
        }

        setProximityPoint({ lat, lng, label });
      })
      .catch(() => {
        setProximityPoint(OTTAWA_CENTER);
        setProximityError('Could not read GPS location. Using Ottawa centre.');
      })
      .finally(() => {
        setLocatingProximity(false);
      });
  }, []);

  function addToast(message: string, type: Toast['type']) {
    const id = Date.now() + Math.round(Math.random() * 1000);
    setToasts((current) => [...current, { id, message, type }]);
    setTimeout(() => setToasts((current) => current.filter((toast) => toast.id !== id)), 5000);
  }

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
      queryClient.invalidateQueries({ queryKey: ['incidents'] });
      const likely = classifyRoadside(incident);
      if (incidentIsHighPriority(incident) || likely.roadsideScore >= 65) {
        playIncidentAlert();
        addToast(`${roadsideLabel(likely.roadsideType)} - ${incident.roadway || 'Ontario area'}`, 'incident');
      }
    },
    onIncidentUpdated: (data) => {
      void data;
      queryClient.invalidateQueries({ queryKey: ['incidents'] });
    },
  });

  const requestFallbackMs = liveFeedConnected ? 30_000 : 12_000;
  const incidentFallbackMs = liveFeedConnected ? 25_000 : 10_000;
  const { data: status } = useQuery<DispatchStatusResponse>({ queryKey: ['dispatch-status'], queryFn: async () => { const response = await fetch('/api/status'); if (!response.ok) throw new Error('Failed to load dispatch status'); return response.json() as Promise<DispatchStatusResponse>; }, refetchInterval: 30_000, staleTime: 15_000, refetchOnWindowFocus: true, refetchOnReconnect: true });
  const { data: allRequests = [], isLoading } = useQuery<ServiceRequest[]>({ queryKey: requestQueryKey, queryFn: async () => { const response = await fetch(requestsUrl); if (!response.ok) throw new Error('Failed to load requests'); return response.json() as Promise<ServiceRequest[]>; }, refetchInterval: requestFallbackMs, refetchIntervalInBackground: true, staleTime: 12_000, refetchOnWindowFocus: true, refetchOnReconnect: true });
  const { data: incidentFeed = [], isLoading: incidentsLoading } = useQuery<Incident[]>({ queryKey: ['incidents', incidentMode, incidentSearch], queryFn: async () => { const response = await fetch(incidentsUrl); if (!response.ok) throw new Error('Failed to load incidents'); return response.json() as Promise<Incident[]>; }, refetchInterval: incidentFallbackMs, refetchIntervalInBackground: true, staleTime: 10_000, refetchOnWindowFocus: true, refetchOnReconnect: true });

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setNowTick((tick) => tick + 1);
    }, 30_000);
    return () => window.clearInterval(intervalId);
  }, []);

  useEffect(() => {
    if (!liveFeedConnected) return;
    queryClient.invalidateQueries({ queryKey: requestQueryKey });
    queryClient.invalidateQueries({ queryKey: ['incidents'] });
  }, [liveFeedConnected, queryClient, requestQueryKey]);

  const { mutate: updateStatus, isPending: isUpdating } = useMutation({
    mutationFn: async ({ id, status, operatorId }: { id: string; status: RequestStatus; operatorId: string }) => {
      const response = await fetch(`/api/requests/${id}/status`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status, operatorId }) });
      if (!response.ok) throw new Error('Failed to update request status');
      return response.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: requestQueryKey }),
  });

  const handleIncidentDispatch = useCallback(async (incident: Incident) => {
    const roadway = incident.roadway || 'Ontario area';
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
  const INCIDENT_CATEGORIES: Record<string, string[]> = {
    emergency: ['ACCIDENT', 'COLLISION', 'VEHICLE_FIRE'],
    breakdown: ['VEHICLE_BREAKDOWN', 'STALLED_VEHICLE', 'DISABLED_VEHICLE', 'HAZARD', 'DEBRIS', 'BATTERY_ASSIST', 'LOCKOUT_ASSIST', 'FUEL_ASSIST', 'TIRE_ASSIST'],
    traffic: ['ROAD_CLOSURE', 'ROAD_EVENT', 'ROADWORK'],
    transit: ['TRANSIT_ALERT', 'ROAD_DETOUR', 'ROUTE_CANCELLED'],
  };
  const categoryFilteredIncidentFeed = incidentCategory === 'all'
    ? incidentFeed
    : incidentFeed.filter((incident) =>
        INCIDENT_CATEGORIES[incidentCategory]?.includes(
          (incident.eventType || '').toUpperCase(),
        ),
      );
  const incidentFeedWithMeta = useMemo<IncidentWithMeta[]>(
    () =>
      categoryFilteredIncidentFeed.map((incident) => {
        const lat = toNumber(incident.locationLat);
        const lng = toNumber(incident.locationLng);
        const distanceKm =
          lat !== null && lng !== null
            ? haversineKm(proximityPoint.lat, proximityPoint.lng, lat, lng)
            : null;
        return {
          ...incident,
          city: extractIncidentCity(incident),
          distanceKm,
          ...classifyRoadside(incident),
        };
      }),
    [categoryFilteredIncidentFeed, proximityPoint.lat, proximityPoint.lng],
  );
  const cityOptions = useMemo(() => {
    const unique = Array.from(
      new Set(['Ottawa', ...incidentFeedWithMeta.map((incident) => incident.city)]),
    ).sort(
      (a, b) => a.localeCompare(b),
    );
    return unique;
  }, [incidentFeedWithMeta]);
  useEffect(() => {
    if (incidentCity === 'all') return;
    if (!cityOptions.includes(incidentCity)) {
      setIncidentCity('all');
    }
  }, [cityOptions, incidentCity]);
  const cityFilteredIncidentFeed = incidentCity === 'all'
    ? incidentFeedWithMeta
    : incidentFeedWithMeta.filter((incident) => incidentMatchesCity(incident, incidentCity));
  const radiusFilteredIncidentFeed = incidentRadiusKm > 0
    ? cityFilteredIncidentFeed.filter(
        (incident) => incident.distanceKm !== null && incident.distanceKm <= incidentRadiusKm,
      )
    : cityFilteredIncidentFeed;
  const sortedIncidentFeed = useMemo(() => {
    const next = [...radiusFilteredIncidentFeed];
    if (incidentSort === 'proximity') {
      next.sort((a, b) => {
        if (a.distanceKm === null && b.distanceKm === null) {
          if (b.roadsideScore !== a.roadsideScore) return b.roadsideScore - a.roadsideScore;
          return incidentOccurredMs(b) - incidentOccurredMs(a);
        }
        if (a.distanceKm === null) return 1;
        if (b.distanceKm === null) return -1;
        if (a.distanceKm !== b.distanceKm) return a.distanceKm - b.distanceKm;
        if (b.roadsideScore !== a.roadsideScore) return b.roadsideScore - a.roadsideScore;
        return incidentOccurredMs(b) - incidentOccurredMs(a);
      });
      return next;
    }
    if (incidentSort === 'roadside') {
      next.sort((a, b) => {
        if (b.roadsideScore !== a.roadsideScore) return b.roadsideScore - a.roadsideScore;
        if (a.distanceKm !== null && b.distanceKm !== null && a.distanceKm !== b.distanceKm) {
          return a.distanceKm - b.distanceKm;
        }
        return incidentOccurredMs(b) - incidentOccurredMs(a);
      });
      return next;
    }
    next.sort((a, b) => incidentOccurredMs(b) - incidentOccurredMs(a));
    return next;
  }, [radiusFilteredIncidentFeed, incidentSort]);
  const selectedIncident = sortedIncidentFeed.find((incident) => incident.id === selectedIncidentId) || null;
  const sourceCount = status?.incidentMonitor?.sourceCount ?? 3;
  const pollSeconds = Math.max(1, Math.round((status?.incidentMonitor?.pollIntervalMs ?? 60_000) / 1000));
  const lastPoll = formatPoll(status?.incidentMonitor?.lastSuccessAt);

  useEffect(() => {
    if (filter === 'incidents') {
      setSelectedRequestId(null);
      if (selectedIncidentId && !sortedIncidentFeed.some((incident) => incident.id === selectedIncidentId)) setSelectedIncidentId(null);
      return;
    }
    setSelectedIncidentId(null);
    if (selectedRequestId && !myRequests.some((request) => request.id === selectedRequestId)) setSelectedRequestId(null);
  }, [filter, sortedIncidentFeed, myRequests, selectedIncidentId, selectedRequestId]);

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

        <DispatchAccessPanel
          activeRole="operator"
          profileLabel={session.name}
          profileMeta={demoMode ? `Demo session ${demoSessionId || 'active'}` : 'Live operator profile'}
          showRoleSwitch={false}
          className="mt-3"
        />

        {demoMode ? <div className="mt-3 rounded-2xl border border-orange-500/20 bg-orange-500/10 px-4 py-3 text-sm text-orange-100">Only requests from this demo session are shown in the queue. The incident watch remains live so the client can see real system movement while testing.</div> : null}

        {isSupported && !isSubscribed ? (
          <div className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-amber-500/25 bg-amber-500/10 px-4 py-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
              <span className="text-amber-200 text-sm font-medium leading-snug">Push notifications off - you won&apos;t get job alerts</span>
            </div>
            <button
              type="button"
              onClick={subscribe}
              className="flex-shrink-0 text-xs font-bold text-white bg-amber-500 hover:bg-amber-400 active:bg-amber-600 transition-colors px-3 py-1.5 rounded-lg"
            >
              Enable
            </button>
          </div>
        ) : null}

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
            <div className="bg-dispatch-surface border border-dispatch-border rounded-2xl p-3">
              <div className="flex flex-wrap items-center gap-2">
                {[
                  { key: 'active' as const, label: 'Active now' },
                  { key: 'history' as const, label: 'History' },
                  { key: 'all' as const, label: 'All' },
                ].map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setIncidentMode(item.key)}
                    className={cn(
                      'px-3 py-2 rounded-lg text-xs font-semibold transition-colors min-h-11',
                      incidentMode === item.key
                        ? 'bg-orange-500 text-white'
                        : 'bg-dispatch-bg border border-dispatch-border text-slate-400 hover:text-white',
                    )}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
              {/* Category chips */}
              <div className="mt-2 flex flex-wrap gap-1.5">
                {([
                  { key: 'all' as const, label: 'All types', cls: incidentCategory === 'all' ? 'bg-slate-600 text-white' : 'bg-dispatch-bg border border-dispatch-border text-slate-400 hover:text-white' },
                  { key: 'emergency' as const, label: 'Emergency', cls: incidentCategory === 'emergency' ? 'bg-red-600 text-white' : 'bg-dispatch-bg border border-dispatch-border text-slate-400 hover:text-red-400' },
                  { key: 'breakdown' as const, label: 'Breakdown', cls: incidentCategory === 'breakdown' ? 'bg-orange-500 text-white' : 'bg-dispatch-bg border border-dispatch-border text-slate-400 hover:text-orange-400' },
                  { key: 'traffic' as const, label: 'Traffic', cls: incidentCategory === 'traffic' ? 'bg-blue-600 text-white' : 'bg-dispatch-bg border border-dispatch-border text-slate-400 hover:text-blue-400' },
                  { key: 'transit' as const, label: 'Transit', cls: incidentCategory === 'transit' ? 'bg-slate-500 text-white' : 'bg-dispatch-bg border border-dispatch-border text-slate-400 hover:text-white' },
                ] as const).map((chip) => (
                  <button
                    key={chip.key}
                    type="button"
                    onClick={() => { setIncidentCategory(chip.key); setSelectedIncidentId(null); }}
                    className={cn('px-3 py-2 rounded-lg text-xs font-semibold transition-colors min-h-11', chip.cls)}
                  >
                    {chip.label}
                  </button>
                ))}
              </div>
              <div className="mt-2 grid grid-cols-1 sm:grid-cols-3 gap-2">
                <label className="flex items-center gap-2 rounded-xl border border-dispatch-border bg-dispatch-bg px-3 py-2.5 min-h-11">
                  <MapPin className="w-4 h-4 text-slate-500" />
                  <select
                    value={incidentCity}
                    onChange={(event) => {
                      setIncidentCity(event.target.value);
                      setSelectedIncidentId(null);
                    }}
                    className="w-full bg-transparent text-sm text-slate-200 focus:outline-none"
                  >
                    <option value="all" className="bg-slate-950 text-slate-100">All cities</option>
                    {cityOptions.map((city) => (
                      <option key={city} value={city} className="bg-slate-950 text-slate-100">
                        {city}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex items-center gap-2 rounded-xl border border-dispatch-border bg-dispatch-bg px-3 py-2.5 min-h-11">
                  <Navigation2 className="w-4 h-4 text-slate-500" />
                  <select
                    value={incidentSort}
                    onChange={(event) => setIncidentSort(event.target.value as 'roadside' | 'newest' | 'proximity')}
                    className="w-full bg-transparent text-sm text-slate-200 focus:outline-none"
                  >
                    <option value="proximity" className="bg-slate-950 text-slate-100">Sort: closest first</option>
                    <option value="roadside" className="bg-slate-950 text-slate-100">Sort: most likely assist</option>
                    <option value="newest" className="bg-slate-950 text-slate-100">Sort: newest first</option>
                  </select>
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={useMyLocationForProximity}
                    className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-3 py-2.5 text-xs font-semibold text-cyan-200 hover:bg-cyan-500/20 transition-colors min-h-11"
                  >
                    {locatingProximity ? <Loader2 className="w-4 h-4 animate-spin" /> : <LocateFixed className="w-4 h-4" />}
                    Use my location
                  </button>
                  <button
                    type="button"
                    onClick={() => setProximityPoint(OTTAWA_CENTER)}
                    className="inline-flex items-center justify-center rounded-xl border border-dispatch-border bg-dispatch-bg px-3 py-2.5 text-xs font-semibold text-slate-300 hover:text-white transition-colors min-h-11"
                  >
                    Ottawa
                  </button>
                </div>
              </div>
              <div className="mt-2 rounded-xl border border-dispatch-border bg-dispatch-bg px-3 py-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-xs font-semibold text-slate-300">Distance radius</div>
                  <div className="text-xs font-semibold text-cyan-300">
                    {incidentRadiusKm > 0 ? `Within ${incidentRadiusKm} km` : 'All distances'}
                  </div>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  value={incidentRadiusKm}
                  onChange={(event) => setIncidentRadiusKm(Number(event.target.value))}
                  className="mt-2 w-full accent-cyan-400"
                />
                <div className="mt-1 flex items-center justify-between text-[11px] text-slate-500">
                  <span>All</span>
                  <span>50 km</span>
                  <span>100 km</span>
                </div>
              </div>
              <p className="mt-2 text-[11px] text-slate-500">
                Distances measured from {proximityPoint.label}.
                {proximityError ? ` ${proximityError}` : ''}
              </p>
              <label className="mt-2 flex items-center gap-2 rounded-xl border border-dispatch-border bg-dispatch-bg px-3 py-2.5">
                <Search className="w-4 h-4 text-slate-500" />
                <input
                  value={incidentSearch}
                  onChange={(event) => setIncidentSearch(event.target.value)}
                  placeholder="Search road, city, route, or incident text"
                  className="w-full bg-transparent text-sm text-slate-200 placeholder-slate-600 focus:outline-none"
                />
              </label>
            </div>
            {!incidentsLoading && sortedIncidentFeed.length > 0 ? (
              <IncidentMapPanel
                incidents={sortedIncidentFeed}
                selectedIncidentId={selectedIncidentId}
                onSelect={(incident) => setSelectedIncidentId(incident.id)}
                proximityPoint={proximityPoint}
              />
            ) : null}
            {selectedIncident ? <IncidentDetailCard incident={selectedIncident} proximityLabel={proximityPoint.label} onBack={() => setSelectedIncidentId(null)} onDispatch={handleIncidentDispatch} /> : null}
            {incidentsLoading ? <div className="flex items-center justify-center py-16 text-slate-500 text-sm gap-2"><Loader2 className="w-4 h-4 animate-spin" />Loading Ontario incidents...</div> : null}
            {!incidentsLoading && sortedIncidentFeed.length === 0 ? <div className="flex flex-col items-center justify-center py-16 text-center"><div className="w-16 h-16 bg-green-500/10 border border-green-500/20 rounded-full flex items-center justify-center mb-4"><CheckCircle2 className="w-8 h-8 text-green-500" /></div><p className="text-slate-300 font-semibold">No incidents for this filter</p><p className="text-slate-600 text-sm mt-1">{incidentRadiusKm > 0 ? `No incidents found within ${incidentRadiusKm} km.` : incidentCity !== 'all' ? `No incidents matched ${incidentCity}.` : incidentCategory !== 'all' ? `No ${incidentCategory} incidents matched.` : incidentMode === 'history' ? 'No historical incidents matched your filters yet.' : 'No active Ontario incidents matched your filters.'}</p></div> : null}
            {sortedIncidentFeed.map((incident) => <IncidentCard key={incident.id} incident={incident} proximityLabel={proximityPoint.label} selected={selectedIncident?.id === incident.id} onSelect={(value) => setSelectedIncidentId(value.id)} onDispatch={handleIncidentDispatch} />)}
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
  const storageKey = sessionKey();
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
