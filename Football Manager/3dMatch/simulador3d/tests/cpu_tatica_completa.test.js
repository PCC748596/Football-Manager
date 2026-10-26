/*
O treinador da CPU tem acesso a TODOS os ajustes da tatica (nao so mentalidade, pressao e linha): estilo ofensivo, as duas compactacoes, os setores e as
percentagens de pressao e linha. A equipa do utilizador (painel) nao muda com a da CPU.
*/
require('../tools/headless/harness.js');
let falhas = 0;
const erro = m => { falhas++; console.error('  X ' + m); };
Tatics.teamPlayStyle = 'possession'; Tatics.compactness = 'large'; Tatics.lengthCompactness = 'large'; Tatics.setores = ['dir']; Tatics.pressaoDefensiva = 'high'; Tatics.pressaoValor = 90;
TreinadorCPU.registar('TeamB', { conhecimento: 70, base: { estilo: 'defesa', pressaoDefensiva: 'low', pressaoValor: 25, linhaDefensiva: 'high', linhaValor: 85,
    teamPlayStyle: 'counter_attack', compactness: 'short', lengthCompactness: 'mediumSmall', setores: ['esq'] } });
if (estiloDaEquipaDe('TeamB') !== TeamPlayStyles.counter_attack) erro('a CPU nao joga o estilo ofensivo proprio');
if (estiloDaEquipaDe('TeamA') !== TeamPlayStyles.possession) erro('a equipa do utilizador perdeu o estilo do painel');
if (taticaDe('TeamB', 'compactness') !== 'short' || taticaDe('TeamA', 'compactness') !== 'large') erro('width compactness nao e por equipa');
if (taticaDe('TeamB', 'lengthCompactness') !== 'mediumSmall' || taticaDe('TeamA', 'lengthCompactness') !== 'large') erro('length compactness nao e por equipa');
if (setoresDe('TeamB').join() !== 'esq' || setoresDe('TeamA').join() !== 'dir') erro('setores nao sao por equipa');
if (pressaoValorDe('TeamB') !== 25 || pressaoValorDe('TeamA') !== 90) erro('pressao em percentagem nao e por equipa: ' + pressaoValorDe('TeamB') + '/' + pressaoValorDe('TeamA'));
if (linhaValorDe('TeamB') !== 85) erro('linha em percentagem da CPU: ' + linhaValorDe('TeamB'));
TreinadorCPU.limpar();
console.log(falhas ? falhas + ' falha(s)' : 'OK cpu_tatica_completa');
process.exit(falhas ? 1 : 0);
