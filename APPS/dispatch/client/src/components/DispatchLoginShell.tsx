import type { ReactNode } from 'react';
import { cn } from '../lib/cn';
import LoginRoleSwitch from './LoginRoleSwitch';
import type { LoginRole } from '../lib/loginRoleRoutes';

type DispatchLoginShellProps = {
  activeRole: LoginRole;
  icon: ReactNode;
  eyebrow: string;
  title: string;
  subtitle: string;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
};

export default function DispatchLoginShell({
  activeRole,
  icon,
  eyebrow,
  title,
  subtitle,
  children,
  footer,
  className,
}: DispatchLoginShellProps) {
  return (
    <div className="min-h-dvh bg-dispatch-bg px-5 py-10 flex items-center justify-center">
      <div className="w-full max-w-md">
        <div
          className={cn(
            'rounded-[28px] border border-dispatch-border bg-gradient-to-b from-dispatch-surface to-[#101827] p-6 shadow-2xl shadow-black/30',
            className,
          )}
        >
          <div className="mb-5 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-orange-500/20 bg-orange-500/10 text-orange-300 shadow-lg shadow-orange-500/10">
                {icon}
              </div>
              <div className="min-w-0">
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                  {eyebrow}
                </div>
                <h1 className="mt-1 text-2xl font-bold text-white leading-tight">{title}</h1>
              </div>
            </div>
          </div>

          <p className="mb-5 text-sm leading-relaxed text-slate-400">{subtitle}</p>

          <div className="mb-5">
            <LoginRoleSwitch activeRole={activeRole} />
          </div>

          {children}

          {footer ? <div className="mt-5 border-t border-dispatch-border pt-4">{footer}</div> : null}
        </div>
      </div>
    </div>
  );
}
