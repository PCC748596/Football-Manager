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
    Uma faixa (superfície) entre duas curvas paralelas: a de dentro a `dIn` m
    da primeira fila e à altura `yIn`, a de fora a `dOut` e `yOut`. `dupla`: as
    duas faces. Indexada, uma malha só.
    */
    faixa(THREE, a, b, dIn, yIn, dOut, yOut, material, n) {
        const pos = new Float32Array((n + 1) * 2 * 3), ind = [];
        for (let i = 0; i <= n; i++) {
            const t = (i / n) * Math.PI * 2;
            const p = this.ponto(a, b, dIn, t), q = this.ponto(a, b, dOut, t);
            pos.set([p.x, yIn, p.z, q.x, yOut, q.z], i * 6);
            if (i < n) { const k = i * 2; ind.push(k, k + 1, k + 2, k + 1, k + 3, k + 2); }
        }
        const g = new THREE.BufferGeometry();
        g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
        g.setIndex(ind);
        g.computeVertexNormals();
        return new THREE.Mesh(g, material);
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
        const PROF = 1.2, ALT = 0.5;
        const dEnd = rows * PROF;                       // fim do último degrau
        const standY = r => 0.25 + r * ALT;
        const topoY = standY(rows - 1) + 0.25;
        let lugares = 0;

        // ---- degraus e cadeiras ------------------------------------------
        const NS = cfg.setores, aisleW = cfg.larguraCorredor;
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
            const nc = Math.floor(c.L / cfg.espacoCadeira);
            const cur2 = { i: 0 };
            let col = 0;
            for (let k = 0; k < nc; k++) {
                const p = this.emArco(c, (k + 0.5) * c.L / nc, cur2);
                const setor = (p.t / (Math.PI * 2)) * NS;
                // largura do corredor em fracção de setor, ao comprimento desta fila
                if ((setor - Math.floor(setor)) < aisleW / (c.L / NS)) continue;
                if (cortaTunel && Math.sign(p.x) === TJ.lado && Math.abs(p.z) < TJ.largura / 2 + 0.3) continue;
                addSeatInstance(p.x, y + 0.25 + 0.15, p.z, Math.atan2(-p.nx, -p.nz), r, col++);
                lugares++;
            }
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
        const cima = this.faixa(THREE, a0, b0, dIn, yIn + espessura, dOut, yOut + espessura, matCima, N);
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
        if (colGeos.length) {
            const m = new THREE.Mesh(ctx.merge(colGeos), new THREE.MeshStandardMaterial({ color: cfg.corPilar, roughness: 0.8 }));
            m.castShadow = true; m.receiveShadow = false; grupo.add(m);
        }

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
                const luz = new THREE.SpotLight(H.corLuz, 0, H.alcanceLuz * 1.8, H.anguloLuz, H.penumbra, 1.0);
                luz.position.set(q.x, y, q.z);
                luz.target.position.set(q.x * 0.12, 0, q.z * 0.12);
                luz.castShadow = false;
                grupo.add(luz, luz.target);
                luzes.push(luz);
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
