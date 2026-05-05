import Link from "next/link";
import type { GardenService } from "../../../lib/gardenCleaners";

interface GardenServiceCardProps {
  service: GardenService;
}

export default function GardenServiceCard({ service }: GardenServiceCardProps) {
  return (
    <article className="card garden-service-card garden-service-card--compact">
      <h3>{service.title}</h3>
      <p className="muted">{service.summary}</p>
      <ul className="feature-list compact-feature-list">
        {service.bullets.slice(0, 2).map((bullet) => (
          <li key={bullet}>{bullet}</li>
        ))}
      </ul>
      <Link href="/garden-cleaners/quote" prefetch={false} className="inline-link">
        Request quote
      </Link>
    </article>
  );
}
