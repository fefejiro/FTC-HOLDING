import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const CAREER_DIR = path.join(ROOT, "career");
const PROFILE_PATH = path.join(CAREER_DIR, "profile.json");
const TARGETS_PATH = path.join(CAREER_DIR, "targets.json");
const ANSWERS_PATH = path.join(CAREER_DIR, "candidate-answers.json");
const OUTPUT_DIR = path.join(CAREER_DIR, "outputs");

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, ""));
}

function normalize(text) {
  return String(text || "").toLowerCase();
}

function hasAny(text, terms) {
  const hay = normalize(text);
  return terms.some((t) => hay.includes(normalize(t)));
}

const AUTOMATED_REPLY_SENDERS = [
  "no-reply",
  "noreply",
  "do-not-reply",
  "donotreply",
  "notification",
  "notifications",
  "job alert",
  "jobs alert",
];

const JOB_ALERT_SENDERS = [
  "indeed.com",
  "indeed.ca",
  "linkedin.com",
  "ziprecruiter.com",
  "glassdoor.com",
  "monster.com",
  "careerbuilder.com",
  "workopolis.com",
  "email.roberthalf.com",
  "roberthalf.com",
];

const JOB_ALERT_SUBJECTS = [
  "opportunity is knocking",
  "you matched with a job",
  "matched with a job",
  "job alert",
  "new jobs for you",
  "recommended jobs",
  "job recommendations",
  "jobs you may be interested in",
  "you have new job matches",
  "your job match",
  "apply now",
  "1-click-apply",
  "one-click apply",
  "easy apply",
];

const JOB_ALERT_BODY_SIGNALS = [
  "view details",
  "1-click-apply",
  "one-click apply",
  "easy apply",
  "apply now",
  "get your resume in front of the hiring manager",
  "you've matched with",
  "you matched with",
  "recommended jobs",
  "let our app do the work",
  "download our app",
  "unsubscribe",
  "terms of use",
  "privacy policy",
];

const RECRUITER_REPLY_SIGNALS = [
  "following up",
  "i found your profile",
  "your resume",
  "your background",
  "would you be interested",
  "are you available",
  "can we schedule",
  "let's connect",
  "please send",
  "rate expectation",
  "contract opportunity",
  "client is looking",
];

function classifyReplySuppression(job) {
  const sender = [
    job.from,
    job.fromName,
    job.fromEmail,
    job.sender,
    job.senderEmail,
    job.replyTo,
    job.source,
  ].join(" ");
  const subject = job.subject || "";
  const body = [
    job.subject,
    job.snippet,
    job.body,
    job.description,
    job.title,
    job.company,
    job.source,
    job.link,
  ].join(" ");
  const reasons = [];

  const automatedSender = hasAny(sender, AUTOMATED_REPLY_SENDERS);
  const jobAlertSender = hasAny(sender, JOB_ALERT_SENDERS);
  const alertSubject = hasAny(subject, JOB_ALERT_SUBJECTS);
  const alertBody = hasAny(body, JOB_ALERT_BODY_SIGNALS);
  const recruiterSignal = hasAny(body, RECRUITER_REPLY_SIGNALS);

  if (automatedSender) reasons.push("automated/no-reply sender");
  if (jobAlertSender) reasons.push("job-board or job-alert sender");
  if (alertSubject) reasons.push("job-alert subject");
  if (alertBody) reasons.push("automated job-alert body");

  const suppressed =
    automatedSender ||
    (jobAlertSender && (alertSubject || alertBody)) ||
    (alertSubject && alertBody && !recruiterSignal);

  return {
    suppressed,
    category: suppressed ? "apply_only_no_reply" : "reply_ok",
    reasons: suppressed ? reasons : [],
  };
}

function keywordMatches(text, keywords) {
  const hay = normalize(text);
  return keywords.filter((k) => hay.includes(normalize(k)));
}

function scoreJob(job, profile) {
  const blob = [
    job.title,
    job.description,
    job.location,
    job.employmentType,
    job.salary,
  ].join(" ");
  const matches = keywordMatches(blob, profile.coreKeywords);

  let score = Math.min(matches.length * 5, 50);

  const loc = normalize(job.location);
  const type = normalize(job.employmentType);
  const salary = normalize(job.salary);

  if (loc.includes("remote")) score += 25;
  if (type.includes("contract")) score += 15;
  if (
    salary.includes("$75") ||
    salary.includes("75") ||
    salary.includes("$80") ||
    salary.includes("80")
  )
    score += 10;

  if (score > 100) score = 100;

  return { score, matches };
}

