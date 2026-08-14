$ErrorActionPreference = 'Stop'

$workflowPath = Join-Path $PSScriptRoot '..\workflows\peacepad-v2-ios-testflight-build.yml'
$workflow = Get-Content -LiteralPath $workflowPath -Raw
$failures = [System.Collections.Generic.List[string]]::new()

function Require-Literal([string]$literal, [string]$message) {
  if (-not $workflow.Contains($literal)) {
    $failures.Add($message)
  }
}

Require-Literal 'workflow_dispatch:' 'The build control must remain manually dispatched.'
Require-Literal 'contents: read' 'The build control must retain read-only repository permissions.'
Require-Literal 'cancel-in-progress: false' 'An active signed build must never be silently cancelled by another dispatch.'
Require-Literal 'PIPELINE_BASELINE: 8b1f3bf6bf93fec49e18f746e7cfd2f361480287' 'The reviewed pipeline ancestry floor changed.'
Require-Literal 'test "$(git rev-parse HEAD)" = "$TARGET_SHA"' 'The exact target checkout assertion is missing.'
Require-Literal 'git merge-base --is-ancestor "$PIPELINE_BASELINE" "$TARGET_SHA"' 'The reviewed pipeline ancestry check is missing.'
Require-Literal 'test "$EXISTING_APP_STORE_ID" = "6793350735"' 'The existing App Store record confirmation is missing.'
Require-Literal 'npm run release:ios:preflight:online' 'The live Apple/EAS preflight must run before build.'
Require-Literal 'check-ios-testflight-readiness.cjs --injected' 'The injected dual-region EAS runtime must be verified.'
Require-Literal '--profile testflight-internal' 'Only the reviewed internal TestFlight profile may build.'
Require-Literal '.appConfig.ios.bundleIdentifier == "ca.peacepad.family"' 'The existing production bundle assertion is missing.'
Require-Literal '.appConfig.extra.appStoreId == "6793350735"' 'The existing Apple ID assertion is missing.'
Require-Literal '.appConfig.extra.productionApiWritesEnabled == false' 'The disabled production-write assertion is missing.'
Require-Literal 'EAS_TESTFLIGHT_BUILD_FINISHED' 'The exact build evidence result is missing.'
Require-Literal 'autoSubmitAttempted: false' 'The evidence must explicitly deny automatic submission.'
Require-Literal 'actions/upload-artifact@v4' 'Non-secret build evidence must be uploaded.'

if ($workflow -match '(?m)^\s*eas\s+submit\b' -or $workflow.Contains('--auto-submit')) {
  $failures.Add('The first internal candidate must not be submitted automatically.')
}
if ($workflow -match '(?m)^\s*(pull_request|push|schedule):') {
  $failures.Add('The signed-build workflow must not acquire an automatic trigger.')
}

if ($failures.Count -gt 0) {
  $failures | ForEach-Object { Write-Error $_ }
  exit 1
}

Write-Output 'PEACEPAD_V2_TESTFLIGHT_CONTROL_STATIC_VERIFIED'
