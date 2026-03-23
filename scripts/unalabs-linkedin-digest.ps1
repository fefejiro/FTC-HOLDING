param(
  [int]$TopN = 5,
  [int]$LookbackHours = 48,
  [int]$MinItems = 3,
  [int]$FallbackHours = 72,
  [int]$MaxSources = 0,
  [int]$TimeoutSec = 8,
  [int]$RetryCount = 1,
  [int]$RetryDelaySec = 1,
  [string]$TelegramToken = $env:TELEGRAM_BOT_TOKEN,
  [string]$TelegramChatId = $env:TELEGRAM_CHAT_ID,
  [string]$OpenClawProfile = $env:OPENCLAW_PROFILE,
  [switch]$NoTelegram,
  [switch]$DryRun
)

$ErrorActionPreference = "Stop"

function Write-Info($msg) { Write-Host "[info] $msg" -ForegroundColor Cyan }
function Write-Warn($msg) { Write-Host "[warn] $msg" -ForegroundColor Yellow }
function Write-Err($msg) { Write-Host "[error] $msg" -ForegroundColor Red }

function Resolve-RepoRoot {
  param([string]$StartPath)
  $candidate = (Resolve-Path $StartPath).Path
  while ($candidate -and -not (Test-Path (Join-Path $candidate "DOCS\\linkedin"))) {
    $parent = Split-Path -Parent $candidate
    if ($parent -eq $candidate) { $candidate = $null; break }
    $candidate = $parent
  }
  if (-not $candidate) {
    throw "Repo root not found (expected DOCS\\linkedin)."
  }
  return $candidate
}

function Assert-DedicatedBot {
  param([string]$Token)
  if (-not $Token) { return }
  if ($env:OPENCLAW_TELEGRAM_BOT_TOKEN -and $env:OPENCLAW_TELEGRAM_BOT_TOKEN -eq $Token) {
    Write-Err "TELEGRAM_BOT_TOKEN matches OPENCLAW_TELEGRAM_BOT_TOKEN. Use a dedicated bot for LinkedIn automation."
    exit 1
  }
  if ($env:OPENCLAW_BOT_TOKEN -and $env:OPENCLAW_BOT_TOKEN -eq $Token) {
    Write-Err "TELEGRAM_BOT_TOKEN matches OPENCLAW_BOT_TOKEN. Use a dedicated bot for LinkedIn automation."
    exit 1
  }
  $openclawConfigPath = Join-Path $env:USERPROFILE ".openclaw\\openclaw.json"
  if (Test-Path $openclawConfigPath) {
    try {
      $raw = Get-Content $openclawConfigPath -Raw
      if ($raw -match [regex]::Escape($Token)) {
        Write-Err "TELEGRAM_BOT_TOKEN appears in OpenClaw config. Use a dedicated bot for LinkedIn automation."
        exit 1
      }
    } catch {}
  }
}

function Get-TextOrEmpty($value) {
  if ($null -eq $value) { return "" }
  return "$value"
}

function Strip-Html($text) {
  if (-not $text) { return "" }
  return ($text -replace "<[^>]+>", " " -replace "\s+", " ").Trim()
}

function Get-RssItems {
  param($source)
  $items = @()
  $attempt = 0
  $resp = $null
  while ($attempt -le $RetryCount) {
    try {
      $resp = Invoke-WebRequest -Uri $source.url -UseBasicParsing -Headers @{ "User-Agent" = "UnaLabsContentBot/1.0" } -TimeoutSec $TimeoutSec
      break
    } catch {
      if ($attempt -ge $RetryCount) {
        Write-Warn "Failed to fetch $($source.name) ($($source.url))"
        return @()
      }
      Start-Sleep -Seconds $RetryDelaySec
    }
    $attempt++
  }

  try { [xml]$xml = $resp.Content } catch { return @() }

  if ($xml.rss.channel.item) {
    foreach ($item in $xml.rss.channel.item) {
      $title = Get-TextOrEmpty $item.title
      $link = Get-TextOrEmpty $item.link
      $desc = Get-TextOrEmpty $item.description
      if (-not $desc) { $desc = Get-TextOrEmpty $item.'content:encoded' }
      $pub = Get-TextOrEmpty $item.pubDate
      if (-not $pub) { $pub = Get-TextOrEmpty $item.date }
      $items += [pscustomobject]@{
        Title = $title
        Link = $link
        Summary = Strip-Html $desc
        PublishedRaw = $pub
        Source = $source.name
        Priority = [int]$source.priority
      }
    }
  } elseif ($xml.feed.entry) {
    foreach ($entry in $xml.feed.entry) {
      $title = Get-TextOrEmpty $entry.title
      $linkNode = $entry.link | Where-Object { $_.rel -eq "alternate" } | Select-Object -First 1
      if (-not $linkNode) { $linkNode = $entry.link | Select-Object -First 1 }
      $link = Get-TextOrEmpty $linkNode.href
      if (-not $link) { $link = Get-TextOrEmpty $linkNode.'#text' }
      $summary = Get-TextOrEmpty $entry.summary
      if (-not $summary) { $summary = Get-TextOrEmpty $entry.content }
      $pub = Get-TextOrEmpty $entry.published
      if (-not $pub) { $pub = Get-TextOrEmpty $entry.updated }
      $items += [pscustomobject]@{
        Title = $title
        Link = $link
        Summary = Strip-Html $summary
        PublishedRaw = $pub
        Source = $source.name
        Priority = [int]$source.priority
      }
    }
  } else {
    Write-Warn "Unrecognized feed format for $($source.name)"
  }

  return $items
}

