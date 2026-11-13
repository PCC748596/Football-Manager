/*
=============================================================================
CHEMISTRY INTELLIGENCE — a comunicacao de intencoes entre companheiros
=============================================================================
Spec: docs/superpowers/specs/2026-11-12-chemistry-intelligence-design.md. Modulo: js/chemistry_intel.js.
O Chemistry da DUPLA (0-99) vem do `synergyMap` do manager (minutos jogados juntos), na mesma regua do Chemistry da tela (textSim/quimica.ts):
`jogosParaTeto` (10) jogos juntos = 99 (pedido: por dupla; o Chemistry do time na tela e a media das duplas dos titulares).
=============================================================================
*/
const ChemistryIntelModel = {
    // LIGADO. Lotes de 36 jogos (OVR 75-80, Chemistry 75, 2026-11-13): lancamentos certos 13.7 -> 17.6 por jogo (+28%) com o acerto de 60% para 58%, passes certos iguais. Ver `lancamento`.
    activo: true,
    debug: false,

    // Chemistry da dupla: minutos juntos / (jogosParaTeto x minutosPorJogo) x 99. Sem dados do manager (3D solto): `semDados`.
    jogosParaTeto: 10,
    minutosPorJogo: 90,
    semDados: 50,

    // Faixas de comunicacao (pedido): o limite de cima de cada uma.
    faixas: [20, 40, 60, 80, 99],
    nomesFaixas: ['inexistente', 'ocasional', 'moderada', 'boa', 'excelente'],

    // O quadro: de quanto em quanto tempo se avalia (s), quantas intencoes ativas por remetente, a distancia minima entre destinos ativos (m).
    intervalo: 0.2,
    maxPorRemetente: 1,
    distMinDestinos: 6.0,
    // Nao repetir a mesma mensagem (mesmo remetente, destinatario e tipo) antes disto (s).
    cooldownRepeticao: 1.5,

    // Validade por tipo (s): 1 a 3 s, conforme a velocidade da jogada.
    validade: {
        FORWARD_RUN: 2.5, DIAGONAL_RUN: 2.2, OVERLAP: 3.0, UNDERLAP: 2.5, SUPPORT_RUN: 1.8, THROUGH_PASS: 2.0, CROSS_TARGET: 2.5,
        SWITCH_PLAY: 2.0, BOX_RUN: 2.5, DECOY_RUN: 2.0, POSITIONAL_SUPPORT: 1.5
    },
    validadePadrao: 2.0,

    // Tamanho do conjunto de mensagens reaproveitadas (sem alocar por frame).
    tamanhoDoPool: 64,

    /*
    COMPREENDER A INTENCAO, por faixa de Chemistry (0 inexistente .. 4 excelente): a chance-base e o atraso (s) ate o destinatario a perceber. A chance e
    multiplicada por (1 - pesoAtributos) + pesoAtributos x os atributos de quem le (visao, compostura, reaccoes; 50 -> 0, 99 -> 1).
    */
    compreensaoBase: [0.03, 0.30, 0.60, 0.85, 0.97],
    atrasoCompreensao: [1.0, 0.7, 0.45, 0.3, 0.15],
    pesoAtributos: 0.4,

    /*
    FLUXO A (sem bola -> portador): a EXECUCAO do passe para quem avisou a corrida e foi compreendido. A bola vai no ponto da corrida avisada (ChemistryIntel
    .pontoDaCorrida) e o erro cai, com Chemistry 99, nestas fracoes: `direcao` no desvio da mira (sigmaDePasse), `forca` no erro de peso. Escala linear com
    o Chemistry da dupla. A escolha do passe nao muda (o bonus na nota piorava os passes certos: lote de 36 jogos, 2026-11-13).
    */
    precisao: { direcao: 0.5, forca: 0.5 },
    /*
    O LANCAMENTO (passe em profundidade), o que mais pesa (pedido). Com a corrida avisada e compreendida: `chance` — o sorteio do lancamento (findThroughBall)
    multiplica-se por 1 + chance x Chemistry/99; `antecipacao` — s que os adversarios perdem a ler o lance (a dupla sai sincronizada), x Chemistry/99, na
    corrida pelo ponto do lancamento (alvoDoLancamento). Meta: com Chemistry 75, ~30% mais lancamentos certos com a mesma percentagem de acerto.
    */
    // `folgaLinha`: quem avisou pode estar ate (1 + folgaLinha x Chemistry/99) vezes mais atras da linha; e nao tem de rasgar a linha entre dois adversarios.
    // `incerteza`: fraccao a menos na incerteza do controle do ponto (o portador le melhor o colega); `ousadia`: quanto desce o pMin (arrisca mais), x Chemistry/99.
    // `exigeRasgar`: 1 = a corrida avisada tambem tem de rasgar a linha entre dois adversarios (0 dispensa-o).
    /*
    Afinado em lotes de 36 jogos (OVR 75-80, Chemistry 75, 2026-11-13): sem `ousadia`, a exigir rasgar a linha, a decisao so aceita a corrida combinada com
    controle >= `pDecisao` e o defesa nao a lanca (`defesaLanca` 0). Resultado: lancamentos certos 13.7 -> 17.6 por jogo (+28%) com 58% de acerto (60% sem
    Chemistry), passes certos iguais. Com `ousadia` 0.12 e sem estes cortes: +46% de certos mas so 51% de acerto.
    */
    lancamento: { chance: 1.0, antecipacao: 0.45, folgaLinha: 0.5, incerteza: 0.5, ousadia: 0, exigeRasgar: 1, pDecisao: 0.62, defesaLanca: 0 },
    /*
    FLUXO B (portador -> sem bola): o portador mostra o espaco nas costas da defesa a um colega que ainda nao corre (THROUGH_PASS) e, se ele compreende,
    arranca antes do passe. `intervalo`: s entre leituras do mesmo portador; `pMin`: controle minimo do ponto para o mostrar; `longeDaLinha`: m maximos do
    colega a linha adversaria; `chemMin`: Chemistry minimo da dupla (abaixo disto nem se tenta: nao ha leitura).
    */
    fluxoB: { activo: true, intervalo: 0.6, pMin: 0.5, longeDaLinha: 18, chemMin: 21 },
    // O ponto do encontro (passe directo) so se usa com nenhum adversario a menos disto (m) dele e a linha de passe com esta folga (m); senao, o de sempre.
    folgaNoPonto: 2.0,
    folgaNaLinha: 1.2,
    // Uma corrida com o destino a mais disto (m) da posicao actual na largura conta como diagonal.
    diagonalMin: 6.0
};

if (typeof window !== 'undefined') window.ChemistryIntelModel = ChemistryIntelModel;
