/*
BAIXA OS ESCUDOS que faltam em Assets/Escudos/<nome do clube>.png (o jogo ja os procura la: ver `logoUrl` em textSim/dataGenerator.ts; quem nao tem ficheiro mostra o escudo desenhado).

    node tools/baixar_escudos.cjs [--dry] [--so "parte do nome"] [--refazer]

Para cada clube sem ficheiro procura o artigo na Wikipedia (pt para o Brasil, es para os outros paises, en como reserva), pega na imagem principal do artigo (a do infobox, que
quase sempre e o escudo) e so a aceita se o nome do ficheiro parecer um escudo (logo, escudo, crest, badge, emblem, brasao, simbolo...). Nada de adivinhar: sem artigo ou sem imagem
que pareca escudo, o clube fica sem ficheiro. O relatorio (tools/escudos_baixados.json) diz de que artigo e ficheiro veio cada um, para rever os enganos (apague o png errado).
Os escudos sao marcas dos clubes: aqui servem para uso privado; ver antes de publicar o jogo.
*/
const fs = require('fs');
const path = require('path');
const https = require('https');

const raiz = path.resolve(__dirname, '..');
const dir = path.join(raiz, 'Assets', 'Escudos');
const dry = process.argv.includes('--dry'), refazer = process.argv.includes('--refazer');
const soIdx = process.argv.indexOf('--so'), so = soIdx >= 0 ? process.argv[soIdx + 1].toLowerCase() : null;

const dbTxt = fs.readFileSync(path.join(raiz, 'textSim', 'realDatabase.ts'), 'utf8');
const lista = (n) => eval(dbTxt.match(new RegExp('export const ' + n + '(?:: any\\[\\])? = (\\[[\\s\\S]*?\\n\\]);'))[1]);
const teams = lista('REAL_TEAMS_JSON');
const PAIS = { '45': ['pt', 'Brasil'], '52': ['es', 'Argentina'], '53': ['es', 'Bolivia'], '55': ['es', 'Chile'], '56': ['es', 'Colombia'], '57': ['es', 'Ecuador'], '58': ['es', 'Paraguay'],
    '59': ['es', 'Perú'], '60': ['es', 'Uruguay'], '61': ['es', 'Venezuela'], '65': ['en', 'England'],
    '66': ['en', 'Spain'], '67': ['en', 'Germany'], '68': ['en', 'Italy'], '69': ['en', 'France'], '70': ['en', 'Norway'], '80': ['en', 'Netherlands'], '81': ['en', 'Portugal'],
    '82': ['en', 'Turkey'], '83': ['en', 'Austria'], '84': ['en', 'Azerbaijan'], '85': ['en', 'Belgium'], '86': ['en', 'Slovakia'], '87': ['en', 'Greece'], '88': ['en', 'Czech'], '89': ['en', 'Ukraine'] };
