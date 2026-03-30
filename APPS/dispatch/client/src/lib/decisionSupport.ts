export type RequestServiceType = 'gas' | 'lockout' | 'jump' | 'tire' | 'other';

export type EmergencyScenario =
  | 'breakdown'
  | 'accident'
  | 'lockout'
  | 'unsafe_location'
  | 'medical'
  | 'safe_wait'
  | 'urgent_routing';

export type SupportLocationType =
  | 'hospital'
  | 'police_post'
  | 'fire_station'
  | 'rescue_facility'
  | 'tow_truck'
  | 'mechanic'
  | 'locksmith'
  | 'gas_station'
  | 'ev_charging'
  | 'mall'
  | 'rest_stop'
  | 'hotel'
  | 'safe_public'
  | 'pharmacy'
  | 'transit_hub'
  | 'shelter'
  | 'safe_pull_off';

export type DecisionTier = 'emergency' | 'recommended' | 'safe_wait' | 'practical' | 'fallback';

export type DecisionActionId =
  | 'call_now'
  | 'call_emergency'
  | 'call_non_emergency'
  | 'navigate'
  | 'share_location'
  | 'status_update'
  | 'save_fallback'
  | 'request_dispatch'
  | 'mark_going'
  | 'mark_safe_wait'
  | 'vehicle_details'
  | 'set_check_in_reminder';

export interface UserPoint {
  lat: number;
  lng: number;
  label: string;
}

export interface SupportLocation {
  id: string;
  name: string;
  type: SupportLocationType;
  lat: number;
  lng: number;
  phone?: string;
  emergencyPhone?: string;
  nonEmergencyPhone?: string;
  open24h?: boolean;
  staffedLateNight?: boolean;
}

export interface RankedSupportLocation extends SupportLocation {
  distanceKm: number;
  etaMinutes: number;
}

export interface DecisionCardGroup {
  id: string;
  type: SupportLocationType;
  typeLabel: string;
  tier: DecisionTier;
  whyItMatters: string;
  actions: DecisionActionId[];
  alternatives: RankedSupportLocation[];
}

export interface DecisionPlan {
  scenario: EmergencyScenario;
  scenarioLabel: string;
  summary: string;
  urgencyLabel: 'critical' | 'high' | 'medium';
  recommendedNextActions: string[];
  recommended: DecisionCardGroup[];
  fallback: DecisionCardGroup[];
  computedFromExactLocation: boolean;
}

interface ScenarioRule {
  label: string;
  summary: string;
  urgencyLabel: 'critical' | 'high' | 'medium';
  recommendedNextActions: string[];
  recommendedTypes: Array<{ type: SupportLocationType; tier: DecisionTier; whyItMatters: string }>;
  fallbackTypes: Array<{ type: SupportLocationType; tier: DecisionTier; whyItMatters: string }>;
}

const OTTAWA_CENTER: UserPoint = {
  lat: 45.4215,
  lng: -75.6972,
  label: 'Ottawa centre',
};

export const SCENARIO_OPTIONS: Array<{ value: EmergencyScenario; label: string; short: string }> = [
  { value: 'breakdown', label: 'Vehicle breakdown', short: 'Breakdown' },
  { value: 'accident', label: 'Accident', short: 'Accident' },
  { value: 'lockout', label: 'Locked out', short: 'Lockout' },
  { value: 'unsafe_location', label: 'Unsafe location', short: 'Unsafe area' },
  { value: 'medical', label: 'Medical concern', short: 'Medical' },
  { value: 'safe_wait', label: 'Need a safe place to wait', short: 'Safe wait' },
  { value: 'urgent_routing', label: 'Need urgent routing help', short: 'Routing help' },
];

export const ACTION_LABELS: Record<DecisionActionId, string> = {
  call_now: 'Call now',
  call_emergency: 'Call emergency',
  call_non_emergency: 'Call non-emergency',
  navigate: 'Navigate',
  share_location: 'Share my location',
  status_update: 'Send status update',
  save_fallback: 'Save as fallback',
  request_dispatch: 'Request dispatch',
  mark_going: 'Mark as where I am going',
  mark_safe_wait: 'Mark as safe waiting place',
  vehicle_details: 'Send vehicle details',
  set_check_in_reminder: 'Set check-in reminder',
};

