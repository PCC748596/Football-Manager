# ESPECIFICAÇÃO: MOTOR DE TREINO E PROGRESSÃO

## Contexto Geral

Sistema de progressão para um jogo de Football Manager. A evolução de atributos (escala 50-100) usa uma curva quadrática de custo, multiplicadores de idade (Lerp) e multiplicadores de potencial (Estrelas). O microgerenciamento é eliminado por Grupos de Treino (G1, G2, G3). O jogador gere o calendário com base em três pilares físicos: Ritmo de Jogo (Match Form), Energia (Combustível) e Stamina (Eficiência).

Itens marcados com `TODO` ainda não têm regra definida.

## 0. MODELO IMPLEMENTADO NO CÓDIGO (decisão: manter pontos, não XP/GROWTH)

O jogo usa **pontos de treino por atributo** (`Player.treino3d`, em `textSim/trainingService.ts`), e não o banco GROWTH com custo `(N-40)^2` descrito nas seções 2 e 4. As diferenças:

- `PONTOS_POR_ATRIBUTO = 25` pontos = +1 no atributo, com teto de +15 (`TETO_PONTOS_TREINO`). Não há teto por estrelas nem custo crescente.
- Idade, Estrelas (0.6x a 1.4x) e Exaustão multiplicam os pontos de DEF/PAS/DRB/SHT e dos atributos do 3D (`treino3d`). A Exaustão usa a Energia do início do dia.
- Match Form inicial de jogador novo (jogo novo, base, contratação ou save antigo): **igual ao FIS médio** (mínimo 30), calculado uma vez (`mfIniciado`) pelo `GameContext`. A Energia é limitada a ele. Depois o MF sobe com os jogos e decai sem jogar. Um save antigo tem o MF refeito uma vez.
- Reset de temporada (`max(30, FIS/2)`), alta médica (`max(40, FIS/2)`) e piso do decay (`FIS/2`) continuam em metade do FIS: o início do jogo parte do FIS cheio, mas as férias e a lesão custam ritmo.
- Curva de nota TAC (código): 4.0 = 0.5x, 6.0 = 1.0x, 8.0 = 1.2x. `BASE_TAC_XP = 5` pontos em `tacticalAwa`. Os valores `MATCH_BASE_XP_TAC = 40` e a curva linear da seção 5.1 **não** estão implementados.
- Jogador sem grupo: **entra no G1** (decisão final). `trainingGroupId` ausente vale G1 (`|| 0`). Não existe o estado "Descanso" nem a penalidade de Moral por falta de tempo de jogo.
- Lesão por evento: 1% (Energia >= 25%) ou 3% (< 25%), rolada para cada slot de treino que gasta energia (Recovery, Analysis e Team Dinner não rolam) e uma vez por dia de treino da CPU. Lesão de treino = leve, 3 a 10 dias. As lesões de jogo continuam vindo do motor da partida, sem rolo extra.
- Regressão por idade (`OnSeasonEnd`, na virada): `regredirPorIdade` subtrai níveis de cada atributo do grupo (TEC/TAC/MEN/FIS pelos grupos do código; stamina à parte), nunca abaixo de 50, e zera os pontos parciais do atributo que caiu. Atributos de goleiro não regridem.
- Consumo no jogo usa `matchFatiguePerMinute(tática, posição)`, e não `1%/min * (100/Stamina)`.

Já alinhado com a spec: faixas de Exaustão com `>=`, recovery com `Stamina/100`, Energia limitada pelo Match Form, ganho de MF `min(min, 60) * 0.5`, decay semanal com piso, reset de MF na virada e alta médica (Energia 25%, MF `max(40, piso)`).

Ainda não implementado: XP/GROWTH/teto por estrelas, rolo de lesão ao fim do jogo.

Atenção: o FIS já envelhece sozinho em `atributos3d` (`curvaFisica`: -1.8 por ano acima de 29 anos, em relação à idade dos dados de origem). A regressão por idade soma-se a essa queda.

## 1. PILARES DO SISTEMA FÍSICO

- **Match Form / Ritmo / Tanque (0 a 100):** Ritmo de Jogo. É influenciado pela média do atributo FIS global do jogador e ganha pontos ao atuar em partidas. **Define o limite máximo da Energia** (MF 80 = Energia varia de 0 a 80%).
- **Energia / Combustível (0 a MF%):** Variável diária gerida pelos 4 slots de treino. Enche com descanso/recuperação e esvazia com atividade. Depois de qualquer alteração: `Energia = clamp(Energia, 0, MatchForm)`.
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
- **Match Form (MF):**
  - Ganho no jogo: `min(Minutos, 60) * 0.5` (máximo +30; 60 ou 90 min dão o mesmo).
  - Decay semanal (verificado no fim da semana): atuou < 15 min na semana = -5 MF; lesionado no DM = -10 MF.
  - Piso: o decay nunca baixa o MF abaixo de `Média_dos_Atributos_FIS / 2`.
  - Virada de temporada: o MF de todo o plantel é resetado para `max(30, Média_FIS / 2)`.
- **TAC:** para quem jogou mais de 15 min, `XP = MATCH_BASE_XP_TAC (40) * Mult(Nota)`, com `Mult(Nota) = clamp(0.5 + (Nota - 4.0) * 0.25, 0.1, 2.0)`.
- **Chemistry (0 a 100%):** o núcleo ganha +1.0 a cada 10 min jogados simultaneamente (máximo +9.0 por jogo). Um time titular novo leva cerca de 11 a 12 jogos para chegar a 100%. Já existe no sistema (UI de Chemistry entre jogadores).
- **Morale:** Vitória +10, Empate 0, Derrota -10, sem histórico de resultados. Bônus/punição individual de ±5 se a nota for >= 8.0 ou <= 4.0, e vale também no empate.

### 5.2. Departamento Médico

- **Na lesão:** congelar a injeção de GROWTH e retirar o jogador do Grupo.
- **Na alta:** devolver ao grupo original, Energia = 25% e **MF = `max(40, Média_FIS / 2)`** (atrofia de ritmo, sem violar o piso físico do atleta). O jogador precisa de Recovery antes de treinar normal ou jogar.

## 6. PONTOS ABERTOS (TODO)

Nenhum ponto aberto.

Notas de implementação:
- Regressão anual (2.5): usa a idade **inteira** no momento do `OnSeasonEnd`.
- Lerp de idade (2.2): usa a idade **decimal** (ex.: 21.4), para suavizar a transição no aniversário.
- O clamp em 50 é estrutural: a fórmula `(N-40)^2` foi desenhada para a faixa 50-100.
