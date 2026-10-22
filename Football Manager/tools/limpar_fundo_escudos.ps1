# Torna TRANSPARENTE o fundo solido em volta dos escudos (Assets/Escudos): enche a partir das bordas as zonas da cor do fundo (a cor dos cantos) e poe-nas transparentes.
#   -Listar            so mostra os escudos com os 4 cantos opacos e da mesma cor (os candidatos), sem mexer em nada
#   -Nomes "A","B"     arranja so estes (nome do clube, sem .png)
#   -Todos             arranja todos os candidatos
#   -Branco            (com -Nomes) fundo BRANCO ou quase, mesmo semitransparente ou so em parte da borda (o caso mais comum nos escudos baixados); -TolBranco 22 = quao proximo do branco
#   -Tolerancia 40     quanto uma cor pode diferir do fundo (0-255, por canal) para contar como fundo; mais baixo = mais cuidado com escudos com branco
# O original fica em Assets/Escudos/_originais/ (so a 1.a vez), para desfazer.
param([switch]$Listar, [string[]]$Nomes, [switch]$Todos, [int]$Tolerancia = 40, [switch]$Branco, [int]$TolBranco = 22)
Add-Type -AssemblyName System.Drawing
Add-Type -TypeDefinition @"
using System; using System.Drawing; using System.Drawing.Imaging; using System.Collections.Generic;
public static class FundoEscudo {
    static int Dist(byte[] p, int i, int r, int g, int b) { return Math.Max(Math.Abs(p[i+2]-r), Math.Max(Math.Abs(p[i+1]-g), Math.Abs(p[i]-b))); }
    // Devolve null se nao parece ter fundo solido; senao a cor {r,g,b} dos cantos.
    public static int[] CorDoFundo(Bitmap bmp) {
        int w = bmp.Width, h = bmp.Height; int[] xs = {0, w-1, 0, w-1}; int[] ys = {0, 0, h-1, h-1};
        int[] c = null;
        for (int k = 0; k < 4; k++) {
            Color p = bmp.GetPixel(xs[k], ys[k]);
            if (p.A < 250) return null;
            if (c == null) c = new int[]{p.R, p.G, p.B};
            else if (Math.Abs(p.R-c[0]) > 24 || Math.Abs(p.G-c[1]) > 24 || Math.Abs(p.B-c[2]) > 24) return null;
        }
        return c;
    }
    // Fundo BRANCO (ou quase) mesmo semitransparente e/ou so em parte da borda: parte de TODO o pixel da borda que seja quase branco (todos os canais >= 255-tol) ou ja transparente e
    // enche por pixeis quase brancos ligados a ele. Um escudo com branco por dentro nao perde o branco enquanto o contorno o separar da borda.
    public static int LimparBranco(Bitmap bmp, int tol) {
        int w = bmp.Width, h = bmp.Height; int lim = 255 - tol;
        BitmapData d = bmp.LockBits(new Rectangle(0,0,w,h), ImageLockMode.ReadWrite, PixelFormat.Format32bppArgb);
        int n = Math.Abs(d.Stride) * h; byte[] p = new byte[n]; System.Runtime.InteropServices.Marshal.Copy(d.Scan0, p, 0, n);
        int stride = d.Stride; bool[] visto = new bool[w*h]; Stack<int> pilha = new Stack<int>(); int tirados = 0;
        Func<int,bool> branco = (i) => p[i+3] == 0 || (p[i] >= lim && p[i+1] >= lim && p[i+2] >= lim);
        Action<int,int> tenta = (x, y) => { if (x<0||y<0||x>=w||y>=h) return; int id = y*w+x; if (visto[id]) return; visto[id] = true; if (branco(y*stride + x*4)) pilha.Push(id); };
        for (int x = 0; x < w; x++) { tenta(x, 0); tenta(x, h-1); }
        for (int y = 0; y < h; y++) { tenta(0, y); tenta(w-1, y); }
        while (pilha.Count > 0) {
            int id = pilha.Pop(); int x = id % w, y = id / w; int i = y*stride + x*4;
            if (p[i+3] != 0) { p[i+3] = 0; tirados++; }
            tenta(x+1,y); tenta(x-1,y); tenta(x,y+1); tenta(x,y-1);
        }
        // Halo: pixeis opacos junto ao transparente e ainda claros ficam mais transparentes (2 passagens).
        for (int pass = 0; pass < 2; pass++)
            for (int y = 1; y < h-1; y++) for (int x = 1; x < w-1; x++) {
                int i = y*stride + x*4; if (p[i+3] == 0) continue;
                bool viz = p[i-4+3]==0 || p[i+4+3]==0 || p[i-stride+3]==0 || p[i+stride+3]==0;
                if (viz && p[i] >= lim - 25 && p[i+1] >= lim - 25 && p[i+2] >= lim - 25) p[i+3] = (byte)(p[i+3] / 3);
            }
        System.Runtime.InteropServices.Marshal.Copy(p, 0, d.Scan0, n); bmp.UnlockBits(d);
        return tirados;
    }
    public static int Limpar(Bitmap bmp, int[] cor, int tol) {
        int w = bmp.Width, h = bmp.Height;
        BitmapData d = bmp.LockBits(new Rectangle(0,0,w,h), ImageLockMode.ReadWrite, PixelFormat.Format32bppArgb);
        int n = Math.Abs(d.Stride) * h; byte[] p = new byte[n]; System.Runtime.InteropServices.Marshal.Copy(d.Scan0, p, 0, n);
        int stride = d.Stride; bool[] visto = new bool[w*h]; Stack<int> pilha = new Stack<int>(); int tirados = 0;
        Action<int,int> tenta = (x, y) => { if (x<0||y<0||x>=w||y>=h) return; int id = y*w+x; if (visto[id]) return; visto[id] = true;
            int i = y*stride + x*4; if (p[i+3] == 0) { pilha.Push(id); return; } if (Dist(p, i, cor[0], cor[1], cor[2]) <= tol) pilha.Push(id); };
        for (int x = 0; x < w; x++) { tenta(x, 0); tenta(x, h-1); }
        for (int y = 0; y < h; y++) { tenta(0, y); tenta(w-1, y); }
        while (pilha.Count > 0) {
            int id = pilha.Pop(); int x = id % w, y = id / w; int i = y*stride + x*4;
            if (p[i+3] != 0) { p[i+3] = 0; tirados++; }
            tenta(x+1,y); tenta(x-1,y); tenta(x,y+1); tenta(x,y-1);
        }
        // Suaviza o contorno: pixeis opacos vizinhos de transparentes e ainda quase da cor do fundo ficam semitransparentes (tira o "halo" branco).
        for (int y = 1; y < h-1; y++) for (int x = 1; x < w-1; x++) {
            int i = y*stride + x*4; if (p[i+3] == 0) continue;
            bool viz = p[i-4+3]==0 || p[i+4+3]==0 || p[i-stride+3]==0 || p[i+stride+3]==0;
            if (viz && Dist(p, i, cor[0], cor[1], cor[2]) <= tol * 2) p[i+3] = (byte)(p[i+3] / 3);
        }
        System.Runtime.InteropServices.Marshal.Copy(p, 0, d.Scan0, n); bmp.UnlockBits(d);
        return tirados;
    }
}
"@ -ReferencedAssemblies System.Drawing
$dir = Join-Path (Split-Path $PSScriptRoot -Parent) 'Assets\Escudos'
$orig = Join-Path $dir '_originais'
$arquivos = if ($Nomes) { $Nomes | ForEach-Object { Get-Item -LiteralPath (Join-Path $dir ($_ + '.png')) } } else { Get-ChildItem -Path $dir -Filter *.png }
$cand = 0; $feitos = 0
foreach ($f in $arquivos) {
    $ms = New-Object System.IO.MemoryStream(, [System.IO.File]::ReadAllBytes($f.FullName))
    $img = [System.Drawing.Image]::FromStream($ms)
    $bmp = New-Object System.Drawing.Bitmap($img.Width, $img.Height, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g = [System.Drawing.Graphics]::FromImage($bmp); $g.DrawImage($img, 0, 0, $img.Width, $img.Height); $g.Dispose(); $img.Dispose(); $ms.Dispose()
    if ($Branco -and $Nomes) {
        if (-not (Test-Path $orig)) { New-Item -ItemType Directory -Path $orig | Out-Null }
        if (-not (Test-Path (Join-Path $orig $f.Name))) { Copy-Item -LiteralPath $f.FullName -Destination (Join-Path $orig $f.Name) }
        $t = [FundoEscudo]::LimparBranco($bmp, $TolBranco)
        $tmp = $f.FullName + '.tmp'; $bmp.Save($tmp, [System.Drawing.Imaging.ImageFormat]::Png); $bmp.Dispose(); Move-Item -Force $tmp $f.FullName
        $feitos++; Write-Host ('{0}: {1} pixeis do fundo' -f $f.BaseName, $t); continue
    }
    $cor = [FundoEscudo]::CorDoFundo($bmp)
    if ($cor -eq $null) { $bmp.Dispose(); continue }
    $cand++
    if ($Listar) { Write-Host ('{0}  fundo rgb({1},{2},{3})' -f $f.BaseName, $cor[0], $cor[1], $cor[2]); $bmp.Dispose(); continue }
    if (-not ($Todos -or $Nomes)) { $bmp.Dispose(); continue }
    if (-not (Test-Path $orig)) { New-Item -ItemType Directory -Path $orig | Out-Null }
    if (-not (Test-Path (Join-Path $orig $f.Name))) { Copy-Item -LiteralPath $f.FullName -Destination (Join-Path $orig $f.Name) }
    $t = [FundoEscudo]::Limpar($bmp, $cor, $Tolerancia)
    $tmp = $f.FullName + '.tmp'; $bmp.Save($tmp, [System.Drawing.Imaging.ImageFormat]::Png); $bmp.Dispose(); Move-Item -Force $tmp $f.FullName
    $feitos++; Write-Host ('{0}: {1} pixeis do fundo' -f $f.BaseName, $t)
}
Write-Host ("Candidatos (fundo solido nos 4 cantos): $cand; arranjados: $feitos")
