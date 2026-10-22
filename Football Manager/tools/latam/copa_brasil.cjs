/*
OS CLUBES DA COPA DO BRASIL (formato de 2026, dado pelo utilizador): 126 clubes, 9 fases.
  1.a fase  28 clubes, jogo unico          5.a fase  32 clubes (12 + os 20 da Serie A), ida e volta
  2.a fase  88 clubes (14 + 74), jogo unico  Oitavas, quartas, meias: ida e volta
  3.a fase  48 clubes (44 + 4 campeoes), jogo unico   Final: jogo unico (6 de dezembro, Brasilia)
  4.a fase  24 clubes, jogo unico
Empate: penaltis (em ida e volta, agregado e depois penaltis; sem gol fora).

No JOGO a Serie A e a do jogo (os 20 clubes de `bra_serie_a`, que entram na 5.a fase), e nao a de 2026: os outros clubes da lista entram pelas fases baixas, os piores 28 (pela forca)
na 1.a. Sao 127 clubes com os 20 da Serie A do jogo (o Criciuma nao esta na lista de 2026); o Santa Catarina fica de fora para ficarem 126 e as contas das fases baterem certo.

`JA_NA_BASE`: nome na lista -> nome do clube que ja existe na base do jogo. Os outros sao CRIADOS pelo gerador (tools/gerar_clubes_brasil.cjs) como "Nome-UF".
*/
const SERIE_A_2026 = ['Flamengo', 'Corinthians', 'Palmeiras', 'Atlético-MG', 'São Paulo', 'Fluminense', 'Botafogo', 'Athletico-PR', 'Bahia', 'Vasco', 'Cruzeiro', 'Grêmio', 'Internacional',
    'Red Bull Bragantino', 'Santos', 'Vitória', 'Coritiba', 'Mirassol', 'Chapecoense', 'Remo'];
// Campeoes de competicoes de 2025 (entram na 3.a fase).
const CAMPEOES = { 'Paysandu': 'PA', 'Ponte Preta': 'SP', 'Confiança': 'SE', 'Barra': 'SC' };

// Classificados pelos estaduais, por UF.
const ESTADUAIS = {
    AC: ['Galvez', 'Independência', 'Vasco'], AL: ['ASA', 'CRB', 'CSA', 'Penedense'], AM: ['Amazonas', 'Manauara', 'Manaus', 'Nacional'], AP: ['Independente', 'Oratório', 'Trem'],
    BA: ['Atlético de Alagoinhas', 'Jacuipense', 'Juazeirense', 'Porto'], CE: ['Ceará', 'Fortaleza', 'Maracanã', 'Tirol'], DF: ['Capital', 'Ceilândia', 'Gama'],
    ES: ['Desportiva Ferroviária', 'Porto Vitória', 'Rio Branco'], GO: ['Anápolis', 'Atlético-GO', 'Goiás', 'Vila Nova'], MA: ['IAPE', 'Imperatriz', 'Maranhão'],
    MG: ['América-MG', 'Athletic', 'Betim', 'Tombense', 'Uberlândia'], MT: ['Cuiabá', 'Mixto', 'Operário VG', 'Primavera'], MS: ['Pantanal', 'Ivinhema', 'Operário'],
    PA: ['Águia de Marabá', 'Bragantino', 'Castanhal', 'Tuna Luso'], PB: ['Botafogo', 'Serra Branca', 'Sousa'], PE: ['Maguary', 'Retrô', 'Santa Cruz', 'Sport'], PI: ['Altos', 'Fluminense', 'Piauí'],
    PR: ['Azuriz', 'Cianorte', 'Londrina', 'Maringá', 'Operário-PR'], RJ: ['Boavista', 'Madureira', 'Nova Iguaçu', 'Portuguesa', 'Sampaio Corrêa', 'Volta Redonda'], RN: ['ABC', 'América', 'Laguna'],
    RO: ['Guaporé', 'Ji-Paraná', 'Porto Velho'], RR: ['Baré', 'GAS', 'Monte Roraima'], RS: ['Caxias', 'Guarany de Bagé', 'Juventude', 'São Luiz', 'Ypiranga'],
    SC: ['Avaí', 'Figueirense', 'Joinville', 'Santa Catarina'], SE: ['América de Propriá', 'Itabaiana', 'Lagarto'], SP: ['Guarani', 'Novorizontino', 'Portuguesa', 'Primavera', 'São Bernardo', 'Velo Clube'],
    TO: ['Araguaína', 'Capital', 'Tocantinópolis']
};

