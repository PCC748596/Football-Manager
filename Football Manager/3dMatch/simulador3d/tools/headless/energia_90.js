/*
QUEDA DE ENERGIA EM UM JOGO DE 90 MINUTOS NO MOTOR 3D — N jogos em paralelo (um processo por jogo), mesmas equipas e mesma montagem do `lote_jogos.js`.
Mede, para os jogadores de campo (e goleiros) que ficaram em campo o jogo inteiro (sem substituicao nem expulsao), a energia (deposito de stamina, 0 a 100%) no inicio e no fim.

Uso: node tools/headless/energia_90.js [jogos] [minutos]
*/
const { fork } = require('child_process');
const path = require('path');
const JOGOS = Number(process.argv[2] || 10);
const MINUTOS = Number(process.argv[3] || 90);

if (process.env.E90_WORKER !== undefined) {
    const i = Number(process.env.E90_WORKER);
    const mulberry32 = (a) => () => {
        a |= 0; a = (a + 0x6D2B79F5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    require('./harness.js');
    const dt = 1 / 60;
    const scene = new THREE.Scene();
    Math.random = mulberry32(1000);
    Match.init(scene);
    if (typeof Officials !== 'undefined' && Officials.init) Officials.init(scene);
    if (typeof Sim === 'undefined') global.Sim = {};
    Sim.running = true;

    const fatorForca = require('../../js/config/skill_map.js').SkillCalib.fatorForca || 1;
    const nivel = 80 * fatorForca;
    let banda = 2;
    const todas = (typeof SquadsData !== 'undefined' && SquadsData.equipas) ? SquadsData.equipas : [];
    let equipas = todas.filter(e => Math.abs(e.forca - nivel) <= banda);
    while (equipas.length < 8 && banda < 20) { banda++; equipas = todas.filter(e => Math.abs(e.forca - nivel) <= banda); }

    Math.random = mulberry32(1000 + i * 977);
    let nomes = 'genericas';
    if (equipas.length >= 2) {
        const a = equipas[(i * 2) % equipas.length], b = equipas[(i * 2 + 1) % equipas.length];
        nomes = a.nome + ' x ' + b.nome;
        Match.trocarEquipas({ A: a.id, B: b.id });
    } else Match.trocarEquipas({});
    MatchStats.reset();
    Match.tempoDeJogo = 0; Match.placarA = 0; Match.placarB = 0;

    // Quem comeca em campo e com que energia.
    const inicio = new Map();
    for (const p of Match.players.concat(Match.opponents)) if (p && p.model) inicio.set(p, { id: p.id || (p.skills && p.skills.id), pos: p.pos, role: p.role, e0: p.energia });
    let erro = null;
    const passos = Math.round(MINUTOS * 60 / dt);
    try { for (let f = 0; f < passos; f++) Match.update(dt); } catch (e) { erro = String(e && e.message || e); }

    const emCampo = new Set(Match.players.concat(Match.opponents));
    const linhas = [];
    inicio.forEach((v, p) => {
        linhas.push({ pos: v.pos, role: v.role, e0: v.e0, e1: p.energia, ficou: emCampo.has(p) && !p.expulso });
    });
    process.send({ i, nomes, tempo: Match.tempoDeJogo, placar: Match.placarA + '-' + Match.placarB, erro, linhas });
    process.exit(0);
} else {
    const resultados = [];
    let pendentes = JOGOS;
    const t0 = Date.now();
    for (let i = 0; i < JOGOS; i++) {
        const filho = fork(__filename, [String(JOGOS), String(MINUTOS)], { env: Object.assign({}, process.env, { E90_WORKER: String(i) }) });
        filho.on('message', m => { resultados.push(m); });
        filho.on('exit', () => {
            if (--pendentes === 0) resumo();
        });
    }
    function resumo() {
        const media = (a) => a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0;
        const quedas = [], porGrupo = {};
        let total = 0, inteiro = 0;
        resultados.sort((a, b) => a.i - b.i).forEach(r => {
            console.log('jogo ' + r.i + ': ' + r.nomes + ' | tempo ' + (r.tempo / 60).toFixed(1) + ' min | placar ' + r.placar + (r.erro ? ' | ERRO ' + r.erro : ''));
            r.linhas.forEach(l => {
                total++;
                if (!l.ficou) return;
                inteiro++;
                const q = (l.e0 - l.e1) * 100;
                quedas.push(q);
                const g = l.role === 'gk' ? 'GK' : ['CB', 'LB', 'RB', 'LWB', 'RWB'].includes(l.pos) ? 'DEF' : ['DM', 'CM', 'LM', 'RM', 'AM'].includes(l.pos) ? 'MEIO' : 'ATA';
                (porGrupo[g] = porGrupo[g] || []).push(q);
            });
        });
        console.log('\nJogadores que comecaram: ' + total + ' | que ficaram em campo o jogo todo: ' + inteiro + ' | ' + ((Date.now() - t0) / 60000).toFixed(1) + ' min de relogio');
        console.log('QUEDA MEDIA DE ENERGIA (pontos de 0 a 100): ' + media(quedas).toFixed(1) + ' | min ' + Math.min(...quedas).toFixed(1) + ' | max ' + Math.max(...quedas).toFixed(1));
        Object.keys(porGrupo).forEach(g => console.log('  ' + g.padEnd(5) + ' n=' + String(porGrupo[g].length).padStart(3) + ' queda media ' + media(porGrupo[g]).toFixed(1)));
    }
}
