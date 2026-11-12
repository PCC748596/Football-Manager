/*
A COMEMORACAO DE CAMPEAO (js/comemoracao_campeao.js, config/comemoracao_campeao.js; hooks em match_loop.js encerrarJogo/correrPausaDeJogo,
player.js update, officials.js update, match_ui.js updateCamera, ponte.js iniciar, disputa_penaltis.js _encerrar).

Pedido: *"Crie a comemoracao de campeao. Todos os jogadores juntos no centro do campo, pulando e levantando a taca."*

Corre o jogo a serio em headless:
  1. nos lotes (`Sim.running`) nada corre: o apito final de um jogo com `Match.campeao` segue o fim de sempre, e o teste manual recusa;
  2. quem e campeao (`Match.campeaoDoJogo`): placar, `seVencer`, agregado, penaltis e `seEmpatar`;
  3. no jogo visivel, o apito final de um jogo que da o titulo: a festa arranca depois do sinal do juiz, os vencedores juntam-se no circulo
     central e pulam (o `y` oscila), a taca existe, sobe acima das cabecas e segue as maos de quem a ergue, passa por mais de um jogador; os
     derrotados e o trio afastam-se; no fim a festa acaba (sem ninguem preso nela, sem taca na cena) e o fim de jogo normal segue (a saida
     de campo: o campo fica vazio).

Corre com: node tests/comemoracao_campeao.test.js
*/
require('../tools/headless/harness.js');
if (typeof Sim === 'undefined') global.Sim = {};
// Este teste mede a FESTA (e o fim de jogo logo a seguir): a volta olimpica, que vem entre as duas, e medida em tests/comemoracao_reservas.test.js.
ComemoracaoTitulo.volta.activo = false;

let falhas = 0;
const erro = m => { falhas++; console.error('  X ' + m); };
const ok = (c, m) => { if (!c) erro(m); else console.log('  . ' + m); };

const dt = 1 / 60;
const cena = new THREE.Scene();
Match.init(cena);
Officials.init(cena);
if (Abertura.activa) Abertura.cancelar();
const todos = () => Match.players.concat(Match.opponents);
const naCena = (nome) => { let tem = false; cena.traverse(o => { if (o.name === nome) tem = true; }); return tem; };

// ---------------------------------------------------------------------------------------------------------------------------------------
console.log('1 — nos lotes (Sim.running) nada corre');
Sim.running = true;
for (let i = 0; i < 120; i++) Match.update(dt);
Match.campeao = { seVencer: 'qualquer' };
Match.placarA = 1; Match.placarB = 0;
Match.encerrarJogo();
ok(Match.state === 'FIM_DE_JOGO', 'o apito final aconteceu');
ok(!ComemoracaoCampeao.emCurso(), 'sem festa agendada nem a correr');
ok(ComemoracaoCampeao.testar('TeamA') === false, 'o teste manual recusa nos lotes');
for (let i = 0; i < 300; i++) Match.update(dt);
ok(!ComemoracaoCampeao.activa && !todos().some(p => p.campeaoOrdem), 'ninguem em coreografia de campeao');
ok(!naCena('taca_campeao'), 'nenhuma taca na cena');

// ---------------------------------------------------------------------------------------------------------------------------------------
console.log('2 — quem e campeao com este jogo');
const caso = (campeao, a, b, decisao, pen) => { Match.campeao = campeao; Match.placarA = a; Match.placarB = b; Match.decisao = decisao || null; Match.vencedorPenaltis = pen || null; return Match.campeaoDoJogo(); };
ok(caso(null, 2, 0) === null, 'sem `campeao` ninguem');
ok(caso({ seVencer: 'qualquer' }, 2, 0) === 'TeamA' && caso({ seVencer: 'qualquer' }, 0, 1) === 'TeamB', 'qualquer: quem ganhar');
ok(caso({ seVencer: 'fora' }, 2, 0) === null && caso({ seVencer: 'fora' }, 0, 2) === 'TeamB', 'seVencer fora: so se o de fora ganhar');
ok(caso({ seVencer: 'qualquer' }, 1, 0, { agregadoCasa: 0, agregadoFora: 2 }) === 'TeamB', 'conta o agregado da ida');
ok(caso({ seVencer: 'qualquer' }, 1, 1, { agregadoCasa: 0, agregadoFora: 0 }, 'fora') === 'TeamB', 'empatado: o vencedor da disputa de penaltis');
ok(caso({ seVencer: 'casa', seEmpatar: 'casa' }, 0, 0) === 'TeamA' && caso({ seVencer: 'casa' }, 0, 0) === null, 'seEmpatar: o empate tambem serve');
Match.decisao = null; Match.vencedorPenaltis = null;

