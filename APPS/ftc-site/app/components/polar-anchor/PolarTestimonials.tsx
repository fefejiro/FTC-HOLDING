import { polarAnchorConfig } from "../../../lib/polarAnchor";

export default function PolarTestimonials() {
  return (
    <div className="cards-grid cards-grid-3 polar-testimonial-grid">
      {polarAnchorConfig.testimonials.map((item) => (
        <article key={item.name} className="card polar-testimonial-card">
          <p className="polar-quote-mark">&ldquo;</p>
          <p>{item.quote}</p>
          <div className="polar-testimonial-meta">
            <strong>{item.name}</strong>
            <span>{item.role}</span>
          </div>
        </article>
      ))}
    </div>
  );
}
