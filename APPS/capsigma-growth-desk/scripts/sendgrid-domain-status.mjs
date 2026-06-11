import fs from 'node:fs'
import path from 'node:path'

const keyPath = process.env.SENDGRID_KEY_FILE || path.join(process.cwd(), '.local', 'sendgrid-api-key.txt')
const apiKey = process.env.SENDGRID_API_KEY || (fs.existsSync(keyPath) ? fs.readFileSync(keyPath, 'utf8').trim() : '')
const domainId = process.env.SENDGRID_DOMAIN_AUTH_ID || '31406421'

if (!apiKey) {
  console.error('Missing SendGrid API key. Set SENDGRID_API_KEY or create .local/sendgrid-api-key.txt.')
  process.exitCode = 1
} else {
  const headers = {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  }

  const [domainResponse, validationResponse] = await Promise.all([
    fetch(`https://api.sendgrid.com/v3/whitelabel/domains/${domainId}`, { headers }),
    fetch(`https://api.sendgrid.com/v3/whitelabel/domains/${domainId}/validate`, {
      method: 'POST',
      headers,
    }),
  ])

  const domain = await domainResponse.json()
  const validation = await validationResponse.json()

  if (!domainResponse.ok) {
    throw new Error(`SendGrid domain lookup failed: ${domainResponse.status} ${JSON.stringify(domain)}`)
  }
  if (!validationResponse.ok) {
    throw new Error(`SendGrid domain validation failed: ${validationResponse.status} ${JSON.stringify(validation)}`)
  }

  const report = {
    checkedAt: new Date().toISOString(),
    domainId,
    domain: domain.domain,
    subdomain: domain.subdomain,
    valid: Boolean(validation.valid),
    dns: domain.dns,
    validationResults: validation.validation_results,
  }

  console.log(JSON.stringify(report, null, 2))

  if (!validation.valid) {
    process.exitCode = 2
  }
}
