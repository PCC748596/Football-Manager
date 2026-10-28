/*
=============================================================================
AMBIENTE SONORO — o ruído do estádio
=============================================================================
Uma faixa em loop (assets/SoccerStadium1.mp3), com o volume a acompanhar o
que se passa no jogo: sobe quando uma equipa ataca, dispara no golo, e volta
ao murmúrio de fundo quando o jogo está parado.

O VOLUME SEGUE A MESMA FONTE QUE A BANCADA. O `CrowdTrigger` (js/crowd.js) já
decide quantos adeptos estão de pé a partir do estado do jogo; ler daí é o que
mantém o som e a imagem a dizer a mesma coisa. Com um gatilho próprio, o
público levantava-se num lance e o som subia noutro.

AUTOPLAY. Os browsers não deixam tocar áudio antes de a pessoa interagir com a
página — o `play()` é recusado com uma promessa rejeitada, sem erro visível.
Por isso a primeira tentativa é no arranque (funciona se a pessoa já tiver
interagido, por exemplo ao recarregar) e há uma segunda ligada ao primeiro
clique ou tecla.
=============================================================================
*/

const AmbienteSonoro = {
    /*
    Volumes por situação. São baixos de propósito: isto é ruído de fundo, e um
    som de estádio a tocar alto durante 90 minutos cansa em três.
    */
    volumeRepouso: 0.25,
    volumeAtaque: 0.55,
    volumeGolo: 1.00,

    /*
    O GRITO DO GOLO e uma faixa PROPRIA, nao a de fundo mais alta.

    O golo levantava o volume do murmurio do estadio ate 1.0 — mais alto, mas
    o mesmo som: um estadio a murmurar. O grito e outra coisa, e agora e o
    `assets/Soccer_Crowd_Cheerin.mp3`, disparado uma vez na entrada em GOAL e
    tocado POR CIMA da faixa de fundo, que baixa para lhe dar espaco.
    */
    ficheiroGrito: 'assets/Soccer_Crowd_Cheerin.mp3',
    volumeGrito: 0.9,
    // Enquanto o grito toca, o fundo baixa para isto (fica la, mas atras).
    volumeFundoNoGrito: 0.35,

    /*
    AS PALMAS E O PERIGO DE GOL (faixas PROPRIAS, por cima do fundo, que NAO baixa nem para: o som normal da torcida continua sempre).
      `Crowd_claps.wav`     em loop enquanto a torcida bate palmas (um lance perigoso do seu time, `Crowd.uniforms.uPalmasFirme`): entra e sai com uma rampa.
      `Crowd_reacting.wav`  o "ohh" da bancada num perigo de gol: um remate perigoso (xG), um penalti, um cara a cara; no maximo um a cada `reacaoIntervalo` s.
    */
    ficheiroPalmas: 'assets/Crowd_claps.wav',
    palmasSom: false,           // desligado por enquanto (pedido): o som das palmas nao toca. `true` volta.
    volumePalmas: 0.3,
    palmasRampa: 1.2,           // s para entrar e para sair
    ficheiroReacao: 'assets/Crowd_reacting.wav',
    volumeReacao: 0.8,
    reacaoIntervalo: 5.0,
    reacaoXgMin: 0.07,
    _palmas: null,
    _reacao: null,
    _perigoPendente: false,
    _palmasVol: 0,
    _reacaoRelogio: -99,

    // Segundos para o volume subir e descer. A subida é mais rápida do que a
    // descida: uma bancada acende-se de repente e vai-se abaixo devagar.
    subida: 0.6,
    descida: 2.5,

    _audio: null,
    _grito: null,
    _estadoAnterior: null,
    /*
    ARRANCA DESLIGADO, e o botão do painel nasce em OFF a condizer
    (index.html, `btn-som`). Quem quiser som liga-o; um separador a abrir
    sozinho com estádio a tocar é intrusivo, e a política de autoplay dos
    browsers ia recusá-lo na mesma até à primeira interacção.
    */
    _ligado: false,
    _alvo: 0.25,
    _actual: 0.25,
    _tentouTocar: false,

    init() {
        this._audio = new Audio('assets/SoccerStadium1.mp3');
        this._grito = new Audio(this.ficheiroGrito);
        this._grito.preload = 'auto';
        this._grito.volume = this.volumeGrito;
        this._audio.loop = true;
        this._audio.preload = 'auto';
        this._palmas = new Audio(this.ficheiroPalmas);
        this._palmas.loop = true; this._palmas.preload = 'auto'; this._palmas.volume = 0;
        this._reacao = new Audio(this.ficheiroReacao);
        this._reacao.preload = 'auto'; this._reacao.volume = this.volumeReacao;
        /*
        O PERIGO DE GOL toca DEPOIS do lance, nunca no momento do remate (pedido): so apos a DEFESA do guarda-redes ou quando a bola SAI de campo (canto, tiro de meta, lateral).
        O remate perigoso (xG) fica "pendente" e o desfecho decide: 'defesa' toca; 'golo' e 'bloqueado' limpam (o golo tem a festa propria); a saida de campo e lida no `update`.
        */
        if (typeof Eventos !== 'undefined' && Eventos.aoRegistar) Eventos.aoRegistar((ev) => {
            if (!ev || ev.tipo !== 'REMATE') return;
            if (!ev.desfecho) { this._perigoPendente = (ev.xg || 0) >= this.reacaoXgMin; return; }
            if (ev.desfecho === 'defesa' && this._perigoPendente) this.reagirAoPerigo();
            this._perigoPendente = false;
        });
        // Desligado nasce MESMO a zero: o `update` só corrige no frame
        // seguinte, e esse frame chegava a sair com som.
        this._audio.volume = this._ligado ? this._actual : 0;

        this.tentarTocar();

        /*
        Segunda tentativa, à primeira interacção. `once` em ambos: depois de
        um deles pegar, o outro deixa de interessar.
        */
        const arrancar = () => this.tentarTocar();
        window.addEventListener('pointerdown', arrancar, { once: true });
        window.addEventListener('keydown', arrancar, { once: true });
    },

    tentarTocar() {
        if (!this._audio || !this._ligado || this._pausado) return;
        if (this._tentouTocar && !this._audio.paused) return;
        const p = this._audio.play();
        if (p && p.catch) {
            // Recusado pela política de autoplay: não é erro, fica à espera da
            // interacção. Um console.error aqui só sujava a consola.
            p.then(() => { this._tentouTocar = true; }).catch(() => { });
        } else {
            this._tentouTocar = true;
        }
    },

    /*
    Corre por frame. O alvo do volume sai do que a claque está a fazer — a
    mesma leitura que põe os adeptos de pé.
    */
    update(dt) {
        if (!this._audio) return;

        /*
        O GRITO DISPARA NA ENTRADA EM GOAL, e so uma vez: enquanto o estado
        for GOAL a faixa continua a tocar sozinha ate ao fim.
        */
        const estado = (typeof Match !== 'undefined') ? Match.state : null;
        // O estado GOAL sem golo (a caminhada de saida depois da abertura do jogo, Match.semFestaDeGolo): sem grito.
        if (estado !== 'GOAL' && typeof Match !== 'undefined') Match.semFestaDeGolo = false;
        if (estado === 'GOAL' && this._estadoAnterior !== 'GOAL' && !Match.semFestaDeGolo) this.gritarGolo();
        this._estadoAnterior = estado;

        this._alvo = this.volumeAlvo();

        // Aproximação exponencial, com constante de tempo diferente a subir e
        // a descer.
        const tau = (this._alvo > this._actual) ? this.subida : this.descida;
        const k = 1 - Math.exp(-dt / Math.max(0.01, tau));
        this._actual += (this._alvo - this._actual) * k;

        this._atualizarPalmas(dt);
        // BOLA NA TRAVE (poste ou travessao) tambem e perigo de gol: toca logo apos a batida na madeira (`Match.ultimoRemate.bateuNaTrave`, posto no colidirComBaliza), uma vez por remate.
        const rm = (typeof Match !== 'undefined') ? Match.ultimoRemate : null;
        if (rm && rm.bateuNaTrave && !rm._somTrave) { rm._somTrave = true; this._perigoPendente = false; this.reagirAoPerigo(); }
        // A bola saiu de campo com um remate perigoso por resolver: o "ohh" toca agora.
        if (this._perigoPendente && (estado === 'CORNER_KICK' || estado === 'GOAL_KICK' || estado === 'THROW_IN')) { this._perigoPendente = false; this.reagirAoPerigo(); }
        else if (this._perigoPendente && (estado === 'GOAL' || estado === 'FREE_KICK' || estado === 'PENALTY' || estado === 'INTERVALO' || estado === 'FIM_DE_JOGO')) this._perigoPendente = false;

        // Com o grito no ar, o fundo sai da frente.
        const aGritar = !!(this._grito && !this._grito.paused && !this._grito.ended);
        const tecto = aGritar ? this.volumeFundoNoGrito : 1;
        this._audio.volume = this._ligado
            ? Math.max(0, Math.min(tecto, this._actual))
            : 0;
    },

    // As palmas: em loop enquanto a bancada bate palmas num lance perigoso; rampa de entrada e de saida, e pausam-se quando chegam a zero.
    _atualizarPalmas(dt) {
        if (!this._palmas) return;
        const U = (typeof Crowd !== 'undefined') ? Crowd._uniforms : null;
        // Bate palmas sempre que alguma claque tem fracao de palmas (na entrada dos times e nos lances perigosos), nao so no lance perigoso (`uPalmasFirme`).
        const fp = U && U.uFracPalmas ? U.uFracPalmas.value : null;
        const aBater = !!(this.palmasSom && this._ligado && !this._pausado && fp && ((fp.x || 0) > 0.01 || (fp.y || 0) > 0.01));
        const alvo = aBater ? this.volumePalmas : 0;
        const passo = this.volumePalmas * dt / Math.max(0.05, this.palmasRampa);
        this._palmasVol = this._palmasVol < alvo ? Math.min(alvo, this._palmasVol + passo) : Math.max(alvo, this._palmasVol - passo);
        this._palmas.volume = Math.max(0, Math.min(1, this._palmasVol));
        if (aBater && this._palmas.paused) { const pr = this._palmas.play(); if (pr && pr.catch) pr.catch(() => { }); }
        else if (!aBater && this._palmasVol <= 0.001 && !this._palmas.paused) this._palmas.pause();
    },

    // O "ohh" do perigo de gol, por cima do som de fundo (que continua); dois perigos seguidos nao se montam um no outro.
    reagirAoPerigo() {
        if (!this._reacao || !this._ligado || this._pausado) return;
        const t = (typeof Match !== 'undefined' && typeof Match.tempoDeJogo === 'number') ? Match.tempoDeJogo : 0;
        if (t - this._reacaoRelogio < this.reacaoIntervalo && t >= this._reacaoRelogio) return;
        this._reacaoRelogio = t;
        this._reacao.volume = this.volumeReacao;
        try { this._reacao.currentTime = 0; } catch (e) { /* ainda sem dados */ }
        const pr = this._reacao.play();
        if (pr && pr.catch) pr.catch(() => { });
    },

    /*
    Lê o estado do jogo pelo mesmo caminho que a bancada: se alguma claque
    está a festejar, é golo; se alguma está de pé acima do repouso, há ataque.
    Sem o Crowd carregado, fica no murmúrio de fundo.
    */
    volumeAlvo() {
        if (typeof Crowd === 'undefined' || !Crowd._frac) return this.volumeRepouso;
        if (typeof Match !== 'undefined' && Match.state === 'GOAL' && !Match.semFestaDeGolo) return this.volumeGolo;

        const maior = Math.max(Crowd._frac.A || 0, Crowd._frac.B || 0);
        const repouso = (typeof CrowdModel !== 'undefined') ? CrowdModel.fraccaoRepouso : 0.08;
        return (maior > repouso + 0.01) ? this.volumeAtaque : this.volumeRepouso;
    },

    /*
    Toca o grito do inicio. Se o golo anterior ainda estiver a soar, recomeca
    — dois golos seguidos sao dois gritos, nao um a montar-se no outro.
    */
    gritarGolo() {
        if (!this._grito || !this._ligado) return;
        this._grito.volume = this.volumeGrito;
        try { this._grito.currentTime = 0; } catch (e) { /* ainda sem dados */ }
        const pr = this._grito.play();
        // Recusado pela politica de autoplay: nao e erro (ver tentarTocar).
        if (pr && pr.catch) pr.catch(() => { });
    },

    /*
    PAUSA — o jogo pára e o estádio tem de parar com ele.

    O `update` vive dentro do `Match.update`, que não corre em pausa: a rampa
    de volume congelava mas o elemento <audio> continuava a tocar o loop do
    estádio no volume em que ia. Pausar o jogo e continuar a ouvir a multidão é
    o defeito.

    Guarda-se se ele estava mesmo a tocar, para o retomar só nesse caso — em
    pausa com o som desligado no painel não há nada para retomar.
    */
    setPausa(on) {
        this._pausado = !!on;
        if (!this._audio) return;
        if (on) {
            this._tocavaAntesDaPausa = !this._audio.paused;
            this._audio.pause();
            if (this._grito) this._grito.pause();
            if (this._palmas) this._palmas.pause();
            if (this._reacao) this._reacao.pause();
        } else if (this._ligado && this._tocavaAntesDaPausa) {
            this.tentarTocar();
        }
    },

    setLigado(on) {
        this._ligado = on;
        if (!this._audio) return;
        if (on) this.tentarTocar();
        else {
            this._audio.volume = 0;
            if (this._grito) { this._grito.pause(); this._grito.volume = 0; }
            if (this._palmas) { this._palmas.pause(); this._palmasVol = 0; }
            if (this._reacao) this._reacao.pause();
        }
    },

    get ligado() { return this._ligado; }
};
