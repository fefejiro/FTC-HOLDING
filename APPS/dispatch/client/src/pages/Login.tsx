import { useEffect, useState } from 'react';
import { AlertTriangle, Loader2, Lock, Shield, Siren, User } from 'lucide-react';
import DispatchLoginShell from '../components/DispatchLoginShell';
import { type OperatorSession, writeOperatorSession } from '../lib/operatorSession';

type AccessMode = 'operator' | 'admin';

type OperatorRecord = {
  id: string;
  name: string;
};

const ADMIN_LOGIN_URL = 'https://dispatch-admin.unalabs.cloud/login?mode=admin';
const OPERATOR_LOGIN_URL = 'https://dispatch.unalabs.cloud/login?mode=operator';

function currentHost() {
  if (typeof window === 'undefined') return '';
  return String(window.location.hostname || '').toLowerCase();
}

function isPrivateAdminHost(host: string) {
  return host === 'dispatch-admin.unalabs.cloud';
}

function readMode(): AccessMode {
  if (typeof window === 'undefined') return 'operator';
  const mode = new URL(window.location.href).searchParams.get('mode');
  return mode === 'admin' ? 'admin' : 'operator';
}

export default function LoginPage() {
  const host = currentHost();
  const privateAdminHost = isPrivateAdminHost(host);
  const [mode, setMode] = useState<AccessMode>(() => (privateAdminHost ? 'admin' : readMode()));

  useEffect(() => {
    if (privateAdminHost) setMode('admin');
  }, [privateAdminHost]);

  return (
    <DispatchLoginShell
      activeRole={mode}
      icon={<Siren className="w-7 h-7" />}
      eyebrow="Ottawa roadside operations"
      title="Dispatch sign in"
      subtitle="One sign-in for the Dispatch product. Field operators handle live jobs and oversight reviews the live operation after access is confirmed."
      showRoleSwitch={false}
      footer={
        <div className="text-xs leading-relaxed text-slate-500">
          Customer help requests stay at the Dispatch request form. Team access opens the right workspace after sign-in.
        </div>
      }
    >
      <div className="mb-5 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => {
            if (privateAdminHost) {
              window.location.href = OPERATOR_LOGIN_URL;
              return;
            }
            setMode('operator');
          }}
          className={`rounded-xl px-4 py-3 text-sm font-semibold transition-colors ${mode === 'operator' ? 'bg-orange-500 text-white' : 'border border-dispatch-border bg-dispatch-surface text-slate-300 hover:text-white'}`}
        >
          Field access
        </button>
        <button
          type="button"
          onClick={() => {
            if (!privateAdminHost) {
              window.location.href = ADMIN_LOGIN_URL;
              return;
            }
            setMode('admin');
          }}
          className={`rounded-xl px-4 py-3 text-sm font-semibold transition-colors ${mode === 'admin' ? 'bg-orange-500 text-white' : 'border border-dispatch-border bg-dispatch-surface text-slate-300 hover:text-white'}`}
        >
          Oversight access
        </button>
      </div>

      {mode === 'operator' ? <OperatorFrontDoor privateAdminHost={privateAdminHost} /> : <AdminFrontDoor privateAdminHost={privateAdminHost} />}
    </DispatchLoginShell>
  );
}

