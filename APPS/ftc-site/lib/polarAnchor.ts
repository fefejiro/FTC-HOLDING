export type PolarNavLink = {
  label: string;
  href: string;
};

export type PolarService = {
  slug: string;
  title: string;
  summary: string;
  detail: string;
  bullets: string[];
};

export type PolarTestimonial = {
  name: string;
  role: string;
  quote: string;
};

export type PolarFaq = {
  question: string;
  answer: string;
};

export type PolarMediaAsset = {
  src: string;
  alt: string;
  badge: string;
  title: string;
  caption: string;
};

export const polarAnchorBasePath = "/polar-anchor" as const;

export const polarAnchorConfig = {
  companyName: "Polar Anchor",
  tagline: "Just in time connections",
  locationCity: "Toronto",
  locationRegion: "Ontario",
  locationCountry: "Canada",
  phoneDisplay: "+1 (647) 000-0000",
  phoneHref: "tel:+16470000000",
  email: "hello@unalabs.cloud",
  emailHref: "mailto:hello@unalabs.cloud",
  addressLine: "Canada",
  heroHeadline: "End-to-End Freight and Logistics Solutions You Can Rely On",
  heroSubheadline:
    "Polar Anchor helps businesses move cargo, vehicles, and commercial shipments with dependable freight forwarding, transportation, customs support, warehousing, and import-export coordination.",
  primaryCta: { label: "Request a Quote", href: `${polarAnchorBasePath}/quote` },
  secondaryCta: { label: "View Services", href: `${polarAnchorBasePath}/services` },
  nav: [
    { label: "Home", href: polarAnchorBasePath },
    { label: "About", href: `${polarAnchorBasePath}/about` },
    { label: "Services", href: `${polarAnchorBasePath}/services` },
    { label: "Contact", href: `${polarAnchorBasePath}/contact` },
    { label: "Request Quote", href: `${polarAnchorBasePath}/quote` }
  ] satisfies PolarNavLink[],
  trustBullets: [
    "Freight Forwarding",
    "Transportation",
    "Warehousing",
    "Customs Clearance",
    "Import and Export",
    "Consultancy"
  ],
  heroHighlights: [
    "Ocean and air freight",
    "Commercial cargo and vehicles",
    "Warehousing and customs support"
  ],
  businessHours: [
    "Mon to Fri, 9:00 AM to 6:00 PM",
    "Saturday: By shipment schedule",
    "Sunday: Emergency coordination only"
  ],
  processSteps: [
    "Request a quote",
    "Share shipment details",
    "We coordinate the movement",
    "Delivery and ongoing support"
  ],
  testimonials: [
    {
      name: "Import Operations Lead",
      role: "Commercial goods importer",
      quote:
        "Polar Anchor gives us clearer coordination across freight, customs, and delivery. The experience feels organized from start to finish."
    },
    {
      name: "SME Logistics Manager",
      role: "Growing business in Canada",
      quote:
        "We needed an operating partner that could handle movement professionally without making every shipment feel complicated. Polar Anchor fits that need well."
    },
    {
      name: "Auto Logistics Client",
      role: "Vehicle shipping coordination",
      quote:
        "The communication is practical, the next steps are clear, and the handoffs feel controlled. That matters when vehicle movement is time-sensitive."
    }
  ] satisfies PolarTestimonial[],
  faqs: [
    {
      question: "What types of shipments do you handle?",
      answer:
        "Polar Anchor supports commercial goods, containerized cargo, vehicle shipments, warehousing-linked movement, and import-export logistics coordination."
    },
    {
      question: "Do you support vehicle shipping?",
      answer:
        "Yes. Vehicle shipping and auto logistics can be supported where handling, release coordination, and onward transport planning are required."
    },
    {
      question: "Can you help with customs clearance?",
      answer:
        "Yes. Polar Anchor supports customs coordination, documentation readiness, and the practical next steps needed to keep shipments moving."
    },
    {
      question: "Do you offer warehousing support?",
      answer:
        "Yes. Warehousing and cargo staging can be part of the logistics plan when shipments need controlled handling, timing support, or temporary storage."
    },
    {
      question: "Can businesses request recurring logistics support?",
      answer:
        "Yes. Polar Anchor is positioned to support businesses that need recurring freight coordination, repeat shipments, and an ongoing logistics partner."
    },
    {
      question: "How do I request a quote?",
      answer:
        "Use the quote form with your shipment type, route, timing, and support needs. Polar Anchor will follow up with the right operational next step."
    }
  ] satisfies PolarFaq[],
  operationsFeature: {
    eyebrow: "Customer-first execution",
    title:
      "Customer satisfaction is at the core of our operations while delivering cost-effective, value-added services.",
    body:
      "Polar Anchor provides end-to-end efficient logistics solutions in a seamless and professional manner for importers, exporters, dealers, and businesses that need reliable coordination.",
    bullets: [
      "End-to-end logistics support",
      "Cost-effective value-added service",
      "Professional shipment coordination"
    ],
    primaryCta: { label: "Request a Quote", href: `${polarAnchorBasePath}/quote` },
    secondaryCta: { label: "Contact Polar Anchor", href: `${polarAnchorBasePath}/contact` }
  },
  media: {
    hero: {
      src: "/images/polar-anchor/polar-anchor-hero.svg",
      alt: "Polar Anchor logistics hero with containers, vessel movement, and transport coordination.",
      badge: "Freight forwarding and logistics",
      title: "Cargo, containers, vehicles, and inland movement handled through one coordinated flow.",
      caption:
        "A modern logistics presentation for businesses that need practical freight execution, customs support, warehousing, and transportation."
    },
    trust: {
      src: "/images/polar-anchor/polar-anchor-yard.svg",
      alt: "Container yard and truck logistics scene for Polar Anchor.",
      badge: "Operational capability",
      title: "Built for container, cargo, and commercial shipment coordination.",
      caption:
        "Polar Anchor is positioned for businesses that need a logistics partner with strong operational follow-through."
    },
    operations: {
      src: "/images/polar-anchor/polar-anchor-operations.svg",
      alt: "Warehouse and cargo handling illustration for Polar Anchor operations.",
      badge: "Warehousing and handling",
      title: "Storage, staging, and movement support when timing and sequencing matter.",
      caption:
        "Useful for shipments that need warehousing, container handling, or a smoother path from arrival to final delivery."
    },
    customs: {
      src: "/images/polar-anchor/polar-anchor-customs.svg",
      alt: "Customs and logistics documentation scene for Polar Anchor.",
      badge: "Customs and coordination",
      title: "Documentation, release timing, and import-export support built into the plan.",
      caption:
        "A strong fit for importers and exporters who need clearer coordination around customs and commercial shipment flow."
    },
    about: {
      src: "/images/polar-anchor/polar-anchor-control.svg",
      alt: "Logistics planning and control view for Polar Anchor.",
      badge: "Professional coordination",
      title: "A business-focused logistics partner with practical execution discipline.",
      caption:
        "The Polar Anchor brand is designed to feel trustworthy, capable, and conversion-ready for client-facing presentations."
    },
    vehicles: {
      src: "/images/polar-anchor/polar-anchor-vehicles.svg",
      alt: "Vehicle shipping and logistics handling illustration for Polar Anchor.",
      badge: "Vehicle shipping support",
      title: "Support for dealers and clients moving imported vehicles with better coordination.",
      caption:
        "Vehicle handling, release sequencing, and onward transport planning can be part of the operational flow."
    },
    contact: {
      src: "/images/polar-anchor/polar-anchor-contact.svg",
      alt: "Operations and contact scene with route coordination and logistics signals.",
      badge: "Responsive communication",
      title: "Fast follow-up and clear next steps from the first conversation.",
      caption:
        "The quote and contact experience is designed to feel clean, premium, and easy to trust."
    }
  } satisfies Record<
    "hero" | "trust" | "operations" | "customs" | "about" | "vehicles" | "contact",
    PolarMediaAsset
  >
} as const;

