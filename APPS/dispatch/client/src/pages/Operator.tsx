import { Component, Fragment, type ErrorInfo, type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import L from 'leaflet';
import {
  AlertTriangle,
  ArrowLeft,
  BarChart2,
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
import DispatchLoginShell from '../components/DispatchLoginShell';
import SourceMonitorSummary from '../components/SourceMonitorSummary';
import { useEvents } from '../hooks/useEvents';
import { usePush } from '../hooks/usePush';
import { cn } from '../lib/cn';
import {
  clearOperatorSession,
  operatorFetch,
  readOperatorSession,
  type OperatorSession,
  writeOperatorSession,
} from '../lib/operatorSession';
import {
  type SignalWorkflowStatus,
  SIGNAL_WORKFLOW_BADGES,
  SIGNAL_WORKFLOW_LABELS,
  isResolvedSignalWorkflowStatus,
  normalizeSignalWorkflowStatus,
} from '../lib/signalWorkflow';
import {
  DEFAULT_DISPATCH_REGION,
  DISPATCH_REGION_ORDER,
  type DispatchRegionKey,
  getDispatchRegion,
  isRegionScopedIncident,
} from '../../../shared/dispatchRegions';

type ServiceType = 'gas' | 'lockout' | 'jump' | 'tire' | 'other';
type RequestStatus = 'pending' | 'accepted' | 'en_route' | 'completed' | 'cancelled';
type OperatorFilter = 'active' | 'all' | 'incidents' | 'stats';
type IncidentSourceFilter = 'on511' | 'ottawa_traffic' | 'octranspo' | 'tomtom' | 'waze';

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
  workflowStatus?: SignalWorkflowStatus | null;
  workflowOperatorId?: string | null;
  workflowStartedAt?: string | null;
  workflowResolvedAt?: string | null;
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
  region?: {
    key: DispatchRegionKey;
    label: string;
    coverageLabel: string;
  };
  sseClients?: number;
  notifications?: { webPushConfigured?: boolean };
  incidentMonitor?: {
    running?: boolean;
    sourceCount?: number;
    sources?: Array<{
      key: string;
      label: string;
      url: string;
      tier?: string;
      tierLabel?: string;
      statusLabel?: string;
      enabled?: boolean;
      lastSuccessAt?: string | null;
      lastError?: string | null;
      rateLimited?: boolean;
      lastFetchCount?: number;
      rawCount?: number;
      actionableCount?: number;
      pollState?: string;
      currentPollIntervalMs?: number | null;
      lastRegion?: DispatchRegionKey | null;
    }>;
    pollIntervalMs?: number;
    lastSuccessAt?: string | null;
  };
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

interface Toast {
  id: number;
  message: string;
  type: 'job' | 'incident';
}

const ROAD_ALERTS_DEBUG = import.meta.env.DEV;

function logRoadAlertsDebug(event: string, details?: Record<string, unknown>) {
  if (!ROAD_ALERTS_DEBUG) return;
  console.debug('[dispatch][road-alerts]', event, details ?? {});
}

function useCompactViewport(query = '(max-width: 767px)') {
  const [compact, setCompact] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const media = window.matchMedia(query);
    const update = (matches: boolean) => setCompact(matches);
    update(media.matches);

    const handler = (event: MediaQueryListEvent) => update(event.matches);
    if (typeof media.addEventListener === 'function') {
      media.addEventListener('change', handler);
      return () => media.removeEventListener('change', handler);
    }

    media.addListener(handler);
    return () => media.removeListener(handler);
  }, [query]);

  return compact;
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
  pending: { label: 'New', badge: 'bg-amber-500/15 text-amber-400', bar: 'bg-orange-500' },
  accepted: { label: 'Claimed', badge: 'bg-blue-500/15 text-blue-400', bar: 'bg-blue-500' },
  en_route: { label: 'Heading there', badge: 'bg-purple-500/15 text-purple-400', bar: 'bg-purple-500' },
  completed: { label: 'Completed', badge: 'bg-green-500/15 text-green-400', bar: 'bg-green-500' },
  cancelled: { label: 'Unable to complete', badge: 'bg-slate-700/50 text-slate-500', bar: 'bg-slate-700' },
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

function incidentSourceLabel(incident: Incident) {
  if (incident.id.startsWith('on511:')) return 'Ontario 511';
  if (incident.id.startsWith('ottawa_traffic:')) return 'City of Ottawa traffic';
  if (incident.id.startsWith('octranspo:')) return 'OC Transpo service alerts';
  if (incident.id.startsWith('tomtom:')) return 'TomTom traffic';
  if (incident.id.startsWith('waze:')) return 'Waze (crowd-sourced)';
  return 'Official incident feed';
}

function incidentSourceTrustLabel(incident: Incident) {
  if (incident.id.startsWith('ottawa_traffic:')) return 'Official Ottawa traffic feed';
  if (incident.id.startsWith('octranspo:')) return 'Official Ottawa transit feed';
  if (incident.id.startsWith('on511:')) return 'Official regional feed';
  if (incident.id.startsWith('tomtom:')) return 'TomTom commercial feed';
  if (incident.id.startsWith('waze:')) return 'Waze crowd-sourced report';
  return 'Official feed';
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

function incidentFreshnessMeta(dateStr?: string | null) {
  const ts = parseTimestamp(dateStr);
  if (ts === null) {
    return {
      label: 'Freshness unknown',
      tone: 'border-slate-700 bg-slate-800/60 text-slate-400',
    };
  }
  const minutes = Math.max(0, Math.floor((Date.now() - ts) / 60000));
  if (minutes <= 15) {
    return {
      label: 'Fresh now',
      tone: 'border-emerald-500/25 bg-emerald-500/10 text-emerald-300',
    };
  }
  if (minutes <= 60) {
    return {
      label: 'Recent',
      tone: 'border-cyan-500/25 bg-cyan-500/10 text-cyan-200',
    };
  }
  if (minutes <= 180) {
    return {
      label: 'Aging',
      tone: 'border-amber-500/25 bg-amber-500/10 text-amber-200',
    };
  }
  return {
    label: 'Stale',
    tone: 'border-slate-700 bg-slate-800/60 text-slate-400',
  };
}

function incidentConfidenceMeta(incident: IncidentWithMeta | Incident) {
  if (incident.alerted) {
    if (incident.id.startsWith('ottawa_traffic:') || incident.id.startsWith('octranspo:')) {
      return {
        label: 'Qualified regional signal',
        tone: 'border-emerald-500/25 bg-emerald-500/10 text-emerald-300',
      };
    }
    return {
      label: 'Qualified official signal',
      tone: 'border-cyan-500/25 bg-cyan-500/10 text-cyan-200',
    };
  }
  return {
    label: 'Limited feed confidence',
    tone: 'border-slate-700 bg-slate-800/60 text-slate-400',
  };
}

function isQualifiedOperatorSignal(incident: IncidentWithMeta) {
  return Boolean(incident.alerted) || incident.roadsideScore >= 65;
}

function fmt(dateStr?: string | null) {
  if (!dateStr) return 'Unknown time';
  const ts = parseTimestamp(dateStr);
  if (ts === null) return 'Unknown time';
  return new Date(dateStr).toLocaleString('en-CA', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function fmtOptional(dateStr?: string | null) {
  if (!dateStr) return 'Not available';
  return fmt(dateStr);
}

function formatPoll(value?: string | null) {
  return value ? fmt(value) : 'Waiting for first successful poll';
}

function requestMapsUrl(request: ServiceRequest) {
  if (request.locationLat && request.locationLng) return `https://maps.google.com/?q=${request.locationLat},${request.locationLng}`;
  if (request.locationAddress) return `https://maps.google.com/?q=${encodeURIComponent(request.locationAddress)}`;
  return null;
}

function incidentMapsUrl(incident: Incident, regionKey: DispatchRegionKey) {
  if (incident.locationLat && incident.locationLng) return `https://maps.google.com/?q=${incident.locationLat},${incident.locationLng}`;
  if (incident.roadway) {
    return `https://maps.google.com/search/?api=1&query=${encodeURIComponent(`${incident.roadway}, ${getDispatchRegion(regionKey).locationSuffix}`)}`;
  }
  return null;
}

function incidentLabel(incident: Incident) {
  return INCIDENT_LABELS[incident.eventType?.toUpperCase() || ''] || incident.eventType || 'Incident';
}

function incidentIsHighPriority(incident: Incident) {
  return ['ACCIDENT', 'COLLISION', 'VEHICLE_FIRE'].includes(incident.eventType?.toUpperCase() || '');
}

function regionCenterPoint(regionKey: DispatchRegionKey): ProximityPoint {
  const region = getDispatchRegion(regionKey);
  return {
    lat: region.center.lat,
    lng: region.center.lng,
    label: region.center.label,
  };
}

const DEFAULT_OPERATOR_PROXIMITY_POINT = {
  lat: getDispatchRegion('ottawa').center.lat,
  lng: getDispatchRegion('ottawa').center.lng,
  label: 'Ottawa default dispatch area',
} satisfies ProximityPoint;

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

function PinScreen({
  onAuthenticated,
}: {
  onAuthenticated: (session: OperatorSession) => void;
}) {
  const [operators, setOperators] = useState<OperatorRecord[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [opsLoading, setOpsLoading] = useState(true);
  const [showResetHelp, setShowResetHelp] = useState(false);

  useEffect(() => {
    fetch('/api/operators')
      .then((response) => response.json())
      .then((data: unknown) => {
        if (Array.isArray(data)) setOperators(data as OperatorRecord[]);
      })
      .catch(() => setError('Could not load operators. Check your connection.'))
      .finally(() => setOpsLoading(false));
  }, []);

  useEffect(() => {
    if (!operators.length) return;
    if (!operators.some((operator) => operator.id === selectedId)) {
      setSelectedId(operators[0].id);
    }
  }, [operators, selectedId]);

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
    <DispatchLoginShell
      activeRole="operator"
      icon={<Zap className="w-7 h-7" />}
      eyebrow="Ottawa roadside operations"
      title="Dispatch sign in"
      subtitle="Choose your name, enter your PIN, and continue into the live field workspace."
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
              <div className="font-semibold text-white">Operator reset</div>
              <p className="mt-1">Ask the admin team to reset your on-duty PIN. The current default operator PIN is <span className="font-semibold text-white">8080</span>.</p>
            </div>
          ) : null}
          <p className="text-xs leading-relaxed text-slate-500">
            While on duty, Dispatch can use your device location to help route nearby jobs and keep operations coordinated.
          </p>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2.5 block">
              Select Operator
            </label>
            <select
              value={selectedId}
              onChange={(event) => setSelectedId(event.target.value)}
              disabled={opsLoading || operators.length === 0}
              className="w-full bg-dispatch-surface border border-dispatch-border rounded-xl px-4 py-4 text-white focus:outline-none focus:border-orange-500 transition-colors disabled:text-slate-500"
            >
              {opsLoading ? <option>Loading...</option> : null}
              {!opsLoading && operators.length === 0 ? <option>No operators found</option> : null}
              {operators.map((operator) => (
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
            disabled={loading || opsLoading || operators.length === 0}
            className={cn(
              'w-full py-4 rounded-xl font-bold text-base flex items-center justify-center gap-2.5 transition-all mt-1',
              loading || opsLoading || operators.length === 0
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
    </DispatchLoginShell>
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
  isUpdating,
  onBack,
  onStatusChange,
}: {
  request: ServiceRequest;
  operatorId: string;
  isUpdating: boolean;
  onBack: () => void;
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
          Back to jobs
        </button>
        <span className={cn('text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap', STATUS_CONFIG[request.status].badge)}>
          {STATUS_CONFIG[request.status].label}
        </span>
      </div>

      <div className="flex items-start gap-3 mb-4">
        <div className="w-11 h-11 rounded-xl bg-slate-700/50 flex items-center justify-center flex-shrink-0">
          <Icon className="w-5 h-5 text-orange-400" />
        </div>
        <div>
          <h2 className="text-white font-bold text-xl">{request.customerName}</h2>
          <p className="text-slate-400 text-sm mt-1">{SERVICE_LABELS[request.serviceType]}</p>
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
          <div className="text-slate-600 text-[11px] uppercase tracking-[0.14em] font-semibold">Viewed</div>
          <div className="text-slate-300 text-sm mt-2">{request.acceptedAt ? fmt(request.acceptedAt) : 'Not viewed yet'}</div>
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
      </div>

      {request.status === 'pending' ? (
        <button type="button" onClick={() => onStatusChange(request.id, 'accepted', operatorId)} disabled={isUpdating} className="w-full py-3 rounded-xl bg-orange-500 text-white font-bold text-sm hover:bg-orange-400 active:bg-orange-600 disabled:opacity-50 transition-all">
          {isUpdating ? 'Saving...' : 'Claim job'}
        </button>
      ) : null}

      {(request.status === 'accepted' || request.status === 'en_route') && isMyJob ? (
        <div className="flex flex-wrap gap-2">
          {request.status === 'accepted' ? (
            <button type="button" onClick={() => onStatusChange(request.id, 'en_route', operatorId)} disabled={isUpdating} className="flex-1 inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-purple-600 text-white text-sm font-bold hover:bg-purple-500 disabled:opacity-50 transition-all">
              {isUpdating ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Heading there
            </button>
          ) : null}
          {request.status === 'en_route' ? (
            <button type="button" onClick={() => onStatusChange(request.id, 'completed', operatorId)} disabled={isUpdating} className="inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-green-600 text-white text-sm font-bold hover:bg-green-500 disabled:opacity-50 transition-all">
              {isUpdating ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              Mark completed
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => onStatusChange(request.id, 'cancelled', operatorId)}
            disabled={isUpdating}
            className="inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-dispatch-bg border border-dispatch-border text-slate-200 text-sm font-bold hover:bg-slate-800 disabled:opacity-50 transition-all"
          >
            {isUpdating ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
            Unable to complete
          </button>
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

class IncidentMapErrorBoundary extends Component<
  {
    children: ReactNode;
    onError?: (error: Error, info: ErrorInfo) => void;
  },
  { hasError: boolean }
> {
  constructor(props: { children: ReactNode; onError?: (error: Error, info: ErrorInfo) => void }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    this.props.onError?.(error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="bg-dispatch-surface border border-dispatch-border rounded-2xl p-4">
          <div className="text-white text-sm font-semibold">Road alert map unavailable</div>
          <p className="text-slate-500 text-xs mt-1">
            The Ottawa alerts list is still available while the map reloads.
          </p>
        </div>
      );
    }

    return this.props.children;
  }
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
          <div className="text-slate-500 text-xs mt-1">Ottawa live coverage only. Pan, zoom, and tap markers like a normal map.</div>
        </div>
        <div className="text-right">
          <div className="text-slate-500 text-[11px] uppercase tracking-[0.14em]">Coverage anchor</div>
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
                  <div className="mt-1">{incident.roadway || 'Dispatch area'}</div>
                  <div className="mt-1 text-slate-600">Ottawa coverage item</div>
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
          Ottawa coverage anchor
        </div>
      </div>
    </div>
  );
}

function IncidentCard({
  incident,
  selected,
  onNavigate,
  onSelect,
  currentOperatorId,
  isWorkflowUpdating,
  proximityLabel,
  regionKey,
}: {
  incident: IncidentWithMeta;
  selected?: boolean;
  onNavigate?: (incident: Incident) => void;
  onSelect?: (incident: IncidentWithMeta) => void;
  currentOperatorId: string;
  isWorkflowUpdating?: boolean;
  proximityLabel: string;
  regionKey: DispatchRegionKey;
}) {
  void proximityLabel;
  const mapsUrl = incidentMapsUrl(incident, regionKey);
  const label = incidentLabel(incident);
  const isHigh = incidentIsHighPriority(incident);
  const occurredAt = incidentOccurredAt(incident);
  const freshness = incidentFreshnessMeta(occurredAt);
  const confidence = incidentConfidenceMeta(incident);
  const workflowStatus = normalizeSignalWorkflowStatus(incident.workflowStatus);
  const isMine = !incident.workflowOperatorId || incident.workflowOperatorId === currentOperatorId;
  const canNavigate =
    (workflowStatus === 'new_signal' || workflowStatus === 'heading_there') &&
    isMine &&
    Boolean(onNavigate);

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
            <span className={cn('rounded-full border px-2.5 py-1 text-[11px] font-semibold whitespace-nowrap', SIGNAL_WORKFLOW_BADGES[workflowStatus])}>
              {SIGNAL_WORKFLOW_LABELS[workflowStatus]}
            </span>
            <span className="text-[11px] text-lime-300 font-semibold">{roadsideLabel(incident.roadsideType)}</span>
          </div>
        </div>
        {incident.roadway ? (
          <div className="flex items-center gap-2 text-slate-300 text-sm mb-1.5">
            <MapPin className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
            <span className="font-medium">{incident.roadway}</span>
          </div>
        ) : null}
        <div className="mb-2 flex flex-wrap gap-1.5">
          <span className="rounded-full border border-slate-700 bg-slate-800/60 px-2.5 py-1 text-[11px] font-medium text-slate-300">Ottawa</span>
          <span className={cn('rounded-full border px-2.5 py-1 text-[11px] font-medium', freshness.tone)}>{freshness.label}</span>
          <span className={cn('rounded-full border px-2.5 py-1 text-[11px] font-medium', confidence.tone)}>{confidence.label}</span>
        </div>
        <div className="text-[11px] text-cyan-300 mb-1">Source: {incidentSourceLabel(incident)}</div>
        <div className="text-[11px] text-slate-500 mb-2">Updated {fmtOptional(occurredAt)} | {timeAgo(occurredAt)}</div>
        {workflowStatus === 'heading_there' ? (
          <div className="mb-2 rounded-xl border border-blue-500/20 bg-blue-500/10 px-3 py-2 text-[11px] text-blue-200">
            {isMine ? 'You are marked as heading there for this signal.' : 'Another operator is already heading there for this signal.'}
          </div>
        ) : null}
        {isResolvedSignalWorkflowStatus(workflowStatus) ? (
          <div className="mb-2 rounded-xl border border-slate-700 bg-slate-800/60 px-3 py-2 text-[11px] text-slate-300">
            Outcome recorded: {SIGNAL_WORKFLOW_LABELS[workflowStatus]}.
          </div>
        ) : null}
        {incident.description ? <p className="text-slate-500 text-xs leading-relaxed line-clamp-2 mb-3">{incident.description}</p> : null}
        <div className="flex gap-2">
          {onSelect ? <button type="button" onClick={() => onSelect(incident)} className={cn('flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all', selected ? 'bg-slate-700 text-white' : 'bg-dispatch-bg text-slate-300 hover:text-white hover:bg-slate-800')}>{selected ? 'Viewing details' : 'Open details'}</button> : null}
          {canNavigate ? (
            <button
              type="button"
              onClick={() => onNavigate?.(incident)}
              disabled={isWorkflowUpdating}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-500 disabled:opacity-60 transition-all"
            >
              {isWorkflowUpdating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Navigation2 className="w-4 h-4" />}
              {mapsUrl ? (workflowStatus === 'heading_there' ? 'Resume navigation' : 'Navigate') : 'Mark heading there'}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function IncidentDetailCard({
  incident,
  onBack,
  onNavigate,
  onResolve,
  currentOperatorId,
  isWorkflowUpdating,
  proximityLabel,
  regionKey,
}: {
  incident: IncidentWithMeta;
  onBack: () => void;
  onNavigate?: (incident: Incident) => void;
  onResolve?: (incident: Incident, status: SignalWorkflowStatus) => void;
  currentOperatorId: string;
  isWorkflowUpdating?: boolean;
  proximityLabel: string;
  regionKey: DispatchRegionKey;
}) {
  void proximityLabel;
  const mapsUrl = incidentMapsUrl(incident, regionKey);
  const severity = incident.severity ? String(incident.severity).replace(/_/g, ' ') : 'Not specified';
  const occurredAt = incidentOccurredAt(incident);
  const freshness = incidentFreshnessMeta(occurredAt);
  const confidence = incidentConfidenceMeta(incident);
  const workflowStatus = normalizeSignalWorkflowStatus(incident.workflowStatus);
  const isMine = !incident.workflowOperatorId || incident.workflowOperatorId === currentOperatorId;
  const canNavigate = (workflowStatus === 'new_signal' || workflowStatus === 'heading_there') && isMine;
  const canResolve = workflowStatus === 'heading_there' && isMine;

  return (
    <div className="bg-dispatch-surface border border-orange-500/30 rounded-2xl p-5">
      <div className="flex items-center justify-between gap-3 mb-4">
        <button type="button" onClick={onBack} className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Back to roadside alerts
        </button>
        <div className={cn('text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap border', SIGNAL_WORKFLOW_BADGES[workflowStatus])}>{SIGNAL_WORKFLOW_LABELS[workflowStatus]}</div>
      </div>
      <div className="grid md:grid-cols-2 gap-3 mb-3">
        <div className="bg-dispatch-bg border border-dispatch-border rounded-xl p-3"><div className="text-slate-600 text-[11px] uppercase tracking-[0.14em] font-semibold">Roadway</div><div className="text-white text-sm font-semibold mt-2">{incident.roadway || 'Dispatch area'}</div></div>
        <div className="bg-dispatch-bg border border-dispatch-border rounded-xl p-3"><div className="text-slate-600 text-[11px] uppercase tracking-[0.14em] font-semibold">Severity</div><div className="text-slate-300 text-sm mt-2">{severity}</div></div>
        <div className="bg-dispatch-bg border border-dispatch-border rounded-xl p-3"><div className="text-slate-600 text-[11px] uppercase tracking-[0.14em] font-semibold">Source</div><div className="text-cyan-300 text-sm mt-2">{incidentSourceLabel(incident)}</div><div className="text-slate-500 text-[11px] mt-1">{incidentSourceTrustLabel(incident)}</div></div>
        <div className="bg-dispatch-bg border border-dispatch-border rounded-xl p-3"><div className="text-slate-600 text-[11px] uppercase tracking-[0.14em] font-semibold">Last updated</div><div className="text-slate-300 text-sm mt-2">{fmt(occurredAt)}</div><div className="text-slate-500 text-[11px] mt-1">{timeAgo(occurredAt)}</div></div>
        <div className="bg-dispatch-bg border border-dispatch-border rounded-xl p-3"><div className="text-slate-600 text-[11px] uppercase tracking-[0.14em] font-semibold">City</div><div className="text-slate-300 text-sm mt-2">{incident.city}</div></div>
        <div className="bg-dispatch-bg border border-dispatch-border rounded-xl p-3"><div className="text-slate-600 text-[11px] uppercase tracking-[0.14em] font-semibold">Confidence</div><div className={cn('inline-flex rounded-full border px-2.5 py-1 text-[11px] font-medium mt-2', confidence.tone)}>{confidence.label}</div><div className={cn('inline-flex rounded-full border px-2.5 py-1 text-[11px] font-medium mt-2 ml-2', freshness.tone)}>{freshness.label}</div></div>
        <div className="bg-dispatch-bg border border-dispatch-border rounded-xl p-3"><div className="text-slate-600 text-[11px] uppercase tracking-[0.14em] font-semibold">Likely assist</div><div className="text-lime-300 text-sm mt-2">{roadsideLabel(incident.roadsideType)}</div></div>
      </div>
      <div className="bg-dispatch-bg border border-dispatch-border rounded-xl p-3 mb-3"><div className="text-slate-600 text-[11px] uppercase tracking-[0.14em] font-semibold">Incident detail</div><div className="text-slate-300 text-sm mt-2 leading-relaxed">{incident.description || 'No additional incident description was provided by the source feed.'}</div></div>
      <div className="bg-dispatch-bg border border-dispatch-border rounded-xl p-3 mb-3">
        <div className="text-slate-600 text-[11px] uppercase tracking-[0.14em] font-semibold">Workflow</div>
        <div className="text-slate-200 text-sm mt-2">{SIGNAL_WORKFLOW_LABELS[workflowStatus]}</div>
        <div className="text-slate-500 text-xs mt-1">
          {workflowStatus === 'new_signal' ? 'No operator has committed to this signal yet.' : workflowStatus === 'heading_there' ? (isMine ? 'You are currently heading there.' : 'Another operator is currently heading there.') : `Outcome recorded for this signal.`}
        </div>
        {canNavigate ? <div className="text-blue-200 text-xs mt-2">Navigate is the practical commit action. It marks this signal as heading there in the backend.</div> : null}
      </div>
      <div className="flex flex-wrap gap-2">
        {canNavigate ? (
          <button type="button" onClick={() => onNavigate?.(incident)} disabled={isWorkflowUpdating} className="inline-flex items-center gap-2 py-2.5 px-4 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-500 disabled:opacity-60 transition-all">
            {isWorkflowUpdating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Navigation2 className="w-4 h-4" />}
            {mapsUrl ? (workflowStatus === 'heading_there' ? 'Resume navigation' : 'Navigate and head there') : 'Mark heading there'}
          </button>
        ) : null}
        {canResolve ? (
          <button type="button" onClick={() => onResolve?.(incident, 'handled')} disabled={isWorkflowUpdating} className="inline-flex items-center gap-2 py-2.5 px-4 rounded-xl bg-green-600 text-white text-sm font-bold hover:bg-green-500 disabled:opacity-60 transition-all">
            {isWorkflowUpdating ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            Mark handled
          </button>
        ) : null}
        {canResolve ? (
          <button type="button" onClick={() => onResolve?.(incident, 'not_legit_or_not_serviceable')} disabled={isWorkflowUpdating} className="inline-flex items-center gap-2 py-2.5 px-4 rounded-xl bg-dispatch-bg border border-dispatch-border text-slate-200 text-sm font-bold hover:bg-slate-800 disabled:opacity-60 transition-all">
            {isWorkflowUpdating ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
            Not legit / not serviceable
          </button>
        ) : null}
      </div>
    </div>
  );
}

interface MetricsData {
  ok: boolean;
  operatorId: string;
  operatorName: string;
  today: PeriodStats;
  week: PeriodStats;
  month: PeriodStats;
  allTime: PeriodStats;
}

interface PeriodStats {
  pursued: number;
  handled: number;
  notLegit: number;
  successRate: number;
}

function MetricsPanel({ session }: { session: OperatorSession }) {
  const { data, isLoading, isError } = useQuery<MetricsData>({
    queryKey: ['metrics', session.id],
    queryFn: async () => {
      const r = await operatorFetch('/api/metrics');
      if (!r.ok) throw new Error('Failed to load metrics');
      return r.json();
    },
    refetchInterval: 60_000,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16 text-slate-500 text-sm gap-2">
        <Loader2 className="w-4 h-4 animate-spin" />Loading stats...
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <p className="text-slate-400 font-semibold">Stats unavailable</p>
      </div>
    );
  }

  function StatRow({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
    return (
      <div className="flex items-center justify-between py-2.5 border-b border-dispatch-border last:border-0">
        <span className="text-slate-400 text-sm">{label}</span>
        <div className="text-right">
          <span className="text-white font-semibold text-sm">{value}</span>
          {sub ? <span className="text-slate-500 text-xs ml-1">{sub}</span> : null}
        </div>
      </div>
    );
  }

  function PeriodCard({ title, stats }: { title: string; stats: PeriodStats }) {
    return (
      <div className="bg-dispatch-surface border border-dispatch-border rounded-2xl p-4">
        <p className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-2">{title}</p>
        <StatRow label="Pursued" value={stats.pursued} />
        <StatRow label="Handled" value={stats.handled} />
        <StatRow label="Not legit" value={stats.notLegit} />
        <StatRow label="Success rate" value={`${stats.successRate}%`} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="bg-dispatch-surface border border-dispatch-border rounded-2xl px-4 py-3 flex items-center gap-3">
        <div className="w-10 h-10 bg-orange-500/10 rounded-xl flex items-center justify-center">
          <BarChart2 className="w-5 h-5 text-orange-400" />
        </div>
        <div>
          <p className="text-white font-semibold text-sm">{data.operatorName}</p>
          <p className="text-slate-500 text-xs">Signal outcomes</p>
        </div>
      </div>
      <PeriodCard title="Today" stats={data.today} />
      <PeriodCard title="This week" stats={data.week} />
      <PeriodCard title="This month" stats={data.month} />
      <PeriodCard title="All time" stats={data.allTime} />
    </div>
  );
}

function OperatorView({ session, onSignOut }: { session: OperatorSession; onSignOut: () => void }) {
  const [filter, setFilter] = useState<OperatorFilter>('active');
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>(null);
  const [regionKey, setRegionKey] = useState<DispatchRegionKey>(DEFAULT_DISPATCH_REGION);
  const isCompactViewport = useCompactViewport();
  const { isSubscribed, isSupported, subscribe } = usePush({ operatorId: session.id });
  const [incidentMode, setIncidentMode] = useState<'active' | 'history' | 'all'>('active');
  const [incidentCategory, setIncidentCategory] = useState<'all' | 'emergency' | 'breakdown' | 'traffic' | 'transit'>('all');
  const [incidentSource, setIncidentSource] = useState<IncidentSourceFilter | null>(null);
  const [incidentSort, setIncidentSort] = useState<'roadside' | 'newest' | 'proximity'>('proximity');
  const [proximityPoint, setProximityPoint] = useState<ProximityPoint>(DEFAULT_OPERATOR_PROXIMITY_POINT);
  const [isUsingSharedLocation, setIsUsingSharedLocation] = useState(false);
  const [locatingProximity, setLocatingProximity] = useState(false);
  const [proximityError, setProximityError] = useState('');
  const [incidentSearch, setIncidentSearch] = useState('');
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [, setNowTick] = useState(0);
  const viewedIncidentIdsRef = useRef<Set<string>>(new Set());
  const lastOperatorLocationSentRef = useRef<{ lat: number; lng: number; sentAt: number } | null>(null);
  const queryClient = useQueryClient();
  const requestQueryKey = useMemo(() => ['requests', 'live'], []);
  const requestsUrl = '/api/requests';
  const activeRegion = useMemo(() => getDispatchRegion(regionKey), [regionKey]);

  const useMyLocationForProximity = useCallback(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setIsUsingSharedLocation(false);
      setProximityError('Location is not supported on this device. Using Ottawa as the dispatch priority anchor.');
      setProximityPoint(DEFAULT_OPERATOR_PROXIMITY_POINT);
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
        setIsUsingSharedLocation(true);
      })
      .catch(() => {
        setIsUsingSharedLocation(false);
        setProximityPoint(DEFAULT_OPERATOR_PROXIMITY_POINT);
        setProximityError('Could not read GPS location. Using Ottawa as the dispatch priority anchor.');
      })
      .finally(() => {
        setLocatingProximity(false);
      });
  }, []);

  useEffect(() => {
    setSelectedIncidentId(null);
    setIncidentSource(null);
  }, [regionKey]);

  function addToast(message: string, type: Toast['type']) {
    const id = Date.now() + Math.round(Math.random() * 1000);
    setToasts((current) => [...current, { id, message, type }]);
    setTimeout(() => setToasts((current) => current.filter((toast) => toast.id !== id)), 5000);
  }

  const { connected: liveFeedConnected } = useEvents({
    onRequestNew: (data) => {
      const request = data as ServiceRequest;
      queryClient.setQueryData<ServiceRequest[]>(requestQueryKey, (current) => current ? [request, ...current.filter((item) => item.id !== request.id)] : [request]);
      playJobAlert();
      addToast(`New job: ${SERVICE_LABELS[request.serviceType]} - ${request.customerName}`, 'job');
    },
    onRequestUpdated: (data) => {
      const request = data as ServiceRequest;
      queryClient.setQueryData<ServiceRequest[]>(requestQueryKey, (current) => {
        const currentList = current ?? [];
        return currentList.some((item) => item.id === request.id) ? currentList.map((item) => item.id === request.id ? request : item) : [request, ...currentList];
      });
    },
    onIncidentNew: (data) => {
      const incident = data as Incident;
      if (!isRegionScopedIncident(regionKey, incident)) return;
      queryClient.invalidateQueries({ queryKey: ['incidents', regionKey] });
      const likely = classifyRoadside(incident);
      if (incidentIsHighPriority(incident) || likely.roadsideScore >= 65) {
        playIncidentAlert();
        addToast(`${roadsideLabel(likely.roadsideType)} - ${incident.roadway || activeRegion.shortLabel}`, 'incident');
      }
    },
    onIncidentUpdated: (data) => {
      void data;
      queryClient.invalidateQueries({ queryKey: ['incidents', regionKey] });
      queryClient.invalidateQueries({ queryKey: ['incident-source-summary', regionKey] });
      queryClient.invalidateQueries({ queryKey: ['metrics', session.id] });
    },
  });

  const requestFallbackMs = liveFeedConnected ? 30_000 : 12_000;
  const incidentFallbackMs = liveFeedConnected ? 25_000 : 10_000;
  const { data: status } = useQuery<DispatchStatusResponse>({ queryKey: ['dispatch-status', regionKey], queryFn: async () => { const response = await fetch(`/api/status?region=${regionKey}`); if (!response.ok) throw new Error('Failed to load dispatch status'); return response.json() as Promise<DispatchStatusResponse>; }, refetchInterval: 30_000, staleTime: 15_000, refetchOnWindowFocus: true, refetchOnReconnect: true });
  const { data: sourceSummary } = useQuery<IncidentSourceSummaryResponse>({
    queryKey: ['incident-source-summary', regionKey],
    queryFn: async () => {
      const response = await operatorFetch(`/api/incidents/source-summary?region=${regionKey}`);
      if (!response.ok) throw new Error('Failed to load source summary');
      return response.json() as Promise<IncidentSourceSummaryResponse>;
    },
    refetchInterval: 60_000,
    staleTime: 30_000,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });
  const incidentsUrl = useMemo(() => {
    const params = new URLSearchParams({ mode: incidentMode, limit: '80', region: regionKey, scope: 'actionable' });
    const q = incidentSearch.trim();
    if (q) params.set('q', q);
    if (incidentSource) params.set('source', incidentSource);
    if (sourceSummary?.date) params.set('date', sourceSummary.date);
    return `/api/incidents?${params.toString()}`;
  }, [incidentMode, incidentSearch, incidentSource, regionKey, sourceSummary?.date]);
  const { data: allRequests = [], isLoading } = useQuery<ServiceRequest[]>({ queryKey: requestQueryKey, queryFn: async () => { const response = await operatorFetch(requestsUrl); if (!response.ok) throw new Error('Failed to load requests'); return response.json() as Promise<ServiceRequest[]>; }, refetchInterval: requestFallbackMs, refetchIntervalInBackground: true, staleTime: 12_000, refetchOnWindowFocus: true, refetchOnReconnect: true });
  const {
    data: incidentFeed = [],
    isLoading: incidentsLoading,
    isError: incidentsError,
    error: incidentsErrorValue,
    refetch: refetchIncidents,
  } = useQuery<Incident[]>({
    queryKey: ['incidents', regionKey, incidentMode, incidentSearch, incidentSource],
    queryFn: async () => {
      const response = await fetch(incidentsUrl);
      if (!response.ok) throw new Error('Failed to load incidents');
      const payload = (await response.json()) as unknown;
      if (!Array.isArray(payload)) {
        logRoadAlertsDebug('malformed_incident_payload', { payloadType: typeof payload });
        return [];
      }
      return payload as Incident[];
    },
    refetchInterval: incidentFallbackMs,
    refetchIntervalInBackground: true,
    staleTime: 10_000,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setNowTick((tick) => tick + 1);
    }, 30_000);
    return () => window.clearInterval(intervalId);
  }, []);

  useEffect(() => {
    if (!liveFeedConnected) return;
    queryClient.invalidateQueries({ queryKey: requestQueryKey });
    queryClient.invalidateQueries({ queryKey: ['incidents', regionKey] });
    queryClient.invalidateQueries({ queryKey: ['incident-source-summary', regionKey] });
  }, [liveFeedConnected, queryClient, regionKey, requestQueryKey]);

  const { mutate: updateStatus, isPending: isUpdating } = useMutation({
    mutationFn: async ({ id, status, operatorId }: { id: string; status: RequestStatus; operatorId: string }) => {
      const response = await operatorFetch(`/api/requests/${id}/status`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status, operatorId }) });
      if (!response.ok) throw new Error('Failed to update request status');
      return response.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: requestQueryKey }),
  });

  const { mutateAsync: updateIncidentWorkflow, isPending: isWorkflowUpdating } = useMutation({
    mutationFn: async ({
      id,
      status,
    }: {
      id: string;
      status: SignalWorkflowStatus;
    }) => {
      const response = await operatorFetch(`/api/incidents/${id}/workflow`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, operatorId: session.id }),
      });
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error || 'Failed to update signal workflow');
      }
      return payload;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incidents', regionKey] });
      queryClient.invalidateQueries({ queryKey: ['incident-source-summary', regionKey] });
      queryClient.invalidateQueries({ queryKey: ['metrics', session.id] });
      queryClient.invalidateQueries({ queryKey: ['admin-incidents', regionKey] });
      queryClient.invalidateQueries({ queryKey: ['admin-incident-summary', regionKey] });
    },
  });

  const handleIncidentNavigate = useCallback(async (incident: Incident) => {
    const roadway = incident.roadway || activeRegion.shortLabel;
    try {
      await updateIncidentWorkflow({ id: incident.id, status: 'heading_there' });
      addToast(`Heading there: ${roadway}`, 'job');
      const mapsUrl = incidentMapsUrl(incident, regionKey);
      if (mapsUrl && typeof window !== 'undefined') {
        window.open(mapsUrl, '_blank', 'noopener,noreferrer');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update signal';
      addToast(message, 'incident');
    }
  }, [activeRegion.shortLabel, regionKey, updateIncidentWorkflow]);

  const handleIncidentResolution = useCallback(async (
    incident: Incident,
    status: SignalWorkflowStatus,
  ) => {
    try {
      await updateIncidentWorkflow({ id: incident.id, status });
      addToast(
        status === 'handled'
          ? `Signal handled: ${incident.roadway || activeRegion.shortLabel}`
          : `Marked not legit / not serviceable`,
        'job',
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to save outcome';
      addToast(message, 'incident');
    }
  }, [activeRegion.shortLabel, updateIncidentWorkflow]);

  const myRequests = allRequests.filter((request) => (request.operatorId === null && request.status === 'pending') || request.operatorId === session.id);
  const displayRequests = filter === 'active' ? myRequests.filter((request) => ['pending', 'accepted', 'en_route'].includes(request.status)) : filter === 'all' ? myRequests : [];
  const pendingCount = myRequests.filter((request) => request.status === 'pending').length;
  const activeCount = myRequests.filter((request) => ['accepted', 'en_route'].includes(request.status)).length;
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
  const regionScopedIncidentFeed = useMemo(
    () => categoryFilteredIncidentFeed.filter((incident) => isRegionScopedIncident(regionKey, incident)),
    [categoryFilteredIncidentFeed, regionKey],
  );
  const incidentFeedWithMeta = useMemo<IncidentWithMeta[]>(
    () =>
      regionScopedIncidentFeed.map((incident) => {
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
    [regionScopedIncidentFeed, proximityPoint.lat, proximityPoint.lng],
  );
  const highSignalIncidentCount = useMemo(
    () => incidentFeedWithMeta.filter((incident) => isQualifiedOperatorSignal(incident)).length,
    [incidentFeedWithMeta],
  );
  const radiusFilteredIncidentFeed = incidentFeedWithMeta;
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
  const sourceCount = sourceSummary?.sourceCount ?? status?.incidentMonitor?.sourceCount ?? 5;
  const sourceMonitorItems = useMemo(
    () =>
      (sourceSummary?.items ?? []).map((item) => {
        const liveSource = status?.incidentMonitor?.sources?.find((source) => source.key === item.key);
        return {
          ...item,
          pollState: liveSource?.pollState ?? item.pollState,
          lastError: liveSource?.lastError ?? item.lastError ?? null,
          tierLabel: liveSource?.tierLabel ?? item.tierLabel,
          statusLabel: liveSource?.statusLabel ?? item.statusLabel,
        };
      }),
    [sourceSummary?.items, status?.incidentMonitor?.sources],
  );
  const sourceSummaryDayLabel = sourceSummary?.dayLabel ?? 'today';
  const selectedIncidentSourceLabel =
    sourceMonitorItems.find((item) => item.key === incidentSource)?.label ?? null;
  const pollSeconds = Math.max(1, Math.round((status?.incidentMonitor?.pollIntervalMs ?? 60_000) / 1000));
  const lastPoll = formatPoll(status?.incidentMonitor?.lastSuccessAt);
  const monitorLastSuccessMs = parseTimestamp(status?.incidentMonitor?.lastSuccessAt);
  const monitorNeedsCaution =
    monitorLastSuccessMs === null ||
    Date.now() - monitorLastSuccessMs > Math.max(180_000, pollSeconds * 1000 * 4);
  const hasWeakRegionalSignals = incidentFeedWithMeta.length > 0 && highSignalIncidentCount === 0;
  const roadAlertsState =
    incidentsLoading ? 'loading' : incidentsError ? 'error' : sortedIncidentFeed.length > 0 ? 'success' : 'empty';

  useEffect(() => {
    logRoadAlertsDebug('tab_state_changed', {
      filter,
      compact: isCompactViewport,
    });
  }, [filter, isCompactViewport]);

  useEffect(() => {
    logRoadAlertsDebug('render_state', {
      state: roadAlertsState,
      incidentMode,
      incidentCategory,
      count: sortedIncidentFeed.length,
      feedCount: incidentFeed.length,
      highSignalCount: highSignalIncidentCount,
      selectedIncidentId,
      hasWeakRegionalSignals,
      incidentsError: incidentsError ? String(incidentsErrorValue) : null,
    });
  }, [
    hasWeakRegionalSignals,
    incidentCategory,
    incidentFeed.length,
    incidentMode,
    incidentsError,
    incidentsErrorValue,
    highSignalIncidentCount,
    roadAlertsState,
    selectedIncidentId,
    sortedIncidentFeed.length,
  ]);

  useEffect(() => {
    if (filter !== 'incidents' || !selectedIncidentId) return;
    if (viewedIncidentIdsRef.current.has(selectedIncidentId)) return;

    const selected = sortedIncidentFeed.find((incident) => incident.id === selectedIncidentId);
    if (!selected) return;

    viewedIncidentIdsRef.current.add(selectedIncidentId);
    operatorFetch(`/api/incidents/${selectedIncidentId}/view`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ operatorId: session.id }),
    })
      .then((response) => {
        if (!response.ok) {
          viewedIncidentIdsRef.current.delete(selectedIncidentId);
        }
      })
      .catch(() => {
        viewedIncidentIdsRef.current.delete(selectedIncidentId);
      });
  }, [filter, selectedIncidentId, session.id, sortedIncidentFeed]);

  useEffect(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) return;

    const shouldSendLocation = (lat: number, lng: number) => {
      const previous = lastOperatorLocationSentRef.current;
      if (!previous) return true;

      const secondsSinceLastSend = (Date.now() - previous.sentAt) / 1000;
      const distanceSinceLastSend = haversineKm(previous.lat, previous.lng, lat, lng);
      return secondsSinceLastSend >= 45 || distanceSinceLastSend >= 0.25;
    };

    const postLocation = async (position: GeolocationPosition) => {
      const lat = position.coords.latitude;
      const lng = position.coords.longitude;
      if (!shouldSendLocation(lat, lng)) return;

      setProximityPoint({
        lat,
        lng,
        label: 'Operator location',
      });
      setIsUsingSharedLocation(true);
      setProximityError('');
      lastOperatorLocationSentRef.current = { lat, lng, sentAt: Date.now() };
      await operatorFetch(`/api/operators/${session.id}/location`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lat,
          lng,
          accuracyMeters: Math.round(position.coords.accuracy),
        }),
      }).catch(() => {
        // Location sharing should stay best-effort and never break the operator view.
      });
    };

    navigator.geolocation.getCurrentPosition(postLocation, () => {
      setIsUsingSharedLocation(false);
      setProximityPoint(DEFAULT_OPERATOR_PROXIMITY_POINT);
      setProximityError('Location sharing is off. Prioritizing alerts by Ottawa by default.');
    }, {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 60000,
    });

    const watchId = navigator.geolocation.watchPosition(postLocation, () => {
      setIsUsingSharedLocation(false);
      setProximityPoint(DEFAULT_OPERATOR_PROXIMITY_POINT);
      setProximityError('Location sharing is off. Prioritizing alerts by Ottawa by default.');
    }, {
      enableHighAccuracy: true,
      timeout: 20000,
      maximumAge: 60000,
    });

    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, [session.id]);

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
                {pendingCount > 0 ? <span className="bg-orange-500 text-white text-xs font-bold px-2 py-0.5 rounded-full animate-pulse leading-none">{pendingCount} new</span> : null}
              </div>
              <div className="text-slate-500 text-xs mt-0.5">{session.name}</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={onSignOut} className="flex items-center gap-1.5 text-slate-500 text-xs hover:text-slate-300 transition-colors py-2 px-3 rounded-xl hover:bg-dispatch-surface"><LogOut className="w-3.5 h-3.5" />Sign out</button>
          </div>
        </div>

        <DispatchAccessPanel
          activeRole="operator"
          profileLabel={session.name}
          profileMeta="Live field operator"
          showRoleSwitch={false}
          className="mt-3"
        />

        <div className="mt-3 flex flex-wrap items-center gap-2">
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
        </div>

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
            {sourceCount} {activeRegion.shortLabel} sources - about every {pollSeconds}s
          </div>
          <div className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 border border-dispatch-border bg-dispatch-surface text-slate-400 text-xs font-semibold">
            <Clock className="w-3.5 h-3.5" />
            Last incident poll {lastPoll}
          </div>
          {activeCount > 0 ? <div className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold">{activeCount} active</div> : null}
        </div>

        <SourceMonitorSummary
          className="mt-3"
          compact
          sourceCount={sourceCount}
          items={sourceMonitorItems}
          dayLabel={sourceSummaryDayLabel}
          selectedKey={incidentSource}
          onSelect={(key) => {
            setIncidentSource((key as IncidentSourceFilter | null) ?? null);
            setFilter('incidents');
            setSelectedIncidentId(null);
          }}
        />

      </div>

      <div className="px-5 py-3 flex gap-2 border-b border-dispatch-border overflow-x-auto">
        {[{ key: 'active' as const, label: 'Active jobs', badge: pendingCount, danger: false }, { key: 'all' as const, label: 'Job history', badge: 0, danger: false }, { key: 'incidents' as const, label: 'Roadside alerts', badge: 0, danger: true }, { key: 'stats' as const, label: 'My stats', badge: 0, danger: false }].map(({ key, label, badge, danger }) => (
          <button key={key} type="button" onClick={() => setFilter(key)} className={cn('px-4 py-2 rounded-xl text-sm font-semibold transition-all whitespace-nowrap flex items-center gap-2', filter === key ? danger ? 'bg-red-600 text-white' : 'bg-orange-500 text-white' : 'bg-dispatch-surface text-slate-400 hover:text-white')}>
            {key === 'incidents' ? <TriangleAlert className="w-3.5 h-3.5" /> : null}
            {key === 'stats' ? <BarChart2 className="w-3.5 h-3.5" /> : null}
            {label}
            {badge > 0 && filter !== key ? <span className="bg-orange-500 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center leading-none">{badge}</span> : null}
          </button>
        ))}
      </div>

      <div className="flex-1 px-5 py-4 flex flex-col gap-3 overflow-y-auto pb-8">
        {filter === 'stats' ? (
          <MetricsPanel session={session} />
        ) : filter === 'incidents' ? (
          <>
            <div className="px-1">
              <div className="text-white text-lg font-semibold">Roadside alerts</div>
              <div className="text-slate-500 text-sm mt-1">
                {selectedIncidentSourceLabel
                  ? `${selectedIncidentSourceLabel} roadside signals and incidents for ${sourceSummaryDayLabel}.`
                  : 'Live roadside signals and incidents that may turn into dispatch jobs.'}
              </div>
            </div>
            <div className="bg-dispatch-surface border border-dispatch-border rounded-2xl p-3">
              <div className="flex flex-wrap items-center gap-2">
                {[
                  { key: 'active' as const, label: 'Active now' },
                  { key: 'history' as const, label: 'Past alerts' },
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
              <div className="mt-2 grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_220px] gap-2">
                <label className="flex items-center gap-2 rounded-xl border border-dispatch-border bg-dispatch-bg px-3 py-2.5">
                  <Search className="w-4 h-4 text-slate-500" />
                  <input
                    value={incidentSearch}
                    onChange={(event) => setIncidentSearch(event.target.value)}
                    placeholder={`Search ${activeRegion.shortLabel} road, route, or incident text`}
                    className="w-full bg-transparent text-sm text-slate-200 placeholder-slate-600 focus:outline-none"
                  />
                </label>
                <label className="flex items-center gap-2 rounded-xl border border-dispatch-border bg-dispatch-bg px-3 py-2.5 min-h-11">
                  <Navigation2 className="w-4 h-4 text-slate-500" />
                  <select
                    value={incidentSort}
                    onChange={(event) => setIncidentSort(event.target.value as 'roadside' | 'newest' | 'proximity')}
                    className="w-full bg-transparent text-sm text-slate-200 focus:outline-none"
                  >
                    <option value="proximity" className="bg-slate-950 text-slate-100">Sort: closest to operator</option>
                    <option value="newest" className="bg-slate-950 text-slate-100">Sort: newest first</option>
                    <option value="roadside" className="bg-slate-950 text-slate-100">Sort: strongest assist signal</option>
                  </select>
                </label>
              </div>
              <div className="mt-2 rounded-xl border border-cyan-500/20 bg-cyan-500/5 px-3 py-2.5 text-[11px] text-cyan-200">
                {activeRegion.label}-only live scope. Out-of-area roadside signals are hidden from this workflow.
              </div>
              <div className="mt-2 rounded-xl border border-dispatch-border bg-dispatch-bg px-3 py-2.5 text-[11px] text-slate-300">
                {isUsingSharedLocation
                  ? `Prioritizing alerts closest to ${proximityPoint.label}.`
                  : 'Location sharing is off, so Dispatch is prioritizing alerts closest to Ottawa by default.'}
              </div>
              {selectedIncidentSourceLabel ? (
                <div className="mt-2 flex items-center justify-between gap-3 rounded-xl border border-orange-500/20 bg-orange-500/10 px-3 py-2.5 text-[11px] text-orange-200">
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
              {incidentFeedWithMeta.length > 0 ? (
                <div className="mt-2 rounded-xl border border-slate-700 bg-dispatch-bg px-3 py-2.5 text-[11px] text-slate-300">
                  {selectedIncidentSourceLabel
                    ? `Showing persisted ${activeRegion.label} signals from ${selectedIncidentSourceLabel}.`
                    : `Showing live ${activeRegion.label} roadside signals that can become jobs. Stronger job-worthy alerts are ranked and labeled, not hidden.`}
                </div>
              ) : null}
              {monitorNeedsCaution ? (
                <div className="mt-2 rounded-xl border border-amber-500/20 bg-amber-500/10 px-3 py-2.5 text-[11px] text-amber-200">
                  Limited feed confidence at the moment. Last successful poll {lastPoll}.
                </div>
              ) : null}
            </div>
            {roadAlertsState === 'success' && !isCompactViewport ? (
              <IncidentMapErrorBoundary
                onError={(error, info) => {
                  logRoadAlertsDebug('map_render_failed', {
                    message: error.message,
                    componentStack: info.componentStack,
                  });
                }}
              >
                <IncidentMapPanel
                  incidents={sortedIncidentFeed}
                  selectedIncidentId={selectedIncidentId}
                  onSelect={(incident) => setSelectedIncidentId(incident.id)}
                  proximityPoint={proximityPoint}
                />
              </IncidentMapErrorBoundary>
            ) : null}
            {roadAlertsState === 'loading' ? (
              <div className="flex items-center justify-center py-16 text-slate-500 text-sm gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Loading {activeRegion.label} roadside alerts...
              </div>
            ) : null}
            {roadAlertsState === 'error' ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-16 h-16 bg-amber-500/10 border border-amber-500/20 rounded-full flex items-center justify-center mb-4">
                  <TriangleAlert className="w-8 h-8 text-amber-400" />
                </div>
                <p className="text-slate-200 font-semibold">Roadside alerts are temporarily unavailable</p>
                <p className="text-slate-500 text-sm mt-1 max-w-sm">
                  Still monitoring {activeRegion.label} incident sources. Try again to reload the latest roadside alerts.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    void refetchIncidents();
                  }}
                  className="mt-4 inline-flex items-center gap-2 rounded-xl bg-dispatch-surface border border-dispatch-border px-4 py-2.5 text-sm font-semibold text-slate-200 hover:text-white"
                >
                  <RefreshCw className="w-4 h-4" />
                  Retry roadside alerts
                </button>
              </div>
            ) : null}
            {roadAlertsState === 'empty' ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-16 h-16 bg-green-500/10 border border-green-500/20 rounded-full flex items-center justify-center mb-4">
                  <CheckCircle2 className="w-8 h-8 text-green-500" />
                </div>
                <p className="text-slate-300 font-semibold">
                  {selectedIncidentSourceLabel
                    ? `No ${selectedIncidentSourceLabel} alerts right now for this view`
                    : incidentCategory !== 'all' || incidentMode === 'history'
                    ? 'No roadside alerts right now for this filter'
                    : 'No roadside alerts right now'}
                </p>
                <p className="text-slate-600 text-sm mt-1 max-w-sm">
                  {hasWeakRegionalSignals
                    ? `Still monitoring ${activeRegion.label} incident sources. Limited feed confidence at the moment. Last successful poll ${lastPoll}.`
                    : incidentCategory !== 'all'
                      ? `Roadside alerts will appear here when a relevant ${activeRegion.label} ${incidentCategory} signal is available.`
                      : incidentMode === 'history'
                        ? `Roadside alerts will appear here when a relevant ${activeRegion.label} signal is available in the selected past alerts view.`
                        : monitorNeedsCaution
                          ? `Still monitoring ${activeRegion.label} incident sources. Limited feed confidence at the moment. Last successful poll ${lastPoll}.`
                          : `Roadside alerts will appear here when a live ${activeRegion.label} incident or roadside signal is available.`}
                </p>
              </div>
            ) : null}
            {roadAlertsState === 'success'
              ? sortedIncidentFeed.map((incident) => (
                  <Fragment key={incident.id}>
                    <IncidentCard incident={incident} proximityLabel={proximityPoint.label} regionKey={regionKey} selected={selectedIncident?.id === incident.id} onSelect={(value) => setSelectedIncidentId(value.id)} onNavigate={handleIncidentNavigate} currentOperatorId={session.id} isWorkflowUpdating={isWorkflowUpdating} />
                    {selectedIncident?.id === incident.id ? (
                      <IncidentDetailCard incident={incident} proximityLabel={proximityPoint.label} regionKey={regionKey} onBack={() => setSelectedIncidentId(null)} onNavigate={handleIncidentNavigate} onResolve={handleIncidentResolution} currentOperatorId={session.id} isWorkflowUpdating={isWorkflowUpdating} />
                    ) : null}
                  </Fragment>
                ))
              : null}
          </>
        ) : (
          <>
            <div className="px-1">
              <div className="text-white text-lg font-semibold">{filter === 'active' ? 'Active jobs' : 'Job history'}</div>
              <div className="text-slate-500 text-sm mt-1">{filter === 'active' ? 'Live job requests that still need action in the field.' : 'Your job record timeline, including created, claimed, completed, and cancelled jobs.'}</div>
            </div>
            {selectedRequest ? <RequestDetailCard request={selectedRequest} operatorId={session.id} isUpdating={isUpdating} onBack={() => setSelectedRequestId(null)} onStatusChange={(id, statusValue, operatorId) => updateStatus({ id, status: statusValue, operatorId })} /> : null}
            {filter === 'all' ? (
              <div className="rounded-xl border border-dispatch-border bg-dispatch-surface px-3 py-2.5 text-[11px] text-slate-300">
                Job history shows your created, claimed, completed, and cancelled job records.
              </div>
            ) : null}
            {isLoading ? <div className="flex items-center justify-center py-16 text-slate-500 text-sm gap-2"><Loader2 className="w-4 h-4 animate-spin" />{filter === 'active' ? 'Loading active jobs...' : 'Loading job history...'}</div> : null}
            {!isLoading && displayRequests.length === 0 ? <div className="flex flex-col items-center justify-center py-16 text-center"><div className="w-16 h-16 bg-dispatch-surface border border-dispatch-border rounded-full flex items-center justify-center mb-4">{filter === 'active' ? <CheckCircle2 className="w-8 h-8 text-slate-600" /> : <RefreshCw className="w-8 h-8 text-slate-600" />}</div><p className="text-slate-400 font-semibold">{filter === 'active' ? 'No active jobs right now' : 'No completed or created jobs yet'}</p><p className="text-slate-600 text-sm mt-1 max-w-xs">{filter === 'active' ? 'New customer jobs will appear here automatically.' : 'Completed, cancelled, and newly created job records will appear here automatically.'}</p></div> : null}
            {displayRequests.map((request) => <JobCard key={request.id} request={request} onOpen={() => setSelectedRequestId(request.id)} />)}
          </>
        )}
      </div>
    </div>
  );
}

export default function OperatorPage() {
  const [session, setSession] = useState<OperatorSession | null>(() => readOperatorSession());

  function handleAuthenticated(operator: OperatorSession) {
    writeOperatorSession(operator);
    setSession(operator);
  }

  function handleSignOut() {
    clearOperatorSession();
    setSession(null);
  }

  return session ? <OperatorView session={session} onSignOut={handleSignOut} /> : <PinScreen onAuthenticated={handleAuthenticated} />;
}
