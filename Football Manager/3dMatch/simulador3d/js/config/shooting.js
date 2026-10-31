/*
=============================================================================
CONFIG: REMATES E BOLAS PARADAS
=============================================================================
Remates, livres directos, penÃ¡ltis, cantos, cruzamentos, cabeceamentos e xG.
=============================================================================
*/

const ShootingModel = {
    // Segundos que um jogador espera, depois de tentar um remate a baliza, antes de poder tentar outro (Player.chuteEspera).
    esperaEntreRemates: 3.0,
    /*
    Alcance a skill 0. 8.0 -> 10.5: medido em lotes de 30 jogos, as
    finalizacoes ficavam em 14.6 por jogo contra as 26.11 de um jogo a serio
    (56%) â€” remata-se pouco, e nao e por falta de sitio: e por a entrada da
    area cair fora do alcance de quem tem ataque medio (8 + 0.5x10 = 13 m no
    eixo, e a area tem 16.5 de fundo).

    AVISO, que fica escrito: o xG POR REMATE ja esta em 57% do alvo (0.062
    contra 0.109), ou seja rematam-se bolas de pior qualidade do que num jogo
    a serio. Alargar o alcance sobe a contagem e desce a qualidade media. A
    correccao de fundo e criar mais ataque (os ataques totais estao em 36% do
    alvo), nao rematar de mais longe.
    */
    baseRange: 10.5,
    // metros adicionais a skill 100
    skillRange: 10.0,
    maxOffsetX: 24.0,    // alÃ©m disto o Ã¢ngulo Ã© mau demais para rematar

    /*
    E O ANGULO CONTA, nao so o |x| e a distancia.

    O `emZonaDeFinalizacao` era um rectangulo â€” distancia dentro do
    `shootingRange` e |x| abaixo do `maxOffsetX` â€” e um rectangulo nao sabe
    nada de trave. Medido em 2400 s: 44% dos remates saiam com menos de 15
    graus de baliza aberta, e os piores eram um CF a |x| 13.7 m e 4.3 m da
    linha de fundo (9.3 graus) e outro a |x| 21.2 m â€” fora da largura da area
    â€” e 8.1 m da linha (6.7 graus). Dali cruza-se.

    Para referencia: da marca do penalti a baliza abre ~37 graus, e da entrada
    da area pelo eixo ~22.

    `distanciaSemAngulo` e a excepcao que tem de existir: encostado a baliza,
    o desvio ao primeiro poste e remate, por mais fechado que seja o angulo.
    */
    anguloMinimo: 14 * Math.PI / 180,
    distanciaSemAngulo: 6.0,   // metros a baliza: dai para dentro o angulo nao manda
    /*
    FracÃ§Ã£o do alcance que sobra no pior Ã¢ngulo. 0.66 -> 0.75: com 0.66, a
    |x| 15 m sobrava pouco mais de metade do alcance, e o remate de fora da
    zona central quase nÃ£o existia. O `anguloMinimo` acima continua a cortar
    o que Ã© mesmo mau Ã¢ngulo â€” este nÃºmero Ã© sÃ³ o quanto o alcance encolhe
    dentro do que jÃ¡ passou nesse crivo.
    */
    angleFloor: 0.75,

    // Um defesa que suba nÃ£o remata como um avanÃ§ado: sÃ³ de muito perto.
    // Antes o central caÃ­a no ramo genÃ©rico e rematava em 10.4% das vezes
    // em que aparecia no Ãºltimo terÃ§o.
    defenderFactor: 0.55,

    /*
    TECTO DO ALCANCE, em metros Ã  baliza.

    O `shootingRange` sai de `baseRange + skill` (10.5 + 10 no mÃ¡ximo) e depois
    Ã© MULTIPLICADO pelo peso `remate` do playing style â€” e Ã© por aÃ­ que aparecem
    alcances de 25 a 27 m. Medido: os remates de mais de 30 m vinham de
    jogadores com 25.3 m de alcance mÃ©dio.

    Um remate de 30 m Ã© um lance de excepÃ§Ã£o, nÃ£o uma decisÃ£o de rotina. O tecto
    corta-os sem mexer no que o estilo faz dentro da faixa normal.
    */
    alcanceMax: 25.0,   // o teto dos remates de fora da area continua nos 25 m (pedido); o bonus de baixo so alarga quem ficava aquem dele

    /*
    BONUS DO REMATE DE FORA DA AREA (pedido: *"tem que ter mais chutes de longe: aumenta defesas do goleiro e reduz gols; estao chutando muito de perto"*). Medido em 3 jogos de 900 s: 62%
    dos remates eram de dentro da area e dos de 22 a 28 m havia ZERO. Multiplica o alcance de quem esta FORA da grande area (a regra `dentroDaArea` ja trata de quem esta dentro).
    O `alcanceMax` continua a ser o ultimo a falar.
    */
    bonusAlcanceForaDaArea: 1.45,

    /*
    COM O CAMINHO ABERTO E A BALIZA LONGE, PROGRIDE-SE.

    Relato: "os jogadores com campo Ã  frente estÃ£o chutando de mais de 25
    metros de distÃ¢ncia ao invÃ©s de progredir com a bola". Medido em 900 s:
    54% dos remates saÃ­am de mais de 25 m, e 32% de mais de 30 m â€” num jogo a
    sÃ©rio os de mais de 25 m andam pelos 10-15%.

    O `shootingRange` sozinho nÃ£o o explicava (base 10.5 + 10 pela skill), mas
    o peso `remate` do playing style multiplica-o: os que remataram de 30 m+
    tinham alcance mÃ©dio de 25.3 m.

    A regra Ã© a mesma ideia do `frenteAFrente`, que jÃ¡ existia para o duelo
    com o guarda-redes: com o corredor limpo, cada metro conduzido melhora o
    remate. `distMin` Ã© a distÃ¢ncia Ã  baliza a partir da qual isto vale;
    abaixo dela remata-se com as regras de sempre. E cai assim que alguÃ©m
    entra no caminho â€” aÃ­ o remate volta a ser a melhor opÃ§Ã£o que resta.
    */
    progredirComEspaco: {
        distMin: 25.0,
        // O mesmo cone do `livreAFrente10m20g` da conduÃ§Ã£o: 20 m Ã  frente,
        // 45 graus de abertura.
        alcanceCone: 20.0,
        anguloCone: 45.0
    },

    /*
    DENTRO DA GRANDE ÃREA REMATA-SE, PONTO.

    O alcance acima Ã© uma distÃ¢ncia ao CENTRO DA BALIZA, e nÃ£o cobria a Ã¡rea:
    com a skill de ataque a 50 dÃ¡ 13.0 m no eixo, e a Ã¡rea tem 16.5 m de
    profundidade. Pior fora do eixo, onde a `centralidade` ainda o encolhe â€” a
    15 m de X sobram 10.2 m, e daÃ­ a baliza estÃ¡ a 15.5 m.

    Medido numa grelha de 20 posiÃ§Ãµes dentro da Ã¡rea: **rematava-se em 6**
    (30%). Da entrada da Ã¡rea nÃ£o se rematava nunca, e da meia-lua tambÃ©m nÃ£o.
    Ã‰ a explicaÃ§Ã£o directa dos 0-6 remates por jogo que as simulaÃ§Ãµes davam.

    Dentro da Ã¡rea o alcance deixa de decidir: quem lÃ¡ estÃ¡ e tem a bola
    remata. O `maxOffsetX` (24 m) nÃ£o Ã© problema â€” a Ã¡rea tem 20.16 de
    meia-largura, portanto estÃ¡ toda dentro dele.

    Isto NÃƒO mexe no remate de fora da Ã¡rea, que continua a ser o alcance por
    skill de sempre.
    */
    dentroDaArea: {
        profundidade: typeof Area !== 'undefined' ? Area.profundidade : 16.5,   // da linha de fundo para dentro
        meiaLargura: typeof Area !== 'undefined' ? Area.meiaLargura : 20.16,
        /*
        Dentro da Ã¡rea tambÃ©m nÃ£o se aplica o corte da camada CHUTE do
        SpatialGrid (`chuteVal <= 0` mandava nÃ£o rematar). Uma cÃ©lula nÃ£o
        autorada dentro da prÃ³pria Ã¡rea Ã© um buraco na grelha, nÃ£o uma decisÃ£o
        tÃ¡ctica â€” e era mais um sÃ­tio onde o remate se perdia em silÃªncio.
        */
        ignoraGrid: true
    },

    /*
    =====================================================================
    FRENTE A FRENTE COM O GUARDA-REDES â€” nÃ£o se remata, chega-se mais perto
    =====================================================================
    Relato: "os jogadores de ataque entram na Ã¡rea e jÃ¡ chutam no gol, de
    longe; podem chegar mais perto para chutar quando estiverem sozinhos
    frente-a-frente com o goleiro e tocar no canto".

    A regra `dentroDaArea` acima manda rematar assim que se pisa a Ã¡rea, e ela
    nÃ£o olha para mais nada â€” Ã© exactamente o que produz o remate de 16 m com
    o caminho todo livre Ã  frente. Num frente-a-frente o certo Ã© conduzir atÃ©
    ao guarda-redes e tocar ao canto: a baliza cresce a cada metro e o Ã¢ngulo
    do guarda-redes fecha-se ao mesmo tempo.

    O que conta Ã© o CORREDOR atÃ© Ã  baliza, e nÃ£o um cÃ­rculo Ã  volta dele â€” a
    mesma leitura do `CrossModel.corredor`: um marcador atrÃ¡s, ou por fora,
    nÃ£o o impede de continuar. SÃ³ se espera enquanto o corredor estiver limpo;
    assim que alguÃ©m entra nele, a regra cai e remata-se com as regras de
    sempre.

    `corredorMeiaLargura`  meia-largura do corredor atÃ© Ã  baliza, em metros.
    `recuoAtras`           quanto atrÃ¡s dele um adversÃ¡rio ainda conta (vem a
                           correr e apanha-o).
    `distanciaIdeal`       a partir daqui remata: Ã© o ponto do frente-a-frente.
                           11 m Ã© pouco mais do que a marca de grande
                           penalidade (11.0), que Ã© a distÃ¢ncia a que este
                           lance se resolve.
    `distanciaMax`         tecto: mais longe do que isto a jogada ainda nÃ£o Ã©
                           um frente-a-frente, Ã© uma corrida â€” e vale a leitura
                           normal, senÃ£o um avanÃ§ado a 40 m com o campo aberto
                           deixava de rematar de vez.
    */
    /*
    =========================================================================
    O MÃNIMO DE xG PARA VALER A PENA REMATAR
    =========================================================================
    O lote diz o mesmo desde o primeiro dia: remata-se 50% mais do que no
    futebol real (39.1 por 90 contra 26.1). Enquanto cada remate valia metade
    do que devia isso nÃ£o dava golos a mais; agora que o `xG por remate` estÃ¡
    em 0.100 contra 0.109 do real, cada remate a mais Ã© golo a mais â€” e os
    golos foram de 2.59 a 3.82 por 90 ao longo da sessÃ£o.

    A regra `dentroDaArea` Ã© o buraco: "dentro da Ã¡rea remata-se, e mais nada
    tem voto". Dentro da Ã¡rea cabe o bico da grande Ã¡rea a 16 m e 20 de lado,
    de onde nenhum avanÃ§ado remata.

    Medido com `tools/scratch/remates_xg.js`, a distribuiÃ§Ã£o do xG dos remates
    de hoje:

        p10 0.044   p25 0.049   mediana 0.059   p75 0.163

        corte      remates cortados      xG mÃ©dio dos que ficam
        0.03              4%                    0.141
        0.04              9%                    0.146
        0.055            ~33%                   ~0.18
        0.06             54%                    0.241

    0.055 corta a terÃ§a parte, que Ã© exactamente o excesso sobre o alvo. NÃ£o
    Ã© um nÃºmero redondo: Ã© o percentil 33 da distribuiÃ§Ã£o medida.

    EXCEPÃ‡ÃƒO, e Ã© a que impede isto de desfazer o trabalho de ontem: o xG aqui
    Ã© POSICIONAL â€” sai de `xgDoRemate(x, z, ...)` e nÃ£o sabe onde estÃ¡ o
    guarda-redes. Um remate de 20 m com ele dez metros fora da baliza Ã© uma
    grande oportunidade e pontua baixo. Por isso o corte nÃ£o se aplica quando
    o guarda-redes saiu (`gkAdiantadoRemata`/`gkVelSaida`) nem quando estÃ¡ em
    cima do avanÃ§ado (`gkAoAlcance`): nesses casos quem decide Ã© a regra do
    frente-a-frente, que olha para ele.
    =========================================================================
    */
    xgMinimo: 0.03,   // era 0.055: cortava os remates de longe, que sao de xG baixo

    frenteAFrente: {
        corredorMeiaLargura: 4.0,
        recuoAtras: 2.0,
        /*
        ONDE SE REMATA NO FRENTE A FRENTE â€” e Ã© ANTES DA MARCA DO PENÃLTI.

        Estava em 11.0, que Ã© exatamente a distÃ¢ncia da marca Ã  linha de golo
        (ver o alvo `marca_penalti` na lista de alvos, mesma constante). Como
        o `emZonaDeRemate` sÃ³ deixa rematar com `ff.dist <= distanciaIdeal`, o
        avanÃ§ado conduzia a bola atÃ© Ã  prÃ³pria marca antes de bater â€” com o
        guarda-redes a fechar o Ã¢ngulo todo esse caminho. Pedido: *"no cara a
        cara faz o jogador chutar antes da marca do penÃ¡lti"*.

        14 m: trÃªs metros antes da marca e ainda bem dentro da grande Ã¡rea
        (16.5 m de profundidade), que o teste `remate_frente_a_frente` exige.
        */
        distanciaIdeal: 14.0,
        distanciaMax: 30.0,

        /*
        COM O GUARDA-REDES A ESTA DISTÃ‚NCIA, REMATA-SE JÃ.

        Relato: *"o jogador do cara a cara ou chuta antes de entrar na Ã¡rea ou
        nÃ£o chuta; nem o guarda-redes pega a bola; fica um a tentar correr de
        frente para o outro"*.

        A regra de cima manda aproximar atÃ© Ã  `distanciaIdeal` (11 m) e sÃ³
        depois rematar. SÃ³ que ela Ã© cega ao guarda-redes: o corredor conta os
        adversarios de campo, e quem chama jÃ¡ filtrou o `gk`. Seguido com
        `tools/scratch/cara_a_cara_timeline.js` (Ã¢ngulo 20): o avanÃ§ado entra
        na Ã¡rea aos 1.5 s, continua a conduzir porque ainda estÃ¡ a 13 m, e aos
        2.9 s o guarda-redes sai e agarra-lhe a bola aos pÃ©s. Nunca houve
        remate â€” e, sem remate, tambÃ©m nunca houve defesa para ver.

        7 m Ã© o espaÃ§o que o guarda-redes cobre no tempo de armar e bater: com
        ele mais perto do que isto, esperar mais um metro Ã© dar-lhe a bola.
        */
        gkAoAlcance: 7.0,

        /*
        E COM ELE FORA DA BALIZA, REMATA-SE JÃ â€” sem esperar que chegue perto.

        Relato: *"com o guarda-redes ofensivo o atacante estÃ¡ a esperar demais
        para finalizar; o ofensivo sai do golo mais cedo, o atacante tem de
        perceber isso e finalizar mais rÃ¡pido"*.

        Medido com `tools/scratch/cara_a_cara_gk_ofensivo.js`, 12 lances com o
        traÃ§o ofensivo forÃ§ado: o guarda-redes passava os 5 m de avanÃ§o ao
        segundo 1.9 e o remate sÃ³ saÃ­a 0.71 s depois, com ele jÃ¡ a 1.2-1.7 m do
        avanÃ§ado e 10 m fora da linha. Ou seja: o avanÃ§ado esperava por ele.

        O `gkAoAlcance` acima nÃ£o chega porque mede a distÃ¢ncia ENTRE OS DOIS, e
        entre o gatilho e a bola sair passam a cadÃªncia da decisÃ£o e os 0.32 s
        de armaÃ§Ã£o â€” tempo em que um guarda-redes lanÃ§ado faz quatro metros.
        Este mede o que interessa de verdade: quanto ele JÃ saiu da baliza. A
        partir de 4 m fora da linha, o que estÃ¡ atrÃ¡s dele Ã© baliza aberta, e
        esperar mais um metro sÃ³ lhe dÃ¡ tempo de fechar o Ã¢ngulo.

        Ã‰ tambÃ©m a condiÃ§Ã£o de que o chapÃ©u vive (ver `chapeuGkAdiantado` no
        ShotModel): rematar mais cedo pÃµe o chapÃ©u em cima da mesa.

        7 m, e nÃ£o 4: o `GoalkeeperStyle.defensive` tem `depthMax` 6.0, ou
        seja um guarda-redes NORMAL passa a vida atÃ© aos 6 m fora da linha. Com
        o corte a 4 m, isto disparava contra toda a gente e virava "rematar de
        longe sempre" â€” e o lote jÃ¡ diz que se remata 44% a mais do que devia.
        A 7 m sÃ³ apanha quem saiu mesmo: o ofensivo, que vai atÃ© aos 11 de
        profundidade e 20 de varrida.
        */
        gkAdiantadoRemata: 7.0,

        /*
        E O OUTRO SINAL: ELE VEM A SAIR.

        SÃ³ a profundidade nÃ£o chega, e mediu-se porquÃª. Com o corte a 7 m, o
        guarda-redes ofensivo do lance sÃ³ o cruza quando jÃ¡ estÃ¡ a dois metros
        do avanÃ§ado â€” a espera voltava aos 0.68 s. Com o corte a 4 m disparava
        contra toda a gente, porque um guarda-redes NORMAL vive atÃ© aos 6 m
        fora da linha.

        O que distingue os dois casos nÃ£o Ã© onde ele estÃ¡: Ã© se vem a correr
        para fora. Um guarda-redes lanÃ§ado a 4 m/s deixou a baliza vazia atrÃ¡s
        dele mesmo estando ainda perto dela; um que estÃ¡ quieto a 5 m nÃ£o.

        Medido com `tools/scratch/cara_a_cara_gk_ofensivo.js`: com os dois
        sinais, a espera cai de 0.68 s para ~0.30 s â€” que Ã© o tempo da prÃ³pria
        armaÃ§Ã£o, ou seja o avanÃ§ado deixa de esperar.
        */
        gkAdiantadoMin: 3.0,
        gkVelSaida: 4.0
    },

    /*
    A BOLA AO ALCANCE DO PÃ‰, para se poder rematar sem a ter colada.

    Relato, na sequÃªncia do anterior: *"ou chuta antes de entrar na Ã¡rea ou nÃ£o
    chuta"*. Seguido com `tools/scratch/cara_a_cara_timeline.js`, a causa nÃ£o
    era a decisÃ£o de rematar: era nÃ£o se chegar a ela. Em conduÃ§Ã£o a bola vai
    0.6 a 0.8 m Ã  frente do pÃ© e o `hasBall` Ã© falso na maioria dos frames; o
    ramo `RecuperarControlo` ("a bola fugiu, vai buscÃ¡-la") estÃ¡ acima do
    `Rematar` e ganhava quase sempre. O avanÃ§ado atravessava a Ã¡rea inteira a
    correr atrÃ¡s da prÃ³pria bola, e quem chegava primeiro era o guarda-redes.

    Com a bola mais perto do que isto E em zona de remate, deixa de se ir
    "buscar" a bola: remata-se. 1.3 m Ã© menos do que o `bolaAoPe` do drible ao
    guarda-redes (1.8) de propÃ³sito â€” empurrar a bola para o lado aceita-a mais
    longe do que bater nela.

    O gesto continua a exigir a bola no pÃ© no INSTANTE do contacto (ver
    `initiateShoot`): entre a decisÃ£o e o pÃ© passam 0.318 s, que a esta
    distÃ¢ncia dÃ¡ para ele alcanÃ§ar a bola. Quando nÃ£o dÃ¡, sai uma furada e
    estÃ¡ contada em `remates.furados`.
    */
    bolaAoPeRemate: 1.3
};

