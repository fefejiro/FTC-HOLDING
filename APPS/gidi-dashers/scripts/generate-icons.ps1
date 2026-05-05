Add-Type -AssemblyName System.Drawing

$root = Split-Path -Parent $PSScriptRoot
if (-not $root) { $root = (Get-Location).Path }
$publicDir = Join-Path $root "public"
$iconsDir = Join-Path $publicDir "icons"
if (-not (Test-Path $publicDir)) { New-Item -ItemType Directory -Path $publicDir -Force | Out-Null }
if (-not (Test-Path $iconsDir)) { New-Item -ItemType Directory -Path $iconsDir -Force | Out-Null }

function New-GidiIcon {
    param([int]$size, [string]$outPath, [bool]$maskable)

    $bmp = New-Object System.Drawing.Bitmap($size, $size)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAlias

    $g.Clear([System.Drawing.Color]::FromArgb(255, 10, 10, 10))

    $padPct = if ($maskable) { 0.10 } else { 0.04 }
    [int]$padding = [Math]::Floor($size * $padPct)
    [int]$inner = $size - ($padding * 2)
    [int]$r = [Math]::Floor($inner * 0.22)

    $plate = New-Object System.Drawing.Drawing2D.GraphicsPath
    $plate.AddArc($padding, $padding, $r, $r, 180, 90)
    $plate.AddArc($padding + $inner - $r, $padding, $r, $r, 270, 90)
    $plate.AddArc($padding + $inner - $r, $padding + $inner - $r, $r, $r, 0, 90)
    $plate.AddArc($padding, $padding + $inner - $r, $r, $r, 90, 90)
    $plate.CloseFigure()

    $brush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 255, 210, 63))
    $g.FillPath($brush, $plate)

    [int]$fontSize = [Math]::Floor($inner * 0.62)
    $font = New-Object System.Drawing.Font "Arial Black", ([single]$fontSize), ([System.Drawing.FontStyle]::Bold), ([System.Drawing.GraphicsUnit]::Pixel)
    $textBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 10, 10, 10))
    $sf = New-Object System.Drawing.StringFormat
    $sf.Alignment = [System.Drawing.StringAlignment]::Center
    $sf.LineAlignment = [System.Drawing.StringAlignment]::Center

    [single]$rx = [single]$padding
    [single]$ry = [single]($padding - ($inner * 0.04))
    [single]$rw = [single]$inner
    [single]$rh = [single]$inner
    $rectF = New-Object System.Drawing.RectangleF -ArgumentList $rx, $ry, $rw, $rh
    $naira = [string][char]0x20A6
    $g.DrawString($naira, $font, $textBrush, $rectF, $sf)

    $bmp.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $g.Dispose(); $bmp.Dispose(); $brush.Dispose(); $textBrush.Dispose(); $font.Dispose(); $plate.Dispose()
    Write-Host "Wrote $outPath ($size x $size, maskable=$maskable)"
}

New-GidiIcon -size 192 -outPath (Join-Path $publicDir "icon-192.png") -maskable $false
New-GidiIcon -size 512 -outPath (Join-Path $publicDir "icon-512.png") -maskable $false
New-GidiIcon -size 512 -outPath (Join-Path $iconsDir "icon-512.png") -maskable $false
New-GidiIcon -size 512 -outPath (Join-Path $iconsDir "maskable-512.png") -maskable $true
