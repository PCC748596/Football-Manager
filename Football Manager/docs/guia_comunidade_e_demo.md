# Guia: comunidade no Discord, divulgação e demo do jogo

Um passo a passo para ler com calma. Está dividido em etapas, na ordem em que fazem sentido. Não é preciso fazer tudo de uma vez.

---

## Etapa 1 — Criar a conta no Discord

O Discord é grátis.

1. Entre em **discord.com** e clique em **Login** → **Registrar-se**. Também dá para baixar o aplicativo no PC ou no celular.
2. Preencha email, nome de usuário, senha e data de nascimento.
3. Confirme o email: o Discord manda um link.
4. **Ative a autenticação de dois fatores (2FA):** Configurações → Minha conta → Ativar autenticação em duas etapas. Como você vai ser o dono do servidor, isso protege a comunidade contra quem tentar roubar a sua conta.

---

## Etapa 2 — Criar o servidor do jogo

1. Na barra da esquerda, clique no **+** (Adicionar um servidor).
2. Escolha **Criar o meu** → **Para um clube ou comunidade**.
3. Dê o nome do jogo e coloque uma imagem. Pode ser o logo ou, por enquanto, uma captura do jogo.
4. Em **Configurações do servidor → Ativar Comunidade**, siga o assistente. Ele pede:
   - um canal de regras;
   - um canal de avisos.

   A Comunidade dá ao servidor uma tela de boas-vindas, canais de anúncios que outros servidores podem seguir e ferramentas de moderação.

### Canais para começar

Comece com poucos canais. Um servidor com muitos canais vazios parece abandonado.

| Canal | Para quê |
|---|---|
| `#regras` | As regras da comunidade |
| `#anuncios` | Só você escreve: novidades, patch notes, datas |
| `#geral` | Conversa livre |
| `#feedback-e-sugestoes` | Ideias dos jogadores |
| `#bugs` | De preferência um canal de **fórum** (um tópico por bug, mais fácil de acompanhar) |
| `#screenshots` | Os jogadores mostram as carreiras deles |
| `#mods` | Mais tarde: como o jogo da Steam é genérico e os dados reais vêm pelo mod, um canal para isso ajuda |

### Cargos (funções)

Configurações do servidor → **Cargos**. Os primeiros que valem a pena:

- **Dev**: você.
- **Moderador**: quem ajuda a cuidar do servidor (só quando crescer).
- **Beta tester**: quem testa versões antes do lançamento.
- **Jogador**: todo mundo.

### Proteção contra spam

- Configurações do servidor → **Moderação** → ligue o **AutoMod** nativo, contra spam e links suspeitos.
- Se quiser cargos automáticos e mensagens de boas-vindas, um bot como o **Carl-bot** ou o **MEE6** resolve.

### O link de convite

1. Clique com o botão direito no nome do servidor → **Convidar pessoas**.
2. **Editar link de convite**: expiração **Nunca** e número de usos **Sem limite**.
3. Guarde esse link. É o que vai na Steam, nas redes sociais e no próprio jogo. Dá para colocar um botão "Discord" no menu inicial do jogo.

---

## Etapa 3 — Divulgar o jogo

### O mais importante: a página da Steam

- Abra a página do jogo como **"Em breve"** o quanto antes. Ela começa a juntar **wishlists**, e as wishlists são o que mais pesa no algoritmo da Steam no dia do lançamento.
- Coloque lá o link do Discord.
- Para publicar na Steam paga-se uma taxa de **100 dólares por jogo** (o Steam Direct). Parte dela volta depois de algumas vendas.
- A Steam tem uma página de **notícias do jogo**: dá para postar devlogs e atualizações por lá também.

### Onde está o seu público

- **Reddit:**
  - r/footballmanagergames: o público mais próximo do seu jogo;
  - r/futebol: o público brasileiro;
  - r/indiegaming, r/IndieDev;
  - r/gamedev, que tem a tradição do "Screenshot Saturday".

  Poste conteúdo interessante, não anúncios: um gif de um golo, um detalhe curioso do jogo.
- **Grupos e fóruns** de Football Manager e de jogos de gestão. Há comunidades grandes de FM no Brasil, em Portugal e no Reino Unido.
- **TikTok, YouTube Shorts e Instagram Reels:** clipes curtos do motor 3D funcionam muito bem. Golos bonitos, jogadas, bugs engraçados, "fiz isto com um time da Série D".
- **X (Twitter) e Bluesky:** com as hashtags #indiedev, #gamedev e #screenshotsaturday.

