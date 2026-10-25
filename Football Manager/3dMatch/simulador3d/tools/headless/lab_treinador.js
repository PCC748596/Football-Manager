/*
O TREINADOR DA CPU num jogo: regista os dois treinadores (conhecimento tatico por argumento), forca um amarelo e um vermelho cedo e mostra o que cada um decidiu (tatica e trocas).
Uso: node tools/headless/lab_treinador.js [kA 94] [kB 55] [semente 0] [casa Palmeiras-SP] [fora Remo-PA]
*/
const kA = Number(process.argv[2] || 94), kB = Number(process.argv[3] || 55), semente = Number(process.argv[4] || 0);
const nomeA = process.argv[5] || 'Palmeiras-SP', nomeB = process.argv[6] || 'Remo-PA';
const mulberry32 = (a) => () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
Math.random = mulberry32(777 + semente * 977);
require('./harness.js');
const cena = new THREE.Scene();
Match.init(cena);
if (typeof Officials !== 'undefined' && Officials.init) Officials.init(cena);
if (typeof Sim === 'undefined') global.Sim = {};
Sim.running = true;
const ea = SquadsData.equipas.find(e => e.nome === nomeA), eb = SquadsData.equipas.find(e => e.nome === nomeB);
Match.trocarEquipas({ A: ea.id, B: eb.id });
MatchStats.reset(); Match.tempoDeJogo = 0; Match.placarA = 0; Match.placarB = 0;
Match.mudarEstado('PLAY', 'lab');
TreinadorCPU.limpar();
TreinadorCPU.registar('TeamA', { conhecimento: kA });
TreinadorCPU.registar('TeamB', { conhecimento: kB });
const dt = 1 / 60, total = Math.round(20 * 60 / dt);
let amarelou = false, expulsou = false;
for (let f = 0; f < total; f++) {
    Match.update(dt);
    const min = Match.tempoDeJogo / 60 + 1;
    if (!amarelou && min > 5) { amarelou = true; const d = Match.opponents.filter(p => p.role === 'def')[0]; if (d) d.temAmarelo = true; const m = Match.players.filter(p => p.role === 'mid')[0]; if (m) m.temAmarelo = true; }
    if (!expulsou && min > 30) { expulsou = true; const x = Match.opponents.filter(p => p.role === 'def')[1]; if (x) Officials.expulsar(x); }
}
console.log('placar', Match.placarA + 'x' + Match.placarB, '| minuto', (Match.tempoDeJogo / 60 + 1).toFixed(0), '| em campo A/B', Match.players.length + '/' + Match.opponents.length);
console.log('decisoes do treinador (' + TreinadorCPU._log.length + '):');
TreinadorCPU._log.forEach(l => console.log(' ', JSON.stringify(l)));
console.log('substituicoes feitas:', (Match.subsFeitas || []).map(s => s.lado + ':' + (s.sai.skills ? s.sai.skills.nome : '?') + '->' + (s.entra.skills ? s.entra.skills.nome : '?')).join(' | ') || 'nenhuma');
process.exit(0);
