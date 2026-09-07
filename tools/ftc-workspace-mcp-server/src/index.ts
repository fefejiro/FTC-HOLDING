import { execFile } from "node:child_process";
import { realpath, statfs } from "node:fs/promises";
import path from "node:path";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const DEFAULT_REPO = process.env.FTC_REPO_ROOT ?? "C:\\FTC HOLDING";
const APPROVED_ROOTS = [
  "C:\\FTC HOLDING",
  "D:\\FTC-HOLDING-worktrees",
  "D:\\PeacePadRelease",
  "D:\\PeacePadEasBuild",
  "D:\\FTC-GAMES",
];

type GitResult = { stdout: string; stderr: string };

function runGit(args: string[], cwd: string): Promise<GitResult> {
  return new Promise((resolve, reject) => {
    execFile(
      "git",
      args,
      { cwd, windowsHide: true, maxBuffer: 8 * 1024 * 1024 },
      (error, stdout, stderr) => {
        if (error) {
          reject(new Error(`git ${args.join(" ")} failed: ${String(stderr).trim() || error.message}`));
          return;
        }
        resolve({ stdout: String(stdout).trim(), stderr: String(stderr).trim() });
      },
    );
  });
}

function normalizeWindows(candidate: string): string {
  return path.win32.resolve(candidate).replace(/[\\/]+$/, "").toLowerCase();
}

function assertApprovedPath(candidate: string): string {
  const resolved = path.win32.resolve(candidate);
  const normalized = normalizeWindows(resolved);
  const approved = APPROVED_ROOTS.some((root) => {
    const allowed = normalizeWindows(root);
    return normalized === allowed || normalized.startsWith(`${allowed}\\`);
  });
  if (!approved) {
    throw new Error(`Path is outside approved FTC roots: ${resolved}`);
  }
  return resolved;
}

async function diskInfo(letter: "C" | "D") {
  const stats = await statfs(`${letter}:\\`);
  return {
    drive: letter,
    freeGB: Number((Number(stats.bavail * stats.bsize) / 1024 ** 3).toFixed(2)),
    totalGB: Number((Number(stats.blocks * stats.bsize) / 1024 ** 3).toFixed(2)),
  };
}

async function workspaceContext(requestedPath = DEFAULT_REPO) {
  const safePath = assertApprovedPath(requestedPath);
  const root = (await runGit(["rev-parse", "--show-toplevel"], safePath)).stdout;
  const branch = (await runGit(["branch", "--show-current"], root)).stdout || "(detached)";
  const head = (await runGit(["rev-parse", "--short", "HEAD"], root)).stdout;
  const dirtyOutput = (await runGit(["status", "--porcelain=v1"], root)).stdout;
  let upstream = "(none)";
  try {
    upstream = (await runGit(["rev-parse", "--abbrev-ref", "@{upstream}"], root)).stdout;
  } catch {
    // A local-only branch legitimately has no upstream.
  }

  let nodeModules = { path: path.win32.join(root, "node_modules"), state: "missing", target: "" };
  try {
    const target = await realpath(nodeModules.path);
    nodeModules = {
      ...nodeModules,
      state: normalizeWindows(target) === normalizeWindows(nodeModules.path) ? "local directory" : "redirected/junction",
      target,
    };
  } catch {
    // Missing dependency directory is reported as state=missing.
  }

  return {
    requestedPath: safePath,
    gitRoot: root,
    canonicalRepo: normalizeWindows(root) === normalizeWindows("C:\\FTC HOLDING"),
    branch,
    upstream,
    head,
    dirtyEntries: dirtyOutput ? dirtyOutput.split(/\r?\n/).length : 0,
    rootNodeModules: nodeModules,
    disks: await Promise.all([diskInfo("C"), diskInfo("D")]),
  };
}

