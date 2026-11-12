"""As cores mais presentes do escudo de cada clube de um grupo de tools/gerar_ligas_sav.cjs, lidas dos escudos do MOD.

    python tools/ligas_sav/cores_escudos.py <grupo> <id do pais> [<id do pais> ...] [--mod "Z:/FootManager3D/mod"]
    ex.: python tools/ligas_sav/cores_escudos.py mex_usa_jpn 90 91 92

Grava tools/ligas_sav/<grupo>/cores_escudos.json: { id: [[cor, fracao], ...] } (so ids e cores; nenhum nome). O gerador usa-o para rever as cores do equipamento:
a cor do ficheiro fica se aparecer no escudo; se nao aparecer, entra a cor do escudo. Clube do pais P = id // 10000 == P.
"""
import json, os, sys
from PIL import Image

args = sys.argv[1:]
MOD = args[args.index('--mod') + 1] if '--mod' in args else 'Z:/FootManager3D/mod'
pos = [a for i, a in enumerate(args) if not a.startswith('--') and (i == 0 or args[i - 1] != '--mod')]
GRUPO, PAISES = pos[0], {int(x) for x in pos[1:]}
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), GRUPO, 'cores_escudos.json')

def cores(path, k=8):
    im = Image.open(path).convert('RGBA'); im.thumbnail((96, 96))
    px = [p[:3] for p in im.getdata() if p[3] > 200]
    if not px: return []
    rgb = Image.new('RGB', (len(px), 1)); rgb.putdata(px)
    q = rgb.quantize(colors=k, method=Image.Quantize.MEDIANCUT)
    pal = q.getpalette()[:3 * k]
    cont = sorted(q.getcolors(), reverse=True)
    tot = sum(c for c, _ in cont)
    return [['#%02x%02x%02x' % tuple(pal[3 * i:3 * i + 3]), round(c / tot, 3)] for c, i in cont if c / tot >= 0.03]

out = {}
for f in sorted(os.listdir(os.path.join(MOD, 'escudos'))):
    n = os.path.splitext(f)[0]
    if n.isdigit() and int(n) // 10000 in PAISES: out[n] = cores(os.path.join(MOD, 'escudos', f))
json.dump(out, open(OUT, 'w', encoding='utf-8', newline='\n'), indent=0)
print(len(out), 'escudos ->', OUT)
