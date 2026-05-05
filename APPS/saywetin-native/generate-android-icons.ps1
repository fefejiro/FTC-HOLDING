[System.Reflection.Assembly]::LoadWithPartialName("System.Drawing") | Out-Null

$iconPath = "assets/icon.png"
$basePath = "android/app/src/main/res"

$densities = @{
    "drawable-ldpi"   = 36
    "drawable-mdpi"   = 48
    "drawable-hdpi"   = 72
    "drawable-xhdpi"  = 96
    "drawable-xxhdpi" = 144
    "drawable-xxxhdpi" = 192
}

Write-Host "Generating Android launcher icons from: $iconPath" -ForegroundColor Cyan

if (-not (Test-Path $iconPath)) {
    Write-Host "ERROR: Icon file not found at $iconPath" -ForegroundColor Red
    exit 1
}

$sourceImage = [System.Drawing.Image]::FromFile((Resolve-Path $iconPath).Path)
Write-Host "Source icon: $($sourceImage.Width)x$($sourceImage.Height)" -ForegroundColor Yellow

foreach ($density in $densities.GetEnumerator()) {
    $densityName = $density.Key
    $size = $density.Value
    $destDir = Join-Path $basePath $densityName
    
    if (-not (Test-Path $destDir)) {
        New-Item -ItemType Directory -Path $destDir -Force | Out-Null
    }
    
    $destFile = Join-Path $destDir "ic_launcher.png"
    
    # Create resized bitmap
    $bitmap = New-Object System.Drawing.Bitmap($size, $size)
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $graphics.DrawImage($sourceImage, 0, 0, $size, $size)
    $graphics.Dispose()
    
    $bitmap.Save($destFile)
    $bitmap.Dispose()
    
    Write-Host "  * $densityName (${size}x${size}): $destFile" -ForegroundColor Green
}

$sourceImage.Dispose()
Write-Host "`nIcon generation complete!" -ForegroundColor Green
