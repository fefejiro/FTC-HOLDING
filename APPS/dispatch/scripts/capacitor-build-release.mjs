import { promises as fs } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawn } from 'node:child_process';

const rootDir = process.cwd();
const androidDir = path.join(rootDir, 'android');
const localPropertiesPath = path.join(androidDir, 'local.properties');
const aabPath = path.join(androidDir, 'app', 'build', 'outputs', 'bundle', 'release', 'app-release.aab');

function detectAndroidSdkPath() {
  if (process.env.ANDROID_HOME) return process.env.ANDROID_HOME;
  if (process.env.ANDROID_SDK_ROOT) return process.env.ANDROID_SDK_ROOT;

  const homeDir = os.homedir();
  const winDefault = path.join(homeDir, 'AppData', 'Local', 'Android', 'Sdk');
  const macDefault = path.join(homeDir, 'Library', 'Android', 'sdk');
  const linuxDefault = path.join(homeDir, 'Android', 'Sdk');

  if (process.platform === 'win32') return winDefault;
  if (process.platform === 'darwin') return macDefault;
  return linuxDefault;
}

async function exists(targetPath) {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

function runCommand(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const isWindowsScript = process.platform === 'win32' && /\.(cmd|bat)$/i.test(command);
    const spawnCommand = isWindowsScript ? 'cmd' : command;
    const spawnArgs = isWindowsScript ? ['/c', command, ...args] : args;

    const child = spawn(spawnCommand, spawnArgs, {
      stdio: 'inherit',
      shell: false,
      ...options,
    });

    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`Command failed (${code}): ${spawnCommand} ${spawnArgs.join(' ')}`));
    });
  });
}

async function ensureLocalProperties() {
  const sdkPath = detectAndroidSdkPath();
  if (!(await exists(sdkPath))) {
    console.warn(
      `[cap-release] Android SDK path was not found at "${sdkPath}". ` +
      'If Gradle fails, set ANDROID_HOME or create android/local.properties manually.'
    );
    return;
  }

  const sdkDirEscaped = sdkPath.replace(/\\/g, '\\\\');
  const content = `sdk.dir=${sdkDirEscaped}\n`;
  await fs.writeFile(localPropertiesPath, content, 'utf8');
  console.log(`[cap-release] Wrote ${localPropertiesPath}`);
}

async function runGradleBundle() {
  if (process.platform === 'win32') {
    await runCommand('cmd', ['/c', 'gradlew.bat', 'bundleRelease'], { cwd: androidDir });
    return;
  }

  await runCommand('./gradlew', ['bundleRelease'], { cwd: androidDir });
}

async function main() {
  if (!(await exists(androidDir))) {
    throw new Error('Android platform directory not found. Run: npx cap add android');
  }

  await ensureLocalProperties();

  console.log('[cap-release] Building web assets...');
  await runCommand(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['run', 'build'], { cwd: rootDir });

  const capacitorEnv = process.env.CAPACITOR_ENV || 'production';
  console.log(`[cap-release] Syncing Capacitor Android (CAPACITOR_ENV=${capacitorEnv})...`);
  await runCommand(
    process.platform === 'win32' ? 'npx.cmd' : 'npx',
    ['cap', 'sync', 'android'],
    { cwd: rootDir, env: { ...process.env, CAPACITOR_ENV: capacitorEnv } },
  );

  console.log('[cap-release] Building signed release AAB...');
  await runGradleBundle();

  if (!(await exists(aabPath))) {
    throw new Error(`AAB was not found after build at: ${aabPath}`);
  }

  const stat = await fs.stat(aabPath);
  const sizeMb = (stat.size / (1024 * 1024)).toFixed(2);
  console.log(`[cap-release] AAB ready: ${aabPath} (${sizeMb} MB)`);
}

main().catch((error) => {
  console.error(`[cap-release] ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
