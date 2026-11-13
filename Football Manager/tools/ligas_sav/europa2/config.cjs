/*
GRUPO europa2 de tools/gerar_ligas_sav.cjs: a 1.a divisao de 14 paises da Europa e da Australia (na AFC), pontos corridos, turno e returno, liga fechada.
Seis ja existiam com 5 clubes numa liga oculta (as copas europeias): `existente` — mantem o pais e esses clubes (ids, nomes genericos, cores) e a liga oculta da
lugar a completa. Os outros oito e a Australia sao paises novos (ids 109 a 117). Nenhum nome real aqui: o nome real das ligas sai do .sav.
*/
const liga = (id) => [[id, 1, 0, 0]];
module.exports = {
  // (Veikkausliiga, Fizz Liga e VBet Liha ficam inteiros: sem a primeira palavra sobrava so "Liga"/"Liha", ou nada.)
  patrocinio: /\b(Jupiler|3F|Stoiximan|VriendenLoterij|PKO Bank Polski|William Hill|Credit Suisse|Trendyol|JD|Isuzu UTE)\s*/g,
  abreviaturas: [],
  PAISES: [
    // ja existiam
    { file: 36, id: '70', nome: 'Norway', continente: 'Europe', lingua: 'en', sigla: 'NOR', ligas: liga('nor_eliteserien'), capital: { 1: 5e6 }, existente: { ligaOculta: 'nor_clubes' } },
    { file: 34, id: '80', nome: 'Netherlands', continente: 'Europe', lingua: 'en', sigla: 'NED', ligas: liga('ned_eredivisie'), capital: { 1: 8e6 }, existente: { ligaOculta: 'ned_clubes' } },
    { file: 48, id: '82', nome: 'Turkey', continente: 'Europe', lingua: 'en', sigla: 'TUR', ligas: liga('tur_super_lig'), capital: { 1: 8e6 }, existente: { ligaOculta: 'tur_clubes' } },
    { file: 7, id: '85', nome: 'Belgium', continente: 'Europe', lingua: 'en', sigla: 'BEL', ligas: liga('bel_pro_league'), capital: { 1: 6e6 }, existente: { ligaOculta: 'bel_clubes' } },
    { file: 22, id: '87', nome: 'Greece', continente: 'Europe', lingua: 'en', sigla: 'GRE', ligas: liga('gre_super_league'), capital: { 1: 5e6 }, existente: { ligaOculta: 'gre_clubes' } },
    { file: 49, id: '89', nome: 'Ukraine', continente: 'Europe', lingua: 'en', sigla: 'UKR', ligas: liga('ukr_premier'), capital: { 1: 4e6 }, existente: { ligaOculta: 'ukr_clubes' } },
    // novos
    { file: 13, id: '109', nome: 'Denmark', continente: 'Europe', lingua: 'en', sigla: 'DEN', ligas: liga('den_superliga'), capital: { 1: 5e6 } },
    { file: 17, id: '110', nome: 'Finland', continente: 'Europe', lingua: 'en', sigla: 'FIN', ligas: liga('fin_veikkausliiga'), capital: { 1: 1.5e6 } },
    { file: 23, id: '111', nome: 'Hungary', continente: 'Europe', lingua: 'en', sigla: 'HUN', ligas: liga('hun_nb1'), capital: { 1: 3e6 } },
    { file: 37, id: '112', nome: 'Poland', continente: 'Europe', lingua: 'en', sigla: 'POL', ligas: liga('pol_ekstraklasa'), capital: { 1: 4e6 } },
    { file: 42, id: '113', nome: 'Scotland', continente: 'Europe', lingua: 'en', sigla: 'SCO', ligas: liga('sco_premiership'), capital: { 1: 5e6 } },
    { file: 46, id: '114', nome: 'Sweden', continente: 'Europe', lingua: 'en', sigla: 'SWE', ligas: liga('swe_allsvenskan'), capital: { 1: 4e6 } },
    { file: 47, id: '115', nome: 'Switzerland', continente: 'Europe', lingua: 'en', sigla: 'SUI', ligas: liga('sui_super_league'), capital: { 1: 6e6 } },
    { file: 50, id: '116', nome: 'Wales', continente: 'Europe', lingua: 'en', sigla: 'WAL', ligas: liga('wal_cymru_premier'), capital: { 1: 0.8e6 } },
    { file: 195, id: '117', nome: 'Australia', continente: 'Asia', lingua: 'en', sigla: 'AUS', ligas: liga('aus_a_league'), capital: { 1: 4e6 } }
  ],
  NOMES: require('./nomes.cjs').NOMES
};
