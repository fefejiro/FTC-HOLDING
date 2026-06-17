param(
  [Parameter(Mandatory = $false)]
  [string] $ZoneName = "peacepad.ca",

  [Parameter(Mandatory = $false)]
  [string] $ApiRecordName = "api.peacepad.ca",

  [Parameter(Mandatory = $false)]
  [string] $RailwayTarget = "qzw9nso8.up.railway.app",

  [Parameter(Mandatory = $false)]
  [string] $RailwayVerifyName = "_railway-verify.api.peacepad.ca",

  [Parameter(Mandatory = $false)]
  [string] $RailwayVerifyValue = "",

  [Parameter(Mandatory = $false)]
  [string] $Token = $env:CLOUDFLARE_API_TOKEN
)

$ErrorActionPreference = "Stop"

if ([string]::IsNullOrWhiteSpace($Token)) {
  throw "Set CLOUDFLARE_API_TOKEN first. Example: `$env:CLOUDFLARE_API_TOKEN = 'paste-token-here'"
}

$headers = @{
  Authorization = "Bearer $Token"
  "Content-Type" = "application/json"
}

function Invoke-Cf {
  param(
    [Parameter(Mandatory = $true)][string] $Method,
    [Parameter(Mandatory = $true)][string] $Uri,
    [Parameter(Mandatory = $false)] $Body
  )

  $params = @{
    Method = $Method
    Uri = $Uri
    Headers = $headers
  }

  if ($null -ne $Body) {
    $params.Body = ($Body | ConvertTo-Json -Depth 10)
  }

  $response = Invoke-RestMethod @params
  if (-not $response.success) {
    $errors = ($response.errors | ConvertTo-Json -Depth 10)
    throw "Cloudflare API call failed: $errors"
  }
  return $response.result
}

function Upsert-DnsRecord {
  param(
    [Parameter(Mandatory = $true)][string] $ZoneId,
    [Parameter(Mandatory = $true)][string] $Type,
    [Parameter(Mandatory = $true)][string] $Name,
    [Parameter(Mandatory = $true)][string] $Content,
    [Parameter(Mandatory = $false)][bool] $Proxied = $false
  )

  $encodedName = [System.Uri]::EscapeDataString($Name)
  $records = @(Invoke-Cf -Method "GET" -Uri "https://api.cloudflare.com/client/v4/zones/$ZoneId/dns_records?name=$encodedName")

  foreach ($record in $records) {
    if ($record.type -ne $Type) {
      Write-Host "Deleting conflicting $($record.type) $Name -> $($record.content)"
      Invoke-Cf -Method "DELETE" -Uri "https://api.cloudflare.com/client/v4/zones/$ZoneId/dns_records/$($record.id)" | Out-Null
    }
  }

  $records = @(Invoke-Cf -Method "GET" -Uri "https://api.cloudflare.com/client/v4/zones/$ZoneId/dns_records?name=$encodedName&type=$Type")
  $body = @{
    type = $Type
    name = $Name
    content = $Content
    ttl = 1
    proxied = $Proxied
  }

  if ($records.Count -gt 0) {
    Write-Host "Updating $Type $Name -> $Content"
    Invoke-Cf -Method "PATCH" -Uri "https://api.cloudflare.com/client/v4/zones/$ZoneId/dns_records/$($records[0].id)" -Body $body | Out-Null
    return
  }

  Write-Host "Creating $Type $Name -> $Content"
  Invoke-Cf -Method "POST" -Uri "https://api.cloudflare.com/client/v4/zones/$ZoneId/dns_records" -Body $body | Out-Null
}

$encodedZone = [System.Uri]::EscapeDataString($ZoneName)
$zones = @(Invoke-Cf -Method "GET" -Uri "https://api.cloudflare.com/client/v4/zones?name=$encodedZone")
if ($zones.Count -lt 1) {
  throw "Cloudflare zone not found: $ZoneName"
}

$zoneId = $zones[0].id
Write-Host "Using Cloudflare zone $ZoneName ($zoneId)"

Upsert-DnsRecord -ZoneId $zoneId -Type "CNAME" -Name $ApiRecordName -Content $RailwayTarget -Proxied $false

if (-not [string]::IsNullOrWhiteSpace($RailwayVerifyValue)) {
  Upsert-DnsRecord -ZoneId $zoneId -Type "TXT" -Name $RailwayVerifyName -Content $RailwayVerifyValue -Proxied $false
} else {
  Write-Warning "RailwayVerifyValue was not provided. CNAME was repaired, but Railway domain verification may still need the TXT record from the Railway popup."
}

Write-Host "DNS repair request completed. Checking public resolution..."
nslookup $ApiRecordName
nslookup -type=txt $RailwayVerifyName
