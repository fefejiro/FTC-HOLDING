export const dynamic = "force-static";

﻿import Link from 'next/link';

export const metadata = {
  title: 'Intelligent Systems & Automation Engineering | Fejiro Technology Consultancy Inc.',
  description: 'Workflow automation, dashboards, integration between tools, and governance-aware operational intelligence.'
};

export default function IntelligentSystemsAutomationPage() {
  return (
    <main style={{ maxWidth: 1100, margin: '0 auto', padding: '56px 20px' }}>
      <h1 style={{ marginBottom: 12 }}>Intelligent Systems & Automation Engineering</h1>
      <p style={{ maxWidth: 820, opacity: 0.9 }}>
        Una Labs designs automation that reduces manual work, improves consistency, and strengthens decision-making.
        The goal is operational intelligence that fits governance realities and supports long-term scale.
      </p>

      <section style={{ marginTop: 36 }}>
        <h2>Typical engagements</h2>
        <ul>
          <li>Automation opportunity discovery across operational workflows</li>
          <li>Dashboard and reporting systems for executive visibility</li>
          <li>Integration between disconnected tools to reduce manual handoffs</li>
          <li>Exception handling patterns to reduce repetitive failures</li>
          <li>Governance-aware workflow design and documentation</li>
        </ul>
      </section>

      <section style={{ marginTop: 28 }}>
        <h2>Applied AI within Automation</h2>
        <ul>
          <li>AI-assisted triage and routing for operational workflows</li>
          <li>Automated summarization for executive reporting inputs</li>
          <li>Pattern detection for process bottlenecks and exception handling</li>
          <li>Structured data extraction and validation within governance constraints</li>
        </ul>
      </section>

      <section style={{ marginTop: 28 }}>
        <h2>What you get</h2>
        <ul>
          <li>Workflow design with clear controls, ownership, and auditability</li>
          <li>Automation components and integration touchpoints</li>
          <li>Dashboards and reporting outputs aligned to operational goals</li>
          <li>Operational playbooks for sustainment</li>
        </ul>
      </section>

      <section style={{ marginTop: 28 }}>
        <h2>Outcomes</h2>
        <ul>
          <li>Reduced manual effort and fewer process errors</li>
          <li>Improved throughput and faster operational decision cycles</li>
          <li>More reliable reporting inputs and data consistency</li>
          <li>Foundation for responsible automation expansion</li>
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
