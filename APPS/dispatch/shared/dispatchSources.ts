import type { DispatchRegionKey } from './dispatchRegions';

export type DispatchSourceKey = 'on511' | 'ottawa_traffic' | 'octranspo' | 'tomtom' | 'waze';
export type DispatchSourceTier = 'official' | 'commercial_fallback' | 'experimental';
export type DispatchSourceKind = 'traffic' | 'transit' | 'crowd';

export type DispatchSourceDef = {
  key: DispatchSourceKey;
  label: string;
  prefix: string;
  trustTier: DispatchSourceTier;
  tierLabel: string;
  kind: DispatchSourceKind;
  enabledRegions: DispatchRegionKey[];
  requiresKey: boolean;
  pollPolicy: string;
  supportsActionableSignals: boolean;
  statusLabel: string;
  url: string;
};

export const DISPATCH_SOURCES: DispatchSourceDef[] = [
  {
    key: 'on511',
    label: 'Ontario 511',
    prefix: 'on511:',
    trustTier: 'official',
    tierLabel: 'Official',
    kind: 'traffic',
    enabledRegions: ['ottawa', 'gta'],
    requiresKey: false,
    pollPolicy: 'Main poll',
    supportsActionableSignals: true,
    statusLabel: 'Province-wide official backbone',
    url: 'https://511on.ca/api/v2/get/event',
  },
  {
    key: 'ottawa_traffic',
    label: 'City of Ottawa traffic',
    prefix: 'ottawa_traffic:',
    trustTier: 'official',
    tierLabel: 'Official',
    kind: 'traffic',
    enabledRegions: ['ottawa'],
    requiresKey: false,
    pollPolicy: 'Main poll',
    supportsActionableSignals: true,
    statusLabel: 'Official Ottawa-only traffic feed',
    url: 'https://traffic.ottawa.ca/map/service/events?accept-language=en',
  },
  {
    key: 'octranspo',
    label: 'OC Transpo service alerts',
    prefix: 'octranspo:',
    trustTier: 'official',
    tierLabel: 'Official',
    kind: 'transit',
    enabledRegions: ['ottawa'],
    requiresKey: false,
    pollPolicy: 'Main poll',
    supportsActionableSignals: false,
    statusLabel: 'Official Ottawa-only transit feed',
    url: 'https://www.octranspo.com/feeds/updates-en/',
  },
  {
    key: 'tomtom',
    label: 'TomTom traffic',
    prefix: 'tomtom:',
    trustTier: 'commercial_fallback',
    tierLabel: 'Commercial fallback',
    kind: 'traffic',
    enabledRegions: ['ottawa', 'gta'],
    requiresKey: true,
    pollPolicy: 'Main poll',
    supportsActionableSignals: true,
    statusLabel: 'Commercial continuity coverage',
    url: 'https://api.tomtom.com/traffic/services/5/incidentDetails',
  },
  {
    key: 'waze',
    label: 'Waze (experimental)',
    prefix: 'waze:',
    trustTier: 'experimental',
    tierLabel: 'Experimental',
    kind: 'crowd',
    enabledRegions: ['ottawa', 'gta'],
    requiresKey: true,
    pollPolicy: 'Background poll + admin probe',
    supportsActionableSignals: true,
    statusLabel: 'Experimental crowd-sourced layer',
    url: 'https://waze.p.rapidapi.com/alerts-and-jams',
  },
];

export const DISPATCH_SOURCE_BY_KEY: Record<DispatchSourceKey, DispatchSourceDef> =
  DISPATCH_SOURCES.reduce((acc, source) => {
    acc[source.key] = source;
    return acc;
  }, {} as Record<DispatchSourceKey, DispatchSourceDef>);

export function isDispatchSourceKey(value: unknown): value is DispatchSourceKey {
  return DISPATCH_SOURCES.some((source) => source.key === value);
}

export function getDispatchSource(value: DispatchSourceKey): DispatchSourceDef {
  return DISPATCH_SOURCE_BY_KEY[value];
}

export function getDispatchSourceKeyFromIncidentId(id: string | null | undefined): DispatchSourceKey | null {
  const value = String(id || '');
  const match = DISPATCH_SOURCES.find((source) => value.startsWith(source.prefix));
  return match?.key ?? null;
}

export function isSourceEnabledInRegion(sourceKey: DispatchSourceKey, regionKey: DispatchRegionKey) {
  return DISPATCH_SOURCE_BY_KEY[sourceKey].enabledRegions.includes(regionKey);
}