// Clubes da lista que ja existem na base (Serie A e B do jogo): "Nome|UF" -> nome na base.
const JA_NA_BASE = {
    'Flamengo|': 'Flamengo-RJ', 'Corinthians|': 'Corinthians-SP', 'Palmeiras|': 'Palmeiras-SP', 'Atlético-MG|': 'Atlético-MG', 'São Paulo|': 'São Paulo-SP', 'Fluminense|': 'Fluminense-RJ',
    'Botafogo|': 'Botafogo-RJ', 'Athletico-PR|': 'Atlético-PR', 'Bahia|': 'Bahia-BA', 'Vasco|': 'Vasco-RJ', 'Cruzeiro|': 'Cruzeiro-MG', 'Grêmio|': 'Grêmio-RS', 'Internacional|': 'Internacional-RS',
    'Red Bull Bragantino|': 'Bragantino-SP', 'Santos|': 'Santos-SP', 'Vitória|': 'Vitória-BA', 'Coritiba|': 'Coritiba-PR', 'Mirassol|': 'Mirassol-SP', 'Chapecoense|': 'Chapecoense-SC',
    'Paysandu|PA': 'Paysandu-PA', 'Ponte Preta|SP': 'Ponte Preta-SP', 'Ceará|CE': 'Ceará-CE', 'Fortaleza|CE': 'Fortaleza-CE', 'Atlético-GO|GO': 'Atlético-GO', 'Goiás|GO': 'Goiás-GO',
    'Vila Nova|GO': 'Vila Nova-GO', 'América-MG|MG': 'América-MG', 'Cuiabá|MT': 'Cuiabá-MT', 'Operário-PR|PR': 'Operário-PR', 'Sport|PE': 'Sport-PE', 'Juventude|RS': 'Juventude-RS',
    'Avaí|SC': 'Avaí-SC', 'Guarani|SP': 'Guarani-SP', 'Novorizontino|SP': 'Novorizontino-SP', 'Amazonas|AM': 'Amazonas-AM', 'CRB|AL': 'CRB-AL'
};

// Fora da lista para as contas baterem certo (ver o cabecalho).
const FORA = [];

// Nivel de forca dos clubes CRIADOS (OVR medio do onze): alto 55, medio 51, baixo 47. Por omissao: medio; UFs pequenas: baixo.
const ALTOS = ['Remo|', 'CSA|AL', 'Santa Cruz|PE', 'Figueirense|SC', 'Joinville|SC', 'Londrina|PR', 'Volta Redonda|RJ', 'Tombense|MG', 'ABC|RN', 'América|RN', 'Botafogo|PB', 'Confiança|SE',
    'São Bernardo|SP', 'Portuguesa|SP', 'Maringá|PR', 'Caxias|RS', 'Ypiranga|RS', 'Manaus|AM', 'Altos|PI', 'Sampaio Corrêa|RJ', 'Retrô|PE', 'Cianorte|PR', 'Uberlândia|MG', 'Anápolis|GO',
    'Madureira|RJ', 'Nova Iguaçu|RJ', 'Itabaiana|SE', 'Maranhão|MA', 'Imperatriz|MA', 'Operário|MS', 'Brusque|SC'];
const UF_BAIXAS = ['AC', 'AP', 'RR', 'RO', 'TO'];

