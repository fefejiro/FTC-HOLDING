import type { ServiceTrack } from "../../lib/content";

interface ServiceCardProps {
  track: ServiceTrack;
}

export default function ServiceCard({ track }: ServiceCardProps) {
  return (
    <article className="card service-card">
      <h3>{track.title}</h3>
      <p>{track.summary}</p>
      <ul>
        {track.examples.map((example) => (
          <li key={example}>{example}</li>
        ))}
      </ul>
    </article>
  );
}

