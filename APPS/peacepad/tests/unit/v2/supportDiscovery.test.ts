import { describe, expect, it } from "vitest";
import { runSupportDiscovery } from "../../../server/v2/services/supportDiscoveryService";

describe("v2 support discovery module", () => {
  it("applies crisis-first safety gating when conflict is critical", async () => {
    const result = await runSupportDiscovery(
      {
        query: "family support",
        conflict_level: 4,
        limit: 5,
      },
      {
        fetchDatabaseResources: async () => [
          {
            title: "Family Legal Clinic",
            type: "legal",
            location: "Toronto, ON",
            url: "https://example.org/legal",
            phone: "555-1000",
            source: "database",
          },
        ],
        fetchOntarioResources: async () => [],
      },
    );

    expect(result.ranked_resources.length).toBeGreaterThan(0);
    expect(result.ranked_resources[0]?.type).toBe("crisis");
    expect(result.ranked_resources[0]?.disclaimer).toContain("immediate danger");
  });

  it("ranks query-matching resources higher in non-crisis mode", async () => {
    const result = await runSupportDiscovery(
      {
        query: "legal aid",
        conflict_level: 1,
        limit: 5,
      },
      {
        fetchDatabaseResources: async () => [
          {
            title: "Family Legal Aid Service",
            type: "legal",
            location: "Whitby, ON",
            url: "https://example.org/family-legal-aid",
            source: "database",
            description: "Legal aid and custody information.",
          },
          {
            title: "Community Parenting Group",
            type: "support",
            location: "Whitby, ON",
            url: "https://example.org/parenting-group",
            source: "database",
            description: "Weekly peer support group.",
          },
        ],
        fetchOntarioResources: async () => [],
      },
    );

    expect(result.ranked_resources[0]?.title).toContain("Legal");
  });

  it("passes the selected radius through and excludes known out-of-range local resources", async () => {
    let receivedRadius: number | undefined;
    const result = await runSupportDiscovery(
      {
        query: "counselling",
        location: { latitude: 43.6532, longitude: -79.3832, city: "Toronto" },
        radiusKm: 10,
      },
      {
        fetchDatabaseResources: async () => [],
        fetchOntarioResources: async (input) => {
          receivedRadius = input.radiusKm;
          return [
            { title: "Nearby support", type: "counselling", location: "Toronto, ON", url: "https://example.org/near", source: "ontario211", distanceKm: 3.2 },
            { title: "Far support", type: "counselling", location: "Hamilton, ON", url: "https://example.org/far", source: "ontario211", distanceKm: 58 },
          ];
        },
      },
    );

    expect(receivedRadius).toBe(10);
    expect(result.ranked_resources).toEqual(expect.arrayContaining([expect.objectContaining({ title: "Nearby support", distanceKm: 3.2 })]));
    expect(result.ranked_resources).not.toEqual(expect.arrayContaining([expect.objectContaining({ title: "Far support" })]));
  });
});
