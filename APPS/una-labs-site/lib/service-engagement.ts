export type ActivationBandId =
  | 'founding_pilot_activation'
  | 'simple_activation'
  | 'standard_activation'
  | 'complex_activation';

export type ServiceTypeId = 'custom_project_activation';

export const ACTIVATION_BANDS: Array<{
  id: ActivationBandId;
  label: string;
  shortLabel: string;
  price: number;
  description: string;
  note: string;
  founderOverride?: boolean;
  creditTowardBuild?: boolean;
}> = [
  {
    id: 'founding_pilot_activation',
    label: 'Founding Pilot Activation',
    shortLabel: 'Founding Pilot',
    price: 67,
    description: 'For founder-approved pilot cases like David Jumbo.',
    note: 'One captured intake, one scope pack, and one follow-up clarification round. Credited toward the first build payment.',
    founderOverride: true,
    creditTowardBuild: true,
  },
  {
    id: 'simple_activation',
    label: 'Simple Project Activation',
    shortLabel: 'Simple Activation',
    price: 250,
    description: 'For smaller custom projects that need a clear brief and recommendation.',
    note: 'Includes intake review, structured brief, solution direction, and first pricing recommendation.',
  },
  {
    id: 'standard_activation',
    label: 'Standard Custom Scoping',
    shortLabel: 'Standard Scoping',
    price: 500,
    description: 'For typical custom product or workflow engagements.',
    note: 'Includes structured discovery, project brief, phased roadmap, and build recommendation.',
  },
  {
    id: 'complex_activation',
    label: 'Complex Discovery and Architecture',
    shortLabel: 'Complex Discovery',
    price: 1000,
    description: 'For larger multi-part systems that need deeper planning before build.',
    note: 'Includes architecture framing, phased scope, solution recommendation, and initial commercial guidance.',
  },
];

export const ACTIVATION_BAND_BY_ID = Object.fromEntries(
  ACTIVATION_BANDS.map((band) => [band.id, band]),
) as Record<ActivationBandId, (typeof ACTIVATION_BANDS)[number]>;

export const CUSTOM_PROJECT_SERVICE_TYPE: {
  id: ServiceTypeId;
  label: string;
  description: string;
} = {
  id: 'custom_project_activation',
  label: 'Custom Project Activation',
  description:
    'Service-led onboarding for concierge custom builds, from intake through scoped plan and build deposit.',
};

export function isActivationBandId(value: string): value is ActivationBandId {
  return value in ACTIVATION_BAND_BY_ID;
}

export function getActivationBandLabel(value?: string): string | null {
  if (!value || !isActivationBandId(value)) return null;
  return ACTIVATION_BAND_BY_ID[value].label;
}

export function getActivationBandPrice(value?: string): number | null {
  if (!value || !isActivationBandId(value)) return null;
  return ACTIVATION_BAND_BY_ID[value].price;
}

const SUBSCRIPTION_LABELS: Record<string, string> = {
  starter: 'Starter Plan',
  professional: 'Professional Plan',
  agency: 'Agency Plan',
  enterprise: 'Enterprise Plan',
};

export function getCommercialLabel(value?: string): string {
  if (!value) return 'Your project';
  if (isActivationBandId(value)) {
    return ACTIVATION_BAND_BY_ID[value].label;
  }
  return SUBSCRIPTION_LABELS[value.toLowerCase()] ?? value;
}

export function getCommercialBillingLabel(billing?: string): string {
  if (!billing || billing === 'one_time') return '';
  if (billing === 'annual') return 'Annual';
  if (billing === 'monthly') return 'Monthly';
  return billing;
}

export function isActivationCommercial(value?: string): boolean {
  return Boolean(value && isActivationBandId(value));
}
