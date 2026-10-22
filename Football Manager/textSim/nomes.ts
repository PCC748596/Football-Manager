/*
NOMES DE JOGADORES GERADOS (a base Sub-20 e os jogadores que completam elencos): uma combinacao de nome e sobrenome comuns no futebol sul-americano. Determinista com o gerador
com semente de `criarRng`: o mesmo jogador (id) tem sempre o mesmo nome.
*/
import type { Rnd } from './contracts';

export const PRIMEIROS = ['Gabriel', 'Lucas', 'Mateus', 'Pedro', 'João', 'Rafael', 'Guilherme', 'Felipe', 'Bruno', 'Thiago', 'Vinícius', 'Gustavo', 'Henrique', 'Leonardo', 'Daniel', 'Diego', 'Caio', 'Arthur', 'Davi', 'Samuel', 'Enzo', 'Nicolas', 'Miguel', 'Murilo', 'Kauã', 'Yuri', 'Ryan', 'Breno', 'Igor', 'Otávio', 'Renan', 'Joaquín', 'Santiago', 'Matías', 'Tomás', 'Benjamín', 'Emiliano', 'Facundo', 'Lautaro', 'Andrés'];
export const SOBRENOMES = ['Silva', 'Santos', 'Oliveira', 'Souza', 'Costa', 'Pereira', 'Rodrigues', 'Almeida', 'Nascimento', 'Lima', 'Araújo', 'Ribeiro', 'Carvalho', 'Gomes', 'Martins', 'Rocha', 'Barbosa', 'Moreira', 'Cardoso', 'Teixeira', 'Mendes', 'Freitas', 'Barros', 'Pinto', 'Moura', 'Cavalcanti', 'Dias', 'Castro', 'Campos', 'Monteiro', 'Ramos', 'Fernández', 'González', 'López', 'Díaz', 'Torres', 'Vargas', 'Herrera', 'Molina', 'Ortiz'];
export const nomeAleatorio = (rnd: Rnd) => `${PRIMEIROS[Math.floor(rnd() * PRIMEIROS.length)]} ${SOBRENOMES[Math.floor(rnd() * SOBRENOMES.length)]}`;

