import fs from "node:fs";
import path from "node:path";
import JSZip from "jszip";
import {
  APPROVED_BUSINESS_ANALYST_GOLDEN_TEMPLATE_BASENAME,
  APPROVED_BUSINESS_ANALYST_TEMPLATE_BASENAME,
  APPROVED_IT_MANAGEMENT_TEMPLATE_BASENAME,
  APPROVED_ORANGE_TEMPLATE_BASENAME
} from "../src/resume_style.js";

const appRoot = process.cwd();
const committedFixtureRoot = path.join(appRoot, "tests", "fixtures", "resumes");
const fejiroFixtureRoot = path.join(appRoot, ".local", "test-fixtures", "fejiro");
const chukwumaFixture = path.join(
  appRoot,
  "instances",
  "chukwuma",
  "resumes",
  "Chukwuma Mezie-Okoye Golden Template.docx"
);
const chukwumaSourceResume = path.join(
  appRoot,
  "instances",
  "chukwuma",
  "resumes",
  "Chukwuma Mezie-Okoye Resume.pdf"
);

const fejiroFixtureNames = [
  APPROVED_ORANGE_TEMPLATE_BASENAME,
  APPROVED_BUSINESS_ANALYST_TEMPLATE_BASENAME,
  APPROVED_BUSINESS_ANALYST_GOLDEN_TEMPLATE_BASENAME,
  APPROVED_IT_MANAGEMENT_TEMPLATE_BASENAME,
  "Fejiro_Efiuvwere_Canadian_Tire_Manager_Network_Analytics_Resume.docx"
];

function xmlText(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

async function writeChukwumaFixture(): Promise<void> {
  const source = path.join(
    committedFixtureRoot,
    "Fejiro_Efiuvwere_Canadian_Tire_Manager_Network_Analytics_Resume.docx"
  );
  const zip = await JSZip.loadAsync(fs.readFileSync(source));
  const paragraphs = [
    "Digital Transformation Program Manager",
    "Chukwuma Mezie-Okoye",
    "candidate@example.test | linkedin.com/in/test-candidate",
    "Digital Transformation | Product Development | Project Delivery | Growth",
    "SUMMARY",
    "Summary placeholder 1",
    "Summary placeholder 2",
    "Summary placeholder 3",
    "Summary placeholder 4",
    "SKILLS",
    "Skill placeholder 1",
    "Skill placeholder 2",
    "Skill placeholder 3",
    "Skill placeholder 4",
    "Skill placeholder 5",
    "Skill placeholder 6",
    "Skill placeholder 7",
    "Skill placeholder 8",
    "EXPERIENCE",
    "Example Organisation | Programme Manager",
    "January 2020 - Present",
    "Experience placeholder 1",
    "Experience placeholder 2",
    "Experience placeholder 3",
    "Experience placeholder 4",
    "Experience placeholder 5",
    "Experience placeholder 6",
    "PORTFOLIO",
    "Portfolio placeholder 1",
    "Portfolio placeholder 2",
    "Portfolio placeholder 3",
    "Portfolio placeholder 4",
    "EDUCATION",
    "Education details available in the approved truth bank."
  ].map((text) => `<w:p><w:r><w:t>${xmlText(text)}</w:t></w:r></w:p>`).join("");
  zip.file(
    "word/document.xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">` +
    `<w:body>${paragraphs}<w:sectPr/></w:body></w:document>`
  );
  fs.mkdirSync(path.dirname(chukwumaFixture), { recursive: true });
  fs.writeFileSync(chukwumaFixture, await zip.generateAsync({ type: "nodebuffer" }));
  fs.writeFileSync(chukwumaSourceResume, Buffer.from("%PDF-1.4\n% Test-only onboarding fixture\n"));
}

export async function ensureResumeFixtures(): Promise<void> {
  fs.mkdirSync(fejiroFixtureRoot, { recursive: true });
  for (const name of fejiroFixtureNames) {
    const source = path.join(
      committedFixtureRoot,
      name === APPROVED_ORANGE_TEMPLATE_BASENAME
        ? "Fejiro_Efiuvwere_Canadian_Tire_Manager_Network_Analytics_Resume.docx"
        : name
    );
    if (!fs.existsSync(source)) {
      throw new Error(`Committed test template is missing: ${source}`);
    }
    fs.copyFileSync(source, path.join(fejiroFixtureRoot, name));
  }
  await writeChukwumaFixture();
}
