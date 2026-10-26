# 1Season — simulação de uma temporada inteira

Gerado por `tools/simular_temporada.ts` (modelo rápido do `textSim/world.ts`: golos de Poisson a partir da diferença de força; tempo de execução 1.3 s).
Todas as ligas do mundo jogam o calendário completo. Copas e a Série C/D (fase de grupos e mata-mata) não entram aqui: são competições à parte (`textSim/competitions.ts`).

## Resumo de todas as ligas

| País | Liga | Div. | Clubes | Jogos (jogados/total) | Golos | Golos/jogo | Casa | Empate | Fora | Campeão (pts) | Rebaixados (config.) |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---|---:|
| Brazil | Série A | 1 | 20 | 380/380 | 963 | 2.53 | 47.4% | 23.9% | 28.7% | Flamengo-RJ (72) | 4 |
| Brazil | Série B | 2 | 20 | 380/380 | 986 | 2.59 | 43.7% | 28.9% | 27.4% | Avaí-SC (69) | 4 |
| England | Premier League | 1 | 20 | 380/380 | 1025 | 2.70 | 45.0% | 27.1% | 27.9% | Arsenal (68) | 3 |
| Argentina | Liga Profesional | 1 | 30 | 870/870 | 2375 | 2.73 | 44.6% | 24.7% | 30.7% | Boca Juniors (111) | 3 |
| Chile | Primera División | 1 | 16 | 240/240 | 642 | 2.67 | 45.4% | 24.2% | 30.4% | Universidad de Chile (61) | 3 |
| Colombia | Categoría Primera A | 1 | 20 | 380/380 | 1012 | 2.66 | 43.9% | 24.7% | 31.3% | Deportes Tolima (65) | 3 |
| Uruguay | Primera División | 1 | 16 | 240/240 | 608 | 2.53 | 47.5% | 22.5% | 30.0% | Cerro (64) | 3 |
| Paraguay | Primera División | 1 | 12 | 132/132 | 359 | 2.72 | 44.7% | 25.8% | 29.5% | General Caballero JLM (44) | 2 |
| Ecuador | LigaPro Serie A | 1 | 16 | 240/240 | 616 | 2.57 | 40.0% | 28.8% | 31.3% | Barcelona SC (53) | 3 |
| Peru | Liga 1 | 1 | 18 | 306/306 | 822 | 2.69 | 47.7% | 20.9% | 31.4% | Carlos A. Mannucci (61) | 3 |
| Bolivia | División Profesional | 1 | 16 | 240/240 | 621 | 2.59 | 49.2% | 18.8% | 32.1% | The Strongest (55) | 3 |
| Venezuela | Liga FUTVE | 1 | 14 | 182/182 | 491 | 2.70 | 39.0% | 24.2% | 36.8% | Deportivo La Guaira (50) | 2 |
| Spain | La Liga | 1 | 20 | 380/380 | 1105 | 2.91 | 50.0% | 22.1% | 27.9% | Villarreal (80) | 3 |
| Germany | Bundesliga | 1 | 18 | 306/306 | 806 | 2.63 | 42.5% | 28.8% | 28.8% | Eintracht Frankfurt (68) | 2 |
| Italy | Serie A | 1 | 20 | 380/380 | 1013 | 2.67 | 47.9% | 24.7% | 27.4% | Napoli (71) | 3 |
| France | Ligue 1 | 1 | 18 | 306/306 | 834 | 2.73 | 44.8% | 24.5% | 30.7% | Marseille (62) | 2 |

**Total:** 16 ligas, 5342 jogos, 14278 golos (2.67 por jogo).

## Detalhe por liga

### Brazil — Série A (divisão 1)

- Clubes: 20 · jogos: 380/380 · rodadas: 38 · golos: 963 (2.53 por jogo) · jogos sem golos: 34 (8.9%)
- Resultados: casa 47.4% · empate 23.9% · fora 28.7%
- Maior goleada: Internacional-RS 6 x 0 Coritiba-PR
- Melhor ataque: Atlético-PR (64) · melhor defesa: Bahia-BA (29)
- Campeão: **Flamengo-RJ** (72 pts) · vice: Atlético-PR (67 pts)
- Zona de rebaixamento configurada (4 últimos): Santos-SP, São Paulo-SP, Cruzeiro-MG, Palmeiras-SP
- Clube de maior OVR: Flamengo-RJ (OVR 69) acabou em 1.º · de menor OVR: Remo-PA (OVR 61) acabou em 16.º

| # | Clube | OVR | J | V | E | D | GP | GC | SG | Pts |
|---:|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 1 | Flamengo-RJ 🏆 | 69 | 38 | 21 | 9 | 8 | 58 | 30 | 28 | 72 |
| 2 | Atlético-PR | 68 | 38 | 20 | 7 | 11 | 64 | 48 | 16 | 67 |
| 3 | Internacional-RS | 67 | 38 | 18 | 9 | 11 | 53 | 41 | 12 | 63 |
| 4 | Bragantino-SP | 68 | 38 | 18 | 8 | 12 | 56 | 50 | 6 | 62 |
| 5 | Fluminense-RJ | 68 | 38 | 18 | 6 | 14 | 50 | 39 | 11 | 60 |
| 6 | Corinthians-SP | 68 | 38 | 16 | 10 | 12 | 46 | 44 | 2 | 58 |
| 7 | Bahia-BA | 67 | 38 | 15 | 13 | 10 | 45 | 29 | 16 | 58 |
| 8 | Atlético-MG | 68 | 38 | 15 | 13 | 10 | 47 | 34 | 13 | 58 |
| 9 | Botafogo-RJ | 67 | 38 | 15 | 7 | 16 | 45 | 48 | -3 | 52 |
| 10 | Coritiba-PR | 66 | 38 | 14 | 9 | 15 | 46 | 48 | -2 | 51 |
| 11 | Vasco-RJ | 66 | 38 | 12 | 13 | 13 | 52 | 54 | -2 | 49 |
| 12 | Mirassol-SP | 63 | 38 | 13 | 9 | 16 | 54 | 63 | -9 | 48 |
| 13 | Chapecoense-SC | 63 | 38 | 13 | 9 | 16 | 48 | 59 | -11 | 48 |
| 14 | Grêmio-RS | 67 | 38 | 12 | 12 | 14 | 49 | 56 | -7 | 48 |
| 15 | Vitória-BA | 63 | 38 | 13 | 7 | 18 | 41 | 57 | -16 | 46 |
| 16 | Remo-PA | 61 | 38 | 12 | 10 | 16 | 39 | 48 | -9 | 46 |
| 17 | Santos-SP ⬇ | 67 | 38 | 12 | 8 | 18 | 47 | 57 | -10 | 44 |
| 18 | São Paulo-SP ⬇ | 69 | 38 | 11 | 11 | 16 | 39 | 43 | -4 | 44 |
| 19 | Cruzeiro-MG ⬇ | 66 | 38 | 11 | 5 | 22 | 44 | 68 | -24 | 38 |
| 20 | Palmeiras-SP ⬇ | 69 | 38 | 10 | 7 | 21 | 40 | 47 | -7 | 37 |

### Brazil — Série B (divisão 2)

- Clubes: 20 · jogos: 380/380 · rodadas: 38 · golos: 986 (2.59 por jogo) · jogos sem golos: 28 (7.4%)
- Resultados: casa 43.7% · empate 28.9% · fora 27.4%
- Maior goleada: Juventude-RS 7 x 1 Avaí-SC
- Melhor ataque: Juventude-RS (63) · melhor defesa: Vila Nova-GO (38)
- Campeão: **Avaí-SC** (69 pts) · vice: Náutico-PE (66 pts)
- Zona de rebaixamento configurada (4 últimos): Novorizontino-SP, Operário-PR, CRB-AL, São Bernardo-SP
- Clube de maior OVR: Fortaleza-CE (OVR 72) acabou em 3.º · de menor OVR: São Bernardo-SP (OVR 67) acabou em 20.º

