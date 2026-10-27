/*
=============================================================================
CROWD — 10 000 adeptos com o modelo dos jogadores, que reagem ao jogo
=============================================================================
O público era um boneco simplificado próprio (`createSpectatorGeometry`, seis
caixas fundidas numa peça só e uma cor por adepto). Aqui usa-se o MODELO DOS
JOGADORES — o mesmo `buildBody`, em quatro poses.

O PROBLEMA DA COR, e como se resolve: um InstancedMesh tem uma geometria e um
material, e `setColorAt` dá UMA cor por instância. O modelo do jogador tem
quatro cores independentes (pele, camisa, calção, cabelo), portanto não cabe
num InstancedMesh só.

    A solução é um InstancedMesh POR CANAL DE COR.

Fundem-se as peças do corpo em quatro geometrias — as de pele numa, as de
camisa noutra, e assim — e criam-se quatro InstancedMesh com a MESMA matriz por
instância. Cada um leva a sua cor: o adepto 7 tem a camisa vermelha no mesh das
camisas e a pele morena no mesh das peles, e as quatro peças coincidem no
espaço porque partilham a matriz.

Custo: 4 draw calls para 10 000 adeptos, e a geometria é construída UMA vez.

-----------------------------------------------------------------------------
O PROBLEMA DO MOVIMENTO, e como se resolve
-----------------------------------------------------------------------------
As poses são ASSADAS na geometria. Não há hierarquia nem rig por adepto —
monta-se um esqueleto temporário de Object3D, poem-se-lhe as rotações da pose,
deixa-se o THREE calcular as matrizes de mundo, e cada caixa é transformada por
essa matriz antes de ser fundida. A hierarquia existe só durante a construção e
é deitada fora.

Sem rig não há como animar do lado da CPU sem reescrever as matrizes de
instância — 10 000 × 4 malhas = 40 000 `setMatrixAt` por frame. Está fora de
questão.

    TODO O MOVIMENTO VIVE NO VERTEX SHADER.

A mesma função de construção é chamada QUATRO vezes, com quatro dicionários de
ângulos: sentado, idle, de pé e a festejar. Como são as mesmas caixas pela
mesma ordem, os vértices correspondem 1:1 entre as quatro — servem de morph
target directo. A geometria leva `position` (sentado) e mais três atributos de
vértice com as outras poses, e o shader interpola.

    ISTO É A INVARIANTE QUE PARTE TUDO SE FOR QUEBRADA: as quatro poses têm de
    dar EXACTAMENTE o mesmo número de vértices por canal. Se divergirem, o
    morph lê fora do sítio e os adeptos explodem em picos. Ver
    tests/crowd_vida.test.js.

Quem está de pé sai de uma COMPARAÇÃO no shader, não de um valor guardado por
instância: cada adepto tem um limiar fixo, e levanta-se se o limiar for menor
que a fracção que a claque tem no momento. Assim mudar de "ninguém de pé" para
"metade de pé" custa DOIS uniforms, não 10 000 escritas. As matrizes de
instância nunca mudam e continuam `StaticDrawUsage`.

Repouso, expectativa e golo são o MESMO mecanismo com três valores de fracção.
Não há casos especiais.
=============================================================================
*/

const _zeroM = new THREE.Matrix4();

const CrowdModel = {
    // TESTE DE DESEMPENHO: o adepto com o corpo dos jogadores na versao leve (888 triangulos) em vez do boneco de caixas (468). `false` volta ao de sempre.
    modeloJogador: true,
    // Fatias da torcida (adeptos por malha) e o alcance do corte em multiplos do viewport: so se desenha ate 1.2x o ecra.
    tamanhoDaFatia: 600,
    detalheAte: 60,        // metros: mais longe que isto a fatia usa o shader simplificado (sem aplausos nem cabecas a virar)
    viewportCull: 0.9,     // so se desenha o que cai nos 90% centrais do ecra (pedido; era 1.2x)
    total: 10000,

    /*
    Cores das duas claques, iguais às camisolas das equipas (ver createTeams em
    match.js): TeamA de azul, TeamB de vermelho.
    */
    equipas: {
        A: { camisa: '#3498db', calcao: '#34495e' },
        B: { camisa: '#e74c3c', calcao: '#ffffff' }
    },

    /*
    DISTRIBUIÇÃO: 90% DA TORCIDA É DA CASA (TeamA) E 10% É DO VISITANTE (TeamB) — pedido: *"os jogos normalmente são com 90% de torcida do time da casa e 10% do visitante"*, e
    *"a torcida adversária toda junta no cantinho do lado direito do estádio, lado direito das câmeras"*.

    As câmeras ficam do lado +X; olhando para o campo dali, a DIREITA do ecrã é o -Z. O visitante ocupa por isso o CANTO onde a bancada do fundo -Z encontra a lateral das câmeras
    (+X): os lugares com `t` (posição em Z, 0 = o fundo -Z) até `visitanteT` E `u` (posição em X, 1 = o lado das câmeras) a partir de `visitanteU`. Nas duas bordas do canto há uma
    faixa curta (`visitanteMescla`, na mesma escala 0-1) onde a probabilidade cai linearmente, para não aparecer uma fronteira a direito. O resto do estádio é da casa. Os números
    foram afinados para dar ~10% dos adeptos (medido em `tests/crowd.test.js`).
    */
    // A fraccao de adeptos do visitante pedida (10%): o canto dele ajusta-se ao estadio para a dar (Crowd.build).
    fracVisitante: 0.10,
    // Passagem sem adeptos nas fronteiras do bloco visitante, com grade de cada lado e segurancas (um a cada `cadaFilas` filas).
    // Gente que entra e sai dos tuneis de acesso: quantos (escalado pela qualidade), metros/s, espera maxima (s) escondidos entre viagens, duracao (s) do aparecer/sumir na fila.
    caminhantes: { total: 200, velocidade: 1.1, esperaMax: 12, rampa: 0.5 },
    divisoria: { ativa: true, cadaFilas: 4, alturaGrade: 2.2, comprimentoGrade: 1.2, corGrade: 0x2b3036, afastaSeguranca: 0.5, colunaLivre: 0.85 },
    // O canto do visitante fica EM FRENTE das cameras (a bancada do outro lado do campo, -X) no canto da DIREITA do ecra (-Z), e nao atras delas (+X). `false` = o lado das cameras.
    visitanteEmFrente: true,
    visitanteT: 0.24,
    visitanteU: 0.68,
    visitanteMescla: 0.08,

    /*
    COMO SE VESTE O ADEPTO (pedido): metade com a camisa do clube, um quarto com a cor 1 e outro
    quarto com a cor 2; metade de calcas compridas (jeans, escuras, caqui) e os outros de calcao
    do clube; 20% de bone. As fraccoes sao sorteadas por adepto, na construcao.
    */
    torcida: {
        // AS CAMISAS DOS ADEPTOS (pedido): 50% com a camisa que o time usa neste jogo, 30% com outra camisa do time, 10% com uma cor do time que nao seja a dos jogadores
        // (camisa lisa) e 10% com a camisa do guarda-redes. Ver `coresDaEquipa` (os kits) e `recolorir`.
        camisas: { atual: 0.50, outra: 0.30, cor: 0.10, goleiro: 0.10 },
        calcaComprida: 0.50,
        bone: 0.20,
        calcas: ['#2c3e66', '#1f1f24', '#3a3f4a', '#8a7a5a', '#4a5568']
    },

    // Tons de pele e de cabelo, sorteados por adepto.
    peles: ['#f5cba7', '#e8b98a', '#c68642', '#8d5524', '#5c3317', '#ffdbac'],
    cabelos: ['#2f2f2f', '#1a1a1a', '#5b3a1e', '#8b5a2b', '#c9a227', '#eeeeee', '#7a4a2b'],

    /*
    Variação por adepto: sem isto 10 000 bonecos com a mesma cor exacta leem-se
    como um padrão impresso, não como gente. Multiplica-se a cor por um factor
    à volta de 1.
    */
    variacaoCor: 0.14,

    // Altura: nem toda a gente tem o mesmo tamanho.
    escalaMin: 0.88,
    escalaMax: 1.06,

    // Quanto o adepto pode rodar em relação à frente do lugar, em radianos.
    variacaoRotacao: 0.25,

    /*
    AS QUATRO POSES, em radianos.

    `sentado` é a base — é o `position` da geometria. A coxa vai quase à
    horizontal e o joelho devolve a canela à vertical: `anca` e `joelho` são
    simétricos de propósito, e é isso que põe o pé por baixo do joelho em vez
    de à frente dele.

    `alturaBacia` é onde a bacia fica em relação ao lugar, em unidades do
    modelo. Nas poses de pé sobe para 2.40 — com as pernas esticadas a bacia
    fica 2.3 unidades acima dos pés, e é isso que mantém os pés à altura a que
    já estavam sentados, em vez de o adepto afundar no degrau.

    `festa` roda o ombro para lá da vertical (-2.85 rad, mais de 160°), que é o
    que leva os braços acima da cabeça.
    */
    /*
    O SINAL DO COTOVELO ESTAVA INVERTIDO — relato: *"o braco dos torcedores
    esta pra tras"*.

    A convencao do rig, a mesma do modelo dos jogadores (ver a nota da
    `LateralPose` em config/animations.js): o cotovelo NEGATIVO dobra o
    antebraco para a FRENTE do braco. Estava positivo em todas as poses, logo
    o antebraco ia para tras.

    Medida a mao em z (frente = +z), em relacao ao ombro:

        pose      cotovelo    antes        invertido
        sentado     +0.85     -0.29 atras    +1.02
        idle        +1.05     -0.87 atras    +0.69
        dePe        +0.25     -0.02 atras    +0.43
        festa       +0.35     +0.72          +0.12

    A `festa` ja estava a frente porque o ombro a -2.85 levanta o braco por
    cima da cabeca; invertida, as maos ate sobem (y 5.55 -> 5.69, com a cabeca
    a 4.67). Invertem-se as quatro para a convencao ser UMA, em vez de tres
    corrigidas e uma pela regra antiga.
    */
    poses: {
        sentado: {
            anca: -1.45, joelho: 1.45, tronco: 0.12,
            ombro: -0.35, cotovelo: -0.85, alturaBacia: 1.55
        },
        /*
        `idle` é o sentado com o tronco mais à frente e os braços um pouco
        recolhidos. É o outro extremo da oscilação de repouso — ninguém no
        estádio fica alguma vez completamente imóvel.
        */
        idle: {
            anca: -1.45, joelho: 1.45, tronco: 0.26,
            ombro: -0.20, cotovelo: -1.05, alturaBacia: 1.53
        },
        dePe: {
            anca: 0.0, joelho: 0.0, tronco: 0.04,
            ombro: -0.15, cotovelo: -0.25, alturaBacia: 2.40
        },
        festa: {
            anca: 0.0, joelho: 0.0, tronco: -0.06,
            ombro: -2.85, cotovelo: -0.35, alturaBacia: 2.40
        },
        /*
        APLAUDIR: bracos a frente do peito, antebracos dobrados (as palmas). `palmasS` e o sentado a aplaudir, `palmasP` o de pe. O bater das palmas (os bracos a fecharem e a abrirem)
        e feito no shader, a partir destas poses. So posicoes (sem normais): o orcamento de atributos e de 16.
        */
        palmasS: {
            anca: -1.45, joelho: 1.45, tronco: 0.10,
            ombro: -1.05, cotovelo: -1.55, alturaBacia: 1.55
        },
        palmasP: {
            anca: 0.0, joelho: 0.0, tronco: 0.04,
            ombro: -1.05, cotovelo: -1.55, alturaBacia: 2.40
        }
    },

    /*
    ANIMAÇÃO. Tudo isto vai para uniforms; nada disto se lê por frame na CPU.

    `duracaoTransicao` é o tempo que um adepto leva a levantar-se ou a
    sentar-se. `amplitudeIdle` é quanto da pose `idle` entra na oscilação de
    repouso — 1.0 iria da pose sentada à idle e de volta, o que é exagerado.
    `bobDePe` é a oscilação vertical de quem está de pé à espera: pequena, só
    para não parecer um poste. `salto` é o do golo.
    */
    duracaoTransicao: 0.55,
    /*
    O CAOS (pedido: *"esta muito robotizado, varios torcedores ficando de pe juntos"*): cada adepto levanta-se e senta-se com um ATRASO proprio (ate `espalharLevantar` s depois de a bancada
    mudar) e com uma duracao propria (+-40% da `duracaoTransicao`), em vez de todos no mesmo instante.
    */
    espalharLevantar: 6.0,
    /*
    APLAUSOS E CABECAS: `fracao` dos adeptos aplaude em rajadas (sentados ou de pe, conforme estejam), a intensidade global `repouso`/`entrada` (1.0 e a entrada dos times); `olhaParaTras` e a
    fracao que de vez em quando vira a cabeca para tras. Tudo sorteado por adepto no shader.
    */
    // `fracao`: a que aplaude na entrada dos times; `perigo`: a que aplaude (em continuo) numa claque quando o seu time tem um lance perigoso (ataque no terco ofensivo). No jogo normal ninguem aplaude.
    aplauso: { fracao: 0.16, perigo: 0.50, repouso: 0.6, entrada: 1.0 },
    olhaParaTras: 0.12,
    amplitudeIdle: 0.35,
    ritmoIdle: 1.6,
    bobDePe: 0.06,
    salto: 0.42,
    ritmoSalto: 7.0,

    /*
    AS TRÊS FRACÇÕES. É a fatia da claque que está de pé em cada situação.

    `repouso` não é zero de propósito: num estádio a sério há sempre gente de
    pé — a chegar, a sair, a bater palmas. A zero a bancada lia-se como uma
    plateia de teatro.
    */
    fraccaoRepouso: 0.08,
    fraccaoAtaque: 0.50,
    fraccaoGolo: 1.00,

    /*
    A ENTRADA DOS TIMES (Abertura.fase 'entrada'): a bancada comeca TODA sentada (0, nem o `repouso`) e vai-se
    levantando a medida que o trio e os 22 saem do tunel, ate esta fraccao — de pe a ver, sem saltar (os ultras
    tambem ficam quietos). Quando os times comecam a andar para as posicoes de saida de bola volta o padrao de sempre.
    */
    fraccaoEntrada: 0.90,

    /*
    OS ULTRAS — a fatia que salta SEMPRE, jogo parado ou não.

    As três fracções acima descrevem uma bancada que reage ao lance, e o lance
    quase nunca chega ao terço ofensivo (1,7% do tempo, medido): sem isto a
    bancada passa o jogo inteiro quieta, que é o que se via no ecrã.

    Estes não esperam por nada. Saem do MESMO limiar por adepto que decide
    quem se levanta, passado por um `fract(x * 7.3)` — descorrelacionar é o
    ponto: sem isso os saltadores seriam exactamente os de limiar mais baixo,
    isto é, os primeiros a levantar-se, e ficariam todos amontoados na mesma
    zona da bancada em vez de espalhados por ela.

    Não custa attribute nenhum (o orçamento está em 13 de 16) nem escrita por
    frame: é mais um uniform, comparado no shader.
    */
    // Os ultras so saltam nos golos (pedido): no jogo normal a torcida fica sentada e levanta-se com o ataque.
    fraccaoSaltoSempre: 0.0,

    /*
    OS ULTRAS DA CLAQUE QUE SOFREU O GOLO.

    Relato: "as duas torcidas estao vibrando na hora do gol". A festa por
    claque ja era separada (`uFesta` e um vec2), mas os ultras acima saltam
    SEMPRE e nos dois lados — e no golo, com a bancada de quem sofreu sentada,
    os unicos que se mexem la sao eles. Em cima do grito do golo, le-se como a
    bancada adversaria a festejar o golo que levou.

    Enquanto o estado for GOAL, a fatia que salta do lado de quem sofreu passa
    a ser esta. Fora do golo, os dois lados usam `fraccaoSaltoSempre`.
    */
    fraccaoSaltoLuto: 0.0,

    /*
    GATILHO DO ATAQUE. A claque levanta-se quando a equipa tem a posse e a bola
    entrou no terço ofensivo dela. `tercoZ` é a fronteira desse terço: o campo
    tem 106 m, portanto o terço final começa a 106/6 do meio-campo.

    A HISTERESE existe porque a bola passa a linha do terço para trás e para a
    frente numa disputa, e sem ela a bancada pisca. Entrar é rápido (o lance
    perigoso não espera), sair é lento, e uma vez de pé fica-se de pé um tempo
    mínimo.
    */
    tercoZ: 106 / 6,
    entradaMin: 0.4,
    saidaMin: 1.5,
    permanenciaMin: 2.0
};