export const polarServices: PolarService[] = [
  {
    slug: "freight-forwarding",
    title: "Freight Forwarding",
    summary: "Coordinated movement for international and domestic commercial shipments.",
    detail:
      "Polar Anchor helps businesses plan and execute freight movement with stronger coordination across carriers, terminals, and delivery points.",
    bullets: ["Ocean and air freight coordination", "Commercial shipment planning", "Multi-party logistics follow-through"]
  },
  {
    slug: "transportation",
    title: "Transportation",
    summary: "Dependable inland movement for cargo, containers, and released shipments.",
    detail:
      "Transportation support is designed around timing, route clarity, and practical handoff management from port, yard, or warehouse to destination.",
    bullets: ["Port and terminal pickup", "Truck coordination", "Scheduled delivery support"]
  },
  {
    slug: "warehousing",
    title: "Warehousing",
    summary: "Flexible storage, staging, and shipment handling support.",
    detail:
      "Warehousing services support receiving, temporary storage, staging, and onward movement when delivery timing or inventory flow needs tighter coordination.",
    bullets: ["Cargo staging", "Temporary storage", "Handling and release support"]
  },
  {
    slug: "customs-clearance",
    title: "Customs Clearance",
    summary: "Practical support around customs flow, release timing, and documentation readiness.",
    detail:
      "Polar Anchor helps clients reduce friction around customs-related steps with better coordination between paperwork, timing, and the next operational action.",
    bullets: ["Documentation support", "Release coordination", "Import and export follow-up"]
  },
  {
    slug: "import-export-support",
    title: "Import and Export Support",
    summary: "End-to-end coordination for businesses moving goods across borders.",
    detail:
      "Importers and exporters get a more seamless logistics experience across freight, customs, warehousing, and onward transport needs.",
    bullets: ["Import coordination", "Export planning", "Business-friendly shipment support"]
  },
  {
    slug: "consultancy",
    title: "Logistics Consultancy",
    summary: "Advisory support for shipment planning, trade flow decisions, and logistics setup.",
    detail:
      "For SMEs and commercial teams, consultancy support helps create a clearer path through routing, service selection, and operational sequencing.",
    bullets: ["Shipment planning guidance", "Operational recommendations", "SME logistics support"]
  },
  {
    slug: "vehicle-shipping",
    title: "Vehicle Shipping",
    summary: "Specialized coordination for auto logistics and imported vehicle movement.",
    detail:
      "Vehicle shipping support covers handling, release timing, and onward movement for dealers or clients shipping imported vehicles into Canada.",
    bullets: ["Dealer support", "Vehicle movement planning", "Handling and transport coordination"]
  }
];

export const polarShipmentTypes = [
  "Containerized cargo",
  "Commercial goods",
  "Vehicle shipment",
  "Palletized freight",
  "Warehousing support",
  "Import / export support"
] as const;

export const polarServiceOptions = polarServices.map((service) => service.title);

export const polarTimelineOptions = [
  "Urgent / immediate support",
  "Within 1-2 weeks",
  "This month",
  "Planning upcoming shipments",
  "Ongoing logistics support"
] as const;
