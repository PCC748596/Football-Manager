/*
=============================================================================
ESTÁDIOS — um perfil por estádio
=============================================================================
Pedido: o estádio de sempre fica como o PADRÃO do jogo; os outros nascem como
perfis que o substituem, a partir de fotografias e do mapa das ruas.

Um perfil muda três coisas, e só estas:

    1. A BACIA (createField, match_setup.js): a que distância das linhas a
       primeira fila começa (`recuoLateral`, `recuoFundo`) e o raio do arco das
       esquinas (`raioCanto`). Um raio grande torna o anel oval: as rectas
       encolhem e as esquinas tomam conta do contorno.
    2. O ANEL (`bancadaAneis`): degraus, cobertura, cores — sobrepõe-se ao
       BancadaAneis (config/physics.js).
    3. A CIDADE (`cidade`): sobrepõe-se ao CidadeConfig (config/cidade.js). A
       fachada, a pegada do estádio e a esplanada saem das contas da bacia
       (`derivar`), para nunca ficarem desencontradas dela.

Escolha: `?estadio=maracana` no URL; sem ele, ou com um nome desconhecido, fica
o padrão. `Estadios.paraEquipa(nome)` devolve o perfil do estádio de uma equipa
(pelo nome do estádio em assets/teams.json).

Este ficheiro tem de carregar DEPOIS de config/physics.js e config/cidade.js e
ANTES do Match.init: os sobrepostos têm de estar no sítio quando o createField
corre.
=============================================================================
*/
const Estadios = {
    // A bacia de sempre. É o que o createField usava escrito à mão.
    padrao: { recuoLateral: 12.0, recuoFundo: 12.0, raioCanto: 6.5 },

    perfis: {
        /*
        MARACANÃ — Rio de Janeiro (Flamengo, Fluminense).

        Das fotografias: bacia oval de dois anéis, com a cobertura branca num
        anel contínuo que cobre quase toda a arquibancada e deixa o relvado a
        céu aberto. Na foto aérea o oval é bem mais largo do que o campo: nos
        cantos sobra relva à volta das bandeiras.

        `raioCanto` 44: o centro do arco fica em (4, 28.5) e o canto do campo
        (34, 52.5) a 38.4 m dele — 5.6 m para dentro da primeira fila, ou seja
        nenhuma esquina do campo toca a bancada.
        */
        maracana: {
            nome: 'Maracanã',
            cidadeNome: 'Rio de Janeiro',
            estadios: ['maracanã', 'estádio maracanã', 'estadio maracana', 'maracana', 'estádio jornalista mário filho', 'estadio jornalista mario filho'],
            /*
            A BACIA: uma elipse, sem rectas, de uma rampa só (js/estadio_oval.js).
            A primeira fila fica a 26 m das laterais e a 30 m dos fundos — o
            canto do campo (34, 52.5) cai a 72% do raio da elipse, ou seja 12 m
            para dentro dela. 62 degraus de 1.2 x 0.5 m dão 74 m de fundo e 31
            m de altura (o Maracanã real tem ~32 m). Com cadeiras de 0.46 m, a cintura e os corredores
            medem-se 78 862 lugares (a capacidade do manager é 78 838) (tests/estadios.test.js).
            */
            bacia: {
                forma: 'oval', recuoLateral: 26.0, recuoFundo: 30.0, raioCanto: 6.5,
                maxLugares: 90000,
                oval: {
                    espacoCadeira: 0.46, setores: 40, larguraCorredor: 1.6,
                    corBetao: 0xc9ccd0,
                    // O túnel dos jogadores: `maisFundo` m mais para dentro da arquibancada e pintado de `cor` (preto).
                    tunel: { maisFundo: 8, cor: 0x0b0c0e },
                    // As passagens da torcida (mapa de setores): cintura sem cadeiras entre o anel de baixo e o de cima, corredores radiais por anel e maiores nas fronteiras dos setores.
                    cintura: { fila: 26, filas: 2 }, corCintura: 0xe6e8ea,
                    setoresInferior: 24, corredorInferior: 2.2, setoresSuperior: 56, corredorSuperior: 1.3,
                    corredorMaior: 3.6, anguloLateral: 50,
                    // As quatro torres de rampa nos cantos (E, F, B, C do mapa de setores): volume rectangular de cantos arredondados, com a rampa dentro, em 2 voltas.
                    torresRampa: {
                        angulos: [60, 120, 240, 300], afastamento: 17, meiaComp: 20, meiaLarg: 10, raio: 6, largura: 5, altura: 18, voltas: 2,
                        corRampa: 0xcfd3d6, corReguas: 0xc9c4b8, corTelhado: 0xf4f4f2
                    }, corSubrampa: 0x3b4048, corDegrau: 0x535b66, corChaoSob: 0x30343a, ledsBeiral: 240, ledsChao: 110, spotsCor: 8, spotsTopo: 12, spotsAlcance: 75, spotsIntensidade: 3.0, paineisSob: 90, luzesSob: 14, luzesSobAlcance: 60, luzesSobIntensidade: 1.0, distanciaRefLuz: 58,
                    // A cobertura (da fotografia): cobre a arquibancada quase toda, do 8.º degrau ao topo, e sobe 9 m para o meio.
                    coberturaDesdeFila: 8, coberturaFolga: 4.5, coberturaSubida: 9.0, coberturaSaliencia: 5.0, coberturaEspessura: 0.6, cornija: 2.2,
                    corCobertura: 0xf4f6f8, corCoberturaBaixo: 0xc4cad1, corNervura: 0xb8bfc7, corPilar: 0xeceff1,
                    nervuras: 160, colunas: 96, colunaRadial: 1.1, colunaTangencial: 1.8, torresHolofotes: 14
                },
                // Do fundo para o topo: amarelo no primeiro bloco, depois o azul escuro da fotografia, e a cintura de passagem.
                cadeiras: {
                    base: '#1d3a78',
                    faixas: [[0, 1, '#e8e4d4'], [2, 15, '#d9a62a'], [16, 17, '#e8e4d4'], [32, 33, '#e8e4d4'], [62, 63, '#e8e4d4']]
                }
            },
            torcidaInicial: 22000,
            // A ordem em que a torcida ocupa a bacia: Norte e Sul inferior; Oeste e Leste inferior; Norte e Sul superior; Oeste superior (cadeiras cativas); Leste superior. `filaDivisao` separa inferior de superior.
            // Norte/Sul = os fundos; Oeste = lado -x (o do túnel); Leste = +x, dividido na fila `filaLesteSuperior`; `anguloLateral` = meia abertura das laterais.
            setoresTorcida: { anguloLateral: 50, filaDivisao: 28 },
            cameraCinemaEscala: 1.6,
            nevoeiroEscala: 2.5,
            bancadaAneis: { aneis: 1, degrausPorAnel: 62, cobertura: false },
            // Só o estádio e a praça com as entradas: sem ruas, quarteirões, trânsito nem metrô.
            cidade: {
                soEstadio: true, vias: [], passarelas: [], ruas: [],
                metro: { bocas: [] }, transito: { carros: 0, taxis: 0, onibus: 0 },
                gente: { ativa: true, total: 1000, filasIniciais: 220 },
                praca: { margem: 40 }
            },
            // A rampa de acesso ao anel de cima, pelo lado leste (foto da praça da Estátua do Bellini).
            // A rampa dupla da fotografia (imagem da rampa): sobe do chão perto do estádio até ao patamar do fundo (barra do T, 15 m) e volta, a subir, até 10 m abaixo da cobertura (5 m mais baixo do que estava).
            // Uma de cada lado (leste e oeste), espelhadas.
            rampas: [1, -1].map(lado => ({
                dupla: true, lado, z: 0, comprimento: 105, inicioA: 10, larguraA: 14, larguraB: 10, vao: 7, extra: 6,
                patamar: 16, alturaMeio: 15, abaixoDaCobertura: 10, cor: 0xcfd3d6, corGuarda: 0xe4e6e8
            }))
        }
    },

    atual: null,        // o perfil em vigor (null = padrão)

    escolher(nome) {
        const chave = String(nome || '').toLowerCase();
        return this.perfis[chave] || null;
    },

    // O perfil do estádio com este nome (como vem do teams.json), ou null.
    paraEquipa(nomeEstadio) {
        const n = String(nomeEstadio || '').trim().toLowerCase();
        if (!n) return null;
        for (const k of Object.keys(this.perfis)) {
            if (this.perfis[k].estadios.indexOf(n) >= 0) return this.perfis[k];
        }
        return null;
    },

    /*
    As cores das luzes de fora e da cobertura: as do clube MANDANTE (`?mandante=` no
    URL; o manager passa o nome da equipa da casa). Flamengo: vermelho e preto;
    Fluminense: verde e vermelho. Sem clube conhecido: branco neutro.
    */
    clubes: {
        flamengo: { a: 0xe3162b, b: 0x050505 },
        fluminense: { a: 0xe0102a, b: 0x0a9d44 }
    },
    coresDoMandante() {
        let nome = '';
        try { nome = (new URLSearchParams(window.location.search).get('mandante') || '').toLowerCase(); } catch (e) { /* sem URL */ }
        for (const k of Object.keys(this.clubes)) if (nome.indexOf(k) >= 0) return this.clubes[k];
        return { a: 0xffffff, b: 0x9fb0c8, neutro: true };
    },

    // A bacia em vigor: a do perfil, ou a de sempre.
    bacia() {
        return Object.assign({}, this.padrao, this.atual && this.atual.bacia);
    },

    /*
    Aplica um perfil. Só mexe nas configs que o perfil nomeia, e guarda o que
    havia (`_guardado`) para `repor` voltar ao padrão sem recarregar.
    */
    aplicar(perfil) {
        this.repor();
        if (!perfil) return;
        this.atual = perfil;
        // Toda a config da cidade é dado puro: guarda-se uma cópia inteira para o `repor`.
        this._guardado = { aneis: Object.assign({}, window.BancadaAneis), cidade: JSON.parse(JSON.stringify(CidadeConfig)) };
        Object.assign(BancadaAneis, perfil.bancadaAneis || {});
        this.derivar(perfil);
        // O que o perfil escreve à mão na cidade vem depois das contas.
        for (const k of Object.keys(perfil.cidade || {})) {
            const v = perfil.cidade[k];
            if (v && typeof v === 'object' && !Array.isArray(v) && CidadeConfig[k]) Object.assign(CidadeConfig[k], v);
            else CidadeConfig[k] = v;
        }
    },

    repor() {
        const g = this._guardado;
        if (!g) { this.atual = null; return; }
        Object.assign(BancadaAneis, g.aneis);
        for (const k of Object.keys(CidadeConfig)) delete CidadeConfig[k];
        Object.assign(CidadeConfig, g.cidade);
        this._guardado = null;
        this.atual = null;
    },

    // A bacia oval: a pegada é a elipse da primeira fila mais os degraus e o muro; a fachada é essa elipse.
    derivarOval(perfil, b) {
        const rows = BancadaAneis.degrausPorAnel;
        const a0 = CAMPO_LARG / 2 + b.recuoLateral, b0 = CAMPO_COMP / 2 + b.recuoFundo;
        const prof = rows * 1.2 + 0.6;
        const topo = EstadioOval.alturas(rows, b.oval).yMuro;
        CidadeConfig.estadio.meiaX = Math.ceil((a0 + prof + 0.9) * 2) / 2;
        CidadeConfig.estadio.meiaZ = Math.ceil((b0 + prof + 0.9) * 2) / 2;
        // A fachada: a casca em volta do muro, à altura dele.
        const F = CidadeConfig.fachada, k = topo / 27.8;
        F.elipse = { a: a0, b: b0, d: prof + 0.2 };
        F.ativa = true;
        F.semCasca = true;      // aberto entre as colunas: sem a casca nem as colunas da cidade
        F.perfil = this._perfilPadrao.map(([d, h]) => [d, h * k]);
        F.vao = 6.0;
        // O x da fachada à altura z de cada rampa: onde a rampa encosta.
        const xFachada = (z) => {
            let melhor = 1e9, x = 0;
            for (let i = 0; i <= 3600; i++) {
                const p = EstadioOval.ponto(a0, b0, F.elipse.d, (i / 3600) * Math.PI * 2);
                if (p.x > 0 && Math.abs(p.z - z) < melhor) { melhor = Math.abs(p.z - z); x = p.x; }
            }
            return x;
        };
        const altCob = EstadioOval.alturas(rows, b.oval);
        CidadeConfig.rampas = (perfil.rampas || []).map(r => {
            const ate = xFachada(r.z) + 0.5;
            const base = Object.assign({ ate, de: ate + (r.comprimento || 110) }, r);
            // A rampa dupla sobe até 10 m abaixo da cobertura; a largura total serve à reserva do chão.
            if (r.dupla) {
                base.alturaTopo = altCob.yOut - (r.abaixoDaCobertura || 5);
                base.largura = r.larguraA + r.larguraB + r.vao + 2 * r.extra;
                base.de = ate + r.comprimento + r.patamar;
            }
            return base;
        });
        this.medidas = { bancadaX: a0, bancadaZ: b0, profundidade: prof, topo };
        // A câmara TV Centro: na 13.ª fila, 14 m acima das cadeiras (4 m + 10 m a pedido; no estádio padrão fica na ponta da cobertura).
        this.cameraTV = { x: a0 + 12 * 1.2, y: 0.25 + 12 * 0.5 + 4.0 + 10.0 };
    },

    /*
    As contas do createField, repetidas para a cidade: a pegada do estádio e a
    fachada que o embrulha. Se o createField mudar, mudar aqui (o teste
    `estadios.test.js` compara as duas).

        PASSO_PROF   rows*1.2 - coberturaAvanco + recuoSobreCobertura
        profundidade PASSO_PROF*(aneis-1) + rows*1.2 + espessuraParede
    */
    derivar(perfil) {
        const b = Object.assign({}, this.padrao, perfil.bacia);
        const BA = BancadaAneis;
        if (b.forma === 'oval') return this.derivarOval(perfil, b);
        const meiaCampoX = CAMPO_LARG / 2, meiaCampoZ = CAMPO_COMP / 2;
        const bancadaX = meiaCampoX + b.recuoLateral, bancadaZ = meiaCampoZ + b.recuoFundo;
        const passoProf = (BA.cobertura && BA.coberturaAvanco > 0)
            ? BA.degrausPorAnel * 1.2 - BA.coberturaAvanco + (BA.recuoSobreCobertura || 3.0)
            : BA.degrausPorAnel * 1.2 + BA.espessuraParede;
        const prof = passoProf * (Math.max(1, BA.aneis) - 1) + BA.degrausPorAnel * 1.2 + BA.espessuraParede;
        const topo = (Math.max(1, BA.aneis) - 1) * (BA.degrausPorAnel * 0.5 + BA.alturaParede)
            + BA.degrausPorAnel * 0.5 + BA.alturaParede + BA.coberturaEspessura;

        CidadeConfig.estadio.meiaX = Math.ceil((bancadaX + prof + 0.9) * 2) / 2;
        CidadeConfig.estadio.meiaZ = Math.ceil((bancadaZ + prof + 0.9) * 2) / 2;
        // A fachada acompanha o contorno da bacia e a altura do topo da cobertura.
        const F = CidadeConfig.fachada, k = topo / 27.8;
        F.centroX = bancadaX - b.raioCanto;
        F.centroZ = bancadaZ - b.raioCanto;
        F.raio = b.raioCanto + prof;
        F.perfil = this._perfilPadrao.map(([d, h]) => [d, h * k]);
        F.vao = Math.min(F.vao, 5.5 * k);
        CidadeConfig.rampas = (perfil.rampas || []).map(r =>
            Object.assign({ ate: CidadeConfig.estadio.meiaX + 0.5 }, r));
        this.medidas = { bancadaX, bancadaZ, cantoX: F.centroX, cantoZ: F.centroZ, profundidade: prof, topo };
    }
};
Estadios._perfilPadrao = (typeof CidadeConfig !== 'undefined')
    ? CidadeConfig.fachada.perfil.map(p => p.slice()) : [];

(function () {
    if (typeof window === 'undefined') return;
    window.Estadios = Estadios;
    try {
        const p = new URLSearchParams(window.location.search).get('estadio');
        if (p) Estadios.aplicar(Estadios.escolher(p) || Estadios.paraEquipa(p));
    } catch (e) { console.error('Estadios.aplicar falhou:', e); }
})();
