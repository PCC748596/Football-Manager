/*
=============================================================================
EFEITOS SONOROS — o apito do árbitro e o chute na bola
=============================================================================
Duas amostras curtas (assets/apito.mpeg, assets/chute.mpeg), disparadas por
acontecimentos do jogo. Não é ambiente: o `AmbienteSonoro` é uma faixa em loop
com o volume a acompanhar a bancada, isto são sons pontuais.

POOL DE VOZES, e é a razão de este módulo não ser três linhas. Um único
elemento `Audio` por som não se sobrepõe a si próprio: chamar `play()` numa
amostra que ainda está a tocar reinicia-a. Num remate seguido de um corte, ou
num apito de falta em cima de outro, o segundo som comia o primeiro. Cada som
tem `vozes` cópias e usa-se a que estiver livre — e se nenhuma estiver, a mais
antiga, que é a que já quase acabou.

O INTERRUPTOR É O MESMO do ambiente. O botão do painel (`btn-som`) chama o
`AmbienteSonoro.setLigado`, e este módulo lê `AmbienteSonoro.ligado` na hora de
tocar: um só botão desliga o som todo, que é o que a pessoa espera. Sem o
`AmbienteSonoro` carregado, toca (é a resposta menos surpreendente para quem
incluir só este ficheiro).

CADÊNCIA MÍNIMA por som (`intervaloMin`): um passe, um corte e outro passe no
mesmo terço de segundo davam três chutes sobrepostos, que se ouve como um
estalo. O primeiro toca, os que caem dentro da janela não.
=============================================================================
*/

