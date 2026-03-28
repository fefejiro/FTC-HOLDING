/**
 * Ontario 511 incident monitor for Ottawa area.
 * Polls https://511on.ca/api/v2/get/event every 3 minutes.
 * No API key required. Deduplicates by event ID.
 * Sends push notification to all active operators for relevant incident types.
 */

import { db } from './db';
import { incidents } from './schema';
import { inArray } from 'drizzle-orm';
import { sendToAllActiveOperators } from './push';
import { sseBroadcast } from './sse';

// Ottawa bounding box (approximate)
const OTTAWA = { north: 45.53, south: 45.15, west: -76.35, east: -75.25 };

// Event types worth alerting the operator about
const RELEVANT = new Set([
  'VEHICLE_BREAKDOWN',
  'STALLED_VEHICLE',
  'DISABLED_VEHICLE',
  'ACCIDENT',
  'COLLISION',
  'VEHICLE_FIRE',
  'HAZARD',
  'DEBRIS',
]);

interface On511Event {
  ID: string;
  EventType: string;
  Description: string;
  RoadwayName?: string;
  Severity?: string;
  StartDate?: string;
  LastUpdated?: string;
  Geography?: { Coordinates?: number[] }; // [lng, lat]
}

function inOttawa(lat: number, lng: number): boolean {
  return lat >= OTTAWA.south && lat <= OTTAWA.north && lng >= OTTAWA.west && lng <= OTTAWA.east;
}

function prettyType(type: string): string {
  const map: Record<string, string> = {
    VEHICLE_BREAKDOWN: 'Breakdown',
    STALLED_VEHICLE: 'Stalled vehicle',
    DISABLED_VEHICLE: 'Disabled vehicle',
    ACCIDENT: 'Accident',
    COLLISION: 'Collision',
    VEHICLE_FIRE: 'Vehicle fire',
    HAZARD: 'Road hazard',
    DEBRIS: 'Debris on road',
  };
  return map[type?.toUpperCase()] || type || 'Road incident';
}

async function fetchOttawaEvents(): Promise<On511Event[]> {
  const res = await fetch('https://511on.ca/api/v2/get/event', {
    headers: { 'User-Agent': 'dispatch-app/1.0 (contact@unalabs.cloud)' },
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) return [];

  const raw = await res.json();
  const all: On511Event[] = Array.isArray(raw) ? raw : (raw.Events ?? raw.events ?? []);

  return all.filter(e => {
    const coords = e.Geography?.Coordinates;
    if (!coords || coords.length < 2) return false;
    const [lng, lat] = coords;
    return inOttawa(lat, lng);
  });
}

async function runMonitor(): Promise<void> {
  try {
    const events = await fetchOttawaEvents();
    if (events.length === 0) return;

    const ids = events.map(e => e.ID).filter(Boolean);

    // Find which IDs we've already stored
    const seen = await db
      .select({ id: incidents.id })
      .from(incidents)
      .where(inArray(incidents.id, ids));

    const seenSet = new Set(seen.map(s => s.id));
    const fresh = events.filter(e => !seenSet.has(e.ID));
    if (fresh.length === 0) return;

    let alertCount = 0;

    for (const e of fresh) {
      const [lng, lat] = e.Geography!.Coordinates!;
      const isRelevant = RELEVANT.has(e.EventType?.toUpperCase());

      await db.insert(incidents).values({
        id: e.ID,
        eventType: e.EventType,
        description: e.Description,
        roadway: e.RoadwayName,
        locationLat: lat,
        locationLng: lng,
        severity: e.Severity,
        startDate: e.StartDate,
        lastUpdated: e.LastUpdated,
        alerted: isRelevant,
        alertedAt: isRelevant ? new Date() : null,
      }).onConflictDoNothing();

      if (isRelevant) {
        const location = e.RoadwayName || e.Description?.slice(0, 80) || 'Ottawa area';
        const alertPayload = {
          title: '🚨 Incident Alert',
          body: `${prettyType(e.EventType)} — ${location}`,
          data: { incidentId: e.ID, lat: String(lat), lng: String(lng), source: 'on511' },
        };

        // SSE — push to all connected operator browsers instantly
        sseBroadcast('incident:new', {
          id: e.ID,
          eventType: e.EventType,
          description: e.Description,
          roadway: e.RoadwayName,
          locationLat: lat,
          locationLng: lng,
          severity: e.Severity,
          alerted: true,
          createdAt: new Date().toISOString(),
        });

        // Web push — for operators not currently on screen
        sendToAllActiveOperators(alertPayload).catch(() => {});
        alertCount++;
      }
    }

    console.log(`[monitor] ${fresh.length} new Ottawa events — ${alertCount} operator alerts sent`);
  } catch (err) {
    console.error('[monitor] poll failed:', err);
  }
}

export function startIncidentMonitor(): void {
  const INTERVAL = 3 * 60 * 1_000; // 3 minutes

  // Initial run shortly after boot
  setTimeout(() => {
    runMonitor();
    setInterval(runMonitor, INTERVAL);
  }, 10_000);

  console.log('[monitor] Ontario 511 Ottawa monitor started — polling every 3 min');
}