/*
Modelo de passe e conduÃ§Ã£o.

`carryChance*` Ã© a probabilidade de conduzir em vez de passar quando hÃ¡ um
alvo disponÃ­vel â€” sob pressÃ£o desce 0.15.

O lanÃ§amento (passe para o espaÃ§o nas costas da linha adversÃ¡ria) nÃ£o existia:
todos os passes miravam a posiÃ§Ã£o actual de um colega. Estes valores dizem onde
se pÃµe a bola em relaÃ§Ã£o Ã  linha que o nÃ­vel 1 do adversÃ¡rio jÃ¡ calcula.
*/
/*
=============================================================================
QUALIDADE DA LINHA DE PASSE
=============================================================================
Antes isto era um FILTRO binÃ¡rio com um corredor de 1 a 2.6 m: um adversÃ¡rio
mais perto do que isso da recta eliminava o candidato, e a recompensa por ter
a linha limpa valia no mÃ¡ximo +50 pontos â€” irrelevante ao lado dos +200/+500
que a liberdade do RECEPTOR vale. Duas consequÃªncias medidas no jogo:

  - o passe curto para dentro de trÃ¡fego passava, porque bastavam 2 m de folga;
  - o passe longo para um colega livre era ELIMINADO antes de ser pontuado,
    porque a recta atravessa o bloco todo e hÃ¡ sempre alguÃ©m a 2 m dela.

Agora:

  `bloqueioDuro`  o Ãºnico corte que resta â€” alguÃ©m literalmente em cima da
                  recta. Ã‰ geometria, nÃ£o julgamento: a bola nÃ£o passa ali.

  `corredor`      a largura em que um adversÃ¡rio ainda ameaÃ§a, e CRESCE com a
                  distÃ¢ncia do passe: numa bola de 8 m um defesa a 3 m nÃ£o
                  chega lÃ¡; numa de 35 m chega com tempo de sobra.

  `pesoLinha`     a qualidade da linha (0 = colado, 1 = limpa) passa a valer
                  na MESMA escala da liberdade do receptor, e nÃ£o 1/10 dela.

  `pesoCorpo`     desconto por CADA adversÃ¡rio dentro do corredor. Uma recta
                  que passa a 2 m de cinco pessoas nÃ£o Ã© a mesma coisa que
                  passar a 2 m de uma â€” e antes pontuavam igual, porque sÃ³ se
                  olhava para o mais prÃ³ximo.
=============================================================================
*/

/*
O REMATE QUE ERRA, ERRA PERTO DA BALIZA (pedido): o ponto visado depois do erro nunca fica a mais de `foraMax` m do poste (para o lado) nem de `cimaMax` m do travessao (por cima).
*/
const ErroPertoDaBaliza = { activo: true, foraMax: 3.0, cimaMax: 2.5 };
if (typeof window !== 'undefined') window.ErroPertoDaBaliza = ErroPertoDaBaliza;

const ShotModel = {
    /*
    Subiu de 28/8 para 32/9 depois de se ver em campo: continuava a ler como
    fraco. Passa a 23.0 m/s a TEC 0, 32.0 a TEC 50 e 41.0 a TEC 100 â€” a ponta
    de cima Ã© a de um remate de elite (~148 km/h), que Ã© o que um TEC 100 deve
    bater.
    */
    potenciaBase: 32.0,     // m/s a TEC 50
    potenciaPorSkill: 9.0,  // Â± isto entre TEC 0 e TEC 100
    potenciaMin: 16.0,      // nem o pior rematador bate mais fraco do que isto

    /*
    =========================================================================
    O TECTO â€” o remate que nenhum guarda-redes defende
    =========================================================================
    Pedido: baixar a media de golos de 4.34 para 2.6.

    MEDIDO, 101 remates em 3 jogos:

        velocidade de saida, mediana    26.0 m/s (94 km/h)   <- real ~25, certo
        p90                             39.0 m/s (141 km/h)
        acima de 35 m/s                 22% dos remates

    A MEDIANA ESTA CERTA. O que esta errado e a frequencia do topo: no futebol
    real 35 m/s e um remate de destaque, raro; aqui e um em cada cinco.

    E e esse quinto que faz os golos. Tracado frame a frame um golo sofrido:

        f25  o remate sai a 39.4 m/s, a 19 m da baliza -> chega em 0.46 s
        f38  o guarda-redes reage (0.22 s de reaccao)
             precisa de cobrir 3.12 m; o alcance que o tempo lhe da e 2.08 m
        f38-59  a porta aberta, ele parado, o alcance a cair para 0.92 m

    Ele esta bem colocado (a mao passa a 0.77 m de mediana nos golos sofridos)
    e reage a tempo. Nao ha gesto humano que cubra tres metros em sete
    centesimos. Medido: ZERO dos golos sofridos tiveram toque dele.

    PORQUE E UM TECTO E NAO UMA POTENCIA MAIS BAIXA. A `potenciaBase` e o
    `potenciaPorSkill` foram subidos de proposito (ver a nota deles: "continuava
    a ler como fraco", e o topo de 41 m/s a TEC 100 e explicitamente o remate
    de elite que se quer). Baixa-los mexia na mediana, que esta boa, e desfazia
    essa decisao. O tecto corta so a cauda: um TEC 100 continua a bater mais
    forte do que um TEC 50, ate ao limite do que um guarda-redes ainda tem
    hipotese de ler.

    A zero ou negativo, desliga.
    =========================================================================
    */
    potenciaMax: 30.0,   // 36 -> 30 (15 de Outubro de 2026)

    /*
    =========================================================================
    MENOS 15% DE FORCA EM TODOS OS REMATES
    =========================================================================
    Pedido: *"reduz em 15% a forca dos chutes"*.

    E um FACTOR e nao numeros novos na `potenciaBase`/`potenciaPorSkill` por
    duas razoes:

      . esses dois trazem historia escrita (foram subidos de 28/8 para 32/9
        porque "continuava a ler como fraco", e o topo de 41 m/s a TEC 100 e
        declaradamente o remate de elite). Mexer-lhes apagava essa nota;
      . assim o corte e exactamente -15% sobre o comportamento de HOJE, que ja
        inclui o tecto â€” e reverte-se pondo 1.0.

    APLICA-SE DEPOIS DO TECTO. A ordem importa: cortar primeiro e escalar
    depois da -15% a toda a gente, incluindo quem batia no tecto. Escalar
    primeiro deixaria os remates fortes a bater no mesmo tecto e o corte so
    apanharia os fracos.

    O QUE ISTO COBRE: os remates de jogo corrido (os dois sitios que compoem a
    potencia em fsm.js). NAO cobre o livre directo (tem o seu proprio
    `potenciaBase` de 28.5 no FreeKickModel), o penalti, o cabeceio nem os
    chutos do guarda-redes â€” se algum desses tambem tiver de baixar, e outra
    alteracao.

    EFEITO NOS GOLOS: nao previsto de proposito. O banco de ensaio deste
    repositorio nao reproduz a finalizacao do lote de 50 jogos â€” mediu 53
    remates por jogo contra os 30 reais, e na varredura do tecto deu ate o
    SINAL trocado (baixar o tecto subia os golos no banco e baixou-os no lote).
    Quem julga este numero e o lote.
    =========================================================================
    */
    /*
    +15% SOBRE O DE HOJE (pedido: *"estou achando os chutes um pouco fracos, aumenta em 15% a forÃ§a"*):
    0.85 x 1.15 = 0.9775. Ã‰ o fator da nota acima, aplicado depois do tecto de 36 m/s â€” por isso o remate
    mais forte sai agora a 35.2 m/s (era 30.6) e a mediana (26 m/s antes do fator) passa de ~22.1 para ~25.4.
    */
    factorForca: 0.85,   // 0.90 -> 0.80 -> 0.85 (15 de Outubro de 2026): com 0.80 os golos foram a 2.11 (alvo 2.52); 0.85 fica a meio

    /*
    ElevaÃ§Ã£o de recurso, para quando nem no Ã¢ngulo Ã³ptimo a bola chega ao alvo
    (remate de muito longe). Era `Math.PI / 5` (36Â°) escrito Ã  mÃ£o â€” um balÃ£o.
    A 20Â° a bola vai mais longe e mais tensa, e ainda tem hipÃ³tese de incomodar.
    */
    elevacaoRecurso: 20 * Math.PI / 180,

    /*
    =====================================================================
    O REMATE DECIDE A BOLA, NÃƒO O DESFECHO
    =====================================================================
    Antes sorteava-se o RESULTADO â€” GOL, TRAVE_CAMPO, TRAVE_FORA,
    TRAVESSAO_*, GOLEIRO_DEFENDE_* â€” por pesos de `attackRatio`, e sÃ³ depois
    se escolhia o ponto que o produzia. A bola era a encenaÃ§Ã£o de um sorteio
    jÃ¡ feito, e via-se: `alvoY = random() > 0.5 ? 2.0 : 0.4` (moeda ao ar
    entre alto e baixo), `sinal = random()` para o canto sem olhar para onde
    estava o guarda-redes, e potÃªncia sempre cheia â€” nÃ£o havia remate
    colocado nem rasteiro, havia um chutÃ£o com destino combinado.

    Pior: o desfecho sorteado desligava o guarda-redes. `forcedGKDelay = 1.0`
    nos remates marcados como golo (ele reagia um segundo tarde, de
    propÃ³sito) e `0` nos marcados como defesa. Toda a fÃ³rmula do GkCatchModel
    sÃ³ era consultada depois de o sorteio jÃ¡ ter decidido que ia haver defesa.

    Agora escolhe-se TIPO e MIRA, aplica-se o erro, e a bola voa. Quem
    resolve Ã© a fÃ­sica â€” a colisÃ£o com postes e travessÃ£o jÃ¡ existe
    (`colidirComBaliza` em match.js) â€” e o guarda-redes, com o seu tempo de
    reacÃ§Ã£o normal. Trave e "por cima" deixam de ser casos de uma tabela e
    passam a ser consequÃªncia de a mira ter falhado por pouco.
    */

    /*
    TIPOS DE REMATE. A potÃªncia Ã© um multiplicador da `potenciaBase`: um
    remate colocado sai a ~2/3 da forÃ§a â€” Ã© essa a troca, precisÃ£o contra
    velocidade, e era ela que nÃ£o existia.
    */
    tipos: {
        forca: { potencia: 1.00, sigma: 1.35 },
        colocado: { potencia: 0.68, sigma: 0.80 },
        rasteiro: { potencia: 0.82, sigma: 0.95 },
        chapeu: { potencia: 0.45, sigma: 1.20 }
    },

    /*
    ESCOLHA DO TIPO, por situaÃ§Ã£o. As chances sÃ£o testadas por esta ordem
    (chapÃ©u, rasteiro, colocado) e o que sobra Ã© forÃ§a.
    */
    escolha: {
        // ChapÃ©u: sÃ³ com o guarda-redes fora da linha e a uma distÃ¢ncia que
        // dÃª para o passar por cima.
        chapeuGkAdiantado: 4.0,   // metros Ã  frente da linha
        chapeuDistMin: 8.0,
        chapeuDistMax: 25.0,
        chanceChapeu: 0.35,

        // Rasteiro ao canto: a bola mais difÃ­cil de agarrar que hÃ¡. Sobe de
        // perto, onde levantar a bola Ã© desperdiÃ§ar a baliza.
        chanceRasteiraPerto: 0.32,   // atÃ© `distPerto`
        chanceRasteiraLonge: 0.15,
        distPerto: 12.0,

        // Colocado: precisa de tempo e de pÃ©. Cai sob pressÃ£o e com a
        // distÃ¢ncia â€” de 25 m ninguÃ©m coloca, bate.
        chanceColocado: 0.40,
        colocadoDistMax: 20.0,
        colocadoPressao: 3.0,     // adversÃ¡rio a menos disto tira a colocaÃ§Ã£o

        /*
        FRENTE A FRENTE: toca-se ao canto, nÃ£o se bate (pedido). Chegado a
        `ShootingModel.frenteAFrente.distanciaIdeal` com o corredor livre, o
        remate de forÃ§a Ã© a pior escolha que hÃ¡ â€” o guarda-redes estÃ¡ perto e
        tapa o corpo. Esta fatia Ã© a do RASTEIRO ao canto; o resto Ã© COLOCADO.
        O chapÃ©u continua a ganhar aos dois quando o guarda-redes sai.
        */
        chanceRasteiraFrenteAFrente: 0.60
    },

    /*
    MIRA. Aponta-se a um canto, com `margemPoste` de folga para dentro â€” o
    ponto MIRADO Ã© sempre golo, o que decide Ã© o erro por cima dele.

    O canto Ã© o mais LONGE do guarda-redes. Era `random()`, e por isso nÃ£o
    havia a leitura mais bÃ¡sica do remate: bater onde ele nÃ£o estÃ¡.
    */
    mira: {
        margemPoste: ((typeof BallPhysics !== 'undefined') ? BallPhysics.raio : 0.11) + 0.02,   // raio da bola + 2 cm (pedido: 0.45 mandava remates demais para o meio da baliza); era 0.85 -> 0.45

        /*
        NÃƒO SE MIRA SEMPRE O CANTO â€” e mirava-se.

        Medido em 3000 remates: o ponto visado era `maxC` em 100% deles, ou
        seja SEMPRE o mesmo ponto, a 0.85 m do poste. Duas consequÃªncias, e
        as duas apareciam nos lotes:

          o que fica no alvo Ã© bola de canto, e o guarda-redes nÃ£o lÃ¡ chega:
          52% dos remates enquadrados acabavam em golo (real ~32%);

          o que se desvia um pouco sai pela linha: sÃ³ 15-22% dos remates
          ficavam enquadrados (real ~33%).

        `fraccaoCanto` Ã© a AMBIÃ‡ÃƒO da pontaria, em fracÃ§Ã£o da meia-baliza Ãºtil:
        1.0 Ã© o canto, 0 Ã© o meio da baliza. Sorteia-se por remate dentro da
        faixa do tipo â€” quem coloca procura o canto, quem bate com forÃ§a mira
        mais para dentro (Ã© isso que a potÃªncia lhe custa), e um chapÃ©u passa
        por cima do guarda-redes, nÃ£o pelo lado.

        Isto NÃƒO Ã© o erro de execuÃ§Ã£o: esse continua a ser o `ShotModel.erro`,
        que se soma por cima do ponto visado. Isto Ã© onde o jogador APONTA.
        */
        /*
        MENOS 10% DE AMBIÃ‡ÃƒO, a pedido: "reduz em mais 10% a precisÃ£o dos
        chutes, mas esses chutes tÃªm que ser defesas do goleiro para fora".

        A segunda metade do pedido Ã© que escolhe o instrumento. Tirar outros
        10% ao `escalaGlobal` (o erro de execuÃ§Ã£o) manda mais bolas para FORA
        da moldura â€” foi o que a subida anterior fez, com a percentagem no
        alvo a cair de 22.6 para 21.7 quando o real sÃ£o ~33%. Bolas nas
        bancadas nÃ£o sÃ£o defesas do guarda-redes.

        A imprecisÃ£o que produz defesas Ã© a da COLOCAÃ‡ÃƒO: o remate continua
        dentro da baliza mas mais perto do corpo dele, e aÃ­ Ã© defendido. Por
        isso os 10% saem daqui, de quanto o jogador se atreve a procurar o
        canto, e nÃ£o do erro de execuÃ§Ã£o.

        Cada faixa desceu 10%:
            forca     0.30-0.90  ->  0.27-0.81
            colocado  0.65-1.00  ->  0.59-0.90
            rasteiro  0.55-1.00  ->  0.50-0.90
            chapeu    0.10-0.45  ->  0.09-0.41

        E para a defesa sair PARA FORA, e nÃ£o em rebote aos pÃ©s do avanÃ§ado,
        o `GoalkeeperDive.espalmarForaMargem` subiu na mesma alteraÃ§Ã£o â€” ver
        a nota lÃ¡.
        */
        /*
        MENOS 15%, E PELA MESMA RAZAO DE ANTES â€” que nao chegou.

        O corte anterior deixou a percentagem no alvo em 21.7 (real ~33). O
        lote de 40 jogos do painel, depois de tudo o resto, da:

            % no alvo                   23.2    (real ~33)
            golos                       3.67    145% do alvo
            xG por remate               0.130   120%
            conversao do ENQUADRADO      44%    (real ~30%)

        Esta combinacao so tem uma leitura: rematam MAL e marcam MUITO quando
        acertam. Isso e a assinatura de uma pontaria que procura cantos
        extremos â€” o que se desvia sai pela linha (daÃ­ os 23.2%) e o que fica
        dentro vai junto ao poste, onde nao ha defesa.

        E NAO HA MESMO. Medido nos golos sofridos: o guarda-redes reage no
        PRIMEIRO frame em 5 de 5, e o que lhe pedem e cobrir 2.93 m de
        mediana em 0.34 s de voo â€” 8.6 m/s de deslocamento lateral a partir
        de parado. A bola cruza a 2.93 m do centro, numa baliza com 3.66 de
        meia-largura. Nenhum guarda-redes defende isto, e por isso nao e no
        guarda-redes que se mexe.

        Baixar a ambicao corrige as DUAS pontas ao mesmo tempo, que e o que
        faz deste o instrumento certo: mais remates ficam dentro da moldura
        (a % no alvo sobe na direccao dos 33) e os que ficam sao defensaveis
        (a conversao desce na direccao dos 30%).

        O `chapeu` NAO desce: esse passa por CIMA do guarda-redes, nao pelo
        lado, e a ambicao dele ja e a mais baixa das quatro.

            forca     0.27-0.81  ->  0.23-0.69
            colocado  0.59-0.90  ->  0.50-0.77
            rasteiro  0.50-0.90  ->  0.43-0.77
        */
        fraccaoCanto: {
            forca: { min: 0.207, max: 0.621 },     // -10% (15 de Outubro de 2026): mira mais para dentro, mais bolas defendiveis
            colocado: { min: 0.450, max: 0.693 },
            rasteiro: { min: 0.387, max: 0.693 },
            chapeu: { min: 0.081, max: 0.369 }
        },
        alturaRasteira: 0.30,
        alturaMeia: 1.05,
        alturaAlta: 1.90,
        alturaChapeu: 2.15,
        // Abaixo desta descentragem do GK o canto Ã© escolhido Ã  sorte: com
        // ele ao meio, os dois lados valem o mesmo.
        gkCentradoMax: 0.5,
        /*
        O DUELO DE DADOS escolhe o canto e a ambicao: `diff = (TEC + d10) - (GK + d10)`, como no penalti. Com `diff` > 0 o batedor tira do guarda-redes:
        `diffCanto` e o diff que leva a pontaria ao canto todo (1.0) e `chanceCantoAlto` o peso do canto de CIMA (o mais dificil de defender) por unidade de diff/diffCanto.
        */
        diffCanto: 14,
        chanceCantoAlto: 0.85
    },

    /*
    ERRO DA MIRA, em METROS no plano da baliza â€” e Ã© ele que produz golos,
    traves e bolas por cima, sem tabela nenhuma. Mesma ideia do
    `sigmaDePasse`: a bola sai na direcÃ§Ã£o pedida com um desvio gaussiano.

    O desvio vertical Ã© menor que o lateral (`fracVertical`): errar a altura
    de um remate Ã© menos comum do que errar o lado.
    */
    erro: {
        base: 1.60,             // metros de sigma, a 6 m e TEC 50 (1.10 -> 1.60 a 26/10/2026: calibracao de golos, o remate de perto entrava de mais; medido em lotes de 56 jogos)
        porMetro: 0.110,        // cresce com a distÃ¢ncia Ã  baliza
        distRef: 6.0,
        /*
        CHUTES ALTOS DEMAIS (relato: "os jogadores sempre chutam bolas altas"). Medido: a 21 m o sigma VERTICAL era 4.3 m (o lateral 6.2 m, `fracVertical` 0.70 depois de varias subidas do
        `escalaGlobal`) e o alvo, com o chao a 0.08 m, so tem para onde errar para CIMA: 41% dos remates de forca eram apontados acima do travessao (2.44 m) e 32% de todos os remates
        sairiam por cima. Agora o erro vertical e 0.35 do lateral (era 0.70) e o lateral sobe `fatorLateral` 1.30 para a mesma percentagem NO ALVO (conta feita com a mira e o sigma reais:
        no alvo 38.6% -> 37%; por cima 32% -> 20%; pelos lados 30% -> 43%). Os remates passam a falhar mais para o lado e menos para as bancadas.
        */
        fracVertical: 0.35,
        fatorLateral: 1.30,
        // TEC divide o sigma: 0.65 a TEC 100, 1.45 a TEC 0.
        tecMin: 0.65,
        tecMax: 1.45,
        // PressÃ£o: adversÃ¡rio colado abre a mira.
        pressaoDist: 3.0,
        pressaoMult: 1.45,
        /*
        Adversario ATRAS do rematador (no eixo do remate): a distancia dele conta
        `adversarioAtrasFator` vezes mais, e nunca bloqueia. E um adversario que
        bloqueia tem de estar a frente e a menos de `bloqueioLateralMax` m do eixo.
        */
        adversarioAtrasFator: 6.0,   // 2.5 -> 6.0: quem esta ATRAS so aperta se estiver a menos de ~0.37 m (era 0.88 m): atras nao corta nada, e o erro com defesa nas costas era demais
        bloqueioLateralMax: 1.4,
        // Ã‚ngulo fechado (junto Ã  linha de fundo) tambÃ©m.
        anguloMult: 1.30,
        anguloFechado: 35 * Math.PI / 180,

        /*
        A ÃšNICA MANÃPULA DE CALIBRAÃ‡ÃƒO. Multiplica todos os sigmas: acima de
        1 saem mais remates para fora, abaixo de 1 mais no alvo. Existe para
        acertar a taxa de conversÃ£o SEM voltar a impor desfechos â€” o
        resultado continua a sair da bola, do guarda-redes e da madeira.

        A pedido ("aumenta um pouco a chance de bola na defesa e fora"), com o
        passo medido em 248 min de relogio cada:

            1.00   26.9% dos remates no alvo
            1.15   15.5% no alvo  <- de mais: o real anda pelos 33%
            1.07   ver abaixo

        O motivo do pedido: 2.90 golos por jogo (115% do alvo) com 1.12 de xG
        (39%) â€” converte-se muito acima do que a qualidade das chances
        justifica, e parte disso e a mira ser boa demais para remates que sao
        maus. Mas a correccao tem um tecto: passado esse ponto o jogo deixa de
        ter golos a menos e passa a ter remates para as bancadas.

        MENOS 10% DE PRECISÃƒO, a pedido ("reduz a precisÃ£o nos chutes dos
        jogadores em 10%"): 1.07 -> 1.18, que Ã© o sigma dez por cento maior.

        O aviso acima continua a valer e agora estÃ¡ pago em nÃºmero: a 1.15 jÃ¡
        se mediram 15.5% dos remates no alvo contra os ~33% reais, e o lote de
        60 jogos a 1.07 dava 22.6%. Isto desce mais, o que reduz os golos
        (estavam em 137% do alvo) e afasta a percentagem no alvo da realidade
        ao mesmo tempo. Ã‰ a troca que o pedido faz, dita por inteiro.

        MAIS 15%, a pedido ("reduz em mais 15% a precisÃ£o dos chutes"):
        1.18 -> 1.36. O aviso acima vale a dobrar agora, e com nÃºmero: a 1.18
        o lote deu 21-23% dos remates no alvo contra os ~33% reais, e isto
        baixa mais. Ã‰ a terceira vez que o pedido vai neste sentido, portanto
        fica a decisÃ£o e fica o custo escrito.

        E 1.36 -> 1.56, mais 15%, a pedido (*"aumenta o erro em 15%"*). Quarta
        vez no mesmo sentido; o custo continua a ser o mesmo e agora com o
        nÃºmero de hoje: o lote anterior a esta linha deu **25.9%** dos remates
        no alvo, contra os ~33% do futebol real. Subir o erro de EXECUÃ‡ÃƒO
        afasta mais desse nÃºmero â€” o que sai da moldura nÃ£o dÃ¡ defesa nem
        canto, dÃ¡ pontapÃ© de baliza.

        A manÃ­pula que aperta a pontaria SEM mandar bolas para as bancadas
        continua a ser a `fraccaoCanto` (a ambiÃ§Ã£o da colocaÃ§Ã£o), lÃ¡ em cima.

        E 1.56 -> 2.03, mais 30%, a pedido (*"aumenta em 30% os erros nos
        chutes"*). QUINTA vez no mesmo sentido, e o custo jÃ¡ nÃ£o Ã© um aviso: Ã©
        medida. O lote imediatamente anterior a esta linha â€” com o tecto de
        velocidade e o corte de 15% na forÃ§a jÃ¡ aplicados â€” deu:

            % no alvo        27.5%   contra os ~33% reais
            golos             3.27   contra o alvo de 2.52
            conversÃ£o dos enquadrados  42.0%  (era 50.1% antes de hoje)

        Os 27.5% JÃ ESTÃƒO ABAIXO do real, e 30% de erro a mais afasta-os mais.
        Os golos descem, sim, mas pela via de mandar bola para fora da moldura:
        o que sai nÃ£o dÃ¡ defesa nem canto, dÃ¡ pontapÃ© de baliza. Se o objectivo
        for menos golos COM o guarda-redes a trabalhar, o instrumento nÃ£o Ã©
        este â€” Ã© a preparaÃ§Ã£o do mergulho dele (os 0.17 s de ler e impulsionar,
        que no traÃ§o frame a frame comem mais tempo do que a prÃ³pria reacÃ§Ã£o).

        Fica a decisÃ£o, e fica o custo escrito pela quinta vez.
        */
        /*
        2.03 -> 1.64, MENOS 19% (*"vamos tirar os erros colocados de quase 20% nas finalizaÃ§Ãµes"*). O lote
        de 380 jogos de 20 min dava 4.73 finalizaÃ§Ãµes no alvo por jogo contra 8.8 do benchmark BR 2025
        (54%), 1.65 golos contra 2.52 (65%) e 29% no alvo contra 33.7%: o erro de execuÃ§Ã£o acumulado
        nas cinco subidas era o que mais tirava remates da moldura. Mede-se de novo no lote seguinte.
        */
        /*
        1.64 -> 1.31, MENOS 20% (*"reduz o erro em mais 20%"*). Aviso medido: com 1.64 o lote de 380 jogos
        dava 32.9% dos remates no alvo contra 33.7% do benchmark BR 2025 â€” ja no alvo â€”, por isso esta
        descida empurra a % no alvo para cima dele e aumenta golos e defesas. Mede-se no lote seguinte.
        */
        /*
        1.31 -> 0.98, MENOS 25% (*"melhora a pontaria. Vai aumentar gols e finalizacoes no alvo. 25%"*).
        Lido como menos erro de execucao (o sigma 25% menor): e o que sobe os remates no alvo e os golos.
        Aviso medido: a 1.31 o lote de 40 jogos ja dava 36.9% no alvo (benchmark 33.7%), 2.11 golos e 6.54
        no alvo contra 8.8; o que falta nao e pontaria, e volume de remates tentados.
        */
        escalaGlobal: 1.45   // 2.00 -> 1.40 (relato: muitos chutes fora da direcao da baliza; medido em 3 jogos de 25 min: 2.00 -> 25.7% no alvo, 1.50 -> 29.5%, 1.30 -> 32.4%; real ~33%). 1.15 -> 1.30 (15 de Outubro de 2026): mais erro de execucao nas finalizacoes (pedido) â€” 60 jogos: golos 3.2 -> 2.59
    }
};