| # | Clube | OVR | J | V | E | D | GP | GC | SG | Pts |
|---:|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 1 | Avaí-SC 🏆 | 70 | 38 | 19 | 12 | 7 | 59 | 41 | 18 | 69 |
| 2 | Náutico-PE | 67 | 38 | 19 | 9 | 10 | 61 | 39 | 22 | 66 |
| 3 | Fortaleza-CE | 72 | 38 | 18 | 12 | 8 | 55 | 45 | 10 | 66 |
| 4 | Vila Nova-GO | 69 | 38 | 18 | 12 | 8 | 48 | 38 | 10 | 66 |
| 5 | Juventude-RS | 70 | 38 | 20 | 4 | 14 | 63 | 48 | 15 | 64 |
| 6 | Ponte Preta-SP | 69 | 38 | 16 | 11 | 11 | 53 | 39 | 14 | 59 |
| 7 | Ceará-CE | 71 | 38 | 16 | 11 | 11 | 54 | 53 | 1 | 59 |
| 8 | Cuiabá-MT | 71 | 38 | 14 | 15 | 9 | 60 | 50 | 10 | 57 |
| 9 | América-MG | 71 | 38 | 17 | 4 | 17 | 56 | 52 | 4 | 55 |
| 10 | Criciúma-SC | 70 | 38 | 13 | 15 | 10 | 50 | 45 | 5 | 54 |
| 11 | Goiás-GO | 71 | 38 | 13 | 15 | 10 | 46 | 42 | 4 | 54 |
| 12 | Botafogo-SP | 68 | 38 | 13 | 8 | 17 | 46 | 52 | -6 | 47 |
| 13 | Atlético-GO | 69 | 38 | 10 | 15 | 13 | 49 | 53 | -4 | 45 |
| 14 | Sport-PE | 69 | 38 | 9 | 16 | 13 | 45 | 45 | 0 | 43 |
| 15 | Athletic-MG | 68 | 38 | 11 | 8 | 19 | 39 | 51 | -12 | 41 |
| 16 | Londrina-PR | 67 | 38 | 10 | 11 | 17 | 45 | 59 | -14 | 41 |
| 17 | Novorizontino-SP ⬇ | 70 | 38 | 10 | 10 | 18 | 47 | 58 | -11 | 40 |
| 18 | Operário-PR ⬇ | 68 | 38 | 9 | 11 | 18 | 38 | 52 | -14 | 38 |
| 19 | CRB-AL ⬇ | 69 | 38 | 8 | 12 | 18 | 41 | 58 | -17 | 36 |
| 20 | São Bernardo-SP ⬇ | 67 | 38 | 7 | 9 | 22 | 31 | 66 | -35 | 30 |

### England — Premier League (divisão 1)

- Clubes: 20 · jogos: 380/380 · rodadas: 38 · golos: 1025 (2.70 por jogo) · jogos sem golos: 34 (8.9%)
- Resultados: casa 45.0% · empate 27.1% · fora 27.9%
- Maior goleada: Ipswich 1 x 7 Aston Villa
- Melhor ataque: Brighton (73) · melhor defesa: Tottenham (32)
- Campeão: **Arsenal** (68 pts) · vice: Chelsea (66 pts)
- Zona de rebaixamento configurada (3 últimos): Brentford, Ipswich, Wolves
- Clube de maior OVR: Arsenal (OVR 78) acabou em 1.º · de menor OVR: Leicester (OVR 63) acabou em 17.º

| # | Clube | OVR | J | V | E | D | GP | GC | SG | Pts |
|---:|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 1 | Arsenal 🏆 | 78 | 38 | 20 | 8 | 10 | 58 | 39 | 19 | 68 |
| 2 | Chelsea | 77 | 38 | 20 | 6 | 12 | 52 | 47 | 5 | 66 |
| 3 | Tottenham | 77 | 38 | 19 | 9 | 10 | 58 | 32 | 26 | 66 |
| 4 | Brighton | 73 | 38 | 17 | 11 | 10 | 73 | 48 | 25 | 62 |
| 5 | Nottingham Forest | 71 | 38 | 17 | 11 | 10 | 48 | 33 | 15 | 62 |
| 6 | Liverpool | 77 | 38 | 16 | 11 | 11 | 53 | 38 | 15 | 59 |
| 7 | Newcastle | 74 | 38 | 16 | 10 | 12 | 56 | 47 | 9 | 58 |
| 8 | Man Utd | 75 | 38 | 15 | 13 | 10 | 51 | 40 | 11 | 58 |
| 9 | Aston Villa | 74 | 38 | 16 | 9 | 13 | 65 | 60 | 5 | 57 |
| 10 | Man City | 78 | 38 | 15 | 11 | 12 | 55 | 48 | 7 | 56 |
| 11 | Everton | 67 | 38 | 15 | 7 | 16 | 51 | 52 | -1 | 52 |
| 12 | Crystal Palace | 72 | 38 | 11 | 12 | 15 | 43 | 43 | 0 | 45 |
| 13 | Southampton | 65 | 38 | 11 | 12 | 15 | 47 | 54 | -7 | 45 |
| 14 | Bournemouth | 67 | 38 | 12 | 8 | 18 | 46 | 57 | -11 | 44 |
| 15 | Fulham | 68 | 38 | 10 | 13 | 15 | 42 | 62 | -20 | 43 |
| 16 | West Ham | 70 | 38 | 9 | 16 | 13 | 48 | 57 | -9 | 43 |
| 17 | Leicester | 63 | 38 | 11 | 9 | 18 | 40 | 63 | -23 | 42 |
| 18 | Brentford ⬇ | 69 | 38 | 10 | 10 | 18 | 57 | 68 | -11 | 40 |
| 19 | Ipswich ⬇ | 63 | 38 | 10 | 9 | 19 | 38 | 62 | -24 | 39 |
| 20 | Wolves ⬇ | 66 | 38 | 7 | 11 | 20 | 44 | 75 | -31 | 32 |

### Argentina — Liga Profesional (divisão 1)

- Clubes: 30 · jogos: 870/870 · rodadas: 58 · golos: 2375 (2.73 por jogo) · jogos sem golos: 63 (7.2%)
- Resultados: casa 44.6% · empate 24.7% · fora 30.7%
- Maior goleada: Independiente 6 x 0 Central Córdoba (SdE)
- Melhor ataque: Boca Juniors (100) · melhor defesa: Vélez Sarsfield (62)
- Campeão: **Boca Juniors** (111 pts) · vice: Independiente (109 pts)
- Zona de rebaixamento configurada (3 últimos): Gimnasia La Plata, Colón, Deportivo Riestra
- Clube de maior OVR: River Plate (OVR 69) acabou em 12.º · de menor OVR: Aldosivi (OVR 60) acabou em 18.º

| # | Clube | OVR | J | V | E | D | GP | GC | SG | Pts |
|---:|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 1 | Boca Juniors 🏆 | 69 | 58 | 33 | 12 | 13 | 100 | 66 | 34 | 111 |
| 2 | Independiente | 69 | 58 | 31 | 16 | 11 | 97 | 65 | 32 | 109 |
| 3 | Vélez Sarsfield | 68 | 58 | 29 | 17 | 12 | 96 | 62 | 34 | 104 |
| 4 | Racing Club | 69 | 58 | 29 | 10 | 19 | 86 | 67 | 19 | 97 |
| 5 | Belgrano | 66 | 58 | 27 | 10 | 21 | 86 | 72 | 14 | 91 |
| 6 | Newell's Old Boys | 66 | 58 | 25 | 14 | 19 | 85 | 72 | 13 | 89 |
| 7 | Godoy Cruz | 65 | 58 | 25 | 14 | 19 | 80 | 76 | 4 | 89 |
| 8 | San Lorenzo | 67 | 58 | 24 | 16 | 18 | 86 | 71 | 15 | 88 |
| 9 | Unión | 61 | 58 | 25 | 11 | 22 | 87 | 82 | 5 | 86 |
| 10 | Banfield | 64 | 58 | 24 | 14 | 20 | 86 | 85 | 1 | 86 |
| 11 | Lanús | 66 | 58 | 23 | 17 | 18 | 84 | 73 | 11 | 86 |
| 12 | River Plate | 69 | 58 | 23 | 17 | 18 | 82 | 71 | 11 | 86 |
| 13 | Estudiantes de La Plata | 68 | 58 | 24 | 11 | 23 | 73 | 77 | -4 | 83 |
| 14 | Sarmiento | 62 | 58 | 23 | 14 | 21 | 83 | 90 | -7 | 83 |
| 15 | Defensa y Justicia | 65 | 58 | 23 | 11 | 24 | 81 | 85 | -4 | 80 |
| 16 | Huracán | 65 | 58 | 21 | 17 | 20 | 76 | 64 | 12 | 80 |
| 17 | Argentinos Juniors | 65 | 58 | 21 | 17 | 20 | 82 | 74 | 8 | 80 |
| 18 | Aldosivi | 60 | 58 | 22 | 12 | 24 | 77 | 90 | -13 | 78 |
| 19 | Barracas Central | 63 | 58 | 20 | 17 | 21 | 82 | 74 | 8 | 77 |
| 20 | Rosario Central | 66 | 58 | 20 | 14 | 24 | 98 | 99 | -1 | 74 |
| 21 | Instituto | 63 | 58 | 20 | 12 | 26 | 66 | 84 | -18 | 72 |
| 22 | Platense | 63 | 58 | 19 | 15 | 24 | 81 | 93 | -12 | 72 |
| 23 | Talleres | 67 | 58 | 18 | 17 | 23 | 70 | 66 | 4 | 71 |
| 24 | Atlético Tucumán | 62 | 58 | 18 | 15 | 25 | 77 | 87 | -10 | 69 |
| 25 | Independiente Rivadavia | 61 | 58 | 17 | 17 | 24 | 62 | 79 | -17 | 68 |
| 26 | Tigre | 64 | 58 | 17 | 16 | 25 | 77 | 96 | -19 | 67 |
| 27 | Central Córdoba (SdE) | 62 | 58 | 16 | 14 | 28 | 58 | 85 | -27 | 62 |
| 28 | Gimnasia La Plata ⬇ | 64 | 58 | 16 | 13 | 29 | 57 | 72 | -15 | 61 |
| 29 | Colón ⬇ | 61 | 58 | 12 | 18 | 28 | 61 | 98 | -37 | 54 |
| 30 | Deportivo Riestra ⬇ | 60 | 58 | 10 | 12 | 36 | 59 | 100 | -41 | 42 |

