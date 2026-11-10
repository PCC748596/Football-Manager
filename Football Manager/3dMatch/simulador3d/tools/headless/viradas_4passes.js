/*
VIRADAS EM ATE 4 PASSES: quantas vezes a bola, recebida num corredor lateral, chega ao OUTRO corredor lateral da mesma equipa em ate 4 passes seguidos (sem perder a posse).
Uso: node tools/headless/viradas_4passes.js [segundos] [semente] ; SETORES=esq,dir|nenhum ; FORM=433
*/
const segundos = Number(process.argv[2] || 1500), semente = Number(process.argv[3] || 0);
const mulberry32 = (a) => () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
Math.random = mulberry32(1000 + semente * 977);
require('./harness.js');
if (typeof Sim === 'undefined') global.Sim = {};
Sim.running = true;
if (process.env.FORM) { Tatics.formacaoA = process.env.FORM; Tatics.formacaoB = process.env.FORM; }
Match.init(new THREE.Scene());
if (process.env.CFP === '0') BalancoCorredores.cfPeso.activo = false;
if (process.env.ALA === '0') AlaConduz.activo = false;
if (process.env.SETORES) Tatics.setores = process.env.SETORES === 'nenhum' ? [] : process.env.SETORES.split(',');
const c = (CAMPO_LARG / 6);
const lane = (x, dirZ) => { const a = x * dirZ; return a < -c ? 'esq' : (a > c ? 'dir' : 'cen'); };
let ultimo = null, equipa = null;
const seqs = [];   // sequencias abertas: {lado, passes}
const res = { inicios: 0, viradas: 0, porN: [0, 0, 0, 0, 0], passes: 0, passesLateralParaLateral: 0 };
let aberta = [];
for (let i = 0; i < segundos * 60; i++) {
    Match.update(1 / 60);
    const p = Match.ballCarrier;
    if (!p || p.role === 'gk' && false) { continue; }
    if (p === ultimo) continue;
    if (equipa !== null && p.team !== equipa) { aberta = []; ultimo = p; equipa = p.team; }
    else if (ultimo !== null && Match.state === 'PLAY') {
        // um passe completo: o novo portador e da mesma equipa e e outro jogador
        res.passes++;
        const lado = lane(p.model.position.x, p.dirZ);
        const prev = lane(ultimo.model.position.x, p.dirZ);
        if (prev !== 'cen' && lado !== 'cen' && prev !== lado) res.passesLateralParaLateral++;
        for (const s of aberta) s.passes++;
        for (const s of aberta.slice()) {
            if (lado !== 'cen' && lado !== s.lado && s.passes <= 4) { res.viradas++; res.porN[s.passes]++; aberta.splice(aberta.indexOf(s), 1); }
            else if (s.passes >= 4) aberta.splice(aberta.indexOf(s), 1);
        }
        if (lado !== 'cen') { res.inicios++; aberta.push({ lado, passes: 0 }); }
        ultimo = p;
    } else { ultimo = p; equipa = p.team; if (Match.state === 'PLAY') { const l0 = lane(p.model.position.x, p.dirZ); if (l0 !== 'cen') { res.inicios++; aberta.push({ lado: l0, passes: 0 }); } } }
    equipa = p.team;
}
console.log(`form ${Tatics.formacaoA} semente ${semente} setores ${Tatics.setores.join(',') || 'nenhum'}: passes ${res.passes}, recepcoes em corredor lateral ${res.inicios}, viradas em ate 4 passes ${res.viradas} (por n passes 1..4: ${res.porN.slice(1).join('/')}), passe direto lateral->lateral ${res.passesLateralParaLateral}, ${(100 * res.viradas / Math.max(1, res.inicios)).toFixed(1)}% das recepcoes laterais, ${(res.viradas / (segundos / 60)).toFixed(1)} por minuto`);
process.exit(0);
