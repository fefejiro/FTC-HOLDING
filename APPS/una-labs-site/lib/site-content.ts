export type VisualKey =
  | 'intake'
  | 'proposal'
  | 'dashboard'
  | 'reporting'
  | 'handoff'
  | 'delivery';

export interface ActionLink {
  label: string;
  href: string;
  external?: boolean;
}

export interface StatItem {
  value: string;
  label: string;
  detail: string;
}

export interface FeatureItem {
  icon: string;
  title: string;
  description: string;
}

export interface NarrativeBlock {
  eyebrow: string;
  title: string;
  body: string;
  points: string[];
}

export interface RelatedCard {
  eyebrow: string;
  title: string;
  description: string;
  href: string;
  hrefLabel: string;
  external?: boolean;
}

export interface ProductPageContent {
  slug: string;
  navLabel: string;
  navDescription: string;
  icon: string;
  metaTitle: string;
  metaDescription: string;
  eyebrow: string;
  headline: string;
  accentPhrase?: string;
  subheadline: string;
  primaryAction: ActionLink;
  secondaryAction: ActionLink;
  heroStats: StatItem[];
  heroVisual: VisualKey;
  challenge: NarrativeBlock;
  approach: NarrativeBlock;
  featureIntro: string;
  features: FeatureItem[];
  relatedIntro: string;
  related: RelatedCard[];
}

export interface SolutionPageContent {
  slug: string;
  title: string;
  shortTitle: string;
  icon: string;
  description: string;
  metaTitle: string;
  metaDescription: string;
  eyebrow: string;
  headline: string;
  accentPhrase?: string;
  subheadline: string;
  primaryAction: ActionLink;
  secondaryAction: ActionLink;
  heroStats: StatItem[];
  heroVisual: VisualKey;
  challenge: NarrativeBlock;
  approach: NarrativeBlock;
  featureIntro: string;
  features: FeatureItem[];
  relatedIntro: string;
  related: RelatedCard[];
}

export interface CaseStudyContent {
  slug: string;
  title: string;
  metaTitle: string;
  metaDescription: string;
  eyebrow: string;
  headline: string;
  subheadline: string;
  primaryAction: ActionLink;
  secondaryAction: ActionLink;
  liveUrl: string;
  heroStats: StatItem[];
  heroVisual: VisualKey;
  challenge: NarrativeBlock;
  shipped: FeatureItem[];
  impact: NarrativeBlock;
  related: RelatedCard[];
}

export interface DemoModule {
  slug: string;
  label: string;
  product: string;
  title: string;
  description: string;
  loomUrl?: string;
  arcadeUrl?: string;
  placeholder: string;
  bullets: string[];
  cta: ActionLink;
}