### Chile — Primera División (divisão 1)

- Clubes: 16 · jogos: 240/240 · rodadas: 30 · golos: 642 (2.67 por jogo) · jogos sem golos: 14 (5.8%)
- Resultados: casa 45.4% · empate 24.2% · fora 30.4%
- Maior goleada: O'Higgins 6 x 0 Colo-Colo
- Melhor ataque: O'Higgins (58) · melhor defesa: Universidad de Chile (26)
- Campeão: **Universidad de Chile** (61 pts) · vice: O'Higgins (57 pts)
- Zona de rebaixamento configurada (3 últimos): Deportes Iquique, Unión La Calera, Colo-Colo
- Clube de maior OVR: Palestino (OVR 69) acabou em 5.º · de menor OVR: Deportes Limache (OVR 59) acabou em 10.º

| # | Clube | OVR | J | V | E | D | GP | GC | SG | Pts |
|---:|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 1 | Universidad de Chile 🏆 | 68 | 30 | 19 | 4 | 7 | 47 | 26 | 21 | 61 |
| 2 | O'Higgins | 65 | 30 | 16 | 9 | 5 | 58 | 32 | 26 | 57 |
| 3 | Everton de Viña del Mar | 63 | 30 | 16 | 4 | 10 | 41 | 34 | 7 | 52 |
| 4 | Huachipato | 67 | 30 | 15 | 6 | 9 | 46 | 34 | 12 | 51 |
| 5 | Palestino | 69 | 30 | 13 | 6 | 11 | 43 | 29 | 14 | 45 |
| 6 | Coquimbo Unido | 66 | 30 | 12 | 7 | 11 | 53 | 41 | 12 | 43 |
| 7 | Deportes La Serena | 59 | 30 | 12 | 6 | 12 | 28 | 37 | -9 | 42 |
| 8 | Audax Italiano | 63 | 30 | 12 | 4 | 14 | 42 | 47 | -5 | 40 |
| 9 | Ñublense | 62 | 30 | 11 | 7 | 12 | 47 | 45 | 2 | 40 |
| 10 | Deportes Limache | 59 | 30 | 10 | 10 | 10 | 43 | 38 | 5 | 40 |
| 11 | Cobresal | 63 | 30 | 8 | 12 | 10 | 31 | 43 | -12 | 36 |
| 12 | Universidad Católica | 68 | 30 | 8 | 11 | 11 | 35 | 43 | -8 | 35 |
| 13 | Unión Española | 65 | 30 | 9 | 5 | 16 | 35 | 45 | -10 | 32 |
| 14 | Deportes Iquique ⬇ | 60 | 30 | 8 | 7 | 15 | 37 | 49 | -12 | 31 |
| 15 | Unión La Calera ⬇ | 61 | 30 | 7 | 9 | 14 | 23 | 43 | -20 | 30 |
| 16 | Colo-Colo ⬇ | 68 | 30 | 6 | 9 | 15 | 33 | 56 | -23 | 27 |

### Colombia — Categoría Primera A (divisão 1)

- Clubes: 20 · jogos: 380/380 · rodadas: 38 · golos: 1012 (2.66 por jogo) · jogos sem golos: 26 (6.8%)
- Resultados: casa 43.9% · empate 24.7% · fora 31.3%
- Maior goleada: Millonarios 7 x 0 Atlético Bucaramanga
- Melhor ataque: Junior (65) · melhor defesa: Independiente Medellín (39)
- Campeão: **Deportes Tolima** (65 pts) · vice: América de Cali (62 pts)
- Zona de rebaixamento configurada (3 últimos): Deportivo Cali, Llaneros FC, Internacional de Bogotá
- Clube de maior OVR: Atlético Nacional (OVR 67) acabou em 12.º · de menor OVR: Internacional de Bogotá (OVR 58) acabou em 20.º

| # | Clube | OVR | J | V | E | D | GP | GC | SG | Pts |
|---:|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 1 | Deportes Tolima 🏆 | 65 | 38 | 19 | 8 | 11 | 59 | 46 | 13 | 65 |
| 2 | América de Cali | 66 | 38 | 18 | 8 | 12 | 64 | 49 | 15 | 62 |
| 3 | Deportivo Pereira | 63 | 38 | 17 | 11 | 10 | 59 | 47 | 12 | 62 |
| 4 | Atlético Bucaramanga | 64 | 38 | 18 | 6 | 14 | 54 | 51 | 3 | 60 |
| 5 | Fortaleza CEIF | 61 | 38 | 16 | 11 | 11 | 55 | 47 | 8 | 59 |
| 6 | Santa Fe | 66 | 38 | 16 | 9 | 13 | 52 | 48 | 4 | 57 |
| 7 | Independiente Medellín | 67 | 38 | 15 | 12 | 11 | 48 | 39 | 9 | 57 |
| 8 | Junior | 67 | 38 | 15 | 11 | 12 | 65 | 44 | 21 | 56 |
| 9 | Águilas Doradas | 63 | 38 | 15 | 11 | 12 | 49 | 48 | 1 | 56 |
| 10 | Once Caldas | 64 | 38 | 15 | 10 | 13 | 57 | 53 | 4 | 55 |
| 11 | Alianza FC | 60 | 38 | 15 | 10 | 13 | 43 | 43 | 0 | 55 |
| 12 | Atlético Nacional | 67 | 38 | 14 | 8 | 16 | 46 | 55 | -9 | 50 |
| 13 | Jaguares de Córdoba | 59 | 38 | 13 | 11 | 14 | 45 | 54 | -9 | 50 |
| 14 | La Equidad | 61 | 38 | 14 | 6 | 18 | 53 | 57 | -4 | 48 |
| 15 | Envigado | 62 | 38 | 12 | 11 | 15 | 45 | 46 | -1 | 47 |
| 16 | Millonarios | 67 | 38 | 14 | 3 | 21 | 54 | 57 | -3 | 45 |
| 17 | Boyacá Chicó | 60 | 38 | 11 | 11 | 16 | 51 | 58 | -7 | 44 |
| 18 | Deportivo Cali ⬇ | 64 | 38 | 11 | 11 | 16 | 38 | 51 | -13 | 44 |
| 19 | Llaneros FC ⬇ | 59 | 38 | 10 | 7 | 21 | 44 | 73 | -29 | 37 |
| 20 | Internacional de Bogotá ⬇ | 58 | 38 | 8 | 13 | 17 | 31 | 46 | -15 | 37 |

### Uruguay — Primera División (divisão 1)

- Clubes: 16 · jogos: 240/240 · rodadas: 30 · golos: 608 (2.53 por jogo) · jogos sem golos: 13 (5.4%)
- Resultados: casa 47.5% · empate 22.5% · fora 30.0%
- Maior goleada: Torque 1 x 7 Cerro
- Melhor ataque: Nacional-URU (54) · melhor defesa: Cerro (26)
- Campeão: **Cerro** (64 pts) · vice: Nacional-URU (53 pts)
- Zona de rebaixamento configurada (3 últimos): Boston River, Deportivo Maldonado, Juventud
- Clube de maior OVR: Peñarol (OVR 66) acabou em 8.º · de menor OVR: Deportivo Maldonado (OVR 57) acabou em 15.º

