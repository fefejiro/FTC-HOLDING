import type { AppRole, AppUser } from '../../lib/foundation-data';

type LoginPageProps = {
  currentUser: AppUser;
  authEnabled: boolean;
  authEmail: string;
  authMessage: string;
  activeRole: AppRole;
  availableRoles: AppRole[];
  onAuthEmailChange: (email: string) => void;
  onMagicLinkRequest: () => Promise<void>;
  onRoleChange: (role: AppRole) => void;
  onSignOut: () => Promise<void>;
};

export function LoginPage({
  currentUser,
  authEnabled,
  authEmail,
  authMessage,
  activeRole,
  availableRoles,
  onAuthEmailChange,
  onMagicLinkRequest,
  onRoleChange,
  onSignOut,
}: LoginPageProps) {
  return (
    <section className="panel">
      <h2>Auth and Role Model</h2>
      <p>
        This slice now supports real Supabase session scaffolding when env keys are present, with
        demo-mode role switching kept as a fallback while profile persistence is still being wired.
      </p>
      <div className="card-grid two-up">
        <article className="card">
          <h3>Active Session</h3>
          <p><strong>{currentUser.displayName}</strong></p>
          <p>{currentUser.email}</p>
          <p>Role: {currentUser.role}</p>
          <p>Mode: {authEnabled ? 'Supabase-ready' : 'Demo fallback'}</p>
        </article>
        <article className="card">
          <h3>{authEnabled ? 'Session Access' : 'Role Switch'}</h3>
          {authEnabled ? (
            <div className="auth-stack">
              <label className="field">
                <span>Email magic link</span>
                <input
                  placeholder="parent@anion.app"
                  value={authEmail}
                  onChange={(event) => onAuthEmailChange(event.target.value)}
                />
              </label>
              <div className="button-row">
                <button className="button button-active" onClick={() => void onMagicLinkRequest()} type="button">
                  Send magic link
                </button>
                <button className="button" onClick={() => void onSignOut()} type="button">
                  Sign out
                </button>
              </div>
              {authMessage ? <p>{authMessage}</p> : null}
            </div>
          ) : null}
          <h3>Role Contract</h3>
          <div className="button-row">
            {availableRoles.map((role) => (
              <button
                key={role}
                className={role === activeRole ? 'button button-active' : 'button'}
                onClick={() => onRoleChange(role)}
                type="button"
              >
                {role}
              </button>
            ))}
          </div>
          <p>The selector remains available for local verification of role-scoped UI until profile tables are live.</p>
        </article>
      </div>
    </section>
  );
}