// Nomes do jogo que a Wikipedia em ingles chama de outra forma: nome do jogo -> palavras a procurar (e que o titulo tem de conter).
const ALIAS = { 'Bayern München': 'FC Bayern Munich', 'Köln': '1. FC Köln', 'Mainz 05': '1. FSV Mainz 05', 'Union Berlin': '1. FC Union Berlin', 'Stuttgart': 'VfB Stuttgart', 'Freiburg': 'SC Freiburg',
    'Hoffenheim': 'TSG 1899 Hoffenheim', 'Wolfsburg': 'VfL Wolfsburg', 'Augsburg': 'FC Augsburg', 'Heidenheim': '1. FC Heidenheim', 'St. Pauli': 'FC St. Pauli', 'Werder Bremen': 'SV Werder Bremen',
    'Atlético de Madrid': 'Atlético Madrid', 'Barcelona': 'FC Barcelona', 'Celta Vigo': 'RC Celta de Vigo', 'Osasuna': 'CA Osasuna', 'Alavés': 'Deportivo Alavés', 'Elche': 'Elche CF',
    'Levante': 'Levante UD', 'Mallorca': 'RCD Mallorca', 'Espanyol': 'RCD Espanyol', 'Getafe': 'Getafe CF', 'Girona': 'Girona FC', 'Valencia': 'Valencia CF', 'Sevilla': 'Sevilla FC',
    'Inter': 'Inter Milan', 'Milan': 'AC Milan', 'Roma': 'AS Roma', 'Napoli': 'SSC Napoli', 'Lazio': 'SS Lazio', 'Parma': 'Parma Calcio 1913', 'Hellas Verona': 'Hellas Verona FC',
    'Marseille': 'Olympique de Marseille', 'Lyon': 'Olympique Lyonnais', 'Monaco': 'AS Monaco FC', 'Lille': 'Lille OSC', 'Lens': 'RC Lens', 'Nice': 'OGC Nice', 'Rennes': 'Stade Rennais FC',
    'Strasbourg': 'RC Strasbourg Alsace', 'Brest': 'Stade Brestois 29', 'Toulouse': 'Toulouse FC', 'Nantes': 'FC Nantes', 'Auxerre': 'AJ Auxerre', 'Angers': 'Angers SCO', 'Le Havre': 'Le Havre AC',
    'Lorient': 'FC Lorient', 'Metz': 'FC Metz', 'Sporting CP': 'Sporting CP', 'Benfica': 'S.L. Benfica', 'Porto': 'FC Porto', 'Braga': 'S.C. Braga', 'Vitória SC': 'Vitória S.C.',
    'PSV Eindhoven': 'PSV Eindhoven', 'Ajax': 'AFC Ajax', 'AZ Alkmaar': 'AZ Alkmaar', 'FC Twente': 'FC Twente', 'Feyenoord': 'Feyenoord', 'Red Bull Salzburg': 'FC Red Bull Salzburg',
    'Sturm Graz': 'SK Sturm Graz', 'Rapid Wien': 'SK Rapid Wien', 'Austria Wien': 'FK Austria Wien', 'LASK': 'LASK', 'Qarabağ': 'Qarabağ FK', 'Sabah': 'Sabah FC (Azerbaijan)', 'Neftçi': 'Neftçi PFK',
    'Zira': 'Zira FK', 'Sumqayıt': 'Sumgayit FK', 'Club Brugge': 'Club Brugge KV', 'Union Saint-Gilloise': 'Royal Union Saint-Gilloise', 'Anderlecht': 'R.S.C. Anderlecht', 'Genk': 'K.R.C. Genk',
    'Gent': 'K.A.A. Gent', 'Slovan Bratislava': 'ŠK Slovan Bratislava', 'Spartak Trnava': 'FC Spartak Trnava', 'Žilina': 'MŠK Žilina', 'DAC Dunajská Streda': 'FC DAC 1904 Dunajská Streda',
    'Ružomberok': 'MFK Ružomberok', 'Olympiacos': 'Olympiacos F.C.', 'Panathinaikos': 'Panathinaikos F.C.', 'AEK Athens': 'AEK Athens F.C.', 'PAOK': 'PAOK FC', 'Aris': 'Aris Thessaloniki F.C.',
    'Slavia Praha': 'SK Slavia Prague', 'Sparta Praha': 'AC Sparta Prague', 'Viktoria Plzeň': 'FC Viktoria Plzeň', 'Baník Ostrava': 'FC Baník Ostrava', 'Mladá Boleslav': 'FK Mladá Boleslav',
    'Shakhtar Donetsk': 'FC Shakhtar Donetsk', 'Dynamo Kyiv': 'FC Dynamo Kyiv', 'Zorya Luhansk': 'FC Zorya Luhansk', 'Dnipro-1': 'SC Dnipro-1', 'Kryvbas': 'FC Kryvbas Kryvyi Rih',
    'Galatasaray': 'Galatasaray S.K.', 'Fenerbahçe': 'Fenerbahçe S.K.', 'Beşiktaş': 'Beşiktaş J.K.', 'Trabzonspor': 'Trabzonspor', 'Başakşehir': 'İstanbul Başakşehir F.K.',
    'Bodø-Glimt': 'FK Bodø/Glimt', 'Brann': 'SK Brann', 'Viking': 'Viking FK', 'Molde': 'Molde FK', 'Rosenborg': 'Rosenborg BK', 'Paris FC': 'Paris FC', 'Paris Saint-Germain': 'Paris Saint-Germain F.C.' };
const ESTADOS = { AC: 'Acre', AL: 'Alagoas', AM: 'Amazonas', AP: 'Amapá', BA: 'Bahia', CE: 'Ceará', DF: 'Distrito Federal', ES: 'Espírito Santo', GO: 'Goiás', MA: 'Maranhão', MG: 'Minas Gerais',
    MS: 'Mato Grosso do Sul', MT: 'Mato Grosso', PA: 'Pará', PB: 'Paraíba', PE: 'Pernambuco', PI: 'Piauí', PR: 'Paraná', RJ: 'Rio de Janeiro', RN: 'Rio Grande do Norte', RO: 'Rondônia',
    RR: 'Roraima', RS: 'Rio Grande do Sul', SC: 'Santa Catarina', SE: 'Sergipe', SP: 'São Paulo', TO: 'Tocantins' };