| # | Clube | OVR | J | V | E | D | GP | GC | SG | Pts |
|---:|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 1 | Cerro 🏆 | 63 | 30 | 20 | 4 | 6 | 48 | 26 | 22 | 64 |
| 2 | Nacional-URU | 65 | 30 | 17 | 2 | 11 | 54 | 34 | 20 | 53 |
| 3 | Cerro Largo | 62 | 30 | 16 | 4 | 10 | 44 | 34 | 10 | 52 |
| 4 | Progreso | 59 | 30 | 13 | 7 | 10 | 44 | 36 | 8 | 46 |
| 5 | Danubio | 66 | 30 | 11 | 11 | 8 | 47 | 38 | 9 | 44 |
| 6 | Racing-URU | 60 | 30 | 12 | 7 | 11 | 42 | 46 | -4 | 43 |
| 7 | River Plate-URU | 64 | 30 | 11 | 10 | 9 | 34 | 34 | 0 | 43 |
| 8 | Peñarol | 66 | 30 | 11 | 9 | 10 | 38 | 34 | 4 | 42 |
| 9 | Defensor Sporting | 66 | 30 | 12 | 5 | 13 | 41 | 40 | 1 | 41 |
| 10 | Liverpool-URU | 65 | 30 | 12 | 3 | 15 | 38 | 40 | -2 | 39 |
| 11 | Plaza Colonia | 60 | 30 | 10 | 8 | 12 | 33 | 37 | -4 | 38 |
| 12 | Torque | 59 | 30 | 9 | 11 | 10 | 33 | 41 | -8 | 38 |
| 13 | Montevideo Wanderers | 64 | 30 | 9 | 9 | 12 | 32 | 37 | -5 | 36 |
| 14 | Boston River ⬇ | 62 | 30 | 9 | 6 | 15 | 27 | 50 | -23 | 33 |
| 15 | Deportivo Maldonado ⬇ | 57 | 30 | 8 | 5 | 17 | 28 | 40 | -12 | 29 |
| 16 | Juventud ⬇ | 57 | 30 | 6 | 7 | 17 | 25 | 41 | -16 | 25 |

### Paraguay — Primera División (divisão 1)

- Clubes: 12 · jogos: 132/132 · rodadas: 22 · golos: 359 (2.72 por jogo) · jogos sem golos: 9 (6.8%)
- Resultados: casa 44.7% · empate 25.8% · fora 29.5%
- Maior goleada: Tacuary 0 x 6 Recoleta
- Melhor ataque: General Caballero JLM (41) · melhor defesa: Cerro Porteño (19)
- Campeão: **General Caballero JLM** (44 pts) · vice: Olimpia (41 pts)
- Zona de rebaixamento configurada (2 últimos): Sportivo Trinidense, Recoleta
- Clube de maior OVR: Cerro Porteño (OVR 66) acabou em 4.º · de menor OVR: Tacuary (OVR 56) acabou em 6.º

| # | Clube | OVR | J | V | E | D | GP | GC | SG | Pts |
|---:|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 1 | General Caballero JLM 🏆 | 59 | 22 | 13 | 5 | 4 | 41 | 27 | 14 | 44 |
| 2 | Olimpia | 65 | 22 | 12 | 5 | 5 | 32 | 22 | 10 | 41 |
| 3 | Guaraní | 65 | 22 | 10 | 4 | 8 | 41 | 32 | 9 | 34 |
| 4 | Cerro Porteño | 66 | 22 | 8 | 10 | 4 | 28 | 19 | 9 | 34 |
| 5 | Nacional-PAR | 64 | 22 | 8 | 7 | 7 | 25 | 25 | 0 | 31 |
| 6 | Tacuary | 56 | 22 | 8 | 4 | 10 | 33 | 39 | -6 | 28 |
| 7 | Sol de América | 63 | 22 | 7 | 7 | 8 | 27 | 29 | -2 | 28 |
| 8 | Sportivo Luqueño | 62 | 22 | 7 | 6 | 9 | 27 | 30 | -3 | 27 |
| 9 | 2 de Mayo | 58 | 22 | 7 | 6 | 9 | 27 | 31 | -4 | 27 |
| 10 | Libertad | 65 | 22 | 7 | 5 | 10 | 26 | 26 | 0 | 26 |
| 11 | Sportivo Trinidense ⬇ | 61 | 22 | 6 | 4 | 12 | 24 | 37 | -13 | 22 |
| 12 | Recoleta ⬇ | 58 | 22 | 5 | 5 | 12 | 28 | 42 | -14 | 20 |

### Ecuador — LigaPro Serie A (divisão 1)

- Clubes: 16 · jogos: 240/240 · rodadas: 30 · golos: 616 (2.57 por jogo) · jogos sem golos: 23 (9.6%)
- Resultados: casa 40.0% · empate 28.8% · fora 31.3%
- Maior goleada: Aucas 5 x 0 Técnico Universitario
- Melhor ataque: Barcelona SC (47) · melhor defesa: LDU Quito (21)
- Campeão: **Barcelona SC** (53 pts) · vice: Aucas (51 pts)
- Zona de rebaixamento configurada (3 últimos): Manta FC, Cumbayá FC, Delfín
- Clube de maior OVR: Independiente del Valle (OVR 66) acabou em 5.º · de menor OVR: Manta FC (OVR 57) acabou em 14.º

| # | Clube | OVR | J | V | E | D | GP | GC | SG | Pts |
|---:|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 1 | Barcelona SC 🏆 | 66 | 30 | 16 | 5 | 9 | 47 | 33 | 14 | 53 |
| 2 | Aucas | 66 | 30 | 14 | 9 | 7 | 38 | 26 | 12 | 51 |
| 3 | Universidad Católica-ECU | 58 | 30 | 14 | 9 | 7 | 37 | 28 | 9 | 51 |
| 4 | LDU Quito | 66 | 30 | 13 | 12 | 5 | 42 | 21 | 21 | 51 |
| 5 | Independiente del Valle | 66 | 30 | 13 | 10 | 7 | 46 | 35 | 11 | 49 |
| 6 | Macará | 61 | 30 | 13 | 5 | 12 | 45 | 42 | 3 | 44 |
| 7 | El Nacional | 65 | 30 | 11 | 8 | 11 | 45 | 44 | 1 | 41 |
| 8 | Emelec | 66 | 30 | 10 | 11 | 9 | 40 | 39 | 1 | 41 |
| 9 | Deportivo Cuenca | 64 | 30 | 11 | 6 | 13 | 32 | 35 | -3 | 39 |
| 10 | Mushuc Runa | 60 | 30 | 8 | 14 | 8 | 41 | 44 | -3 | 38 |
| 11 | Libertad FC | 60 | 30 | 8 | 12 | 10 | 35 | 41 | -6 | 36 |
| 12 | Técnico Universitario | 61 | 30 | 9 | 8 | 13 | 38 | 53 | -15 | 35 |
| 13 | Orense | 62 | 30 | 8 | 9 | 13 | 33 | 40 | -7 | 33 |
| 14 | Manta FC ⬇ | 57 | 30 | 8 | 8 | 14 | 37 | 48 | -11 | 32 |
| 15 | Cumbayá FC ⬇ | 58 | 30 | 8 | 5 | 17 | 26 | 45 | -19 | 29 |
| 16 | Delfín ⬇ | 63 | 30 | 7 | 7 | 16 | 34 | 42 | -8 | 28 |

### Peru — Liga 1 (divisão 1)

- Clubes: 18 · jogos: 306/306 · rodadas: 34 · golos: 822 (2.69 por jogo) · jogos sem golos: 18 (5.9%)
- Resultados: casa 47.7% · empate 20.9% · fora 31.4%
- Maior goleada: Deportivo Garcilaso 7 x 2 Comerciantes Unidos
- Melhor ataque: ADT (53) · melhor defesa: Carlos A. Mannucci (29)
- Campeão: **Carlos A. Mannucci** (61 pts) · vice: Atlético Grau (60 pts)
- Zona de rebaixamento configurada (3 últimos): Binacional, UTC, Cusco FC
- Clube de maior OVR: Universitario (OVR 64) acabou em 5.º · de menor OVR: Binacional (OVR 55) acabou em 16.º