// ---------------------------------------------------------------------------------------------------------------------------------------
console.log('3 — no jogo visivel, o apito final de um jogo que da o titulo');
Sim.running = false;
if (Abertura.activa) Abertura._libertar();
for (const p of todos()) { p.foraDeCampo = false; p.model.visible = true; }
Match.resetPlay('TeamA');
for (let i = 0; i < 240; i++) Match.update(dt);
if (Match.state !== 'PLAY') Match.mudarEstado('PLAY', 'teste');
Match.campeao = { seVencer: 'casa' };
Match.placarA = 2; Match.placarB = 1;
Match.encerrarJogo();
ok(Match.state === 'FIM_DE_JOGO' && !!ComemoracaoCampeao.pendente, 'a festa fica agendada no apito (o juiz ainda faz o sinal)');

const C = ComemoracaoTitulo;
const venc = Match.players.filter(p => p.model.visible !== false && !p.expulso);
const derr = Match.opponents.filter(p => p.model.visible !== false && !p.expulso);
const v = new THREE.Vector3(), w = new THREE.Vector3(), n = new THREE.Vector3();
let t = 0, tArranque = -1, tFesta = -1, tFim = -1, nan = 0;
let distMaxNaFesta = 0, tacaVisivel = false, tacaAcima = 0, tacaLonge = 0, amostrasErguer = 0, distMaxMaos = 0;
const yMin = new Map(), yMax = new Map(), portadores = new Set();
let arbNoFimDaFesta = null, derrNoFimDaFesta = Infinity, saidaDepois = false;
for (let i = 0; i < Math.round(80 / dt); i++) {
    Match.update(dt); t += dt;
    const CC = ComemoracaoCampeao;
    for (const p of todos()) { const q = p.model.position; if (!isFinite(q.x + q.y + q.z)) nan++; }
    if (CC.activa && tArranque < 0) tArranque = t;
    if (CC.activa && CC.fase === 'festa') {
        if (tFesta < 0) tFesta = t;
        const tf = CC.tFase;
        if (tf > 2.5) {
            for (const p of venc) {
                distMaxNaFesta = Math.max(distMaxNaFesta, Math.hypot(p.model.position.x, p.model.position.z));
                const y = p.model.position.y;
                yMin.set(p, Math.min(yMin.has(p) ? yMin.get(p) : y, y)); yMax.set(p, Math.max(yMax.has(p) ? yMax.get(p) : y, y));
            }
        }
        const tc = CC.taca;
        if (tc && tc.visible) tacaVisivel = true;
        const e = CC.estadoDaTaca();
        if (e.h) portadores.add(e.h);
        // A taca erguida: o pe dela no meio das maos de quem a segura, e o bordo acima da cabeca dele.
        if (tc && e.k > 0.98 && !e.de && tc.scale.y > 0.99) {
            amostrasErguer++;
            const h = e.h;
            h.model.updateMatrixWorld(true);
            h.rig.lHand.getWorldPosition(v); h.rig.rHand.getWorldPosition(w); v.add(w).multiplyScalar(0.5);
            const pega = tc.position.clone(); pega.y += C.taca.pega;
            distMaxMaos = Math.max(distMaxMaos, pega.distanceTo(v));
            h.rig.neck.getWorldPosition(n);
            if (tc.position.y > n.y + 0.15) tacaAcima++;
            if (Math.hypot(tc.position.x - h.model.position.x, tc.position.z - h.model.position.z) > 0.6) tacaLonge++;
        }
        if (CC.fimFesta - tf < 0.1 && !arbNoFimDaFesta) {
            arbNoFimDaFesta = Officials.arbitro.model.position.clone();
            derrNoFimDaFesta = Math.min(...derr.map(p => Math.hypot(p.model.position.x, p.model.position.z)));
        }
    }
    if (tArranque > 0 && !CC.activa && tFim < 0) {
        tFim = t;
        saidaDepois = Abertura.activa && Abertura.modo === 'intervalo';
    }
    if (tFim > 0 && Match.intervaloSaiu) break;
}
const pulos = venc.filter(p => yMax.has(p) && yMax.get(p) - yMin.get(p) > 0.15).length;
console.log(`   arranque aos ${tArranque.toFixed(1)} s, festa aos ${tFesta.toFixed(1)} s, fim aos ${tFim.toFixed(1)} s; grupo ate ${distMaxNaFesta.toFixed(2)} m do centro; ${pulos}/${venc.length} a pular;` +
    ` taca erguida em ${amostrasErguer} amostras (pe a ${distMaxMaos.toFixed(3)} m das maos, acima da cabeca em ${tacaAcima}); ${portadores.size} portadores`);
