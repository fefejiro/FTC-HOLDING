/**
 * Ottawa incident monitor.
 *
 * Automated incident sources:
 * 1. Ontario 511 official events feed
 * 2. City of Ottawa official traffic events feed
 *
 * The monitor normalizes both feeds into a single incident stream, deduplicates
 * by source-prefixed ID, stores fresh incidents, broadcasts them over SSE, and
 * sends web-push alerts to active operators when the event is worth acting on.
 */

import { inArray } from 'drizzle-orm';
import { db } from './db';
import { incidents } from './schema';
import { sendToAllActiveOperators } from './push';
import { sseBroadcast } from './sse';

const OTTAWA = { north: 45.53, south: 45.15, west: -76.35, east: -75.25 };
const POLL_INTERVAL_MS = 3 * 60 * 1_000;

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
] as const;

type SourceKey = (typeof INCIDENT_SOURCES)[number]['key'];

type MonitorSourceSnapshot = {
  fetched: number;
  eligible: number;
  inserted: number;
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
  on511: { fetched: 0, eligible: 0, inserted: 0 },
  ottawa_traffic: { fetched: 0, eligible: 0, inserted: 0 },
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

function inOttawa(lat: number, lng: number): boolean {
  return lat >= OTTAWA.south && lat <= OTTAWA.north && lng >= OTTAWA.west && lng <= OTTAWA.east;
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
    'VEHICLE_BREAKDOWN',
    'STALLED_VEHICLE',
    'DISABLED_VEHICLE',
    'ACCIDENT',
    'VEHICLE_FIRE',
    'HAZARD',
    'DEBRIS',
  ]);
  if (directTypes.has(normalizedType)) return true;
  return /(breakdown|stalled|disabled|accident|collision|vehicle fire|debris|hazard)/i.test(
    description,
  );
}

function prettyType(type: string): string {
  const map: Record<string, string> = {
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
      if (lat === null || lng === null || !inOttawa(lat, lng)) return null;

      const description = String(event.Description || '').trim();
      const eventType = inferIncidentType(
        String(event.EventType || ''),
        String(event.EventSubType || ''),
        description,
      );

      return {
        id: `on511:${String(event.ID ?? '')}`,
        eventType,
        description,
        roadway: String(event.RoadwayName || '').trim() || null,
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
      if (!coords || !inOttawa(coords.lat, coords.lng)) return null;

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

async function loadSourceIncidents(): Promise<Record<SourceKey, NormalizedIncident[]>> {
  const [on511, ottawaTraffic] = await Promise.all([
    fetchOntario511Incidents(),
    fetchOttawaTrafficIncidents(),
  ]);

  return {
    on511,
    ottawa_traffic: ottawaTraffic,
  };
}

async function runMonitor(): Promise<void> {
  monitorState.lastRunAt = new Date().toISOString();
  monitorState.lastError = null;

  try {
    const sourceIncidents = await loadSourceIncidents();
    const all = [...sourceIncidents.on511, ...sourceIncidents.ottawa_traffic];

    monitorState.sourceStats = {
      on511: {
        fetched: sourceIncidents.on511.length,
        eligible: sourceIncidents.on511.filter((incident) => incident.alerted).length,
        inserted: 0,
      },
      ottawa_traffic: {
        fetched: sourceIncidents.ottawa_traffic.length,
        eligible: sourceIncidents.ottawa_traffic.filter((incident) => incident.alerted).length,
        inserted: 0,
      },
    };

    if (all.length === 0) {
      monitorState.lastSuccessAt = new Date().toISOString();
      console.log('[monitor] no Ottawa incidents matched current filters');
      return;
    }

    const ids = all.map((incident) => incident.id);
    const seen = await db
      .select({ id: incidents.id })
      .from(incidents)
      .where(inArray(incidents.id, ids));

    const seenSet = new Set(seen.map((item) => item.id));
    const fresh = all.filter((incident) => !seenSet.has(incident.id));

    if (fresh.length === 0) {
      monitorState.lastSuccessAt = new Date().toISOString();
      console.log(
        `[monitor] checked ${all.length} Ottawa incidents across ${INCIDENT_SOURCES.length} sources; no new incidents`,
      );
      return;
    }

    let alertCount = 0;

    for (const incident of fresh) {
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
        alerted: incident.alerted,
        createdAt: new Date().toISOString(),
        source: incident.sourceKey,
      });

      if (incident.alerted) {
        const location = incident.roadway || incident.description.slice(0, 80) || 'Ottawa area';
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

    monitorState.lastSuccessAt = new Date().toISOString();
    console.log(
      `[monitor] ${fresh.length} new Ottawa incidents from ${INCIDENT_SOURCES.length} sources - ${alertCount} operator alerts sent`,
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown monitor error';
    monitorState.lastError = message;
    console.error('[monitor] poll failed:', err);
  }
}

export function getIncidentMonitorInfo(): MonitorState {
  return {
    ...monitorState,
    sourceStats: {
      on511: { ...monitorState.sourceStats.on511 },
      ottawa_traffic: { ...monitorState.sourceStats.ottawa_traffic },
    },
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
    `[monitor] Ottawa incident monitor started - ${INCIDENT_SOURCES.length} official sources, polling every 3 min`,
  );
}