// Cidades que conheco (o resto fica na capital do estado: sao dados a rever no Editor).
const CIDADES = {
    'Remo|': 'Belém', 'CSA|AL': 'Maceió', 'ASA|AL': 'Arapiraca', 'Penedense|AL': 'Penedo', 'Santa Cruz|PE': 'Recife', 'Retrô|PE': 'Camaragibe', 'Maguary|PE': 'Vitória de Santo Antão',
    'Figueirense|SC': 'Florianópolis', 'Joinville|SC': 'Joinville', 'Barra|SC': 'Balneário Camboriú', 'Londrina|PR': 'Londrina', 'Maringá|PR': 'Maringá', 'Cianorte|PR': 'Cianorte', 'Azuriz|PR': 'Pato Branco',
    'Volta Redonda|RJ': 'Volta Redonda', 'Madureira|RJ': 'Rio de Janeiro', 'Nova Iguaçu|RJ': 'Nova Iguaçu', 'Boavista|RJ': 'Saquarema', 'Portuguesa|RJ': 'Rio de Janeiro', 'Sampaio Corrêa|RJ': 'Saquarema',
    'Tombense|MG': 'Tombos', 'Uberlândia|MG': 'Uberlândia', 'Betim|MG': 'Betim', 'Athletic|MG': 'São João del-Rei', 'ABC|RN': 'Natal', 'América|RN': 'Natal', 'Laguna|RN': 'Natal',
    'Botafogo|PB': 'João Pessoa', 'Sousa|PB': 'Sousa', 'Serra Branca|PB': 'Serra Branca', 'Confiança|SE': 'Aracaju', 'Itabaiana|SE': 'Itabaiana', 'Lagarto|SE': 'Lagarto',
    'São Bernardo|SP': 'São Bernardo do Campo', 'Portuguesa|SP': 'São Paulo', 'Primavera|SP': 'Indaiatuba', 'Velo Clube|SP': 'Rio Claro', 'Caxias|RS': 'Caxias do Sul', 'Ypiranga|RS': 'Erechim',
    'Guarany de Bagé|RS': 'Bagé', 'São Luiz|RS': 'Ijuí', 'Manaus|AM': 'Manaus', 'Nacional|AM': 'Manaus', 'Manauara|AM': 'Manaus', 'Altos|PI': 'Altos', 'Fluminense|PI': 'Teresina', 'Piauí|PI': 'Teresina',
    'Anápolis|GO': 'Anápolis', 'Mixto|MT': 'Cuiabá', 'Operário VG|MT': 'Várzea Grande', 'Primavera|MT': 'Primavera do Leste', 'Tuna Luso|PA': 'Belém', 'Castanhal|PA': 'Castanhal',
    'Águia de Marabá|PA': 'Marabá', 'Bragantino|PA': 'Bragança', 'Maranhão|MA': 'São Luís', 'IAPE|MA': 'São Luís', 'Imperatriz|MA': 'Imperatriz', 'Ceilândia|DF': 'Brasília', 'Gama|DF': 'Gama', 'Capital|DF': 'Brasília',
    'Jacuipense|BA': 'Riachão do Jacuípe', 'Juazeirense|BA': 'Juazeiro', 'Atlético de Alagoinhas|BA': 'Alagoinhas', 'Porto|BA': 'Porto Seguro', 'Tirol|CE': 'Fortaleza', 'Maracanã|CE': 'Maracanaú',
    'Desportiva Ferroviária|ES': 'Cariacica', 'Porto Vitória|ES': 'Vitória', 'Rio Branco|ES': 'Vitória', 'Araguaína|TO': 'Araguaína', 'Capital|TO': 'Palmas', 'Tocantinópolis|TO': 'Tocantinópolis',
    'Guaporé|RO': 'Rolim de Moura', 'Ji-Paraná|RO': 'Ji-Paraná', 'Porto Velho|RO': 'Porto Velho', 'Baré|RR': 'Boa Vista', 'GAS|RR': 'Boa Vista', 'Monte Roraima|RR': 'Boa Vista',
    'Galvez|AC': 'Rio Branco', 'Independência|AC': 'Rio Branco', 'Vasco|AC': 'Rio Branco', 'Independente|AP': 'Tucuruí', 'Oratório|AP': 'Macapá', 'Trem|AP': 'Macapá',
    'Pantanal|MS': 'Corumbá', 'Ivinhema|MS': 'Ivinhema', 'Operário|MS': 'Campo Grande', 'América de Propriá|SE': 'Propriá'
};
const CAPITAIS = { AC: 'Rio Branco', AL: 'Maceió', AM: 'Manaus', AP: 'Macapá', BA: 'Salvador', CE: 'Fortaleza', DF: 'Brasília', ES: 'Vitória', GO: 'Goiânia', MA: 'São Luís', MG: 'Belo Horizonte', MS: 'Campo Grande',
    MT: 'Cuiabá', PA: 'Belém', PB: 'João Pessoa', PE: 'Recife', PI: 'Teresina', PR: 'Curitiba', RJ: 'Rio de Janeiro', RN: 'Natal', RO: 'Porto Velho', RR: 'Boa Vista', RS: 'Porto Alegre', SC: 'Florianópolis',
    SE: 'Aracaju', SP: 'São Paulo', TO: 'Palmas' };

module.exports = { SERIE_A_2026, CAMPEOES, ESTADUAIS, JA_NA_BASE, FORA, ALTOS, UF_BAIXAS, CIDADES, CAPITAIS };