const TYPE_LABELS: Record<SupportLocationType, string> = {
  hospital: 'Hospital',
  police_post: 'Police / RCMP',
  fire_station: 'Fire station',
  rescue_facility: 'Rescue support',
  tow_truck: 'Tow truck',
  mechanic: 'Mechanic',
  locksmith: 'Locksmith',
  gas_station: 'Gas station',
  ev_charging: 'EV charging',
  mall: 'Mall',
  rest_stop: 'Rest stop',
  hotel: 'Hotel',
  safe_public: 'Safe public place',
  pharmacy: 'Pharmacy',
  transit_hub: 'Transit hub',
  shelter: 'Shelter',
  safe_pull_off: 'Safe pull-off',
};

const ACTIONS_BY_TYPE: Record<SupportLocationType, DecisionActionId[]> = {
  hospital: ['call_now', 'navigate', 'share_location', 'status_update', 'mark_going'],
  police_post: ['call_emergency', 'call_non_emergency', 'navigate', 'share_location', 'mark_going'],
  fire_station: ['call_now', 'navigate', 'share_location', 'mark_going'],
  rescue_facility: ['call_now', 'navigate', 'share_location', 'mark_going'],
  tow_truck: ['call_now', 'request_dispatch', 'vehicle_details', 'share_location', 'mark_going'],
  mechanic: ['call_now', 'request_dispatch', 'vehicle_details', 'share_location', 'mark_going'],
  locksmith: ['call_now', 'navigate', 'share_location', 'mark_going'],
  gas_station: ['navigate', 'call_now', 'save_fallback', 'mark_going'],
  ev_charging: ['navigate', 'call_now', 'save_fallback', 'mark_going'],
  mall: ['navigate', 'mark_safe_wait', 'status_update', 'set_check_in_reminder'],
  rest_stop: ['navigate', 'mark_safe_wait', 'status_update', 'set_check_in_reminder'],
  hotel: ['navigate', 'call_now', 'mark_safe_wait', 'status_update'],
  safe_public: ['navigate', 'mark_safe_wait', 'share_location', 'status_update'],
  pharmacy: ['navigate', 'call_now', 'save_fallback'],
  transit_hub: ['navigate', 'mark_safe_wait', 'status_update'],
  shelter: ['navigate', 'call_now', 'mark_safe_wait', 'status_update'],
  safe_pull_off: ['navigate', 'mark_safe_wait', 'status_update', 'save_fallback'],
};

// TODO(dispatch-action-integrations): Wire these action intents to:
// - provider dispatch APIs
// - live hours verification
// - operator-routing confidence and SLA scoring

