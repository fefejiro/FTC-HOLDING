import Link from 'next/link';

export const metadata = {
  title: 'Product & Technical Architecture Advisory | Fejiro Technology Consultancy Inc.',
  description: 'MVP system design, scalable architecture planning, API strategy, and technical roadmaps.'
};

export default function ProductTechnicalArchitecturePage() {
  return (
    <main style={{ maxWidth: 1100, margin: '0 auto', padding: '56px 20px' }}>
      <h1 style={{ marginBottom: 12 }}>Product & Technical Architecture Advisory</h1>
      <p style={{ maxWidth: 820, opacity: 0.9 }}>
        Una Labs advises founders and product leaders on architecture that supports scale, clarity, and maintainability.
        The focus is practical system design, API strategy, and roadmap discipline that reduces technical debt.
      </p>

      <section style={{ marginTop: 36 }}>
        <h2>Typical engagements</h2>
        <ul>
          <li>MVP architecture design and technical scope discipline</li>
          <li>Scalable backend planning and environment strategy</li>
          <li>API architecture and integration design</li>
          <li>Technical roadmap structuring and milestone sequencing</li>
          <li>Governance-ready documentation for long-term maintainability</li>
        </ul>
      </section>

      <section style={{ marginTop: 28 }}>
        <h2>What you get</h2>
        <ul>
          <li>Architecture blueprint aligned to product goals</li>
          <li>Roadmap with sequencing, risks, and tradeoffs made explicit</li>
          <li>API design guidance and integration approach</li>
          <li>Maintainability and governance recommendations</li>
        </ul>
      </section>

      <section style={{ marginTop: 28 }}>
        <h2>Outcomes</h2>
        <ul>
          <li>Reduced technical debt and fewer costly rebuild cycles</li>
          <li>Clearer development priorities and execution clarity</li>
          <li>Architecture that supports growth without fragility</li>
          <li>Better alignment between product intent and system design</li>
        </ul>
      </section>

      <section style={{ marginTop: 36 }}>
        <Link href="/work-with-ftc" style={{ textDecoration: 'underline' }}>
          Start a Project
        </Link>
      </section>
    </main>
  );
}
