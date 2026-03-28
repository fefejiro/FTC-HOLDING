import { useEffect, useState } from 'react';
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
  User,
  Wrench,
  Zap,
} from 'lucide-react';
import DemoFeedbackForm from '../components/DemoFeedbackForm';
import { cn } from '../lib/cn';
import {
  clearStoredDemoSessionId,
  getDemoSessionId,
  isDemoMode,
  makeDemoSessionId,
  readStoredDemoSessionId,
  storeDemoSessionId,
} from '../lib/demo';

type ServiceType = 'gas' | 'lockout' | 'jump' | 'tire' | 'other';
type PageState = 'form' | 'submitting' | 'success' | 'error';

const SERVICE_OPTIONS = [
  { type: 'gas' as ServiceType, Icon: Fuel, label: 'Gas Delivery' },
  { type: 'lockout' as ServiceType, Icon: KeyRound, label: 'Lockout' },
  { type: 'jump' as ServiceType, Icon: Zap, label: 'Jump Start' },
  { type: 'tire' as ServiceType, Icon: CircleDot, label: 'Tire Change' },
  { type: 'other' as ServiceType, Icon: Wrench, label: 'Other Issue' },
];

function resetFormState(
  setters: {
    setServiceType: (value: ServiceType | null) => void;
    setName: (value: string) => void;
    setPhone: (value: string) => void;
    setAddress: (value: string) => void;
    setNotes: (value: string) => void;
    setLocationLat: (value: number | null) => void;
    setLocationLng: (value: number | null) => void;
    setRequestId: (value: string | null) => void;
    setShowFeedback: (value: boolean) => void;
  },
) {
  setters.setServiceType(null);
  setters.setName('');
  setters.setPhone('');
  setters.setAddress('');
  setters.setNotes('');
  setters.setLocationLat(null);
  setters.setLocationLng(null);
  setters.setRequestId(null);
  setters.setShowFeedback(false);
}

