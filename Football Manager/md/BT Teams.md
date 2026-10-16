Gostaria que o BT Team fica extremamente limpo.

Team BT
ROOT

├── Match Context
│
├── Determine Style
│
├── Determine Aggression
│
├── Determine Focus Side
│
├── Determine Pressure
│
├── Determine Defensive Line
│
└── Determine Directness

1. Estilo de Jogo

O estilo é o modificador principal.

U-DEF
DEF
BAL
OFF
U-OFF

Sugestão:

Estilo	Linha	Pressão	Objetividade
U-DEF	35	    20	        20
DEF	    45	    35	        35
BAL	    60	    50	        50
OFF	    75	    70	        70
U-OFF	90	    90	        90

Esses valores servem apenas como ponto inicial.

2. Agressividade

Controla a forma de disputar a bola.

U-PASS
PAS
BAL
AGG
U-AGG

Influência:

duelIntensity
tackleRisk
foulChance
counterPressIntensity

Exemplo:

Tipo	Intensidade
U-PASS	20
PAS	    40
BAL	    50
AGG	    70
U-AGG	90

3. Setor Preferencial
LEFT
CENTER
RIGHT

Isso não força o time a jogar por ali.

Ele gera pesos.

É importante lembrar que é possivel usar 2 setores de jogo ao mesmo tempo.

Exemplo:

LEFT

leftWeight = 60
centerWeight = 25
rightWeight = 15

Na decisão de passe:

score *= sideWeight

Resultado:

Mais passes pela esquerda.
Mais triangulações pela esquerda.
Mais ultrapassagens pela esquerda.

Mas ainda existe variação.

4. Pressão (0-100)

0 = bloco extremamente baixo
100 = pressão sufocante

Exemplo:

Pressão	Distância máxima
0	7 m
25	6 m
50	5 m
75	4 m
100	3 m

Quanto maior:

startPressEarlier
closePassingLanesFaster

5. Linha Defensiva (30-100)

30 = em cima da área
100 = linha do meio campo

Exemplo:

defensiveLine = 30

Zagueiros:

perto da área
defensiveLine = 100

Zagueiros:

próximos ao círculo central

Isso afeta:

teamLength
offsideTrap
compactness

6. Objetividade (0-100)

Esse parâmetro tende a ser um dos mais importantes.

0 = posse pela posse

100 = atacar o gol imediatamente

Influência:

Passe
0

Escolhe:

Passe seguro
Passe lateral
Reciclagem
100

Escolhe:

Passe vertical
Lançamento
Inversão
Bola nas costas
Chute

Quanto maior:

shootBias++
Drible

Quanto maior:

takeRisk++