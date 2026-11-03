/*
PESQUISA (so mede): em jogo real, quando um atacante/meia tem a bola DENTRO da grande area, o que faz? Chuta (e a que distancia do guarda-redes), passa, perde a bola?
Um "episodio" = o mesmo portador com a bola dentro da area, sem interrupcao.
Uso: node tools/scratch/area_episodios_lote.js [jogos 6] [minutos 90] [trabalhadores 4]
*/
const { fork } = require('child_process');
const os = require('os');

if (process.argv[2] === '--jogo') {
    const idx = Number(process.argv[3]), minutos = Number(process.argv[4]);
    const mulberry32 = (a) => () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    Math.random = mulberry32(9100 + idx * 977);
    require('../headless/harness.js');
    const NOMES = ['Palmeiras-SP', 'Grêmio-RS', 'Atlético-MG', 'Flamengo-RJ', 'Botafogo-RJ', 'Bragantino-SP', 'Fluminense-RJ', 'Atlético-PR', 'Internacional-RS', 'Fortaleza-CE', 'São Paulo-SP', 'Cuiabá-MT', 'Corinthians-SP', 'Cruzeiro-MG', 'Vasco-RJ', 'Bahia-BA'];
    const cena = new THREE.Scene(); Match.init(cena);
    if (typeof Officials !== 'undefined' && Officials.init) Officials.init(cena);
    if (typeof Sim === 'undefined') global.Sim = {}; Sim.running = true;
    const ea = SquadsData.equipas.find(e => e.nome === NOMES[idx % NOMES.length]), eb = SquadsData.equipas.find(e => e.nome === NOMES[(idx * 5 + 3) % NOMES.length]);
    Match.trocarEquipas({ A: ea.id, B: eb.id });
    MatchStats.reset(); Match.tempoDeJogo = 0; Match.placarA = 0; Match.placarB = 0; Notas.iniciar();
    Match.mudarEstado('PLAY', 'episodios');

    const PROF = (typeof Area !== 'undefined' && Area.profundidade) || 16.5, MEIA = (typeof Area !== 'undefined' && Area.meiaLargura) || 20.16;
    const dt = 1 / 60, alvoSeg = minutos * 60;
    const episodios = [];
    let ep = null;
    const fechar = (novo) => {
        if (!ep) return;
        ep.fim = novo ? (novo.team === ep.team ? 'passou' : 'perdeu') : 'solta/saiu';
        episodios.push(ep); ep = null;
    };
    let frames = 0;
    while (Match.tempoDeJogo < alvoSeg && frames < 60 * 60 * 40) {
        Match.update(dt); frames++;
        if (Match.state !== 'PLAY') { fechar(null); continue; }
        const c = Match.ballCarrier;
        const dentro = c && c.role !== 'gk' && c.role !== 'def' && Math.abs(c.targetGoalZ - c.model.position.z) <= PROF && Math.abs(c.model.position.x) <= MEIA;
        if (ep && (!c || c !== ep.p)) { fechar(c); }
        if (ep && !dentro) { fechar(c); }
        if (!dentro) continue;
        const adv = c.team === 'TeamA' ? Match.opponents : Match.players;
        const gk = adv.find(o => o.role === 'gk');
        const P = c.model.position;
        const distFundo = Math.abs(c.targetGoalZ - P.z);
        const distGk = gk ? Math.hypot(gk.model.position.x - P.x, gk.model.position.z - P.z) : 99;
        let dMarc = 99, nCorredor = 0;
        const dir = Math.sign(c.targetGoalZ - P.z) || 1;
        for (const o of adv) {
            if (o.role === 'gk') continue;
            const d = Math.hypot(o.model.position.x - P.x, o.model.position.z - P.z);
            if (d < dMarc) dMarc = d;
            const ao = (o.model.position.z - P.z) * dir;
            if (ao > -2 && ao < distFundo && Math.abs(o.model.position.x - P.x) <= 4) nCorredor++;
        }
        if (!ep) ep = { p: c, team: c.team, t0: Match.tempoDeJogo, frames: 0, estados: {}, shoot: null, minDistGk: 99, corredorLivreFrames: 0, ffFrames: 0, esperaFrames: 0, dMarcMin: 99 };
        ep.frames++;
        const est = c.fsm.currentState;
        ep.estados[est] = (ep.estados[est] || 0) + 1;
        if (distGk < ep.minDistGk) ep.minDistGk = distGk;
        if (dMarc < ep.dMarcMin) ep.dMarcMin = dMarc;
        if (nCorredor === 0) ep.corredorLivreFrames++;
        if (c.frenteAFrente) ep.ffFrames++;
        if ((c.chuteEspera || 0) > 0) ep.esperaFrames++;
        if (!ep.shoot && est === 'SHOOT') ep.shoot = { t: ep.frames * dt, distGk, distFundo, ff: !!c.frenteAFrente, corredorLivre: nCorredor === 0, dMarc };
    }
    fechar(null);
    const limpo = episodios.map(e => ({ team: e.team, dur: e.frames * dt, estados: e.estados, shoot: e.shoot, fim: e.fim, minDistGk: e.minDistGk, corredorLivre: e.corredorLivreFrames / e.frames, ff: e.ffFrames / e.frames, espera: e.esperaFrames / e.frames, dMarcMin: e.dMarcMin }));
    process.send({ idx, jogo: ea.nome + ' ' + Match.placarA + 'x' + Match.placarB + ' ' + eb.nome, episodios: limpo });
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
    const E = res.flatMap(r => r.episodios), J = res.length;
    const pct = (n, d) => d ? (100 * n / d).toFixed(0) + '%' : '-';
    const med = (a) => a.length ? a.slice().sort((x, y) => x - y)[Math.floor(a.length / 2)] : null;
    const f = (x) => x === null ? '-' : x.toFixed(2);
    console.log('jogos', J, '| episodios (atacante com a bola dentro da area)', E.length, '| por jogo', (E.length / J).toFixed(1));
    const chutou = E.filter(e => e.shoot), semChute = E.filter(e => !e.shoot);
    console.log('\nO QUE ACONTECE:');
    console.log('  chutou           ', String(chutou.length).padStart(4), pct(chutou.length, E.length));
    for (const k of ['passou', 'perdeu', 'solta/saiu']) { const g = semChute.filter(e => e.fim === k); console.log('  nao chutou, ' + k.padEnd(10), String(g.length).padStart(4), pct(g.length, E.length)); }
    console.log('\nDURACAO do episodio (s de simulacao): chutou mediana', f(med(chutou.map(e => e.dur))), '| nao chutou mediana', f(med(semChute.map(e => e.dur))));
    console.log('\nCHUTOU: distancia ao guarda-redes no momento do chute:');
    const faixas = [['< 3 m', d => d < 3], ['3 a 6 m', d => d >= 3 && d < 6], ['6 a 10 m', d => d >= 6 && d < 10], ['>= 10 m', d => d >= 10]];
    for (const [r, fn] of faixas) { const n = chutou.filter(e => fn(e.shoot.distGk)).length; console.log('  ' + r.padEnd(8), String(n).padStart(4), pct(n, chutou.length)); }
    console.log('  distancia a linha de fundo no chute, mediana', f(med(chutou.map(e => e.shoot.distFundo))), 'm | com cara a cara ligado', pct(chutou.filter(e => e.shoot.ff).length, chutou.length), '| corredor livre', pct(chutou.filter(e => e.shoot.corredorLivre).length, chutou.length));
    console.log('\nNAO CHUTOU: o que fazia (fracao do tempo por estado, soma dos episodios):');
    const tot = {}; let T = 0;
    semChute.forEach(e => { for (const k in e.estados) { tot[k] = (tot[k] || 0) + e.estados[k]; T += e.estados[k]; } });
    Object.keys(tot).sort((a, b) => tot[b] - tot[a]).slice(0, 8).forEach(k => console.log('  ' + k.padEnd(14), pct(tot[k], T)));
    const perto = semChute.filter(e => e.minDistGk < 6);
    console.log('\nNAO CHUTOU mas chegou a menos de 6 m do guarda-redes:', perto.length, '(' + pct(perto.length, semChute.length) + ' dos que nao chutaram)');
    console.log('  desses, terminaram em: passou', perto.filter(e => e.fim === 'passou').length, '| perdeu', perto.filter(e => e.fim === 'perdeu').length, '| solta/saiu', perto.filter(e => e.fim === 'solta/saiu').length);
    console.log('  corredor livre ate a baliza em', pct(perto.filter(e => e.corredorLivre > 0.5).length, perto.length), 'deles | cara a cara ligado em', pct(perto.filter(e => e.ff > 0.3).length, perto.length), '| em espera de 3 s apos remate em', pct(perto.filter(e => e.espera > 0.3).length, perto.length));
    console.log('\nNAO CHUTOU, no geral: corredor livre em', pct(semChute.filter(e => e.corredorLivre > 0.5).length, semChute.length), '| marcador a < 2 m em algum momento', pct(semChute.filter(e => e.dMarcMin < 2).length, semChute.length));
}
lancar();
