import { useCallback, useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  CheckCircle2,
  CircleDot,
  Clock,
  Fuel,
  KeyRound,
  Loader2,
  Lock,
  MapPin,
  Phone,
  Plus,
  RefreshCw,
  Shield,
  User,
  Wrench,
  X,
  Zap,
} from 'lucide-react';
import { cn } from '../lib/cn';

type ServiceType = 'gas' | 'lockout' | 'jump' | 'tire' | 'other';
type RequestStatus = 'pending' | 'accepted' | 'en_route' | 'completed' | 'cancelled';

interface ServiceRequest {
  id: string;
  customerName: string;
  customerPhone: string;
  locationLat: number | null;
  locationLng: number | null;
  locationAddress: string | null;
  serviceType: ServiceType;
  status: RequestStatus;
  operatorId: string | null;
  notes: string | null;
  createdAt: string;
  acceptedAt: string | null;
  completedAt: string | null;
  demoMode?: boolean | null;
  demoSessionId?: string | null;
}

interface Operator {
  id: string;
  name: string;
  phone: string | null;
  active: boolean;
}

type AdminFilter = 'all' | 'pending' | 'active' | 'completed';

const SERVICE_ICONS: Record<ServiceType, React.ComponentType<{ className?: string }>> = {
  gas: Fuel,
  lockout: KeyRound,
  jump: Zap,
  tire: CircleDot,
  other: Wrench,
};

const SERVICE_LABELS: Record<ServiceType, string> = {
  gas: 'Gas',
  lockout: 'Lockout',
  jump: 'Jump Start',
  tire: 'Tire',
  other: 'Other',
};

const STATUS_BADGE: Record<RequestStatus, string> = {
  pending: 'bg-amber-500/15 text-amber-400',
  accepted: 'bg-blue-500/15 text-blue-400',
  en_route: 'bg-purple-500/15 text-purple-400',
  completed: 'bg-green-500/15 text-green-400',
  cancelled: 'bg-slate-700/50 text-slate-500',
};

