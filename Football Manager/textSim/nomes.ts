/*
NOMES DE JOGADORES GERADOS (a base Sub-20 e os jogadores que completam elencos): uma combinacao de nome e sobrenome comuns no futebol sul-americano. Determinista com o gerador
com semente de `criarRng`: o mesmo jogador (id) tem sempre o mesmo nome.
*/
import type { Rnd } from './contracts';
import { NOMES_POR_PAIS } from './nomesPaises';
import { REAL_TEAMS_JSON } from './realDatabase';

export const PRIMEIROS = ['Gabriel', 'Lucas', 'Mateus', 'Pedro', 'João', 'Rafael', 'Guilherme', 'Felipe', 'Bruno', 'Thiago', 'Vinícius', 'Gustavo', 'Henrique', 'Leonardo', 'Daniel', 'Diego', 'Caio', 'Arthur', 'Davi', 'Samuel', 'Enzo', 'Nicolas', 'Miguel', 'Murilo', 'Kauã', 'Yuri', 'Ryan', 'Breno', 'Igor', 'Otávio', 'Renan', 'Joaquín', 'Santiago', 'Matías', 'Tomás', 'Benjamín', 'Emiliano', 'Facundo', 'Lautaro', 'Andrés'];
export const SOBRENOMES = ['Silva', 'Santos', 'Oliveira', 'Souza', 'Costa', 'Pereira', 'Rodrigues', 'Almeida', 'Nascimento', 'Lima', 'Araújo', 'Ribeiro', 'Carvalho', 'Gomes', 'Martins', 'Rocha', 'Barbosa', 'Moreira', 'Cardoso', 'Teixeira', 'Mendes', 'Freitas', 'Barros', 'Pinto', 'Moura', 'Cavalcanti', 'Dias', 'Castro', 'Campos', 'Monteiro', 'Ramos', 'Fernández', 'González', 'López', 'Díaz', 'Torres', 'Vargas', 'Herrera', 'Molina', 'Ortiz'];
export const nomeAleatorio = (rnd: Rnd) => `${PRIMEIROS[Math.floor(rnd() * PRIMEIROS.length)]} ${SOBRENOMES[Math.floor(rnd() * SOBRENOMES.length)]}`;

/*
NOMES DO PAIS DO CLUBE: um clube espanhol gera jogadores com nomes espanhois, um alemao com alemaes, etc. (listas em nomesPaises.ts, geradas por tools/gerar_ligas_europa.cjs).
Um clube sem lista (o Brasil e os clubes antigos) usa a lista brasileira de sempre.
*/
let _paisDoClube: Map<string, string> | null = null;
export const paisDoClube = (teamId: string): string | undefined => {
  if (!_paisDoClube) _paisDoClube = new Map((REAL_TEAMS_JSON as any[]).map(t => [String(t.teamID), String(t.country)]));
  return _paisDoClube.get(String(teamId));
};
export const nomeDoClube = (rnd: Rnd, teamId: string): string => {
  const N = NOMES_POR_PAIS[paisDoClube(teamId) || ''];
  if (!N) return nomeAleatorio(rnd);
  const um = (l: string[]) => l[Math.floor(rnd() * l.length)];
  let nome = um(N.nomes);
  if (rnd() < 0.15) nome += ' ' + um(N.nomes.filter(x => !x.includes(' ')));
  let sob = um(N.sobrenomes);
  if (rnd() < 0.18) sob += ' ' + um(N.sobrenomes.filter(x => !x.includes(' ')));
  return nome + ' ' + sob;
};
