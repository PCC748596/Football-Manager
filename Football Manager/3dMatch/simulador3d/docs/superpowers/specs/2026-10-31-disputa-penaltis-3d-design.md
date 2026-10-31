# Disputa de pênaltis em 3D — design

Data: 31 de outubro de 2026. Estado: aguardando revisão do utilizador.

## Objetivo

Quando um jogo de copa (jogo único ou agregado) termina empatado, o utilizador vê a disputa de pênaltis no 3D, com toda a cena: técnicos, meia-lua, sorteio, ordem dos batedores, cobranças e a caminhada de cada jogador. O resultado de cada cobrança sai da física real do 3D (o mesmo motor do pênalti em jogo), não de um sorteio.

## Decisões já tomadas

- **Resultado:** física 3D real. Corrida, remate, mergulho do goleiro, trave e bola para fora decidem o gol.
- **Quem bate:** só os jogadores que terminaram o jogo em campo (substituídos e expulsos não batem), goleiro incluído.
- **Técnicos:** dois, um por time, os que já existem em `Bancos`. O aspeto do `ManagerAvatar` ficou fora do escopo.
- **Gatilho:** ao fim dos 90 minutos mais o acréscimo (`fimBase + acrescimo2` em `verificarFimDeTempo`, `js/match/match_loop.js`), com o placar empatado e o jogo marcado como "exige decisão". Não há prorrogação.
- **Regras da disputa:** continuam só em `textSim/penaltyShootout.ts`. A app é a única árbitra e o 3D não tem cópia das regras.

## Fluxo

Um módulo novo, `js/disputa_penaltis.js`, no estilo de `abertura.js`, conduz um estado novo do `Match`, `DISPUTA`, com estas fases:

1. **REUNIÃO.** Cada técnico anda até a linha lateral do banco do seu time e para 4 m para dentro. Cada time forma uma meia-lua em duas fileiras (raios de 5 m e 7 m), de frente para o técnico, com posições aleatórias. O juiz, com a bola na mão, sorteia o lado do campo (a baliza) e quem começa, e anuncia isso.
2. **ORDEM.** Com todos posicionados, o 3D envia `disputa_reuniao`. A app mostra por cima do iframe o modal da ordem dos batedores (`PenaltyOrderView`) com o botão **Iniciar disputa**.
3. **PREPARO.** O juiz, o goleiro defensor e o batedor vão para a baliza sorteada. Os demais jogadores vão para a linha do meio e formam fila lado a lado, um time de cada lado da marca central, como na entrada em campo. O goleiro do time que bate (se não for o batedor) fica na lateral da área, entre a linha da pequena e a da grande área, a 5 m da linha de fundo. O bandeirinha desse lado fica sobre a linha de fundo, em cima da linha da grande área. O juiz entrega a bola, o batedor a ajeita na marca e recua até a distância da cobrança.
4. **COBRANÇA.** Apito e cobrança pelo motor de pênalti em jogo. O 3D reporta o resultado à app.
5. **TROCA.** O batedor caminha até a fila no meio-campo e o próximo caminha até a marca. Repete PREPARO abreviado e COBRANÇA até a app dizer que acabou.
6. **FIM.** Comemoração do vencedor, `pens` gravado na app e só então o `FIM_DE_JOGO` e a saída de campo de sempre.

O ESC durante REUNIÃO, PREPARO ou TROCA leva todos direto às posições (como `Abertura.cancelar`). Nunca salta cobranças.

## Posições (eixos: x lateral de −34 a +34, z de −53 a +53)

- Técnicos: x = ±30, z = ±8, no lado do banco do respetivo time (`TunelJogadores.lado`).
- Meia-lua: duas fileiras, raios de 5 m e 7 m, abertas para a linha lateral. Distância mínima entre jogadores 1,2 m, todos dentro do campo.
- Marca do pênalti: `Area.distanciaPenalti` a partir da linha de fundo.
- Fila central: sobre a linha do meio, lado a lado, espaçamento de `AberturaModel`.
- Goleiro que espera: z a 5 m da linha de fundo, entre a pequena (5,5 m) e a grande área, na lateral.
- Bandeirinha: sobre a linha de fundo, em cima da linha da grande área (x ≈ ±20,16 m do centro).
- Câmera: atrás do batedor e baixa, com corte para a baliza no remate (lógica de `Match.updateCamera` e `Abertura.camera`).

## Modelos e animações

