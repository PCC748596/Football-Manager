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
    // DESLIGADO ate a etapa 2 (bonus no passe) ser validada num lote grande (36 jogos ligado x desligado): com 12 jogos o resultado foi inconclusivo.
    activo: false,
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
    FLUXO A (sem bola -> portador): o bonus na nota do passe (findPassTarget) a quem avisou a corrida e foi compreendido, por tipo. Multiplica-se pelo Chemistry
    da dupla (/99) e pela confianca do aviso (posicionamento ofensivo e leitura tactica de quem corre). Para comparar: quem infiltra ja leva +400
    (PassModel.bonusInfiltracao) e quem esta livre +300; com Chemistry 99 e confianca 1 isto soma no maximo o valor abaixo.
    */
    bonusPasse: { FORWARD_RUN: 260, BOX_RUN: 300, DIAGONAL_RUN: 240, OVERLAP: 220, UNDERLAP: 220, SUPPORT_RUN: 120 },
    // Uma corrida com o destino a mais disto (m) da posicao actual na largura conta como diagonal.
    diagonalMin: 6.0
};

if (typeof window !== 'undefined') window.ChemistryIntelModel = ChemistryIntelModel;
