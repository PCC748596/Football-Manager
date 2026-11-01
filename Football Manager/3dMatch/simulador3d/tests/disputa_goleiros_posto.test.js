/*
O GOLEIRO NUNCA VAI PARAR AO MEIO-CAMPO (relato: "as vezes o goleiro e resetado para o meio do campo").
  1. Disputa com muitas cobrancas seguidas, os dois times, golos/defesas/falhas, GOLEIROS A BATER e um goleiro PROMOVIDO (de linha, depois de o goleiro ser expulso sem
     reserva). Em cada mudanca de fase (fim da cobranca, desfecho, AGUARDA, PREPARO, inicio da cobranca) e a cada frame depois da primeira cobranca, cada goleiro fica com |z| >= 30
     (na baliza, ao lado da area, ou na marca/espera de batedor a 36 m do meio, no caso do que acabou de bater) — nunca perto de z = 0. A causa encontrada: o goleiro que batia tinha o papel 'atk' durante a cobranca e o
     "volta para a fila" (`_soltou`) mandava-o para o lugar dele na fila do meio-campo.
  2. No jogo: depois de um penalti e de um tiro de meta, o goleiro fica na sua area.
Corre com: node tests/disputa_goleiros_posto.test.js
*/
require('../tools/headless/harness.js');

let falhas = 0;
const ok = m => console.log('  . ' + m);
const erro = m => { console.log('  X ' + m); falhas++; };
const verifica = (cond, bom, mau) => { if (cond) ok(bom); else erro(mau); };

