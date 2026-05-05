type OttawaIncidentLike = {
  id?: string | null;
  roadway?: string | null;
  description?: string | null;
  locationLat?: number | null;
  locationLng?: number | null;
};

export const OTTAWA_CENTER = {
  lat: 45.4215,
  lng: -75.6972,
} as const;

const OTTAWA_BOUNDS = {
  north: 45.62,
  south: 45.05,
  west: -76.35,
  east: -75.2,
} as const;

const OTTAWA_AREA_TERMS = [
  'ottawa',
  'kanata',
  'orleans',
  'nepean',
  'barrhaven',
  'gloucester',
  'vanier',
  'manotick',
  'stittsville',
  'bells corners',
  'rockcliffe',
  'cumberland',
  'osgoode',
  'carp',
  'greely',
] as const;

export function isWithinOttawaBounds(lat: number | null | undefined, lng: number | null | undefined) {
  if (typeof lat !== 'number' || typeof lng !== 'number') return false;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;
  return lat >= OTTAWA_BOUNDS.south && lat <= OTTAWA_BOUNDS.north && lng >= OTTAWA_BOUNDS.west && lng <= OTTAWA_BOUNDS.east;
}

export function matchesOttawaText(value: string | null | undefined) {
  const text = String(value || '').toLowerCase();
  if (!text.trim()) return false;
  return OTTAWA_AREA_TERMS.some((term) => text.includes(term));
}

export function isOttawaScopedIncident(incident: OttawaIncidentLike) {
  const id = String(incident.id || '');
  if (id.startsWith('ottawa_traffic:') || id.startsWith('octranspo:')) return true;
  if (isWithinOttawaBounds(incident.locationLat, incident.locationLng)) return true;
  return matchesOttawaText(`${incident.roadway || ''} ${incident.description || ''}`);
}
