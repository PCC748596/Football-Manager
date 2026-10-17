/*
=============================================================================
A PONTE — o simulador 3D como motor de partida de outro jogo (o Football Manager)
=============================================================================
Esta página (index.html?embutido=1) pode ser aberta dentro de um iframe do manager. O manager manda UMA mensagem para a iniciar e recebe
de volta, por `postMessage`, os eventos da partida já narrados e, no fim, o resultado. Dois modos de apresentação, um só motor:

  modo 'oculto'   o iframe fica escondido (ou pequeno). A partida corre SEM desenhar nada, como nos lotes (Sim.running), a um ritmo que
                  o manager escolhe: 'real' (1 s de simulação por segundo real = 90 min de relógio em ~20 min, que é o ritmo do manager)
                  ou 'maximo' (o mais depressa possível, para saltar para o resultado). É o "simulador 2D" do manager: só a narração.
  modo 'visivel'  o iframe mostra o jogo em 3D (câmaras, bancadas, etc.), com o ritmo normal do jogo; os mesmos eventos saem na mesma.

MENSAGENS (o manager -> a ponte), todas com { para: 'simulador3d', tipo, ... }:
  iniciar    { casa, fora, modo, ritmo, velocidade, taticaDe, fimEmMinutos }   casa/fora: { equipa, jogadoresPorId, formacao: { nome, slots } }
             (o formato do AdaptadorManager.prepararPartida; ver js/narracao/adaptador_manager.js)
  pausar / continuar / parar
  velocidade { valor }      multiplica o ritmo (modo oculto 'real': 1, 2, 4...; no visivel, o speedMultiplier do jogo)

MENSAGENS (a ponte -> o manager), todas com { fonte: 'simulador3d', tipo, ... }:
  pronto                       a página carregou e o motor está pronto
  iniciada   { minuto }        a partida arrancou
  evento     { evento, linha } um lance (ver Eventos); `linha` e o texto narrado ({ minuto, texto, importante, ... }) ou null
  estado     { minuto, placar, posse }    de 5 em 5 minutos de relógio
  fim        { resultado }     o resultado (ver `resultado()`): placar, posse, estatisticas, golos, cartoes, eventos e relato completos
  erro       { mensagem }
=============================================================================
*/
const Ponte = {
    estado: 'parado',          // 'parado' | 'a_correr' | 'pausado' | 'terminado'
    modo: 'oculto',
    ritmo: 'real',
    velocidade: 1,
    fimEmMinutos: 90,
    _timer: null,
    _ultimoTempo: 0,
    _ultimoEstado: -1,
    _linhasEnviadas: 0,
    _enviados: new Set(),
    // Para onde vao as mensagens: por omissao o `parent` (o manager); os testes substituem-no.
    saida: function (msg) {
        const alvo = (typeof window !== 'undefined' && window.parent && window.parent !== window) ? window.parent : null;
        if (alvo) alvo.postMessage(msg, '*');
    },

    enviar(tipo, dados) { this.saida(Object.assign({ fonte: 'simulador3d', tipo: tipo }, dados || {})); },

    aoMensagem(m) {
        if (!m || m.para !== 'simulador3d') return;
        try {
            if (m.tipo === 'iniciar') this.iniciar(m);
            else if (m.tipo === 'preparar') this.preparar(m);
            else if (m.tipo === 'camera') this.camera(m.modo);
            else if (m.tipo === 'zoom') this.zoom(m.fator);
            else if (m.tipo === 'tela_cheia') { document.body.classList.toggle('tela-cheia', !!m.ligada); this.barraTopo(!!m.ligada); }
            else if (m.tipo === 'tatica') this.aplicarTatica(m);
            else if (m.tipo === 'pausar') this.pausar();
            else if (m.tipo === 'continuar') this.continuar();
            else if (m.tipo === 'parar') this.parar();
            else if (m.tipo === 'velocidade') this.definirVelocidade(m.valor);
            else if (m.tipo === 'replay') { if (window.MatchReplay && window.MatchReplay.replayUltimos) window.MatchReplay.replayUltimos(m.segundos || 10); }
        } catch (e) {
            this.enviar('erro', { mensagem: String(e && e.message || e) });
        }
    },

    /*
    A BARRA DO TOPO EM TELA CHEIA: placar, camaras, velocidade, replay e pausa NUMA LINHA SO, la em cima. Em tela cheia o manager (que tem
    tudo isto) nao se ve; a barra e feita aqui, ao ligar, e fala com o motor pelas mesmas chamadas dos botoes do painel. O placar e lido dos
    spans que o 3D ja actualiza (#placar-*).
    */
    barraTopo(ligada) {
        let barra = document.getElementById('barra-topo-tc');
        if (!ligada) { if (barra) barra.style.display = 'none'; clearInterval(this._tBarra); return; }
        if (!barra) {
            const css = document.createElement('style');
            css.textContent = '#barra-topo-tc{position:fixed;top:0;left:0;right:0;z-index:2000;display:flex;align-items:center;gap:10px;padding:6px 12px;' +
                'background:rgba(15,23,42,.92);color:#ecf0f1;font:700 12px/1 system-ui,sans-serif;white-space:nowrap;overflow-x:auto;border-bottom:1px solid #334155}' +
                '#barra-topo-tc .sep{width:1px;align-self:stretch;background:#334155;margin:0 2px}' +
                '#barra-topo-tc .pl{font-size:15px;font-weight:900;letter-spacing:1px;font-variant-numeric:tabular-nums}' +
                '#barra-topo-tc button{background:#334155;color:#fff;border:0;border-bottom:2px solid #0f172a;border-radius:4px;padding:6px 9px;font:700 11px system-ui,sans-serif;cursor:pointer}' +
                '#barra-topo-tc button:hover{background:#475569}#barra-topo-tc button.on{background:#0284c7}' +
                '#barra-topo-tc button.pisca{background:#facc15;color:#000;animation:pisca-tc 0.8s ease-in-out infinite}' +
                '@keyframes pisca-tc{50%{opacity:.45}}' +
                'body.tela-cheia #placar-linha{display:none !important}' +
                // TODOS os menus do 3D saem em tela cheia: o botao Tactics abre o MATCH TACTICS do manager (ver abaixo).
                'body.tela-cheia #painel-comandos,body.tela-cheia #coluna-direita,body.tela-cheia #painel-direito,body.tela-cheia #painel-jogadores,' +
                'body.tela-cheia .hud-jogador,body.tela-cheia #modal-skills{display:none !important}' +
                // O placar de TV: nomes curtos nas cores dos clubes, golos num miolo escuro com "vs", e o tempo numa aba por baixo.
                '#tc-placar-tv{display:flex;flex-direction:column;align-items:center;font-family:system-ui,sans-serif}' +
                '#tc-placar-tv .tv-linha{display:flex;height:24px;border-radius:5px;overflow:hidden;box-shadow:0 2px 6px rgba(0,0,0,.55);font-weight:900}' +
                '#tc-placar-tv .tv-eq{padding:0 9px;display:flex;align-items:center;justify-content:center;min-width:38px;font-size:13px;letter-spacing:.5px}' +
                '#tc-placar-tv .tv-gol{background:#1b0f33;color:#fff;font-size:15px;padding:0 8px;display:flex;align-items:center;min-width:12px;justify-content:center;font-variant-numeric:tabular-nums}' +
                '#tc-placar-tv .tv-vs{background:#3b0764;color:#e9d5ff;font-size:10px;font-style:italic;padding:0 6px;display:flex;align-items:center}' +
                '#tc-placar-tv .tv-tempo{background:#4c1d95;color:#fff;font:800 11px system-ui,sans-serif;letter-spacing:.5px;padding:1px 12px 2px;border-radius:0 0 6px 6px;font-variant-numeric:tabular-nums}' +
                // O painel de comandos (onde esta a tatica) desce para baixo da barra do topo.
                '';
            document.head.appendChild(css);
            barra = document.createElement('div'); barra.id = 'barra-topo-tc';
            const cams = [['orbit', 'Órbita'], ['center', 'TV Centro'], ['sideline', 'Lateral Móvel'], ['lateraltv', 'Lateral TV'], ['grua', 'Grua'], ['cinema', 'Cinema']];
            barra.innerHTML = '<div id="tc-placar-tv"><div class="tv-linha"><span class="tv-eq" id="tv-eq-e">---</span><span class="tv-gol" id="tv-gol-e">0</span>' +
                '<span class="tv-vs">vs</span><span class="tv-gol" id="tv-gol-d">0</span><span class="tv-eq" id="tv-eq-d">---</span></div><div class="tv-tempo" id="tv-tempo">00:00</div></div><span class="sep"></span>' +
                '<span>Câmera</span>' + cams.map(c => '<button data-cam="' + c[0] + '">' + c[1] + '</button>').join('') +
                '<button data-cam="lateraltv" data-r="3d">3D</button><button data-cam="topdown">2D</button><span class="sep"></span>' +
                '<span>Velocidade</span>' + [0.5, 1, 1.5].map(v => '<button data-vel="' + v + '">' + v + 'x</button>').join('') +
                '<button id="tc-pausa">Pausa</button><button id="tc-replay">Replay 10s</button><span class="sep"></span><button id="tc-tactics">Tactics</button>';
            document.body.appendChild(barra);
            barra.addEventListener('click', (e) => {
                const b = e.target.closest('button'); if (!b) return;
                if (b.dataset.cam && Match.setCameraMode) Match.setCameraMode(b.dataset.cam);
                else if (b.dataset.vel) { this.definirVelocidade(Number(b.dataset.vel)); }
                else if (b.id === 'tc-replay' && window.MatchReplay) window.MatchReplay.replayUltimos(10);
                else if (b.id === 'tc-pausa') this.enviar('alternar_pausa', {});
                else if (b.id === 'tc-tactics') {
                    // O botao Tactics abre o MATCH TACTICS do manager: o manager sai da tela cheia, pausa o jogo e muda de aba (ver MatchDay.tsx).
                    this.enviar('abrir_tactics', {});
                }
            });
        }
        barra.style.display = 'flex';
        clearInterval(this._tBarra);
        const g = (id) => { const e = document.getElementById(id); return e ? e.textContent : ''; };
        this._tBarra = setInterval(() => {
            // Esquerda = a equipa do `placar-nome-b` (com os golos `placar-a`), direita = a do `placar-nome-a`, como no placar de sempre.
            const sigla = (n) => String(n || '').split('-')[0].normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z]/g, '').slice(0, 3).toUpperCase() || '---';
            const corDe = (lista) => { const j = lista && lista[1] ? lista[1] : null; try { return new THREE.Color(j && j.corCamisa !== undefined ? j.corCamisa : 0x334155); } catch (e) { return new THREE.Color(0x334155); } };
            const pintar = (id, nome, lista) => {
                const el = barra.querySelector(id); if (!el) return;
                const c = corDe(lista); const lum = 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b;
                el.textContent = sigla(nome); el.style.background = '#' + c.getHexString(); el.style.color = lum > 0.55 ? '#111' : '#fff';
            };
            pintar('#tv-eq-e', g('placar-nome-b'), Match.opponents); pintar('#tv-eq-d', g('placar-nome-a'), Match.players);
            const ge = barra.querySelector('#tv-gol-e'), gd = barra.querySelector('#tv-gol-d'), tp = barra.querySelector('#tv-tempo');
            if (ge) ge.textContent = g('placar-a'); if (gd) gd.textContent = g('placar-b'); if (tp) tp.textContent = g('placar-tempo');
            barra.querySelectorAll('button[data-cam]').forEach(b => b.classList.toggle('on', window.cameraMode === b.dataset.cam && !(b.dataset.r === '3d' && false)));
            barra.querySelectorAll('button[data-vel]').forEach(b => b.classList.toggle('on', Number(window.speedMultiplier) === Number(b.dataset.vel)));
            const rp = barra.querySelector('#tc-replay'); if (rp) rp.classList.toggle('pisca', !!(window.MatchReplay && window.MatchReplay.isReplaying));
        }, 250);
    },

    // A camara e o zoom a pedido do manager (os botoes ficam fora do 3D).
    camera(modo) { if (typeof Match !== 'undefined' && Match.setCameraMode && modo) Match.setCameraMode(modo); },
    zoom(fator) {
        if (!(fator > 0) || typeof CameraZoom === 'undefined') return;
        window.cameraZoom = Math.max(CameraZoom.min, Math.min(CameraZoom.max, (window.cameraZoom || 1) * fator));
    },

    /*
    A TATICA, NOS DOIS SENTIDOS. Manager -> motor (`tatica`): { estilo, linhaDefensiva, pressaoDefensiva, teamPlayStyle, setores } nos
    nomes do motor; vai para os selects do painel e passa por `Tatics.update` (assim o painel mostra o que o manager mandou). Motor ->
    manager (`tatica_alterada`): quando o utilizador mexe no painel do 3D, as mesmas chaves voltam. `_aplicando` evita o eco.
    */
    aplicarTatica(m) {
        if (typeof Tatics === 'undefined') return;
        this._aplicando = true;
        try {
            const pOk = (id, v) => { const el = document.getElementById(id); if (el && v !== undefined && v !== null) el.value = v; };
            pOk('t-estilo', m.estilo); pOk('t-linha', m.linhaDefensiva); pOk('t-team-style', m.teamPlayStyle);
            Tatics.update();
            // A mentalidade impoe pressao e profundidade ao passar por update(); o que o manager pediu manda sobre isso.
            if (m.pressaoDefensiva) { Tatics.pressaoDefensiva = m.pressaoDefensiva; pOk('t-pressao-def', m.pressaoDefensiva); }
            if (Array.isArray(m.setores)) {
                Tatics.setores.length = 0;
                m.setores.forEach(x => Tatics.setores.push(x));
                if (Tatics.setores.length >= 3) Tatics.setores.length = 0;
                for (const sc of ['esq', 'cen', 'dir']) {
                    const e = document.getElementById('sec-' + sc);
                    if (e) e.classList.toggle('active', Tatics.setores.includes(sc));
                }
            }
        } finally { this._aplicando = false; }
    },
    // Liga o painel do 3D ao manager (uma vez): cada alteracao do utilizador sai como `tatica_alterada`.
    _ligarPainel() {
        if (this._painelLigado || typeof Tatics === 'undefined') return;
        this._painelLigado = true;
        const avisar = () => {
            if (this._aplicando) return;
            this.enviar('tatica_alterada', { estilo: Tatics.estilo, linhaDefensiva: Tatics.linhaDefensiva, pressaoDefensiva: Tatics.pressaoDefensiva,
                teamPlayStyle: Tatics.teamPlayStyle, setores: Tatics.setores.slice() });
        };
        const upd = Tatics.update.bind(Tatics);
        Tatics.update = function () { const r = upd.apply(this, arguments); avisar(); return r; };
        const tog = Tatics.toggleSector.bind(Tatics);
        Tatics.toggleSector = function () { const r = tog.apply(this, arguments); avisar(); return r; };
    },

    /*
    SAIDA E PAUSA PELO MANAGER. O ESC (pular a entrada) e o Pause/Continue do painel do 3D nao mexem no jogo sozinhos: pedem ao manager
    (`saida_pedida` / `alternar_pausa`), que e quem manda no relogio e no botao SAIDA/PAUSAR/CONTINUAR, e ele devolve `iniciar`,
    `pausar` ou `continuar`. Assim o botao do manager e o jogo nunca ficam desencontrados.
    */
    _ligarControles() {
        if (this._controlesLigados) return;
        this._controlesLigados = true;
        if (typeof Abertura !== 'undefined') {
            const canc = Abertura.cancelar.bind(Abertura);
            Abertura.cancelar = () => {
                if (this.estado === 'parado' || this.estado === 'terminado') { this.enviar('saida_pedida', {}); return; }
                return canc();
            };
        }
        if (typeof Match !== 'undefined' && Match.togglePause) {
            const tog = Match.togglePause.bind(Match);
            Match.togglePause = (...a) => {
                if (this.modo === 'visivel') { this.enviar('alternar_pausa', {}); return; }
                return tog(...a);
            };
        }
    },

    // So monta as equipas no campo (para o 3D mostrar os times certos antes da saida); nao arranca a partida.
    // No modo visivel a ENTRADA DOS TIMES corre ja aqui (ao abrir o 3D) e os times esperam alinhados pela saida (`iniciar`).
    preparar(m) {
        AdaptadorManager.prepararPartida(m.casa, m.fora, { taticaDe: m.taticaDe || 'casa', escala: m.escala });
        this._preparada = this._chave(m);
        this._medir();
        this._ligarPainel();
        this._ligarControles();
        // O som do estadio e do publico (desligado por omissao no jogo solto) liga-se: o clique do utilizador no manager desbloqueia-o (iframe allow=autoplay).
        if (typeof AmbienteSonoro !== 'undefined' && AmbienteSonoro.setLigado) { AmbienteSonoro.setLigado(true); if (AmbienteSonoro.tentarTocar) AmbienteSonoro.tentarTocar(); }
        if (typeof Sim === 'undefined') global_Sim();
        Sim.running = false;
        if (typeof Abertura !== 'undefined') {
            Abertura.aguardarSaida = false; Match.segurarSaida = true; Match._saidaAutoPedida = false; Abertura.jaCorreu = false; Abertura.activa = false;
            window.isPaused = false;
            Abertura.iniciar();
        }
    },
    /*
    MEDIDOR DE DESEMPENHO (so no browser, modo visivel): de 2 em 2 s envia { fps, msJogo } — os quadros por segundo e o tempo medio que
    o Match.update gasta por quadro. fps baixo com msJogo baixo = o peso e o desenho (GPU); msJogo alto = e a logica do jogo.
    */
    _medir() {
        if (this._medidor || (typeof process !== 'undefined' && process.versions && process.versions.node) || typeof requestAnimationFrame !== 'function' || /jsdom/i.test((navigator && navigator.userAgent) || '')) return;
        this._medidor = true;
        const orig = Match.update.bind(Match);
        let acc = 0, n = 0, quadros = 0, t0 = performance.now();
        Match.update = function (dt) { const a = performance.now(); orig(dt); acc += performance.now() - a; n++; };
        const volta = () => {
            quadros++;
            const t = performance.now();
            if (t - t0 >= 2000) {
                Ponte.enviar('perf', { fps: Math.round(quadros * 1000 / (t - t0)), msJogo: n ? Math.round(acc / n * 10) / 10 : 0, passosPorQuadro: Math.round(n / Math.max(1, quadros) * 10) / 10 });
                acc = 0; n = 0; quadros = 0; t0 = t;
            }
            requestAnimationFrame(volta);
        };
        requestAnimationFrame(volta);
    },
    _chave(m) { return m.casa.equipa.name + '|' + m.fora.equipa.name; },

    iniciar(m) {
        this.parar();
        this.modo = (m.modo === 'visivel') ? 'visivel' : 'oculto';
        this.ritmo = (m.ritmo === 'maximo') ? 'maximo' : 'real';
        this.velocidade = (typeof m.velocidade === 'number' && m.velocidade > 0) ? m.velocidade : 1;
        this.fimEmMinutos = (typeof m.fimEmMinutos === 'number' && m.fimEmMinutos > 0) ? m.fimEmMinutos : 90;
        this._enviados = new Set();
        this._ultimoEstado = -1;

        // A partida no motor: elencos, escalacao, formacoes e tatica.
        // Se o `preparar` ja montou esta partida (e a entrada dos times esta a correr), nao se refaz nada: so se solta a espera.
        const jaPreparada = (this.modo === 'visivel' && this._preparada === this._chave(m));
        if (!jaPreparada) AdaptadorManager.prepararPartida(m.casa, m.fora, { taticaDe: m.taticaDe || 'casa', escala: m.escala });
        this._preparada = null;
        if (typeof Abertura !== 'undefined') Abertura.aguardarSaida = false;
        Match.segurarSaida = false;
        MatchStats.reset();
        Match.tempoDeJogo = 0; Match.placarA = 0; Match.placarB = 0;
        Match.primeiroTempoAcabou = false;
        Eventos.reset();
        if (!this._ouvinte) {
            this._ouvinte = (ev) => this._aoEvento(ev);
            Eventos.aoRegistar(this._ouvinte);
        }

        // O modo decide quem conduz o tick: o lote (oculto, sem desenhar) ou o animate (visivel).
        if (typeof Sim === 'undefined') global_Sim();
        Sim.running = (this.modo === 'oculto');
        if (this.modo === 'visivel') window.isPaused = false;
        if (this.modo === 'visivel' && typeof window !== 'undefined') window.speedMultiplier = this.velocidade;
        window.comemoracaoNaSimulacao = false;

        this.estado = 'a_correr';
        this.enviar('iniciada', { minuto: 1 });
        Eventos.registar('INICIO', {});
        // No modo visivel as equipas entram pelo tunel (js/abertura.js) antes da saida de bola, como no jogo normal; o relogio so corre depois.
        if (this.modo === 'visivel' && !jaPreparada && typeof Abertura !== 'undefined') { Abertura.jaCorreu = false; Abertura.activa = false; Abertura.iniciar(); }
        if (this.modo === 'oculto') this._arrancarCiclo();
        else this._arrancarVigia();
    },

    pausar() {
        if (this.estado !== 'a_correr') return;
        this.estado = 'pausado';
        if (this.modo === 'visivel') window.isPaused = true;
        this._somEmPausa(true);
    },
    continuar() {
        if (this.estado !== 'pausado') return;
        this.estado = 'a_correr';
        this._ultimoTempo = this._agora();
        if (this.modo === 'visivel') window.isPaused = false;
        this._somEmPausa(false);
    },
    // O som pára com o jogo (o mesmo que o botão Pause do 3D faz em match_ui.js): estádio e efeitos.
    _somEmPausa(on) {
        if (typeof AmbienteSonoro !== 'undefined' && AmbienteSonoro.setPausa) AmbienteSonoro.setPausa(on);
        if (on && typeof EfeitosSonoros !== 'undefined' && EfeitosSonoros.pararTudo) EfeitosSonoros.pararTudo();
    },
    parar() {
        if (this._timer) { clearTimeout(this._timer); clearInterval(this._timer); this._timer = null; }
        if (this.estado !== 'terminado') this.estado = 'parado';
    },
    definirVelocidade(v) {
        if (!(v > 0)) return;
        this.velocidade = v;
        if (this.modo === 'visivel' && typeof window !== 'undefined') window.speedMultiplier = v;
    },

    // Date.now e nao performance.now: o harness de testes (jsdom) tem um performance.now que recursa.
    _agora() { return Date.now(); },

    /*
    O CICLO DO MODO OCULTO. Passos de 1/60 s (os mesmos do lote, que e o que esta calibrado). No ritmo 'real' o numero de passos
    por volta do temporizador sai do tempo real que passou (com um tecto, para um separador em segundo plano nao dar mil passos
    de uma vez); no 'maximo' faz um bloco grande por volta e devolve o controlo (para a pagina nao congelar).
    */
    _arrancarCiclo() {
        this._ultimoTempo = this._agora();
        const volta = () => {
            if (this.estado === 'terminado' || this.estado === 'parado') return;
            if (this.estado === 'pausado') { this._timer = setTimeout(volta, 100); return; }
            let passos;
            if (this.ritmo === 'maximo') passos = 600;
            else {
                const agora = this._agora();
                passos = Math.min(120, Math.floor(((agora - this._ultimoTempo) / 1000) * 60 * this.velocidade));
                if (passos > 0) this._ultimoTempo += (passos / (60 * this.velocidade)) * 1000;
            }
            const dt = 1 / 60;
            try {
                for (let i = 0; i < passos; i++) {
                    Match.update(dt);
                    if (this._acabou()) { this._terminar(); return; }
                }
            } catch (e) { this.enviar('erro', { mensagem: String(e && e.message || e) }); this.estado = 'parado'; return; }
            this._estadoPeriodico();
            this._timer = setTimeout(volta, this.ritmo === 'maximo' ? 0 : 25);
        };
        this._timer = setTimeout(volta, 0);
    },

    // No modo visivel quem conduz e o animate() do jogo; aqui so se vigia o fim.
    _arrancarVigia() {
        this._timer = setInterval(() => {
            if (this.estado !== 'a_correr') return;
            this._estadoPeriodico();
            if (this._acabou()) this._terminar();
        }, 500);
    },

    _acabou() {
        if (Match.state === 'FIM_DE_JOGO') return true;
        return Match.primeiroTempoAcabou && Match.tempoDeJogo >= this.fimEmMinutos * 60;
    },

    _aoEvento(ev) {
        // O REMATE chega duas vezes (ao ser registado e ao fechar com o desfecho): o narrador so escreve a segunda; as outras uma vez.
        const linha = Narrador.linha(ev);
        const chave = ev.n + ':' + (ev.desfecho || '');
        if (this._enviados.has(chave)) return;
        this._enviados.add(chave);
        if (!linha && ev.tipo !== 'REMATE') return;
        if (ev.tipo === 'REMATE' && !linha && !ev.desfecho) return;
        this.enviar('evento', { evento: this._limpar(ev), linha: linha });
    },

    // Um evento so com dados simples (sem referencias ao motor), para viajar por mensagem.
    _limpar(ev) { return JSON.parse(JSON.stringify(ev, (k, v) => (k === '_idade' ? undefined : v))); },

    _estadoPeriodico() {
        const min = Math.floor(Match.tempoDeJogo / 60);
        if (min === this._ultimoEstado) return;
        this._ultimoEstado = min;
        const posseA = MatchStats.TeamA.posseSegundos || 0, posseB = MatchStats.TeamB.posseSegundos || 0;
        this.enviar('estado', { minuto: Math.floor(Match.tempoDeJogo / 60) + 1, placar: { casa: Match.placarA, fora: Match.placarB },
            posse: { casa: posseA + posseB > 0 ? posseA / (posseA + posseB) : 0.5 } });
    },

    _terminar() {
        if (this.estado === 'terminado') return;
        this.parar();
        this.estado = 'terminado';
        Eventos.registar('FIM', { placar: { A: Match.placarA, B: Match.placarB } });
        this.enviar('fim', { resultado: this.resultado() });
        if (this.modo === 'oculto') Sim.running = false;
    },

    /*
    O RESULTADO que o manager grava no Fixture: placar, posse, as estatisticas completas (MatchStats.resumo + porJogo), os gols e os
    cartoes por jogador, e o registo e o relato completos.
    */
    resultado() {
        const A = MatchStats.TeamA, B = MatchStats.TeamB;
        const posseT = (A.posseSegundos || 0) + (B.posseSegundos || 0);
        const L = Eventos.lista;
        const golos = L.filter(e => e.tipo === 'GOLO').map(e => ({
            minuto: e.minuto, equipa: e.equipa === 'TeamA' ? 'casa' : 'fora', jogador: e.jogador, assistente: e.assistente, proprioGolo: !!e.proprioGolo }));
        const cartoes = L.filter(e => e.tipo === 'FALTA' && e.cartao).map(e => ({
            minuto: e.minuto, equipa: e.equipa === 'TeamA' ? 'casa' : 'fora', jogador: e.jogador, cor: e.cartao, segundoAmarelo: !!e.segundoAmarelo }));
        return {
            placar: { casa: Match.placarA, fora: Match.placarB },
            posse: { casa: posseT > 0 ? Math.round(1000 * (A.posseSegundos || 0) / posseT) / 10 : 50, fora: posseT > 0 ? Math.round(1000 * (B.posseSegundos || 0) / posseT) / 10 : 50 },
            estatisticas: this._limpar(MatchStats.resumo()),
            golos: golos, cartoes: cartoes,
            eventos: this._limpar({ l: L }).l.map((e, i) => { const ln = Narrador.linha(L[i]); e.texto = ln ? ln.texto : null; return e; }),
            relato: Narrador.relato(L)
        };
    }
};
function global_Sim() { if (typeof window !== 'undefined') window.Sim = {}; else global.Sim = {}; }
if (typeof window !== 'undefined') {
    window.Ponte = Ponte;
    window.addEventListener('message', (e) => Ponte.aoMensagem(e.data));
    // Avisa o manager quando o motor estiver pronto (a inicializacao do jogo e assincrona).
    const avisar = () => {
        if (typeof Match !== 'undefined' && Match.players && Match.players.length > 0) Ponte.enviar('pronto', {});
        else setTimeout(avisar, 200);
    };
    if (typeof document !== 'undefined' && document.readyState !== 'loading') setTimeout(avisar, 0);
    else window.addEventListener('DOMContentLoaded', () => setTimeout(avisar, 0));
}