function OperatorFrontDoor({ privateAdminHost }: { privateAdminHost: boolean }) {
  const [operators, setOperators] = useState<OperatorRecord[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [opsLoading, setOpsLoading] = useState(!privateAdminHost);

  useEffect(() => {
    if (privateAdminHost) return;
    fetch('/api/operators')
      .then((response) => response.json())
      .then((data: unknown) => {
        if (Array.isArray(data)) setOperators(data as OperatorRecord[]);
      })
      .catch(() => setError('Could not load field access list. Check your connection.'))
      .finally(() => setOpsLoading(false));
  }, [privateAdminHost]);

  useEffect(() => {
    if (!operators.length) return;
    if (!operators.some((operator) => operator.id === selectedId)) {
      setSelectedId(operators[0].id);
    }
  }, [operators, selectedId]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (privateAdminHost) {
      window.location.href = OPERATOR_LOGIN_URL;
      return;
    }
    if (!selectedId || !pin) {
      setError('Choose your name and enter the access PIN.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/operators/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ operatorId: selectedId, pin }),
      });
      const data = (await response.json()) as { ok?: boolean; operator?: OperatorSession; error?: string };
      if (!response.ok || !data.ok || !data.operator) {
        setError(data.error || 'Invalid PIN. Try again.');
        setPin('');
        return;
      }
      writeOperatorSession(data.operator);
      window.location.href = '/operator';
    } catch {
      setError('Authentication failed. Check your connection.');
    } finally {
      setLoading(false);
    }
  }

  if (privateAdminHost) {
    return (
      <div className="rounded-2xl border border-dispatch-border bg-dispatch-bg/70 p-4 text-sm text-slate-300">
        Field access lives on the live operator host. Continue there to open active jobs.
        <button
          type="button"
          onClick={() => {
            window.location.href = OPERATOR_LOGIN_URL;
          }}
          className="mt-4 inline-flex w-full items-center justify-center rounded-xl bg-orange-500 px-4 py-3 font-semibold text-white transition hover:bg-orange-400"
        >
          Continue to field sign in
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="rounded-xl border border-dispatch-border bg-dispatch-bg/70 p-3 text-xs leading-relaxed text-slate-400">
        <div className="font-semibold uppercase tracking-[0.18em] text-slate-500">Field access</div>
        <p className="mt-2">For operators working live Ottawa roadside jobs in the field.</p>
      </div>
      <div className="relative">
        <User className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
        <select
          value={selectedId}
          onChange={(event) => setSelectedId(event.target.value)}
          className="w-full appearance-none rounded-xl border border-dispatch-border bg-dispatch-surface pl-10 pr-4 py-3.5 text-sm text-white transition-colors focus:border-orange-500 focus:outline-none"
          disabled={opsLoading}
        >
          {opsLoading ? <option>Loading team members…</option> : null}
          {!opsLoading && operators.length === 0 ? <option>No team members found</option> : null}
          {operators.map((operator) => (
            <option key={operator.id} value={operator.id}>
              {operator.name}
            </option>
          ))}
        </select>
      </div>
      <div className="relative">
        <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
        <input
          type="password"
          value={pin}
          onChange={(event) => setPin(event.target.value)}
          placeholder="Access PIN"
          inputMode="numeric"
          className="w-full rounded-xl border border-dispatch-border bg-dispatch-surface pl-10 pr-4 py-3.5 text-sm tracking-widest text-white placeholder-slate-600 transition-colors focus:border-orange-500 focus:outline-none"
        />
      </div>
      {error ? (
        <div className="flex items-center gap-1.5 text-xs text-red-400">
          <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      ) : null}
      <button
        type="submit"
        disabled={loading || opsLoading || !selectedId || !pin}
        className="inline-flex items-center justify-center gap-2 rounded-xl bg-orange-500 px-4 py-3.5 text-sm font-bold text-white transition hover:bg-orange-400 disabled:opacity-50"
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        {loading ? 'Signing in…' : 'Open field workspace'}
      </button>
    </form>
  );
}

function AdminFrontDoor({ privateAdminHost }: { privateAdminHost: boolean }) {
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!privateAdminHost) {
      window.location.href = ADMIN_LOGIN_URL;
      return;
    }
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
      window.location.href = '/admin';
    } catch {
      setError('Network error. Try again.');
    } finally {
      setLoading(false);
    }
  }

  if (!privateAdminHost) {
    return (
      <div className="rounded-2xl border border-dispatch-border bg-dispatch-bg/70 p-4 text-sm text-slate-300">
        Oversight access stays on the protected admin host. Continue there to review live jobs, operators, and activity history.
        <button
          type="button"
          onClick={() => {
            window.location.href = ADMIN_LOGIN_URL;
          }}
          className="mt-4 inline-flex w-full items-center justify-center rounded-xl bg-orange-500 px-4 py-3 font-semibold text-white transition hover:bg-orange-400"
        >
          Continue to oversight sign in
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="rounded-xl border border-dispatch-border bg-dispatch-bg/70 p-3 text-xs leading-relaxed text-slate-400">
        <div className="font-semibold uppercase tracking-[0.18em] text-slate-500">Oversight access</div>
        <p className="mt-2">For monitoring live Ottawa operations, operator movement, and job outcomes.</p>
      </div>
      <div className="relative">
        <Shield className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
        <input
          type="password"
          value={pin}
          onChange={(event) => setPin(event.target.value)}
          placeholder="Oversight PIN"
          inputMode="numeric"
          autoFocus
          className="w-full rounded-xl border border-dispatch-border bg-dispatch-surface pl-10 pr-4 py-3.5 text-sm tracking-widest text-white placeholder-slate-600 transition-colors focus:border-orange-500 focus:outline-none"
        />
      </div>
      {error ? (
        <div className="flex items-center gap-1.5 text-xs text-red-400">
          <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      ) : null}
      <button
        type="submit"
        disabled={loading || !pin}
        className="inline-flex items-center justify-center gap-2 rounded-xl bg-orange-500 px-4 py-3.5 text-sm font-bold text-white transition hover:bg-orange-400 disabled:opacity-50"
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        {loading ? 'Signing in…' : 'Open oversight workspace'}
      </button>
    </form>
  );
}
