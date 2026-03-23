import { build as esbuild } from "esbuild";
import { build as viteBuild } from "vite";
import { rm, readFile, mkdir, writeFile } from "fs/promises";
import { spawnSync } from "node:child_process";
import path from "node:path";

// server deps to bundle to reduce openat(2) syscalls
// which helps cold start times
const allowlist = [
  "@google/generative-ai",
  "axios",
  "connect-pg-simple",
  "cors",
  "date-fns",
  "drizzle-orm",
  "drizzle-zod",
  "express",
  "express-rate-limit",
  "express-session",
  "jsonwebtoken",
  "memorystore",
  "multer",
  "nanoid",
  "nodemailer",
  "openai",
  "passport",
  "passport-local",
  "pg",
  "stripe",
  "uuid",
  "ws",
  "xlsx",
  "zod",
  "zod-validation-error",
];

async function buildAll() {
  await rm("dist", { recursive: true, force: true });
  const pkg = JSON.parse(await readFile("package.json", "utf-8"));

  console.log("building client...");
  await viteBuild();

  const deployedAt = new Date();
  const timestampId = `ts-${deployedAt.getTime()}`;
  const gitSha =
    process.env.CF_PAGES_COMMIT_SHA ||
    process.env.RAILWAY_GIT_COMMIT_SHA ||
    process.env.GITHUB_SHA ||
    "";
  const webBuildId =
    process.env.WEB_BUILD_ID ||
    process.env.CF_PAGES_DEPLOYMENT_ID ||
    process.env.RAILWAY_DEPLOYMENT_ID ||
    gitSha ||
    timestampId;
  const buildMetaPath = path.join("dist", "public", "_saywetin", "build-meta.json");

  await mkdir(path.dirname(buildMetaPath), { recursive: true });
  await writeFile(
    buildMetaPath,
    `${JSON.stringify(
      {
        appName: pkg.name || "saywetin-web",
        version: pkg.version || "0.0.0",
        webBuildId,
        deployedAt: deployedAt.toISOString(),
        gitSha: gitSha || undefined,
      },
      null,
      2,
    )}\n`,
    "utf8",
  );
  console.log(`[build-meta] Wrote ${buildMetaPath}`);
  console.log(`[build-meta] webBuildId=${webBuildId}`);

  console.log("building server...");
  const allDeps = [
    ...Object.keys(pkg.dependencies || {}),
    ...Object.keys(pkg.devDependencies || {}),
  ];
  const externals = allDeps.filter((dep) => !allowlist.includes(dep));

  await esbuild({
    entryPoints: ["server/index.ts"],
    platform: "node",
    bundle: true,
    format: "cjs",
    outfile: "dist/index.cjs",
    define: {
      "process.env.NODE_ENV": '"production"',
    },
    minify: true,
    external: externals,
    logLevel: "info",
  });

  // Fail fast if the generated server bundle is syntactically invalid.
  const check = spawnSync(process.execPath, ["--check", "dist/index.cjs"], {
    stdio: "inherit",
  });
  if (check.status !== 0) {
    throw new Error("Generated dist/index.cjs failed node --check");
  }
}

buildAll().catch((err) => {
  console.error(err);
  process.exit(1);
});
