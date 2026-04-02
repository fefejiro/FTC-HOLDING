/**
 * Ottawa incident monitor.
 *
 * Automated incident sources:
 * 1. Ontario 511 official events feed (Ottawa slice)
 * 2. City of Ottawa official traffic events feed
 * 3. OC Transpo service alerts RSS (detours, cancellations)
 *
 * The monitor normalizes both feeds into a single incident stream, deduplicates
 * by source-prefixed ID, stores fresh incidents, broadcasts them over SSE, and
 * sends web-push alerts to active operators when the event is worth acting on.
 */

import { createHash } from 'node:crypto';
import { and, gt, inArray, sql } from 'drizzle-orm';
import { db } from './db';
import { OTTAWA_CENTER, isOttawaScopedIncident } from './ottawaScope';
import { incidents } from './schema';
import { sendToAllActiveOperators } from './push';
import { sseBroadcast } from './sse';

const ONTARIO = { north: 56.9, south: 41.6, west: -95.2, east: -74.0 };
const POLL_INTERVAL_MS = 45 * 1_000;
const MAX_GEOCODE_PER_RUN = 8; // Nominatim 1 req/s rate-limit cap

const INCIDENT_SOURCES = [
  {
    key: 'on511',
    label: 'Ontario 511',
    url: 'https://511on.ca/api/v2/get/event',
  },
  {
    key: 'ottawa_traffic',
    label: 'City of Ottawa Traffic Events',
    url: 'https://traffic.ottawa.ca/map/service/events?accept-language=en',
  },
  {
    key: 'octranspo',
    label: 'OC Transpo Service Alerts',
    url: 'https://www.octranspo.com/feeds/updates-en/',
  },
  {
    key: 'tomtom',
    label: 'TomTom Traffic Incidents',
    url: 'https://api.tomtom.com/traffic/services/5/incidentDetails',
  },
  {
    key: 'waze',
    label: 'Waze (OpenWeb Ninja)',
    url: 'https://waze.p.rapidapi.com/alerts-and-jams',
  },
] as const;

type SourceKey = (typeof INCIDENT_SOURCES)[number]['key'];

type MonitorSourceSnapshot = {
  fetched: number;
  eligible: number;
  inserted: number;
  updated: number;
};

type MonitorState = {
  running: boolean;
  pollIntervalMs: number;
  sourceCount: number;
  sources: Array<{ key: SourceKey; label: string; url: string }>;
  lastRunAt: string | null;
  lastSuccessAt: string | null;
  lastError: string | null;
  sourceStats: Record<SourceKey, MonitorSourceSnapshot>;
};

type NormalizedIncident = {
  id: string;
  eventType: string;
  description: string;
  roadway: string | null;
  locationLat: number;
  locationLng: number;
  severity: string | null;
  startDate: string | null;
  lastUpdated: string | null;
  alerted: boolean;
  sourceKey: SourceKey;
};

type Ontario511Event = {
  ID?: string | number;
  RoadwayName?: string;
  Description?: string;
  EventType?: string;
  EventSubType?: string | null;
  Severity?: string | null;
  Latitude?: number | string | null;
  Longitude?: number | string | null;
  StartDate?: number | string | null;
  LastUpdated?: number | string | null;
};

type OttawaTrafficEvent = {
  id?: number | string;
  headline?: string;
  message?: string;
  eventType?: string;
  eventSubType?: string;
  priority?: string;
  status?: string;
  mainStreet?: string;
  geodata?: {
    coordinates?: string | [number, number];
    type?: string;
  };
  created?: string;
  updated?: string;
};

const initialSourceStats = (): Record<SourceKey, MonitorSourceSnapshot> => ({
  on511: { fetched: 0, eligible: 0, inserted: 0, updated: 0 },
  ottawa_traffic: { fetched: 0, eligible: 0, inserted: 0, updated: 0 },
  octranspo: { fetched: 0, eligible: 0, inserted: 0, updated: 0 },
  tomtom: { fetched: 0, eligible: 0, inserted: 0, updated: 0 },
  waze: { fetched: 0, eligible: 0, inserted: 0, updated: 0 },
});

const monitorState: MonitorState = {
  running: false,
  pollIntervalMs: POLL_INTERVAL_MS,
  sourceCount: INCIDENT_SOURCES.length,
  sources: INCIDENT_SOURCES.map((source) => ({ ...source })),
  lastRunAt: null,
  lastSuccessAt: null,
  lastError: null,
  sourceStats: initialSourceStats(),
};

function inOntario(lat: number, lng: number): boolean {
  return lat >= ONTARIO.south && lat <= ONTARIO.north && lng >= ONTARIO.west && lng <= ONTARIO.east;
}

function toNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function toIsoString(value: unknown): string | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return new Date(value * 1_000).toISOString();
  }
  if (typeof value === 'string' && value.trim()) {
    const numeric = Number(value);
    if (Number.isFinite(numeric) && /^[0-9]+$/.test(value.trim())) {
      return new Date(numeric * 1_000).toISOString();
    }
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : date.toISOString();
  }
  return null;
}

function parseOttawaCoordinates(
  value: OttawaTrafficEvent['geodata'],
): { lng: number; lat: number } | null {
  const coords = value?.coordinates;
  if (Array.isArray(coords) && coords.length >= 2) {
    const lng = toNumber(coords[0]);
    const lat = toNumber(coords[1]);
    if (lng !== null && lat !== null) return { lng, lat };
  }
  if (typeof coords === 'string' && coords.trim()) {
    const cleaned = coords.replace(/^\[|\]$/g, '');
    const [lngRaw, latRaw] = cleaned.split(',').map((part) => part.trim());
    const lng = toNumber(lngRaw);
    const lat = toNumber(latRaw);
    if (lng !== null && lat !== null) return { lng, lat };
  }
  return null;
}

