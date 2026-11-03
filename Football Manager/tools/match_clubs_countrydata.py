"""Match CountryData54 clubs to the game's teams (REAL_TEAMS_JSON) by normalized name + division.
Writes gameTeamId into every club of local-data/CountryData54.json (and club_map.json for reference) and prints what still needs manual mapping.
Manual overrides live in tools/club_map_overrides.json ({"<fileClubId>": <gameTeamID> | null (null = no game club)})."""
import json, re, sys, unicodedata, os

def norm(s):
    s = unicodedata.normalize('NFD', s.lower())
    s = ''.join(c for c in s if unicodedata.category(c) != 'Mn')
    return re.sub(r'[^a-z0-9 ]', ' ', s)

STOP = {'fc','ec','sc','ac','cr','cs','se','sad','saf','de','da','do','dos','das','clube','club','futebol','esporte','esporte','sociedade','associacao','atletico clube','e','regatas','desportivo','esportivo','sport'}
def tokens(s): return [t for t in norm(s).split() if t not in STOP and len(t) > 1]

def load_ts_array(path, name):
    s = open(path, encoding='utf-8').read()
    i = s.index(name); i = s.index('= [', i) + 2
    depth = 0
    for j in range(i, len(s)):
        if s[j] == '[': depth += 1
        elif s[j] == ']':
            depth -= 1
            if depth == 0: return json.loads(s[i:j + 1])

def main(root):
    countries = load_ts_array(f'{root}/textSim/realDatabase.ts', 'REAL_COUNTRIES_JSON')
    teams = load_ts_array(f'{root}/textSim/realDatabase.ts', 'REAL_TEAMS_JSON')
    br = next(c for c in countries if c['id'] == '45')
    tier_of = {tid: l['tier'] for l in br['leagues'] for tid in l['teamIds']}
    game = [t for t in teams if t['teamID'] in tier_of]
    data = json.load(open(f'{root}/local-data/CountryData54.json', encoding='utf-8'))
    overrides = {}
    op = f'{root}/tools/club_map_overrides.json'
    if os.path.exists(op): overrides = json.load(open(op, encoding='utf-8'))
    mapping, used = {}, set()
    for c in data['clubs']:
        if str(c['id']) in overrides:
            if overrides[str(c['id'])] is not None: mapping[str(c['id'])] = overrides[str(c['id'])]; used.add(overrides[str(c['id'])])
            continue
    def score(g, c):
        gt = set(tokens(re.sub(r'-[A-Za-z]{2}$', '', g['teamName']))); ct = set(tokens(c['name'] + ' ' + c['shortName']))
        if not gt: return 0
        return len(gt & ct) / len(gt)
    for c in data['clubs']:
        if str(c['id']) in mapping or str(c['id']) in overrides: continue
        cands = []
        for g in game:
            if g['teamID'] in used: continue
            sc = score(g, c)
            if sc == 1: cands.append((g, tier_of[g['teamID']] == c['tier']))
        same = [g for g, ok in cands if ok]
        pick = same if same else [g for g, _ in cands]
        if len(pick) == 1: mapping[str(c['id'])] = pick[0]['teamID']; used.add(pick[0]['teamID'])
    un = [c for c in data['clubs'] if str(c['id']) not in mapping]
    for c in data['clubs']: c['gameTeamId'] = mapping.get(str(c['id']))
    json.dump(data, open(f'{root}/local-data/CountryData54.json', 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
    json.dump(mapping, open(f'{root}/local-data/club_map.json', 'w'), indent=0)
    print('matched', len(mapping), 'of', len(data['clubs']))
    print('file clubs unmatched (tier<=3):', [(c['id'], c['name'], c['tier']) for c in un if c['tier'] <= 3])
    print('file clubs unmatched (tier 4):', len([c for c in un if c['tier'] == 4]))
    print('game teams unused:', [(g['teamID'], g['teamName'], tier_of[g['teamID']]) for g in game if g['teamID'] not in used])
main(sys.argv[1])