function Parse-PublishedDate($raw) {
  if (-not $raw) { return $null }
  try { return [datetime]::Parse($raw) } catch { return $null }
}

function Get-KeywordScore($text) {
  $keywords = @(
    "ai","artificial intelligence","machine learning","ml","llm","large language","moe","mixture of experts",
    "gpu","chip","chips","nvidia","inference","training","model","automation","enterprise","startup","funding",
    "openai","anthropic","google","meta","microsoft","amazon","aws","datacenter","agent","agents"
  )
  $score = 0
  $lower = $text.ToLower()
  foreach ($kw in $keywords) {
    if ($lower.Contains($kw)) { $score++ }
  }
  return $score
}

function Get-RecencyScore($hours) {
  if ($hours -le 12) { return 1.0 }
  if ($hours -le 24) { return 0.7 }
  if ($hours -le 36) { return 0.4 }
  if ($hours -le 48) { return 0.2 }
  return 0
}

function Ensure-LocalDir($path) {
  if (-not (Test-Path $path)) { New-Item -ItemType Directory -Path $path -Force | Out-Null }
}

function Invoke-OpenClawDrafts {
  param(
    [string]$Prompt,
    [string]$Profile
  )

  $args = @()
  if ($Profile) {
    $args += "--profile"
    $args += $Profile
  }
  $args += @("agent","--message",$Prompt,"--json","--thinking","minimal")

  $raw = & openclaw @args 2>&1
  try {
    $obj = $raw | ConvertFrom-Json -ErrorAction Stop
    if ($obj.drafts) { return $obj }
    if ($obj.reply -and $obj.reply.content) {
      $inner = $obj.reply.content | ConvertFrom-Json -ErrorAction Stop
      return $inner
    }
    if ($obj.content) {
      $inner = $obj.content | ConvertFrom-Json -ErrorAction Stop
      return $inner
    }
  } catch {
    return @{ raw = $raw }
  }
  return @{ raw = $raw }
}

function Send-Telegram {
  param(
    [string]$Token,
    [string]$ChatId,
    [string]$Text,
    [object]$ReplyMarkup
  )
  if (-not $Token -or -not $ChatId) { return }
  $uri = "https://api.telegram.org/bot$Token/sendMessage"
  $body = @{
    chat_id = $ChatId
    text = $Text
    disable_web_page_preview = $true
  }
  if ($ReplyMarkup) {
    $body.reply_markup = ($ReplyMarkup | ConvertTo-Json -Depth 6)
  }
  Invoke-RestMethod -Method Post -Uri $uri -Body $body | Out-Null
}

function Split-Text($text, [int]$maxLen = 3500) {
  $chunks = @()
  $current = ""
  foreach ($line in ($text -split "`n")) {
    if (($current.Length + $line.Length + 1) -gt $maxLen) {
      $chunks += $current.Trim()
      $current = ""
    }
    $current += $line + "`n"
  }
  if ($current.Trim()) { $chunks += $current.Trim() }
  return $chunks
}

$RepoRoot = Resolve-RepoRoot -StartPath $PSScriptRoot

$sourcesPath = Join-Path $RepoRoot "DOCS\\linkedin\\UNALABS_AI_NEWS_SOURCES.json"
$templatePath = Join-Path $RepoRoot "DOCS\\linkedin\\UNALABS_LINKEDIN_PROMPT_TEMPLATE.md"
$dailyDir = Join-Path $RepoRoot "DOCS\\linkedin\\daily"
$localStateDir = Join-Path $RepoRoot "DOCS\\linkedin\\.local"
$lastDigestPath = Join-Path $localStateDir "last_digest.json"
$lastSuccessPath = Join-Path $localStateDir "last_success.json"
$approvalsStatePath = Join-Path $localStateDir "approvals_state.json"