function inferIncidentType(rawType: string, rawSubType: string, description: string): string {
  const text = `${rawType} ${rawSubType} ${description}`.toLowerCase();
  if (/(lockout|locked out|key stuck|keys? in car|vehicle lock)/i.test(text)) return 'LOCKOUT_ASSIST';
  if (/(dead battery|battery boost|boost required|jump start|no start|won't start)/i.test(text)) return 'BATTERY_ASSIST';
  if (/(out of gas|ran out of gas|fuel empty|fuel shortage|need fuel|no fuel)/i.test(text)) return 'FUEL_ASSIST';
  if (/(flat tire|puncture|blowout|tire change|tire repair|wheel damage)/i.test(text)) return 'TIRE_ASSIST';
  if (text.includes('breakdown')) return 'VEHICLE_BREAKDOWN';
  if (text.includes('stalled')) return 'STALLED_VEHICLE';
  if (text.includes('disabled')) return 'DISABLED_VEHICLE';
  if (text.includes('vehicle fire') || text.includes('fire')) return 'VEHICLE_FIRE';
  if (text.includes('debris')) return 'DEBRIS';
  if (text.includes('hazard')) return 'HAZARD';
  if (text.includes('collision') || text.includes('accident') || text.includes('incident')) {
    return 'ACCIDENT';
  }
  if (text.includes('closure')) return 'ROAD_CLOSURE';
  return rawType.toUpperCase() || 'ROAD_EVENT';
}

function shouldAlert(normalizedType: string, description: string): boolean {
  const directTypes = new Set([
    'LOCKOUT_ASSIST',
    'BATTERY_ASSIST',
    'FUEL_ASSIST',
    'TIRE_ASSIST',
    'VEHICLE_BREAKDOWN',
    'STALLED_VEHICLE',
    'DISABLED_VEHICLE',
    'ACCIDENT',
    'VEHICLE_FIRE',
    'HAZARD',
    'DEBRIS',
  ]);
  if (directTypes.has(normalizedType)) return true;
  return /(lockout|locked out|key stuck|dead battery|battery boost|jump start|out of gas|fuel empty|flat tire|puncture|blowout|breakdown|stalled|disabled|accident|collision|vehicle fire|debris|hazard)/i.test(
    description,
  );
}

function prettyType(type: string): string {
  const map: Record<string, string> = {
    LOCKOUT_ASSIST: 'Lockout assist',
    BATTERY_ASSIST: 'Battery boost likely',
    FUEL_ASSIST: 'Fuel assist likely',
    TIRE_ASSIST: 'Tire assist likely',
    VEHICLE_BREAKDOWN: 'Breakdown',
    STALLED_VEHICLE: 'Stalled vehicle',
    DISABLED_VEHICLE: 'Disabled vehicle',
    ACCIDENT: 'Accident',
    VEHICLE_FIRE: 'Vehicle fire',
    HAZARD: 'Road hazard',
    DEBRIS: 'Debris on road',
    ROAD_CLOSURE: 'Road closure',
  };
  return map[type] || type || 'Road incident';
}

function incidentNeedsUpdate(
  existing: Pick<
    typeof incidents.$inferSelect,
    'eventType' | 'description' | 'roadway' | 'severity' | 'startDate' | 'lastUpdated' | 'alerted'
  >,
  incoming: NormalizedIncident,
): boolean {
  return (
    (existing.eventType ?? null) !== incoming.eventType ||
    (existing.description ?? null) !== incoming.description ||
    (existing.roadway ?? null) !== incoming.roadway ||
    (existing.severity ?? null) !== incoming.severity ||
    (existing.startDate ?? null) !== incoming.startDate ||
    (existing.lastUpdated ?? null) !== incoming.lastUpdated ||
    Boolean(existing.alerted) !== incoming.alerted
  );
}

// â”€â”€ RSS parser (no external dependency) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function rssText(xml: string, tag: string): string {
  const cdata = new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>`).exec(xml);
  if (cdata) return cdata[1].trim();
  const plain = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`).exec(xml);
  return plain ? plain[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() : '';
}

function decodeHtmlEntities(value: string): string {
  const namedEntities: Record<string, string> = {
    nbsp: ' ',
    amp: '&',
    quot: '"',
    apos: "'",
    lt: '<',
    gt: '>',
    Agrave: 'À',
    agrave: 'à',
    Acirc: 'Â',
    acirc: 'â',
    Ccedil: 'Ç',
    ccedil: 'ç',
    Eacute: 'É',
    eacute: 'é',
    Egrave: 'È',
    egrave: 'è',
    Ecirc: 'Ê',
    ecirc: 'ê',
    Euml: 'Ë',
    euml: 'ë',
    Icirc: 'Î',
    icirc: 'î',
    Ocirc: 'Ô',
    ocirc: 'ô',
    Ugrave: 'Ù',
    ugrave: 'ù',
  };

  return value
    .replace(/&([a-zA-Z]+);/g, (match, name: string) => namedEntities[name] ?? match)
    .replace(/&#(\d+);/g, (_, code: string) => {
      const parsed = Number.parseInt(code, 10);
      return Number.isFinite(parsed) ? String.fromCharCode(parsed) : '';
    });
}

