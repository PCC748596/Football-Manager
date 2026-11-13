# Multibola — design

Data: 2026-11-12. Simulador 3D (`3dMatch/simulador3d`).

## Objetivo

Bolas de reserva em cones à volta do campo. Quando a bola sai, quem cobra vai buscar uma bola (a do cone mais próximo, ou a própria bola se ela voltou para o campo), abaixa-se, pega nela, leva-a ao ponto da cobrança e cobra como hoje. Hoje a bola e o cobrador são teleportados para o ponto.

Ordem de entrega: **1. lateral**, 2. tiro de meta, 3. canto. Este documento detalha o lateral e fixa o que os outros dois reaproveitam.

## Cones

15 cones fixos, fora do campo, cada um com uma bola em cima (campo 106 × 68 m; x ao longo do comprimento, a partir do centro):

| Onde | Cones |
|---|---|
| Lateral de cima | 5: x ≈ −44, −22, 0, +22, +44 m |
| Lateral de baixo (lado dos bancos) | 6, em pares entre os bancos: x ≈ −46, −32, −5, +5, +31, +45 m |
| Atrás de cada baliza | 2: a ≈ ±10 m do eixo |

Ficam a ~1,5 m fora da linha, entre a linha e as placas. As posições vivem na config (`MultiBolaModel`), para afinar. As figuras da imagem de referência (gandulas) ficam para uma etapa futura.

## A bola que sai

1. A bola segue a física normal depois de passar a linha: rola, pode bater na placa ou na arquibancada.
2. **Some** quando bate na placa/arquibancada ou quando para lá fora (mesmo critério do tiro de meta: `bolaBateuNoFundo`/lateral equivalente, ou velocidade baixa), com teto de tempo.
3. **Se ela bater e voltar para dentro do campo**, não some: essa bola é a que se usa (o cobrador vai até ela).
4. Quando a cobrança é feita, o cone que foi usado volta a ter bola na hora.

## Lateral (fluxo)

1. A bola sai pela lateral: o lance para (`THROW_IN`) e o cobrador é escolhido como hoje (`escolherBatedorDoLateral`). Os outros jogadores posicionam-se como hoje.
2. Escolhe-se a fonte da bola: a própria bola, se ela voltou ao campo; senão o **cone mais próximo do ponto por onde a bola saiu**.
3. O cobrador vai **de onde está** (sem teleporte) até a bola. Ritmo: **trote**; a equipa que está a perder vai **a correr**, a que está a ganhar vai **a andar**.
4. Chegando, abaixa-se (pose de ~0,6 s) e pega a bola: a bola de jogo aparece nas mãos dele e o cone fica vazio.
5. Leva a bola nas mãos até ao ponto da cobrança (atrás da linha) e entra no estado `LATERAL` de hoje, que segue sem mudança.
6. O prazo do lateral (`SetPiecePrazos.lateral`) só começa a contar quando ele chega ao ponto.
7. Se o cobrador for substituído, expulso ou se lesionar no caminho, o seguinte da ordem assume e recomeça a busca.

## Arquitetura

- **`js/config/multibola.js`** — `MultiBolaModel`: posições dos cones, distância à linha, velocidades (trote/corrida/andar), duração da pose de pegar, teto de tempo da bola que sai.
- **`js/multibola.js`** — `MultiBola`: cria e desenha os cones e as bolas de reserva; estado de cada cone (com/sem bola); `escolherFonte(pontoDeSaida)`; a máquina da busca (`ir_a_bola` → `pegar` → `levar` → entrega ao lance parado); repõe o cone na cobrança. Um módulo só, sem estados novos na FSM do jogador.
- **Integração:** `setupSetPiece('THROW_IN')` deixa de teleportar o cobrador e a bola e entrega a busca ao `MultiBola`; o `Match.update` corre a busca enquanto ela durar; o estado `LATERAL` só começa no fim da busca. Tiro de meta e canto usam a mesma busca, mudando quem busca (guarda-redes / batedor do canto) e o ponto de entrega.

## Testes (headless)

- A bola sai pela lateral e para fora: o cobrador vai ao cone mais próximo do ponto de saída, pega, chega ao ponto, cobra; o cone volta a ter bola.
- A bola bate na placa e volta ao campo: o cobrador usa essa bola, não vai ao cone.
- Ritmo por placar: a perder corre, a ganhar anda, empatado trota.
- O prazo do lateral não estoura durante a busca.
- O cobrador sai a meio da busca: outro assume.
