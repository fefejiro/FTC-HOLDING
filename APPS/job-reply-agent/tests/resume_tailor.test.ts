import fs from "node:fs";
import path from "node:path";
import JSZip from "jszip";
import { beforeAll, describe, expect, it } from "vitest";
import { selectTailoringTemplatePath, tailorResumeForJD } from "../src/resume_tailor";
import {
  APPROVED_BUSINESS_ANALYST_TEMPLATE_BASENAME,
  APPROVED_IT_MANAGEMENT_TEMPLATE_BASENAME,
  APPROVED_ORANGE_TEMPLATE_BASENAME,
  FORBIDDEN_VISIBLE_RESUME_PHRASES,
  isApprovedOrangeTemplatePath
} from "../src/resume_style";

const templatePath = path.resolve(
  process.cwd(),
  ".local",
  "resume-references",
  "Fejiro_Efiuvwere_Canadian_Tire_Manager_Network_Analytics_Resume.docx"
);
const defaultTemplatePath = path.resolve(
  process.cwd(),
  "..",
  "..",
  "DOCS",
  "Fejiro_Job_Reply_Agent_Resume_Bank",
  "resumes",
  APPROVED_ORANGE_TEMPLATE_BASENAME
);
const businessAnalystTemplatePath = path.resolve(
  process.cwd(),
  "..",
  "..",
  "DOCS",
  "Fejiro_Job_Reply_Agent_Resume_Bank",
  "resumes",
  APPROVED_BUSINESS_ANALYST_TEMPLATE_BASENAME
);
const itManagementTemplatePath = path.resolve(
  process.cwd(),
  "..",
  "..",
  "DOCS",
  "Fejiro_Job_Reply_Agent_Resume_Bank",
  "resumes",
  APPROVED_IT_MANAGEMENT_TEMPLATE_BASENAME
);
const outputDir = path.resolve(process.cwd(), ".local", "generated-tests");

