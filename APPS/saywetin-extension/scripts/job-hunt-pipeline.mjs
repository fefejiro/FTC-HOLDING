import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const CAREER_DIR = path.join(ROOT, "career");
const PROFILE_PATH = path.join(CAREER_DIR, "profile.json");
const TARGETS_PATH = path.join(CAREER_DIR, "targets.json");
const INPUT_DIR = path.join(CAREER_DIR, "inputs");
const OUTPUT_DIR = path.join(CAREER_DIR, "outputs");

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function readText(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

function normalize(text) {
  return text.toLowerCase();
}

function countKeywordMatches(text, keywords) {
  const haystack = normalize(text);
  const matches = [];

  for (const keyword of keywords) {
    const needle = normalize(keyword);
    const found = haystack.includes(needle);
    matches.push({ keyword, found });
  }

  return matches;
}

function extractRoleFamilyScores(jdText, roleFamilies) {
  const haystack = normalize(jdText);
  const entries = Object.entries(roleFamilies).map(([familyName, cfg]) => {
    const hits = cfg.mustHaveKeywords.filter((k) =>
      haystack.includes(normalize(k)),
    );
    const score = cfg.mustHaveKeywords.length
      ? Math.round((hits.length / cfg.mustHaveKeywords.length) * 100)
      : 0;

    return {
      familyName,
      score,
      hits,
      total: cfg.mustHaveKeywords.length,
      suggestedTitles: cfg.titles,
    };
  });

  return entries.sort((a, b) => b.score - a.score);
}

function pickTopKeywords(matches, limit = 14) {
  return matches
    .filter((m) => m.found)
    .slice(0, limit)
    .map((m) => m.keyword);
}

function getFirstMatchingTitle(jdText, roleFamilyScores) {
  const firstLine = jdText
    .split("\n")
    .find((line) => line.toLowerCase().includes("title:"));
  if (firstLine) {
    return firstLine.replace(/title:/i, "").trim();
  }

  const top = roleFamilyScores[0];
  if (top && top.suggestedTitles.length > 0) {
    return top.suggestedTitles[0];
  }

  return "Systems Analyst";
}

function buildSummaryBullets(title, matchedKeywords, highlights) {
  const selected = matchedKeywords.slice(0, 8);
  const primary =
    selected.length > 0
      ? selected.join(", ")
      : "systems delivery, integration, and testing";

  return [
    `I am targeting ${title} roles and I bring hands-on experience in ${primary}.`,
    `I work across requirements, delivery coordination, testing, and stakeholder communication to keep execution stable from planning to go-live.`,
    `My recent work spans Ontario public sector delivery and enterprise retail and supply chain systems, with clear ownership of risks, dependencies, and outcomes.`,
    highlights[0]
      ? `Recent example: ${highlights[0]}.`
      : "Recent example: delivered cross-team implementation support in enterprise environments.",
  ];
}

function buildSkillsBullets(matchedKeywords) {
  const chunks = [];
  const words = [...matchedKeywords];

  while (words.length > 0) {
    chunks.push(words.splice(0, 6));
  }

  if (chunks.length === 0) {
    return [
      "Systems analysis, Agile delivery, requirements management, integration testing, stakeholder communication",
    ];
  }

  return chunks.map((chunk) => chunk.join(", "));
}

function buildExperienceBullets(jdText, highlights) {
  const lower = normalize(jdText);
  const bullets = [];

  if (lower.includes("azure devops")) {
    bullets.push(
      "Managed backlog, sprint flow, and progress reporting in Azure DevOps to keep delivery transparent for business and technical stakeholders.",
    );
  }

  if (lower.includes("scrum") || lower.includes("agile")) {
    bullets.push(
      "Facilitated Agile ceremonies, removed blockers, and coordinated cross-functional teams to maintain sprint goals and release timelines.",
    );
  }

  if (lower.includes("wms") || lower.includes("warehouse")) {
    bullets.push(
      "Supported WMS and warehouse operations initiatives across requirements, testing, and go-live readiness in retail and logistics settings.",
    );
  }

  if (
    lower.includes("erp") ||
    lower.includes("edi") ||
    lower.includes("integration")
  ) {
    bullets.push(
      "Coordinated ERP and downstream integration activities, including requirement definition, validation, and issue triage with vendors and internal teams.",
    );
  }

  if (lower.includes("risk") || lower.includes("dependency")) {
    bullets.push(
      "Tracked dependencies and escalated risks early, with concise status updates that improved decision speed and reduced delivery delays.",
    );
  }

  for (const item of highlights) {
    if (bullets.length >= 8) {
      break;
    }
    bullets.push(`Experience alignment: ${item}.`);
  }

  return Array.from(new Set(bullets)).slice(0, 8);
}

function buildOutreachMessage(title, companyName = "Hiring Team") {
  return [
    `Hello ${companyName},`,
    "",
    `I am interested in the ${title} role. My background covers enterprise systems delivery across retail, supply chain, and Ontario public sector initiatives, with practical ownership of requirements, testing, stakeholder coordination, and implementation execution.`,
    "",
    "I can move quickly and contribute from day one on delivery tracking, risk management, and cross-team communication. I am open to remote and contract engagements and can support hybrid work in Ontario when required.",
    "",
    "Regards,",
    "Fejiro Efiuvwere",
    "416 473 2732",
    "https://unalabs.cloud/",
  ].join("\n");
}

function renderMarkdownReport(data) {
  const {
    nowIso,
    title,
    topRoleFamily,
    roleFamilyScores,
    topKeywords,
    summaryBullets,
    skillsBullets,
    experienceBullets,
    searchQueries,
    outreachMessage,
  } = data;

  const roleRows = roleFamilyScores
    .map(
      (r) =>
        `| ${r.familyName} | ${r.score}% | ${r.hits.length}/${r.total} | ${r.hits.join(", ") || "None"} |`,
    )
    .join("\n");

  const searchSection = Object.entries(searchQueries)
    .map(([family, queries]) => {
      const lines = queries.map((q) => `- ${q}`).join("\n");
      return `### ${family}\n${lines}`;
    })
    .join("\n\n");

  return `# Job Targeting Pack\n\nGenerated: ${nowIso}\n\n## Target Title\n${title}\n\n## Best Role Family\n${topRoleFamily}\n\n## Role Family Match\n| Role Family | Match Score | Hits | Matched Keywords |\n|---|---:|---:|---|\n${roleRows}\n\n## JD Keyword Matches\n${topKeywords.length ? topKeywords.map((k) => `- ${k}`).join("\n") : "- No direct keyword hits found. Add more JD text."}\n\n## Tailored Summary Bullets\n${summaryBullets.map((b) => `- ${b}`).join("\n")}\n\n## Tailored Skills Bullets\n${skillsBullets.map((b) => `- ${b}`).join("\n")}\n\n## Tailored Experience Bullets\n${experienceBullets.map((b) => `- ${b}`).join("\n")}\n\n## Search Queries\n${searchSection}\n\n## Outreach Draft\n\n\`\`\`text\n${outreachMessage}\n\`\`\`\n`;
}

function main() {
  const inputArg = process.argv[2];
  if (!inputArg) {
    console.error(
      "Usage: node scripts/job-hunt-pipeline.mjs <jd-file-path> [company-name]",
    );
    process.exit(1);
  }

  const jdPath = path.isAbsolute(inputArg)
    ? inputArg
    : path.join(ROOT, inputArg);
  if (!fs.existsSync(jdPath)) {
    console.error(`Input JD file not found: ${jdPath}`);
    process.exit(1);
  }

  const companyName = process.argv[3];
  const profile = readJson(PROFILE_PATH);
  const targets = readJson(TARGETS_PATH);
  const jdText = readText(jdPath);

  const keywordMatches = countKeywordMatches(jdText, profile.coreKeywords);
  const roleFamilyScores = extractRoleFamilyScores(
    jdText,
    profile.roleFamilies,
  );
  const topRoleFamily =
    roleFamilyScores[0]?.familyName || "agile_project_delivery";
  const topKeywords = pickTopKeywords(keywordMatches, 18);
  const title = getFirstMatchingTitle(jdText, roleFamilyScores);

  const summaryBullets = buildSummaryBullets(
    title,
    topKeywords,
    profile.experienceHighlights,
  );
  const skillsBullets = buildSkillsBullets(topKeywords);
  const experienceBullets = buildExperienceBullets(
    jdText,
    profile.experienceHighlights,
  );
  const outreachMessage = buildOutreachMessage(
    title,
    companyName || "Hiring Team",
  );

  if (!fs.existsSync(INPUT_DIR)) {
    fs.mkdirSync(INPUT_DIR, { recursive: true });
  }
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const outputPath = path.join(OUTPUT_DIR, `job-pack-${stamp}.md`);

  const report = renderMarkdownReport({
    nowIso: new Date().toISOString(),
    title,
    topRoleFamily,
    roleFamilyScores,
    topKeywords,
    summaryBullets,
    skillsBullets,
    experienceBullets,
    searchQueries: targets.searchQueries,
    outreachMessage,
  });

  fs.writeFileSync(outputPath, report, "utf8");

  console.log("Job targeting pack created:");
  console.log(outputPath);
  console.log("");
  console.log(`Best role family: ${topRoleFamily}`);
  console.log(`Target title: ${title}`);
  console.log(`Matched keywords: ${topKeywords.length}`);
}

main();
