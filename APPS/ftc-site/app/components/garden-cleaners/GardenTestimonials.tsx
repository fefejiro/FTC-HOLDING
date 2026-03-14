import { gardenCleanersConfig } from "../../../lib/gardenCleaners";

export default function GardenTestimonials() {
  return (
    <div className="cards-grid cards-grid-3 garden-testimonial-grid">
      {gardenCleanersConfig.testimonials.map((item) => (
        <article key={item.name} className="card garden-testimonial-card">
          <p className="garden-quote-mark">&ldquo;</p>
          <p>{item.quote}</p>
          <div className="garden-testimonial-meta">
            <strong>{item.name}</strong>
            <span>{item.role}</span>
          </div>
        </article>
      ))}
    </div>
  );
}
