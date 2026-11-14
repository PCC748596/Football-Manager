/*
=============================================================================
QUALIDADE GRAFICA (Game Settings > Graphics: HIGH, MEDIUM, LOW — o padrao e MEDIUM)
=============================================================================
O manager passa o nivel no URL do iframe (`?q=LOW`) e, a meio do jogo, na mensagem `qualidade`. Cada nivel liga ou desliga o que pesa na GPU:

    sombras      o mapa de sombras do sol (o jogo todo desenha-se duas vezes com ele ligado)
    mapa         resolucao do mapa de sombras
    pixelRatio   quantos pixeis por pixel do ecra (1.5 = 2.25x o trabalho de 1)
    corpo        o modelo dos jogadores em campo: 4 = 456 triangulos (ver `leve` 4 em pose.js), (os de 912 e 976 triangulos foram retirados): so vale ao criar o corpo, ou seja na partida seguinte
    corpoArbitros o modelo do arbitro e dos assistentes: 4 (456)
    corpoExtras  o modelo dos restantes (staff, treinadores, reservas no banco, adeptos): 5 = o minimo (304, ver `leve` 5 em pose.js)
    adeptos      a FRACAO dos lugares do estadio que a torcida ocupa (HIGH 1, MEDIUM 1, LOW 0.5), seja qual for o estadio: lida ao construir o estadio, vale na proxima partida
    torcida      '3d' = adeptos com o modelo 3D, '2d' = adeptos em sprite (Crowd._usarSprites; no ecra de toque continua sempre o sprite)
    Pedido: HIGH 100% da torcida em 3D, MEDIUM 100% em 2D, LOW 50% em 2D; sombras desligadas em todos.

O que muda a meio do jogo: sombras, resolucao do mapa e pixel ratio. A torcida so muda quando a partida e montada de novo.
=============================================================================
*/
// Altura (m) da sombra falsa sobre o relvado (y 0); as linhas do campo ficam a 0.01 e as de impedimento a 0.02.
const BLOB_Y = 0.02;
const Qualidade = {
    niveis: {
        // Todos os niveis: jogadores e arbitros com o corpo `leve` 4 (456 triangulos), torcida, staff e reservas com o `leve` 5 (400).
        HIGH:   { luzes: 11, sombras: false, mapa: 2048, pixelRatio: 1.5, adeptos: 1.00, torcida: '3d', corpo: 4, corpoArbitros: 4, corpoExtras: 5, relvaTufos: true },
        MEDIUM: { luzes: 10, sombras: false, mapa: 1024, pixelRatio: 1.5, adeptos: 1.00, torcida: '2d', corpo: 4, corpoArbitros: 4, corpoExtras: 5, relvaTufos: true },
        LOW:    { luzes: 6, sombras: false, mapa: 512,  pixelRatio: 1.5, adeptos: 0.50, torcida: '2d', corpo: 4, corpoArbitros: 4, corpoExtras: 5, relvaTufos: false }
    },
    // RESOLUCAO DINAMICA: a escala (0.85..1) que multiplica o pixel ratio do nivel. Desce se o FPS cai e sobe quando recupera (ver `ajustarPelaFps`, chamado uma vez por segundo).
    escala: 1, _baixos: 0, _altos: 0, escalaMin: 0.6,
    nivel: 'MEDIUM',   // sem `?q=` (a pagina do simulador aberta sozinha) e o padrao; o manager manda sempre o nivel, e o padrao dele tambem e MEDIUM

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
        if (c.__de !== base) { Object.assign(c, base, { sombras: false, luzes: Math.min(base.luzes || 6, 6) }); c.__de = base; }
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
    _blobRecursos: null, _blobs: [],   // BLOB_Y (abaixo): a altura do mundo da mancha
    criarBlob: function (corpo) {
        if (typeof THREE === 'undefined' || !corpo) return null;
        let r = this._blobRecursos;
        if (!r) {
            const mk = (tex) => new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2, side: THREE.DoubleSide });
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
        this._atualizarBlobsExtra(r);
        const noite = !!window.jogoNoturno;
        const luz = window.dirLightCore;
        // Direccao da sombra no mundo (oposta ao sol) e o seu comprimento relativo.
        let dx = -0.62, dz = -0.49, esticar = 0.64;
        if (luz && luz.position && luz.position.y > 1) {
            const h = Math.hypot(luz.position.x, luz.position.z);
            if (h > 1e-3) { dx = -luz.position.x / h; dz = -luz.position.z / h; }
            esticar = h / luz.position.y;
        }
        // DE DIA a sombra e REDONDA (pedido): um disco sob os pes, sem esticar para o lado oposto ao sol (`esticar`, `dx`, `dz` ficam so para o angulo da mancha deitada).
        const largura = 1.0, comp = largura;
        // Tempo nublado: sombras mais fracas (pedido). Opacidade do material de dia (e das manchas da bola/balizas, que copiam a textura) por condicao.
        const cond = (window.Weather && window.Weather.condicao) || 'limpo';
        const forca = { limpo: 1, nublado: 0.5, encoberto: 0.3, chuva: 0.3, neve: 0.4 }[cond];
        r.matDia.opacity = forca === undefined ? 1 : forca;
        const cd = Math.cos(Math.PI / 4), sd = Math.sin(Math.PI / 4);
        /*
        A LISTA NAO CRESCE: a mancha de um corpo deitado fora (uma troca de jogadores, o staff ou os reservas refeitos, uma nova partida) continuava na lista — o `parent` dela e o corpo velho, que nao e
        null mesmo fora da cena — e o loop abaixo percorria-a e fazia a conta (seno, cosseno, escala) para cada uma, todo frame, cada vez mais. Medido: 56 entradas para 29 manchas vivas. Agora a mancha
        so conta se a cadeia de `parent` acaba na cena do jogo.
        */
        const cena = window.Match && window.Match.scene;
        for (let i = bl.length - 1; i >= 0; i--) {
            const m = bl[i], corpo = m.parent;
            let raiz = corpo; while (raiz && raiz.parent) raiz = raiz.parent;
            if (!corpo || (cena && raiz !== cena)) { bl.splice(i, 1); continue; }
            if (!m.visible) continue;
            // O rumo do corpo pela FRENTE REAL (o quaternio), nao pelo `rotation.y`: virado com lookAt/quaternio o Euler pode ser (pi, y, pi) e o `rotation.y` mente —
            // a mancha rodava com o jogador (relato: *"as sombras estao girando junto com os jogadores"*).
            const fq = this._fBlob || (this._fBlob = new THREE.Vector3());
            fq.set(0, 0, 1).applyQuaternion(corpo.quaternion);
            const esc = m.userData.esc || 1, psi = Math.atan2(fq.x, fq.z), c = Math.cos(psi), s = Math.sin(psi);
            m.material = noite ? r.matNoite : r.matDia;
            /*
            CORPO INCLINADO (mergulho do guarda-redes, `GkDive`: o corpo tomba por um quaternio em torno do eixo da frente): a mancha e filha dele e herdava a inclinacao, ficando de pe, ou no ar, a meio do
            voo (relato: *"no pulo do goleiro a sombra ficou no ar"*). Nesse caso a orientacao e a posicao calculam-se NO MUNDO — o desenho deitado no relvado (a `BLOB_Y`), sob o corpo — e convertem-se
            para o referencial do corpo.
            */
            const qc = corpo.quaternion;
            if (Math.abs(qc.x) + Math.abs(qc.z) > 0.02) {
                const Q = this._qBlob || (this._qBlob = { alvo: new THREE.Quaternion(), plano: new THREE.Quaternion(), z: new THREE.Quaternion(), inv: new THREE.Quaternion(), v: new THREE.Vector3(), ex: new THREE.Vector3(1, 0, 0), ez: new THREE.Vector3(0, 0, 1) });
                const angMundo = noite ? 0 : Math.atan2(-dz, dx);
                Q.plano.setFromAxisAngle(Q.ex, -Math.PI / 2);
                Q.z.setFromAxisAngle(Q.ez, angMundo);
                Q.alvo.copy(Q.plano).multiply(Q.z);                       // deitada no relvado, com a sombra para o lado oposto ao sol
                Q.inv.copy(qc).invert();
                m.quaternion.copy(Q.inv).multiply(Q.alvo);
                const lado = noite ? 2.2 : comp, larg = noite ? 2.2 : largura, desloca = 0;
                m.scale.set(lado / esc, larg / esc, 1);
                corpo.updateMatrixWorld(true);
                Q.v.set(corpo.position.x + dx * desloca, BLOB_Y, corpo.position.z + dz * desloca);
                corpo.worldToLocal(Q.v);
                m.position.copy(Q.v);
                continue;
            }
            /*
            A ALTURA DA MANCHA E A DO MUNDO, nao a do corpo (relato: *"as sombras estao piscando com os jogadores correndo"*). A mancha e filha do corpo a +0.04, mas o corpo sobe e desce ao correr (o assento
            da sola, `assentarNoChao`, chega a leva-lo 6 cm abaixo da base): quando ele descia mais de ~4 cm a mancha ficava ABAIXO do relvado e desaparecia, e voltava no frame seguinte. Cada frame poe-se
            a mancha a `BLOB_Y` m do relvado (y do mundo 0), compensando o y do corpo.
            */
            m.position.y = (BLOB_Y - corpo.position.y) / (corpo.scale.y || esc);   // a escala em y pode diferir da de x (altura do jogador)
            // Para o referencial do corpo: l = Ry(-psi) * mundo.
            const lx = dx * c - dz * s, lz = dx * s + dz * c;
            if (noite) {
                // As diagonais ja estao no desenho: roda-se so contra a rotacao do corpo, e a mancha e quadrada (~2.2 m).
                m.rotation.set(-Math.PI / 2, 0, -psi);   // o angulo no mundo e (rotation.z + psi): com -psi o desenho fica fixo no mundo
                m.scale.set(2.2 / esc, 2.2 / esc, 1);
                m.position.x = 0; m.position.z = 0;
            } else {
                m.rotation.set(-Math.PI / 2, 0, Math.atan2(-lz, lx));
                m.scale.set(comp / esc, largura / esc, 1);
                // O centro avanca ao longo da sombra: ela nasce nos pes e estende-se para longe.
                m.position.x = 0; m.position.z = 0;   // redonda: centrada nos pes
            }
        }
    },

    /*
    A SOMBRA FALSA DA BOLA E DAS BALIZAS (pedido): sem o mapa de sombras a bola e as balizas ficavam sem sombra nenhuma. A da bola e uma mancha pequena que segue o ponto da bola no relvado, mais
    larga e mais fraca quanto mais alto ela vai; a das balizas e uma mancha larga e suave atras de cada linha de golo (a rede e a estrutura). Vivem na cena (nao filhas de um corpo) a `BLOB_Y` do relvado
    e seguem a mesma regra de visibilidade das dos jogadores: so sem o mapa de sombras (com o OFF do painel de debug elas aparecem).
    */
    _blobsExtra: null,
    _atualizarBlobsExtra: function (r) {
        const cena = window.Match && window.Match.scene;
        if (!cena || !window.Match.ball) return;
        // Segue o ESTADO REAL do mapa de sombras (o botao do debug mexe nele): sem mapa, ha mancha.
        const visivel = window.rendererCore ? !window.rendererCore.shadowMap.enabled : !this.cfg().sombras;
        if (!this._blobsExtra || !this._blobsExtra.bola.parent) {
            const mk = () => new THREE.MeshBasicMaterial({ map: r.matDia.map, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2, side: THREE.DoubleSide });
            const plano = (mat) => { const m = new THREE.Mesh(r.geo, mat); m.rotation.x = -Math.PI / 2; m.renderOrder = 1; m.frustumCulled = false; m.castShadow = false; m.receiveShadow = false; return m; };
            const bola = plano(mk()); bola.name = 'BlobSombraBola';
            const largura = ((typeof LARGURA_BALIZA === 'number') ? LARGURA_BALIZA : 7.32) + 1.6, fundo = (typeof CAMPO_COMP === 'number') ? CAMPO_COMP / 2 : 52.5;
            const balizas = [-1, 1].map(sinal => {
                const m = plano(mk()); m.name = 'BlobSombraBaliza';
                m.scale.set(largura, 3.4, 1); m.position.set(0, BLOB_Y, sinal * (fundo + 1.2)); m.material.opacity = 0.55;
                cena.add(m); return m;
            });
            cena.add(bola);
            this._blobsExtra = { bola: bola, balizas: balizas };
        }
        const E = this._blobsExtra, b = window.Match.ball.position;
        E.bola.visible = visivel; E.balizas.forEach(function (m) { m.visible = visivel; });
        if (!visivel) return;
        // A bola no ar: a mancha afasta-se (cresce e esmaece) com a altura, sempre no chao por baixo dela.
        const h = Math.max(0, b.y - 0.11), tam = 0.55 + 0.06 * h;
        E.bola.position.set(b.x, BLOB_Y, b.z);
        E.bola.scale.set(tam, tam, 1);
        E.bola.material.opacity = Math.max(0.2, 0.95 - h * 0.08);
    },

    /*
    QUANTAS SpotLights DOS HOLOFOTES (`luzes` do nivel): cada SpotLight soma ao sombreamento de TODOS os pixeis do campo e da bancada (o iPad ja media 25 fps mesmo sem torcida por isso). Com os
    holofotes dos dois lados e dos fundos (14) o tablet caiu para ~13 fps. Aqui ficam so `max` luzes, repartidas pelos mesmos quatro grupos (lateral -x, lateral +x, fundo -z, fundo +z) na proporcao
    de cada um, e as que ficam sobem de intensidade (`userData.fator`, raiz da razao, teto 2) para o campo nao escurecer. As lampadas desenhadas nao mudam. Devolve a lista que ficou.
    */
    limitarLuzes: function (luzes) {
        const max = this.cfg().luzes || 14;
        if (!luzes || luzes.length <= max) return luzes;
        const grupos = {};
        luzes.forEach(function (l) { const k = (l.userData && l.userData.tipo || '') + '|' + (l.userData && l.userData.lado || ''); (grupos[k] = grupos[k] || []).push(l); });
        const ficam = [];
        Object.keys(grupos).forEach(function (k) {
            const g = grupos[k], n = Math.max(1, Math.round(g.length * max / luzes.length));
            /*
            A ESCOLHA TEM DE SER SIMETRICA (relato: *"um lado do estadio esta mais iluminado que o outro"*): `floor((i + 0.5) * len / n)` com len 4 e n 2 dava os indices 1 e 3 — as luzes de z -0.25 e +0.75 de uma
            lateral, e, nos cantos, as DUAS do mesmo fundo. Agora os indices vao do primeiro ao ultimo do grupo, a passos iguais (len 4, n 2: 0 e 3; len 3, n 2: 0 e 2), de modo que a luz que fica
            de um lado do campo tem a sua par do outro; com uma so, a do meio.
            */
            // Os CANTOS (um grupo so, os quatro) ficam aos pares na diagonal (indices 0 e 3): um canto sozinho deixava a luz torta.
            const nn = Math.min(g.length, (g[0] && g[0].userData && g[0].userData.tipo === 'canto' && n % 2) ? n + 1 : n);
            const escolhidas = [];
            for (let i = 0; i < nn; i++) escolhidas.push(g[nn === 1 ? Math.floor((g.length - 1) / 2) : Math.round(i * (g.length - 1) / (nn - 1))]);
            /*
            AS LATERAIS QUE FICAM COBREM O CAMPO TODO (relato: *"a iluminacao do meio do estadio menor a noite esta fraca"*). Ficavam as das pontas, apontadas as linhas de fundo:
            medido no HIGH, o meio do campo recebia 61% da luz das areas (1.06 contra 1.73); no LOW ficava uma por lateral fora do meio (z -15). Com menos luzes do que as
            posicoes, cada uma passa a apontar para a sua faixa do campo, repartido por igual (`nn` faixas ao longo de z); com uma so, para o meio. Os fundos continuam nas areas.
            */
            if (g[0] && g[0].userData && g[0].userData.tipo === 'lat' && nn < g.length && typeof CAMPO_COMP === 'number') {
                const L = CAMPO_COMP * 0.85;
                escolhidas.slice().sort(function (x, y) { return x.position.z - y.position.z; }).forEach(function (l, i) {
                    const z = -L / 2 + (i + 0.5) * L / nn;
                    l.target.position.z = z;
                    if (nn === 1) l.position.z = 0;
                });
            }
            for (const l of escolhidas) ficam.push(l);
        });
        const fator = Math.min(2.0, Math.sqrt(luzes.length / ficam.length));
        luzes.forEach(function (l) {
            if (ficam.indexOf(l) >= 0) { l.userData = l.userData || {}; l.userData.fator = fator; }
            else { l.intensity = 0; if (l.parent) l.parent.remove(l); if (l.target && l.target.parent) l.target.parent.remove(l.target); }
        });
        return ficam;
    },

    // As SpotLights de baixo da cobertura (luzesSob): so `sob` ficam, espalhadas pela lista. Cada uma custa fps a noite no tablet.
    limitarSob: function (luzes) {
        const max = { HIGH: 6, MEDIUM: 5, LOW: 3 }[this.nivel] || 6;
        if (!luzes || luzes.length <= max) return luzes;
        const ficam = [];
        for (let i = 0; i < max; i++) ficam.push(luzes[Math.floor((i + 0.5) * luzes.length / max)]);
        luzes.forEach(function (l) {
            if (ficam.indexOf(l) >= 0) return;
            l.intensity = 0; if (l.parent) l.parent.remove(l); if (l.target && l.target.parent) l.target.parent.remove(l.target);
        });
        return ficam;
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
