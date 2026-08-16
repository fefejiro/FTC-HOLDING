import { describe, expect, it } from "vitest";
import {
  buildProcessedInboundCleanupQuery,
  buildRecruiterInboundQuery,
  buildRecruiterScanQuery,
  getManagedGmailStatusLabelNames
} from "../src/gmail.js";

describe("Gmail recruiter scan query", () => {
  it("excludes inbound and completed workflow labels to prevent relabel churn", () => {
    const query = buildRecruiterScanQuery("JOB AGENT/Recruiter Inbound", [
      "JOB AGENT/Drafted",
      "JOB AGENT/Sent",
      "JOB AGENT/Skipped"
    ]);

    expect(query).toContain("in:inbox");
    expect(query).toContain("newer_than:14d");
    expect(query).toContain('-label:"JOB AGENT/Recruiter Inbound"');
    expect(query).toContain('-label:"JOB AGENT/Drafted"');
    expect(query).toContain('-label:"JOB AGENT/Sent"');
    expect(query).toContain('-label:"JOB AGENT/Skipped"');
  });

  it("deduplicates repeated exclusions", () => {
    const query = buildRecruiterScanQuery("JOB AGENT/Sent", ["JOB AGENT/Sent"]);
    expect(query.split('-label:"JOB AGENT/Sent"')).toHaveLength(2);
  });

  it("builds a cleanup query for inbound messages that already have a final status", () => {
    const query = buildProcessedInboundCleanupQuery("JOB AGENT/Recruiter Inbound", [
      "JOB AGENT/Sent",
      "JOB AGENT/Skipped"
    ]);
    expect(query).toBe(
      'label:"JOB AGENT/Recruiter Inbound" {label:"JOB AGENT/Sent" label:"JOB AGENT/Skipped"}'
    );
  });

  it("excludes the configured mailbox from recruiter intake", () => {
    expect(buildRecruiterInboundQuery("fejiro.efiuvwere@gmail.com", 14)).toBe(
      'in:inbox newer_than:14d -from:"fejiro.efiuvwere@gmail.com"'
    );
  });

  it("keeps non-status labels outside the mutually exclusive workflow set", () => {
    const labels = {
      inbound: "Inbound",
      drafted: "Drafted",
      needs_review: "Needs Review",
      sent: "Sent",
      skipped: "Skipped",
      blocked: "Blocked",
      approved: "Approved",
      error: "Error",
      trusted_recruiter: "Trusted Recruiter",
      resume_generated: "Resume Generated"
    };
    const managed = getManagedGmailStatusLabelNames(labels);
    expect(managed).toContain("Sent");
    expect(managed).not.toContain("Trusted Recruiter");
    expect(managed).not.toContain("Resume Generated");
  });
});
