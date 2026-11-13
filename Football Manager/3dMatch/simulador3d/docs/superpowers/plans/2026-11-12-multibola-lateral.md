# Multibola — Lateral Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** No lateral, o cobrador vai buscar a bola (ao cone mais próximo do ponto de saída, ou a própria bola se ela voltou ao campo), abaixa-se, pega, leva ao ponto e cobra — sem teletransporte.

**Architecture:** Um módulo `MultiBola` (js/multibola.js) com a config `MultiBolaModel` (js/config/multibola.js) cria os cones e conduz a busca numa máquina de fases (`saida` → `ir` → `pegar` → `levar` → entregue). Ele usa o andar de bola parada que já existe (`lugarBolaParada`, player.js) e entrega ao estado `LATERAL` de hoje no fim. O `setupSetPiece('THROW_IN')` deixa de teleportar quando o multibola está activo.

**Tech Stack:** JavaScript clássico (scripts globais), three.js r128, testes headless em Node (tools/headless/harness.js).

Spec: `docs/superpowers/specs/2026-11-12-multibola-design.md`.

## Global Constraints

- Eixos do mundo: x é a LARGURA (laterais em x = ±CAMPO_LARG/2 = ±34), z é o COMPRIMENTO (linhas de fundo em z = ±53).
- Cones: 5 na lateral oposta aos bancos (z ≈ −44, −22, 0, +22, +44), 6 em pares na lateral dos bancos (z ≈ −46, −32, −5, +5, +31, +45), 2 atrás de cada baliza (x ≈ ±10); a 1.5 m fora da linha. Lado dos bancos = `TunelJogadores.lado` (sinal de x; −1 por omissão).
- A bola que sai segue a física e só some depois de bater na barreira/placa ou de parar; se voltar ao campo, é ela que se usa.
- Cone mais próximo do PONTO DE SAÍDA.
- Ritmo: trote; equipa a perder corre; a ganhar anda.
- O cone usado repõe-se quando a cobrança é feita.
- Tudo novo ligável por `MultiBolaModel.activo` (false = comportamento antigo).

---

### Task 1: Config e cones (dados + escolha da fonte)

**Files:**
- Create: `js/config/multibola.js`
- Create: `js/multibola.js`
- Modify: `index.html` (scripts), `tools/headless/harness.js` (lista FICHEIROS)
- Test: `tests/multibola_lateral.test.js`

**Interfaces:**
- Produces: `MultiBolaModel` (config); `MultiBola.posicoesDosCones()` → `[{x,z}]`; `MultiBola.iniciar(scene)`; `MultiBola.coneMaisProximo(x, z)` → índice; `MultiBola.cones[i].temBola`.

- [ ] Teste: 17 cones, todos fora do campo (|x| > 34 ou |z| > 53) e dentro da barreira; `coneMaisProximo` devolve o certo para um ponto na lateral.
- [ ] Implementar a config e as funções puras; desenho dos cones/bolas só quando há `scene`.
- [ ] Correr o teste; commit.

### Task 2: A busca do lateral

**Files:**
- Modify: `js/multibola.js` (máquina da busca), `js/match/match_setpieces.js` (ramo THROW_IN), `js/match/match_physics.js` (THROW_IN não congela a bola enquanto ela está solta), `js/match/match_loop.js` (corre `MultiBola.update(dt)`; o prazo do lateral só conta depois da entrega), `js/player.js` (o `lugarBolaParada` com `multibola: true` não é apagado no THROW_IN)
- Test: `tests/multibola_lateral.test.js`

**Interfaces:**
- Consumes: Task 1.
- Produces: `MultiBola.comecarLateral(taker, pontoLinha)`; `MultiBola.busca` (null ou `{ fase, taker, fonte, ponto }`); `MultiBola.emBusca()` → bool; `MultiBola.reporCone()`.

Fases: `saida` (a bola de jogo ainda solta fora; some quando bate na barreira lateral/de fundo, para, ou passados `tetoSaida` s; se voltar ao campo e parar, a fonte passa a ser ela) → `ir` (lugarBolaParada até à fonte, vel pelo placar) → `pegar` (parado `tempoPegar` s, a bola aparece nas mãos, cone fica vazio) → `levar` (lugarBolaParada até ao ponto atrás da linha, bola nas mãos) → entrega: o cobrador entra em `LATERAL`, `lateralPendente` passa a contar. Na cobrança (`lancarLateral`) o cone usado repõe-se. Se o cobrador sai a meio (expulso/substituído/lesionado: deixa de estar na lista da equipa), escolhe-se outro com `escolherBatedorDoLateral` e a fase volta a `ir`.

- [ ] Testes: bola sai e para fora → cobrador vai ao cone mais próximo do ponto de saída, pega, chega, cobra, cone repõe-se; bola bate na barreira e volta ao campo → usa essa bola; ritmo por placar; prazo não estoura; cobrador expulso a meio → outro assume.
- [ ] Implementar; correr o teste e os de lateral existentes; commit.
