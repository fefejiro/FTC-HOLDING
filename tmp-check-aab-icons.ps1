Add-Type -AssemblyName System.IO.Compression.FileSystem

$tmp = "$env:TEMP\saywetin-aab-check"
$aab = "C:\FTC HOLDING\APPS\saywetin-native\android\app\build\outputs\bundle\release\app-release.aab"

if (Test-Path $tmp) { 
    Remove-Item $tmp -Recurse -Force 
}

Write-Host "Extracting AAB..." -ForegroundColor Cyan
[System.IO.Compression.ZipFile]::ExtractToDirectory($aab, $tmp)

Write-Host "`n=== Drawable directories in bundle ===" -ForegroundColor Green
Get-ChildItem "$tmp\base\res" -Filter 'drawable*' -Directory | ForEach-Object { Write-Host "  $_" }

Write-Host "`n=== Checking for ic_launcher files ===" -ForegroundColor Green
$launchers = Get-ChildItem "$tmp\base\res\drawable*" -Include 'ic_launcher*' -Recurse -ErrorAction SilentlyContinue

if ($launchers.Count -gt 0) {
    Write-Host "FOUND: Icon files present in AAB" -ForegroundColor Yellow
    $launchers | ForEach-Object { 
        Write-Host "  $($_.FullName.Replace($tmp, '...'))" 
    }
} else {
    Write-Host "MISSING: No ic_launcher files found in AAB" -ForegroundColor Red
    Write-Host "This explains why the logo did not update. Icons were not included in bundle." -ForegroundColor Red
}

Write-Host "`n=== All drawable-* contents sample ===" -ForegroundColor Green
Get-ChildItem "$tmp\base\res" -Directory | 
  Where-Object { $_.Name -match "drawable" } | 
  ForEach-Object {
    $count = @(Get-ChildItem $_.FullName -File).Count
    Write-Host "  $($_.Name): $count files"
  }
