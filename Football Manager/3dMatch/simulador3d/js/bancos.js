/*
=============================================================================
BANCOS DE RESERVAS E ÁREAS TÉCNICAS
=============================================================================
Dois bancos no lado das câmaras (+X), atrás das placas de publicidade: cada um com a cobertura transparente, o assento corrido e os SUBSTITUTOS da
equipa sentados (até 10, os da aba Tactics do manager). À frente, a área técnica a tracejado no relvado e, dentro dela, o treinador de fato e
gravata, que anda devagar ao ritmo do jogo.

As medidas vivem no `BancosDeReservas` (config/physics.js). A placa de publicidade em frente a cada banco é aberta pelo `createField`
(`vaosDasPlacas`, abaixo): `larguraVao` = duas placas.

OS RESERVAS SÃO OS MODELOS DOS JOGADORES (FootballPlayer, com o uniforme da equipa e a aparência do id real dele), sentados: a pose é a do público
(`CrowdModel.poses.sentado`) aplicada ao rig. Nascem em `preencher`, chamado do `createTeams` quando se sabe quem joga; o `build` (createField) só
faz o cenário. Ficam parados — não correm por frame.

O TREINADOR é um FootballPlayer como o árbitro (Officials.criarCorpo), de fato inteiro numa cor de `BancosDeReservas.treinador.fatos` (a camisa
branca e a gravata são caixas coladas ao peito; as mangas e as calças são do mesmo pano do fato). Anda pelo `Officials.mover`, a passo lento, ao
ritmo do jogo: o alvo dele é a posição da bola projectada na área técnica, e o `mover` só arranca com o alvo a 1.5 m — por isso ele dá passos de
quando em quando, em vez de passear sem parar de um lado para o outro.
=============================================================================
*/
const Bancos = {
    _grupo: null,
    _scene: null,
    bancos: [],          // { equipa, zc, reservas: [FootballPlayer], treinador, nome }

    // Onde ficam os centros dos dois bancos (z). A equipa A fica na metade que defende.
    _zDosBancos() {
        const B = BancosDeReservas;
        const dirA = (typeof Lados !== 'undefined' && Lados.dirDe) ? Lados.dirDe('TeamA') : 1;
        return { A: -dirA * B.zBanco, B: dirA * B.zBanco };
    },

    // Troços de z a retirar à placa lateral do lado dos bancos: [[z0, z1], ...] por ordem crescente.
    vaosDasPlacas() {
        const B = (typeof BancosDeReservas !== 'undefined') ? BancosDeReservas : null;
        if (!B || !B.activo) return [];
        const z = this._zDosBancos();
        return [z.A, z.B].map(c => [c - B.larguraVao / 2, c + B.larguraVao / 2]).sort((a, b) => a[0] - b[0]);
    },

    // O comprimento do banco (m): os lugares vezes o passo, e nunca mais que o vão da placa.
    _comprimento(B) { return Math.min(B.lugares * B.passoLugar, B.larguraVao); },

    // A altura do assento sai da pose sentada (o topo das coxas): 0.5 m se não houver o pessoal.
    _alturaDoAssento() {
        let h = 0.5;
        if (typeof Staff !== 'undefined' && typeof CrowdModel !== 'undefined') {
            const g = Staff._geometrias(CrowdModel.poses.sentado);
            if (g.calcao) { g.calcao.computeBoundingBox(); h = g.calcao.boundingBox.max.y; }
        }
        return h;
    },

    // O assento, as costas, a cobertura e as colunas de um banco.
    _estrutura(grupo, zc, B, hAssento) {
        const C = B.cores, L = this._comprimento(B);
        const mat = (cor, extra) => new THREE.MeshStandardMaterial(Object.assign({ color: cor, roughness: 0.7 }, extra || {}));
        const caixa = (w, h, d, x, y, z, m) => {
            const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
            o.position.set(x, y, z); o.castShadow = true; o.receiveShadow = false;
            grupo.add(o); return o;
        };
        const x = B.xBanco;
        // Assento corrido e costas baixas, do lado da bancada.
        caixa(0.5, hAssento, L, x - 0.05, hAssento / 2, zc, mat(C.assento));
        caixa(0.06, 0.55, L, x + 0.30, hAssento + 0.27, zc, mat(C.costas));
        // Cobertura e paredes transparentes (fundo e laterais), com colunas nos cantos.
        const vidro = mat(C.cobertura, { transparent: true, opacity: 0.35, roughness: 0.2, depthWrite: false, side: THREE.DoubleSide });
        caixa(1.7, 0.06, L + 0.4, x - 0.15, 2.25, zc, mat(C.estrutura));
        caixa(0.05, 1.65, L + 0.4, x + 0.62, 1.42, zc, vidro);
        caixa(1.6, 1.65, 0.05, x - 0.1, 1.42, zc - (L + 0.4) / 2, vidro);
        caixa(1.6, 1.65, 0.05, x - 0.1, 1.42, zc + (L + 0.4) / 2, vidro);
        for (const sz of [-1, 1]) for (const sx of [-0.85, 0.62]) {
            caixa(0.06, 2.25, 0.06, x + sx * 0.97 - 0.1, 1.125, zc + sz * (L + 0.4) / 2, mat(C.estrutura));
        }
    },

    // A ÁREA TÉCNICA: o rectângulo a tracejado no relvado, da linha de fora até à frente do banco.
    _area(grupo, zc, B) {
        const A = B.area, y = 0.03;
        const x0 = A.xInterior, x1 = B.xBanco - 1.0;
        const z0 = zc - A.meiaLargura, z1 = zc + A.meiaLargura;
        const passo = A.tracoDash + A.tracoVazio;
        const tracos = [];
        const reta = (ax, az, bx, bz) => {
            const L = Math.hypot(bx - ax, bz - az);
            const n = Math.max(1, Math.round(L / passo));
            const p = L / n, ux = (bx - ax) / L, uz = (bz - az) / L;
            for (let i = 0; i < n; i++) {
                const c = i * p + A.tracoDash / 2;
                tracos.push({ x: ax + ux * c, z: az + uz * c, rot: Math.atan2(ux, uz) });
            }
        };
        reta(x0, z0, x1, z0); reta(x0, z1, x1, z1);   // os dois lados compridos
        reta(x1, z0, x1, z1);                          // a frente do banco
        reta(x0, z0, x0, z1);                          // o lado do campo
        const im = new THREE.InstancedMesh(
            new THREE.BoxGeometry(A.larguraLinha, 0.01, A.tracoDash),
            new THREE.MeshBasicMaterial({ color: B.cores.linha }), tracos.length);
        const d = new THREE.Object3D();
        tracos.forEach((t, i) => {
            d.position.set(t.x, y, t.z); d.rotation.set(0, t.rot, 0); d.updateMatrix();
            im.setMatrixAt(i, d.matrix);
        });
        im.instanceMatrix.needsUpdate = true;
        im.frustumCulled = false;
        grupo.add(im);
    },

    // Escolhe um fato (preto, azul-marinho, castanho ou bege) pelo nome da equipa: o mesmo clube veste sempre o mesmo.
    _fato(nome, B) {
        const lista = B.treinador.fatos;
        let h = 7;
        const s = String(nome || '');
        for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
        return lista[h % lista.length];
    },

    // Mangas e calças compridas: tudo o que é pele nos braços (menos a mão) e nas pernas passa a ser do pano `cor`.
    _vestirPano(feito, cor) {
        const rig = feito.rig, jogador = feito.jogador;
        const pele = (jogador.aparencia && typeof jogador.aparencia.pele === 'number') ? jogador.aparencia.pele : null;
        // As juntas (joelhos, cotovelos) levam um tom de pele ligeiramente mais escuro: vem do primeiro joelho.
        let junta = null;
        rig.lKnee.traverse(o => { if (junta === null && o.isMesh && o.material && !Array.isArray(o.material) && o.material.color && !o.material.map) junta = o.material.color.getHex(); });
        const panoMat = new THREE.MeshStandardMaterial({ color: cor, roughness: 0.85 });
        const daMao = (o) => { for (let q = o; q; q = q.parent) { if (q === rig.lHand || q === rig.rHand) return true; } return false; };
        const vestir = (osso) => {
            osso.traverse((o) => {
                if (!o.isMesh || !o.material || Array.isArray(o.material) || daMao(o)) return;
                const m = o.material;
                const h = (m.color && !m.map) ? m.color.getHex() : null;
                if (h !== null && (h === pele || (junta !== null && h === junta && h !== 0x222222))) o.material = panoMat;
            });
        };
        [rig.lLeg, rig.rLeg, rig.lArm, rig.rArm].forEach(o => o && vestir(o));
    },

    // O treinador: o corpo dos oficiais com o fato vestido (mangas e calças inteiras) + camisa branca e gravata ao peito.
    _treinador(scene, zc, B, id, nomeEquipa) {
        if (typeof Officials === 'undefined' || !Officials.criarCorpo) return null;
        const T = B.treinador, fato = this._fato(nomeEquipa, B);
        const feito = Officials.criarCorpo(id);
        const rig = feito.rig, jogador = feito.jogador;
        this._vestirPano(feito, fato.cor);
        // A camisa e a gravata, coladas ao peito (filhos do `rig.chest`, que roda pela cintura).
        const tronco = rig.chest, prof = 0.75 * 0.5 + 0.02;
        const mk = (w, h, d, cor, y, z) => {
            const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshStandardMaterial({ color: cor, roughness: 0.6 }));
            m.position.set(0, y, z); tronco.add(m); return m;
        };
        mk(0.42, 0.7, 0.03, T.camisa, 1.1, prof);
        mk(0.13, 0.85, 0.04, T.gravata, 0.98, prof + 0.02);
        scene.add(feito.corpo);
        feito.corpo.position.set(T.x, 0, zc);
        feito.corpo.rotation.y = -Math.PI / 2;
        return { model: feito.corpo, rig, animTimer: 0, jogador, fato: fato.nome, zc, alvoZ: zc, relogio: 0 };
    },

    // O cenário (corre no createField): estrutura e área técnica de cada banco.
    build(grupo, scene) {
        const B = (typeof BancosDeReservas !== 'undefined') ? BancosDeReservas : null;
        if (!B || !B.activo || !grupo) return 0;
        this._grupo = grupo;
        this._scene = scene || grupo;
        this.bancos = [];
        const z = this._zDosBancos();
        const hAssento = Math.max(0.12, this._alturaDoAssento() - (B.baixarAssento || 0));
        for (const equipa of ['A', 'B']) {
            const zc = z[equipa];
            this._estrutura(grupo, zc, B, hAssento);
            this._area(grupo, zc, B);
            this.bancos.push({ equipa, zc, reservas: [], staff: [], treinador: null, nome: null });
        }
        return this.bancos.length;
    },

    // A posicao (z, relativa ao centro) do assento `i` do banco: reservas primeiro, depois o staff.
    _zDoLugar(i, B) { return (i - (B.lugares - 1) / 2) * B.passoLugar; },

    // Distancia entre duas cores em Lab (CIE76): o mesmo que o Officials usa para o traje da arbitragem.
    _deltaCor(a, b) {
        if (typeof Officials === 'undefined' || !Officials._corParaLab) return 100;
        const la = Officials._corParaLab(a), lb = Officials._corParaLab(b);
        return Math.hypot(la[0] - lb[0], la[1] - lb[1], la[2] - lb[2]);
    },

    /*
    AS CORES DO STAFF: as do clube (escudo, camisa e calcao do uniforme) que mais se afastam da camisa dos jogadores — o medico veste a primeira,
    o massagista a segunda (ou a mesma, se o clube so tiver uma). Sem nenhuma que sirva (>= 35 de distancia), um azul-escuro ou um cinza claro.
    */
    _coresDoStaff(info, uni, corCamisa) {
        const cand = [];
        const juntar = (c) => { if (c !== undefined && c !== null && c !== '' && c !== 'transparent') cand.push(c); };
        if (info && info.escudo && info.escudo.cores) info.escudo.cores.forEach(juntar);
        if (uni && uni.camisa && uni.camisa.cores) uni.camisa.cores.forEach(juntar);
        if (uni && uni.calcao) juntar(typeof uni.calcao === 'string' ? uni.calcao : (uni.calcao.cores && uni.calcao.cores[0]));
        const ok = [];
        for (const c of cand) {
            let valida = true;
            try { new THREE.Color(c); } catch (e) { valida = false; }
            if (valida && this._deltaCor(c, corCamisa) >= 35 && !ok.some(o => this._deltaCor(o, c) < 12)) ok.push(c);
        }
        if (!ok.length) ok.push(this._deltaCor('#1b2a4a', corCamisa) >= 35 ? '#1b2a4a' : '#d9dde3');
        return ok;
    },

    // Um membro do staff: o corpo dos jogadores com camisa e calca compridas da cor do clube, sentado no banco.
    _staff(B, cor, id, z, funcao) {
        if (typeof Officials === 'undefined' || !Officials.criarCorpo) return null;
        const feito = Officials.criarCorpo(id, cor, cor, true);
        this._vestirPano(feito, new THREE.Color(cor).getHex());
        const pelvisY0 = feito.rig.pelvis.position.y;
        this._sentar({ rig: feito.rig, model: feito.corpo });
        feito.corpo.position.x = B.xBanco - 0.05;
        feito.corpo.position.z = z;
        feito.corpo.rotation.y = -Math.PI / 2;
        this._scene.add(feito.corpo);
        return { model: feito.corpo, rig: feito.rig, jogador: feito.jogador, funcao, cor, pelvisY0, animTimer: 0 };
    },

    // A pose sentada do público aplicada ao rig de um jogador, com a bacia à altura certa e os pés no chão.
    _sentar(p) {
        const S = (typeof CrowdModel !== 'undefined' && CrowdModel.poses) ? CrowdModel.poses.sentado : null;
        const rig = p.rig;
        const anca = S ? S.anca : -1.45, joelho = S ? S.joelho : 1.45, tronco = S ? S.tronco : 0.12;
        const ombro = S ? S.ombro : -0.35, cotovelo = S ? S.cotovelo : -0.85;
        rig.lLeg.rotation.x = anca; rig.rLeg.rotation.x = anca;
        rig.lKnee.rotation.x = joelho; rig.rKnee.rotation.x = joelho;
        rig.chest.rotation.x = tronco;
        rig.lArm.rotation.x = ombro; rig.rArm.rotation.x = ombro;
        rig.lElbow.rotation.x = cotovelo; rig.rElbow.rotation.x = cotovelo;
        if (S && typeof S.alturaBacia === 'number') rig.pelvis.position.y = S.alturaBacia;
        // Pés no chão: mede-se o ponto mais baixo das malhas e desce-se (ou sobe-se) o corpo por esse valor.
        p.model.position.y = 0;
        p.model.updateMatrixWorld(true);
        let minY = Infinity;
        p.model.traverse(o => { if (o.isMesh && o.geometry && o.visible) { const b = new THREE.Box3().setFromObject(o); if (b.min.y < minY) minY = b.min.y; } });
        if (isFinite(minY)) p.model.position.y = -minY;
    },

    _limpar(b) {
        for (const r of b.reservas.concat(b.staff || [])) { if (r.model && r.model.parent) r.model.parent.remove(r.model); }
        b.reservas = [];
        b.staff = [];
    },

    /*
    OS RESERVAS: `infoA` / `infoB` são as equipas do motor (equipaInfoA/B, com `banco` = os substitutos do manager). Sem lista, um banco
    genérico de 10. `uniA` / `uniB` são os uniformes, como os dos titulares.
    */
    preencher(infoA, infoB, uniA, uniB) {
        const B = (typeof BancosDeReservas !== 'undefined') ? BancosDeReservas : null;
        if (!B || !B.activo || !this.bancos.length || typeof FootballPlayer === 'undefined') return 0;
        let n = 0;
        for (const b of this.bancos) {
            this._limpar(b);
            const info = b.equipa === 'A' ? infoA : infoB;
            const uni = b.equipa === 'A' ? uniA : uniB;
            const time = b.equipa === 'A' ? 'TeamA' : 'TeamB';
            const lista = (info && Array.isArray(info.banco))
                ? info.banco.slice(0, B.reservas)
                : Array.from({ length: B.reservas }, () => ({ id: null }));
            const corCamisa = (typeof corDoUniforme === 'function') ? corDoUniforme(uni, B.coresPorOmissao[b.equipa]) : B.coresPorOmissao[b.equipa];
            lista.forEach((j, i) => {
                const p = new FootballPlayer(200 + (b.equipa === 'A' ? 0 : 20) + i, corCamisa, '#ffffff', time, uni, j.id || null);
                // O numero e as costas da camisa (como nos titulares): sem isto o reserva sentado/a aquecer tinha as costas lisas.
                p.updateShirt(j.numero || (12 + i), 'CM');
                this._sentar(p);
                p.model.position.x = B.xBanco - 0.05;
                p.model.position.z = b.zc + this._zDoLugar(i, B);
                p.model.rotation.y = -Math.PI / 2;
                this._scene.add(p.model);
                b.reservas.push(p);
                n++;
            });
            // O MEDICO e o MASSAGISTA: nos ultimos assentos do banco, de camisa e calca compridas numa cor do clube.
            const cores = this._coresDoStaff(info, uni, corCamisa);
            (B.staff || []).forEach((funcao, k) => {
                const feito = this._staff(B, cores[k % cores.length], 93 + (b.equipa === 'A' ? 0 : 2) + k, b.zc + this._zDoLugar(B.reservas + k, B), funcao);
                if (feito) b.staff.push(feito);
            });
            // O treinador: o nome da equipa só decide a cor do fato.
            const nome = info && info.nome ? info.nome : b.equipa;
            if (b.treinador && b.nome !== nome) { if (b.treinador.model.parent) b.treinador.model.parent.remove(b.treinador.model); b.treinador = null; }
            if (!b.treinador) b.treinador = this._treinador(this._scene, b.zc, B, b.equipa === 'A' ? 91 : 92, nome);
            b.nome = nome;
        }
        return n;
    },

    // O treinador anda ao ritmo do jogo: o alvo é a bola projectada na área técnica (reavaliada a cada meio segundo).
    update(dt) {
        const B = (typeof BancosDeReservas !== 'undefined') ? BancosDeReservas : null;
        if (!B || !B.activo || typeof Officials === 'undefined' || !Officials.mover) return;
        const T = B.treinador;
        const bola = (typeof Match !== 'undefined' && Match.ball) ? Match.ball.position : null;
        for (const b of this.bancos) {
            const t = b.treinador;
            if (!t) continue;
            t.relogio += dt;
            if (bola && t.relogio >= 0.5) {
                t.relogio = 0;
                const k = THREE.MathUtils.clamp((bola.z - t.zc) / T.alcanceDaBola, -1, 1);
                t.alvoZ = t.zc + k * T.passeio;
            }
            /*
            OLHA SEMPRE PARA A BOLA, a andar e parado: o ponto para onde olha acompanha a bola com atraso (`olhar`), para o corpo não dar
            piruetas nos passes longos. O `mover` vira o corpo para esse ponto e, com ele a andar de lado, usa o passo lateral.
            */
            if (bola) {
                if (!t.olhar) t.olhar = { x: bola.x, z: bola.z };
                const k = Math.min(1, dt * T.suavizarOlhar);
                t.olhar.x += (bola.x - t.olhar.x) * k;
                t.olhar.z += (bola.z - t.olhar.z) * k;
            }
            Officials.mover(t, T.x, t.alvoZ, T.velocidade, dt, t.olhar || undefined);
            // Parado o `mover` não vira o corpo (ver `paradoNoAlvo`): acompanha a bola à mão.
            if (t.olhar && t.paradoNoAlvo !== false) {
                const alvo = Math.atan2(t.olhar.x - t.model.position.x, t.olhar.z - t.model.position.z);
                const dif = Math.atan2(Math.sin(alvo - t.model.rotation.y), Math.cos(alvo - t.model.rotation.y));
                t.model.rotation.y += dif * Math.min(1, dt * 4.0);
            }
        }
    }
};
if (typeof window !== 'undefined') window.Bancos = Bancos;
