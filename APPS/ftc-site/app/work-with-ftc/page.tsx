import { serviceTracks } from "../../lib/content";
import ServiceCard from "../components/ServiceCard";
import WorkIntakeForm from "../components/WorkIntakeForm";

export const metadata = {
  title: "Work With FTC",
  description: "Engage FTC for AI systems, automation, and product execution."
};

export default function WorkWithFtcPage() {
  return (
    <div className="container page-content">
      <h1>Work With FTC</h1>
      <p className="page-intro">
        If you have an idea, workflow, or product to build, we can scope a practical
        execution path with clear milestones.
      </p>

      <div className="cards-grid cards-grid-3">
        {serviceTracks.map((track) => (
          <ServiceCard key={track.audience} track={track} />
        ))}
      </div>

      <section className="intake-card">
        <h2>Project Intake</h2>
        <p className="muted">
          Submit your project details and FTC will respond with a scoped next step.
        </p>
        <WorkIntakeForm />
      </section>
    </div>
  );
}
