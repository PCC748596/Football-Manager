/*
GRUPO inglaterra_inferiores de tools/gerar_ligas_sav.cjs: os escaloes 5 e 6 da Inglaterra (o 6.o em duas ligas, norte e sul), para a FA Cup — a copa de todas as divisoes, que
o jogo tinha so com as quatro de cima. Ligas OCULTAS (sem calendario): os clubes so entram na FA Cup (rondas de qualificacao); as quatro divisoes de cima nao se tocam
(`manterAte: 4`). Nenhum nome real aqui: o nome real das ligas sai do .sav (sem o patrocinador).

Antes: python tools/parse_countrydata.py <sav>/CountryData14.sav <mod>/local-data/CountryData14.json --game --country 14 --max-tier 7, mantendo o `gameTeamId` dos 92 clubes
que ja la estavam (os escaloes 1-4 do ficheiro sao os mesmos).
*/
module.exports = {
  patrocinio: /\b(Enterprise|Vanarama)\s*/g,
  abreviaturas: [],
  PAISES: [
    { file: 14, id: '65', nome: 'England', continente: 'Europe', lingua: 'en', sigla: 'ENG', existente: { manterAte: 4 },
      ligas: [
        ['eng_national', 5, 0, 0, { oculta: true, nome: 'Fifth Division (England)' }],
        ['eng_national_north', 6, 0, 0, { oculta: true, nome: 'Sixth Division North (England)' }],
        ['eng_national_south', 7, 0, 0, { oculta: true, tier: 6, tierDoNome: 6, nome: 'Sixth Division South (England)' }]
      ],
      capital: { 5: 1.2e6, 6: 0.6e6, 7: 0.6e6 } }
  ],
  NOMES: {}
};
