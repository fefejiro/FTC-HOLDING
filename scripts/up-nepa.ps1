[CmdletBinding()]
param(
  [string]$PrimaryEmail = "peacepad@peacepad.ca",
  [string]$BackupEmail = "fejiro.ontario@gmail.com",
  [string]$Provider = "openai-codex",
  [int]$FiveHourRemainingThreshold = 20,
  [int]$WeekRemainingThreshold = 10,
  [string]$NotifyChatId = "8271166944",
  [string]$StatePath = "$env:USERPROFILE\.openclaw\up-nepa-state.json",
  [switch]$DryRun
)

$ErrorActionPreference = "Stop"

function Invoke-JsonCommand {
  param(
    [Parameter(Mandatory = $true)] [string[]]$Arguments
  )

  $output = & openclaw @Arguments 2>&1
  if ($LASTEXITCODE -ne 0) {
    throw "Command failed: openclaw $($Arguments -join ' ')`n$output"
  }

  $text = ($output | Out-String).Trim()
  if ([string]::IsNullOrWhiteSpace($text)) {
    throw "Command returned empty output: openclaw $($Arguments -join ' ')"
  }

  return $text | ConvertFrom-Json
}

function Invoke-TextCommand {
  param(
    [Parameter(Mandatory = $true)] [string[]]$Arguments
  )

  $output = & openclaw @Arguments 2>&1
  if ($LASTEXITCODE -ne 0) {
    throw "Command failed: openclaw $($Arguments -join ' ')`n$output"
  }

  return ($output | Out-String).Trim()
}

function Convert-Base64UrlToText {
  param(
    [Parameter(Mandatory = $true)] [string]$Value
  )

  $normalized = $Value.Replace("-", "+").Replace("_", "/")
  switch ($normalized.Length % 4) {
    2 { $normalized += "==" }
    3 { $normalized += "=" }
  }

  $bytes = [Convert]::FromBase64String($normalized)
  return [Text.Encoding]::UTF8.GetString($bytes)
}

function Get-JwtPayload {
  param(
    [Parameter(Mandatory = $true)] [string]$Token
  )

  $parts = $Token.Split(".")
  if ($parts.Count -lt 2) {
    return $null
  }

  try {
    $json = Convert-Base64UrlToText -Value $parts[1]
    return $json | ConvertFrom-Json
  } catch {
    return $null
  }
}

function Get-ProfileCatalog {
  param(
    [Parameter(Mandatory = $true)] [string]$AuthStorePath
  )

  if (-not (Test-Path $AuthStorePath)) {
    throw "Auth store not found: $AuthStorePath"
  }

  $raw = Get-Content $AuthStorePath -Raw | ConvertFrom-Json
  $items = @()

  foreach ($entry in $raw.profiles.PSObject.Properties) {
    $profileId = [string]$entry.Name
    $profile = $entry.Value
    $payload = $null
    $email = $null

    if ($profile.access) {
      $payload = Get-JwtPayload -Token ([string]$profile.access)
    }

    if ($payload -and $payload.'https://api.openai.com/profile' -and $payload.'https://api.openai.com/profile'.email) {
      $email = [string]$payload.'https://api.openai.com/profile'.email
    }

    $items += [pscustomobject]@{
      ProfileId = $profileId
      Provider  = [string]$profile.provider
      Type      = [string]$profile.type
      Email     = $email
    }
  }

  return $items
}

function Get-ProviderUsage {
  param(
    [Parameter(Mandatory = $true)] $UsageStatus,
    [Parameter(Mandatory = $true)] [string]$Provider
  )

  return @($UsageStatus.usage.providers | Where-Object { $_.provider -eq $Provider })[0]
}

function Get-WindowByLabel {
  param(
    [Parameter(Mandatory = $true)] $ProviderUsage,
    [Parameter(Mandatory = $true)] [string]$Label
  )

  return @($ProviderUsage.windows | Where-Object { $_.label -eq $Label })[0]
}

function Get-RemainingPercent {
  param(
    [Parameter(Mandatory = $true)] $Window
  )

  if ($null -eq $Window.usedPercent) {
    return $null
  }

  return [Math]::Max(0, 100 - [int]$Window.usedPercent)
}

function Get-OrderOverride {
  param(
    [Parameter(Mandatory = $true)] [string]$Provider
  )

  $text = Invoke-TextCommand -Arguments @("models", "auth", "order", "get", "--provider", $Provider)
  $match = [regex]::Match($text, "Order override:\s*(.+)")
  if (-not $match.Success) {
    return @()
  }

  $value = $match.Groups[1].Value.Trim()
  if ($value -eq "(none)" -or [string]::IsNullOrWhiteSpace($value)) {
    return @()
  }

  return @($value.Split(",") | ForEach-Object { $_.Trim() } | Where-Object { -not [string]::IsNullOrWhiteSpace($_) })
}

