import Link from "next/link";
import { polarAnchorBasePath, type PolarService } from "../../../lib/polarAnchor";

interface PolarServiceCardProps {
  service: PolarService;
}

export default function PolarServiceCard({ service }: PolarServiceCardProps) {
  return (
    <article className="card polar-service-card">
      <h3>{service.title}</h3>
      <p className="muted">{service.summary}</p>
      <p>{service.detail}</p>
      <ul className="feature-list compact-feature-list">
        {service.bullets.map((bullet) => (
          <li key={bullet}>{bullet}</li>
        ))}
      </ul>
      <Link href={`${polarAnchorBasePath}/quote`} prefetch={false} className="inline-link">
        Request quote
      </Link>
    </article>
  );
}
