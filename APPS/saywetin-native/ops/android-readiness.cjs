#!/usr/bin/env node

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const root = process.cwd();
const appJsonPath = path.join(root, 'app.json');
const packageJsonPath = path.join(root, 'package.json');

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function run(cmd, args, options = {}) {
  return spawnSync(cmd, args, {
    cwd: root,
    encoding: 'utf8',
    shell: false,
    stdio: options.capture ? 'pipe' : 'pipe',
  });
}

function findPath(candidates) {
  for (const c of candidates) {
    if (c && fs.existsSync(c)) return c;
  }
  return null;
}

function findJavaTool(tool) {
  const javaHome = process.env.JAVA_HOME;
  const localAppData = process.env.LOCALAPPDATA;
  const candidates = [
    javaHome && path.join(javaHome, 'bin', `${tool}.exe`),
    'C:\\Program Files\\Android\\Android Studio\\jbr\\bin\\' + `${tool}.exe`,
    localAppData && path.join(localAppData, 'Programs', 'Android Studio', 'jbr', 'bin', `${tool}.exe`),
  ];

  const found = findPath(candidates);
  if (found) return found;

  const where = run('where', [tool], { capture: true });
  if (where.status === 0) {
    const line = (where.stdout || '').split(/\r?\n/).find(Boolean);
    if (line) return line.trim();
  }

  return null;
}

function findAdb() {
  const local = process.env.LOCALAPPDATA;
  const candidates = [
    process.env.ADB_PATH,
    process.env.ANDROID_SDK_ROOT && path.join(process.env.ANDROID_SDK_ROOT, 'platform-tools', 'adb.exe'),
    process.env.ANDROID_HOME && path.join(process.env.ANDROID_HOME, 'platform-tools', 'adb.exe'),
    local && path.join(local, 'Android', 'Sdk', 'platform-tools', 'adb.exe'),
  ];

  const found = findPath(candidates);
  if (found) return found;

  const where = run('where', ['adb'], { capture: true });
  if (where.status === 0) {
    const line = (where.stdout || '').split(/\r?\n/).find(Boolean);
    if (line) return line.trim();
  }

  return null;
}

function listAdbDevices(adb) {
  if (!adb) return [];
  const res = run(adb, ['devices'], { capture: true });
  if (res.status !== 0) return [];
  return (res.stdout || '')
    .split(/\r?\n/)
    .slice(1)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.split(/\s+/))
    .filter((parts) => parts.length >= 2 && parts[1] === 'device')
    .map((parts) => parts[0]);
}

function javaHttpsProbe() {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sw-java-probe-'));
  const srcPath = path.join(tempDir, 'UrlProbe.java');
  const javacPath = findJavaTool('javac');
  const javaPath = findJavaTool('java');
  const src = [
    'import java.net.*;',
    'public class UrlProbe {',
    '  public static void main(String[] args) throws Exception {',
    '    String url = "https://repo.maven.apache.org/maven2/org/jetbrains/kotlin/kotlin-gradle-plugin/2.1.20/kotlin-gradle-plugin-2.1.20.pom";',
    '    HttpURLConnection c = (HttpURLConnection) new URL(url).openConnection();',
    '    c.setConnectTimeout(15000);',
    '    c.setReadTimeout(15000);',
    '    c.setRequestMethod("HEAD");',
    '    System.out.println(c.getResponseCode());',
    '  }',
    '}',
  ].join('\n');

  fs.writeFileSync(srcPath, src, 'utf8');

  if (!javacPath || !javaPath) {
    return { ok: false, reason: 'java_unavailable', details: 'java/javac not found', javaPath, javacPath };
  }

  const javac = run(javacPath, [srcPath], { capture: true });
  if (javac.status !== 0) {
    return { ok: false, reason: 'javac_unavailable', details: (javac.stderr || javac.stdout || '').trim(), javaPath, javacPath };
  }

  const java = run(javaPath, ['-cp', tempDir, 'UrlProbe'], { capture: true });
  if (java.status !== 0) {
    return { ok: false, reason: 'java_https_failed', details: (java.stderr || java.stdout || '').trim(), javaPath, javacPath };
  }

  const code = (java.stdout || '').trim();
  return { ok: code === '200', reason: code === '200' ? 'ok' : `http_${code}`, details: code, javaPath, javacPath };
}

function main() {
  const app = readJson(appJsonPath);
  const pkg = readJson(packageJsonPath);

  const appVersion = app?.expo?.version;
  const versionCode = app?.expo?.android?.versionCode;
  const packageName = app?.expo?.android?.package;
  const synced = pkg.version === appVersion;

  const sdkRoot = process.env.ANDROID_SDK_ROOT || process.env.ANDROID_HOME || path.join(process.env.LOCALAPPDATA || '', 'Android', 'Sdk');
  const emulator = findPath([
    process.env.ANDROID_SDK_ROOT && path.join(process.env.ANDROID_SDK_ROOT, 'emulator', 'emulator.exe'),
    process.env.ANDROID_HOME && path.join(process.env.ANDROID_HOME, 'emulator', 'emulator.exe'),
    path.join(sdkRoot, 'emulator', 'emulator.exe'),
  ]);
  const sdkmanager = findPath([
    process.env.ANDROID_SDK_ROOT && path.join(process.env.ANDROID_SDK_ROOT, 'cmdline-tools', 'latest', 'bin', 'sdkmanager.bat'),
    process.env.ANDROID_HOME && path.join(process.env.ANDROID_HOME, 'cmdline-tools', 'latest', 'bin', 'sdkmanager.bat'),
    path.join(sdkRoot, 'cmdline-tools', 'latest', 'bin', 'sdkmanager.bat'),
  ]);

  const adb = findAdb();
  const devices = listAdbDevices(adb);
  const javaProbe = javaHttpsProbe();

  console.log('Android Readiness Report');
  console.log(`- app version: ${appVersion}`);
  console.log(`- android versionCode: ${versionCode}`);
  console.log(`- package name: ${packageName}`);
  console.log(`- package/app sync: ${synced ? 'ok' : 'mismatch'}`);
  console.log(`- adb: ${adb ? adb : 'missing'}`);
  console.log(`- connected devices: ${devices.length > 0 ? devices.join(', ') : 'none'}`);
  console.log(`- emulator binary: ${emulator ? emulator : 'missing'}`);
  console.log(`- sdkmanager: ${sdkmanager ? sdkmanager : 'missing'}`);
  console.log(`- java runtime: ${javaProbe.javaPath ? javaProbe.javaPath : 'missing'}`);
  console.log(`- javac runtime: ${javaProbe.javacPath ? javaProbe.javacPath : 'missing'}`);
  console.log(`- direct java https probe: ${javaProbe.ok ? 'ok' : 'failed'}`);

  if (!javaProbe.ok) {
    console.log('  note: this probes raw java networking only; Gradle may still resolve dependencies successfully via its own runtime path.');
    console.log('  action: if Gradle builds fail on dependency downloads, allow the reported java.exe/javaw.exe outbound HTTPS (443) in firewall/security tools.');
  }

  if (!emulator) {
    console.log('  action: install Android Emulator package via Android Studio SDK Manager.');
  }

  if (!sdkmanager) {
    console.log('  action: install Android SDK Command-line Tools (latest).');
  }

  if (devices.length === 0) {
    console.log('  action: connect device with USB debugging or start an emulator.');
  }

  const ready = synced && !!adb && devices.length > 0 && javaProbe.ok;
  console.log(`- ready to run native UI loop: ${ready ? 'yes' : 'no'}`);

  process.exit(ready ? 0 : 1);
}

main();
