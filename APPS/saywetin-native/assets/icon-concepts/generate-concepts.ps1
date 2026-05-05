$ErrorActionPreference = "Stop"
$out = "C:\FTC HOLDING\APPS\saywetin-native\assets\icon-concepts"
New-Item -ItemType Directory -Path $out -Force | Out-Null
Add-Type -AssemblyName System.Drawing
Add-Type -AssemblyName System.Drawing.Drawing2D

function New-Bitmap($size) {
    $bmp = New-Object System.Drawing.Bitmap($size, $size)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
    return @{ Bmp = $bmp; G = $g }
}

$size = 1024
$cx = $size / 2
$cy = $size / 2
$rect = New-Object System.Drawing.Rectangle(0, 0, $size, $size)

# ============== CONCEPT A: Aurora Monogram SW ==============
$ctx = New-Bitmap $size
$g = $ctx.G

$brushBg = New-Object System.Drawing.Drawing2D.LinearGradientBrush($rect, `
    [System.Drawing.Color]::FromArgb(255, 36, 18, 78), `
    [System.Drawing.Color]::FromArgb(255, 8, 6, 22), 45.0)
$g.FillRectangle($brushBg, $rect)
$brushBg.Dispose()

$glow = New-Object System.Drawing.Drawing2D.GraphicsPath
$glow.AddEllipse(-200, -200, 900, 900)
$pgb = New-Object System.Drawing.Drawing2D.PathGradientBrush($glow)
$pgb.CenterColor = [System.Drawing.Color]::FromArgb(110, 140, 90, 230)
$pgb.SurroundColors = , ([System.Drawing.Color]::FromArgb(0, 36, 18, 78))
$g.FillPath($pgb, $glow)
$pgb.Dispose(); $glow.Dispose()

$diameters = @(820, 660, 520)
$alphas = @(50, 80, 140)
for ($i = 0; $i -lt 3; $i++) {
    $col = [System.Drawing.Color]::FromArgb($alphas[$i], 240, 200, 120)
    $pen = New-Object System.Drawing.Pen($col, 2)
    $d = $diameters[$i]
    $g.DrawEllipse($pen, $cx - $d / 2, $cy - $d / 2, $d, $d)
    $pen.Dispose()
}

$gold = [System.Drawing.Color]::FromArgb(255, 245, 210, 135)
$brushGold = New-Object System.Drawing.SolidBrush($gold)
$font = New-Object System.Drawing.Font("Georgia", 460, [System.Drawing.FontStyle]::Italic, [System.Drawing.GraphicsUnit]::Pixel)
$sf = New-Object System.Drawing.StringFormat
$sf.Alignment = [System.Drawing.StringAlignment]::Center
$sf.LineAlignment = [System.Drawing.StringAlignment]::Center
$g.DrawString("SW", $font, $brushGold, (New-Object System.Drawing.RectangleF(0, -20, $size, $size)), $sf)
$font.Dispose(); $brushGold.Dispose()

$ctx.Bmp.Save("$out\concept-A-aurora-sw.png", [System.Drawing.Imaging.ImageFormat]::Png)
$g.Dispose(); $ctx.Bmp.Dispose()
Write-Host "Saved concept A"

# ============== CONCEPT B: Ember Pulse ==============
$ctx = New-Bitmap $size
$g = $ctx.G

$brushBg = New-Object System.Drawing.Drawing2D.LinearGradientBrush($rect, `
    [System.Drawing.Color]::FromArgb(255, 248, 180, 70), `
    [System.Drawing.Color]::FromArgb(255, 168, 50, 30), 90.0)
$g.FillRectangle($brushBg, $rect)
$brushBg.Dispose()

$glow = New-Object System.Drawing.Drawing2D.GraphicsPath
$glow.AddEllipse(-100, -200, 700, 700)
$pgb = New-Object System.Drawing.Drawing2D.PathGradientBrush($glow)
$pgb.CenterColor = [System.Drawing.Color]::FromArgb(140, 255, 240, 200)
$pgb.SurroundColors = , ([System.Drawing.Color]::FromArgb(0, 248, 180, 70))
$g.FillPath($pgb, $glow)
$pgb.Dispose(); $glow.Dispose()

$dotColor = [System.Drawing.Color]::FromArgb(255, 16, 14, 38)
$dotBrush = New-Object System.Drawing.SolidBrush($dotColor)
$dotSize = 110
$g.FillEllipse($dotBrush, $cx - $dotSize / 2, $cy - $dotSize / 2, $dotSize, $dotSize)
$dotBrush.Dispose()

$pen2 = New-Object System.Drawing.Pen($dotColor, 28)
$pen2.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
$pen2.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
$arcDiameters = @(280, 460, 640)
foreach ($d in $arcDiameters) {
    $g.DrawArc($pen2, $cx - $d / 2, $cy - $d / 2, $d, $d, -55, 110)
}
$pen2.Dispose()

$ctx.Bmp.Save("$out\concept-B-ember-pulse.png", [System.Drawing.Imaging.ImageFormat]::Png)
$g.Dispose(); $ctx.Bmp.Dispose()
Write-Host "Saved concept B"

Get-ChildItem $out -Filter *.png | Format-Table Name, Length -AutoSize
