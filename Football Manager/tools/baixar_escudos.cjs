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
    '59': ['es', 'Perú'], '60': ['es', 'Uruguay'], '61': ['es', 'Venezuela'], '65': ['en', 'England'] };
const ESTADOS = { AC: 'Acre', AL: 'Alagoas', AM: 'Amazonas', AP: 'Amapá', BA: 'Bahia', CE: 'Ceará', DF: 'Distrito Federal', ES: 'Espírito Santo', GO: 'Goiás', MA: 'Maranhão', MG: 'Minas Gerais',
    MS: 'Mato Grosso do Sul', MT: 'Mato Grosso', PA: 'Pará', PB: 'Paraíba', PE: 'Pernambuco', PI: 'Piauí', PR: 'Paraná', RJ: 'Rio de Janeiro', RN: 'Rio Grande do Norte', RO: 'Rondônia',
    RR: 'Roraima', RS: 'Rio Grande do Sul', SC: 'Santa Catarina', SE: 'Sergipe', SP: 'São Paulo', TO: 'Tocantins' };
const PARECE_ESCUDO = /(logo|escudo|crest|badge|emblem|bras[aã]o|s[ií]mbolo|shield|simbolo|insignia|club.*svg|^[^/]*\.svg$)/i;
const NAO_E_ESCUDO = /(estadio|estadio|stadium|map|mapa|flag|bandeira|kit|camisa|uniforme|team photo|squad|plantel|elenco|jpg|jpeg)/i;

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
            : lang === 'es' ? [`${base} club de fútbol ${paisNome}`, `${base} ${paisNome} fútbol`] : [`${base} football club`];
        let achou = null;
        for (const termo of termos) {
            for (const p of await procurar(lang, termo)) {
                if (PARECE_ESCUDO.test(p.ficheiro) && !NAO_E_ESCUDO.test(p.ficheiro) && tituloBate(p.titulo, base) && !usados.has(p.ficheiro)) { achou = p; break; }
            }
            await dorme(120);
            if (achou) break;
        }
        if (!achou && lang !== 'en') {   // reserva: Wikipedia em ingles
            for (const p of await procurar('en', `${base} ${paisNome} football club`)) { if (PARECE_ESCUDO.test(p.ficheiro) && !NAO_E_ESCUDO.test(p.ficheiro) && tituloBate(p.titulo, base) && !usados.has(p.ficheiro)) { achou = p; break; } }
            await dorme(120);
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
