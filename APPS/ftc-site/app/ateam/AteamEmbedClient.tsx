"use client";

import Link from "next/link";
import {
  type AteamLocalSurfaceKey,
  ateamLocalSurfaces,
  getAteamLocalSurface
} from "../../lib/ateamEmbed";

export default function AteamEmbedClient({ surfaceKey }: { surfaceKey: AteamLocalSurfaceKey }) {
  const currentSurface = getAteamLocalSurface(surfaceKey);

  return (
    <section className="card ateam-embed-shell">
      <div className="ateam-embed-head">
        <div className="ateam-embed-head-copy">
          <p className="card-kicker">Operator surface</p>
          <h2>{currentSurface.label}</h2>
          <p>{currentSurface.summary}</p>
        </div>
        <p className="ateam-embed-status ateam-embed-status--ready">Private control plane route</p>
      </div>

      <div className="ateam-embed-toolbar">
        <nav className="ateam-embed-tabs" aria-label="ATEAM surfaces">
          {ateamLocalSurfaces.map((surface) => {
            const isActive = surface.key === currentSurface.key;

            return (
              <Link
                key={surface.key}
                href={surface.href}
                prefetch={false}
                className={`ateam-embed-tab${isActive ? " is-active" : ""}`}
                aria-current={isActive ? "page" : undefined}
              >
                <span>{surface.label}</span>
                <small>{surface.detail}</small>
              </Link>
            );
          })}
        </nav>

        <div className="ateam-embed-actions">
          <Link href="/ateam" prefetch={false} className="btn btn-secondary">
            Open public intake
          </Link>
          <Link href={currentSurface.href} prefetch={false} className="btn btn-primary">
            Open operator route
          </Link>
        </div>
      </div>

      <div className="ateam-embed-fallback" role="status" aria-live="polite">
        <div>
          <p className="card-kicker">Cloud-native split</p>
          <h3>The public route stays client-safe. Operator controls stay private.</h3>
          <p>
            ATEAM now treats intake, jobs, artifacts, and approvals as one shared model across the
            public and private surfaces. This shell points to the secured operator route instead of
            pretending the marketing page should embed it inline.
          </p>
        </div>
      </div>
    </section>
  );
}
