"""Parse CountryData54.sav (Brazilian series A-D) into JSON.
Usage: python parse_countrydata.py <input.sav> <output.json> [--game [--country N] [--max-tier T]]
--game writes the compact CountryData<N>.json the game loads; without it, a full dump with raw lines.
Known fields are named; the rest kept as raw line arrays for later mapping."""
import json, re, sys

def csv_line(s):
    return [x.strip('"') for x in re.findall(r'"[^"]*"|[^,]+', s)]

def block(lines, i, tag):
    """Return (inner_lines, next_index) for %INDEX%tag ... %INDEXEND%tag, nesting-safe."""
    start, end = '%INDEX%' + tag, '%INDEXEND%' + tag
    depth, j, out = 0, i, []
    while True:
        l = lines[j]
        if l == start: depth += 1
        elif l == end:
            depth -= 1
            if depth == 0: return out[1:], j + 1
        out.append(l); j += 1

SKILLS = ['ball_control','dribbling','finishing','shot_power','long_shots','volleys','crossing','passing',
          'long_passing','heading','tackle_standing','tackle_sliding','man_marking',
          'acceleration','speed','agility','jumping','strength','stamina','balance',
          'positioning_off','positioning_def','vision','aggression','reactions','composure','consistency','tactical_awareness',
          'free_kicks','corner_kicks','penalties',
          'gk_diving','gk_handling','gk_positioning','gk_one_on_ones','gk_reflexes','gk_kicking']
POSITIONS = ['GK','RB','LB','CD','DM','RM','LM','CM','RW','LW','AM','CF','ST']  # order of position-bias line (index 0 is padding)

def parse_player(b):
    first, last, _, short, _ = (b[1].split('|') + [''] * 5)[:5]
    p = {'birth': b[4], 'raw': b}
    p['first_name'], p['last_name'], p['short_name'] = first, last, short
    p['skills'] = [int(x) for x in b[7].split(',')]       # 37 values
    p['attrs_a'] = [int(x) for x in b[6].split(',')]
    m = re.search(r'FIFAID:(\d+)', '\n'.join(b))
    p['skills_named'] = dict(zip(SKILLS, p['skills']))
    bias = [int(x) for x in b[6].split(',')][1:]
    p['position_bias'] = dict(zip(POSITIONS, bias))
    p['main_position'] = POSITIONS[bias.index(max(bias))]
    f = b[15].split(',')
    p['height'], p['weight'], p['shirt_first_team'], p['shirt_reserve'] = int(f[2]), int(f[3]), int(f[4]), int(f[5])
    # squad group inferred from shirt numbers (validated against Botafogo screens)
    p['squad'] = 'first_team' if p['shirt_first_team'] > 0 else 'reserves' if p['shirt_reserve'] > 0 else 'youth'
    nat = b[2].split(',')
    p['nationality'], p['nationality2'] = int(nat[0]), int(nat[1])   # same codes as the 3D data (54 = Brazil)
    p['fifa_id'] = int(m.group(1)) if m else None
    # contract block
    k = b.index('%INDEX%CONTRACT')
    c = b[k + 1:b.index('%INDEXEND%CONTRACT')]
    p['contract_start'], p['contract_end'] = c[0].split(',')[-1], c[1]
    p['contract_raw'] = c
    # history (club stints / transfers)
    h = b[b.index('%INDEX%HIST') + 1:b.index('%INDEXEND%HIST')]
    p['history'] = [{'from': h[n], 'to': h[n + 1], 'data': h[n + 2]} for n in range(1, len(h) - 2, 3)]
    return p

def parse_staff(b):
    return {'first_name': b[1], 'last_name': b[2], 'birth': b[3], 'raw': b}

