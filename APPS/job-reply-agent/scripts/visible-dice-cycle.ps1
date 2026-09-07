param(
  [int]$Limit = 15
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$outDir = Join-Path $root ".local\visible-dice"
New-Item -ItemType Directory -Path $outDir -Force | Out-Null

$queries = @(
  "remote IT manager retail systems",
  "remote service delivery manager",
  "remote business systems manager ERP",
  "remote ERP transformation manager",
  "remote WMS POS program manager",
  "remote QA manager retail systems",
  "program manager enterprise systems",
  "business systems analyst ERP"
)

Push-Location $root
try {
  foreach ($query in $queries) {
    $slug = ($query -replace '[^a-zA-Z0-9]+','-').Trim('-').ToLowerInvariant()
    $stamp = Get-Date -Format "yyyyMMdd-HHmmss"
    $url = "https://www.dice.com/jobs?q=$([uri]::EscapeDataString($query))&page=1&pageSize=20&language=en"
    $out = Join-Path $outDir "$stamp-$slug.json"
    python scripts\visible_chrome_dom_dump.py --url $url --out $out --wait 8
    if ($LASTEXITCODE -ne 0 -or -not (Test-Path -LiteralPath $out)) {
      Write-Warning "Skipping Dice ingest for '$query' because the visible DOM dump failed."
      continue
    }
    npx tsx scripts\ingest-visible-dice.ts --file=$out
  }

  npm run hunt:score -- --source=dice
  npm run hunt:package -- --source=dice
  npm run hunt:premium-queue -- --source=dice --limit=$Limit
} finally {
  Pop-Location
}
