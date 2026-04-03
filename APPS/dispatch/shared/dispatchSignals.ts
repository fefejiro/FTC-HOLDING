import { getDispatchSourceKeyFromIncidentId } from './dispatchSources';

export type ActionableIncidentLike = {
  id?: string | null;
  eventType?: string | null;
  description?: string | null;
  roadway?: string | null;
  alerted?: boolean | null;
};

const ACTIONABLE_EVENT_TYPES = new Set([
  'LOCKOUT_ASSIST',
  'BATTERY_ASSIST',
  'FUEL_ASSIST',
  'TIRE_ASSIST',
  'VEHICLE_BREAKDOWN',
  'STALLED_VEHICLE',
  'DISABLED_VEHICLE',
  'ACCIDENT',
  'COLLISION',
  'VEHICLE_FIRE',
  'HAZARD',
  'DEBRIS',
  'ROAD_CLOSURE',
]);

const ACTIONABLE_TEXT =
  /\b(accident|collision|disabled vehicle|stalled vehicle|breakdown|vehicle fire|hazard|debris|road closed|road closure|lane blocked|blocked lane|roadworks|construction|lockout|jump start|battery|fuel assist|out of gas|flat tire|blowout|puncture|detour|bridge closure)\b/i;

export function isActionableIncident(incident: ActionableIncidentLike) {
  const eventType = String(incident.eventType || '').toUpperCase();
  if (ACTIONABLE_EVENT_TYPES.has(eventType)) return true;

  const sourceKey = getDispatchSourceKeyFromIncidentId(incident.id);
  const text = `${incident.description || ''} ${incident.roadway || ''}`.trim();

  if (sourceKey === 'tomtom') {
    if (eventType === 'ROAD_EVENT') {
      return /\b(roadworks|construction|closure|blocked|hazard|obstruction|debris)\b/i.test(text);
    }
    return false;
  }

  if (sourceKey === 'octranspo') {
    return /\b(detour|station closure|service disruption|bridge closure|road closure)\b/i.test(text);
  }

  if (sourceKey === 'waze' && eventType === 'HAZARD') {
    return /\b(car stopped|vehicle stopped|hazard on road)\b/i.test(text);
  }

  if (incident.alerted) return true;
  return ACTIONABLE_TEXT.test(text);
}
