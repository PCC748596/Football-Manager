/*
BAIXA OS ESCUDOS que faltam do site escudosfc.com.br (paginas por estado do Brasil e por pais; cada imagem traz o nome do clube no `alt`).

    node tools/baixar_escudos_site.cjs [--dry] [--so "parte do nome"] [--refazer]

Para cada clube sem Assets/Escudos/<nome>.png procura, na pagina do ESTADO (Brasil: pela UF do nome "Clube-UF" e tambem na bras.htm) ou do PAIS (Argentina, Bolivia, ...), a imagem cujo
nome bate com o do clube: igual (sem acentos nem palavras genericas) ou com todas as palavras proprias de um dentro do outro. Em duvida (varias imagens possiveis) nao escolhe: o clube
fica na lista `tools/escudos_site.json` ("ambiguos") para decidir a mao. Grava o ficheiro tal como vem (depois `tools/reduzir_escudos.ps1` encolhe tudo para 160 px).
Os escudos sao marcas dos clubes (o site avisa: "propriedade exclusiva dos clubes e das federacoes"): uso privado; ver antes de publicar o jogo.
*/
const fs = require('fs');
const path = require('path');
const https = require('https');

const raiz = path.resolve(__dirname, '..');
const dir = path.join(raiz, 'Assets', 'Escudos');
const dry = process.argv.includes('--dry'), refazer = process.argv.includes('--refazer');
const soIdx = process.argv.indexOf('--so'), so = soIdx >= 0 ? process.argv[soIdx + 1].toLowerCase() : null;
const BASE = 'https://escudosfc.com.br/';

const dbTxt = fs.readFileSync(path.join(raiz, 'textSim', 'realDatabase.ts'), 'utf8');
const teams = eval(dbTxt.match(/export const REAL_TEAMS_JSON(?:: any\[\])? = (\[[\s\S]*?\n\]);/)[1]);
const PAGINA_PAIS = { '45': ['bras', 'bra'], '52': ['arg'], '53': ['bol'], '55': ['chi'], '56': ['col'], '57': ['ecu'], '58': ['par'], '59': ['peru'], '60': ['uru'], '61': ['ven'], '65': ['eng'] };

const sem = (x) => x.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const GENERICAS = new Set(['club', 'clube', 'futebol', 'esporte', 'esportivo', 'sport', 'sporting', 'deportivo', 'deportes', 'atletico', 'atletica', 'associacao', 'fc', 'cf', 'ec', 'sc', 'ac', 'de', 'do', 'da', 'dos', 'del', 'la', 'el', 'los', 'las', 'cd', 'ca', 'cs', 'real']);
const decodificar = (s) => s.replace(/&([a-z]+);/gi, (m, n) => ({ aacute: 'á', eacute: 'é', iacute: 'í', oacute: 'ó', uacute: 'ú', acirc: 'â', ecirc: 'ê', ocirc: 'ô', atilde: 'ã', otilde: 'õ', ccedil: 'ç', agrave: 'à', amp: '&', ntilde: 'ñ', uuml: 'ü', Aacute: 'Á', Eacute: 'É', Iacute: 'Í', Oacute: 'Ó', Uacute: 'Ú', Ccedil: 'Ç', Atilde: 'Ã', Ntilde: 'Ñ', apos: "'", quot: '"' }[n] || m));
const palavras = (x) => sem(x).split(/[^a-z0-9]+/).filter(w => w.length >= 2 && !GENERICAS.has(w));

