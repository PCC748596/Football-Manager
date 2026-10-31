# Disputa de pênaltis em 3D — design

Data: 31 de outubro de 2026. Estado: implementada (a verificação manual no jogo, em navegador, ainda não foi feita). Este texto foi acertado com o código final; ver também `docs/filesSummary3d.md`.

## Objetivo

Quando um jogo de copa (jogo único ou agregado) termina empatado, o utilizador vê a disputa de pênaltis no 3D, com toda a cena: técnicos, meia-lua, sorteio, ordem dos batedores, cobranças e a caminhada de cada jogador. O resultado de cada cobrança sai da física real do 3D (o mesmo motor do pênalti em jogo), não de um sorteio.

## Decisões já tomadas

- **Resultado:** física 3D real. Corrida, remate, mergulho do goleiro, trave e bola para fora decidem o gol.
- **Quem bate:** só os jogadores que terminaram o jogo em campo (substituídos e expulsos não batem), goleiro incluído.
- **Técnicos:** dois, um por time, os que já existem em `Bancos` (`Bancos.bancos[i].treinador`). O aspeto do `ManagerAvatar` ficou fora do escopo.
- **Gatilho:** ao fim dos 90 minutos mais o acréscimo (`fimBase + acrescimo2` em `verificarFimDeTempo`, `js/match/match_loop.js`), com o placar empatado no agregado e o jogo marcado como "exige decisão" (a app manda `decisao` no `iniciar`; ver `DisputaPenaltis.podeIniciar`, que também exige 3D visível, trio de arbitragem e um goleiro em campo em cada time). Não há prorrogação.
- **Regras da disputa:** continuam só em `textSim/penaltyShootout.ts`. A app é a única árbitra e o 3D não tem cópia das regras.

## Fluxo

Um módulo novo, `js/disputa_penaltis.js`, no estilo de `abertura.js`, conduz um estado novo do `Match`, `DISPUTA`, com estas fases:

1. **REUNIÃO.** Cada técnico anda até a linha lateral do banco do seu time e para 4 m para dentro. Cada time forma uma meia-lua em duas fileiras (raios de 5 m e 7 m), de frente para o técnico, com posições aleatórias. O juiz vai ao círculo central com a bola na mão e anuncia `PENALTY SHOOTOUT`; o sorteio da baliza e de quem começa é feito pelo 3D ao iniciar a fase (`sinalZ`, `primeiro`) e segue em `disputa_reuniao`.
2. **ORDEM.** Com todos posicionados, o 3D envia `disputa_reuniao`. A app mostra por cima do iframe o modal da ordem dos batedores (`PenaltyOrderView`) com o botão **Iniciar disputa**.
3. **PREPARO.** O juiz, o goleiro defensor e o batedor vão para a baliza sorteada. Os demais jogadores vão para a linha do meio e formam fila lado a lado, um time de cada lado da marca central, como na entrada em campo. O goleiro do time que bate (se não for o batedor) fica na lateral da área, entre a linha da pequena e a da grande área, a 5 m da linha de fundo. O bandeirinha desse lado fica sobre a linha de fundo, em cima da linha da grande área. O juiz entrega a bola, o batedor a ajeita na marca e recua até a distância da cobrança.
4. **COBRANÇA.** Apito e cobrança pelo motor de pênalti em jogo. O 3D reporta o resultado à app.
5. **TROCA.** O batedor caminha até a fila no meio-campo e o próximo caminha até a marca. Repete PREPARO abreviado e COBRANÇA até a app dizer que acabou.
6. **FIM.** Comemoração do vencedor, `pens` gravado na app e só então o `FIM_DE_JOGO` e a saída de campo de sempre.

O ESC durante REUNIÃO, PREPARO ou TROCA leva todos direto às posições (como `Abertura.cancelar`). Nunca salta cobranças.

## Posições (eixos: x lateral de −34 a +34, z de −53 a +53)