/*
=============================================================================
CROWDTRIGGER — que fracção de cada claque está de pé
=============================================================================
Função pura, sem Three.js lá dentro: recebe o que o Match já sabe e devolve as
duas fracções. Fica separada do resto para se poder testar sem GPU — é aqui que
vivem as regras, e regras erradas são o que se nota no ecrã.

O estado é só o dos temporizadores da histerese. `reset()` limpa-o.
=============================================================================
*/
const CrowdTrigger = {
    // Um por equipa: se está a atacar, há quanto tempo a condição se mantém, e
    // há quanto tempo o estado actual dura.
    _estado: null,

    reset() {
        this._estado = {
            TeamA: { ativo: false, tCond: 0, tEstado: 999 },
            TeamB: { ativo: false, tCond: 0, tEstado: 999 }
        };
        return this;
    },

    /*
    A equipa ataca para que lado? `zSinal < 0` é a baliza do TeamA (ver a
    detecção de golo em match.js), portanto o TeamA ataca para z positivo.
    */
    noTercoOfensivo(team, bolaZ) {
        return (Lados.dirDe(team) > 0)
            ? bolaZ > CrowdModel.tercoZ
            : bolaZ < -CrowdModel.tercoZ;
    },

    /*
    Aplica a histerese a uma equipa e devolve se ela conta como "a atacar".

    Três tempos, e a ordem em que se testam importa: primeiro a permanência
    (uma vez de pé fica-se), depois a saída, depois a entrada.
    */
    _histerese(team, condicao, dt) {
        const e = this._estado[team];
        e.tEstado += dt;
        e.tCond = (condicao === e.ativo) ? 0 : e.tCond + dt;

        if (e.ativo) {
            if (!condicao &&
                e.tEstado >= CrowdModel.permanenciaMin &&
                e.tCond >= CrowdModel.saidaMin) {
                e.ativo = false; e.tEstado = 0; e.tCond = 0;
            }
        } else if (condicao && e.tCond >= CrowdModel.entradaMin) {
            e.ativo = true; e.tEstado = 0; e.tCond = 0;
        }
        return e.ativo;
    },

    /*
    `dados`: { estado, posse, bolaZ, equipaQueMarcou, dt }.

    Devolve { A, B, festa }, com as fracções por CLAQUE (a claque A é a do
    TeamA) e qual delas festeja, se alguma.
    */
    avaliar(dados) {
        if (!this._estado) this.reset();
        const dt = dados.dt || 0;

        /*
        A ENTRADA DOS TIMES manda sobre o resto: `dados.abertura` e { progresso 0..1 } (quem ja saiu do tunel) ou null.
        Sem posse, sem golo, sem histerese — e a histerese limpa-se, para o primeiro lance depois da entrada nao herdar
        nada. `semSalto` apaga tambem os ultras (ver Crowd.update).
        */
        if (dados.abertura) {
            this.reset();
            const f = CrowdModel.fraccaoEntrada * Math.max(0, Math.min(1, dados.abertura.progresso));
            return { A: f, B: f, festa: null, semSalto: true };
        }

        /*
        GOLO salta a histerese. Não faz sentido esperar 0.4 s para uma bancada
        reagir a um golo, e o estado 'GOAL' dura até a bola voltar ao centro,
        portanto não pisca.
        */
        if (dados.estado === 'GOAL' && dados.equipaQueMarcou) {
            // O golo interrompe qualquer ataque em curso: quando o jogo
            // recomeçar, ninguém fica de pé por inércia de um lance que já era.
            this.reset();
            const marcouA = dados.equipaQueMarcou === 'TeamA';
            return {
                A: marcouA ? CrowdModel.fraccaoGolo : 0,
                B: marcouA ? 0 : CrowdModel.fraccaoGolo,
                festa: marcouA ? 'A' : 'B'
            };
        }

        const posse = dados.posse;
        const bolaZ = dados.bolaZ || 0;
        const saida = { A: CrowdModel.fraccaoRepouso, B: CrowdModel.fraccaoRepouso, festa: null };

        for (const team of ['TeamA', 'TeamB']) {
            const condicao = (posse === team) && this.noTercoOfensivo(team, bolaZ);
            if (this._histerese(team, condicao, dt)) {
                saida[team === 'TeamA' ? 'A' : 'B'] = CrowdModel.fraccaoAtaque;
            }
        }
        return saida;
    }
};

