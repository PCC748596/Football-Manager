/*
GERADOR DAS TABELAS DE FORMAÇÃO POR ZONA (data/formacoes_zonas.js) — o ponto de partida do tacticsEditor.html.

Para cada formação (as do motor e as 7 do manager, lidas de ../../types.ts) corre uma partida headless, e a cada 0.5 s de jogo corrido regista, para cada
jogador, onde o TeamBT o quer (`slotTarget`, o nível 1: o posto no bloco, antes de marcação, estilo e inquietação), em coordenadas NORMALIZADAS do referencial de
ataque da equipa: x em [-1, 1] (a meia-largura 34 m; o sinal é o da formação, ver FormationsData) e z em [-1, 1] (a meia-altura 53 m, +1 = baliza adversária).
As amostras ficam em 18 caixas: 9 zonas (3x3, pela posição da BOLA no referencial de ataque) x 2 fases (com bola, sem bola). A média de cada caixa é a
posição inicial da tabela; as caixas com poucas amostras ficam com a posição base da formação (FormationsData) — é só o ponto de partida: o editor corrige.

Zonas: colunas pelo x da bola (esquerda < -11.33 m <= centro <= 11.33 m < direita, o `CORREDOR_LIMITE` do jogo), linhas pelo z (o terço defensivo, o do meio e o
ofensivo: -17.7 e 17.7 m). Índice = linha * 3 + coluna.

Uso:  node tools/gerar_formacoes_zonas.js [minutos por formação, omissão 12]
Cada formação corre num processo à parte (o Match.init só se faz uma vez).
*/
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const RAIZ = path.join(__dirname, '..');
const TYPES = path.join(RAIZ, '..', '..', 'types.ts');
const SAIDA = path.join(RAIZ, 'data', 'formacoes_zonas.js');
const MIN_AMOSTRAS = 30;
const MEIA_LARG = 34, MEIA_COMP = 53;

function formacoesDoManager() {
    const s = fs.readFileSync(TYPES, 'utf8');
    const i = s.indexOf('export const FORMATIONS');
    const j = s.indexOf('\n};', i);
    return new Function(s.slice(i, j + 3).replace(/export const FORMATIONS[^=]*=/, 'const F =') + ';return F;')();
}

// ---------------------------------------------------------------- processo filho: UMA formação
if (process.argv[2] === '--filho') {
    const nome = process.argv[3];          // '433', '442', '4231' ou o nome do manager ('4-4-2'...)
    const minutos = Number(process.argv[4] || 12);
    require(path.join(RAIZ, 'tools', 'headless', 'harness.js'));
    const mgr = formacoesDoManager();
    let chave = nome;
    if (mgr[nome]) chave = AdaptadorManager.formacaoDeSlots(nome, mgr[nome]);
    Tatics.formacaoA = Tatics.formacaoB = Tatics.formacaoFixaA = Tatics.formacaoFixaB = chave;
    const mulberry32 = (a) => () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    Math.random = mulberry32(20261017);
    const cena = new THREE.Scene();
    Match.init(cena);
    if (typeof Officials !== 'undefined' && Officials.init) Officials.init(cena);
    if (typeof Sim === 'undefined') global.Sim = {};
    Sim.running = true;
    const caixa = () => ({ n: 0, x: new Array(11).fill(0), z: new Array(11).fill(0) });
    const caixas = []; for (let k = 0; k < 18; k++) caixas.push(caixa());
    const dt = 1 / 60;
    const total = Math.round(minutos * 60 * 60 / (typeof MatchDuration !== 'undefined' ? 1 : 1));
    for (let f = 0; f < total; f++) {
        Match.update(dt);
        if (f % 30 || Match.state !== 'PLAY') continue;
        for (const lista of [Match.players, Match.opponents]) {
            const p0 = lista[0];
            if (!p0 || lista.length < 11) continue;
            const dz = p0.dirZ;
            const bx = Match.ball.position.x * dz, bz = Match.ball.position.z * dz;
            const col = bx < -11.33 ? 0 : (bx > 11.33 ? 2 : 1);
            const lin = bz < -17.7 ? 0 : (bz > 17.7 ? 2 : 1);
            const zona = lin * 3 + col;
            const fase = (Match.possessionTeam === p0.team) ? 0 : 1;
            const c = caixas[fase * 9 + zona];
            let ok = true;
            for (let i = 1; i < 11; i++) if (!lista[i].slotTarget) ok = false;   // o guarda-redes não tem slotTarget (a posição dele vem do gkAnchor)
            if (!ok) continue;
            c.n++;
            for (let i = 1; i < 11; i++) { c.x[i] += lista[i].slotTarget.x * dz / MEIA_LARG; c.z[i] += lista[i].slotTarget.z * dz / MEIA_COMP; }
        }
    }
    const base = (Match.players.slice(0, 11)).map(p => ({ pos: p.pos, role: p.role }));
    process.stdout.write('@@' + JSON.stringify({ chave, base, caixas }) + '@@\n');
    process.exit(0);
}

