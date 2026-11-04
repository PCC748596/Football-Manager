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
            else if (m.tipo === 'segundo_tempo') this.segundoTempo();
            else if (m.tipo === 'substituicao') { if (typeof Match !== 'undefined' && Match.pedirSubstituicao) Match.pedirSubstituicao(m); }
            else if (m.tipo === 'notas') { if (typeof mostrarNotasIntervalo === 'function') mostrarNotasIntervalo(m); }
            else if (m.tipo === 'classificacao') { if (typeof mostrarClassificacaoIntervalo === 'function') mostrarClassificacaoIntervalo(m.linhas, m.emCurso); }
            else if (m.tipo === 'camera') this.camera(m.modo);
            else if (m.tipo === 'zoom') this.zoom(m.fator);
            else if (m.tipo === 'tecla_espaco') { if (typeof Match !== 'undefined' && Match.togglePause) Match.togglePause(); }   // o espaco carregado fora do iframe (o foco ficou no manager): o mesmo que a tecla aqui dentro
            else if (m.tipo === 'tela_cheia') { document.body.classList.toggle('tela-cheia', !!m.ligada); this.barraTopo(!!m.ligada); }
            else if (m.tipo === 'tatica') this.aplicarTatica(m);
            else if (m.tipo === 'cobradores') {
                // Os cobradores designados passam a valer ja (ids do manager -> ids do motor).
                const o = {}; for (const k of Object.keys(m.cobradores || {})) { const id = AdaptadorManager.idReal(m.cobradores[k]); if (id !== null) o[k] = id; }
                Match.cobradores = Match.cobradores || { A: null, B: null };
                Match.cobradores[m.lado === 'B' ? 'B' : 'A'] = o;
            }
            // A disputa de penaltis em 3D (js/disputa_penaltis.js): a app (que arbitra) responde com as ordens dos cobradores e, depois de cada cobranca, com o proximo batedor ou o fim.
            else if (m.tipo === 'disputa_iniciar') { if (window.DisputaPenaltis) window.DisputaPenaltis.receberOrdens(m.ordemCasa, m.ordemFora, m.proxima); }
            else if (m.tipo === 'disputa_proxima') { if (window.DisputaPenaltis) window.DisputaPenaltis.receberProxima(m); }
            // O card da disputa (circulos verdes/vermelhos/cinza por time), calculado pela app: desenha-se no cartao de evento (main.js updateHudEvento).
            else if (m.tipo === 'disputa_card') { if (window.DisputaPenaltis) window.DisputaPenaltis.receberCard(m); }
            else if (m.tipo === 'instantaneo') this.enviar('instantaneo', { id: m.id, dados: this.instantaneo() });
            else if (m.tipo === 'pausar') this.pausar();
            else if (m.tipo === 'continuar') this.continuar();
            else if (m.tipo === 'parar') this.parar();
            else if (m.tipo === 'velocidade') this.definirVelocidade(m.valor);
            else if (m.tipo === 'esc') this.esc();
            else if (m.tipo === 'captura') { if (window.CapturaDeJogo) window.CapturaDeJogo.salvar(); }
            else if (m.tipo === 'qualidade') { if (window.Qualidade) window.Qualidade.definir(m.nivel); }
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
    // O botao Debug da barra: liga / desliga o painel da direita; ao ligar, ele aparece MAXIMIZADO.
    definirDebug(ligado) {
        document.body.classList.toggle('debug-off', !ligado);
        if (ligado) { const p = document.getElementById('painel-direito'); if (p) p.classList.remove('minimizado'); }
        const b = document.getElementById('tc-debug');
        if (b) { b.textContent = ligado ? 'Debug ON' : 'Debug OFF'; b.classList.toggle('on', !!ligado); }
    },

    barraTopo(ligada) {
        let barra = document.getElementById('barra-topo-tc');
        if (!ligada) { if (barra) barra.style.display = 'none'; clearInterval(this._tBarra); return; }
        if (!barra) {
            const css = document.createElement('style');
            css.textContent = '#barra-topo-tc{position:fixed;inset:0;z-index:2000;pointer-events:none;color:#ecf0f1;font:700 12px/1 system-ui,sans-serif;white-space:nowrap}' +
                '#barra-topo-tc>*{position:absolute;pointer-events:auto}' +
                '#barra-topo-tc button{background:rgba(0,0,0,.75);color:#fff;border:0;border-radius:0;padding:8px 10px;font:700 11px system-ui,sans-serif;cursor:pointer}' +
                '#barra-topo-tc button:hover{background:rgba(51,65,85,.9)}#barra-topo-tc button.on{background:rgba(2,132,199,.85)}' +
                '#barra-topo-tc button.pisca{background:#facc15;color:#000;animation:pisca-tc 0.8s ease-in-out infinite}' +
                '@keyframes pisca-tc{50%{opacity:.45}}' +
                // ESQUERDA: cameras, 3D e 2D com icone e texto, 128x32, sem cantos arredondados.
                '#barra-topo-tc>#tc-barra{left:0;right:0;top:0;display:flex;align-items:center;gap:6px;padding:6px 12px;background:rgba(15,23,42,.92);border-bottom:1px solid #334155;overflow-x:auto}' +
                '#tc-barra>*{position:static}#tc-esq,#tc-dir{display:flex;align-items:center;gap:6px}' +
                '#tc-barra button{height:32px;padding:0 10px;border-radius:0;font-size:12px}' +
                // CENTRO: o placar, no padrao dos cartoes dos jogadores (preto a 40%, sem cantos arredondados).
                '#tc-centro{left:12px;top:58px;transform:scale(1.105);transform-origin:top left;background:rgba(0,0,0,.75);padding:8px 44px;overflow:hidden}' +
                // Os escudos como nos cartoes dos jogadores: grandes, entram pelo lado do cartao que os corta.
                '#tc-centro .hud-jog-logo{position:absolute;top:50%;width:60px;height:72px;transform:translateY(-50%)}#tc-logo-e{left:-26px}#tc-logo-d{right:-26px}' +
                // DIREITA: Exit, Debug e FPS em cima; os demais numa coluna por baixo.
                '#tc-dir-topo{margin-left:auto;display:flex;align-items:center;gap:6px}' +
                '' +
                '#tc-dir .linha{display:flex;gap:6px}' +
                '#barra-topo-tc #tc-evento{display:none;align-items:center;gap:8px;padding:4px 10px;background:rgba(0,0,0,.4);font:700 12px system-ui,sans-serif}' +
                '#barra-topo-tc #tc-evento b{font-size:15px;color:#fff}#barra-topo-tc #tc-evento span{letter-spacing:1px;color:#e2e8f0}' +
                'body.debug-off #coluna-direita{display:none !important}' +
                // O painel de debug sai da coluna dos botoes: fica a esquerda dela.
                'body.tela-cheia #coluna-direita{top:50px;right:12px}' +
                '#barra-topo-tc #tc-fps{font:900 13px/1 system-ui,sans-serif;font-variant-numeric:tabular-nums;letter-spacing:.5px;padding:8px 9px;background:rgba(0,0,0,.75);color:#22c55e;min-width:62px;text-align:center}' +
                'body.tela-cheia #placar-linha{display:none !important}' +
                // TODOS os menus do 3D saem em tela cheia: o botao Tactics abre o MATCH TACTICS do manager (ver abaixo).
                'body.tela-cheia #painel-comandos,body.tela-cheia #painel-jogadores,' +
                'body.tela-cheia #modal-skills{display:none !important}' +   // o painel da DIREITA (debug) fica visivel em tela cheia (pedido)
                // O placar: nomes curtos nas cores dos clubes, golos num miolo escuro com "vs", e o tempo por baixo.
                '#tc-placar-tv{display:flex;flex-direction:column;align-items:center;font-family:system-ui,sans-serif;gap:4px}' +
                '#tc-placar-tv .tv-linha{display:flex;height:24px;overflow:hidden;font-weight:900}' +
                '#tc-placar-tv .tv-eq{cursor:pointer;padding:0 9px;display:flex;align-items:center;justify-content:center;min-width:38px;font-size:13px;letter-spacing:.5px}' +
                '#tc-placar-tv .tv-gol{color:#fff;font-size:15px;padding:0 8px;display:flex;align-items:center;min-width:12px;justify-content:center;font-variant-numeric:tabular-nums}' +
                '#tc-placar-tv .tv-vs{color:#e9d5ff;font-size:10px;font-style:italic;padding:0 6px;display:flex;align-items:center}' +
                '#tc-placar-tv .tv-tempo{color:#fff;font:800 12px system-ui,sans-serif;letter-spacing:.5px;font-variant-numeric:tabular-nums}' +
                '';
            document.head.appendChild(css);
            barra = document.createElement('div'); barra.id = 'barra-topo-tc';
            const cams = [['orbit', 'Orbit', '🔄'], ['center', 'TV Centre', '📺'], ['sideline', 'Moving Sideline', '↔️'], ['lateraltv', 'TV Sideline', '🎥'], ['grua', 'Crane', '🏗️'], ['cinema', 'Cinema', '🎬']];
            barra.innerHTML = '<div id="tc-barra"><div id="tc-esq">' + cams.map(c => '<button data-cam="' + c[0] + '" title="' + c[1] + '">' + c[1] + '</button>').join('') +
                '<button data-cam="lateraltv" data-r="3d" title="3D">3D</button><button data-cam="topdown" title="2D">2D</button></div>' +
                '<div id="tc-dir"><button id="tc-minimapa" title="Minimap">Minimap ON</button><button id="tc-nomes" title="Player names">Names OFF</button>' +
                '<div class="linha">' + [0.5, 1, 1.5].map(v => '<button data-vel="' + v + '">' + v + 'x</button>').join('') + '</div>' +
                '<button id="tc-pausa">Pause</button><button id="tc-replay">Replay 10s</button><button id="tc-tactics">Tactics</button></div>' +
                '<div id="tc-dir-topo"><span id="tc-evento"></span><button id="tc-debug" title="Right-hand debug panel">Debug OFF</button><span id="tc-fps" title="Frames per second">FPS --</span><button id="tc-sair" title="Exit fullscreen" style="background:rgba(185,28,28,.85)">✕ Exit</button></div>' +
                '</div>' +
                '<div id="tc-centro"><div class="hud-jog-logo" id="tc-logo-e"></div><div class="hud-jog-logo" id="tc-logo-d"></div><div id="tc-placar-tv"><div class="tv-linha"><span class="tv-eq" id="tv-eq-e">---</span><span class="tv-gol" id="tv-gol-e">0</span>' +
                '<span class="tv-vs">vs</span><span class="tv-gol" id="tv-gol-d">0</span><span class="tv-eq" id="tv-eq-d">---</span></div><div class="tv-tempo" id="tv-tempo">00:00</div></div></div>';
            document.body.appendChild(barra);
            barra.addEventListener('click', (e) => {
                // Clicar na sigla de um clube no placar de TV soma +1 ao resultado dele (para ajustar um empate nos testes).
                const eq = e.target.closest('.tv-eq');
                if (eq) { this.ajustarPlacar(eq.id === 'tv-eq-e' ? 'A' : 'B'); return; }
                const b = e.target.closest('button'); if (!b) return;
                b.blur();   // sem foco no botao: o espaco nao o "clica" de novo (era o Pause/Continue que desfazia a pausa do espaco)
                if (b.dataset.cam && Match.setCameraMode) Match.setCameraMode(b.dataset.cam);
                else if (b.dataset.vel) { this.definirVelocidade(Number(b.dataset.vel)); }
                else if (b.id === 'tc-replay' && window.MatchReplay) window.MatchReplay.replayUltimos(10);
                else if (b.id === 'tc-minimapa') { if (typeof toggleMinimapa === 'function') toggleMinimapa(); }
                else if (b.id === 'tc-nomes') { if (typeof togglePlayerNames === 'function') togglePlayerNames(); }
                else if (b.id === 'tc-debug') this.definirDebug(document.body.classList.contains('debug-off'));
                else if (b.id === 'tc-pausa') { if (this.pularDisponivel()) this.esc(); else this.enviar('alternar_pausa', {}); }
                else if (b.id === 'tc-sair') this.enviar('sair_tela_cheia', {});   // no tablet nao ha ESC: o manager sai da tela cheia (ver MatchDay.tsx)
                else if (b.id === 'tc-tactics') {
                    // O botao Tactics abre o MATCH TACTICS do manager: o manager sai da tela cheia, pausa o jogo e muda de aba (ver MatchDay.tsx).
                    this.enviar('abrir_tactics', {});
                }
            });
        }
        barra.style.display = 'flex';
        this.definirDebug(false);   // entra em tela cheia com o painel de debug DESLIGADO (pedido); liga-se no botao Debug
        clearInterval(this._tBarra);
        const g = (id) => { const e = document.getElementById(id); return e ? e.textContent : ''; };
        this._tBarra = setInterval(() => {
            // Esquerda = a CASA (TeamA: `placar-nome-a`, com os golos em `placar-b`), direita = a de fora (TeamB) — a casa primeiro (pedido).
            const sigla = (n) => String(n || '').split('-')[0].normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z]/g, '').slice(0, 3).toUpperCase() || '---';
            const corDe = (lista) => { const j = lista && lista[1] ? lista[1] : null; try { return new THREE.Color(j && j.corCamisa !== undefined ? j.corCamisa : 0x334155); } catch (e) { return new THREE.Color(0x334155); } };
            const pintar = (id, nome, lista) => {
                const el = barra.querySelector(id); if (!el) return;
                const c = corDe(lista); const lum = 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b;
                el.textContent = sigla(nome); el.style.background = '#' + c.getHexString(); el.style.color = lum > 0.55 ? '#111' : '#fff';
            };
            pintar('#tv-eq-e', g('placar-nome-a'), Match.players); pintar('#tv-eq-d', g('placar-nome-b'), Match.opponents);
            if (typeof preencherEscudoHud === 'function') { preencherEscudoHud(barra.querySelector('#tc-logo-e'), 'tc-e', 'TeamA'); preencherEscudoHud(barra.querySelector('#tc-logo-d'), 'tc-d', 'TeamB'); }
            const ge = barra.querySelector('#tv-gol-e'), gd = barra.querySelector('#tv-gol-d'), tp = barra.querySelector('#tv-tempo');
            if (ge) ge.textContent = g('placar-b'); if (gd) gd.textContent = g('placar-a'); if (tp) tp.textContent = g('placar-tempo');
            barra.querySelectorAll('button[data-cam]').forEach(b => b.classList.toggle('on', window.cameraMode === b.dataset.cam && !(b.dataset.r === '3d' && false)));
            barra.querySelectorAll('button[data-vel]').forEach(b => b.classList.toggle('on', Number(window.speedMultiplier) === Number(b.dataset.vel)));
            const fpsEl = barra.querySelector('#tc-fps');
            if (fpsEl && typeof window._fpsAtual === 'number') { const v = window._fpsAtual; fpsEl.textContent = 'FPS ' + v; fpsEl.style.color = v >= 50 ? '#22c55e' : v >= 30 ? '#facc15' : '#ef4444'; }
            // O botao de pausa diz o que FAZ: PAUSAR a correr, CONTINUAR parado (o estado vem do manager, que manda no relogio).
            const bm = barra.querySelector('#tc-minimapa');   // o botao do minimapa mostra o estado real dele
            if (bm && typeof Minimap !== 'undefined') { const t = 'Minimap ' + (Minimap.visivel ? 'ON' : 'OFF'); if (bm.textContent !== t) bm.textContent = t; bm.classList.toggle('on', !!Minimap.visivel); }
            const bn = barra.querySelector('#tc-nomes');   // o botao dos nomes mostra o estado real
            if (bn) { const t = 'Names ' + (window.showPlayerNames ? 'ON' : 'OFF'); if (bn.textContent !== t) bn.textContent = t; bn.classList.toggle('on', !!window.showPlayerNames); }
            const bp = barra.querySelector('#tc-pausa');
            if (bp) { // Com o jogo acabado (estado 'terminado', as estatisticas no ecra) o botao e CONTINUAR: o clique (alternar_pausa) conclui a partida no manager e vai para a home.
            const parado = this.estado === 'pausado' || this.estado === 'terminado';
            const t = this.pularDisponivel() ? 'Skip' : parado ? 'Continue' : 'Pause'; if (bp.textContent !== t) bp.textContent = t; bp.classList.toggle('on', parado); }
            const rp = barra.querySelector('#tc-replay'); if (rp) rp.classList.toggle('pisca', !!(window.MatchReplay && window.MatchReplay.isReplaying));
        }, 250);
    },

    // Soma +1 ao placar de um lado ('A' = casa, 'B' = fora) a pedido do clique na sigla do clube, e avisa o manager para o resultado dele acompanhar. Sem evento de golo: so o numero muda.
    ajustarPlacar(lado) {
        if (typeof Match === 'undefined' || this.estado === 'terminado') return;
        if (lado === 'A') Match.placarA++; else Match.placarB++;
        Match.updatePlacar();
        this.enviar('placar_ajustado', { placar: { casa: Match.placarA, fora: Match.placarB } });
    },

    // Os times estao a ENTRAR em campo (a entrada pode ser saltada com ESC): o botao Pausar / Continuar do manager passa a PULAR. Quando ja estao alinhados a espera a saida o botao e o da SAIDA.
    pularDisponivel() {
        return typeof Abertura !== 'undefined' && !!Abertura.activa && Abertura.modo !== 'intervalo' && Abertura.fase === 'entrada';
    },

    // O ESC que o manager reencaminha (a tela cheia do manager fica com o foco, nao o iframe): faz o mesmo que a tecla no jogo — cancela a entrada em campo, ou fecha a repeticao.
    esc() {
        // Na disputa de penaltis o ESC leva todos direto aos pontos finais do caminhar (nunca salta cobrancas).
        if (typeof DisputaPenaltis !== 'undefined' && DisputaPenaltis.activa) { DisputaPenaltis.cancelar(); return; }
        if (typeof Abertura !== 'undefined' && Abertura.activa) { Abertura.cancelar(); return; }
        const R = window.MatchReplay;
        if (R && R.isReplaying) R.stopReplay();
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
    // Repoe o ON/OFF dos Playing Styles nos jogadores do treinador (depois de a partida ser montada: o `tatica` pode ter chegado antes de os jogadores existirem).
    _reaplicarPlayingStyles() {
        if (typeof this._playingStylesLigados !== 'boolean' || typeof Match === 'undefined' || typeof AdaptadorManager === 'undefined') return;
        const casa = ((AdaptadorManager._opcoes || {}).taticaDe || 'casa') === 'casa';
        for (const p of ((casa ? Match.players : Match.opponents) || [])) p.playingStyleDesligado = !this._playingStylesLigados;
    },
    aplicarTatica(m) {
        if (typeof Tatics === 'undefined') return;
        this._aplicando = true;
        try {
            const pOk = (id, v) => { const el = document.getElementById(id); if (el && v !== undefined && v !== null) el.value = v; };
            pOk('t-estilo', m.estilo); pOk('t-linha', m.linhaDefensiva); pOk('t-team-style', m.teamPlayStyle);
            pOk('t-compactness', m.compactness); pOk('t-length-compactness', m.lengthCompactness);
            Tatics.update();
            // A mentalidade impoe pressao e profundidade ao passar por update(); o que o manager pediu manda sobre isso.
            if (m.pressaoDefensiva) { Tatics.pressaoDefensiva = m.pressaoDefensiva; pOk('t-pressao-def', m.pressaoDefensiva); }
            if (typeof m.pressaoValor === 'number') Tatics.pressaoValor = m.pressaoValor;
            if (typeof m.linhaValor === 'number') Tatics.linhaValor = m.linhaValor;
            if (m.agressividade) Tatics.agressividade = m.agressividade;
            // As posicoes por zona (com / sem bola) que o treinador ajustou no Match Tactics.
            if (m.zonas !== undefined && AdaptadorManager._ladoUtilizador && (!m.zonasFormacao || m.zonasFormacao === AdaptadorManager._ladoUtilizador.nome)) AdaptadorManager.registarZonas(AdaptadorManager._ladoUtilizador.chave, AdaptadorManager._ladoUtilizador.nome, m.zonas);
            // PLAYING STYLES do time do treinador: ON/OFF no Match Tactics (aba GENERAL). Desligados, os jogadores jogam sem o estilo individual (`playingStyleDesligado`, ver estiloAtivoDe).
            if (typeof m.playingStylesLigados === 'boolean') {
                const casa = ((AdaptadorManager._opcoes || {}).taticaDe || 'casa') === 'casa';
                for (const p of (casa ? Match.players : Match.opponents)) p.playingStyleDesligado = !m.playingStylesLigados;
                this._playingStylesLigados = m.playingStylesLigados;
            }
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
                teamPlayStyle: Tatics.teamPlayStyle, compactness: Tatics.compactness, lengthCompactness: Tatics.lengthCompactness, setores: Tatics.setores.slice() });
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
    /*
    O JOGO NASCE VAZIO: ao abrir o 3D (embutido) os times de omissao do simulador ja estavam em campo por tras do modal dos uniformes, e eram retirados quando
    a entrada comecava. Agora os 22, o trio e a bola ficam escondidos ate a entrada (`preparar`); a abertura mostra cada um quando sai do tunel.
    */
    esconderTimes() {
        if (typeof Match === 'undefined') return;
        for (const p of [].concat(Match.players || [], Match.opponents || [])) if (p && p.model) p.model.visible = false;
        if (typeof Officials !== 'undefined' && Officials.arbitro) [Officials.arbitro].concat(Officials.assistentes || []).forEach(o => { if (o && o.model) o.model.visible = false; });
        if (Match.ball) Match.ball.visible = false;
    },

    // O fundo preto por cima do 3D (so no iframe): `opacidade` 1 = tapa tudo, 0 = nada; a transicao dura `ms`.
    _fade(opacidade, ms) {
        if (typeof document === 'undefined' || !document.body) return;
        let el = document.getElementById('fade-preto');
        if (!el) {
            el = document.createElement('div');
            el.id = 'fade-preto';
            el.style.cssText = 'position:fixed;left:0;top:0;width:100%;height:100%;background:#000;opacity:0;pointer-events:none;z-index:100000;transition:opacity 0.6s ease';
            document.body.appendChild(el);
        }
        el.style.transition = 'opacity ' + (ms / 1000) + 's ease';
        // dois quadros: o navegador tem de ter pintado o estado anterior para a transicao correr
        requestAnimationFrame(() => requestAnimationFrame(() => { el.style.opacity = String(opacidade); }));
    },

    /*
    Depois dos uniformes escolhidos: o ecra escurece (FADE_MS), com o ecra preto monta-se a partida e a entrada dos times (a camara da abertura e a do
    tunel) e o ecra volta (fade in). Fora do iframe (testes, jogo solto) corre de imediato.
    */
    preparar(m) {
        // Sem fade (pedido): os times entram logo depois dos uniformes. A bola, escondida no arranque, volta a ver-se.
        this._preparar(m);
        if (typeof Match !== 'undefined' && Match.ball) Match.ball.visible = true;
    },

    _preparar(m) {
        AdaptadorManager.prepararPartida(m.casa, m.fora, { taticaDe: m.taticaDe || 'casa', escala: m.escala, ocupacao: m.ocupacao, ocupacaoVisitante: m.ocupacaoVisitante, arbitro: m.arbitro }); this._reaplicarPlayingStyles(); this._ladosBase = undefined;
        this._preparada = this._chave(m);
        this._medir();
        this._ligarPainel();
        this._ligarControles();
        // O som do estadio e do publico (desligado por omissao no jogo solto) liga-se: o clique do utilizador no manager desbloqueia-o (iframe allow=autoplay).
        if (typeof AmbienteSonoro !== 'undefined' && AmbienteSonoro.setLigado) { AmbienteSonoro.setLigado(true); if (AmbienteSonoro.tentarTocar) AmbienteSonoro.tentarTocar(); }
        if (typeof Sim === 'undefined') global_Sim();
        Sim.running = false;
        // Jogo carregado a meio (save): sem a entrada dos times; o `iniciar` com `retomar` poe cada um no posto.
        if (m.retomar && typeof m.retomar.minuto === 'number' && m.retomar.minuto > 0) {
            // Ja nos postos do save, em pausa, antes de o treinador continuar (o `iniciar` repoe o mesmo estado e solta o jogo).
            this._retomar(m.retomar, true);
            window.isPaused = true;
            return;
        }
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
        if (!jaPreparada) { this._ladosBase = undefined; AdaptadorManager.prepararPartida(m.casa, m.fora, { taticaDe: m.taticaDe || 'casa', escala: m.escala, ocupacao: m.ocupacao, ocupacaoVisitante: m.ocupacaoVisitante, arbitro: m.arbitro }); }
        this._reaplicarPlayingStyles();
        this._preparada = null;
        if (Match.ball) Match.ball.visible = true;   // o `esconderTimes` do arranque
        if (typeof Abertura !== 'undefined') Abertura.aguardarSaida = false;
        Match.segurarSaida = false;
        MatchStats.reset();
        if (typeof Notas !== 'undefined') Notas.iniciar();
        Match.tempoDeJogo = 0; Match.placarA = 0; Match.placarB = 0; Match.segundoTempoIniciado = false;
        Match.acrescimo1 = 0; Match.acrescimo2 = 0; Match.acrMin1 = 0; Match.acrMin2 = 0; Match.aguardaSaida2T = false; Match.acr1Calculado = false; Match.acr2Calculado = false; Match.faltasNoIntervalo = 0; Match.substituicoes = 0; Match.substituicoesNoIntervalo = 0;
        Match.primeiroTempoAcabou = false;
        Match.faseExtra = 0; Match.acrExtraCalculado = false; Match.acrExtraMin = 0; Match.acrExtra = 0;   // prorrogacao (ver match_loop.js)
        // A DECISAO do confronto (agregado anterior, se este jogo fecha uma copa) so vale no 3D visivel: o oculto nunca encena penaltis. A disputa de um jogo anterior, se ficou
        // a meio (ex.: o 3D fechado durante a reuniao), desfaz-se aqui para nao vazar para esta partida.
        Match.decisao = (m.decisao && this.modo === 'visivel') ? m.decisao : null;
        // O lado do utilizador (o jogo espera pela troca do goleiro expulso dele; no oculto a CPU decide pelos dois) e sem goleiro pendente de um jogo anterior.
        Match.ladoDoUtilizador = (this.modo === 'visivel') ? (m.taticaDe === 'fora' ? 'fora' : 'casa') : null; Match.goleiroPendente = null;
        // As trocas e os goleiros expulsos de um jogo anterior nao contam neste (o limite de 5 trocas, os reservas oferecidos).
        Match._goleirosEmFila = []; Match.goleirosExpulsos = []; Match.subsFeitas = []; Match.subsPendentes = []; Match.subsEmCurso = null;
        if (typeof DisputaPenaltis !== 'undefined' && (DisputaPenaltis.activa || DisputaPenaltis.fase)) DisputaPenaltis._libertar();
        Match.disputa = null;
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
        // RETOMAR um jogo gravado a meio (ver `_retomar`): sem entrada dos times, no minuto e com o placar do save.
        if (m.retomar && typeof m.retomar.minuto === 'number' && m.retomar.minuto > 0) {
            this._retomar(m.retomar);
            if (this.modo === 'oculto') this._arrancarCiclo(); else this._arrancarVigia();
            return;
        }
        // No modo visivel as equipas entram pelo tunel (js/abertura.js) antes da saida de bola, como no jogo normal; o relogio so corre depois.
        if (this.modo === 'visivel' && !jaPreparada && typeof Abertura !== 'undefined') { Abertura.jaCorreu = false; Abertura.activa = false; Abertura.iniciar(); }
        if (this.modo === 'oculto') this._arrancarCiclo();
        else this._arrancarVigia();
    },

    /*
    RETOMAR UM JOGO GRAVADO A MEIO (pedido: carregar um save do meio da partida 3D e voltar ao tempo certo). `r` = { minuto, placar: { casa, fora }, expulsos: [ids do manager],
    saida: 'casa' | 'fora' }. O motor nao guarda o estado do 3D no save (posicoes, posse, estatisticas finas), por isso o jogo recomeca NO MINUTO gravado, com o placar e os expulsos,
    com os times nos postos e uma saida de bola; a partir dos 45' ja no 2.o tempo (lados trocados, sem intervalo). As estatisticas do 3D recomecam a zero a partir dai.
    */
    /*
    O INSTANTANEO DO JOGO para o save (pedido: carregar o save e continuar EXACTAMENTE de onde parou, sem nova saida de bola): o relogio e os acrescimos, o placar, os lados, a bola
    (posicao e velocidade), quem a tem, a posse, cada jogador (posicao, orientacao, energia, expulso) e as estatisticas. So dados simples (viaja por mensagem e vai para o JSON do save).
    */
    instantaneo() {
        if (this.estado !== 'a_correr' && this.estado !== 'pausado') return null;
        const todos = [...Match.players, ...Match.opponents];
        const v = new THREE.Vector3();
        return {
            tempo: Match.tempoDeJogo, placarA: Match.placarA, placarB: Match.placarB,
            primeiroTempoAcabou: !!Match.primeiroTempoAcabou, acr1Calculado: !!Match.acr1Calculado, acrescimo1: Match.acrescimo1 || 0, acrMin1: Match.acrMin1 || 0, acr2Calculado: !!Match.acr2Calculado, acrMin2: Match.acrMin2 || 0, acrescimo2: Match.acrescimo2 || 0,
            faseExtra: Match.faseExtra || 0, acrExtraCalculado: !!Match.acrExtraCalculado, acrExtraMin: Match.acrExtraMin || 0, acrExtra: Match.acrExtra || 0, segundoTempoIniciado: !!Match.segundoTempoIniciado, trocados: !!Lados.trocados, faltasNoIntervalo: Match.faltasNoIntervalo || 0,
            substituicoes: Match.substituicoes || 0, substituicoesNoIntervalo: Match.substituicoesNoIntervalo || 0,
            bola: { p: [Match.ball.position.x, Match.ball.position.y, Match.ball.position.z], v: [Match.ballVel.x, Match.ballVel.y, Match.ballVel.z] },
            portador: Match.ballCarrier ? { team: Match.ballCarrier.team, id: Match.ballCarrier.id } : null,
            posse: Match.possessionTeam || null,
            jogadores: todos.filter(p => p && p.model).map(p => {
                v.set(0, 0, 1).applyQuaternion(p.model.quaternion);
                return { team: p.team, id: p.id, x: p.model.position.x, z: p.model.position.z, rot: Math.atan2(v.x, v.z), energia: p.energia, expulso: !!p.expulso };
            }),
            stats: (typeof MatchStats !== 'undefined') ? JSON.parse(JSON.stringify({ TeamA: MatchStats.TeamA, TeamB: MatchStats.TeamB })) : null
        };
    },

    // Repoe o instantaneo (ver `instantaneo`) por cima do jogo ja montado no minuto certo: jogadores, bola, posse e estatisticas, e o jogo segue SEM nova saida.
    _reporInstantaneo(s) {
        Match.tempoDeJogo = s.tempo || Match.tempoDeJogo;
        Match.placarA = s.placarA || 0; Match.placarB = s.placarB || 0;
        Match.primeiroTempoAcabou = !!s.primeiroTempoAcabou; Match.acr1Calculado = !!s.acr1Calculado; Match.acrescimo1 = s.acrescimo1 || 0; Match.acrMin1 = s.acrMin1 || 0; Match.acr2Calculado = !!s.acr2Calculado; Match.acrMin2 = s.acrMin2 || 0; Match.acrescimo2 = s.acrescimo2 || 0;
        Match.faseExtra = s.faseExtra || 0; Match.acrExtraCalculado = !!s.acrExtraCalculado; Match.acrExtraMin = s.acrExtraMin || 0; Match.acrExtra = s.acrExtra || 0; Match.segundoTempoIniciado = !!s.segundoTempoIniciado; Match.faltasNoIntervalo = s.faltasNoIntervalo || 0;
        Match.substituicoes = s.substituicoes || 0; Match.substituicoesNoIntervalo = s.substituicoesNoIntervalo || 0;
        if (Lados.trocados !== !!s.trocados) {
            Lados.trocados = !!s.trocados;
            [...Match.players, ...Match.opponents].forEach(p => { p.dirZ = Lados.dirDe(p.team); p.targetGoalZ = (CAMPO_COMP / 2) * p.dirZ; p.ownGoalZ = -(CAMPO_COMP / 2) * p.dirZ; });
            ['TeamA', 'TeamB'].forEach(t => { const bb = TeamAI.blackboards && TeamAI.blackboards[t]; if (!bb) return; bb.dir = Lados.dirDe(t); bb.ownGoalZ = ownGoalZCenter(t); bb.atkGoalZ = -bb.ownGoalZ; });
        }
        const todos = [...Match.players, ...Match.opponents];
        for (const j of (s.jogadores || [])) {
            const p = todos.find(x => x && x.team === j.team && x.id === j.id);
            if (!p || !p.model) continue;
            if (j.expulso && !p.expulso && typeof Officials !== 'undefined' && Officials.expulsar) { try { Officials.expulsar(p); } catch (e) { /* */ } continue; }
            p.model.position.x = j.x; p.model.position.z = j.z;
            p.model.rotation.set(0, j.rot || 0, 0);
            if (p.velocity) p.velocity.set(0, 0, 0);
            if (p.dynamicTarget) p.dynamicTarget.set(j.x, p.dynamicTarget.y, j.z);
            if (typeof j.energia === 'number') p.energia = j.energia;
            p.hasBall = false;
        }
        if (s.bola) {
            Match.ball.position.set(s.bola.p[0], s.bola.p[1], s.bola.p[2]);
            Match.ballVel.set(s.bola.v[0], s.bola.v[1], s.bola.v[2]);
        }
        Match.ballCarrier = null;
        if (s.portador) {
            const c = todos.find(x => x && x.team === s.portador.team && x.id === s.portador.id && !x.expulso);
            if (c) { c.hasBall = true; Match.ballCarrier = c; Match.lastTouchedTeam = c.team; Match.lastTouchedPlayer = c; }
        }
        if (s.posse) Match.possessionTeam = s.posse;
        if (s.stats && typeof MatchStats !== 'undefined') {
            for (const t of ['TeamA', 'TeamB']) if (s.stats[t] && MatchStats[t]) Object.assign(MatchStats[t], s.stats[t]);
        }
        if (Match.state !== 'PLAY') Match.mudarEstado('PLAY', 'retomar');
        if (typeof Match.updatePlacar === 'function') Match.updatePlacar();
    },

    _retomar(r, soPosicoes) {
        // Sem a entrada pelo tunel: quem estava escondido a espera aparece no posto.
        if (typeof Abertura !== 'undefined') {
            // A entrada ja podia estar montada (`preparar`): larga-a (mostra o trio) para o trio nao sair do tunel; depois poe-no nos postos de campo.
            if (Abertura.partes && Abertura.partes.length && Abertura._libertar) Abertura._libertar();
            Abertura.activa = false; Abertura.aguardarSaida = false; Abertura.jaCorreu = true;
        }
        if (typeof Officials !== 'undefined' && Officials.arbitro) {
            [Officials.arbitro].concat(Officials.assistentes || [], Officials.quarto ? [Officials.quarto] : []).forEach(o => { if (o && o.model) o.model.visible = (Officials._ativo !== false); });
            if (Officials.colocarInicial) Officials.colocarInicial();
        }
        Match.segurarSaida = false;
        [...Match.players, ...Match.opponents].forEach(p => { if (p && p.model) p.model.visible = true; });
        Match.tempoDeJogo = Math.max(0, r.minuto) * 60;
        Match.placarA = (r.placar && r.placar.casa) || 0;
        Match.placarB = (r.placar && r.placar.fora) || 0;
        if (typeof Match.updatePlacar === 'function') Match.updatePlacar();
        if (r.minuto >= 45) {
            // O 2.o tempo, ja a correr: os lados trocam (como no iniciarSegundoTempo), sem intervalo nem tunel.
            Match.primeiroTempoAcabou = true; Match.acr1Calculado = true; Match.segundoTempoIniciado = true;
            // Idempotente (o `_retomar` corre no `preparar` e outra vez no `iniciar`): o 2.o tempo e o inverso dos lados de base, nunca um `!` sobre o que la estava.
            if (this._ladosBase === undefined) this._ladosBase = Lados.trocados;
            Lados.trocados = !this._ladosBase;
            [...Match.players, ...Match.opponents].forEach(p => {
                p.dirZ = Lados.dirDe(p.team);
                p.targetGoalZ = (CAMPO_COMP / 2) * p.dirZ;
                p.ownGoalZ = -(CAMPO_COMP / 2) * p.dirZ;
            });
            ['TeamA', 'TeamB'].forEach(t => {
                const bb = TeamAI.blackboards && TeamAI.blackboards[t];
                if (!bb) return;
                bb.dir = Lados.dirDe(t); bb.ownGoalZ = ownGoalZCenter(t); bb.atkGoalZ = -bb.ownGoalZ;
            });
        }
        // Os expulsos do save saem de campo outra vez.
        if (Array.isArray(r.expulsos) && typeof Officials !== 'undefined' && Officials.expulsar) {
            for (const idMgr of r.expulsos) {
                const id = AdaptadorManager.idReal(idMgr);
                const p = [...Match.players, ...Match.opponents].find(x => x && x.id === id && !x.expulso);
                if (p) { try { Officials.expulsar(p); } catch (e) { /* sem cerimonia */ } }
            }
        }
        if (typeof Match.assignFormations === 'function') Match.assignFormations();
        if (r.instantaneo) {
            // O save trouxe o instantaneo do 3D: continua EXACTAMENTE de onde parou (sem saida de bola).
            this._reporInstantaneo(r.instantaneo);
        } else {
            const saida = (r.saida === 'fora') ? 'TeamB' : 'TeamA';
            if (typeof Match.resetPlay === 'function') Match.resetPlay(saida);
        }
        if (soPosicoes) return;   // so a pose do jogo: nada se diz ao manager antes de ele continuar
        this._ultimoEstado = -1;
        this._estadoPeriodico();
    },

    /*
    O INTERVALO COM O MANAGER (pedido): com o campo vazio o 3D avisa (`intervalo_pronto`) e ESPERA — so o treinador mexe na equipa. O 2.o tempo sai quando o
    manager manda `segundo_tempo` (o botao de continuar dele). Fora do manager (jogo solto, lotes) devolve false e o intervalo conta o tempo de sempre.
    */
    aoIntervaloPronto() {
        const noManager = typeof window !== 'undefined' && window.parent && window.parent !== window;
        if (!noManager || this.modo !== 'visivel' || this.estado === 'parado' || this.estado === 'terminado') return false;
        this.enviar('intervalo_pronto', { minuto: Math.floor(Match.tempoDeJogo / 60) });
        return true;
    },

    // O intervalo comecou (as estatisticas abrem): pede ao manager a classificacao actualizada.
    aoIntervaloIniciado() {
        const noManager = typeof window !== 'undefined' && window.parent && window.parent !== window;
        if (noManager && this.modo === 'visivel') this.enviar('intervalo_iniciado', { notas: (typeof Notas !== 'undefined') ? this._limpar(Notas.resultado()) : null, estatLinhas: (typeof estatisticasLinhas === 'function') ? estatisticasLinhas() : null });
    },

    segundoTempo() {
        if (typeof Match === 'undefined' || Match.state !== 'INTERVALO') return;
        Match.intervaloSegura = false;
        Match.intervaloTimer = Math.min(Match.intervaloTimer, 0.5);
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
        // A disputa de penaltis a espera do manager (a ordem, a resposta a uma cobranca): reenvia-se, o MatchDay pode ter estado desmontado (ver DisputaPenaltis.reenviarPendente).
        if (typeof DisputaPenaltis !== 'undefined' && DisputaPenaltis.activa) DisputaPenaltis.reenviarPendente();
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
            // O RELOGIO EM MM:SS no manager: os segundos de jogo, quando mudam (o `estado` so vai uma vez por minuto).
            const seg = Math.floor(Match.tempoDeJogo || 0);
            if (seg !== this._ultimoSegundo) { this._ultimoSegundo = seg; // Os DESCONTOS que o juiz anunciou (minutos) no tempo em curso; 0 ate ele os definir.
                const acr = Match.faseExtra ? (Match.acrExtraCalculado ? (Match.acrExtraMin || 0) : 0) : Match.segundoTempoIniciado ? (Match.acr2Calculado ? (Match.acrMin2 || 0) : 0) : (Match.acr1Calculado ? (Match.acrMin1 || 0) : 0);
                this.enviar('relogio', { segundos: seg, acrescimo: acr }); }
            if (this._acabou()) this._terminar();
        }, 500);
    },

    _acabou() {
        if (Match.state === 'FIM_DE_JOGO') return true;
        // No jogo visivel quem acaba o jogo e o `verificarFimDeTempo` (45:00 / 90:00 mais o acrescimo): so o lote (oculto) conta pelo relogio.
        if (!(typeof Sim !== 'undefined' && Sim.running)) return false;
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
        // Acabado o jogo o som (torcida e efeitos) pode parar (pedido).
        // So a torcida: os efeitos (o apito final) acabam sozinhos.
        if (this.modo === 'visivel' && typeof AmbienteSonoro !== 'undefined' && AmbienteSonoro.setPausa) AmbienteSonoro.setPausa(true);
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
        // Passes de verdade (curtos + lancamentos + cruzamentos, como no benchmark do porJogo), para a tela de estatisticas do manager.
        const passesDe = (s) => ({ tentados: s.passes.tentados + s.lancamentos.tentados + s.cruzamentos.tentados, certos: s.passes.certos + s.lancamentos.certos + s.cruzamentos.certos });
        return {
            placar: { casa: Match.placarA, fora: Match.placarB },
            prorrogacao: !!Match.faseExtra,
            passes: { casa: passesDe(A), fora: passesDe(B) },
            posse: { casa: posseT > 0 ? Math.round(1000 * (A.posseSegundos || 0) / posseT) / 10 : 50, fora: posseT > 0 ? Math.round(1000 * (B.posseSegundos || 0) / posseT) / 10 : 50 },
            estatisticas: this._limpar(MatchStats.resumo()),
            estatLinhas: (typeof estatisticasLinhas === 'function') ? estatisticasLinhas() : null,
            golos: golos, cartoes: cartoes,
            eventos: this._limpar({ l: L }).l.map((e, i) => { const ln = Narrador.linha(L[i]); e.texto = ln ? ln.texto : null; return e; }),
            relato: Narrador.relato(L),
            notas: (typeof Notas !== 'undefined') ? this._limpar(Notas.resultado()) : {}
        };
    }
};
function global_Sim() { if (typeof window !== 'undefined') window.Sim = {}; else global.Sim = {}; }
if (typeof window !== 'undefined') {
    window.Ponte = Ponte;
    // Avisa o manager quando a entrada dos times comeca e acaba (o botao dele vira PULAR).
    let _pularAntes = false;
    setInterval(() => { const v = Ponte.pularDisponivel(); if (v !== _pularAntes) { _pularAntes = v; Ponte.enviar('abertura_estado', { pular: v }); } }, 150);
    // Dentro do manager o painel do 3D nao existe: toda a tatica vive nas INSTRUCOES TATICAS do manager (camera, velocidade, pausa e replay estao na barra do manager).
    if (window.parent && window.parent !== window) {
        const css = document.createElement('style');
        css.textContent = '#painel-comandos,#painel-jogadores,#modal-skills{display:none !important} body:not(.tela-cheia) #coluna-direita,body:not(.tela-cheia) #painel-direito{display:none !important}';   // so o painel da direita (debug) volta em tela cheia
        document.head.appendChild(css);
    }
    window.addEventListener('message', (e) => Ponte.aoMensagem(e.data));
    // Avisa o manager quando o motor estiver pronto (a inicializacao do jogo e assincrona).
    const avisar = () => {
        if (typeof Match !== 'undefined' && Match.players && Match.players.length > 0) {
            if (window.parent && window.parent !== window) Ponte.esconderTimes();
            Ponte.enviar('pronto', {});
        }
        else setTimeout(avisar, 200);
    };
    if (typeof document !== 'undefined' && document.readyState !== 'loading') setTimeout(avisar, 0);
    else window.addEventListener('DOMContentLoaded', () => setTimeout(avisar, 0));
}
