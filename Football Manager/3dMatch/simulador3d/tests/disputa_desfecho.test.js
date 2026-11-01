/*
O DESFECHO DA COBRANCA (relato: "sai gol mas a bola nao bate na rede e a torcida nao vibra; o goleiro defende e a bola some; e um penalti normal"). Conhecido o resultado, a app
fica logo a saber (`disputa_cobranca`), mas o lance continua como um penalti em jogo durante `DisputaModel.pausa.desfecho*`:
  . golo: a bola segue para a rede (fica para la da linha, entre os postes); `festa` ligada (a torcida e o estadio leem-na como GOAL), o juiz apita, o aviso GOOL acende e o
    batedor comemora (Comemoracao) — sem placar, sem evento GOLO, sem golos nas estatisticas e sem o estado GOAL;
  . defesa / fora: a bola continua visivel e longe da mao do juiz; o goleiro visivel e num sitio normal;
  . a cobranca seguinte nao comeca antes do fim do desfecho; so entao a bola vai para a mao do juiz.
Corre com: node tests/disputa_desfecho.test.js
*/
require('../tools/headless/harness.js');

let falhas = 0;
const ok = m => console.log('  . ' + m);
const erro = m => { console.log('  X ' + m); falhas++; };
const verifica = (cond, bom, mau) => { if (cond) ok(bom); else erro(mau); };

let semente = 3;
Math.random = () => { semente = (semente + 0x6D2B79F5) | 0; let t = Math.imul(semente ^ (semente >>> 15), 1 | semente); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };

// Espias: o apito (EfeitosSonoros nao vem no harness) e a comemoracao.
let apitos = 0, comemoracoes = [], quadro = 0;
global.EfeitosSonoros = new Proxy({}, { get: (_o, k) => (k === 'apito' ? () => { apitos++; } : () => {}) });   // qualquer outro som: sem efeito
const iniciarOrig = Comemoracao.iniciar.bind(Comemoracao);
Comemoracao.iniciar = function (autor, zSinal, forcar, tipo) { comemoracoes.push({ autor, zSinal, n: quadro }); return iniciarOrig(autor, zSinal, forcar, tipo); };

if (typeof Sim === 'undefined') global.Sim = {};
Sim.running = false;
const cena = new THREE.Scene();
const dt = 1 / 60;
Match.setCameraMode = function () {};
Match.init(cena); Officials.init(cena); Match.resetPlay('TeamA');
for (let i = 0; i < 120; i++) Match.update(dt);
Match.placarA = 1; Match.placarB = 1;
const golosEventos = () => Eventos.lista.filter(e => e.tipo === 'GOLO').length;
const golosStats = () => (MatchStats.TeamA.remates.golos || 0) + (MatchStats.TeamB.remates.golos || 0);
const antes = { eventos: golosEventos(), stats: golosStats() };

const msgs = [];
Ponte.modo = 'visivel'; Ponte.enviar = (tipo, dados) => msgs.push({ tipo, dados, n: null });
DisputaPenaltis.iniciar();
const D = DisputaPenaltis, P = DisputaModel.pausa;
const alerta = document.getElementById('alerta-golo');
const kicks = [];
let k = null, n = 0, apitosAntes = 0;
while (D.activa && n < 60 * 600) {
    Match.update(dt); n++; quadro = n;
    const rr = msgs.find(m => m.tipo === 'disputa_reuniao' && !m.lido);
    if (rr && D.fase === 'ORDEM') { rr.lido = true; D.receberOrdens(rr.dados.casa.map(j => j.id), rr.dados.fora.map(j => j.id), { lado: rr.dados.primeiro, jogadorId: rr.dados[rr.dados.primeiro].find(j => !j.gk).id }); }
    if (Match.state === 'GOAL') { erro('o estado passou a GOAL durante a disputa'); break; }
    // O resultado acabou de chegar a app: comeca a vigiar o desfecho. A app responde logo (como no manager).
    const c = msgs.find(m => m.tipo === 'disputa_cobranca' && !m.lido);
    if (c) {
        c.lido = true;
        const cob = D._cobranca;
        k = { r: c.dados.resultado, n0: n, dur: cob && cob.desfecho ? cob.desfecho.dur : 0, batedor: cob && cob.batedor, goleiro: cob && cob.goleiro, minDistJuiz: 99, bolaInvisivel: false,
            festaVista: false, alertaVisto: false, gkMau: null, preparoCedo: false, fimN: null, bolaNoFim: null, apitos0: apitosAntes, comem0: comemoracoes.length };
        kicks.push(k);
        const feitas = msgs.filter(m => m.tipo === 'disputa_cobranca').length, r0 = msgs.find(m => m.tipo === 'disputa_reuniao');
        if (feitas >= 8) D.receberProxima({ fim: true, vencedor: 'casa', pens: [1, 0] });
        else { const lado = c.dados.lado === 'casa' ? 'fora' : 'casa'; const lista = r0.dados[lado].filter(j => !j.gk); D.receberProxima({ lado, jogadorId: lista[(feitas >> 1) % lista.length].id }); }
    }
    if (k && k.fimN === null) {
        const t = (n - k.n0) * dt;
        if (D._cobranca && D._cobranca.desfecho) {
            const b = Match.ball.position, a = Officials.arbitro.model.position;
            k.minDistJuiz = Math.min(k.minDistJuiz, Math.hypot(b.x - a.x, b.z - a.z));
            if (!Match.ball.visible) k.bolaInvisivel = true;
            if (D.festa) k.festaVista = true;
            if (k.batedor && k.batedor.fsm && k.batedor.fsm.currentState === 'COMEMORAR') k.festejou = true;
            if (k.batedor) k.maxDesloc = Math.max(k.maxDesloc || 0, Math.hypot(k.batedor.model.position.x - (k.bx0 ?? (k.bx0 = k.batedor.model.position.x)), k.batedor.model.position.z - (k.bz0 ?? (k.bz0 = k.batedor.model.position.z))));
            if (alerta && alerta.style.opacity === '1') k.alertaVisto = true;
            const g = k.goleiro;
            if (g && (!g.model.visible || Math.abs(g.model.position.z) < 53 - 18 || Math.abs(g.model.position.x) > 22)) k.gkMau = `(${g.model.position.x.toFixed(1)}, ${g.model.position.z.toFixed(1)}) vis ${g.model.visible}`;
            if (D.fase === 'PREPARO') k.preparoCedo = true;
            k.bolaNoFim = { x: b.x, y: b.y, z: b.z };
        } else { k.fimN = n; k.tFim = t; k.festaDepois = !!D.festa; k.alertaDepois = alerta ? alerta.style.opacity : '0'; k.bolaComJuiz = D.bolaComJuiz; }
    }
    apitosAntes = apitos;
}

