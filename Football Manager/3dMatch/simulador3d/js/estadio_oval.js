/*
=============================================================================
A BACIA OVAL — uma arquibancada de uma só rampa, em elipse
=============================================================================
Pedido (Maracanã): *"ele é oval, não tem parte reta nas arquibancadas; a
arquibancada é direta de baixo até em cima, não tem cobertura no meio"*, 77 000
lugares.

O estádio de sempre é um rectângulo de cantos redondos: quatro rectas e quatro
arcos de raio igual. Uma elipse não se faz com isso, e por isso a bacia oval é
construída aqui, de raiz, por cima do mesmo `createField`: ele continua a dar
as medidas (a primeira fila, os degraus de 1.2 x 0.5 m, a cadeira, o túnel dos
jogadores, a multidão) e este ficheiro põe os degraus, as cadeiras, o muro
traseiro, a cobertura em anel e os holofotes.

GEOMETRIA. A primeira fila é a elipse de semi-eixos (a0, b0) — a0 ao longo de
x (a largura do campo), b0 ao longo de z. A fila `r` é a curva PARALELA a essa
a `r * 1.2` m para fora: P(t) + d * n(t), com n a normal da elipse. Os degraus
são caixas de 1.2 m (radial) por ~3 m (tangencial), rodadas para a normal,
como o `buildCorner` faz nos arcos. As cadeiras ficam a `espacoCadeira` m uma
da outra ao longo da curva, viradas para dentro.

CORREDORES. `setores` corredores radiais, de `larguraCorredor` m: o corredor é
posto no PARÂMETRO t (e não no comprimento de arco), para ficar radial em todas
as filas, e não a curvar com elas.

A COBERTURA é só um anel, no topo: da fila `coberturaDesdeFila` até para lá do
muro (`coberturaSaliencia`), a `coberturaFolga` m acima das cadeiras. Do meio
da rampa para baixo é céu aberto.
=============================================================================
*/
const EstadioOval = {
    /*
    Ponto da curva paralela à elipse (a, b), a `d` m para fora, no parâmetro t.
    A normal exterior da elipse (a cos t, b sin t) é (b cos t, a sin t) / |.|.
    */
    ponto(a, b, d, t) {
        const c = Math.cos(t), s = Math.sin(t);
        const nx = b * c, nz = a * s, l = Math.hypot(nx, nz) || 1;
        return { x: a * c + d * nx / l, z: b * s + d * nz / l, nx: nx / l, nz: nz / l, t };
    },

    /*
    A curva da fila, amostrada densamente: `pts` e o comprimento de arco
    acumulado `cum` (cum[i] = comprimento até pts[i]). `n` é par.
    */
    amostrar(a, b, d, n) {
        const pts = [], cum = [0];
        for (let i = 0; i <= n; i++) {
            const p = this.ponto(a, b, d, (i / n) * Math.PI * 2);
            pts.push(p);
            if (i > 0) cum.push(cum[i - 1] + Math.hypot(p.x - pts[i - 1].x, p.z - pts[i - 1].z));
        }
        return { pts, cum, L: cum[n] };
    },

    // O ponto a `s` m de arco desde t = 0 (varrimento linear; `i` guarda o ponto de partida).
    emArco(c, s, cursor) {
        let i = cursor.i;
        while (i < c.pts.length - 2 && c.cum[i + 1] < s) i++;
        cursor.i = i;
        const u = (s - c.cum[i]) / Math.max(1e-9, c.cum[i + 1] - c.cum[i]);
        const p = c.pts[i], q = c.pts[i + 1];
        return {
            x: p.x + (q.x - p.x) * u, z: p.z + (q.z - p.z) * u,
            nx: p.nx + (q.nx - p.nx) * u, nz: p.nz + (q.nz - p.nz) * u,
            t: p.t + (q.t - p.t) * u
        };
    },

    /*
    As luzes de cor do clube, desenhadas na cobertura: anéis concêntricos de `cA` e
    `cB`, com um anel de traços a meio, como na fotografia de noite. `emissiva`
    escurece o `cB` (é a luz, não a tinta). Textura: u = volta, v = de dentro (0)
    para fora (1).
    */
    texturaDaCobertura(THREE, cA, cB, emissiva) {
        if (typeof document === 'undefined') return null;
        const cv = document.createElement('canvas'); cv.width = 1024; cv.height = 256;
        const g = cv.getContext('2d');
        const hex = (n, k) => '#' + new THREE.Color(n).multiplyScalar(k || 1).getHexString();
        const kD = emissiva ? 1 : 0.55;                      // a tinta (map) é mais escura do que a luz (emissiveMap)
        g.fillStyle = emissiva ? '#000000' : '#ffffff'; g.fillRect(0, 0, 1024, 256);
        const banda = (v0, v1, cor) => { g.fillStyle = cor; g.fillRect(0, v0 * 256, 1024, (v1 - v0) * 256); };
        // Como na fotografia da cobertura iluminada: um anel de dentro branco, cunhas radiais a alternar as duas cores, uma
        // banda lisa a meio e outra volta de cunhas por fora.
        const cunhas = (v0, v1, desloca) => {
            const n = 96, w = 1024 / n;
            for (let k = 0; k < n; k++) { g.fillStyle = hex(((k + desloca) % 2) ? cA : cB, kD); g.fillRect(k * w, v0 * 256, w, (v1 - v0) * 256); }
        };
        banda(0.00, 0.05, emissiva ? '#dfe8f4' : '#ffffff');
        cunhas(0.06, 0.44, 0);
        banda(0.46, 0.54, hex(cA, kD));
        cunhas(0.56, 0.93, 1);
        banda(0.94, 1.00, hex(cB, kD));
        const t = new THREE.CanvasTexture(cv);
        t.wrapS = THREE.RepeatWrapping; t.wrapT = THREE.ClampToEdgeWrapping;
        return t;
    },

    /*
    Uma faixa (superfície) entre duas curvas paralelas: a de dentro a `dIn` m
    da primeira fila e à altura `yIn`, a de fora a `dOut` e `yOut`. `dupla`: as
    duas faces. Indexada, uma malha só.
    */
    faixa(THREE, a, b, dIn, yIn, dOut, yOut, material, n) {
        const pos = new Float32Array((n + 1) * 2 * 3), uv = new Float32Array((n + 1) * 2 * 2), ind = [];
        for (let i = 0; i <= n; i++) {
            const t = (i / n) * Math.PI * 2;
            const p = this.ponto(a, b, dIn, t), q = this.ponto(a, b, dOut, t);
            pos.set([p.x, yIn, p.z, q.x, yOut, q.z], i * 6);
            uv.set([i / n, 0, i / n, 1], i * 4);
            if (i < n) { const k = i * 2; ind.push(k, k + 1, k + 2, k + 1, k + 3, k + 2); }
        }
        const g = new THREE.BufferGeometry();
        g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
        g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
        g.setIndex(ind);
        g.computeVertexNormals();
        return new THREE.Mesh(g, material);
    },

    /*
    A TORRE DE RAMPA (as quatro dos cantos do mapa de setores, E, F, B, C; fotografia da rampa compacta): um volume de
    planta rectangular com os cantos arredondados (um obround), encostado ao estádio, com a rampa lá DENTRO a subir em
    `voltas` voltas. Por fora lê-se uma grade de réguas horizontais (a rampa vê-se entre elas), por cima uma cobertura plana;
    por dentro há um núcleo maciço, e no topo uma passagem curta liga a rampa às colunas do estádio.

    Planta local: u ao longo da parede (tangente), v para fora do estádio; a origem é o centro do volume. A rampa nasce e acaba
    a meio do lado virado ao estádio, de modo que a entrada e a passagem do topo ficam do mesmo lado.
    */
    torreRampa(THREE, a, b, dEnd, t, TR) {
        const hx = TR.meiaComp, hz = TR.meiaLarg, R = TR.raio, W = TR.largura, esp = 0.5;
        const H = TR.altura, voltas = TR.voltas;
        // O obround: pontos em sentido anti-horário, a começar a meio do lado de baixo (v = -hz, virado ao estádio).
        const obround = (ex, ez, rr, passo) => {
            rr = Math.max(0.3, Math.min(rr, ex - 0.1, ez - 0.1));
            const P = [];
            const arco = (cx, cz, a0, a1) => {
                const n = Math.max(3, Math.ceil(Math.abs(a1 - a0) * rr / passo));
                for (let k = 1; k <= n; k++) { const q = a0 + (a1 - a0) * k / n; P.push([cx + rr * Math.cos(q), cz + rr * Math.sin(q)]); }
            };
            const reta = (x0, z0, x1, z1) => {
                const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, z1 - z0) / passo));
                for (let k = 1; k <= n; k++) P.push([x0 + (x1 - x0) * k / n, z0 + (z1 - z0) * k / n]);
            };
            P.push([0, -ez]);
            reta(0, -ez, ex - rr, -ez);
            arco(ex - rr, -(ez - rr), -Math.PI / 2, 0);
            reta(ex, -(ez - rr), ex, ez - rr);
            arco(ex - rr, ez - rr, 0, Math.PI / 2);
            reta(ex - rr, ez, -(ex - rr), ez);
            arco(-(ex - rr), ez - rr, Math.PI / 2, Math.PI);
            reta(-ex, ez - rr, -ex, -(ez - rr));
            arco(-(ex - rr), -(ez - rr), Math.PI, Math.PI * 1.5);
            reta(-(ex - rr), -ez, 0, -ez);
            P.pop();   // o último coincide com o primeiro
            return P;
        };
        const c0 = this.ponto(a, b, dEnd + TR.afastamento, t * Math.PI / 180);
        const tx = -c0.nz, tz = c0.nx;
        const mundo = (u, y, v) => [c0.x + u * tx + v * c0.nx, y, c0.z + u * tz + v * c0.nz];
        const quads = (P, Q, arr, fechar) => {
            const n = P.length;
            for (let i = 0; i < (fechar ? n : n - 1); i++) { const j = (i + 1) % n; arr.push(...P[i], ...Q[i], ...P[j], ...P[j], ...Q[i], ...Q[j]); }
        };
        const geo = (arr) => { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(arr), 3)); g.computeVertexNormals(); return g; };
        const concreto = [], reguas = [], telhado = [], ledPos = [];

        // A linha central da rampa: uma volta de obround, `voltas` vezes, a subir de 0.3 a H.
        const parede = 0.5, ex = hx - W / 2 - parede, ez = hz - W / 2 - parede, rc = R - W / 2 - parede;
        const volta = obround(ex, ez, rc, 1.2);
        const todos = [];
        for (let v = 0; v < voltas; v++) for (const p of volta) todos.push(p);
        todos.push(volta[0]);
        const N = todos.length, M = volta.length;
        const L = [], R_ = [], Lb = [], Rb = [];
        for (let i = 0; i < N; i++) {
            const prev = todos[(i % M === 0 ? i + M - 1 : i - 1) % N] || todos[0], next = todos[Math.min(i + 1, N - 1)];
            let dx = next[0] - prev[0], dz = next[1] - prev[1]; const l = Math.hypot(dx, dz) || 1; dx /= l; dz /= l;
            const lx = -dz, lz = dx;                       // a esquerda do sentido de marcha = para dentro
            const y = 0.3 + (H - 0.3) * i / (N - 1);
            const pi = mundo(todos[i][0] + lx * W / 2, y, todos[i][1] + lz * W / 2), po = mundo(todos[i][0] - lx * W / 2, y, todos[i][1] - lz * W / 2);
            L.push(pi); R_.push(po);
            Lb.push([pi[0], y - 0.55, pi[2]]); Rb.push([po[0], y - 0.55, po[2]]);
        }
        quads(L, R_, concreto, false);       // piso
        quads(Lb, Rb, concreto, false);      // face de baixo
        quads(L, Lb, concreto, false);       // testa de dentro
        quads(R_, Rb, concreto, false);      // testa de fora
        const guarda = L.map(p => [p[0], p[1] + 1.1, p[2]]);
        quads(L, guarda, concreto, false);   // guarda do vazio central

        // O núcleo maciço: o obround interior da rampa, do chão ao topo.
        const yTelhado = H + 3.4;
        const nucleo = obround(Math.max(ex - W / 2 - 0.3, 1), Math.max(ez - W / 2 - 0.3, 1), Math.max(rc - W / 2, 0.6), 1.2);
        quads(nucleo.map(p => mundo(p[0], 0, p[1])), nucleo.map(p => mundo(p[0], yTelhado, p[1])), concreto, true);

        // A grade de réguas à volta: a cada 1.1 m de altura uma régua de 0.4 m; postes de 4 em 4 m.
        const bordo = obround(hx, hz, R, 1.2);
        const naEntrada = (p) => (p[1] < -hz + 0.5 && Math.abs(p[0]) < W / 2 + 0.8);   // o vão da entrada e da passagem do topo
        for (let y = 0.7; y < yTelhado - 0.5; y += 1.1) {
            const trechos = []; let atual = [];
            for (const p of bordo) { if (naEntrada(p)) { if (atual.length) trechos.push(atual); atual = []; } else atual.push(p); }
            if (atual.length) trechos.push(atual);
            for (const tr of trechos) quads(tr.map(p => mundo(p[0], y, p[1])), tr.map(p => mundo(p[0], y + 0.4, p[1])), reguas, false);
        }
        const postes = [];
        for (let i = 0; i < bordo.length; i += 3) {
            const p = bordo[i]; if (naEntrada(p)) continue;
            const q = mundo(p[0], 0, p[1]);
            const g = new THREE.BoxGeometry(0.35, yTelhado, 0.35).toNonIndexed(); g.translate(q[0], yTelhado / 2, q[2]); postes.push(g);
        }

        // A cobertura plana (um pouco maior do que a planta) e a fita de LED no seu bordo.
        const ct = obround(hx + 0.6, hz + 0.6, R + 0.6, 1.2);
        const sup = ct.map(p => mundo(p[0], yTelhado + esp, p[1])), inf = ct.map(p => mundo(p[0], yTelhado, p[1]));
        const centro = mundo(0, yTelhado + esp, 0), centroI = mundo(0, yTelhado, 0);
        for (let i = 0; i < ct.length; i++) { const j = (i + 1) % ct.length; telhado.push(...sup[i], ...sup[j], ...centro, ...inf[j], ...inf[i], ...centroI); }
        quads(inf, sup, telhado, true);
        quads(ct.map(p => mundo(p[0], yTelhado + esp + 0.02, p[1])), ct.map(p => mundo(p[0] * 0.985, yTelhado + esp + 0.02, p[1] * 0.985)), ledPos, true);

        // A passagem do topo até às colunas do estádio.
        const larg = TR.afastamento - hz - 0.9;
        const pass = [];
        if (larg > 0.5) {
            const g = new THREE.BoxGeometry(W, 0.6, larg + 0.4).toNonIndexed();
            const q = mundo(0, 0, -(hz + larg / 2 - 0.2));
            g.rotateY(Math.atan2(c0.nx, c0.nz));
            g.translate(q[0], H - 0.3, q[2]); pass.push(g);
        }
        return { concreto: geo(concreto), reguas: geo(reguas), telhado: geo(telhado), led: geo(ledPos), postes, pass };
    },

    /*
    As alturas da bacia: o topo da última fila, o bordo de fora da cobertura e o
    muro traseiro, que sobe até à face de baixo da cobertura (senão fica uma
    faixa aberta entre o muro e o telhado, por onde se vê o escuro por trás
    das arquibancadas). A cidade usa o mesmo número para a altura da fachada.
    */
    alturas(rows, cfg) {
        const topoY = 0.25 + (rows - 1) * 0.5 + 0.25;
        // A cobertura sobe para o meio: o bordo de fora (o beiral) fica logo acima da última fila e o de dentro `coberturaSubida` m mais alto.
        const yOut = topoY + cfg.coberturaFolga;
        return { topoY, yOut, yIn: yOut + cfg.coberturaSubida, yMuro: yOut };
    },

    /*
    `ctx`: THREE, grupo, a0, b0, rows, TJ, concreteMat, addStepBox,
    addSeatInstance, merge (mergeNonIndexedGeometries), LINHA_FUNDO, cfg (o `oval`
    do perfil). Devolve as medidas que o resto precisa.
    */
    construir(ctx) {
        const { THREE, grupo, a0, b0, rows, TJ, addStepBox, addSeatInstance, cfg } = ctx;
        const CAMPO_COMP_ = (typeof CAMPO_COMP !== 'undefined') ? CAMPO_COMP : 106;
        const LED = ctx.leds || { a: 0xffffff, b: 0x9fb0c8, neutro: true };
        const PROF = 1.2, ALT = 0.5;
        const dEnd = rows * PROF;                       // fim do último degrau
        const standY = r => 0.25 + r * ALT;
        const topoY = standY(rows - 1) + 0.25;
        let lugares = 0;

        // ---- degraus e cadeiras ------------------------------------------
        /*
        AS PASSAGENS DA TORCIDA, como no mapa de setores do ingresso:
          - a CINTURA: `cintura.filas` degraus sem cadeiras, a meio da rampa, a separar o anel de baixo do de cima (a faixa branca do mapa);
          - corredores RADIAIS por anel: poucos e largos em baixo (`setoresInferior`), muitos e estreitos em cima (`setoresSuperior`);
          - os corredores MAIORES, nas fronteiras entre os setores (Norte/Oeste/Sul/Leste, a `anguloLateral` graus do eixo).
        */
        const cin = cfg.cintura;
        const fronteiras = [cfg.anguloLateral, 180 - cfg.anguloLateral, 180 + cfg.anguloLateral, 360 - cfg.anguloLateral];
        for (let r = 0; r < rows; r++) {
            const d = r * PROF;
            const c = this.amostrar(a0, b0, d, 1440);
            const cortaTunel = !!(TJ && r < TJ.degrausCortados);
            // Os degraus: mais curtos onde o túnel os corta, para o vão ficar com a largura dele.
            const passoDeg = cortaTunel ? 1.0 : 3.0;
            const nd = Math.max(8, Math.ceil(c.L / passoDeg));
            const cur = { i: 0 };
            const y = standY(r);
            for (let k = 0; k < nd; k++) {
                const p = this.emArco(c, (k + 0.5) * c.L / nd, cur);
                if (cortaTunel && Math.sign(p.x) === TJ.lado && Math.abs(p.z) < TJ.largura / 2 + 0.1) continue;
                addStepBox(PROF, ALT, (c.L / nd) * 1.05, p.x, y, p.z, -Math.atan2(p.nz, p.nx));
            }
            if (r >= cin.fila && r < cin.fila + cin.filas) continue;   // a cintura: só degrau, sem cadeiras
            const superior = r >= cin.fila + cin.filas;
            const NS = superior ? cfg.setoresSuperior : cfg.setoresInferior;
            const aisleW = superior ? cfg.corredorSuperior : cfg.corredorInferior;
            const metrosPorGrau = c.L / 360, meiaMaior = (cfg.corredorMaior / 2) / metrosPorGrau;
            const nc = Math.floor(c.L / cfg.espacoCadeira);
            const cur2 = { i: 0 };
            let col = 0;
            for (let k = 0; k < nc; k++) {
                const p = this.emArco(c, (k + 0.5) * c.L / nc, cur2);
                const setor = (p.t / (Math.PI * 2)) * NS;
                // largura do corredor em fracção de setor, ao comprimento desta fila
                if ((setor - Math.floor(setor)) < aisleW / (c.L / NS)) continue;
                const graus = p.t * 180 / Math.PI;
                if (fronteiras.some(b => Math.abs(graus - b) < meiaMaior)) continue;
                if (cortaTunel && Math.sign(p.x) === TJ.lado && Math.abs(p.z) < TJ.largura / 2 + 0.3) continue;
                addSeatInstance(p.x, y + 0.25 + 0.15, p.z, Math.atan2(-p.nx, -p.nz), r, col++);
                lugares++;
            }
        }

        // A cintura desenhada: uma faixa clara por cima dos degraus sem cadeiras.
        {
            const dA = (cin.fila - 0.5) * PROF, dB = (cin.fila + cin.filas - 0.5) * PROF;
            const mat = new THREE.MeshStandardMaterial({ color: cfg.corCintura, roughness: 0.9, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
            grupo.add(this.faixa(THREE, a0, b0, dA, standY(cin.fila) + 0.27, dB, standY(cin.fila + cin.filas - 1) + 0.27, mat, 720));
        }

        // ---- o chão: relva escura até à primeira fila (o relvado do campo acaba bem antes) ----
        const forma = new THREE.Shape();
        forma.absellipse(0, 0, a0 - 0.6, b0 - 0.6, 0, Math.PI * 2, false, 0);
        const chao = new THREE.Mesh(new THREE.ShapeGeometry(forma, 96).rotateX(-Math.PI / 2),
            new THREE.MeshStandardMaterial({ color: (typeof RelvaCores !== 'undefined') ? RelvaCores.escura : 0x3f7d33, roughness: 1.0 }));
        chao.position.y = -0.03; chao.receiveShadow = true;
        grupo.add(chao);
        // Por baixo da arquibancada o chão é de betão (as colunas são abertas: vê-se o que está lá dentro).
        const baixo0 = new THREE.Shape();
        baixo0.absellipse(0, 0, a0 + dEnd + 1.0, b0 + dEnd + 1.0, 0, Math.PI * 2, false, 0);
        const furo = new THREE.Path();
        furo.absellipse(0, 0, a0 - 0.6, b0 - 0.6, 0, Math.PI * 2, true, 0);
        baixo0.holes.push(furo);
        const chaoBetao = new THREE.Mesh(new THREE.ShapeGeometry(baixo0, 96).rotateX(-Math.PI / 2),
            new THREE.MeshStandardMaterial({ color: cfg.corChaoSob, roughness: 0.95 }));
        chaoBetao.position.y = 0.02; chaoBetao.receiveShadow = true;
        grupo.add(chaoBetao);

        // ---- a barriga por baixo da rampa --------------------------------
        // Por trás não há muro: o estádio é aberto entre as colunas, e vê-se o fundo da rampa.
        const matBetao = new THREE.MeshStandardMaterial({ color: cfg.corBetao, roughness: 0.9, side: THREE.DoubleSide });
        const N = 720;
        const alt = this.alturas(rows, cfg);
        // O fundo da rampa lê-se do lado de fora como o interior escuro, entre as colunas.
        const matSubrampa = new THREE.MeshStandardMaterial({ color: cfg.corSubrampa, roughness: 0.95, side: THREE.DoubleSide });
        const barriga = this.faixa(THREE, a0, b0, -0.6, 0.0, dEnd + 0.6, standY(rows - 1) - 0.25, matSubrampa, N);
        barriga.castShadow = true; barriga.receiveShadow = false;
        grupo.add(barriga);
        // O parapeito do topo, por dentro: fecha a rampa.
        grupo.add(this.faixa(THREE, a0, b0, dEnd - 0.1, topoY, dEnd + 0.6, topoY + 1.2, matBetao, N));

        // ---- a cobertura: um anel largo que sobe para o meio -------------
        const r0 = cfg.coberturaDesdeFila, sal = cfg.coberturaSaliencia;
        const dIn = r0 * PROF, dOut = dEnd + sal;
        const yIn = alt.yIn, yOut = alt.yOut;
        const espessura = cfg.coberturaEspessura;
        const matCima = new THREE.MeshStandardMaterial({ color: cfg.corCobertura, roughness: 0.85, side: THREE.DoubleSide });
        const matBaixo = new THREE.MeshStandardMaterial({ color: cfg.corCoberturaBaixo, roughness: 0.95, side: THREE.DoubleSide });
        // Por cima: branca de dia; de noite acendem-se os anéis da cor do clube (`ledsEstadio.definir`).
        const matTopo = new THREE.MeshStandardMaterial({ color: cfg.corCobertura, roughness: 0.85, side: THREE.DoubleSide, emissive: 0xffffff, emissiveIntensity: 0 });
        const texCor = this.texturaDaCobertura(THREE, LED.a, LED.b, false), texLuz = this.texturaDaCobertura(THREE, LED.a, LED.b, true);
        if (texLuz) matTopo.emissiveMap = texLuz;
        const cima = this.faixa(THREE, a0, b0, dIn, yIn + espessura, dOut, yOut + espessura, matTopo, N);
        const baixo = this.faixa(THREE, a0, b0, dIn, yIn, dOut, yOut, matBaixo, N);
        cima.castShadow = true; cima.receiveShadow = false; baixo.castShadow = false; baixo.receiveShadow = false;
        grupo.add(cima, baixo);
        // As testas do anel: a de dentro fina; a de fora é a cornija alta e branca, com as nervuras da fotografia.
        grupo.add(this.faixa(THREE, a0, b0, dIn, yIn, dIn, yIn + espessura + 0.6, matCima, N));
        grupo.add(this.faixa(THREE, a0, b0, dOut, yOut - cfg.cornija, dOut, yOut + espessura, matCima, N));

        // Nervuras radiais por cima, e as colunas em volta.
        const nervGeos = [], colGeos = [];
        const nN = cfg.nervuras;
        for (let k = 0; k < nN; k++) {
            const t = (k / nN) * Math.PI * 2;
            const p = this.ponto(a0, b0, dIn, t), q = this.ponto(a0, b0, dOut, t);
            const len = Math.hypot(q.x - p.x, q.z - p.z), dy = yOut - yIn;
            const L3 = Math.hypot(len, dy);
            const g = new THREE.BoxGeometry(L3, 0.12, 0.18).toNonIndexed();
            g.rotateZ(Math.atan2(dy, len));
            g.rotateY(-Math.atan2(q.z - p.z, q.x - p.x));
            g.translate((p.x + q.x) / 2, (yIn + yOut) / 2 + espessura + 0.1, (p.z + q.z) / 2);
            nervGeos.push(g);
        }
        /*
        AS COLUNAS: uma volta de colunas brancas à altura do beiral, com a viga
        que as une (o anel branco da fotografia) ao nível da última fila. Entre
        elas é aberto.
        */
        const nC = cfg.colunas;
        for (let k = 0; k < nC; k++) {
            const t = ((k + 0.5) / nC) * Math.PI * 2;
            const q = this.ponto(a0, b0, dEnd + 0.9, t);
            const h = yOut - cfg.cornija;
            const g = new THREE.BoxGeometry(cfg.colunaRadial, h, cfg.colunaTangencial).toNonIndexed();
            g.rotateY(-Math.atan2(q.nz, q.nx));
            g.translate(q.x, h / 2, q.z);
            colGeos.push(g);
        }
        grupo.add(this.faixa(THREE, a0, b0, dEnd + 0.9, topoY - 1.4, dEnd + 0.9, topoY + 1.0, matCima, N));
        if (nervGeos.length) {
            const m = new THREE.Mesh(ctx.merge(nervGeos), new THREE.MeshStandardMaterial({ color: cfg.corNervura, roughness: 0.7 }));
            m.castShadow = false; m.receiveShadow = false; grupo.add(m);
        }
        const matColunas = new THREE.MeshStandardMaterial({ color: cfg.corPilar, roughness: 0.8, emissive: LED.a, emissiveIntensity: 0 });
        if (colGeos.length) {
            const m = new THREE.Mesh(ctx.merge(colGeos), matColunas);
            m.castShadow = true; m.receiveShadow = false; grupo.add(m);
        }

        // ---- as luzes de cor em volta: no beiral da cobertura e no chão, a iluminar as colunas ----
        const ledMats = [];
        const caixasLed = (n, d, y, dims, cor, deslocar) => {
            const mat = new THREE.MeshStandardMaterial({ color: cor, emissive: cor, emissiveIntensity: 0.1, roughness: 0.5 });
            const im = new THREE.InstancedMesh(new THREE.BoxGeometry(...dims), mat, n);
            const dm = new THREE.Object3D();
            for (let k = 0; k < n; k++) {
                const t = ((k * 2 + deslocar) / (n * 2)) * Math.PI * 2;
                const q = this.ponto(a0, b0, d, t);
                dm.position.set(q.x, y, q.z);
                dm.rotation.set(0, -Math.atan2(q.nz, q.nx), 0);
                dm.updateMatrix(); im.setMatrixAt(k, dm.matrix);
            }
            im.castShadow = false; im.receiveShadow = false;
            grupo.add(im); ledMats.push(mat);
        };
        // ---- as quatro torres de rampa nos cantos (E, F, B, C do mapa de setores) ----
        if (cfg.torresRampa) {
            const TR = cfg.torresRampa;
            const matLedRampa = new THREE.MeshStandardMaterial({ color: LED.a, emissive: LED.a, emissiveIntensity: 0.1, roughness: 0.5, side: THREE.DoubleSide });
            ledMats.push(matLedRampa);
            const matC = new THREE.MeshStandardMaterial({ color: TR.corRampa, roughness: 0.9, side: THREE.DoubleSide });
            const matR = new THREE.MeshStandardMaterial({ color: TR.corReguas, roughness: 0.85, side: THREE.DoubleSide });
            const matT = new THREE.MeshStandardMaterial({ color: TR.corTelhado, roughness: 0.9, side: THREE.DoubleSide });
            const adicionar = (g, m, sombra) => { const o = new THREE.Mesh(g, m); o.castShadow = !!sombra; o.receiveShadow = false; grupo.add(o); };
            for (const ang of TR.angulos) {
                const r = this.torreRampa(THREE, a0, b0, dEnd, ang, TR);
                adicionar(r.concreto, matC, true); adicionar(r.reguas, matR, true); adicionar(r.telhado, matT, true); adicionar(r.led, matLedRampa, false);
                if (r.postes.length) adicionar(ctx.merge(r.postes), matR, true);
                if (r.pass.length) adicionar(ctx.merge(r.pass), matC, true);
            }
        }

        const nL = cfg.ledsBeiral, nS = cfg.ledsChao;
        caixasLed(nL, dOut + 0.15, yOut - cfg.cornija / 2, [0.25, 0.5, 1.1], LED.a, 0);
        caixasLed(nL, dOut + 0.15, yOut - cfg.cornija / 2, [0.25, 0.5, 1.1], LED.b, 1);
        caixasLed(nS, dEnd + 4.0, 0.3, [0.5, 0.5, 1.4], LED.a, 0);
        caixasLed(nS, dEnd + 4.0, 0.3, [0.5, 0.5, 1.4], LED.b, 1);
        /*
        SPOTS DE COR, de verdade (SpotLight): os da cor do clube. Uma volta no chão a apontar
        para cima, às colunas e ao beiral, e outra no beiral da cobertura a apontar para a praça.
        Alternam `a` e `b`; se `b` for preto (Flamengo) não ilumina nada, e então usa-se um
        branco quente. Só acendem à noite: apagadas ficam invisíveis, para não pesarem no desenho.
        */
        const brilho = (c) => { const k = new THREE.Color(c); return k.r + k.g + k.b; };
        const corB = brilho(LED.b) < 0.3 ? 0xffd9a0 : LED.b;
        const spots = [];
        const aparelhos = [];   // as caixas dos spots (para não ficarem a flutuar): [x, y, z, rotY, lado]
        const nSp = cfg.spotsCor;
        for (let k = 0; k < nSp * 2; k++) {
            const cor = (k % 2) ? corB : LED.a;
            const t = ((k + 0.5) / (nSp * 2)) * Math.PI * 2;
            // chão
            const p = this.ponto(a0, b0, dEnd + 3.5, t), alvo = this.ponto(a0, b0, dEnd + 0.9, t);
            const sp = new THREE.SpotLight(cor, 0, cfg.spotsAlcance, 0.3, 0.6, 1.0);
            sp.position.set(p.x, 0.5, p.z);
            aparelhos.push([p.x, 0.25, p.z, -Math.atan2(p.nz, p.nx), 0.9]);
            sp.target.position.set(alvo.x, yOut + 0.5, alvo.z);
            sp.castShadow = false; sp.visible = false;
            grupo.add(sp, sp.target); spots.push(sp);
            // beiral
            // Do beiral, a descer a coluna e a parede (e não para a praça): a parede e as colunas ficam banhadas de cima para baixo.
            const r = this.ponto(a0, b0, dOut + 0.4, t + Math.PI / (nSp * 2)), alvo2 = this.ponto(a0, b0, dEnd + 0.9, t + Math.PI / (nSp * 2));
            const sp2 = new THREE.SpotLight((k % 2) ? LED.a : corB, 0, cfg.spotsAlcance, 0.28, 0.6, 1.0);
            sp2.position.set(r.x, yOut - 0.6, r.z);
            aparelhos.push([r.x, yOut - 0.9, r.z, -Math.atan2(r.nz, r.nx), 0.7]);
            sp2.target.position.set(alvo2.x, 1.0, alvo2.z);
            sp2.castShadow = false; sp2.visible = false;
            grupo.add(sp2, sp2.target); spots.push(sp2);
        }
        // Spots NA PRÓPRIA COBERTURA: montados no bordo de fora do telhado (com a sua caixa), a varrer a superfície para dentro.
        const nTopo = cfg.spotsTopo, dMeio = (dIn + dOut) / 2, yMeio = (yIn + yOut) / 2 + espessura;
        for (let k = 0; k < nTopo; k++) {
            const t = ((k + 0.5) / nTopo) * Math.PI * 2;
            const p = this.ponto(a0, b0, dOut - 1.5, t), alvo = this.ponto(a0, b0, dMeio, t);
            const yP = yOut + espessura - (1.5 / (dOut - dIn)) * (yOut - yIn);   // a superfície do telhado neste ponto
            const sp = new THREE.SpotLight((k % 2) ? corB : LED.a, 0, cfg.spotsAlcance * 2, 0.4, 0.9, 1.0);
            sp.position.set(p.x, yP + 0.6, p.z);
            sp.target.position.set(alvo.x, yMeio - 0.2, alvo.z);
            sp.castShadow = false; sp.visible = false;
            aparelhos.push([p.x, yP + 0.3, p.z, -Math.atan2(p.nz, p.nx), 1.0]);
            grupo.add(sp, sp.target); spots.push(sp);
        }
        {
            const im = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 0.6, 1), new THREE.MeshStandardMaterial({ color: 0x2c3036, roughness: 0.6, metalness: 0.4 }), aparelhos.length);
            const dm = new THREE.Object3D();
            aparelhos.forEach((ap, i) => { dm.position.set(ap[0], ap[1], ap[2]); dm.rotation.set(0, ap[3], 0); dm.scale.set(ap[4], 1, ap[4]); dm.updateMatrix(); im.setMatrixAt(i, dm.matrix); });
            im.castShadow = false; im.receiveShadow = false;
            grupo.add(im);
        }

        /*
        O FEIXE DE CADA SPOT, visível: dois cones concêntricos, aditivos e transparentes, do spot até onde ele aponta
        (uma SpotLight só ilumina as superfícies que apanha, não se vê no ar). É o que faz o "efeito de spot" ler-se de longe.
        */
        const feixes = new THREE.Group();
        feixes.visible = false;
        const eixoY = new THREE.Vector3(0, 1, 0), dirV = new THREE.Vector3();
        for (const sp of spots) {
            const P = sp.position, T = sp.target.position;
            dirV.subVectors(P, T);
            const L = dirV.length();
            const rBase = L * Math.tan(sp.angle) * 0.28;
            for (const [k, op] of [[1.0, 0.07], [0.55, 0.09]]) {
                const g = new THREE.ConeGeometry(rBase * k, L, 20, 1, true);
                const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({
                    color: sp.color, transparent: true, opacity: op, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide
                }));
                m.position.set((P.x + T.x) / 2, (P.y + T.y) / 2, (P.z + T.z) / 2);
                m.quaternion.setFromUnitVectors(eixoY, dirV.clone().normalize());
                m.renderOrder = 5; m.frustumCulled = false;
                feixes.add(m);
            }
        }
        grupo.add(feixes);

        /*
        A ILUMINAÇÃO POR BAIXO DA COBERTURA, para iluminar os torcedores: três voltas de painéis luminosos na face de baixo
        (as luminárias que se vêem) e `luzesSob` SpotLights brancas quentes, penduradas a meio da cobertura e viradas para as
        cadeiras de baixo, para dentro do estádio. Só à noite.
        */
        const matPainel = new THREE.MeshStandardMaterial({ color: 0x555555, roughness: 0.5, emissive: 0xfff1d0, emissiveIntensity: 0 });
        const yBaixoEm = (d) => yIn + (yOut - yIn) * (d - dIn) / (dOut - dIn);
        {
            const nPn = cfg.paineisSob, pos = [];
            for (const fr of [0.3, 0.55, 0.8]) {
                const d = dIn + (dOut - dIn) * fr;
                for (let k = 0; k < nPn; k++) {
                    const q = this.ponto(a0, b0, d, ((k + 0.5) / nPn) * Math.PI * 2);
                    pos.push([q.x, yBaixoEm(d) - 0.08, q.z, -Math.atan2(q.nz, q.nx)]);
                }
            }
            const im = new THREE.InstancedMesh(new THREE.BoxGeometry(2.2, 0.1, 0.6), matPainel, pos.length);
            const dm = new THREE.Object3D();
            pos.forEach((p, i) => { dm.position.set(p[0], p[1], p[2]); dm.rotation.set(0, p[3], 0); dm.updateMatrix(); im.setMatrixAt(i, dm.matrix); });
            im.castShadow = false; im.receiveShadow = false;
            grupo.add(im);
        }
        const luzesSob = [];
        for (let k = 0; k < cfg.luzesSob; k++) {
            const t = ((k + 0.5) / cfg.luzesSob) * Math.PI * 2;
            const dL = dIn + (dOut - dIn) * 0.6, dA = dL - 9;
            const p = this.ponto(a0, b0, dL, t), alvo = this.ponto(a0, b0, dA, t);
            const sp = new THREE.SpotLight(0xfff1d0, 0, cfg.luzesSobAlcance, 0.75, 0.8, 1.0);
            sp.position.set(p.x, yBaixoEm(dL) - 0.4, p.z);
            sp.target.position.set(alvo.x, 0.25 + (dA / PROF) * 0.5 + 0.6, alvo.z);
            sp.castShadow = false; sp.visible = false;
            grupo.add(sp, sp.target); luzesSob.push(sp);
        }
        window.ledsEstadio = {
            spots, feixes,   // expostos para diagnóstico
            // De noite as luzes do clube brilham a sério; de dia ficam acesas mas mais suaves, para se verem no jogo normal.
            definir(acesas) {
                matTopo.emissiveIntensity = acesas ? 0.95 : 0.3;
                matTopo.map = acesas ? texCor : null; matTopo.needsUpdate = true;
                matColunas.emissiveIntensity = acesas ? 0.45 : 0.15;
                for (const m of ledMats) m.emissiveIntensity = acesas ? 0.9 : 0.6;
                for (const sp of spots) { sp.visible = !!acesas; sp.intensity = acesas ? cfg.spotsIntensidade : 0; }
                feixes.visible = !!acesas;
                matPainel.emissiveIntensity = acesas ? 1.6 : 0;
                for (const sp of luzesSob) { sp.visible = !!acesas; sp.intensity = acesas ? cfg.luzesSobIntensidade : 0; }
            }
        };
        window.ledsEstadio.definir(!!window.jogoNoturno);

        // ---- holofotes no bordo de fora da cobertura ---------------------
        if (typeof Holofotes !== 'undefined' && Holofotes.activo) {
            const H = Holofotes, luzes = [], pos = [], travGeos = [];
            const nH = cfg.torresHolofotes;
            for (let k = 0; k < nH; k++) {
                const t = ((k + 0.5) / nH) * Math.PI * 2;
                const q = this.ponto(a0, b0, dIn + 0.8, t);
                const y = yIn + espessura + 1.4;
                const tang = [-q.nz, q.nx];
                const larg = H.lampadasPorFileira * H.espacoEntreLampadas;
                const g = new THREE.BoxGeometry(H.travessaEspessura, H.travessaEspessura, larg).toNonIndexed();
                g.rotateY(-Math.atan2(tang[1], tang[0]) + Math.PI / 2);
                g.translate(q.x, y - H.lampadaAlt / 2 - H.travessaEspessura / 2, q.z);
                travGeos.push(g);
                for (let i = 0; i < H.lampadasPorFileira; i++) {
                    const o = (i - (H.lampadasPorFileira - 1) / 2) * H.espacoEntreLampadas;
                    pos.push([q.x + tang[0] * o, y, q.z + tang[1] * o]);
                }
            }
            /*
            A ILUMINAÇÃO DO CAMPO é a do estádio padrão, igual: as mesmas 14 SpotLights, nas
            mesmas posições em relação ao relvado e com os mesmos alvos, ângulo, penumbra,
            alcance e intensidade (config Holofotes). As lâmpadas desenhadas na ponta da
            cobertura são só o aparelho; quem ilumina é este conjunto, e por isso o campo
            fica exatamente como no padrão (uma luz a 100 m do campo, e não a 58, daria outra imagem).
            Referência (createField, match_setup.js): laterais a x = ±(BANCADA_X + 19) e 26 m de altura (dois aneis: 11 + 24 - 16 de profundidade, 13 + 13 de altura),
            `fileiras` conjuntos espalhados ao longo de z; fundos a z = ±(BANCADA_Z + 19), em x -18, 0, 18.
            */
            const yLuzPadrao = 26.0, xLat = 46 + 19, zFundo = (CAMPO_COMP_ / 2 + 12) + 19, cantoZ = (CAMPO_COMP_ / 2 + 12) - 6.5, fundoJogo = CAMPO_COMP_ / 2;
            const novaLuz = (x, z, alvo, angulo) => {
                const luz = new THREE.SpotLight(H.corLuz, 0, H.alcanceLuz, angulo, H.penumbra, 1.0);
                luz.position.set(x, yLuzPadrao, z);
                luz.target.position.set(alvo[0], alvo[1], alvo[2]);
                luz.castShadow = false;
                grupo.add(luz, luz.target);
                luzes.push(luz);
            };
            for (const sinal of [-1, 1]) for (let f = 0; f < H.fileiras; f++) {
                const frac = (f + 0.5) / H.fileiras, z = (frac * 2 - 1) * cantoZ;
                const ponta = (f === 0 || f === H.fileiras - 1);
                novaLuz(sinal * xLat, z, ponta ? [0, 1.0, Math.sign(z) * fundoJogo] : [0, 0, z * 0.4], H.anguloLuz);
            }
            for (const sinalZ of [-1, 1]) for (const xo of [-18, 0, 18]) {
                novaLuz(xo, sinalZ * zFundo, [xo * 0.3, 1.2, sinalZ * fundoJogo], 0.85);
            }
            const matEstrut = new THREE.MeshStandardMaterial({ color: H.corEstrutura, roughness: 0.8, metalness: 0.3 });
            const matLampada = new THREE.MeshStandardMaterial({
                color: H.corLampadaApagada, roughness: 0.4, metalness: 0.2, emissive: new THREE.Color(0x000000)
            });
            if (travGeos.length) {
                const m = new THREE.Mesh(ctx.merge(travGeos), matEstrut);
                m.castShadow = false; m.receiveShadow = false; grupo.add(m);
            }
            const imL = new THREE.InstancedMesh(new THREE.BoxGeometry(H.lampadaLarg, H.lampadaAlt, H.lampadaProf), matLampada, pos.length);
            const dL = new THREE.Object3D();
            pos.forEach((pp, i) => { dL.position.set(pp[0], pp[1], pp[2]); dL.updateMatrix(); imL.setMatrixAt(i, dL.matrix); });
            imL.castShadow = false; imL.receiveShadow = false;
            grupo.add(imL);
            window.holofotes = { luzes, matLampada, lampadas: imL };
        }

        return { dEnd, topoY, lugares, cobertura: { dIn, dOut, yIn, yOut } };
    }
};
if (typeof window !== 'undefined') window.EstadioOval = EstadioOval;