if (-not (Test-Path $sourcesPath)) { Write-Err "Missing sources file: $sourcesPath"; exit 1 }
if (-not (Test-Path $templatePath)) { Write-Err "Missing template file: $templatePath"; exit 1 }

Ensure-LocalDir $dailyDir
Ensure-LocalDir $localStateDir

if (-not $NoTelegram -and -not $DryRun) {
  Assert-DedicatedBot -Token $TelegramToken
}

$sources = Get-Content $sourcesPath | ConvertFrom-Json
if ($MaxSources -gt 0) {
  $sources = $sources | Select-Object -First $MaxSources
}

$allItems = @()
foreach ($source in $sources) {
  $allItems += Get-RssItems $source
}

$now = Get-Date
$itemsWithDates = @()
foreach ($item in $allItems) {
  $published = Parse-PublishedDate $item.PublishedRaw
  if (-not $published) { continue }
  $item | Add-Member -NotePropertyName Published -NotePropertyValue $published -Force
  $itemsWithDates += $item
}

$dedup = @{}
$unique = @()
foreach ($item in $itemsWithDates) {
  $key = ($item.Link + $item.Title).ToLower()
  if (-not $dedup.ContainsKey($key)) {
    $dedup[$key] = $true
    $unique += $item
  }
}

function Score-And-Select($items, $nowValue, $topNValue) {
  $scored = $items | ForEach-Object {
    $text = "$($_.Title) $($_.Summary)"
    $ageHours = [math]::Max(0, ($nowValue - $_.Published).TotalHours)
    $score = (Get-KeywordScore $text) * 2 + (Get-RecencyScore $ageHours) * 2 + $_.Priority
    $_ | Add-Member -NotePropertyName Score -NotePropertyValue $score -Force
    $_
  }
  return $scored | Sort-Object Score -Descending | Select-Object -First $topNValue
}

$cutoffPrimary = $now.AddHours(-1 * $LookbackHours)
$primaryItems = $unique | Where-Object { $_.Published -ge $cutoffPrimary }
$selected = Score-And-Select $primaryItems $now $TopN

$usedFallbackLookback = $false
if ($selected.Count -lt $MinItems) {
  $fallbackLookback = [math]::Max($LookbackHours, $FallbackHours)
  $cutoffFallback = $now.AddHours(-1 * $fallbackLookback)
  $fallbackItems = $unique | Where-Object { $_.Published -ge $cutoffFallback }
  $selected = Score-And-Select $fallbackItems $now $TopN
  $usedFallbackLookback = $true
}

$usedLastSuccess = $false
$fallbackFrom = $null
$drafts = $null
$rawOutput = $null

if (-not $selected -or $selected.Count -eq 0) {
  if (Test-Path $lastSuccessPath) {
    try {
      $lastSuccess = Get-Content $lastSuccessPath | ConvertFrom-Json
      if ($lastSuccess.selected -and $lastSuccess.drafts) {
        $selected = @($lastSuccess.selected)
        $drafts = @($lastSuccess.drafts)
        $usedLastSuccess = $true
        $fallbackFrom = $lastSuccess.date
      }
    } catch {}
  }
  if (-not $selected -or $selected.Count -eq 0) {
    Write-Warn "No items found in the last $LookbackHours hours."
    exit 0
  }
}

if (-not $drafts) {
  if ($DryRun) {
    $drafts = @(
      @{
        topic = "Dry run"
        headline = "Dry run headline"
        post = "REVIEW REQUIRED`n`nDry run content."
        alt = "Dry run alt"
        imageIdea = "Dry run image idea"
      }
    )
  } else {
    try { & openclaw agent --help | Out-Null } catch {
      Write-Err "OpenClaw agent command not available. Make sure OpenClaw is installed and the gateway is running."
      exit 1
    }
    Write-Info "Generating drafts with OpenClaw..."
    $draftResult = Invoke-OpenClawDrafts -Prompt (Get-Content $templatePath -Raw).Replace("{{ITEMS}}", ($selected | ForEach-Object {
      "Title: $($_.Title)`nSource: $($_.Source)`nPublished: $($_.Published.ToString("yyyy-MM-dd HH:mm"))`nLink: $($_.Link)`nSummary: $($_.Summary)`n"
    } | Out-String)) -Profile $OpenClawProfile
    if ($draftResult.drafts) {
      $drafts = @($draftResult.drafts)
    } else {
      $rawOutput = $draftResult.raw
    }
  }
}

