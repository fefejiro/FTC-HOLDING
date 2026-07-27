import { execFile } from 'node:child_process'
import fs from 'node:fs/promises'
import path from 'node:path'
import { promisify } from 'node:util'
import { fileURLToPath } from 'node:url'

const execFileAsync = promisify(execFile)
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
const runDate = readArg('--date') || todayInTimeZone()
const windowName = readArg('--window') || 'manual'

function readArg(name) {
  const index = process.argv.indexOf(name)
  return index >= 0 ? process.argv[index + 1] : ''
}

function todayInTimeZone(timeZone = 'America/New_York') {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date())
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]))
  return `${values.year}-${values.month}-${values.day}`
}

async function readJsonMaybe(filePath) {
  try {
    const text = await fs.readFile(filePath, 'utf8')
    return JSON.parse(text.replace(/^\uFEFF/, ''))
  } catch {
    return null
  }
}

async function exists(filePath) {
  try {
    await fs.access(filePath)
    return true
  } catch {
    return false
  }
}

async function listFilesMaybe(dirPath) {
  try {
    return await fs.readdir(dirPath)
  } catch {
    return []
  }
}

async function scheduledTasks() {
  const command = [
    'Get-ScheduledTask -TaskName "UnaLabsSocial*" -ErrorAction SilentlyContinue |',
    'ForEach-Object {',
    '$info = $_ | Get-ScheduledTaskInfo;',
    '[pscustomobject]@{',
    'TaskName=$_.TaskName;',
    'State=$_.State;',
    'LastRunTime=$info.LastRunTime;',
    'LastTaskResult=$info.LastTaskResult;',
    'NextRunTime=$info.NextRunTime',
    '}',
    '} | ConvertTo-Json -Depth 4',
  ].join(' ')
  try {
    const { stdout } = await execFileAsync('powershell.exe', ['-NoProfile', '-Command', command], {
      cwd: root,
      windowsHide: true,
      timeout: 30_000,
    })
    const parsed = JSON.parse(stdout || '[]')
    return Array.isArray(parsed) ? parsed : [parsed]
  } catch (error) {
    return [{ error: error.message }]
  }
}

function summarizePublish(report) {
  if (!report) return { status: 'missing', channels: {} }
  const results = report.results || {}
  return {
    status: report.status || 'unknown',
    channels: Object.fromEntries(
      Object.entries(results).map(([channel, result]) => [
        channel,
        {
          status: result.status || 'unknown',
          reason: result.reason || '',
          imageCount: result.assetProof?.images?.length || 0,
          hashCount: result.assetProof?.imageHashes?.length || 0,
        },
      ]),
    ),
  }
}

function recommendations({ scheduleRun, publishGuard, visibleReport, tasks }) {
  const items = []
  if (!scheduleRun) items.push('No schedule-run-status.json exists for today. Confirm the Windows task ran.')
  if (scheduleRun && scheduleRun.exitCode !== 0) items.push(`Scheduled runner exited ${scheduleRun.exitCode} at stage ${scheduleRun.stage}. Review the log file.`)
  if (!publishGuard) items.push('No publish-guard-report.json exists. The run did not reach the premium quality gate.')
  if (publishGuard?.status === 'quality_hold') items.push('Quality hold was triggered. Review publishBlockedReasons and regenerate only the failed story/asset before publishing.')
  const channels = visibleReport?.results || {}
  for (const [channel, result] of Object.entries(channels)) {
    const status = String(result.status || '')
    if (!status.startsWith('posted') && status !== 'dry_run_ready') {
      items.push(`${channel} publish status is ${status || 'missing'}. Check proof screenshots before retrying.`)
    }
    if ((result.assetProof?.images || []).length === 0) {
      items.push(`${channel} has no image proof. Do not count this as a successful media post.`)
    }
  }
  const failedTasks = (tasks || []).filter((task) => Number(task.LastTaskResult) !== 0 && String(task.LastRunTime || '').includes(new Date().getFullYear().toString()))
  if (failedTasks.length) {
    items.push(`Windows Scheduler has nonzero recent results for: ${failedTasks.map((task) => task.TaskName).join(', ')}.`)
  }
  if (!items.length) items.push('No immediate action. Keep observing the next run and compare proof against ledger.')
  return items
}

const proofDir = path.join(root, 'content', 'proof', runDate)
const scheduleRun = await readJsonMaybe(path.join(proofDir, 'schedule-run-status.json'))
const publishGuard = await readJsonMaybe(path.join(proofDir, 'publish-guard-report.json'))
const visibleReport = await readJsonMaybe(path.join(proofDir, 'visible-social-post-report.json'))
const proofFiles = await listFilesMaybe(proofDir)
const tasks = await scheduledTasks()
const report = {
  id: `una-social-monitor-${runDate}-${windowName}-${Date.now()}`,
  runDate,
  window: windowName,
  status: 'captured',
  scheduleRun,
  publishGuard: publishGuard
    ? {
        status: publishGuard.status,
        mode: publishGuard.mode || '',
        approved: publishGuard.approved === true,
        publishBlockedReasons: publishGuard.publishBlockedReasons || [],
        slideCount: publishGuard.slides?.length || 0,
      }
    : null,
  visiblePublish: summarizePublish(visibleReport),
  proofFiles,
  scheduledTasks: tasks,
  recommendations: recommendations({ scheduleRun, publishGuard, visibleReport, tasks }),
  createdAt: new Date().toISOString(),
}

const monitorDir = path.join(proofDir, 'monitor')
await fs.mkdir(monitorDir, { recursive: true })
const jsonPath = path.join(monitorDir, `${windowName}-monitor-report.json`)
const mdPath = path.join(monitorDir, `${windowName}-monitor-report.md`)
await fs.writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8')
await fs.writeFile(
  mdPath,
  [
    `# Una Labs Monitor - ${runDate} ${windowName}`,
    '',
    `Status: ${report.status}`,
    `Runner: ${scheduleRun ? `${scheduleRun.status} at ${scheduleRun.stage} exit ${scheduleRun.exitCode}` : 'missing'}`,
    `Guard: ${report.publishGuard ? `${report.publishGuard.status} mode ${report.publishGuard.mode || 'standard'} slides ${report.publishGuard.slideCount}` : 'missing'}`,
    '',
    '## Visible Publish',
    '',
    ...Object.entries(report.visiblePublish.channels || {}).map(
      ([channel, result]) => `- ${channel}: ${result.status}; images ${result.imageCount}; hashes ${result.hashCount}${result.reason ? `; ${result.reason}` : ''}`,
    ),
    '',
    '## Recommendations',
    '',
    ...report.recommendations.map((item) => `- ${item}`),
    '',
  ].join('\n'),
  'utf8',
)

console.log(JSON.stringify({ status: 'captured', jsonPath, mdPath, recommendations: report.recommendations }, null, 2))
