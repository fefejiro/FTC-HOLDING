$ErrorActionPreference = 'Stop'

$workflowPath = Join-Path $PSScriptRoot '..\workflows\peacepad-v2-supabase-staging-deploy.yml'
if (-not (Test-Path -LiteralPath $workflowPath)) {
  throw 'PeacePad V2 staging deployment workflow is missing.'
}

$content = Get-Content -LiteralPath $workflowPath -Raw
$required = @(
  'workflow_dispatch:',
  'default: dry-run',
  'environment: peacepad-v2-staging-${{ inputs.region }}',
  "ca = 'ftdqnhlesqrkstnqgfxr'",
  "us = 'kgechdqdtryktfahyqez'",
  'CONFIRM_COMMIT_SHA',
  'SELECTED_COMMIT_SHA',
  'DEPLOY FICTIONAL STAGING',
  'SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}',
  'DATABASE_URL: ${{ secrets.DATABASE_URL }}',
  'PEACEPAD_MAINTENANCE_SECRET: ${{ secrets.MAINTENANCE_SECRET }}',
  'x-peacepad-region',
  'DRY_RUN_OR_FAILED'
)

foreach ($needle in $required) {
  if (-not $content.Contains($needle)) {
    throw "Deployment workflow contract is missing: $needle"
  }
}

$forbidden = @(
  'region: all',
  'ca.peacepad.family',
  'productionApiWritesEnabled: true',
  'environment: production',
  'cancel-in-progress: true'
)

foreach ($needle in $forbidden) {
  if ($content.Contains($needle)) {
    throw "Deployment workflow contains forbidden production or unsafe control: $needle"
  }
}

$jobPrefix = $content.Substring(0, $content.IndexOf('    steps:'))
if ($jobPrefix -match '(?m)^\s{4}env:') {
  throw 'Deployment credentials must not be exposed at job scope.'
}

if ([regex]::Matches($content, '(?m)^\s{10}- ca\r?$').Count -ne 1 -or
    [regex]::Matches($content, '(?m)^\s{10}- us\r?$').Count -ne 1) {
  throw 'The region selector must expose exactly Canada and United States.'
}

Write-Output 'PEACEPAD_V2_DEPLOY_WORKFLOW_CONTRACT_PASS'
