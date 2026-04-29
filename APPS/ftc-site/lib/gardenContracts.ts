export type GardenFormSource = "quote_page" | "contact_page" | "portal_page";

export type GardenQuotePayload = {
  fullName: string;
  email: string;
  phone: string;
  propertyType: string;
  serviceNeeded: string;
  preferredDate: string;
  frequency: string;
  region?: string;
  message: string;
  website: string;
  startedAt: number;
};

export type GardenPortalClickEventName =
  | "garden_portal_entry_click"
  | "garden_portal_cta_click"
  | "garden_portal_region_quote_click"
  | "garden_portal_sticky_click";

export type GardenQuoteLifecycleEventName =
  | "garden_quote_submit_attempt"
  | "garden_quote_submit_success"
  | "garden_quote_submit_error";

export type GardenQuoteLifecycleAnalyticsPayload = {
  location: string;
  label: string;
  source: GardenFormSource;
  propertyType?: string;
  serviceNeeded?: string;
  frequency?: string;
  errorCode?: string;
};

export type GardenContentSectionKind =
  | "workflow"
  | "estimate_framework"
  | "coverage"
  | "service_standards";

export type GardenContentSectionCard = {
  title: string;
  body: string;
  bullets?: string[];
  ctaLabel?: string;
  ctaHref?: string;
};

export type GardenContentSection = {
  id: string;
  kind: GardenContentSectionKind;
  eyebrow: string;
  title: string;
  description: string;
  cards: GardenContentSectionCard[];
};

export type GardenPortalUserRole = "client" | "staff" | "admin";
export type GardenQuoteStatus = "new" | "triaged" | "scheduled" | "completed" | "cancelled";

export type GardenPortalQuoteRecord = {
  id: string;
  clientEmail: string;
  region: string;
  serviceNeeded: string;
  status: GardenQuoteStatus;
  createdAt: string;
};

export type GardenPortalUserRecord = {
  id: string;
  role: GardenPortalUserRole;
  email: string;
  createdAt: string;
};

export type GardenPortalAssignmentRecord = {
  id: string;
  quoteId: string;
  staffUserId: string;
  assignedAt: string;
};