export default function RequestPage() {
  const [serviceType, setServiceType] = useState<ServiceType | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [locationLat, setLocationLat] = useState<number | null>(null);
  const [locationLng, setLocationLng] = useState<number | null>(null);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState('');
  const [pageState, setPageState] = useState<PageState>('form');
  const [errorMessage, setErrorMessage] = useState('');
  const [requestId, setRequestId] = useState<string | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [demoMode, setDemoMode] = useState(false);
  const [demoSessionId, setDemoSessionId] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const liveDemoMode = isDemoMode(window.location.search);
    setDemoMode(liveDemoMode);
    if (!liveDemoMode) {
      clearStoredDemoSessionId();
      setDemoSessionId(null);
      return;
    }

    const existingSession =
      getDemoSessionId(window.location.search) || readStoredDemoSessionId() || makeDemoSessionId();
    storeDemoSessionId(existingSession);
    setDemoSessionId(existingSession);
  }, []);

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
          notes: notes.trim() || undefined,
          mode: demoMode ? 'demo' : 'live',
          demoSessionId: demoMode ? demoSessionId || undefined : undefined,
        }),
      });

      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        throw new Error(payload.error || 'Failed to submit request');
      }

      const payload = (await response.json()) as { request?: { id?: string } };
      setRequestId(payload.request?.id || null);
      setShowFeedback(false);
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
          <h1 className="text-2xl font-bold text-white mb-3">
            {demoMode ? 'Demo request created.' : 'Help is on the way.'}
          </h1>

          {demoMode ? (
            <>
              <p className="text-slate-400 leading-relaxed mb-2">
                Your sample roadside request is now in the live demo system. Next, sign in as the invited
                operator and work the same request through the queue.
              </p>
              <p className="text-slate-600 text-sm">
                Demo session {demoSessionId || 'active'}
                {requestId ? ` - request ${requestId.slice(0, 8)}` : ''}.
              </p>
              <div className="mt-8 flex flex-col gap-3">
                <a
                  href={`/operator?mode=demo${demoSessionId ? `&demoSession=${encodeURIComponent(demoSessionId)}` : ''}`}
                  className="inline-flex items-center justify-center rounded-xl bg-orange-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-orange-400"
                >
                  Open operator demo
                </a>
                <button
                  type="button"
                  onClick={() => setShowFeedback((current) => !current)}
                  className="inline-flex items-center justify-center rounded-xl border border-dispatch-border bg-dispatch-surface px-5 py-3 text-sm font-semibold text-slate-200 transition hover:border-slate-500"
                >
                  {showFeedback ? 'Hide feedback form' : 'Send demo feedback'}
                </button>
              </div>
              {showFeedback ? (
                <div className="mt-6 text-left">
                  <DemoFeedbackForm
                    context={{
                      context: 'dispatch-demo-request-success',
                      demoSessionId,
                      requestId,
                    }}
                  />
                </div>
              ) : null}
            </>
          ) : (
            <>
              <p className="text-slate-400 leading-relaxed mb-2">
                We&apos;ll call you shortly at <span className="text-orange-400 font-semibold">{phone}</span>.
              </p>
              <p className="text-slate-600 text-sm">
                Stay with your vehicle if safe. Typical response: 20-40 minutes.
              </p>
            </>
          )}

          <button
            onClick={() => {
              setPageState('form');
              resetFormState({
                setServiceType,
                setName,
                setPhone,
                setAddress,
                setNotes,
                setLocationLat,
                setLocationLng,
                setRequestId,
                setShowFeedback,
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
              Ottawa Roadside
            </span>
          </div>
          <a href="/" className="text-xs text-slate-500 hover:text-orange-400 transition-colors">
            Back to Dispatch
          </a>
        </div>
        {demoMode ? (
          <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-orange-500/20 bg-orange-500/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-orange-300">
            Client demo mode
          </div>
        ) : null}
        <h1 className="text-3xl font-bold text-white mt-3">Need help?</h1>
        <p className="text-slate-400 mt-1.5 text-[15px]">
          {demoMode
            ? 'Create a sample roadside request, then switch into operator to work the same job through the live system.'
            : 'We will dispatch a technician to your location.'}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex-1 px-6 py-7 flex flex-col gap-7 pb-10">
        <div>
          <label className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3 block">
            What do you need?
          </label>
          <div className="grid grid-cols-2 gap-2.5">
            {SERVICE_OPTIONS.map(({ type, Icon, label }, index) => (
              <button
                key={type}
                type="button"
                onClick={() => setServiceType(type)}
                className={cn(
                  'flex items-center gap-3 px-4 py-4 rounded-xl border-2 text-left transition-all duration-150',
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
              placeholder={demoMode ? 'Client demo reviewer' : 'First and last name'}
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
              placeholder={demoMode ? '613-555-0100' : '613-555-0100'}
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
              'w-full flex items-center justify-center gap-2.5 py-3.5 rounded-xl border font-semibold text-sm transition-all mb-3',
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
              onChange={(event) => setAddress(event.target.value)}
              placeholder={demoMode ? 'Example: 350 Sparks St, Ottawa' : 'Or type your address'}
              className="w-full bg-dispatch-surface border border-dispatch-border rounded-xl pl-11 pr-4 py-4 text-white placeholder-slate-600 focus:outline-none focus:border-orange-500 transition-colors text-sm"
            />
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2.5 block">
            Notes <span className="normal-case font-normal text-slate-600">(optional)</span>
          </label>
          <div className="relative">
            <FileText className="absolute left-4 top-4 w-4 h-4 text-slate-500 pointer-events-none" />
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder={
                demoMode
                  ? 'Optional demo note: use fake details only.'
                  : 'Vehicle make/colour, nearest landmark, any other details...'
              }
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
          type="submit"
          disabled={pageState === 'submitting'}
          className={cn(
            'w-full py-4 rounded-xl font-bold text-base flex items-center justify-center gap-2.5 transition-all',
            pageState === 'submitting'
              ? 'bg-orange-500/50 text-orange-100 cursor-wait'
              : 'bg-orange-500 text-white hover:bg-orange-400 active:bg-orange-600 shadow-lg shadow-orange-500/20',
          )}
        >
          {pageState === 'submitting' ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" /> Sending request...
            </>
          ) : demoMode ? (
            'Create Demo Request'
          ) : (
            'Request Help Now'
          )}
        </button>

        <p className="text-slate-700 text-xs text-center pb-2">
          {demoMode
            ? 'Demo flow only - use sample details and invited operator credentials'
            : 'Ottawa area - Available 24/7 - Typical response 20-40 min'}
        </p>
      </form>
    </div>
  );
}
