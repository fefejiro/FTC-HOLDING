export const NAV = {
  main: [
    {
      label: 'Product',
      children: [
        { label: 'Platform Overview', href: '/product', description: 'See the full Una Labs system' },
        { label: 'Intake & Scoping', href: '/product/intake-scoping', description: 'Turn rough requests into structured briefs' },
        { label: 'Real-Time Dashboard', href: '/product/dashboard', description: 'See every project at a glance' },
        { label: 'Client Portal', href: '/product/client-portal', description: 'Give clients a window into progress' },
        { label: 'Automated Reporting', href: '/product/reporting', description: 'Impact reports, generated automatically' },
        { label: 'Approval & Sign-Off', href: '/product/approval-sign-off', description: 'Formalize delivery completion' },
      ],
    },
    {
      label: 'Solutions',
      children: [
        { label: 'For Professional Services', href: '/solutions/professional-services', description: 'Consulting and advisory firms' },
        { label: 'For Digital Agencies', href: '/solutions/agencies', description: 'Creative and digital studios' },
        { label: 'For SaaS Product Teams', href: '/solutions/saas', description: 'Early-stage and scaling teams' },
        { label: 'For Accounting & Tax', href: '/solutions/accounting', description: 'Accounting and bookkeeping firms' },
      ],
    },
    {
      label: 'Resources',
      children: [
        { label: 'Blog', href: '/blog', description: undefined },
        { label: 'Help Center', href: '/help', description: undefined },
        { label: 'Community', href: '/community', description: undefined },
      ],
    },
    { label: 'Pricing', href: '/pricing' },
    { label: 'How It Works', href: '/how-it-works' },
  ],
};

export const FEATURES = [
  { id: 1, icon: '📋', label: 'Intake & Scoping', benefit: 'Turn rough requests into structured briefs in 48 hours.' },
  { id: 2, icon: '📊', label: 'Real-Time Dashboard', benefit: 'Every project visible — status, gates, timeline, risks.' },
  { id: 3, icon: '📄', label: 'Proposals & Pricing', benefit: 'One clear offer. No negotiation theatre.' },
  { id: 4, icon: '✅', label: 'Approval Gates', benefit: 'Client signs off before money or work moves forward.' },
  { id: 5, icon: '💳', label: 'Payments', benefit: 'Deposit collected upfront via Stripe. No chasing invoices.' },
  { id: 6, icon: '🔗', label: 'Delivery Proof', benefit: 'Every output documented. Handoff-ready from day one.' },
  { id: 7, icon: '🤖', label: 'AI Automation', benefit: 'Intake, brief generation, and notifications automated.' },
  { id: 8, icon: '📈', label: 'Reporting', benefit: 'Impact documented. Reusable across every engagement.' },
];

export const PROOF_METRICS = [
  { value: '48h', label: 'Average first response', note: 'From rough request to structured brief' },
  { value: '4.8', label: 'Client satisfaction average', note: 'Across all active engagements' },
  { value: '100%', label: 'Delivery documented', note: 'Every output handoff-ready from day one' },
];

export const TESTIMONIALS = [
  {
    id: 1,
    quote: 'Una Labs took a half-baked idea and turned it into a scoped proposal within two days. Paid a deposit. Work started. No ambiguity.',
    author: 'Sarah Chen',
    title: 'Project Director',
    company: 'Meridian Consulting',
    rating: 5,
  },
  {
    id: 2,
    quote: 'I submitted a half-formed idea and got back a real scoped brief with options. First time I felt like the intake process added value.',
    author: 'James Park',
    title: 'Operations Manager',
    company: 'Fortis Consulting',
    rating: 5,
  },
  {
    id: 3,
    quote: 'The dashboard alone is worth it. Our clients stopped sending "where are we at?" emails the day we went live.',
    author: 'Priya Nair',
    title: 'Agency Principal',
    company: 'Nair Creative',
    rating: 5,
  },
  {
    id: 4,
    quote: "Reporting used to take us four hours per client per month. Now it's automated. That time went back into delivery.",
    author: 'Marcus Webb',
    title: 'Head of Client Success',
    company: 'Webb & Partners',
    rating: 4,
  },
];

