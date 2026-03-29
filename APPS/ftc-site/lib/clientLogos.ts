export const clientLogos = [
  {
    name: "LCBO",
    alt: "LCBO client logo",
    src: "/images/clients/lcbo-logo.jpg",
    width: 220,
    height: 88
  },
  {
    name: "Canadian Tire",
    alt: "Canadian Tire client logo",
    src: "/images/clients/canadian-tire-logo.jpg",
    width: 240,
    height: 88
  },
  {
    name: "Home Depot",
    alt: "Home Depot client logo",
    src: "/images/clients/home-depot-logo.png",
    width: 230,
    height: 88
  },
  {
    name: "Ontario Government",
    alt: "Ontario Government client logo",
    src: "/images/clients/ontario-government-logo.png",
    width: 240,
    height: 88
  }
] as const;

export type ClientMetric = {
  label: string;
  value: number;
  prefix?: string;
  suffix?: string;
};

export const clientMetrics: ClientMetric[] = [
  {
    label: "Active Projects",
    value: 12,
    suffix: "+"
  },
  {
    label: "Average First Delivery",
    value: 48,
    suffix: "hr"
  },
  {
    label: "Build Transparency",
    value: 100,
    suffix: "%"
  },
  {
    label: "Live Products",
    value: 3
  }
];
