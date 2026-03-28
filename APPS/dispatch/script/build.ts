import { build as esbuild } from 'esbuild';
import { build as viteBuild } from 'vite';
import { rm, readFile, mkdir, writeFile } from 'fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';

// Server deps to bundle — reduces cold start syscalls
const allowlist = [
  'bcryptjs',
  'cors',
  'drizzle-orm',
  'express',
  'pg',
  'web-push',
  'zod',
];

async function buildAll() {
  await rm('dist', { recursive: true, force: true });
  const pkg = JSON.parse(await readFile('package.json', 'utf-8')) as {
    name?: string;
    version?: string;
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
  };

  console.log('building client...');
  await viteBuild();

  const deployedAt = new Date();
  const timestampId = `ts-${deployedAt.getTime()}`;
  const gitSha =
    process.env.RAILWAY_GIT_COMMIT_SHA ||
    process.env.GITHUB_SHA ||
    '';
  const buildId =
    process.env.RAILWAY_DEPLOYMENT_ID ||
    gitSha ||
    timestampId;

  const buildMetaPath = path.join('dist', 'public', '_dispatch', 'build-meta.json');
  await mkdir(path.dirname(buildMetaPath), { recursive: true });
  await writeFile(
    buildMetaPath,
    JSON.stringify(
      {
        appName: pkg.name || 'dispatch',
        version: pkg.version || '1.0.0',
        buildId,
        deployedAt: deployedAt.toISOString(),
        gitSha: gitSha || undefined,
      },
      null,
      2,
    ) + '\n',
    'utf8',
  );
  console.log(`[build-meta] buildId=${buildId}`);

  console.log('building server...');
  const allDeps = [
    ...Object.keys(pkg.dependencies || {}),
    ...Object.keys(pkg.devDependencies || {}),
  ];
  const externals = allDeps.filter((dep) => !allowlist.includes(dep));

  await esbuild({
    entryPoints: ['server/index.ts'],
    platform: 'node',
    bundle: true,
    format: 'cjs',
    outfile: 'dist/index.cjs',
    define: {
      'process.env.NODE_ENV': '"production"',
    },
    minify: true,
    external: externals,
    logLevel: 'info',
  });

  const check = spawnSync(process.execPath, ['--check', 'dist/index.cjs'], {
    stdio: 'inherit',
  });
  if (check.status !== 0) {
    throw new Error('Generated dist/index.cjs failed node --check');
  }

  console.log('build complete.');
}

buildAll().catch((err) => {
  console.error(err);
  process.exit(1);
});