const STATUS_LABEL: Record<RequestStatus, string> = {
  pending: 'Pending',
  accepted: 'Accepted',
  en_route: 'En Route',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

const ALL_STATUSES: RequestStatus[] = ['pending', 'accepted', 'en_route', 'completed', 'cancelled'];

function fmt(str: string) {
  return new Date(str).toLocaleString('en-CA', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function shortId(id: string) {
  return id.split('-')[0] || id;
}

function filterRequests(requests: ServiceRequest[], filter: AdminFilter) {
  if (filter === 'pending') {
    return requests.filter((request) => request.status === 'pending');
  }
  if (filter === 'active') {
    return requests.filter((request) => ['accepted', 'en_route'].includes(request.status));
  }
  if (filter === 'completed') {
    return requests.filter((request) => request.status === 'completed');
  }
  return requests;
}

// ── Admin Login ───────────────────────────────────────────────────────────────

function AdminLogin({ onSuccess }: { onSuccess: (token: string | null) => void }) {
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!pin) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin }),
      });
      const data = (await res.json()) as { ok?: boolean; token?: string | null; error?: string };
      if (!res.ok || !data.ok) {
        setError(data.error || 'Incorrect PIN');
        return;
      }
      sessionStorage.setItem('dispatch_admin_authenticated', '1');
      if (data.token) {
        sessionStorage.setItem('dispatch_admin_token', data.token);
      }
      onSuccess(data.token ?? null);
    } catch {
      setError('Network error. Try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-dvh bg-dispatch-bg flex items-center justify-center px-5">
      <div className="w-full max-w-sm">
        <div className="flex justify-center mb-8">
          <div className="w-14 h-14 bg-dispatch-surface border border-dispatch-border rounded-2xl flex items-center justify-center">
            <Shield className="w-7 h-7 text-slate-300" />
          </div>
        </div>
        <h1 className="text-white font-bold text-2xl text-center mb-1">Admin Access</h1>
        <p className="text-slate-500 text-sm text-center mb-8">Enter your admin PIN to continue.</p>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="relative">
            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
            <input
              type="password"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="Admin PIN"
              inputMode="numeric"
              autoFocus
              className="w-full bg-dispatch-surface border border-dispatch-border rounded-xl pl-10 pr-4 py-3.5 text-white placeholder-slate-600 focus:outline-none focus:border-orange-500 text-sm tracking-widest transition-colors text-center"
            />
          </div>
          {error && (
            <div className="flex items-center gap-1.5 text-red-400 text-xs justify-center">
              <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}
          <button
            type="submit"
            disabled={loading || !pin}
            className="py-3.5 rounded-xl bg-orange-500 text-white font-bold text-sm hover:bg-orange-400 active:bg-orange-600 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Checking...
              </>
            ) : (
              'Continue'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

// ── Add Operator Form ─────────────────────────────────────────────────────────

function AddOperatorForm({
  onClose,
  adminToken,
}: {
  onClose: () => void;
  adminToken: string | null;
}) {
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
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (adminToken) headers['x-dispatch-admin-proxy-key'] = adminToken;
      const res = await fetch('/api/operators', {
        method: 'POST',
        headers,
        body: JSON.stringify({ name, phone, pin }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok) {
        setError(data.error || 'Failed to create operator.');
        return;
      }
      setSuccess(`Operator "${name}" created.`);
      setName('');
      setPhone('');
      setPin('');
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
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" /> Creating...
            </>
          ) : (
            'Create Operator'
          )}
        </button>
      </form>
    </div>
  );
}

// ── Admin Dashboard ───────────────────────────────────────────────────────────

function AdminDashboard({
  adminToken,
  onSignOut,
}: {
  adminToken: string | null;
  onSignOut: () => void;
}) {
  const queryClient = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [activeFilter, setActiveFilter] = useState<AdminFilter>('all');
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const [selectedOperatorId, setSelectedOperatorId] = useState<string>('unassigned');
  const [assigningId, setAssigningId] = useState<string | null>(null);
  const [statusChangingId, setStatusChangingId] = useState<string | null>(null);

  const adminFetch = useCallback(
    (url: string, options: RequestInit = {}) => {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (adminToken) headers['x-dispatch-admin-proxy-key'] = adminToken;
      return fetch(url, { ...options, headers: { ...headers, ...(options.headers as Record<string, string> ?? {}) } });
    },
    [adminToken],
  );

  const { data: requests = [], isLoading, refetch, isFetching } = useQuery<ServiceRequest[]>({
    queryKey: ['admin-requests'],
    queryFn: async () => {
      const res = await fetch('/api/requests');
      if (!res.ok) throw new Error('Failed to load');
      return res.json() as Promise<ServiceRequest[]>;
    },
    refetchInterval: 30_000,
  });

  const { data: operators = [] } = useQuery<Operator[]>({
    queryKey: ['operators'],
    queryFn: async () => {
      const res = await fetch('/api/operators');
      if (!res.ok) throw new Error('Failed to load operators');
      return res.json() as Promise<Operator[]>;
    },
  });

  const stats = {
    total: requests.length,
    pending: requests.filter((r) => r.status === 'pending').length,
    active: requests.filter((r) => ['accepted', 'en_route'].includes(r.status)).length,
    completed: requests.filter((r) => r.status === 'completed').length,
  };

  const filteredRequests = filterRequests(requests, activeFilter);
  const selectedRequest =
    filteredRequests.find((request) => request.id === selectedRequestId) ?? filteredRequests[0] ?? null;

  // Sync assign dropdown to the selected request's current operator
  useEffect(() => {
    setSelectedOperatorId(selectedRequest?.operatorId ?? 'unassigned');
  }, [selectedRequest?.id]);

  useEffect(() => {
    if (!filteredRequests.length) {
      if (selectedRequestId !== null) setSelectedRequestId(null);
      return;
    }
    const stillVisible = filteredRequests.some((request) => request.id === selectedRequestId);
    if (!stillVisible) setSelectedRequestId(filteredRequests[0].id);
  }, [filteredRequests, selectedRequestId]);

  async function handleAssign(requestId: string) {
    setAssigningId(requestId);
    try {
      await adminFetch(`/api/requests/${requestId}/assign`, {
        method: 'PATCH',
        body: JSON.stringify({
          operatorId: selectedOperatorId === 'unassigned' ? null : selectedOperatorId,
          accept: selectedOperatorId !== 'unassigned',
        }),
      });
      await queryClient.invalidateQueries({ queryKey: ['admin-requests'] });
    } finally {
      setAssigningId(null);
    }
  }

  async function handleStatusChange(requestId: string, status: RequestStatus) {
    setStatusChangingId(requestId);
    try {
      await adminFetch(`/api/requests/${requestId}/admin-status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      await queryClient.invalidateQueries({ queryKey: ['admin-requests'] });
    } finally {
      setStatusChangingId(null);
    }
  }

  const filterMeta: Array<{
    key: AdminFilter;
    label: string;
    value: number;
    cls: string;
    emptyLabel: string;
    listLabel: string;
  }> = [
    {
      key: 'all',
      label: 'Total',
      value: stats.total,
      cls: 'text-white',
      emptyLabel: 'No requests yet.',
      listLabel: 'All Requests',
    },
    {
      key: 'pending',
      label: 'Pending',
      value: stats.pending,
      cls: 'text-amber-400',
      emptyLabel: 'No pending requests right now.',
      listLabel: 'Pending Requests',
    },
    {
      key: 'active',
      label: 'Active',
      value: stats.active,
      cls: 'text-blue-400',
      emptyLabel: 'No active requests right now.',
      listLabel: 'Active Requests',
    },
    {
      key: 'completed',
      label: 'Done',
      value: stats.completed,
      cls: 'text-green-400',
      emptyLabel: 'No completed requests yet.',
      listLabel: 'Completed Requests',
    },
  ];

  const activeFilterMeta = filterMeta.find((item) => item.key === activeFilter) ?? filterMeta[0];

  return (
    <div className="min-h-dvh bg-dispatch-bg">
      <div className="border-b border-dispatch-border px-5 pt-12 pb-5">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-dispatch-surface border border-dispatch-border rounded-xl flex items-center justify-center">
              <Shield className="w-5 h-5 text-slate-300" />
            </div>
            <div>
              <h1 className="text-white font-bold text-xl">Admin</h1>
              <p className="text-slate-500 text-xs">Ottawa Roadside Dispatch</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <a href="/operator" className="text-xs text-slate-500 hover:text-slate-300 transition-colors">
              Operator
            </a>
            <a href="/" className="text-xs text-slate-500 hover:text-orange-400 transition-colors">
              Public site
            </a>
            <button
              type="button"
              onClick={onSignOut}
              className="text-xs text-slate-500 hover:text-white transition-colors"
            >
              Sign out
            </button>
          </div>
        </div>
      </div>

      <div className="px-5 py-5 flex flex-col gap-5 pb-10">
        <div className="grid grid-cols-4 gap-2">
          {filterMeta.map((stat) => (
            <button
              key={stat.label}
              type="button"
              onClick={() => setActiveFilter(stat.key)}
              aria-pressed={activeFilter === stat.key}
              className={cn(
                'bg-dispatch-surface border rounded-xl p-3 text-center transition-all',
                activeFilter === stat.key
                  ? 'border-orange-500/50 shadow-[0_0_0_1px_rgba(249,115,22,0.15)]'
                  : 'border-dispatch-border hover:border-slate-600',
              )}
            >
              <div className={cn('text-2xl font-bold tabular-nums leading-none', stat.cls)}>
                {stat.value}
              </div>
              <div className="text-slate-600 text-[11px] font-medium mt-1.5">{stat.label}</div>
              <div className="text-[10px] text-slate-700 mt-1">
                {activeFilter === stat.key ? 'Showing now' : 'Click to drill down'}
              </div>
            </button>
          ))}
        </div>

        {!showAdd ? (
          <button
            onClick={() => setShowAdd(true)}
            className="w-full py-3 rounded-xl flex items-center justify-center gap-2 border border-dashed border-dispatch-border text-slate-500 text-sm font-medium hover:border-orange-500/40 hover:text-orange-400 transition-all"
          >
            <Plus className="w-4 h-4" />
            Add Operator
          </button>
        ) : (
          <AddOperatorForm onClose={() => setShowAdd(false)} adminToken={adminToken} />
        )}

        <div>
          <div className="flex items-center justify-between mb-3.5">
            <div className="flex items-center gap-2">
              <h2 className="text-white font-bold text-[15px]">{activeFilterMeta.listLabel}</h2>
              <span className="text-slate-600 text-xs">
                {filteredRequests.length} shown
              </span>
            </div>
            <button
              onClick={() => refetch()}
              className={cn(
                'flex items-center gap-1.5 text-xs transition-colors',
                isFetching ? 'text-orange-400' : 'text-slate-500 hover:text-slate-300',
              )}
            >
              <RefreshCw className={cn('w-3.5 h-3.5', isFetching && 'animate-spin')} />
              {isFetching ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>

          {selectedRequest && (
            <div className="bg-dispatch-surface border border-dispatch-border rounded-2xl p-5 mb-4">
              <div className="flex items-start justify-between gap-3 mb-4">
                <div>
                  <div className="text-slate-500 text-[11px] uppercase tracking-[0.18em] font-semibold">
                    Request detail
                  </div>
                  <h3 className="text-white font-bold text-lg mt-1">{selectedRequest.customerName}</h3>
                  <div className="flex items-center gap-2 text-slate-500 text-xs mt-1">
                    <span>Event {shortId(selectedRequest.id)}</span>
                    {selectedRequest.demoMode ? (
                      <span className="rounded-full border border-orange-500/20 bg-orange-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-orange-300">
                        Demo
                      </span>
                    ) : null}
                  </div>
                </div>
                <div className="text-slate-600 text-xs">
                  {filteredRequests.length} in this view
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-3 mb-3">
                <div className="bg-dispatch-bg border border-dispatch-border rounded-xl p-3">
                  <div className="text-slate-600 text-[11px] uppercase tracking-[0.14em] font-semibold">
                    Service
                  </div>
                  <div className="text-white text-sm font-semibold mt-2">
                    {SERVICE_LABELS[selectedRequest.serviceType]}
                  </div>
                </div>
                <div className="bg-dispatch-bg border border-dispatch-border rounded-xl p-3">
                  <div className="text-slate-600 text-[11px] uppercase tracking-[0.14em] font-semibold">
                    Status
                  </div>
                  <div className="mt-2">
                    <span
                      className={cn(
                        'text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap',
                        STATUS_BADGE[selectedRequest.status],
                      )}
                    >
                      {STATUS_LABEL[selectedRequest.status]}
                    </span>
                  </div>
                </div>
                <div className="bg-dispatch-bg border border-dispatch-border rounded-xl p-3">
                  <div className="text-slate-600 text-[11px] uppercase tracking-[0.14em] font-semibold">
                    Phone
                  </div>
                  <a
                    href={`tel:${selectedRequest.customerPhone}`}
                    className="text-orange-400 text-sm font-medium mt-2 inline-flex items-center gap-2 hover:text-orange-300 transition-colors"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    {selectedRequest.customerPhone}
                  </a>
                </div>
                <div className="bg-dispatch-bg border border-dispatch-border rounded-xl p-3">
                  <div className="text-slate-600 text-[11px] uppercase tracking-[0.14em] font-semibold">
                    Location
                  </div>
                  <div className="text-slate-300 text-sm mt-2 leading-snug">
                    {selectedRequest.locationAddress || 'Location not attached'}
                  </div>
                </div>
                <div className="bg-dispatch-bg border border-dispatch-border rounded-xl p-3">
                  <div className="text-slate-600 text-[11px] uppercase tracking-[0.14em] font-semibold">
                    Mode
                  </div>
                  <div className="text-slate-300 text-sm mt-2">
                    {selectedRequest.demoMode ? 'Demo request' : 'Live request'}
                  </div>
                  {selectedRequest.demoSessionId ? (
                    <div className="text-slate-600 text-xs mt-1">
                      Session {selectedRequest.demoSessionId}
                    </div>
                  ) : null}
                </div>
              </div>

              {/* Assign operator */}
              <div className="bg-dispatch-bg border border-dispatch-border rounded-xl p-3 mb-3">
                <div className="text-slate-600 text-[11px] uppercase tracking-[0.14em] font-semibold mb-2">
                  Assign Operator
                </div>
                <div className="flex gap-2">
                  <select
                    value={selectedOperatorId}
                    onChange={(e) => setSelectedOperatorId(e.target.value)}
                    className="flex-1 bg-dispatch-surface border border-dispatch-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500 transition-colors"
                  >
                    <option value="unassigned">Unassigned</option>
                    {operators.map((op) => (
                      <option key={op.id} value={op.id}>
                        {op.name}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() => handleAssign(selectedRequest.id)}
                    disabled={assigningId === selectedRequest.id}
                    className="px-4 py-2 rounded-lg bg-orange-500 text-white text-sm font-semibold hover:bg-orange-400 disabled:opacity-50 transition-all flex items-center gap-1.5 whitespace-nowrap"
                  >
                    {assigningId === selectedRequest.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <User className="w-3.5 h-3.5" />
                    )}
                    Assign
                  </button>
                </div>
                {selectedRequest.operatorId && (
                  <div className="text-slate-600 text-xs mt-1.5">
                    Currently:{' '}
                    {operators.find((o) => o.id === selectedRequest.operatorId)?.name ??
                      'Unknown operator'}
                  </div>
                )}
              </div>

              {/* Change status */}
              <div className="bg-dispatch-bg border border-dispatch-border rounded-xl p-3 mb-3">
                <div className="text-slate-600 text-[11px] uppercase tracking-[0.14em] font-semibold mb-2">
                  Change Status
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {ALL_STATUSES.map((s) => (
                    <button
                      key={s}
                      onClick={() => s !== selectedRequest.status && handleStatusChange(selectedRequest.id, s)}
                      disabled={statusChangingId === selectedRequest.id || s === selectedRequest.status}
                      className={cn(
                        'text-xs font-semibold px-2.5 py-1.5 rounded-full transition-all',
                        STATUS_BADGE[s],
                        s === selectedRequest.status
                          ? 'opacity-100 cursor-default ring-1 ring-inset ring-current/30'
                          : 'opacity-40 hover:opacity-80 cursor-pointer',
                        statusChangingId === selectedRequest.id && 'pointer-events-none',
                      )}
                    >
                      {statusChangingId === selectedRequest.id && s === selectedRequest.status ? (
                        <span className="flex items-center gap-1">
                          <Loader2 className="w-3 h-3 animate-spin" />
                          {STATUS_LABEL[s]}
                        </span>
                      ) : (
                        STATUS_LABEL[s]
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid md:grid-cols-3 gap-3 mb-3">
                <div className="bg-dispatch-bg border border-dispatch-border rounded-xl p-3">
                  <div className="text-slate-600 text-[11px] uppercase tracking-[0.14em] font-semibold">
                    Created
                  </div>
                  <div className="text-slate-300 text-sm mt-2">{fmt(selectedRequest.createdAt)}</div>
                </div>
                <div className="bg-dispatch-bg border border-dispatch-border rounded-xl p-3">
                  <div className="text-slate-600 text-[11px] uppercase tracking-[0.14em] font-semibold">
                    Accepted
                  </div>
                  <div className="text-slate-300 text-sm mt-2">
                    {selectedRequest.acceptedAt ? fmt(selectedRequest.acceptedAt) : 'Not yet accepted'}
                  </div>
                </div>
                <div className="bg-dispatch-bg border border-dispatch-border rounded-xl p-3">
                  <div className="text-slate-600 text-[11px] uppercase tracking-[0.14em] font-semibold">
                    Completed
                  </div>
                  <div className="text-slate-300 text-sm mt-2">
                    {selectedRequest.completedAt ? fmt(selectedRequest.completedAt) : 'Not completed'}
                  </div>
                </div>
              </div>

              <div className="bg-dispatch-bg border border-dispatch-border rounded-xl p-3">
                <div className="text-slate-600 text-[11px] uppercase tracking-[0.14em] font-semibold">
                  Notes
                </div>
                <div className="text-slate-300 text-sm mt-2 leading-relaxed">
                  {selectedRequest.notes || 'No customer notes attached to this request.'}
                </div>
              </div>
            </div>
          )}

          {isLoading && (
            <div className="flex items-center justify-center py-12 text-slate-500 text-sm gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              Loading...
            </div>
          )}

          {!isLoading && filteredRequests.length === 0 && (
            <div className="text-center py-12">
              <p className="text-slate-500 text-sm">{activeFilterMeta.emptyLabel}</p>
            </div>
          )}

          <div className="flex flex-col gap-2">
            {filteredRequests.map((r) => {
              const Icon = SERVICE_ICONS[r.serviceType];
              return (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setSelectedRequestId(r.id)}
                  className={cn(
                    'bg-dispatch-surface border rounded-xl p-4 text-left transition-all',
                    selectedRequest?.id === r.id
                      ? 'border-orange-500/50 shadow-[0_0_0_1px_rgba(249,115,22,0.15)]'
                      : 'border-dispatch-border hover:border-slate-600',
                  )}
                >
                  <div className="flex items-start justify-between gap-2 mb-2.5">
                    <div className="flex items-center gap-3">
                      <Icon className="w-4 h-4 text-orange-400 flex-shrink-0" />
                      <div>
                        <div className="text-white font-semibold text-sm leading-tight">
                          {r.customerName}
                        </div>
                        <div className="flex items-center gap-2 text-slate-600 text-xs mt-0.5">
                          <span>{SERVICE_LABELS[r.serviceType]}</span>
                          {r.demoMode ? (
                            <span className="rounded-full border border-orange-500/20 bg-orange-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-orange-300">
                              Demo
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </div>
                    <span
                      className={cn(
                        'text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap',
                        STATUS_BADGE[r.status],
                      )}
                    >
                      {STATUS_LABEL[r.status]}
                    </span>
                  </div>
                  {r.locationAddress && (
                    <div className="flex items-start gap-1.5 text-slate-500 text-xs mb-1.5">
                      <MapPin className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                      <span className="leading-snug line-clamp-1">{r.locationAddress}</span>
                    </div>
                  )}
                  {r.operatorId && (
                    <div className="flex items-center gap-1.5 text-slate-600 text-xs mb-1.5">
                      <User className="w-3.5 h-3.5" />
                      <span>
                        {operators.find((o) => o.id === r.operatorId)?.name ?? 'Assigned'}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center gap-1.5 text-slate-700 text-xs">
                    <Clock className="w-3.5 h-3.5" />
                    {fmt(r.createdAt)}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Admin Page (auth gate) ────────────────────────────────────────────────────

export default function AdminPage() {
  const isRemoteAdminHost =
    typeof window !== 'undefined' && window.location.hostname === 'dispatch-admin.unalabs.cloud';
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(
    () =>
      typeof window !== 'undefined' && window.location.hostname === 'dispatch-admin.unalabs.cloud'
        ? false
        : sessionStorage.getItem('dispatch_admin_authenticated') === '1',
  );
  const [adminToken, setAdminToken] = useState<string | null>(
    () =>
      typeof window !== 'undefined' && window.location.hostname === 'dispatch-admin.unalabs.cloud'
        ? null
        : sessionStorage.getItem('dispatch_admin_token'),
  );
  const [sessionChecking, setSessionChecking] = useState<boolean>(isRemoteAdminHost);

  useEffect(() => {
    if (!isRemoteAdminHost) {
      setSessionChecking(false);
      return;
    }

    let active = true;
    fetch('/api/admin/session', { cache: 'no-store' })
      .then(async (res) => {
        if (!active) return;
        if (!res.ok) {
          sessionStorage.removeItem('dispatch_admin_authenticated');
          sessionStorage.removeItem('dispatch_admin_token');
          setIsAuthenticated(false);
          setAdminToken(null);
          return;
        }

        sessionStorage.setItem('dispatch_admin_authenticated', '1');
        setIsAuthenticated(true);
      })
      .catch(() => {
        if (!active) return;
        setIsAuthenticated(false);
        setAdminToken(null);
      })
      .finally(() => {
        if (active) setSessionChecking(false);
      });

    return () => {
      active = false;
    };
  }, [isRemoteAdminHost]);

  function handleLoginSuccess(token: string | null) {
    setAdminToken(token);
    setIsAuthenticated(true);
  }

  function handleSignOut() {
    sessionStorage.removeItem('dispatch_admin_authenticated');
    sessionStorage.removeItem('dispatch_admin_token');
    setAdminToken(null);
    setIsAuthenticated(false);
    if (isRemoteAdminHost) {
      fetch('/api/admin/logout', { method: 'POST' }).catch(() => undefined);
    }
  }

  if (sessionChecking) {
    return (
      <div className="min-h-dvh bg-dispatch-bg flex items-center justify-center px-5">
        <div className="flex items-center gap-2 text-slate-400 text-sm">
          <Loader2 className="w-4 h-4 animate-spin" />
          Checking admin session...
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <AdminLogin onSuccess={handleLoginSuccess} />;
  }

  return <AdminDashboard adminToken={adminToken} onSignOut={handleSignOut} />;
}
