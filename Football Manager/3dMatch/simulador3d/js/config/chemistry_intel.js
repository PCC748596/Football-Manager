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
    tamanhoDoPool: 64
};

if (typeof window !== 'undefined') window.ChemistryIntelModel = ChemistryIntelModel;
