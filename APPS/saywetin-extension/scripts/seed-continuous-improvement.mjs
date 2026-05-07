// scripts/seed-continuous-improvement.mjs
// Reads INBOX.md and creates GitHub issues for each new agent-ready or CI task
// Usage: node scripts/seed-continuous-improvement.mjs

import fs from "fs";
import path from "path";
import { Octokit } from "octokit";

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const REPO = process.env.GITHUB_REPOSITORY || "FTC-HOLDING/saywetin-extension";
const INBOX_PATH = path.resolve("INBOX.md");

if (!GITHUB_TOKEN) {
  console.error("Missing GITHUB_TOKEN in environment.");
  process.exit(1);
}

const octokit = new Octokit({ auth: GITHUB_TOKEN });

async function main() {
  const inbox = fs.readFileSync(INBOX_PATH, "utf-8");
  const lines = inbox.split("\n");
  const queueStart = lines.findIndex((l) =>
    l.includes("<!-- Add new items below this line -->"),
  );
  if (queueStart === -1) throw new Error("INBOX.md missing queue marker.");
  const tasks = lines
    .slice(queueStart + 1)
    .filter((l) => l.trim() && !l.startsWith("<!--"));

  for (const task of tasks) {
    // Parse format: [Agent-Ready] <summary> — <details>
    const match = task.match(
      /^\[(Agent-Ready|CI|Continuous Improvement)\]\s*(.*?)\s*—\s*(.*)$/i,
    );
    if (!match) continue;
    const [_, type, summary, details] = match;
    const title =
      type === "Agent-Ready" ? `[Agent-Ready] ${summary}` : `[CI] ${summary}`;
    const body = details || "";
    const labels =
      type === "Agent-Ready"
        ? ["agent-ready", "good first issue"]
        : ["continuous-improvement", "backlog"];

    // Check if issue already exists (by title)
    const { data: issues } = await octokit.rest.issues.listForRepo({
      owner: REPO.split("/")[0],
      repo: REPO.split("/")[1],
      state: "open",
      per_page: 100,
    });
    if (issues.some((i) => i.title === title)) continue;

    await octokit.rest.issues.create({
      owner: REPO.split("/")[0],
      repo: REPO.split("/")[1],
      title,
      body,
      labels,
    });
    console.log(`Created issue: ${title}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
