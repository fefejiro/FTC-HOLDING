import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  CircleDot,
  FileText,
  Fuel,
  KeyRound,
  Loader2,
  MapPin,
  Navigation2,
  Phone,
  ShieldAlert,
  User,
  Wrench,
  Zap,
} from 'lucide-react';
import { cn } from '../lib/cn';
import {
  ACTION_LABELS,
  type ActionIntentResult,
  buildDecisionPlan,
  buildDecisionPlanAsync,
  type DecisionActionId,
  type DecisionCardGroup,
  type DecisionPlan,
  type EmergencyScenario,
  executeActionIntent,
  getScenarioLabel,
  getTierBadgeLabel,
  inferScenarioFromServiceType,
  SCENARIO_OPTIONS,
  type RequestServiceType,
  type RankedSupportLocation,
} from '../lib/decisionSupport';

type ServiceType = RequestServiceType;
type PageState = 'form' | 'submitting' | 'success' | 'error';
type AddressSuggestion = {
  displayName: string;
  lat: number;
  lng: number;
};

const SERVICE_OPTIONS = [
  { type: 'gas' as ServiceType, Icon: Fuel, label: 'Gas Delivery' },
  { type: 'lockout' as ServiceType, Icon: KeyRound, label: 'Lockout' },
  { type: 'jump' as ServiceType, Icon: Zap, label: 'Jump Start' },
  { type: 'tire' as ServiceType, Icon: CircleDot, label: 'Tire Change' },
  { type: 'other' as ServiceType, Icon: Wrench, label: 'Other Issue' },
];

const SAVED_FALLBACKS_KEY = 'dispatch_saved_fallback_ids';

const TIER_STYLES: Record<ReturnType<typeof getTierBadgeLabel>, string> = {
  Emergency: 'border-red-500/40 bg-red-500/15 text-red-200',
  Recommended: 'border-emerald-500/35 bg-emerald-500/15 text-emerald-200',
  'Safe wait': 'border-cyan-500/35 bg-cyan-500/15 text-cyan-200',
  'Practical support': 'border-amber-500/35 bg-amber-500/15 text-amber-200',
  Fallback: 'border-slate-500/30 bg-slate-500/10 text-slate-300',
};

function formatDistanceEta(location: RankedSupportLocation) {
  return `${location.distanceKm.toFixed(1)} km - ~${location.etaMinutes} min`;
}

function locationMapsUrl(location: RankedSupportLocation) {
  return `https://maps.google.com/?q=${location.lat},${location.lng}`;
}

function buildLocationShareMessage(params: {
  scenario: EmergencyScenario;
  locationLabel: string;
  lat: number | null;
  lng: number | null;
  destinationName?: string;
}) {
  const scenarioLabel = getScenarioLabel(params.scenario);
  const coordinateLine =
    params.lat !== null && params.lng !== null
      ? `${params.lat.toFixed(5)}, ${params.lng.toFixed(5)}`
      : params.locationLabel || 'Ottawa area';
  const destinationLine = params.destinationName
    ? `Heading to: ${params.destinationName}.`
    : '';
  return `Dispatch update: ${scenarioLabel}. Current location: ${coordinateLine}. ${destinationLine}`.trim();
}

function uniqueById(groups: DecisionCardGroup[]) {
  const seen = new Set<string>();
  return groups.filter((group) => {
    if (seen.has(group.id)) return false;
    seen.add(group.id);
    return true;
  });
}

function resetFormState(
  setters: {
    setServiceType: (value: ServiceType | null) => void;
    setName: (value: string) => void;
    setPhone: (value: string) => void;
    setAddress: (value: string) => void;
    setNotes: (value: string) => void;
    setLocationLat: (value: number | null) => void;
    setLocationLng: (value: number | null) => void;
  },
) {
  setters.setServiceType(null);
  setters.setName('');
  setters.setPhone('');
  setters.setAddress('');
  setters.setNotes('');
  setters.setLocationLat(null);
  setters.setLocationLng(null);
}

