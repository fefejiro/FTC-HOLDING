import AteamEmbedClient from "./AteamEmbedClient";
import {
  ATEAM_BRAND_LOGO_PATH,
  ATEAM_MISSION_CONTROL_PREVIEW_PATH,
  type AteamLocalSurfaceKey,
  getAteamLocalSurface
} from "../../lib/ateamEmbed";

export default function AteamSurfaceShell({ surfaceKey }: { surfaceKey: AteamLocalSurfaceKey }) {
  const surface = getAteamLocalSurface(surfaceKey);

  return (
    <article className="container page-content ateam-page ateam-page--live">
      <section className="ateam-section ateam-section--hero">
        <div className="ateam-hero-topline">
          <div className="ateam-hero-mark" aria-hidden="true">
            <img src={ATEAM_BRAND_LOGO_PATH} alt="" width={64} height={64} />
          </div>
          <div className="ateam-hero-heading">
            <p className="eyebrow">Real ATEAM route</p>
            <h1>ATEAM inside Una Labs opens the actual local product, not a fake demo.</h1>
            <p className="lead">
              This route keeps the Una Labs wrapper at the top. Open it locally to embed the live
              ATEAM {surface.label} surface, or use the public page as a clean handoff into that same
              runtime on your machine.
            </p>
          </div>
        </div>

        <section className="card ateam-live-summary-card">
          <div className="ateam-live-summary-copy">
            <p className="card-kicker">Current surface</p>
            <h2>{surface.label}</h2>
            <p>{surface.detail}</p>
            <ul className="ateam-hero-list">
              <li>Uses the real ATEAM runtime from <code>localhost:3000</code> when Una Labs is opened locally.</li>
              <li>Keeps Office, Memory, Team, Factory, and Pipeline reachable from Una Labs routes.</li>
              <li>Shows a clear local handoff instead of pretending the public site can embed your machine automatically.</li>
            </ul>
          </div>

          <div className="ateam-live-summary-preview">
            <img
              src={ATEAM_MISSION_CONTROL_PREVIEW_PATH}
              alt="ATEAM Mission Control preview inside Una Labs"
              className="ateam-live-summary-image"
            />
          </div>
        </section>

        <AteamEmbedClient surfaceKey={surface.key} />
      </section>
    </article>
  );
}