$dateStr = $now.ToString("yyyy-MM-dd")
$dailyPath = Join-Path $dailyDir "$dateStr.md"

$archive = "# Una Labs Daily Digest - $dateStr`n`n"
if ($usedLastSuccess -and $fallbackFrom) {
  $archive += "_Fallback from last successful digest: $fallbackFrom_`n`n"
} elseif ($usedFallbackLookback) {
  $archive += "_Used extended lookback window for this digest._`n`n"
}
$archive += "## Selected topics`n"
$archive += ($selected | ForEach-Object { "- $($_.Title) - $($_.Source) ($($_.Link))" }) -join "`n"
$archive += "`n`n## Drafts`n"

if ($drafts) {
  $idx = 1
  foreach ($d in $drafts) {
    $archive += "### Draft $idx`n"
    $archive += "**Headline:** $($d.headline)`n`n"
    $archive += "**Post:**`n$($d.post)`n`n"
    if ($d.alt) { $archive += "**Alt:**`n$($d.alt)`n`n" }
    if ($d.imageIdea) { $archive += "**Image idea:** $($d.imageIdea)`n`n" }
    $idx++
  }
} else {
  $archive += "OpenClaw output could not be parsed.`n`n"
  $archive += $rawOutput
}

Set-Content -Path $dailyPath -Value $archive -Encoding UTF8

$state = @{
  date = $dateStr
  createdAt = $now.ToString("o")
  selected = $selected
  drafts = $drafts
  fallbackFrom = $fallbackFrom
}
$state | ConvertTo-Json -Depth 6 | Set-Content -Path $lastDigestPath -Encoding UTF8

if (-not $DryRun -and -not $usedLastSuccess -and $drafts) {
  $lastSuccess = @{
    date = $dateStr
    createdAt = $now.ToString("o")
    selected = $selected
    drafts = $drafts
  }
  $lastSuccess | ConvertTo-Json -Depth 6 | Set-Content -Path $lastSuccessPath -Encoding UTF8
}

$approvalState = @{
  date = $dateStr
  decisions = @{}
}
$approvalState | ConvertTo-Json -Depth 6 | Set-Content -Path $approvalsStatePath -Encoding UTF8

if (-not $NoTelegram -and -not $DryRun) {
  if (-not $TelegramToken -or -not $TelegramChatId) {
    Write-Warn "Missing Telegram token or chat id. Skipping Telegram send."
  } else {
    $headlineLines = $selected | ForEach-Object { "- $($_.Title) - $($_.Source)" }
    $digest = @"
Una Labs Daily AI Digest - $dateStr

Top items:
$($headlineLines -join "`n")

DRAFTS - REVIEW REQUIRED
"@
    if ($usedLastSuccess -and $fallbackFrom) {
      $digest = "Fallback from last successful digest: $fallbackFrom`n`n" + $digest
    } elseif ($usedFallbackLookback) {
      $digest = "Used extended lookback window for this digest.`n`n" + $digest
    }
    if ($drafts) {
      $idx = 1
      foreach ($d in $drafts) {
        $digest += "`nDraft $idx`n"
        $digest += "Headline: $($d.headline)`n"
        $digest += "$($d.post)`n"
        if ($d.alt) { $digest += "`nAlt: $($d.alt)`n" }
        if ($d.imageIdea) { $digest += "`nImage idea: $($d.imageIdea)`n" }
        $idx++
      }
    } else {
      $digest += "`nOpenClaw output could not be parsed. Check daily archive."
    }

    foreach ($chunk in (Split-Text $digest)) {
      Send-Telegram -Token $TelegramToken -ChatId $TelegramChatId -Text $chunk
    }

    if ($drafts) {
      $replyMarkup = @{ inline_keyboard = @() }
      for ($idx = 1; $idx -le $drafts.Count; $idx++) {
        $replyMarkup.inline_keyboard += ,@(
          @{ text = "Approve $idx"; callback_data = "approve:$idx" },
          @{ text = "Hold $idx"; callback_data = "hold:$idx" }
        )
      }
      Send-Telegram -Token $TelegramToken -ChatId $TelegramChatId -Text "Review actions for ${dateStr}:" -ReplyMarkup $replyMarkup
    }
  }
}

Write-Info "Digest complete: $dailyPath"