/*
=============================================================================
O BLOQUEIO â€” o ricochete, e nao um empurrao para a frente
=============================================================================
A bola bloqueada era mirada a `ball.z + dirZ * 3`: tres metros a frente do
rematador, sempre no sentido do ataque, com potencia 4.0-6.4 e altura 0.3.
Medido em 6 partidas headless (tools/headless/cantos_lote.js): 5.2 bloqueios
por jogo e NENHUM a chegar a linha de fundo, com os cantos em 3.8 por jogo
contra os 9.9 de um jogo a serio.

Um bloqueio a serio nao decide para onde a bola vai â€” desvia-a. Mantem-se a
direccao do remate, roda-se um angulo e perde-se velocidade. Quem decide se
ela sai passa a ser a DISTANCIA a que o corte aconteceu: um a 8 m da linha vai
la fora e da canto, um a 25 m morre no campo. Nada aqui aponta a bola para
fora de proposito.
*/
const BlockModel = {
    /*
    A BOLA BLOQUEADA VOLTA PARA TRAS (pedido: *"se um chute for bloqueado a bola tem que voltar na direcao contraria ao chute (180 graus), de acordo com a forca do chute"*). Antes seguia na direcao
    do remate (+-32 graus) e caia junto do rematador e do bloqueador, o que dava 3 ou 4 remates seguidos. Agora a base e a direcao OPOSTA ao remate, com um desvio pequeno (`sigma`, `max`), e a
    velocidade sai da forca do remate (`fraccaoMin`..`fraccaoMax` dela: um remate forte devolve a bola mais longe). `activo: false` volta ao ricochete de antes.
    */
    // Ou o bloqueador sai com a bola DOMINADA (`dominaChance`: a bola fica-lhe aos pes e ele passa a ter a posse), em vez de ela voltar para tras.
    dominaChance: 0.35,
    devolucao: { activo: true, sigma: 0.30, max: 0.60, fraccaoMin: 0.25, fraccaoMax: 0.50 },
    /*
    Desvio gaussiano em radianos. 0.55 rad = 32 graus de sigma: a maioria dos
    cortes devolve a bola quase no sentido em que ela vinha (e por isso ela
    segue para a linha de fundo, que e onde o remate apontava), e a cauda leva
    ao ricochete de lado.
    */
    anguloSigma: 0.55,
    /*
    Tecto do desvio, acima dos 90 graus para que o corte possa devolver a bola
    para tras â€” o ressalto que volta aos pes do rematador.
    */
    anguloMax: 2.0,

    /*
    Fraccao da potencia do remate que sobrevive ao corte, e o unico numero
    daqui que foi CALIBRADO em vez de escolhido.

    Com 0.20-0.60 a bola bloqueada fugia da area e os remates caiam de 27.8
    para 24.3 por 90 (24 partidas, ~2 sigma): o rebote fabricado que o modelo
    antigo criava -- bola fraca a tres metros da baliza -- estava a alimentar
    uma parte dos remates. Com 0.12-0.38 ela morre perto de onde foi cortada e
    os remates ficam nos 27.2, dentro do ruido.
    */
    fraccaoVelMin: 0.12,
    fraccaoVelMax: 0.38,
    // Chao para bolas travadas por um remate fraco: fica sempre disputavel.
    velocidadeMin: 2.0,

    // Elevacao do ressalto, em radianos (0 a ~34 graus).
    elevacaoMax: 0.60
};

/*
A BARREIRA REPOE-SE â€” ver Player.update (`barreiraSlot`). `limiar`: a que
distancia do lugar um homem da barreira deixa de se considerar la; `velocidade`:
o passo com que volta; `encaixe`: a que distancia fica exactamente no ponto.
*/
const BarreiraRepoe = { limiar: 0.12, velocidade: 3.0, encaixe: 0.06 };
if (typeof window !== 'undefined') window.BarreiraRepoe = BarreiraRepoe;

/*
=============================================================================
O LANCE PARADO DEPOIS DE UMA FALTA MONTA-SE A ANDAR â€” ver
Match.montarBolaParadaAndada (match_setpieces.js).
=============================================================================
Pedido: *"na hora da falta os jogadores ja se reposicionam para a cobranca
enquanto o jogador que sofreu a falta cai e rola. O reposicionamento dos
demais jogadores deve ocorrer somente depois que o jogador que sofreu a falta
chega no keyframe final. E eles tem que ir pro lugar naturalmente, nao se
teletransportando. Durante a falta os movimentos devem continuar normais."*
=============================================================================
*/
const BolaParadaAndada = {
    /*
    Enquanto o caido rola, cada um segue o embalo que trazia e trava sozinho:
    a velocidade cai por exp(-travagem * dt). Com 2.5/s, quem vinha a 7 m/s
    anda ~2.8 m e esta quase parado ao fim de 1.25 s â€” o apito ouviu-se e o
    lance morre aos poucos, nao num frame.
    */
    travagem: 2.5,
    /*
    A caminho do lugar, a velocidade sai da distancia: `distancia / tempoAlvo`,
    entre `velMin` e `velMax`. Quem esta a 10 m vai a passo (2.0 m/s); quem
    esta a 40 m vai a trote rapido (6.5 m/s) e chega em ~6 s, e nao em 13.
    */
    tempoAlvo: 3.5,   // 5.0 -> 3.5: as faltas demoravam (mediana 7.7 s sem cartao, ate 10.9): quem vai ao lugar chega mais depressa
    velMin: 2.0,
    velMax: 6.5,
    // A esta distancia do lugar considera-se la.
    chegada: 0.3,
    /*
    Rede de seguranca: quem ao fim disto ainda nao chegou (preso atras de
    alguem, um lugar inalcancavel) e posto la. O lance nao pode ficar a
    espera para sempre. Medido, ninguem chega perto: o mais lento leva ~9 s.
    */
    prazo: 20.0
};
if (typeof window !== 'undefined') window.BolaParadaAndada = BolaParadaAndada;

