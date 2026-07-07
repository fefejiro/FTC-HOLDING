import fs from "node:fs";
import path from "node:path";
import JSZip from "jszip";

export type CoverLetterInput = {
  roleTitle: string;
  company: string;
  location?: string;
  jobDescription?: string;
};

export type CoverLetterArtifacts = {
  textPath: string;
  docxPath: string;
};

function clean(value: unknown): string {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function paragraphXml(text: string, opts: { bold?: boolean; after?: number } = {}): string {
  const runs = text
    ? `<w:r><w:rPr>${opts.bold ? "<w:b/>" : ""}</w:rPr><w:t xml:space="preserve">${escapeXml(text)}</w:t></w:r>`
    : "";
  return `<w:p><w:pPr><w:spacing w:after="${opts.after ?? 160}" w:line="276" w:lineRule="auto"/></w:pPr>${runs}</w:p>`;
}

function splitParagraphs(text: string): string[] {
  return text.replace(/\r\n/g, "\n").split("\n");
}

function hasScrapeNoise(value: string): boolean {
  const text = clean(value);
  return /\beasily apply\b/i.test(text)
    || /\bat Unknown\b/i.test(text)
    || /\bUnknown\.\s+Enterprise systems/i.test(text)
    || /\brole at Unknown\b/i.test(text);
}

export function buildFallbackCoverLetter(input: CoverLetterInput): string {
  const role = clean(input.roleTitle) || "the role";
  const company = clean(input.company) || "your team";
  const description = clean(input.jobDescription).toLowerCase();
  const remoteLine = /\bremote\b/i.test(`${input.location || ""} ${input.jobDescription || ""}`)
    ? "I am comfortable working remotely, coordinating across stakeholders, and keeping delivery details visible."
    : "I am comfortable coordinating across business, technical, vendor, and leadership stakeholders while keeping delivery details visible.";

  const focus = [
    /ai|machine learning|ml\b|document intelligence|automation|decisioning/i.test(description) ? "AI-enabled workflow, automation, and decision-support delivery" : "",
    /mortgage|lending|loan|underwriting|origination|los\b|financial services/i.test(description) ? "regulated lending and mortgage-platform domain awareness" : "",
    /salesforce|crm|service cloud|sales cloud|cpq|appbuilder|agentforce/i.test(description) ? "Salesforce and CRM-adjacent delivery" : "",
    /erp|sap|oracle|business systems/i.test(description) ? "ERP and enterprise systems delivery" : "",
    /wms|warehouse|fulfillment|supply chain/i.test(description) ? "WMS, fulfillment, and operational platform readiness" : "",
    /pos|retail|omnichannel|loyalty/i.test(description) ? "retail systems, POS, and omnichannel transformation" : "",
    /saas|software|cloud|api|technical/i.test(description) ? "software implementation, cloud/API coordination, and release readiness" : ""
  ].filter(Boolean);

  const focusText = focus.length
    ? focus.join(", ")
    : "enterprise systems delivery, stakeholder coordination, implementation readiness, vendor communication, UAT governance, and release-risk control";
  const domainLine = /mortgage|lending|loan|underwriting|origination|los\b|financial services/i.test(description)
    ? "For a lending technology environment, I would be especially useful in translating regulated operational workflows into clear requirements, decision logic, testable acceptance criteria, and feedback loops that help product, engineering, and business experts move with confidence."
    : "";
  const aiLine = /ai|machine learning|ml\b|document intelligence|automation|decisioning/i.test(description)
    ? "I am also comfortable using AI tools in day-to-day delivery work for discovery, documentation, analysis, validation, and measurement while keeping human judgment, business rules, and auditability visible."
    : "";

  return [
    "Fejiro Efiuvwere",
    "Greater Toronto Area, Canada | fejiro.efiuvwere@gmail.com | +1 416 473 2732",
    "",
    new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }),
    "",
    "Hiring Team",
    company,
    "",
    `Re: ${role}`,
    "",
    "Dear Hiring Team,",
    "",
    `I am excited to apply for the ${role} role at ${company}. My background combines ${focusText}.`,
    "",
    "In recent roles, I have helped business and technical teams turn unclear operational needs into structured requirements, acceptance criteria, issue logs, readiness dashboards, training material, and go-live evidence. I have supported enterprise transformation work across government, retail, logistics, WMS, POS, ERP, SAP microservices, Google Cloud integration, CRM-adjacent workflows, and business systems validation.",
    "",
    [domainLine, aiLine].filter(Boolean).join(" "),
    "",
    `I would bring ${company} a calm, execution-focused delivery leader who can bridge business users, technical teams, vendors, and leadership while keeping scope, risks, timelines, and implementation details clear. ${remoteLine}`,
    "",
    `Thank you for considering my application. I would welcome the opportunity to discuss how my enterprise systems and delivery governance experience can support ${company}.`,
    "",
    "Sincerely,",
    "Fejiro Efiuvwere"
  ].join("\n");
}

export async function writeCoverLetterArtifacts(args: {
  outputDir: string;
  resumeDocxPath: string;
  coverText: string;
  fallback: CoverLetterInput;
}): Promise<CoverLetterArtifacts> {
  const outputDir = path.resolve(args.outputDir);
  fs.mkdirSync(outputDir, { recursive: true });
  const base = path.basename(args.resumeDocxPath).replace(/\.docx$/i, " Cover Letter");
  const textPath = path.join(outputDir, `${base}.txt`);
  const docxPath = path.join(outputDir, `${base}.docx`);
  const suppliedCoverText = args.coverText.trim();
  const coverText = clean(suppliedCoverText) && !hasScrapeNoise(suppliedCoverText)
    ? suppliedCoverText
    : buildFallbackCoverLetter(args.fallback);

  fs.writeFileSync(textPath, coverText, "utf8");
  fs.writeFileSync(docxPath, await buildCoverLetterDocx(coverText));

  return { textPath, docxPath };
}

async function buildCoverLetterDocx(text: string): Promise<Buffer> {
  const paragraphs = splitParagraphs(text);
  const body = paragraphs
    .map((line, index) => paragraphXml(line, {
      bold: index === 0 || /^Re:/i.test(line),
      after: line ? 160 : 80
    }))
    .join("");
  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${body}<w:sectPr><w:pgSz w:w="12240" w:h="15840"/><w:pgMar w:top="1080" w:right="1080" w:bottom="1080" w:left="1080" w:header="720" w:footer="720" w:gutter="0"/></w:sectPr></w:body></w:document>`;
  const stylesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:sz w:val="22"/></w:rPr></w:style></w:styles>`;
  const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/></Types>`;
  const rels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`;
  const wordRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`;

  const zip = new JSZip();
  zip.file("[Content_Types].xml", contentTypes);
  zip.folder("_rels")?.file(".rels", rels);
  zip.folder("word")?.file("document.xml", documentXml);
  zip.folder("word")?.file("styles.xml", stylesXml);
  zip.folder("word")?.folder("_rels")?.file("document.xml.rels", wordRels);
  return zip.generateAsync({ type: "nodebuffer" });
}