| # | Clube | OVR | J | V | E | D | GP | GC | SG | Pts |
|---:|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 1 | Carlos A. Mannucci 🏆 | 59 | 34 | 17 | 10 | 7 | 49 | 29 | 20 | 61 |
| 2 | Atlético Grau | 57 | 34 | 19 | 3 | 12 | 50 | 40 | 10 | 60 |
| 3 | Sport Boys | 62 | 34 | 17 | 5 | 12 | 48 | 43 | 5 | 56 |
| 4 | Sport Huancayo | 62 | 34 | 17 | 4 | 13 | 49 | 40 | 9 | 55 |
| 5 | Universitario | 64 | 34 | 15 | 8 | 11 | 47 | 45 | 2 | 53 |
| 6 | Juan Pablo II College | 60 | 34 | 15 | 6 | 13 | 41 | 41 | 0 | 51 |
| 7 | Deportivo Garcilaso | 60 | 34 | 14 | 7 | 13 | 52 | 44 | 8 | 49 |
| 8 | Alianza Atlético | 60 | 34 | 14 | 7 | 13 | 42 | 41 | 1 | 49 |
| 9 | Sporting Cristal | 64 | 34 | 12 | 11 | 11 | 47 | 37 | 10 | 47 |
| 10 | Los Chankas | 56 | 34 | 12 | 11 | 11 | 42 | 37 | 5 | 47 |
| 11 | ADT | 61 | 34 | 12 | 10 | 12 | 53 | 56 | -3 | 46 |
| 12 | Melgar | 64 | 34 | 13 | 6 | 15 | 45 | 51 | -6 | 45 |
| 13 | Comerciantes Unidos | 58 | 34 | 11 | 10 | 13 | 40 | 50 | -10 | 43 |
| 14 | Cienciano | 63 | 34 | 10 | 10 | 14 | 40 | 46 | -6 | 40 |
| 15 | Alianza Lima | 64 | 34 | 11 | 6 | 17 | 46 | 51 | -5 | 39 |
| 16 | Binacional ⬇ | 55 | 34 | 11 | 5 | 18 | 47 | 57 | -10 | 38 |
| 17 | UTC ⬇ | 57 | 34 | 11 | 5 | 18 | 43 | 58 | -15 | 38 |
| 18 | Cusco FC ⬇ | 56 | 34 | 11 | 4 | 19 | 41 | 56 | -15 | 37 |

### Bolivia — División Profesional (divisão 1)

- Clubes: 16 · jogos: 240/240 · rodadas: 30 · golos: 621 (2.59 por jogo) · jogos sem golos: 11 (4.6%)
- Resultados: casa 49.2% · empate 18.8% · fora 32.1%
- Maior goleada: Oriente Petrolero 6 x 0 Nacional Potosí
- Melhor ataque: Oriente Petrolero (51) · melhor defesa: Bolívar (30)
- Campeão: **The Strongest** (55 pts) · vice: Bolívar (52 pts)
- Zona de rebaixamento configurada (3 últimos): Guabirá, Universitario de Vinto, Palmaflor
- Clube de maior OVR: Bolívar (OVR 63) acabou em 2.º · de menor OVR: Gran Mamoré (OVR 54) acabou em 13.º

| # | Clube | OVR | J | V | E | D | GP | GC | SG | Pts |
|---:|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 1 | The Strongest 🏆 | 63 | 30 | 17 | 4 | 9 | 47 | 35 | 12 | 55 |
| 2 | Bolívar | 63 | 30 | 15 | 7 | 8 | 48 | 30 | 18 | 52 |
| 3 | Oriente Petrolero | 62 | 30 | 15 | 6 | 9 | 51 | 33 | 18 | 51 |
| 4 | Aurora | 61 | 30 | 15 | 4 | 11 | 40 | 32 | 8 | 49 |
| 5 | Nacional Potosí | 60 | 30 | 13 | 9 | 8 | 47 | 45 | 2 | 48 |
| 6 | San Antonio Bulo Bulo | 59 | 30 | 13 | 6 | 11 | 36 | 38 | -2 | 45 |
| 7 | Blooming | 63 | 30 | 12 | 8 | 10 | 39 | 35 | 4 | 44 |
| 8 | Independiente Petrolero | 60 | 30 | 14 | 1 | 15 | 34 | 42 | -8 | 43 |
| 9 | Always Ready | 63 | 30 | 12 | 4 | 14 | 40 | 40 | 0 | 40 |
| 10 | GV San José | 55 | 30 | 12 | 2 | 16 | 36 | 41 | -5 | 38 |
| 11 | Real Tomayapo | 57 | 30 | 11 | 5 | 14 | 39 | 42 | -3 | 38 |
| 12 | Jorge Wilstermann | 61 | 30 | 11 | 4 | 15 | 34 | 39 | -5 | 37 |
| 13 | Gran Mamoré | 54 | 30 | 10 | 6 | 14 | 39 | 43 | -4 | 36 |
| 14 | Guabirá ⬇ | 56 | 30 | 10 | 6 | 14 | 30 | 39 | -9 | 36 |
| 15 | Universitario de Vinto ⬇ | 58 | 30 | 9 | 8 | 13 | 32 | 45 | -13 | 35 |
| 16 | Palmaflor ⬇ | 56 | 30 | 6 | 10 | 14 | 29 | 42 | -13 | 28 |

### Venezuela — Liga FUTVE (divisão 1)

- Clubes: 14 · jogos: 182/182 · rodadas: 26 · golos: 491 (2.70 por jogo) · jogos sem golos: 17 (9.3%)
- Resultados: casa 39.0% · empate 24.2% · fora 36.8%
- Maior goleada: Portuguesa FC 1 x 6 Zamora FC
- Melhor ataque: Zamora FC (49) · melhor defesa: Deportivo La Guaira (18)
- Campeão: **Deportivo La Guaira** (50 pts) · vice: Metropolitanos FC (44 pts)
- Zona de rebaixamento configurada (2 últimos): Estudiantes de Mérida, Hermanos Colmenárez
- Clube de maior OVR: Caracas FC (OVR 63) acabou em 3.º · de menor OVR: Hermanos Colmenárez (OVR 53) acabou em 14.º

| # | Clube | OVR | J | V | E | D | GP | GC | SG | Pts |
|---:|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 1 | Deportivo La Guaira 🏆 | 60 | 26 | 14 | 8 | 4 | 38 | 18 | 20 | 50 |
| 2 | Metropolitanos FC | 59 | 26 | 14 | 2 | 10 | 39 | 33 | 6 | 44 |
| 3 | Caracas FC | 63 | 26 | 12 | 8 | 6 | 30 | 21 | 9 | 44 |
| 4 | Carabobo FC | 62 | 26 | 12 | 6 | 8 | 45 | 33 | 12 | 42 |
| 5 | Zamora FC | 62 | 26 | 11 | 9 | 6 | 49 | 35 | 14 | 42 |
| 6 | Monagas SC | 61 | 26 | 12 | 2 | 12 | 39 | 38 | 1 | 38 |
| 7 | Deportivo Táchira | 62 | 26 | 10 | 4 | 12 | 32 | 30 | 2 | 34 |
| 8 | Portuguesa FC | 58 | 26 | 9 | 6 | 11 | 39 | 48 | -9 | 33 |
| 9 | Academia Puerto Cabello | 59 | 26 | 9 | 5 | 12 | 34 | 47 | -13 | 32 |
| 10 | UCV FC | 56 | 26 | 8 | 7 | 11 | 32 | 44 | -12 | 31 |
| 11 | Deportivo Rayo Zuliano | 54 | 26 | 7 | 8 | 11 | 28 | 35 | -7 | 29 |
| 12 | Angostura FC | 55 | 26 | 7 | 7 | 12 | 31 | 38 | -7 | 28 |
| 13 | Estudiantes de Mérida ⬇ | 56 | 26 | 7 | 7 | 12 | 27 | 34 | -7 | 28 |
| 14 | Hermanos Colmenárez ⬇ | 53 | 26 | 6 | 9 | 11 | 28 | 37 | -9 | 27 |

### Spain — La Liga (divisão 1)

- Clubes: 20 · jogos: 380/380 · rodadas: 38 · golos: 1105 (2.91 por jogo) · jogos sem golos: 21 (5.5%)
- Resultados: casa 50.0% · empate 22.1% · fora 27.9%
- Maior goleada: Barcelona 10 x 0 Rayo Vallecano
- Melhor ataque: Villarreal (79) · melhor defesa: Valencia (36)
- Campeão: **Villarreal** (80 pts) · vice: Valencia (71 pts)
- Zona de rebaixamento configurada (3 últimos): Celta Vigo, Alavés, Real Oviedo
- Clube de maior OVR: Real Madrid (OVR 79) acabou em 6.º · de menor OVR: Real Oviedo (OVR 63) acabou em 20.º

