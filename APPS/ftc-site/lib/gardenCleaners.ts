export type GardenNavLink = {
  label: string;
  href: string;
};

export type GardenService = {
  slug: string;
  title: string;
  summary: string;
  detail: string;
  bullets: string[];
};

export type GardenTestimonial = {
  name: string;
  role: string;
  quote: string;
};

export type GardenFaq = {
  question: string;
  answer: string;
};

export type GardenMediaAsset = {
  src: string;
  alt: string;
  badge: string;
  title: string;
  caption: string;
};

export const gardenCleanersConfig = {
  companyName: 'Garden Cleaners',
  locationCity: 'Oshawa',
  locationRegion: 'Ontario',
  locationCountry: 'Canada',
  phoneDisplay: '(905) 000-0000',
  phoneHref: 'tel:+19050000000',
  email: 'hello@gardencleaners.ca',
  emailHref: 'mailto:hello@gardencleaners.ca',
  addressLine: 'Oshawa, Ontario, Canada',
  heroHeadline: 'Professional Cleaning Services You Can Trust in Oshawa',
  heroSubheadline:
    'Reliable residential and commercial cleaning with flexible scheduling, quality service, and a spotless finish every time.',
  primaryCta: { label: 'Get a Free Quote', href: '/garden-cleaners/quote' },
  secondaryCta: { label: 'View Services', href: '/garden-cleaners/services' },
  nav: [
    { label: 'Home', href: '/garden-cleaners' },
    { label: 'About', href: '/garden-cleaners/about' },
    { label: 'Services', href: '/garden-cleaners/services' },
    { label: 'Contact', href: '/garden-cleaners/contact' },
    { label: 'Get a Quote', href: '/garden-cleaners/quote' }
  ] satisfies GardenNavLink[],
  trustBullets: [
    'Reliable and professional team',
    'Flexible scheduling',
    'Residential and commercial cleaning',
    'Attention to detail',
    'Locally serving Oshawa and surrounding area'
  ],
  heroHighlights: ['One-time deep cleaning', 'Recurring cleaning plans', 'Move-in and move-out support'],
  serviceAreas: ['Oshawa', 'Whitby', 'Ajax', 'Pickering', 'Courtice', 'Durham Region'],
  businessHours: [
    'Monday - Friday: 8:00 AM - 6:00 PM',
    'Saturday: 9:00 AM - 3:00 PM',
    'Sunday: By request'
  ],
  testimonials: [
    {
      name: 'A. Morgan',
      role: 'Homeowner in Oshawa',
      quote:
        'Garden Cleaners made our home feel reset. They were on time, detailed, and easy to work with from the first call.'
    },
    {
      name: 'D. Patel',
      role: 'Office manager',
      quote:
        'We needed a cleaning team that could work around business hours without disrupting staff. The experience felt organized and dependable.'
    },
    {
      name: 'S. Brown',
      role: 'Property manager',
      quote:
        'Move-out cleaning was handled quickly and professionally. The unit was ready for listing much sooner than expected.'
    }
  ] satisfies GardenTestimonial[],
  faqs: [
    {
      question: 'Do you offer residential and commercial cleaning?',
      answer:
        'Yes. Garden Cleaners supports homeowners, offices, property managers, and turnover cleaning needs across Oshawa and nearby areas.'
    },
    {
      question: 'Can I book recurring cleaning?',
      answer:
        'Yes. We can scope one-time, weekly, bi-weekly, or custom recurring schedules depending on the property and service level required.'
    },
    {
      question: 'Do you handle move-in, move-out, and post-construction cleaning?',
      answer:
        'Yes. Those services are part of the core offer and can be tailored based on property size, timing, and cleanup requirements.'
    },
    {
      question: 'How do quotes work?',
      answer:
        'Submit the quote form with your property details and required service. We will follow up with the next step and a tailored estimate path.'
    }
  ] satisfies GardenFaq[],
  deepCleaningFeature: {
    eyebrow: 'Deep Cleaning Services Oshawa',
    title: 'Trusted deep cleaning experts near you in Oshawa.',
    body:
      'Discover detailed deep cleaning support for homes, apartments, offices, and managed properties. Garden Cleaners handles one-time resets, move-related cleaning, and high-attention service when a standard clean is not enough.',
    bullets: [
      'Ideal for first-time visits and seasonal resets',
      'Detailed focus on kitchens, bathrooms, and high-touch surfaces',
      'Flexible for one-time deep cleans or recurring plans'
    ],
    primaryCta: { label: 'Request a Deep Cleaning Quote', href: '/garden-cleaners/quote' },
    secondaryCta: { label: 'See All Services', href: '/garden-cleaners/services' }
  },
  media: {
    hero: {
      src: '/images/garden-cleaners/hero-cleaning-team.svg',
      alt: 'Illustration of a bright kitchen with a professional cleaning team preparing a polished finish.',
      badge: 'Residential and commercial cleaning',
      title: 'Bright, organized cleaning support for homes and workplaces.',
      caption: 'Built for one-time deep cleans, recurring schedules, and property reset work in Oshawa.'
    },
    deepCleaning: {
      src: '/images/garden-cleaners/deep-cleaning-kitchen.svg',
      alt: 'Illustration of a carefully cleaned kitchen with supplies arranged and surfaces shining.',
      badge: 'One-time deep cleaning',
      title: 'A more detailed clean when presentation and reset matter.',
      caption: 'Designed for move-related, seasonal, and pre-listing cleaning needs.'
    },
    commercial: {
      src: '/images/garden-cleaners/commercial-cleaning-office.svg',
      alt: 'Illustration of a tidy office space set up for professional commercial cleaning.',
      badge: 'Office and commercial cleaning',
      title: 'Reliable cleaning plans for offices, managed spaces, and shared environments.',
      caption: 'Low-disruption scheduling for teams that need consistency and a polished space.'
    }
  } satisfies Record<'hero' | 'deepCleaning' | 'commercial', GardenMediaAsset>
} as const;

