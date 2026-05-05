export const dynamic = "force-static";

﻿import Link from 'next/link';

export const metadata = {
  title: 'Enterprise Systems & Infrastructure Consulting | Fejiro Technology Consultancy Inc.',
  description: 'Enterprise systems modernization, integration strategy, infrastructure advisory, and implementation support.'
};

export default function EnterpriseSystemsInfrastructurePage() {
  return (
    <main style={{ maxWidth: 1100, margin: '0 auto', padding: '56px 20px' }}>
      <h1 style={{ marginBottom: 12 }}>Enterprise Systems & Infrastructure Consulting</h1>
      <p style={{ maxWidth: 820, opacity: 0.9 }}>
        Una Labs helps organisations modernise enterprise systems and infrastructure by aligning technology, process, and governance.
        The focus is practical integration, operational resilience, and clean execution across complex environments.
      </p>

      <section style={{ marginTop: 36 }}>
        <h2>Typical engagements</h2>
        <ul>
          <li>Current-state assessment across ERP, POS, WMS, and supporting platforms</li>
          <li>Systems integration strategy and interface rationalisation</li>
          <li>Infrastructure and environment advisory with governance considerations</li>
          <li>Implementation support, cutover planning, and operational readiness</li>
          <li>Process modernisation to reduce failure points and manual reconciliation</li>
        </ul>
      </section>

      <section style={{ marginTop: 28 }}>
        <h2>What you get</h2>
        <ul>
          <li>Current-state map of systems, data flows, and operational dependencies</li>
          <li>Integration and modernisation roadmap with sequencing and risk controls</li>
          <li>Implementation support plan and governance-ready documentation</li>
          <li>Operational handover approach for sustainment</li>
        </ul>
      </section>

      <section style={{ marginTop: 28 }}>
        <h2>Outcomes</h2>
        <ul>
          <li>Reduced integration risk and improved operational stability</li>
          <li>Clearer ownership, governance, and system accountability</li>
          <li>Improved data consistency across systems</li>
          <li>Modernisation path that supports scale without chaos</li>
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