function cleanFeedText(value: string): string {
  return decodeHtmlEntities(String(value || ''))
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function normalizeFeedSpacing(value: string): string {
  return value
    .replace(/([,;:])(?!\s|$)/g, '$1 ')
    .replace(/\b([A-Za-z]+)to regular routing\b/g, '$1 to regular routing')
    .replace(/\b([A-Za-z]+)to detour\b/g, '$1 to detour')
    .replace(/\s+/g, ' ')
    .trim();
}

function summarizeOCTranspoAlert(title: string, description: string, eventType: string) {
  const cleanTitle = normalizeFeedSpacing(cleanFeedText(title));
  let body = normalizeFeedSpacing(cleanFeedText(description));

  if (!body) {
    return {
      roadway: cleanTitle,
      description: cleanTitle,
    };
  }

  body = body
    .replace(/^[A-Z][a-z]+ \d{1,2} \d{4}\s*-\s*/i, '')
    .replace(new RegExp(`^${escapeRegExp(cleanTitle)}\\s*[-–—:]\\s*`, 'i'), '')
    .replace(/\bStops missed:.*$/i, '')
    .replace(/\bAlternative stops?:.*$/i, '')
    .replace(/\bAffected stops?:.*$/i, '')
    .trim();

  const firstSentence = body.split(/(?<=[.!?])\s+/)[0]?.trim() || '';

  if (eventType === 'ROUTE_CANCELLED') {
    const sentence =
      /The trip is cancelled[^.]*\.?/i.exec(body)?.[0]?.trim() ||
      'Trip cancellation in effect.';

    return {
      roadway: cleanTitle,
      description: normalizeFeedSpacing(sentence).slice(0, 180),
    };
  }

  if (eventType === 'ROAD_DETOUR') {
    const sentence = /stopping outside|station will be closed|bus loop/i.test(body)
      ? 'Temporary stop change in effect.'
      : 'Detour active. Routing has changed for this service.';

    return {
      roadway: cleanTitle,
      description: sentence,
    };
  }

  return {
    roadway: cleanTitle,
    description: firstSentence || 'Transit alert active.',
  };
}

function parseRSSItems(xml: string) {
  const items: Array<{ title: string; description: string; pubDate: string; guid: string; categories: string[] }> = [];
  const re = /<item>([\s\S]*?)<\/item>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml)) !== null) {
    const body = m[1];
    const cats: string[] = [];
    const catRe = /<category>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/category>/g;
    let cm: RegExpExecArray | null;
    while ((cm = catRe.exec(body)) !== null) cats.push(cm[1].trim());
    items.push({
      title: rssText(body, 'title'),
      description: rssText(body, 'description'),
      pubDate: rssText(body, 'pubDate'),
      guid: rssText(body, 'guid'),
      categories: cats,
    });
  }
  return items;
}

// â”€â”€ Nominatim forward geocoder â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

