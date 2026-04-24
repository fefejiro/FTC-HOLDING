import { productPages, proofHighlights, solutionPages } from '@/lib/site-content';

const productLinks = Object.values(productPages);
const solutionLinks = Object.values(solutionPages);

export const NAV = {
  main: [
    {
      label: 'Product',
      children: [
        { label: 'Platform Overview', href: '/product', description: 'See the full Una Labs system' },
        ...productLinks.map((page) => ({
          label: page.navLabel,
          href: `/product/${page.slug}`,
          description: page.navDescription,
        })),
      ],
    },
    {
      label: 'Solutions',
      children: solutionLinks.map((page) => ({
        label: page.title,
        href: `/solutions/${page.slug}`,
        description: page.description,
      })),
    },
    {
      label: 'Resources',
      children: [
        { label: 'Blog', href: '/blog', description: 'Field notes from shipped products and live delivery systems' },
        { label: 'Help Center', href: '/help', description: 'Orientation for the intake, pricing, and support path' },
        { label: 'Live Status', href: '/status', description: 'Ignition parity and SDLC signal in one live board' },
      ],
    },
    { label: 'Realtor AI', href: '/realtor' },
    { label: 'Pricing', href: '/pricing' },
    { label: 'How It Works', href: '/how-it-works' },
  ],
};

export const FEATURES = [
  { id: 1, icon: '📋', label: 'Intake & Scoping', benefit: 'Turn rough requests into structured briefs without a sales maze.' },
  { id: 2, icon: '📊', label: 'Real-Time Dashboard', benefit: 'Keep delivery state visible instead of buried in chat and memory.' },
  { id: 3, icon: '🪟', label: 'Client Portal', benefit: 'Give clients confidence without exposing every internal moving part.' },
  { id: 4, icon: '✅', label: 'Approval Gates', benefit: 'Treat sign-off as a governed stage, not a fuzzy final email.' },
  { id: 5, icon: '💳', label: 'Live Payments', benefit: 'Move from scoped summary into real Stripe checkout on the public site.' },
  { id: 6, icon: '📦', label: 'Delivery Proof', benefit: 'Close projects with documentation, handoff context, and durable records.' },
  { id: 7, icon: '🤖', label: 'Automated Handoff', benefit: 'Carry approved customer context into the internal delivery workflow behind the scenes.' },
  { id: 8, icon: '📈', label: 'Reporting', benefit: 'Turn project truth into client-ready proof instead of rebuilding it later.' },
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

export const PRICING_TIERS = [
  {
    name: 'Starter',
    monthlyPrice: 67,
    description: 'For freelancers and solo practitioners',
    features: ['1 user', 'Up to 3 active projects', 'Intake forms', 'Basic proposals', 'Email support'],
    recommended: false,
    cta: 'Start Your Project',
  },
  {
    name: 'Professional',
    monthlyPrice: 135,
    description: 'For growing teams that deliver regularly',
    features: ['5 users', 'Unlimited projects', 'Full proposal suite', 'Payment collection', 'Dashboard & reporting', 'Priority support'],
    recommended: true,
    cta: 'Start Your Project',
  },
  {
    name: 'Agency',
    monthlyPrice: 339,
    description: 'For agencies with multiple clients and teams',
    features: ['20 users', 'Unlimited projects', 'Client portal', 'White-label reports', 'Workflow automation', 'Dedicated support'],
    recommended: false,
    cta: 'Start Your Project',
  },
  {
    name: 'Enterprise',
    monthlyPrice: 679,
    description: 'For large organizations with complex needs',
    features: ['Unlimited users', 'Custom integrations', 'SLA guarantee', 'Custom contracts', 'Onboarding support', 'Account manager'],
    recommended: false,
    cta: 'Contact Sales',
  },
];

export const FOOTER_LINKS = [
  {
    heading: 'Product',
    links: [
      { label: 'Platform Overview', href: '/product' },
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