async function extractDocText(filePath: string): Promise<string> {
  const zip = await JSZip.loadAsync(fs.readFileSync(filePath));
  const xmlTexts = await Promise.all(
    Object.keys(zip.files)
      .filter((name) => /^word\/(?:document|header\d*|footer\d*)\.xml$/i.test(name))
      .map(async (name) => zip.file(name)?.async("string") || "")
  );
  return xmlTexts.join(" ")
    .replace(/<w:tab\/?\s*>/g, "\t")
    .replace(/<w:br\/?\s*>/g, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

async function extractDocumentXml(filePath: string): Promise<string> {
  const zip = await JSZip.loadAsync(fs.readFileSync(filePath));
  return zip.file("word/document.xml")?.async("string") || "";
}

function rowText(rowXml: string): string {
  return rowXml
    .replace(/<w:tab\/?\s*>/g, "\t")
    .replace(/<w:br\/?\s*>/g, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

describe("Resume Tailoring Engine", () => {
  beforeAll(() => {
    fs.mkdirSync(outputDir, { recursive: true });
    if (!fs.existsSync(templatePath)) {
      throw new Error(`Missing reference template at ${templatePath}`);
    }
  });

  it("accepts the legacy reference template and the approved default job-agent template", () => {
    expect(isApprovedOrangeTemplatePath(templatePath)).toBe(true);
    expect(path.basename(defaultTemplatePath)).toBe(APPROVED_ORANGE_TEMPLATE_BASENAME);
    expect(isApprovedOrangeTemplatePath(defaultTemplatePath)).toBe(true);
    expect(path.basename(businessAnalystTemplatePath)).toBe(APPROVED_BUSINESS_ANALYST_TEMPLATE_BASENAME);
    expect(isApprovedOrangeTemplatePath(businessAnalystTemplatePath)).toBe(true);
    expect(path.basename(itManagementTemplatePath)).toBe(APPROVED_IT_MANAGEMENT_TEMPLATE_BASENAME);
    expect(isApprovedOrangeTemplatePath(itManagementTemplatePath)).toBe(true);
  });

  it("selects the Business Analyst gold template only for BA-like roles", () => {
    expect(selectTailoringTemplatePath({
      parsed: {
        roleTitle: "Senior Business Systems Analyst",
        cleanRoleTitle: "Senior Business Systems Analyst",
        company: "ExampleCo"
      } as any,
      jdText: "Requirements gathering, user stories, acceptance criteria, UAT, Jira, Confluence.",
      defaultTemplatePath,
      businessAnalysisTemplatePath: businessAnalystTemplatePath
    })).toBe(businessAnalystTemplatePath);

    expect(selectTailoringTemplatePath({
      parsed: {
        roleTitle: "Business System Analyst",
        cleanRoleTitle: "Business System Analyst",
        company: "ExampleCo"
      } as any,
      jdText: "Requirements gathering, user stories, acceptance criteria, UAT, Jira, Confluence.",
      defaultTemplatePath,
      businessAnalysisTemplatePath: businessAnalystTemplatePath
    })).toBe(businessAnalystTemplatePath);

    expect(selectTailoringTemplatePath({
      parsed: {
        roleTitle: "WMS Project Manager",
        cleanRoleTitle: "WMS Project Manager",
        company: "ExampleCo"
      } as any,
      jdText: "Warehouse management, WMS, logistics, inventory, and release readiness.",
      defaultTemplatePath,
      businessAnalysisTemplatePath: businessAnalystTemplatePath
    })).toBe(defaultTemplatePath);
  });

  it("selects the IT management resume for IT lead and business systems manager roles", () => {
    expect(selectTailoringTemplatePath({
      parsed: {
        roleTitle: "Information Technology Lead",
        cleanRoleTitle: "Information Technology Lead",
        company: "Sprung Studio"
      } as any,
      jdText: "Lead IT operations, business systems support, vendor coordination, ERP, POS, WMS, release readiness, and stakeholder communication.",
      defaultTemplatePath,
      businessAnalysisTemplatePath: businessAnalystTemplatePath,
      itManagementTemplatePath
    })).toBe(itManagementTemplatePath);

    expect(selectTailoringTemplatePath({
      parsed: {
        roleTitle: "IT Business Systems Manager",
        cleanRoleTitle: "IT Business Systems Manager",
        company: "ExampleCo"
      } as any,
      jdText: "Manage enterprise applications, retail systems, service delivery, incident escalation, and team leadership.",
      defaultTemplatePath,
      businessAnalysisTemplatePath: businessAnalystTemplatePath,
      itManagementTemplatePath
    })).toBe(itManagementTemplatePath);

    expect(selectTailoringTemplatePath({
      parsed: {
        roleTitle: "Senior Business Systems Analyst",
        cleanRoleTitle: "Senior Business Systems Analyst",
        company: "ExampleCo"
      } as any,
      jdText: "Requirements gathering, user stories, acceptance criteria, UAT, Jira, Confluence.",
      defaultTemplatePath,
      businessAnalysisTemplatePath: businessAnalystTemplatePath,
      itManagementTemplatePath
    })).toBe(businessAnalystTemplatePath);
  });

  it("generates an IT management resume from the Sprung-calibrated template", async () => {
    const result = await tailorResumeForJD({
      parsed: {
        roleTitle: "Information Technology Lead",
        company: "Sprung Studio",
        location: "",
        employmentType: "",
        summary: "",
        recruiterName: "",
        parserConfidence: 90,
        cleanBody: "",
        cleanRoleTitle: "Information Technology Lead",
        alignmentKeywords: [],
        salaryOrRate: "",
        isUsRole: false
      },
      jdText: "Lead IT operations, business systems support, ERP, POS, WMS, vendor coordination, release readiness, stakeholder communication, incident escalation, and team leadership.",
      templatePath: itManagementTemplatePath,
      outputDir
    });

    const text = await extractDocText(result.docxPath);
    expect(path.basename(result.docxPath)).toBe("Information Technology Lead - Fejiro Efiuvwere - Sprung Studio Resume.docx");
    expect(path.basename(result.docxPath)).not.toContain("_");
    expect(text).toContain("Information Technology Lead");
    expect(text).toMatch(/IT|Information Technology|business systems/i);
    expect(text).not.toMatch(/\bOrange Standard\b/i);
    for (const phrase of FORBIDDEN_VISIBLE_RESUME_PHRASES) {
      expect(text.toLowerCase()).not.toContain(phrase);
    }
  });

  it("generates JD-aligned Canadian Tire styled resume in DOCX", async () => {
    const result = await tailorResumeForJD({
      parsed: {
        roleTitle: "Manager, Network Analytics",
        company: "Canadian Tire",
        location: "",
        employmentType: "",
        summary: "",
        recruiterName: "",
        parserConfidence: 90,
        cleanBody: "",
        cleanRoleTitle: "Manager, Network Analytics",
        alignmentKeywords: [],
        salaryOrRate: "",
        isUsRole: false
      },
      jdText: "Lead network analytics delivery for retail operations, data quality, cross-functional stakeholders, and decision-ready dashboards.",
      templatePath,
      outputDir
    });

    expect(result.newTitle).toBe("Manager, Network Analytics");
    expect(result.subtitle.length).toBeGreaterThan(20);
    expect(result.docxPath.endsWith(".docx")).toBe(true);
    expect(fs.existsSync(result.docxPath)).toBe(true);
    expect(path.basename(result.docxPath)).toBe("Manager Network Analytics - Fejiro Efiuvwere - Canadian Tire Resume.docx");
    expect(path.basename(result.docxPath)).not.toContain("_");

    const text = await extractDocText(result.docxPath);
    expect(text).toContain("Manager, Network Analytics");
    expect(text).toMatch(/core strengths/i);
    expect(text).toMatch(/PORTFOLIO|SELECTED ACHIEVEMENTS/);
    expect(text).toContain("Canadian Tire");
    expect(text).not.toMatch(/Ã¢|â€¢|•/);
    expect(text).not.toMatch(/Business Analyst \| Public Sector I&IT/i);
    expect(text).not.toMatch(/WMS Project Manager|Blue Yonder|North West Company/i);
  });

  it("generates an RQ-style Business Analyst resume without exposing internal tailoring language", async () => {
    const result = await tailorResumeForJD({
      parsed: {
        roleTitle: "RQ11067 - Senior Business Analyst",
        company: "Ontario Public Service",
        location: "Toronto, ON",
        employmentType: "Contract",
        summary: "",
        recruiterName: "",
        parserConfidence: 90,
        cleanBody: "",
        cleanRoleTitle: "RQ11067 - Senior Business Analyst",
        alignmentKeywords: [],
        salaryOrRate: "",
        isUsRole: false
      },
      jdText: [
        "RQ11067 Senior Business Analyst for I&IT public sector delivery.",
        "Requires requirements gathering, stakeholder engagement, current-state and future-state analysis, business process mapping, use cases, user stories, acceptance criteria, backlog refinement, Product Owner support, Agile ceremonies, UAT, DevOps, Jira, Confluence, Oracle, SQL, AODA-aware documentation, information management, workflows, and approval processes."
      ].join(" "),
      templatePath: businessAnalystTemplatePath,
      outputDir
    });

    const text = await extractDocText(result.docxPath);
    expect(path.basename(result.docxPath)).toBe("RQ11067 Senior Business Analyst - Fejiro Efiuvwere - Ontario Public Service Resume.docx");
    expect(path.basename(result.docxPath)).not.toContain("_");
    expect(text).toContain("Senior Business Analyst");
    expect(text).toMatch(/I&IT business analysis/i);
    expect(text).toMatch(/requirements gathering/i);
    expect(text).toMatch(/stakeholder engagement/i);
    expect(text).toMatch(/current-state and future-state/i);
    expect(text).toMatch(/business process mapping/i);
    expect(text).toMatch(/use cases/i);
    expect(text).toMatch(/user stories/i);
    expect(text).toMatch(/acceptance criteria/i);
    expect(text).toMatch(/backlog refinement/i);
    expect(text).toMatch(/Product Owner support/i);
    expect(text).toMatch(/Agile ceremonies/i);
    expect(text).toMatch(/UAT/i);
    expect(text).toMatch(/DevOps, Jira, Confluence, Oracle, and SQL/i);
    expect(text).toMatch(/public sector delivery/i);
    expect(text).toMatch(/AODA-aware documentation/i);
    expect(text).toMatch(/information management/i);
    expect(text).toMatch(/Workflow analysis and approval process improvement/i);
    expect(text).not.toMatch(/\bRQ\d+\b/i);
    expect(text).not.toMatch(/Target Role Alignment/i);
    expect(text).not.toMatch(/\btailored\b/i);
    for (const phrase of FORBIDDEN_VISIBLE_RESUME_PHRASES) {
      expect(text.toLowerCase()).not.toContain(phrase);
    }
  });

  it("preserves the approved two-column BA format while emphasizing Maximo and EWMS when requested", async () => {
    const result = await tailorResumeForJD({
      parsed: {
        roleTitle: "Senior IT Business Analyst",
        company: "City of Toronto",
        location: "Toronto, ON",
        employmentType: "Contract",
        summary: "",
        recruiterName: "",
        parserConfidence: 90,
        cleanBody: "",
        cleanRoleTitle: "Senior IT Business Analyst",
        alignmentKeywords: [],
        salaryOrRate: "",
        isUsRole: false
      },
      jdText: [
        "Senior IT Business Analyst supporting Enterprise Work Management System EWMS Phase 2.",
        "Must have IBM Maximo, asset management, work orders, preventative maintenance, service requests, BRD, test plans, UAT, defect tracking, data conversion, integrations, stakeholder signoffs, and implementation support."
      ].join(" "),
      templatePath: businessAnalystTemplatePath,
      outputDir
    });

    const text = await extractDocText(result.docxPath);
    expect(text).toMatch(/EWMS \/ IBM Maximo/i);
    expect(text).toMatch(/Maximo-related experience across The Brick through Talize/i);
    expect(text).toMatch(/asset, work order, preventative maintenance, service request/i);
    expect(text).toMatch(/BRD inputs/i);
    expect(text).toMatch(/stakeholder signoff/i);
    expect(text).not.toMatch(/\bstrong fit for\b/i);
    expect(text).not.toMatch(/\btailored\b/i);
    for (const phrase of FORBIDDEN_VISIBLE_RESUME_PHRASES) {
      expect(text.toLowerCase()).not.toContain(phrase);
    }

    const documentXml = await extractDocumentXml(result.docxPath);
    const tableXmls = [...documentXml.matchAll(/<w:tbl\b[\s\S]*?<\/w:tbl>/g)].map((match) => match[0]);
    expect(tableXmls.length).toBeGreaterThan(0);
    expect(rowText(tableXmls[0])).toMatch(/Senior IT Business Analyst/i);
    expect(rowText(tableXmls[0])).toMatch(/SUMMARY/i);
    expect(rowText(tableXmls[0])).toMatch(/SKILLS/i);
    expect(rowText(tableXmls[0])).toMatch(/EXPERIENCE/i);
  });

  it("creates a structurally valid DOCX package", async () => {
    const result = await tailorResumeForJD({
      parsed: {
        roleTitle: "Business Systems Analyst",
        company: "Workflow Health",
        location: "",
        employmentType: "",
        summary: "",
        recruiterName: "",
        parserConfidence: 90,
        cleanBody: "",
        cleanRoleTitle: "Business Systems Analyst",
        alignmentKeywords: [],
        salaryOrRate: "",
        isUsRole: false
      },
      jdText: "Business analysis, workflow approvals, stakeholder engagement, Jira, Confluence, SQL, and UAT.",
      templatePath,
      outputDir
    });

    const zip = await JSZip.loadAsync(fs.readFileSync(result.docxPath));
    expect(zip.file("[Content_Types].xml")).toBeTruthy();
    expect(zip.file("word/document.xml")).toBeTruthy();
    expect(result.provenanceStats?.selectedBulletCount).toBeGreaterThan(0);
    expect(result.provenanceStats?.placedEmployerBulletCount).toBeGreaterThan(0);
    expect(result.provenanceStats?.rejectedEmployerPlacementCount).toBeGreaterThan(0);
    expect(result.provenanceStats?.fallbackBulletCount).toBeGreaterThan(0);
  });

  it("removes unused blank rows from template skill tables", async () => {
    const result = await tailorResumeForJD({
      parsed: {
        roleTitle: "M&A Infra PM",
        company: "Genpact",
        location: "Remote Canada",
        employmentType: "Contract",
        summary: "",
        recruiterName: "",
        parserConfidence: 90,
        cleanBody: "",
        cleanRoleTitle: "M&A Infra PM",
        alignmentKeywords: [],
        salaryOrRate: "",
        isUsRole: false
      },
      jdText: [
        "Build a comprehensive project plan for company acquisition activities into a new parent company.",
        "Manage technical infrastructure projects, server patch schedules, patch completion, endpoint management tool rollout, email tenant migration, networking and fileshare migration to SharePoint, executive leadership communication, and delivery task tracking."
      ].join(" "),
      templatePath,
      outputDir
    });

    const documentXml = await extractDocumentXml(result.docxPath);
    const tableXmls = [...documentXml.matchAll(/<w:tbl\b[\s\S]*?<\/w:tbl>/g)].map((match) => match[0]);
    const rowXmls = [...documentXml.matchAll(/<w:tr\b[\s\S]*?<\/w:tr>/g)].map((match) => match[0]);
    expect(tableXmls.length).toBeGreaterThan(0);
    expect(rowXmls.every((row) => rowText(row).length > 0)).toBe(true);
  });

  it("keeps unverified or unknown-employer bullets out of employer experience sections", async () => {
    const result = await tailorResumeForJD({
      parsed: {
        roleTitle: "Salesforce CRM Business Systems Project Manager",
        company: "CRM Delivery Office",
        location: "",
        employmentType: "",
        summary: "",
        recruiterName: "",
        parserConfidence: 90,
        cleanBody: "",
        cleanRoleTitle: "Salesforce CRM Business Systems Project Manager",
        alignmentKeywords: [],
        salaryOrRate: "",
        isUsRole: false
      },
      jdText: "Salesforce CRM, Service Cloud, Jira, Confluence, requirements clarification, UAT, vendor coordination, adoption documentation.",
      templatePath,
      outputDir
    });

    const text = await extractDocText(result.docxPath);
    const experienceOnly = text.split(/SELECTED ACHIEVEMENTS|PORTFOLIO/i)[0];
    expect(text).toMatch(/SELECTED ACHIEVEMENTS/i);
    expect(text).toMatch(/Salesforce implementation and CRM business requirements/i);
    expect(experienceOnly).not.toMatch(/Salesforce implementation and CRM business requirements/i);
    expect(result.provenanceStats?.fallbackBulletCount).toBeGreaterThan(0);
  });

  it("keeps employer-tagged bullets attached to the matching employer", async () => {
    const result = await tailorResumeForJD({
      parsed: {
        roleTitle: "Ontario Government Business Analyst",
        company: "Ontario Government",
        location: "",
        employmentType: "",
        summary: "",
        recruiterName: "",
        parserConfidence: 90,
        cleanBody: "",
        cleanRoleTitle: "Ontario Government Business Analyst",
        alignmentKeywords: [],
        salaryOrRate: "",
        isUsRole: false
      },
      jdText: "I&IT business analyst requirements gathering stakeholder engagement acceptance criteria UAT public sector documentation.",
      templatePath,
      outputDir
    });

    const text = await extractDocText(result.docxPath);
    expect(text).toMatch(/Ontario Government \| System Software Manager[\s\S]{0,700}Led modernization of Ontario revenue processing/i);
    expect(text).not.toMatch(/Talize \| Information Technology Business System Manager[\s\S]{0,700}Led modernization of Ontario revenue processing/i);
  });

  it("classifies WMS and ERP roles outside the Business Analyst lane", async () => {
    const result = await tailorResumeForJD({
      parsed: {
        roleTitle: "WMS Consultant",
        company: "Retail Logistics Group",
        location: "",
        employmentType: "",
        summary: "",
        recruiterName: "",
        parserConfidence: 90,
        cleanBody: "",
        cleanRoleTitle: "WMS Consultant",
        alignmentKeywords: [],
        salaryOrRate: "",
        isUsRole: false
      },
      jdText: "WMS ERP warehouse operations inventory logistics fulfillment SQL data validation UAT operational support process improvement.",
      templatePath,
      outputDir
    });

    const text = await extractDocText(result.docxPath);
    expect(result.subtitle).toMatch(/WMS & ERP Delivery/i);
    expect(text).toMatch(/WMS, ERP, and supply-chain systems/i);
    expect(text).not.toMatch(/I&IT Business Analysis/i);
    expect(text).not.toMatch(/public sector systems/i);
  });

  it("generates JD-aligned Azure resume without retail contamination", async () => {
    const result = await tailorResumeForJD({
      parsed: {
        roleTitle: "Azure Cloud Enterprise Architect",
        company: "AgreeYa Solutions",
        location: "",
        employmentType: "",
        summary: "",
        recruiterName: "",
        parserConfidence: 90,
        cleanBody: "",
        cleanRoleTitle: "Azure Cloud Enterprise Architect",
        alignmentKeywords: [],
        salaryOrRate: "",
        isUsRole: false
      },
      jdText: "Design Azure cloud landing zones, architecture standards, integration governance, and migration delivery across enterprise workloads.",
      templatePath,
      outputDir
    });

    const text = await extractDocText(result.docxPath);
    expect(result.newTitle).toBe("Azure Cloud Enterprise Architect");
    expect(text).toContain("Azure Cloud Enterprise Architect");
    expect(text).toMatch(/cloud|architecture|integration|governance/i);
    expect(text).not.toMatch(/WMS Project Manager|Blue Yonder|North West Company/i);
  });

  it("generates Salesforce CRM delivery resume when Salesforce is required", async () => {
    const result = await tailorResumeForJD({
      parsed: {
        roleTitle: "Business Systems - Project Manager",
        company: "Addepar",
        location: "Calgary, AB / Remote",
        employmentType: "Full-time",
        summary: "",
        recruiterName: "",
        parserConfidence: 90,
        cleanBody: "",
        cleanRoleTitle: "Business Systems - Project Manager",
        alignmentKeywords: [],
        salaryOrRate: "$102,000-$127,000 a year",
        isUsRole: false
      },
      jdText: [
        "Lead technology and software implementations with vendors and internal stakeholders.",
        "Experience with Salesforce required.",
        "Service Cloud, Salesforce CPQ, AppBuilder, Jira, Confluence, and Agile delivery are desirable."
      ].join(" "),
      templatePath,
      outputDir
    });

    const text = await extractDocText(result.docxPath);
    expect(result.newTitle).toBe("Business Systems - Project Manager");
    expect(text).toContain("Addepar");
    expect(text).toMatch(/Salesforce|CRM/i);
    expect(text).toMatch(/Jira|Confluence|implementation/i);
    expect(text).not.toMatch(/WMS Project Manager|Blue Yonder|North West Company/i);
  });

  it("rejects missing role title or company instead of generic fallback", async () => {
    await expect(
      tailorResumeForJD({
        parsed: {
          roleTitle: "",
          company: "",
          location: "",
          employmentType: "",
          summary: "",
          recruiterName: "",
          parserConfidence: 90,
          cleanBody: "",
          cleanRoleTitle: "",
          alignmentKeywords: [],
          salaryOrRate: "",
          isUsRole: false
        },
        jdText: "Cloud architecture role",
        templatePath,
        outputDir
      })
    ).rejects.toThrow(/needs_review:missing_role_or_company/);
  });
});