function parseWorktrees(raw: string) {
  const records: Array<{ path: string; head: string; branch: string; bare: boolean; detached: boolean }> = [];
  let current: Partial<(typeof records)[number]> = {};
  const flush = () => {
    if (current.path) {
      records.push({
        path: current.path,
        head: current.head ?? "",
        branch: current.branch ?? "(detached)",
        bare: current.bare ?? false,
        detached: current.detached ?? false,
      });
    }
    current = {};
  };
  for (const line of raw.split(/\r?\n/)) {
    if (!line) { flush(); continue; }
    const [key, ...rest] = line.split(" ");
    const value = rest.join(" ");
    if (key === "worktree") current.path = value;
    if (key === "HEAD") current.head = value.slice(0, 12);
    if (key === "branch") current.branch = value.replace("refs/heads/", "");
    if (key === "bare") current.bare = true;
    if (key === "detached") current.detached = true;
  }
  flush();
  return records;
}

async function listWorktrees(repoPath = DEFAULT_REPO, offset = 0, limit = 50) {
  const safePath = assertApprovedPath(repoPath);
  const root = (await runGit(["rev-parse", "--show-toplevel"], safePath)).stdout;
  const all = parseWorktrees((await runGit(["worktree", "list", "--porcelain"], root)).stdout);
  return { repoRoot: root, total: all.length, offset, limit, worktrees: all.slice(offset, offset + limit) };
}

async function sanitationReport(repoPath = DEFAULT_REPO) {
  const context = await workspaceContext(repoPath);
  const worktrees = await listWorktrees(repoPath, 0, 200);
  const branchesRaw = (await runGit(["for-each-ref", "refs/heads", "--format=%(refname:short)"], context.gitRoot)).stdout;
  const localBranches = branchesRaw ? branchesRaw.split(/\r?\n/).length : 0;
  return {
    name: "Sanitation Day in Lagos",
    generatedAt: new Date().toISOString(),
    repoRoot: context.gitRoot,
    branch: context.branch,
    dirtyEntries: context.dirtyEntries,
    localBranches,
    worktreeCount: worktrees.total,
    disks: context.disks,
    rootNodeModules: context.rootNodeModules,
    readiness: context.dirtyEntries === 0 ? "clean checkout" : "active local work present - preserve before integration or cleanup",
    safetyBoundary: "read-only report; no branch, worktree, file, or remote mutations",
  };
}

const responseFormat = z.enum(["markdown", "json"]).default("markdown");
const server = new McpServer({ name: "ftc-workspace", version: "0.1.0" });
const annotations = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false };

function toolResult(data: unknown, format: "markdown" | "json", title: string) {
  const json = JSON.stringify(data, null, 2);
  const text = format === "json" ? json : `# ${title}\n\n\`\`\`json\n${json}\n\`\`\``;
  return { content: [{ type: "text" as const, text }], structuredContent: { result: data } };
}

server.registerTool(
  "ftc_get_workspace_context",
  {
    title: "Get FTC workspace context",
    description: "Resolve an approved FTC path to its Git root and report branch, upstream, dirty state, disk space, and root dependency redirection.",
    inputSchema: { path: z.string().optional(), response_format: responseFormat },
    annotations,
  },
  async ({ path: requestedPath, response_format }) => toolResult(await workspaceContext(requestedPath), response_format, "FTC workspace context"),
);

server.registerTool(
  "ftc_list_worktrees",
  {
    title: "List FTC worktrees",
    description: "List registered worktrees for an approved FTC repository with pagination. This does not remove or modify worktrees.",
    inputSchema: {
      path: z.string().optional(),
      offset: z.number().int().min(0).default(0),
      limit: z.number().int().min(1).max(200).default(50),
      response_format: responseFormat,
    },
    annotations,
  },
  async ({ path: requestedPath, offset, limit, response_format }) => toolResult(await listWorktrees(requestedPath, offset, limit), response_format, "FTC worktrees"),
);

server.registerTool(
  "ftc_get_sanitation_report",
  {
    title: "Get Sanitation Day in Lagos report",
    description: "Generate a read-only FTC Git, worktree, disk, and root-cache readiness report.",
    inputSchema: { path: z.string().optional(), response_format: responseFormat },
    annotations,
  },
  async ({ path: requestedPath, response_format }) => toolResult(await sanitationReport(requestedPath), response_format, "Sanitation Day in Lagos"),
);

if (process.argv.includes("--self-test")) {
  sanitationReport().then((report) => {
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  }).catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  });
} else {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}
