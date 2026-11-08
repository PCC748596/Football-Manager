# ESPECIFICAÇÃO: MOTOR DE TREINO E PROGRESSÃO

## Contexto Geral

Sistema de progressão para um jogo de Football Manager. A evolução de atributos (escala 50-100) usa uma curva quadrática de custo, multiplicadores de idade (Lerp) e multiplicadores de potencial (Estrelas). O microgerenciamento é eliminado por Grupos de Treino (G1, G2, G3). O jogador gere o calendário com base em dois pilares físicos: Energia (Combustível) e Stamina (Eficiência). O Match Form (FORM) foi removido.

Itens marcados com `TODO` ainda não têm regra definida.

## 0. MODELO IMPLEMENTADO NO CÓDIGO (decisão: manter pontos, não XP/GROWTH)

O jogo usa **pontos de treino por atributo** (`Player.treino3d`, em `textSim/trainingService.ts`), e não o banco GROWTH com custo `(N-40)^2` descrito nas seções 2 e 4. As diferenças:

- **XP por atributo** (`Player.treino3d`: campo → XP acumulado, 31 atributos). Cada slot rende `10 XP × valor da atividade × idade × estrelas × exaustão` (10 = Centro de Treinamento nível 3, o padrão; o CT ainda não existe no jogo). Subir um atributo de N para N+1 custa `300 + 0,5 × (N − 50)²` XP (50→51: 300; 70→71: 500; 90→91: 1100). O XP compra níveis a partir do valor base do atributo (sem treino); o que sobra é o cofre do próximo nível. Teto de +15 níveis por treino e de 99. **Teto de crescimento:** o treino só leva um atributo `folga + 2` níveis acima da base. A folga é `potencial − OVR` (base, potencial real) ou, no profissional, `round((26 − idade) × 0,6) + 1` (≈ +1 no auge, +4 aos 20 anos). **Teto do Centro de Treinamento (CT):** nível 2 treina atributos até 80, nível 3 até 85, nível 4 até 90, nível 5 até 95 (nível 1: 75, sem pedido). O jogo ainda não tem CT; o nível vem da liga do clube: 4 = Série A do Brasil e 1ª divisão da Europa, 3 = 1ª divisão da América do Sul, 2 = o resto. Atributo que já passa do teto fica onde está. O teto efetivo é o menor entre o do CT e `base + folga + 2`. Medido com XP infinito em todos os atributos: Série D 61 → 65, Série C 64 → 67, Série A 71 → 75; uma divisão não alcança a de cima. Saves antigos (pontos de 25 por nível) são convertidos uma vez sem perder níveis. Não há teto por estrelas.
- Idade, Estrelas (0.6x a 1.4x) e Exaustão multiplicam os pontos de DEF/PAS/DRB/SHT e dos atributos do 3D (`treino3d`). A Exaustão usa a Energia do início do dia.
- **Não existe mais Match Form (FORM).** A Energia vai de 0 a 100 e só se limita a si mesma. Energia inicial de jogador novo (jogo novo, base): sorteada entre **45 e 55**. Na volta das férias (virada de temporada, 1º de janeiro) a Energia de todo o plantel é sorteada de novo entre 45 e 55.
- Na alta médica a Energia cai (só cai, nunca sobe) para uma fração do FIS: `FIS/2` (grave), `FIS/3` (média) ou `FIS/4` (leve). O FIS não se corta; só cai com a idade (regressão).
- Curva de nota TAC (código): 4.0 = 0.5x, 6.0 = 1.0x, 8.0 = 1.2x. `BASE_TAC_XP = 5` pontos em `tacticalAwa`. Os valores `MATCH_BASE_XP_TAC = 40` e a curva linear da seção 5.1 **não** estão implementados.
- **Treino individual** (atividade `individual`, aba Tactics, limite 2 por semana como as demais; -3 ENR): cada jogador do grupo treina os atributos que o usuário marcou clicando neles no overview (cone ao lado esquerdo do valor): até 3 de uma área (TEC/TAC/FIS) ou 2 do mental; marcar de outra área recomeça a lista. Cada slot dá +1 de valor (10 XP) a cada atributo marcado, com idade × estrelas × exaustão. Sem nenhum marcado, o sistema escolhe os atributos mais importantes da posição (`CHAVES_POR_POSICAO`), na área em que eles estão mais fracos (cone esmaecido).
- Jogador sem grupo: **entra no G1** (decisão final). `trainingGroupId` ausente vale G1 (`|| 0`). Não existe o estado "Descanso" nem a penalidade de Moral por falta de tempo de jogo.
- Lesão por evento: 1% (Energia >= 25%) ou 3% (< 25%), rolada para cada slot de treino que gasta energia (Recovery, Analysis e Team Dinner não rolam) e uma vez por dia de treino da CPU. Lesão de treino = leve, 3 a 10 dias. As lesões de jogo continuam vindo do motor da partida, sem rolo extra.
- Regressão por idade (`OnSeasonEnd`, na virada): `regredirPorIdade` subtrai níveis de cada atributo do grupo (TEC/TAC/MEN/FIS pelos grupos do código; stamina à parte), nunca abaixo de 50, e zera os pontos parciais do atributo que caiu. Atributos de goleiro não regridem.
- Consumo no jogo usa `matchFatiguePerMinute(tática, posição)`, e não `1%/min * (100/Stamina)`.

