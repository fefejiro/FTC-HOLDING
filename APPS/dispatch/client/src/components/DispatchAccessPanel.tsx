import { cn } from '../lib/cn';
import LoginRoleSwitch from './LoginRoleSwitch';
import type { LoginRole } from '../lib/loginRoleRoutes';

type DispatchAccessPanelProps = {
  activeRole: LoginRole;
  profileLabel?: string;
  profileMeta?: string;
  showRoleSwitch?: boolean;
  className?: string;
};

export default function DispatchAccessPanel({
  activeRole,
  profileLabel,
  profileMeta,
  showRoleSwitch = true,
  className,
}: DispatchAccessPanelProps) {
  const showProfile = Boolean(profileLabel || profileMeta);

  return (
    <section
      aria-label="Dispatch access panel"
      className={cn('rounded-2xl border border-dispatch-border bg-dispatch-surface p-3.5', className)}
    >
      {showProfile ? (
        <>
          <div className="flex items-center justify-between gap-3">
            <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
              Signed in as
            </span>
            {profileLabel ? (
              <span className="rounded-full border border-orange-500/20 bg-orange-500/10 px-2.5 py-1 text-xs font-semibold text-orange-200">
                {profileLabel}
              </span>
            ) : null}
          </div>
          {profileMeta ? <p className="mt-2 text-xs text-slate-500">{profileMeta}</p> : null}
        </>
      ) : null}

      {showRoleSwitch ? (
        <LoginRoleSwitch activeRole={activeRole} className={showProfile ? 'mt-3' : ''} />
      ) : null}
    </section>
  );
}