| # | Clube | OVR | J | V | E | D | GP | GC | SG | Pts |
|---:|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 1 | Villarreal 🏆 | 78 | 38 | 25 | 5 | 8 | 79 | 46 | 33 | 80 |
| 2 | Valencia | 74 | 38 | 21 | 8 | 9 | 56 | 36 | 20 | 71 |
| 3 | Elche | 66 | 38 | 20 | 5 | 13 | 61 | 53 | 8 | 65 |
| 4 | Espanyol | 68 | 38 | 17 | 9 | 12 | 59 | 50 | 9 | 60 |
| 5 | Getafe | 70 | 38 | 16 | 9 | 13 | 63 | 57 | 6 | 57 |
| 6 | Real Madrid | 79 | 38 | 16 | 8 | 14 | 55 | 55 | 0 | 56 |
| 7 | Real Sociedad | 75 | 38 | 16 | 6 | 16 | 55 | 49 | 6 | 54 |
| 8 | Athletic Club | 76 | 38 | 16 | 6 | 16 | 54 | 50 | 4 | 54 |
| 9 | Atlético de Madrid | 78 | 38 | 14 | 12 | 12 | 53 | 45 | 8 | 54 |
| 10 | Rayo Vallecano | 70 | 38 | 15 | 8 | 15 | 58 | 68 | -10 | 53 |
| 11 | Barcelona | 78 | 38 | 14 | 11 | 13 | 63 | 46 | 17 | 53 |
| 12 | Real Betis | 78 | 38 | 14 | 10 | 14 | 51 | 52 | -1 | 52 |
| 13 | Girona | 73 | 38 | 14 | 9 | 15 | 54 | 60 | -6 | 51 |
| 14 | Osasuna | 71 | 38 | 14 | 9 | 15 | 53 | 60 | -7 | 51 |
| 15 | Mallorca | 69 | 38 | 14 | 8 | 16 | 53 | 59 | -6 | 50 |
| 16 | Levante | 65 | 38 | 11 | 10 | 17 | 41 | 58 | -17 | 43 |
| 17 | Sevilla | 74 | 38 | 11 | 8 | 19 | 46 | 56 | -10 | 41 |
| 18 | Celta Vigo ⬇ | 72 | 38 | 11 | 7 | 20 | 60 | 67 | -7 | 40 |
| 19 | Alavés ⬇ | 66 | 38 | 9 | 10 | 19 | 51 | 76 | -25 | 37 |
| 20 | Real Oviedo ⬇ | 63 | 38 | 8 | 10 | 20 | 40 | 62 | -22 | 34 |

### Germany — Bundesliga (divisão 1)

- Clubes: 18 · jogos: 306/306 · rodadas: 34 · golos: 806 (2.63 por jogo) · jogos sem golos: 22 (7.2%)
- Resultados: casa 42.5% · empate 28.8% · fora 28.8%
- Maior goleada: RB Leipzig 5 x 0 Freiburg
- Melhor ataque: RB Leipzig (65) · melhor defesa: Eintracht Frankfurt (31)
- Campeão: **Eintracht Frankfurt** (68 pts) · vice: Union Berlin (63 pts)
- Zona de rebaixamento configurada (2 últimos): Hamburger SV, Heidenheim
- Clube de maior OVR: Bayern München (OVR 77) acabou em 6.º · de menor OVR: Heidenheim (OVR 63) acabou em 18.º

| # | Clube | OVR | J | V | E | D | GP | GC | SG | Pts |
|---:|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 1 | Eintracht Frankfurt 🏆 | 75 | 34 | 19 | 11 | 4 | 55 | 31 | 24 | 68 |
| 2 | Union Berlin | 68 | 34 | 17 | 12 | 5 | 59 | 37 | 22 | 63 |
| 3 | Wolfsburg | 72 | 34 | 17 | 9 | 8 | 49 | 37 | 12 | 60 |
| 4 | Bayer Leverkusen | 77 | 34 | 16 | 9 | 9 | 54 | 42 | 12 | 57 |
| 5 | Freiburg | 73 | 34 | 16 | 7 | 11 | 45 | 37 | 8 | 55 |
| 6 | Bayern München | 77 | 34 | 14 | 9 | 11 | 46 | 40 | 6 | 51 |
| 7 | Stuttgart | 74 | 34 | 14 | 8 | 12 | 43 | 42 | 1 | 50 |
| 8 | Borussia Mönchengladbach | 72 | 34 | 13 | 9 | 12 | 42 | 39 | 3 | 48 |
| 9 | RB Leipzig | 76 | 34 | 12 | 12 | 10 | 65 | 48 | 17 | 48 |
| 10 | Borussia Dortmund | 76 | 34 | 11 | 11 | 12 | 46 | 35 | 11 | 44 |
| 11 | St. Pauli | 66 | 34 | 10 | 12 | 12 | 50 | 56 | -6 | 42 |
| 12 | Mainz 05 | 69 | 34 | 10 | 12 | 12 | 45 | 51 | -6 | 42 |
| 13 | Werder Bremen | 70 | 34 | 9 | 13 | 12 | 36 | 42 | -6 | 40 |
| 14 | Augsburg | 67 | 34 | 10 | 8 | 16 | 34 | 44 | -10 | 38 |
| 15 | Hoffenheim | 70 | 34 | 10 | 7 | 17 | 36 | 51 | -15 | 37 |
| 16 | Köln | 65 | 34 | 7 | 10 | 17 | 39 | 61 | -22 | 31 |
| 17 | Hamburger SV ⬇ | 63 | 34 | 7 | 8 | 19 | 32 | 62 | -30 | 29 |
| 18 | Heidenheim ⬇ | 63 | 34 | 6 | 9 | 19 | 30 | 51 | -21 | 27 |

### Italy — Serie A (divisão 1)

- Clubes: 20 · jogos: 380/380 · rodadas: 38 · golos: 1013 (2.67 por jogo) · jogos sem golos: 22 (5.8%)
- Resultados: casa 47.9% · empate 24.7% · fora 27.4%
- Maior goleada: Parma 6 x 1 Fiorentina
- Melhor ataque: Napoli (65) · melhor defesa: Atalanta (38)
- Campeão: **Napoli** (71 pts) · vice: Atalanta (69 pts)
- Zona de rebaixamento configurada (3 últimos): Hellas Verona, Cremonese, Parma
- Clube de maior OVR: Inter (OVR 76) acabou em 7.º · de menor OVR: Cremonese (OVR 62) acabou em 19.º

| # | Clube | OVR | J | V | E | D | GP | GC | SG | Pts |
|---:|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 1 | Napoli 🏆 | 75 | 38 | 20 | 11 | 7 | 65 | 45 | 20 | 71 |
| 2 | Atalanta | 74 | 38 | 21 | 6 | 11 | 59 | 38 | 21 | 69 |
| 3 | Roma | 73 | 38 | 21 | 5 | 12 | 64 | 47 | 17 | 68 |
| 4 | Bologna | 71 | 38 | 18 | 9 | 11 | 57 | 43 | 14 | 63 |
| 5 | Como | 71 | 38 | 18 | 9 | 11 | 59 | 47 | 12 | 63 |
| 6 | Juventus | 75 | 38 | 18 | 8 | 12 | 54 | 46 | 8 | 62 |
| 7 | Inter | 76 | 38 | 16 | 10 | 12 | 57 | 39 | 18 | 58 |
| 8 | Fiorentina | 72 | 38 | 15 | 11 | 12 | 53 | 43 | 10 | 56 |
| 9 | Genoa | 68 | 38 | 15 | 9 | 14 | 60 | 49 | 11 | 54 |
| 10 | Lazio | 73 | 38 | 14 | 10 | 14 | 53 | 56 | -3 | 52 |
| 11 | Torino | 70 | 38 | 14 | 9 | 15 | 41 | 40 | 1 | 51 |
| 12 | Pisa | 63 | 38 | 12 | 13 | 13 | 48 | 62 | -14 | 49 |
| 13 | Milan | 75 | 38 | 13 | 9 | 16 | 46 | 45 | 1 | 48 |
| 14 | Lecce | 65 | 38 | 12 | 10 | 16 | 41 | 50 | -9 | 46 |
| 15 | Udinese | 68 | 38 | 10 | 14 | 14 | 47 | 53 | -6 | 44 |
| 16 | Sassuolo | 64 | 38 | 10 | 12 | 16 | 39 | 54 | -15 | 42 |
| 17 | Cagliari | 67 | 38 | 12 | 5 | 21 | 46 | 69 | -23 | 41 |
| 18 | Hellas Verona ⬇ | 64 | 38 | 9 | 14 | 15 | 43 | 57 | -14 | 41 |
| 19 | Cremonese ⬇ | 62 | 38 | 9 | 8 | 21 | 37 | 63 | -26 | 35 |
| 20 | Parma ⬇ | 66 | 38 | 9 | 6 | 23 | 44 | 67 | -23 | 33 |