ok(tArranque > C.atrasoApito - 0.2 && tArranque < C.atrasoApito + 0.5, 'arranca depois do sinal do juiz (' + tArranque.toFixed(1) + ' s)');
ok(tFesta > 0 && tFesta - tArranque <= C.reuniao.prazo + 0.1, 'a reuniao acaba dentro do prazo');
ok(distMaxNaFesta < C.reuniao.arco2.raio + C.reuniao.jitter + 0.4, 'os vencedores ficam juntos no circulo central (ate ' + distMaxNaFesta.toFixed(2) + ' m)');
ok(pulos >= venc.length - 2, 'os vencedores pulam (y a oscilar): ' + pulos + '/' + venc.length);
ok(tacaVisivel, 'a taca aparece');
ok(amostrasErguer > 60, 'a taca e erguida (' + amostrasErguer + ' amostras)');
ok(distMaxMaos < 0.06, 'a taca segue as maos de quem a ergue (desvio max ' + distMaxMaos.toFixed(3) + ' m)');
ok(tacaAcima === amostrasErguer && tacaLonge === 0, 'erguida, fica acima da cabeca de quem a segura');
ok(portadores.size >= 2, 'a taca passa por mais de um jogador (' + portadores.size + ')');
ok(arbNoFimDaFesta && Math.hypot(arbNoFimDaFesta.x, arbNoFimDaFesta.z) > 20, 'o juiz afastou-se para a lateral (a ' + (arbNoFimDaFesta ? Math.hypot(arbNoFimDaFesta.x, arbNoFimDaFesta.z).toFixed(1) : '?') + ' m do centro)');
ok(derrNoFimDaFesta > 8, 'os derrotados afastaram-se do grupo (o mais perto a ' + derrNoFimDaFesta.toFixed(1) + ' m)');
ok(tFim > 0 && tFim - tArranque < C.tempoMax, 'a festa acaba (' + (tFim - tArranque).toFixed(1) + ' s)');
ok(tFim - tArranque >= 15 && tFim - tArranque <= 26, 'dura 15-26 s');
ok(saidaDepois, 'depois da festa segue a saida de campo do fim de jogo');
ok(Match.intervaloSaiu === true && Match.state === 'FIM_DE_JOGO', 'o fim de jogo normal acaba (campo vazio, estado FIM_DE_JOGO)');
ok(!todos().some(p => p.campeaoOrdem) && !naCena('taca_campeao') && !naCena('confetis_campeao'), 'ninguem preso na festa; sem taca nem confetis na cena');
ok(nan === 0, 'sem posicoes invalidas');

if (falhas) { console.error(falhas + ' falha(s)'); process.exit(1); }
console.log('OK comemoracao_campeao');
process.exit(0);   // o harness deixa handles abertos: sai-se explicitamente (como os outros testes)
