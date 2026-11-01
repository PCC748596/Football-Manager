// Simula N disputas de penaltis completas (5+5 e morte subita) com os times de omissao do 3D. Uso: node tools/scratch/disputa_sim.js [N]
require('../headless/harness.js');
const N = Number(process.argv[2] || 3), dt = 1 / 60;
if (typeof Sim === 'undefined') global.Sim = {};
Sim.running = false;
global.EfeitosSonoros = new Proxy({}, { get: () => () => {} });
const cena = new THREE.Scene();
Match.setCameraMode = function () {};
Match.init(cena); Officials.init(cena); Match.resetPlay('TeamA');
for (let i = 0; i < 120; i++) Match.update(dt);
const msgs = []; Ponte.modo = 'visivel'; Ponte.enviar = (t, d) => msgs.push({ tipo: t, dados: d });
// NIVEL (env NIVEL=80): todos os skills GK e TEC passam a esse valor.
if (process.env.NIVEL) { const n = Number(process.env.NIVEL), o = FootballPlayer.prototype.skillFor; FootballPlayer.prototype.skillFor = function (k) { const K = String(k).toUpperCase(); return (K === 'GK' || K === 'TEC') ? n : o.call(this, k); }; }
const tot = { gol: 0, defesa: 0, trave: 0, fora: 0 };
for (let k = 0; k < N; k++) {
    msgs.length = 0;
    Match.disputa = null; Match.decisao = { agregadoCasa: 0, agregadoFora: 0 };
    Match.placarA = 1; Match.placarB = 1; Match.state = 'PLAY';
    const meio = MatchDuration.halfGameMinutes * 60;
    Match.primeiroTempoAcabou = true; Match.acr1Calculado = true; Match.acr2Calculado = true; Match.acrescimo2 = 0; Match.tempoDeJogo = 2 * meio;
    Match.verificarFimDeTempo();
    let g = 0; while (!msgs.some(m => m.tipo === 'disputa_reuniao') && g++ < 60 * 120) Match.update(dt);
    const r = msgs.find(m => m.tipo === 'disputa_reuniao'); if (!r) { console.log('sem reuniao'); break; }
    const ids = { casa: r.dados.casa.map(j => j.id), fora: r.dados.fora.map(j => j.id) };
    const nome = (lado, id) => (r.dados[lado].find(j => j.id === id) || {}).nome;
    const pens = { casa: 0, fora: 0 }, feitas = { casa: 0, fora: 0 }; const log = [];
    const prox = (lado) => ({ lado, jogadorId: ids[lado][feitas[lado] % ids[lado].length] });
    DisputaPenaltis.receberOrdens(ids.casa, ids.fora, prox(r.dados.primeiro));
    let n = 0, vistas = 0; g = 0;
    while (DisputaPenaltis.activa && g++ < 60 * 60 * 20) {
        Match.update(dt);
        if (Match.state === 'PLAY' && !Match.__v && Match.ballVel.length() > 15 && DisputaPenaltis._cobranca) {
            Match.__v = true; const gk = DisputaPenaltis._cobranca.goleiro, b = Match.ball.position, v = Match.ballVel;
            const gz = DisputaPenaltis.sinalZ * CAMPO_COMP / 2, t = (gz - b.z) / v.z, xg = b.x + v.x * t;
            Match.__dec = { xg: xg, yg: b.y + v.y * t - 0.5 * 15 * t * t, dive: gk ? gk.penaltyDiveX : null };
        }
        if (Match.state !== 'PLAY') Match.__v = false;
        const c = msgs.filter(m => m.tipo === 'disputa_cobranca');
        if (c.length > vistas) {
            vistas = c.length; const u = c[c.length - 1].dados;
            tot[u.resultado]++; { const d = Match.__dec || {}; const certo = d.dive !== null && d.dive !== undefined && Math.abs(d.dive - d.xg) < 1.2; (tot.dec = tot.dec || {})[(certo ? 'lado_certo' : 'lado_errado') + ':' + u.resultado] = ((tot.dec || {})[(certo ? 'lado_certo' : 'lado_errado') + ':' + u.resultado] || 0) + 1; } feitas[u.lado]++; if (u.resultado === 'gol') pens[u.lado]++;
            log.push(`${u.lado[0]}:${(nome(u.lado, u.jogadorId) || '?').slice(0, 8)}=${u.resultado}`);
            const rest = (l) => Math.max(0, 5 - feitas[l]);
            const acabou = (feitas.casa >= 5 && feitas.fora >= 5 && feitas.casa === feitas.fora && pens.casa !== pens.fora) ||
                (feitas.casa < 5 || feitas.fora < 5) && (pens.casa > pens.fora + rest('fora') || pens.fora > pens.casa + rest('casa'));
            if (acabou) DisputaPenaltis.receberProxima({ fim: true, vencedor: pens.casa > pens.fora ? 'casa' : 'fora', pens: [pens.casa, pens.fora] });
            else DisputaPenaltis.receberProxima(prox(u.lado === 'casa' ? 'fora' : 'casa'));
        }
    }
    console.log(`disputa ${k + 1}: ${pens.casa} x ${pens.fora} em ${vistas} cobrancas (${(g * dt / 60).toFixed(1)} min simulados)\n   ` + log.join(' '));
}
const T = tot.gol + tot.defesa + tot.trave + tot.fora;
console.log('total', T, JSON.stringify(tot), 'defesas ' + (100 * tot.defesa / T).toFixed(0) + '%, golos ' + (100 * tot.gol / T).toFixed(0) + '%');
process.exit(0);
