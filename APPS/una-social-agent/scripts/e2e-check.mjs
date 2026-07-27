import { spawn } from 'node:child_process'

const forceNew = process.argv.includes('--force-new')

function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: 'inherit',
    })
    child.on('exit', (code) => {
      if (code === 0) resolve()
      else reject(new Error(`${command} ${args.join(' ')} exited with ${code}`))
    })
    child.on('error', reject)
  })
}

const node = process.execPath
const draftArgs = ['scripts/draft-regional-brief.mjs']
if (forceNew) draftArgs.push('--', '--force-new')

const steps = [
  [node, draftArgs],
  [node, ['scripts/visual-newsroom.mjs']],
  [node, ['scripts/render-linkedin-preview.mjs']],
  [node, ['scripts/quality-check.mjs']],
]

for (const [command, args] of steps) {
  await run(command, args)
}

console.log(
  JSON.stringify(
    {
      status: 'passed',
      mode: 'dry_e2e_no_posting',
      steps: ['draft:regional', 'visual:today', 'preview:linkedin', 'quality:today'],
    },
    null,
    2,
  ),
)