async function geocodeOntarioStreet(query: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const q = encodeURIComponent(`${query}, Ottawa, Ontario`);
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=1&countrycodes=ca`,
      { headers: { 'User-Agent': 'dispatch-app/1.0 (contact@unalabs.cloud)' }, signal: AbortSignal.timeout(6_000) },
    );
    if (!res.ok) return null;
    const data = (await res.json()) as Array<{ lat: string; lon: string }>;
    if (!data.length) return null;
    const lat = parseFloat(data[0].lat);
    const lng = parseFloat(data[0].lon);
    return inOntario(lat, lng) ? { lat, lng } : null;
  } catch {
    return null;
  }
}

function extractStreetHint(title: string): string | null {
  // "DETOUR: Route 8 near Laurier Ave." â†’ "Laurier Ave"
  const near = /\bnear\s+([A-Za-z][A-Za-z0-9\s./]+?)\.?\s*$/i.exec(title);
  if (near) return near[1].trim();
  // "Route 95 Albert/Slater" â†’ "Albert"
  const route = /Route\s+\d+[A-Z]?\s+([A-Za-z][A-Za-z/\s]+)/i.exec(title);
  if (route) return route[1].split('/')[0].trim();
  return null;
}

// â”€â”€ OC Transpo alerts â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

async function fetchOCTranspoAlerts(geocodeBudget: { used: number }): Promise<NormalizedIncident[]> {
  const res = await fetch('https://www.octranspo.com/feeds/updates-en/', {
    headers: { 'User-Agent': 'dispatch-app/1.0 (contact@unalabs.cloud)' },
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) return [];

  const xml = await res.text();
  const items = parseRSSItems(xml);

  // Only include alerts from last 48 hours
  const cutoff = Date.now() - 48 * 60 * 60 * 1_000;
  const recent = items.filter((item) => {
    const t = item.pubDate ? new Date(item.pubDate).getTime() : 0;
    return t >= cutoff;
  });

  const result: NormalizedIncident[] = [];
  const seen = new Set<string>();

  for (const item of recent) {
    const cleanTitle = normalizeFeedSpacing(cleanFeedText(item.title));
    const cleanDescription = normalizeFeedSpacing(cleanFeedText(item.description));
    const dedupeKey = `${cleanTitle}::${cleanDescription}::${item.pubDate || ''}`;
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);

    const id = `octranspo:${createHash('md5').update(item.guid || dedupeKey).digest('hex').slice(0, 12)}`;
    const cats = item.categories.map((c) => c.toLowerCase());
    const isDetour = cats.some((c) => c.includes('detour'));
    const isCancel =
      cats.some((c) => c.includes('cancel')) ||
      /cancelled trip|cancelled stop|trip is cancelled|cancelled/i.test(`${cleanTitle} ${cleanDescription}`);
    const eventType = isDetour ? 'ROAD_DETOUR' : isCancel ? 'ROUTE_CANCELLED' : 'TRANSIT_ALERT';

    // Try to geocode extracted street â€” respect per-run budget
    let lat = OTTAWA_CENTER.lat;
    let lng = OTTAWA_CENTER.lng;

    if (geocodeBudget.used < MAX_GEOCODE_PER_RUN) {
      const hint = extractStreetHint(cleanTitle);
      if (hint) {
        geocodeBudget.used += 1;
        // 1.1s gap satisfies Nominatim's 1 req/s policy
        const [coords] = await Promise.all([
          geocodeOntarioStreet(hint),
          new Promise<void>((r) => setTimeout(r, 1_100)),
        ]);
        if (coords) { lat = coords.lat; lng = coords.lng; }
      }
    }

    const alerted = isDetour;
    const summary = summarizeOCTranspoAlert(cleanTitle, cleanDescription, eventType);

    result.push({
      id,
      eventType,
      description: summary.description,
      roadway: summary.roadway,
      locationLat: lat,
      locationLng: lng,
      severity: isDetour ? 'Medium' : 'Low',
      startDate: item.pubDate ? new Date(item.pubDate).toISOString() : null,
      lastUpdated: item.pubDate ? new Date(item.pubDate).toISOString() : null,
      alerted,
      sourceKey: 'octranspo' as const,
    });
  }

  return result;
}

async function fetchOntario511Incidents(): Promise<NormalizedIncident[]> {
  const res = await fetch('https://511on.ca/api/v2/get/event', {
    headers: { 'User-Agent': 'dispatch-app/1.0 (contact@unalabs.cloud)' },
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) return [];

  const raw = (await res.json()) as Ontario511Event[] | { events?: Ontario511Event[] };
  const all = Array.isArray(raw) ? raw : Array.isArray(raw.events) ? raw.events : [];

  return all
    .map((event) => {
      const lat = toNumber(event.Latitude);
      const lng = toNumber(event.Longitude);
      if (lat === null || lng === null || !inOntario(lat, lng)) return null;

      const description = String(event.Description || '').trim();
      const eventType = inferIncidentType(
        String(event.EventType || ''),
        String(event.EventSubType || ''),
        description,
      );
      const candidate = {
        id: `on511:${String(event.ID ?? '')}`,
        roadway: String(event.RoadwayName || '').trim() || null,
        description,
        locationLat: lat,
        locationLng: lng,
      };
      if (!isOttawaScopedIncident(candidate)) return null;

      return {
        id: candidate.id,
        eventType,
        description,
        roadway: candidate.roadway,
        locationLat: lat,
        locationLng: lng,
        severity: String(event.Severity || '').trim() || null,
        startDate: toIsoString(event.StartDate),
        lastUpdated: toIsoString(event.LastUpdated),
        alerted: shouldAlert(eventType, description),
        sourceKey: 'on511' as const,
      } satisfies NormalizedIncident;
    })
    .filter((value): value is NormalizedIncident => Boolean(value && value.id !== 'on511:'));
}

async function fetchOttawaTrafficIncidents(): Promise<NormalizedIncident[]> {
  const res = await fetch('https://traffic.ottawa.ca/map/service/events?accept-language=en', {
    headers: { 'User-Agent': 'dispatch-app/1.0 (contact@unalabs.cloud)' },
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) return [];

  const raw = (await res.json()) as { events?: OttawaTrafficEvent[] };
  const all = Array.isArray(raw.events) ? raw.events : [];

  return all
    .map((event) => {
      const coords = parseOttawaCoordinates(event.geodata);
      if (!coords || !inOntario(coords.lat, coords.lng)) return null;

      const description = String(event.message || event.headline || '').trim();
      const normalizedType = inferIncidentType(
        String(event.eventType || ''),
        String(event.eventSubType || ''),
        description,
      );
      const alertable =
        String(event.eventType || '').toUpperCase() === 'INCIDENT' ||
        shouldAlert(normalizedType, description);

      if (!alertable) return null;

      return {
        id: `ottawa_traffic:${String(event.id ?? '')}`,
        eventType: normalizedType,
        description,
        roadway: String(event.mainStreet || event.headline || '').trim() || null,
        locationLat: coords.lat,
        locationLng: coords.lng,
        severity: String(event.priority || '').trim() || null,
        startDate: toIsoString(event.created),
        lastUpdated: toIsoString(event.updated),
        alerted: true,
        sourceKey: 'ottawa_traffic' as const,
      } satisfies NormalizedIncident;
    })
    .filter(
      (value): value is NormalizedIncident =>
        Boolean(value && value.id !== 'ottawa_traffic:' && value.description),
    );
}

// ── TomTom Traffic Incidents ────────────────────────────────────────────────

type TomTomGeometry =
  | { type: 'Point'; coordinates: [number, number] }
  | { type: 'LineString'; coordinates: Array<[number, number]> };

type TomTomIncident = {
  type: 'Feature';
  geometry?: TomTomGeometry;
  properties?: {
    id?: string;
    iconCategory?: number;
    magnitudeOfDelay?: number;
    events?: Array<{ description?: string; code?: number; iconCategory?: number }>;
    startTime?: string;
    endTime?: string;
    from?: string;
    to?: string;
    length?: number;
    delay?: number;
    roadNumbers?: string[];
    timeValidity?: string;
  };
};

type TomTomResponse = { incidents?: TomTomIncident[] };

const TOMTOM_CATEGORY_TO_EVENT: Record<number, string> = {
  1: 'ACCIDENT',
  3: 'HAZARD',
  6: 'ROAD_EVENT',
  7: 'ROAD_CLOSURE',
  8: 'ROAD_CLOSURE',
  9: 'ROAD_CLOSURE',
  12: 'VEHICLE_BREAKDOWN',
  13: 'VEHICLE_FIRE',
};

const TOMTOM_ALERTABLE = new Set([1, 12, 13]);

const TOMTOM_DELAY_SEVERITY: Record<number, string> = {
  0: 'Unknown',
  1: 'Minor',
  2: 'Moderate',
  3: 'Major',
  4: 'Road Closure',
};

async function fetchTomTomIncidents(): Promise<NormalizedIncident[]> {
  const apiKey = process.env.TOMTOM_API_KEY;
  if (!apiKey) return [];

  // Ottawa bounds: SW(-76.35,45.05) NE(-75.2,45.62) as minLon,minLat,maxLon,maxLat
  const bbox = '-76.35,45.05,-75.2,45.62';
  const fields = encodeURIComponent(
    '{incidents{type,geometry{type,coordinates},properties{id,iconCategory,magnitudeOfDelay,events{description,code,iconCategory},startTime,endTime,from,to,length,delay,roadNumbers,timeValidity}}}',
  );
  const url = `https://api.tomtom.com/traffic/services/5/incidentDetails?key=${apiKey}&bbox=${bbox}&fields=${fields}&language=en-GB&timeValidityFilter=present`;

  const res = await fetch(url, {
    headers: { 'User-Agent': 'dispatch-app/1.0 (contact@unalabs.cloud)' },
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) {
    console.warn(`[monitor][tomtom] fetch failed: ${res.status} ${res.statusText}`);
    return [];
  }

  const raw = (await res.json()) as TomTomResponse;
  const all = Array.isArray(raw.incidents) ? raw.incidents : [];

  return all
    .map((incident) => {
      const cat = incident.properties?.iconCategory ?? 0;
      const eventType = TOMTOM_CATEGORY_TO_EVENT[cat];
      if (!eventType) return null;

      // Extract first coordinate from Point or LineString (GeoJSON: [lng, lat])
      let lat: number | null = null;
      let lng: number | null = null;
      const geom = incident.geometry;
      if (geom?.type === 'Point') {
        lng = toNumber(geom.coordinates[0]);
        lat = toNumber(geom.coordinates[1]);
      } else if (geom?.type === 'LineString' && geom.coordinates.length > 0) {
        lng = toNumber(geom.coordinates[0][0]);
        lat = toNumber(geom.coordinates[0][1]);
      }

      if (lat === null || lng === null || !inOntario(lat, lng)) return null;

      const props = incident.properties ?? {};
      const description =
        props.events
          ?.map((e) => e.description)
          .filter(Boolean)
          .join('. ') ?? '';
      const roadway =
        [props.from, props.to].filter(Boolean).join(' - ') ||
        props.roadNumbers?.[0] ||
        null;
      const id = `tomtom:${String(props.id ?? '')}`;
      if (id === 'tomtom:') return null;

      const severity =
        typeof props.magnitudeOfDelay === 'number'
          ? (TOMTOM_DELAY_SEVERITY[props.magnitudeOfDelay] ?? null)
          : null;

      return {
        id,
        eventType,
        description,
        roadway,
        locationLat: lat,
        locationLng: lng,
        severity,
        startDate: props.startTime ? new Date(props.startTime).toISOString() : null,
        lastUpdated: props.startTime ? new Date(props.startTime).toISOString() : null,
        alerted: TOMTOM_ALERTABLE.has(cat),
        sourceKey: 'tomtom' as const,
      } satisfies NormalizedIncident;
    })
    .filter((v): v is NormalizedIncident => v !== null);
}

// ── Waze via OpenWeb Ninja (RapidAPI) ────────────────────────────────────────

type WazeAlert = {
  alert_id?: string;
  type?: string;
  subtype?: string;
  description?: string;
  publish_datetime_utc?: string;
  street?: string;
  city?: string;
  latitude?: number | string;
  longitude?: number | string;
  alert_reliability?: number;
  alert_confidence?: number;
  num_thumbs_up?: number;
};

type WazeResponse = {
  data?: { alerts?: WazeAlert[]; jams?: unknown[] };
};

async function fetchWazeIncidents(): Promise<NormalizedIncident[]> {
  // Support both keys — prefer RapidAPI wrapper, fall back to direct OpenWeb Ninja key
  const rapidApiKey = process.env.OPENWEBNINJA_API_KEY;
  const directKey = process.env.OPENWEBNINJA_DIRECT_KEY;
  if (!rapidApiKey && !directKey) return [];

  const bottomLeft = '45.2501,-76.3556';
  const topRight = '45.5375,-75.2466';
  const params = `bottom_left=${encodeURIComponent(bottomLeft)}&top_right=${encodeURIComponent(topRight)}&max_alerts=100&max_jams=0`;

  let url: string;
  let headers: Record<string, string>;

  if (rapidApiKey) {
    url = `https://waze.p.rapidapi.com/alerts-and-jams?${params}`;
    headers = {
      'X-RapidAPI-Key': rapidApiKey,
      'X-RapidAPI-Host': 'waze.p.rapidapi.com',
      'User-Agent': 'dispatch-app/1.0 (contact@unalabs.cloud)',
    };
  } else {
    // Direct OpenWeb Ninja endpoint
    url = `https://api.openwebninja.com/waze/alerts-and-jams?${params}`;
    headers = {
      'x-api-key': directKey!,
      'User-Agent': 'dispatch-app/1.0 (contact@unalabs.cloud)',
    };
  }

  const res = await fetch(url, { headers, signal: AbortSignal.timeout(15_000) });
  if (!res.ok) {
    console.warn(`[monitor][waze] fetch failed: ${res.status} ${res.statusText}`);
    return [];
  }

  const raw = (await res.json()) as WazeResponse;
  const alerts = raw.data?.alerts ?? [];

  return alerts
    .map((alert) => {
      const type = String(alert.type || '').toUpperCase();
      const subtype = String(alert.subtype || '').toUpperCase();

      let eventType: string;
      let alerted: boolean;

      if (type === 'ACCIDENT') {
        eventType = 'ACCIDENT';
        alerted = true;
      } else if (type === 'HAZARD') {
        if (subtype.includes('CAR_STOPPED')) {
          eventType = 'STALLED_VEHICLE';
          alerted = true;
        } else {
          eventType = 'HAZARD';
          alerted = false;
        }
      } else if (type === 'ROAD_CLOSED') {
        eventType = 'ROAD_CLOSURE';
        alerted = false;
      } else {
        return null; // skip POLICE, JAM, etc.
      }

      const lat = toNumber(alert.latitude);
      const lng = toNumber(alert.longitude);
      if (lat === null || lng === null || !inOntario(lat, lng)) return null;

      const id = `waze:${String(alert.alert_id ?? '')}`;
      if (id === 'waze:') return null;

      const description = alert.description || alert.subtype || type;
      const startDate = alert.publish_datetime_utc
        ? new Date(alert.publish_datetime_utc).toISOString()
        : null;

      return {
        id,
        eventType,
        description,
        roadway: alert.street || null,
        locationLat: lat,
        locationLng: lng,
        severity:
          typeof alert.alert_reliability === 'number'
            ? String(alert.alert_reliability)
            : null,
        startDate,
        lastUpdated: startDate,
        alerted,
        sourceKey: 'waze' as const,
      } satisfies NormalizedIncident;
    })
    .filter((v): v is NormalizedIncident => v !== null);
}

// ── Cross-source deduplication ────────────────────────────────────────────────
// If two incidents from different sources are within ~200m and 10 min of each
// other, keep only the higher-priority source's record.

const DEDUP_LAT_THRESHOLD = 0.002; // ~220 m
const DEDUP_LNG_THRESHOLD = 0.003; // ~210 m at 45°N
const DEDUP_TIME_MS = 10 * 60 * 1_000;

const SOURCE_PRIORITY = new Map<SourceKey, number>([
  ['on511', 1],
  ['ottawa_traffic', 2],
  ['tomtom', 3],
  ['octranspo', 4],
  ['waze', 5],
]);

function deduplicateAcrossSources(all: NormalizedIncident[]): NormalizedIncident[] {
  const sorted = [...all].sort(
    (a, b) => (SOURCE_PRIORITY.get(a.sourceKey) ?? 9) - (SOURCE_PRIORITY.get(b.sourceKey) ?? 9),
  );
  const kept: NormalizedIncident[] = [];
  for (const incident of sorted) {
    const isDup = kept.some((existing) => {
      if (existing.sourceKey === incident.sourceKey) return false;
      const latDiff = Math.abs(existing.locationLat - incident.locationLat);
      const lngDiff = Math.abs(existing.locationLng - incident.locationLng);
      if (latDiff > DEDUP_LAT_THRESHOLD || lngDiff > DEDUP_LNG_THRESHOLD) return false;
      const tsA = existing.startDate ? Date.parse(existing.startDate) : 0;
      const tsB = incident.startDate ? Date.parse(incident.startDate) : 0;
      if (tsA > 0 && tsB > 0 && Math.abs(tsA - tsB) > DEDUP_TIME_MS) return false;
      return true;
    });
    if (!isDup) kept.push(incident);
  }
  return kept;
}

async function loadSourceIncidents(): Promise<Record<SourceKey, NormalizedIncident[]>> {
  // Share a geocode budget across the run to respect Nominatim rate limits
  const geocodeBudget = { used: 0 };

  // OC Transpo may geocode sequentially â€” run it first, then parallel the rest
  const octranspo = await fetchOCTranspoAlerts(geocodeBudget);
  const [on511, ottawaTraffic, tomtom] = await Promise.all([
    fetchOntario511Incidents(),
    fetchOttawaTrafficIncidents(),
    fetchTomTomIncidents(),
  ]);

  // Waze runs on its own 20s loop (startWazeMonitor) — not polled here
  return { on511, ottawa_traffic: ottawaTraffic, octranspo, tomtom, waze: [] };
}

async function runMonitor(): Promise<void> {
  monitorState.lastRunAt = new Date().toISOString();
  monitorState.lastError = null;

  try {
    const sourceIncidents = await loadSourceIncidents();
    // Waze is handled separately in the 20s Waze monitor loop
    const rawAll = [
      ...sourceIncidents.on511,
      ...sourceIncidents.ottawa_traffic,
      ...sourceIncidents.octranspo,
      ...sourceIncidents.tomtom,
    ];
    const all = deduplicateAcrossSources(rawAll);

    monitorState.sourceStats = {
      on511: {
        fetched: sourceIncidents.on511.length,
        eligible: sourceIncidents.on511.filter((i) => i.alerted).length,
        inserted: 0,
        updated: 0,
      },
      ottawa_traffic: {
        fetched: sourceIncidents.ottawa_traffic.length,
        eligible: sourceIncidents.ottawa_traffic.filter((i) => i.alerted).length,
        inserted: 0,
        updated: 0,
      },
      octranspo: {
        fetched: sourceIncidents.octranspo.length,
        eligible: sourceIncidents.octranspo.filter((i) => i.alerted).length,
        inserted: 0,
        updated: 0,
      },
      tomtom: {
        fetched: sourceIncidents.tomtom.length,
        eligible: sourceIncidents.tomtom.filter((i) => i.alerted).length,
        inserted: 0,
        updated: 0,
      },
      waze: {
        fetched: sourceIncidents.waze.length,
        eligible: sourceIncidents.waze.filter((i) => i.alerted).length,
        inserted: 0,
        updated: 0,
      },
    };

    if (all.length === 0) {
      monitorState.lastSuccessAt = new Date().toISOString();
      console.log('[monitor] no Ottawa incidents matched current filters');
      return;
    }

    const ids = all.map((incident) => incident.id);
    const currentIdSet = new Set(ids);
    const seen = await db
      .select({
        id: incidents.id,
        eventType: incidents.eventType,
        description: incidents.description,
        roadway: incidents.roadway,
        severity: incidents.severity,
        startDate: incidents.startDate,
        lastUpdated: incidents.lastUpdated,
        alerted: incidents.alerted,
      })
      .from(incidents)
      .where(inArray(incidents.id, ids));

    const seenMap = new Map(seen.map((item) => [item.id, item]));
    const fresh = all.filter((incident) => !seenMap.has(incident.id));
    const changed = all.filter((incident) => {
      const existing = seenMap.get(incident.id);
      return existing ? incidentNeedsUpdate(existing, incident) : false;
    });

    const activeSourcePrefixes = INCIDENT_SOURCES
      .filter((source) => monitorState.sourceStats[source.key].fetched > 0)
      .map((source) => `${source.key}:`);

    const existingIds = await db.select({ id: incidents.id }).from(incidents);
    const staleIds = existingIds
      .map((item) => item.id)
      .filter(
        (id) =>
          activeSourcePrefixes.some((prefix) => id.startsWith(prefix)) &&
          !currentIdSet.has(id),
      );

    if (fresh.length === 0 && changed.length === 0) {
      monitorState.lastSuccessAt = new Date().toISOString();
      console.log(
        `[monitor] checked ${all.length} Ottawa incidents across ${INCIDENT_SOURCES.length} sources; no new incidents, retained ${staleIds.length} historical incidents`,
      );
      return;
    }

    let alertCount = 0;

    for (const incident of fresh) {
      const occurredAt = incident.lastUpdated || incident.startDate || new Date().toISOString();
      await db
        .insert(incidents)
        .values({
          id: incident.id,
          eventType: incident.eventType,
          description: incident.description,
          roadway: incident.roadway,
          locationLat: incident.locationLat,
          locationLng: incident.locationLng,
          severity: incident.severity,
          startDate: incident.startDate,
          lastUpdated: incident.lastUpdated,
          alerted: incident.alerted,
          alertedAt: incident.alerted ? new Date() : null,
        })
        .onConflictDoNothing();

      monitorState.sourceStats[incident.sourceKey].inserted += 1;

      sseBroadcast('incident:new', {
        id: incident.id,
        eventType: incident.eventType,
        description: incident.description,
        roadway: incident.roadway,
        locationLat: incident.locationLat,
        locationLng: incident.locationLng,
        severity: incident.severity,
        startDate: incident.startDate,
        lastUpdated: incident.lastUpdated,
        occurredAt,
        alerted: incident.alerted,
        createdAt: occurredAt,
        source: incident.sourceKey,
      });

      if (incident.alerted) {
        const location = incident.roadway || incident.description.slice(0, 80) || 'Ottawa';
        sendToAllActiveOperators({
          title: 'Incident Alert',
          body: `${prettyType(incident.eventType)} - ${location}`,
          data: {
            incidentId: incident.id,
            lat: String(incident.locationLat),
            lng: String(incident.locationLng),
            source: incident.sourceKey,
          },
        }).catch(() => {});
        alertCount += 1;
      }
    }

    for (const incident of changed) {
      const occurredAt = incident.lastUpdated || incident.startDate || new Date().toISOString();
      await db
        .update(incidents)
        .set({
          eventType: incident.eventType,
          description: incident.description,
          roadway: incident.roadway,
          locationLat: incident.locationLat,
          locationLng: incident.locationLng,
          severity: incident.severity,
          startDate: incident.startDate,
          lastUpdated: incident.lastUpdated,
          alerted: incident.alerted,
          alertedAt: incident.alerted ? new Date() : null,
        })
        .where(inArray(incidents.id, [incident.id]));

      monitorState.sourceStats[incident.sourceKey].updated += 1;

      sseBroadcast('incident:updated', {
        id: incident.id,
        eventType: incident.eventType,
        description: incident.description,
        roadway: incident.roadway,
        locationLat: incident.locationLat,
        locationLng: incident.locationLng,
        severity: incident.severity,
        startDate: incident.startDate,
        lastUpdated: incident.lastUpdated,
        occurredAt,
        alerted: incident.alerted,
        createdAt: occurredAt,
        source: incident.sourceKey,
      });
    }

    monitorState.lastSuccessAt = new Date().toISOString();
    console.log(
      `[monitor] ${fresh.length} new, ${changed.length} updated, and ${staleIds.length} retained as history from ${INCIDENT_SOURCES.length} Ottawa sources - ${alertCount} operator alerts sent`,
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown monitor error';
    monitorState.lastError = message;
    console.error('[monitor] poll failed:', err);
  }
}

// ── Standalone Waze monitor — variable polling by time of day ─────────────────
//
// Period     | Hours (Eastern)      | Interval
// -----------|----------------------|----------
// peak       | 7–9 AM, 5–7 PM       | 20 s
// moderate   | 9 AM–5 PM, 7–9 PM    | 60 s
// off-peak   | 5–7 AM, 9–11 PM      | 90 s
// inactive   | 11 PM–5 AM           | sleep (no API calls)
//
// Daily estimate: ~1,300 requests — fits free tier for ~2 days of testing.

type WazePeriod = 'peak' | 'moderate' | 'off-peak' | 'inactive';

function getEasternHour(): number {
  const formatted = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Toronto',
    hour: 'numeric',
    hour12: false,
  }).format(new Date());
  const h = parseInt(formatted, 10);
  return h === 24 ? 0 : h;
}

