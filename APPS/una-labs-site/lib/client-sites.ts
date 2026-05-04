export type ClientSiteConfig = {
  slug: string;
  clientName: string;
  logoUrl?: string;
  primaryColor?: string;
  description: string;
};

export const CLIENT_SITES: ClientSiteConfig[] = [
  {
    slug: 'garden',
    clientName: 'Garden Cleaners',
    primaryColor: 'brand-teal',
    description: 'Professional residential cleaning services powered by Una Labs.',
  },
  {
    slug: 'og',
    clientName: 'OG Trades',
    primaryColor: 'brand-orange',
    description: 'Skilled trades scheduling and project management by Una Labs.',
  },
  {
    slug: 'polar',
    clientName: 'Polar',
    primaryColor: 'brand-teal',
    description: 'Cold-chain logistics and fulfilment, managed by Una Labs.',
  },
  {
    slug: 'contrast',
    clientName: 'Contrast',
    primaryColor: 'brand-teal',
    description: 'Brand and design delivery platform by Una Labs.',
  },
];

export function getClientSite(slug: string): ClientSiteConfig | undefined {
  return CLIENT_SITES.find((site) => site.slug === slug);
}
