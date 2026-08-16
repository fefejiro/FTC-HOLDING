import { describe, expect, it } from "vitest";
import { parseRecruiterEmail } from "../src/job_parser.js";
import { generateReply } from "../src/reply_generator.js";
import type { ProfileConfig, RecruiterMessage } from "../src/types.js";

const profile: ProfileConfig = {
  name: "Fejiro Efiuvwere",
  location: "Toronto, Ontario, Canada",
  target_titles: ["Technical Program Manager", "Business Systems Analyst"],
  core_strengths: [
    "enterprise systems modernization",
    "ERP WMS POS systems",
    "API integrations",
    "requirements gathering",
    "UAT coordination",
    "technical program management",
    "stakeholder management",
    "AI workflow automation",
    "secure workflow architecture",
    "product strategy"
  ],
  work_authorization_note:
    "Canadian citizen, eligible for TN status under USMCA for qualifying roles.",
  contact: {
    email: "fejiro.efiuvwere@gmail.com",
    phone: "+1-416-473-2732",
    linkedin: "https://www.linkedin.com/in/fejiro-efiuvwere",
    github: "https://github.com/fefejiro"
  }
};

function mkMessage(over: Partial<RecruiterMessage>): RecruiterMessage {
  return {
    messageId: "m1",
    threadId: "t1",
    from: "Sarah Kim <sarah.kim@example.com>",
    subject: "Technical Program Manager - Remote",
    body: "Hi Fejiro,\n\nWe have a great opportunity.\n\nBest regards,\nSarah Kim",
    receivedAt: new Date().toISOString(),
    ...over
  };
}

function bodyParagraphs(body: string): string {
  const idx = body.lastIndexOf("\n\nBest regards,");
  return idx >= 0 ? body.slice(0, idx) : body;
}

function countWords(s: string): number {
  return s.trim().split(/\s+/).filter(Boolean).length;
}

describe("generateReply", () => {
  it("preserves the specific IT Business Analyst title from recruiter subjects", () => {
    const parsed = parseRecruiterEmail(mkMessage({
      subject: "CTH Opportunity _ IT Business Analyst _ Hybrid",
      body: "Kubota Canada has an IT Business Analyst opportunity in Pickering, ON with WMS, supply chain, requirements, SQL, API validation, and UAT."
    }));

    expect(parsed.roleTitle).toBe("IT Business Analyst");
    expect(parsed.cleanRoleTitle).toBe("IT Business Analyst");
  });

  it("US recruiter email with HTML entities, disclaimer, EEO, and JD paste -> clean body with TN line", () => {
    const message = mkMessage({
      from: "John Smith <john@usrecruit.com>",
      subject: "Technical Program Manager - New York, NY",
      body: `Hi&nbsp;Fejiro,&ndash;\n\nWe have a Technical Program Manager role in New York, NY, USA. Strong API integrations and ERP experience needed.\n\nBest regards,\nJohn Smith\n\nJob Description:\nResponsibilities include leading enterprise systems modernization. Requirements: 10+ years. Lorem ipsum dolor sit amet, consectetur adipiscing elit.\n\nDisclaimer: This email is confidential.\n\nEEO Statement: We are an equal opportunity employer.\n\nUnsubscribe here.`
    });
    const parsed = parseRecruiterEmail(message);
    const { body, subject } = generateReply({ parsed, profile });

    expect(subject).toBe("Re: Technical Program Manager");
    expect(body.startsWith("Hi John,")).toBe(true);
    expect(parsed.isUsRole).toBe(true);
    expect(body).toContain("TN roles under USMCA");

    expect(body).not.toMatch(/&nbsp;/i);
    expect(body).not.toMatch(/&ndash;/i);
    expect(body).not.toMatch(/&mdash;/i);
    expect(body).not.toMatch(/—/);
    expect(body).not.toMatch(/disclaimer/i);
    expect(body).not.toMatch(/unsubscribe/i);
    expect(body).not.toMatch(/eeo|equal opportunity/i);
    expect(body).not.toMatch(/lorem ipsum/i);
    expect(body).not.toMatch(/responsibilities include/i);

    const words = countWords(bodyParagraphs(body));
    expect(words).toBeGreaterThanOrEqual(90);
    expect(words).toBeLessThanOrEqual(150);
  });

  it("Canadian recruiter email -> first name from sign-off, no TN line", () => {
    const message = mkMessage({
      from: "recruiting@bigfirm.ca",
      subject: "Business Systems Analyst - Toronto",
      body: "Hello,\n\nWe have a Business Systems Analyst role in Toronto, ON. Hybrid.\n\nBest regards,\nSarah Kim"
    });
    const parsed = parseRecruiterEmail(message);
    const { body } = generateReply({ parsed, profile });

    expect(body.startsWith("Hi Sarah,")).toBe(true);
    expect(parsed.isUsRole).toBe(false);
    expect(body).not.toContain("TN roles under USMCA");
    expect(body).toContain("Business Systems Analyst");

    const words = countWords(bodyParagraphs(body));
    expect(words).toBeGreaterThanOrEqual(90);
    expect(words).toBeLessThanOrEqual(150);
  });

  it("noreply sender with no name in body -> falls back to 'Hi there,'", () => {
    const message = mkMessage({
      from: "noreply@jobsboard.com",
      subject: "Project Manager opportunity",
      body: "We have a Project Manager role available. Remote Canada."
    });
    const parsed = parseRecruiterEmail(message);
    const { body } = generateReply({ parsed, profile });

    expect(body.startsWith("Hi there,")).toBe(true);
    expect(body).not.toContain("Hi Recruiter,");
  });

  it("uses sender email as company fallback instead of Unknown Company", () => {
    const message = mkMessage({
      from: "Patricia Norman <patricia.norman@kellyservices.ca>",
      subject: "Urgent Job Opening: Test Lead",
      body: "Hello Fejiro,\n\nI have a Test Lead opportunity and wanted to connect."
    });
    const parsed = parseRecruiterEmail(message);

    expect(parsed.company).toBe("patricia.norman@kellyservices.ca");
    expect(parsed.company).not.toBe("Unknown Company");
  });

  it("never uses literal 'Recruiter' as a salutation", () => {
    const message = mkMessage({
      from: "info@somefirm.com",
      subject: "Integration Analyst",
      body: "Quick note about an Integration Analyst contract."
    });
    const parsed = parseRecruiterEmail(message);
    const { body } = generateReply({ parsed, profile });
    expect(body).not.toMatch(/^Hi Recruiter,/);
  });
});
