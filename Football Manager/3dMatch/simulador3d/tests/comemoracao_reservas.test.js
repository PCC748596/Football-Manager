/*
OS RESERVAS NA FESTA DE CAMPEAO E OS DERROTADOS (js/comemoracao_campeao.js, tickReservas / _juntarReservas / _poseDerrotado).
Pedido: *"faltando 5 min para terminar o jogo, faz os reservas levantarem e irem para a beira do campo aguardar o termino do jogo; eles vao comemorar tambem no final.
No time adversario coloca alguns jogadores olhando a comemoracao e outros sentados no campo."*
Verifica: aos 85' os reservas do campeao levantam-se e param a beira do campo (os do outro time ficam no banco); no apito juntam-se ao grupo do circulo central
e pulam; os derrotados ficam uns de pe virados para o grupo e outros sentados no relvado; no fim os reservas voltam a sentar-se no banco. Caminho visual.

Corre com: node tests/comemoracao_reservas.test.js
*/
require('../tools/headless/harness.js');
if (typeof Sim === 'undefined') global.Sim = {};

let falhas = 0;
const erro = m => { falhas++; console.error('  X ' + m); };
const ok = (c, m) => { if (!c) erro(m); else console.log('  . ' + m); };
const dt = 1 / 60;

Sim.running = false;
// O banco (js/bancos.js) nao vem no harness: carrega-se aqui, e o Match.init monta-o e senta os reservas (genericos).
if (typeof Bancos === 'undefined') (0, eval)(require('fs').readFileSync(require('path').join(__dirname, '..', 'js', 'bancos.js'), 'utf8').replace(/^const Bancos =/m, 'globalThis.Bancos ='));
const cena = new THREE.Scene();
Match.setCameraMode = function () {};
if (typeof Ponte !== 'undefined') Ponte.enviar = function () {};
Match.init(cena); Officials.init(cena);
if (Abertura.activa) Abertura.cancelar();
Match.resetPlay('TeamA');
for (let i = 0; i < 300; i++) Match.update(dt);

const bancoA = Bancos.bancos.find(b => b.equipa === 'A'), bancoB = Bancos.bancos.find(b => b.equipa === 'B');
ok(bancoA && bancoA.reservas.length > 0, 'ha reservas no banco do TeamA (' + (bancoA ? bancoA.reservas.length : 0) + ')');
if (!bancoA || !bancoA.reservas.length) process.exit(1);
const casaB = bancoB.reservas.map(p => ({ x: p.model.position.x, z: p.model.position.z }));
const tecCasa = bancoA.treinador ? { x: bancoA.treinador.model.position.x, z: bancoA.treinador.model.position.z } : null;
if (process.env.DBG) console.log('tecnico no jogo em', tecCasa);

// O jogo que da o titulo, 1 x 0 para a casa, aos 84:50 do 2.o tempo.
Match.campeao = { seVencer: 'qualquer' };
Match.placarA = 1; Match.placarB = 0;
Match.primeiroTempoAcabou = true; Match.acr1Calculado = true; Match.aguardaSaida2T = false;
Match.tempoDeJogo = 84 * 60 + 50;
Match.acr2Calculado = true; Match.acrMin2 = 0; Match.acrescimo2 = 0; Match._fimNoRelogio = true;

console.log('1 — aos 85 min os reservas do campeao vao para a beira do campo');
let levantou = false;
for (let i = 0; i < Math.round(25 / dt) && Match.state !== 'FIM_DE_JOGO'; i++) { Match.update(dt); if (ComemoracaoCampeao._res) levantou = true; }
const r = ComemoracaoCampeao._res;
ok(levantou && r && r.equipa === 'TeamA', 'os reservas do TeamA levantaram-se');
const naBeira = r ? r.lista.filter(e => Math.abs(Math.abs(e.p.model.position.x) - (CAMPO_LARG / 2 + ComemoracaoTitulo.reservas.foraDaLinha)) < 0.6) : [];
ok(r && naBeira.length === r.lista.length, 'todos a beira do campo (' + naBeira.length + '/' + (r ? r.lista.length : 0) + ')');
ok(bancoB.reservas.every((p, k) => Math.hypot(p.model.position.x - casaB[k].x, p.model.position.z - casaB[k].z) < 0.05), 'os do TeamB continuam sentados no banco');
const ft = ComemoracaoCampeao.festaTorcida();
ok(Match.state !== 'FIM_DE_JOGO' ? (ft && ft.equipa === 'TeamA') : true, 'a torcida do TeamA ja festeja (pula) antes do apito');

