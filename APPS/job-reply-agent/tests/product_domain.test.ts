import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  assertMailboxOwnership,
  buildGroundedInterviewQuestions,
  buildTrustAnalysis,
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

  it("explains fit using only approved career facts", () => {
    const analysis = buildTrustAnalysis({
      score: 84,
      jobDescription: "Project management, Jira, SAP, cloud, cybersecurity and risk management.",
      careerFacts: [
        {
          id: "approved-jira",
          userId: "user-a",
          category: "experience",
          statement: "Led project management, Jira, SAP, cloud and risk management delivery.",
          verificationStatus: "approved",
          provenance: { resumeId: "resume-a" }
        },
        {
          id: "unverified-cyber",
          userId: "user-a",
          category: "experience",
          statement: "Led cybersecurity projects.",
          verificationStatus: "review_required",
          provenance: {}
        }
      ],
      now: "2026-07-28T14:00:00.000Z"
    });

    expect(analysis.match.matchedRequirements).toEqual(
      expect.arrayContaining(["cloud", "jira", "project management", "risk management", "sap"])
    );
    expect(analysis.match.missingRequirements).toContain("cybersecurity");
    expect(analysis.match.evidenceFactIds).toEqual(["approved-jira"]);
    expect(analysis.ats.unsupportedTerms).toEqual(analysis.ats.missingTerms);
  });

  it("grounds interview preparation in approved facts", () => {
    const questions = buildGroundedInterviewQuestions({
      title: "IT Project Manager",
      company: "Example",
      careerFacts: [{
        id: "approved-delivery",
        userId: "user-a",
        category: "experience",
        statement: "Led enterprise delivery.",
        verificationStatus: "approved",
        provenance: {}
      }]
    });

    expect(questions).toHaveLength(5);
    expect(questions[0].prompt).toContain("IT Project Manager");
    expect(questions[0].approvedFactIds).toEqual(["approved-delivery"]);
    expect(questions.at(-1)?.approvedFactIds).toEqual([]);
  });
});

describe("trust-first pilot schema", () => {
  const sql = fs.readFileSync(path.resolve("migrations/010_trust_first_pilot.sql"), "utf8");

  it("owns and forces RLS on every new private resource", () => {
    for (const table of [
      "product_job_insights",
      "product_interview_prep_sessions",
      "product_outcome_events"
    ]) {
      expect(sql).toMatch(new RegExp(`CREATE TABLE IF NOT EXISTS ${table}[\\s\\S]*?user_id uuid NOT NULL`, "i"));
      expect(sql).toContain(`ALTER TABLE ${table} FORCE ROW LEVEL SECURITY`);
      expect(sql).toContain(`CREATE POLICY ${table}_tenant_policy`);
    }
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
