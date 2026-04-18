import type { Metadata } from 'next';
import { ProductPage } from '@/components/templates/ProductPage';

export const metadata: Metadata = {
  title: 'Intake & Scoping — Una Labs',
  description:
    'Turn rough requests into structured scope in 48 hours. No polished brief required.',
};

export default function IntakeScopingPage() {
  return (
    <ProductPage
      featureTitle="Intake & Scoping"
      eyebrow="Start right"
      headline="Turn rough requests into structured scope"
      accentPhrase="structured scope"
      subheadline="No polished brief required. Describe the problem or goal — Una Labs structures it into a scoped brief, recommended direction, and clear proposal within 48 hours."
      problemStatement="Most agencies need a polished brief before work can start. Most clients don't have one. That gap costs time, money, and relationships."
      solutionBody="Una Labs intake handles the structure for you. Submit rough input. Get a brief back. Agree on scope. Move forward."
      keyFeatures={[
        {
          icon: '📋',
          title: 'Smart intake forms',
          description: 'Customizable forms that capture context without overwhelming.',
        },
        {
          icon: '⚡',
          title: '48h turnaround',
          description: 'Structured brief in your inbox within two business days.',
        },
        {
          icon: '✅',
          title: 'Scope before spend',
          description: 'You see the scope and agree before any deposit is collected.',
        },
      ]}
      testimonialQuote="I submitted a half-formed idea and got back a real scoped brief with options. First time I've ever felt like the intake process added value."
      testimonialAuthor="James Park"
      testimonialTitle="Operations Manager"
      testimonialCompany="Fortis Consulting"
      ctaPrimaryLabel="Start with your request"
      ctaPrimaryHref="/start"
    />
  );
}