Já alinhado com a spec: faixas de Exaustão com `>=`, recovery com `Stamina/100`, Energia de 45 a 55 no início e na virada, e alta de lesão (Energia `FIS/2`, `FIS/3` ou `FIS/4` por gravidade).

Ainda não implementado: XP/GROWTH/teto por estrelas, rolo de lesão ao fim do jogo.

Atenção: o FIS já envelhece sozinho em `atributos3d` (`curvaFisica`: -1.8 por ano acima de 29 anos, em relação à idade dos dados de origem). A regressão por idade soma-se a essa queda.

## 1. PILARES DO SISTEMA FÍSICO

- **Match Form:** removido do jogo. Não há ritmo de jogo nem teto de Energia.
- **Energia / Combustível (0 a 100%):** Variável diária gerida pelos 4 slots de treino. Enche com descanso/recuperação e esvazia com atividade. Depois de qualquer alteração: `Energia = clamp(Energia, 0, 100)`.
- **Stamina / Eficiência (50 a 100):** Atributo treinável (sobe de nível ao treinar atributos Físicos). Não varia diariamente, ao contrário da Energia. Define a taxa de consumo e de recuperação de Energia (ver 4.3).

## 2. CONSTANTES E MULTIPLICADORES GLOBAIS

### 2.1. Constantes de XP

- `BASE_XP_PER_POINT`: 15. Cada **1 Ponto de Foco** na UI de Drills gera 15 XP base. Não equivale a +1 no atributo. Exemplo: Drill com +2.0 de Foco em Finalização gera 30 XP base.
- `MAX_DAILY_SLOTS`: 4
- `COST_FORMULA`: `(Nível Atual - 40)^2` (ex.: 60 para 61 custa 400 XP).

### 2.2. Multiplicadores de Idade (Lerp)

Interpolar linearmente pela idade exata do atleta.

| Idade | FIS | TEC | TAC | MEN |
|-------|-----|-----|-----|-----|
| 16 | 2.0 | 1.5 | 0.5 | 0.5 |
| 21 | 1.2 | 1.2 | 1.0 | 0.8 |
| 26 | 0.8 | 1.0 | 1.2 | 1.2 |
| 32+ | 0.1 | 0.8 | 1.5 | 1.5 |

### 2.3. Potencial (Estrelas): multiplicador e teto

| Estrelas | Multiplicador | Teto (Hard Cap) |
|----------|---------------|-----------------|
| 5 | 1.4x | 100 |
| 4 | 1.2x | 90 |
| 3 | 1.0x | 80 |
| 2 | 0.8x | 70 |
| 1 | 0.6x | 60 |

### 2.4. Modificador de Exaustão

Usa a **Energia do início do dia** (ver 4).

| Energia | Multiplicador de XP |
|---------|---------------------|
| >= 75% | 1.0x |
| >= 50% e < 75% | 0.8x |
| >= 25% e < 50% | 0.5x |
| < 25% | 0.1x (Exaustão) |

### 2.5. Regressão por Idade (por temporada)

No evento `OnSeasonEnd`, níveis inteiros são deduzidos diretamente do jogador, conforme a idade:

| Idade | FIS | Stamina | TEC | TAC | MEN |
|-------|-----|---------|-----|-----|-----|
| 30-31 | -1 | -1 | 0 | 0 | 0 |
| 32-34 | -3 | -2 | -1 | 0 | 0 |
| 35+ | -5 | -4 | -2 | -1 | -1 |

