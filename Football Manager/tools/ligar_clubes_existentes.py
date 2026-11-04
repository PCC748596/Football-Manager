"""Link a CountryData<N>.json to the game's EXISTING clubs only (no new clubs or leagues): writes gameTeamId and drops the file clubs with no match.
Usage: python ligar_clubes_existentes.py <root> <fileCountry> <gameCountryId> [--dry]
Manual fixes: tools/club_overrides_<fileCountry>.json  {"<fileClubId>": <gameTeamID> | null}"""
import json, os, re, sys, unicodedata

def norm(s):
    s = ''.join(c for c in unicodedata.normalize('NFD', s.lower()) if unicodedata.category(c) != 'Mn')
    return re.sub(r'[^a-z0-9 ]', ' ', s)
STOP = {'club', 'atletico', 'ca', 'cd', 'de', 'la', 'el', 'y', 'fc', 'sc', 'cs', 'sd', 'ac', 'deportivo', 'sportivo', 'social', 'cultural'}
def toks(s): return {t for t in norm(s).split() if t not in STOP and len(t) > 1}

def load_ts_array(path, name):
    s = open(path, encoding='utf-8').read()
    i = s.index(name); i = s.index('= [', i) + 2
    depth = 0
    for j in range(i, len(s)):
        if s[j] == '[': depth += 1
        elif s[j] == ']':
            depth -= 1
            if depth == 0: return json.loads(s[i:j + 1])

root, fc, gc = sys.argv[1], sys.argv[2], sys.argv[3]
dry = '--dry' in sys.argv
path = f'{root}/local-data/CountryData{fc}.json'
data = json.load(open(path, encoding='utf-8'))
teams = [t for t in load_ts_array(f'{root}/textSim/realDatabase.ts', 'REAL_TEAMS_JSON') if str(t.get('country')) == gc]
op = f'{root}/tools/club_overrides_{fc}.json'
over = json.load(open(op, encoding='utf-8')) if os.path.exists(op) else {}
used, mp = set(), {}
for cid, tid in over.items():
    if tid is not None: mp[int(cid)] = tid; used.add(tid)
for c in data['clubs']:
    if c['id'] in mp or str(c['id']) in over: continue
    ct = toks(c['name'] + ' ' + c['shortName'])
    best = [t for t in teams if t['teamID'] not in used and toks(re.sub(r'\s*\([A-Za-z]+\)$', '', t['teamName'])) and toks(re.sub(r'\s*\([A-Za-z]+\)$', '', t['teamName'])) <= ct]
    if len(best) > 1:
        best.sort(key=lambda t: -len(toks(t['teamName'])))
        if len(toks(best[0]['teamName'])) == len(toks(best[1]['teamName'])): best = []
    if best: mp[c['id']] = best[0]['teamID']; used.add(best[0]['teamID'])
byid = {t['teamID']: t['teamName'] for t in teams}
for c in data['clubs']:
    c['gameTeamId'] = mp.get(c['id'])
print('matched', len(mp), 'of', len(teams), 'game clubs')
print('game clubs without match:', [(t['teamID'], t['teamName']) for t in teams if t['teamID'] not in used])
for c in data['clubs']:
    if c['id'] in mp and True: print(' ', c['id'], c['name'], '->', byid[mp[c['id']]])
if not dry:
    data['clubs'] = [c for c in data['clubs'] if c['gameTeamId']]
    json.dump(data, open(path, 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
    print('written', len(data['clubs']), 'clubs')
