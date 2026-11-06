
class MedicalDepartment {
    /**
     * Gera os atributos do médico baseando-se no "peso" da liga do clube.
     * @param {number} pesoLiga - Ex: Premier League = 85, Série B Brasil = 60, Série D = 45
     * @returns {Object} Medico { precisao, tempo, eficacia }
     */
    static gerarMedicoProcedural(pesoLiga) {
        const randomGrd = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
        const clamp = (val) => Math.max(50, Math.min(100, val)); // Limite entre 50 e 100

        return {
            precisao: clamp(pesoLiga + randomGrd(-10, 10)),
            tempo: clamp(pesoLiga + randomGrd(-10, 10)),
            eficacia: clamp(pesoLiga + randomGrd(-10, 10))
        };
    }

    /**
     * Registra uma nova lesão sofrida por um jogador
     * @param {Object} jogador - Objeto do jogador
     * @param {Object} lesao - A lesão sorteada do database
     * @param {Object} medico - Objeto do médico da equipe
     */
    static registrarNovaLesao(jogador, lesao, medico) {
        // 1. Calcula o tempo real base (Oculto)
        const tempoRealBase = Math.floor(Math.random() * (lesao.baseDiasMax - lesao.baseDiasMin + 1)) + lesao.baseDiasMin;

        // 2. Aplica redução baseada na Skill de 'Tempo' do Médico
        // Médico Nota 100 reduz o tempo em até 20%. Médico Nota 50 não reduz nada.
        const fatorReducaoTempo = ((medico.tempo - 50) / 50) * 0.20; 
        let tempoRealComTratamento = Math.ceil(tempoRealBase * (1 - fatorReducaoTempo));

        // 3. Aplica o erro de 'Precisão' para dar a estimativa ao Manager
        // Médico Nota 100: 0% de erro (exato). Médico Nota 50: Até 40% de erro na previsão inicial
        const margemErroPrevisao = ((100 - medico.precisao) / 50) * 0.40; 
        const diasErro = Math.floor(tempoRealComTratamento * margemErroPrevisao);
        
        const janelaEstimadaMin = Math.max(1, tempoRealComTratamento - diasErro);
        const janelaEstimadaMax = tempoRealComTratamento + diasErro;

        const relatorio = {
            idLesao: lesao.id,
            nomeLesao: lesao.nome,
            tipo: lesao.tipo,
            diasRestantesReais: tempoRealComTratamento, 
            estimativaManager: `Entre ${janelaEstimadaMin} e ${janelaEstimadaMax} dias`, 
            ativa: true
        };

        return relatorio;
    }

    /**
     * Processa a recuperação diária/semanal
     * Roda para gerar eventos dinâmicos (recaídas ou curas milagrosas)
     */
    static processarBoletimSemanal(registroLesao, medico) {
        if (!registroLesao.ativa || registroLesao.tipo === 'Simples') return { status: 'Estável' };

        const sorte = Math.random() * 100;
        
        const chanceEvolucao = medico.eficacia * 0.4; // max 40%
        const chanceRecaida = (100 - medico.eficacia) * 0.3; // max 15%

        if (sorte < chanceEvolucao) {
            const ganho = Math.ceil(registroLesao.diasRestantesReais * 0.15);
            registroLesao.diasRestantesReais -= ganho;
            return { status: 'Evolução Excelente', msg: `O jogador está respondendo maravilhosamente ao tratamento, o prazo reduziu em ${ganho} dias.` };
        } else if (sorte > (100 - chanceRecaida)) {
            const atraso = Math.ceil(registroLesao.diasRestantesReais * 0.20);
            registroLesao.diasRestantesReais += atraso;
            return { status: 'Recaída', msg: `O jogador sentiu dores no treino leve. O prazo foi estendido em ${atraso} dias.` };
        }

        return { status: 'Estável', msg: `A recuperação segue dentro do prazo normal.` };
    }

    static decairCondicaoFisica(jogador, lesao) {
        jogador.FIS = Math.max(0, (jogador.FIS || 100) - lesao.quedaFisPorDia);
    }
}