Os técnicos são os que já existem no 3D (`Bancos.bancos[i].treinador`, de fato e gravata, na cor do clube): saem da área técnica e andam até a beira do gramado. Os dois bancos ficam do mesmo lado (+X), então os dois técnicos ficam em x = +30. O aspeto do `ManagerAvatar` não é aplicado. Os jogadores andam por waypoints com o mesmo mover de `Abertura.passoDoJogador`. Não se criam animações novas: andar, parar, chutar, mergulhar e comemorar já existem.

## Protocolo com a app

Segue o padrão de `js/narracao/ponte.js`: `{ para: 'simulador3d', tipo }` entra no iframe, `{ fonte: 'simulador3d', tipo }` sai dele.

| Direção | `tipo` | Conteúdo |
|---|---|---|
| app → 3D | `iniciar` (existente) | ganha `decisao: true` quando o jogo precisa de vencedor |
| 3D → app | `disputa_reuniao` | `{ casa: ids[], fora: ids[], ladoBaliza, primeiro }`, só jogadores em campo, sorteio já feito |
| app → 3D | `disputa_iniciar` | `{ ordemCasa, ordemFora }` |
| 3D → app | `disputa_cobranca` | `{ lado, jogadorId, resultado: 'gol' \| 'defesa' \| 'trave' \| 'fora' }` |
| app → 3D | `disputa_proxima` | `{ lado, jogadorId }` ou `{ fim: true, vencedor }` |
| 3D → app | `disputa_fim` | `{ pens: [casa, fora] }`, depois o `fim` de sempre |

Lado da app:

- `MatchDay` mostra o `PenaltyOrderView` ao receber `disputa_reuniao`, com a lista filtrada pelos ids em campo.
- A ordem do adversário é `normalizarOrdem(time.penaltyOrder, jogadoresEmCampo)`, ou seja, a automática (Penalties + Consistency) se não houver ordem guardada.
- `definirOrdemPenaltis` grava a ordem escolhida e `registrarPenaltis` grava `pens` em `disputa_fim`.
- `PenaltyShootoutModal` continua apenas para jogos que o utilizador não vê em 3D.

## Casos de borda e falhas

- 3D solto (sem `window.parent`) ou sem `decisao`: não há disputa, vai direto a `FIM_DE_JOGO`, como hoje.
- A app não responde a `disputa_reuniao` em 30 s: o 3D usa a ordem automática e segue.
- Goleiro expulso durante o jogo: o time faz a troca obrigatória (um goleiro reserva entra e sai um jogador de linha; sem reserva ou com 5 trocas feitas, um jogador de linha vai ao gol). Assim os dois times chegam à disputa com goleiro; se mesmo assim faltar um, a disputa não arranca. Detalhes no plano, Tarefa 6.
- Goleiro que também bate: o defensor é sempre o goleiro do outro time. O goleiro que bate sai da lateral da área para a marca.
- Times com números diferentes em campo: cada time cicla pela própria lista. A regra da IFAB de igualar o número não é aplicada.

## Testes

Em `3dMatch/simulador3d/tests/` (rodam com `npm run 3d:teste`):

1. `disputa_posicoes.test.js`: geometria pura num módulo `js/config/disputa.js` sem THREE. Meia-lua a 4 m da lateral, sem colisão e dentro do campo; fila central; goleiro a 5 m da linha de fundo entre a pequena e a grande área; bandeirinha sobre a linha da grande área.
2. `disputa_fluxo.test.js`: máquina de estados com ponte falsa. Ordem dos eventos, lado sorteado, e `fim` só depois de `disputa_proxima` com `fim: true`.
3. Teste no manager (`tests/`): filtro de jogadores em campo e normalização da ordem.
4. Script headless no padrão de `penalti_corrida.test.js`: 10 cobranças seguidas sem travar nem repetir o batedor.

## A confirmar no plano de implementação

- O chute é `baterPenalti` (`js/player.js`), não `executarPenalti`. O plano chama `Match.iniciarPenaltiDaDisputa` (novo) em vez de `setupSetPiece`, que teletransporta os outros 20 jogadores. A Tarefa 2 do plano valida isso com um teste antes da coreografia.
- Como o `Match` trata um estado novo (`DISPUTA`) no loop, na câmera, no placar e no narrador.
- Como o placar mostra os pênalties durante a disputa (por exemplo, `1 (4) × (3) 1`).