function roleFamilyFit(job, roleFamilies) {
  const hay = normalize([job.title, job.description].join(" "));
  const entries = Object.entries(roleFamilies).map(([name, cfg]) => {
    const hits = cfg.mustHaveKeywords.filter((k) => hay.includes(normalize(k)));
    const score = cfg.mustHaveKeywords.length
      ? Math.round((hits.length / cfg.mustHaveKeywords.length) * 100)
      : 0;
    return { name, score, hits };
  });
  entries.sort((a, b) => b.score - a.score);
  return entries;
}

function buildOutreach(job, answers, matchedKeywords) {
  const top = matchedKeywords.slice(0, 6).join(", ");
  return [
    `Hello ${job.company || "Hiring Team"},`,
    "",
    `I am interested in the ${job.title} role. My background aligns well with this scope, especially in ${top || "enterprise systems delivery, coordination, and implementation support"}.`,
    "",
    "I have delivered across Ontario public sector, retail, and supply chain technology environments, including requirements, testing, cross-team coordination, and go-live support.",
    "",
    `Availability to interview: ${answers.availabilityToInterview}.`,
    `Availability to start: ${answers.availabilityToStart}.`,
    `Rate expectation: ${answers.rateExpectation}.`,
    "",
    "Regards,",
    answers.contact.name,
    answers.contact.phone,
    answers.contact.email,
    answers.contact.website,
  ].join("\n");
}

function buildResumeBullets(job, matchedKeywords, highlights) {
  const top = matchedKeywords.slice(0, 10);
  const summary = [
    `I am targeting ${job.title} opportunities and bring direct experience in ${top.join(", ") || "systems delivery and implementation support"}.`,
    "I coordinate requirements, testing, risk management, and stakeholder communication to keep delivery outcomes stable and measurable.",
    "My background combines Ontario public sector execution with enterprise retail and supply chain systems delivery in fast-paced environments.",
  ];

  const skills =
    top.length > 0
      ? [top.join(", ")]
      : [
          "Agile delivery, SDLC, requirements management, UAT, integration support, stakeholder communication",
        ];

  const exp = [
    "Facilitated execution across business and technical teams, tracked risks and dependencies, and maintained clear delivery reporting.",
    "Supported implementation lifecycle activities including requirements, documentation, testing coordination, and go-live readiness.",
    ...highlights.slice(0, 4).map((h) => `Experience alignment: ${h}.`),
  ];

  return { summary, skills, exp };
}

function toCsv(rows) {
  const escape = (v) => {
    const s = String(v ?? "");
    if (s.includes(",") || s.includes('"') || s.includes("\n")) {
      return `"${s.replaceAll('"', '""')}"`;
    }
    return s;
  };

  return rows.map((r) => r.map(escape).join(",")).join("\n");
}

