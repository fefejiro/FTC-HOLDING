param(
    [string]$Root = (Split-Path -Parent $PSScriptRoot)
)

Add-Type -AssemblyName System.Drawing

$sourceIcon = Join-Path $Root 'store/assets/brand/unascout-master-icon.png'
$sourcePreview = Join-Path $Root 'public/product-preview.png'
$outputRoot = Join-Path $Root 'store/assets/google'
$screenshotsRoot = Join-Path $outputRoot 'phone'
$appleScreenshotsRoot = Join-Path $Root 'store/assets/apple/screenshots/en-US'
New-Item -ItemType Directory -Force -Path $screenshotsRoot | Out-Null
New-Item -ItemType Directory -Force -Path $appleScreenshotsRoot | Out-Null

function New-Brush([string]$hex) {
    return [System.Drawing.SolidBrush]::new([System.Drawing.ColorTranslator]::FromHtml($hex))
}

function Draw-FitImage($graphics, $image, $bounds) {
    $scale = [Math]::Min($bounds.Width / $image.Width, $bounds.Height / $image.Height)
    $width = [int]($image.Width * $scale)
    $height = [int]($image.Height * $scale)
    $x = [int]($bounds.X + (($bounds.Width - $width) / 2))
    $y = [int]($bounds.Y + (($bounds.Height - $height) / 2))
    $graphics.DrawImage($image, $x, $y, $width, $height)
}

function Save-Png($bitmap, [string]$path) {
    $bitmap.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
    $bitmap.Dispose()
}

$icon = [System.Drawing.Image]::FromFile($sourceIcon)
$preview = [System.Drawing.Image]::FromFile($sourcePreview)
$fontFamily = [System.Drawing.FontFamily]::new('Segoe UI')

# Google Play feature graphic: 1024 x 500.
$feature = [System.Drawing.Bitmap]::new(1024, 500)
$g = [System.Drawing.Graphics]::FromImage($feature)
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$g.Clear([System.Drawing.ColorTranslator]::FromHtml('#F4F7F8'))
$g.FillRectangle((New-Brush '#151A1D'), 0, 0, 1024, 18)
$g.FillRectangle((New-Brush '#E84712'), 0, 482, 1024, 18)
$g.DrawImage($icon, 72, 118, 264, 264)
$g.DrawString('UnaScout', [System.Drawing.Font]::new($fontFamily, 54, [System.Drawing.FontStyle]::Bold), (New-Brush '#101820'), 390, 112)
$g.DrawString('AI job search with proof', [System.Drawing.Font]::new($fontFamily, 27, [System.Drawing.FontStyle]::Regular), (New-Brush '#E84712'), 394, 190)
$g.DrawString("Match roles. Tailor truthfully.$([Environment]::NewLine)Track every application.", [System.Drawing.Font]::new($fontFamily, 22, [System.Drawing.FontStyle]::Regular), (New-Brush '#33444A'), [System.Drawing.RectangleF]::new(394, 248, 570, 110))
$g.Dispose()
Save-Png $feature (Join-Path $outputRoot 'feature-graphic-1024x500.png')

$slides = @(
    @{
        File = '01-match-and-track-1080x1920.png'
        Eyebrow = 'YOUR JOB SEARCH, ORGANIZED'
        Title = "Find strong-fit roles$([Environment]::NewLine)and move with clarity."
        Body = 'Explainable matches, tailored packages and proof-backed tracking in one workspace.'
        Accent = '#E84712'
    },
    @{
        File = '02-truthful-tailoring-1080x1920.png'
        Eyebrow = 'BUILT AROUND YOUR EXPERIENCE'
        Title = "Tailor every application$([Environment]::NewLine)without inventing claims."
        Body = 'Use approved career facts, see qualification gaps and prepare grounded interview answers.'
        Accent = '#14845F'
    }
)

