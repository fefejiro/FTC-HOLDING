import type {
  SupportDiscoveryRequest,
  SupportDiscoveryResponse,
} from "../schemas/supportDiscovery";
import { hasCrisisSafetyFlag } from "./safetySignals";

interface CandidateResource {
  title: string;
  type: string;
  location: string;
  url: string;
  phone?: string;
  description?: string;
  isCrisis?: boolean;
  source: "static" | "database" | "ontario211";
}

export interface SupportDiscoveryDependencies {
  fetchDatabaseResources?: (category?: string) => Promise<CandidateResource[]>;
  fetchOntarioResources?: (
    params: SupportDiscoveryRequest["location"] & { query?: string; category?: string; limit?: number },
  ) => Promise<CandidateResource[]>;
}

const STATIC_CRISIS_RESOURCES: CandidateResource[] = [
  {
    title: "988 Suicide Crisis Helpline",
    type: "crisis",
    location: "Canada (national)",
    url: "https://988.ca/",
    phone: "988",
    description: "24/7 immediate crisis support by call or text.",
    isCrisis: true,
    source: "static",
  },
  {
    title: "Kids Help Phone",
    type: "crisis",
    location: "Canada (national)",
    url: "https://kidshelpphone.ca/",
    phone: "1-800-668-6868",
    description: "24/7 youth crisis counselling and referral support.",
    isCrisis: true,
    source: "static",
  },
  {
    title: "211 Ontario",
    type: "support",
    location: "Ontario",
    url: "https://211ontario.ca/",
    phone: "211",
    description: "Community and social support line with crisis routing.",
    isCrisis: true,
    source: "static",
  },
];

function normalize(value: string | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

function scoreResource(resource: CandidateResource, input: SupportDiscoveryRequest, crisisMode: boolean): number {
  const query = normalize(input.query);
  const haystack = [
    normalize(resource.title),
    normalize(resource.type),
    normalize(resource.description),
    normalize(resource.location),
  ].join(" ");

  let score = 0;
  if (query) {
    if (haystack.includes(query)) {
      score += 35;
    }
    for (const token of query.split(/\s+/).filter(Boolean)) {
      if (haystack.includes(token)) {
        score += 8;
      }
    }
  }

  if (input.category && normalize(resource.type).includes(normalize(input.category))) {
    score += 20;
  }

  if (input.location?.city && normalize(resource.location).includes(normalize(input.location.city))) {
    score += 12;
  }

  if (resource.source === "database") {
    score += 6;
  }
  if (resource.source === "ontario211") {
    score += 4;
  }

  if (crisisMode && resource.isCrisis) {
    score += 80;
  } else if (resource.isCrisis) {
    score += 8;
  }

  return score;
}

function dedupeResources(resources: CandidateResource[]): CandidateResource[] {
  const seen = new Set<string>();
  const deduped: CandidateResource[] = [];

  for (const resource of resources) {
    const key = `${normalize(resource.title)}::${normalize(resource.phone)}::${normalize(resource.url)}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    deduped.push(resource);
  }

  return deduped;
}

async function defaultFetchDatabaseResources(category?: string): Promise<CandidateResource[]> {
  const { storage } = await import("../../storage");
  const dbResources = await storage.getSupportResources(category || "all", "all");

  return dbResources.map((resource: any) => ({
    title: resource.organization || "Support Resource",
    type: resource.category || "support",
    location: resource.address || resource.region || "Not specified",
    url: resource.website || "https://peacepad.ca/",
    phone: resource.phone || undefined,
    description: (resource.services || []).join(", "),
    isCrisis: resource.category === "crisis",
    source: "database",
  }));
}

async function defaultFetchOntarioResources(
  params: SupportDiscoveryRequest["location"] & { query?: string; category?: string; limit?: number },
): Promise<CandidateResource[]> {
  const { ontario211Service } = await import("../../services/ontario211");
  if (!ontario211Service.isConfigured()) {
    return [];
  }

  if (!params?.latitude || !params?.longitude) {
    return [];
  }

  const apiResults = await ontario211Service.searchResources({
    latitude: params.latitude,
    longitude: params.longitude,
    radius: 80,
    keywords: params.query || params.category || "family support",
    limit: params.limit || 10,
  });

  return apiResults.map((resource: any) => ({
    title: resource.name || "Ontario 211 Resource",
    type: "support",
    location: [resource.city, resource.province].filter(Boolean).join(", ") || "Ontario",
    url: resource.website || "https://211ontario.ca/",
    phone: resource.phone || undefined,
    description: resource.description || "",
    isCrisis: /crisis|hotline|emergency/i.test(resource.description || ""),
    source: "ontario211",
  }));
}

function toResponseResource(resource: CandidateResource, crisisMode: boolean) {
  const disclaimer = crisisMode && resource.isCrisis
    ? "If you are in immediate danger, call 911 or local emergency services."
    : "Resource information is guidance only; verify details before relying on service availability.";

  return {
    title: resource.title,
    type: resource.type,
    location: resource.location,
    url: resource.url,
    phone: resource.phone,
    disclaimer,
  };
}

export async function runSupportDiscovery(
  input: SupportDiscoveryRequest,
  deps: SupportDiscoveryDependencies = {},
): Promise<SupportDiscoveryResponse> {
  const fetchDatabaseResources = deps.fetchDatabaseResources ?? defaultFetchDatabaseResources;
  const fetchOntarioResources = deps.fetchOntarioResources ?? defaultFetchOntarioResources;
  const limit = input.limit ?? 8;

  const crisisMode = (input.conflict_level ?? 0) >= 4 || hasCrisisSafetyFlag(input.safety_flags ?? []);
  const [dbResources, ontarioResources] = await Promise.all([
    fetchDatabaseResources(input.category),
    fetchOntarioResources({
      ...input.location,
      query: input.query,
      category: input.category,
      limit,
    }),
  ]);

  const combined = dedupeResources([...STATIC_CRISIS_RESOURCES, ...dbResources, ...ontarioResources]);
  const scored = combined
    .map((resource) => ({
      resource,
      score: scoreResource(resource, input, crisisMode),
    }))
    .sort((a, b) => b.score - a.score);

  const ordered = crisisMode
    ? [
        ...scored.filter((item) => item.resource.isCrisis),
        ...scored.filter((item) => !item.resource.isCrisis),
      ]
    : scored;

  return {
    ranked_resources: ordered.slice(0, limit).map((item) => toResponseResource(item.resource, crisisMode)),
  };
}
