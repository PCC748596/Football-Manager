/*
=============================================================================
QUALIDADE GRAFICA (Game Settings > Graphics: HIGH, MEDIUM, LOW — o padrao e LOW)
=============================================================================
O manager passa o nivel no URL do iframe (`?q=LOW`) e, a meio do jogo, na mensagem `qualidade`. Cada nivel liga ou desliga o que pesa na GPU:

    sombras      o mapa de sombras do sol (o jogo todo desenha-se duas vezes com ele ligado)
    mapa         resolucao do mapa de sombras
    pixelRatio   quantos pixeis por pixel do ecra (1.5 = 2.25x o trabalho de 1)
    corpo        o modelo dos bonecos (jogadores, arbitros, reservas, staff): 0 = o de sempre (6 520 triangulos), 1 = leve, sem esferas nas juntas (888): so vale ao criar o corpo, ou seja na partida seguinte
    corpoExtras  o modelo de TODOS os que nao sao os jogadores em campo (arbitros, staff, treinadores, reservas no banco, adeptos): 4 = metade dos triangulos (456, ver `leve` 4 em pose.js); 1 = o de 888
    adeptos      a FRACAO dos lugares do estadio que a torcida ocupa (1, 0.5, 0.25), seja qual for o estadio: lida ao construir o estadio, vale na proxima partida

O que muda a meio do jogo: sombras, resolucao do mapa e pixel ratio. A torcida so muda quando a partida e montada de novo.
=============================================================================
*/
const Qualidade = {
    niveis: {
        // Todos os niveis usam o corpo leve (pedido: sem esferas nas juntas e 888 triangulos, a qualidade e a mesma).
        HIGH:   { sombras: true,  mapa: 2048, pixelRatio: 1.5, adeptos: 1.00, corpo: 1, corpoExtras: 4, relvaTufos: true },
        MEDIUM: { sombras: true,  mapa: 1024, pixelRatio: 1.5, adeptos: 0.50, corpo: 1, corpoExtras: 4, relvaTufos: true },
        LOW:    { sombras: false, mapa: 512,  pixelRatio: 1.5, adeptos: 0.25, corpo: 1, corpoExtras: 4, relvaTufos: false }
    },
    // RESOLUCAO DINAMICA: a escala (0.85..1) que multiplica o pixel ratio do nivel. Desce se o FPS cai e sobe quando recupera (ver `ajustarPelaFps`, chamado uma vez por segundo).
    escala: 1, _baixos: 0, _altos: 0, escalaMin: 1,
    nivel: 'HIGH',   // sem `?q=` (a pagina do simulador aberta sozinha) fica como sempre foi; o manager manda sempre o nivel, e o dele e LOW

    _doUrl: function () {
        const m = /[?&]q=(HIGH|MEDIUM|LOW)\b/i.exec(typeof location !== 'undefined' ? location.search : '');
        return m ? m[1].toUpperCase() : null;
    },

    cfg: function () { return this.niveis[this.nivel] || this.niveis.LOW; },

    // Depois de o renderer e a luz existirem (e a meio do jogo): sombras, mapa e pixel ratio.
    aplicar: function () {
        const c = this.cfg(), r = window.rendererCore, luz = window.dirLightCore;
        if (!r) return;
        r.setPixelRatio(Math.min(window.devicePixelRatio || 1, c.pixelRatio) * this.escala);
        r.setSize(window.innerWidth, window.innerHeight);
        const mudouSombra = r.shadowMap.enabled !== c.sombras;
        r.shadowMap.enabled = c.sombras;
        if (luz) {
            luz.castShadow = c.sombras;
            if (luz.shadow && luz.shadow.mapSize.width !== c.mapa) {
                luz.shadow.mapSize.set(c.mapa, c.mapa);
                if (luz.shadow.map) { luz.shadow.map.dispose(); luz.shadow.map = null; }
            }
        }
        if (window.relvaTufos) window.relvaTufos.visible = c.relvaTufos !== false;   // tufos de relva 3D (js/relva_tufos.js)
        const b = document.getElementById('btn-sombras');
        if (b) { b.innerText = 'Sombras: ' + (c.sombras ? 'ON' : 'OFF'); b.classList.toggle('active', c.sombras); }
        if (mudouSombra && window.Match && window.Match.scene) {
            window.Match.scene.traverse(function (o) {
                if (!o.material) return;
                (Array.isArray(o.material) ? o.material : [o.material]).forEach(function (m) { if (m) m.needsUpdate = true; });
            });
        }
    },

    /*
    A RESOLUCAO ACOMPANHA O FPS (a GPU a aguentar a carga): com menos de `fpsAlvo - 8` durante 5 segundos seguidos desce 0.1 (ate `escalaMin`); com `fpsAlvo - 2` ou mais durante
    4 s volta a subir 0.05. So muda o numero de pixeis desenhados; nada do jogo.
    */
    ajustarPelaFps: function (fps, fpsAlvo) {
        const alvo = fpsAlvo || 60, r = window.rendererCore;
        if (!r || !(fps > 0)) return;
        let mudou = false;
        if (fps < alvo - 8) {
            this._altos = 0;
            if (++this._baixos >= 5 && this.escala > this.escalaMin + 1e-6) { this.escala = Math.max(this.escalaMin, +(this.escala - 0.1).toFixed(2)); this._baixos = 0; mudou = true; }
        } else if (fps >= alvo - 2) {
            this._baixos = 0;
            if (++this._altos >= 4 && this.escala < 1 - 1e-6) { this.escala = Math.min(1, +(this.escala + 0.05).toFixed(2)); this._altos = 0; mudou = true; }
        } else { this._baixos = 0; this._altos = 0; }
        if (mudou) {
            const c = this.cfg();
            r.setPixelRatio(Math.min(window.devicePixelRatio || 1, c.pixelRatio) * this.escala);
            r.setSize(window.innerWidth, window.innerHeight);
        }
    },

    definir: function (nivel) {
        const n = String(nivel || '').toUpperCase();
        if (!this.niveis[n]) return;
        this.nivel = n;
        this.aplicar();
    }
};
(function () { const q = Qualidade._doUrl(); if (q) Qualidade.nivel = q; })();
if (typeof window !== 'undefined') window.Qualidade = Qualidade;