console.log('2 — o apito: os reservas festejam com os outros; os derrotados olham ou sentam-se');
let festa = false, reservasNoGrupo = 0, pulou = new Set(), ys = new Map();
for (let i = 0; i < Math.round(60 / dt); i++) {
    Match.update(dt);
    if (ComemoracaoCampeao.activa && ComemoracaoCampeao.fase === 'festa') {
        festa = true;
        for (const e of (ComemoracaoCampeao._res ? ComemoracaoCampeao._res.lista : [])) {
            const p = e.p, d = Math.hypot(p.model.position.x, p.model.position.z);
            if (d < 4.5) reservasNoGrupo = Math.max(reservasNoGrupo, ComemoracaoCampeao._res.lista.filter(q => Math.hypot(q.p.model.position.x, q.p.model.position.z) < 4.5).length);
            const y0 = ys.get(p); ys.set(p, p.model.position.y);
            if (y0 !== undefined && p.model.position.y > 0.15) pulou.add(p);
        }
        if (ComemoracaoCampeao.tFase > 12) break;
    }
}
ok(festa, 'a festa comecou');
ok(r && reservasNoGrupo === r.lista.length, 'os reservas juntaram-se ao grupo do circulo central (' + reservasNoGrupo + '/' + (r ? r.lista.length : 0) + ')');
ok(r && pulou.size >= Math.ceil(r.lista.length / 2), 'os reservas pulam (' + pulou.size + ')');
const derr = ComemoracaoCampeao.partes.filter(s => s.papel === 'derr');
if (process.env.DBG) for (const q of derr) { const p = q.p, f = new THREE.Vector3(0, 0, 1).applyQuaternion(p.model.quaternion); const vv = new THREE.Vector3(); p.rig.pelvis.getWorldPosition(vv); console.log('   ', q.variante, 'chegou', q.chegou, 'tParado', (q.tParado || 0).toFixed(1), 'pos', p.model.position.x.toFixed(1), p.model.position.z.toFixed(1), 'frente', f.x.toFixed(2), f.z.toFixed(2), 'bacia', vv.y.toFixed(2), 'activa', ComemoracaoCampeao.activa, 'tFase', ComemoracaoCampeao.tFase.toFixed(1)); }
const parados = derr.filter(s => s.chegou && (s.tParado || 0) > 1.5);
ok(parados.length >= Math.ceil(derr.length * 0.7), 'a maioria dos derrotados ja esta no sitio durante a festa (' + parados.length + '/' + derr.length + ')');
const olham = parados.filter(s => s.variante === 'olhar'), sentados = parados.filter(s => s.variante === 'sentado');
ok(olham.length >= 2 && sentados.length >= 2, 'derrotados: ' + olham.length + ' a olhar e ' + sentados.length + ' sentados (de ' + derr.length + ')');
const virados = olham.filter(s => { const p = s.p, f = new THREE.Vector3(0, 0, 1).applyQuaternion(p.model.quaternion); const para = new THREE.Vector3(-p.model.position.x, 0, -p.model.position.z).normalize(); return f.dot(para) > 0.8; });
ok(virados.length === olham.length, 'os que olham estao virados para o grupo (' + virados.length + '/' + olham.length + ')');
const v = new THREE.Vector3();
const baixos = sentados.filter(s => { s.p.rig.pelvis.getWorldPosition(v); return v.y < 0.55; });
ok(baixos.length === sentados.length, 'os sentados tem a bacia no relvado (' + baixos.length + '/' + sentados.length + ')');

const tec = ComemoracaoCampeao.tecnico;
ok(tec && Math.hypot(tec.p.model.position.x, tec.p.model.position.z) < 5, 'o tecnico esta no grupo (' + (tec ? Math.hypot(tec.p.model.position.x, tec.p.model.position.z).toFixed(1) : '-') + ' m do centro)');

console.log('3 — a volta olimpica');
for (let i = 0; i < Math.round(40 / dt) && ComemoracaoCampeao.fase !== 'volta'; i++) Match.update(dt);
ok(ComemoracaoCampeao.fase === 'volta', 'a volta olimpica comecou no fim da festa');
const cap = ComemoracaoCampeao.capitao, cantos = { xp: false, xn: false, zp: false, zn: false };
let tacaComEle = 0, amostras = 0, camAlta = 0, camN = 0;
const pc = new THREE.Vector3(), lc = new THREE.Vector3();
for (let i = 0; i < Math.round(160 / dt) && ComemoracaoCampeao.fase === 'volta'; i++) {
    Match.update(dt);
    const q = cap.model.position;
    if (q.x > CAMPO_LARG / 2 - 6) cantos.xp = true; if (q.x < -(CAMPO_LARG / 2 - 6)) cantos.xn = true;
    if (q.z > CAMPO_COMP / 2 - 7) cantos.zp = true; if (q.z < -(CAMPO_COMP / 2 - 7)) cantos.zn = true;
    if (i % 30 === 0 && ComemoracaoCampeao.taca) { amostras++; if (ComemoracaoCampeao.taca.position.distanceTo(q) < 2.6) tacaComEle++; ComemoracaoCampeao.camera(pc, lc); camN++; if (pc.y > 35) camAlta++; }
}
ok(cantos.xp && cantos.xn && cantos.zp && cantos.zn, 'o capitao deu a volta ao campo inteiro ' + JSON.stringify(cantos));
ok(amostras > 0 && tacaComEle / amostras > 0.9, 'a taca vai com o capitao (' + tacaComEle + '/' + amostras + ')');
ok(camN > 0 && camAlta === camN, 'a camera da volta esta alta (' + camAlta + '/' + camN + ')');
ok(!ComemoracaoCampeao.activa, 'a volta acabou e segue o fim de jogo');

console.log('4 — no fim os reservas voltam ao banco e o tecnico a area tecnica');
for (let i = 0; i < Math.round(120 / dt) && ComemoracaoCampeao._res; i++) Match.update(dt);
for (let i = 0; i < Math.round(15 / dt); i++) Match.update(dt);
ok(tec && tecCasa && Math.abs(tec.p.model.position.x - tecCasa.x) < 1.0 && Math.abs(tec.p.model.position.z - tecCasa.z) < 6, 'o tecnico voltou a area tecnica (x ' + (tec ? tec.p.model.position.x.toFixed(1) : '-') + ', no jogo ' + (tecCasa ? tecCasa.x.toFixed(1) : '-') + ')');
ok(!ComemoracaoCampeao._res, 'todos voltaram e sentaram-se');
ok(bancoA.reservas.every(p => Math.abs(Math.abs(p.model.position.x) - BancosDeReservas.xBanco) < 0.3), 'no banco outra vez');

console.log(falhas ? '\nFALHOU: ' + falhas : '\nOK: reservas na beira do campo aos 85 e na festa; derrotados a olhar e sentados.');
process.exit(falhas ? 1 : 0);