foreach ($slide in $slides) {
    $canvas = [System.Drawing.Bitmap]::new(1080, 1920)
    $cg = [System.Drawing.Graphics]::FromImage($canvas)
    $cg.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $cg.Clear([System.Drawing.ColorTranslator]::FromHtml('#F4F7F8'))
    $cg.FillRectangle((New-Brush '#151A1D'), 0, 0, 1080, 28)
    $cg.DrawImage($icon, 74, 92, 128, 128)
    $cg.DrawString('UnaScout', [System.Drawing.Font]::new($fontFamily, 31, [System.Drawing.FontStyle]::Bold), (New-Brush '#101820'), 226, 108)
    $cg.DrawString('by Una Labs', [System.Drawing.Font]::new($fontFamily, 17, [System.Drawing.FontStyle]::Regular), (New-Brush '#53656B'), 230, 160)
    $cg.DrawString($slide.Eyebrow, [System.Drawing.Font]::new($fontFamily, 18, [System.Drawing.FontStyle]::Bold), (New-Brush $slide.Accent), 74, 294)
    $cg.DrawString($slide.Title, [System.Drawing.Font]::new($fontFamily, 49, [System.Drawing.FontStyle]::Bold), (New-Brush '#101820'), [System.Drawing.RectangleF]::new(70, 352, 940, 250))
    $cg.DrawString($slide.Body, [System.Drawing.Font]::new($fontFamily, 23, [System.Drawing.FontStyle]::Regular), (New-Brush '#42545A'), [System.Drawing.RectangleF]::new(74, 626, 910, 150))

    $cg.FillRectangle((New-Brush '#FFFFFF'), 54, 820, 972, 720)
    Draw-FitImage $cg $preview ([System.Drawing.RectangleF]::new(78, 850, 924, 660))
    $cg.FillRectangle((New-Brush $slide.Accent), 54, 1540, 972, 12)

    $cg.FillRectangle((New-Brush '#151A1D'), 0, 1760, 1080, 160)
    $cg.DrawString('Match  |  Tailor  |  Prepare  |  Track', [System.Drawing.Font]::new($fontFamily, 22, [System.Drawing.FontStyle]::Bold), (New-Brush '#FFFFFF'), 164, 1815)
    $cg.Dispose()
    Save-Png $canvas (Join-Path $screenshotsRoot $slide.File)

    # App Store 6.9-inch portrait screenshot: 1290 x 2796.
    $appleCanvas = [System.Drawing.Bitmap]::new(1290, 2796)
    $ag = [System.Drawing.Graphics]::FromImage($appleCanvas)
    $ag.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $ag.Clear([System.Drawing.ColorTranslator]::FromHtml('#F4F7F8'))
    $ag.FillRectangle((New-Brush '#151A1D'), 0, 0, 1290, 34)
    $ag.DrawImage($icon, 88, 116, 154, 154)
    $ag.DrawString('UnaScout', [System.Drawing.Font]::new($fontFamily, 38, [System.Drawing.FontStyle]::Bold), (New-Brush '#101820'), 274, 132)
    $ag.DrawString('by Una Labs', [System.Drawing.Font]::new($fontFamily, 21, [System.Drawing.FontStyle]::Regular), (New-Brush '#53656B'), 279, 197)
    $ag.DrawString($slide.Eyebrow, [System.Drawing.Font]::new($fontFamily, 23, [System.Drawing.FontStyle]::Bold), (New-Brush $slide.Accent), 88, 382)
    $ag.DrawString($slide.Title, [System.Drawing.Font]::new($fontFamily, 60, [System.Drawing.FontStyle]::Bold), (New-Brush '#101820'), [System.Drawing.RectangleF]::new(84, 458, 1122, 330))
    $ag.DrawString($slide.Body, [System.Drawing.Font]::new($fontFamily, 29, [System.Drawing.FontStyle]::Regular), (New-Brush '#42545A'), [System.Drawing.RectangleF]::new(88, 816, 1100, 190))
    $ag.FillRectangle((New-Brush '#FFFFFF'), 64, 1090, 1162, 1155)
    Draw-FitImage $ag $preview ([System.Drawing.RectangleF]::new(94, 1128, 1102, 1075))
    $ag.FillRectangle((New-Brush $slide.Accent), 64, 2245, 1162, 14)
    $ag.FillRectangle((New-Brush '#151A1D'), 0, 2558, 1290, 238)
    $ag.DrawString('Match  |  Tailor  |  Prepare  |  Track', [System.Drawing.Font]::new($fontFamily, 27, [System.Drawing.FontStyle]::Bold), (New-Brush '#FFFFFF'), 197, 2647)
    $ag.Dispose()
    $appleFile = $slide.File.Replace('-1080x1920', '-1290x2796')
    Save-Png $appleCanvas (Join-Path $appleScreenshotsRoot $appleFile)
}

$icon.Dispose()
$preview.Dispose()
Write-Output "Generated Google Play and App Store marketing assets."
