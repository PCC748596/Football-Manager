import { Player, Team, Medico } from '../types';
import { criarRng } from './contracts';

/**
 * Departamento medico do lado do manager (espelho de 3dMatch/simulador3d/js/injuries/medical_department.js, que cuida do jogo em si).
 * O medico e do CLUBE (`Team.medico`, no save): nasce na criacao do clube, com o nivel da divisao dele (as mesmas faixas de OVR dos clubes, `faixaDeOvr`), e vai tambem ao 3D.
 * A lesao nasce no 3D com dias reais e estimativa; aqui vive a recuperacao: boletim semanal (evolucao ou recaida) e queda diaria de FIS.
 */
export type { Medico };

export type Lesao = NonNullable<Player['injury']>;

const PESO_PADRAO = 65;

const NOMES = ['Carlos', 'Roberto', 'Marcelo', 'Eduardo', 'Fernando', 'Rafael', 'Ricardo', 'Gustavo', 'André', 'Paulo', 'Luiz', 'Sérgio', 'Thiago', 'Henrique', 'Daniel', 'Márcio', 'Renato', 'Leonardo', 'Alexandre', 'Rodrigo'];
const SOBRENOMES = ['Silva', 'Souza', 'Oliveira', 'Santos', 'Lima', 'Pereira', 'Costa', 'Ribeiro', 'Almeida', 'Carvalho', 'Gomes', 'Martins', 'Rocha', 'Barbosa', 'Ferreira', 'Nogueira', 'Teixeira', 'Moreira', 'Araújo', 'Cardoso'];

/** O peso do medico de uma divisao: a media da faixa de OVR dela ([mais forte, mais fraco]). Sem faixa, 65. */
export const pesoDaFaixa = (faixa: [number, number] | null | undefined): number => (faixa ? (faixa[0] + faixa[1]) / 2 : PESO_PADRAO);

/**
 * O medico de um clube: nota de cada skill = peso da divisao +-10 (entre 50 e 100), sorteada com a semente do clube (o mesmo clube da sempre o mesmo medico). O sorteio e o do
 * MedicalDepartment.gerarMedicoProcedural, com `pesoLiga` vindo da faixa de OVR da divisao.
 */
export const gerarMedico = (teamId: string, faixa?: [number, number] | null): Medico => {
    const rng = criarRng('medico|' + teamId);
    const peso = pesoDaFaixa(faixa);
    const campo = () => Math.max(50, Math.min(100, Math.round(peso) + Math.floor(rng() * 21) - 10));
    const nome = `${NOMES[Math.floor(rng() * NOMES.length)]} ${SOBRENOMES[Math.floor(rng() * SOBRENOMES.length)]}`;
    return { nome, precisao: campo(), tempo: campo(), eficacia: campo() };
};

/** O medico do clube; saves antigos (sem `medico`) recebem o dele na primeira vez. Devolve o mesmo objeto se ja tinha. */
export const garantirMedico = (team: Team, faixa?: [number, number] | null): Team => (team.medico ? team : { ...team, medico: gerarMedico(team.id, faixa) });

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
        const ganho = Math.max(0, Math.min(lesao.daysOut - 1, Math.ceil(lesao.daysOut * 0.15)));
        return { lesao: { ...lesao, daysOut: lesao.daysOut - ganho }, boletim: `Evolução excelente: prazo reduziu ${ganho} dias.` };
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