def main(src, dst):
    lines = open(src, encoding='utf-8-sig').read().split('\n')
    lines = [l.rstrip('\r') for l in lines]
    # competitions
    comps, i = {}, lines.index('%INDEX%COUNTRY') + 1
    for l in lines:
        m = re.match(r'^(3[0-9A-F]{7}),(".*)$', l)
        if m: comps[m.group(1)] = csv_line(m.group(2))[0]
    clubs = []
    for n, l in enumerate(lines):
        m = re.match(r'^%INDEX%CLUB(\d+)$', l)
        if not m or m.group(1) == '65535': continue
        inner, _ = block(lines, n, 'CLUB' + m.group(1))
        # header: names start at first quoted line
        q = next(k for k, x in enumerate(inner) if x.startswith('"'))
        club = {'id': int(m.group(1)), 'name': csv_line(inner[q])[0],
                'short_name': csv_line(inner[q + 2])[0], 'abbr': csv_line(inner[q + 4])[0],
                'nickname': csv_line(inner[q + 7])[0], 'stadium': csv_line(inner[q + 10])[0],
                'address': inner[q + 20] if q + 20 < len(inner) else '',
                'website': inner[q + 22], 'founded': int(inner[q + 30] or 0), 'fan_base': int(inner[q + 37].split(',')[0] or 0),
                'players': [], 'staff': []}
        k = 0
        while k < len(inner):
            if inner[k] == '%INDEX%PLAYER':
                pb, k2 = block(inner, k, 'PLAYER'); club['players'].append(parse_player(pb)); k = k2
            elif inner[k] == '%INDEX%STAFF':
                sb, k2 = block(inner, k, 'STAFF'); club['staff'].append(parse_staff(sb)); k = k2
            else: k += 1
        clubs.append(club)
    json.dump({'competitions': comps, 'clubs': clubs}, open(dst, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print(len(clubs), 'clubs', sum(len(c['players']) for c in clubs), 'players', sum(len(c['staff']) for c in clubs), 'staff')

# Last club id of each division, by country (inferred from club order, not stored in the file; checked against club lists).
# 54 Brazil: 1-20 A, 21-40 B, 41-60 C, rest D/regional. 14 England: 1-20 Premier League, 21-44 Championship, 45-68 League One, 69-92 League Two, rest lower.
TIER_ENDS = {54: [20, 40, 60], 14: [20, 44, 68, 92],
             27: [20, 40], 21: [18, 36], 45: [20, 41], 18: [18, 36], 38: [18, 33], 52: [30]}   # Italy, Germany, Spain, France, Portugal: only A and B (Spain B = 21 file clubs + Real Sociedad B; Portugal B = 15 file clubs + Sporting B, Benfica B, Porto B: built below from the parent clubs' reserves)
COUNTRY = 54
B_TEAMS = {45: [(11, 'Real Sociedad B', 9011, 'Instalaciones de Zubieta')],
           38: [(1, 'Sporting CP B', 9001, 'Estádio Aurélio Pereira'), (2, 'Benfica B', 9002, 'Benfica Campus'), (3, 'Porto B', 9003, 'Estádio Luís Filipe Menezes')]}

def tier(club_id):
    for t, end in enumerate(TIER_ENDS[COUNTRY], 1):
        if club_id <= end: return t
    return len(TIER_ENDS[COUNTRY]) + 1

def export_game_json(src, dst, max_tier=None):
    """Compact JSON the game loads as CountryData<country>.json."""
    import io, os
    tmp = dst + '.tmp'
    main(src, tmp)
    d = json.load(open(tmp, encoding='utf-8')); os.remove(tmp)
    out = {'country': COUNTRY, 'source': os.path.basename(src), 'clubs': []}
    for c in d['clubs']:
        if max_tier and tier(c['id']) > max_tier: continue   # e.g. --max-tier 3: only the top three divisions
        out['clubs'].append({
            'id': c['id'], 'name': c['name'], 'shortName': c['short_name'], 'abbr': c['abbr'],
            'nickname': c['nickname'], 'stadium': c['stadium'], 'founded': c['founded'], 'fanBase': c['fan_base'], 'tier': tier(c['id']),
            'players': [{
                'firstName': p['first_name'], 'lastName': p['last_name'], 'shortName': p['short_name'],
                'birthDate': p['birth'], 'nationality': p['nationality'], 'nationality2': p['nationality2'], 'fifaId': p['fifa_id'], 'position': p['main_position'],
                'positionBias': p['position_bias'], 'squad': p['squad'], 'height': p['height'], 'weight': p['weight'],
                'shirtFirstTeam': p['shirt_first_team'], 'shirtReserve': p['shirt_reserve'],
                'contractStart': p['contract_start'], 'contractEnd': p['contract_end'], 'skills': p['skills_named'],
            } for p in c['players']],
            'staff': [{'firstName': x['first_name'], 'lastName': x['last_name'], 'birthDate': x['birth']} for x in c['staff']],
        })
    # B teams that exist in the game but are not clubs in the file: the squad is the parent club's reserves + youth (the parent keeps the first team only).
    for parent_id, name, new_id, stadium in B_TEAMS.get(COUNTRY, []):
        par = next(c for c in out['clubs'] if c['id'] == parent_id)
        b_players = [p for p in par['players'] if p['squad'] != 'first_team']
        par['players'] = [p for p in par['players'] if p['squad'] == 'first_team']
        out['clubs'].append({'id': new_id, 'name': name, 'shortName': name, 'abbr': name[:3].upper(), 'nickname': '', 'stadium': stadium,
                             'founded': par['founded'], 'fanBase': 6000, 'tier': 2, 'players': b_players, 'staff': []})
    json.dump(out, open(dst, 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))

if len(sys.argv) > 3 and sys.argv[3] == '--game':
    a = sys.argv
    if '--country' in a: COUNTRY = int(a[a.index('--country') + 1])
    export_game_json(a[1], a[2], int(a[a.index('--max-tier') + 1]) if '--max-tier' in a else None)
else:
    main(*sys.argv[1:3])
