export const emergencyPromptHasPermission = false;

export const emergencyPromptCaseStudy = {
  slug: "emergency-prompt",
  clientName: emergencyPromptHasPermission
    ? "Emergency Prompt"
    : "Local Services Lead Engine (Client)",
  tileTitle: emergencyPromptHasPermission ? "Emergency Prompt" : "Local Services Lead Engine",
  subtitle: "Lead engine setup (YouTube SEO + inbound call flow)",
  service: "Lead engine setup",
  status: "In progress (Phase 1)",
  tags: ["Local SEO", "Content pipeline", "Conversion"],
  externalUrl: "https://emergencyprompt.com"
} as const;
