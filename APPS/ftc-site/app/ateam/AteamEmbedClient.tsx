"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ATEAM_LOCAL_EMBED_ORIGINS,
  type AteamLocalSurfaceKey,
  ateamLocalSurfaces,
  getAteamLocalSurface
} from "../../lib/ateamEmbed";

type ProbeStatus = "checking" | "ready" | "unavailable";

function joinOrigin(origin: string, route: string) {
  const safeOrigin = String(origin || "").replace(/\/+$/, "");
  const safeRoute = String(route || "/").startsWith("/") ? route : `/${route}`;
  return `${safeOrigin}${safeRoute}`;
}

function canProbeLoopbackFromCurrentPage() {
  if (typeof window === "undefined") {
    return false;
  }

  const hostname = String(window.location.hostname || "").toLowerCase();
  return (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "::1" ||
    hostname === "[::1]"
  );
}

export default function AteamEmbedClient({ surfaceKey }: { surfaceKey: AteamLocalSurfaceKey }) {
  const currentSurface = getAteamLocalSurface(surfaceKey);
  const probeOrigins = useMemo(() => Array.from(new Set(ATEAM_LOCAL_EMBED_ORIGINS)), []);
  const [canProbeLoopback, setCanProbeLoopback] = useState(false);
  const [status, setStatus] = useState<ProbeStatus>("checking");
  const [activeOrigin, setActiveOrigin] = useState("");
  const [probeNonce, setProbeNonce] = useState(0);

  const probeLocalAteam = useCallback(async (signal?: AbortSignal) => {
    setStatus("checking");

    for (const origin of probeOrigins) {
      try {
        const response = await fetch(joinOrigin(origin, "/health"), {
          cache: "no-store",
          mode: "cors",
          signal
        });

        if (response.ok) {
          setActiveOrigin(origin);
          setStatus("ready");
          return;
        }
      } catch {
        // Keep walking the candidate list until one local ATEAM origin responds.
      }
    }

    setActiveOrigin("");
    setStatus("unavailable");
  }, [probeOrigins]);

  useEffect(() => {
    const shouldProbeLoopback = canProbeLoopbackFromCurrentPage();
    setCanProbeLoopback(shouldProbeLoopback);

    if (!shouldProbeLoopback) {
      setStatus("unavailable");
      setActiveOrigin("");
      return;
    }

    const controller = new AbortController();
    void probeLocalAteam(controller.signal);
    return () => controller.abort();
  }, [probeLocalAteam, probeNonce]);

  const iframeSrc = activeOrigin ? joinOrigin(activeOrigin, currentSurface.route) : "";
  const openHref = joinOrigin(activeOrigin || probeOrigins[0], currentSurface.route);

  return (
    <section className="card ateam-embed-shell">
      <div className="ateam-embed-head">
        <div className="ateam-embed-head-copy">
          <p className="card-kicker">Live local surface</p>
          <h2>{currentSurface.label}</h2>
          <p>{currentSurface.summary}</p>
        </div>
        <p className={`ateam-embed-status ateam-embed-status--${status}`}>
          {status === "ready"
            ? `Connected to ${activeOrigin}`
            : status === "checking"
              ? "Checking for local ATEAM on this machine"
              : canProbeLoopback
                ? "Local ATEAM is not reachable yet"
                : "Public site cannot auto-embed localhost"}
        </p>
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
          {canProbeLoopback ? (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setProbeNonce((value) => value + 1)}
            >
              Retry local ATEAM
            </button>
          ) : null}
          <a href={openHref} target="_blank" rel="noreferrer" className="btn btn-primary">
            {canProbeLoopback ? "Open this surface" : "Open local ATEAM"}
          </a>
        </div>
      </div>

      <p className="ateam-embed-note">
        Una Labs keeps the product route and branding. The surface below is the real local ATEAM app
        from this machine, not a recreated mock.
      </p>

      {status === "ready" ? (
        <div className="ateam-embed-frame-shell">
          <iframe
            key={iframeSrc}
            src={iframeSrc}
            title={`ATEAM ${currentSurface.label}`}
            className="ateam-embed-frame"
            allow="microphone; clipboard-read; clipboard-write; autoplay"
            sandbox="allow-downloads allow-forms allow-modals allow-popups allow-same-origin allow-scripts"
            referrerPolicy="no-referrer"
          />
        </div>
      ) : (
        <div className="ateam-embed-fallback" role="status" aria-live="polite">
          <div>
            <p className="card-kicker">Local handoff required</p>
            <h3>
              {canProbeLoopback
                ? "Start the real ATEAM runtime, then reload this route."
                : "Open the real ATEAM runtime from this machine."}
            </h3>
            {canProbeLoopback ? (
              <p>
                This Una Labs route is ready to embed the actual local product once ATEAM is running on
                port <code>3000</code> on this same machine.
              </p>
            ) : (
              <p>
                This public Una Labs page can preview ATEAM, but the browser will not let a public
                origin auto-embed <code>localhost:3000</code>. Open the local surface directly, or run
                Una Labs locally to get the embedded view.
              </p>
            )}
          </div>
          <div className="ateam-embed-fallback-meta">
            <p className="ateam-embed-command">npm --prefix APPS/ATEAM/Server start</p>
            <p className="muted">
              {canProbeLoopback
                ? `When that server comes up, this page will load the real ${currentSurface.label} surface.`
                : `When ATEAM is running locally, the button above opens the real ${currentSurface.label} surface on this machine.`}
            </p>
          </div>
        </div>
      )}
    </section>
  );
}
