export const dynamic = "force-static";

import { serviceTracks } from "../../lib/content";
import ServiceCard from "../components/ServiceCard";
import WorkIntakeForm from "../components/WorkIntakeForm";

export const metadata = {
  title: "Start a Project | Una Labs",
  description:
    "Send a project request to Una Labs for fast websites, lead systems, and AI-assisted workflow direction."
};

type WorkWithFtcPageProps = {
  searchParams?: {
    from?: string | string[];
  };
};

function readSingleParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? String(value[0] || "") : String(value || "");
}

export default function WorkWithFtcPage({ searchParams }: WorkWithFtcPageProps) {
  const isAteamHandoff = readSingleParam(searchParams?.from).trim().toLowerCase() === "ateam";

  return (
    <div className="container page-content work-intake-page">
      <section className="work-intake-hero">
        <p className="eyebrow">{isAteamHandoff ? "ATEAM handoff" : "Start a Project"}</p>
        <h1>{isAteamHandoff ? "ATEAM already shaped the first pass." : "Turn the idea into a scoped next step."}</h1>
        <p className="page-intro">
          {isAteamHandoff
            ? "You do not need to rewrite the idea. ATEAM already attached the intent, the visible work, and the first output pack. Just tell Una Labs where to reply and add any optional delivery context."
            : "If you need a fast website, stronger lead capture, or a practical AI-assisted workflow, Una Labs can scope the shortest credible path to a working setup."}
        </p>
      </section>

      {isAteamHandoff ? null : (
        <div className="cards-grid cards-grid-3 work-intake-track-grid">
          {serviceTracks.map((track) => (
            <ServiceCard key={track.audience} track={track} />
          ))}
        </div>
      )}

      <section className="intake-card work-intake-shell">
        <div className="work-intake-shell-head">
          <div>
            <p className="card-kicker">{isAteamHandoff ? "Continue from ATEAM" : "Project request"}</p>
            <h2>{isAteamHandoff ? "Send the ATEAM handoff" : "Send a setup request"}</h2>
          </div>
          <p className="muted">
            {isAteamHandoff
              ? "The attached ATEAM brief will carry through automatically. No second idea form."
              : "If you arrived from ATEAM, the form will carry your workflow pack or demo output automatically."}
          </p>
        </div>
        <WorkIntakeForm />
      </section>
    </div>
  );
}