- Técnicos: 4 m para dentro da linha lateral (x = `ladoBanco` × 30) e a no máximo 8 m do meio-campo em z (`DisputaModel.posTecnico`); os dois bancos ficam do mesmo lado.
- Meia-lua: duas fileiras, raios de 5 m e 7 m, em volta do técnico e abertas para o campo (o lado oposto ao banco). Distância mínima entre jogadores 1,2 m, todos dentro do campo.
- Marca do pênalti: `Area.distanciaPenalti` (11 m) a partir da linha de fundo.
- Fila central: sobre a linha do meio, lado a lado, um time de cada lado da marca central, espaçamento de `DisputaModel.fila.passo` (1,15 m).
- Goleiro que espera: z a 5 m da linha de fundo, na lateral da área, em x entre a linha da pequena e a da grande área (`posGoleiroEspera`).
- Bandeirinha: sobre a linha de fundo, em cima da linha da grande área (x = ±20,16 m do centro).
- Câmera (`DisputaPenaltis.camera`, chamada de `match_ui.js`): na REUNIÃO e na ORDEM, do outro lado do campo, olhando as duas meias-luas; depois, atrás do batedor e baixa, com a baliza ao fundo. Não há corte para a baliza no remate.

## Modelos e animações

Os técnicos são os que já existem no 3D (`Bancos.bancos[i].treinador`, de fato e gravata, na cor do clube): saem da área técnica e andam até a beira do gramado, movidos por `Officials.mover`. Os dois bancos ficam do mesmo lado (`ladoBanco`, +X), então os dois técnicos ficam do mesmo lado do campo. O aspeto do `ManagerAvatar` não é aplicado. Os jogadores andam por waypoints (`DisputaPenaltis.passoDoJogador`, no estilo de `Abertura.passoDoJogador`); o juiz, os bandeirinhas e os técnicos andam por `Officials.mover`. Não se criam animações novas: andar, parar, chutar, mergulhar e comemorar já existem.

## Protocolo com a app

Segue o padrão de `js/narracao/ponte.js`: `{ para: 'simulador3d', tipo }` entra no iframe, `{ fonte: 'simulador3d', tipo }` sai dele.

| Direção | `tipo` | Conteúdo |
|---|---|---|
| app → 3D | `iniciar` (existente) | ganha `decisao: { compId, matchId, agregadoCasa, agregadoFora }` quando o jogo fecha um confronto de copa (`decisaoDoConfronto`); só vale no 3D visível |
| 3D → app | `disputa_reuniao` | `{ casa: [{ id, nome, numero, gk }], fora: [...], ladoBaliza, primeiro }`, só jogadores em campo (ids do motor), sorteio já feito |
| app → 3D | `disputa_iniciar` | `{ ordemCasa: id[], ordemFora: id[], proxima: { lado, jogadorId } }` (a ordem e o primeiro batedor) |
| 3D → app | `disputa_cobranca` | `{ lado, jogadorId, resultado: 'gol' \| 'defesa' \| 'trave' \| 'fora' }` |
| app → 3D | `disputa_proxima` | `{ lado, jogadorId }` ou `{ fim: true, vencedor, pens: [casa, fora] }` |
| 3D → app | `disputa_fim` | `{ pens: [casa, fora] }`, depois o `fim` de sempre |

Lado da app:

- `MatchDay` mostra o `PenaltyOrderView` ao receber `disputa_reuniao` (saindo antes da tela cheia, que não é restaurada), com a lista filtrada pelos ids em campo.
- A ordem do adversário é `normalizarOrdem(time.penaltyOrder, jogadoresEmCampo)`, ou seja, a automática (Penalties + Consistency) se não houver ordem guardada.
- `definirOrdemPenaltis` grava a ordem escolhida. Em `disputa_fim` o `GameContext` guarda `pens` (`guardarPenaltis3d`) e `registrarPenaltis` grava-os quando o confronto aparece empatado nas copas.
- `PenaltyShootoutModal` continua apenas para jogos que o utilizador não vê em 3D.

## Casos de borda e falhas