const Crowd = {
    _meshes: null,
    _uniforms: null,
    _tempo: 0,
    // Fracção actual por claque, para se saber quando mudou.
    _frac: { A: -1, B: -1 },

    /*
    Constrói o esqueleto temporário na pose dada e devolve as peças já
    transformadas para o espaço do modelo, agrupadas por canal de cor.

    `pose` é um dos dicionários de `CrowdModel.poses`. A estrutura das caixas
    NÃO depende da pose — só as rotações dependem — e é isso que garante a
    correspondência 1:1 dos vértices entre poses.

    Devolve { pele: [geo...], camisa: [...], calcao: [...], cabelo: [...] }.
    */
    /*
    `mapa` (opcional) TROCA O CANAL DAS PERNAS E DOS PÉS, e existe por causa do
    pessoal do estádio (js/staff.js): um adepto tem as pernas à mostra, um
    funcionário anda de calças compridas e sapatos. As caixas são as MESMAS, na
    MESMA ordem — muda só o canal de cor em que cada uma cai, e é por isso que
    esta é a única maneira de o fazer sem uma segunda cópia do corpo a divergir
    desta. Sem `mapa`, nada muda para o público.
    */
    _pecas(pose, mapa) {
        const u = 1.0;
        const P = pose || CrowdModel.poses.sentado;
        // Sem `mapa` e o ADEPTO: as pernas tem canal proprio (calcas compridas ou pele) e leva bone.
        const adepto = !mapa;
        const canalPerna = (mapa && mapa.perna) || (adepto ? 'perna' : 'pele');
        const canalPe = (mapa && mapa.pe) || 'pele';
        const canais = { pele: [], camisa: [], calcao: [], cabelo: [], rosto: [] };
        if (adepto) { canais.bone = []; canais.listraV = []; canais.listraH = []; }
        canais[canalPerna] = canais[canalPerna] || [];
        canais[canalPe] = canais[canalPe] || [];

        // Uma pose pode dar valores diferentes a cada lado (`ancaE`/`ancaD`, `joelhoE`/`joelhoD`,
        // `ombroE`/`ombroD`, `cotoveloE`...): é o que faz um passo. Sem eles, os dois lados usam o valor único.
        const por = (k, lado) => { const v = P[k + (lado < 0 ? 'E' : 'D')]; return v !== undefined ? v : P[k]; };

        const raiz = new THREE.Object3D();

        // Cada peça é uma caixa pendurada num Object3D; o `add` devolve o nó
        // para se lhe pendurarem filhos.
        const no = (pai, x, y, z) => {
            const o = new THREE.Object3D();
            o.position.set(x, y, z);
            pai.add(o);
            return o;
        };
        const caixa = (pai, canal, w, h, d, x, y, z) => {
            const g = new THREE.BoxGeometry(w, h, d);
            g.translate(x, y, z);
            canais[canal].push({ geo: g, no: pai });
        };

        /* --- bacia e tronco ------------------------------------------- */
        const pelvis = no(raiz, 0, P.alturaBacia, 0);
        caixa(pelvis, 'pele', u * 1.3, u * 0.6, u * 0.8, 0, 0, 0);
        caixa(pelvis, 'calcao', u * 1.35, u * 0.65, u * 0.85, 0, 0, 0);

        const chest = no(pelvis, 0, 0.9, 0);
        chest.rotation.x = P.tronco;
        caixa(chest, 'pele', u * 1.4, u * 1.45, u * 0.75, 0, 0.125, 0);
        caixa(chest, 'camisa', u * 1.45, u * 1.5, u * 0.8, 0, 0.125, 0);
        if (adepto) {
            // O DESENHO DA CAMISA: listras verticais (3) ou faixas horizontais (3), um pouco maiores que
            // o peito. Cada adepto so as mostra se a camisa do clube as tem (ver `recolorir`).
            for (const x of [-0.5, 0, 0.5]) caixa(chest, 'listraV', u * 0.26, u * 1.52, u * 0.83, x, 0.125, 0);
            for (const y of [-0.47, 0.125, 0.72]) caixa(chest, 'listraH', u * 1.47, u * 0.27, u * 0.83, 0, y, 0);
        }

        const neck = no(chest, 0, 0.8, 0);
        caixa(neck, 'pele', u * 0.35, u * 0.15, u * 0.35, 0, 0, 0);

        const head = no(neck, 0, 0.575, 0);
        caixa(head, 'pele', u * 0.8, u * 1.0, u * 0.85, 0, 0, 0);
        // Rosto (canal escuro): olhos, nariz e boca na face da frente (+z).
        caixa(head, 'rosto', u * 0.15, u * 0.15, u * 0.06, -u * 0.18, u * 0.1, u * 0.44);
        caixa(head, 'rosto', u * 0.15, u * 0.15, u * 0.06, u * 0.18, u * 0.1, u * 0.44);
        caixa(head, 'rosto', u * 0.12, u * 0.18, u * 0.1, 0, -u * 0.08, u * 0.46);
        caixa(head, 'rosto', u * 0.34, u * 0.07, u * 0.06, 0, -u * 0.3, u * 0.44);
        // Cabelo: as cinco peças do modelo do jogador.
        caixa(head, 'cabelo', u * 0.88, u * 0.25, u * 0.9, 0, u * 0.5, 0);
        caixa(head, 'cabelo', u * 0.88, u * 0.7, u * 0.25, 0, u * 0.15, -u * 0.35);
        caixa(head, 'cabelo', u * 0.15, u * 0.6, u * 0.65, -u * 0.4, u * 0.2, -u * 0.1);
        caixa(head, 'cabelo', u * 0.15, u * 0.6, u * 0.65, u * 0.4, u * 0.2, -u * 0.1);
        caixa(head, 'cabelo', u * 0.88, u * 0.15, u * 0.2, 0, u * 0.45, u * 0.38);
        if (adepto) {
            // Bone: calota e pala. Instancia a zero para quem nao o usa (ver build).
            caixa(head, 'bone', u * 0.92, u * 0.24, u * 0.95, 0, u * 0.62, 0);
            caixa(head, 'bone', u * 0.9, u * 0.07, u * 0.38, 0, u * 0.52, u * 0.62);
        }

        /* --- braços ---------------------------------------------------- */
        for (const lado of [-1, 1]) {
            const ombro = no(chest, lado * 0.8, 0.525, 0);
            ombro.rotation.x = por('ombro', lado);
            caixa(ombro, 'pele', u * 0.35, u * 1.0, u * 0.35, 0, -0.5, 0);
            caixa(ombro, 'camisa', u * 0.4, u * 0.5, u * 0.4, 0, -0.25, 0);

            const cotovelo = no(ombro, 0, -1.0, 0);
            cotovelo.rotation.x = por('cotovelo', lado);
            caixa(cotovelo, 'pele', u * 0.3, u * 0.8, u * 0.3, 0, -0.4, 0);
            caixa(cotovelo, 'pele', u * 0.35, u * 0.4, u * 0.2, 0, -0.9, 0);
        }

        /* --- pernas ---------------------------------------------------- */
        for (const lado of [-1, 1]) {
            const anca = no(pelvis, lado * 0.4, -0.3, 0);
            anca.rotation.x = por('anca', lado);
            caixa(anca, canalPerna, u * 0.45, u * 1.0, u * 0.45, 0, -0.5, 0);
            caixa(anca, 'calcao', u * 0.5, u * 0.5, u * 0.5, 0, -0.25, 0);

            const joelho = no(anca, 0, -1.0, 0);
            joelho.rotation.x = por('joelho', lado);
            caixa(joelho, canalPerna, u * 0.35, u * 0.9, u * 0.35, 0, -0.45, 0);
            // Pé, em pele escura (as chuteiras do modelo não valem a pena a
            // esta distância — um canal a mais por um par de caixas).
            caixa(joelho, canalPe, u * 0.4, u * 0.25, u * 0.7, 0, -1.0, u * 0.2);
        }

        raiz.updateWorldMatrix(true, true);

        // Aplica a matriz de mundo de cada nó à respectiva caixa e devolve só
        // as geometrias, já no espaço do modelo.
        const saida = {};
        for (const canal in canais) {
            saida[canal] = canais[canal].map(({ geo, no }) => {
                no.updateWorldMatrix(true, false);
                return geo.toNonIndexed().applyMatrix4(no.matrixWorld);
            });
        }
        return saida;
    },

    // Nome antigo, mantido para quem já o chamava.
    _pecasSentadas() { return this._pecas(CrowdModel.poses.sentado); },

    /*
    Uma geometria fundida por canal, para UMA pose, já à escala do jogo.

    A escala é a do corpo dos jogadores, e vem de LÁ: `ESCALA_CORPO`, em
    pose.js. Esteve escrita à mão aqui, e quando a do corpo mudou os adeptos
    ficaram 10% mais pequenos do que toda a gente sem ninguém dar por isso.
    */
    /*
    O ADEPTO COM O MODELO DOS JOGADORES (teste de desempenho; `CrowdModel.modeloJogador`). Em vez do boneco de caixas do adepto, usa-se o corpo dos jogadores na versao LEVE
    (construirCorpo com `leve` = 1: 888 triangulos, sem esferas nas juntas), posto em cada pose do adepto (anca, joelho, tronco, ombro, cotovelo) e fundido por canal de cor:

        camisa   tronco e mangas          calcao   o calcao
        perna    coxas, canelas e meias   pele     cabeca, pescoco, bracos e maos
        cabelo   cabelo                   rosto    olhos e as botas (escuros)

    Cada pose da o MESMO numero de vertices por canal (a classificacao nao depende da pose), que e o que o shader do morph pede. Sem listras nem bone.
    */
    _geometriasDoJogadorLeve(pose) {
        if (typeof construirCorpo !== 'function') return null;
        const P = pose || CrowdModel.poses.sentado;
        const f = construirCorpo('#ff0000', '#00ff00', undefined, undefined, (typeof Qualidade !== 'undefined' && Qualidade.cfg().corpoExtras) || 1);
        const rig = f.rig, m = f.corpo;
        const por = (k, lado) => { const v = P[k + (lado < 0 ? 'E' : 'D')]; return v !== undefined ? v : P[k]; };
        rig.lLeg.rotation.x = por('anca', -1); rig.rLeg.rotation.x = por('anca', 1);
        rig.lKnee.rotation.x = por('joelho', -1); rig.rKnee.rotation.x = por('joelho', 1);
        rig.chest.rotation.x = P.tronco;
        rig.lArm.rotation.x = por('ombro', -1); rig.rArm.rotation.x = por('ombro', 1);
        rig.lElbow.rotation.x = por('cotovelo', -1); rig.rElbow.rotation.x = por('cotovelo', 1);
        // A CASCA DO PEITO (a camisa, com a textura de cada kit): canal `peito`, que mantem os UV e os grupos de material; o resto da camisa (mangas, o miolo do tronco) e o canal `camisa`, de cor lisa.
        const casca = (() => { let r0 = null; rig.chest.traverse(o => { if (!r0 && o.isMesh && Array.isArray(o.material)) r0 = o; }); return r0; })();
        if (casca) casca.userData.canal = 'peito';
        // A CARA E A DOS JOGADORES: olhos (planos), nariz e boca. No jogador o nariz e a boca sao LINHAS finas (THREE.Line, pose.js), que a fusao em malhas nao apanha:
        // desenham-se aqui como faixas finas (planos) no mesmo sitio da cara — nariz em L (traco vertical e pe para a direita), boca horizontal —, da cor dos olhos.
        const faceGrp = rig.olhoEsq && rig.olhoEsq.parent;
        if (faceGrp) {
            const z = rig.olhoEsq.position.z + 0.001, u = 1.0, fino = 0.035;
            const faixa = (w, h, x, y) => { const q = new THREE.Mesh(new THREE.PlaneGeometry(w, h), rig.olhoEsq.material); q.position.set(x, y, z); faceGrp.add(q); };
            faixa(fino, u * 0.13 + fino, 0, -u * 0.015);          // nariz: do (0, 0.05) ao (0, -0.08)
            faixa(u * 0.06 + fino, fino, u * 0.03, -u * 0.08);    // nariz: pe, do (0, -0.08) ao (0.06, -0.08)
            faixa(u * 0.24, fino, 0, -u * 0.22);                  // boca: de (-0.12, -0.22) a (0.12, -0.22)
        }
        m.updateMatrixWorld(true);
        const dono = (o) => {
            for (let q = o; q; q = q.parent) {
                if (q === rig.lHand || q === rig.rHand) return 'mao';
                if (q === rig.lBota || q === rig.rBota) return 'bota';
                if (q === rig.lLeg || q === rig.rLeg) return 'perna';
                if (q === rig.lArm || q === rig.rArm) return 'braco';
                if (q === rig.neck) return 'cabeca';
                if (q === rig.chest) return 'tronco';
            }
            return 'tronco';
        };
        const hexDe = (mat) => (!Array.isArray(mat) && mat && mat.color) ? mat.color.getHex() : null;
        // Os tons de pele: os das maos (o tom e a sombra das juntas); o que na cabeca nao for pele nem olhos e cabelo.
        const tonsDePele = new Set(); rig.lHand.traverse(o => { if (o.isMesh) { const x = hexDe(o.material); if (x !== null) tonsDePele.add(x); } }); rig.rHand.traverse(o => { if (o.isMesh) { const x = hexDe(o.material); if (x !== null) tonsDePele.add(x); } });
        const canalDe = (o) => {
            if (o.userData && o.userData.canal) return o.userData.canal;
            const d = dono(o), h = hexDe(o.material);
            if (d === 'mao') return 'pele';
            if (d === 'bota') return 'rosto';
            if (d === 'perna') return Array.isArray(o.material) || h === 0xffffff || h === 0x00ff00 ? 'calcao' : 'perna';
            if (d === 'braco') return h === 0xff0000 ? 'camisa' : 'antebraco';   // o braco sem manga: pele, ou a cor da camisa nos adeptos de goleiro (manga comprida)
            if (d === 'cabeca') { if (h === 0x2f3640) return 'rosto'; return (h === null || tonsDePele.has(h)) ? 'pele' : 'cabelo'; }
            return 'camisa';
        };
        const porCanal = {};
        m.traverse(o => {
            if (!o.isMesh || !o.geometry || !o.geometry.attributes.position || !o.geometry.attributes.normal) return;
            for (let q = o; q; q = q.parent) { if (!q.visible) return; if (q === m) break; }
            if (o.geometry.type === 'CylinderGeometry' && dono(o) === 'bota') return;   // sem as travas das chuteiras
            const c = canalDe(o);
            (porCanal[c] = porCanal[c] || []).push(o);
        });
        const saida = {};
        let minY = Infinity;
        for (const canal of Object.keys(porCanal).sort()) {
            const lista = porCanal[canal];
            if (canal === 'peito') {
                const o = lista[0], g = o.geometry.clone();
                g.applyMatrix4(o.matrixWorld);
                // 3 GRUPOS DE MATERIAL em vez de 6: as quatro faces dos lados/topo/baixo (grupos 0 a 3, contiguos) levam o mesmo material; cada grupo e uma chamada de desenho.
                if (g.groups.length === 6) {
                    const G = g.groups, lado = { start: G[0].start, count: G[0].count + G[1].count + G[2].count + G[3].count }, frente = G[4], costas = G[5];
                    g.clearGroups(); g.addGroup(lado.start, lado.count, 0); g.addGroup(frente.start, frente.count, 1); g.addGroup(costas.start, costas.count, 2);
                }
                g.computeBoundingBox();
                minY = Math.min(minY, g.boundingBox.min.y);
                saida[canal] = g;
                continue;
            }
            const partes = lista.map(o => { const g = o.geometry.toNonIndexed(); g.applyMatrix4(o.matrixWorld); if (o.matrixWorld.determinant() < 0) { const pa = g.attributes.position.array, na = g.attributes.normal.array; for (let i = 0; i < pa.length; i += 9) { for (let k = 0; k < 3; k++) { const t = pa[i + 3 + k]; pa[i + 3 + k] = pa[i + 6 + k]; pa[i + 6 + k] = t; const u = na[i + 3 + k]; na[i + 3 + k] = na[i + 6 + k]; na[i + 6 + k] = u; } } } return g; });
            let nv = 0; partes.forEach(g => { nv += g.attributes.position.count; });
            const pos = new Float32Array(nv * 3), nor = new Float32Array(nv * 3);
            let vo = 0; partes.forEach(g => { pos.set(g.attributes.position.array, vo * 3); nor.set(g.attributes.normal.array, vo * 3); vo += g.attributes.position.count; g.dispose(); });
            const geo = new THREE.BufferGeometry();
            geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
            geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
            geo.computeBoundingBox();
            minY = Math.min(minY, geo.boundingBox.min.y);
            saida[canal] = geo;
        }
        // Os pes no zero em todas as poses (a convencao do adepto: o `lugar` e onde os pes assentam).
        if (isFinite(minY)) for (const canal in saida) { saida[canal].translate(0, -minY, 0); saida[canal].computeBoundingBox(); saida[canal].computeBoundingSphere(); }
        return saida;
    },

    _geometriasDaPose(pose) {
        if (CrowdModel.modeloJogador) { const g = this._geometriasDoJogadorLeve(pose); if (g && Object.keys(g).length) return g; }
        const pecas = this._pecas(pose);
        const escala = (typeof ESCALA_CORPO === 'number') ? ESCALA_CORPO : 1.8 / 5.5;
        const saida = {};
        for (const canal in pecas) {
            if (!pecas[canal].length) continue;
            const g = mergeNonIndexedGeometries(pecas[canal]);
            g.scale(escala, escala, escala);
            saida[canal] = g;
        }
        return saida;
    },

    /*
    Geometrias finais por canal: a pose sentada em `position`/`normal`, e as
    outras três penduradas como atributos de vértice, para o shader interpolar.

    As poses extra são descartadas depois de se lhes copiar os arrays — o que
    vai para a GPU é uma geometria por canal, não quatro.
    */
    geometrias() {
        const base = this._geometriasDaPose(CrowdModel.poses.sentado);
        const extras = {
            Idle: this._geometriasDaPose(CrowdModel.poses.idle),
            DePe: this._geometriasDaPose(CrowdModel.poses.dePe),
            Festa: this._geometriasDaPose(CrowdModel.poses.festa),
            PalmasS: this._geometriasDaPose(CrowdModel.poses.palmasS),
            PalmasP: this._geometriasDaPose(CrowdModel.poses.palmasP)
        };

        for (const canal in base) {
            const n = base[canal].attributes.position.count;
            for (const nome in extras) {
                const g = extras[nome][canal];
                /*
                A INVARIANTE. Se as contagens divergirem o morph lê fora do
                sítio; mais vale gritar aqui do que descobrir no ecrã.
                */
                if (!g || g.attributes.position.count !== n) {
                    throw new Error(`Crowd: a pose ${nome} tem ` +
                        `${g ? g.attributes.position.count : 0} vértices no canal ` +
                        `${canal}, e a sentada tem ${n}`);
                }
                base[canal].setAttribute('aPos' + nome,
                    new THREE.BufferAttribute(g.attributes.position.array, 3));
                /*
                A pose idle não leva normal: só inclina o tronco uns graus, e a
                normal da pose sentada serve. Cada attribute custa um dos 16
                slots do hardware, e este era o mais fácil de dispensar.
                */
                if (nome === 'DePe') {
                    base[canal].setAttribute('aNor' + nome,
                        new THREE.BufferAttribute(g.attributes.normal.array, 3));
                }
            }
        }
        return base;
    },

    /*
    Qual das claques neste ponto da bancada.

    `t` é a posição em Z (0 = o fundo -Z) e `u` a posição em X (1 = o lado das câmeras). O visitante só ocupa o canto t baixo + u alto, o resto é da casa (ver `visitanteT`).

    QUE LADO É DE QUEM: `t = 0` é o z mais negativo, que é onde está a baliza
    do TeamA (`ownGoalZ = -(CAMPO_COMP/2) * dirZ`, com dirZ +1 para o TeamA).
    Lá fica a claque **B** — cada claque senta-se atrás da baliza que a sua
    equipa ATACA, e não atrás da que defende, que é o que se vê no ecrã.
    */
    claqueEm(t, rnd, u = 0) {
        const M = CrowdModel, m = Math.max(1e-6, M.visitanteMescla);
        // 1 dentro do canto, descendo a 0 numa faixa de largura `m` para fora dele.
        const vT = (typeof this._visT === 'number') ? this._visT : M.visitanteT, vU = (typeof this._visU === 'number') ? this._visU : M.visitanteU;   // o canto ajustado para dar 10% (ver `build`)
        // FRONTEIRA SECA (pedido: *"so pode ter torcedor adversario dentro da area deles"*): visitante so dentro do canto, sem mescla; a fronteira e o meio da antiga faixa (a grade da divisoria).
        const pT = (t <= vT + m / 2) ? 1 : 0;
        if (M.visitanteEmFrente) u = 1 - u;   // o canto do visitante e o do lado OPOSTO as cameras (ver `visitanteEmFrente`)
        const pU = (u >= vU - m / 2) ? 1 : 0;
        return (rnd() < pT * pU) ? 'B' : 'A';
    },

    /*
    Os uniforms, partilhados pelos quatro materiais — um adepto tem de estar na
    mesma pose nos quatro canais, e a maneira mais segura de garantir isso é os
    quatro shaders lerem os MESMOS objectos.

    Os vectores por claque são `[A, B]`, indexados pelo `aAdepto.w` da instância.
    */
    // Quanto a origem do adepto desce em relacao ao assento (match_setup.js, addSeatInstance): sentado, o calcao fica no degrau. De pe os pes tem de ficar no degrau
    // e nao 0.30 m por baixo dele, por isso o shader sobe os de pe outro tanto (`uSobeDePe`).
    descidaDoAdepto: 0.30,

    _criarUniforms() {
        return {
            uSobeDePe: { value: 0.30 }, // = descidaDoAdepto
            uTempo: { value: 0 },
            uDurTransicao: { value: CrowdModel.duracaoTransicao },
            uAmpIdle: { value: CrowdModel.amplitudeIdle },
            uRitmoIdle: { value: CrowdModel.ritmoIdle },
            uBobDePe: { value: CrowdModel.bobDePe },
            uSalto: { value: CrowdModel.salto },
            uRitmoSalto: { value: CrowdModel.ritmoSalto },
            uFracSalto: {
                value: new THREE.Vector2(CrowdModel.fraccaoSaltoSempre,
                    CrowdModel.fraccaoSaltoSempre)
            },
            uFracAnt: { value: new THREE.Vector2(0, 0) },
            uFracNova: { value: new THREE.Vector2(0, 0) },
            uTempoTroca: { value: new THREE.Vector2(-99, -99) },
            uFesta: { value: new THREE.Vector2(0, 0) },
            uEspalhar: { value: CrowdModel.espalharLevantar },
            uAplauso: { value: CrowdModel.aplauso.repouso },
            uFracPalmas: { value: new THREE.Vector2(0, 0) },
            uPalmasFirme: { value: 0 }
        };
    },

    /*
    Enxerta o morph e a animação no MeshStandardMaterial.

    O ORÇAMENTO DE ATTRIBUTES É 16, e é apertado. Cada `attribute` ocupa um
    slot, e a `instanceMatrix` sozinha come QUATRO (é uma mat4); com
    `instanceColor`, `position` e `normal` já vão sete antes de eu escrever a
    primeira linha. Os quatro valores por adepto vão por isso num `vec4` só, e
    a pose idle não tem normal própria. Passar dos 16 dá
    `Too many attributes` no link do programa e o público desaparece — já
    aconteceu. Ver o teste do orçamento em tests/crowd_vida.test.js.

    O GLSL AQUI DENTRO É ASCII, comentários incluídos. O código-fonte de GLSL
    ES 1.00 é ASCII, e o compilador do Windows (ANGLE) recusa qualquer byte
    fora disso — um `ç` num comentário chega para o programa não compilar e as
    quatro malhas do público desaparecerem do ecrã, com o resto da cena
    intacto. Já aconteceu; ver o teste do ASCII em tests/crowd_vida.test.js.

    Porquê `onBeforeCompile` e não um ShaderMaterial próprio: o material padrão
    já traz luzes, sombras, fog e — o que aqui interessa mesmo — o suporte de
    `instanceColor`, que é o que dá a cada adepto a sua cor. Reescrever isso à
    mão era trocar quatro linhas de patch por umas centenas de GLSL.
    */
    _aplicarShader(mat, uniforms) {
        mat.onBeforeCompile = (shader) => {
            for (const k in uniforms) shader.uniforms[k] = uniforms[k];
            // O DETALHE desta malha (1 = perto: aplausos e cabecas a virar; 0 = longe: so as poses basicas): um uniform por material, posto por `cullar` conforme a distancia da fatia a camara.
            shader.uniforms.uDetalhe = (mat.userData && mat.userData.uDetalhe) ? mat.userData.uDetalhe : { value: 1 };

            const prefixo = `
attribute vec3 aPosIdle;
attribute vec3 aPosDePe;
attribute vec3 aPosFesta;
attribute vec3 aPosPalmasS;
attribute vec3 aPosPalmasP;
attribute vec3 aNorDePe;
// Os quatro valores por adepto num vec4 e nao em quatro floats: cada
// attribute ocupa um slot dos 16 que o hardware da, e a instanceMatrix
// sozinha come quatro. Ver o comentario em _aplicarShader.
// x = limiar, y = fase, z = ritmo, w = claque (0 = A, 1 = B).
attribute vec4 aAdepto;
uniform float uTempo;
uniform float uSobeDePe;
uniform float uDurTransicao;
uniform float uAmpIdle;
uniform float uRitmoIdle;
uniform float uBobDePe;
uniform float uSalto;
uniform float uRitmoSalto;
uniform vec2 uFracSalto;
uniform vec2 uFracAnt;
uniform vec2 uFracNova;
uniform vec2 uTempoTroca;
uniform vec2 uFesta;
uniform float uEspalhar;
uniform float uAplauso;
uniform vec2 uFracPalmas;
uniform float uPalmasFirme;
uniform float uDetalhe;

// Pesos deste adepto neste instante. Usados pela posicao E pela normal, que
// tem de andar juntas: senao o sombreamento denuncia a pose antiga.
// (Comentarios sem acentos de proposito: o GLSL e ASCII, ver _aplicarShader.)
void crowdPesos(out float dePe, out float w1, out float w2,
                out float osc, out float festa) {
    bool claqueA = aAdepto.w < 0.5;
    float fAnt = claqueA ? uFracAnt.x : uFracAnt.y;
    float fNova = claqueA ? uFracNova.x : uFracNova.y;
    float tTroca = claqueA ? uTempoTroca.x : uTempoTroca.y;
    festa = claqueA ? uFesta.x : uFesta.y;

    // O estado sai de uma comparacao com o limiar fixo do adepto: e isso que
    // deixa mudar a bancada inteira com dois uniforms.
    float antes = step(aAdepto.x, fAnt);
    float depois = step(aAdepto.x, fNova);
    // CAOS: atraso e duracao proprios de cada adepto (hashes do limiar/fase/ritmo).
    float atraso = fract(aAdepto.y * 0.15915 + aAdepto.x * 3.7) * uEspalhar;
    float durA = uDurTransicao * (0.6 + 0.8 * fract(aAdepto.z * 57.3 + aAdepto.x * 5.1));
    float k = clamp((uTempo - tTroca - atraso) / max(durA, 0.0001), 0.0, 1.0);
    dePe = mix(antes, depois, smoothstep(0.0, 1.0, k));

    // OS ULTRAS: saltam sempre, sem esperar pelo lance. O limiar passa por um
    // fract para nao serem os mesmos que se levantam primeiro: senao ficavam
    // amontoados numa zona so. Estao de pe por definicao: nao se salta
    // sentado.
    float fSalto = claqueA ? uFracSalto.x : uFracSalto.y;
    float ultra = step(fract(aAdepto.x * 7.3), fSalto);
    dePe = max(dePe, ultra);
    festa = max(festa, ultra);

    // s em 0..2: 0 sentado, 1 de pe, 2 a festejar.
    float s = dePe * (1.0 + festa);
    w1 = clamp(s, 0.0, 1.0);
    w2 = clamp(s - 1.0, 0.0, 1.0);

    osc = 0.5 + 0.5 * sin(uTempo * uRitmoIdle * aAdepto.z + aAdepto.y);
}
`;

            const corpoPos = `
    float dePe, w1, w2, osc, festa;
    crowdPesos(dePe, w1, w2, osc, festa);

    vec3 crowdPos = mix(position, aPosDePe, w1);
    crowdPos = mix(crowdPos, aPosFesta, w2);
    // Oscilacao de repouso: some a medida que o adepto se levanta.
    crowdPos = mix(crowdPos, aPosIdle, osc * uAmpIdle * (1.0 - w1));
    // De pe a espera: uma oscilacao vertical pequena, para nao ser um poste.
    crowdPos.y += uBobDePe * w1 * (1.0 - festa) * (osc - 0.5);
    // Salto do golo, so a quem esta de pe.
    crowdPos.y += uSalto * festa * dePe *
        abs(sin(uTempo * uRitmoSalto * aAdepto.z + aAdepto.y));

    // De pe: os pes sobem ao degrau (a origem do adepto desce para o sentado assentar).
    crowdPos.y += uSobeDePe * w1;

    // APLAUSOS: uma fracao dos adeptos aplaude em rajadas, sentada ou de pe (a pose das palmas), com os bracos a abrir e fechar; nao com a bancada em festa.
    // SHADER SIMPLIFICADO LONGE DA CAMARA: sem aplausos nem cabecas a virar (nem as poses das palmas): nao se distinguem de longe e custam por vertice.
    if (uDetalhe > 0.5) {
    float quem = step(fract(aAdepto.x * 37.1), aAdepto.w < 0.5 ? uFracPalmas.x : uFracPalmas.y);
    float rajada = mix(smoothstep(0.1, 0.5, sin(uTempo * 0.4 * aAdepto.z + aAdepto.y * 1.7)), 1.0, uPalmasFirme);
    float palma = quem * rajada * uAplauso * (1.0 - w2);
    crowdPos = mix(crowdPos, mix(aPosPalmasS, aPosPalmasP, w1), palma);
    float bracos = step(0.27, abs(crowdPos.x));
    crowdPos.x -= sign(crowdPos.x) * bracos * 0.045 * sin(uTempo * 11.0 + aAdepto.y) * palma;
    // ALGUNS OLHAM PARA TRAS: de vez em quando viram a cabeca (so o que esta acima do pescoco).
    float olha = step(fract(aAdepto.x * 91.7), ${CrowdModel.olhaParaTras.toFixed(3)});
    float virar = smoothstep(0.55, 0.85, sin(uTempo * 0.35 * aAdepto.z + aAdepto.y * 2.3)) * olha * (1.0 - w2) * (1.0 - palma);
    float ang = virar * 2.3 * (fract(aAdepto.x * 53.1) < 0.5 ? 1.0 : -1.0);
    float cabeca = smoothstep(mix(1.02, 1.48, w1) - 0.03, mix(1.02, 1.48, w1) + 0.03, crowdPos.y);
    float ca = cos(ang * cabeca), sa = sin(ang * cabeca);
    crowdPos.xz = vec2(crowdPos.x * ca - crowdPos.z * sa, crowdPos.x * sa + crowdPos.z * ca);
    }

    vec3 transformed = crowdPos;
`;

            const corpoNor = `
    float nDePe, nW1, nW2, nOsc, nFesta;
    crowdPesos(nDePe, nW1, nW2, nOsc, nFesta);
    vec3 crowdNor = mix(normal, aNorDePe, nW1);
    // (a pose de festa usa a normal da de pe: um attribute a menos para caber as poses das palmas; os bracos no ar mudam pouco o sombreamento)
    crowdNor = mix(crowdNor, aNorDePe, nW2);
    // A pose idle nao tem normal propria: inclina o tronco uns graus e a
    // normal da pose sentada serve. Um attribute a menos, e sao contados.
    vec3 objectNormal = normalize(crowdNor);
`;

            let vs = prefixo + shader.vertexShader;
            const antes = vs;
            vs = vs.replace('#include <beginnormal_vertex>', corpoNor);
            vs = vs.replace('#include <begin_vertex>', corpoPos);

            /*
            O `onBeforeCompile` procura strings de chunks do THREE. Se um dia
            mudarem de nome, a substituição falha em SILÊNCIO e o público volta
            a ser uma fotografia, sem nada no ecrã a dizer porquê. O modo de
            falha tem de ser ruidoso.
            */
            if (vs === antes || vs.indexOf('crowdPesos(dePe') === -1) {
                console.warn('Crowd: o patch do vertex shader não pegou — ' +
                    'os chunks begin_vertex/beginnormal_vertex mudaram? ' +
                    'O público fica estático.');
                return;
            }
            shader.vertexShader = vs;
        };
        // Força recompilação se o material for reutilizado.
        mat.needsUpdate = true;
    },

    /*
    AS CORES DOS ADEPTOS A PARTIR DAS EQUIPAS EM CAMPO. `cores` = { A: {principal, cor1, cor2, calcao},
    B: {...} } (ver `coresDaEquipa`). Cada adepto veste a camisa do clube (50%), a cor 1 (25%) ou a
    cor 2 (25%); calcas compridas ou o calcao do clube; bone na cor 1 ou 2. Chama-se depois de
    a equipa mudar (TEAMS_CHANGED).
    */
    recolorir(cores) {
        if (!this._grupos || !cores) return;
        const c = new THREE.Color();
        const tom = (hex, k) => { c.set(hex); c.multiplyScalar(k); return c; };
        for (let gi = 0; gi < this._grupos.length; gi++) {
            const g = this._grupos[gi];
            for (const f of (this._fansPorGrupo[gi] || [])) {
                const eq = cores[f.claque];
                if (!eq) continue;
                // O KIT deste adepto: o do jogo (0), outro do time (1), uma cor do time (2) ou o do guarda-redes (3); sem `kits` (equipa sem dados) cai nas cores de sempre.
                const K = eq.kits;
                const kit = K ? (f.cam === 0 ? K.atual : f.cam === 1 ? (K.outras.length ? K.outras[Math.min(K.outras.length - 1, Math.floor(f.sub * K.outras.length))] : K.atual) : f.cam === 2 ? K.cor : (K.gk || K.cor)) : null;
                const camHex = kit ? kit.principal : (f.cam === 0 ? eq.principal : (f.cam === 1 ? eq.cor1 : eq.cor2));
                if (g.camisa) g.camisa.setColorAt(f.i, tom(camHex, f.k));
                if (g.peito) g.peito.setColorAt(f.i, tom(camHex, f.k));
                // A camisa do GOLEIRO leva manga comprida: o braco (sem a mao) na cor da camisa; os outros adeptos, pele.
                if (g.antebraco) g.antebraco.setColorAt(f.i, tom(f.cam === 3 ? camHex : f.pele, f.k));   // reserva: so se ve se as texturas dos kits nao puderem ser montadas
                if (g.calcao) g.calcao.setColorAt(f.i, tom(f.longa ? f.calcaHex : eq.calcao, f.k));
                if (g.perna) g.perna.setColorAt(f.i, tom(f.longa ? f.calcaHex : f.pele, f.k));
                if (g.bone) g.bone.setColorAt(f.i, tom(f.boneCor === 0 ? eq.cor1 : eq.cor2, f.k));
                /*
                O DESENHO: quem veste a camisa do clube (cam 0) leva as listras/faixas dela, na segunda
                cor; as outras camisas (cor 1 / cor 2) sao lisas.
                */
                const padraoDoKit = kit ? kit.padrao : (f.cam === 0 ? eq.padrao : null);
                const listraDoKit = kit ? kit.listra : eq.listra;
                const comDesenho = !!padraoDoKit;
                for (const [canal, padrao] of [['listraV', 'listras'], ['listraH', 'faixas']]) {
                    if (!g[canal]) continue;
                    if (comDesenho && padraoDoKit === padrao) {
                        g[canal].setMatrixAt(f.i, f.m);
                        g[canal].setColorAt(f.i, tom(listraDoKit, f.k));
                    } else {
                        _zeroM.makeScale(0, 0, 0);
                        g[canal].setMatrixAt(f.i, _zeroM);
                    }
                }
            }
            for (const n of ['camisa', 'peito', 'antebraco', 'calcao', 'perna', 'bone', 'listraV', 'listraH']) {
                if (g[n] && g[n].instanceColor) g[n].instanceColor.needsUpdate = true;
                if (g[n] && (n === 'listraV' || n === 'listraH')) g[n].instanceMatrix.needsUpdate = true;
            }
        }
        // A camisa de cada adepto com a textura do kit dos jogadores (ver `_montarCamisas`).
        try { this._montarCamisas(cores); } catch (e) { if (typeof console !== 'undefined') console.warn('Crowd: camisas dos kits nao montadas', e && e.message); }
    },

    /*
    AS CAMISAS DOS ADEPTOS, IGUAIS AS DOS JOGADORES. A camisa do jogador e uma textura (o desenho do kit, a gola, o escudo) na frente e nas costas da casca do peito. O adepto
    veste a MESMA casca (canal `peito`, com UV e grupos de material) com a textura do kit tirada de um corpo de jogador feito com esse uniforme; as costas levam o mesmo desenho
    sem numero. Cada kit de cada claque e uma InstancedMesh propria so com os adeptos que o vestem (as animacoes do morph vao no `aAdepto` de cada uma).
    */
    _texturasDoKit(uniforme, corCamisa, corCalcao) {
        if (typeof construirCorpo !== 'function') return null;
        const f = construirCorpo(corCamisa || '#888888', corCalcao || '#ffffff', undefined, uniforme || undefined, (typeof Qualidade !== 'undefined' && Qualidade.cfg().corpoExtras) || 1);
        let casca = null; f.rig.chest.traverse(o => { if (!casca && o.isMesh && Array.isArray(o.material)) casca = o; });
        if (!casca) return null;
        const frente = casca.material[4].map;
        const lado = casca.material[0].color.getHex();
        // As costas: o mesmo desenho, sem numero (a regra do `Player.updateShirt`: a faixa unica so vai na frente).
        const cv = document.createElement('canvas'); cv.width = 512; cv.height = 512;
        const ctx = cv.getContext('2d');
        const peca = uniforme && uniforme.camisa;
        if (peca && typeof pintarPadraoDeEquipamento === 'function') {
            const k = peca.padrao === 'kit' ? peca.kit : null;
            const faixaUnica = !!(k && k.diagonal && k.c2 && !k.multipleDiagonals && !k.dualDiagonal);
            if (faixaUnica) { ctx.fillStyle = k.c1; ctx.fillRect(0, 0, 512, 512); }
            else pintarPadraoDeEquipamento(ctx, 512, 512, peca, corCamisa);
        } else { ctx.fillStyle = corCamisa || '#888888'; ctx.fillRect(0, 0, 512, 512); }
        return { frente, lado, costas: new THREE.CanvasTexture(cv) };
    },

    _montarCamisas(cores) {
        if (!this._grupos || !this._cena || !this._uniforms || typeof THREE === 'undefined') return;
        // As texturas por claque: [atual, ...outras, cor do time, goleiro], com o indice de cada um.
        const porClaque = {};
        for (const lado of ['A', 'B']) {
            const eq = cores[lado], K = eq && eq.kits;
            if (!K) continue;
            const lista = [K.atual].concat(K.outras || []);
            const idxCor = lista.length; lista.push(K.cor);
            const idxGK = lista.length; lista.push(K.gk || K.cor);
            const tex = lista.map(k => { try { return k ? this._texturasDoKit(k.uniforme, k.principal, k.corCalcao) : null; } catch (e) { return null; } });
            porClaque[lado] = { tex, nOutras: (K.outras || []).length, idxCor, idxGK };
        }
        if (this._camisasAntigas) for (const m of this._camisasAntigas) { if (m.parent) m.parent.remove(m); m.geometry.dispose(); (Array.isArray(m.material) ? m.material : [m.material]).forEach(x => { if (x.map && x.userData.costas) x.map.dispose(); x.dispose(); }); }
        this._camisasAntigas = [];
        const branco = new THREE.Color();
        for (let gi = 0; gi < this._grupos.length; gi++) {
            const g = this._grupos[gi];
            if (!g.peito) continue;
            const baldes = {};
            for (const f of (this._fansPorGrupo[gi] || [])) {
                const pc = porClaque[f.claque];
                if (!pc) continue;
                const vi = f.cam === 0 ? 0 : f.cam === 1 ? (pc.nOutras ? 1 + Math.min(pc.nOutras - 1, Math.floor(f.sub * pc.nOutras)) : 0) : f.cam === 2 ? pc.idxCor : pc.idxGK;
                const t = pc.tex[vi] || pc.tex[0];
                if (!t) continue;
                const chave = f.claque + ':' + (pc.tex[vi] ? vi : 0);
                (baldes[chave] = baldes[chave] || { t, fans: [] }).fans.push(f);
            }
            for (const chave of Object.keys(baldes)) {
                const { t, fans } = baldes[chave];
                const geo = g.peito.geometry.clone();
                const a = new Float32Array(fans.length * 4); fans.forEach((f, j) => a.set(f.a, j * 4));
                geo.setAttribute('aAdepto', new THREE.InstancedBufferAttribute(a, 4));
                geo.boundingSphere = g.peito.geometry.boundingSphere;
                const mk = (opts) => { const mt = new THREE.MeshStandardMaterial(Object.assign({ roughness: 0.85, metalness: 0 }, opts)); mt.userData = { uDetalhe: { value: 1 } }; this._aplicarShader(mt, this._uniforms); return mt; };
                const mCostas = mk({ map: t.costas }); mCostas.userData.costas = true;
                const lado = mk({ color: t.lado });
                const mats = [lado, mk({ map: t.frente }), mCostas];   // lados (4 faces numa chamada), frente, costas
                const im = new THREE.InstancedMesh(geo, mats, fans.length);
                im.castShadow = false; im.receiveShadow = false; im.frustumCulled = false;   // corte nosso: `cullar`
                im.userData.grupo = gi;
                im.instanceMatrix.setUsage(THREE.StaticDrawUsage);
                fans.forEach((f, j) => { im.setMatrixAt(j, f.m); branco.setRGB(1, 1, 1).multiplyScalar(f.k); im.setColorAt(j, branco); });
                im.instanceMatrix.needsUpdate = true; if (im.instanceColor) im.instanceColor.needsUpdate = true;
                this._cena.add(im);
                this._camisasAntigas.push(im);
            }
            g.peito.visible = false; g._semPeito = true;
        }
    },

    /*
    RENDERIZAR SO ATE 1.2x O VIEWPORT (pedido): por frame, cada fatia da torcida (e as camisas dos kits dela) so se desenha se a sua esfera cair dentro do frustum da camara com
    `CrowdModel.viewportCull` (1.2) vezes a largura e a altura do ecra. Fora disso `visible = false`. Chamado do `animate` depois de a camara se actualizar.
    */
    definirOcupacao(o, visitante) {
        const v = Math.max(0.05, Math.min(1, Number(o)));
        if (!isFinite(v)) return;
        // A ocupacao do SETOR VISITANTE (0..1, do manager: a base do clube visitante): comeca em 60% e muda com os resultados dele.
        const ov = (typeof visitante === 'number' && isFinite(visitante)) ? Math.max(0.05, Math.min(1, visitante)) : null;
        if (typeof this._ocupacao === 'number' && Math.abs(this._ocupacao - v) < 0.005 && (this._ocupacaoVisitante === ov || (ov !== null && Math.abs(this._ocupacaoVisitante - ov) < 0.005))) return;
        this._ocupacaoVisitante = ov;
        this._ocupacao = v;
        if (this._lugares && this._cena) this.reconstruir();
    },

    // Refaz a torcida com a ocupacao actual (tira as malhas de agora e volta a construir).
    reconstruir() {
        const cena = this._cena, lugares = this._lugares;
        if (!cena || !lugares) return;
        const tirar = (m) => { if (m.parent) m.parent.remove(m); if (m.geometry) m.geometry.dispose(); (Array.isArray(m.material) ? m.material : [m.material]).forEach(x => x && x.dispose && x.dispose()); };
        for (const g of (this._grupos || [])) for (const n in g) if (g[n] && g[n].isObject3D) tirar(g[n]);
        for (const m of (this._camisasAntigas || [])) tirar(m);
        this._tirarDivisorias();
        this._tirarCaminhantes();
        this._camisasAntigas = [];
        this._grupos = []; this._fansPorGrupo = []; this._esferas = [];
        this.build(cena, lugares);
    },

    cullar(camera, fator) {
        if (!this._grupos || !this._esferas || !camera) return;
        if (this._ligada === false) { this._cullVisiveis = 0; for (const g of this._grupos) for (const n in g) if (g[n] && g[n].isObject3D) g[n].visible = false; if (this._camisasAntigas) for (const m of this._camisasAntigas) m.visible = false; return; }
        const k = fator || CrowdModel.viewportCull || 1.2;
        camera.updateMatrixWorld();
        camera.matrixWorldInverse.copy(camera.matrixWorld).invert();
        const P = this._pCull || (this._pCull = new THREE.Matrix4());
        P.copy(camera.projectionMatrix);
        P.elements[0] /= k; P.elements[5] /= k;      // x e y do ecra alargados k vezes
        const M = this._mCull || (this._mCull = new THREE.Matrix4());
        M.multiplyMatrices(P, camera.matrixWorldInverse);
        const F = this._fCull || (this._fCull = new THREE.Frustum());
        F.setFromProjectionMatrix(M);
        const vis = this._esferas.map(e => F.intersectsSphere(e));
        // Detalhe por distancia: as fatias a mais de `detalheAte` m (da superficie da esfera a camara) usam o shader simplificado.
        const cp = camera.position, D = CrowdModel.detalheAte || 60;
        const detalhe = this._esferas.map(e => ((Math.hypot(e.center.x - cp.x, e.center.y - cp.y, e.center.z - cp.z) - e.radius) < D) ? 1 : 0);
        const poeDetalhe = (m, v) => { const mats = Array.isArray(m.material) ? m.material : [m.material]; for (const x of mats) if (x && x.userData && x.userData.uDetalhe) x.userData.uDetalhe.value = v; };
        for (let gi = 0; gi < this._grupos.length; gi++) {
            const g = this._grupos[gi];
            for (const n in g) { const m = g[n]; if (m && m.isObject3D) { m.visible = vis[gi] && !(n === 'peito' && g._semPeito); poeDetalhe(m, detalhe[gi]); } }
        }
        if (this._camisasAntigas) for (const m of this._camisasAntigas) { m.visible = vis[m.userData.grupo]; poeDetalhe(m, detalhe[m.userData.grupo]); }
        this._cullVisiveis = vis.filter(Boolean).length;
    },

    /*
    As cores de uma equipa em campo: do uniforme do clube se ele existir, senao das cores do boneco.
    */
    /*
    OS KITS DE UMA EQUIPA para os adeptos: { principal, listra, padrao } por camisa. `padrao` e 'listras' (verticais) ou 'faixas' (horizontais) quando o desenho as tem, senao
    camisa lisa. Vem do uniforme de jogo (`atual`), dos outros kits do manager (`outras`, `Match.uniformesOutros[lado]`), do guarda-redes (`gk`, `Match.uniformeGK*`) e de uma cor
    do time que nao seja a dos jogadores (`cor`, das cores do escudo).
    */
    _kitDeUniforme(u, porOmissao) {
        if (!u || !u.camisa) return porOmissao ? { principal: porOmissao, listra: porOmissao, padrao: null, uniforme: u || null } : null;
        const cs = (u.camisa.cores || []).filter(Boolean);
        const principal = (typeof corDoUniforme === 'function') ? corDoUniforme(u, cs[0] || porOmissao) : (cs[0] || porOmissao);
        let padrao = null, listra = cs[1] || principal;
        if (u.camisa.padrao === 'listras' || u.camisa.padrao === 'faixas') padrao = u.camisa.padrao;
        else if (u.camisa.padrao === 'kit' && u.camisa.kit) {
            const k = u.camisa.kit;
            if (k.horizontal && k.c2) { padrao = 'faixas'; listra = k.c2; }
            else if (!k.diagonal && !k.gradient && !k.multipleDiagonals && !k.dualDiagonal && !k.cruzMalta && k.c2 && k.c2 !== 'transparent' && k.c2 !== k.c1) { padrao = 'listras'; listra = k.c2; }
        }
        return { principal, listra, padrao, uniforme: u };
    },

    _kitsDaEquipa(p, lado) {
        const M = (typeof Match !== 'undefined') ? Match : null;
        const atual = Object.assign(this._kitDeUniforme(p.uniforme, p.corCamisa), { corCalcao: p.corCalcao });
        const outras = ((M && M.uniformesOutros && M.uniformesOutros[lado]) || []).map(u => this._kitDeUniforme(u)).filter(Boolean);
        const gkU = M ? (lado === 'A' ? M.uniformeGKA : M.uniformeGKB) : null;
        const gk = gkU ? this._kitDeUniforme(gkU) : null;
        // Uma cor do time (do escudo) que nao seja a camisa dos jogadores; sem escudo, a segunda cor do desenho.
        const info = M ? (lado === 'A' ? M.equipaInfoA : M.equipaInfoB) : null;
        const cores = ((info && info.escudo && info.escudo.cores) || []).filter(c => c && c !== 'transparent');
        const dist = (a, b) => { const x = new THREE.Color(a), y = new THREE.Color(b); return Math.hypot(x.r - y.r, x.g - y.g, x.b - y.b); };
        const outraCor = cores.find(c => dist(c, atual.principal) > 0.3) || (atual.listra !== atual.principal ? atual.listra : null);
        const corFinal = outraCor || atual.principal;
        // A camisa lisa dessa cor, sem escudo (a textura e a do corpo do jogador feito com este uniforme).
        const cor = { principal: corFinal, listra: corFinal, padrao: null, uniforme: { camisa: { padrao: 'solido', cores: [corFinal] }, corPrincipal: corFinal, gola: atual.uniforme && atual.uniforme.gola, numero: '#ffffff' } };
        return { atual, outras, gk, cor };
    },

    coresDaEquipa(lista, lado) {
        const p = lista && (lista[1] || lista[0]);
        if (!p) return null;
        const lado2 = lado || ((lista === (typeof Match !== 'undefined' ? Match.opponents : null)) ? 'B' : 'A');
        const u = p.uniforme;
        if (u && u.camisa) {
            const cs = u.camisa.cores || [];
            const calc = (u.calcao && u.calcao.cores && u.calcao.cores[0]) || p.corCalcao;
            const principal = (typeof corDoUniforme === 'function') ? corDoUniforme(u, cs[0]) : cs[0];
            // A cor das listras: a primeira do desenho que nao seja a principal.
            const claro = c => { const n = parseInt(String(c).slice(1), 16); return ((n >> 16) & 255) > 215 && ((n >> 8) & 255) > 215 && (n & 255) > 215; };
            const outras = cs.filter(c => c && c.toLowerCase() !== String(principal).toLowerCase());
            const listra = outras.find(c => !claro(c)) || outras[0] || principal;
            return {
                principal,
                cor1: cs[0] || p.corCamisa,
                cor2: cs[1] || calc || p.corCamisa,
                calcao: calc || '#ffffff',
                padrao: (u.camisa.padrao === 'listras' || u.camisa.padrao === 'faixas') ? u.camisa.padrao : null,
                listra,
                kits: this._kitsDaEquipa(p, lado2)
            };
        }
        return { principal: p.corCamisa, cor1: p.corCamisa, cor2: p.corCalcao || p.corCamisa, calcao: p.corCalcao || '#ffffff', kits: this._kitsDaEquipa(p, lado2) };
    },

    /*
    GENTE A ENTRAR E A SAIR DOS TUNEIS DE ACESSO (pedido: uns 200, variados). Cada um percorre o corredor de um tunel entre a porta (no fundo do vao) e uma fila do corredor: os que ENTRAM saem da porta,
    descem a escada e somem (sentam-se) na fila escolhida; os que SAEM aparecem nessa fila, sobem e somem na porta. Depois de uma espera sem estar visivel, repetem. Os corpos sao os mesmos do pessoal do campo
    (`Staff._geometrias`), de pe, com cores variadas por instancia. Os tuneis vem de `TuneisAcesso` (match_setup.js).
    */
    _criarCaminhantes(scene) {
        this._tirarCaminhantes();
        const T = (typeof globalThis !== 'undefined') ? globalThis.TuneisAcesso : null;
        const CM = CrowdModel.caminhantes;
        if (!CM || !T || !T.itens || !T.itens.length || typeof Staff === 'undefined' || typeof FuncionariosEstadio === 'undefined' || typeof THREE === 'undefined') return;
        let geos;
        try { geos = Staff._geometrias(CrowdModel.poses.dePe); } catch (err) { return; }
        if (!geos || !Object.keys(geos).length) return;
        const F = FuncionariosEstadio;
        const fq = (typeof Qualidade !== 'undefined' && Qualidade.cfg && typeof Qualidade.cfg().adeptos === 'number') ? Qualidade.cfg().adeptos : 1;
        const n = Math.round(CM.total * fq);
        if (n < 1) return;
        let semente = 424242; const rnd = () => { semente = (semente * 1103515245 + 12345) & 0x7fffffff; return semente / 0x7fffffff; };
        const eq = CrowdModel.equipas;
        const camisas = ['#d6201f', '#ffffff', '#1f5fd1', '#f5e61b', '#2e9b45', '#14161a', '#e8812b', '#8e44ad', eq.A.camisa, eq.B.camisa];
        const calcas = ['#2b3a55', '#14161a', '#556070', '#7a5c3a', '#3b5d8f', '#a0a6ae'];
        const cor = new THREE.Color();
        const canais = Object.keys(geos);
        const malhas = {};
        for (const canal of canais) {
            const im = new THREE.InstancedMesh(geos[canal], new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.85 }), n);
            im.frustumCulled = false; im.castShadow = false; im.receiveShadow = false;
            im.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
            malhas[canal] = im;
            scene.add(im);
        }
        const pick = (arr) => arr[Math.floor(rnd() * arr.length)];
        const gente = [];
        for (let i = 0; i < n; i++) {
            const tu = pick(T.itens);
            const entra = rnd() < 0.5;
            const rhoPorta = T.f + T.nCorte - 0.5 - 0.35;
            const rhoFila = 0.5 + rnd() * Math.max(0.5, T.f - 1.5);
            const vel = CM.velocidade * (0.8 + 0.4 * rnd());
            const dur = Math.abs(rhoPorta - rhoFila) * 1.2 / vel;
            const g = { tu, entra, rhoPorta, rhoFila, dur, lado: (rnd() < 0.5 ? -1 : 1) * (0.3 + 0.35 * rnd()), esc: F.escalaMin + rnd() * (F.escalaMax - F.escalaMin), fase: rnd() * 6.28, prog: rnd(), espera: 0, andando: rnd() < 0.6 };
            if (!g.andando) g.espera = rnd() * CM.esperaMax;
            gente.push(g);
            for (const canal of canais) {
                if (canal === 'camisa') cor.set(pick(camisas));
                else if (canal === 'calcao') cor.set(pick(calcas));
                else if (canal === 'pele') cor.set(pick(CrowdModel.peles));
                else if (canal === 'cabelo') cor.set(pick(CrowdModel.cabelos));
                else cor.set('#1b1512');
                malhas[canal].setColorAt(i, cor);
            }
        }
        for (const canal of canais) if (malhas[canal].instanceColor) malhas[canal].instanceColor.needsUpdate = true;
        this._caminhantes = { gente, malhas, canais, T, dummy: new THREE.Object3D(), esperaMax: CM.esperaMax, rampa: CM.rampa };
        this._atualizarCaminhantes(0);
    },

    _tirarCaminhantes() {
        const c = this._caminhantes;
        if (c) for (const k of c.canais) { const m = c.malhas[k]; if (m.parent) m.parent.remove(m); if (m.material) m.material.dispose(); }
        this._caminhantes = null;
    },

    _atualizarCaminhantes(dt) {
        const c = this._caminhantes;
        if (!c) return;
        const T = c.T, d = c.dummy, t = this._tempo;
        c.gente.forEach((g, i) => {
            let visivel = false;
            if (g.andando) {
                g.prog += dt / g.dur;
                if (g.prog >= 1) { g.andando = false; g.prog = 0; g.espera = 1 + Math.random() * c.esperaMax; }
                else visivel = true;
            } else {
                g.espera -= dt;
                if (g.espera <= 0) { g.andando = true; g.prog = 0; g.entra = Math.random() < 0.5; }
            }
            if (!visivel) { d.position.set(0, -50, 0); d.scale.set(0, 0, 0); d.rotation.set(0, 0, 0); }
            else {
                const tu = g.tu, prog = Math.min(1, g.prog);
                const rho = g.entra ? g.rhoPorta + (g.rhoFila - g.rhoPorta) * prog : g.rhoFila + (g.rhoPorta - g.rhoFila) * prog;
                const prof = tu.dProf + rho * 1.2;
                const y = tu.dY + 0.5 + 0.5 * Math.min(rho, T.f) + 0.03 * Math.abs(Math.sin(t * 7 + g.fase));
                // aparecer/sumir na fila do corredor (quem se senta ou se levanta): rampa de escala; na porta nao ha rampa (some no escuro)
                const tt = g.dur * prog, restante = g.dur - tt;
                const rampaFila = g.entra ? Math.min(1, restante / c.rampa) : Math.min(1, tt / c.rampa);
                const esc = g.esc * Math.max(0.01, rampaFila);
                const sentido = (g.entra ? -1 : 1) * tu.sinal;   // ao longo do eixo da fundura: a entrar anda para o campo
                const balanco = 0.05 * Math.sin(t * 7 + g.fase);
                if (tu.eixo === 'x') { d.position.set(tu.base + tu.sinal * prof, y, tu.c + g.lado); d.rotation.set(0, Math.atan2(sentido, 0), balanco); }
                else { d.position.set(tu.c + g.lado, y, tu.base + tu.sinal * prof); d.rotation.set(0, Math.atan2(0, sentido), balanco); }
                d.scale.set(esc, esc, esc);
            }
            d.updateMatrix();
            for (const k of c.canais) c.malhas[k].setMatrixAt(i, d.matrix);
        });
        for (const k of c.canais) c.malhas[k].instanceMatrix.needsUpdate = true;
    },

    // Grade vazada e segurancas das divisorias da claque visitante (ver `build`). Os segurancas sao os MESMOS do campo (Staff: corpo de jogador, colete laranja).
    _criarDivisorias(scene, grades, seguros, DV) {
        if (!grades.length) return;
        this._divisorias = this._divisorias || [];
        const dummy = new THREE.Object3D();
        const juntar = (typeof mergeNonIndexedGeometries === 'function') ? mergeNonIndexedGeometries : null;
        const comp = DV.comprimentoGrade, alt = DV.alturaGrade, e = 0.05, bar = 0.03;
        // um modulo da grade: corrimao em cima, a meio e em baixo, e barras finas de pe (vazada)
        const pecas = [];
        const caixa = (w, h, d, x, y) => { const g = new THREE.BoxGeometry(w, h, d).toNonIndexed(); g.translate(x, y, 0); pecas.push(g); };
        caixa(comp, e, e, 0, alt - e / 2); caixa(comp, e, e, 0, alt / 2); caixa(comp, e, e, 0, e / 2);
        const nb = Math.max(2, Math.round(comp / 0.15));
        for (let i = 0; i <= nb; i++) caixa(bar, alt, bar, -comp / 2 + (comp * i) / nb, alt / 2);
        const geoGrade = juntar ? juntar(pecas) : pecas[0];
        const mat = new THREE.MeshStandardMaterial({ color: DV.corGrade, roughness: 0.6, metalness: 0.3 });
        const im = new THREE.InstancedMesh(geoGrade, mat, grades.length);
        grades.forEach((it, i) => { dummy.position.set(...it.p); dummy.rotation.set(0, it.eixo === 'x' ? 0 : Math.PI / 2, 0); dummy.scale.set(1, 1, 1); dummy.updateMatrix(); im.setMatrixAt(i, dummy.matrix); });
        im.instanceMatrix.needsUpdate = true; im.frustumCulled = false; im.castShadow = false; im.receiveShadow = false;
        scene.add(im); this._divisorias.push(im);

        if (!seguros.length || typeof Staff === 'undefined') return;
        const F = (typeof FuncionariosEstadio !== 'undefined') ? FuncionariosEstadio : null;
        if (!F) return;
        let geos;
        try { geos = Staff._geometrias(CrowdModel.poses.dePe); } catch (err) { return; }
        let semente = 777; const rnd = () => { semente = (semente * 1103515245 + 12345) & 0x7fffffff; return semente / 0x7fffffff; };
        for (const canal of Object.keys(geos)) {
            const g = new THREE.InstancedMesh(geos[canal], Staff._material(canal, F), seguros.length);
            g.frustumCulled = false; g.castShadow = false; g.receiveShadow = false;
            seguros.forEach((it, i) => {
                // olham para a frente, como a torcida da fila (para o campo): a mesma rotacao do lugar
                const rotY = it.rotY;
                const esc = F.escalaMin + rnd() * (F.escalaMax - F.escalaMin);
                dummy.position.set(...it.p); dummy.rotation.set(0, rotY, 0); dummy.scale.set(esc, esc, esc); dummy.updateMatrix();
                g.setMatrixAt(i, dummy.matrix);
                g.setColorAt(i, Staff._corDe(canal, F, rnd, 'anel'));
            });
            g.instanceMatrix.needsUpdate = true; if (g.instanceColor) g.instanceColor.needsUpdate = true;
            scene.add(g); this._divisorias.push(g);
        }
    },

    _tirarDivisorias() {
        for (const m of (this._divisorias || [])) { if (m.parent) m.parent.remove(m); if (m.geometry) m.geometry.dispose(); if (m.material) m.material.dispose(); }
        this._divisorias = [];
    },

    /*
    Constrói a multidão nos `lugares` dados — `{ x, y, z, rotY }`, recolhidos
    de quem constrói as bancadas.

    `t` para a mescla sai do Z do lugar: as duas pontas do estádio são as duas
    claques. É o eixo longo, o mesmo onde o campo tem as balizas.
    */
    build(scene, lugares) {
        if (!lugares || !lugares.length) return null;
        this._cena = scene;
        this._lugares = lugares;

        const geos = this.geometrias();
        const canais = Object.keys(geos);
        
        let crowdLimit = CrowdModel.total;
        if (typeof window !== 'undefined') {
            const ponteiroGrosso = window.matchMedia
                ? window.matchMedia('(pointer: coarse)').matches
                : (('ontouchstart' in window) || navigator.maxTouchPoints > 0);
            const isTabletOrMobile = ponteiroGrosso || window.innerWidth <= 1024;
            if (isTabletOrMobile) crowdLimit = 5000;
        }
        
        /*
        A TORCIDA E UMA FRACAO DOS LUGARES do estadio (Qualidade.cfg().adeptos: HIGH 100%, MEDIUM 50%, LOW 25%), seja qual for o estadio; sem `Qualidade` vale o
        teto de sempre (`CrowdModel.total`). Em tablet/telemovel o teto de 5000 continua a valer por cima.
        */
        // A OCUPACAO do jogo (manager): a torcida e a fracao da qualidade (HIGH 100%, MEDIUM 50%, LOW 25%) DOS LUGARES OCUPADOS, nao dos lugares todos.
        // Sem ocupação do manager, o perfil do estádio pode fixar a torcida de início (`torcidaInicial`, em pessoas): Maracanã 22 000.
        const torcidaInicial = (typeof Estadios !== 'undefined' && Estadios.atual && Estadios.atual.torcidaInicial) || 0;
        const ocup = (typeof this._ocupacao === 'number') ? this._ocupacao : (torcidaInicial ? Math.min(1, torcidaInicial / lugares.length) : 1);
        const fracao = (typeof Qualidade !== 'undefined') ? Qualidade.cfg().adeptos : null;
        let nTotal = (fracao !== null && fracao !== undefined)
            ? Math.min(Math.round(lugares.length * fracao * ocup), (crowdLimit < CrowdModel.total) ? crowdLimit : Infinity)
            : Math.min(crowdLimit, Math.round(lugares.length * ocup));

        const dummy = new THREE.Object3D();
        const cor = new THREE.Color();
        const uniforms = this._criarUniforms();

        let semente = 20260824;
        const rnd = () => {
            semente = (semente * 1103515245 + 12345) & 0x7fffffff;
            return semente / 0x7fffffff;
        };

        // Extremos em Z
        let zMin = Infinity, zMax = -Infinity;
        for (const l of lugares) { if (l.z < zMin) zMin = l.z; if (l.z > zMax) zMax = l.z; }
        const spanZ = Math.max(1e-6, zMax - zMin);
        let xMin = Infinity, xMax = -Infinity;
        for (const l of lugares) { if (l.x < xMin) xMin = l.x; if (l.x > xMax) xMax = l.x; }
        const spanX = Math.max(1e-6, xMax - xMin);

        // Baralha os lugares
        const ordem = lugares.map((_, i) => i);
        for (let i = ordem.length - 1; i > 0; i--) {
            const j = Math.floor(rnd() * (i + 1));
            const tmp = ordem[i]; ordem[i] = ordem[j]; ordem[j] = tmp;
        }

        // Corta os lugares para o total pedido (nTotal), e ORDENA POR ANGULO
        // Agrupa os lugares em 'fatias' espaciais. Assim o frustum culling de um chunk funciona!
        const lugaresEscolhidos = [];
        /*
        A ORDEM EM QUE O ESTÁDIO ENCHE (perfil `setoresTorcida`, config/estadios.js): com a casa vazia a torcida não se espalha
        por igual, ocupa primeiro os setores que o clube vende primeiro. No Maracanã: Norte e Sul (os fundos, juntos), depois o Oeste,
        o Leste inferior e por fim o Leste superior. (Ordem actual: ver `grupoDe`.) Cada grupo enche por inteiro antes do seguinte; dentro do grupo os lugares
        ocupados são sorteados (a ordem já baralhada acima), e o último grupo fica parcial.
        */
        const ST = (typeof Estadios !== 'undefined' && Estadios.atual && Estadios.atual.setoresTorcida) || null;
        if (ST && Estadios.medidas) {
            const a0 = Estadios.medidas.bancadaX, b0 = Estadios.medidas.bancadaZ;
            // 0 Norte e Sul inferior; 1 Oeste e Leste inferior; 2 Norte e Sul superior; 3 Oeste superior (cadeiras cativas); 4 Leste superior.
            const grupoDe = (l) => {
                const t = Math.abs(Math.atan2(l.z / b0, l.x / a0)) * 180 / Math.PI;   // 0 = lado +x (Leste)
                const sup = l.fila >= ST.filaDivisao;
                const leste = t <= ST.anguloLateral, oeste = t >= 180 - ST.anguloLateral;
                if (!leste && !oeste) return sup ? 2 : 0;
                if (leste) return sup ? 4 : 1;
                return sup ? 3 : 1;
            };
            const baldes = [[], [], [], [], []];
            for (const i of ordem) baldes[grupoDe(lugares[i])].push(lugares[i]);
            for (const balde of baldes) {
                for (const l of balde) { if (lugaresEscolhidos.length >= nTotal) break; lugaresEscolhidos.push(l); }
            }
            this.ocupacaoPorSetor = baldes.map(b => b.length);
        } else {
            for (let i = 0; i < nTotal; i++) {
                lugaresEscolhidos.push(lugares[ordem[i]]);
            }
        }
        lugaresEscolhidos.sort((a, b) => Math.atan2(a.z, a.x) - Math.atan2(b.z, b.x));

        /*
        90% DA CASA E 10% DO VISITANTE, QUALQUER QUE SEJA O ESTADIO (pedido): o canto do visitante (`visitanteT` x `visitanteU`) dava ~10% no estadio normal, mas a proporcao depende da forma e do
        tamanho (os estadios rectos, sem cantos, e os de varios aneis davam 12-14%). Aqui o canto cresce ou encolhe (mesmo canto, mesma posicao: o lado das cameras e o fundo -Z) ate o numero esperado de
        adeptos do visitante ser `CrowdModel.fracVisitante` (10%) dos que estao no estadio. Bisseccao sobre a escala do canto.
        */
        {
            const M = CrowdModel, alvo = (typeof M.fracVisitante === 'number') ? M.fracVisitante : 0.10, m = Math.max(1e-6, M.visitanteMescla);
            const n = lugaresEscolhidos.length;
            const tu = lugaresEscolhidos.map(l => [(l.z - zMin) / spanZ, M.visitanteEmFrente ? 1 - (l.x - xMin) / spanX : (l.x - xMin) / spanX]);   // u: 1 = o lado onde esta o canto do visitante
            const parte = (vt, vu) => { let soma = 0; for (const [t, u] of tu) soma += ((t <= vt + m / 2) ? 1 : 0) * ((u >= vu - m / 2) ? 1 : 0); return soma / Math.max(1, n); };
            const com = (e) => [M.visitanteT * e, 1 - (1 - M.visitanteU) * e];
            let lo = 0.1, hi = 3.0;
            for (let k = 0; k < 28; k++) { const e = (lo + hi) / 2; const [vt, vu] = com(e); if (parte(vt, vu) < alvo) lo = e; else hi = e; }
            [this._visT, this._visU] = com((lo + hi) / 2);
        }

        /*
        AS DUAS DIVISORIAS DA CLAQUE VISITANTE (pedido): uma passagem sem adeptos em cada fronteira do bloco — a do eixo Z (nas laterais) e a do eixo X (no fundo) —, com GRADE de cada lado e
        SEGURANCAS (colete amarelo) dentro da passagem, do lado da casa, um a cada `CrowdModel.divisoria.cadaFilas` filas. A fronteira e o meio da faixa de mescla de `claqueEm`.
        */
        this._tirarDivisorias();
        const DV = CrowdModel.divisoria;
        if (DV && DV.ativa && THREE && this._visT !== undefined) {
            const m = Math.max(1e-6, CrowdModel.visitanteMescla);
            // A fronteira encosta num CORREDOR DO TUNEL (o mais perto da fronteira de `claqueEm`), e o canto do visitante passa a acabar ali.
            const passo = (typeof CorredoresBancada !== 'undefined') ? CorredoresBancada.espacamento : 18.7;
            const larg = (typeof CorredoresBancada !== 'undefined') ? CorredoresBancada.largura : 2.55;
            const noCorredorMaisPerto = (v) => Math.round(v / passo) * passo;
            const cZ = noCorredorMaisPerto(zMin + (this._visT + m / 2) * spanZ);
            const cX = noCorredorMaisPerto(xMin + (1 - this._visU + m / 2) * spanX);
            this._visT = (cZ - zMin) / spanZ - m / 2;
            this._visU = 1 - ((cX - xMin) / spanX - m / 2);
            const fZ = cZ + larg / 2, fX = cX + larg / 2;   // a grade: na borda do corredor virada a CASA (coordenadas maiores): o corredor do tunel fica do lado do visitante, que assim tem entrada e saida
            const grades = [], seguros = [];
            // eixo 'x' = divisoria a Z constante (a fila cresce em X); eixo 'z' = a X constante (a fila cresce em Z)
            const linhas = [
                { eixo: 'x', f: fZ, ok: (l) => l.x <= cX + 1.0 },
                { eixo: 'z', f: fX, ok: (l) => l.z <= cZ + 1.0 }
            ];
            for (const ln of linhas) {
                const coord = (l) => (ln.eixo === 'x' ? l.z : l.x);
                const filas = new Map();
                for (const l of lugares) {
                    if (!ln.ok(l)) continue;
                    const d = Math.abs(coord(l) - ln.f);
                    if (d > larg + DV.colunaLivre) continue;
                    const k = l.fila + '|' + l.y.toFixed(2) + '|' + (ln.eixo === 'x' ? Math.sign(l.x) : Math.sign(l.z));
                    const a = filas.get(k);
                    if (!a || d < a.d) filas.set(k, { l, d });
                }
                const lista = [...filas.values()].map(o => o.l).sort((a, b) => a.y - b.y);
                lista.forEach((l, idx) => {
                    const yPiso = l.y + 0.30;
                    const pos = (delta) => (ln.eixo === 'x' ? [l.x, yPiso, ln.f + delta] : [ln.f + delta, yPiso, l.z]);
                    grades.push({ p: pos(0), eixo: ln.eixo });
                    if (idx % DV.cadaFilas === 0) seguros.push({ p: pos(DV.afastaSeguranca), eixo: ln.eixo, lado: 1, rotY: l.rotY });
                });
                // tira UMA fileira de torcedores: a coluna do lado da casa, encostada a grade (onde ficam os seguranças)
                for (let i = lugaresEscolhidos.length - 1; i >= 0; i--) {
                    const l = lugaresEscolhidos[i], d = coord(l) - ln.f;
                    if (ln.ok(l) && d > -0.05 && d < DV.colunaLivre) lugaresEscolhidos.splice(i, 1);
                }
            }
            nTotal = lugaresEscolhidos.length;
            this._criarDivisorias(scene, grades, seguros, DV);
        }

        /*
        O SETOR VISITANTE ENCHE SO ate `_ocupacaoVisitante` (a ocupacao-base do clube visitante, 60% no inicio, sobe e desce com os resultados dele), em relacao ao resto do estadio: cada lugar do canto
        fica com a probabilidade `ov / ocupacao` (o peso do canto em `claqueEm` decide quanto do lugar e do visitante).
        */
        if (typeof this._ocupacaoVisitante === 'number' && this._visT !== undefined) {
            const rel = Math.min(1, this._ocupacaoVisitante / Math.max(0.05, ocup));
            if (rel < 1) {
                const M = CrowdModel, m = Math.max(1e-6, M.visitanteMescla);
                const vT = this._visT, vU = this._visU;
                for (let i = lugaresEscolhidos.length - 1; i >= 0; i--) {
                    const l = lugaresEscolhidos[i];
                    const t = (l.z - zMin) / spanZ;
                    let u = (l.x - xMin) / spanX; if (M.visitanteEmFrente) u = 1 - u;
                    const w = ((t <= vT + m / 2) ? 1 : 0) * ((u >= vU - m / 2) ? 1 : 0);
                    if (w > 0 && rnd() < w * (1 - rel)) lugaresEscolhidos.splice(i, 1);
                }
                nTotal = lugaresEscolhidos.length;
            }
        }

        const variar = (hex) => {
            cor.set(hex);
            const k = 1 + (rnd() - 0.5) * 2 * CrowdModel.variacaoCor;
            cor.multiplyScalar(k);
            return cor;
        };

        // Aumenta a bounding sphere base para compensar o facto de eles se levantarem no shader
        for (const canal of canais) {
            if (!geos[canal].boundingSphere) geos[canal].computeBoundingSphere();
        }

        // 4 InstancedMesh (um por canal de cor) para o total de adeptos
        // Fatias de ~1500 adeptos (por angulo, em volta do estadio): permitem NAO desenhar o que esta fora do ecra (ver `cullar`). Uma fatia so (`nTotal`) desenhava a torcida toda sempre.
        const TAMANHO_CHUNK = Math.max(1, CrowdModel.tamanhoDaFatia || nTotal);
        this._esferas = [];
        const numChunks = Math.ceil(nTotal / TAMANHO_CHUNK);
        this._grupos = [];
        this._fansPorGrupo = [];

        for (let c = 0; c < numChunks; c++) {
            const inicio = c * TAMANHO_CHUNK;
            const fim = Math.min(inicio + TAMANHO_CHUNK, nTotal);
            const nChunk = fim - inicio;

            // Calcular bounding sphere real do chunk
            const chunkBox = new THREE.Box3();
            for (let i = 0; i < nChunk; i++) {
                const l = lugaresEscolhidos[inicio + i];
                chunkBox.expandByPoint(new THREE.Vector3(l.x, l.y, l.z));
            }
            const chunkSphere = new THREE.Sphere();
            chunkBox.getBoundingSphere(chunkSphere);
            chunkSphere.radius += 3.0; // Dar folga para quando se levantam/festejam

            const aAdepto = new Float32Array(nChunk * 4);
            const meshes = {};
            const fans = [];

            for (const canal of canais) {
                // CLONAR A GEOMETRIA POR CHUNK!
                // Se não clonarmos, o aAdepto atributo partilhado vai sobescrever-se a cada loop, e só o último chunk é que desenha.
                const geoChunk = geos[canal].clone();
                
                geoChunk.boundingSphere = chunkSphere;

                const mat = new THREE.MeshStandardMaterial({ roughness: 0.85, metalness: 0.0 });
                mat.userData.uDetalhe = { value: 1 };
                this._aplicarShader(mat, uniforms);
                const m = new THREE.InstancedMesh(geoChunk, mat, nChunk);
                m.castShadow = false;
                m.receiveShadow = false;
                m.instanceMatrix.setUsage(THREE.StaticDrawUsage);
                
                m.frustumCulled = false;   // o corte e nosso, com folga de 1.2x o ecra (`cullar`)
                
                geoChunk.setAttribute('aAdepto', new THREE.InstancedBufferAttribute(aAdepto, 4));
                meshes[canal] = m;
            }

            for (let i = 0; i < nChunk; i++) {
                const l = lugaresEscolhidos[inicio + i];
                const t = (l.z - zMin) / spanZ;
                const claque = this.claqueEm(t, rnd, (l.x - xMin) / spanX);
                const eq = CrowdModel.equipas[claque];
                const escala = CrowdModel.escalaMin + rnd() * (CrowdModel.escalaMax - CrowdModel.escalaMin);

                dummy.position.set(l.x, l.y, l.z);
                dummy.rotation.set(0, l.rotY + (rnd() - 0.5) * 2 * CrowdModel.variacaoRotacao, 0);
                dummy.scale.set(escala, escala, escala);
                dummy.updateMatrix();

                // Escolhas do adepto (sorteadas SEMPRE, para a sequencia nao depender da equipa).
                const TC = CrowdModel.torcida;
                const rCam = rnd(), rCalca = rnd(), rBone = rnd(), rCorBone = rnd(), rCalcaCor = rnd(), rSub = rnd();
                const fan = {
                    i, claque,
                    // 0 = camisa do jogo, 1 = outra camisa do time, 2 = uma cor do time, 3 = camisa do guarda-redes; `sub` escolhe entre as outras camisas
                    cam: rCam < TC.camisas.atual ? 0 : (rCam < TC.camisas.atual + TC.camisas.outra ? 1 : (rCam < TC.camisas.atual + TC.camisas.outra + TC.camisas.cor ? 2 : 3)),
                    sub: rSub,
                    longa: rCalca < TC.calcaComprida,
                    bone: rBone < TC.bone,
                    boneCor: rCorBone < 0.5 ? 0 : 1,
                    calcaHex: TC.calcas[Math.floor(rCalcaCor * TC.calcas.length)],
                    pele: CrowdModel.peles[Math.floor(rnd() * CrowdModel.peles.length)],
                    k: 1 + (rnd() - 0.5) * 2 * CrowdModel.variacaoCor
                };
                fans.push(fan);

                fan.m = dummy.matrix.clone();
                for (const canal of canais) {
                    if (canal === 'listraV' || canal === 'listraH') {
                        dummy.scale.set(0, 0, 0); dummy.updateMatrix();
                        meshes[canal].setMatrixAt(i, dummy.matrix);
                        dummy.scale.set(escala, escala, escala); dummy.updateMatrix();
                    } else if (canal === 'bone' && !fan.bone) {
                        // Zero de escala: o chapeu so existe para 20%.
                        dummy.scale.set(0, 0, 0); dummy.updateMatrix();
                        meshes[canal].setMatrixAt(i, dummy.matrix);
                        dummy.scale.set(escala, escala, escala); dummy.updateMatrix();
                    } else meshes[canal].setMatrixAt(i, dummy.matrix);
                }

                aAdepto[i * 4 + 0] = rnd();
                aAdepto[i * 4 + 1] = rnd() * Math.PI * 2;
                aAdepto[i * 4 + 2] = 0.85 + rnd() * 0.30;
                aAdepto[i * 4 + 3] = (claque === 'A') ? 0 : 1;
                fan.a = [aAdepto[i * 4], aAdepto[i * 4 + 1], aAdepto[i * 4 + 2], aAdepto[i * 4 + 3]];

                meshes.camisa && meshes.camisa.setColorAt(i, variar(eq.camisa));
                meshes.peito && meshes.peito.setColorAt(i, variar(eq.camisa));
                meshes.calcao && meshes.calcao.setColorAt(i, variar(eq.calcao));
                meshes.pele && meshes.pele.setColorAt(i, variar(fan.pele));
                meshes.perna && meshes.perna.setColorAt(i, variar(fan.pele));
                meshes.antebraco && meshes.antebraco.setColorAt(i, variar(fan.pele));
                meshes.bone && meshes.bone.setColorAt(i, variar(eq.camisa));
                meshes.listraV && meshes.listraV.setColorAt(i, variar(eq.camisa));
                meshes.listraH && meshes.listraH.setColorAt(i, variar(eq.camisa));
                meshes.rosto && meshes.rosto.setColorAt(i, variar('#1b1512'));
                meshes.cabelo && meshes.cabelo.setColorAt(i, variar(CrowdModel.cabelos[Math.floor(rnd() * CrowdModel.cabelos.length)]));
            }

            for (const canal of canais) {
                meshes[canal].instanceMatrix.needsUpdate = true;
                if (meshes[canal].instanceColor) meshes[canal].instanceColor.needsUpdate = true;
                meshes[canal].geometry.attributes.aAdepto.needsUpdate = true;
                meshes[canal].count = nChunk;
                scene.add(meshes[canal]);
            }
            
            this._esferas.push(chunkSphere);
            this._fansPorGrupo.push(fans);
            this._grupos.push(meshes);
        }

        if (typeof console !== 'undefined' && console.log) {
            console.log(`Crowd: ${nTotal} adeptos em ${lugares.length} lugares particionados em ${numChunks} chunks com frustum culling ativo!`);
        }

        this._meshes = this._grupos[0]; 
        this._uniforms = uniforms;
        this._tempo = 0;
        this._frac = { A: -1, B: -1 };
        CrowdTrigger.reset();

        this.setFraccao('A', CrowdModel.fraccaoRepouso, false);
        this.setFraccao('B', CrowdModel.fraccaoRepouso, false);
        this._criarCaminhantes(scene);
        return this._meshes;
    },

    /*
    Muda a fracção de uma claque que está de pé.
    */
    setFraccao(claque, fraccao, festa, fracSalto) {
        if (!this._uniforms) return;
        const i = (claque === 'A') ? 'x' : 'y';
        const u = this._uniforms;

        // A fatia de ultras desta claque (ver CrowdModel.fraccaoSaltoLuto):
        // no golo, quem sofreu nao tem ninguem a saltar.
        u.uFracSalto.value[i] = (typeof fracSalto === 'number')
            ? fracSalto : CrowdModel.fraccaoSaltoSempre;

        if (this._frac[claque] !== fraccao) {
            u.uFracAnt.value[i] = (this._frac[claque] < 0) ? fraccao : this._frac[claque];
            u.uFracNova.value[i] = fraccao;
            u.uTempoTroca.value[i] = this._tempo;
            this._frac[claque] = fraccao;
        }
        u.uFesta.value[i] = festa ? 1 : 0;
    },

    /*
    Corre por frame, a partir do `Match.updateCrowd`.

    O único uniform escrito por frame é o tempo. As fracções só se escrevem
    quando o lance muda — e o `setFraccao` já filtra o que não mudou.
    */
    update(dt) {
        if (!this._uniforms) return;
        // Na vista 2D (camara `topdown`) a bancada nao se anima: fica parada e volta a mexer quando a camara sair dali.
        if (typeof window !== 'undefined' && window.cameraMode === 'topdown') return;
        this._tempo += dt;
        this._uniforms.uTempo.value = this._tempo;

        if (typeof Match === 'undefined' || !Match.ball) return;

        // A entrada dos times (so a do inicio do jogo): progresso = fraccao do trio e dos 22 que ja saiu do tunel.
        let abertura = null;
        if (Match.state === 'ABERTURA' && typeof Abertura !== 'undefined' && Abertura.activa && Abertura.modo === 'inicio') {
            const n = Abertura.partes.length;
            abertura = { progresso: (Abertura.fase === 'entrada' && n) ? Abertura.partes.filter(s => s.spawned).length / n : 1 };
        }

        // Aplausos: a toda a forca na entrada dos times; no resto do jogo o nivel de repouso.

        const r = CrowdTrigger.avaliar({
            abertura: abertura,
            estado: Match.state,
            posse: Match.possessionTeam,
            bolaZ: Match.ball.position.z,
            /*
            QUEM MARCOU, e nao quem tocou por ultimo: num autogolo as duas
            coisas sao equipas diferentes e era a bancada errada a festejar.
            O `golMarcadoPor` e escrito pelo creditarGolo (match_physics.js),
            que ja tinha esta regra escrita para o placar.
            */
            equipaQueMarcou: Match.golMarcadoPor || Match.lastTouchedTeam,
            dt: dt
        });

        // No golo, os ultras de quem sofreu tambem param — senao a bancada
        // derrotada continua a saltar ao lado da que festeja.
        const luto = r.festa ? (r.festa === 'A' ? 'B' : 'A') : null;
        const salto = (claque) => r.semSalto ? 0 : (luto === claque)
            ? CrowdModel.fraccaoSaltoLuto : CrowdModel.fraccaoSaltoSempre;

        this.setFraccao('A', r.A, r.festa === 'A', salto('A'));
        this.setFraccao('B', r.B, r.festa === 'B', salto('B'));

        // PALMAS: na entrada dos times a fracao de sempre; no jogo, so a claque cujo time tem um lance perigoso (esta no ataque) e `perigo` dela bate palmas.
        const U = this._uniforms, AP = CrowdModel.aplauso;
        if (U.uFracPalmas) {
            const perigo = (f, claque) => (r.festa || r.semSalto || f < CrowdModel.fraccaoAtaque - 1e-6) ? 0 : AP.perigo;
            const pA = abertura ? AP.fracao : perigo(r.A, 'A'), pB = abertura ? AP.fracao : perigo(r.B, 'B');
            U.uFracPalmas.value.set(pA, pB);
            U.uPalmasFirme.value = (!abertura && (pA > 0 || pB > 0)) ? 1 : 0;
            U.uAplauso.value = (abertura || pA > 0 || pB > 0) ? AP.entrada : AP.repouso;
        }
        this._atualizarCaminhantes(dt);
    },

    setVisivel(on) {
        this._ligada = on !== false;   // `cullar` respeita: com a torcida desligada nao volta a mostra-la
        if (!this._grupos) return;
        for (const meshes of this._grupos) {
            for (const canal in meshes) {
                meshes[canal].visible = on;
            }
        }
    }
};