export const productPages: Record<string, ProductPageContent> = {
  'intake-scoping': {
    slug: 'intake-scoping',
    navLabel: 'Intake & Scoping',
    navDescription: 'Turn rough requests into structured briefs',
    icon: '📋',
    metaTitle: 'Intake & Scoping',
    metaDescription:
      'Turn rough requests into structured briefs, decision-ready scope, and a clear commercial path.',
    eyebrow: 'Product surface',
    headline: 'Turn rough requests into structured scope',
    accentPhrase: 'structured scope',
    subheadline:
      'Una Labs captures the messy first conversation, turns it into a useful brief, and keeps the handoff to pricing and activation clean.',
    primaryAction: { label: 'Start Your Project', href: '/start' },
    secondaryAction: { label: 'See the full platform', href: '/product' },
    heroStats: [
      { value: '2-step', label: 'Intake flow', detail: 'Request details first, plan selection second.' },
      { value: 'Shared', label: 'Single brief source', detail: 'Scope, pricing, and activation stay aligned.' },
      { value: 'Stripe', label: 'Checkout handoff', detail: 'The approved plan flows straight into billing.' },
    ],
    heroVisual: 'intake',
    challenge: {
      eyebrow: 'Why teams get stuck',
      title: 'Most service work slows down before it even starts',
      body:
        'Clients arrive with a goal, not a polished brief. Traditional delivery systems expect fully formed requirements, which creates back-and-forth, slow quoting, and shaky first impressions.',
      points: [
        'Rough requests arrive without shared structure.',
        'Teams rebuild context across email, docs, and sales calls.',
        'Commercial decisions happen before the scope feels trustworthy.',
      ],
    },
    approach: {
      eyebrow: 'How Una Labs handles it',
      title: 'Capture intent once, then keep the whole path connected',
      body:
        'The intake surface, scoped summary, and paid activation flow are designed as one chain. The same request context powers the plan recommendation, the Stripe session, and the downstream activation event.',
      points: [
        'Plain-language inputs instead of consultant-style forms.',
        'Plan selection and pricing happen in the same guided path.',
        'Confirmation can carry the customer context into the real project system.',
      ],
    },
    featureIntro:
      'Everything on this page supports one job: getting a client from “here is what I think I need” to “this is approved and ready to move.”',
    features: [
      {
        icon: '🧭',
        title: 'Guided intake',
        description: 'The form is structured enough to capture signal without forcing clients to think like project managers.',
      },
      {
        icon: '🧾',
        title: 'Scoped summary',
        description: 'Before checkout, the customer sees the plan, billing cadence, and what happens next in one place.',
      },
      {
        icon: '🔁',
        title: 'Reusable activation payload',
        description: 'The same intake context can be passed into the worker and then into ATEAM or other downstream systems.',
      },
    ],
    relatedIntro: 'This surface becomes more valuable when it stays connected to the rest of the platform.',
    related: [
      {
        eyebrow: 'Next surface',
        title: 'Client Portal',
        description: 'Keep the same client context visible after the deal is approved and work begins.',
        href: '/product/client-portal',
        hrefLabel: 'View client portal',
      },
      {
        eyebrow: 'Proof path',
        title: 'Dispatch case study',
        description: 'See how intake clarity matters when real requests need to move fast in a live environment.',
        href: '/products/dispatch',
        hrefLabel: 'See Dispatch',
      },
      {
        eyebrow: 'Buying path',
        title: 'Pricing and checkout',
        description: 'The intake flow already hands off into live Stripe billing on Una Labs today.',
        href: '/pricing',
        hrefLabel: 'View pricing',
      },
    ],
  },
  dashboard: {
    slug: 'dashboard',
    navLabel: 'Real-Time Dashboard',
    navDescription: 'See every project at a glance',
    icon: '📊',
    metaTitle: 'Real-Time Dashboard',
    metaDescription:
      'A live operational view for projects, milestones, approvals, and delivery state.',
    eyebrow: 'Product surface',
    headline: 'See delivery status without chasing updates',
    accentPhrase: 'without chasing updates',
    subheadline:
      'The dashboard is where Una Labs stops feeling like marketing copy and starts feeling like an operating system: visible work, visible state, visible next steps.',
    primaryAction: { label: 'Start your workspace', href: '/start' },
    secondaryAction: { label: 'See how it works', href: '/how-it-works' },
    heroStats: [
      { value: 'Live', label: 'Status view', detail: 'Projects, gates, and handoff progress in one surface.' },
      { value: 'Shared', label: 'Team context', detail: 'Delivery signal can be visible to both operators and clients.' },
      { value: 'Actionable', label: 'Next step clarity', detail: 'Milestones and blockers are easier to act on than static reports.' },
    ],
    heroVisual: 'dashboard',
    challenge: {
      eyebrow: 'Why teams lose trust',
      title: 'Silence between kickoff and delivery creates anxiety',
      body:
        'If the only visible moments are kickoff, invoice, and final handoff, clients fill the gaps with uncertainty. Internal teams feel that uncertainty too.',
      points: [
        'Status lives across inboxes, chats, and personal memory.',
        'Approvals and blockers arrive late because the work surface is fragmented.',
        'Ops teams spend time narrating progress instead of moving the project.',
      ],
    },
    approach: {
      eyebrow: 'How Una Labs handles it',
      title: 'Expose the operational state, not just the final output',
      body:
        'The dashboard is designed to show the work as it moves: current phase, approvals, blockers, and what has already been delivered. It is the connective tissue between intake, execution, and reporting.',
      points: [
        'Milestone progress is visible without a status meeting.',
        'Approval state can sit beside delivery state.',
        'The same project data can power reporting and client views.',
      ],
    },
    featureIntro:
      'A real dashboard should reduce communication drag, not become another place that needs manual updates.',
    features: [
      {
        icon: '🗂️',
        title: 'Project-centered view',
        description: 'See where each project sits, what is blocked, and what is already moving through delivery.',
      },
      {
        icon: '🚦',
        title: 'Milestone and gate awareness',
        description: 'Keep approvals, handoff state, and delivery progress close enough to manage together.',
      },
      {
        icon: '📣',
        title: 'Client-ready visibility',
        description: 'The same operational truth can later be exposed through a client-facing portal without rebuilding it by hand.',
      },
    ],
    relatedIntro: 'The dashboard becomes stronger when it is paired with client visibility and reporting.',
    related: [
      {
        eyebrow: 'Next surface',
        title: 'Client Portal',
        description: 'Turn internal delivery state into a clean customer-facing view.',
        href: '/product/client-portal',
        hrefLabel: 'View client portal',
      },
      {
        eyebrow: 'Next surface',
        title: 'Reporting',
        description: 'Convert the same operational data into reusable proof and client reporting.',
        href: '/product/reporting',
        hrefLabel: 'View reporting',
      },
      {
        eyebrow: 'Real product',
        title: 'Live dashboard foundation',
        description: 'The Phase 3 dashboard route is where Supabase-backed project data will land for authenticated customers.',
        href: '/dashboard',
        hrefLabel: 'Open dashboard',
      },
    ],
  },
  'client-portal': {
    slug: 'client-portal',
    navLabel: 'Client Portal',
    navDescription: 'Give clients a window into progress',
    icon: '🪟',
    metaTitle: 'Client Portal',
    metaDescription:
      'A client-facing surface for progress, approvals, handoff assets, and calmer communication.',
    eyebrow: 'Product surface',
    headline: 'Give clients visibility without handing them your ops stack',
    accentPhrase: 'visibility without handing them your ops stack',
    subheadline:
      'The client portal is the calmer outer surface of Una Labs: enough transparency to build trust, without dumping internal delivery noise on the customer.',
    primaryAction: { label: 'Start with your first client flow', href: '/start' },
    secondaryAction: { label: 'View dashboard', href: '/product/dashboard' },
    heroStats: [
      { value: 'Client', label: 'Facing surface', detail: 'Designed for reassurance, not operator clutter.' },
      { value: 'Clear', label: 'Approval state', detail: 'Customers can see what needs review and what is complete.' },
      { value: 'Durable', label: 'Handoff trail', detail: 'Updates and artifacts do not disappear into email threads.' },
    ],
    heroVisual: 'dashboard',
    challenge: {
      eyebrow: 'Why this matters',
      title: 'Clients want confidence, not a backstage pass',
      body:
        'A good portal reduces “where are we?” messages without turning the customer into a project coordinator. The goal is calm trust, not constant exposure to internal noise.',
      points: [
        'Too little visibility creates anxious follow-up.',
        'Too much raw operational detail creates confusion.',
        'Important approvals often get lost in channels that were never designed for them.',
      ],
    },
    approach: {
      eyebrow: 'How Una Labs handles it',
      title: 'Surface the moments that matter to the client',
      body:
        'The portal focuses on what the client actually needs: progress signal, approval checkpoints, deliverables, and what comes next. It is a confidence layer on top of the operational core.',
      points: [
        'Translate internal project state into a clear customer-facing narrative.',
        'Keep approval requests and delivery artifacts in one durable place.',
        'Make handoff feel deliberate instead of improvised.',
      ],
    },
    featureIntro:
      'This is not a white-labeled PM board. It is a trust surface for paid delivery.',
    features: [
      {
        icon: '👀',
        title: 'Progress snapshots',
        description: 'Expose the current phase and next milestone without overwhelming clients with every internal task.',
      },
      {
        icon: '✍️',
        title: 'Approval checkpoints',
        description: 'Keep sign-off decisions visible and easy to action when a review gate is reached.',
      },
      {
        icon: '📦',
        title: 'Delivery record',
        description: 'Store deliverables, links, and handoff-ready artifacts where clients can find them later.',
      },
    ],
    relatedIntro: 'The portal sits between the dashboard and the final delivery record.',
    related: [
      {
        eyebrow: 'Linked surface',
        title: 'Approval & Sign-Off',
        description: 'Move from visibility to formal acceptance without leaving the flow.',
        href: '/product/approval-sign-off',
        hrefLabel: 'View sign-off flow',
      },
      {
        eyebrow: 'Linked surface',
        title: 'Reporting',
        description: 'Use the same project context to produce a cleaner end-of-cycle narrative.',
        href: '/product/reporting',
        hrefLabel: 'View reporting',
      },
      {
        eyebrow: 'Proof path',
        title: 'PeacePad case study',
        description: 'A live product where calm, trustworthy customer experience matters as much as the backend logic.',
        href: '/products/peacepad',
        hrefLabel: 'See PeacePad',
      },
    ],
  },
  reporting: {
    slug: 'reporting',
    navLabel: 'Automated Reporting',
    navDescription: 'Impact reports, generated automatically',
    icon: '📈',
    metaTitle: 'Automated Reporting',
    metaDescription:
      'Turn project activity into usable client proof without rebuilding the story every time.',
    eyebrow: 'Product surface',
    headline: 'Turn delivery history into client-ready proof',
    accentPhrase: 'client-ready proof',
    subheadline:
      'Reporting should not require rebuilding the same narrative from scratch every month. Una Labs positions reporting as a reusable output of real delivery state.',
    primaryAction: { label: 'See the platform', href: '/product' },
    secondaryAction: { label: 'Start a project', href: '/start' },
    heroStats: [
      { value: 'Reusable', label: 'Narrative layer', detail: 'Reporting builds on project state that already exists.' },
      { value: 'Client-ready', label: 'Proof output', detail: 'Summaries can be shared without exporting raw internal detail.' },
      { value: 'Operational', label: 'Linked to work', detail: 'Reporting stays grounded in actual milestones and delivery records.' },
    ],
    heroVisual: 'reporting',
    challenge: {
      eyebrow: 'Why teams dread reporting',
      title: 'Reporting often becomes a manual storytelling tax',
      body:
        'When project proof lives across inboxes, screenshots, and memory, teams spend time assembling reports that should have been natural outputs of the work itself.',
      points: [
        'Updates get written twice: once in delivery, again in reporting.',
        'Evidence is scattered when clients ask for a clean summary.',
        'The output feels polished but disconnected from real operational state.',
      ],
    },
    approach: {
      eyebrow: 'How Una Labs handles it',
      title: 'Treat reporting as an extension of project truth',
      body:
        'Because milestones, approvals, and handoff artifacts already exist in the delivery system, reporting can become a structured layer on top of those facts instead of a separate exercise.',
      points: [
        'Project events become reporting inputs.',
        'Client-facing summaries stay tied to the actual delivery record.',
        'Ops teams spend less time packaging and more time delivering.',
      ],
    },
    featureIntro:
      'The reporting surface is designed to make professionalism reusable, not handcrafted every cycle.',
    features: [
      {
        icon: '📄',
        title: 'Structured report output',
        description: 'Create a repeatable narrative around status, delivery progress, and outcomes without rebuilding the frame every time.',
      },
      {
        icon: '🧷',
        title: 'Linked evidence',
        description: 'Tie approvals, milestones, and handoff artifacts back into the same client-facing summary.',
      },
      {
        icon: '♻️',
        title: 'Reusable across engagements',
        description: 'Once the delivery system is clean, reporting becomes a repeatable part of the operating model instead of an afterthought.',
      },
    ],
    relatedIntro: 'Reporting is strongest when it is paired with visible delivery state and a clean sign-off path.',
    related: [
      {
        eyebrow: 'Linked surface',
        title: 'Dashboard',
        description: 'Operational state gives reporting something real to stand on.',
        href: '/product/dashboard',
        hrefLabel: 'View dashboard',
      },
      {
        eyebrow: 'Linked surface',
        title: 'Approval & Sign-Off',
        description: 'A strong report feels better when the final acceptance trail is already documented.',
        href: '/product/approval-sign-off',
        hrefLabel: 'View sign-off flow',
      },
      {
        eyebrow: 'Proof path',
        title: 'SayWetin case study',
        description: 'A shipped product where the delivered value is easiest to trust when the operational story stays clear.',
        href: '/saywetin',
        hrefLabel: 'See SayWetin',
      },
    ],
  },
  'approval-sign-off': {
    slug: 'approval-sign-off',
    navLabel: 'Approval & Sign-Off',
    navDescription: 'Formalize delivery completion',
    icon: '✅',
    metaTitle: 'Approval & Sign-Off',
    metaDescription:
      'Bring formal review, sign-off, and handoff discipline into the same delivery flow.',
    eyebrow: 'Product surface',
    headline: 'Make delivery completion feel formal, not fuzzy',
    accentPhrase: 'formal, not fuzzy',
    subheadline:
      'Approval is where trust either locks in or unravels. Una Labs treats review, sign-off, and handoff as part of the product, not a messy last-mile ritual.',
    primaryAction: { label: 'See the platform', href: '/product' },
    secondaryAction: { label: 'Start a project', href: '/start' },
    heroStats: [
      { value: 'Gate-based', label: 'Review flow', detail: 'Nothing important should move forward without clear acceptance.' },
      { value: 'Timestamped', label: 'Completion record', detail: 'The end of a project should be documented, not implied.' },
      { value: 'Handoff-ready', label: 'Final package', detail: 'Clients should leave with durable assets, not scattered links.' },
    ],
    heroVisual: 'handoff',
    challenge: {
      eyebrow: 'Where projects often break down',
      title: 'The last mile is where delivery discipline is easiest to lose',
      body:
        'Teams can run a strong project and still end with vague approvals, missing context, or delivery artifacts spread across several channels. That weakens confidence right at the moment it should feel strongest.',
      points: [
        'Final approval happens informally and gets hard to prove later.',
        'Access details, documents, and next steps land in disconnected places.',
        'Clients leave unsure whether the project is complete or just quiet.',
      ],
    },
    approach: {
      eyebrow: 'How Una Labs handles it',
      title: 'Turn sign-off into a governed product surface',
      body:
        'Approval state, final deliverables, and completion context belong in one deliberate flow. That makes the handoff cleaner for clients and creates a stronger record for the team.',
      points: [
        'Approval becomes visible and intentional.',
        'Delivery artifacts can be packaged around the sign-off event.',
        'The final record becomes useful for reporting and future work.',
      ],
    },
    featureIntro:
      'Strong delivery ends with clarity: what was accepted, when it was accepted, and what the client now has.',
    features: [
      {
        icon: '🛂',
        title: 'Review checkpoints',
        description: 'Treat approval as a governed stage rather than an afterthought hidden in chat history.',
      },
      {
        icon: '🕒',
        title: 'Completion timeline',
        description: 'Keep a durable record of what was delivered and when the client accepted it.',
      },
      {
        icon: '📚',
        title: 'Handoff package',
        description: 'Bundle the documentation, access details, and next-step context into a more professional closeout.',
      },
    ],
    relatedIntro: 'Approval gets more powerful when it is connected to the portal, dashboard, and reporting surfaces.',
    related: [
      {
        eyebrow: 'Linked surface',
        title: 'Client Portal',
        description: 'Expose review state cleanly before the final approval moment arrives.',
        href: '/product/client-portal',
        hrefLabel: 'View client portal',
      },
      {
        eyebrow: 'Linked surface',
        title: 'Reporting',
        description: 'The final approval trail makes downstream proof and reporting cleaner.',
        href: '/product/reporting',
        hrefLabel: 'View reporting',
      },
      {
        eyebrow: 'Real product',
        title: 'How the workflow runs',
        description: 'See the governed delivery path that connects intake, scope, payment, and final handoff.',
        href: '/how-it-works',
        hrefLabel: 'See the workflow',
      },
    ],
  },
};

