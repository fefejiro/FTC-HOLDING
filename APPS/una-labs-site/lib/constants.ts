import { productPages, proofHighlights, solutionPages } from '@/lib/site-content';

const productLinks = Object.values(productPages);
const solutionLinks = Object.values(solutionPages);

export const NAV = {
  main: [
    { label: 'What we do', href: '/how-it-works' },
    { label: 'Selected work', href: '/product' },
    { label: 'About', href: '/about' },
    {
      label: 'Resources',
      children: [
        { label: 'Blog', href: '/blog', description: 'Field notes from product work and delivery' },
        { label: 'Help Center', href: '/help', description: 'Answers about starting and working with Una Labs' },
        { label: 'Spark AI', href: '/spark', description: 'Ask Spark anything about Una Labs' },
      ],
    },
    { label: 'Pricing', href: '/pricing' },
    { label: 'How It Works', href: '/how-it-works' },
  ],
};

export const FEATURES = [
  { id: 1, icon: '📋', label: 'Intake & Scoping', slug: 'intake-scoping', benefit: 'Turn rough requests into structured briefs without a sales maze.' },
  { id: 2, icon: '📊', label: 'Real-Time Dashboard', slug: 'reporting', benefit: 'Keep delivery state visible instead of buried in chat and memory.' },
  { id: 3, icon: '🪟', label: 'Client Portal', slug: 'deals-pipeline', benefit: 'Give clients confidence without exposing every internal moving part.' },
  { id: 4, icon: '✅', label: 'Approval Gates', slug: 'contracts-e-sign', benefit: 'Treat sign-off as a governed stage, not a fuzzy final email.' },
  { id: 5, icon: '💳', label: 'Live Payments', slug: 'live-payments', benefit: 'Move from scoped summary into real Stripe checkout on the public site.' },
  { id: 6, icon: '📦', label: 'Delivery Proof', slug: 'contracts-e-sign', benefit: 'Close projects with documentation, handoff context, and durable records.' },
  { id: 7, icon: '🤖', label: 'Automated Handoff', slug: 'integrations', benefit: 'Carry approved customer context into the internal delivery workflow behind the scenes.' },
  { id: 8, icon: '📈', label: 'Reporting', slug: 'reporting', benefit: 'Turn project truth into client-ready proof instead of rebuilding it later.' },
];

export const PROOF_METRICS = proofHighlights;

export const INDUSTRIES = solutionLinks.map((page) => ({
  icon: page.icon,
  title: page.shortTitle,
  description: page.description,
  href: `/solutions/${page.slug}`,
  slug: page.slug,
}));

export const PROBLEM_SOLUTIONS = [
  {
    eyebrow: 'The visibility problem',
    headline: 'Clients need to see progress, not just results',
    body: 'When clients lack visibility into project progress, they get anxious. They send update emails. They interrupt the team. They doubt the timeline. Real-time visibility builds trust and reduces the cost of communication.',
    bullets: [
      'Real-time progress tracking visible to clients',
      'Automated milestone notifications',
      'Shared dashboard view with cleaner client-facing visibility',
      'No more "where\'s my project?" emails',
    ],
    ctaLabel: 'See dashboard in action',
    ctaHref: '/product/dashboard',
  },
  {
    eyebrow: 'The reporting problem',
    headline: "Reporting shouldn't take weeks to assemble",
    body: 'Manual report assembly consumes hours that should go to delivery. Clients want impact quantified. Automated insights cut reporting time while making every engagement look more professional.',
    bullets: [
      'Auto-generated from project data, no copy-paste',
      'Structured proof tied to actual delivery context',
      'Client-ready reporting and handoff outputs',
      'Trend visibility across engagements',
    ],
    ctaLabel: 'Explore reporting',
    ctaHref: '/product/reporting',
  },
  {
    eyebrow: 'The handoff problem',
    headline: "Delivery without proof isn't done",
    body: "Work isn't done until it's documented. Every Una Labs engagement ends with handoff-ready output, including access details, evidence, and a completion record, so clients have something durable.",
    bullets: [
      'Structured sign-off workflow with client approval',
      'Timestamped completion and approval records',
      'Reusable delivery documentation templates',
      'Handoff package ready for every engagement',
    ],
    ctaLabel: 'See how sign-off works',
    ctaHref: '/product/approval-sign-off',
  },
];

export const ENGAGEMENT_PATHS = [
  {
    name: 'Clarity Sprint',
    eyebrow: 'Start here',
    description: 'Turn a messy problem into a clear opportunity, first version, and next step.',
    priceLabel: 'Fixed fee, scoped upfront',
    features: ['Problem framing', 'Solution direction', 'Practical scope', 'Initial recommendation'],
    cta: 'Start with clarity',
    href: '/start',
  },
  {
    name: 'Pilot Build',
    eyebrow: 'Prove the useful version',
    description: 'Design and build the smallest version worth putting in real hands.',
    priceLabel: 'Fixed scope and milestones',
    features: ['Product design', 'Working first version', 'Review checkpoints', 'Handoff context'],
    cta: 'Discuss a pilot',
    href: '/start',
  },
  {
    name: 'Production Delivery',
    eyebrow: 'Build for reality',
    description: 'Carry a validated idea through integrations, deployment, and the details that make it dependable.',
    priceLabel: 'Quoted after clarity',
    features: ['Technical delivery', 'Real integrations', 'Launch planning', 'Documentation'],
    cta: 'Plan delivery',
    href: '/start',
  },
  {
    name: 'Care and Improvement',
    eyebrow: 'Keep it useful',
    description: 'Stay close after launch with focused iteration, support, and evidence-led improvement.',
    priceLabel: 'Monthly support plan',
    features: ['Prioritised improvements', 'Support and review', 'Product reporting', 'Ongoing guidance'],
    cta: 'Plan ongoing care',
    href: '/contact',
  },
];

export const FOOTER_LINKS = [
  {
    heading: 'Product',
    links: [
      { label: 'Delivery capabilities', href: '/product' },
      ...productLinks.map((page) => ({ label: page.navLabel, href: `/product/${page.slug}` })),
    ],
  },
  {
    heading: 'Solutions',
    links: solutionLinks.map((page) => ({ label: page.shortTitle, href: `/solutions/${page.slug}` })),
  },
  {
    heading: 'Resources',
    links: [
      { label: 'Pricing', href: '/pricing' },
      { label: 'How It Works', href: '/how-it-works' },
      { label: 'Demo', href: '/demo' },
      { label: 'Blog', href: '/blog' },
      { label: 'Help Center', href: '/help' },
    ],
  },
  {
    heading: 'Company',
    links: [
      { label: 'About', href: '/about' },
      { label: 'Contact', href: '/contact' },
      { label: 'Privacy', href: '/privacy' },
      { label: 'Terms', href: '/terms' },
    ],
  },
];
