/*
=============================================================================
NOTAS DOS JOGADORES — CONFIGURACAO (so dados; calibra-se aqui, sem tocar na logica)
=============================================================================
Cada evento afecta um ou mais COMPONENTES com um valor em "unidades de nota" (o valor da tabela da
especificacao). O motor satura cada componente (tanh) para a nota nunca ser uma soma ilimitada.
=============================================================================
*/
const NotasConfig = {
    neutra: 6.0,
    pesos: { tatico: 0.35, tecnico: 0.30, participacao: 0.25, disciplina: 0.10 },
    amostrasPlenas: 120,      // amostras taticas (1 a cada ~5 s de jogo) para a componente tatica valer por inteiro (~10 min)
    ampTatica: 0.9,           // efeito maximo da qualidade tatica media (unidades de nota)
    janelaErroSeg: 8,         // uma perda de bola ate N s antes de um remate/golo adversario vira "erro que gera ..."
    minutosMoc: 30,           // minimo de minutos para ser Man of the Match
    eventos: {
        GOLO:                  [['tecnico', 0.50], ['participacao', 0.30]],
        ASSISTENCIA:           [['tecnico', 0.30], ['participacao', 0.20]],
        PASSE_DECISIVO:        [['tecnico', 0.08], ['participacao', 0.04]],
        REMATE_NO_GOL:         [['tecnico', 0.08]],
        REMATE_FORA:           [['tecnico', -0.03]],
        GRANDE_CHANCE_PERDIDA: [['tecnico', -0.20]],
        DESARME:               [['tecnico', 0.07], ['participacao', 0.03]],
        INTERCEPTACAO:         [['tecnico', 0.05], ['participacao', 0.03]],
        CORTE:                 [['tecnico', 0.05], ['participacao', 0.02]],
        DUELO_AEREO:           [['tecnico', 0.04]],
        DEFESA:                [['tecnico', 0.10], ['participacao', 0.04]],
        DEFESA_DIFICIL:        [['tecnico', 0.25], ['participacao', 0.10]],
        PASSE_PROGRESSIVO:     [['tecnico', 0.03], ['participacao', 0.02]],
        CRUZAMENTO_CERTO:      [['tecnico', 0.05], ['participacao', 0.02]],
        DRIBLE:                [['tecnico', 0.06], ['participacao', 0.02]],
        PASSE_ERRADO:          [['disciplina', -0.02]],
        ERRO_REMATE:           [['disciplina', -0.20], ['tecnico', -0.10]],
        ERRO_GOLO:             [['disciplina', -0.60], ['tecnico', -0.40], ['tatico', -0.30]],
        FALTA:                 [['disciplina', -0.03]],
        AMARELO:               [['disciplina', -0.15]],
        VERMELHO:              [['disciplina', -0.50], ['tatico', -0.30], ['participacao', -0.20]],
        PENALTI_COMETIDO:      [['disciplina', -0.30], ['tecnico', -0.10]]
    },
    // Tipos defensivos (desempate do Man of the Match).
    defensivos: ['DESARME', 'INTERCEPTACAO', 'CORTE', 'DUELO_AEREO', 'DEFESA', 'DEFESA_DIFICIL'],
    // Posicao do motor -> grupo.
    grupos: { GK: 'GK', CB: 'CB', LB: 'FB', RB: 'FB', LWB: 'FB', RWB: 'FB', DM: 'DM', CM: 'CM', AM: 'CM', LM: 'W', RM: 'W', LW: 'W', RW: 'W', ST: 'ST', CF: 'ST' },
    /*
    Perfil por grupo: `mult` multiplica o valor dos eventos (1 se ausente); `pesos` (opcional) substitui os pesos dos
    componentes (renormalizados); `tatico` multiplica o efeito da qualidade tatica.
    */
    perfis: {
        GK: { pesos: { tatico: 0.20, tecnico: 0.45, participacao: 0.15, disciplina: 0.20 }, mult: { DEFESA: 1.2, DEFESA_DIFICIL: 1.3, ERRO_GOLO: 1.2 }, tatico: 0.8 },
        CB: { mult: { DESARME: 1.2, INTERCEPTACAO: 1.2, CORTE: 1.4, DUELO_AEREO: 1.4, GOLO: 1.1, ERRO_GOLO: 1.15 }, tatico: 1.1 },
        FB: { mult: { DESARME: 1.1, INTERCEPTACAO: 1.1, CRUZAMENTO_CERTO: 1.4, PASSE_PROGRESSIVO: 1.1 }, tatico: 1.0 },
        DM: { mult: { DESARME: 1.3, INTERCEPTACAO: 1.4, CORTE: 1.2, PASSE_PROGRESSIVO: 1.2, GOLO: 1.1 }, tatico: 1.15 },
        CM: { mult: { PASSE_DECISIVO: 1.5, PASSE_PROGRESSIVO: 1.4, ASSISTENCIA: 1.1, DESARME: 0.9 }, tatico: 1.0 },
        W:  { mult: { DRIBLE: 1.5, CRUZAMENTO_CERTO: 1.5, PASSE_DECISIVO: 1.3, DESARME: 0.7 }, tatico: 0.9 },
        ST: { mult: { GOLO: 1.0, REMATE_NO_GOL: 1.2, GRANDE_CHANCE_PERDIDA: 1.1, DESARME: 0.6, INTERCEPTACAO: 0.6, CORTE: 0.5 }, tatico: 0.8 }
    },
    /*
    Playing Styles (chave = nome normalizado: minusculas, espacos/hifens -> '_'). So se aplicam em `posicoes`
    compativeis; fora delas manda o perfil da posicao. `liberdade` (0..1) alarga a tolerancia tatica.
    */
    estilos: {
        box_to_box_midfielder:  { posicoes: ['CM', 'DM'], mult: { DESARME: 1.1, PASSE_DECISIVO: 1.1, GOLO: 1.2 }, liberdade: 0.9 },
        anchor_man:             { posicoes: ['DM'], mult: { INTERCEPTACAO: 1.2, CORTE: 1.2 }, liberdade: 0.2 },
        deep_lying_playmaker:   { posicoes: ['DM', 'CM'], mult: { PASSE_PROGRESSIVO: 1.3, PASSE_DECISIVO: 1.2, DESARME: 0.8 }, liberdade: 0.5 },
        poacher:                { posicoes: ['ST'], mult: { GOLO: 1.0, REMATE_NO_GOL: 1.2, GRANDE_CHANCE_PERDIDA: 1.2 }, liberdade: 0.4 },
        ball_playing_defender:  { posicoes: ['CB'], mult: { PASSE_PROGRESSIVO: 1.5, PASSE_DECISIVO: 1.3 }, liberdade: 0.3 }
    },
    liberdadePadrao: 0.4
};
if (typeof module !== 'undefined') module.exports = NotasConfig;