const SCENARIO_RULES: Record<EmergencyScenario, ScenarioRule> = {
  breakdown: {
    label: 'Vehicle breakdown',
    summary: 'Prioritize getting safe first, then secure mechanical support.',
    urgencyLabel: 'high',
    recommendedNextActions: [
      'Move to a safe shoulder or public stop if possible.',
      'Contact tow or mechanic support.',
      'Share your location with a trusted contact.',
    ],
    recommendedTypes: [
      { type: 'tow_truck', tier: 'recommended', whyItMatters: 'Fastest path to vehicle recovery now.' },
      { type: 'safe_pull_off', tier: 'safe_wait', whyItMatters: 'Safer stop while waiting for assistance.' },
      { type: 'mechanic', tier: 'practical', whyItMatters: 'If the vehicle can be serviced nearby.' },
    ],
    fallbackTypes: [
      { type: 'gas_station', tier: 'fallback', whyItMatters: 'Practical fallback if fuel may be the issue.' },
      { type: 'hotel', tier: 'fallback', whyItMatters: 'Fallback waiting option in longer delays.' },
      { type: 'mall', tier: 'fallback', whyItMatters: 'Staffed public fallback while waiting.' },
    ],
  },
  accident: {
    label: 'Accident',
    summary: 'Emergency support and reporting should come before convenience.',
    urgencyLabel: 'critical',
    recommendedNextActions: [
      'Call emergency services first if there is injury, danger, or blocked traffic.',
      'Share your exact location with emergency responders or trusted contact.',
      'Use tow support after emergency and safety checks.',
    ],
    recommendedTypes: [
      { type: 'police_post', tier: 'emergency', whyItMatters: 'Critical for incident reporting and urgent support.' },
      { type: 'hospital', tier: 'emergency', whyItMatters: 'Medical support if anyone may be injured.' },
      { type: 'tow_truck', tier: 'recommended', whyItMatters: 'Vehicle removal once scene is safe.' },
    ],
    fallbackTypes: [
      { type: 'fire_station', tier: 'fallback', whyItMatters: 'Emergency fallback if police support is delayed.' },
      { type: 'rescue_facility', tier: 'fallback', whyItMatters: 'Additional emergency support coverage.' },
      { type: 'safe_public', tier: 'safe_wait', whyItMatters: 'Safer waiting point when movement is needed.' },
    ],
  },
  lockout: {
    label: 'Lockout',
    summary: 'Get lockout help quickly and avoid waiting in unsafe spots.',
    urgencyLabel: 'high',
    recommendedNextActions: [
      'Call locksmith support first.',
      'Move to a safer public point if the current area feels unsafe.',
      'Share your status with a trusted contact.',
    ],
    recommendedTypes: [
      { type: 'locksmith', tier: 'recommended', whyItMatters: 'Primary resolution for lockout situations.' },
      { type: 'safe_public', tier: 'safe_wait', whyItMatters: 'Safer place while waiting for locksmith.' },
      { type: 'hotel', tier: 'fallback', whyItMatters: 'Indoor staffed fallback if delay is expected.' },
    ],
    fallbackTypes: [
      { type: 'mall', tier: 'fallback', whyItMatters: 'Public staffed fallback nearby.' },
      { type: 'police_post', tier: 'fallback', whyItMatters: 'Escalation point if safety risk increases.' },
      { type: 'transit_hub', tier: 'fallback', whyItMatters: 'Alternative staffed public fallback.' },
    ],
  },
  unsafe_location: {
    label: 'Unsafe location',
    summary: 'Safety and visibility should outrank convenience.',
    urgencyLabel: 'critical',
    recommendedNextActions: [
      'Move to a staffed public place immediately if safe to do so.',
      'Share your location with a trusted contact.',
      'Use emergency call options if you feel in immediate danger.',
    ],
    recommendedTypes: [
      { type: 'police_post', tier: 'emergency', whyItMatters: 'Immediate support if there is active risk.' },
      { type: 'fire_station', tier: 'recommended', whyItMatters: 'Staffed emergency support location.' },
      { type: 'safe_public', tier: 'safe_wait', whyItMatters: 'Visible public waiting point quickly.' },
    ],
    fallbackTypes: [
      { type: 'hotel', tier: 'fallback', whyItMatters: 'Staffed indoor fallback at night.' },
      { type: 'mall', tier: 'fallback', whyItMatters: 'Public fallback where available.' },
      { type: 'shelter', tier: 'fallback', whyItMatters: 'Fallback support point when needed.' },
      { type: 'transit_hub', tier: 'fallback', whyItMatters: 'Alternative lit and public location.' },
    ],
  },
  medical: {
    label: 'Medical concern',
    summary: 'Medical support should lead, transport convenience comes later.',
    urgencyLabel: 'critical',
    recommendedNextActions: [
      'Call emergency services for severe symptoms or urgent danger.',
      'Navigate to the nearest emergency-capable hospital.',
      'Share your route and location with a trusted contact.',
    ],
    recommendedTypes: [
      { type: 'hospital', tier: 'emergency', whyItMatters: 'Best option for urgent medical assessment.' },
      { type: 'rescue_facility', tier: 'recommended', whyItMatters: 'Additional emergency support nearby.' },
      { type: 'police_post', tier: 'fallback', whyItMatters: 'Escalation support when immediate help is needed.' },
    ],
    fallbackTypes: [
      { type: 'pharmacy', tier: 'fallback', whyItMatters: 'Practical fallback for non-emergency support.' },
      { type: 'safe_public', tier: 'safe_wait', whyItMatters: 'Safer waiting spot while arranging transport.' },
    ],
  },
  safe_wait: {
    label: 'Need a safe place to wait',
    summary: 'Prioritize staffed, visible, and easier-to-access places.',
    urgencyLabel: 'medium',
    recommendedNextActions: [
      'Move to a staffed public place nearby.',
      'Share where you are going with a trusted contact.',
      'Set a quick check-in reminder.',
    ],
    recommendedTypes: [
      { type: 'safe_public', tier: 'safe_wait', whyItMatters: 'Primary safe waiting recommendation.' },
      { type: 'mall', tier: 'recommended', whyItMatters: 'Public indoor waiting location.' },
      { type: 'hotel', tier: 'recommended', whyItMatters: 'Staffed indoor fallback option.' },
    ],
    fallbackTypes: [
      { type: 'rest_stop', tier: 'fallback', whyItMatters: 'Roadside fallback waiting location.' },
      { type: 'transit_hub', tier: 'fallback', whyItMatters: 'Public and visible fallback point.' },
      { type: 'gas_station', tier: 'fallback', whyItMatters: 'Practical stop while waiting for next step.' },
    ],
  },
  urgent_routing: {
    label: 'Need urgent routing help',
    summary: 'Stabilize position first, then choose safest practical route.',
    urgencyLabel: 'high',
    recommendedNextActions: [
      'Move to a safe pull-off point before planning next movement.',
      'Navigate to a practical staffed stop.',
      'Share your intended route with a trusted contact.',
    ],
    recommendedTypes: [
      { type: 'safe_pull_off', tier: 'safe_wait', whyItMatters: 'Stabilize in a safer stop before next move.' },
      { type: 'transit_hub', tier: 'recommended', whyItMatters: 'Staffed point for route reset.' },
      { type: 'gas_station', tier: 'practical', whyItMatters: 'Practical stop with basic support access.' },
    ],
    fallbackTypes: [
      { type: 'hotel', tier: 'fallback', whyItMatters: 'Fallback if routing risk remains high.' },
      { type: 'mall', tier: 'fallback', whyItMatters: 'Alternative staffed public fallback.' },
      { type: 'police_post', tier: 'fallback', whyItMatters: 'Escalation option for unsafe routing context.' },
    ],
  },
};

