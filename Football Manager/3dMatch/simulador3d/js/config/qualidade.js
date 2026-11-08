/*
=============================================================================
QUALIDADE GRAFICA (Game Settings > Graphics: HIGH, MEDIUM, LOW — o padrao e LOW)
=============================================================================
O manager passa o nivel no URL do iframe (`?q=LOW`) e, a meio do jogo, na mensagem `qualidade`. Cada nivel liga ou desliga o que pesa na GPU:

    sombras      o mapa de sombras do sol (o jogo todo desenha-se duas vezes com ele ligado)
    mapa         resolucao do mapa de sombras
    pixelRatio   quantos pixeis por pixel do ecra (1.5 = 2.25x o trabalho de 1)
    corpo        o modelo dos jogadores em campo: 4 = 456 triangulos (ver `leve` 4 em pose.js), (os de 912 e 976 triangulos foram retirados): so vale ao criar o corpo, ou seja na partida seguinte
    corpoArbitros o modelo do arbitro e dos assistentes: 4 (456)
    corpoExtras  o modelo dos restantes (staff, treinadores, reservas no banco, adeptos): 5 = o minimo (304, ver `leve` 5 em pose.js)
    adeptos      a FRACAO dos lugares do estadio que a torcida ocupa (1, 0.5, 0.25), seja qual for o estadio: lida ao construir o estadio, vale na proxima partida

O que muda a meio do jogo: sombras, resolucao do mapa e pixel ratio. A torcida so muda quando a partida e montada de novo.
=============================================================================
*/
const Qualidade = {
    niveis: {
        // Todos os niveis: jogadores e arbitros com o corpo `leve` 4 (456 triangulos), torcida, staff e reservas com o `leve` 5 (400).
        HIGH:   { sombras: true,  mapa: 2048, pixelRatio: 1.5, adeptos: 1.00, corpo: 4, corpoArbitros: 4, corpoExtras: 5, relvaTufos: true },
        MEDIUM: { sombras: true,  mapa: 1024, pixelRatio: 1.5, adeptos: 0.50, corpo: 4, corpoArbitros: 4, corpoExtras: 5, relvaTufos: true },
        LOW:    { sombras: false, mapa: 512,  pixelRatio: 1.5, adeptos: 0.25, corpo: 4, corpoArbitros: 4, corpoExtras: 5, relvaTufos: false }
    },
    // RESOLUCAO DINAMICA: a escala (0.85..1) que multiplica o pixel ratio do nivel. Desce se o FPS cai e sobe quando recupera (ver `ajustarPelaFps`, chamado uma vez por segundo).
    escala: 1, _baixos: 0, _altos: 0, escalaMin: 0.6,
    nivel: 'HIGH',   // sem `?q=` (a pagina do simulador aberta sozinha) fica como sempre foi; o manager manda sempre o nivel, e o dele e LOW

    _doUrl: function () {
        const m = /[?&]q=(HIGH|MEDIUM|LOW)\b/i.exec(typeof location !== 'undefined' ? location.search : '');
        return m ? m[1].toUpperCase() : null;
    },

    /*
    SOMBRAS DESLIGADAS NO TABLET, por omissao. Medido num iPad (painel de performance): com as sombras ligadas 19-25 fps, com elas desligadas 41-50 fps e sem travadas, com os
    mesmos ~2 M de triangulos — o mapa de sombras faz o jogo desenhar tudo o que projecta sombra uma segunda vez. O botao de sombras do 3D continua a ligar/desligar (e `Qualidade.definir`
    volta a pedir o nivel, que no tablet continua sem sombras).
    */
    cfg: function () {
        const base = this.niveis[this.nivel] || this.niveis.LOW;
        if (!base.sombras || !this.ehTouch()) return base;
        const c = this._cfgTouch || (this._cfgTouch = {});
        if (c.__de !== base) { Object.assign(c, base, { sombras: false }); c.__de = base; }
        return c;
    },

    /*
    TABLET/TELEMOVEL: pixel ratio 1 e resolucao dinamica que pode descer. O `pixelRatio: 1.5` dos niveis fazia um iPad (devicePixelRatio 2) desenhar 2.25x os pixeis — 8.7 MP por
    frame com sombreamento por luz — e o tecto de 1.0 para dispositivos touch (main.js) deixou de valer quando o `Qualidade` passou a mandar no pixel ratio (relato: no iPad o FPS
    nao passa de 25 mesmo sem torcida). Aqui o tecto volta, e o `escalaMin` deixa de ser 1 (com 1 a resolucao dinamica nunca descia).
    */
    ehTouch: function () {
        if (typeof window === 'undefined') return false;
        // So toque a serio: a largura da janela NAO conta (o 3D dentro do manager, no PC, e um iframe estreito e ficava sem sombras e com pixel ratio 1).
        return ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
    },
    pixelRatioEfetivo: function () {
        const c = this.cfg(), dpr = window.devicePixelRatio || 1;
        return Math.min(dpr, this.ehTouch() ? Math.min(1.0, c.pixelRatio) : c.pixelRatio) * this.escala;
    },

    /*
    SOMBRA FALSA (BLOB SHADOW) para quando o mapa de sombras esta desligado (tablet): sem sombra os jogadores e os arbitros "flutuam" e o jogo perde profundidade. Um disco escuro
    com borda suave colado ao relvado, filho do corpo (anda e roda com ele). Uma so geometria, material e textura para todos. So aparece com as sombras reais desligadas (`aplicar`).
    So jogadores em campo e arbitros: staff, reservas e adeptos nao levam (muitos, e pouco se vê).
    */
    _blobRecursos: null, _blobs: [],
    criarBlob: function (corpo) {
        if (typeof THREE === 'undefined' || !corpo) return null;
        let r = this._blobRecursos;
        if (!r) {
            const mk = (tex) => new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
            // DIA: uma mancha com borda suave (o `atualizarBlobs` estica-a e roda-a para o lado oposto ao sol).
            const cv = document.createElement('canvas'); cv.width = cv.height = 64;
            const c = cv.getContext('2d'), g = c.createRadialGradient(32, 32, 0, 32, 32, 32);
            g.addColorStop(0, 'rgba(0,0,0,0.55)'); g.addColorStop(0.55, 'rgba(0,0,0,0.35)'); g.addColorStop(1, 'rgba(0,0,0,0)');
            c.fillStyle = g; c.fillRect(0, 0, 64, 64);
            // NOITE (estadio iluminado): quatro sombras suaves a sair do pe para as DIAGONAIS (as torres de luz estao nos cantos), mais um nucleo pequeno.
            const cn = document.createElement('canvas'); cn.width = cn.height = 128;
            const d = cn.getContext('2d');
            for (let k = 0; k < 4; k++) {
                d.save(); d.translate(64, 64); d.rotate(Math.PI / 4 + k * Math.PI / 2); d.translate(26, 0); d.scale(1, 0.26);
                const gg = d.createRadialGradient(0, 0, 0, 0, 0, 38);
                gg.addColorStop(0, 'rgba(0,0,0,0.42)'); gg.addColorStop(1, 'rgba(0,0,0,0)');
                d.fillStyle = gg; d.beginPath(); d.arc(0, 0, 38, 0, Math.PI * 2); d.fill(); d.restore();
            }
            const gc = d.createRadialGradient(64, 64, 0, 64, 64, 15);
            gc.addColorStop(0, 'rgba(0,0,0,0.5)'); gc.addColorStop(1, 'rgba(0,0,0,0)');
            d.fillStyle = gc; d.fillRect(0, 0, 128, 128);
            r = this._blobRecursos = { geo: new THREE.PlaneGeometry(1, 1), matDia: mk(new THREE.CanvasTexture(cv)), matNoite: mk(new THREE.CanvasTexture(cn)) };
        }
        const m = new THREE.Mesh(r.geo, r.matDia);
        const esc = (corpo.scale && corpo.scale.x) || 1;
        m.rotation.x = -Math.PI / 2;
        m.scale.set(0.95 / esc, 0.95 / esc, 1);   // ~0.95 m de diametro (o `atualizarBlobs` ajusta-o a luz)
        m.userData.esc = esc;
        m.position.y = 0.04 / esc;                // logo acima do relvado (o corpo assenta em ALTURA_BASE_Y = -0.01)
        m.renderOrder = 1; m.frustumCulled = false; m.castShadow = false; m.receiveShadow = false; m.name = 'BlobSombra';
        m.visible = !this.cfg().sombras;
        corpo.add(m);
        this._blobs.push(m);
        return m;
    },

    /*
    A SOMBRA ACOMPANHA A LUZ (corre uma vez por frame, do main.js, so com as sombras reais desligadas):
      . DE DIA a mancha estica-se para o lado OPOSTO ao sol, no angulo dele: o comprimento cresce com o quanto o sol esta baixo (distancia horizontal / altura da `dirLightCore`).
      . COM O ESTADIO ILUMINADO (`window.jogoNoturno`, holofotes) a textura passa a ser a das quatro sombras nas diagonais, fixas no mundo (as torres estao nos cantos).
    A mancha e filha do corpo, que roda: o angulo do mundo converte-se para o referencial do corpo (menos o `rotation.y` dele).
    */
    atualizarBlobs: function () {
        const bl = this._blobs, r = this._blobRecursos;
        if (!bl.length || !r) return;
        const noite = !!window.jogoNoturno;
        const luz = window.dirLightCore;
        // Direccao da sombra no mundo (oposta ao sol) e o seu comprimento relativo.
        let dx = -0.62, dz = -0.49, esticar = 0.64;
        if (luz && luz.position && luz.position.y > 1) {
            const h = Math.hypot(luz.position.x, luz.position.z);
            if (h > 1e-3) { dx = -luz.position.x / h; dz = -luz.position.z / h; }
            esticar = h / luz.position.y;
        }
        const largura = 0.8, comp = largura * (1 + 1.6 * esticar);   // ~2 m com o sol a 100 m de altura e 64 m de lado
        const cd = Math.cos(Math.PI / 4), sd = Math.sin(Math.PI / 4);
        for (let i = bl.length - 1; i >= 0; i--) {
            const m = bl[i], corpo = m.parent;
            if (!corpo) { bl.splice(i, 1); continue; }
            if (!m.visible) continue;
            const esc = m.userData.esc || 1, psi = corpo.rotation.y, c = Math.cos(psi), s = Math.sin(psi);
            m.material = noite ? r.matNoite : r.matDia;
            // Para o referencial do corpo: l = Ry(-psi) * mundo.
            const lx = dx * c - dz * s, lz = dx * s + dz * c;
            if (noite) {
                // As diagonais ja estao no desenho: roda-se so contra a rotacao do corpo, e a mancha e quadrada (~2.2 m).
                m.rotation.z = -psi;   // o angulo no mundo e (rotation.z + psi): com -psi o desenho fica fixo no mundo
                m.scale.set(2.2 / esc, 2.2 / esc, 1);
                m.position.x = 0; m.position.z = 0;
            } else {
                m.rotation.z = Math.atan2(-lz, lx);
                m.scale.set(comp / esc, largura / esc, 1);
                // O centro avanca ao longo da sombra: ela nasce nos pes e estende-se para longe.
                const av = (comp / 2 - 0.35) / esc;
                m.position.x = lx * av; m.position.z = lz * av;
            }
        }
    },

    // Depois de o renderer e a luz existirem (e a meio do jogo): sombras, mapa e pixel ratio.
    aplicar: function () {
        const c = this.cfg(), r = window.rendererCore, luz = window.dirLightCore;
        if (!r) return;
        r.setPixelRatio(this.pixelRatioEfetivo());
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
        // Sombra falsa: so quando nao ha mapa de sombras (e limpa os de corpos ja deitados fora).
        this._blobs = this._blobs.filter(function (m) { return m.parent; });
        this._blobs.forEach(function (m) { m.visible = !c.sombras; });
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
        /*
        SO DESCE SE ISSO AJUDA. Medido num iPad: a escala foi ao minimo (0.6, canvas 645x327) e o FPS ficou nos 19 — a carga nao era de pixeis (era geometria: 2.7 M de triangulos com
        a torcida), e a imagem ficou desfocada sem ganho nenhum. Depois de cada descida guarda-se o FPS de antes; se na leitura seguinte o ganho for < 10% desfaz-se o passo e
        deixa-se de descer (`_semGanho`) ate a escala poder voltar a subir por si.
        */
        if (this._fpsAntes !== undefined) {
            const antes = this._fpsAntes; this._fpsAntes = undefined;
            if (fps < antes * 1.1) {
                this.escala = Math.min(1, +(this.escala + 0.1).toFixed(2)); this._semGanho = true; this._baixos = 0; mudou = true;
            }
        } else if (fps < alvo - 8) {
            this._altos = 0;
            if (++this._baixos >= 5 && !this._semGanho && this.escala > this.escalaMin + 1e-6) {
                this._fpsAntes = fps;
                this.escala = Math.max(this.escalaMin, +(this.escala - 0.1).toFixed(2)); this._baixos = 0; mudou = true;
            }
        } else if (fps >= alvo - 2) {
            this._baixos = 0;
            if (++this._altos >= 4 && this.escala < 1 - 1e-6) { this.escala = Math.min(1, +(this.escala + 0.05).toFixed(2)); this._altos = 0; mudou = true; }
            if (this.escala >= 1 - 1e-6) this._semGanho = false;
        } else { this._baixos = 0; this._altos = 0; }
        if (mudou) {
            r.setPixelRatio(this.pixelRatioEfetivo());
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
