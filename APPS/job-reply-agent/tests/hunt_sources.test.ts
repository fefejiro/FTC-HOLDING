import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import Database from "better-sqlite3";
import { initHuntSchema } from "../src/hunt/db.js";
import { greenhouseSource } from "../src/hunt/sources/greenhouse_source.js";
import { leverSource } from "../src/hunt/sources/lever_source.js";
import { ashbySource } from "../src/hunt/sources/ashby_source.js";
import {
  createGmailAlertSource,
  parseAlertBody,
  type GmailAlertEmail
} from "../src/hunt/sources/gmail_alert_source.js";
import { runScout } from "../src/hunt/cli.js";
import { countBySource } from "../src/hunt/job_store.js";
import type { HuntConfig } from "../src/hunt/config_loader.js";

function makeDb() {
  const db = new Database(":memory:");
  initHuntSchema(db);
  return db;
}

function makeConfig(overrides: Partial<HuntConfig["searches"]["companies"]> = {}): HuntConfig {
  return {
    searches: {
      searches: {},
      companies: {
        greenhouse: overrides.greenhouse ?? [],
        lever: overrides.lever ?? [],
        ashby: overrides.ashby ?? []
      }
    },
    scoringRules: {} as HuntConfig["scoringRules"],
    truthBank: {} as HuntConfig["truthBank"],
    blockedTerms: {} as HuntConfig["blockedTerms"],
    applicationAnswers: {} as HuntConfig["applicationAnswers"],
    siteRules: {} as HuntConfig["siteRules"]
  } as HuntConfig;
}

describe("hunt sources — ATS adapters", () => {
  let fetchMock: ReturnType<typeof vi.fn>;
  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("greenhouseSource maps JSON, strips HTML, detects remote", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      async json() {
        return {
          jobs: [
            {
              id: 12345,
              title: "Senior PM",
              absolute_url: "https://boards.greenhouse.io/acme/jobs/12345",
              location: { name: "Remote — Canada" },
              updated_at: "2026-01-02T03:04:05Z",
              content: "Build &amp; ship <p>great things</p>"
            }
          ]
        };
      }
    });
    const cfg = makeConfig({ greenhouse: ["acme"] });
    const jobs = await greenhouseSource.fetch(cfg);
    expect(jobs).toHaveLength(1);
    expect(jobs[0]?.source).toBe("greenhouse");
    expect(jobs[0]?.source_id).toBe("12345");
    expect(jobs[0]?.remote).toBe(true);
    expect(jobs[0]?.description).toContain("Build & ship");
    expect(jobs[0]?.description).not.toContain("<p>");
  });

  it("greenhouseSource isolates per-slug errors", async () => {
    fetchMock
      .mockResolvedValueOnce({ ok: false, status: 500, async json() { return {}; } })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        async json() {
          return { jobs: [{ id: 1, title: "X", absolute_url: "u", location: { name: "NYC" }, updated_at: "t" }] };
        }
      });
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const cfg = makeConfig({ greenhouse: ["bad", "good"] });
    const jobs = await greenhouseSource.fetch(cfg);
    expect(jobs).toHaveLength(1);
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it("leverSource maps postings and detects remote workplaceType", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      async json() {
        return [
          {
            id: "abc-123",
            text: "Staff Engineer",
            hostedUrl: "https://jobs.lever.co/acme/abc-123",
            createdAt: 1735776000000,
            categories: { location: "Toronto", commitment: "Full-time" },
            workplaceType: "remote",
            descriptionPlain: "Plain text"
          }
        ];
      }
    });
    const jobs = await leverSource.fetch(makeConfig({ lever: ["acme"] }));
    expect(jobs).toHaveLength(1);
    expect(jobs[0]?.source).toBe("lever");
    expect(jobs[0]?.source_id).toBe("abc-123");
    expect(jobs[0]?.remote).toBe(true);
    expect(jobs[0]?.posted_at).toBe(new Date(1735776000000).toISOString());
  });

  it("ashbySource maps jobs and uses isRemote", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      async json() {
        return {
          jobs: [
            {
              id: "ash-1",
              title: "PM",
              jobUrl: "https://jobs.ashbyhq.com/acme/ash-1",
              location: "Remote",
              isRemote: true,
              publishedAt: "2026-02-01T00:00:00Z",
              descriptionPlain: "Body"
            }
          ]
        };
      }
    });
    const jobs = await ashbySource.fetch(makeConfig({ ashby: ["acme"] }));
    expect(jobs[0]?.source_id).toBe("ash-1");
    expect(jobs[0]?.remote).toBe(true);
  });

  it("isEnabled is false when no slugs configured", () => {
    const empty = makeConfig();
    expect(greenhouseSource.isEnabled(empty)).toBe(false);
    expect(leverSource.isEnabled(empty)).toBe(false);
    expect(ashbySource.isEnabled(empty)).toBe(false);
  });
});