const PARECE_ESCUDO = /(logo|escudo|crest|badge|emblem|bras[aã]o|s[ií]mbolo|shield|simbolo|insignia|club.*svg|^[^/]*\.svg$)/i;
const NAO_E_ESCUDO = /(collage|montage|colagem|estadio|estadio|stadium|map|mapa|flag|bandeira|kit|camisa|uniforme|team photo|squad|plantel|elenco|jpg|jpeg)/i;

const sem = (x) => x.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const GENERICAS = new Set(['club', 'clube', 'futebol', 'esporte', 'sport', 'sporting', 'deportivo', 'deportes', 'atletico', 'atletica', 'associacao', 'fc', 'cf', 'ec', 'sc', 'de', 'do', 'da', 'dos', 'del', 'la', 'el', 'los', 'las']);
const OUTRO_ESPORTE = /(femenin|feminin|women|vôlei|volei|voleibol|basquet|basket|futsal|handebol|sub-?\d|reservas|b-team|juvenil|categorias)/i;
// O titulo do artigo tem de conter as palavras proprias do nome do clube (as genericas nao contam) e nao pode ser de outro desporto/equipa.
const tituloBate = (titulo, base) => {
    const t = sem(titulo); if (OUTRO_ESPORTE.test(t)) return false;
    const palavras = sem(base).split(/[^a-z0-9]+/).filter(w => w.length >= 3 && !GENERICAS.has(w));
    return palavras.length === 0 ? sem(titulo).includes(sem(base)) : palavras.every(w => t.includes(w));
};
const get = (url) => new Promise((res, rej) => {
    https.get(url, { headers: { 'User-Agent': 'FootManagerClassic/1.0 (private project; contact via repo owner)' } }, r => {
        if (r.statusCode >= 300 && r.statusCode < 400 && r.headers.location) return res(get(r.headers.location));
        const parts = []; r.on('data', c => parts.push(c)); r.on('end', () => res({ status: r.statusCode, body: Buffer.concat(parts) }));
    }).on('error', rej);
});
const dorme = (ms) => new Promise(r => setTimeout(r, ms));
const arquivoDe = (nome) => path.join(dir, nome.replace('Man United', 'Man Utd').replace('Nottm Forest', 'Nottingham Forest') + '.png');

async function procurar(lang, termo) {
    const url = `https://${lang}.wikipedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(termo)}&gsrlimit=4&prop=pageimages&piprop=thumbnail|name&pithumbsize=160&format=json&origin=*`;
    const r = await get(url);
    if (r.status !== 200) return [];
    let j; try { j = JSON.parse(r.body.toString('utf8')); } catch (e) { return []; }
    const pags = Object.values((j.query && j.query.pages) || {}).sort((a, b) => a.index - b.index);
    return pags.map(p => ({ titulo: p.title, ficheiro: p.pageimage, thumb: p.thumbnail && p.thumbnail.source })).filter(p => p.thumb && p.ficheiro);
}

