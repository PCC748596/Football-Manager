import { INJURY_DATABASE } from './injury_database.js';

export class InMatchInjuryEngine {
    /**
     * Calcula se o jogador se machucou baseado numa dividida/falta.
     * Deve ser chamado quando ocorre um desarme, falta ou impacto aéreo no match_physics.js
     * 
     * @param {number} gravidadeImpacto - Força do impacto (0.0 a 1.0)
     * @param {number} injuryProneness - Propensão a lesão do jogador (0.0 a 1.0)
     */
    static calcularGatilhoLesaoContato(gravidadeImpacto, injuryProneness) {
        // Multiplicador base para lesões de contato
        const CHANCE_BASE = 0.05;
        const chanceLesao = gravidadeImpacto * injuryProneness * CHANCE_BASE;

        if (Math.random() < chanceLesao) {
            // No contato, filtramos preferencialmente lesões articulares e ósseas (ou gerais)
            const lesoesPossiveis = INJURY_DATABASE.filter(l => ['Joelho', 'Tornozelo', 'Pe', 'Rosto', 'Ombro', 'Perna', 'Cabeca'].includes(l.parteCorpo));
            const lesaoSorteada = lesoesPossiveis[Math.floor(Math.random() * lesoesPossiveis.length)] || INJURY_DATABASE[0];
            const estadoInMatch = this._decidirEstadoInMatch(lesaoSorteada);

            return {
                sofreuLesao: true,
                lesao: lesaoSorteada,
                estado: estadoInMatch // 'Forced', 'Requested', 'Hurt'
            };
        }
        return { sofreuLesao: false };
    }

    /**
     * Calcula se o jogador se machucou sozinho (arrancada, fadiga, distensão)
     * Deve ser chamado periodicamente para jogadores em alta velocidade
     * 
     * @param {number} esforcoAtual - Medida do esforço (ex: % de stamina perdida ou velocidade alta)
     * @param {number} injuryProneness - Propensão a lesão (0.0 a 1.0)
     */
    static calcularGatilhoLesaoSemContato(esforcoAtual, injuryProneness) {
        // Chance muito baixa, pois roda frequentemente enquanto o jogador corre
        const CHANCE_BASE = 0.0001;
        const chanceLesao = esforcoAtual * injuryProneness * CHANCE_BASE;

        if (Math.random() < chanceLesao) {
            // Sem contato, filtramos preferencialmente lesões musculares
            const lesoesPossiveis = INJURY_DATABASE.filter(l => ['Coxa', 'Panturrilha', 'Virilha', 'Costas', 'Geral'].includes(l.parteCorpo));
            const lesaoSorteada = lesoesPossiveis[Math.floor(Math.random() * lesoesPossiveis.length)] || INJURY_DATABASE[1];
            const estadoInMatch = this._decidirEstadoInMatch(lesaoSorteada);

            return {
                sofreuLesao: true,
                lesao: lesaoSorteada,
                estado: estadoInMatch
            };
        }
        return { sofreuLesao: false };
    }

    static _decidirEstadoInMatch(lesao) {
        const rnd = Math.random() * 100;
        let acumulador = 0;
        for (const [estado, peso] of Object.entries(lesao.estadosPossiveisInMatch)) {
            acumulador += peso;
            if (rnd <= acumulador) return estado;
        }
        return 'Hurt'; // Fallback
    }

    /**
     * Aplica um debuff imediato nos atributos do jogador caso ele continue jogando 'Baleado' (Hurt)
     * @param {Object} jogador 
     */
    static aplicarDebuffBaleado(jogador) {
        if (!jogador.isBaleado) {
            jogador.isBaleado = true;
            jogador.minutosBaleado = 0;
            jogador.atributosOriginais = {
                velocidade: jogador.velocidade,
                aceleracao: jogador.aceleracao,
                agilidade: jogador.agilidade
            };

            // Perde 20% das capacidades físicas
            jogador.velocidade *= 0.80;
            jogador.aceleracao *= 0.80;
            jogador.agilidade *= 0.80;
        }
    }

    /**
     * Roda a cada X minutos (via fsm.js ou match_loop.js). Verifica se o jogador agravou a lesão.
     * @param {Object} jogador 
     */
    static processarRiscoAgravamento(jogador) {
        if (!jogador.isBaleado) return { agravou: false };

        jogador.minutosBaleado += 1;
        const riscoBase = 0.02; // 2% a cada minuto/verificação

        // Quanto mais tempo baleado, maior a chance
        const chanceAgravamento = riscoBase * (jogador.minutosBaleado / 5);

        if (Math.random() < chanceAgravamento) {
            // Sorteia uma lesão do tipo Complexa (Agravou!)
            const lesoesGrave = INJURY_DATABASE.filter(l => l.tipo === 'Complexa');
            const lesaoAgravada = lesoesGrave[Math.floor(Math.random() * lesoesGrave.length)];

            return {
                agravou: true,
                novaLesao: lesaoAgravada,
                novoEstado: 'Forced' // Maca entra obrigatoriamente
            };
        }
        return { agravou: false };
    }
}