function getWazePeriod(): WazePeriod {
  const h = getEasternHour();
  if (h < 5 || h >= 23) return 'inactive';
  if ((h >= 7 && h < 9) || (h >= 17 && h < 19)) return 'peak';
  if ((h >= 9 && h < 17) || (h >= 19 && h < 21)) return 'moderate';
  return 'off-peak'; // 5–7 AM, 9–11 PM
}

function getWazePollIntervalMs(period: WazePeriod): number {
  if (period === 'inactive') return 60_000; // wake-check every 60s
  if (period === 'peak') return 20_000;
  if (period === 'moderate') return 60_000;
  return 90_000;
}

type WazeMonitorState = {
  running: boolean;
  period: WazePeriod;
  currentPollIntervalMs: number;
  lastRunAt: string | null;
  lastSuccessAt: string | null;
  lastError: string | null;
  lastFetchCount: number;
  todayFetched: number;
  todayInserted: number;
};

const wazeState: WazeMonitorState = {
  running: false,
  period: 'inactive',
  currentPollIntervalMs: 60_000,
  lastRunAt: null,
  lastSuccessAt: null,
  lastError: null,
  lastFetchCount: 0,
  todayFetched: 0,
  todayInserted: 0,
};

let wazeResetDay = '';
function checkWazeDailyReset(): void {
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Toronto' }).format(new Date());
  if (wazeResetDay !== today) {
    wazeState.todayFetched = 0;
    wazeState.todayInserted = 0;
    wazeResetDay = today;
  }
}