const EfeitosSonoros = {
    /*
    Volumes por som. O apito é o mais alto de propósito — é uma decisão de
    arbitragem, tem de cortar o ruído do estádio; o chute vive por baixo dele.
    */
    volumeApito: 0.4,
    volumeChute: 0.40,

    // Quantas cópias de cada som podem tocar ao mesmo tempo.
    vozes: 4,

    // Segundos mínimos entre dois disparos do MESMO som.
    intervaloMinApito: 0.25,
    intervaloMinChute: 0.08,

    /*
    Distância a partir da qual o chute deixa de se ouvir, e a que ele já está
    ao pé do ouvido. Entre as duas o volume cai linearmente — sem isto, um
    passe no outro extremo do campo soava tão perto como um remate à nossa
    frente. O apito não leva isto: o árbitro apita para o estádio.
    */
    distChuteMax: 60.0,
    distChutePerto: 12.0,

    _sons: {},
    _iniciado: false,
    _ctx: null,

    /*
    WEB AUDIO EM VEZ DE <audio>. Tocar um `HTMLAudioElement` (`currentTime = 0; play()`) no Safari do iPad bloqueia a thread principal por dezenas de milissegundos — medido no painel
    de performance: no passe e no chute o pior quadro saltava de 25 para 168 ms, sem torcida. Aqui a amostra e decodificada UMA vez para um `AudioBuffer` e cada disparo cria um
    `AudioBufferSourceNode` (barato, e toca fora da thread principal). Os elementos `Audio` ficam como reserva: enquanto o buffer nao carregou, ou o contexto de audio nao esta
    ativo (o iOS so o liberta depois de um toque do utilizador), toca-se pelo caminho de sempre.
    */
    _iniciarWebAudio() {
        if (this._ctx || typeof window === 'undefined') return;
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        try { this._ctx = new AC(); } catch (e) { this._ctx = null; return; }
        const destravar = () => { if (this._ctx && this._ctx.state !== 'running') { try { this._ctx.resume(); } catch (e) { /* ignora */ } } };
        ['pointerdown', 'touchstart', 'touchend', 'keydown', 'click'].forEach(ev => window.addEventListener(ev, destravar, { passive: true }));
    },
    /*
    SONS EXTRA POR WEB AUDIO (o grito de golo e a reacao da torcida, do AmbienteSonoro): so o buffer, sem elementos <audio>. No iPad um <audio> so toca por codigo depois de ele proprio ter sido
    iniciado por um toque do utilizador — o grito nunca o tinha sido e saia mudo. O contexto de Web Audio, esse, fica liberto com qualquer toque (ver `_iniciarWebAudio`).
    */
    registarBuffer(nome, url) {
        if (!this._ctx) this._iniciarWebAudio();
        if (!this._ctx) return;
        this._sons[nome] = this._sons[nome] || { vozes: [], volume: 1, proxima: 0, ultimo: -Infinity, buffer: null, ativos: new Set() };
        this._carregarBuffer(nome, url);
    },
    /** Toca um buffer registado; devolve false se nao deu (sem contexto, buffer por carregar, contexto suspenso) — o chamador cai no caminho de sempre. */
    tocarBuffer(nome, volume) {
        const som = this._sons[nome];
        if (!this._ctx || !som || !som.buffer) return false;
        if (this._ctx.state !== 'running') { try { this._ctx.resume(); } catch (e) { /* ignora */ } return false; }
        try {
            const src = this._ctx.createBufferSource(); src.buffer = som.buffer;
            const g = this._ctx.createGain(); g.gain.value = volume;
            src.connect(g); g.connect(this._ctx.destination);
            for (const a of som.ativos) { try { a.stop(); } catch (e) { /* ja acabou */ } }   // um golo seguido de outro: recomeca
            som.ativos.clear(); som.ativos.add(src);
            src.onended = () => { som.ativos.delete(src); };
            src.start(0);
            return true;
        } catch (e) { return false; }
    },
    _carregarBuffer(nome, url) {
        if (!this._ctx || typeof fetch === 'undefined') return;
        fetch(url).then(r => r.arrayBuffer()).then(ab => {
            // A forma com callbacks funciona em todas as versoes do Safari (a de promessas nem sempre).
            this._ctx.decodeAudioData(ab, (buf) => { if (this._sons[nome]) this._sons[nome].buffer = buf; }, () => { /* fica o <audio> */ });
        }).catch(() => { /* fica o <audio> */ });
    },

    /*
    `caminhos` permite ao chamador trocar os ficheiros sem mexer aqui; a
    omissão usa os do projecto.
    */
    init(caminhos) {
        if (this._iniciado) return;
        this._iniciado = true;

        const c = caminhos || {};
        this._iniciarWebAudio();
        this._criar('apito', c.apito || 'assets/apito.mpeg', this.volumeApito);
        this._criar('chute', c.chute || 'assets/chute.mpeg', this.volumeChute);
        this._carregarBuffer('apito', c.apito || 'assets/apito.mpeg');
        this._carregarBuffer('chute', c.chute || 'assets/chute.mpeg');
    },

    _criar(nome, url, volume) {
        if (typeof Audio === 'undefined') return;   // ambiente sem DOM (testes)
        const vozes = [];
        for (let i = 0; i < this.vozes; i++) {
            const a = new Audio(url);
            a.preload = 'auto';
            a.volume = volume;
            vozes.push(a);
        }
        this._sons[nome] = { vozes: vozes, volume: volume, proxima: 0, ultimo: -Infinity, buffer: null, ativos: new Set() };
    },

    /*
    CALA TUDO O QUE ESTÁ NO AR. Um apito ou um chute disparado no frame antes
    da pausa continuava a tocar até ao fim com o jogo já parado.
    */
    pararTudo() {
        for (const nome of Object.keys(this._sons)) {
            for (const src of this._sons[nome].ativos) { try { src.stop(); } catch (e) { /* ja acabou */ } }
            this._sons[nome].ativos.clear();
            for (const a of this._sons[nome].vozes) {
                try { a.pause(); a.currentTime = 0; } catch (e) { /* sem dados */ }
            }
        }
    },

    /*
    Ligado só quando o ambiente está ligado: um botão, um som. Ver o cabeçalho.
    */
    get ligado() {
        return (typeof AmbienteSonoro === 'undefined') ? true : !!AmbienteSonoro.ligado;
    },

    /*
    Toca uma amostra. `ganho` (0..1) escala o volume base — é por aí que o
    chute longe soa mais baixo do que o chute ao lado.
    */
    tocar(nome, ganho, intervaloMin) {
        if (!this.ligado) return;
        const som = this._sons[nome];
        if (!som || !som.vozes.length) return;

        const agora = (typeof performance !== 'undefined' && performance.now)
            ? performance.now() / 1000 : Date.now() / 1000;
        const janela = (typeof intervaloMin === 'number') ? intervaloMin : 0;
        if (agora - som.ultimo < janela) return;
        som.ultimo = agora;

        const g = (typeof ganho === 'number') ? Math.max(0, Math.min(1, ganho)) : 1;
        // Caminho rapido: AudioBuffer ja carregado e contexto ativo.
        if (this._ctx && som.buffer) {
            if (this._ctx.state === 'running') {
                try {
                    const src = this._ctx.createBufferSource();
                    src.buffer = som.buffer;
                    const ganhoNo = this._ctx.createGain();
                    ganhoNo.gain.value = som.volume * g;
                    src.connect(ganhoNo); ganhoNo.connect(this._ctx.destination);
                    som.ativos.add(src);
                    src.onended = () => { som.ativos.delete(src); };
                    src.start(0);
                    return;
                } catch (e) { /* cai no <audio> */ }
            } else {
                try { this._ctx.resume(); } catch (e) { /* ignora */ }
            }
        }

        // Voz livre; se nenhuma estiver, a próxima da roda (a mais antiga).
        let voz = null;
        for (const a of som.vozes) {
            if (a.paused || a.ended) { voz = a; break; }
        }
        if (!voz) {
            voz = som.vozes[som.proxima];
            som.proxima = (som.proxima + 1) % som.vozes.length;
        }

        voz.volume = som.volume * g;
        try {
            voz.currentTime = 0;
            const pr = voz.play();
            // Autoplay recusado antes da primeira interacção: não é erro.
            if (pr && pr.catch) pr.catch(() => { });
        } catch (e) { /* a amostra ainda não carregou; o próximo disparo pega */ }
    },

    /*
    APITO. Um toque por decisão do árbitro: falta, penálti, golo, começo e fim
    de cada parte.
    */
    apito(forca) {
        this.tocar('apito', forca, this.intervaloMinApito);
    },

    /*
    CHUTE. `pos` é onde a bola foi batida — o volume cai com a distância à
    câmara (ver distChuteMax). `forca` (0..1) distingue um toque de condução
    de um remate; sem ela assume-se um passe normal.
    */
    chute(pos, forca) {
        const f = (typeof forca === 'number') ? Math.max(0.25, Math.min(1, forca)) : 0.7;
        this.tocar('chute', f * this._ganhoPorDistancia(pos), this.intervaloMinChute);
    },

    /*
    1.0 até `distChutePerto`, a descer até 0 em `distChuteMax`. Sem câmara na
    cena (ou sem posição), não atenua nada.
    */
    _ganhoPorDistancia(pos) {
        const cam = (typeof window !== 'undefined') ? window.cameraCore : null;
        if (!pos || !cam || !cam.position) return 1;
        const d = Math.hypot(
            pos.x - cam.position.x,
            (pos.y || 0) - cam.position.y,
            pos.z - cam.position.z);
        if (d <= this.distChutePerto) return 1;
        if (d >= this.distChuteMax) return 0;
        return 1 - (d - this.distChutePerto) / (this.distChuteMax - this.distChutePerto);
    }
};
