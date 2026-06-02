Add-Type -AssemblyName System.Drawing

function Create-AppIcon ($size, $outputPath) {
    # Create bitmap
    $bmp = New-Object System.Drawing.Bitmap($size, $size)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    
    # Enable anti-aliasing & high quality settings
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    
    # Scale coordinates based on size (original grid is 100x100)
    $scale = $size / 100.0
    
    # 1. Background Gradient Circle
    # Outer circle is centered at 50,50 with radius 45, meaning bounds are (5, 5, 90, 90)
    $rect = New-Object System.Drawing.RectangleF((5 * $scale), (5 * $scale), (90 * $scale), (90 * $scale))
    
    # Colors
    $colorStart = [System.Drawing.ColorTranslator]::FromHtml("#f27d52")
    $colorEnd = [System.Drawing.ColorTranslator]::FromHtml("#f9b26c")
    
    # Diagonal gradient
    $pStart = New-Object System.Drawing.PointF(0, 0)
    $pEnd = New-Object System.Drawing.PointF($size, $size)
    $gradBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush($pStart, $pEnd, $colorStart, $colorEnd)
    
    # Fill background circle
    $g.FillEllipse($gradBrush, $rect)
    
    # 2. White Journal Center Shape (approximate the SVG path: lens shape centered at 50, 45 with w=40, h=23)
    $whiteBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(230, [System.Drawing.Color]::White)) # opacity 0.9
    $lensRect = New-Object System.Drawing.RectangleF((30 * $scale), (33.75 * $scale), (40 * $scale), (22.5 * $scale))
    $g.FillEllipse($whiteBrush, $lensRect)
    
    # 3. Eyes (terracotta color, centered at 43,42 and 57,42 with r=3)
    $eyeBrush = New-Object System.Drawing.SolidBrush($colorStart)
    $eyeLeft = New-Object System.Drawing.RectangleF(((43 - 3) * $scale), ((42 - 3) * $scale), (6 * $scale), (6 * $scale))
    $eyeRight = New-Object System.Drawing.RectangleF(((57 - 3) * $scale), ((42 - 3) * $scale), (6 * $scale), (6 * $scale))
    $g.FillEllipse($eyeBrush, $eyeLeft)
    $g.FillEllipse($eyeBrush, $eyeRight)
    
    # 4. Smile (terracotta color, stroke width 2.5)
    $pen = New-Object System.Drawing.Pen($colorStart, (2.5 * $scale))
    $pen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
    $pen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
    
    # Draw arc from angle 0 to 180 for the bottom half of a small circle
    # Center is around (50, 47), width is 8, height is 6
    $smileRect = New-Object System.Drawing.RectangleF((46 * $scale), (47 * $scale), (8 * $scale), (6 * $scale))
    $g.DrawArc($pen, $smileRect, 0, 180)
    
    # Clean up
    $pen.Dispose()
    $eyeBrush.Dispose()
    $whiteBrush.Dispose()
    $gradBrush.Dispose()
    $g.Dispose()
    
    # Save bitmap
    $bmp.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose()
    Write-Host "Created icon: $outputPath ($size x $size)"
}

# Get current script path
$currentDir = $PSScriptRoot
if ([string]::IsNullOrEmpty($currentDir)) { $currentDir = "." }

Create-AppIcon 192 "$currentDir\icon-192.png"
Create-AppIcon 512 "$currentDir\icon-512.png"
