import { serviceTracks } from "../../lib/content";
import ServiceCard from "../components/ServiceCard";
import WorkIntakeForm from "../components/WorkIntakeForm";

export const metadata = {
  title: "Start a Project | Una Labs",
  description:
    "Send a project request to Una Labs for fast websites, lead systems, and AI-assisted workflow direction."
};

export default function WorkWithFtcPage() {
  return (
    <div className="container page-content work-intake-page">
      <section className="work-intake-hero">
        <p className="eyebrow">Start a Project</p>
        <h1>Turn the idea into a scoped next step.</h1>
        <p className="page-intro">
          If you need a fast website, stronger lead capture, or a practical AI-assisted workflow,
          Una Labs can scope the shortest credible path to a working setup.
        </p>
      </section>

      <div className="cards-grid cards-grid-3 work-intake-track-grid">
        {serviceTracks.map((track) => (
          <ServiceCard key={track.audience} track={track} />
        ))}
      </div>

      <section className="intake-card work-intake-shell">
        <div className="work-intake-shell-head">
          <div>
            <p className="card-kicker">Project request</p>
            <h2>Send a setup request</h2>
          </div>
          <p className="muted">
            If you arrived from ATEAM, the form will carry your workflow pack or demo output automatically.
          </p>
        </div>
        <WorkIntakeForm />
      </section>
    </div>
  );
}