const FreeKickModel = {
    // Segundos entre o fim do cartao e a cobranca (o juiz apita antes de a falta sair).
    apitoAposCartao: 1.5,
    // Segundos de espera, no maximo (contados sem o cartao), para a barreira ficar toda no lugar antes de a falta sair.
    esperaBarreira: 4.0,   // 6.0 -> 4.0: o prazo esgotava-se sempre; com tempoAlvo menor a barreira chega a tempo
    /*
    DECISÃƒO DA COBRANÃ‡A â€” ver decisaoDeFalta em utils.js. TrÃªs casos:

    1. TRAPÃ‰ZIO DE REMATE DIRECTO. AtÃ© `remateDistMax` do centro da baliza e
       dentro das rectas que saem dos POSTES a `remateAnguloTrave` da
       PERPENDICULAR Ã  linha de fundo. A base menor Ã© a prÃ³pria baliza e o
       trapÃ©zio abre com a distÃ¢ncia â€” a 23 m tem 7.32 + 2 Ã— 13.28 = 33.9 m.
       Antes o critÃ©rio era o `emZonaDeFinalizacao` do jogo corrido, que Ã© um
       rectÃ¢ngulo e nÃ£o sabe nada de Ã¢ngulo com a trave: remata-se de posiÃ§Ãµes
       sem baliza nenhuma Ã  vista, e nÃ£o se rematava de frente a 25 m.

    2. MINI-CANTO. Ao lado da grande Ã¡rea (`miniCornerXMin`, a meia-largura da
       Ã¡rea) e a menos de `miniCornerProfundidade` da linha de fundo: dali nÃ£o
       hÃ¡ remate, cruza-se para a Ã¡rea como num canto curto.

    3. O RESTO: passe para o melhor colega posicionado.
    */
    /*
    O TECTO DA BATIDA DIRECTA estava em 23 m, e era ELE que fazia a batida
    directa quase nÃ£o existir. Medido num lote de 60 faltas espalhadas pelo
    terÃ§o ofensivo, 51 acabavam em passe e 9 em remate â€” e o mapa mostrava
    porquÃª: sÃ³ se rematava a 14 e 19 m, ou seja de DENTRO da grande Ã¡rea e da
    orla dela. A falta que toda a gente reconhece â€” 25 a 30 m, de frente, com
    barreira â€” caÃ­a sempre no ramo do passe, porque 24 m jÃ¡ era longe de mais.

    30 m Ã© a distÃ¢ncia a que se bate uma falta directa. O `remateAnguloTrave`
    continua a ser o outro corte, e Ã© ele que impede que isto passe a rematar
    de qualquer sÃ­tio: a 30 m a meia-largura do trapÃ©zio sÃ£o 3.66 + 17.3 m, mas
    a distÃ¢ncia Ã© medida ao CENTRO DA BALIZA, portanto o que sobra Ã© a
    intersecÃ§Ã£o do cÃ­rculo de 30 m com a cunha dos 30Â° â€” de frente vai-se a
    30 m, muito aberto nÃ£o se vai a 20.
    */
    remateDistMax: 30.0,                    // ao centro da baliza
    remateAnguloTrave: 30 * Math.PI / 180,  // da perpendicular Ã  linha de fundo
    miniCornerXMin: typeof Area !== 'undefined' ? Area.meiaLargura : 20.16, // meia-largura da grande Ã¡rea
    miniCornerProfundidade: 22.0,           // atÃ© esta distÃ¢ncia da linha de fundo

    /*
    =====================================================================
    A FALTA LATERAL JUNTO Ã€ ÃREA
    =====================================================================
    O mini-canto exigia estar jÃ¡ FORA da largura da grande Ã¡rea
    (`miniCornerXMin`, 20.16 m). A falta lateral clÃ¡ssica â€” a 14-20 m do
    eixo, Ã  altura da entrada da Ã¡rea â€” caÃ­a toda no ramo do passe, e
    saÃ­a dali um passe curto para a frente como em qualquer sÃ­tio do
    meio-campo. Ã‰ a posiÃ§Ã£o de onde se cruza, e nÃ£o se cruzava.

    Esta zona Ã© mais larga e mais funda do que a do mini-canto, e vem
    DEPOIS do trapÃ©zio de remate: de frente continua a rematar-se.
    */
    cruzXMin: 14.0,             // do eixo para fora, conta como falta lateral
    cruzProfundidade: 26.0,     // e atÃ© esta distÃ¢ncia da linha de fundo

    /*
    OS QUATRO CRUZAMENTOS. `relX` Ã© medido do eixo da baliza, com sinal do
    LADO DE ONDE VEM A BOLA (+ = mesmo lado); `dist` Ã© da linha de fundo;
    `altura` Ã© a que a bola tem de ter QUANDO LÃ CHEGA â€” Ã© isso que separa
    uma bola para a cabeÃ§a de uma bola para o pÃ©, e nÃ£o a forÃ§a de saÃ­da.

    A `elevacao` dÃ¡ a forma: chapelada nas trÃªs primeiras, tensa na
    quarta. A velocidade sai da altura pedida, resolvida com arrasto no
    `velocidadeParaChegarA` (utils.js) â€” a conta do vÃ¡cuo deixava o
    cruzamento uns metros curto, como deixava o canto.

    `peso` Ã© a probabilidade relativa; `bonusCompanheiro` multiplica o peso
    quando hÃ¡ um colega dentro de `raioCompanheiro` do alvo. Sem isso
    cruzava-se com a mesma frequÃªncia para um sÃ­tio onde nÃ£o estÃ¡ ninguÃ©m.
    */
    cruzamentos: [
        {
            nome: 'primeira_trave',
            relX: 3.4, dist: 5.5, altura: 2.30,
            elevacao: 31 * Math.PI / 180, peso: 30
        },
        {
            nome: 'segunda_trave',
            relX: -3.4, dist: 5.8, altura: 2.40,
            elevacao: 33 * Math.PI / 180, peso: 25
        },
        {
            nome: 'marca_penalti',
            relX: 0.0, dist: 11.0, altura: 2.30,
            elevacao: 32 * Math.PI / 180, peso: 25
        },
        {
            // MEIA ALTURA para quem chega a rematar de primeira Ã  entrada
            // da Ã¡rea. Bola tensa, nÃ£o chapelada: Ã© para bater, nÃ£o para
            // cabecear.
            nome: 'entrada_da_area',
            relX: 1.0, dist: 17.5, altura: 1.10,
            elevacao: 14 * Math.PI / 180, peso: 20
        }
    ],
    raioCompanheiro: 6.0,       // para o alvo contar como povoado
    bonusCompanheiro: 2.2,      // quanto o peso sobe quando lÃ¡ estÃ¡ alguÃ©m
    variacaoAlvo: 1.2,          // metros de aleatÃ³rio no alvo, para nÃ£o sair sempre igual

    distanciaBarreira: 9.15,   // os 9.15 m do regulamento
    barreira1MaxDist: 30.0,    // mais de 30m do centro do gol: 1 na barreira
    barreira2MaxDist: 26.0,    // mais de 26m do centro do gol: 2 na barreira
    barreiraMax: 4,            // faltas perigosas / perto do gol (<= 26m): barreira cheia
    espacamentoBarreira: 0.85, // ombro com ombro
    deslocamentoGK: 1.85,      // metros que o GK se desloca para o lado oposto da barreira
    potenciaBase: 28.5,        // m/s base no remate direto
    potenciaPorForca: 6.0,     // variaÃ§Ã£o com atributo FOR
    chanceDefesa: {
        perfeito: 0.03,   // diff > 5   â€” bola teleguiada na gaveta por cima da barreira
        bom: 0.16,        // diff 3..5
        medio: 0.38,      // diff 1..2
        fraco: 0.65       // diff <= 0  â€” remate sem forÃ§a/efeito suficiente
    },
    /*
    ATRÃS DA BOLA, na linha bola->baliza. Estava em 1.4 m â€” praticamente em
    cima dela, sem espaÃ§o nenhum para a corrida, e como o gesto era instantÃ¢neo
    o que se via era a bola a saltar sozinha para o pÃ© dele.

    A `corridaMin` Ã© o que sobra depois de descontar a passada final: o
    `ActionState` leva-o de `recuoBatedor` atÃ© junto da bola durante a fase de
    preparaÃ§Ã£o do clip, e a bola sÃ³ parte no `contactTime`.
    */
    recuoBatedor: 5.7,         // onde ESPERA, atrÃ¡s da bola (era 3.0; 5.7 como no penÃ¡lti: 4 passos andados a mais antes do gesto)
    lateralBatedor: 0.0,       // alinhado na direcÃ§Ã£o da cobranÃ§a como no penÃ¡lti
    /*
    A corrida do gesto cobre sÃ³ os Ãºltimos metros: o `contactTime` do ShotClip
    sÃ£o ~0.32 s. Os primeiros metros sÃ£o andados durante a espera regulamentar
    (ver o ramo `faltaPendente` no Match.update), e o gesto arranca daqui.
    */
    arranqueDoGesto: 1.8,
    velocidadeAproximacao: 2.4,   // m/s a caminhar para a bola, antes do gesto
    // A espera ate ao gesto (s), depois de montada a falta; antes valia a das outras reposicoes (3 s). O batedor caminha todo este tempo
    // (ver o FREE_KICK no match_loop.js): nao ha espera parada, so a que um caido ou alguem a caminho do lugar impoe.
    esperaFalta: 1.8,
    // Quanto tempo (s) a cobranca espera por quem ainda caminha para o lugar; passado isto bate-se na mesma.
    esperaCaminhantes: 4.0,
    // E por quem sofreu a falta e ainda esta caido (a queda dura ~7 s): bate-se passados estes segundos, sem esperar que ele se levante.
    esperaCaido: 4.0,
    // Onde o pÃ© fica no instante do contacto: um passo atrÃ¡s da bola.
    paragemNoContacto: 0.55,
    afastaAdversarios: 9.15,   // ninguÃ©m da defesa mais perto do que isto da bola

    /*
    O CORREDOR DA COBRANÃ‡A, e por que existe.

    Quando a falta acaba em REMATE, os lugares do `lugaresDaFalta` punham
    companheiros do batedor em cima da linha bola->baliza â€” os dois avanÃ§ados
    do `ataque_entrada` esperam o ressalto a 13.5 m da linha de fundo e a 2.5 m
    do eixo, ou seja Ã  frente da barreira e no caminho da bola. Medido em 60
    cobranÃ§as: **87% tinham um companheiro dentro do corredor**, o mais perto a
    7.0 m da bola em mÃ©dia â€” e a barreira estÃ¡ a 9.15.

    Quem estiver lÃ¡ dentro Ã© empurrado LATERALMENTE para a borda do corredor:
    continua a atacar o ressalto, mas de lado, que Ã© onde ele espera em campo.
    SÃ³ se aplica ao remate â€” num cruzamento ou num passe nÃ£o hÃ¡ linha de
    cobranÃ§a a proteger.
    */
    corredorLivre: 5.0,        // meia-largura do corredor bola->baliza, em metros
    // Passe e cruzamento: corredor mais estreito (meia-largura) e so ate `corredorPasseAlcance` m da bola.
    corredorLivrePasse: 2.0,
    corredorPasseAlcance: 9.0,

    /*
    E NINGUEM FICA EM CIMA DA BOLA.

    Relato: *"na cobranca da falta, por vezes, fica um jogador quase em cima da
    posicao da cobranca, atrapalhando um pouco"*.

    Medido em 105 cobrancas: o jogador mais perto da bola (tirando o batedor)
    esta em media a 7.7-8.0 m, mas **1 em 105** fica a menos de 2 m â€” foi um LB
    da propria equipa a 1.44 m. E raro, e e exactamente o "por vezes".

    O `corredorLivre` ja empurra quem esta no caminho bola->baliza, mas so
    quando a decisao e REMATE e so de lado. Quem calha a um metro da bola num
    passe curto nao era empurrado por ninguem. Este raio e radial e vale sempre.

    2.5 m: o batedor recua `recuoBatedor` para bater e precisa do arco do gesto
    livre; mais do que isto comecava a desarrumar a montagem toda.
    */
    // 2.5 -> 4.0 a 5 de Outubro de 2026 ("jogador entrando na frente do batedor das faltas"): a 2.2-2.7 m ainda estava no trajecto dele.
    folgaDaBola: 4.0,

    /*
    =========================================================================
    GENTE NA ÃREA Ã€ ESPERA DO CRUZAMENTO
    =========================================================================
    NÃ£o havia nenhuma: o setup da falta punha o batedor e a barreira, e os
    outros nove atacantes ficavam onde a jogada os tinha deixado. Cruzava-se
    para uma Ã¡rea vazia â€” e Ã© por isso que a falta no ataque nÃ£o produzia nada.

    `zonaDeArea` Ã© a partir de onde vale a pena povoar. CUIDADO COM A UNIDADE:
    Ã© `bolaZ * dir`, medido do MEIO-CAMPO e nÃ£o da linha de fundo â€” o mesmo
    referencial do `barreiraZonaZ` aqui em cima. 18 m do meio-campo Ã© o inÃ­cio
    do terÃ§o ofensivo (106/6 = 17.7), ou seja faltas a menos de ~35 m da
    baliza. Mais atrÃ¡s do que isso a falta Ã© de recomposiÃ§Ã£o, nÃ£o de ataque, e
    mandar cinco homens para a Ã¡rea sÃ³ abria o contra-ataque.

    Os slots sÃ£o relativos Ã  BALIZA, como os do canto (ver attackSetup em
    match.js): `relX` do eixo, com sinal do lado de onde vem o cruzamento, e
    `dist` da linha de fundo. `initial` Ã© onde se espera, `target` para onde
    se ataca quando a bola sai â€” de fora para dentro, que Ã© como se ganha o
    corpo ao marcador.

    Menos gente do que num canto, e de propÃ³sito: numa falta a bola pode sair
    em remate ou em passe, e uma equipa inteira dentro da Ã¡rea a um remate
    directo fica sem ninguÃ©m para a segunda bola nem para o contra-ataque.
    */
    zonaDeArea: 18.0,
    slotsArea: [
        // 1. Primeiro pau
        { initial: { relX: 3.0, dist: 7.0 }, target: { relX: 3.6, dist: 4.8 } },
        // 2. CoraÃ§Ã£o da Ã¡rea, Ã  altura da marca de penÃ¡lti
        { initial: { relX: -0.5, dist: 11.0 }, target: { relX: 0.0, dist: 8.5 } },
        // 3. Segundo pau, ataca de trÃ¡s para a frente
        { initial: { relX: -4.5, dist: 9.0 }, target: { relX: -3.4, dist: 6.0 } },
        // 4. Segunda vaga, chega atrasado
        { initial: { relX: 1.0, dist: 14.5 }, target: { relX: 1.0, dist: 11.5 } },
        // 5. Sobra na entrada da Ã¡rea, para o ressalto e a recarga
        { initial: { relX: 0.5, dist: 19.5 }, target: { relX: 0.5, dist: 18.0 } }
    ],
    /*
    E os marcadores, um por cada slot acima, sempre do lado da BALIZA em
    relaÃ§Ã£o ao homem deles â€” os dois arrays andam a par, mexer num pede mexer
    no outro. SÃ³ entram os defensores que sobram da barreira: a barreira Ã©
    obrigaÃ§Ã£o e vem primeiro.
    */
    slotsMarcacao: [
        { relX: 3.2, dist: 5.4 },
        { relX: -0.5, dist: 9.2 },
        { relX: -4.2, dist: 7.4 },
        { relX: 1.0, dist: 12.7 },
        { relX: 0.5, dist: 17.7 }
    ],

    /*
    =====================================================================
    FALTA DE ATAQUE DENTRO DA ÃREA ADVERSÃRIA â€” quem cometeu a falta RECUA
    =====================================================================
    Relato: "quando tem uma falta de ataque dentro da Ã¡rea adversÃ¡ria, o time
    infrator tambÃ©m tem que recuar para marcar os adversÃ¡rios; os jogadores
    estÃ£o ficando dentro da Ã¡rea e nÃ£o estÃ£o marcando ninguÃ©m".

    Era mesmo assim. Neste lance o batedor Ã© a equipa que defendia, e a bola
    fica no fundo do campo dela â€” sector `defesa`, que nÃ£o tem `slotsMarcacao`
    (esses sÃ£o para a falta ofensiva). Os infractores ficavam onde a jogada de
    ataque os tinha deixado, ou seja dentro da Ã¡rea, e o Ãºnico ajuste era o
    empurrÃ£o dos 9.15 m â€” que os afasta da bola sem os pÃ´r a marcar ninguÃ©m.

    Agora cada um pega no adversÃ¡rio mais perto e coloca-se do lado da PRÃ“PRIA
    baliza em relaÃ§Ã£o a ele, que Ã© o lado por onde a jogada vai sair. E sai da
    Ã¡rea: a regra manda-os para fora dela atÃ© a bola estar em jogo.

    `distanciaMarcacao`  metros entre o marcador e o homem dele.
    `margemForaDaArea`   a que distÃ¢ncia da linha da Ã¡rea ficam quem lÃ¡ estava
                         dentro â€” nÃ£o Ã© encostado Ã  linha, senÃ£o voltam lÃ¡ para
                         dentro no primeiro passo.
    `linhaDeRecuo`       para quem sobra sem homem: metros Ã  frente da linha da
                         Ã¡rea, onde formam uma linha de espera.
    `espacamentoRecuo`   entre os que sobram, para nÃ£o ficarem colados.
    */
    recuoDoInfrator: {
        distanciaMarcacao: 1.8,
        margemForaDaArea: 1.5,
        linhaDeRecuo: 8.0,
        espacamentoRecuo: 5.0
    },

    /*
    =====================================================================
    ONDE SE PÃ•E A EQUIPA QUE COBRA, POR SECTOR DO CAMPO
    =====================================================================
    AtÃ© aqui sÃ³ o batedor e cinco homens na Ã¡rea eram colocados; os outros
    ficavam onde a jogada os tinha deixado. Uma falta na prÃ³pria defesa
    tinha o mesmo desenho de uma falta ao lado da Ã¡rea.

    A UNIDADE Ã‰ O AVANÃ‡O: `bolaZ * attDir`, medido do MEIO-CAMPO. Negativo
    Ã© campo prÃ³prio, positivo Ã© campo adversÃ¡rio; Â±53 sÃ£o as linhas de
    fundo. Ã‰ o mesmo referencial do `barreiraZonaZ` e do `zonaDeArea`.

    CINCO SECTORES (ver setorDaFalta em utils.js):

      defesa          avanÃ§o < -17.7   (terÃ§o defensivo)
      meio_recuado    -17.7 a 0        (meio-campo, ainda no campo prÃ³prio)
      meio_avancado    0 a +17.7       (meio-campo, jÃ¡ no campo adversÃ¡rio)
      ataque_lateral   terÃ§o ofensivo, ao lado da Ã¡rea  -> cruzamento
      ataque_entrada   terÃ§o ofensivo, de frente        -> cobranÃ§a directa

    Nos dois Ãºltimos quem manda Ã© a DECISÃƒO (`decisaoDeFalta`): o sector de
    ataque segue o que a bola vai fazer, senÃ£o o desenho e a cobranÃ§a
    diziam coisas diferentes.
    */
    setores: {
        tercoDefensivo: -17.7,   // avanÃ§o abaixo disto Ã© sector defensivo
        meioCampo: 0.0,          // e daqui para cima jÃ¡ Ã© campo adversÃ¡rio
        tercoOfensivo: 17.7
    },

    /*
    QUEM BATE, por sector.

      'central'       o ZAGUEIRO (CB) de melhor TÃ©cnica, com 'def' de reserva
      'def'           o DEFENSOR de melhor TÃ©cnica (lateral incluÃ­do)
      'naoDef'        o melhor TÃ©cnico que NÃƒO Ã© defensor
      'lateral'       o LATERAL (LB/RB), o do lado da bola primeiro
      'lateralDoLado' o LATERAL DAQUELE lado, com o outro lateral de reserva
      'alaDoLado'     o melhor TÃ©cnico entre lateral, meia-lateral e ponta
                      DAQUELE lado â€” os trÃªs homens do corredor

    Este mapa Ã© o da falta PELO MEIO. A falta pela ala tem o seu, o
    `batedorPorSetorLateral` aqui a seguir.
    */
    /*
    =========================================================================
    A FALTA NA PROPRIA AREA BATE-A O GUARDA-REDES
    =========================================================================
    Revisao dos gestos do guarda-redes: *"Revisa tb as animacao de faltas e
    tiro de meta cobrados pelo goleiro."*

    O que se encontrou: o guarda-redes NUNCA batia faltas. O `batedorDaFalta`
    (utils.js) exclui-o de proposito (`semGk`) e na defesa quem batia era
    sempre o central (`batedorPorSetor.defesa`). No futebol real, uma falta
    dentro da propria area e batida pelo guarda-redes quase sempre â€” e
    exactamente o mesmo lance que um tiro de meta, so com outra origem.

    POR ISSO O GESTO E O DO TIRO DE META, e nao um novo: a cadeia
    `tiro_meta_espera` -> `tiro_meta` -> `chutando` (player.js) com o
    `GoalKickClip`, que e o clip mais cuidado do projecto (13 keyframes
    tracados de fotografias). A montagem (`setupSetPiece`) poe-no na espera,
    e o ciclo da falta (`match_loop.js`) liberta-o no instante em que
    libertaria qualquer outro batedor.

    SO DENTRO DA GRANDE AREA de quem bate. Fora dela a falta e jogada â€” com
    passe, com o central a sair a jogar â€” e isso ja tem batedor e gesto.

    A falso, volta tudo a como era: bate o central.
    =========================================================================
    */
    guardaRedesBateNaArea: true,

    batedorPorSetor: {
        defesa: 'central',
        meio_recuado: 'central',
        meio_avancado: 'naoDef',
        ataque_lateral: 'alaDoLado',
        ataque_entrada: 'naoDef'
    },

    /*
    E QUEM BATE QUANDO A FALTA Ã‰ PELA ALA â€” `|x|` acima de `corredorLateral`.

    Pedido: *"para faltas nas laterais na defesa quem bate Ã© o Lateral. Para
    faltas na meia lateral tambÃ©m Ã© o lateral para que o meia lateral possa se
    aprofundar na ponta ou Ã¡rea. Nas pontas: melhor tÃ©cnica entre o Lateral,
    meia lateral ou ponta"*.

    A ala da DEFESA ao MEIO-CAMPO Ã© do lateral, e a razÃ£o Ã© o desenho e nÃ£o o
    pÃ©: tirar o lateral do corredor custa pouco (ele Ã© o homem de trÃ¡s) e
    deixa o meia-lateral livre para atacar a profundidade. Na PONTA
    (`ataque_lateral`, que Ã© o sector do cruzamento e por definiÃ§Ã£o jÃ¡ Ã© ala)
    jÃ¡ nÃ£o Ã© o desenho que manda â€” Ã© o pÃ© que cruza melhor dos trÃªs do
    corredor, e por isso esse critÃ©rio vive no mapa de cima.

    O `ataque_entrada` nÃ£o aparece aqui de propÃ³sito: esse sector Ã© a falta
    que vai Ã€ BALIZA (`decisaoDeFalta` = 'remate'), e aÃ­ quem bate Ã© quem
    remata melhor, venha de onde vier no campo.

    Um sector que falte neste mapa cai no `batedorPorSetor`.
    */
    batedorPorSetorLateral: {
        defesa: 'lateralDoLado',
        meio_recuado: 'lateralDoLado',
        meio_avancado: 'lateralDoLado'
    },

    /*
    A PARTIR DE QUE `|x|` a falta Ã© "pela ala", em metros do eixo do campo.

    O campo tem 68 m, portanto a linha lateral estÃ¡ a 34. O lateral de raiz
    nasce a `0.7 * 34 * 0.8` = 19.0 m do eixo (FormationsData mais o
    `compMult`, ver js/match/match_setup.js) e o central a 8.2. Quinze metros
    fica entre os dois: Ã© ala o que estÃ¡ do lateral para fora, e meio o que
    estÃ¡ na meia-esquerda/meia-direita para dentro.

    O `setorDaFalta` nÃ£o pesa o x nenhum (sÃ³ o avanÃ§o em Z), e por isso este
    corredor Ã© lido Ã  parte, na escolha do batedor â€” o DESENHO da equipa
    continua a ser o do sector.
    */
    corredorLateral: 15.0,

    /*
    O DESENHO. Cada grupo de posiÃ§Ãµes recebe uma linha, em trÃªs modos:

      'bola'    `avanco` metros Ã  frente da BOLA (negativo = atrÃ¡s dela) e
                `xs` sÃ£o posiÃ§Ãµes ABSOLUTAS na largura do campo. Serve para
                as faltas de recomposiÃ§Ã£o, onde o que importa Ã© a escada de
                linhas Ã  frente da bola.
      'baliza'  `slots` medidos da LINHA DE FUNDO (`dist`) e do eixo da
                baliza (`relX`, com o sinal do lado de onde vem a bola).
                Serve para quem ataca a Ã¡rea â€” mesmo referencial dos slots
                do canto.
      'apoio'   junto Ã  bola: `dx` para o lado (com o sinal do lado da bola)
                e `dz` para a frente. Serve para quem dÃ¡ a opÃ§Ã£o curta.

    Grupos: cb (CB), lat (LB/RB), mc (DM/CM/AM), ml (LM/RM/LW/RW), ata (CF).
    Quando hÃ¡ mais gente do que lugares, os que sobram repetem o Ãºltimo
    lugar afastados de `espacamentoExtra` metros.
    */
    espacamentoExtra: 4.5,

    /*
    =====================================================================
    AS QUATRO ROTINAS DA FALTA NA INTERMEDIÃRIA
    =====================================================================
    Pedido, com quatro diagramas de treino: *"cria essas 4 opÃ§Ãµes de faltas no
    ataque. Para o time atacante e para o time defensor. Vamos sortear uma
    delas quando tiver uma falta na intermediÃ¡ria de ataque"*.

    A `formacaoPorSetor` (aqui em baixo) Ã© o desenho POR OMISSÃƒO de cada
    sector, e continua a ser o que vale em todo o campo. Isto Ã© outra coisa:
    na intermediÃ¡ria de ataque â€” o sector `meio_avancado` e o `ataque_entrada`,
    que juntos sÃ£o a faixa de onde estes lances se batem â€” sorteia-se UMA das
    quatro e Ã© ela que manda, nas duas equipas.

    Cada rotina tem as duas metades, como pedido:

        `ataque`  o desenho de quem cobra, no mesmo esquema da
                  `formacaoPorSetor` (modos 'bola', 'baliza' e 'apoio'), para
                  nÃ£o haver dois vocabulÃ¡rios de posicionamento no ficheiro.
        `defesa`  a resposta de quem defende, em dois nÃºmeros que o
                  `formaDaDefesaNoLivre` lÃª: `de` Ã© onde fica o homem mais
                  adiantado (a Lei 13 nunca deixa passar dos 9.15) e `ate` o
                  mais recuado. Uma defesa que espera a bola longa arma-se
                  atrÃ¡s; uma que espera o passe curto sobe.

    Os diagramas, e o que cada um virou:

      1. DEEP FREE KICK â€” a bola vem de longe para a Ã¡rea. "9,8 attempt to win
         flick-on for strikers running onto ball", "best headers win the
         challenge on edge of area", "4 waits for 2nd phase". Dois homens a
         atacar a primeira bola Ã  entrada da Ã¡rea, dois a atacar o que sobra
         dela mais Ã  frente, e um a segurar o ressalto atrÃ¡s.

      2. WIDE, 3 PELA LINHA â€” "3 looks to pull a defender out", e as duas
         opÃ§Ãµes: "3 runs early and 7 plays 3 down the line to cross" ou "10
         runs square to play ball into 3 or shoot". O desenho Ã© o da primeira:
         um homem aberto na linha, um apoio curto para lhe dar a bola, e o
         resto a atacar a Ã¡rea Ã  espera do cruzamento dele.

      3. CENTRAL, OVER THE HILL â€” "7 or 10 chips the ball over the wall where 9
         and 11 attempt to finish". Dois homens no limite do fora-de-jogo, em
         cima da barreira, Ã  espera da bola por cima dela; os mÃ©dios no
         ressalto e um homem aberto a esticar a defesa.

      4. WIDE, OUT-SWINGING â€” "out swinging high ball to back of the 6yrd box
         (By 3). 9 loops around as target", "4 looks for short kick to get a
         direct shot". Quatro homens na segunda trave (Ã© lÃ¡ que a bola cai),
         um a dar a volta por fora, e o apoio curto para a alternativa de
         remate directo.

    Quem sorteia Ã© o `setupSetPiece`, e guarda o nome em
    `Match.rotinaDaFaltaActual` â€” as duas equipas leem a MESMA, senÃ£o o ataque
    montava uma coisa e a defesa respondia a outra.
    */
    // As rotinas da falta que nao e directa vivem em FaltaRotinas (js/config/falta_rotinas.js): FK2, FK3, FK5 e FK6.
    rotinasDaIntermediaria: [],

    /*
    E EM QUE SECTORES Ã‰ QUE SE SORTEIA. A "intermediÃ¡ria de ataque" Ã© a faixa de
    onde estes quatro lances se batem: o meio-campo adversÃ¡rio e a entrada da
    Ã¡rea. Na ala (`ataque_lateral`) manda o cruzamento, que tem desenho prÃ³prio,
    e na defesa nÃ£o hÃ¡ rotina nenhuma a montar.
    */
    setoresComRotina: ['meio_avancado', 'ataque_entrada'],

    formacaoPorSetor: {
        /*
        FALTA NA PRÃ“PRIA DEFESA (DEEP FREE KICK).
        A equipa sobe em bloco para a entrada da Ã¡rea adversÃ¡ria para tentar ganhar a 
        primeira bola (flick-on) ou o ressalto, com os alvos na meia-lua e apoios a fechar.
        */
        defesa: {
            ata: { modo: 'baliza', slots: [{ relX: 4.0, dist: 18.0 }, { relX: -4.0, dist: 18.0 }] },
            ml: { modo: 'baliza', slots: [{ relX: 14.0, dist: 18.0 }, { relX: -14.0, dist: 18.0 }] },
            mc: { modo: 'baliza', slots: [{ relX: 0.0, dist: 26.0 }, { relX: 8.0, dist: 18.0 }, { relX: -8.0, dist: 18.0 }] },
            lat: { modo: 'bola', avanco: -5.0, xs: [-22, 22] },
            cb: { modo: 'bola', avanco: -10.0, xs: [-10, 10] }
        },

        // MEIO-CAMPO AINDA NO CAMPO PRÃ“PRIO: mesma ideia, escada mais curta.
        meio_recuado: {
            cb: { modo: 'bola', avanco: 2.0, xs: [-9, 9] },
            lat: { modo: 'bola', avanco: 12.0, xs: [-26, 26] },
            mc: { modo: 'bola', avanco: 18.0, xs: [-7, 0, 7] },
            ml: { modo: 'bola', avanco: 20.0, xs: [-24, 24] },
            ata: { modo: 'bola', avanco: 32.0, xs: [-8, 8] }
        },

        /*
        MEIO-CAMPO JÃ NO CAMPO ADVERSÃRIO. Batem os mÃ©dios. Os centrais
        ficam ATRÃS da bola (Ã© aqui que o contra-ataque nasce), os laterais
        e os meias-laterais abrem na largura, e os avanÃ§ados Ã  frente.
        */
        meio_avancado: {
            cb: { modo: 'bola', avanco: -12.0, xs: [-9, 9] },
            lat: { modo: 'bola', avanco: 0.0, xs: [-28, 28] },
            mc: { modo: 'bola', avanco: 6.0, xs: [-6, 6] },
            ml: { modo: 'bola', avanco: 10.0, xs: [-27, 27] },
            ata: { modo: 'bola', avanco: 18.0, xs: [-7, 7] }
        },

        /*
        AO LADO DA ÃREA â€” CRUZAMENTO. Bate o lateral. Os CENTRAIS SOBEM
        para cabecear e os avanÃ§ados tambÃ©m; os mÃ©dios centrais ficam
        recuados na entrada da Ã¡rea, para o ressalto e para tapar o
        contra-ataque; o meia-lateral do lado dÃ¡ o apoio curto ao batedor.

        Os `dist` batem certo com os quatro alvos do cruzamento (ver
        `cruzamentos`): primeira trave ~5.5 m, segunda ~5.8, marca ~11,
        entrada ~17.5.
        */
        ataque_lateral: {
            ata: { modo: 'baliza', slots: [{ relX: 3.2, dist: 5.6 }, { relX: -3.4, dist: 6.2 }] },
            cb: { modo: 'baliza', slots: [{ relX: 0.0, dist: 11.0 }, { relX: -1.5, dist: 8.5 }] },
            mc: { modo: 'baliza', slots: [{ relX: 1.0, dist: 18.0 }, { relX: -4.0, dist: 19.5 }] },
            ml: { modo: 'apoio', dx: 5.5, dz: -1.5 },
            lat: { modo: 'bola', avanco: -16.0, xs: [-16, 16] }
        },

        /*
        DE FRENTE Ã€ ENTRADA DA ÃREA â€” COBRANÃ‡A DIRECTA. Os centrais ficam
        recuados (nÃ£o tÃªm nada a fazer Ã  frente numa bola que vai Ã  baliza,
        e Ã© dali que se defende o contra-ataque), os avanÃ§ados ficam Ã 
        espera do RESSALTO â€” do guarda-redes, da barreira ou do poste â€” e
        os laterais e mÃ©dios dÃ£o o apoio, para a alternativa curta existir.
        */
        ataque_entrada: {
            ata: { modo: 'baliza', slots: [{ relX: 2.5, dist: 13.5 }, { relX: -2.5, dist: 14.5 }] },
            mc: { modo: 'apoio', dx: 7.0, dz: -1.0 },
            ml: { modo: 'apoio', dx: 11.0, dz: 1.5 },
            lat: { modo: 'apoio', dx: 15.0, dz: -3.0 },
            cb: { modo: 'bola', avanco: -20.0, xs: [-10, 10] }
        }
    }
};

