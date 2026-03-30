export type EngagementOfferValue =
  | "scoped-first-pass"
  | "prototype-direction-sprint"
  | "build-execution-track";

export type EngagementOffer = {
  value: EngagementOfferValue;
  title: string;
  summary: string;
  meta: string;
  price: string;
  idealFor: string;
  proofPrompt: string;
};

export const engagementOffers: readonly EngagementOffer[] = [
  {
    value: "scoped-first-pass",
    title: "Scoped First Pass",
    summary:
      "Best when the problem is still messy and you need the shortest believable next move.",
    meta: "2-5 business days - decision-ready first pass",
    price: "Starting from $750",
    idealFor: "Early-stage clarity, local-service setup, or rough ideas that need shape before build.",
    proofPrompt: "See how Una Labs turns an unclear setup problem into a decision-ready first move."
  },
  {
    value: "prototype-direction-sprint",
    title: "Prototype Direction Sprint",
    summary:
      "Best when you need a credible first version, tighter boundaries, and a real implementation path.",
    meta: "1-2 weeks - prototype direction and system framing",
    price: "Starting from $2,500",
    idealFor: "Teams that need product direction, booking flow structure, or a first version with clear boundaries.",
    proofPrompt: "See how Una Labs tightens a concept into a first version that can actually move."
  },
  {
    value: "build-execution-track",
    title: "Build Execution Track",
    summary:
      "Best when you already know the system needs to get built and want operator-led delivery.",
    meta: "Phased delivery - execution, iteration, and handoff",
    price: "Starting from $5,000+",
    idealFor: "Teams that are ready to move from scope into delivery, launch, and iterative execution.",
    proofPrompt: "See what full operator-led delivery looks like once the path is already clear."
  }
] as const;

export function getEngagementOffer(value: string) {
  return engagementOffers.find((offer) => offer.value === value);
}
