param(
  [int]$Limit = 10
)

$ErrorActionPreference = "Stop"
$root = "C:\FTC HOLDING\APPS\job-reply-agent"
$outDir = Join-Path $root ".local\visible-indeed"
New-Item -ItemType Directory -Path $outDir -Force | Out-Null

$queries = @(
  "remote technical program manager ERP",
  "remote business systems analyst",
  "remote service delivery manager",
  "remote ERP transformation manager",
  "remote WMS POS program manager",
  "remote product operations manager"
)

Push-Location $root
try {
  foreach ($query in $queries) {
    $slug = ($query -replace '[^a-zA-Z0-9]+','-').Trim('-').ToLowerInvariant()
    $stamp = Get-Date -Format "yyyyMMdd-HHmmss"
    $url = "https://ca.indeed.com/jobs?q=$([uri]::EscapeDataString($query))&l=Remote&sc=0kf%3Aattr%28DSQF7%29%3B&fromage=7&sort=date"
    $out = Join-Path $outDir "$stamp-$slug.json"
    python scripts\visible_chrome_dom_dump.py --url $url --out $out --wait 8
    if ($LASTEXITCODE -ne 0 -or -not (Test-Path -LiteralPath $out)) {
      Write-Warning "Skipping Indeed ingest for '$query' because the visible DOM dump failed."
      continue
    }
    npx tsx scripts\ingest-visible-indeed.ts --file=$out
  }

  npm run hunt:score -- --source=indeed
  npm run hunt:package -- --source=indeed
  npm run hunt:premium-queue -- --source=indeed --limit=$Limit
} finally {
  Pop-Location
}
