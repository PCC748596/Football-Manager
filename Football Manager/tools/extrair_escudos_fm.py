"""Extrai os escudos dos clubes do FIFA Manager para o MOD (nunca para o jogo).

    python tools/extrair_escudos_fm.py 83 95 163 [--fm "Z:/Games/Fifa Manager 26"] [--mod "Z:/FootManager3D/mod"] [--refazer]

Para cada CountryData<N>.json do mod (local-data/, com `gameTeamId`) procura o escudo do clube pelo id interno do .sav (a 5.a linha do bloco %INDEX%CLUB, em hexadecimal com 8
digitos: o nome do ficheiro .tga). Ordem: badges/clubs/256x256/ solto (as actualizacoes) e depois o arquivo art_badges.big (formato BIGF da EA).
Grava <mod>/escudos/<gameTeamId>.png (recortado a volta do desenho, no maximo 160 px, com transparencia, como os outros escudos do mod) e poe `escudo` no clubes.json do mod.
Os escudos sao marcas dos clubes: so vao para o mod (uso privado), nunca para o pacote do jogo.
"""
import io, json, os, re, struct, sys
from PIL import Image

args = sys.argv[1:]
def opt(nome, padrao):
    return args[args.index(nome) + 1] if nome in args else padrao
FM = opt('--fm', 'Z:/Games/Fifa Manager 26')
MOD = opt('--mod', 'Z:/FootManager3D/mod')
REFAZER = '--refazer' in args
PAISES = [int(a) for a in args if a.isdigit()]
MAX = 160

def indice_big(path):
    """{nome em minusculas: (offset, tamanho)} de um arquivo BIGF."""
    f = open(path, 'rb'); h = f.read(16)
    if h[:4] != b'BIGF': raise ValueError(path + ' nao e BIGF')
    n, hs = struct.unpack('>II', h[8:16]); data = f.read(hs - 16); f.close()
    out, p = {}, 0
    for _ in range(n):
        off, sz = struct.unpack('>II', data[p:p + 8]); p += 8
        e = data.index(b'\0', p); out[data[p:e].decode('latin1').lower()] = (off, sz); p = e + 1
    return out

def refpack(d):
    """Descomprime EA RefPack (os ficheiros do .big comecam por 10 FB + tamanho em 3 bytes); o resto passa como esta."""
    if len(d) < 5 or d[1] != 0xFB or not (d[0] & 0x10): return d
    p = 2 + (3 if d[0] & 0x01 else 0) if not (d[0] & 0x80) else 2 + (4 if d[0] & 0x01 else 0)
    n = 4 if d[0] & 0x80 else 3
    total = int.from_bytes(d[p:p + n], 'big'); p += n
    out = bytearray()
    while p < len(d) and len(out) < total:
        b0 = d[p]
        if b0 < 0x80:
            b1 = d[p + 1]; p += 2; lit = b0 & 3; cp = ((b0 & 0x1C) >> 2) + 3; off = ((b0 & 0x60) << 3) + b1 + 1
        elif b0 < 0xC0:
            b1, b2 = d[p + 1], d[p + 2]; p += 3; lit = b1 >> 6; cp = (b0 & 0x3F) + 4; off = ((b1 & 0x3F) << 8) + b2 + 1
        elif b0 < 0xE0:
            b1, b2, b3 = d[p + 1], d[p + 2], d[p + 3]; p += 4; lit = b0 & 3; cp = ((b0 & 0x0C) << 6) + b3 + 5; off = ((b0 & 0x10) << 12) + (b1 << 8) + b2 + 1
        elif b0 < 0xFC:
            p += 1; lit = ((b0 & 0x1F) << 2) + 4; cp = 0; off = 0
        else:
            p += 1; lit = b0 & 3; cp = 0; off = 0
        out += d[p:p + lit]; p += lit
        for _ in range(cp): out.append(out[-off])
        if b0 >= 0xFC: break
    return bytes(out)

def ids_do_sav(n):
    """id do clube no ficheiro -> nome do .tga (id interno em hex)."""
    L = [l.rstrip('\r') for l in open(f'{FM}/database/data/CountryData{n}.sav', encoding='utf-8-sig').read().split('\n')]
    out = {}
    for i, l in enumerate(L):
        m = re.match(r'^%INDEX%CLUB(\d+)$', l)
        if m and m.group(1) != '65535' and L[i + 4].strip().isdigit(): out[int(m.group(1))] = '%08X' % int(L[i + 4])
    return out

def para_png(raw, dst):
    im = Image.open(io.BytesIO(refpack(raw))).convert('RGBA')
    caixa = im.getchannel('A').point(lambda a: 255 if a > 8 else 0).getbbox()
    if caixa: im = im.crop(caixa)
    esc = min(1.0, MAX / max(im.size))
    if esc < 1: im = im.resize((max(1, round(im.width * esc)), max(1, round(im.height * esc))), Image.LANCZOS)
    im.save(dst, optimize=True)

def main():
    big = f'{FM}/art_badges.big'
    ix = indice_big(big) if os.path.exists(big) else {}
    soltos = f'{FM}/badges/clubs/256x256'
    soltos_set = {f.upper(): f for f in os.listdir(soltos)} if os.path.isdir(soltos) else {}
    clubes_path = f'{MOD}/clubes.json'
    clubes = json.load(open(clubes_path, encoding='utf-8'))
    por_id = {int(c['id']): c for c in clubes}
    os.makedirs(f'{MOD}/escudos', exist_ok=True)
    fbig = open(big, 'rb') if ix else None
    for n in PAISES:
        dados = json.load(open(f'{MOD}/local-data/CountryData{n}.json', encoding='utf-8'))
        hexes = ids_do_sav(n)
        feitos, sem = 0, []
        for c in dados['clubs']:
            gid = c.get('gameTeamId')
            if not gid or int(gid) not in por_id: continue
            dst = f'{MOD}/escudos/{gid}.png'
            if os.path.exists(dst) and not REFAZER:
                por_id[int(gid)]['escudo'] = f'{gid}.png'; feitos += 1; continue
            hx = hexes.get(c['id'])
            raw = None
            for nome in ([hx + '.TGA', hx + '_1.TGA'] if hx else []):
                if nome in soltos_set: raw = open(f'{soltos}/{soltos_set[nome]}', 'rb').read(); break
            if raw is None and hx:
                k = f'badges\\clubs\\256x256\\{hx.lower()}.tga'
                if k in ix: off, sz = ix[k]; fbig.seek(off); raw = fbig.read(sz)
            if raw is None: sem.append(c['id']); continue
            para_png(raw, dst)
            por_id[int(gid)]['escudo'] = f'{gid}.png'; feitos += 1
        print(f'CountryData{n}: {feitos} escudos; sem escudo (id do ficheiro): {sem}')
    json.dump(clubes, open(clubes_path, 'w', encoding='utf-8', newline='\n'), ensure_ascii=False, indent=1)

main()
