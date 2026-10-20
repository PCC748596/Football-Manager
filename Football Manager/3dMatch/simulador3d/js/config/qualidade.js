/*
=============================================================================
QUALIDADE GRAFICA (Game Settings > Graphics: HIGH, MEDIUM, LOW — o padrao e LOW)
=============================================================================
O manager passa o nivel no URL do iframe (`?q=LOW`) e, a meio do jogo, na mensagem `qualidade`. Cada nivel liga ou desliga o que pesa na GPU:

    sombras      o mapa de sombras do sol (o jogo todo desenha-se duas vezes com ele ligado)
    mapa         resolucao do mapa de sombras
    pixelRatio   quantos pixeis por pixel do ecra (1.5 = 2.25x o trabalho de 1)
    corpo        o modelo dos bonecos (jogadores, arbitros, reservas, staff): 0 = o de sempre (6 520 triangulos), 1 = leve, sem esferas nas juntas (888): so vale ao criar o corpo, ou seja na partida seguinte
    adeptos      a FRACAO dos lugares do estadio que a torcida ocupa (1, 0.5, 0.25), seja qual for o estadio: lida ao construir o estadio, vale na proxima partida

O que muda a meio do jogo: sombras, resolucao do mapa e pixel ratio. A torcida so muda quando a partida e montada de novo.
=============================================================================
*/
const Qualidade = {
    niveis: {
        // Todos os niveis usam o corpo leve (pedido: sem esferas nas juntas e 888 triangulos, a qualidade e a mesma).
        HIGH:   { sombras: true,  mapa: 2048, pixelRatio: 1.5, adeptos: 1.00, corpo: 1 },
        MEDIUM: { sombras: true,  mapa: 1024, pixelRatio: 1.0, adeptos: 0.50, corpo: 1 },
        LOW:    { sombras: false, mapa: 512,  pixelRatio: 1.0, adeptos: 0.25, corpo: 1 }
    },
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
        r.setPixelRatio(Math.min(window.devicePixelRatio || 1, c.pixelRatio));
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
        const b = document.getElementById('btn-sombras');
        if (b) { b.innerText = 'Sombras: ' + (c.sombras ? 'ON' : 'OFF'); b.classList.toggle('active', c.sombras); }
        if (mudouSombra && window.Match && window.Match.scene) {
            window.Match.scene.traverse(function (o) {
                if (!o.material) return;
                (Array.isArray(o.material) ? o.material : [o.material]).forEach(function (m) { if (m) m.needsUpdate = true; });
            });
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