let semente = 4242;
Math.random = () => { semente = (semente + 0x6D2B79F5) | 0; let t = Math.imul(semente ^ (semente >>> 15), 1 | semente); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
global.EfeitosSonoros = new Proxy({}, { get: () => () => {} });

if (typeof Sim === 'undefined') global.Sim = {};
Sim.running = false;
const cena = new THREE.Scene();
const dt = 1 / 60;
Match.setCameraMode = function () {};

function disputa(sinalZ, comPromovido) {
    Match.init(cena); Officials.init(cena); Match.resetPlay('TeamA');
    for (let i = 0; i < 120; i++) Match.update(dt);
    let promovido = null;
    if (comPromovido) {
        // O goleiro do TeamB expulso sem reserva: um de linha vai ao gol (Match._promoverAGoleiro).
        Match.ladoDoUtilizador = null; Match.subsPendentes = []; Match.subsFeitas = []; Match.goleiroPendente = null;
        Match.equipaInfoB = Object.assign(Match.equipaInfoB || { nome: 'B' }, { reservas: [], plantel: [] });
        if (typeof TreinadorCPU !== 'undefined') TreinadorCPU._usados = new Set();
        Officials.expulsar(Match.opponents.find(p => p.role === 'gk'));
        Match.setupSetPiece('FREE_KICK', 'TeamA');
        for (let i = 0; i < 60 * 30 && Match.goleiroPendente; i++) Match.update(dt);
        promovido = Match.opponents.find(p => p.role === 'gk');
    }
    const msgs = [];
    Ponte.modo = 'visivel'; Ponte.enviar = (tipo, dados) => msgs.push({ tipo, dados });
    DisputaPenaltis.iniciar();
    DisputaPenaltis.sinalZ = sinalZ;
    const D = DisputaPenaltis;
    const r = { kicks: [], piorFrame: { z: 99 }, transicoes: 0, gkBateu: 0, promovido };
    let n = 0, comecou = false, antes = '';
    while (D.activa && n < 60 * 900) {
        Match.update(dt); n++;
        const rr = msgs.find(m => m.tipo === 'disputa_reuniao' && !m.lido);
        // A ordem: o goleiro e o 2.o batedor de cada time (bate na 3.a e na 4.a cobranca).
        const ordem = (lista) => { const gk = lista.find(j => j.gk), outros = lista.filter(j => !j.gk); return [outros[0], gk].concat(outros.slice(1)).filter(Boolean); };
        if (rr && D.fase === 'ORDEM') { rr.lido = true; r.ordem = { casa: ordem(rr.dados.casa), fora: ordem(rr.dados.fora) }; D.receberOrdens(r.ordem.casa.map(j => j.id), r.ordem.fora.map(j => j.id), { lado: rr.dados.primeiro, jogadorId: r.ordem[rr.dados.primeiro][0].id }); }
        if (D._cobranca) comecou = true;
        const estado = `${D.fase}/${D.sub || ''}/${D._cobranca ? (D._cobranca.desfecho ? 'desfecho' : 'cobranca') : '-'}`;
        const transicao = estado !== antes; antes = estado;
        if (comecou) {
            const batedor = D._cobranca ? D._cobranca.batedor : (D.atual ? D.atual.batedor : null);
            for (const g of Match.players.concat(Match.opponents)) {
                const ehGk = g.role === 'gk' || (D._cobranca && D._cobranca.batedor === g && D._cobranca.papelGuardado);
                if (!ehGk || g === batedor) continue;
                const z = Math.abs(g.model.position.z);
                if (z < r.piorFrame.z) r.piorFrame = { z, team: g.team, estado, n, info: `kick ${r.kicks.length + 1}, lado ${D.atual && D.atual.lado}, batedor ${batedor && batedor.team}/${batedor && batedor.role}, goleiroDefende ${D.atual && D.atual.goleiro && D.atual.goleiro.team}, ordem ${g.disputaOrdem ? JSON.stringify(g.disputaOrdem.wps) : '-'}` };
            }
            if (transicao) r.transicoes++;
        }
        const c = msgs.find(m => m.tipo === 'disputa_cobranca' && !m.lido);
        if (c) {
            c.lido = true;
            const cob = D._cobranca;
            r.kicks.push(c.dados.resultado);
            if (cob && cob.papelGuardado) r.gkBateu++;
            const feitas = msgs.filter(m => m.tipo === 'disputa_cobranca').length;
            if (feitas >= 12) D.receberProxima({ fim: true, vencedor: 'casa', pens: [1, 0] });
            else { const lado = c.dados.lado === 'casa' ? 'fora' : 'casa'; const lista = r.ordem[lado]; D.receberProxima({ lado, jogadorId: lista[(feitas >> 1) % lista.length].id }); }
        }
    }
    return r;
}

console.log('1 — disputa: os goleiros nunca vao ao meio-campo');
for (const [sinalZ, promo] of [[1, false], [-1, true]]) {
    const r = disputa(sinalZ, promo);
    const rot = `sinalZ ${sinalZ}${promo ? ', goleiro do TeamB promovido' : ''}`;
    verifica(r.kicks.length === 12, `${rot}: 12 cobrancas (${r.kicks.join(',')})`, `${rot}: cobrancas ${r.kicks.length}`);
    verifica(r.gkBateu >= 2, `${rot}: os goleiros bateram (${r.gkBateu} vezes)`, `${rot}: os goleiros nao bateram`);
    if (promo) verifica(r.promovido && r.promovido.role === 'gk', `${rot}: um de linha no gol antes da disputa`, `${rot}: sem goleiro promovido`);
    verifica(r.piorFrame.z >= 30, `${rot}: |z| minimo de um goleiro (que nao bate) ${r.piorFrame.z.toFixed(1)} em ${r.transicoes} fases`, `${rot}: goleiro ${r.piorFrame.team} a |z| = ${r.piorFrame.z.toFixed(1)} em ${r.piorFrame.estado} (${r.piorFrame.info})`);
}

console.log('2 — no jogo: depois de um penalti e de um tiro de meta o goleiro fica na sua area');
Match.init(cena); Officials.init(cena); Match.resetPlay('TeamA');
for (let i = 0; i < 120; i++) Match.update(dt);
for (const tipo of ['PENALTY', 'GOAL_KICK']) {
    Match.resetPlay('TeamA'); for (let i = 0; i < 30; i++) Match.update(dt);
    Match.state = 'PLAY';
    Match.setupSetPiece(tipo, tipo === 'PENALTY' ? 'TeamA' : 'TeamB');
    let pior = 99;
    for (let i = 0; i < 60 * 14; i++) {
        Match.update(dt);
        if (Match.state === 'GOAL') break;
        for (const g of Match.players.concat(Match.opponents)) if (g.role === 'gk') pior = Math.min(pior, Math.abs(g.model.position.z));
    }
    verifica(pior >= 30, `${tipo}: |z| minimo dos goleiros ${pior.toFixed(1)}`, `${tipo}: um goleiro foi a |z| = ${pior.toFixed(1)}`);
}

if (falhas) { console.log(`\n${falhas} falha(s)`); process.exit(1); }
console.log('\ntudo certo');
process.exit(0);