// O escudo de um clube grande NAO sai por `pageimages` (so devolve imagens livres, e os escudos sao marcas): le-se o campo `logo` do infobox do artigo (wikitext) e pede-se a miniatura
// do ficheiro (o ficheiro e local da Wikipedia, e `imageinfo` da a sua miniatura).
// A Wikipedia limita os pedidos (429): espera e tenta de novo.
async function getEspera(url) { let r; for (let i = 0; i < 6; i++) { r = await get(url); if (r.status !== 429) return r; await dorme(25000); } return r; }
async function escudoPeloInfobox(lang, termo, base) {
    const busca = await getEspera(`https://${lang}.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(termo)}&srlimit=5&format=json`);
    let titulos = []; try { titulos = JSON.parse(busca.body.toString('utf8')).query.search.map(x => x.title); } catch (e) { return null; }
    for (const titulo of titulos) {
        if (!tituloBate(titulo, base)) continue;
        const wt = await getEspera(`https://${lang}.wikipedia.org/w/api.php?action=query&prop=revisions&rvprop=content&rvslots=main&titles=${encodeURIComponent(titulo)}&format=json`);
        let txt = ''; try { const pg = Object.values(JSON.parse(wt.body.toString('utf8')).query.pages)[0]; txt = pg.revisions[0].slots.main['*']; } catch (e) { continue; }
        const m = txt.match(/\|\s*(?:logo|image|crest|club_crest)\s*=\s*(?:\[\[)?(?:File:|Image:|Ficheiro:|Archivo:)?([^|\n\]]+\.(?:svg|png))/i);
        if (!m) continue;
        const ficheiro = m[1].trim().replace(/ /g, '_');
        if (NAO_E_ESCUDO.test(ficheiro)) continue;
        const ii = await getEspera(`https://${lang}.wikipedia.org/w/api.php?action=query&titles=File:${encodeURIComponent(ficheiro)}&prop=imageinfo&iiprop=url&iiurlwidth=160&format=json`);
        try { const info = Object.values(JSON.parse(ii.body.toString('utf8')).query.pages)[0].imageinfo[0]; if (info && (info.thumburl || info.url)) return { titulo, ficheiro, thumb: info.thumburl || info.url }; } catch (e) { /* proximo */ }
    }
    return null;
}

(async () => {
    const faltam = teams.filter(t => (refazer || !fs.existsSync(arquivoDe(t.teamName))) && (!so || t.teamName.toLowerCase().includes(so)));
    console.log('Clubes sem escudo:', faltam.length);
    const relatorio = fs.existsSync(path.join(__dirname, 'escudos_baixados.json')) ? JSON.parse(fs.readFileSync(path.join(__dirname, 'escudos_baixados.json'), 'utf8')) : {};
    let ok = 0, semEscudo = 0;
    const usados = new Set(Object.values(relatorio).map(r => r && r.ficheiro).filter(Boolean));   // a mesma imagem nao serve a dois clubes
    for (const t of faltam) {
        const [lang, paisNome] = PAIS[t.country || '45'] || ['es', ''];
        const m = t.teamName.match(/^(.*?)-([A-Z]{2})$/);
        const base = m ? m[1] : t.teamName, uf = m ? m[2] : '';
        const termos = lang === 'pt'
            ? [`${base} clube de futebol ${ESTADOS[uf] || ''}`, `${base} ${ESTADOS[uf] || ''} futebol`]
            : lang === 'es' ? [`${base} club de fútbol ${paisNome}`, `${base} ${paisNome} fútbol`] : [`${ALIAS[base] || base} ${paisNome} football club`, `${ALIAS[base] || base} football club`];
        let achou = null;
        for (const termo of termos) {
            for (const p of await procurar(lang, termo)) {
                if ((PARECE_ESCUDO.test(p.ficheiro) || (Number(t.country) >= 66 && /\.(svg|png)$/i.test(p.ficheiro))) && !NAO_E_ESCUDO.test(p.ficheiro) && tituloBate(p.titulo, ALIAS[base] || base) && !usados.has(p.ficheiro)) { achou = p; break; }
            }
            await dorme(120);
            if (achou) break;
        }
        if (!achou && lang !== 'en') {   // reserva: Wikipedia em ingles
            for (const p of await procurar('en', `${base} ${paisNome} football club`)) { if ((PARECE_ESCUDO.test(p.ficheiro) || (Number(t.country) >= 66 && /\.(svg|png)$/i.test(p.ficheiro))) && !NAO_E_ESCUDO.test(p.ficheiro) && tituloBate(p.titulo, ALIAS[base] || base) && !usados.has(p.ficheiro)) { achou = p; break; } }
            await dorme(120);
        }
        if (!achou && Number(t.country) >= 66) {   // clubes europeus: pelo infobox do artigo
            const nomeBusca = ALIAS[base] || base;
            achou = await escudoPeloInfobox('en', `${nomeBusca} ${paisNome} football club`, nomeBusca) || await escudoPeloInfobox('en', `${nomeBusca} football club`, nomeBusca);
            await dorme(500);
        }
        if (!achou) { semEscudo++; relatorio[t.teamName] = { escudo: null }; console.log('  sem escudo:', t.teamName); continue; }
        if (!dry) {
            const img = await get(achou.thumb);
            if (img.status === 200 && img.body.length > 200) fs.writeFileSync(arquivoDe(t.teamName), img.body); else { semEscudo++; console.log('  falhou o download:', t.teamName); continue; }
        }
        ok++; usados.add(achou.ficheiro); relatorio[t.teamName] = { artigo: achou.titulo, ficheiro: achou.ficheiro };
        console.log('  ok:', t.teamName, '<-', achou.titulo, '/', achou.ficheiro);
    }
    fs.writeFileSync(path.join(__dirname, 'escudos_baixados.json'), JSON.stringify(relatorio, null, 1));
    console.log(`Feito: ${ok} escudos${dry ? ' (dry)' : ''}, ${semEscudo} sem escudo.`);
})();
