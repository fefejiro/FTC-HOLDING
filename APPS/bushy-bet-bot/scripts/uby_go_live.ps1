param(
    [string]$ServiceName = "bushy-bet-bot",
    [string]$EnvironmentName = "production",
    [string]$PublicBaseUrl = "https://bushy-bet-bot-production.up.railway.app",
    [string]$DatabaseRef = '${{Postgres.DATABASE_URL}}',
    [string]$AdminUserIds,
    [string]$BotToken,
    [string]$ApiFootballKey,
    [string]$WebhookSecret,
    [string]$ChannelId,
    [string]$OddsApiKey,
    [string]$AffiliateDefaultUrl = "https://example.com",
    [switch]$Deploy,
    [switch]$AllowOutsideWindow
)

$ErrorActionPreference = "Stop"

function Get-PlainFromSecure([SecureString]$secure) {
    $bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
    try {
        return [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr)
    }
    finally {
        [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)
    }
}

function Ensure-Value([string]$Name, [string]$CurrentValue) {
    if ($CurrentValue -and $CurrentValue.Trim()) {
        return $CurrentValue.Trim()
    }

    if ($Name -eq "BotToken" -or $Name -eq "ApiFootballKey") {
        $secureValue = Read-Host -Prompt "$Name" -AsSecureString
        $value = Get-PlainFromSecure $secureValue
    }
    else {
        $value = Read-Host -Prompt $Name
    }

    if ($null -eq $value) {
        return ""
    }

    return $value.Trim()
}

function New-RandomSecret([int]$Length = 48) {
    $rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
    $bytes = New-Object byte[] $Length
    $rng.GetBytes($bytes)
    return [Convert]::ToBase64String($bytes).Replace("+", "").Replace("/", "").Replace("=", "").Substring(0, $Length)
}

function Set-RailwayVar([string]$Key, [string]$Value) {
    & railway variable set "$Key=$Value" --service $ServiceName --environment $EnvironmentName --skip-deploys | Out-Null
    Write-Host "Set $Key"
}

function Delete-RailwayVar([string]$Key) {
    try {
        & railway variable delete $Key --service $ServiceName --environment $EnvironmentName | Out-Null
        Write-Host "Deleted $Key"
    }
    catch {
        Write-Host "Skipped delete for $Key"
    }
}

if (-not (Get-Command railway -ErrorAction SilentlyContinue)) {
    throw "Railway CLI not found. Install Railway CLI first."
}

$AdminUserIds = Ensure-Value -Name "AdminUserIds" -CurrentValue $AdminUserIds
$BotToken = Ensure-Value -Name "BotToken" -CurrentValue $BotToken
$ApiFootballKey = Ensure-Value -Name "ApiFootballKey" -CurrentValue $ApiFootballKey

if (-not $WebhookSecret -or -not $WebhookSecret.Trim()) {
    $WebhookSecret = New-RandomSecret
}

if (-not $AdminUserIds) { throw "AdminUserIds is required." }
if (-not $BotToken) { throw "BotToken is required." }
if (-not $ApiFootballKey) { throw "ApiFootballKey is required." }

Set-RailwayVar -Key "BOT_MODE" -Value "webhook"
Set-RailwayVar -Key "BOT_TOKEN" -Value $BotToken
Set-RailwayVar -Key "ADMIN_USER_IDS" -Value $AdminUserIds
Set-RailwayVar -Key "WEBHOOK_BASE_URL" -Value $PublicBaseUrl
Set-RailwayVar -Key "WEBHOOK_SECRET" -Value $WebhookSecret
Set-RailwayVar -Key "DATABASE_URL" -Value $DatabaseRef
Set-RailwayVar -Key "API_FOOTBALL_KEY" -Value $ApiFootballKey
Set-RailwayVar -Key "AFFILIATE_DEFAULT_URL" -Value $AffiliateDefaultUrl
Set-RailwayVar -Key "LOG_LEVEL" -Value "INFO"

if ($ChannelId -and $ChannelId.Trim()) {
    Set-RailwayVar -Key "CHANNEL_ID" -Value $ChannelId.Trim()
}
else {
    Delete-RailwayVar -Key "CHANNEL_ID"
}

if ($OddsApiKey -and $OddsApiKey.Trim()) {
    Set-RailwayVar -Key "ODDS_API_KEY" -Value $OddsApiKey.Trim()
}
else {
    Delete-RailwayVar -Key "ODDS_API_KEY"
}

Write-Host "Variables staged with --skip-deploys."

if ($Deploy) {
    $utcNow = (Get-Date).ToUniversalTime()
    $estNow = [System.TimeZoneInfo]::ConvertTimeBySystemTimeZoneId($utcNow, "Eastern Standard Time")
    $hour = $estNow.Hour
    $inWindow = ($hour -ge 20 -or $hour -lt 8)

    if (-not $inWindow -and -not $AllowOutsideWindow) {
        throw "Deploy blocked. Current EST is $($estNow.ToString('yyyy-MM-dd HH:mm:ss')) and outside 8pm-8am window. Use -AllowOutsideWindow to override."
    }

    Write-Host "Deploying $ServiceName..."
    & railway up --service $ServiceName

    $healthUrl = "$PublicBaseUrl/health"
    try {
        $health = Invoke-RestMethod -Uri $healthUrl -Method Get -TimeoutSec 30
        Write-Host "Health response: $($health | ConvertTo-Json -Compress)"
    }
    catch {
        Write-Host "Health check failed immediately after deploy: $($_.Exception.Message)"
    }

    $encodedWebhook = [System.Uri]::EscapeDataString("$PublicBaseUrl/webhook/$WebhookSecret")
    $webhookSetUrl = "https://api.telegram.org/bot$BotToken/setWebhook?url=$encodedWebhook"
    try {
        $webhookResult = Invoke-RestMethod -Uri $webhookSetUrl -Method Get -TimeoutSec 30
        Write-Host "setWebhook response: $($webhookResult | ConvertTo-Json -Compress)"
    }
    catch {
        Write-Host "Failed to set webhook: $($_.Exception.Message)"
    }

    Write-Host "Smoke test commands: /start /fixtures /today /results /stats /whoami"
}
else {
    Write-Host "Deploy skipped. Run this script again with -Deploy during your allowed window."
}