function Set-AuthOrder {
  param(
    [Parameter(Mandatory = $true)] [string]$Provider,
    [Parameter(Mandatory = $true)] [string[]]$ProfileIds,
    [switch]$DryRun
  )

  if ($DryRun) {
    Write-Host "DRY RUN: openclaw models auth order set --provider $Provider $($ProfileIds -join ' ')" -ForegroundColor Yellow
    return
  }

  $output = & openclaw models auth order set --provider $Provider @ProfileIds 2>&1
  if ($LASTEXITCODE -ne 0) {
    throw "Could not set auth order.`n$output"
  }
}

function Get-TelegramBotToken {
  $configPath = Join-Path $env:USERPROFILE ".openclaw\openclaw.json"
  if (-not (Test-Path $configPath)) {
    return $null
  }

  $cfg = Get-Content $configPath -Raw | ConvertFrom-Json
  $token = $cfg.channels.telegram.botToken
  if ([string]::IsNullOrWhiteSpace($token)) {
    return $null
  }

  return [string]$token
}

function Send-TelegramNotification {
  param(
    [Parameter(Mandatory = $true)] [string]$Message,
    [Parameter(Mandatory = $true)] [string]$ChatId,
    [switch]$DryRun
  )

  if ([string]::IsNullOrWhiteSpace($ChatId)) {
    return
  }

  $token = Get-TelegramBotToken
  if ([string]::IsNullOrWhiteSpace($token)) {
    Write-Warning "Telegram bot token missing; notification skipped."
    return
  }

  if ($DryRun) {
    Write-Host "DRY RUN: Telegram notification -> $Message" -ForegroundColor Yellow
    return
  }

  $uri = "https://api.telegram.org/bot$token/sendMessage"
  $body = @{
    chat_id = $ChatId
    text = $Message
  }

  Invoke-RestMethod -Method Post -Uri $uri -Body $body -ContentType "application/x-www-form-urlencoded" | Out-Null
}

function Read-State {
  param(
    [Parameter(Mandatory = $true)] [string]$Path
  )

  if (-not (Test-Path $Path)) {
    return [pscustomobject]@{
      version            = 1
      activeProfileId    = $null
      activeProfileEmail = $null
      restoreAfter       = $null
      switchedFromEmail  = $null
      lastReason         = $null
      lastWarning        = $null
    }
  }

  return (Get-Content $Path -Raw | ConvertFrom-Json)
}

function Write-State {
  param(
    [Parameter(Mandatory = $true)] [string]$Path,
    [Parameter(Mandatory = $true)] $State,
    [switch]$DryRun
  )

  if ($DryRun) {
    return
  }

  $directory = Split-Path -Parent $Path
  if (-not (Test-Path $directory)) {
    New-Item -ItemType Directory -Path $directory -Force | Out-Null
  }

  $State | ConvertTo-Json -Depth 20 | Set-Content -Path $Path -Encoding UTF8
}

function Build-PreferredOrder {
  param(
    [Parameter(Mandatory = $true)] [string]$FirstProfileId,
    [Parameter(Mandatory = $true)] [string]$SecondProfileId,
    [Parameter(Mandatory = $true)] [object[]]$Catalog
  )

  $ordered = [System.Collections.Generic.List[string]]::new()
  foreach ($id in @($FirstProfileId, $SecondProfileId)) {
    if (-not [string]::IsNullOrWhiteSpace($id) -and -not $ordered.Contains($id)) {
      $ordered.Add($id)
    }
  }

  foreach ($entry in $Catalog | Where-Object { $_.Provider -eq $Provider }) {
    if (-not $ordered.Contains($entry.ProfileId)) {
      $ordered.Add([string]$entry.ProfileId)
    }
  }

  return @($ordered)
}

$modelsStatus = Invoke-JsonCommand -Arguments @("models", "status", "--json")
$usageStatus = Invoke-JsonCommand -Arguments @("status", "--usage", "--json")
$catalog = Get-ProfileCatalog -AuthStorePath ([string]$modelsStatus.auth.storePath)
$providerCatalog = @($catalog | Where-Object { $_.Provider -eq $Provider })
$state = Read-State -Path $StatePath

$primaryProfile = @($providerCatalog | Where-Object { $_.Email -eq $PrimaryEmail })[0]
if (-not $primaryProfile) {
  $primaryProfile = @($providerCatalog | Where-Object { $_.ProfileId -eq "$Provider:default" })[0]
}

$backupProfile = @($providerCatalog | Where-Object { $_.Email -eq $BackupEmail })[0]
$providerUsage = Get-ProviderUsage -UsageStatus $usageStatus -Provider $Provider

if (-not $providerUsage) {
  throw "No usage window found for provider '$Provider'."
}

$fiveHourWindow = Get-WindowByLabel -ProviderUsage $providerUsage -Label "5h"
$weekWindow = Get-WindowByLabel -ProviderUsage $providerUsage -Label "Week"

$fiveHourRemaining = if ($fiveHourWindow) { Get-RemainingPercent -Window $fiveHourWindow } else { $null }
$weekRemaining = if ($weekWindow) { Get-RemainingPercent -Window $weekWindow } else { $null }

