param(
  [int]$Limit = 10
)

$ErrorActionPreference = "Stop"
$root = "C:\FTC HOLDING\APPS\job-reply-agent"
$outDir = Join-Path $root ".local\visible-monster"
New-Item -ItemType Directory -Path $outDir -Force | Out-Null

$queries = @(
  "remote business systems analyst",
  "remote IT project manager ERP",
  "remote WMS consultant",
  "remote ERP implementation manager",
  "remote retail systems manager",
  "remote service delivery manager"
)

Push-Location $root
try {
  foreach ($query in $queries) {
    $slug = ($query -replace '[^a-zA-Z0-9]+','-').Trim('-').ToLowerInvariant()
    $stamp = Get-Date -Format "yyyyMMdd-HHmmss"
    $url = "https://www.monster.com/jobs/search?q=$([uri]::EscapeDataString($query))&where=Remote"
    $out = Join-Path $outDir "$stamp-$slug.json"
    python scripts\visible_chrome_dom_dump.py --url $url --out $out --wait 8
    if ($LASTEXITCODE -ne 0 -or -not (Test-Path -LiteralPath $out)) {
      Write-Warning "Skipping Monster ingest for '$query' because the visible DOM dump failed."
      continue
    }
    npx tsx scripts\ingest-visible-monster.ts --file=$out
  }

  npm run hunt:score -- --source=monster
  npm run hunt:package -- --source=monster
  npm run hunt:premium-queue -- --source=monster --limit=$Limit
} finally {
  Pop-Location
}
