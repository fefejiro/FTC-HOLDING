import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  assertMailboxOwnership,
  isDuplicateJob,
  requiresExplicitApproval,
  selectApprovedCareerFacts
} from "../src/product_domain.js";

describe("SaaS product domain safeguards", () => {
  it("uses only approved Career Truth Bank facts", () => {
    const selection = selectApprovedCareerFacts([
      {
        id: "approved",
        userId: "user-a",
        category: "skill",
        statement: "SQL",
        verificationStatus: "approved",
        provenance: { resumeId: "resume-a" }
      },
      {
        id: "unverified",
        userId: "user-a",
        category: "certification",
        statement: "Unsupported certification",
        verificationStatus: "unverified",
        provenance: {}
      }
    ]);

    expect(selection.approvedFacts.map((fact) => fact.id)).toEqual(["approved"]);
    expect(selection.reviewFlags).toEqual([
      expect.objectContaining({ factId: "unverified", reason: expect.stringContaining("cannot be used") })
    ]);
  });

  it("requires approval for every sensitive answer type", () => {
    expect(requiresExplicitApproval("normal")).toBe(false);
    expect(requiresExplicitApproval("salary")).toBe(true);
    expect(requiresExplicitApproval("right_to_represent")).toBe(true);
    expect(requiresExplicitApproval("work_authorization")).toBe(true);
  });

  it("deduplicates source IDs, canonical URLs, and matching fingerprints", () => {
    const base = {
      source: "greenhouse",
      sourceId: "123",
      canonicalUrl: "https://example.com/jobs/123",
      company: "Example",
      title: "Product Manager",
      location: "Remote",
      descriptionFingerprint: "abc"
    };
    expect(isDuplicateJob(base, { ...base, title: "Different" })).toBe(true);
    expect(isDuplicateJob(base, { ...base, sourceId: "456" })).toBe(true);
    expect(isDuplicateJob(base, { ...base, sourceId: "456", canonicalUrl: "https://other.test/1" })).toBe(true);
    expect(isDuplicateJob(base, {
      ...base,
      sourceId: "456",
      canonicalUrl: "https://other.test/1",
      descriptionFingerprint: "different"
    })).toBe(false);
  });

  it("fails closed when Gmail belongs to another user", () => {
    expect(() => assertMailboxOwnership("user@example.com", "USER@example.com")).not.toThrow();
    expect(() => assertMailboxOwnership("user@example.com", "other@example.com"))
      .toThrow(/does not match/);
  });
});

describe("SaaS schema ownership", () => {
  const sql = fs.readFileSync(path.resolve("migrations/004_saas_foundation.sql"), "utf8");
  const privateTables = [
    "user_profiles", "user_preferences", "user_integrations", "career_profiles",
    "employment_history", "education_history", "certifications", "career_achievements",
    "projects", "skills", "languages", "work_authorizations", "resume_documents",
    "resume_templates", "resume_versions", "resume_role_families", "search_campaigns",
    "campaign_titles", "campaign_locations", "campaign_exclusions", "job_postings",
    "job_matches", "application_packages", "applications", "application_answers",
    "approvals", "recruiter_messages", "interviews", "follow_ups",
    "generated_documents", "agent_runs", "audit_logs"
  ];

  it.each(privateTables)("%s has explicit user ownership", (table) => {
    const tableSql = sql.match(new RegExp(`CREATE TABLE IF NOT EXISTS ${table} \\(([\\s\\S]*?)\\n\\);`, "i"))?.[1];
    expect(tableSql, `${table} definition`).toBeTruthy();
    expect(tableSql).toMatch(/user_id uuid (?:NOT NULL|PRIMARY KEY) REFERENCES product_users\(id\)/i);
  });

  it("forces RLS for every private table in the migration list", () => {
    for (const table of privateTables) {
      expect(sql).toContain(`'${table}'`);
    }
    expect(sql).toContain("FORCE ROW LEVEL SECURITY");
    expect(sql).toContain("app_has_organization_access(organization_id)");
  });

  it("stores immutable application transitions", () => {
    expect(sql).toContain("CREATE TABLE IF NOT EXISTS application_state_transitions");
    expect(sql).not.toMatch(/UPDATE application_state_transitions/i);
  });
});
