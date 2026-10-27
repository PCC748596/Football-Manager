/*
OS AJUSTES DE POSICAO DO MATCH TACTICS CHEGAM AO TEAM_BT? Regista um ajuste para o posto 9 (CF) da zona 4 com bola, na chave 'mgr:4-4-2' (a que o AdaptadorManager usa), e le o que `posicaoPorZona`
(team_bt.js) devolve para o jogador desse posto antes e depois — e para a OUTRA equipa ('#fora'), que nao pode mudar.
Uso: node tools/headless/zonas_ajuste_no_bt.js
*/
require('./harness.js');
if (typeof Sim === 'undefined') global.Sim = {};
Sim.running = true;
Match.init(new THREE.Scene());
const A = Match.players, B = Match.opponents;
const ler = (lista, chave, team) => {
    const p = lista.find(x => x.idxFormacao === 9);
    Tatics[team === 'TeamA' ? 'formacaoA' : 'formacaoB'] = chave;
    const bb = { team, dir: p.dirZ || 1, ballX: 0, ballZ: 0, isAttacking: true, possessionTime: 99 };
    const r = posicaoPorZona(p, bb);
    return r ? r.x.toFixed(1) + ', ' + r.z.toFixed(1) : 'null';
};
console.log('antes   A (mgr:4-4-2):', ler(A, 'mgr:4-4-2', 'TeamA'), '| B (mgr:4-4-2#fora):', ler(B, 'mgr:4-4-2#fora', 'TeamB'));
AdaptadorManager.registarZonas('mgr:4-4-2', '4-4-2', { com: { '4': { '9': [0.5, 0.9] } } });
console.log('depois  A (mgr:4-4-2):', ler(A, 'mgr:4-4-2', 'TeamA'), '| B (mgr:4-4-2#fora):', ler(B, 'mgr:4-4-2#fora', 'TeamB'));
AdaptadorManager.registarZonas('mgr:4-4-2', '4-4-2', null);
console.log('limpo   A (mgr:4-4-2):', ler(A, 'mgr:4-4-2', 'TeamA'));
process.exit(0);