// TODO(dispatch-live-places): Replace these seeded Ottawa points with live providers:
// - emergency infrastructure registry (hospital, police, fire, rescue)
// - tow/mechanic/locksmith partner feeds with serviceability + ETA
// - opening-hours and staffing feeds for late-night confidence scoring
const SUPPORT_LOCATIONS: SupportLocation[] = [
  { id: 'hospital-ottawa', name: 'Ottawa Hospital Civic Campus', type: 'hospital', lat: 45.3995, lng: -75.7187, phone: '+16137617300', open24h: true, staffedLateNight: true },
  { id: 'hospital-queensway', name: 'Queensway Carleton Hospital', type: 'hospital', lat: 45.3336, lng: -75.8098, phone: '+16137213200', open24h: true, staffedLateNight: true },
  { id: 'police-ottawa', name: 'Ottawa Police Elgin District', type: 'police_post', lat: 45.4205, lng: -75.6914, emergencyPhone: '911', nonEmergencyPhone: '+16132361222', staffedLateNight: true },
  { id: 'police-west', name: 'Ottawa Police West District', type: 'police_post', lat: 45.3048, lng: -75.8946, emergencyPhone: '911', nonEmergencyPhone: '+16132361222', staffedLateNight: true },
  { id: 'fire-central', name: 'Ottawa Fire Station 11', type: 'fire_station', lat: 45.4243, lng: -75.6998, emergencyPhone: '911', staffedLateNight: true },
  { id: 'fire-nepean', name: 'Ottawa Fire Station 23', type: 'fire_station', lat: 45.3489, lng: -75.7589, emergencyPhone: '911', staffedLateNight: true },
  { id: 'rescue-paramedic', name: 'Ottawa Paramedic Operations', type: 'rescue_facility', lat: 45.4014, lng: -75.6534, emergencyPhone: '911', staffedLateNight: true },
  { id: 'tow-kanata', name: 'Metro Tow Kanata', type: 'tow_truck', lat: 45.3012, lng: -75.9196, phone: '+16137234000', open24h: true, staffedLateNight: true },
  { id: 'tow-east', name: 'Ottawa East Tow', type: 'tow_truck', lat: 45.4532, lng: -75.5375, phone: '+16137415222', open24h: true, staffedLateNight: true },
  { id: 'mechanic-central', name: 'Downtown Auto Service', type: 'mechanic', lat: 45.4171, lng: -75.7036, phone: '+16135551200' },
  { id: 'mechanic-west', name: 'West End Auto Garage', type: 'mechanic', lat: 45.334, lng: -75.8132, phone: '+16135551201' },
  { id: 'locksmith-core', name: 'Ottawa Rapid Locksmith', type: 'locksmith', lat: 45.4247, lng: -75.6954, phone: '+16135551300', staffedLateNight: true },
  { id: 'locksmith-south', name: 'South Keys Locksmith', type: 'locksmith', lat: 45.3506, lng: -75.6461, phone: '+16135551301' },
  { id: 'gas-bank', name: 'Bank St 24h Fuel', type: 'gas_station', lat: 45.3948, lng: -75.6845, phone: '+16135551400', open24h: true, staffedLateNight: true },
  { id: 'gas-huntclub', name: 'Hunt Club Fuel Stop', type: 'gas_station', lat: 45.3331, lng: -75.6306, phone: '+16135551401', open24h: true, staffedLateNight: true },
  { id: 'ev-bayshore', name: 'Bayshore EV Hub', type: 'ev_charging', lat: 45.3481, lng: -75.8049, phone: '+16135551500' },
  { id: 'ev-orleans', name: 'Orleans EV Charge Point', type: 'ev_charging', lat: 45.4792, lng: -75.5139, phone: '+16135551501' },
  { id: 'mall-rideau', name: 'Rideau Centre', type: 'mall', lat: 45.4254, lng: -75.6934, open24h: false, staffedLateNight: false },
  { id: 'mall-bayshore', name: 'Bayshore Shopping Centre', type: 'mall', lat: 45.3494, lng: -75.8061, open24h: false, staffedLateNight: false },
  { id: 'reststop-417e', name: 'ONroute 417 Eastbound', type: 'rest_stop', lat: 45.3775, lng: -75.0874, open24h: true, staffedLateNight: true },
  { id: 'reststop-417w', name: 'ONroute 417 Westbound', type: 'rest_stop', lat: 45.318, lng: -76.1646, open24h: true, staffedLateNight: true },
  { id: 'hotel-centre', name: 'Downtown Ottawa Hotel', type: 'hotel', lat: 45.421, lng: -75.6931, phone: '+16135551600', staffedLateNight: true },
  { id: 'hotel-airport', name: 'Airport Stay Hotel', type: 'hotel', lat: 45.3231, lng: -75.6691, phone: '+16135551601', staffedLateNight: true },
  { id: 'safe-public-cityhall', name: 'Ottawa City Hall Public Space', type: 'safe_public', lat: 45.4203, lng: -75.6922, staffedLateNight: true },
  { id: 'safe-public-library', name: 'Main Public Library District', type: 'safe_public', lat: 45.4175, lng: -75.7052, staffedLateNight: false },
  { id: 'pharmacy-24h', name: '24h Pharmacy Rideau', type: 'pharmacy', lat: 45.4262, lng: -75.6909, phone: '+16135551700', open24h: true, staffedLateNight: true },
  { id: 'pharmacy-west', name: 'Westboro Pharmacy', type: 'pharmacy', lat: 45.3932, lng: -75.7514, phone: '+16135551701' },
  { id: 'transit-tunneys', name: "Tunney's Pasture Station", type: 'transit_hub', lat: 45.4111, lng: -75.7368, staffedLateNight: true },
  { id: 'transit-hurdman', name: 'Hurdman Station', type: 'transit_hub', lat: 45.412, lng: -75.6638, staffedLateNight: true },
  { id: 'shelter-booth', name: 'Booth Shelter Point', type: 'shelter', lat: 45.4148, lng: -75.7115, phone: '+16135551800', staffedLateNight: true },
  { id: 'shelter-vanier', name: 'Vanier Support Shelter', type: 'shelter', lat: 45.4414, lng: -75.6579, phone: '+16135551801', staffedLateNight: true },
  { id: 'safepulloff-417carling', name: '417 Carling Safe Pull-off', type: 'safe_pull_off', lat: 45.3865, lng: -75.7563, open24h: true },
  { id: 'safepulloff-174montreal', name: '174 Montreal Rd Pull-off', type: 'safe_pull_off', lat: 45.4507, lng: -75.6024, open24h: true },
];

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function estimateEtaMinutes(distanceKm: number) {
  return Math.max(2, Math.round((distanceKm / 35) * 60));
}

