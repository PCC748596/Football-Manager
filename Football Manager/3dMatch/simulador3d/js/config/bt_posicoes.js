/*
=============================================================================
A DECISAO COM BOLA POR POSICAO (e por playing style)
=============================================================================
Pedido: cada posicao tem a sua sequencia de decisao (o BT do zagueiro nao e o do ala), e cada playing style so mexe nas EXCEPCOES dessa posicao.

A arvore `DecisaoComBola` (bt/player_bt.js) e uma lista de nos com NOME (`NOS_COM_BOLA`). A ordem padrao e a de sempre. Aqui, por GRUPO de posicao, ficam as
OPERACOES sobre essa ordem, e por playing style as excepcoes por cima das do grupo. O primeiro no que der SUCESSO manda, por isso a ordem e a prioridade.

    operacoes:  { tipo: 'antes',  no: 'A', ref: 'B' }   poe A imediatamente antes de B
                { tipo: 'depois', no: 'A', ref: 'B' }   poe A imediatamente depois de B
                { tipo: 'remover', no: 'A' }            tira A (essa posicao nunca o faz)
    grupos:     CB, FB (LB/RB/LWB/RWB), DM, CM, WM (LM/RM), WF (LW/RW), AM, ST (CF/ST/SS)
    estilos:    chave do playing style (p.playingStyle) -> { grupo, operacoes }: aplicadas depois das do grupo, so a quem tem esse estilo (e nao o desligou)

Nos disponiveis (ordem padrao): ver `ORDEM_PADRAO_COM_BOLA` em bt/player_bt.js. Sem nenhuma operacao em lado nenhum a arvore e a de sempre (provado por `tools/headless/impressao.js`).
=============================================================================
*/
const BTPosicoes = {
    activo: true,
    grupoDe: { CB: 'CB', LB: 'FB', RB: 'FB', LWB: 'FB', RWB: 'FB', DM: 'DM', CM: 'CM', LM: 'WM', RM: 'WM', LW: 'WF', RW: 'WF', AM: 'AM', CF: 'ST', ST: 'ST', SS: 'ST' },
    grupos: {
        // Zagueiro: sobrevive e constroi. Nao dribla, nao cruza, nao rotaciona; circula antes de conduzir.
        CB: { operacoes: [
            { tipo: 'remover', no: 'DriblarGuardaRedes' }, { tipo: 'remover', no: 'DriblarNaArea' }, { tipo: 'remover', no: 'Cruzar' },
            { tipo: 'remover', no: 'CFLancaAsPontas' }, { tipo: 'remover', no: 'RotacaoDeJogo' }, { tipo: 'remover', no: 'AlaDriblaAntes' }, { tipo: 'remover', no: 'Driblar' },
            { tipo: 'antes', no: 'CircularNaDefesa', ref: 'ConduzirEmEspaco' }
        ] },
        // Lateral: conduz o corredor e dribla quando o caminho fecha, antes de buscar o passe.
        FB: { operacoes: [
            { tipo: 'remover', no: 'CFLancaAsPontas' }, { tipo: 'remover', no: 'DriblarGuardaRedes' },
            { tipo: 'antes', no: 'Driblar', ref: 'CaminhoFechado' }
        ] },
        // Volante: circula e protege; nao dribla nem cruza.
        DM: { operacoes: [
            { tipo: 'remover', no: 'DriblarGuardaRedes' }, { tipo: 'remover', no: 'DriblarNaArea' }, { tipo: 'remover', no: 'Cruzar' }, { tipo: 'remover', no: 'CFLancaAsPontas' },
            { tipo: 'remover', no: 'RotacaoDeJogo' }, { tipo: 'remover', no: 'AlaDriblaAntes' }, { tipo: 'remover', no: 'Driblar' },
            { tipo: 'antes', no: 'CircularNaDefesa', ref: 'ConduzirEmEspaco' }
        ] },
        // Meia central: a sequencia de sempre, sem o que e dos outros.
        CM: { operacoes: [
            { tipo: 'remover', no: 'CFLancaAsPontas' }, { tipo: 'remover', no: 'DriblarGuardaRedes' }, { tipo: 'remover', no: 'AlaDriblaAntes' }, { tipo: 'remover', no: 'Cruzar' }
        ] },
        // Meia da ala (LM/RM): cruza antes de rematar do corredor, e dribla quando o caminho fecha.
        WM: { operacoes: [
            { tipo: 'remover', no: 'CFLancaAsPontas' },
            { tipo: 'antes', no: 'Cruzar', ref: 'Rematar' },
            { tipo: 'antes', no: 'Driblar', ref: 'CaminhoFechado' }
        ] },
        // Ponta (LW/RW): pode cortar para dentro e rematar (Rematar antes de Cruzar), dribla antes da saida de passe.
        WF: { operacoes: [
            { tipo: 'remover', no: 'CFLancaAsPontas' },
            { tipo: 'antes', no: 'Driblar', ref: 'CaminhoFechado' }
        ] },
        // Meia atacante: dribla antes da saida de passe.
        AM: { operacoes: [
            { tipo: 'remover', no: 'CFLancaAsPontas' }, { tipo: 'remover', no: 'AlaDriblaAntes' },
            { tipo: 'antes', no: 'Driblar', ref: 'CaminhoFechado' }
        ] },
        // Avancado: so ele lanca para as pontas; nao rotaciona nem faz as coisas do corredor.
        ST: { operacoes: [
            { tipo: 'remover', no: 'RotacaoDeJogo' }, { tipo: 'remover', no: 'AlaDriblaAntes' }
        ] }
    },
    // As EXCEPCOES dos playing styles, por cima do grupo da posicao (aplicadas a quem tem esse estilo e nao o desligou).
    estilos: [
        // Zagueiros
        { estilo: 'extra_frontman', grupo: 'CB', operacoes: [{ tipo: 'antes', no: 'ConduzirEmEspaco', ref: 'CircularNaDefesa' }] },      // quebra a linha conduzindo
        { estilo: 'build_up', grupo: 'CB', operacoes: [{ tipo: 'antes', no: 'ProcurarPasse', ref: 'CircularNaDefesa' }] },               // avalia todos os passes
        // Meio-campo
        { estilo: 'anchor_man', grupo: 'DM', operacoes: [{ tipo: 'remover', no: 'ConduzirEmEspaco' }] },                                 // nao corre com a bola
        { estilo: 'orchestrator', grupo: 'DM', operacoes: [{ tipo: 'antes', no: 'ProcurarPasse', ref: 'CircularNaDefesa' }] },
        { estilo: 'orchestrator', grupo: 'CM', operacoes: [{ tipo: 'antes', no: 'ProcurarPasse', ref: 'ConduzirEmEspaco' }] },
        { estilo: 'the_destroyer', grupo: 'CM', operacoes: [{ tipo: 'remover', no: 'Driblar' }] },
        { estilo: 'creative_playmaker', grupo: 'AM', operacoes: [{ tipo: 'antes', no: 'ProcurarPasse', ref: 'ConduzirEmEspaco' }] },
        { estilo: 'classic_no10', grupo: 'AM', operacoes: [{ tipo: 'antes', no: 'ProcurarPasse', ref: 'ConduzirEmEspaco' }] },
        { estilo: 'hole_player', grupo: 'AM', operacoes: [{ tipo: 'antes', no: 'ProcurarPasse', ref: 'ConduzirEmEspaco' }] },
        // Alas
        { estilo: 'creative_playmaker', grupo: 'WM', operacoes: [{ tipo: 'antes', no: 'ProcurarPasse', ref: 'ConduzirEmEspaco' }] },
        { estilo: 'creative_playmaker', grupo: 'WF', operacoes: [{ tipo: 'antes', no: 'ProcurarPasse', ref: 'ConduzirEmEspaco' }] },
        { estilo: 'hole_player', grupo: 'WM', operacoes: [{ tipo: 'antes', no: 'ProcurarPasse', ref: 'ConduzirEmEspaco' }] },
        { estilo: 'cross_specialist', grupo: 'WM', operacoes: [{ tipo: 'antes', no: 'Cruzar', ref: 'DriblarNaArea' }] },
        { estilo: 'cross_specialist', grupo: 'WF', operacoes: [{ tipo: 'antes', no: 'Cruzar', ref: 'Rematar' }] },
        { estilo: 'prolific_winger', grupo: 'WF', operacoes: [{ tipo: 'antes', no: 'ConduzirEmEspaco', ref: 'LancarParaIntencao' }] },
        { estilo: 'roaming_flank', grupo: 'WM', operacoes: [{ tipo: 'antes', no: 'ConduzirEmEspaco', ref: 'LancarParaIntencao' }] },
        { estilo: 'roaming_flank', grupo: 'WF', operacoes: [{ tipo: 'antes', no: 'ConduzirEmEspaco', ref: 'LancarParaIntencao' }] },
        // Laterais
        { estilo: 'offensive_fullback', grupo: 'FB', operacoes: [{ tipo: 'antes', no: 'ConduzirEmEspaco', ref: 'LancarParaIntencao' }] },
        { estilo: 'fullback_finisher', grupo: 'FB', operacoes: [{ tipo: 'antes', no: 'Rematar', ref: 'Cruzar' }] },
        { estilo: 'defensive_fullback', grupo: 'FB', operacoes: [{ tipo: 'remover', no: 'Driblar' }, { tipo: 'antes', no: 'CircularNaDefesa', ref: 'ConduzirEmEspaco' }] },
        // Avancados
        { estilo: 'target_man', grupo: 'ST', operacoes: [{ tipo: 'antes', no: 'ProcurarPasse', ref: 'ConduzirEmEspaco' }] },            // segura e devolve
        { estilo: 'dummy_runner', grupo: 'ST', operacoes: [{ tipo: 'antes', no: 'ProcurarPasse', ref: 'ConduzirEmEspaco' }] }
    ]
};
if (typeof window !== 'undefined') window.BTPosicoes = BTPosicoes;
