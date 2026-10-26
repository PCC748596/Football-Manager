/*
Quanto melhor o treinador da CPU, mais ajustes do adversario ele le e contrapoe (TreinadorCPU.contrapor). O adversario e o painel do utilizador (TeamA); a CPU e a TeamB.
*/
require('../tools/headless/harness.js');
let falhas = 0;
const erro = m => { falhas++; console.error('  X ' + m); };
const base = { estilo: 'balanceado', pressaoDefensiva: 'balanced', linhaDefensiva: 'medium', teamPlayStyle: 'positional', compactness: 'median', lengthCompactness: 'median', setores: ['esq', 'dir'], agressividade: 'balanceada' };
const como = (k, painel) => {
    Object.assign(Tatics, { estilo: 'balanceado', pressaoDefensiva: 'balanced', linhaDefensiva: 'medium', teamPlayStyle: 'positional', compactness: 'median', lengthCompactness: 'median' }, painel);
    TreinadorCPU.registar('TeamB', { conhecimento: k, base });
    const T = TreinadorCPU.equipas.TeamB;
    const r = TreinadorCPU.contrapor(Object.assign({}, base), T, 'TeamB', 'BALANCED');
    TreinadorCPU.limpar();
    return r;
};
// pressao alta do utilizador: so quem le o jogo sai por cima dela
if (como(95, { pressaoDefensiva: 'high' }).teamPlayStyle !== 'direct') erro('k 95 nao contrapoe a pressao alta');
if (como(45, { pressaoDefensiva: 'high' }).teamPlayStyle !== 'positional') erro('k 45 nao devia ler a pressao alta');
// utilizador joga pelas alas: o bom treinador fecha a largura
if (como(80, { teamPlayStyle: 'wing_play' }).compactness !== 'short') erro('k 80 nao fecha a largura contra o jogo pelas alas');
if (como(50, { teamPlayStyle: 'wing_play' }).compactness !== 'median') erro('k 50 devia deixar passar o jogo pelas alas');
// o mais conhecedor percebe mais coisas que o medio
const n = (k) => como(k, { pressaoDefensiva: 'high', linhaDefensiva: 'high', teamPlayStyle: 'wing_play', compactness: 'short', estilo: 'ataque' })._contras;
if (!(n(95) > n(70) && n(70) > n(50))) erro('os contras nao crescem com o conhecimento: ' + [50, 70, 95].map(n).join('/'));
console.log(falhas ? falhas + ' falha(s)' : 'OK treinador_le_o_adversario');
process.exit(falhas ? 1 : 0);
