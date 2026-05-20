import fs from "node:fs";
import path from "node:path";
import JSZip from "jszip";
import { beforeAll, describe, expect, it } from "vitest";
import { tailorResumeForJD } from "../src/resume_tailor";

const templatePath = path.resolve(
  process.cwd(),
  ".local",
  "resume-references",
  "Fejiro_Efiuvwere_Canadian_Tire_Manager_Network_Analytics_Resume.docx"
);
const outputDir = path.resolve(process.cwd(), ".local", "generated-tests");

async function extractDocText(filePath: string): Promise<string> {
  const zip = await JSZip.loadAsync(fs.readFileSync(filePath));
  const docXml = await zip.file("word/document.xml")?.async("string");
  if (!docXml) return "";
  return docXml
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

    const text = await extractDocText(result.docxPath);
    expect(text).toContain("Manager, Network Analytics");
    expect(text).toMatch(/core strengths/i);
    expect(text).toContain("PORTFOLIO");
    expect(text).toContain("Canadian Tire");
    expect(text).not.toMatch(/WMS Project Manager|Blue Yonder|North West Company/i);
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