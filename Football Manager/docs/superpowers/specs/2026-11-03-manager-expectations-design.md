# Manager Expectations — Design

Data: 2026-11-03

## Objetivo

Mercado dinâmico de treinadores para todos os clubes da base: expectativas por clube, Board Confidence, demissões justificadas, Manager Reputation, ofertas de emprego e substituição automática. Sem alterar a lógica das partidas (`matchEngine`, `simulateFast`).

## Decisões

- **Ciclo:** confiança atualizada a cada rodada. Reputação, ofertas e substituições no fim da liga. O jogo não tem virada de temporada e este trabalho não a cria.
- **Tradição do clube:** `fanBase` + `foundedYear`, com override por `textSim/tradicaoClubes.json` (campo `heritage` 0-100). Ajusta a expectativa em ±1 nível.
- **Jogador:** também é avaliado, pode ser demitido e receber ofertas. Demissão e ofertas chegam pelo inbox (categoria `BOARD`), sem game over.
- **Pool de treinadores livres:** sintético, gerado com seed (`criarRng`).

## Arquitetura

Módulo puro novo `textSim/managerExpectations.ts`, seguindo a convenção de `textSim/*.ts` (funções puras estado-in/estado-out, comentário de regras no topo, `export const CONFIG_*`). `GameContext` só chama o módulo.

### Dados

`Manager`: `{ id, nome, tatico, reputation 0-100, confidence 0-100, clubKey | null, lowConfRounds, grace, recent[] }`.

- Estado `managers: Record<id, Manager>`. `Team.managerName` fica sincronizado.
- `clubKey = teamKey(leagueId, teamId)` (IDs repetem entre ligas).
- Semeadura: treinadores de `treinadores.ts` com reputação inicial próxima do OVR do clube (`Team.strength`). Clubes sem treinador usam `PERFIS`. Pool livre sintético.
- Persistência: campo `managers` em `saveGame` (`GameContext.tsx:~2056`) e `importGameData` (`:~2138`). Saves antigos semeiam na carga (`data.managers || semear()`).

### Expectativas

`expectativa(clube)`: OVR (`strength`) mapeia para 6 níveis (90-100 títulos; 80-89 disputar títulos; 70-79 primeiros; 60-69 metade superior; 50-59 permanência; <50 evitar rebaixamento). Tradição soma ±1 nível. Cada nível vira posição-alvo relativa ao tamanho da liga.

### Board Confidence (por rodada)

Alvo = 50% aproveitamento vs. esperado + 30% posição vs. alvo + 20% conquistas/objetivos. A confiança se move só uma fração do alvo por rodada (suavização). Faixas: 80-100 excelente, 60-79 boa, 40-59 pressão, 20-39 risco, 0-19 iminente.

### Demissão

- Só se confiança < 20 e depois de um mínimo de rodadas na temporada.
- Confiança < 40 por várias rodadas dá probabilidade crescente (RNG com seed).
- Rebaixamento ou campanha muito ruim acelera.
- Carência após contratação, para evitar demissões em cascata.

### Reputação (fim da liga)

Influenciada por aproveitamento, posição final, títulos, promoções e classificações. Independente da confiança.

### Ofertas e substituição

- Clubes com vaga ou com treinador pressionado ranqueiam treinadores de outros clubes por reputação, compatibilidade com a exigência do clube, OVR do clube e desempenho recente. Oferta só se o clube for melhor que o atual.
- IA aceita se o clube for ≥ ao atual. Para o jogador, a oferta chega no inbox, e ele aceita ou recusa.
- Aceitar libera o clube anterior, que busca substituto no pool livre com reputação compatível. Invariante: todo clube sempre tem treinador.

## Integração

- Fim de rodada: `GameContext.tsx:1205-1225`. Fim de liga: effect em `:458`.
- Outras ligas: usam `buildTable` de `world.ts` sobre `WorldLeague`.
- UI mínima: confiança, reputação e faixa na tela do clube. Strings via `L(lang, en, pt)`.
- Fora de escopo: salários, contratos, virada de temporada, game over.

## Testes

`node:test` via `tsx` (estilo `tests/valuation.test.ts`):

- Faixas e mapeamento OVR para expectativa.
- Suavização da confiança.
- Anti-cascata (carência, mínimo de rodadas).
- Todo clube com treinador após demissão e transferência.
- Casamento de nomes de `tradicaoClubes.json` com o banco, com relatório de não casados.
