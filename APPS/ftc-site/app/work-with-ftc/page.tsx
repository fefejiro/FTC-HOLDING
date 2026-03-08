import { serviceTracks } from "../../lib/content";
import ServiceCard from "../components/ServiceCard";

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
        <form className="intake-form" action="#" method="post">
          <label>
            Name
            <input type="text" name="name" required />
          </label>
          <label>
            Email
            <input type="email" name="email" required />
          </label>
          <label>
            Project Idea
            <textarea name="projectIdea" rows={5} required />
          </label>
          <label>
            Budget Range
            <select name="budgetRange" defaultValue="under-5k">
              <option value="under-5k">Under $5k</option>
              <option value="5k-15k">$5k - $15k</option>
              <option value="15k-50k">$15k - $50k</option>
              <option value="50k-plus">$50k+</option>
            </select>
          </label>
          <label>
            Timeline
            <select name="timeline" defaultValue="2-6-weeks">
              <option value="2-6-weeks">2-6 weeks</option>
              <option value="6-12-weeks">6-12 weeks</option>
              <option value="12-weeks-plus">12+ weeks</option>
            </select>
          </label>
          <button type="submit" className="btn btn-primary">
            Submit Intake
          </button>
        </form>
      </section>
    </div>
  );
}