- Se o nível de um atributo cair, o GROWTH daquele atributo é zerado.
- Nenhum atributo desce abaixo de 50.
- O treino pode compensar a queda, mas o multiplicador de idade FIS em veteranos (0.1x) torna isso praticamente impossível. A decadência é intencional.

## 3. MODELAGEM DOS PACOTES DE TREINO (DRILLS)

Cada sessão (ex.: Gym Work, Analysis) contém:

- **WeeklyLimit:** limite de usos do grupo na semana (ex.: [0/2]). Reset no domingo às 23h59.
- **EnergyCost_Base:** custo na barra de Energia (treino pesado = -20%; Recovery = +30%).
- **Rewards:** array de ganhos `{target, value}`, onde `value` é em Pontos de Foco (ex.: `[{target: "Finishing", value: 1.0}]`).

## 4. LOOP DIÁRIO (TICK DO MOTOR DE TREINO)

Para cada jogador não lesionado, no fim do dia:

### Jogador sem Grupo

Se não estiver atribuído a nenhum grupo, o jogador entra no **G1** e segue o treino dele normalmente.

### Passo 1: Ler Energia do início do dia

Guardar `Energia_Inicio`. O XP do dia usa este valor, para o treino não se sabotar.

### Passo 2: Injeção de XP (GROWTH)

Para cada atributo trabalhado nas sessões:

```
XP Bruto = Pontos_de_Foco * BASE_XP_PER_POINT
XP Final = XP Bruto * Mult(Idade) * Mult(Estrelas) * Mult(Exaustão(Energia_Inicio))
```

Somar o XP Final ao GROWTH do atributo.

### Passo 3: Level Up

```
while (GROWTH >= (Nivel - 40)^2 AND Nivel < Teto):
    GROWTH -= (Nivel - 40)^2
    Nivel += 1
if Nivel == Teto: GROWTH = 0   # descarta o excedente
```

### Passo 4: Energia (aplicar as 4 sessões)

- Se `Custo < 0` (desgaste): `Custo_Real = Custo * (100 / Stamina)`. Stamina 50 gasta o dobro.
- Se `Custo > 0` (recuperação): `Custo_Real = Custo * (Stamina / 100)`. Stamina 50 recupera metade.
- Somar à Energia e aplicar `clamp(0, MatchForm)`.
- Sessões de moral/química são aplicadas diretamente.

### Lesão por evento

Cada jogo ou slot de treino com custo negativo tem **1%** de chance de lesão. Se a Energia estiver < 25%, a chance é **3%**.

## 5. INTEGRAÇÕES (MATCH ENGINE E DEPARTAMENTO MÉDICO)

### 5.1. Pós-jogo

- **Consumo de Energia:** `1.0% * minutos * (100 / Stamina)`, clampado em 0. Um jogador com Stamina 70 pode "estourar" os 90 min e chegar a 0%. Isso é intencional e obriga a usar Recovery/Descanso depois.
- **Energia no pós-jogo:** a Energia do 3D vira a Energia do manager. Virada de temporada: Energia sorteada entre 45 e 55.
- **TAC:** para quem jogou mais de 15 min, `XP = MATCH_BASE_XP_TAC (40) * Mult(Nota)`, com `Mult(Nota) = clamp(0.5 + (Nota - 4.0) * 0.25, 0.1, 2.0)`.
- **Chemistry (0 a 100%):** o núcleo ganha +1.0 a cada 10 min jogados simultaneamente (máximo +9.0 por jogo). Um time titular novo leva cerca de 11 a 12 jogos para chegar a 100%. Já existe no sistema (UI de Chemistry entre jogadores).
- **Morale:** Vitória +10, Empate 0, Derrota -10, sem histórico de resultados. Bônus/punição individual de ±5 se a nota for >= 8.0 ou <= 4.0, e vale também no empate.

### 5.2. Departamento Médico

- **Na lesão:** congelar a injeção de GROWTH e retirar o jogador do Grupo.
- **Na alta:** devolver ao grupo original. A **Energia cai** para `FIS/2` (grave), `FIS/3` (média) ou `FIS/4` (leve). Precisa de Recovery antes de treinar normal ou jogar.

## 6. PONTOS ABERTOS (TODO)

Nenhum ponto aberto.

Notas de implementação:
- Regressão anual (2.5): usa a idade **inteira** no momento do `OnSeasonEnd`.
- Lerp de idade (2.2): usa a idade **decimal** (ex.: 21.4), para suavizar a transição no aniversário.
- O clamp em 50 é estrutural: a fórmula `(N-40)^2` foi desenhada para a faixa 50-100.
