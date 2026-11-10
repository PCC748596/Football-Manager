Scripts antigos de uso unico (kits, ids, equipas inglesas, simulacoes de teste). Correm a partir da RAIZ do projeto (`npx tsx tools/legacy/simulate.ts`), porque leem `textSim/realDatabase.ts` e `teams.json` por caminho relativo a raiz.
CUIDADO: os `update_*` e `add_english_teams`/`reorganize_ids` REESCREVEM `textSim/realDatabase.ts`, que agora e a base generica (os nomes reais vivem no mod). Nao os corra sem rever.
Os scripts add_english_teams e reorganize_ids leem teams.json e players.json da raiz: eles foram para Z:\FootManager3D\fonte (copie de volta para a raiz se for correr).
