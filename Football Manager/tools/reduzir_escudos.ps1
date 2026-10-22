# Encolhe os escudos de Assets/Escudos para no maximo 160 px (PNG com transparencia) e converte gif/jpg que tenham sido gravados com extensao .png.
#   powershell -ExecutionPolicy Bypass -File tools\reduzir_escudos.ps1 [-Max 160]
param([int]$Max = 160)
Add-Type -AssemblyName System.Drawing
$dir = Join-Path (Split-Path $PSScriptRoot -Parent) 'Assets\Escudos'
$feitos = 0; $erros = 0
Get-ChildItem -Path $dir -Filter *.png | ForEach-Object {
    try {
        $bytes = [System.IO.File]::ReadAllBytes($_.FullName)
        $ms = New-Object System.IO.MemoryStream(, $bytes)
        $img = [System.Drawing.Image]::FromStream($ms)
        $ePng = ($bytes[0] -eq 0x89 -and $bytes[1] -eq 0x50)
        $maior = [Math]::Max($img.Width, $img.Height)
        if ($maior -le $Max -and $ePng) { $img.Dispose(); $ms.Dispose(); return }
        $esc = [Math]::Min(1.0, $Max / $maior)
        $w = [int][Math]::Max(1, [Math]::Round($img.Width * $esc)); $h = [int][Math]::Max(1, [Math]::Round($img.Height * $esc))
        $bmp = New-Object System.Drawing.Bitmap($w, $h, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
        $g = [System.Drawing.Graphics]::FromImage($bmp)
        $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
        $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
        $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
        $g.Clear([System.Drawing.Color]::Transparent)
        $g.DrawImage($img, 0, 0, $w, $h)
        $g.Dispose(); $img.Dispose(); $ms.Dispose()
        $tmp = $_.FullName + '.tmp'
        $bmp.Save($tmp, [System.Drawing.Imaging.ImageFormat]::Png); $bmp.Dispose()
        Move-Item -Force $tmp $_.FullName
        $feitos++
    } catch { $erros++; Write-Host ('ERRO ' + $_.Name + ': ' + $_.Exception.Message) }
}
Write-Host "Reduzidos/convertidos: $feitos; erros: $erros"
