/*
PESQUISA (so mede, nao altera o jogo): o atacante que tem a bola DENTRO da grande area, com um defensor a frente, remata menos que o de fora da area, e o remate sai sempre forte?
Por jogo completo (harness headless) registra:
  - segundos com a bola num atacante, por zona (dentro da area / ate 25 m / mais longe) e pressao (defensor mais proximo: <= 3 m, 3-6 m, > 6 m; "a frente" = mais perto da baliza que ele);
  - cada remate a baliza (via `tipoDeRemate`): zona, pressao, tipo escolhido, potencia.
Uso: node tools/scratch/remates_area_lote.js [jogos 6] [minutos 90] [trabalhadores 4]
*/
const { fork } = require('child_process');
const os = require('os');

if (process.argv[2] === '--jogo') {
    const idx = Number(process.argv[3]), minutos = Number(process.argv[4]);
    const mulberry32 = (a) => () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    Math.random = mulberry32(4321 + idx * 977);
    require('../headless/harness.js');
    const NOMES = ['Palmeiras-SP', 'Grêmio-RS', 'Atlético-MG', 'Flamengo-RJ', 'Botafogo-RJ', 'Bragantino-SP', 'Fluminense-RJ', 'Atlético-PR', 'Internacional-RS', 'Fortaleza-CE', 'São Paulo-SP', 'Cuiabá-MT', 'Corinthians-SP', 'Cruzeiro-MG', 'Vasco-RJ', 'Bahia-BA'];
    const cena = new THREE.Scene(); Match.init(cena);
    if (typeof Officials !== 'undefined' && Officials.init) Officials.init(cena);
    if (typeof Sim === 'undefined') global.Sim = {}; Sim.running = true;
    const ea = SquadsData.equipas.find(e => e.nome === NOMES[idx % NOMES.length]), eb = SquadsData.equipas.find(e => e.nome === NOMES[(idx * 5 + 3) % NOMES.length]);
    Match.trocarEquipas({ A: ea.id, B: eb.id });
    MatchStats.reset(); Match.tempoDeJogo = 0; Match.placarA = 0; Match.placarB = 0; Notas.iniciar();
    Match.mudarEstado('PLAY', 'remates_area');

    const PROF = (typeof Area !== 'undefined' && Area.profundidade) || 16.5, MEIA = (typeof Area !== 'undefined' && Area.meiaLargura) || 20.16;
    const zonaDe = (dz, ax) => (dz <= PROF && ax <= MEIA) ? 'area' : dz <= 25 ? 'ate25' : 'longe';
    const pressaoDe = (d) => d <= 3 ? 'p<=3' : d <= 6 ? 'p3-6' : 'p>6';
    const tempo = {}, remates = [];
    const somar = (k, dt) => { tempo[k] = (tempo[k] || 0) + dt; };

    // Remates: quem decide o tipo e `tipoDeRemate` (utils.js); regista o contexto e o resultado, sem mudar nada.
    const orig = global.tipoDeRemate || tipoDeRemate;
    const embrulho = function (o) {
        const t = orig(o);
        const pot = (typeof ShotModel !== 'undefined' && ShotModel.tipos[t]) ? ShotModel.tipos[t].potencia : 1;
        remates.push({ dist: o.dist, distAdv: o.distAdversario, tipo: t, pot: pot, ff: !!o.frenteAFrente });
        return t;
    };
    try { tipoDeRemate = embrulho; } catch (e) { global.tipoDeRemate = embrulho; }

    const dt = 1 / 60, alvoSeg = minutos * 60;
    let frames = 0;
    while (Match.tempoDeJogo < alvoSeg && frames < 60 * 60 * 40) {
        Match.update(dt); frames++;
        if (Match.state !== 'PLAY') continue;
        const c = Match.ballCarrier;
        if (!c || c.role === 'gk' || c.role === 'def') continue;
        const lista = c.team === 'TeamA' ? Match.opponents : Match.players;
        const gz = c.targetGoalZ, cz = c.model.position.z, cx = c.model.position.x;
        const dz = Math.abs(gz - cz);
        if (dz > 45) continue;   // so o ataque na ultima parte do campo
        let dMin = 99, dFrente = 99;
        for (const o of lista) {
            if (!o || o.role === 'gk') continue;
            const d = Math.hypot(o.model.position.x - cx, o.model.position.z - cz);
            if (d < dMin) dMin = d;
            if (Math.abs(gz - o.model.position.z) < dz && d < dFrente) dFrente = d;   // mais perto da baliza que o portador
        }
        const z = zonaDe(dz, Math.abs(cx));
        somar(z + '|' + pressaoDe(dMin), dt);
        somar(z + '|frente:' + pressaoDe(dFrente), dt);
        somar(z, dt);
    }
    process.send({ idx, jogo: ea.nome + ' ' + Match.placarA + 'x' + Match.placarB + ' ' + eb.nome, tempo, remates });
    process.exit(0);
}

