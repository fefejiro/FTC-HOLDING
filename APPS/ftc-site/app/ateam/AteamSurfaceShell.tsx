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
              This route keeps the Una Labs wrapper at the top, then hands you into the real ATEAM{" "}
              {surface.label} surface running on this machine.
            </p>
          </div>
        </div>

        <section className="card ateam-live-summary-card">
          <div className="ateam-live-summary-copy">
            <p className="card-kicker">Current surface</p>
            <h2>{surface.label}</h2>
            <p>{surface.detail}</p>
            <ul className="ateam-hero-list">
              <li>Loads the real ATEAM runtime from <code>localhost:3000</code>.</li>
              <li>Keeps Office, Memory, Team, Factory, and Pipeline reachable from Una Labs routes.</li>
              <li>Shows a clear recovery state instead of pretending the product is live when the app is off.</li>
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
