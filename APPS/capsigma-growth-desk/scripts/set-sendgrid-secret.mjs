import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

const keyPath =
  process.env.SENDGRID_KEY_FILE ||
  path.join(process.cwd(), '.local', 'sendgrid-api-key.txt')

if (!fs.existsSync(keyPath)) {
  console.error(`Missing SendGrid key file: ${keyPath}`)
  console.error('Create a SendGrid API key, paste only the key into that ignored file, then rerun this command.')
  process.exit(1)
}

const key = fs.readFileSync(keyPath, 'utf8').trim()

if (!key.startsWith('SG.') || key.length < 60) {
  console.error('The SendGrid key does not look valid. Expected a key beginning with SG. and around 69 characters.')
  process.exit(1)
}

const result = spawnSync(
  'npx',
  ['wrangler', 'pages', 'secret', 'put', 'SENDGRID_API_KEY', '--project-name', 'capsigma-growth-desk'],
  {
    input: key,
    encoding: 'utf8',
    stdio: ['pipe', 'inherit', 'inherit'],
    shell: process.platform === 'win32',
  },
)

if (result.status !== 0) process.exit(result.status || 1)

console.log('SENDGRID_API_KEY uploaded to Cloudflare Pages.')
