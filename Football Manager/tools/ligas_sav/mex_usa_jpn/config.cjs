/*
GRUPO mex_usa_jpn de tools/gerar_ligas_sav.cjs: Mexico (83 -> pais 90), EUA (95 -> 91), Japao (163 -> 92).
Mexico e EUA sao ligas fechadas (ninguem sobe nem desce); no Japao descem 3 da J1 e da J2 e sobem 3 da J2 e da J3.
ligas: [id, tier, promoted, relegated]. Nenhum nome real aqui: o nome real das ligas sai do .sav (sem o patrocinador).
*/
module.exports = {
  criadoPor: 'gerar_ligas_mex_usa_jpn',   // o nome que os clubes ja tem na base (mantem-se para o --force os reconhecer)
  relatorio: 'relatorio_mex_usa_jpn.txt',
  patrocinio: /\b(BBVA|Meiji Yasuda)\s+/g,
  PAISES: [
    { file: 83, id: '90', nome: 'Mexico', continente: 'North America', lingua: 'es', sigla: 'MEX', ligas: [['mex_liga_mx', 1, 0, 0], ['mex_expansion', 2, 0, 0]], capital: { 1: 9e6, 2: 2.5e6 } },
    { file: 95, id: '91', nome: 'USA', continente: 'North America', lingua: 'en', sigla: 'USA', ligas: [['usa_mls', 1, 0, 0], ['usa_usl', 2, 0, 0]], capital: { 1: 10e6, 2: 2.5e6 } },
    { file: 163, id: '92', nome: 'Japan', continente: 'Asia', lingua: 'ja', sigla: 'JPN', ligas: [['jpn_j1', 1, 0, 3], ['jpn_j2', 2, 3, 3], ['jpn_j3', 3, 3, 0]], capital: { 1: 7e6, 2: 3e6, 3: 1.5e6 } }
  ],
  NOMES: require('./nomes.cjs').NOMES
};