console.log(`${kicks.length} cobrancas: ${kicks.map(x => x.r).join(', ')}`);
verifica(kicks.some(x => x.r === 'gol') && kicks.some(x => x.r !== 'gol'), 'houve golos e nao-golos', 'faltam golos ou nao-golos nesta semente');
for (const [i, x] of kicks.entries()) {
    const rot = `cobranca ${i + 1} (${x.r})`;
    const esperado = x.r === 'gol' ? P.desfechoGol : x.r === 'defesa' ? P.desfechoDefesa : P.desfechoFora;
    verifica(Math.abs(x.dur - esperado) < 1e-9 && x.tFim >= esperado - dt * 1.5, `${rot}: desfecho de ${x.tFim.toFixed(2)} s (${esperado} s) antes de parar`, `${rot}: desfecho de ${x.tFim && x.tFim.toFixed(2)} s, esperado ${esperado}`);
    verifica(!x.preparoCedo, `${rot}: a cobranca seguinte nao comecou durante o desfecho`, `${rot}: o preparo comecou durante o desfecho`);
    verifica(!x.bolaInvisivel && x.minDistJuiz > 1.5, `${rot}: bola visivel e longe da mao do juiz durante o desfecho (min ${x.minDistJuiz.toFixed(1)} m)`, `${rot}: bola invisivel ${x.bolaInvisivel} ou na mao do juiz (${x.minDistJuiz.toFixed(2)} m)`);
    verifica(x.bolaComJuiz, `${rot}: no fim do desfecho a bola vai para o juiz`, `${rot}: a bola nao foi para o juiz`);
    if (x.r === 'gol') {
        const b = x.bolaNoFim;
        verifica(b && Math.abs(b.z) > 53 && Math.abs(b.x) < 3.8 && b.y < 2.5, `${rot}: a bola na rede (${b.x.toFixed(2)}, ${b.y.toFixed(2)}, ${b.z.toFixed(2)})`, `${rot}: a bola fora da rede: ${JSON.stringify(b)}`);
        verifica(x.festaVista && x.alertaVisto, `${rot}: festa (torcida/estadio) e aviso GOOL durante o desfecho`, `${rot}: festa ${x.festaVista} aviso ${x.alertaVisto}`);
        verifica(comemoracoes.some(c => c.autor === x.batedor && Math.abs(c.n - x.n0) <= 1), `${rot}: o batedor comemora (Comemoracao.iniciar)`, `${rot}: sem comemoracao`);
        verifica(x.festejou, `${rot}: o batedor chega a festa (estado COMEMORAR; correu ${(x.maxDesloc || 0).toFixed(1)} m)`, `${rot}: o batedor nao comemorou (o posicionamento da equipa levou-o: correu ${(x.maxDesloc || 0).toFixed(1)} m)`);
        verifica(!x.festaDepois && x.alertaDepois === '0', `${rot}: festa e aviso acabam com o desfecho`, `${rot}: a festa ficou depois do desfecho`);
    } else {
        verifica(x.festaVista && !x.alertaVisto, `${rot}: a torcida do OUTRO time festeja (festa), sem aviso GOOL`, `${rot}: festa ${x.festaVista} aviso ${x.alertaVisto} (esperada festa sem aviso)`);
        verifica(!x.gkMau, `${rot}: goleiro visivel e na area durante o desfecho`, `${rot}: goleiro ${x.gkMau}`);
    }
}
verifica(apitos >= kicks.filter(x => x.r === 'gol').length, `apito do juiz nos golos (${apitos})`, 'sem apito nos golos');
verifica(Match.placarA === 1 && Match.placarB === 1, 'o placar do jogo nao mexeu (1-1)', `o placar mexeu: ${Match.placarA}-${Match.placarB}`);
verifica(golosEventos() === antes.eventos && golosStats() === antes.stats, 'nenhum evento GOLO nem golo nas estatisticas', `eventos GOLO ${antes.eventos} -> ${golosEventos()}, golos nas estatisticas ${antes.stats} -> ${golosStats()}`);
// O Crowd e o AmbienteSonoro (nao carregados no harness) leem a festa da disputa como o estado GOAL: a leitura esta no codigo.
const fs = require('fs'), path = require('path');
const ler = (f) => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
verifica(ler('js/crowd.js').includes('Match.disputa.festa') && ler('js/ambiente_sonoro.js').includes('Match.disputa.festa'), 'Crowd e AmbienteSonoro reagem a festa da disputa', 'Crowd/AmbienteSonoro nao leem a festa da disputa');

if (falhas) { console.log(`\n${falhas} falha(s)`); process.exit(1); }
console.log('\ntudo certo');
process.exit(0);
