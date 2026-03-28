import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  AlertTriangle, CheckCircle2, CircleDot, Clock, Fuel, KeyRound,
  Loader2, Lock, MapPin, Phone, Plus, RefreshCw, Shield, User, Wrench, X, Zap,
} from 'lucide-react';
import { cn } from '../lib/cn';

const ADMIN_PIN = 'admin123';

type ServiceType = 'gas' | 'lockout' | 'jump' | 'tire' | 'other';
type RequestStatus = 'pending' | 'accepted' | 'en_route' | 'completed' | 'cancelled';

interface ServiceRequest {
  id: string;
  customerName: string;
  customerPhone: string;
  locationAddress: string | null;
  serviceType: ServiceType;
  status: RequestStatus;
  createdAt: string;
}

const SERVICE_ICONS: Record<ServiceType, React.ComponentType<{ className?: string }>> = {
  gas: Fuel, lockout: KeyRound, jump: Zap, tire: CircleDot, other: Wrench,
};
const SERVICE_LABELS: Record<ServiceType, string> = {
  gas: 'Gas', lockout: 'Lockout', jump: 'Jump Start', tire: 'Tire', other: 'Other',
};
const STATUS_BADGE: Record<RequestStatus, string> = {
  pending:   'bg-amber-500/15 text-amber-400',
  accepted:  'bg-blue-500/15 text-blue-400',
  en_route:  'bg-purple-500/15 text-purple-400',
  completed: 'bg-green-500/15 text-green-400',
  cancelled: 'bg-slate-700/50 text-slate-500',
};
const STATUS_LABEL: Record<RequestStatus, string> = {
  pending: 'Pending', accepted: 'Accepted', en_route: 'En Route',
  completed: 'Completed', cancelled: 'Cancelled',
};