/*
=============================================================================
PENÃLTI
=============================================================================
Marca a 11 m, toda a gente fora da Ã¡rea e fora da meia-lua, guarda-redes na
linha. O remate tem resoluÃ§Ã£o prÃ³pria â€” os pesos do remate em jogo corrido
(bloqueadores, distÃ¢ncia, Ã¢ngulo) nÃ£o fazem sentido aqui.

`chanceBase` Ã© a probabilidade de o remate ir enquadrado e bem colocado antes
de o guarda-redes contar; o duelo com ele resolve-se depois, pelo mergulho
normal (o GK reage com `gkDelayReacao`, como em qualquer remate).
=============================================================================
*/
const PenaltyModel = {
    marcaZ: typeof Area !== 'undefined' ? Area.distanciaPenalti : 11.0,         // distÃ¢ncia Ã  linha de fundo
    raioMeiaLua: typeof Area !== 'undefined' ? Area.raioMeiaLua : 9.15,        // ninguÃ©m dentro disto alÃ©m do batedor
    margemArea: typeof Area !== 'undefined' ? Area.profundidade : 16.5,         // linha da grande Ã¡rea
    recuoBatedor: 5.7,         // onde ele espera, atrÃ¡s da bola (6.6 m antes: 50 cm mais Ã  frente a pedido; a corrida Ã© de 3 passadas e a espera estica-se o que ela precisar)
    /*
    E UM POUCO AO LADO DELA, para o lado contrÃ¡rio ao pÃ© de chute â€” pedido, com
    captura (4A70): *"o jogador na hora da cobranÃ§a deve ficar ligeiramente
    desalinhado para a bola, para o lado do pÃ© contrÃ¡rio da cobranÃ§a. PÃ© direito
    deslocado um pouco para a esquerda, pÃ© esquerdo um pouco para a direita."*
    Metros para o lado, a `recuoBatedor` atrÃ¡s: 1.2 m dÃ¡ uns 15 graus de
    corrida. A aproximaÃ§Ã£o andada (Match.update) leva-o Ã  bola em linha recta,
    portanto a corrida sai na diagonal.
    */
    desvioBatedor: 1.2,
    areaX: typeof Area !== 'undefined' ? Area.meiaLargura : 20.16,             // meia-largura da grande Ã¡rea
    folgaArco: 0.6,            // quanto ficam PARA LÃ da meia-lua
    folgaArea: 0.8,            // e para lÃ¡ da linha da Ã¡rea
    /*
    EspaÃ§amento entre jogadores na fila da entrada da Ã¡rea. SÃ£o DEZANOVE (dois
    planteis menos os dois guarda-redes e o batedor), e a 3.2 m isso dava uma
    fila de 58 m â€” mais larga do que a grande Ã¡rea, com metade da gente
    encostada ao clamp de `areaX + 4`. A 2.2 m ocupa ~40 m e ainda cabe.
    */
    espacamentoFila: 2.2,      // entre jogadores na fila da entrada da Ã¡rea

    /*
    Escalonamento em profundidade da fila, em metros PARA TRÃS (afastando-se da
    baliza). Os atacantes ficam Ã  frente, a atacar o ressalto; os defesas mais
    atrÃ¡s, prontos para o contra-ataque. Sem isto ficavam todos na mesma linha,
    o que lÃª como uma parede e nÃ£o como um aglomerado Ã  espera da recarga.

    Mesma ideia da ordenaÃ§Ã£o `def â†’ mid â†’ ata` do canto (ver defenseSetup em
    match.js). A fila Ã© ainda MESCLADA entre as duas equipas â€” quem disputa o
    ressalto estÃ¡ ombro a ombro com o adversÃ¡rio, nÃ£o em blocos separados.
    */
    recuoPorRole: { ata: 0.0, mid: 1.6, def: 3.2 },

    /*
    COBERTURA DO CONTRA-ATAQUE. Com toda a gente na entrada da Ã¡rea os vinte e
    um jogadores liam-se como uma linha sÃ³, e ninguÃ©m guardava as costas de
    quem bate â€” se a bola sair dali a correr, o campo atrÃ¡s estÃ¡ vazio.

    Dois defesas e um mÃ©dio da equipa que BATE ficam `recuoCobertura` metros
    mais atrÃ¡s do que a sua posiÃ§Ã£o na fila. Ã‰ a equipa atacante e nÃ£o a que
    defende: quem arrisca o contra-ataque num penÃ¡lti Ã© quem tem toda a gente Ã 
    frente da bola.
    */
    coberturaDef: 2,           // defesas do batedor que ficam atrÃ¡s
    coberturaMid: 1,           // e mÃ©dios
    coberturaAtaAdv: 2,        // atacantes de quem DEFENDE, Ã  espera da bola
    recuoCobertura: 12.0,      // metros atrÃ¡s da fila da entrada da Ã¡rea
    /*
    Eles saem da fila e formam uma linha PRÃ“PRIA, centrada no eixo. DeixÃ¡-los
    na fila punha-os nas pontas â€” ela tem 21 lugares a 2.2 m, e quem sobra fica
    encostado Ã  linha lateral, que Ã© o oposto de cobrir o meio.
    */
    espacamentoCobertura: 5.0, // entre eles, nessa linha
    limiteXCobertura: 10.0,    // e nunca mais para fora do que isto
    avancoAtaAdv: 3.0,         // os atacantes ficam Ã  frente dos outros trÃªs

    /*
    A CORRIDA PARA A BOLA. Mesma divisÃ£o em dois tempos da falta (ver
    FreeKickModel.arranqueDoGesto): o batedor espera em `recuoBatedor`, CAMINHA
    atÃ© `arranqueDoGesto` durante o Ãºltimo terÃ§o da espera regulamentar, e o
    gesto cobre sÃ³ os Ãºltimos metros.

    Sem isto os 4.6 m tinham de caber dentro do `contactTime` do ShotClip
    (~0.32 s), ou seja ~13 m/s com a pose de remate congelada â€” o batedor
    DESLIZAVA sobre a perna de apoio atÃ© Ã  bola em vez de correr.
    */
    arranqueDoGesto: 2.0,         // onde o gesto arranca, atrÃ¡s da bola
    velocidadeAproximacao: 2.6,   // m/s a caminhar para a bola, antes do gesto
    paragemNoContacto: 0.55,      // onde o pÃ© fica no instante do contacto
    passoDoClip: 0.70,            // metros que o corpo avanÃ§a DENTRO do gesto (o Ãºltimo passo); o resto da corrida Ã© andado, em passadas inteiras

    potencia: 26.0,            // m/s Ã  saÃ­da
    alturaMax: 1.9,            // nÃ£o se coloca acima disto (trave a 2.44)
    margemPoste: 0.45,         // quanto se afasta do poste ao colocar
    chanceGolo: 0.78,          // enquadrado e colocado; o resto vai por fora

    /*
    Probabilidade de o guarda-redes MERGULHAR PARA O SÃTIO CERTO, por banda do
    duelo `diff = (TEC + d10) - (GK + d10)`. SÃ³ se aplica a remates que iam
    para dentro da baliza (ver baterPenalti); trave e fora nÃ£o passam por aqui.

    Antes sÃ³ o ramo `diff <= -5` o mandava ao sÃ­tio certo â€” abaixo disso o
    mergulho era SEMPRE para o lado contrÃ¡rio, e um penÃ¡lti bem batido nunca
    dava defesa. A escala segue a real: ~25% de defesas no total, e quase
    nenhuma nos remates perfeitos ao Ã¢ngulo.
    */
    chanceDefesa: {
        perfeito: 0.02,   // diff > 5   â€” ao Ã¢ngulo, sem hipÃ³tese
        bom: 0.12,        // diff 3..5
        medio: 0.30,      // diff 1..2
        fraco: 0.55       // diff <= 0  â€” mal batido
    },

    /*
    ÃRBITRO no penÃ¡lti: Ã  ESQUERDA do batedor (ele olha para a baliza), no
    cruzamento da linha lateral da pequena Ã¡rea com o alinhamento da marca â€”
    ou seja x = Â±(LARGURA_BALIZA/2 + 5.5) e z = o mesmo z da marca. Dali vÃª a
    bola, o pÃ© do batedor e a linha do guarda-redes sem estar no caminho de
    ninguÃ©m, que Ã© a colocaÃ§Ã£o real.

    A diagonal normal (ver pontoDoArbitro) punha-o algures a meio-campo, longe
    do lance.
    */
    arbitroX: 9.16   // LARGURA_BALIZA/2 + 5.5, lateral da pequena Ã¡rea
};

