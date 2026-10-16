# Melhorias Planejadas para a Engine de Simulação

## Contexto Atual

A engine foi projetada inicialmente para um Football Manager 2D narrado.

Cada minuto da partida é dividido em 4 ações (ticks):

* Tick 0 → disputa de meio-campo
* Tick 1 → passe ou construção
* Tick 2 → avanço ou interceptação
* Tick 3 → resolução da jogada

O sistema já possui:

* Deck de eventos
* Ratings por setor (esquerda, centro e direita)
* Sinergia entre jogadores
* Fitness
* Táticas
* Pressão
* Linha defensiva
* Estilos de jogo
* Sistema de cartões
* Sistema de lesões
* Vantagem de mando

O objetivo futuro é manter compatibilidade com:

* Simulação narrada
* Simulação 2D visual
* Simulação 3D

Portanto, todas as melhorias devem preservar a arquitetura atual e servir como base para evolução futura.

---

# Problema 1: Resultado excessivamente determinado pelo Deck

Atualmente o deck pré-calcula boa parte da partida.

O número de gols é definido logo no início e a simulação apenas descobre quando esses gols irão acontecer.

Isso reduz a influência dinâmica de:

* Momentum
* Fitness
* Cartões
* Mudanças táticas
* Eventos ocorridos durante a partida

## Objetivo

O deck deve definir apenas:

* Quem ataca
* Tipo do lance
* Intensidade do lance

Mas nunca definir previamente:

* Gol
* Defesa
* Finalização para fora

Esses resultados devem ser calculados somente no Tick 3.

Exemplo:

HOME:ATTACK

↓

Tick 3 resolve:

Ataque
vs
Defesa
+
Fitness
+
Sinergia
+
Momentum
+
Qualidade individual

↓

Resultado final

* Gol
* Defesa
* Escanteio
* Chute para fora

---

# Problema 2: Setores Laterais Pouco Utilizados

A engine já calcula:

* Ataque esquerdo

* Ataque central

* Ataque direito

* Defesa esquerda

* Defesa central

* Defesa direita

Porém a maior parte dos cálculos decisivos utiliza apenas os setores centrais.

## Objetivo

Toda jogada deve possuir uma faixa de campo.

Exemplo:

Ataque pela esquerda

↓

Ataque esquerdo
vs
Defesa direita adversária

Ataque pelo centro

↓

Ataque central
vs
Defesa central adversária

Ataque pela direita

↓

Ataque direito
vs
Defesa esquerda adversária

Isso dará identidade aos times.

Exemplos:

* Times fortes pela esquerda
* Times dependentes de um ponta
* Laterais vulneráveis
* Corredores dominantes

---

# Problema 3: Meio-Campo Não Controla Suficientemente a Partida

Hoje o meio influencia os atributos.

Mas não influencia fortemente a posse.

## Objetivo

O meio-campo deve controlar:

* Posse
* Volume ofensivo
* Frequência de ataques

Exemplo:

Time A
Meio = 90

Time B
Meio = 50

Resultado:

64% posse
36% posse

O deck deve ser gerado considerando essa vantagem.

Quanto maior o domínio do meio:

* Mais ataques
* Mais presença ofensiva
* Mais controle territorial

---

# Problema 4: Ausência de Momentum

Atualmente um gol altera pouco o comportamento da partida.

No futebol real:

Após um gol:

* Um time cresce
* O outro sente o impacto

## Implementação

Criar variável:

momentum

Faixa:

-100 até +100

Eventos que alteram momentum:

Positivos:

* Gol marcado
* Sequência de ataques
* Grande defesa
* Pressão constante

Negativos:

* Gol sofrido
* Cartão vermelho
* Lesão importante
* Erros consecutivos

Efeitos:

* Ataque
* Meio-campo
* Pressão
* Eficiência ofensiva

O momentum deve ser temporário e variar constantemente.

---

# Problema 5: Falta de Participação Individual

Hoje a equipe produz o evento.

No futuro será necessário que os jogadores influenciem mais diretamente.

## Objetivo

Introduzir uma camada intermediária:

Team AI
↓
Role AI
↓
Playing Style
↓
FSM
↓
Resultado

---

# Team AI

Decide a intenção coletiva.

Exemplos:

* Atacar
* Contra-atacar
* Manter posse
* Recuar
* Pressionar

---

# Role AI

Decide quem participa da jogada.

Exemplos:

Atacante
Meia
Lateral

Ou

Volante
Meia
Ponta

---

# Playing Style

Define como a jogada será executada.

Exemplos:

* Passe curto
* Triangulação
* Lançamento longo
* Inversão
* Cruzamento
* Drible

---

# FSM

Executa a ação.

Exemplos:

* Passar
* Conduzir
* Cruzar
* Chutar
* Desarmar

---

# Benefícios para o Futuro

Essa arquitetura permitirá reaproveitar a mesma lógica em:

1. Simulação narrada
2. Simulação 2D com movimentação de ícones
3. Simulação 3D

Sem necessidade de reescrever o motor principal.

A única diferença será a camada de visualização.

---

# Ordem Recomendada de Implementação

## Fase 1

Adicionar Momentum.

Impacto alto.
Complexidade baixa.

---

## Fase 2

Fazer os setores esquerdo/centro/direito influenciarem os lances.

Impacto muito alto.
Complexidade baixa.

---

## Fase 3

Fazer o meio-campo controlar posse e frequência de ataques.

Impacto muito alto.
Complexidade média.

---

## Fase 4

Remover gols pré-definidos do deck.

Transformar o deck em gerador de oportunidades.

Impacto extremamente alto.
Complexidade média.

---

## Fase 5

Criar Team AI.

Impacto alto.
Preparação para o futuro.

---

## Fase 6

Criar Role AI.

Impacto muito alto.
Aumenta variedade das jogadas.

---

## Fase 7

Criar Playing Style.

Impacto extremamente alto.
Gera identidade real para cada equipe.

---

# Objetivo Final

Chegar a uma engine onde o fluxo seja:

Deck
→ Team AI
→ Role AI
→ Playing Style
→ FSM
→ Resultado

Mantendo compatibilidade total com:

* Narrativa textual
* Simulação 2D
* Simulação 3D

e produzindo partidas mais orgânicas, variadas e emergentes sem depender de física complexa.
