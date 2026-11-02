# Sistema de notas individuais (3D) — Design

Data: 2026-11-02

## Objetivo
Substituir, nos jogos 3D, a nota individual por um sistema contextual que combina comportamento tático, qualidade técnica, participação e disciplina, ajustado por posição e Playing Style. Não altera a lógica de movimento, posicionamento ou simulação.

## Decisões
- O motor de notas roda no simulador 3D (`simulador3d/js/ratings/`), alimentado ao vivo por eventos e amostras táticas.
- O simulador de texto (`calculateMatchRatings` em `textSim/matchEngine.ts`) fica como está; é ajustado numa fase posterior.
- Formato `fixture.playerRatings: Record<id, number>` mantido. Campo novo opcional `ratingDetalhes` (saves antigos continuam válidos).

## Arquitetura
- `rating_config.js`: apenas dados. Pesos dos 4 componentes (tático 35, técnico 30, participação 25, disciplina 10), impacto por evento (valores iniciais da especificação), perfis por grupo de posição (GK, CB, FB, DM, CM/AM, W, ST), ajustes por Playing Style, limites por categoria e parâmetros de normalização.
- `rating_engine.js`: lógica pura, sem THREE/DOM, testável em `tests/`. API: `registrarEvento`, `amostrarTatico`, `entrou`, `saiu`, `nota`, `detalhes`, `melhorDaPartida`.
- Ganchos finos no motor 3D: chamadas `emitir()` nos pontos onde `stats.js` já conta gol, passe, remate, desarme, falta e cartão.

## Cálculo
- Cada componente acumula pontos brutos, com saturação (ex.: `tanh`) e limite por categoria, e vira pontuação 0–100. A base é calibrada para que o desempenho neutro dê 6.0.
- Nota = `1 + 9 × (pontuação ponderada / 100)`, limitada a 1.0–10.0, uma casa decimal.
- Pesos dos componentes e multiplicadores de eventos dependem do perfil da posição. O Playing Style só se aplica se compatível com a posição do slot.
- Tempo jogado: a evidência é normalizada por minutos e oportunidades; a nota é puxada para 6.0 conforme `min(1, minutos / M)`. Reserva começa em 6.0 ao entrar; quem sai (ou é expulso) congela a nota.
- Anti-dupla contagem: cada acontecimento tem `id`; um gol com assistência pontua só como gol e assistência.

## Eventos
Registro: `{ id, tipo, jogadorId, equipa, minuto, peso, ctx }`, com `ctx` = zona, fase, placar, dificuldade da ação. Tipos: os da especificação mais passe progressivo, cruzamento, drible, duelo aéreo, corte, defesa difícil e saída do gol.
Erros que geram remate ou gol são atribuídos retroativamente: ao sair o remate ou gol adversário, olha-se a janela dos últimos ~8 s; a perda de posse é substituída pelo evento mais grave, nunca somada.

## Amostragem tática
Uma amostra a cada ~1 s de jogo (não por frame), usando dados já calculados pelo motor: posição, bola, fase, slot tático da fase, estilo. O desvio da posição esperada só penaliza se não for justificado pelo contexto (bola próxima, cobertura de companheiro, estilo que exige o movimento). Sem varreduras novas por frame.

## Man of the Match
Candidatos com mínimo de minutos (~30') e participação mínima. Ordem: nota, depois contribuição defensiva. Sem bônus automático por gols; GK, CB e DM podem ganhar.

## Histórico
`GameContext` guarda `ratingHistorico[playerId] = [{ fixtureId, nota, minutos, motm }]`. Médias, últimas 5, melhor nota, contagem de MoM e ranking por posição são derivados na leitura (apresentação em fase posterior).

## UI
Modal de resultado em `stats.js`: tabela com jogador, posição, minutos, nota colorida (9–10 verde forte, 8–8.9 verde, 7–7.9 verde claro, 6–6.9 amarelo, 5–5.9 laranja, 4–4.9 laranja escuro, 1–3.9 vermelho), gols, assistências e estatísticas-chave. Realces: MoM, piores notas, destaques defensivos. Clique na linha mostra as 4 categorias.

## Testes e calibração
- `tests/notas_*.test.js` com os 8 perfis da especificação, em faixas esperadas (ex.: atacante com 2 gols e pouca participação 7.5–8.5; erro que gera gol 4.5–5.5; volante dominante 7.0–8.0).
- Script em `tools/scratch` simula jogos em lote e mostra a distribuição (média alvo ~6.3–6.5, poucos 9+).
- Teste de custo da amostragem por frame com orçamento máximo.

## Fases
1. Motor e config com testes de calibração.
2. Ganchos de eventos no 3D.
3. Amostragem tática.
4. UI, Man of the Match e histórico.

Fora de escopo: alterar o texto-sim; telas de histórico/ranking da temporada.
