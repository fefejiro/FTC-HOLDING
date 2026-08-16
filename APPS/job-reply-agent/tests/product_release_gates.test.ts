import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import type { ConnectorCapability, ConnectorStatus } from "../src/product_domain.js";
import {
  connectorStatusSurface,
  schedulerConnectorStatusSurface
} from "../src/product_release_gates.js";
import { productReleaseInfo, PRODUCT_SCHEMA_VERSION } from "../src/product_release.js";

const releaseGateStatuses = [
  "blocked_auth",
  "manual_only",
  "pilot_only",
  "certified_live"
] as const satisfies readonly ConnectorStatus[];

describe("product release-gate status surfaces", () => {
  it("exposes only safe release identity fields", () => {
    const previous = {
      RELEASE_SHA: process.env.RELEASE_SHA,
      BUILD_TIMESTAMP: process.env.BUILD_TIMESTAMP,
      NODE_ENV: process.env.NODE_ENV
    };
    process.env.RELEASE_SHA = "64953ce5f09e638d24facd80340fc8f9d576d35f";
    process.env.BUILD_TIMESTAMP = "2026-08-16T21:00:00.000Z";
    process.env.NODE_ENV = "production";
    try {
      expect(productReleaseInfo()).toEqual({
        commitSha: "64953ce5f09e638d24facd80340fc8f9d576d35f",
        buildTimestamp: "2026-08-16T21:00:00.000Z",
        environment: "production",
        schemaVersion: PRODUCT_SCHEMA_VERSION
      });
    } finally {
      for (const [key, value] of Object.entries(previous)) {
        if (value === undefined) delete process.env[key];
        else process.env[key] = value;
      }
    }
  });

  it.each(releaseGateStatuses)("keeps %s distinct on connector and scheduler surfaces", (status) => {
    const connector = {
      source: status === "pilot_only" ? "gmail" : "linkedin",
      status,
      discovery: true,
      packageGeneration: true,
      assistedSubmission: true,
      controlledSubmission: status === "certified_live",
      proofReconciliation: status === "certified_live" || status === "pilot_only",
      evidenceReference: "private://proof/candidate-message.eml",
      verifiedAt: "2026-08-06T12:00:00.000Z",
      accountIdentifier: "candidate@example.com",
      expiresAt: "2026-08-13T12:00:00.000Z",
      blockingReason: "Candidate wrote: my private message content",
      oauthRefreshToken: "credential-value-must-not-leak",
      candidateMessageContent: "private message content"
    } as ConnectorCapability & Record<string, unknown>;

    const connectorSurface = connectorStatusSurface(connector);
    const schedulerSurface = schedulerConnectorStatusSurface(status);

    expect(connectorSurface.status).toBe(status);
    expect(connectorSurface.accountIdentifier).toBe(connector.accountIdentifier);
    expect(connectorSurface.schedulerEligible).toBe(
      status === "pilot_only" || status === "certified_live"
    );
    expect(schedulerSurface).toEqual({
      connectorStatus: status,
      schedulerEligible: status === "pilot_only" || status === "certified_live",
      schedulerGate: `connector_${status}`
    });

    const serialized = JSON.stringify({ connectorSurface, schedulerSurface });
    for (const sensitiveValue of [
      connector.evidenceReference,
      connector.blockingReason,
      connector.oauthRefreshToken,
      connector.candidateMessageContent
    ]) {
      expect(serialized).not.toContain(String(sensitiveValue));
    }
  });

  it("renders allow-listed release-gate fields instead of private repository fields", () => {
    const app = fs.readFileSync(path.resolve("public/app.js"), "utf8");
    const server = fs.readFileSync(path.resolve("src/product_server.ts"), "utf8");
    const worker = fs.readFileSync(path.resolve("src/product_worker.ts"), "utf8");
    expect(app).toContain("connector.schedulerEligible");
    expect(app).toContain("connector.certificationEvidenceRecorded");
    expect(app).not.toMatch(/connector\.(?:evidenceReference|blockingReason)/);
    expect(server).toContain("connectors.map(connectorStatusSurface)");
    expect(worker).toContain("schedulerConnectorStatusSurface(source.status)");
  });
});
