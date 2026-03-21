import { serviceTracks } from "../../lib/content";
import ServiceCard from "../components/ServiceCard";
import WorkIntakeForm from "../components/WorkIntakeForm";

export const metadata = {
  title: "Request a Website or Lead Automation Setup | Una Labs",
  description: "Start a project with Una Labs for fast websites, lead follow-up systems, and practical AI execution."
};

export default function WorkWithFtcPage() {
  return (
    <div className="container page-content">
      <h1>Start a Project</h1>
      <p className="page-intro">
        If you need a fast website, stronger lead capture, or practical automation, Una Labs
        can scope the shortest path to a working setup.
      </p>

      <div className="cards-grid cards-grid-3">
        {serviceTracks.map((track) => (
          <ServiceCard key={track.audience} track={track} />
        ))}
      </div>

      <section className="intake-card">
        <h2>Setup Intake</h2>
        <p className="muted">
          Submit your request and Una Labs will respond with a scoped next step quickly.
        </p>
        <WorkIntakeForm />
      </section>
    </div>
  );
}
