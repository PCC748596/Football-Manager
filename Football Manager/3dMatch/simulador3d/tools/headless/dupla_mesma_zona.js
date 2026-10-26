/*
DOIS DA MESMA EQUIPA NO MESMO SITIO COM A BOLA: corre N jogos e conta os episodios em que o portador tem um companheiro de campo a menos de `DIST` m durante mais de `SEG` s. Mostra o estado do companheiro, o papel de cada um e se a bola foi passada (tabela).
Uso: node tools/headless/dupla_mesma_zona.js [jogos 4] [semente 0] [DIST 3.5] [SEG 1.0]
*/
const N = Number(process.argv[2] || 4), semente = Number(process.argv[3] || 0), DIST = Number(process.argv[4] || 3.5), SEG = Number(process.argv[5] || 1.0);
const mulberry32 = (a) => () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
require('./harness.js');
const NOMES = ['Atlético-PR', 'Atlético-MG', 'Bahia-BA', 'Botafogo-RJ', 'Chapecoense-SC', 'Corinthians-SP', 'Coritiba-PR', 'Cruzeiro-MG', 'Flamengo-RJ', 'Fluminense-RJ', 'Grêmio-RS', 'Internacional-RS', 'Mirassol-SP', 'Palmeiras-SP', 'Bragantino-SP', 'Remo-PA', 'Santos-SP', 'São Paulo-SP', 'Vasco-RJ', 'Vitória-BA'];
const cena = new THREE.Scene(); Match.init(cena);
if (typeof Officials !== 'undefined' && Officials.init) Officials.init(cena);
if (typeof Sim === 'undefined') global.Sim = {}; Sim.running = true;
if (process.env.CEDE === '0') CedeAoPortador.activo = false;
const dt = 1 / 60;
let tPerto = 0;
let jogos = 0, episodios = [], tCarrier = 0;
for (let j = 0; j < N; j++) {
    Math.random = mulberry32(7000 + semente * 131 + j * 977);
    const a = NOMES[(j * 7 + semente) % 20], b = NOMES[(j * 7 + semente + 5) % 20];
    const ea = SquadsData.equipas.find(e => e.nome === a), eb = SquadsData.equipas.find(e => e.nome === b);
    Match.primeiroTempoAcabou = false; Match.acrescimo1 = 0; Match.acrescimo2 = 0; Match.acr1Calculado = false; Match.acr2Calculado = false;
    Match.trocarEquipas({ A: ea.id, B: eb.id });
    MatchStats.reset(); Match.tempoDeJogo = 0; Match.placarA = 0; Match.placarB = 0;
    Match.mudarEstado('PLAY', 'diag');
    let ep = null;
    for (let f = 0; f < 20 * 60 / dt; f++) {
        Match.update(dt);
        const c = Match.ballCarrier;
        let par = null;
        if (c && c.role !== 'gk') {
            tCarrier += dt;
            const mates = (c.team === 'TeamA' ? Match.players : Match.opponents).filter(m => m !== c && m.role !== 'gk' && m.model);
            let best = null, bd = DIST;
            for (const m of mates) { const d = Math.hypot(m.model.position.x - c.model.position.x, m.model.position.z - c.model.position.z); if (d < bd) { bd = d; best = m; } }
            if (best) par = { m: best, d: bd };
            if (best && bd < 2.0) tPerto += dt;
        }
        if (par && ep && ep.c === c && ep.m === par.m) { ep.t += dt; ep.dmin = Math.min(ep.dmin, par.d); ep.estados[par.m.fsm.currentState] = (ep.estados[par.m.fsm.currentState] || 0) + dt; }
        else {
            if (ep && ep.t >= SEG) episodios.push(ep);
            ep = par ? { c, m: par.m, t: dt, dmin: par.d, estados: { [par.m.fsm.currentState]: dt }, min: Math.floor(Match.tempoDeJogo / 60 + 1), cpos: c.pos, mpos: par.m.pos, z: +(c.model.position.z * c.dirZ).toFixed(0), x: +c.model.position.x.toFixed(0) } : null;
        }
    }
    jogos++;
}
console.log('tempo com companheiro a <2m do portador (s por min de posse):', (tPerto / (tCarrier / 60)).toFixed(2));
console.log('jogos', jogos, 'episodios >' + SEG + 's a <' + DIST + 'm:', episodios.length, '| tempo de posse (min):', (tCarrier / 60).toFixed(0), '| por jogo:', (episodios.length / jogos).toFixed(1));
const conta = {}; episodios.forEach(e => { const k = Object.entries(e.estados).sort((a, b) => b[1] - a[1])[0][0]; conta[k] = (conta[k] || 0) + 1; });
console.log('estado dominante do companheiro:', JSON.stringify(conta));
episodios.slice(0, 30).forEach(e => console.log(e.min + "' " + e.cpos + '(carrega) + ' + e.mpos + ' ' + e.t.toFixed(1) + 's dmin=' + e.dmin.toFixed(1) + ' z=' + e.z + ' x=' + e.x + ' ' + JSON.stringify(Object.fromEntries(Object.entries(e.estados).map(([k, v]) => [k, +v.toFixed(1)])))));
process.exit(0);