const CrossModel = {
    alaX: 15.0,           // a partir daqui conta como estar na ala

    /*
    O CORREDOR E DELE â€” quando esta livre, vai ao fundo.

    Relato: *"os laterais e meias pela lateral, as vezes, recebem a bola
    sozinhos e nao vao pro fundo para cruzar; preferem tocar para o meio"*.
    Medido em 900 s, posses de LB/RB/LM/RM no corredor do campo adversario,
    sem adversario a menos de 6 m: **7 posses, ZERO cruzamentos**, quatro
    passes (tres para dentro, tres para tras) e 1.2 m de avanco medio â€” 
    acabavam a 42 m da linha de fundo, ou seja onde receberam.

    Duas regras os prendiam, e nenhuma delas e sobre alas:

      `CarryModel.conduzirSoAcimaDe` (17 m)  havendo passe bom, so se conduz
                                             do ultimo terco para a frente â€”
                                             e eles recebem antes disso;
      `CarryModel.limiteConducaoDefesa` (0)  um DEFESA nao conduz no campo
                                             adversario, e um lateral e
                                             `role: def`.

    As duas continuam a valer em todo o lado menos aqui: com o corredor
    vazio a frente e linha de fundo para ganhar, conduzir e a jogada.
    */
    corredor: {
        /*
        O QUE CONTA E O CORREDOR A FRENTE, nao um circulo a volta dele.

        A primeira versao pedia 'nenhum adversario a menos de 6 m' e
        praticamente nunca acontecia: 6 avaliacoes verdadeiras em 600 s. E
        tambem nao e a pergunta certa â€” um marcador ATRAS dele, ou por
        dentro, nao o impede de ir a linha; o que o impede e alguem no
        caminho.

        Agora mede-se uma FAIXA ao longo da linha lateral: `comprimento`
        metros a frente, `largura` para cada lado. Vazia, o corredor e dele.
        */
        comprimento: 12.0,  // metros de faixa a frente que tem de estar vazia
        largura: 3.5,       // meia-largura dessa faixa
        zonaZ: 0.0,         // do meio-campo adversario para a frente
        fundoMin: 6.0       // e ainda ha esta linha de fundo para ganhar
    },
    zonaZ: 20.0,          // e daqui para a frente vale a pena olhar para a Ã¡rea (recuado para evitar cruzamento de muito longe)

    areaZ: 34.0,          // linha da grande Ã¡rea
    areaX: 20.5,          // meia-largura da grande Ã¡rea
    fundoZ: 50.0,         // linha de fundo
    distMin: 10.0,         // abaixo disto Ã© passe curto, nÃ£o cruzamento pelo ar
    distBaseIdeal: 18.0,   // distÃ¢ncia de referÃªncia ideal para cruzamento
    penalDistancia: 0.090, // penalidade progressiva por metro de distÃ¢ncia alÃ©m do ideal

    /*
    DISTÃ‚NCIA: penalizaÃ§Ã£o a sÃ©rio, corte sÃ³ para o disparate.

    Medidos oito cruzamentos seguidos em jogo: TODOS entre 22 e 32 m, nenhum
    da linha de fundo â€” a `penalDistancia` de 0.035/m tira 0.42 a 30 m, e a
    chance nessa altura jÃ¡ vai acima de 1, portanto nÃ£o travava nada.

    Um tecto duro a 28 m foi tentado e cortou metade das tentativas sem as
    substituir por cruzamentos melhores: o ala raramente chega Ã  linha de
    fundo, portanto o que se ganhava em qualidade perdia-se em jogadas que
    simplesmente deixavam de existir. O tecto fica sÃ³ onde nÃ£o hÃ¡ discussÃ£o
    (uma bola atirada do meio-campo), e a distÃ¢ncia passa a pesar na CHANCE,
    que Ã© onde compete com o resto.
    */
    distMax: 34.0,

    /*
    TERRITÃ“RIO DO GUARDA-REDES. Um cruzamento que cai dentro da pequena Ã¡rea,
    ou a menos de `fundoMinAlvo` da linha, Ã© dele â€” sai da baliza e agarra-a
    no ar. Nos mesmos oito, um cruzamento raso de 27.8 m acabou nas mÃ£os do
    GK adversÃ¡rio sem ninguÃ©m lhe tocar.

    `pequenaMeiaLargura` vem da Area (config), aqui Ã© sÃ³ a profundidade.
    */
    fundoMinAlvo: 5.5,

    /*
    RASTEIRO SÃ“ DE PERTO. Um cruzamento rasteiro de 27.8 m foi medido a acabar
    nas mÃ£os do guarda-redes sem ninguÃ©m lhe tocar: junto ao chÃ£o e vindo de
    longe, ele tem tempo de sobra para sair e agarrar. De longe, a bola tem de
    ir por cima.
    */
    distRasoMax: 18.0,

    /*
    NÃƒO SE CRUZA COM UM HOMEM EM CIMA.

    A bola sai a 22Â° e leva metros a ganhar altura: um adversÃ¡rio nos
    primeiros passos do cruzamento corta-a junto ao chÃ£o, e nem "alto" nem
    "rasteiro" o evitam. Medidos treze cruzamentos: quatro foram cortados
    assim, um deles antes de a bola fazer 3 m â€” todos com a bola a 0.1 m do
    chÃ£o no ponto em que morreram.

    O `bloqueadores` jÃ¡ era contado, mas sÃ³ decidia alto/raso; nunca fazia o
    jogador desistir. Agora, com alguÃ©m dentro de `saidaLimpaComprimento`
    metros Ã  frente e `saidaLimpaLargura` para o lado, o cruzamento nÃ£o sai â€”
    a Ã¡rvore segue para o passe, o drible ou a conduÃ§Ã£o, que Ã© o que um
    jogador faz nessa situaÃ§Ã£o.

    CALIBRAÃ‡ÃƒO, medida em corridas de uma hora simulada cada:

        5.0 m x 1.8 m de corte                    13 -> 1 cruzamento
        2.5 m x 1.0 m + 0.35 de penalizaÃ§Ã£o       13 -> 1 cruzamento

    O marcador do ala estÃ¡ quase sempre nessa zona, portanto qualquer das duas
    equivale a desligar o cruzamento. Ficam os nÃºmeros pequenos e SEM
    penalizaÃ§Ã£o: corta-se sÃ³ o caso indefensÃ¡vel â€” alguÃ©m plantado a dois
    metros, Ã  frente, na linha da bola.
    */
    saidaLimpaComprimento: 2.0,
    saidaLimpaLargura: 0.8,

    /*
    LEAD PRÃ“PRIO DO CRUZAMENTO.

    O alvo do passe passava pelo `alvoDePasse` (utils.js), que projecta o
    receptor Ã  velocidade mÃ¡xima dele durante o voo INTEIRO. Num passe em
    campo aberto isso estÃ¡ certo; num cruzamento nÃ£o: quem ataca a Ã¡rea faz
    dois ou trÃªs metros e trava, muda de direcÃ§Ã£o, disputa. Medidos dois
    cruzamentos a passar a 15 e a 24 m do homem â€” a bola foi mirada para onde
    ele estaria se continuasse a correr em linha recta durante 1.5 s.

    Aqui o lead Ã© o mesmo cÃ¡lculo, com TECTO: `leadMax` metros, no mÃ¡ximo.
    */
    leadMax: 4.0,
    // Velocidade mÃ©dia da bola no cruzamento, para estimar o tempo de voo.
    velVooEstimada: 18.0,

    /*
    ESCOLHA DO ALVO. Era `o companheiro mais CENTRAL`, e mais nada: um ponta
    de lanÃ§a com um central colado ao primeiro poste ganhava sempre a um
    extremo sozinho ao segundo. Agora Ã© uma nota:

      `pesoLivre`     metros de folga ao marcador mais prÃ³ximo (o que mais
                      pesa: cruza-se para quem estÃ¡ livre)
      `pesoCentral`   estar pelo eixo continua a valer â€” Ã© de onde se remata
      `pesoAlturaAlvo` quem ganha de cabeÃ§a Ã© quem se procura num cruzamento
    */
    pesoLivre: 1.0,
    pesoCentral: 0.55,
    pesoAlturaAlvo: 0.35,

    // +20% pedido explicitamente: cruzamentos pouco frequentes.
    chanceBase: 0.62,     // com um alvo na Ã¡rea (era 0.54)
    chancePorAlvo: 0.264, // por cada alvo alÃ©m do primeiro
    // +100% pedido: cruzar DAS LATERAIS DA ÃREA. Os dois termos que dependem
    // de estar lÃ¡ (largura junto Ã  linha, e o peso da camada CRUZAMENTO do
    // SpatialGrid â€” ver pesoGrid abaixo) dobraram; a chanceBase nÃ£o, senÃ£o
    // subia tambÃ©m o cruzamento de qualquer sÃ­tio.
    bonusLargura: 1.0,    // acumulado junto Ã  linha lateral (era 0.72: pedido, mais cruzamentos ao lado da area)
    bonusFundo: 0.58,     // acumulado junto Ã  linha de fundo (era 0.42)
    // Quanto vale a cÃ©lula da camada CRUZAMENTO (0-100) do SpatialGrid, que Ã©
    // exactamente a faixa das laterais da Ã¡rea. 0.30 -> 0.60.
    pesoGrid: 0.85,       // (era 0.60)
    penalPressao: 0.30,   // sob pressÃ£o o cruzamento sai mal
    chanceMax: 0.97,

    /*
    NAS LATERAIS DA ÃREA O CRUZAMENTO TEM DE GANHAR AO PASSE RASTEIRO.

    Os bÃ³nus acima jÃ¡ empurram o cruzamento para cima nessa zona, mas isso nÃ£o
    chega: a decisÃ£o nÃ£o Ã© entre "cruzar" e "nÃ£o fazer nada" â€” Ã© entre cruzar e
    PASSAR, e a nota do passe nÃ£o sabia nada de estar na ala junto Ã  Ã¡rea. Um
    passe curto para trÃ¡s pontuava na mesma o que pontuaria no meio-campo, e
    ganhava.

    DaÃ­ a penalizaÃ§Ã£o do outro lado da balanÃ§a: dentro da zona (ver
    `zonaLateralDaArea` em utils.js) a nota do passe rasteiro e do lanÃ§amento
    rasteiro Ã© multiplicada por `penalPasseRasteiro`. O cruzamento nÃ£o Ã©
    tocado â€” sobe por comparaÃ§Ã£o, que Ã© o que "mais bÃ³nus para cruzamento do
    que para passe" quer dizer.

    A zona Ã© a mesma dos bÃ³nus: da ala (`alaX`) para fora, e do `zonaZ` para a
    frente. A penalizaÃ§Ã£o entra a 0 na borda e chega ao valor cheio junto Ã 
    linha de fundo, para nÃ£o haver um degrau na decisÃ£o.
    */
    penalPasseRasteiro: 0.45,   // a nota do passe vale isto, na zona cheia
    penalLancamentoRasteiro: 0.35,

    /*
    =====================================================================
    O CANTO â€” a forÃ§a que faltava
    =====================================================================
    A balÃ­stica do canto (case 'SET_PIECE_TAKER' em fsm.js) era SEM ARRASTO:
    fixava `vy` e resolvia a horizontal por `vHoriz = d / tVoo`, ou seja a
    fÃ³rmula de manual para um tiro no vÃ¡cuo. A fÃ­sica da bola tem arrasto
    quadrÃ¡tico nas TRÃŠS componentes (`BallPhysics.kArrasto`, ver
    match_physics.js), e a 17-18 m/s isso sÃ£o ~4 m/sÂ² a travar a bola durante
    todo o voo.

    Medido para um canto tÃ­pico (d â‰ˆ 35 m, tVoo â‰ˆ 2.0 s): a bola caÃ­a aos
    ~29 m em vez dos 35 â€” seis metros curta, Ã  entrada da Ã¡rea em vez de na
    marca. Ã‰ exactamente o "falta forÃ§a" que se vÃª.

    O resto do cÃ³digo nÃ£o tem este problema porque resolve a balÃ­stica por
    `velocidadeParaAlcance` (utils.js), que simula o voo com arrasto. O canto
    era o Ãºnico sÃ­tio que ainda usava a conta do vÃ¡cuo, e passa a usar a
    mesma funÃ§Ã£o.

    `elevacao` mantÃ©m a forma do cruzamento que jÃ¡ havia (o `vy` de 9.8 m/s
    sobre uma horizontal de ~17.5 dava ~29Â°); `forca` Ã© o botÃ£o para afinar
    por cima da balÃ­stica correcta, e fica em 1.0 porque com o arrasto
    contado a bola jÃ¡ chega ao sÃ­tio pedido.
    */
    canto: {
        elevacao: 29.0,      // graus Ã  saÃ­da do pÃ©
        variacaoElev: 3.0,   // Â± aleatÃ³rio, para nem todos os cantos saÃ­rem iguais
        forca: 1.0           // multiplicador por cima da balÃ­stica com arrasto
    }
};

/*
DomÃ­nio de bola: recepÃ§Ã£o, intercepÃ§Ã£o e desvio.

A regra antiga era uma sÃ³: a bola sÃ³ podia ser apanhada a menos de 1.2 m E com
velocidadeÂ² < 60 (ou seja, abaixo de 7.75 m/s). Como todos os passes saem entre
16 e 25 m/s, isso significava que ninguÃ©m podia tocar num passe em movimento â€”
nÃ£o havia intercepÃ§Ãµes no jogo, e o destinatÃ¡rio tinha de esperar meio segundo
que a bola abrandasse.

Agora qualquer jogador ao alcance disputa a bola. Quanto mais rÃ¡pida ela vem e
menor a skill dele, menor a hipÃ³tese de a dominar; falhando, desvia-a. Quem
espera o passe tem uma vantagem (`receiverBonus`), porque jÃ¡ vinha a preparar-se.

O guarda-redes nÃ£o entra por aqui a alta velocidade: as defesas dele sÃ£o
tratadas em FootballPlayer.updateGK().
*/

