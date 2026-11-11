# Antes do lançamento (Steam)

Questões em aberto para fechar antes de publicar. Marcar `[x]` quando decidida/feita.

## Jogabilidade

- [ ] **Notas de zagueiros e laterais.** Hoje um zagueiro perfeito sem gol fica em ~8,0-8,5 (máximo medido em 48 jogos: CB 8,4, FB 8,1); só com gol passa de 9. Ver no jogo e decidir se o defensor deve destacar-se mais (subir o peso de desarme/corte para CB/FB, ou o bônus de baliza a zero em `3dMatch/simulador3d/js/ratings/notas_config.js`). Medir de novo com `node tools/headless/notas_lote.js` (pasta `3dMatch/simulador3d`).
- [ ] **Notas do motor de texto** (jogos CPU x CPU): escala diferente da do 3D (média 6,47 ± 0,91 contra 6,87 ± 0,74). Alinhar `calculateMatchRatings` (`textSim/matchEngine.ts`) depois de fechar as notas do 3D.
- [ ] **Medir o ajuste do goleiro** (ERRO_GOLO do GK 1,2 → 0,8): ainda não medido em lote.
- [ ] **Pré-contrato:** a CPU leva jogadores do utilizador com menos de 6 meses de contrato. Rever o aviso de contrato crítico na caixa de entrada (ainda diz que o jogador só sai quando o contrato acaba).

## Conteúdo sem marcas reais

- [ ] Nomes de estádios reais em `3dMatch/simulador3d/js/config/estadios.js` (chaves por nome de clube).
- [ ] Marcas de patrocinadores em `public/sponsors/` e `Assets/Publicidade/`.
- [ ] Caso especial com nome real em `textSim/dataGenerator.ts` (`'Internacional-RS'`).
- [ ] O histórico do git ainda tem os escudos, nomes e dados reais: publicar um repositório limpo (ou reescrever o histórico) se o código for público.

## Pacote

- [ ] Empacotar em `.exe` (Electron): servidor local com `/api/mod/` (`tools/modServer.mjs`) e o save; janela Full HD / tela cheia.
- [ ] Lista de arquivos do pacote (fora: `docs/`, `md/`, `tests/`, `tmp/`, `tools/` — exceto `modServer.mjs` —, `node_modules/`, `3dMatch/simulador3d/tests`, `docs`, `tools`).
- [ ] Pasta padrão do mod no `.exe` (hoje `C:\Footmanager3D\mod`, em `textSim/modConfig.ts`).
- [ ] Câmbio automático ligado por padrão faz um pedido à internet ao abrir: decidir se fica ligado.
- [ ] Rodar `npm run build` limpo e conferir que o `dist/` não tem `Escudos`, `dados_reais` nem `local-data`.
