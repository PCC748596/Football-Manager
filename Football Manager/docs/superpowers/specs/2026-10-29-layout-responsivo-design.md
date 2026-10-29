# Layout responsivo (PC + tablet paisagem)

Alvo: PC (1920x1080, 1366x768) e tablet paisagem (1180x820, 1024x768). Abordagem: reflow, sem escalar a tela.

- Breakpoints: lg >= 1024, xl >= 1280, 2xl >= 1536.
- Base: touch-action manipulation, safe-area, alvos de toque >= 44px, sem depender de hover.
- Shell (Layout.tsx): sidebar completa >= 1280; recolhida em icones em 1024-1279.
- Telas: grids com minmax/flex-wrap no lugar de % e px fixos; tabelas com scroll horizontal; modais com max-h dvh.
- Partida 3D: revisar HUDs em 1024x768 e 1180x820.
- Verificacao: sem scroll horizontal da pagina nos 4 viewports.
- Ordem: base+Layout, App, Dashboard/Squad/Tactics, Mercado/Finances/League/Statistics, Match/HUD.