export const INDUSTRIES = [
  {
    icon: '🏢',
    title: 'Professional Services',
    description: 'Consulting, strategy, and advisory firms that need scoped, documented delivery without hiring a PM.',
    href: '/solutions/professional-services',
    slug: 'professional-services',
  },
  {
    icon: '🎨',
    title: 'Digital Agencies',
    description: 'Studios and agencies that need structured client intake and delivery proof without the overhead.',
    href: '/solutions/agencies',
    slug: 'agencies',
  },
  {
    icon: '⚙️',
    title: 'SaaS Product Teams',
    description: 'Early-stage teams that need AI and automation delivered fast without retaining a full agency.',
    href: '/solutions/saas',
    slug: 'saas',
  },
  {
    icon: '📊',
    title: 'Accounting & Tax',
    description: 'Firms that need client-facing tools, intake automation, and operational systems that work.',
    href: '/solutions/accounting',
    slug: 'accounting',
  },
  {
    icon: '⚖️',
    title: 'Law Firms',
    description: 'Legal practices that need document automation, intake systems, and professional delivery.',
    href: '/solutions/law',
    slug: 'law',
  },
  {
    icon: '🚀',
    title: 'Founders & Operators',
    description: 'Solo operators who need real deliverables with minimal back-and-forth and clear outcomes.',
    href: '/solutions/founders',
    slug: 'founders',
  },
];

export const PROBLEM_SOLUTIONS = [
  {
    eyebrow: 'The visibility problem',
    headline: 'Clients need to see progress — not just results',
    body: 'When clients lack visibility into project progress, they get anxious. They send update emails. They interrupt the team. They doubt the timeline. Real-time visibility builds trust and reduces the cost of communication.',
    bullets: [
      'Real-time progress tracking visible to clients',
      'Automated milestone notifications',
      'Shared dashboard view — no login required for clients',
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
      'Auto-generated from project data — no copy-paste',
      'Customizable metrics and KPIs per client',
      'Client-branded PDF or portal delivery',
      'Trend analysis across engagements',
    ],
    ctaLabel: 'Explore reporting',
    ctaHref: '/product/reporting',
  },
  {
    eyebrow: 'The handoff problem',
    headline: "Delivery without proof isn't done",
    body: "Work isn't done until it's documented. Every Una Labs engagement ends with handoff-ready output — access details, evidence, and a completion record — so clients have something durable.",
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
    cta: 'Start Free Trial',
  },
  {
    name: 'Professional',
    monthlyPrice: 135,
    description: 'For growing teams that deliver regularly',
    features: ['5 users', 'Unlimited projects', 'Full proposal suite', 'Payment collection', 'Dashboard & reporting', 'Priority support'],
    recommended: true,
    cta: 'Start Free Trial',
  },
  {
    name: 'Agency',
    monthlyPrice: 339,
    description: 'For agencies with multiple clients and teams',
    features: ['20 users', 'Unlimited projects', 'Client portal', 'White-label reports', 'Workflow automation', 'Dedicated support'],
    recommended: false,
    cta: 'Start Free Trial',
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
      { label: 'Intake & Scoping', href: '/product/intake-scoping' },
      { label: 'Dashboard', href: '/product/dashboard' },
      { label: 'Client Portal', href: '/product/client-portal' },
      { label: 'Reporting', href: '/product/reporting' },
      { label: 'Approval & Sign-Off', href: '/product/approval-sign-off' },
    ],
  },
  {
    heading: 'Solutions',
    links: [
      { label: 'Professional Services', href: '/solutions/professional-services' },
      { label: 'Digital Agencies', href: '/solutions/agencies' },
      { label: 'SaaS Teams', href: '/solutions/saas' },
      { label: 'Accounting & Tax', href: '/solutions/accounting' },
    ],
  },
  {
    heading: 'Resources',
    links: [
      { label: 'Pricing', href: '/pricing' },
      { label: 'How It Works', href: '/how-it-works' },
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
