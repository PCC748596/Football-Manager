/*
AS SERIES DO BRASIL (composicao de 2026, dada pelo utilizador): A (20), B (20), C (20) e D (96 clubes).

Cada clube: [nome na lista, UF, nome na base (opcional)]. Sem o 3.o campo o nome na base e "Nome-UF" (padrao do jogo: Fluminense-RJ, Fluminense-PI...). Quando o nome ja traz a UF
(Botafogo-PB, Ypiranga-RS, Capital-DF...) fica como esta. Os clubes que ja existem na base entram com o nome que la tem (ex.: Athletico Paranaense -> Atletico-PR).
A UF dos clubes da Serie D vem da ordem da lista (Norte, Nordeste, Centro-Oeste, Sudeste, Sul), que e por estado.
*/
const SERIE_A = [
    ['Athletico Paranaense', 'PR', 'Atlético-PR'], ['Atlético Mineiro', 'MG', 'Atlético-MG'], ['Bahia', 'BA'], ['Botafogo', 'RJ'], ['Chapecoense', 'SC'], ['Corinthians', 'SP'], ['Coritiba', 'PR'],
    ['Cruzeiro', 'MG'], ['Flamengo', 'RJ'], ['Fluminense', 'RJ'], ['Grêmio', 'RS'], ['Internacional', 'RS'], ['Mirassol', 'SP'], ['Palmeiras', 'SP'], ['Red Bull Bragantino', 'SP', 'Bragantino-SP'],
    ['Remo', 'PA'], ['Santos', 'SP'], ['São Paulo', 'SP'], ['Vasco da Gama', 'RJ', 'Vasco-RJ'], ['Vitória', 'BA']
];
const SERIE_B = [
    ['América Mineiro', 'MG', 'América-MG'], ['Athletic Club', 'MG', 'Athletic-MG'], ['Atlético Goianiense', 'GO', 'Atlético-GO'], ['Avaí', 'SC'], ['Botafogo-SP', 'SP'], ['Ceará', 'CE'], ['CRB', 'AL'],
    ['Criciúma', 'SC'], ['Cuiabá', 'MT'], ['Fortaleza', 'CE'], ['Goiás', 'GO'], ['Juventude', 'RS'], ['Londrina', 'PR'], ['Novorizontino', 'SP'], ['Náutico', 'PE'],
    ['Operário Ferroviário', 'PR', 'Operário-PR'], ['Ponte Preta', 'SP'], ['Sport Recife', 'PE', 'Sport-PE'], ['São Bernardo', 'SP'], ['Vila Nova', 'GO']
];
const SERIE_C = [
    ['Amazonas', 'AM'], ['Anápolis', 'GO'], ['Barra FC', 'SC', 'Barra-SC'], ['Botafogo-PB', 'PB'], ['Brusque', 'SC'], ['Caxias', 'RS'], ['Confiança', 'SE'], ['Ferroviária', 'SP'], ['Figueirense', 'SC'],
    ['Floresta', 'CE'], ['Guarani', 'SP'], ['Inter de Limeira', 'SP'], ['Itabaiana', 'SE'], ['Ituano', 'SP'], ['Maranhão', 'MA'], ['Maringá', 'PR'], ['Paysandu', 'PA'], ['Santa Cruz', 'PE'],
    ['Volta Redonda', 'RJ'], ['Ypiranga-RS', 'RS']
];
const D_POR_UF = [
    ['AC', ['Galvez', 'Humaitá', 'Independência']], ['AM', ['Manauara', 'Manaus', 'Nacional-AM']], ['AP', ['Oratório', 'Trem']], ['PA', ['Águia de Marabá', 'Tuna Luso']], ['RO', ['Guaporé', 'Porto Velho']],
    ['RR', ['GAS', 'Monte Roraima', 'São Raimundo-RR']], ['TO', ['Araguaína', 'Tocantinópolis']],
    ['BA', ['Atlético de Alagoinhas', 'Jacuipense', 'Juazeirense', 'Porto-BA']], ['AL', ['ASA', 'CSE', 'CSA']], ['CE', ['Atlético-CE', 'Ferroviário', 'Iguatu', 'Maracanã', 'Tirol']],
    ['MA', ['IAPE', 'Imperatriz', 'Moto Club', 'Sampaio Corrêa']], ['PB', ['Serra Branca', 'Sousa', 'Treze']], ['PE', ['Central', 'Decisão', 'Maguary', 'Retrô']],
    ['PI', ['Altos', 'Fluminense-PI', 'Parnahyba', 'Piauí']], ['RN', ['ABC', 'América-RN', 'Laguna']], ['SE', ['Lagarto', 'Sergipe']],
    ['DF', ['Brasiliense', 'Capital-DF', 'Ceilândia', 'Gama']], ['GO', ['ABECAT', 'Aparecidense', 'CRAC', 'Goiatuba', 'Inhumas']], ['MS', ['Operário-MS', 'Pantanal']],
    ['MT', ['Luverdense', 'Mixto', 'Operário VG', 'Primavera-MT', 'União Rondonópolis']],
    ['ES', ['Real Noroeste', 'Rio Branco-ES', 'Vitória-ES']], ['MG', ['Betim', 'Democrata-GV', 'Pouso Alegre', 'Tombense', 'Uberlândia']],
    ['RJ', ['America-RJ', 'Madureira', 'Maricá', 'Nova Iguaçu', 'Portuguesa-RJ', 'Sampaio Corrêa-RJ']], ['SP', ['Água Santa', 'Noroeste', 'Portuguesa-SP', 'Velo Clube', 'XV de Piracicaba']],
    ['PR', ['Azuriz', 'Cianorte', 'FC Cascavel', 'São Joseense']], ['RS', ['Brasil de Pelotas', 'Guarany de Bagé', 'São José-RS', 'São Luiz']], ['SC', ['Blumenau', 'Joinville', 'Marcílio Dias', 'Santa Catarina']]
];
const SERIE_D = [];
D_POR_UF.forEach(([uf, ns]) => ns.forEach(n => SERIE_D.push([n, uf])));

// Nomes especiais na base: "America-RJ" -> "América-RJ"; "Democrata-GV" (de Governador Valadares) -> "Democrata-MG".
const NOME_ESPECIAL = { 'America-RJ': 'América-RJ', 'Democrata-GV': 'Democrata-MG' };

// Nomes dos jogadores reais que a base tem com outro rotulo: rotulo antigo -> nome certo.
const RENOMEAR_JOGADORES = { 'Náutico-RE': 'Náutico-PE' };

// Classificacao do Brasileirao do ANO ANTERIOR (2025), para a Libertadores/Sul-Americana. De memoria; os promovidos (Coritiba, Remo, Chapecoense) pelo fim. EDITAVEL.
const CLASSIFICACAO_A_ANTERIOR = ['Flamengo-RJ', 'Palmeiras-SP', 'Cruzeiro-MG', 'Mirassol-SP', 'Fluminense-RJ', 'Botafogo-RJ', 'Bahia-BA', 'São Paulo-SP', 'Grêmio-RS', 'Bragantino-SP', 'Atlético-MG', 'Santos-SP',
    'Corinthians-SP', 'Vasco-RJ', 'Vitória-BA', 'Internacional-RS', 'Atlético-PR', 'Coritiba-PR', 'Remo-PA', 'Chapecoense-SC'];

module.exports = { SERIE_A, SERIE_B, SERIE_C, SERIE_D, NOME_ESPECIAL, RENOMEAR_JOGADORES, CLASSIFICACAO_A_ANTERIOR };