function isLateNight(hour: number) {
  return hour >= 22 || hour < 6;
}

function rankLocationsByContext(
  locations: SupportLocation[],
  userPoint: UserPoint,
  hour: number,
): RankedSupportLocation[] {
  const lateNight = isLateNight(hour);
  return locations
    .map((location) => {
      const distanceKm = haversineKm(userPoint.lat, userPoint.lng, location.lat, location.lng);
      const etaMinutes = estimateEtaMinutes(distanceKm);
      const supportBias =
        lateNight && !location.open24h && !location.staffedLateNight ? 8 : 0;
      return {
        ...location,
        distanceKm,
        etaMinutes,
        sortScore: distanceKm + supportBias,
      };
    })
    .sort((a, b) => a.sortScore - b.sortScore || a.distanceKm - b.distanceKm)
    .map(({ sortScore: _ignore, ...rest }) => rest);
}

function buildGroups(
  entries: ScenarioRule['recommendedTypes'],
  rankedByType: Record<SupportLocationType, RankedSupportLocation[]>,
): DecisionCardGroup[] {
  return entries
    .map((entry) => {
      const alternatives = rankedByType[entry.type] || [];
      if (!alternatives.length) return null;
      return {
        id: `${entry.tier}-${entry.type}`,
        type: entry.type,
        typeLabel: TYPE_LABELS[entry.type],
        tier: entry.tier,
        whyItMatters: entry.whyItMatters,
        actions: ACTIONS_BY_TYPE[entry.type],
        alternatives: alternatives.slice(0, 3),
      } satisfies DecisionCardGroup;
    })
    .filter((item): item is DecisionCardGroup => Boolean(item));
}

