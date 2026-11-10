/* TROCA DO BATEDOR DEPOIS DAS TROCAS: numa falta/canto montados, designa outro cobrador e chama reatribuirBatedorAposTroca. Uso: node tools/headless/troca_batedor.js [semente] */
const semente = Number(process.argv[2] || 0);
const mulberry32 = (a) => () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
Math.random = mulberry32(1000 + semente * 977);
require('./harness.js');
if (typeof Sim === 'undefined') global.Sim = {};
Sim.running = true;
Match.init(new THREE.Scene());
const vistos = {};
for (let i = 0; i < 60 * 3000 && Object.keys(vistos).length < 2; i++) {
    Match.update(1 / 60);
    const st = Match.state;
    if ((st === 'FREE_KICK' || st === 'CORNER_KICK') && !vistos[st] && Match.setPieceTaker && Match.setPieceTaker.fsm &&
        (Match.setPieceTaker.fsm.currentState === 'SET_PIECE_WAIT' || Match.setPieceTaker.fsm.currentState === 'SET_PIECE_TAKER')) {
        for (let k = 0; k < 60; k++) Match.update(1 / 60);
        if (Match.state !== st) continue;
        vistos[st] = true;
        const velho = Match.setPieceTaker, lista = velho.team === 'TeamA' ? Match.players : Match.opponents;
        const outro = lista.find(p => p !== velho && p.role !== 'gk' && !p.expulso && p.skills);
        const lado = velho.team === 'TeamA' ? 'A' : 'B';
        const attDir = velho.dirZ;
        const papel = st === 'CORNER_KICK' ? (ladoDaBola(Match.cantoBolaAlvo.x, attDir) === 'L' ? 'cornerL' : 'cornerR')
            : (Match.decisaoFaltaMontada === 'remate' ? (ladoDaBola(Match.ball.position.x, attDir) === 'R' ? 'freeKickDirectR' : 'freeKickDirectL') : 'freeKickLong');
        Match.cobradores = Match.cobradores || { A: {}, B: {} };
        Match.cobradores[lado] = Match.cobradores[lado] || {};
        Match.cobradores[lado][papel] = outro.skills.id;
        Match.cobradores[lado].captain = 999999999;   // id invalido: tem de ser limpo
        const pv = velho.model.position.clone(), po = outro.model.position.clone();
        const r = Match.reatribuirBatedorAposTroca();
        console.log(st, papel, 'trocou:', !!r, '| novo e o designado:', Match.setPieceTaker === outro,
            '| novo no ponto do velho:', outro.model.position.distanceTo(pv).toFixed(2), '| velho no sitio do novo:', velho.model.position.distanceTo(po).toFixed(2),
            '| estado novo:', outro.fsm.currentState, '| estado velho:', velho.fsm.currentState, '| captain limpo:', Match.cobradores[lado].captain === null);
    }
}
process.exit(0);