export const solutionPages: Record<string, SolutionPageContent> = {
  'professional-services': {
    slug: 'professional-services',
    title: 'For Professional Services',
    shortTitle: 'Professional Services',
    icon: '🏢',
    description: 'Consulting, strategy, and advisory firms that need scoped delivery without the operational drag.',
    metaTitle: 'Professional Services Solutions',
    metaDescription:
      'Structured intake, visibility, and delivery proof for consulting, advisory, and other professional service teams.',
    eyebrow: 'Solutions',
    headline: 'A calmer delivery system for professional service teams',
    accentPhrase: 'calmer delivery system',
    subheadline:
      'For consulting and advisory firms, the selling problem and the delivery problem are the same problem: trust. Una Labs tightens both sides of that experience.',
    primaryAction: { label: 'Start Your Project', href: '/start' },
    secondaryAction: { label: 'View the platform', href: '/product' },
    heroStats: [
      { value: 'Scoped', label: 'Before delivery starts', detail: 'Rough opportunities can become clearer briefs and clearer offers.' },
      { value: 'Visible', label: 'While work moves', detail: 'Clients do not need to wonder where a project stands.' },
      { value: 'Documented', label: 'When work ends', detail: 'Handoff and reporting feel as professional as the pitch did.' },
    ],
    heroVisual: 'dashboard',
    challenge: {
      eyebrow: 'Common friction',
      title: 'Professional delivery breaks down when trust gets rebuilt from scratch every time',
      body:
        'Professional services teams often know how to deliver the work but still lose margin and confidence in the handoffs between intake, scoping, approvals, and final packaging.',
      points: [
        'Prospects arrive with partial information and inconsistent buying signals.',
        'Delivery teams spend too much time narrating status instead of moving the work.',
        'Final proof often feels less polished than the original pitch.',
      ],
    },
    approach: {
      eyebrow: 'How Una Labs fits',
      title: 'Put structure around the moments that shape confidence',
      body:
        'Una Labs helps firms move from rough requests to clear scope, then from active delivery to documented handoff, while keeping the customer experience steady all the way through.',
      points: [
        'Scope early so commercial conversations feel cleaner.',
        'Expose progress without sending clients into the back office.',
        'Package completion in a way that supports renewals and referrals.',
      ],
    },
    featureIntro: 'The goal is not more software. The goal is fewer confidence leaks in the service experience.',
    features: [
      {
        icon: '📋',
        title: 'Structured intake for rough opportunities',
        description: 'Capture just enough context to move quickly without needing a polished brief from the client.',
      },
      {
        icon: '📊',
        title: 'Visibility for delivery teams and clients',
        description: 'Keep project state and next steps easier to understand while the work is underway.',
      },
      {
        icon: '📦',
        title: 'Better closeout and proof',
        description: 'Turn completed work into a more durable handoff and a stronger reporting narrative.',
      },
    ],
    relatedIntro: 'These product surfaces tend to matter most for professional service teams.',
    related: [
      {
        eyebrow: 'Relevant product',
        title: 'Intake & Scoping',
        description: 'Start from the rough client request and get to a cleaner commercial conversation faster.',
        href: '/product/intake-scoping',
        hrefLabel: 'See intake',
      },
      {
        eyebrow: 'Relevant product',
        title: 'Reporting',
        description: 'Package delivery progress and value in a way clients can keep and understand.',
        href: '/product/reporting',
        hrefLabel: 'See reporting',
      },
      {
        eyebrow: 'Real proof',
        title: 'PeacePad',
        description: 'A live product where trust, guided workflow, and thoughtful delivery experience matter directly.',
        href: '/products/peacepad',
        hrefLabel: 'See PeacePad',
      },
    ],
  },
  agencies: {
    slug: 'agencies',
    title: 'For Digital Agencies',
    shortTitle: 'Digital Agencies',
    icon: '🎨',
    description: 'Studios and agencies that need cleaner scoping, calmer delivery, and stronger proof.',
    metaTitle: 'Digital Agency Solutions',
    metaDescription:
      'Una Labs helps agencies scope faster, reduce status noise, and hand off work more professionally.',
    eyebrow: 'Solutions',
    headline: 'Help agencies deliver without scope drift and status churn',
    accentPhrase: 'without scope drift and status churn',
    subheadline:
      'Agencies live and die on clarity: clear scope, clear approvals, clear proof. Una Labs is built to make that clarity operational instead of aspirational.',
    primaryAction: { label: 'Start Your Project', href: '/start' },
    secondaryAction: { label: 'See how it works', href: '/how-it-works' },
    heroStats: [
      { value: 'Fixed-fee', label: 'Commercial clarity', detail: 'Scope and pricing can feel cleaner before work begins.' },
      { value: 'Shared', label: 'Client visibility', detail: 'The project state is easier to understand without extra meetings.' },
      { value: 'Reusable', label: 'Proof layer', detail: 'Reporting and handoff become part of the operating model.' },
    ],
    heroVisual: 'delivery',
    challenge: {
      eyebrow: 'Common friction',
      title: 'Agencies lose margin when scope and status stay too informal',
      body:
        'The agency team may understand the work internally, but if the client experience around scope, approvals, and delivery proof is fuzzy, friction shows up everywhere.',
      points: [
        'Vague inputs create unstable estimates.',
        'Weekly status work steals time from production.',
        'Final handoff can feel rushed even after strong creative or technical execution.',
      ],
    },
    approach: {
      eyebrow: 'How Una Labs fits',
      title: 'Give agency delivery more operating discipline without killing the creative flow',
      body:
        'The platform helps agencies structure the operational parts of the engagement so the team spends less time explaining the work and more time doing the work.',
      points: [
        'Capture scope earlier and cleanly.',
        'Keep approvals and visibility out of scattered threads.',
        'Make the final client experience feel deliberate and premium.',
      ],
    },
    featureIntro:
      'Agencies do not need a heavier process. They need a clearer one.',
    features: [
      {
        icon: '🎯',
        title: 'Cleaner scoping',
        description: 'Reduce ambiguity before the work starts, so the delivery team is not negotiating scope mid-project.',
      },
      {
        icon: '🪟',
        title: 'Client-facing visibility',
        description: 'Use portal and dashboard surfaces to replace scattered status updates with a calmer system.',
      },
      {
        icon: '🧾',
        title: 'Professional proof',
        description: 'Reporting and handoff help the finished work feel easier to justify, renew, and reference.',
      },
    ],
    relatedIntro: 'These product surfaces map especially well to agency delivery.',
    related: [
      {
        eyebrow: 'Relevant product',
        title: 'Dashboard',
        description: 'Make project status easier to trust without another meeting.',
        href: '/product/dashboard',
        hrefLabel: 'See dashboard',
      },
      {
        eyebrow: 'Relevant product',
        title: 'Approval & Sign-Off',
        description: 'Keep review and final acceptance structured instead of improvised.',
        href: '/product/approval-sign-off',
        hrefLabel: 'See sign-off',
      },
      {
        eyebrow: 'Real proof',
        title: 'Dispatch',
        description: 'A shipped operational product that reflects how clarity and workflow discipline change the customer experience.',
        href: '/products/dispatch',
        hrefLabel: 'See Dispatch',
      },
    ],
  },
  saas: {
    slug: 'saas',
    title: 'For SaaS Product Teams',
    shortTitle: 'SaaS Teams',
    icon: '⚙️',
    description: 'Teams that need governed delivery for product work, internal tooling, and AI operations.',
    metaTitle: 'SaaS Team Solutions',
    metaDescription:
      'Una Labs helps SaaS teams scope feature work, expose progress, and document operational delivery.',
    eyebrow: 'Solutions',
    headline: 'Ship feature and operations work with more governance',
    accentPhrase: 'more governance',
    subheadline:
      'SaaS teams often have product ambition but fragmented delivery signal. Una Labs gives those teams a cleaner front door, clearer review path, and better completion record.',
    primaryAction: { label: 'Start Your Project', href: '/start' },
    secondaryAction: { label: 'View product surfaces', href: '/product' },
    heroStats: [
      { value: 'Intake', label: 'For feature requests', detail: 'Capture the problem before it turns into noisy backlog churn.' },
      { value: 'Approval', label: 'For decision points', detail: 'Make review gates explicit when scope or delivery matters.' },
      { value: 'Reporting', label: 'For shipped outcomes', detail: 'Keep a clearer story of what was delivered and why it matters.' },
    ],
    heroVisual: 'reporting',
    challenge: {
      eyebrow: 'Common friction',
      title: 'SaaS work gets harder to manage when intake, delivery, and proof are disconnected',
      body:
        'Teams can move quickly in code but still struggle with operational clarity. Requests are vague, approvals are implied, and finished work becomes harder to narrate later.',
      points: [
        'Internal stakeholders submit ideas with missing context.',
        'Teams need a better shared view of what is in progress and why.',
        'Delivered operations work is often under-documented once it ships.',
      ],
    },
    approach: {
      eyebrow: 'How Una Labs fits',
      title: 'Use the same operating system for intake, execution signal, and handoff',
      body:
        'Una Labs gives SaaS teams a repeatable way to capture requests, shape the work, track movement, and package the result. That matters for internal ops as much as external delivery.',
      points: [
        'Better intake before work hits the queue.',
        'Cleaner shared visibility while the build is underway.',
        'Stronger proof once the outcome is shipped.',
      ],
    },
    featureIntro:
      'This is useful whenever product teams want the execution layer to feel more deliberate and less ad hoc.',
    features: [
      {
        icon: '🧠',
        title: 'AI and workflow intake',
        description: 'Capture the underlying request and shape it into something more executable before engineering time gets spent.',
      },
      {
        icon: '📍',
        title: 'Shared status and blockers',
        description: 'Keep product, ops, and stakeholders aligned on what is moving and what still needs a decision.',
      },
      {
        icon: '📚',
        title: 'Documented delivery',
        description: 'Make it easier to hand over the outcome, report on it, and build on it later.',
      },
    ],
    relatedIntro: 'These product surfaces matter most for SaaS-oriented delivery.',
    related: [
      {
        eyebrow: 'Relevant product',
        title: 'Intake & Scoping',
        description: 'Start with a better problem definition before it becomes a build request.',
        href: '/product/intake-scoping',
        hrefLabel: 'See intake',
      },
      {
        eyebrow: 'Relevant product',
        title: 'Dashboard',
        description: 'Expose project movement and blockers more clearly across the team.',
        href: '/product/dashboard',
        hrefLabel: 'See dashboard',
      },
      {
        eyebrow: 'Real proof',
        title: 'SayWetin',
        description: 'A real language and intelligence product that shows how workflow, product thinking, and AI can meet in a shipped surface.',
        href: '/saywetin',
        hrefLabel: 'See SayWetin',
      },
    ],
  },
  accounting: {
    slug: 'accounting',
    title: 'For Accounting & Tax',
    shortTitle: 'Accounting & Tax',
    icon: '📊',
    description: 'Accounting, bookkeeping, and tax teams that need client-facing systems and more structured delivery.',
    metaTitle: 'Accounting And Tax Solutions',
    metaDescription:
      'Structured intake, client visibility, and handoff discipline for accounting and tax-focused teams.',
    eyebrow: 'Solutions',
    headline: 'Give accounting and tax delivery a more modern client experience',
    accentPhrase: 'more modern client experience',
    subheadline:
      'Accounting teams already do trust-sensitive work. Una Labs helps the operational surfaces around that work feel clearer, calmer, and more professional.',
    primaryAction: { label: 'Start Your Project', href: '/start' },
    secondaryAction: { label: 'See the platform', href: '/product' },
    heroStats: [
      { value: 'Client-ready', label: 'Intake and approvals', detail: 'Capture requests and approvals in a way clients can actually follow.' },
      { value: 'Visible', label: 'Progress state', detail: 'Reduce “checking in” friction on active engagements.' },
      { value: 'Documented', label: 'Final handoff', detail: 'Keep completion records and delivery artifacts tidy.' },
    ],
    heroVisual: 'handoff',
    challenge: {
      eyebrow: 'Common friction',
      title: 'Operational trust matters as much as technical accuracy',
      body:
        'In accounting and tax work, the client experience around intake, status, and final delivery shapes confidence just as much as the work product itself.',
      points: [
        'Client requests arrive in inconsistent formats and channels.',
        'Teams need a cleaner way to show progress without constant follow-up.',
        'Final delivery packages and completion records can be more disciplined.',
      ],
    },
    approach: {
      eyebrow: 'How Una Labs fits',
      title: 'Bring better operational surfaces to trust-sensitive client work',
      body:
        'The platform helps accounting teams structure requests, keep clients calmer during delivery, and make final handoff feel more complete and easier to audit later.',
      points: [
        'Normalize intake before work begins.',
        'Make the in-progress experience easier to understand.',
        'Package closeout in a way that feels deliberate and durable.',
      ],
    },
    featureIntro:
      'For accounting and tax teams, the best operational tooling is the tooling that helps clients trust the process more easily.',
    features: [
      {
        icon: '🧮',
        title: 'Structured client intake',
        description: 'Reduce intake chaos by giving clients a clearer way to submit requests and project context.',
      },
      {
        icon: '🪟',
        title: 'Progress visibility',
        description: 'Show engagement state and pending approvals without depending on email ping-pong.',
      },
      {
        icon: '🗃️',
        title: 'Documented handoff',
        description: 'Create a cleaner completion record with deliverables, proof, and next-step context.',
      },
    ],
    relatedIntro: 'These product surfaces map well to accounting and tax operations.',
    related: [
      {
        eyebrow: 'Relevant product',
        title: 'Client Portal',
        description: 'Keep customer visibility clear without exposing internal operational noise.',
        href: '/product/client-portal',
        hrefLabel: 'See client portal',
      },
      {
        eyebrow: 'Relevant product',
        title: 'Approval & Sign-Off',
        description: 'Use more deliberate review and completion checkpoints.',
        href: '/product/approval-sign-off',
        hrefLabel: 'See sign-off',
      },
      {
        eyebrow: 'Real proof',
        title: 'How it works',
        description: 'See the guided request-to-delivery workflow that underpins the public Una Labs experience.',
        href: '/how-it-works',
        hrefLabel: 'See the workflow',
      },
    ],
  },
};

