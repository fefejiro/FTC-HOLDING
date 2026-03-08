import Link from "next/link";
import type { CapabilityItem } from "../../lib/content";

interface CapabilityCardProps {
  capability: CapabilityItem;
}

export default function CapabilityCard({ capability }: CapabilityCardProps) {
  return (
    <article className="card capability-card">
      <h3>{capability.title}</h3>
      <p className="muted">{capability.summary}</p>
      <ul className="chip-list">
        {capability.examples.map((example) => (
          <li key={example} className="chip">
            {example}
          </li>
        ))}
      </ul>
      <Link href={`/work?pillar=${capability.slug}`} className="inline-link">
        See related work
      </Link>
    </article>
  );
}

