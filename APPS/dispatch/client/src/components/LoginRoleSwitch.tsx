import { cn } from '../lib/cn';
import { loginRoleHref, type LoginRole } from '../lib/loginRoleRoutes';

type LoginRoleSwitchProps = {
  activeRole: LoginRole;
  className?: string;
};

function roleItem(activeRole: LoginRole, role: LoginRole) {
  const isActive = activeRole === role;
  const label = role === 'operator' ? 'Operator' : 'Admin';
  return {
    isActive,
    label,
    href: loginRoleHref(role),
  };
}

export default function LoginRoleSwitch({ activeRole, className }: LoginRoleSwitchProps) {
  const options = [roleItem(activeRole, 'operator'), roleItem(activeRole, 'admin')];

  return (
    <div
      className={cn(
        'rounded-2xl border border-dispatch-border bg-dispatch-bg/80 p-3',
        className,
      )}
    >
      <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
        Access profile
      </label>
      <select
        aria-label="Login role switch"
        value={activeRole}
        onChange={(event) => {
          const nextRole = event.target.value as LoginRole;
          const href = loginRoleHref(nextRole);
          if (typeof window !== 'undefined') {
            window.location.href = href;
          }
        }}
        className="w-full rounded-xl border border-dispatch-border bg-dispatch-surface px-4 py-3 text-sm font-semibold text-white outline-none transition-colors focus:border-orange-500"
      >
        {options.map((option) => (
          <option
            key={option.label}
            value={option.label.toLowerCase()}
            className="bg-slate-900 text-white"
          >
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
