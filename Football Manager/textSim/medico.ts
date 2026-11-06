import { Player } from '../types';

/**
 * Departamento medico do lado do manager (espelho de 3dMatch/simulador3d/js/injuries/medical_department.js, que cuida do jogo em si).
 * A lesao nasce no 3D com dias reais e estimativa; aqui vive a recuperacao: boletim semanal (evolucao ou recaida) e queda diaria de FIS.
 */
export interface Medico { precisao: number; tempo: number; eficacia: number }

export type Lesao = NonNullable<Player['injury']>;

const PESO_PADRAO = 65;

/** Medico estavel do clube (mesmo clube = mesmo medico), em torno do peso da liga +-10. Sem peso, 65. */
export const medicoDoTime = (teamId: string, pesoLiga: number = PESO_PADRAO): Medico => {
    let h = 0;
    for (let i = 0; i < teamId.length; i++) h = (h * 31 + teamId.charCodeAt(i)) >>> 0;
    const campo = (k: number) => Math.max(50, Math.min(100, pesoLiga + (((h >>> (k * 5)) % 21) - 10)));
    return { precisao: campo(0), tempo: campo(1), eficacia: campo(2) };
};

/** Gravidade para cor e filtros: simples pelos dias, complexa MEDIUM ate 60 dias e SEVERE acima. */
export const severidadeDaLesao = (tipo: 'Simples' | 'Complexa', dias: number): 'LIGHT' | 'MEDIUM' | 'SEVERE' =>
    tipo === 'Simples' ? (dias <= 7 ? 'LIGHT' : 'MEDIUM') : (dias >= 60 ? 'SEVERE' : 'MEDIUM');

/**
 * Boletim semanal de uma lesao Complexa (as simples nao oscilam). `sorte` em 0..100 (injetavel para teste).
 * Muda `daysOut` (o prazo real) e devolve a lesao nova mais o texto do boletim.
 */
export const boletimSemanal = (lesao: Lesao, medico: Medico, sorte: number = Math.random() * 100): { lesao: Lesao; boletim: string } => {
    if (lesao.tipoLesao !== 'Complexa') return { lesao, boletim: lesao.boletim || 'Estável' };
    const chanceEvolucao = medico.eficacia * 0.4;
    const chanceRecaida = (100 - medico.eficacia) * 0.3;
    if (sorte < chanceEvolucao) {
        const ganho = Math.min(lesao.daysOut - 1, Math.ceil(lesao.daysOut * 0.15));
        return { lesao: { ...lesao, daysOut: lesao.daysOut - Math.max(0, ganho) }, boletim: `Evolução excelente: prazo reduziu ${Math.max(0, ganho)} dias.` };
    }
    if (sorte > 100 - chanceRecaida) {
        const atraso = Math.ceil(lesao.daysOut * 0.20);
        return { lesao: { ...lesao, daysOut: lesao.daysOut + atraso }, boletim: `Recaída: dores no treino leve, prazo estendido em ${atraso} dias.` };
    }
    return { lesao, boletim: 'Recuperação dentro do prazo normal.' };
};

/** FIS do dia de um lesionado (a lesao nova tira `quedaFisPorDia`; as antigas seguem a recuperacao de sempre). Devolve null se a lesao e do formato antigo. */
export const variacaoDiariaDeFis = (lesao: Lesao): number | null =>
    typeof lesao.quedaFisPorDia === 'number' ? -lesao.quedaFisPorDia : null;