const N = Number(process.argv[2] || 6), MIN = Number(process.argv[3] || 90), W = Number(process.argv[4] || Math.max(1, Math.min(4, os.cpus().length - 1)));
const res = []; let proximo = 0, vivos = 0;
function lancar() {
    while (vivos < W && proximo < N) {
        const i = proximo++; vivos++;
        const f = fork(__filename, ['--jogo', String(i), String(MIN)], { silent: true });
        f.on('message', m => res.push(m));
        f.on('exit', () => { vivos--; if (proximo < N) lancar(); else if (!vivos) relatorio(); });
    }
}
function relatorio() {
    const T = {}, R = [];
    res.forEach(r => { for (const k in r.tempo) T[k] = (T[k] || 0) + r.tempo[k]; R.push(...r.remates); });
    const J = res.length;
    console.log('jogos', J, '| remates a baliza (tipoDeRemate)', R.length, '| por jogo', (R.length / J).toFixed(1));
    const zonaRem = (d) => d <= 16.5 ? 'area' : d <= 25 ? 'ate25' : 'longe';
    const pct = (n, d) => d ? (100 * n / d).toFixed(0) + '%' : '-';
    console.log('\nREMATES por zona (distancia a baliza):');
    for (const z of ['area', 'ate25', 'longe']) {
        const g = R.filter(r => zonaRem(r.dist) === z);
        const tp = {}; g.forEach(r => tp[r.tipo] = (tp[r.tipo] || 0) + 1);
        const pr = g.filter(r => r.distAdv <= 3).length;
        console.log('  ' + z.padEnd(6), 'n', String(g.length).padStart(4), '| por jogo', (g.length / J).toFixed(1).padStart(5), '| com adversario <=3 m', pct(pr, g.length).padStart(4), '| tipos', Object.keys(tp).map(k => k + ' ' + pct(tp[k], g.length)).join(', '));
    }
    console.log('\nTEMPO com a bola num atacante/meia (s por jogo) e REMATES por minuto com a bola, por zona e pressao do defensor mais proximo:');
    for (const z of ['area', 'ate25', 'longe']) {
        const tz = (T[z] || 0) / J;
        for (const p of ['p<=3', 'p3-6', 'p>6']) {
            const t = (T[z + '|' + p] || 0) / J;
            console.log('  ' + z.padEnd(6), p.padEnd(5), 'tempo', t.toFixed(1).padStart(6) + ' s', '(' + pct(t, tz) + ' da zona)');
        }
    }
    console.log('\nO mesmo, olhando so para o defensor A FRENTE do portador (mais perto da baliza):');
    for (const z of ['area', 'ate25', 'longe']) {
        for (const p of ['p<=3', 'p3-6', 'p>6']) console.log('  ' + z.padEnd(6), ('frente ' + p).padEnd(12), 'tempo', ((T[z + '|frente:' + p] || 0) / J).toFixed(1).padStart(6) + ' s');
    }
    console.log('\nREMATES por minuto de bola, por zona (remates da zona / minutos com bola na zona):');
    for (const z of ['area', 'ate25', 'longe']) {
        const mins = (T[z] || 0) / 60, n = R.filter(r => zonaRem(r.dist) === z).length;
        console.log('  ' + z.padEnd(6), 'remates', String(n).padStart(4), '| minutos com bola', mins.toFixed(1).padStart(6), '| remates por minuto', mins ? (n / mins).toFixed(2) : '-');
    }
}
lancar();
