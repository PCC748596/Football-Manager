# Plano de Validação Estatística da Engine de Simulação

Com a implementação das fases de Momentum, Setores Laterais, Controle de Posse pelo Meio-Campo, Remoção dos Gols Pré-Definidos, Team AI, Role AI e Playing Style, o próximo passo não é adicionar novas funcionalidades, mas validar matematicamente se a engine está produzindo resultados realistas e coerentes.

O objetivo agora é criar uma ferramenta de validação que execute temporadas completas sem renderização visual e gere estatísticas agregadas para análise.

A engine deve ser capaz de rodar milhares de partidas rapidamente, permitindo verificar se os valores médios e as distribuições dos eventos estão próximos do futebol real.

## Estatísticas a Coletar por Partida

Cada partida simulada deve registrar:

* Gols do mandante
* Gols do visitante
* Total de gols
* Finalizações do mandante
* Finalizações do visitante
* Escanteios do mandante
* Escanteios do visitante
* Faltas do mandante
* Faltas do visitante
* Cartões amarelos do mandante
* Cartões amarelos do visitante
* Cartões vermelhos do mandante
* Cartões vermelhos do visitante
* Impedimentos do mandante
* Impedimentos do visitante
* Pênaltis do mandante
* Pênaltis do visitante
* Lesões do mandante
* Lesões do visitante
* Posse de bola do mandante
* Posse de bola do visitante

## Estatísticas a Coletar por Temporada

Ao final de cada temporada, calcular:

* Total de partidas
* Total de gols
* Média de gols por partida
* Média de finalizações por partida
* Média de escanteios por partida
* Média de faltas por partida
* Média de cartões amarelos por partida
* Média de cartões vermelhos por partida
* Média de impedimentos por partida
* Média de pênaltis por partida
* Média de lesões por partida
* Percentual de vitórias do mandante
* Percentual de vitórias do visitante
* Percentual de empates

## Quantidade de Simulações

A validação deve ser executada em três etapas:

### Etapa 1 — Teste Rápido

Executar:

* 5 temporadas

Objetivo:

* Encontrar erros grosseiros
* Detectar explosões de gols
* Detectar excesso de cartões
* Detectar eventos raros acontecendo em excesso

### Etapa 2 — Calibração

Executar:

* 20 temporadas

Objetivo:

* Reduzir o impacto da aleatoriedade
* Ajustar pesos e multiplicadores
* Verificar tendências reais da engine

### Etapa 3 — Validação Final

Executar:

* 100 temporadas

Objetivo:

* Confirmar estabilidade matemática
* Validar o equilíbrio geral da simulação
* Garantir que os resultados se mantêm consistentes no longo prazo

Como a engine é puramente matemática e narrativa, 100 temporadas devem ser simuladas em poucos segundos.

## Valores Reais de Referência

As médias obtidas devem ser comparadas com ligas reais.

### Gols

Valor real:

2.5 a 3.0 gols por partida

Meta:

2.7 gols por partida

### Escanteios

Valor real:

8 a 11 escanteios por partida

Meta:

9.5 escanteios por partida

### Faltas

Valor real:

20 a 28 faltas por partida

Meta:

24 faltas por partida

### Cartões Amarelos

Valor real:

3 a 5 cartões por partida

Meta:

4 cartões por partida

### Cartões Vermelhos

Valor real:

0.10 a 0.25 expulsões por partida

Meta:

0.15 expulsões por partida

### Impedimentos

Valor real:

2 a 4 impedimentos por partida

Meta:

3 impedimentos por partida

### Pênaltis

Valor real:

0.15 a 0.30 pênaltis por partida

Meta:

0.20 pênaltis por partida

## Verificação de Distribuição

Não basta verificar apenas as médias.

Uma média aparentemente correta pode esconder uma distribuição completamente irreal.

Por isso é necessário registrar a frequência de resultados.

Distribuição de gols:

* Jogos com 0 gols
* Jogos com 1 gol
* Jogos com 2 gols
* Jogos com 3 gols
* Jogos com 4 gols
* Jogos com 5 ou mais gols

A distribuição deve se aproximar da encontrada em ligas reais.

Se a maioria absoluta das partidas estiver terminando em placares muito altos ou muito baixos, existe algum problema na lógica da engine, mesmo que a média geral pareça correta.

## Teste de Força Relativa

Criar três equipes artificiais:

### Time Forte

Overall aproximado:

90

### Time Médio

Overall aproximado:

70

### Time Fraco

Overall aproximado:

50

Executar:

* Forte vs Fraco — 1000 jogos
* Forte vs Médio — 1000 jogos
* Médio vs Fraco — 1000 jogos

Resultados esperados:

Forte vs Fraco:

* 70% a 80% de vitórias do forte

Forte vs Médio:

* 55% a 65% de vitórias do forte

Médio vs Fraco:

* 55% a 65% de vitórias do médio

Caso esses resultados não ocorram, significa que os atributos dos jogadores não estão influenciando suficientemente o resultado final.

## Teste de Momentum

Executar:

* 1000 partidas

Registrar:

* Minuto do primeiro gol
* Time que marcou primeiro
* Resultado final da partida

Analisar:

Quando um time marca um gol cedo, especialmente até os 15 minutos, ele deve aumentar significativamente suas chances de vitória.

Espera-se que o time que marcou primeiro vença aproximadamente 60% ou mais das partidas.

Se a taxa continuar próxima de um cenário aleatório, o sistema de momentum não está gerando impacto suficiente.

## Ferramenta Recomendada

Criar um novo serviço:

services/simulationValidator.ts

Função principal:

runSeasonValidation(
seasons,
teams,
players
)

A função deve retornar:

* Partidas simuladas
* Gols por partida
* Finalizações por partida
* Escanteios por partida
* Faltas por partida
* Cartões amarelos por partida
* Cartões vermelhos por partida
* Impedimentos por partida
* Pênaltis por partida
* Lesões por partida
* Vitórias do mandante
* Vitórias do visitante
* Empates
* Distribuição de placares
* Distribuição de posse
* Estatísticas de momentum
* Estatísticas de força relativa

## Objetivo Final

Antes de continuar evoluindo Team AI, Role AI, Playing Style ou iniciar a camada visual 2D/3D, a prioridade é validar matematicamente a engine.

A meta é garantir que os números produzidos pela simulação sejam realistas, consistentes e estáveis em milhares de partidas.

Somente após essa validação será possível afirmar que a base da engine está sólida o suficiente para sustentar futuras camadas visuais, animações, movimentação em campo e simulações mais avançadas.