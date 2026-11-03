# Aba Manager — Design

Data: 2026-11-03. Complementa `2026-11-03-manager-expectations-design.md`.

## Objetivo

Uma aba "Manager" no menu da esquerda, logo depois de Statistics, para o jogador acompanhar a carreira: perfil, expectativas da diretoria e posição relativa, posições nos campeonatos, estatísticas, ofertas de emprego e um diário da carreira. Visualização rápida, numa tela só.

## Decisões

- Estatísticas: temporada atual + diário da carreira (novo campo `historico` no `ManagerState`, que já vai no save; saves antigos começam com o diário vazio).
- Jobs oferecidos: só listar e recusar. Aceitar (trocar o clube controlado) fica fora do escopo.
- Sem avatar no perfil: o visual do treinador não é guardado depois da criação.
- Sem virada de temporada: o diário mostra a liga atual.

## Dados

- `RegistroCarreira { data; tipo: 'CONTRATADO' | 'DEMITIDO' | 'OFERTA' | 'FIM_LIGA'; clube; pos?; n?; pontos?; jogos?; titulo?; promovido?; rebaixado? }`.
- `ManagerState.historico: RegistroCarreira[]`.
- `fecharTemporadas` emite o evento `FIM_LIGA` para o treinador do jogador (posição final, pontos, jogos, título, promoção, rebaixamento).
- `registrosDosEventos(eventos, hoje)` converte os eventos do jogador em registros; `registrarNoDiario(estado, registros)` anexa; `declinarOferta(estado, id)` tira a oferta da lista.
- O início da carreira (`CONTRATADO`) é registrado quando o estado é semeado.

## Tela (`components/ManagerView.tsx`)

1. Perfil: nome, clube, reputação e confiança da diretoria (barras e faixa).
2. Expectativas do Board: o box de `ClubOverviewContent` extraído para `BoardExpectationBox`, mais a posição relativa à meta ("7º agora · meta top 5 · 2 abaixo", verde à frente, vermelho atrás). Série D mostra a fase-meta.
3. Posições nos campeonatos: liga (posição, pontos, jogos) e cada copa do clube com a fase mais recente.
4. Estatísticas: J, V, E, D, gols, saldo, aproveitamento da temporada e aproveitamento desde que assumiu o clube.
5. Jobs oferecidos: clube, liga, OVR, reputação exigida, data e botão Recusar.
6. Diário da carreira: mais recente primeiro.

## Integração

`view: 'MANAGER'` (types.ts), item no `Layout.tsx` depois de Statistics, rota no `App.tsx`, `declinarOferta` e o registro do diário no `GameContext`, textos PT/EN inline.

## Testes

`node:test`: evento `FIM_LIGA` com posição e flags, conversão e anexo do diário, `declinarOferta`.