export function inferScenarioFromServiceType(serviceType: RequestServiceType | null) {
  if (serviceType === 'lockout') return 'lockout';
  if (serviceType === 'gas' || serviceType === 'jump' || serviceType === 'tire') return 'breakdown';
  return 'breakdown' as EmergencyScenario;
}

export function getTierBadgeLabel(tier: DecisionTier) {
  if (tier === 'emergency') return 'Emergency';
  if (tier === 'recommended') return 'Recommended';
  if (tier === 'safe_wait') return 'Safe wait';
  if (tier === 'practical') return 'Practical support';
  return 'Fallback';
}

export function getScenarioLabel(scenario: EmergencyScenario) {
  return SCENARIO_RULES[scenario].label;
}

export function buildDecisionPlan(params: {
  scenario: EmergencyScenario;
  userPoint: UserPoint | null;
  now?: Date;
}): DecisionPlan {
  const { scenario, userPoint, now } = params;
  const rule = SCENARIO_RULES[scenario];
  const hour = (now || new Date()).getHours();
  const point = userPoint || OTTAWA_CENTER;

  const neededTypes = new Set<SupportLocationType>();
  rule.recommendedTypes.forEach((entry) => neededTypes.add(entry.type));
  rule.fallbackTypes.forEach((entry) => neededTypes.add(entry.type));

  const rankedByType = {} as Record<SupportLocationType, RankedSupportLocation[]>;
  for (const type of neededTypes) {
    const candidates = SUPPORT_LOCATIONS.filter((location) => location.type === type);
    rankedByType[type] = rankLocationsByContext(candidates, point, hour);
  }

  return {
    scenario,
    scenarioLabel: rule.label,
    summary: rule.summary,
    urgencyLabel: rule.urgencyLabel,
    recommendedNextActions: rule.recommendedNextActions,
    recommended: buildGroups(rule.recommendedTypes, rankedByType),
    fallback: buildGroups(rule.fallbackTypes, rankedByType),
    computedFromExactLocation: Boolean(userPoint),
  };
}