const HeaderModel = {
    // Cabecada que segue no mesmo sentido (< 90 graus da chegada): a bola sai com no maximo isto da velocidade que trazia.
    retencaoNoMesmoSentido: 0.85,
    /*
    =========================================================================
    O CABECEÃO Ã€ BALIZA: MIRA MAIS ERRO, e nÃ£o uma tabela de desfechos
    =========================================================================
    Estava aqui um sorteio que decidia o DESFECHO antes de a bola sair da
    testa â€” 'GOL', 'TRAVE_CAMPO', 'GOLEIRO_DEFENDE', sete faces com pesos â€” e
    depois escrevia a fÃ­sica para o cumprir: no 'GOL' mirava a 0.75-0.93 do
    poste e pÃºnha `forcedGKDelay = 0.8` com o comentÃ¡rio "GK nÃ£o chega a
    tempo".

    Medido, 810 minutos de jogo e 33 golos (3.67 por 90, alvo 2.52):

        Ãºltimo contacto antes do golo
          cabeceÃ­o      23   70%      (no futebol a sÃ©rio ~17%)
          nada em 5 s    6   18%
          remate         3    9%
          passe          1    3%
        estado do guarda-redes: idle 19 em 33

    Tirado o atraso forÃ§ado (ver `armarGuardaRedes`, utils.js), ele passou a
    mergulhar â€” idle 19 -> 3 â€” e os golos quase nÃ£o mexeram: 3.67 -> 3.56. A
    razÃ£o Ã© a outra metade do dado: continuava a MIRAR no Ã¢ngulo em ~59% dos
    cabeceÃ­os limpos, e de 8 m a 17 m/s a bola chega em 0.47 s. Com 0.28 s de
    reaÃ§Ã£o nÃ£o hÃ¡ guarda-redes nenhum que cubra 3 m nesse tempo. Uma mira
    perfeita nÃ£o se defende â€” defende-se um cabeceÃ­o, que Ã© outra coisa.

    Passa a ser o mesmo desenho do remate (ShotModel): mira-se um ponto que Ã©
    SEMPRE golo, e o que decide o desfecho Ã© o ERRO somado por cima. Golos,
    postes e bolas por cima saem da bola, do ferro e do guarda-redes.

    O erro Ã© maior do que o do pÃ©, e tem de ser: cabecear Ã© acertar com a
    testa numa bola que vem no ar, muitas vezes em salto e com um marcador ao
    lado. O `ShotModel.erro` vale 1.10 m a 6 m com TEC 50; aqui a base Ã© 1.70
    a 4 m, o que pÃµe a maioria dos cabeceÃ­os longe do Ã¢ngulo e ao alcance de
    quem defende.
    =========================================================================
    */
    remate: {
        /*
        A MIRA. Lado contrÃ¡rio ao guarda-redes, como no remate; a ambiÃ§Ã£o Ã©
        menor â€” ninguÃ©m coloca uma cabeÃ§ada no poste como coloca um pÃ©.
        */
        fraccaoCantoMin: 0.30,
        fraccaoCantoMax: 0.80,
        alturaMin: 0.45,
        alturaMax: 1.95,
        gkCentradoMax: 0.6,     // com o GK a menos disto do meio, o lado Ã© Ã  sorte

        /*
        O ERRO, em metros no plano da baliza. Mesma forma do ShotModel.erro.
        `aerial` Ã© TEC*0.65 + STRENGTH*0.35, a mesma conta que jÃ¡ decidia a
        disputa aÃ©rea.
        */
        erro: {
            base: 1.70,
            porMetro: 0.16,
            distRef: 4.0,
            fracVertical: 0.75,
            // Divide o sigma: 0.70 a aerial 100, 1.45 a aerial 0.
            aerialMin: 0.70,
            aerialMax: 1.45,
            // Em salto acerta-se pior do que com os pÃ©s no chÃ£o.
            saltoMult: 1.15,
            // Marcador colado abre a mira, como a pressÃ£o no remate.
            pressaoDist: 2.2,
            pressaoMult: 1.40,

            /*
            A MANÃPULA DE CALIBRAÃ‡ÃƒO, como a `escalaGlobal` do remate: acima
            de 1 saem mais cabeceÃ­os para fora, abaixo de 1 mais Ã  baliza.
            Existe para acertar a taxa sem voltar a impor desfechos.
            */
            escalaGlobal: 1.0
        },

        // PotÃªncia da cabeÃ§ada, em m/s, antes do factor de forÃ§a.
        potenciaBase: 12.5,
        potenciaAmplitude: 3.5
    },

    /*
    Sigma da cabeÃ§ada Ã  baliza. `o`: { dist, aerial, emSalto, distMarcador }.
    */
    sigmaCabeceio: function (o) {
        const E = this.remate.erro;
        const dist = Math.max(0, (o && o.dist) || 0);
        const aerial = Math.max(0, Math.min(100, (o && typeof o.aerial === 'number') ? o.aerial : 50));
        let s = E.base + Math.max(0, dist - E.distRef) * E.porMetro;
        s *= E.aerialMax - (E.aerialMax - E.aerialMin) * (aerial / 100);
        if (o && o.emSalto) s *= E.saltoMult;
        if (o && typeof o.distMarcador === 'number' && o.distMarcador < E.pressaoDist) s *= E.pressaoMult;
        s *= E.escalaGlobal;
        return { lateral: s, vertical: s * E.fracVertical };
    },

    /*
    RAIO EM QUE SE CABECEIA Ã€ BALIZA. Fora dele a cabeÃ§ada Ã© passe ou alÃ­vio,
    nunca remate.

    Era `distToGoal < 24 && |x| < 16`, e as duas medidas eram em EIXOS
    separados: 24 m sÃ³ em Z, 16 m sÃ³ em X. Um jogador a 23 m da linha e 15 m
    do eixo estÃ¡ a 27.5 m da baliza e continuava a cabecear ao golo â€” e daÃ­
    vinham os golos de cabeÃ§a de mais de 20 metros, que no futebol quase nÃ£o
    existem.

    Agora Ã© a distÃ¢ncia a sÃ©rio ao CENTRO da baliza (o ponto x=0 na linha), num
    raio sÃ³. A guarda de estar virado para lÃ¡ mantÃ©m-se.
    */
    raioRemateCabeca: 11.0,

    /*
    E O RAIO DENTRO DA GRANDE AREA, com o cabeceador SEM MARCACAO.

    O de cima e o raio geral e fica como esta: e o que impede os golos de
    cabeca de 20+ metros. Este so vale com as tres condicoes juntas â€” dentro
    da area, virado a baliza e sem marcador a 2.2 m â€”, e existe porque o corte
    aos 11 m mandava passar para tras 72% das cabecadas de quem estava sozinho
    na area (medido, ver a nota no `executeHeader`, player.js).

    16 m cobrem a grande area em profundidade (16.5 m) e a zona central em
    largura. A esquina da area esta a 26 m do centro da baliza, e de la
    continua a ser escora.
    */
    raioRemateNaArea: 16.0,

    alcanceMax: 16.0,          // alcance mÃ¡ximo de um alÃ­vio de cabeÃ§a
    alcancePasse: 8.5,         // alcance de escora para colega

    /*
    FORA DA ZONA DE REMATE A CABEÃ‡ADA Ã‰ SEMPRE PARA BAIXO.

    Era o `elevacaoAlivio` a 28Â° que alimentava o ping-pong aÃ©reo: a bola subia,
    voltava a cair Ã  altura da testa e o seguinte cabeceava outra vez. O travÃ£o
    do `maxHeadersSeguidos` corta a sequÃªncia ao terceiro, mas dois cabeceios
    seguidos jÃ¡ se vÃªem, e a bola ficava no ar entre eles.

    Uma cabeÃ§ada defensiva bem feita Ã© para BAIXO â€” bate no chÃ£o perto e
    ressalta rasteira, que Ã© o que a tira da altura da cabeÃ§a de toda a gente.
    Por isso o alÃ­vio longo deixou de existir como trajectÃ³ria prÃ³pria: fora da
    zona de remate usa-se sempre `elevacaoEscora`, e o que muda entre escorar
    para um colega e aliviar sem destinatÃ¡rio Ã© a DISTÃ‚NCIA, nÃ£o o Ã¢ngulo.

    O `elevacao` (22Â°) fica para quem o chamar de fora daqui; o `elevacaoAlivio`
    foi REMOVIDO, para ninguÃ©m lhe voltar a pegar por engano.
    */
    elevacao: 22 * Math.PI / 180,        // elevaÃ§Ã£o genÃ©rica de cabeceio

    /*
    Ã‚ngulo da cabeÃ§ada para baixo â€” NEGATIVO, a bola sai a descer. Estava em
    +8Â°, e a +8Â° a partir da testa (1.62 m) a bola ainda subia atÃ© ~1.75 m e
    voltava a passar pela altura de cabeceio na descida: o ping-pong recomeÃ§ava
    ali mesmo. Para a bola nunca mais estar Ã  altura da cabeÃ§a de ninguÃ©m, tem
    de sair jÃ¡ a descer.
    */
    elevacaoEscora: -9 * Math.PI / 180,

    /*
    Alcance de um alÃ­vio para baixo, em metros. A bola sai a descer e bate no
    chÃ£o perto â€” quer-se isso, nÃ£o distÃ¢ncia. Este Ã© o tecto da distÃ¢ncia pedida
    fora da zona de remate.

    ATENÃ‡ÃƒO ao calcular a velocidade para esta distÃ¢ncia: a cabeÃ§ada parte de
    ALTURA_TESTA, nÃ£o do chÃ£o. O `velocidadeParaAlcance` resolve o alcance de um
    lanÃ§amento que SAI DO CHÃƒO, e usÃ¡-lo aqui punha a bola pedida a 4 m a cair
    aos 8.4 m â€” o dobro. Usa-se `velocidadeDeLancamento` (utils.js), que resolve
    um ponto (distÃ¢ncia, altura) a partir de uma altura de saÃ­da.
    */
    alcanceAlivioBaixo: 8.0,

    /*
    PISO da cabeÃ§ada â€” e Ã© ele que impede o mesmo jogador de cabecear duas
    vezes seguidas.

    A distÃ¢ncia pedida era `min(distÃ¢ncia ao colega, alcanceAlivioBaixo)`, sem
    mÃ­nimo nenhum. Com um colega a 1 m, a balÃ­stica resolvia a cabeÃ§ada para
    **1.93 m/s**: em 0.35 s â€” o `BallControl.touchLock` â€” a bola percorria 66 cm
    e ficava ali Ã  frente da cara de quem a cabeceou, Ã  altura da testa. Ele
    voltava a alcanÃ§Ã¡-la assim que o lock passava, e cabeceava outra vez. Era
    isso que se via como "duas cabeÃ§adas seguidas rÃ¡pidas do mesmo jogador".

    Uma cabeÃ§ada tem sempre pancada: mesmo a escorar para o lado, a bola sai
    com alguns metros por segundo. `alcanceMin` impede que se peÃ§a um alvo
    absurdamente perto, e `velocidadeMin` Ã© o piso duro, para o caso de a
    geometria ainda produzir uma soluÃ§Ã£o mansa.

    Os dois juntos garantem que a bola sai da zona de alcance do prÃ³prio
    cabeceador dentro do `touchLock`.
    */
    alcanceMin: 3.5,        // metros â€” nunca se cabeceia para mais perto do que isto
    velocidadeMin: 7.0,     // m/s Ã  saÃ­da, piso duro

    /*
    Tecto da velocidade de saÃ­da de uma cabeÃ§ada, em m/s. Uma cabeÃ§ada leva a
    velocidade da testa e do tronco, nÃ£o de uma perna a rodar: 13 m/s Ã© o topo.

    Sem este tecto a DISTÃ‚NCIA PEDIDA mandava na velocidade, e a geometria de um
    Ã¢ngulo descendente fixo Ã© implacÃ¡vel â€” a sair a -9Â° de 1.62 m, a bola chega
    no mÃ¡ximo a ~9.5 m mesmo com velocidade infinita. Pedir 9 m dava **69 m/s**.
    Com o tecto, Ã© a distÃ¢ncia que cede: a bola cai mais perto, ainda para baixo,
    que Ã© o que interessa.
    */
    velocidadeMax: 13.0,

    /*
    A FAIXA DE ALTURA ONDE O CONTACTO CONTA COMO CABECEIO, em metros a contar
    de ALTURA_TESTA (1.74). Abaixo dela Ã© peito; acima, a bola passa por cima
    da cabeÃ§a e nÃ£o hÃ¡ contacto nenhum.

    E Ã‰ ASSIMÃ‰TRICA, porque a cabeÃ§a tambÃ©m Ã©. Medido no rig (ver
    ALTURA_TESTA, js/config/physics.js): da testa ao topo do crÃ¢nio sÃ£o 5 cm,
    da testa ao queixo sÃ£o 27. Uma bola que desce um palmo abaixo da testa
    ainda Ã© cabeceÃ¡vel â€” ele levanta o queixo â€”, e uma que passa um palmo
    acima do crÃ¢nio jÃ¡ nÃ£o.

    Era uma Ãºnica `janelaContacto: 0.22` simÃ©trica. Com a testa errada em 1.62
    (a boca) dava a faixa 1.40 â€“ 1.84: o fundo por baixo do queixo, o tecto a
    raspar o crÃ¢nio. SimÃ©trica na testa certa daria 1.52 â€“ 1.96 e abria um
    buraco de 14 cm entre o tecto do peito (`peitoAlturaLivre` = 1.38) e o
    fundo do cabeceio â€” bolas a 1.45 m dominadas com o PÃ‰. Os dois valores
    abaixo mantÃªm o fundo em 1.40, encostado ao peito como estava, e trazem o
    tecto para o crÃ¢nio mais o raio da bola (1.79 + 0.11 = 1.90).
    */
    janelaAbaixo: 0.34,   // 1.74 - 0.34 = 1.40, o fundo, encostado ao peito
    janelaAcima: 0.16,    // 1.74 + 0.16 = 1.90, o crÃ¢nio mais o raio da bola

    /*
    E A BOLA TEM DE ESTAR AO ALCANCE DA TESTA.

    Relato: *"os jogadores parecem que estÃ£o a cabecear de ombro; a cabeÃ§ada Ã©
    com a bola a tocar na testa"*. Medido com
    `tools/scratch/cabecada_altura.js`, 47 cabeceios em 40 min: a bola estava
    em mÃ©dia a **0.73 m** do eixo da cabeÃ§a (mÃ­nimo 0.34) e 0.40 m acima do
    pescoÃ§o. Em 47, ZERO tinham contacto a sÃ©rio. NÃ£o era de ombro â€” era de ar.

    A causa: o cabeceio sÃ³ verificava a ALTURA (`janelaContacto` Ã  volta da
    testa) e herdava o raio genÃ©rico de contacto, `BallControl.reach` = 0.9 m,
    que Ã© o alcance do CORPO inteiro. A 0.9 m a bola passa ao lado dele.

    O valor sai da mediÃ§Ã£o, e Ã© um compromisso assumido. O contacto geomÃ©trico
    puro â€” raio da bola (0.11) mais meia cabeÃ§a (0.13) â€” dÃ¡ 0.24, e com folga
    para o pescoÃ§o 0.32. SÃ³ que a 0.32 o cabeceio DESAPARECE do jogo: medido
    com `tools/scratch/cabecada_aproximacao.js`, das 152 passagens da bola pela
    altura da testa com alguÃ©m a menos de 3 m, sÃ³ 3% tÃªm alguÃ©m a 0.32 m ou
    menos. A 0.50 m sÃ£o 26% â€” e Ã© aÃ­ que estÃ¡ o degrau da distribuiÃ§Ã£o:

        0.32 m ->  3%      0.75 m -> 27%
        0.50 m -> 26%      0.90 m -> 29%   (o valor antigo, sem filtro nenhum)

    0.75 Ã© a bola a passar ao lado da cabeÃ§a, e nÃ£o o meio da testa â€” e fica
    assim por uma razÃ£o que Ã© preciso dizer: o que falta nÃ£o Ã© o raio, Ã© a
    PONTARIA com que o jogador se coloca debaixo da bola. Medido depois de
    tudo o resto corrigido (`tools/scratch/cabecada_gate.js`): quando a bola
    desce pela altura da testa, o mais perto que alguÃ©m estÃ¡ sÃ£o 0.60 m, com
    mediana em 0.74. Com o raio em 0.45 o cabeceio deixa simplesmente de
    existir â€” zero em 40 minutos â€”, o que Ã© pior para o jogo do que o defeito
    de origem.

    O que estas correcÃ§Ãµes garantem, e nÃ£o Ã© pouco: a bola estÃ¡ MESMO Ã 
    altura da testa quando Ã© cabeceada (antes contava como testa qualquer bola
    acima da cabeÃ§a, atÃ© 0.96 m acima dela), e ninguÃ©m toca numa bola que lhe
    passa por cima. Falta pÃ´r o jogador debaixo dela com meio metro de
    precisÃ£o, e isso Ã© obra de outro tamanho: o alvo aÃ©reo, o steering na
    chegada e o salto.
    */
    // Cabeceio EM SALTO: o corpo nao gira no ar. `giroMaxNoAr` (rad) e quanto se ajusta no contacto; a bola a mais de `anguloMaxNoAr` (rad, ~70 graus) da frente do salto passa.
    giroMaxNoAr: 0.45,
    giroMaxDePe: 0.90,
    anguloMaxNoAr: 1.22,
    raioContacto: 0.90,

    /*
    A LEITURA DA TRAJECTÃ“RIA, para quem cabeceia â€” ver `pontoDeCabeceio`
    (utils.js). Os nÃºmeros sÃ£o os irmÃ£os dos do guarda-redes
    (`GoalkeeperDive.erroRaioBase/erroRaioSkill/erroTempoCheio`), com o erro um
    pouco maior: ler um cruzamento a correr de costas para a bola Ã© mais
    difÃ­cil do que ler um remate de frente.

    `tempoCheio` Ã© o voo a partir do qual o erro estÃ¡ no mÃ¡ximo: uma bola que
    demora dois segundos a chegar admite engano; uma que chega em 0.3 s jÃ¡ estÃ¡
    quase em cima e vÃª-se bem.
    */
    leitura: {
        erroBase: 1.10,      // metros de erro a INTERCEPT 50, no voo longo
        erroPorSkill: 0.80,  // quanto encolhe por cada 50 pontos acima de 50
        tempoCheio: 1.20     // segundos de voo a partir dos quais o erro satura
    },

    /*
    QUÃƒO PERTO DO PONTO DE QUEDA ELE TEM DE ESTAR ANTES DE PARAR.

    Estava 1.0 m, escrito Ã  mÃ£o no `actReceivePass`: ele chegava a um metro do
    sÃ­tio e ficava quieto ("senÃ£o o steerArrive fica a corrigir centÃ­metros").
    Com o raio de contacto a 0.9 m, cabecear a 0.75 m era o normal â€” as duas
    tolerÃ¢ncias somavam-se e a bola nunca chegava Ã  testa.

    Agora pÃ¡ra dentro do prÃ³prio raio de contacto: aÃ­ a bola VEM Ã  cabeÃ§a. A
    oscilaÃ§Ã£o que a nota antiga temia continua tratada â€” quem estÃ¡ dentro da
    tolerÃ¢ncia pÃ¡ra a velocidade, nÃ£o fica a corrigir.
    */
    toleranciaPonto: 0.30,

    /*
    E A DE SAIDA, a histerese da anterior: quem ja esta parado debaixo da bola
    so volta a mexer-se se ela o puser a mais de 0.60 m do ponto. Com uma so
    fronteira, a 0.30, ele ficava exactamente nela e alternava IDLE e
    MOVE_TO_POS a cada poucos frames â€” o jogador a tremer enquanto espera.
    Ver `jaEstaSobAPonto` (bt/player_bt.js).
    */
    toleranciaSaida: 0.60,

    /*
    Anti Ping-Pong AÃ©reo:
    - Limite estrito de no mÃ¡ximo 2 cabeceios seguidos na mesma disputa aÃ©rea
    - ApÃ³s o limite, obriga domÃ­nio de peito ou queda no pÃ© para continuar jogando no chÃ£o
    */
    maxHeadersSeguidos: 2,
    cooldownDisputa: 2.2
};

/*
Mergulho do guarda-redes (ver js/gk_dive.js).

Substitui o mergulho antigo, que era `gkCorpo.position.x += dirX * v * dt` â€”
um deslize lateral imposto por frame, sem agachar, sem impulso e sem voo, com
o corpo jÃ¡ rodado antes de sair do sÃ­tio. E a rotaÃ§Ã£o era composta em Euler
(`pelvis.rotation.z` do lado + `pelvis.rotation.x` do pitch), o que torcia o
boneco: dois eixos aplicados em sequÃªncia nÃ£o dÃ£o a queda num plano sÃ³.

Agora: fases (ler, impulso, voo, chÃ£o, levantar), centro de massa balÃ­stico
(`p = p0 + v0Â·t + Â½gÂ·tÂ²`) e UMA rotaÃ§Ã£o Ã  volta de UM eixo â€” o eixo frontal
do prÃ³prio modelo. Com um sÃ³ eixo Ã© geometricamente impossÃ­vel ficar torto.
*/

const XGModel = {
    base: 0.55,
    pesoLogAngulo: 1.10,
    pesoDistancia: 0.10,

    // Um remate de trÃ¡s da linha de fundo nÃ£o tem Ã¢ngulo nenhum; o piso evita
    // o ln(0) e dÃ¡-lhe um valor desprezÃ¡vel em vez de -Infinity.
    anguloMinimo: 0.02
};

/*
Geometria do canto (pontoDeCanto) foi movida para js/utils.js (ver docs/auditoria_config_match.md item 5).
*/