export const caseStudies: Record<string, CaseStudyContent> = {
  dispatch: {
    slug: 'dispatch',
    title: 'Dispatch',
    metaTitle: 'Dispatch Case Study',
    metaDescription:
      'A live Ottawa roadside dispatch system that shows Una Labs can build real operational products, not just landing pages.',
    eyebrow: 'Case study',
    headline: 'Dispatch is a live operational system, not a concept deck',
    subheadline:
      'Dispatch is the clearest proof that Una Labs builds software tied to real-world flow: requests come in, operators act, status moves, and customers get signal they can use. Built through the same intake-to-delivery process you can start today.',
    primaryAction: { label: 'Visit Dispatch', href: 'https://dispatch.unalabs.cloud', external: true },
    secondaryAction: { label: 'Start a similar build', href: '/start?source=case_study_dispatch&product=dispatch' },
    liveUrl: 'https://dispatch.unalabs.cloud',
    heroStats: [
      { value: 'Live', label: 'Ottawa deployment', detail: 'The system is running in the real world, not a design mockup.' },
      { value: 'Operational', label: 'Workflow product', detail: 'Customer requests, operator state, and status updates all matter.' },
      { value: 'Proof', label: 'For Una Labs', detail: 'This is one of the strongest examples of the build standard behind the brand.' },
    ],
    heroVisual: 'delivery',
    challenge: {
      eyebrow: 'What mattered',
      title: 'Roadside support needs clarity under pressure',
      body:
        'A dispatch flow is useful only if the state stays clear while requests are actually moving. That makes it a strong reference point for the kind of systems Una Labs wants to be trusted to build.',
      points: [
        'People need to know what happens after the request is submitted.',
        'Operators need a working status layer, not a decorative interface.',
        'The customer-facing experience has to feel calm even when the operation is active.',
      ],
    },
    shipped: [
      {
        icon: '🚗',
        title: 'Live service request flow',
        description: 'The system accepts real requests and moves them through an operational queue.',
      },
      {
        icon: '🛰️',
        title: 'Status-aware delivery surface',
        description: 'Operators and customers both benefit from clearer movement through the request lifecycle.',
      },
      {
        icon: '🧱',
        title: 'Reference-grade proof',
        description: 'It demonstrates that Una Labs already knows how to ship real operational software in the market.',
      },
    ],
    impact: {
      eyebrow: 'Why it matters for Una Labs',
      title: 'This is the kind of proof stronger than a testimonial',
      body:
        'Case studies like Dispatch do more than claim credibility. They let prospects see the quality bar, the workflow thinking, and the delivery standard with something concrete.',
      points: [
        'It proves Una Labs can build workflow-heavy software.',
        'It gives the public brand a real operational reference point.',
        'It is a better trust asset than placeholder praise.',
      ],
    },
    related: [
      {
        eyebrow: 'Related solution',
        title: 'Digital Agencies',
        description: 'See how structured delivery thinking applies to agency-style client work too.',
        href: '/solutions/agencies',
        hrefLabel: 'View agency solution',
      },
      {
        eyebrow: 'Related surface',
        title: 'Demo page',
        description: 'This case study can also anchor the Loom-based demo surface when recordings are ready.',
        href: '/demo',
        hrefLabel: 'View demo page',
      },
    ],
  },
  peacepad: {
    slug: 'peacepad',
    title: 'PeacePad',
    metaTitle: 'PeacePad Case Study',
    metaDescription:
      'AI conflict mediation across web, mobile, and browser surfaces, used as real proof for the Una Labs product story.',
    eyebrow: 'Case study',
    headline: 'PeacePad shows how Una Labs handles trust-sensitive product design',
    subheadline:
      'PeacePad is not a toy AI feature. It is a product that depends on calmer UX, careful flow design, and real operational follow-through across web, mobile, and browser contexts. Every surface — web, Android, and browser extension — scoped and shipped through the Una Labs delivery model.',
    primaryAction: { label: 'Visit PeacePad', href: 'https://peacepad.ca', external: true },
    secondaryAction: { label: 'Commission a similar build', href: '/start?source=case_study_peacepad&product=peacepad' },
    liveUrl: 'https://peacepad.ca',
    heroStats: [
      { value: 'Web + mobile', label: 'Multi-surface product', detail: 'The experience has to survive beyond a single marketing page.' },
      { value: 'Trust-sensitive', label: 'User journey', detail: 'Calm, guided experience matters as much as the underlying logic.' },
      { value: 'Real', label: 'Production proof', detail: 'It demonstrates that Una Labs ships products that people actually use.' },
    ],
    heroVisual: 'dashboard',
    challenge: {
      eyebrow: 'What mattered',
      title: 'Conflict-support products only work if the experience feels steady and humane',
      body:
        'Products like PeacePad need more than working code. They need thoughtful flow, deliberate onboarding, and a calmer outer surface that can hold user trust.',
      points: [
        'The emotional context of the product raises the bar for UX quality.',
        'The delivery system has to support both web and mobile realities.',
        'Operational clarity matters when the product is trust-sensitive.',
      ],
    },
    shipped: [
      {
        icon: '🕊️',
        title: 'Trust-focused interaction design',
        description: 'The product experience is shaped around reassurance, pacing, and guided flow rather than clutter.',
      },
      {
        icon: '📱',
        title: 'Multi-surface delivery',
        description: 'PeacePad spans more than a single route or single environment, which makes it a stronger proof surface.',
      },
      {
        icon: '🧩',
        title: 'Operational follow-through',
        description: 'The work behind PeacePad reflects product thinking, system thinking, and live deployment discipline.',
      },
    ],
    impact: {
      eyebrow: 'Why it matters for Una Labs',
      title: 'PeacePad proves the team can ship calm, trust-heavy software',
      body:
        'For buyers evaluating Una Labs, PeacePad is strong evidence that the brand is backed by actual product depth and not just commercial polish.',
      points: [
        'It proves the design quality bar on trust-sensitive workflows.',
        'It shows the team can support multi-surface delivery, not just static pages.',
        'It gives the brand a more human example of product craftsmanship.',
      ],
    },
    related: [
      {
        eyebrow: 'Related solution',
        title: 'Professional Services',
        description: 'See how similar trust and delivery patterns matter in consulting-style client work.',
        href: '/solutions/professional-services',
        hrefLabel: 'View professional services',
      },
      {
        eyebrow: 'Related surface',
        title: 'Client Portal',
        description: 'PeacePad helps illustrate why calm outward-facing delivery surfaces matter.',
        href: '/product/client-portal',
        hrefLabel: 'View client portal',
      },
    ],
  },
  saywetin: {
    slug: 'saywetin',
    title: 'SayWetin',
    metaTitle: 'SayWetin Case Study',
    metaDescription:
      'A live language and culture intelligence product that demonstrates real AI product execution.',
    eyebrow: 'Case study',
    headline: 'SayWetin is real AI product work shipped into the world',
    subheadline:
      'SayWetin shows a different side of the Una Labs capability set: language intelligence, product craft, and a real consumer-facing surface with actual complexity behind it. From language recognition to live consumer app — scoped, built, and deployed through the same process available to you today.',
    primaryAction: { label: 'Visit SayWetin', href: 'https://saywetin.app', external: true },
    secondaryAction: { label: 'Start a similar build', href: '/start?source=case_study_saywetin&product=saywetin' },
    liveUrl: 'https://saywetin.app',
    heroStats: [
      { value: 'AI', label: 'Product depth', detail: 'This is not a brochure site hiding behind an AI headline.' },
      { value: 'Culture-first', label: 'Product context', detail: 'The work sits at the intersection of language, media, and UX.' },
      { value: 'Live', label: 'Public proof', detail: 'It is already deployed and usable outside the repo.' },
    ],
    heroVisual: 'reporting',
    challenge: {
      eyebrow: 'What mattered',
      title: 'Language products need both technical capability and careful surface design',
      body:
        'When a product handles recognition, interpretation, or cultural nuance, the public-facing experience has to stay confident and useful. SayWetin is proof that Una Labs can build at that level.',
      points: [
        'The product promise depends on more than generic AI copy.',
        'Recognition and interpretation flows need thoughtful UX framing.',
        'Public trust comes from the shipping quality, not the ambition alone.',
      ],
    },
    shipped: [
      {
        icon: '🎵',
        title: 'Language and music intelligence',
        description: 'The product shows real AI application work with a clear public use case.',
      },
      {
        icon: '🌍',
        title: 'Distinct product positioning',
        description: 'It proves Una Labs can build products with a differentiated audience and cultural context.',
      },
      {
        icon: '🛠️',
        title: 'Operational maturity',
        description: 'The shipped experience reflects more than prototyping; it reflects ongoing product ownership.',
      },
    ],
    impact: {
      eyebrow: 'Why it matters for Una Labs',
      title: 'SayWetin shows technical ambition backed by execution',
      body:
        'This case study helps prospective clients see that Una Labs is capable of serious product work, especially where AI capability needs to become a real user experience rather than a concept slide.',
      points: [
        'It proves the brand can support AI-heavy product work.',
        'It broadens the public portfolio beyond operational workflow software.',
        'It makes the Una Labs story feel built, not borrowed.',
      ],
    },
    related: [
      {
        eyebrow: 'Related solution',
        title: 'SaaS Teams',
        description: 'See how the same delivery thinking supports teams building modern product surfaces.',
        href: '/solutions/saas',
        hrefLabel: 'View SaaS solution',
      },
      {
        eyebrow: 'Related surface',
        title: 'Reporting',
        description: 'Products with richer delivery context need better reporting and proof layers too.',
        href: '/product/reporting',
        hrefLabel: 'View reporting',
      },
    ],
  },
  'garden-cleaners': {
    slug: 'garden-cleaners',
    title: 'Garden Cleaners',
    metaTitle: 'Garden Cleaners Case Study',
    metaDescription:
      'A local cleaning services website built by Una Labs as a vertical demo — full brand, quote flow, and SEO-ready local landing pages.',
    eyebrow: 'Case study',
    headline: 'A full local-services site built from brief to launch',
    subheadline:
      'Garden Cleaners is a public client launch that shows Una Labs can deliver a complete local business presence: brand identity, service pages, quote request flow, and local SEO metadata — all scoped and shipped through the same delivery process available today.',
    primaryAction: { label: 'Start a similar build', href: '/start?source=case_study_garden_cleaners&product=local-services' },
    secondaryAction: { label: 'See how it works', href: '/how-it-works' },
    liveUrl: '',
    heroStats: [
      { value: 'Full site', label: 'Not a mockup', detail: 'Home, about, services, contact, and quote pages — all live routes.' },
      { value: 'Local SEO', label: 'Built in', detail: 'Canonical URLs, structured metadata, and local business schema on every page.' },
      { value: 'Quote flow', label: 'Functional', detail: 'Quote request form and API route wired end to end.' },
    ],
    heroVisual: 'delivery',
    challenge: {
      eyebrow: 'What the build proved',
      title: 'Local businesses need more than a landing page',
      body:
        'A local service business needs a credible web presence: a real brand, a service story, a way for customers to reach out, and enough SEO signal to get found. Getting all of that right takes product thinking, not just a template.',
      points: [
        'Brand identity and copy have to feel local and trustworthy.',
        'The quote flow needs to work end to end, not just look good.',
        'Local SEO requires deliberate structure, not just a page title.',
      ],
    },
    shipped: [
      {
        icon: '🏡',
        title: 'Full multi-page site',
        description: 'Home, about, services, contact, and quote pages built as isolated, route-aware surfaces with their own brand chrome.',
      },
      {
        icon: '📋',
        title: 'End-to-end quote request flow',
        description: 'Quote form and API route wired together so customer requests reach the business without manual forwarding.',
      },
      {
        icon: '📍',
        title: 'Local SEO metadata',
        description: 'Canonical URLs, structured schema, and location-specific metadata across every page in the subsite.',
      },
    ],
    impact: {
      eyebrow: 'Why it matters for Una Labs',
      title: 'Vertical demo builds are proof at the product level',
      body:
        'Garden Cleaners shows that Una Labs can scope, design, and ship a complete vertical product for a local service business. The execution standard here applies directly to any small or mid-size business that needs a real web presence, not a placeholder.',
      points: [
        'It proves Una Labs can deliver for local and service businesses, not only tech clients.',
        'The same patterns apply to trades, health, wellness, legal, and other verticals.',
        'It is a reference build for what "done" looks like at the local business tier.',
      ],
    },
    related: [
      {
        eyebrow: 'Related case study',
        title: 'Polar Anchor',
        description: 'Another demo vertical build — this time for a freight and logistics business with more complex service architecture.',
        href: '/products/polar-anchor',
        hrefLabel: 'See Polar Anchor',
      },
      {
        eyebrow: 'Related solution',
        title: 'Professional Services',
        description: 'See how structured intake and delivery applies across service-based businesses.',
        href: '/solutions/professional-services',
        hrefLabel: 'View solution',
      },
    ],
  },
  'polar-anchor': {
    slug: 'polar-anchor',
    title: 'Polar Anchor',
    metaTitle: 'Polar Anchor Case Study',
    metaDescription:
      'A freight forwarding and logistics website built by Una Labs as a vertical demo — multi-service architecture, quote flow, and full local brand presence.',
    eyebrow: 'Case study',
    headline: 'A logistics company site built with real operational depth',
    subheadline:
      'Polar Anchor is a demo build for a freight forwarding and logistics business. It covers the full brand surface — service pages, import/export, vehicle handling, warehousing — with a working quote flow and structured metadata. Built to show Una Labs can handle verticals with more complex service architecture.',
    primaryAction: { label: 'Start a similar build', href: '/start?source=case_study_polar_anchor&product=logistics' },
    secondaryAction: { label: 'See how it works', href: '/how-it-works' },
    liveUrl: '',
    heroStats: [
      { value: '4 services', label: 'Fully scoped', detail: 'Commercial cargo, import/export, vehicle shipping, and warehousing — each with its own page structure.' },
      { value: 'Quote flow', label: 'End to end', detail: 'Customer quote requests wired from form to API.' },
      { value: 'Schema', label: 'FreightForwarder', detail: 'Structured data and local SEO built in across the site.' },
    ],
    heroVisual: 'delivery',
    challenge: {
      eyebrow: 'What the build proved',
      title: 'Logistics businesses need more than a brochure',
      body:
        'A freight and logistics company has multiple service lines, each requiring its own clear value proposition and call to action. Building a site that holds that complexity without becoming confusing requires structural thinking, not just visual design.',
      points: [
        'Multiple service lines need their own clear positioning.',
        'Trust signals (professional handling, reliability, cost-efficiency) must feel earned, not claimed.',
        'A working quote flow is table stakes — it cannot just be a contact form.',
      ],
    },
    shipped: [
      {
        icon: '🚢',
        title: 'Multi-service architecture',
        description: 'Commercial cargo, import/export, vehicle shipping, and warehousing — each presented as a distinct, fully scoped service.',
      },
      {
        icon: '📋',
        title: 'Quote request system',
        description: 'End-to-end quote request flow from the customer-facing form through to an API route the business can act on.',
      },
      {
        icon: '🏢',
        title: 'Full brand and site presence',
        description: 'Brand-aware header, footer, service pages, about, contact, and local SEO metadata across all routes.',
      },
    ],
    impact: {
      eyebrow: 'Why it matters for Una Labs',
      title: 'Complex verticals need a build partner who understands service architecture',
      body:
        'Polar Anchor shows Una Labs can handle the structural complexity of a multi-service business. The service hierarchy, the trust language, and the operational flow all needed deliberate thinking — not just a template swap.',
      points: [
        'It proves Una Labs can scope and ship complex local B2B verticals.',
        'The same delivery pattern applies to trades, logistics, health, legal, and other multi-service industries.',
        'It demonstrates that demo builds here are execution artifacts, not design concepts.',
      ],
    },
    related: [
      {
        eyebrow: 'Related case study',
        title: 'Garden Cleaners',
        description: 'Another client launch for a local service business — same delivery standard, simpler service structure.',
        href: '/garden-cleaners',
        hrefLabel: 'See Garden Cleaners',
      },
      {
        eyebrow: 'Related case study',
        title: 'Dispatch',
        description: 'A live operational system that handles real-world logistics flow for Ottawa roadside assistance.',
        href: '/products/dispatch',
        hrefLabel: 'See Dispatch',
      },
    ],
  },
};

