// Single source of truth for Garden Cleaners content.
// Mirrors APPS/ftc-site/lib/gardenCleaners.ts so this site's quote form
// posts payloads that the existing /api/garden-cleaners-quote endpoint accepts.

export const site = {
  name: 'Garden Cleaners',
  url: 'https://gardencleaners.ca',
  city: 'Oshawa',
  region: 'Ontario',
  country: 'Canada',
  phoneDisplay: '+1 289 200 0631',
  phoneHref: 'tel:+12892000631',
  email: 'gardencleaners@gmail.com',
  emailHref: 'mailto:gardencleaners@gmail.com',
  addressLine: 'Oshawa, Ontario, Canada',
  hero: {
    headline: 'Professional Cleaning Services You Can Trust in Oshawa',
    sub: 'Reliable residential and commercial cleaning with flexible scheduling, quality service, and a spotless finish every time.',
    highlights: [
      'One-time deep cleaning',
      'Recurring cleaning plans',
      'Move-in and move-out support'
    ]
  },
  trustBullets: [
    'Reliable and professional team',
    'Flexible scheduling',
    'Residential and commercial cleaning',
    'Attention to detail',
    'Locally serving Oshawa and surrounding area'
  ],
  serviceAreas: ['Oshawa', 'Whitby', 'Ajax', 'Pickering', 'Courtice', 'Durham Region'],
  businessHours: [
    'Monday - Friday: 8:00 AM - 6:00 PM',
    'Saturday: 9:00 AM - 3:00 PM',
    'Sunday: By request'
  ]
} as const;

export const nav = [
  { label: 'Home', href: '/' },
  { label: 'Services', href: '/services' },
  { label: 'About', href: '/about' },
  { label: 'Portal', href: '/portal' },
  { label: 'Contact', href: '/contact' },
  { label: 'Get a Quote', href: '/quote' }
] as const;

export type Service = {
  slug: string;
  title: string;
  summary: string;
  detail: string;
  bullets: string[];
};

// Titles MUST match ftc-site lib/gardenCleaners.ts so the API accepts submissions.
export const services: Service[] = [
  { slug: 'residential-cleaning', title: 'Residential Cleaning', summary: 'Routine and one-time home cleaning tailored to busy households.', detail: 'Keep kitchens, bathrooms, living areas, and bedrooms consistently clean with dependable service built around your schedule.', bullets: ['Standard room cleaning', 'Kitchen and bathroom focus', 'Flexible scheduling'] },
  { slug: 'commercial-cleaning', title: 'Commercial Cleaning', summary: 'Professional cleaning for offices, studios, and customer-facing spaces.', detail: 'Maintain a clean, reliable environment for staff and clients with after-hours or scheduled service blocks.', bullets: ['Office and workspace cleaning', 'Shared area upkeep', 'Low-disruption scheduling'] },
  { slug: 'deep-cleaning', title: 'Deep Cleaning', summary: 'A more detailed reset for homes or businesses that need extra attention.', detail: 'Ideal for seasonal resets, first-time service, or spaces that need more than a standard recurring clean.', bullets: ['Detailed surface care', 'High-touch area focus', 'Reset before recurring service'] },
  { slug: 'move-in-move-out-cleaning', title: 'Move In / Move Out Cleaning', summary: 'Turnover-ready cleaning for moves, listings, and property handoffs.', detail: 'Prepare a property for new occupants or restore a space after move-out with a practical, checklist-driven clean.', bullets: ['Vacancy turnover support', 'Listing preparation', 'Appliance and cabinet wipe-downs'] },
  { slug: 'post-construction-cleaning', title: 'Post Construction Cleaning', summary: 'Cleanup support after renovations, fit-outs, and finishing work.', detail: 'Remove dust, residue, and surface debris so a newly completed space feels ready for occupancy or handoff.', bullets: ['Dust and debris cleanup', 'Detail finishing clean', 'Handoff-ready presentation'] },
  { slug: 'recurring-cleaning', title: 'Recurring Cleaning', summary: 'Scheduled weekly, bi-weekly, or custom maintenance visits.', detail: 'Set a predictable cleaning rhythm that keeps the property in shape without rebooking each time.', bullets: ['Weekly and bi-weekly options', 'Custom cadence', 'Consistent upkeep'] },
  { slug: 'office-cleaning', title: 'Office Cleaning', summary: 'Dedicated office support for desks, shared zones, and meeting spaces.', detail: 'A focused service for work environments that need dependable cleanliness and a professional client-facing standard.', bullets: ['Reception and meeting areas', 'Desk and touch-point cleaning', 'Professional presentation'] }
];

export const propertyTypes = ['House', 'Townhouse', 'Condo / Apartment', 'Office', 'Retail / Commercial', 'Vacant unit', 'Other'] as const;
export const frequencies = ['One-time', 'Weekly', 'Bi-weekly', 'Monthly', 'Custom schedule'] as const;
export const addOns = ['Oven cleaning', 'Window cleaning (interior)', 'Window + roof exterior', 'Fridge cleaning', 'Cabinet interiors'] as const;

export type Testimonial = { name: string; role: string; quote: string };
export const testimonials: Testimonial[] = [
  { name: 'A. Morgan', role: 'Homeowner in Oshawa', quote: 'Garden Cleaners made our home feel reset. They were on time, detailed, and easy to work with from the first call.' },
  { name: 'D. Patel', role: 'Office manager', quote: 'We needed a cleaning team that could work around business hours without disrupting staff. The experience felt organized and dependable.' },
  { name: 'S. Brown', role: 'Property manager', quote: 'Move-out cleaning was handled quickly and professionally. The unit was ready for listing much sooner than expected.' }
];

export type Faq = { question: string; answer: string };
export const faqs: Faq[] = [
  { question: 'Do you offer residential and commercial cleaning?', answer: 'Yes. Garden Cleaners supports homeowners, offices, property managers, and turnover cleaning needs across Oshawa and nearby areas.' },
  { question: 'Can I book recurring cleaning?', answer: 'Yes. We can scope one-time, weekly, bi-weekly, or custom recurring schedules depending on the property and service level required.' },
  { question: 'Do you handle move-in, move-out, and post-construction cleaning?', answer: 'Yes. Those services are part of the core offer and can be tailored based on property size, timing, and cleanup requirements.' },
  { question: 'How do quotes work?', answer: 'Submit the quote form with your property details and required service. We will follow up with the next step and a tailored estimate path.' },
  { question: 'What areas do you serve?', answer: 'Garden Cleaners primarily serves Oshawa and the surrounding Durham Region, including Whitby, Ajax, Pickering, and Courtice. Reach out to confirm availability for your location.' },
  { question: 'Do you bring your own cleaning supplies and equipment?', answer: 'Yes. Garden Cleaners arrives with professional-grade supplies and equipment. If you have a preferred product or a specific requirement, let us know when booking and we will do our best to accommodate.' },
  { question: 'How far in advance do I need to book?', answer: 'For standard bookings we recommend at least 48 hours notice. For move-out, post-construction, or large commercial cleans, a few days lead time helps us allocate the right team and prepare properly.' },
  { question: 'Is the cleaning team insured and professional?', answer: 'Yes. Garden Cleaners operates with a professional, trained team. We take presentation, communication, and reliability seriously on every visit.' }
];

// Quote intake email. The QuoteForm renders a `mailto:` submission so the
// site has zero backend coupling and zero risk to other FTC apps. Replies
// land in the Garden Cleaners inbox directly from the user's mail client.
export const QUOTE_INTAKE_EMAIL = 'gardencleaners@gmail.com';