### France — Ligue 1 (divisão 1)

- Clubes: 18 · jogos: 306/306 · rodadas: 34 · golos: 834 (2.73 por jogo) · jogos sem golos: 18 (5.9%)
- Resultados: casa 44.8% · empate 24.5% · fora 30.7%
- Maior goleada: Nantes 1 x 6 Lille
- Melhor ataque: Lille (62) · melhor defesa: Paris Saint-Germain (36)
- Campeão: **Marseille** (62 pts) · vice: Lens (57 pts)
- Zona de rebaixamento configurada (2 últimos): Paris FC, Le Havre
- Clube de maior OVR: Paris Saint-Germain (OVR 76) acabou em 3.º · de menor OVR: Paris FC (OVR 62) acabou em 17.º

| # | Clube | OVR | J | V | E | D | GP | GC | SG | Pts |
|---:|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 1 | Marseille 🏆 | 76 | 34 | 18 | 8 | 8 | 56 | 42 | 14 | 62 |
| 2 | Lens | 72 | 34 | 16 | 9 | 9 | 51 | 41 | 10 | 57 |
| 3 | Paris Saint-Germain | 76 | 34 | 15 | 12 | 7 | 50 | 36 | 14 | 57 |
| 4 | Monaco | 75 | 34 | 16 | 8 | 10 | 61 | 49 | 12 | 56 |
| 5 | Strasbourg | 70 | 34 | 16 | 8 | 10 | 51 | 40 | 11 | 56 |
| 6 | Lille | 74 | 34 | 16 | 5 | 13 | 62 | 40 | 22 | 53 |
| 7 | Rennes | 71 | 34 | 14 | 8 | 12 | 49 | 48 | 1 | 50 |
| 8 | Nantes | 67 | 34 | 14 | 8 | 12 | 49 | 50 | -1 | 50 |
| 9 | Lyon | 74 | 34 | 13 | 8 | 13 | 55 | 50 | 5 | 47 |
| 10 | Toulouse | 68 | 34 | 12 | 9 | 13 | 45 | 41 | 4 | 45 |
| 11 | Nice | 71 | 34 | 11 | 12 | 11 | 44 | 44 | 0 | 45 |
| 12 | Metz | 63 | 34 | 11 | 12 | 11 | 36 | 40 | -4 | 45 |
| 13 | Brest | 69 | 34 | 12 | 7 | 15 | 34 | 42 | -8 | 43 |
| 14 | Auxerre | 66 | 34 | 11 | 6 | 17 | 46 | 62 | -16 | 39 |
| 15 | Lorient | 63 | 34 | 10 | 9 | 15 | 35 | 47 | -12 | 39 |
| 16 | Angers | 66 | 34 | 11 | 3 | 20 | 35 | 56 | -21 | 36 |
| 17 | Paris FC ⬇ | 62 | 34 | 9 | 6 | 19 | 39 | 53 | -14 | 33 |
| 18 | Le Havre ⬇ | 65 | 34 | 6 | 12 | 16 | 36 | 53 | -17 | 30 |

## Acessos e descensos

Configuração das divisões (`COUNTRIES`, em `textSim/realDatabase.ts`) e o que a simulação fez com ela.

| País | Divisão | Liga | Clubes | Rebaixados (config.) | Promovidos (config.) |
|---|---:|---|---:|---:|---:|
| Brazil | 1 | Série A | 20 | 4 | 0 |
| Brazil | 2 | Série B | 20 | 4 | 4 |
| Brazil | 3 | Série C (só mundo) | 20 | 4 | 4 |
| Brazil | 4 | Série D (só mundo) | 96 | 0 | 4 |
| Brazil | 9 | Outros clubes (Copa do Brasil) (oculta) | 14 | 0 | 0 |
| England | 1 | Premier League | 20 | 3 | 0 |
| Argentina | 1 | Liga Profesional | 30 | 3 | 0 |
| Chile | 1 | Primera División | 16 | 3 | 0 |
| Colombia | 1 | Categoría Primera A | 20 | 3 | 0 |
| Uruguay | 1 | Primera División | 16 | 3 | 0 |
| Paraguay | 1 | Primera División | 12 | 2 | 0 |
| Ecuador | 1 | LigaPro Serie A | 16 | 3 | 0 |
| Peru | 1 | Liga 1 | 18 | 3 | 0 |
| Bolivia | 1 | División Profesional | 16 | 3 | 0 |
| Venezuela | 1 | Liga FUTVE | 14 | 2 | 0 |
| Spain | 1 | La Liga | 20 | 3 | 0 |
| Germany | 1 | Bundesliga | 18 | 2 | 0 |
| Italy | 1 | Serie A | 20 | 3 | 0 |
| France | 1 | Ligue 1 | 18 | 2 | 0 |
| Norway | 9 | Eliteserien (clubes) (oculta) | 5 | - | - |
| Netherlands | 9 | Eredivisie (clubes) (oculta) | 5 | - | - |
| Portugal | 9 | Primeira Liga (clubes) (oculta) | 5 | - | - |
| Turkey | 9 | Süper Lig (clubes) (oculta) | 5 | - | - |
| Austria | 9 | Bundesliga Austríaca (clubes) (oculta) | 5 | - | - |
| Azerbaijan | 9 | Premyer Liqa (clubes) (oculta) | 5 | - | - |
| Belgium | 9 | Pro League (clubes) (oculta) | 5 | - | - |
| Slovakia | 9 | Fortuna Liga (clubes) (oculta) | 5 | - | - |
| Greece | 9 | Super League (clubes) (oculta) | 5 | - | - |
| Czechia | 9 | Fortuna Liga Tcheca (clubes) (oculta) | 5 | - | - |
| Ukraine | 9 | Premier Liha (clubes) (oculta) | 5 | - | - |

### Quem subiria e quem desceria, pelas tabelas simuladas

- **Brazil — Série A**: sem acesso configurado · desce (4): Santos-SP, São Paulo-SP, Cruzeiro-MG, Palmeiras-SP
- **Brazil — Série B**: sobem (4): Avaí-SC, Náutico-PE, Fortaleza-CE, Vila Nova-GO · desce (4): Novorizontino-SP, Operário-PR, CRB-AL, São Bernardo-SP
- **England — Premier League**: sem acesso configurado · desce (3): Brentford, Ipswich, Wolves
- **Argentina — Liga Profesional**: sem acesso configurado · desce (3): Gimnasia La Plata, Colón, Deportivo Riestra
- **Chile — Primera División**: sem acesso configurado · desce (3): Deportes Iquique, Unión La Calera, Colo-Colo
- **Colombia — Categoría Primera A**: sem acesso configurado · desce (3): Deportivo Cali, Llaneros FC, Internacional de Bogotá
- **Uruguay — Primera División**: sem acesso configurado · desce (3): Boston River, Deportivo Maldonado, Juventud
- **Paraguay — Primera División**: sem acesso configurado · desce (2): Sportivo Trinidense, Recoleta
- **Ecuador — LigaPro Serie A**: sem acesso configurado · desce (3): Manta FC, Cumbayá FC, Delfín
- **Peru — Liga 1**: sem acesso configurado · desce (3): Binacional, UTC, Cusco FC
- **Bolivia — División Profesional**: sem acesso configurado · desce (3): Guabirá, Universitario de Vinto, Palmaflor
- **Venezuela — Liga FUTVE**: sem acesso configurado · desce (2): Estudiantes de Mérida, Hermanos Colmenárez
- **Spain — La Liga**: sem acesso configurado · desce (3): Celta Vigo, Alavés, Real Oviedo
- **Germany — Bundesliga**: sem acesso configurado · desce (2): Hamburger SV, Heidenheim
- **Italy — Serie A**: sem acesso configurado · desce (3): Hellas Verona, Cremonese, Parma
- **France — Ligue 1**: sem acesso configurado · desce (2): Paris FC, Le Havre

### Plano de acessos e descensos aplicado a esta temporada (`textSim/promocoes.ts`)

Série C e D não são jogadas nesta simulação (competições de formato próprio): a ordem delas aqui é **sintética** (por OVR com ruído) só para exercitar o plano: Série C, Série D.

- **Brazil — Série A**
  - rebaixados (4): Santos-SP, São Paulo-SP, Cruzeiro-MG, Palmeiras-SP
  - chegam promovidos de baixo (4): Avaí-SC, Náutico-PE, Fortaleza-CE, Vila Nova-GO