function fmt(str: string) {
  return new Date(str).toLocaleString('en-CA', {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

// ─── PIN Screen ───────────────────────────────────────────────────────────────

function AdminPinScreen({ onUnlock }: { onUnlock: () => void }) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (pin === ADMIN_PIN) { onUnlock(); }
    else { setError('Incorrect PIN.'); setPin(''); }
  }

  return (
    <div className="min-h-dvh bg-dispatch-bg flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-10">
          <div className="w-16 h-16 bg-dispatch-surface border border-dispatch-border rounded-2xl flex items-center justify-center mb-5">
            <Shield className="w-8 h-8 text-slate-300" />
          </div>
          <h1 className="text-2xl font-bold text-white">Admin Access</h1>
          <p className="text-slate-500 text-sm mt-1">Ottawa Roadside Dispatch</p>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            type="password"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            placeholder="Admin PIN"
            autoFocus
            className="w-full bg-dispatch-surface border border-dispatch-border rounded-xl px-4 py-4 text-white placeholder-slate-600 focus:outline-none focus:border-orange-500 transition-colors text-center text-xl tracking-[0.5em]"
          />
          {error && (
            <div className="flex items-center gap-2 text-red-400 text-sm justify-center">
              <AlertTriangle className="w-4 h-4" />
              <span>{error}</span>
            </div>
          )}
          <button
            type="submit"
            className="w-full py-4 rounded-xl bg-orange-500 text-white font-bold hover:bg-orange-400 active:bg-orange-600 transition-all"
          >
            Enter
          </button>
        </form>
      </div>
    </div>
  );
}

// ─── Add Operator Form ────────────────────────────────────────────────────────

function AddOperatorForm({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name || !pin || pin.length < 4) {
      setError('Name and a 4+ digit PIN are required.');
      return;
    }
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const res = await fetch('/api/operators', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, phone, pin }),
      });
      const data = await res.json() as { ok?: boolean; error?: string };
      if (!res.ok) { setError(data.error || 'Failed to create operator.'); return; }
      setSuccess(`Operator "${name}" created.`);
      setName(''); setPhone(''); setPin('');
      setTimeout(onClose, 1500);
    } catch {
      setError('Network error. Try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-dispatch-surface border border-dispatch-border rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-white font-bold text-[15px]">New Operator</h2>
        <button
          onClick={onClose}
          className="text-slate-500 hover:text-slate-300 transition-colors p-1 rounded-lg hover:bg-slate-700/50"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <div className="relative">
          <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Full name"
            className="w-full bg-dispatch-bg border border-dispatch-border rounded-xl pl-10 pr-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:border-orange-500 text-sm transition-colors"
          />
        </div>
        <div className="relative">
          <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Phone (optional)"
            className="w-full bg-dispatch-bg border border-dispatch-border rounded-xl pl-10 pr-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:border-orange-500 text-sm transition-colors"
          />
        </div>
        <div className="relative">
          <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
          <input
            type="password"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            placeholder="PIN (min 4 digits)"
            inputMode="numeric"
            className="w-full bg-dispatch-bg border border-dispatch-border rounded-xl pl-10 pr-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:border-orange-500 text-sm tracking-widest transition-colors"
          />
        </div>
        {error && (
          <div className="flex items-center gap-1.5 text-red-400 text-xs">
            <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}
        {success && (
          <div className="flex items-center gap-1.5 text-green-400 text-xs">
            <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
            <span>{success}</span>
          </div>
        )}
        <button
          type="submit"
          disabled={loading}
          className="py-3 rounded-xl bg-orange-500 text-white font-bold text-sm hover:bg-orange-400 active:bg-orange-600 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
        >
          {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating…</> : 'Create Operator'}
        </button>
      </form>
    </div>
  );
}

// ─── Admin Dashboard ──────────────────────────────────────────────────────────

function AdminDashboard() {
  const [showAdd, setShowAdd] = useState(false);

  const { data: requests = [], isLoading, refetch, isFetching } = useQuery<ServiceRequest[]>({
    queryKey: ['admin-requests'],
    queryFn: async () => {
      const res = await fetch('/api/requests');
      if (!res.ok) throw new Error('Failed to load');
      return res.json() as Promise<ServiceRequest[]>;
    },
    refetchInterval: 30_000,
  });

  const stats = {
    total:     requests.length,
    pending:   requests.filter(r => r.status === 'pending').length,
    active:    requests.filter(r => ['accepted', 'en_route'].includes(r.status)).length,
    completed: requests.filter(r => r.status === 'completed').length,
  };

  return (
    <div className="min-h-dvh bg-dispatch-bg">
      {/* Header */}
      <div className="border-b border-dispatch-border px-5 pt-12 pb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-dispatch-surface border border-dispatch-border rounded-xl flex items-center justify-center">
            <Shield className="w-5 h-5 text-slate-300" />
          </div>
          <div>
            <h1 className="text-white font-bold text-xl">Admin</h1>
            <p className="text-slate-500 text-xs">Ottawa Roadside Dispatch</p>
          </div>
        </div>
      </div>

      <div className="px-5 py-5 flex flex-col gap-5 pb-10">
        {/* Stats */}
        <div className="grid grid-cols-4 gap-2">
          {[
            { label: 'Total',   value: stats.total,     cls: 'text-white' },
            { label: 'Pending', value: stats.pending,   cls: 'text-amber-400' },
            { label: 'Active',  value: stats.active,    cls: 'text-blue-400' },
            { label: 'Done',    value: stats.completed, cls: 'text-green-400' },
          ].map(s => (
            <div key={s.label} className="bg-dispatch-surface border border-dispatch-border rounded-xl p-3 text-center">
              <div className={cn('text-2xl font-bold tabular-nums leading-none', s.cls)}>{s.value}</div>
              <div className="text-slate-600 text-[11px] font-medium mt-1.5">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Operator management */}
        {!showAdd ? (
          <button
            onClick={() => setShowAdd(true)}
            className="w-full py-3 rounded-xl flex items-center justify-center gap-2 border border-dashed border-dispatch-border text-slate-500 text-sm font-medium hover:border-orange-500/40 hover:text-orange-400 transition-all"
          >
            <Plus className="w-4 h-4" />
            Add Operator
          </button>
        ) : (
          <AddOperatorForm onClose={() => setShowAdd(false)} />
        )}

        {/* Request list */}
        <div>
          <div className="flex items-center justify-between mb-3.5">
            <h2 className="text-white font-bold text-[15px]">All Requests</h2>
            <button
              onClick={() => refetch()}
              className={cn(
                'flex items-center gap-1.5 text-xs transition-colors',
                isFetching ? 'text-orange-400' : 'text-slate-500 hover:text-slate-300',
              )}
            >
              <RefreshCw className={cn('w-3.5 h-3.5', isFetching && 'animate-spin')} />
              {isFetching ? 'Refreshing…' : 'Refresh'}
            </button>
          </div>

          {isLoading && (
            <div className="flex items-center justify-center py-12 text-slate-500 text-sm gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              Loading…
            </div>
          )}

          {!isLoading && requests.length === 0 && (
            <div className="text-center py-12">
              <p className="text-slate-500 text-sm">No requests yet.</p>
            </div>
          )}

          <div className="flex flex-col gap-2">
            {requests.map(r => {
              const Icon = SERVICE_ICONS[r.serviceType];
              return (
                <div key={r.id} className="bg-dispatch-surface border border-dispatch-border rounded-xl p-4">
                  <div className="flex items-start justify-between gap-2 mb-2.5">
                    <div className="flex items-center gap-3">
                      <Icon className="w-4 h-4 text-orange-400 flex-shrink-0" />
                      <div>
                        <div className="text-white font-semibold text-sm leading-tight">
                          {r.customerName}
                        </div>
                        <div className="text-slate-600 text-xs mt-0.5">{SERVICE_LABELS[r.serviceType]}</div>
                      </div>
                    </div>
                    <span className={cn('text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap', STATUS_BADGE[r.status])}>
                      {STATUS_LABEL[r.status]}
                    </span>
                  </div>
                  {r.locationAddress && (
                    <div className="flex items-start gap-1.5 text-slate-500 text-xs mb-1.5">
                      <MapPin className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                      <span className="leading-snug line-clamp-1">{r.locationAddress}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1.5 text-slate-700 text-xs">
                    <Clock className="w-3.5 h-3.5" />
                    {fmt(r.createdAt)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────

const KEY = 'dispatch_admin_unlocked';

export default function AdminPage() {
  const [unlocked, setUnlocked] = useState(() => {
    try { return sessionStorage.getItem(KEY) === '1'; }
    catch { return false; }
  });

  function handleUnlock() {
    try { sessionStorage.setItem(KEY, '1'); } catch { /* ignore */ }
    setUnlocked(true);
  }

  return unlocked ? <AdminDashboard /> : <AdminPinScreen onUnlock={handleUnlock} />;
}
