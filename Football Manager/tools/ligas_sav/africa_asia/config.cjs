/*
GRUPO africa_asia de tools/gerar_ligas_sav.cjs: so a 1.a divisao de cada pais, pontos corridos, turno e returno, liga fechada (o jogo nao tem a 2.a divisao destes paises).
file = o numero do CountryData<N>.sav (e o codigo de nacionalidade dos jogadores nesse jogo); id = o id do pais no manager (o nome da bandeira em Assets/Bandeiras).
As divisoes de cada ficheiro estao em tools/parse_countrydata.py (TIER_ENDS / TIER_IDS). Nenhum nome real aqui: o nome real das ligas sai do .sav.
*/
const liga = (id) => [[id, 1, 0, 0]];
module.exports = {
  // Palavras de patrocinio tiradas do nome real das ligas (o resto vem do ficheiro).
  patrocinio: /\b(Betway|Vodacom|Zylofon Cash|MTN|ZAP|Roshn|Hana Bank|ADNOC|EXPO|Mob\.)\s*/g,
  // O .sav corta os nomes compridos: completa-se o fim.
  abreviaturas: [[/Premier L\.$/, 'Premier League'], [/de la Ligue Pr\.$/, 'de la Ligue Professionnelle 1']],
  PAISES: [
    { file: 111, id: '93', nome: 'Egypt', continente: 'Africa', lingua: 'ar', sigla: 'EGY', ligas: liga('egy_premier'), capital: { 1: 5e6 } },
    { file: 129, id: '94', nome: 'Morocco', continente: 'Africa', lingua: 'fr', sigla: 'MAR', ligas: liga('mar_botola'), capital: { 1: 4e6 } },
    { file: 140, id: '95', nome: 'South Africa', continente: 'Africa', lingua: 'en_af', sigla: 'RSA', ligas: liga('rsa_premiership'), capital: { 1: 4e6 } },
    { file: 97, id: '96', nome: 'Algeria', continente: 'Africa', lingua: 'fr', sigla: 'ALG', ligas: liga('alg_ligue1'), capital: { 1: 3.5e6 } },
    { file: 145, id: '97', nome: 'Tunisia', continente: 'Africa', lingua: 'fr', sigla: 'TUN', ligas: liga('tun_ligue1'), capital: { 1: 3e6 } },
    { file: 143, id: '98', nome: 'Tanzania', continente: 'Africa', lingua: 'en_af', sigla: 'TAN', ligas: liga('tan_premier'), capital: { 1: 1.5e6 } },
    { file: 110, id: '99', nome: 'DR Congo', continente: 'Africa', lingua: 'fr', sigla: 'COD', ligas: liga('cod_linafoot'), capital: { 1: 1.5e6 } },
    { file: 98, id: '100', nome: 'Angola', continente: 'Africa', lingua: 'pt', sigla: 'ANG', ligas: liga('ang_girabola'), capital: { 1: 2e6 } },
    { file: 117, id: '101', nome: 'Ghana', continente: 'Africa', lingua: 'en_af', sigla: 'GHA', ligas: liga('gha_premier'), capital: { 1: 1.5e6 } },
    { file: 108, id: '102', nome: 'Ivory Coast', continente: 'Africa', lingua: 'fr', sigla: 'CIV', ligas: liga('civ_ligue1'), capital: { 1: 1.5e6 } },
    { file: 126, id: '103', nome: 'Mali', continente: 'Africa', lingua: 'fr', sigla: 'MLI', ligas: liga('mli_ligue1'), capital: { 1: 1e6 } },
    { file: 183, id: '104', nome: 'Saudi Arabia', continente: 'Asia', lingua: 'ar', sigla: 'KSA', ligas: liga('ksa_pro_league'), capital: { 1: 15e6 } },
    { file: 167, id: '105', nome: 'South Korea', continente: 'Asia', lingua: 'ko', sigla: 'KOR', ligas: liga('kor_k1'), capital: { 1: 5e6 } },
    { file: 190, id: '106', nome: 'United Arab Emirates', continente: 'Asia', lingua: 'ar', sigla: 'UAE', ligas: liga('uae_pro_league'), capital: { 1: 8e6 } },
    { file: 161, id: '107', nome: 'Iran', continente: 'Asia', lingua: 'fa', sigla: 'IRN', ligas: liga('irn_pro_league'), capital: { 1: 3e6 } },
    { file: 182, id: '108', nome: 'Qatar', continente: 'Asia', lingua: 'ar', sigla: 'QAT', ligas: liga('qat_stars'), capital: { 1: 8e6 } }
  ],
  NOMES: require('./nomes.cjs').NOMES
};