// ---------------------------------------------------------------- processo pai
const minutos = Number(process.argv[2] || 12);
const mgr = formacoesDoManager();
const nomes = ['433', '442', '4231'].concat(Object.keys(mgr));
const saida = { versao: 1, colunas: 3, linhas: 3, corredorX: 11.33, terco: 17.7, meiaLargura: MEIA_LARG, meiaAltura: MEIA_COMP, formacoes: {} };

for (const nome of nomes) {
    process.stderr.write('A medir ' + nome + ' (' + minutos + ' min)... ');
    const r = spawnSync(process.execPath, [__filename, '--filho', nome, String(minutos)], { encoding: 'utf8', maxBuffer: 1 << 26, env: Object.assign({}, process.env, { NODE_PATH: path.join(RAIZ, '..', '..', 'node_modules') }) });
    const m = /@@(.*)@@/.exec(r.stdout || '');
    if (!m) { process.stderr.write('FALHOU\n' + (r.stderr || '').slice(-400) + '\n'); process.exit(1); }
    const d = JSON.parse(m[1]);
    // Posição base: a da formação do motor (builtin) ou a média geral de todas as caixas (manager: não há coordenadas escritas à mão).
    const geral = d.base.map((_, i) => { let n = 0, x = 0, z = 0; for (const c of d.caixas) { n += c.n; x += c.x[i]; z += c.z[i]; } return n ? { x: x / n, z: z / n } : { x: 0, z: 0 }; });
    const tabela = (fase) => {
        const zonas = [];
        for (let zona = 0; zona < 9; zona++) {
            const c = d.caixas[fase * 9 + zona];
            zonas.push(d.base.map((_, i) => (i === 0) ? { x: 0, z: -0.93 } : (c.n >= MIN_AMOSTRAS)
                ? { x: +(c.x[i] / c.n).toFixed(3), z: +(c.z[i] / c.n).toFixed(3) }
                : { x: +geral[i].x.toFixed(3), z: +geral[i].z.toFixed(3) }));
        }
        return zonas;
    };
    const amostras = d.caixas.map(c => c.n);
    saida.formacoes[nome] = { slots: d.base, com: tabela(0), sem: tabela(1), amostras, origem: 'medido' };
    process.stderr.write('ok (amostras por caixa: ' + amostras.join(',') + ')\n');
}

const corpo = '/* Gerado por tools/gerar_formacoes_zonas.js e editado no tacticsEditor.html. Coordenadas normalizadas no referencial de ataque: x [-1,1] (meia-largura), z [-1,1] (+1 = baliza adversária). Índice da zona = linha*3 + coluna (linha 0 = terço defensivo; coluna 0 = x da bola < -11.33 m). */\n' +
    'const FormacoesZonas = ' + JSON.stringify(saida) + ';\nif (typeof window !== \'undefined\') window.FormacoesZonas = FormacoesZonas;\n';
fs.mkdirSync(path.dirname(SAIDA), { recursive: true });
fs.writeFileSync(SAIDA, corpo);
console.log('Escrito ' + SAIDA + ' (' + nomes.length + ' formações)');