async function isNearbyIncidentInDb(lat: number, lng: number): Promise<boolean> {
  const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1_000);
  const result = await db
    .select({ id: incidents.id })
    .from(incidents)
    .where(
      and(
        sql`ABS(${incidents.locationLat} - ${lat}) < 0.002`,
        sql`ABS(${incidents.locationLng} - ${lng}) < 0.003`,
        gt(incidents.createdAt, tenMinutesAgo),
      ),
    )
    .limit(1);
  return result.length > 0;
}

async function runWazeMonitor(): Promise<void> {
  checkWazeDailyReset();
  const period = getWazePeriod();
  wazeState.period = period;
  wazeState.currentPollIntervalMs = getWazePollIntervalMs(period);
  wazeState.lastRunAt = new Date().toISOString();

  if (period === 'inactive') return;

  try {
    const waze = await fetchWazeIncidents();
    wazeState.lastFetchCount = waze.length;
    wazeState.todayFetched += waze.length;

    if (waze.length === 0) {
      wazeState.lastSuccessAt = new Date().toISOString();
      return;
    }

    // Fast ID-based dedup
    const ids = waze.map((i) => i.id);
    const seenRows = await db.select({ id: incidents.id }).from(incidents).where(inArray(incidents.id, ids));
    const seenIds = new Set(seenRows.map((r) => r.id));

    let inserted = 0;
    for (const incident of waze) {
      if (seenIds.has(incident.id)) continue;

      // Skip if TomTom/official source already has a nearby record
      if (await isNearbyIncidentInDb(incident.locationLat, incident.locationLng)) continue;

      const occurredAt = incident.lastUpdated || incident.startDate || new Date().toISOString();
      await db
        .insert(incidents)
        .values({
          id: incident.id,
          eventType: incident.eventType,
          description: incident.description,
          roadway: incident.roadway,
          locationLat: incident.locationLat,
          locationLng: incident.locationLng,
          severity: incident.severity,
          startDate: incident.startDate,
          lastUpdated: incident.lastUpdated,
          alerted: incident.alerted,
          alertedAt: incident.alerted ? new Date() : null,
        })
        .onConflictDoNothing();

      inserted += 1;
      wazeState.todayInserted += 1;

      sseBroadcast('incident:new', {
        id: incident.id,
        eventType: incident.eventType,
        description: incident.description,
        roadway: incident.roadway,
        locationLat: incident.locationLat,
        locationLng: incident.locationLng,
        severity: incident.severity,
        startDate: incident.startDate,
        lastUpdated: incident.lastUpdated,
        occurredAt,
        alerted: incident.alerted,
        createdAt: occurredAt,
        source: 'waze',
      });

      if (incident.alerted) {
        sendToAllActiveOperators({
          title: 'Waze Alert',
          body: `${prettyType(incident.eventType)} — ${incident.roadway || incident.description?.slice(0, 80) || 'Ottawa area'}`,
          data: {
            incidentId: incident.id,
            lat: String(incident.locationLat),
            lng: String(incident.locationLng),
            source: 'waze',
          },
        }).catch(() => {});
      }
    }

    wazeState.lastSuccessAt = new Date().toISOString();
    if (inserted > 0) {
      console.log(`[waze-monitor][${period}] ${waze.length} fetched, ${inserted} new`);
    }
  } catch (err) {
    wazeState.lastError = err instanceof Error ? err.message : 'Unknown error';
    console.error('[waze-monitor] poll failed:', err);
  }
}