$orderOverride = Get-OrderOverride -Provider $Provider
$currentPreferredProfileId = if ($orderOverride.Count -gt 0) {
  $orderOverride[0]
} elseif ($primaryProfile) {
  $primaryProfile.ProfileId
} elseif ($providerCatalog.Count -gt 0) {
  $providerCatalog[0].ProfileId
} else {
  $null
}

$currentPreferredProfile = @($providerCatalog | Where-Object { $_.ProfileId -eq $currentPreferredProfileId })[0]

$reasons = @()
if ($null -ne $fiveHourRemaining -and $fiveHourRemaining -le $FiveHourRemainingThreshold) {
  $reasons += [pscustomobject]@{
    Label      = "5h"
    Remaining  = $fiveHourRemaining
    ResetAt    = [int64]$fiveHourWindow.resetAt
    Threshold  = $FiveHourRemainingThreshold
  }
}
if ($null -ne $weekRemaining -and $weekRemaining -le $WeekRemainingThreshold) {
  $reasons += [pscustomobject]@{
    Label      = "Week"
    Remaining  = $weekRemaining
    ResetAt    = [int64]$weekWindow.resetAt
    Threshold  = $WeekRemainingThreshold
  }
}

$now = [DateTimeOffset]::UtcNow
$didWork = $false

if (
  $backupProfile -and
  $primaryProfile -and
  $currentPreferredProfileId -eq $backupProfile.ProfileId -and
  $state.restoreAfter
) {
  $restoreAfter = [DateTimeOffset]::FromUnixTimeMilliseconds([int64]$state.restoreAfter)
  if ($now -ge $restoreAfter) {
    $restoreOrder = Build-PreferredOrder -FirstProfileId $primaryProfile.ProfileId -SecondProfileId $backupProfile.ProfileId -Catalog $providerCatalog
    Set-AuthOrder -Provider $Provider -ProfileIds $restoreOrder -DryRun:$DryRun

    $message = "Up Nepa restored Codex back to $PrimaryEmail after the quota window reset."
    Send-TelegramNotification -Message $message -ChatId $NotifyChatId -DryRun:$DryRun

    $state.activeProfileId = $primaryProfile.ProfileId
    $state.activeProfileEmail = $PrimaryEmail
    $state.restoreAfter = $null
    $state.switchedFromEmail = $null
    $state.lastReason = "restored_after_reset"
    $state.lastWarning = $null
    $didWork = $true
  }
}

if (-not $didWork -and $reasons.Count -gt 0) {
  if (-not $backupProfile) {
    $warning = "Backup profile for $BackupEmail is not linked yet. Up Nepa is armed, but it cannot switch until that Codex account is added to OpenClaw."
    if ($state.lastWarning -ne $warning) {
      Send-TelegramNotification -Message $warning -ChatId $NotifyChatId -DryRun:$DryRun
      $state.lastWarning = $warning
    }
  } elseif ($currentPreferredProfileId -ne $backupProfile.ProfileId) {
    $switchOrder = Build-PreferredOrder -FirstProfileId $backupProfile.ProfileId -SecondProfileId $primaryProfile.ProfileId -Catalog $providerCatalog
    Set-AuthOrder -Provider $Provider -ProfileIds $switchOrder -DryRun:$DryRun

    $restoreAfterMs = ($reasons | Measure-Object -Property ResetAt -Maximum).Maximum
    $reasonText = ($reasons | ForEach-Object { "$($_.Label)=$($_.Remaining)% left" }) -join ", "
    $message = "Up Nepa switched Codex from $PrimaryEmail to $BackupEmail because $reasonText."
    Send-TelegramNotification -Message $message -ChatId $NotifyChatId -DryRun:$DryRun

    $state.activeProfileId = $backupProfile.ProfileId
    $state.activeProfileEmail = $BackupEmail
    $state.restoreAfter = $restoreAfterMs
    $state.switchedFromEmail = $PrimaryEmail
    $state.lastReason = $reasonText
    $state.lastWarning = $null
    $didWork = $true
  }
}

if (-not $didWork) {
  $state.activeProfileId = $currentPreferredProfileId
  $state.activeProfileEmail = if ($currentPreferredProfile) { $currentPreferredProfile.Email } else { $null }
}

Write-State -Path $StatePath -State $state -DryRun:$DryRun

$summary = [pscustomobject]@{
  Provider                = $Provider
  PrimaryEmail            = $PrimaryEmail
  BackupEmail             = $BackupEmail
  PrimaryProfileId        = if ($primaryProfile) { $primaryProfile.ProfileId } else { $null }
  BackupProfileId         = if ($backupProfile) { $backupProfile.ProfileId } else { $null }
  CurrentPreferredProfile = $currentPreferredProfileId
  Remaining5h             = $fiveHourRemaining
  RemainingWeek           = $weekRemaining
  RestoreAfter            = $state.restoreAfter
  StatePath               = $StatePath
  DryRun                  = [bool]$DryRun
}

$summary | Format-List