function main() {
  const inputArg = process.argv[2];
  if (!inputArg) {
    console.error("Usage: node scripts/career-batch-pack.mjs <jobs-json-path>");
    process.exit(1);
  }

  const inputPath = path.isAbsolute(inputArg)
    ? inputArg
    : path.join(ROOT, inputArg);
  if (!fs.existsSync(inputPath)) {
    console.error(`Jobs input not found: ${inputPath}`);
    process.exit(1);
  }

  const profile = readJson(PROFILE_PATH);
  const targets = readJson(TARGETS_PATH);
  const answers = readJson(ANSWERS_PATH);
  const jobs = readJson(inputPath);

  if (!Array.isArray(jobs) || jobs.length === 0) {
    console.error("Input jobs JSON must be a non-empty array.");
    process.exit(1);
  }

  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const results = jobs
    .map((job) => {
      const { score, matches } = scoreJob(job, profile);
      const family = roleFamilyFit(job, profile.roleFamilies);
      const bestFamily = family[0]?.name || "agile_project_delivery";
      const replySuppression = classifyReplySuppression(job);
      const outreach = replySuppression.suppressed
        ? ""
        : buildOutreach(job, answers, matches);
      const bullets = buildResumeBullets(
        job,
        matches,
        profile.experienceHighlights,
      );

      return {
        ...job,
        score,
        matchedKeywords: matches,
        bestRoleFamily: bestFamily,
        roleFamilyScores: family,
        replySuppression,
        replySuppressed: replySuppression.suppressed,
        replySuppressionReasons: replySuppression.reasons,
        outreach,
        bullets,
      };
    })
    .sort((a, b) => b.score - a.score);

  const stamp = new Date().toISOString().replace(/[:.]/g, "-");

  const shortlistMd = [
    "# Career Shortlist",
    "",
    `Generated: ${new Date().toISOString()}`,
    "",
    "## Ranked Jobs",
    "| Rank | Score | Reply Status | Title | Company | Location | Type | Salary | Link |",
    "|---:|---:|---|---|---|---|---|---|---|",
    ...results.map(
      (r, i) =>
        `| ${i + 1} | ${r.score} | ${r.replySuppressed ? `Apply only: ${r.replySuppressionReasons.join("; ")}` : "Reply OK"} | ${r.title} | ${r.company} | ${r.location || ""} | ${r.employmentType || ""} | ${r.salary || ""} | ${r.link || ""} |`,
    ),
    "",
    "## Quick Search Queries",
    ...Object.entries(targets.searchQueries).flatMap(([family, queries]) => [
      `### ${family}`,
      ...queries.map((q) => `- ${q}`),
      "",
    ]),
  ].join("\n");

  const packsMd = [
    "# Quick Apply Packs",
    "",
    `Generated: ${new Date().toISOString()}`,
    "",
    ...results.map((r, i) =>
      [
        `## ${i + 1}. ${r.title} at ${r.company}`,
        "",
        `- Score: ${r.score}`,
        `- Best Role Family: ${r.bestRoleFamily}`,
        `- Reply Status: ${r.replySuppressed ? `Apply only - ${r.replySuppressionReasons.join("; ")}` : "Reply OK"}`,
        `- Link: ${r.link || ""}`,
        `- Matched Keywords: ${r.matchedKeywords.join(", ") || "None"}`,
        "",
        "### Tailored Summary Bullets",
        ...r.bullets.summary.map((b) => `- ${b}`),
        "",
        "### Tailored Skills Bullets",
        ...r.bullets.skills.map((b) => `- ${b}`),
        "",
        "### Tailored Experience Bullets",
        ...r.bullets.exp.map((b) => `- ${b}`),
        "",
        "### Outreach Draft",
        "```text",
        r.replySuppressed
          ? "Suppressed: automated job alert or no-reply job-board message. Do not reply; apply through the job link only."
          : r.outreach,
        "```",
        "",
      ].join("\n"),
    ),
  ].join("\n");

  const quickApplyRows = [
    [
      "rank",
      "score",
      "title",
      "company",
      "location",
      "employment_type",
      "salary",
      "source",
      "reply_status",
      "reply_suppression_reasons",
      "link",
      "availability_to_start",
      "availability_to_interview",
      "rate_expectation",
      "phone",
      "email",
      "website",
      "best_role_family",
      "matched_keywords",
    ],
    ...results.map((r, i) => [
      i + 1,
      r.score,
      r.title,
      r.company,
      r.location || "",
      r.employmentType || "",
      r.salary || "",
      r.source || "",
      r.replySuppressed ? "apply_only_no_reply" : "reply_ok",
      (r.replySuppressionReasons || []).join("; "),
      r.link || "",
      answers.availabilityToStart,
      answers.availabilityToInterview,
      answers.rateExpectation,
      answers.contact.phone,
      answers.contact.email,
      answers.contact.website,
      r.bestRoleFamily,
      r.matchedKeywords.join("; "),
    ]),
  ];

  const openLinksPs1 = [
    '$ErrorActionPreference = "Stop"',
    "$links = @(",
    ...results
      .slice(0, 8)
      .map((r) => `  "${(r.link || "").replaceAll('"', '""')}"`),
    ")",
    "foreach ($url in $links) {",
    "  if (-not [string]::IsNullOrWhiteSpace($url)) {",
    "    Start-Process $url",
    "  }",
    "}",
    'Write-Host "Opened top job links in your default browser."',
  ].join("\n");

  const shortlistPath = path.join(OUTPUT_DIR, `career-shortlist-${stamp}.md`);
  const packsPath = path.join(OUTPUT_DIR, `quick-apply-packs-${stamp}.md`);
  const csvPath = path.join(OUTPUT_DIR, `quick-apply-${stamp}.csv`);
  const jsonPath = path.join(OUTPUT_DIR, `quick-apply-${stamp}.json`);
  const ps1Path = path.join(OUTPUT_DIR, `open-top-links-${stamp}.ps1`);

  fs.writeFileSync(shortlistPath, shortlistMd, "utf8");
  fs.writeFileSync(packsPath, packsMd, "utf8");
  fs.writeFileSync(csvPath, toCsv(quickApplyRows), "utf8");
  fs.writeFileSync(jsonPath, JSON.stringify(results, null, 2), "utf8");
  fs.writeFileSync(ps1Path, openLinksPs1, "utf8");

  console.log("Career batch outputs created:");
  console.log(shortlistPath);
  console.log(packsPath);
  console.log(csvPath);
  console.log(jsonPath);
  console.log(ps1Path);
  console.log("");
  console.log(
    `Top role: ${results[0].title} at ${results[0].company} (score ${results[0].score})`,
  );
}

main();