function scheduleNextWazePoll(): void {
  const delay = getWazePollIntervalMs(getWazePeriod());
  setTimeout(async () => {
    await runWazeMonitor();
    scheduleNextWazePoll();
  }, delay);
}

export function startWazeMonitor(): void {
  wazeState.running = true;
  wazeState.period = getWazePeriod();
  // Stagger 5s after main monitor startup
  setTimeout(() => {
    runWazeMonitor().then(() => scheduleNextWazePoll());
  }, 5_000);
  console.log('[waze-monitor] started — peak 20s | moderate 60s | off-peak 90s | inactive 11PM–5AM Eastern');
}

export function getWazeMonitorInfo(): WazeMonitorState {
  return { ...wazeState };
}

export function getIncidentMonitorInfo(): MonitorState {
  const stats = {} as Record<SourceKey, MonitorSourceSnapshot>;
  for (const key of Object.keys(monitorState.sourceStats) as SourceKey[]) {
    stats[key] = { ...monitorState.sourceStats[key] };
  }
  return {
    ...monitorState,
    sourceStats: stats,
    sources: monitorState.sources.map((source) => ({ ...source })),
  };
}

export function startIncidentMonitor(): void {
  monitorState.running = true;

  setTimeout(() => {
    runMonitor();
    setInterval(runMonitor, POLL_INTERVAL_MS);
  }, 10_000);

  console.log(
    `[monitor] Ottawa incident monitor started - ${INCIDENT_SOURCES.length} official sources, polling every ${Math.round(POLL_INTERVAL_MS / 1000)} sec`,
  );
}
