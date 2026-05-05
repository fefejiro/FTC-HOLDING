import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();

function runNodeScript(scriptRelPath, args = [], allowFail = false) {
  const scriptPath = path.join(ROOT, scriptRelPath);
  const proc = spawnSync(process.execPath, [scriptPath, ...args], {
    stdio: 'inherit',
    cwd: ROOT,
  });

  if (proc.status !== 0 && !allowFail) {
    process.exit(proc.status ?? 1);
  }

  return proc.status ?? 1;
}

function parseArg(flag, fallback = '') {
  const i = process.argv.indexOf(flag);
  if (i >= 0 && i + 1 < process.argv.length) {
    return process.argv[i + 1];
  }
  return fallback;
}

function hasFlag(flag) {
  return process.argv.includes(flag);
}

function main() {
  const urlsFile = parseArg('--urls', 'career/inputs/job-urls.txt');
  const jobsOut = parseArg('--jobs-out', 'career/inputs/jobs.live.json');
  const fallbackJobs = parseArg('--fallback', 'career/inputs/jobs.sample.json');
  const openCount = parseArg('--open', '5');
  const runDiscover = hasFlag('--discover');

  const urlsPath = path.join(ROOT, urlsFile);
  const fallbackPath = path.join(ROOT, fallbackJobs);
  const ingestExists = fs.existsSync(urlsPath);

  let jobsInput = fallbackJobs;

  // Step 0: auto-discover jobs from free APIs (--discover flag)
  if (runDiscover) {
    console.log('\n[daily] Running job discovery from public APIs...');
    const discoverStatus = runNodeScript('scripts/career-discover.mjs', [jobsOut], true);
    if (discoverStatus === 0 && fs.existsSync(path.join(ROOT, jobsOut))) {
      console.log('[daily] Discovery complete. Using discovered jobs.');
      jobsInput = jobsOut;
    } else {
      console.warn('[daily] Discovery failed or returned 0 jobs — falling back to URL ingest or sample data.');
    }
  }

  // Step 1: URL ingest (only when discovery didn't already populate jobs.live.json)
  if (!runDiscover || jobsInput === fallbackJobs) {
    if (ingestExists) {
      const status = runNodeScript('scripts/career-ingest-urls.mjs', [urlsFile, jobsOut], true);
      if (status === 0) {
        jobsInput = jobsOut;
      } else if (fs.existsSync(path.join(ROOT, jobsOut))) {
        jobsInput = jobsOut;
      } else {
        jobsInput = fallbackJobs;
      }
    } else if (jobsInput === fallbackJobs) {
      // no discover, no urls file — stick with fallback
    }
  }

  if (!fs.existsSync(path.join(ROOT, jobsInput)) && fs.existsSync(fallbackPath)) {
    jobsInput = fallbackJobs;
  }

  if (!fs.existsSync(path.join(ROOT, jobsInput))) {
    console.error('No jobs input available. Provide --urls file or a valid fallback jobs JSON file.');
    process.exit(1);
  }

  runNodeScript('scripts/career-batch-pack.mjs', [jobsInput]);
  runNodeScript('scripts/career-form-packets.mjs', []);

  if (!hasFlag('--no-open')) {
    runNodeScript('scripts/career-open-links.mjs', [openCount], true);
  }

  console.log('Daily career run completed.');
  console.log(`Jobs input used: ${jobsInput}`);
}

main();