export const gardenServices: GardenService[] = [
  {
    slug: 'residential-cleaning',
    title: 'Residential Cleaning',
    summary: 'Routine and one-time home cleaning tailored to busy households.',
    detail: 'Keep kitchens, bathrooms, living areas, and bedrooms consistently clean with dependable service built around your schedule.',
    bullets: ['Standard room cleaning', 'Kitchen and bathroom focus', 'Flexible scheduling']
  },
  {
    slug: 'commercial-cleaning',
    title: 'Commercial Cleaning',
    summary: 'Professional cleaning for offices, studios, and customer-facing spaces.',
    detail: 'Maintain a clean, reliable environment for staff and clients with after-hours or scheduled service blocks.',
    bullets: ['Office and workspace cleaning', 'Shared area upkeep', 'Low-disruption scheduling']
  },
  {
    slug: 'deep-cleaning',
    title: 'Deep Cleaning',
    summary: 'A more detailed reset for homes or businesses that need extra attention.',
    detail: 'Ideal for seasonal resets, first-time service, or spaces that need more than a standard recurring clean.',
    bullets: ['Detailed surface care', 'High-touch area focus', 'Reset before recurring service']
  },
  {
    slug: 'move-in-move-out-cleaning',
    title: 'Move In / Move Out Cleaning',
    summary: 'Turnover-ready cleaning for moves, listings, and property handoffs.',
    detail: 'Prepare a property for new occupants or restore a space after move-out with a practical, checklist-driven clean.',
    bullets: ['Vacancy turnover support', 'Listing preparation', 'Appliance and cabinet wipe-downs']
  },
  {
    slug: 'post-construction-cleaning',
    title: 'Post Construction Cleaning',
    summary: 'Cleanup support after renovations, fit-outs, and finishing work.',
    detail: 'Remove dust, residue, and surface debris so a newly completed space feels ready for occupancy or handoff.',
    bullets: ['Dust and debris cleanup', 'Detail finishing clean', 'Handoff-ready presentation']
  },
  {
    slug: 'recurring-cleaning',
    title: 'Recurring Cleaning',
    summary: 'Scheduled weekly, bi-weekly, or custom maintenance visits.',
    detail: 'Set a predictable cleaning rhythm that keeps the property in shape without rebooking each time.',
    bullets: ['Weekly and bi-weekly options', 'Custom cadence', 'Consistent upkeep']
  },
  {
    slug: 'office-cleaning',
    title: 'Office Cleaning',
    summary: 'Dedicated office support for desks, shared zones, and meeting spaces.',
    detail: 'A focused service for work environments that need dependable cleanliness and a professional client-facing standard.',
    bullets: ['Reception and meeting areas', 'Desk and touch-point cleaning', 'Professional presentation']
  }
];

export const gardenPropertyTypes = ['House', 'Condo / Apartment', 'Office', 'Retail / Commercial', 'Vacant unit', 'Other'] as const;
export const gardenServiceOptions = gardenServices.map((service) => service.title);
export const gardenFrequencies = ['One-time', 'Weekly', 'Bi-weekly', 'Monthly', 'Custom schedule'] as const;