describe("gmail_alert source — parser", () => {
  it("parses LinkedIn-style alert block", () => {
    const body = [
      "Today's job picks",
      "",
      "Senior Product Manager",
      "Shopify · Toronto, ON · Remote",
      "https://www.linkedin.com/comm/jobs/view/123456?trk=eml-jobs-alert",
      "",
      "Another role",
      "Faire · Remote",
      "https://www.linkedin.com/jobs/view/789?utm_source=eml"
    ].join("\n");
    const jobs = parseAlertBody(body);
    expect(jobs).toHaveLength(2);
    expect(jobs[0]).toMatchObject({
      title: "Senior Product Manager",
      company: "Shopify",
      location: expect.stringContaining("Toronto")
    });
    expect(jobs[0]?.url).not.toContain("trk=");
    expect(jobs[1]?.company).toBe("Faire");
  });

  it("deduplicates the same URL", () => {
    const body = [
      "Role A",
      "Co · NYC",
      "https://www.linkedin.com/jobs/view/1",
      "Role A",
      "Co · NYC",
      "https://www.linkedin.com/jobs/view/1?utm_x=1"
    ].join("\n");
    const jobs = parseAlertBody(body);
    expect(jobs).toHaveLength(1);
  });
});

describe("runScout orchestration", () => {
  it("upserts RawJobs into hunt_jobs via injected adapters", async () => {
    const db = makeDb();
    const emails: GmailAlertEmail[] = [
      {
        messageId: "m1",
        subject: "Jobs",
        from: "jobalerts-noreply@linkedin.com",
        body: [
          "Senior PM",
          "Shopify · Remote",
          "https://www.linkedin.com/jobs/view/999"
        ].join("\n"),
        receivedAt: "2026-03-01T00:00:00Z"
      }
    ];
    const gmail = createGmailAlertSource({ fetchEmails: async () => emails });
    const results = await runScout(db, makeConfig(), { adapters: [gmail] });
    expect(results).toHaveLength(1);
    expect(results[0]?.fetched).toBe(1);
    expect(results[0]?.inserted).toBe(1);
    const counts = countBySource(db);
    expect(counts.gmail_alert).toBe(1);

    // idempotent re-run: no new inserts
    const second = await runScout(db, makeConfig(), { adapters: [gmail] });
    expect(second[0]?.inserted).toBe(0);
    expect(second[0]?.updated).toBe(1);
  });

  it("filters by sourceFilter and skips disabled adapters", async () => {
    const db = makeDb();
    const gmail = createGmailAlertSource({ fetchEmails: async () => [] });
    const results = await runScout(db, makeConfig({ greenhouse: ["acme"] }), {
      sourceFilter: "gmail_alert",
      adapters: [gmail]
    });
    expect(results).toHaveLength(1);
    expect(results[0]?.source).toBe("gmail_alert");
  });
});
