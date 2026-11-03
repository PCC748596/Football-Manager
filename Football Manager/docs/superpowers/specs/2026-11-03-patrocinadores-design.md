# Sistema de Patrocinadores — Design

Data: 2026-11-03. Subprojeto A. A virada de temporada (calendários por região, férias, pré-temporada, reinício de ligas e copas) é o subprojeto B, com spec própria.

## Objetivo

Clube do usuário contrata um patrocinador principal entre 50 empresas (25 Brasil, 25 exterior). O valor entra no caixa em 12 parcelas mensais. Simples, expansível, sem negociação complexa, metas, bônus ou IA.

## Arquitetura atual (achados)

- `Team.sponsorAmount` é só um número exibido (`FinancesView`, `DashboardView`); ninguém o paga.
- Dinheiro do jogo é guardado em USD; `textSim/cambio.ts` converte (`paraDolares`) e `formatCurrency` exibe.
- Não existe campo de reputação no `Team`. Existem `fanBase`, `strength` e a tradição (`textSim/tradicao.ts`).
- Não existe virada de temporada. O contrato expira por data, sem depender dela.
- Bandeiras: `Assets/Bandeiras/<id do país>.png` (27 arquivos, só países do jogo).
- Liquidação de caixa em `context/GameContext.tsx` (renda de jogo por dia).

## Dados — `textSim/patrocinadores.ts`

Lista fixa de 50 `Patrocinador { id, nome, pais, moeda: 'BRL' | 'EUR', valorAnual, regiao: 'BRASIL' | 'INTERNATIONAL' }` com os valores do prompt original. Valor convertido para USD do jogo com `paraDolares`. Patrocinadores do Brasil têm país "Brasil".

Reputação mínima de cada patrocinador: pelo ranking do valor dentro da região, escalonada de 0 (menor valor) a 90 (maior valor), linear. Função pura `reputacaoMinima(p)`.

## Reputação do clube

Função pura `reputacaoDoClube(team, todosOsTimes)`, 0–100, relativa ao mundo: média ponderada de `fanBase` (peso 0,4), tradição (0,3) e `strength` (0,3), cada um normalizado por percentil entre todos os clubes. Sem campo salvo.

## Estado

`Team.sponsorContract?: { sponsorId, valorAnualUSD, inicio, fim, parcelasPagas }` (datas `AAAA-MM-DD`). Salvo no save. Substitui o `sponsorAmount` para o clube do usuário; clubes da CPU mantêm o `sponsorAmount` atual. Um contrato ativo por clube; patrocinador já contratado por outro clube da CPU não existe (a CPU não contrata), então "Ocupado" só indica o contrato do próprio usuário.

Status por patrocinador na UI: **Ativo** (é o contrato atual), **Disponível** (reputação ≥ mínima), **Bloqueado** (reputação < mínima), **Indisponível** (já há contrato ativo com outro patrocinador; só a renovação/troca no fim libera).

## Contratação

Painel do patrocinador: duração 1–4 anos e botão "Propor". Regra: aceita se reputação do clube ≥ reputação mínima e não há contrato ativo. O valor anual é o de referência da empresa, fixo. Recusa mostra o motivo. Funções puras `avaliarProposta` e `criarContrato`; a ação em `GameContext` só aplica.

Renovação/troca: nos 60 dias finais do contrato, o botão "Renovar/Trocar" abre o mesmo fluxo; ao confirmar, o novo contrato começa na data de fim do atual. Ao expirar sem renovação, o contrato é removido.

## Financeiro

No dia 1 de cada mês, para o clube do usuário com contrato ativo: `cash += valorAnualUSD / 12`, `parcelasPagas += 1`. Fim do contrato: após a última parcela (12 × anos) ou na data `fim`, o que ocorrer primeiro. O pagamento é liquidado no mesmo ponto de `GameContext` onde o caixa diário é atualizado, idempotente por mês (guarda `ultimoMesPago`). `FinancesView` e Dashboard passam a ler o valor anual do contrato (mostram 0 sem contrato). O gráfico mensal `spo` usa a parcela. Inbox: aviso 60 dias antes do fim e a cada pagamento (`textSim/inbox.ts`).

## UI

Nova aba SPONSORS dentro de `FinancesView` (componente `components/SponsorsTab.tsx`), com sub-abas BRASIL e INTERNATIONAL. Cada linha: bandeira, nome, país, valor anual (via `formatCurrency`) e status. Clique abre o painel de proposta. Alvos de toque ≥ 44 px, layout em grade para PC e iPad paisagem. Bandeiras estrangeiras: ~14 SVGs novos em `public/flags/`; Brasil usa o PNG existente. Textos em EN e PT como o resto do app.

## Testes (Vitest, `tests/patrocinadores.test.ts`)

- 50 patrocinadores, 25 por região, valores corretos.
- Elegibilidade: clube grande aceita topo, clube pequeno é bloqueado.
- Um contrato ativo por vez.
- 12 parcelas por ano, idempotência no mesmo mês, expiração na data.

## Fora de escopo

Virada de temporada, negociação, metas, bônus, IA de patrocínio para clubes da CPU.