- 3D solto (sem `window.parent`) ou sem `decisao`: não há disputa, vai direto a `FIM_DE_JOGO`, como hoje.
- Prazos (`DisputaModel.prazo`): a ORDEM espera a decisão do utilizador até 300 s (`prazo.ordem`, o modal é uma decisão humana); a espera pela resposta da app entre cobranças (AGUARDA) é de 30 s (`prazo.app`). Estourado qualquer um, ou se a app manda um batedor que o 3D não conhece, a disputa aborta: o jogo vai a `FIM_DE_JOGO` como se não houvesse disputa, a app limpa o placar dos pênaltis e cai no `PenaltyShootoutModal` de texto. Não há ordem automática no 3D: a ordem do adversário é calculada na app.
- Goleiro expulso durante o jogo: o time faz a troca obrigatória (um goleiro reserva entra e sai um jogador de linha; sem reserva ou com 5 trocas feitas, um jogador de linha vai ao gol). Assim os dois times chegam à disputa com goleiro; se mesmo assim faltar um, a disputa não arranca. Detalhes no plano, Tarefa 6, e no `filesSummary3d.md`. Na prática: a troca faz-se na primeira parada de bola (falta, lateral, tiro de meta, canto); o time do utilizador espera até 20 s de jogo parado pelo pedido do manager na aba Tactics (com um banner de aviso), o da CPU decide logo; um goleiro expulso num pênalti ou no pontapé de saída joga sem goleiro até à parada seguinte.
- Goleiro que também bate: o defensor é sempre o goleiro do outro time. O goleiro que bate sai da lateral da área para a marca.
- Times com números diferentes em campo: cada time cicla pela própria lista. A regra da IFAB de igualar o número não é aplicada.

## Testes

No 3D, em `3dMatch/simulador3d/tests/` (rodam com `npm run 3d:teste`, ou `node tests/<nome>.test.js`):

1. `disputa_posicoes.test.js`: geometria pura (`js/config/disputa.js`, sem THREE). Meia-lua a 4 m da lateral, sem colisão e dentro do campo; fila central; goleiro a 5 m da linha de fundo entre a pequena e a grande área; bandeirinha sobre a linha da grande área.
2. `disputa_cobranca.test.js`: a cobrança pela física real (`DisputaPenaltis.cobrar`): 30 cobranças seguidas com resultado válido, placar e relógio parados, os outros 20 jogadores quietos, e o goleiro que também bate (o papel e a baliza voltam).
3. `disputa_fluxo.test.js`: máquina de estados com ponte falsa. Ordem dos eventos, lado sorteado, `disputa_fim` antes de `FIM_DE_JOGO`, prazos de ORDEM e AGUARDA, abortar a meio de uma cobrança, e sem `decisao` vai direto ao fim.
4. `ponte_disputa.test.js`: `iniciar` com e sem `decisao`, `disputa_iniciar` / `disputa_proxima` chegam ao módulo, ESC só com a disputa ativa, batedor desconhecido aborta.
5. `goleiro_expulso.test.js`: troca obrigatória do goleiro expulso (reserva, sem reserva, 5 trocas, time do utilizador, pedido do manager, pedido inelegível).

No manager, em `tests/` (`npm run teste:base`): `disputa3d.test.ts` (`decisaoDoConfronto`, filtro de jogadores em campo, normalização da ordem, `proximaMensagem`) e `aviso_goleiro.test.ts`.

Não coberto por testes: `MatchDay`, `GameContext` e `TacticsView` (só `tsc`), o caminho `trave` e tudo o que é visual.

## Decisões que o plano fechou

- O chute é `baterPenalti` (`js/player.js`), não `executarPenalti`. A cobrança chama `Match.iniciarPenaltiDaDisputa` (novo) em vez de `setupSetPiece`, que teletransporta os outros 20 jogadores. O motor do pênalti lê a baliza de cada jogador (`dirZ/targetGoalZ/ownGoalZ`), por isso a cobrança aponta batedor e goleiro para a baliza sorteada (`_apontarParaBaliza`) e repõe o lado do time no fim.
- O estado novo `DISPUTA` é tratado no `Match.update` (`match_loop.js`: relógio, trocas e `TreinadorCPU` parados) e na câmera (`match_ui.js`). O placar da partida não muda durante a disputa: a app mostra os pênaltis no cabeçalho como `(n)` ao lado do placar.
