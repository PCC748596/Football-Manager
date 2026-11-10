/*
OS TREINADORES DOS CLUBES e o seu CONHECIMENTO TATICO (0-100).

Lista dada pelo utilizador (clube - treinador - conhecimento). Os nomes dos clubes sao os da base (`teamName`). Os clubes que nao estao aqui (Serie D, ligas de fora...) recebem um treinador sorteado
da lista de nomes e um conhecimento sorteado pelo PERFIL, na tabela abaixo (`PERFIS`), por uma semente do proprio clube (o mesmo clube da sempre o mesmo treinador).

O conhecimento tatico serve a CPU: quanto maior, mais cedo o treinador le o jogo e muda a equipa (ver `decideTeamIntent`, textSim/teamAI.ts: o minuto efetivo do jogo e deslocado).
*/

export interface Treinador { nome: string; tatico: number; }

/** Vazio no jogo: os treinadores reais vem do mod (`regras.json`, textSim/modDados.ts). Quem nao esta aqui recebe um treinador sorteado. */
export const TREINADORES: Record<string, Treinador> = {};

/** Perfis dos treinadores sem entrada na lista: faixa do conhecimento tatico e peso do sorteio (pedido do utilizador). */
export const PERFIS: { nome: string; min: number; max: number; peso: number }[] = [
  { nome: 'Destaque nacional em divisões inferiores', min: 75, max: 82, peso: 5 },
  { nome: 'Experiente em Série C e Série B', min: 70, max: 79, peso: 15 },
  { nome: 'Técnico regional experiente', min: 62, max: 74, peso: 45 },
  { nome: 'Técnico em desenvolvimento', min: 50, max: 65, peso: 25 },
  { nome: 'Iniciante no futebol profissional', min: 40, max: 55, peso: 10 }
];

/** O conhecimento tatico de um treinador sem entrada na lista, pelo perfil sorteado com `rnd` (0..1). */
export const sortearConhecimento = (rnd: () => number): { perfil: string; tatico: number } => {
  const soma = PERFIS.reduce((a, p) => a + p.peso, 0);
  let r = rnd() * soma, escolhido = PERFIS[PERFIS.length - 1];
  for (const p of PERFIS) { r -= p.peso; if (r <= 0) { escolhido = p; break; } }
  return { perfil: escolhido.nome, tatico: Math.round(escolhido.min + rnd() * (escolhido.max - escolhido.min)) };
};