/*
=============================================================================
FALTA DIRECTA â€” a cobranÃ§a por cima da barreira
=============================================================================
A falta que toda a gente reconhece: 17 a 23 m, de frente, barreira de cinco,
guarda-redes a fechar o outro canto. O ramo FREE_KICK do `setupSetPiece` sabe
montar uma falta em qualquer sÃ­tio do campo e decide entre remate, cruzamento
e passe; isto Ã© o caso de estudo dessa cobranÃ§a directa, montado de propÃ³sito
e com desfecho resolvido Ã  mÃ£o, como no penÃ¡lti.

PorquÃª resoluÃ§Ã£o prÃ³pria, outra vez: os pesos do remate em jogo corrido nÃ£o
descrevem uma bola parada a 20 m com cinco homens Ã  frente. O que decide Ã© o
duelo TÃ‰CNICA do batedor contra o GK, e daÃ­ sai UM dos doze desfechos.

Ver:
  pontoDaFaltaDirecta / lugaresDaBarreira / desfechoDaFaltaDirecta  (utils.js)
  baterFaltaDirecta                                                (player.js)
  ramo DIRECT_FREE_KICK do setupSetPiece                (match_setpieces.js)
*/
const DirectFreeKickModel = {
    /*
    ONDE A BOLA FICA. Sorteio dentro da faixa clÃ¡ssica:

      |x| <= xMaxDoCentro          atÃ© 10 m do centro da baliza, para os lados
      distÃ¢ncia ao POSTE MAIS PERTO <= distPosteMax (23 m)
      fora da grande Ã¡rea, com `folgaArea` de margem

    O corte do poste Ã© o que faz a faixa: de frente chega-se aos ~23 m da
    linha, e quanto mais aberto menos fundo se pode estar. Ver
    pontoDaFaltaDirecta (utils.js).
    */
    xMaxDoCentro: 10.0,
    distPosteMax: 23.0,
    folgaArea: 0.8,

    /*
    A BARREIRA. Cinco homens, a 9.15 m da bola, na linha bola->baliza mas
    DESLOCADA para fechar o canto do remate: a ponta de fora fica na linha
    bola->poste mais perto, com `sobraPoste` de margem para lÃ¡ dela. Ã‰ isso
    que o guarda-redes grita a montar â€” ele fica com o canto do outro lado,
    que Ã© o que consegue cobrir a mergulhar.

    `alturaParado` Ã© o topo da cabeÃ§a da barreira; `alturaSalto` Ã© com o pulo.
    Um remate que passe por baixo de `alturaSalto` quando a barreira jÃ¡ estÃ¡
    no ar Ã© o desfecho `por_baixo`.
    */
    barreiraN: 5,
    distanciaBarreira: 9.15,

    /*
    ONDE O GUARDA-REDES FICA (pedido): a barreira fecha UM lado, e ele cobre o
    OUTRO. Ficava ao meio, como num penÃ¡lti, e ao meio ele nÃ£o cobre nem um
    nem outro â€” a barreira jÃ¡ tapa metade do que ele taparia dali.

    `deslocamentoGk` Ã© quanto ele se afasta do eixo para o lado ABERTO (o
    contrÃ¡rio do lado de onde se bate, que Ã© o que a barreira fecha).
    */
    deslocamentoGk: 1.8,
    espacamentoBarreira: 0.55,
    sobraPoste: 0.45,
    alturaParado: 1.95,
    alturaSalto: 2.55,
    /*
    A folga era 0.30 e nao cabia: a 17.5 m, com a elevacao maxima de um remate,
    a bola passa a 2.64 m sobre uma barreira que salta ate 2.55. Nao ha
    trajectoria que limpe 2.85 e ainda caia dentro da baliza dali â€” o que ha e
    uma falta batida rente as cabecas, que e o que se ve na televisao.
    */
    folgaSobreBarreira: 0.08,   // por cima do topo, quando a bola tem de passar

    /*
    A COBRANÃ‡A TEM DE SAIR MAIS FORTE (pedido).

    Medido: 18,4 m/s de mÃ©dia, a 25,1Â° â€” uma bola lobada. A causa nÃ£o Ã© a
    balÃ­stica, Ã© a BARREIRA: para o mesmo ponto da baliza, cada grau a menos de
    elevaÃ§Ã£o Ã© mais velocidade, e Ã© a altura a limpar que impÃµe o Ã¢ngulo. A
    20 m, com o alvo a 1,5 m:

        limpar 2,63 m (barreira a saltar + folga)   ~24Â°   19,6 m/s
        limpar 2,43 m                               ~21Â°   21,5 m/s
        limpar 2,11 m (barreira sem saltar)         ~18Â°   22,8 m/s

    Por isso o pedido resolve-se assim: procura-se na mesma a elevaÃ§Ã£o mais
    baixa que limpa a barreira A SALTAR, e SE a velocidade que sai daÃ­ ficar
    abaixo de `forcaMinima`, baixa-se o que se exige limpar â€” atÃ©
    `alturaMinimaSobreBarreira`, que Ã© a barreira PARADA mais o raio da bola.

    Ã‰ a troca que um batedor faz mesmo: bater mais tenso Ã© passar mais rente,
    e passar mais rente Ã© arriscar a barreira. O desfecho `na_barreira` jÃ¡
    existe, e Ã© ele que paga esse risco.
    */
    forcaMinima: 30.0,
    alturaMinimaSobreBarreira: 2.10,

    /*
    O SALTO DA BARREIRA. Todos saltam, com um atraso a contar do contacto â€”
    Ã© o atraso que abre a janela do remate rasteiro por baixo.
    */
    atrasoSaltoBarreira: 0.12,
    alturaSaltoBarreira: 0.42,   // apex do pulo, em metros

    /*
    A que velocidade a bola CHEGA a linha no remate por baixo da barreira. Ela
    vai rasteira (ver tiroDaFaltaDirecta), portanto o que se pede e o ritmo de
    chegada, como num passe rasteiro â€” so que de remate.
    */
    vChegadaPorBaixo: 19.0,

    /*
    O REMATE. `potencia` Ã© a velocidade de saÃ­da; a elevaÃ§Ã£o sai da geometria
    (tem de limpar a barreira e cair no ponto pedido) e Ã© procurada entre
    `elevMin` e `elevMax` â€” acima disso jÃ¡ nÃ£o Ã© uma falta batida, Ã© um
    balÃ£o.
    */
    potencia: 26.0,
    elevMin: 4 * Math.PI / 180,
    elevMax: 30 * Math.PI / 180,

    /*
    A COBRANÃ‡A TENSA â€” a folha seca, e a razÃ£o de ela existir.

    Com balÃ­stica de arrasto puro, a velocidade e a elevaÃ§Ã£o ficam presas ao
    ponto de chegada: limpar a barreira a 9.15 m e cair na baliza a 20 m obriga
    a ~22 graus, e a ~22 m/s. Medido antes disto: **19.1 m/s a 23.7 graus** no
    sorteio inteiro â€” uma bola lobada, que nÃ£o Ã© o que se vÃª numa falta.

    Subir a `forcaMinima` nÃ£o resolve: ela Ã© um LIMIAR, nÃ£o um alvo â€” acima do
    que a geometria dÃ¡, nenhuma elevaÃ§Ã£o qualifica e cai-se na lobada na mesma
    (medido: com o limiar a 26, a mÃ©dia BAIXOU de 23.0 para 22.0 m/s).

    O que solta a velocidade Ã© a queda extra, que Ã© o que um batedor pÃµe na
    bola com efeito: bate-se COM A FORÃ‡A que se tem (`potencia` mais o atributo
    FOR), escolhe-se a elevaÃ§Ã£o mais baixa que ainda limpa a barreira, e a
    gravidade EFECTIVA Ã© procurada para a bola cair no ponto pedido. Ver
    `tiroTensoDaFaltaDirecta` (utils.js) e o `freeKickDip` na fÃ­sica.

    `dipMax` Ã© o tecto da queda extra: acima disso a bola jÃ¡ nÃ£o desenha uma
    falta, cai como uma pedra.
    */
    potenciaPorForca: 5.0,   // m/s de variaÃ§Ã£o com o atributo FOR
    dipMax: 24.0,            // m/sÂ² de queda extra, no mÃ¡ximo

    /*
    A CURVA LATERAL (efeito). Alem da queda da folha seca, a bola vira para o canto aberto: sai
    ao lado/por cima da barreira e fecha para o outro poste. `curvaGraus*` e o giro total do rumo
    ao longo do voo, e sobe com a TEC do batedor (de TEC 40 a TEC 95). Ver `curvaDaFaltaDirecta`
    (utils.js) e `Match.freeKickCurve` na fisica.
    */
    curvaActiva: true,
    curvaGrausMin: 16.0,
    curvaGrausMax: 38.0,
    curvaTecMin: 40,
    curvaTecMax: 95,

    /*
    O GUARDA-REDES REAGE TARDE, E O ATRASO SAI DA TÃ‰CNICA DELE.

    No penÃ¡lti o `gkDelayReacao` Ã© zero: ele sabe que a bola vem e parte com
    ela. Numa falta a bola aparece por cima da barreira e ele perde-a de vista
    â€” por isso aqui hÃ¡ atraso, e Ã© a habilidade (GK) que o encurta.

        atraso = atrasoBase - ((GK - 50) / 50) * atrasoAmplitude

    clampado em [atrasoMin, atrasoMax]. Um GK de 100 reage em 0.12 s, um de 0
    em 0.72 s.
    */
    atrasoBase: 0.42,
    atrasoAmplitude: 0.30,
    atrasoMin: 0.12,
    atrasoMax: 0.72,

    /*
    E O TECTO DO ATRASO QUANDO O DESFECHO Ã‰ UMA DEFESA.

    O atraso Ã© o mesmo â€” sai da habilidade â€” mas nÃ£o pode ser maior do que a
    janela em que ainda dÃ¡ para lÃ¡ chegar: um GK que parte 0.5 s depois de uma
    bola que leva 0.9 s a chegar jÃ¡ nÃ£o defende nada, e o desfecho sorteado
    dizia "defesa". Medido antes deste tecto: 16 dos 21 desfechos `defesa` de
    um lote acabavam em GOLO.

    `fraccaoAtrasoDefesa` Ã© a parte do tempo de voo que o atraso pode ocupar
    nesses dois desfechos. Nos outros dez o atraso Ã© o cheio â€” Ã© ele que faz a
    falta directa ser diferente do penÃ¡lti.
    */
    fraccaoAtrasoDefesa: 0.22,

    /*
    E QUANDO O DESFECHO NÃƒO Ã‰ DEFESA, PARA QUE LADO Ã‰ QUE ELE VAI?

    Relato: *"o goleiro ainda estÃ¡ pulando para o lado contrÃ¡rio do
    deslocamento da bola nas faltas e chutes"*.

    Estava assim, e de propÃ³sito: `penaltyDiveX = defende ? alvo.x : -alvo.x`.
    Espelhar o alvo garantia que um golo sorteado nÃ£o era defendido por
    acidente â€” mas garantia tambÃ©m que, em DEZ dos doze desfechos, ele se
    atirava exactamente para o lado oposto ao da bola. Sempre. Um guarda-redes
    engana-se no lado Ã s vezes; nÃ£o se engana todas as vezes.

    Agora o lado Ã© o CERTO, e o que o impede de defender Ã© o que o impede na
    realidade: parte tarde (o atraso cheio, sem o tecto do `fraccaoAtrasoDefesa`)
    e nÃ£o chega lÃ¡. SÃ³ nesta fracÃ§Ã£o dos casos Ã© que ele lÃª mal e sai para o
    outro lado â€” e aÃ­ vÃª-se um guarda-redes batido, que Ã© uma coisa que
    acontece, em vez de um que parece nÃ£o estar a ver o jogo.
    */
    probLadoErrado: 0.25,

    /*
    E A DEFESA ACONTECE MESMO.

    O atraso curto punha o guarda-redes a partir a tempo, mas o mergulho ainda
    tem de LA CHEGAR: medido, 11 dos 15 desfechos `defesa` acabavam em golo,
    com ele a cair atras da bola. Um desfecho sorteado que sai ao contrario
    metade das vezes nao e um desfecho, e uma sugestao.

    Por isso a defesa e resolvida como no penalti â€” a mao â€” no frame em que a
    bola chega a `distanciaDaDefesa` da linha: `defesa` e espalmada para o
    campo, `defesa_fora` sai pela linha de fundo (canto). O mergulho continua a
    correr por cima, e e ele que se ve.
    */
    /*
    1.6 m era TARDE DEMAIS. O gesto de mÃ£os do prÃ³prio guarda-redes resolve o
    contacto a `1.3` m da mÃ£o (ver `resolverDefesaComMaos`), e com ele de pÃ© na
    linha isso acontece a ~1.8 m dela â€” ou seja ANTES desta janela. Medido no
    desfecho `defesa_fora`: 3 cantos em 20, com as outras 17 a acabarem
    agarradas por ele, que Ã© o desfecho `defesa` e nÃ£o este.

    A 2.8 m a janela do plano vem primeiro e o desfecho sorteado Ã© o que
    acontece. O mergulho continua a correr por cima â€” Ã© ele que se vÃª.
    */
    distanciaDaDefesa: 1.6,
    // E tambem se resolve quando a bola chega ao alcance da mao dele, que e
    // onde uma defesa se ve (ver o ramo da defesa no Match.update).
    alcanceDaDefesa: 1.4,
    espalmarVelocidade: 9.0,

    /*
    OS DOZE DESFECHOS, por banda do duelo `diff = (TEC + d10) - (GK + d10)`.

    A mesma ideia do penÃ¡lti (ver baterPenalti), com os casos que sÃ³ existem
    quando hÃ¡ barreira: bater nela, desviar nela para dentro ou para fora, e
    passar-lhe por baixo enquanto ela salta.

    Os pesos sÃ£o relativos dentro de cada banda â€” nÃ£o tÃªm de somar 100.
    */
    desfechos: {
        perfeito: {   // diff > 5
            gol: 119, defesa: 12, defesa_fora: 8,
            trave_gol: 18, trave_fora: 4, travessao_gol: 11, travessao_fora: 3,
            fora: 6, na_barreira: 10, barreira_gol: 13, barreira_fora: 6,
            por_baixo: 18
        },
        bom: {        // diff 3..5
            gol: 77, defesa: 16, defesa_fora: 9,
            trave_gol: 11, trave_fora: 6, travessao_gol: 6, travessao_fora: 5,
            fora: 10, na_barreira: 14, barreira_gol: 11, barreira_fora: 7,
            por_baixo: 11
        },
        medio: {      // diff 1..2
            gol: 48, defesa: 18, defesa_fora: 10,
            trave_gol: 6, trave_fora: 7, travessao_gol: 3, travessao_fora: 6,
            fora: 14, na_barreira: 18, barreira_gol: 6, barreira_fora: 7,
            por_baixo: 6
        },
        fraco: {      // diff 0..-2
            gol: 29, defesa: 18, defesa_fora: 10,
            trave_gol: 3, trave_fora: 7, travessao_gol: 3, travessao_fora: 7,
            fora: 18, na_barreira: 20, barreira_gol: 3, barreira_fora: 8,
            por_baixo: 6
        },
        mau: {        // diff -3..-4
            gol: 13, defesa: 16, defesa_fora: 8,
            trave_gol: 3, trave_fora: 6, travessao_gol: 3, travessao_fora: 8,
            fora: 26, na_barreira: 22, barreira_gol: 3, barreira_fora: 8,
            por_baixo: 3
        },
        pessimo: {    // diff <= -5
            gol: 6, defesa: 20, defesa_fora: 8,
            trave_gol: 3, trave_fora: 5, travessao_gol: 3, travessao_fora: 7,
            fora: 30, na_barreira: 24, barreira_gol: 3, barreira_fora: 8,
            por_baixo: 3
        }
    },

    /*
    ONDE CADA DESFECHO APONTA, no plano da baliza (x do eixo, y do chÃ£o).

    `margemDentro` Ã© o quanto a bola passa por DENTRO do poste/travessÃ£o
    quando o desfecho Ã© "bate e entra"; `margemFora` o quanto passa por fora.
    A trave fÃ­sica estÃ¡ em 3.66 e o travessÃ£o em 2.44 â€” como no penÃ¡lti, o
    alvo tem de ficar quase em cima deles para o impacto acontecer.
    */
    /*
    `margemDentro` tem de ser maior do que o RAIO DA BOLA (0.11), senÃ£o o
    remate que devia passar rente por dentro bate mesmo no ferro: medido, os
    dois `travessao_gol` de um lote batiam no travessÃ£o e voltavam ao campo.
    */
    margemDentro: 0.30,
    margemFora: 0.10,
    alturaGoloMin: 0.9,      // um remate por cima da barreira nÃ£o chega rasteiro
    alturaGoloMax: 2.25,

    /*
    O REMATE QUE VAI A GOLO NÃƒO PODE IR PARA CIMA DO GUARDA-REDES.

    Medido: dos nove desfechos `gol` de um lote de 120, sÃ³ quatro acabavam em
    golo. A razÃ£o nÃ£o era a balÃ­stica â€” era o alvo. Ele espera no MEIO da
    linha, e o `GoalkeeperPose.mergulhoLateralMin` (2.0 m) diz que uma bola a
    menos disso do corpo dele nÃ£o Ã© mergulho nenhum: fica de pÃ© e leva-lhe as
    mÃ£os. Um "golo" mirado a 0.8 m do eixo era uma defesa fÃ¡cil, de pÃ©.

    Por isso os remates de golo saem sempre para lÃ¡ dessa distÃ¢ncia, e Ã© a
    mesma razÃ£o pela qual um jogador nÃ£o bate uma falta ao centro da baliza.
    */
    xGoloMin: 2.35,          // fora do alcance de quem estÃ¡ de pÃ© no meio
    xGoloMax: 3.30,          // dentro dos postes, com folga

    /*
    E O QUE ELE DEFENDE tem de estar ao alcance dele: os dois desfechos de
    defesa miram a faixa entre `defesaXMin` e `defesaXMax`, que Ã© onde um
    mergulho chega a tempo com o atraso da reacÃ§Ã£o. Sem este tecto, metade
    das "defesas" sorteadas acabavam em golo â€” a bola ia ao Ã¢ngulo e ele
    partia tarde, que Ã© exactamente o que o desfecho NÃƒO dizia.
    */
    defesaXMin: 2.2,
    defesaXMax: 3.0,
    defesaYMax: 1.7,

    foraLargura: 1.6,        // quanto passa ao lado quando vai fora
    foraAltura: 1.1,         // e por cima do travessÃ£o

    /*
    O DESVIO NA BARREIRA. A bola bate num dos cinco e muda de direcÃ§Ã£o:
    `desvioAngulo` Ã© o desvio lateral mÃ¡ximo e `desvioSubida` o quanto sobe
    (um desvio na cabeÃ§a levanta a bola).
    */
    desvioAngulo: 12 * Math.PI / 180,
    desvioSubida: 3.2,
    barreiraTravagem: 0.55,   // a bola bate e perde isto da velocidade

    /*
    A BOLA QUE BATE NA BARREIRA NÃƒO VOLTA PARA QUEM BATEU.

    Estava a ser devolvida na linha do remate, invertida: ia direita ao
    batedor, que a cabeceava para dentro sozinho. Um ressalto numa barreira sai
    de LADO â€” bate num ombro, numa perna, numa cabeÃ§a, e a bola cospe para a
    linha lateral, para a Ã¡rea ou para as mÃ£os do guarda-redes.

    `ricocheteAnguloMin/Max` Ã© o desvio em relaÃ§Ã£o Ã  direcÃ§Ã£o do remate: nunca
    menos de 65Â°, portanto nunca dentro do cone de onde a bola veio.
    */
    ricocheteAnguloMin: 65 * Math.PI / 180,
    ricocheteAnguloMax: 115 * Math.PI / 180,
    ricocheteParaGK: 0.30,     // fracÃ§Ã£o dos ressaltos que sobra para o GK

    /*
    OS COMPANHEIROS DE QUEM BATE nÃ£o podem ficar em fora-de-jogo nem tapar a
    cobranÃ§a. Ficam por trÃ¡s da linha da bola (`recuoOnside` metros atrÃ¡s dela,
    portanto sempre com bola Ã  frente) e fora do corredor bola->baliza
    (`corredorLivre` de meia-largura).

    MAS SÃ“ ALGUNS. Punham-se lÃ¡ os NOVE, num leque de 40 m atrÃ¡s da bola â€” e
    isso arrastava o jogo todo com eles: cada um levava atrÃ¡s o seu marcador
    (ver `raioDaMarcacao`), e o que se via era a equipa que defende com os
    laterais na bandeirola de canto e o bloco rasgado ao meio. Um leque de
    faltas tem trÃªs ou quatro homens Ã  volta da bola; o resto da equipa fica
    onde o bloco os pÃµe.
    */
    apoiosNoLeque: 4,
    recuoOnside: 2.5,
    corredorLivre: 5.0,
    espacamentoApoio: 5.5,

    /*
    A MARCAÃ‡ÃƒO. Os defensores que sobram da barreira marcam os atacantes:
    ficam `distanciaMarcacao` metros do seu homem, do lado da prÃ³pria baliza.

    `raioDaMarcacao` Ã© o que impede a marcaÃ§Ã£o de puxar um defensor para o
    outro lado do campo: sÃ³ se marca quem estÃ¡ a menos disto da bola. O resto
    da defesa fica na posiÃ§Ã£o do bloco â€” um lateral a marcar um extremo que
    estÃ¡ a 45 m da bola Ã© um buraco na Ã¡rea, nÃ£o Ã© marcaÃ§Ã£o.
    */
    raioDaMarcacao: 25.0,
    distanciaMarcacao: 1.8,

    /*
    E QUEM NAO MARCA NEM FAZ BARREIRA VOLTA.

    Media medida na montagem, antes disto: o defensor mais longe da bola estava
    a 64 m dela â€” do outro lado do campo, com a falta a 20 m da propria baliza.
    E o "o azul nao voltou para marcar" do relato: quem estava subido quando a
    falta foi marcada ficava la.

    Estes ficam numa linha a `recuoLinhaDefensiva` metros da linha de fundo (a
    orla da propria area), espalhados por `larguraLinhaDefensiva` â€” o desenho
    de quem espera um cruzamento, nao o bloco do jogo corrido.
    */
    recuoLinhaDefensiva: 18.5,
    larguraLinhaDefensiva: 28.0
};

/*
A CURVA DOS PASSES LONGOS PELO ALTO (lancamentos e lobados). Ver o fim de executePassGameplay (fsm.js).
distMin e a distancia minima do passe; grausMin/Max o giro total do rumo ao longo do voo (sobe com o atributo e a distancia).
*/
const PassCurva = { activa: true, distMin: 4, grausMin: 8, grausMax: 20, distRef: 50, grausRasteiro: 5 };