export default function RequestPage() {
  const [serviceType, setServiceType] = useState<ServiceType | null>(null);
  const [scenario, setScenario] = useState<EmergencyScenario>('breakdown');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [locationLat, setLocationLat] = useState<number | null>(null);
  const [locationLng, setLocationLng] = useState<number | null>(null);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState('');
  const [locationSuggestions, setLocationSuggestions] = useState<AddressSuggestion[]>([]);
  const [searchingLocations, setSearchingLocations] = useState(false);
  const [pageState, setPageState] = useState<PageState>('form');
  const [errorMessage, setErrorMessage] = useState('');
  const [decisionNotice, setDecisionNotice] = useState('');
  const [destinationLocationId, setDestinationLocationId] = useState<string | null>(null);
  const [safeWaitLocationId, setSafeWaitLocationId] = useState<string | null>(null);
  const [cardAltIndex, setCardAltIndex] = useState<Record<string, number>>({});
  const [savedFallbackIds, setSavedFallbackIds] = useState<string[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const stored = localStorage.getItem(SAVED_FALLBACKS_KEY);
      const parsed = stored ? (JSON.parse(stored) as string[]) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });
  const notesRef = useRef<HTMLTextAreaElement | null>(null);
  const submitButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(SAVED_FALLBACKS_KEY, JSON.stringify(savedFallbackIds));
  }, [savedFallbackIds]);

  useEffect(() => {
    const q = address.trim();
    if (q.length < 4) {
      setLocationSuggestions([]);
      setSearchingLocations(false);
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        setSearchingLocations(true);
        const response = await fetch(`/api/geocode/search?q=${encodeURIComponent(q)}&limit=5`, {
          signal: controller.signal,
        });
        if (!response.ok) {
          setLocationSuggestions([]);
          return;
        }
        const data = (await response.json()) as AddressSuggestion[];
        setLocationSuggestions(Array.isArray(data) ? data : []);
      } catch {
        setLocationSuggestions([]);
      } finally {
        setSearchingLocations(false);
      }
    }, 300);

    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [address]);

  const userPoint = useMemo(
    () =>
      locationLat !== null && locationLng !== null
        ? {
            lat: locationLat,
            lng: locationLng,
            label: address.trim() || 'Current location',
          }
        : null,
    [address, locationLat, locationLng],
  );

  const [decisionPlan, setDecisionPlan] = useState<DecisionPlan>(() =>
    buildDecisionPlan({ scenario, userPoint: null }),
  );

  useEffect(() => {
    let cancelled = false;
    buildDecisionPlanAsync({ scenario, userPoint }).then((plan) => {
      if (!cancelled) setDecisionPlan(plan);
    });
    return () => {
      cancelled = true;
    };
  }, [scenario, userPoint]);

  const allDecisionGroups = useMemo(
    () => uniqueById([...decisionPlan.recommended, ...decisionPlan.fallback]),
    [decisionPlan.fallback, decisionPlan.recommended],
  );

  const selectedLocations = useMemo(() => {
    const selected = {} as Record<string, RankedSupportLocation>;
    for (const group of allDecisionGroups) {
      if (!group.alternatives.length) continue;
      const maxIndex = group.alternatives.length - 1;
      const currentIndex = Math.min(cardAltIndex[group.id] ?? 0, maxIndex);
      selected[group.id] = group.alternatives[currentIndex];
    }
    return selected;
  }, [allDecisionGroups, cardAltIndex]);

  function pushDecisionNotice(message: string) {
    setDecisionNotice(message);
    window.setTimeout(() => {
      setDecisionNotice((current) => (current === message ? '' : current));
    }, 3500);
  }

  function cycleAlternative(group: DecisionCardGroup) {
    if (group.alternatives.length <= 1) {
      pushDecisionNotice('No alternate nearby option found for this category.');
      return;
    }
    setCardAltIndex((current) => {
      const currentIndex = current[group.id] ?? 0;
      const nextIndex = (currentIndex + 1) % group.alternatives.length;
      return {
        ...current,
        [group.id]: nextIndex,
      };
    });
  }

  async function shareCurrentLocationText(text: string) {
    try {
      if (navigator.share) {
        await navigator.share({ text });
      } else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      }
      pushDecisionNotice('Location update is ready to share.');
    } catch {
      pushDecisionNotice('Could not open share flow. Try again.');
    }
  }

  function runDecisionAction(action: DecisionActionId, group: DecisionCardGroup) {
    const location = selectedLocations[group.id];
    if (!location) return;

    if (action === 'call_emergency') {
      window.location.href = `tel:${location.emergencyPhone || '911'}`;
      return;
    }

    if (action === 'call_non_emergency') {
      if (location.nonEmergencyPhone) {
        window.location.href = `tel:${location.nonEmergencyPhone}`;
      } else if (location.phone) {
        window.location.href = `tel:${location.phone}`;
      } else {
        pushDecisionNotice('No non-emergency number available for this location.');
      }
      return;
    }

    if (action === 'call_now') {
      if (!location.phone) {
        pushDecisionNotice('Call number not available. Try navigation or alternate.');
        return;
      }
      window.location.href = `tel:${location.phone}`;
      return;
    }

    if (action === 'navigate') {
      window.open(locationMapsUrl(location), '_blank', 'noopener,noreferrer');
      return;
    }

    if (action === 'share_location') {
      const text = buildLocationShareMessage({
        scenario,
        locationLabel: userPoint?.label || 'Ottawa area',
        lat: userPoint?.lat ?? null,
        lng: userPoint?.lng ?? null,
        destinationName: location.name,
      });
      void shareCurrentLocationText(text);
      return;
    }

    if (action === 'status_update') {
      const text = encodeURIComponent(
        buildLocationShareMessage({
          scenario,
          locationLabel: userPoint?.label || 'Ottawa area',
          lat: userPoint?.lat ?? null,
          lng: userPoint?.lng ?? null,
          destinationName: location.name,
        }),
      );
      window.location.href = `sms:?&body=${text}`;
      return;
    }

    if (action === 'save_fallback') {
      let wasSaved = false;
      setSavedFallbackIds((current) => {
        wasSaved = current.includes(location.id);
        return wasSaved
          ? current.filter((id) => id !== location.id)
          : [...current, location.id];
      });
      pushDecisionNotice(wasSaved ? `${location.name} removed from fallback list.` : `${location.name} saved as fallback option.`);
      return;
    }

    if (action === 'request_dispatch') {
      if (name.trim() && phone.trim()) {
        void executeActionIntent({
          action,
          location,
          scenario,
          userPoint,
          serviceType: serviceType || undefined,
          customerName: name,
          customerPhone: phone,
        }).then((result: ActionIntentResult) => {
          if (result.ok) {
            pushDecisionNotice(result.message);
          } else {
            submitButtonRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            pushDecisionNotice(result.message || 'Complete your intake and submit to request dispatch.');
          }
        });
      } else {
        submitButtonRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        pushDecisionNotice('Dispatch request ready below. Complete your intake and submit.');
      }
      return;
    }

    if (action === 'mark_going') {
      setDestinationLocationId(location.id);
      pushDecisionNotice(`Marked destination: ${location.name}.`);
      return;
    }

    if (action === 'mark_safe_wait') {
      setSafeWaitLocationId(location.id);
      pushDecisionNotice(`Marked safe waiting place: ${location.name}.`);
      return;
    }

    if (action === 'vehicle_details') {
      notesRef.current?.focus();
      pushDecisionNotice('Add vehicle details in the notes field.');
      return;
    }

    if (action === 'set_check_in_reminder') {
      pushDecisionNotice('Set a 15-minute check-in reminder on your phone.');
    }
  }

  async function handleUseMyLocation() {
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser.');
      return;
    }

    setLocating(true);
    setLocationError('');
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setLocationLat(lat);
        setLocationLng(lng);
        try {
          const res = await fetch(`/api/geocode/reverse?lat=${lat}&lng=${lng}`);
          if (res.ok) {
            const data = (await res.json()) as { displayName?: string };
            if (data.displayName) setAddress(data.displayName);
          }
        } catch {
          // Coordinates are still captured even if reverse geocoding fails.
        } finally {
          setLocating(false);
        }
      },
      (err) => {
        setLocating(false);
        setLocationError('Could not get your location. Please type your address below.');
        console.error('[geo]', err);
      },
      { timeout: 10_000 },
    );
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    if (!serviceType) {
      setErrorMessage('Please select a service type.');
      return;
    }
    if (!name.trim()) {
      setErrorMessage('Please enter your name.');
      return;
    }
    if (!phone.trim()) {
      setErrorMessage('Please enter your phone number.');
      return;
    }
    if (!address.trim() && !locationLat) {
      setErrorMessage('Please share your location or enter your address.');
      return;
    }

    setErrorMessage('');
    setPageState('submitting');

    const selectedDecisionLocations = Object.values(selectedLocations);
    const markedDestination = selectedDecisionLocations.find(
      (location) => location.id === destinationLocationId,
    );
    const markedSafeWait = selectedDecisionLocations.find(
      (location) => location.id === safeWaitLocationId,
    );
    const composedNotes = [
      `Situation: ${getScenarioLabel(scenario)}`,
      markedDestination ? `Planned destination: ${markedDestination.name}` : '',
      markedSafeWait ? `Safe wait point: ${markedSafeWait.name}` : '',
      notes.trim(),
    ]
      .filter(Boolean)
      .join('\n');

    try {
      const response = await fetch('/api/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: name.trim(),
          customerPhone: phone.trim(),
          serviceType,
          locationAddress: address.trim() || undefined,
          locationLat: locationLat ?? undefined,
          locationLng: locationLng ?? undefined,
          notes: composedNotes || undefined,
        }),
      });

      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        throw new Error(payload.error || 'Failed to submit request');
      }

      await response.json().catch(() => null);
      setPageState('success');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Something went wrong. Please try again.';
      setErrorMessage(message);
      setPageState('error');
    }
  }

  if (pageState === 'success') {
    return (
      <div className="min-h-dvh bg-dispatch-bg flex flex-col items-center justify-center px-6 py-10 text-center">
        <div className="w-full max-w-lg">
          <div className="w-20 h-20 bg-green-500/10 border border-green-500/25 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-10 h-10 text-green-400" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-3">Help is on the way.</h1>
          <p className="text-slate-400 leading-relaxed mb-2">
            We&apos;ll call you shortly at <span className="text-orange-400 font-semibold">{phone}</span>.
          </p>
          <p className="text-slate-600 text-sm">
            Stay with your vehicle if safe. Typical response: 20-40 minutes.
          </p>

          <button
            onClick={() => {
              setPageState('form');
              setScenario('breakdown');
              setDecisionNotice('');
              setDestinationLocationId(null);
              setSafeWaitLocationId(null);
              setCardAltIndex({});
              resetFormState({
                setServiceType,
                setName,
                setPhone,
                setAddress,
                setNotes,
                setLocationLat,
                setLocationLng,
              });
            }}
            className="mt-12 text-slate-700 text-xs hover:text-slate-500 transition-colors"
          >
            Submit another request
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-dispatch-bg flex flex-col">
      <div className="px-6 pt-14 pb-6 border-b border-dispatch-border">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 bg-orange-500 rounded-lg flex items-center justify-center shadow-lg shadow-orange-500/20">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <span className="text-orange-500 font-semibold text-sm tracking-wider uppercase">
              Dispatch
            </span>
          </div>
          <a href="/" className="text-xs text-slate-500 hover:text-orange-400 transition-colors">
            Back
          </a>
        </div>
        <h1 className="text-3xl font-bold text-white mt-3">Need help?</h1>
        <p className="text-slate-400 mt-1.5 text-[15px]">We will dispatch a technician to your location.</p>
      </div>

      <form onSubmit={handleSubmit} className="flex-1 px-6 py-7 flex flex-col gap-7 pb-10">
        <section className="rounded-2xl border border-cyan-500/20 bg-cyan-500/5 p-4">
          <label className="text-xs font-semibold text-cyan-200 uppercase tracking-[0.18em] mb-3 block">
            Situation Right Now
          </label>
          <div className="grid grid-cols-2 gap-2">
            {SCENARIO_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  setScenario(option.value);
                  setCardAltIndex({});
                }}
                className={cn(
                  'min-h-11 rounded-xl border px-3 py-3 text-left text-sm font-semibold transition-colors',
                  scenario === option.value
                    ? 'border-cyan-400 bg-cyan-400/15 text-white'
                    : 'border-dispatch-border bg-dispatch-surface text-slate-300 hover:text-white',
                )}
              >
                {option.short}
              </button>
            ))}
          </div>
          <div className="mt-3 rounded-xl border border-dispatch-border bg-dispatch-surface px-3 py-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-[11px] uppercase tracking-[0.16em] text-slate-500">Decision summary</div>
                <div className="mt-1 text-sm font-semibold text-white">{decisionPlan.scenarioLabel}</div>
              </div>
              <span
                className={cn(
                  'rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em]',
                  decisionPlan.urgencyLabel === 'critical'
                    ? 'border-red-500/35 bg-red-500/15 text-red-200'
                    : decisionPlan.urgencyLabel === 'high'
                      ? 'border-amber-500/35 bg-amber-500/15 text-amber-200'
                      : 'border-cyan-500/35 bg-cyan-500/15 text-cyan-200',
                )}
              >
                {decisionPlan.urgencyLabel}
              </span>
            </div>
            <p className="mt-2 text-sm text-slate-300 leading-relaxed">{decisionPlan.summary}</p>
            <div className="mt-3 flex items-start gap-2">
              <ShieldAlert className="w-4 h-4 text-cyan-300 mt-0.5 flex-shrink-0" />
              <ol className="space-y-1 text-xs text-slate-400">
                {decisionPlan.recommendedNextActions.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ol>
            </div>
          </div>
        </section>

        <div>
          <label className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3 block">
            What do you need?
          </label>
          <div className="grid grid-cols-2 gap-2.5">
            {SERVICE_OPTIONS.map(({ type, Icon, label }, index) => (
              <button
                key={type}
                type="button"
                onClick={() => {
                  setServiceType(type);
                  setScenario(inferScenarioFromServiceType(type));
                }}
                className={cn(
                  'flex items-center gap-3 px-4 py-4 rounded-xl border-2 text-left transition-all duration-150 min-h-11',
                  index === 4 && 'col-span-2',
                  serviceType === type
                    ? 'bg-orange-500/12 border-orange-500 text-white'
                    : 'bg-dispatch-surface border-dispatch-border text-slate-300 hover:border-slate-500 active:bg-slate-800',
                )}
              >
                <Icon
                  className={cn(
                    'w-5 h-5 flex-shrink-0 transition-colors',
                    serviceType === type ? 'text-orange-400' : 'text-slate-500',
                  )}
                />
                <span className="font-semibold text-sm leading-tight">{label}</span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2.5 block">
            Your Name
          </label>
          <div className="relative">
            <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
            <input
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="First and last name"
              autoComplete="name"
              className="w-full bg-dispatch-surface border border-dispatch-border rounded-xl pl-11 pr-4 py-4 text-white placeholder-slate-600 focus:outline-none focus:border-orange-500 transition-colors"
            />
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2.5 block">
            Phone Number
          </label>
          <div className="relative">
            <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
            <input
              type="tel"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              placeholder="613-555-0100"
              autoComplete="tel"
              className="w-full bg-dispatch-surface border border-dispatch-border rounded-xl pl-11 pr-4 py-4 text-white placeholder-slate-600 focus:outline-none focus:border-orange-500 transition-colors"
            />
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2.5 block">
            Your Location
          </label>
          <button
            type="button"
            onClick={handleUseMyLocation}
            disabled={locating}
            className={cn(
              'w-full flex items-center justify-center gap-2.5 py-3.5 rounded-xl border font-semibold text-sm transition-all mb-3 min-h-11',
              locating
                ? 'border-dispatch-border text-slate-500 cursor-wait bg-dispatch-surface'
                : locationLat
                  ? 'border-green-500/40 bg-green-500/10 text-green-400'
                  : 'border-orange-500/40 bg-orange-500/10 text-orange-400 hover:bg-orange-500/15 active:bg-orange-500/20',
            )}
          >
            {locating ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Navigation2 className={cn('w-4 h-4', locationLat ? 'text-green-400' : 'text-orange-400')} />
            )}
            {locating ? 'Getting your location...' : locationLat ? 'GPS location captured' : 'Use my GPS location'}
          </button>
          {locationError ? (
            <div className="flex items-start gap-2 text-red-400 text-xs mb-2.5">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
              <span>{locationError}</span>
            </div>
          ) : null}
          <div className="relative">
            <MapPin className="absolute left-4 top-4 w-4 h-4 text-slate-500 pointer-events-none" />
            <input
              type="text"
              value={address}
              onChange={(event) => {
                setAddress(event.target.value);
                setLocationLat(null);
                setLocationLng(null);
              }}
              placeholder="Or type your address"
              className="w-full bg-dispatch-surface border border-dispatch-border rounded-xl pl-11 pr-4 py-4 text-white placeholder-slate-600 focus:outline-none focus:border-orange-500 transition-colors text-sm"
            />
          </div>
          {searchingLocations ? (
            <p className="mt-2 text-xs text-slate-600">Searching Ontario addresses...</p>
          ) : null}
          {locationSuggestions.length > 0 ? (
            <div className="mt-2 rounded-xl border border-dispatch-border bg-dispatch-surface overflow-hidden">
              {locationSuggestions.map((item) => (
                <button
                  key={`${item.displayName}-${item.lat}-${item.lng}`}
                  type="button"
                  onClick={() => {
                    setAddress(item.displayName);
                    setLocationLat(item.lat);
                    setLocationLng(item.lng);
                    setLocationSuggestions([]);
                  }}
                  className="w-full text-left px-3 py-2.5 text-sm text-slate-300 hover:bg-dispatch-bg transition-colors border-b border-dispatch-border last:border-b-0 min-h-11"
                >
                  {item.displayName}
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <section className="rounded-2xl border border-dispatch-border bg-dispatch-surface p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-300">Nearby decision support</div>
              <h2 className="mt-1 text-lg font-semibold text-white">What matters nearby right now</h2>
            </div>
            <span className="text-[11px] text-slate-500 text-right">
              {decisionPlan.computedFromExactLocation
                ? 'Ranked from your current location'
                : 'Estimated from Ottawa centre until location is set'}
            </span>
          </div>

          {decisionNotice ? (
            <div className="mt-3 rounded-xl border border-cyan-500/25 bg-cyan-500/10 px-3 py-2 text-xs text-cyan-200">
              {decisionNotice}
            </div>
          ) : null}

          <div className="mt-4 space-y-3">
            {decisionPlan.recommended.map((group) => {
              const location = selectedLocations[group.id];
              if (!location) return null;
              const tierLabel = getTierBadgeLabel(group.tier);
              const primaryAction = group.actions[0];
              const secondaryActions = group.actions.slice(1, 5);
              const isSavedFallback = savedFallbackIds.includes(location.id);
              const isMarkedDestination = destinationLocationId === location.id;
              const isMarkedSafeWait = safeWaitLocationId === location.id;

              return (
                <article key={group.id} className="rounded-xl border border-dispatch-border bg-dispatch-bg px-3 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-[11px] uppercase tracking-[0.16em] text-slate-500">{group.typeLabel}</div>
                      <h3 className="text-sm font-semibold text-white mt-1">{location.name}</h3>
                    </div>
                    <span className={cn('rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em]', TIER_STYLES[tierLabel])}>
                      {tierLabel}
                    </span>
                  </div>
                  <div className="text-xs text-slate-400 mt-2">{formatDistanceEta(location)}</div>
                  <p className="text-xs text-slate-300 mt-2 leading-relaxed">{group.whyItMatters}</p>

                  {(isMarkedDestination || isMarkedSafeWait || isSavedFallback) ? (
                    <div className="mt-2 flex flex-wrap gap-1.5 text-[10px] uppercase tracking-[0.12em]">
                      {isMarkedDestination ? <span className="rounded-full border border-emerald-500/35 bg-emerald-500/10 px-2 py-1 text-emerald-200">Going here</span> : null}
                      {isMarkedSafeWait ? <span className="rounded-full border border-cyan-500/35 bg-cyan-500/10 px-2 py-1 text-cyan-200">Safe wait</span> : null}
                      {isSavedFallback ? <span className="rounded-full border border-amber-500/35 bg-amber-500/10 px-2 py-1 text-amber-200">Saved fallback</span> : null}
                    </div>
                  ) : null}

                  <button
                    type="button"
                    onClick={() => runDecisionAction(primaryAction, group)}
                    className="mt-3 w-full min-h-11 rounded-xl bg-orange-500 text-white text-sm font-semibold hover:bg-orange-400 transition-colors"
                  >
                    {ACTION_LABELS[primaryAction]}
                  </button>

                  <div className="mt-2 grid grid-cols-2 gap-2">
                    {secondaryActions.map((action) => (
                      <button
                        key={`${group.id}-${action}`}
                        type="button"
                        onClick={() => runDecisionAction(action, group)}
                        className={cn(
                          'min-h-11 rounded-xl border border-dispatch-border bg-dispatch-surface px-2 py-2 text-[11px] font-semibold text-slate-200 hover:text-white transition-colors',
                          action === 'save_fallback' && isSavedFallback && 'border-amber-500/40 bg-amber-500/10 text-amber-200',
                        )}
                      >
                        {action === 'save_fallback' && isSavedFallback ? 'Saved fallback' : ACTION_LABELS[action]}
                      </button>
                    ))}
                  </div>

                  {group.alternatives.length > 1 ? (
                    <button
                      type="button"
                      onClick={() => cycleAlternative(group)}
                      className="mt-2 min-h-11 w-full rounded-xl border border-cyan-500/30 bg-cyan-500/10 text-cyan-200 text-xs font-semibold hover:bg-cyan-500/20 transition-colors"
                    >
                      View alternate nearby option
                    </button>
                  ) : null}
                </article>
              );
            })}
          </div>

          {decisionPlan.fallback.length > 0 ? (
            <div className="mt-5">
              <div className="text-[11px] uppercase tracking-[0.16em] text-slate-500 mb-2">
                Fallback options
              </div>
              <div className="space-y-3">
                {decisionPlan.fallback.map((group) => {
                  const location = selectedLocations[group.id];
                  if (!location) return null;
                  const tierLabel = getTierBadgeLabel(group.tier);
                  const primaryAction = group.actions[0];

                  return (
                    <article key={group.id} className="rounded-xl border border-dispatch-border bg-dispatch-bg px-3 py-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-[11px] uppercase tracking-[0.16em] text-slate-500">{group.typeLabel}</div>
                          <h3 className="text-sm font-semibold text-white mt-1">{location.name}</h3>
                        </div>
                        <span className={cn('rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em]', TIER_STYLES[tierLabel])}>
                          {tierLabel}
                        </span>
                      </div>
                      <div className="text-xs text-slate-400 mt-2">{formatDistanceEta(location)}</div>
                      <p className="text-xs text-slate-300 mt-2 leading-relaxed">{group.whyItMatters}</p>
                      <div className="mt-3 grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => runDecisionAction(primaryAction, group)}
                          className="min-h-11 rounded-xl bg-dispatch-surface border border-dispatch-border text-slate-100 text-[11px] font-semibold hover:text-white transition-colors"
                        >
                          {ACTION_LABELS[primaryAction]}
                        </button>
                        <button
                          type="button"
                          onClick={() => runDecisionAction('save_fallback', group)}
                          className={cn(
                            'min-h-11 rounded-xl border text-[11px] font-semibold transition-colors',
                            savedFallbackIds.includes(location.id)
                              ? 'border-amber-500/40 bg-amber-500/10 text-amber-200'
                              : 'border-dispatch-border bg-dispatch-surface text-slate-100 hover:text-white',
                          )}
                        >
                          {savedFallbackIds.includes(location.id) ? 'Saved fallback' : ACTION_LABELS.save_fallback}
                        </button>
                      </div>
                      {group.alternatives.length > 1 ? (
                        <button
                          type="button"
                          onClick={() => cycleAlternative(group)}
                          className="mt-2 min-h-11 w-full rounded-xl border border-cyan-500/30 bg-cyan-500/10 text-cyan-200 text-xs font-semibold hover:bg-cyan-500/20 transition-colors"
                        >
                          View alternate nearby option
                        </button>
                      ) : null}
                    </article>
                  );
                })}
              </div>
            </div>
          ) : null}
        </section>

        <div>
          <label className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2.5 block">
            Notes <span className="normal-case font-normal text-slate-600">(optional)</span>
          </label>
          <div className="relative">
            <FileText className="absolute left-4 top-4 w-4 h-4 text-slate-500 pointer-events-none" />
            <textarea
              ref={notesRef}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Vehicle make/colour, nearest landmark, any other details..."
              rows={3}
              className="w-full bg-dispatch-surface border border-dispatch-border rounded-xl pl-11 pr-4 py-4 text-white placeholder-slate-600 focus:outline-none focus:border-orange-500 transition-colors text-sm"
            />
          </div>
        </div>

        {(pageState === 'error' || errorMessage) ? (
          <div className="flex items-start gap-3 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
            <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-red-400 text-sm leading-snug">
              {errorMessage || 'Something went wrong. Please try again.'}
            </p>
          </div>
        ) : null}

        <button
          ref={submitButtonRef}
          type="submit"
          disabled={pageState === 'submitting'}
          className={cn(
            'w-full py-4 rounded-xl font-bold text-base flex items-center justify-center gap-2.5 transition-all min-h-11',
            pageState === 'submitting'
              ? 'bg-orange-500/50 text-orange-100 cursor-wait'
              : 'bg-orange-500 text-white hover:bg-orange-400 active:bg-orange-600 shadow-lg shadow-orange-500/20',
          )}
        >
          {pageState === 'submitting' ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" /> Sending request...
            </>
          ) : (
            'Request Help Now'
          )}
        </button>

        <p className="text-slate-700 text-xs text-center pb-2">Ottawa area - Available 24/7 - Typical response 20-40 min</p>
      </form>
    </div>
  );
}
