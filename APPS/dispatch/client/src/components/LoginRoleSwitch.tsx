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
  const operator = roleItem(activeRole, 'operator');
  const admin = roleItem(activeRole, 'admin');

  return (
    <nav
      aria-label="Login role switch"
      className={cn(
        'mx-auto grid w-full max-w-sm grid-cols-2 gap-1 rounded-xl border border-dispatch-border bg-dispatch-surface p-1',
        className,
      )}
    >
      {[operator, admin].map((item) => (
        <a
          key={item.label}
          href={item.href}
          aria-current={item.isActive ? 'page' : undefined}
          className={cn(
            'inline-flex items-center justify-center rounded-lg px-3 py-2.5 text-sm font-semibold transition-all',
            item.isActive
              ? 'cursor-default bg-orange-500 text-white shadow-lg shadow-orange-500/20'
              : 'text-slate-300 hover:bg-slate-700/60 hover:text-white',
          )}
        >
          {item.label}
        </a>
      ))}
    </nav>
  );
}