const get = (url) => new Promise((res, rej) => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, r => {
        if (r.statusCode >= 300 && r.statusCode < 400 && r.headers.location) return res(get(new URL(r.headers.location, url).href));
        const parts = []; r.on('data', c => parts.push(c)); r.on('end', () => res({ status: r.statusCode, body: Buffer.concat(parts) }));
    }).on('error', rej);
});
const cache = {};
async function imagensDa(pagina) {
    if (cache[pagina]) return cache[pagina];
    const r = await get(BASE + pagina + '.htm');
    const html = r.status === 200 ? r.body.toString('latin1') : '';
    const out = []; const re = /<img[^>]*src="(images\/[^"]+\.(?:png|gif|jpg|jpeg|svg))"[^>]*alt="([^"]*)"/gi; let m;
    while ((m = re.exec(html))) out.push({ src: m[1], alt: decodificar(m[2]) });
    const re2 = /<img[^>]*alt="([^"]*)"[^>]*src="(images\/[^"]+\.(?:png|gif|jpg|jpeg|svg))"/gi;
    while ((m = re2.exec(html))) out.push({ src: m[2], alt: decodificar(m[1]) });
    cache[pagina] = out.filter(i => i.alt && !/tit_head|cbf/i.test(i.src));
    return cache[pagina];
}
const arquivoDe = (nome) => path.join(dir, nome + '.png');

// Pontuacao do nome da imagem para o clube: 3 igual; 2 todas as palavras de um dentro do outro; 0 nao serve.
function pontos(base, alt) {
    const a = sem(base).replace(/[^a-z0-9]+/g, ' ').trim(), b = sem(alt).replace(/[^a-z0-9]+/g, ' ').trim();
    if (a === b) return 3;
    const pa = palavras(base), pb = palavras(alt);
    if (!pa.length || !pb.length) return 0;
    const dentro = (x, y) => x.every(w => y.includes(w));
    return (dentro(pa, pb) || dentro(pb, pa)) ? 2 : 0;
}

(async () => {
    const faltam = teams.filter(t => (refazer || !fs.existsSync(arquivoDe(t.teamName))) && (!so || t.teamName.toLowerCase().includes(so)));
    console.log('Clubes sem escudo:', faltam.length);
    const rel = { baixados: {}, primeiros: {}, ambiguos: {}, semImagem: [] };
    let ok = 0;
    for (const t of faltam) {
        const m = t.teamName.match(/^(.*?)-([A-Z]{2})$/);
        const base = m ? m[1] : t.teamName, uf = m ? m[2].toLowerCase() : '';
        const pais = t.country || '45';
        const paginas = pais === '45' ? [uf, ...PAGINA_PAIS['45']].filter(Boolean) : PAGINA_PAIS[pais] || [];
        let escolha = null, empate = [];
        for (const pg of paginas) {
            const imgs = await imagensDa(pg);
            const bons = imgs.map(i => ({ ...i, p: pontos(base, i.alt), pg })).filter(i => i.p > 0);
            if (!bons.length) continue;
            const melhor = Math.max(...bons.map(i => i.p));
            const topo = bons.filter(i => i.p === melhor);
            const unicos = Array.from(new Map(topo.map(i => [i.src, i])).values());
            if (unicos.length === 1) { escolha = unicos[0]; break; }
            // Varios com o mesmo nome (ex.: dezenas de "Independiente" na pagina da Argentina): as paginas listam primeiro os clubes principais, portanto vale o primeiro da lista (fica no relatorio para rever).
            if (melhor === 3 || unicos.every(i => sem(i.alt).trim() === sem(unicos[0].alt).trim())) { escolha = unicos[0]; rel.primeiros[t.teamName] = unicos.length + ' com o mesmo nome; ficou ' + unicos[0].src; break; }
            // varios iguais: prefere o de alt mais curto se so um tem esse tamanho
            const curtos = unicos.slice().sort((x, y) => x.alt.length - y.alt.length);
            if (curtos[0].alt.length < curtos[1].alt.length && melhor < 3) { escolha = curtos[0]; break; }
            empate = unicos; break;
        }
        if (!escolha) { if (empate.length) rel.ambiguos[t.teamName] = empate.map(i => i.alt + ' (' + i.src + ')'); else rel.semImagem.push(t.teamName); continue; }
        if (!dry) {
            const r = await get(BASE + escolha.src);
            if (r.status !== 200 || r.body.length < 200) { rel.semImagem.push(t.teamName); continue; }
            const ext = path.extname(escolha.src).toLowerCase();
            // gif/jpg ficam com a extensao verdadeira por baixo do nome .png? Nao: o browser detecta o tipo pelo conteudo, mas guardamos tal qual (o reduzir converte tudo para PNG).
            fs.writeFileSync(arquivoDe(t.teamName), r.body);
            if (ext !== '.png') rel.baixados[t.teamName + '#origem'] = ext;
        }
        ok++; rel.baixados[t.teamName] = escolha.alt + ' (' + escolha.pg + ': ' + escolha.src + ')';
    }
    fs.writeFileSync(path.join(__dirname, 'escudos_site.json'), JSON.stringify(rel, null, 1));
    console.log(`Feito: ${ok} escudos${dry ? ' (dry)' : ''}; ambiguos ${Object.keys(rel.ambiguos).length}; sem imagem ${rel.semImagem.length}.`);
})();
