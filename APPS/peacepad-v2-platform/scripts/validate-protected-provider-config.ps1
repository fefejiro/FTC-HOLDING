[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$missing = [System.Collections.Generic.List[string]]::new()

function Require-Secret([string] $Name, [int] $MinimumLength = 16) {
  $value = [Environment]::GetEnvironmentVariable($Name)
  if ([string]::IsNullOrWhiteSpace($value) -or $value.Trim().Length -lt $MinimumLength) {
    $missing.Add($Name)
  }
}

function Require-HttpsUrl([string] $Name) {
  $value = [Environment]::GetEnvironmentVariable($Name)
  $uri = $null
  if ([string]::IsNullOrWhiteSpace($value) -or
      -not [Uri]::TryCreate($value.Trim(), [UriKind]::Absolute, [ref] $uri) -or
      $uri.Scheme -ne 'https') {
    $missing.Add($Name)
  }
}

function Require-OptionalProviderPair([string] $UrlName, [string] $TokenName) {
  $urlValue = [Environment]::GetEnvironmentVariable($UrlName)
  $tokenValue = [Environment]::GetEnvironmentVariable($TokenName)
  if ([string]::IsNullOrWhiteSpace($urlValue) -and [string]::IsNullOrWhiteSpace($tokenValue)) {
    return
  }
  Require-HttpsUrl $UrlName
  Require-Secret $TokenName
}

Require-Secret 'PEACEPAD_PUSH_TOKEN_SECRET' 32
Require-Secret 'PEACEPAD_TURN_SHARED_SECRET' 32
Require-OptionalProviderPair 'PEACEPAD_SUPPORT_DISCOVERY_URL' 'PEACEPAD_SUPPORT_DISCOVERY_TOKEN'
Require-HttpsUrl 'PEACEPAD_COACH_TRANSCRIPTION_URL'
Require-Secret 'PEACEPAD_COACH_TRANSCRIPTION_TOKEN'
Require-OptionalProviderPair 'PEACEPAD_COACH_CONVERSATION_URL' 'PEACEPAD_COACH_CONVERSATION_TOKEN'

$turnUrls = [Environment]::GetEnvironmentVariable('PEACEPAD_TURN_URLS')
$validTurnUrls = @($turnUrls -split ',' | ForEach-Object { $_.Trim() } | Where-Object { $_ -match '^turns?:[^\s]+$' })
if ([string]::IsNullOrWhiteSpace($turnUrls) -or $validTurnUrls.Count -lt 1) {
  $missing.Add('PEACEPAD_TURN_URLS')
}

if ($missing.Count -gt 0) {
  throw "Protected PeacePad provider configuration is incomplete: $($missing -join ', '). Values were not printed."
}

Write-Output 'PEACEPAD_PROTECTED_PROVIDER_CONFIG_VERIFIED'
