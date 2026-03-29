import Image from "next/image";
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
              <Image src={ATEAM_BRAND_LOGO_PATH} alt="" width={64} height={64} />
            </div>
          <div className="ateam-hero-heading">
            <p className="eyebrow">ATEAM operator route</p>
            <h1>ATEAM inside Una Labs keeps the public and operator surfaces on one workflow model.</h1>
            <p className="lead">
              This route keeps the Una Labs wrapper at the top while pointing to the private ATEAM{" "}
              {surface.label} surface. The public page handles intake and preview artifacts. The
              operator route handles approvals, logs, and delivery control.
            </p>
          </div>
        </div>

        <section className="card ateam-live-summary-card">
          <div className="ateam-live-summary-copy">
            <p className="card-kicker">Current surface</p>
            <h2>{surface.label}</h2>
            <p>{surface.detail}</p>
            <ul className="ateam-hero-list">
              <li>Keeps Office, Memory, Team, Factory, and Pipeline reachable through operator routes.</li>
              <li>Shares the same runs, jobs, artifacts, and approval state as the public intake flow.</li>
              <li>Protects operator controls instead of leaking them into the public marketing surface.</li>
            </ul>
          </div>

          <div className="ateam-live-summary-preview">
            <Image
              src={ATEAM_MISSION_CONTROL_PREVIEW_PATH}
              alt="ATEAM Mission Control preview inside Una Labs"
              className="ateam-live-summary-image"
              width={960}
              height={540}
            />
          </div>
        </section>

        <AteamEmbedClient surfaceKey={surface.key} />
      </section>
    </article>
  );
}
