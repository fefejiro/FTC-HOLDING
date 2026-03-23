import type { ServiceTrack } from "../../lib/content";

interface ServiceCardProps {
  track: ServiceTrack;
}

export default function ServiceCard({ track }: ServiceCardProps) {
  return (
    <article className="card service-card">
      <p className="card-kicker">Service lane</p>
      <h3>{track.title}</h3>
      <p>{track.summary}</p>
      <ul className="compact-feature-list">
        {track.examples.map((example) => (
          <li key={example}>{example}</li>
        ))}
      </ul>
    </article>
  );
}