### Criadores de conteúdo

- Mande chaves do jogo a **youtubers e streamers pequenos e médios** de Football Manager e de jogos de gestão. Costumam dar mais retorno do que os grandes: respondem mais e o público deles é exatamente o seu.
- Sites como o **Keymailer** e o **Woovit** facilitam chegar até eles e controlar as chaves.

### Conteúdo com regularidade

- Um **devlog** curto a cada semana ou duas, no Discord e na Steam.
- Mostre o que está sendo feito. Quem gosta de futebol adora os detalhes: as temporadas de cada região, a FA Cup com os clubes amadores, os estaduais, o mercado de transferências.
- **Testes beta fechados só para quem está no Discord** são um ótimo motivo para as pessoas entrarem na comunidade.

---

## Etapa 4 — A demo do jogo

### Dá para fazer?

Sim. Hoje o jogo é React/TypeScript gerado com o **Vite** (`npm run build`). A demo pode ser:

- **Para jogar no navegador (web):** a pasta gerada pelo `vite build`, colocada num site.
- **Para PC:** o jogo empacotado como aplicativo com **Electron** ou **Tauri**. É o mesmo formato que a versão da Steam vai precisar, e esse empacotamento ainda não existe no projeto.

### Tem perigo de copiarem?

Num jogo feito em JavaScript, **o código vai sempre junto com o jogo**. Isso acontece com qualquer jogo web ou Electron, e não há forma de impedir 100%. O risco real é baixo e dá para reduzir bastante:

- **A build de produção já protege um pouco:** o Vite minifica o código (nomes curtos, tudo numa linha), e ele fica muito difícil de ler.
- **Ofuscação extra:** um plugin como o `javascript-obfuscator` deixa o código ainda mais difícil de entender.
- **A demo limitada é a defesa principal.** Ela não traz o jogo inteiro, por exemplo:
  - só 1 temporada, ou só até o fim do primeiro turno;
  - só 1 ou 2 países (por exemplo Brasil e Inglaterra);
  - sem salvar o jogo.
- **Tirar do pacote o código do que não está na demo,** em vez de só esconder. Assim, o que não está na demo nem chega a quem baixa.
- **No Electron**, com o código empacotado e minificado, quem tenta copiar casualmente já desiste.

Na prática, quase ninguém reescreve um motor destes a partir de uma demo. O que mais acontece com jogos indie é distribuírem o jogo completo pirateado depois do lançamento. Por isso a demo limitada é a melhor proteção.

### Onde colocar a demo

| Site | Como funciona | Para quê |
|---|---|---|
| **Steam** | A demo tem uma página própria, ligada à do jogo, e é grátis | A que mais traz wishlists, principalmente no **Steam Next Fest** (3 vezes por ano). Precisa da página do jogo e da taxa de 100 dólares |
| **itch.io** | Grátis e simples; aceita jogo web (joga-se no navegador) e para PC | Testes com a comunidade antes da Steam |
| **Game Jolt** | Parecido com o itch.io | Público mais jovem |
| **CrazyGames, Poki, Newgrounds** | Portais de jogos web com muito tráfego | O público quer jogos rápidos e casuais; para um jogo de gestão rende menos |

### Lembrete importante

A demo, como o jogo, **só leva dados genéricos**. Os nomes, escudos e jogadores reais ficam no mod, fora do pacote, por causa das licenças. Isso vale também para o Discord: o melhor é não distribuir você mesmo, nos canais oficiais, arquivos com dados reais.

---

## Resumo: a ordem sugerida

1. **Criar a conta no Discord** e ligar a 2FA.
2. **Criar o servidor**, ativar a Comunidade, montar os poucos canais e gerar o link de convite permanente.
3. **Botão "Discord" no menu inicial do jogo**, com o link de convite.
4. **Abrir a página da Steam** como "Em breve", para juntar wishlists, com o link do Discord.
5. **Postar com regularidade:** clipes curtos nas redes, devlogs no Discord e na Steam.
6. **Build de demo** com uma opção no código (por exemplo `VITE_DEMO=1`) que limita países e temporadas e tira o resto do pacote.
7. **Demo no itch.io** primeiro, para feedback da comunidade do Discord.
8. **Empacotar para PC (Electron)** e lançar a demo na **Steam**, de preferência num **Next Fest**.
9. **Chaves para criadores de conteúdo** perto do lançamento.

Os passos 3 e 6 são coisas que dá para fazer no código do jogo, quando você quiser.
