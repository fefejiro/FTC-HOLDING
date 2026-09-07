import { describe, expect, it } from "vitest";
import { getDb } from "../src/db.js";
import { getApplicationProof, recordApplicationProof } from "../src/application_proof.js";

describe("application proof ledger", () => {
  it("keeps candidate instances separate for the same job id", () => {
    const db = getDb(":memory:");
    recordApplicationProof(db, { instanceId: "fejiro", jobId: 7, status: "discovered" });
    recordApplicationProof(db, { instanceId: "chukwuma", jobId: 7, status: "discovered" });
    expect(getApplicationProof(db, "fejiro", 7)?.instanceId).toBe("fejiro");
    expect(getApplicationProof(db, "chukwuma", 7)?.instanceId).toBe("chukwuma");
    db.close();
  });

  it("rejects impossible status transitions", () => {
    const db = getDb(":memory:");
    recordApplicationProof(db, { instanceId: "fejiro", jobId: 8, status: "discovered" });
    expect(() => recordApplicationProof(db, {
      instanceId: "fejiro",
      jobId: 8,
      status: "submitted_verified",
      finalUrl: "https://example.com/confirmation",
      verifiedAt: "2026-07-23T12:00:00Z"
    })).toThrow(/Invalid application proof transition/);
    db.close();
  });

  it("requires evidence before marking a submission verified", () => {
    const db = getDb(":memory:");
    recordApplicationProof(db, { instanceId: "fejiro", jobId: 9, status: "discovered" });
    recordApplicationProof(db, { instanceId: "fejiro", jobId: 9, status: "package_ready" });
    recordApplicationProof(db, { instanceId: "fejiro", jobId: 9, status: "submission_attempted" });
    expect(() => recordApplicationProof(db, {
      instanceId: "fejiro",
      jobId: 9,
      status: "submitted_verified"
    })).toThrow(/requires verifiedAt/);
    db.close();
  });

  it("records a valid proof-backed submission", () => {
    const db = getDb(":memory:");
    recordApplicationProof(db, { instanceId: "fejiro", jobId: 10, status: "discovered" });
    recordApplicationProof(db, {
      instanceId: "fejiro",
      jobId: 10,
      status: "package_ready",
      resumeVersion: "resume-v1.docx"
    });
    recordApplicationProof(db, { instanceId: "fejiro", jobId: 10, status: "submission_attempted" });
    const proof = recordApplicationProof(db, {
      instanceId: "fejiro",
      jobId: 10,
      status: "submitted_verified",
      finalUrl: "https://example.com/application/confirmed",
      evidencePath: "proof/confirmation.png",
      verifiedAt: "2026-07-23T12:00:00Z"
    });
    expect(proof).toMatchObject({
      status: "submitted_verified",
      resumeVersion: "resume-v1.docx",
      evidencePath: "proof/confirmation.png"
    });
    db.close();
  });
});
