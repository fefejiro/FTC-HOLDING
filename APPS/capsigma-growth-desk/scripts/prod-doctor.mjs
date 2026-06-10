const baseUrl = process.env.CAPSIGMA_BASE_URL || 'https://capsigma-growth-desk.pages.dev'
const requireSendGrid = process.env.CAPSIGMA_REQUIRE_SENDGRID === '1'

async function main() {
  const response = await fetch(`${baseUrl}/api/session`)
  if (!response.ok) {
    throw new Error(`Session probe failed: ${response.status}`)
  }

  const data = await response.json()
  const failures = []
  const warnings = []

  if (data.authenticated !== false) failures.push('Unauthenticated session probe should return authenticated=false.')
  if (!data.configured?.database) failures.push('CAPSIGMA_DB is not configured.')
  if (!data.configured?.openai) failures.push('OPENAI_API_KEY is not configured.')
  if (!data.configured?.fromEmail) failures.push('SENDGRID_FROM_EMAIL is not configured.')
  if (!data.configured?.sendgrid) {
    const message = 'SENDGRID_API_KEY is not configured; production is preview-send only.'
    if (requireSendGrid) failures.push(message)
    else warnings.push(message)
  }

  const report = {
    baseUrl,
    checkedAt: new Date().toISOString(),
    configured: data.configured,
    failures,
    warnings,
  }

  console.log(JSON.stringify(report, null, 2))
  if (failures.length) process.exitCode = 1
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
