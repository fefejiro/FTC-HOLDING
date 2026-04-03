export type DispatchRegionKey = 'ottawa' | 'gta';

export type DispatchRegionBounds = {
  north: number;
  south: number;
  west: number;
  east: number;
};

export type DispatchRegionDef = {
  key: DispatchRegionKey;
  label: string;
  shortLabel: string;
  coverageLabel: string;
  center: {
    lat: number;
    lng: number;
    label: string;
  };
  bounds: DispatchRegionBounds;
  areaTerms: string[];
  locationSuffix: string;
};

export type RegionScopedIncidentLike = {
  id?: string | null;
  roadway?: string | null;
  description?: string | null;
  locationLat?: number | null;
  locationLng?: number | null;
};

export const DISPATCH_REGIONS: Record<DispatchRegionKey, DispatchRegionDef> = {
  ottawa: {
    key: 'ottawa',
    label: 'Ottawa',
    shortLabel: 'Ottawa',
    coverageLabel: 'Ottawa coverage',
    center: {
      lat: 45.4215,
      lng: -75.6972,
      label: 'Ottawa coverage',
    },
    bounds: {
      north: 45.62,
      south: 45.05,
      west: -76.35,
      east: -75.2,
    },
    areaTerms: [
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
    ],
    locationSuffix: 'Ottawa ON',
  },
  gta: {
    key: 'gta',
    label: 'GTA',
    shortLabel: 'GTA',
    coverageLabel: 'Greater Toronto Area coverage',
    center: {
      lat: 43.6532,
      lng: -79.3832,
      label: 'GTA coverage',
    },
    bounds: {
      north: 44.35,
      south: 43.25,
      west: -80.1,
      east: -78.7,
    },
    areaTerms: [
      'toronto',
      'north york',
      'scarborough',
      'etobicoke',
      'east york',
      'york',
      'mississauga',
      'brampton',
      'markham',
      'vaughan',
      'richmond hill',
      'pickering',
      'ajax',
      'whitby',
      'oakville',
      'burlington',
      'milton',
      'oshawa',
      'georgetown',
    ],
    locationSuffix: 'Toronto ON',
  },
};

export const DISPATCH_REGION_ORDER: DispatchRegionKey[] = ['ottawa', 'gta'];
export const DEFAULT_DISPATCH_REGION: DispatchRegionKey = 'ottawa';

export function isDispatchRegionKey(value: unknown): value is DispatchRegionKey {
  return value === 'ottawa' || value === 'gta';
}

export function getDispatchRegion(value: unknown): DispatchRegionDef {
  if (isDispatchRegionKey(value)) return DISPATCH_REGIONS[value];
  return DISPATCH_REGIONS[DEFAULT_DISPATCH_REGION];
}

export function isWithinRegionBounds(
  regionKey: DispatchRegionKey,
  lat: number | null | undefined,
  lng: number | null | undefined,
) {
  if (typeof lat !== 'number' || typeof lng !== 'number') return false;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;
  const bounds = DISPATCH_REGIONS[regionKey].bounds;
  return lat >= bounds.south && lat <= bounds.north && lng >= bounds.west && lng <= bounds.east;
}

export function matchesRegionText(regionKey: DispatchRegionKey, value: string | null | undefined) {
  const text = String(value || '').toLowerCase();
  if (!text.trim()) return false;
  return DISPATCH_REGIONS[regionKey].areaTerms.some((term) => text.includes(term));
}

export function isRegionScopedIncident(regionKey: DispatchRegionKey, incident: RegionScopedIncidentLike) {
  return (
    isWithinRegionBounds(regionKey, incident.locationLat, incident.locationLng) ||
    matchesRegionText(regionKey, `${incident.roadway || ''} ${incident.description || ''}`)
  );
}