- **Brazil — Série B**
  - promovidos (4, saem para a divisão de cima): Avaí-SC, Náutico-PE, Fortaleza-CE, Vila Nova-GO
  - rebaixados (4): Novorizontino-SP, Operário-PR, CRB-AL, São Bernardo-SP
  - chegam rebaixados de cima (4): Santos-SP, São Paulo-SP, Cruzeiro-MG, Palmeiras-SP
  - chegam promovidos de baixo (4): Paysandu-PA, Itabaiana-SE, Figueirense-SC, Guarani-SP
- **Brazil — Série C**
  - promovidos (4, saem para a divisão de cima): Paysandu-PA, Itabaiana-SE, Figueirense-SC, Guarani-SP
  - rebaixados (4): Floresta-CE, Barra-SC, Maranhão-MA, Caxias-RS
  - chegam rebaixados de cima (4): Novorizontino-SP, Operário-PR, CRB-AL, São Bernardo-SP
  - chegam promovidos de baixo (4): Manaus-AM, Pouso Alegre-MG, Retrô-PE, Jacuipense-BA
- **Brazil — Série D**
  - promovidos (4, saem para a divisão de cima): Manaus-AM, Pouso Alegre-MG, Retrô-PE, Jacuipense-BA
  - chegam rebaixados de cima (4): Floresta-CE, Barra-SC, Maranhão-MA, Caxias-RS
- **England — Premier League**
  - ficam por falta de substituto no standby (3): Brentford, Ipswich, Wolves
- **Argentina — Liga Profesional**
  - rebaixados (3): Gimnasia La Plata, Colón, Deportivo Riestra → standby (sem liga)
  - entram do standby (3): Chacarita Juniors, Quilmes, San Martín (T)
- **Chile — Primera División**
  - rebaixados (3): Deportes Iquique, Unión La Calera, Colo-Colo → standby (sem liga)
  - entram do standby (3): Deportes Antofagasta, Santiago Wanderers, Deportes Temuco
- **Colombia — Categoría Primera A**
  - rebaixados (3): Deportivo Cali, Llaneros FC, Internacional de Bogotá → standby (sem liga)
  - entram do standby (3): Deportes Quindío, Unión Magdalena, Patriotas Boyacá
- **Uruguay — Primera División**
  - rebaixados (3): Boston River, Deportivo Maldonado, Juventud → standby (sem liga)
  - entram do standby (3): Fénix, Miramar Misiones, Central Español
- **Paraguay — Primera División**
  - rebaixados (2): Sportivo Trinidense, Recoleta → standby (sem liga)
  - entram do standby (2): Sportivo Ameliano, Deportivo Capiatá
- **Ecuador — LigaPro Serie A**
  - rebaixados (3): Manta FC, Cumbayá FC, Delfín → standby (sem liga)
  - entram do standby (3): Deportivo Quito, 9 de Octubre, Guayaquil City
- **Peru — Liga 1**
  - rebaixados (3): Binacional, UTC, Cusco FC → standby (sem liga)
  - entram do standby (3): Pirata FC, Deportivo Municipal, Deportivo Llacuabamba
- **Bolivia — División Profesional**
  - rebaixados (3): Guabirá, Universitario de Vinto, Palmaflor → standby (sem liga)
  - entram do standby (3): Universitario de Sucre, Fancesa, Atlético Bermejo
- **Venezuela — Liga FUTVE**
  - rebaixados (2): Estudiantes de Mérida, Hermanos Colmenárez → standby (sem liga)
  - entram do standby (2): Gran Valencia FC, Yaracuyanos FC
- **Spain — La Liga**
  - ficam por falta de substituto no standby (3): Celta Vigo, Alavés, Real Oviedo
- **Germany — Bundesliga**
  - ficam por falta de substituto no standby (2): Hamburger SV, Heidenheim
- **Italy — Serie A**
  - ficam por falta de substituto no standby (3): Hellas Verona, Cremonese, Parma
- **France — Ligue 1**
  - ficam por falta de substituto no standby (2): Paris FC, Le Havre

### Standby (clubes sem liga) por país, antes e depois

| País | Antes | Depois | Clubes no standby depois |
|---|---:|---:|---|
| Brazil | 0 | 0 | — |
| England | 0 | 0 | — |
| Argentina | 6 | 6 | Atlanta, Nueva Chicago, Ferro Carril Oeste, Gimnasia La Plata, Colón, Deportivo Riestra |
| Chile | 6 | 6 | Cobreloa, Universidad de Concepción, Curicó Unido, Deportes Iquique, Unión La Calera, Colo-Colo |
| Colombia | 6 | 6 | Cúcuta Deportivo, Real Cartagena, Atlético Huila, Deportivo Cali, Llaneros FC, Internacional de Bogotá |
| Uruguay | 6 | 6 | Albion, Rampla Juniors, Atenas de San Carlos, Boston River, Deportivo Maldonado, Juventud |
| Paraguay | 6 | 6 | 12 de Octubre, Resistencia, Atlético Colegiales, Deportivo Santaní, Sportivo Trinidense, Recoleta |
| Ecuador | 6 | 6 | Imbabura SC, Gualaceo SC, Chacaritas FC, Manta FC, Cumbayá FC, Delfín |
| Peru | 6 | 6 | Academia Cantolao, Ayacucho FC, Unión Comercio, Binacional, UTC, Cusco FC |
| Bolivia | 6 | 6 | Royal Pari, Real Santa Cruz, Stormers San Lorenzo, Guabirá, Universitario de Vinto, Palmaflor |
| Venezuela | 6 | 6 | Mineros de Guayana, Aragua FC, Trujillanos FC, Ureña SC, Estudiantes de Mérida, Hermanos Colmenárez |
| Spain | 0 | 0 | — |
| Germany | 0 | 0 | — |
| Italy | 0 | 0 | — |
| France | 0 | 0 | — |

**Verificação do plano:** todas as ligas mantêm o tamanho e nenhum clube aparece duas vezes (liga + standby).

### O jogo aplica acessos e descensos na temporada seguinte?

**Ainda não.** O jogo não tem virada de temporada (o calendário acaba e nada recomeça), e `relegated` só pinta a zona de descenso na aba WORLD. O que passou a existir é o PLANO (`textSim/promocoes.ts`): dada a classificação final, diz quem desce, quem sobe e quem vai ao standby, sem tocar nos dados. Falta ligá-lo a uma virada de temporada que escreva `novosTeamIds` nas ligas e o standby no país (`reserveTeamIds`).

Configuração (ajustada): Brasil A→B 4/4, B→C 4/4, C→D 4/4 (Série C rebaixa 4, Série D promove 4: a Série D deixou de ter playoff de acesso e sobem só os 4 semifinalistas). Países sem divisão inferior: os rebaixados vão ao standby e entram clubes de lá. Inglaterra, Espanha, Alemanha, Itália e França não têm clubes no standby: os rebaixados ficam na liga.

**Observações sobre a configuração (só rebaixa sem divisão abaixo):**
- England: a Premier League é a última divisão e tem 3 rebaixados (sem divisão abaixo para recebê-los).
- Argentina: a Liga Profesional é a última divisão e tem 3 rebaixados (sem divisão abaixo para recebê-los).
- Chile: a Primera División é a última divisão e tem 3 rebaixados (sem divisão abaixo para recebê-los).
- Colombia: a Categoría Primera A é a última divisão e tem 3 rebaixados (sem divisão abaixo para recebê-los).
- Uruguay: a Primera División é a última divisão e tem 3 rebaixados (sem divisão abaixo para recebê-los).
- Paraguay: a Primera División é a última divisão e tem 2 rebaixados (sem divisão abaixo para recebê-los).
- Ecuador: a LigaPro Serie A é a última divisão e tem 3 rebaixados (sem divisão abaixo para recebê-los).
- Peru: a Liga 1 é a última divisão e tem 3 rebaixados (sem divisão abaixo para recebê-los).
- Bolivia: a División Profesional é a última divisão e tem 3 rebaixados (sem divisão abaixo para recebê-los).
- Venezuela: a Liga FUTVE é a última divisão e tem 2 rebaixados (sem divisão abaixo para recebê-los).
- Spain: a La Liga é a última divisão e tem 3 rebaixados (sem divisão abaixo para recebê-los).
- Germany: a Bundesliga é a última divisão e tem 2 rebaixados (sem divisão abaixo para recebê-los).
- Italy: a Serie A é a última divisão e tem 3 rebaixados (sem divisão abaixo para recebê-los).
- France: a Ligue 1 é a última divisão e tem 2 rebaixados (sem divisão abaixo para recebê-los).