export const demoModules: DemoModule[] = [
  {
    slug: 'intake',
    label: 'Intake & Scoping',
    product: 'Una Labs',
    title: 'From brief to scoped plan in minutes',
    description:
      'Watch how a new client request moves through the Una Labs intake flow — structured questions, scope summary, and a direct path to the right plan.',
    placeholder: 'Walkthrough coming soon.',
    bullets: [
      'Guided two-step intake so nothing gets missed.',
      'Automatic scope summary generated before any commitment.',
      'Connects directly into Stripe — no chasing invoices.',
    ],
    cta: { label: 'Start your intake', href: '/start' },
  },
  {
    slug: 'dispatch',
    label: 'Delivery Tracking',
    product: 'Dispatch',
    title: 'Real-time request tracking from submission to resolution',
    description:
      'See how Dispatch moves a roadside service request from customer submission through operator queue to confirmed resolution — live, no spreadsheets.',
    placeholder: 'Walkthrough coming soon.',
    bullets: [
      'Customer submits a request and sees real-time status.',
      'Operator queue updates the moment state changes.',
      'Full resolution history logged without manual entry.',
    ],
    cta: { label: 'See Dispatch case study', href: '/products/dispatch' },
  },
  {
    slug: 'peacepad',
    label: 'AI Automation',
    product: 'PeacePad',
    title: 'AI-backed analysis built for high-trust decisions',
    description:
      'PeacePad walks users through sensitive communication review with calm, guided UX — showing how AI can feel trustworthy in emotionally loaded contexts.',
    placeholder: 'Walkthrough coming soon.',
    bullets: [
      'Structured data capture that reduces user anxiety.',
      'AI-generated insights surfaced at the right moment.',
      'Built for repeat use, not just a one-time demo.',
    ],
    cta: { label: 'See PeacePad case study', href: '/products/peacepad' },
  },
  {
    slug: 'saywetin',
    label: 'Product Depth',
    product: 'SayWetin',
    title: 'Culture-aware AI that works in the real world',
    description:
      'SayWetin demonstrates language and cultural intelligence built into a production app — proof that Una Labs ships AI that goes beyond generic outputs.',
    placeholder: 'Walkthrough coming soon.',
    bullets: [
      'Real language recognition across cultural contexts.',
      'AI outputs that feel locally relevant, not generic.',
      'Shipped and live — not a prototype or concept deck.',
    ],
    cta: { label: 'See SayWetin case study', href: '/saywetin' },
  },
];

export const proofHighlights = [
  {
    value: '4',
    label: 'Live products',
    note: 'Una Labs, Dispatch, PeacePad, and SayWetin — all deployed, all real.',
  },
  {
    value: '< 5 min',
    label: 'From brief to trial',
    note: 'Intake, plan selection, and Stripe activation — no sales call, no waiting.',
  },
  {
    value: '14-day',
    label: 'Risk-free trial',
    note: 'Customers activate immediately. No charge until day 15. Cancel anytime.',
  },
];

export const howItWorksProof = [
  { value: '2-step', label: 'Request flow', sub: 'Details first, plan selection second' },
  { value: 'Live', label: 'Stripe handoff', sub: 'Summary page already redirects into checkout' },
  { value: 'CAD', label: 'Commercial path', sub: 'Public pricing and billing are already live' },
  { value: 'Proof', label: 'Shipped products', sub: 'Real case studies back the platform story' },
];
