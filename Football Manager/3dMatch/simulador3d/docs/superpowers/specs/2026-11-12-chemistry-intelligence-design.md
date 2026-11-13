# Chemistry Intelligence — design

Data: 2026-11-12. Simulador 3D + ponte com o manager. Pedido completo do utilizador: "IMPLEMENTAÇÃO DO SISTEMA DE CHEMISTRY INTELLIGENCE – FOOTBALL MANAGER 3D".

## Objetivo

Transformar o entrosamento (hoje um número) em comunicação entre jogadores: uma dupla com Chemistry alto antecipa as intenções uma da outra — o atacante avisa
a corrida e o meia joga nela; o meia avisa o espaço e o atacante arranca antes do passe. Sem intenção, a AI fica exatamente como hoje.

## Decisões

- **Chemistry da dupla (0–99)** vem do `synergyMap` do manager (minutos juntos). **10 jogos juntos (900 min) = 99**, por dupla. A mesma régua passa a valer no
  Chemistry da tela (`CONFIG_QUIMICA.jogosParaTeto` 8 → 10), que é a média das duplas dos titulares. O fator de entrosamento do motor de texto não muda. Sem dados (3D solto): 50.
- **Módulo único** `ChemistryIntel` (js/chemistry_intel.js, config `ChemistryIntelModel`): um quadro de mensagens; não é uma segunda AI. Coordenadas do jogo (x, z).
- **Mensagem:** remetente, destinatário, tipo, destino (x, z), ação, criação, validade (1–3 s por tipo), confiança, estado (enviada, compreendida, aceita,
  recusada, executada, cancelada, expirada) e motivo.
- **Tipos:** FORWARD_RUN, DIAGONAL_RUN, OVERLAP, UNDERLAP, SUPPORT_RUN, THROUGH_PASS, CROSS_TARGET, SWITCH_PLAY, BOX_RUN, DECOY_RUN, POSITIONAL_SUPPORT.
- **Faixas de comunicação** (chance de compreender e atraso): 0–20 quase nula, 21–40 ocasional, 41–60 moderada, 61–80 boa, 81–99 excelente. Não garantem sucesso.
- **Atributos** (os do 3D, sem novos): corrida — `posOffense` (Off the Ball) e `tacticalAwa` (Positioning); passe — `vision`, `passing`, e `composure`/`reactions`
  (Decisions); execução — `ballControl` (Technique).
- **Dois fluxos:** A) sem bola → portador: as folhas que já existem (infiltrar, overlap, desmarcar) postam a intenção; o portador pondera-a na nota do passe.
  B) portador → sem bola: o portador posta o espaço (passe em profundidade, entrada da área, cruzamento); o destinatário que compreende arranca antes do passe.
- **Efeito só por dois caminhos:** bónus no `findPassTarget`/lançamento (proporcional a sincronia × confiança; todas as opções continuam avaliadas) e um alvo
  temporário de corrida pelo caminho normal de movimento (`dynamicTarget`), recalculado no intervalo da AI.
- **Cancelamento:** posse muda, destino inalcançável ou ocupado, remetente muda de ideia, validade, lance parado, algo mais importante.
- **Conflitos e frequência:** 1 intenção ativa por remetente; destinos de intenções ativas a distância mínima entre si; sem repetir a mesma mensagem a cada ciclo.
- **Evolução:** mantém +90/jogo junto do manager; extra pequeno por jogada coordenada que deu certo, devolvido ao manager no fim, com teto por jogo.
- **Memória:** gancho `registarJogada(dupla, tipo, resultado)`; o Player Memory System (ainda não existe) liga-se aí no futuro.
- **Debug:** linha/seta remetente → destinatário, marcador no destino e etiqueta (tipo, Chemistry, estado, tempo restante, confiança, bónus, motivo). Sem custo desligado.
- **Desempenho:** avaliação a ~0.2 s, mensagens reaproveitadas, sem alocação por frame.
- **Liga/desliga:** `ChemistryIntelModel.activo`.

## Etapas

1. Ponte de dados + módulo (quadro, Chemistry da dupla) + debug, sem efeito no jogo.
2. Fluxo A (sem bola → portador): bónus na Utility AI do passe.
3. Fluxo B (portador → sem bola): antecipação da corrida.
4. Evolução: extra por jogada coordenada, de volta ao manager.

## Testes (headless)

Chemistry alto comunica e sincroniza mais que baixo; baixo = decisão de hoje; os dois fluxos; corrida antes do passe; portador aproveita; destino atualizado;
expiração e cancelamentos; sem conflito; sem spam; o bónus pesa mas não obriga; custo por frame; lote de jogos antes/depois; Chemistry da tela continua a funcionar.
