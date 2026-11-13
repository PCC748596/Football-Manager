/*
=============================================================================
MultiBola — os cones com as bolas de reserva e a busca da bola nas reposicoes
=============================================================================
Spec: docs/superpowers/specs/2026-11-12-multibola-design.md; config: MultiBolaModel (js/config/multibola.js).
Lateral primeiro; o tiro de meta e o canto reaproveitam a mesma busca.
=============================================================================
*/
const MultiBola = {
    cones: [],          // [{ x, z, temBola, grupo }]
    busca: null,        // a busca em curso (ver comecarLateral)

    /** As posicoes dos 15 cones (puras: so da config). */
    posicoesDosCones() {
        const M = MultiBolaModel;
        const meiaL = CAMPO_LARG / 2, meiaC = CAMPO_COMP / 2;
        const ladoBancos = Math.sign((typeof TunelJogadores !== 'undefined' && TunelJogadores.lado) || -1) || -1;
        const out = [];
        for (const z of M.zLateralOposta) out.push({ x: -ladoBancos * (meiaL + M.foraDaLinha), z });
        for (const z of M.zLateralBancos) out.push({ x: ladoBancos * (meiaL + M.foraDaLinha), z });
        for (const s of [-1, 1]) for (const x of M.xAtrasDaBaliza) out.push({ x, z: s * (meiaC + M.foraDaLinha) });
        return out;
    },

    /** Cria os cones (e, com `scene`, o desenho deles). Chamar uma vez por jogo. */
    iniciar(scene) {
        for (const c of this.cones) if (c.grupo && c.grupo.parent) c.grupo.parent.remove(c.grupo);
        this.cones = this.posicoesDosCones().map(p => ({ x: p.x, z: p.z, temBola: true, grupo: null, bola: null }));
        this.busca = null;
        if (!scene || typeof THREE === 'undefined') return;
        const C = MultiBolaModel.cone;
        const matCone = new THREE.MeshStandardMaterial({ color: C.cor, roughness: 0.6 });
        // Cone cortado: um tronco de cone com a fraccao `corte` da altura; o aro de cima fica com o raio do cone a essa altura.
        const corte = (typeof C.corte === 'number') ? C.corte : 1;
        const hTronco = C.altura * corte, raioTopo = C.raio * (1 - corte);
        const geoCone = new THREE.CylinderGeometry(raioTopo, C.raio, hTronco, 16);
        const raio = (typeof BallPhysics !== 'undefined' && BallPhysics.raio) || 0.11;
        for (const c of this.cones) {
            const g = new THREE.Group();
            const cone = new THREE.Mesh(geoCone, matCone);
            cone.position.y = hTronco / 2;
            g.add(cone);
            // A bola de reserva: uma copia do desenho da bola de jogo, se houver; senao uma esfera branca.
            let bola = null;
            if (typeof Match !== 'undefined' && Match.ballVisual && Match.ballVisual.clone) bola = Match.ballVisual.clone(true);
            else bola = new THREE.Mesh(new THREE.SphereGeometry(raio, 16, 12), new THREE.MeshStandardMaterial({ color: 0xffffff }));
            // Pousada no aro de cima: o centro fica a sqrt(r^2 - aro^2) acima dele (sem aro, encostada a ponta como antes).
            const acimaDoAro = raioTopo < raio ? Math.sqrt(raio * raio - raioTopo * raioTopo) : 0;
            bola.position.set(0, hTronco + acimaDoAro, 0);
            g.add(bola);
            g.position.set(c.x, 0, c.z);
            scene.add(g);
            c.grupo = g; c.bola = bola;
        }
    },

    /** O indice do cone COM BOLA mais proximo de (x, z); -1 se nao ha nenhum. */
    coneMaisProximo(x, z) {
        let melhor = -1, d = Infinity;
        const lista = this.cones.length ? this.cones : this.posicoesDosCones().map(p => Object.assign({ temBola: true }, p));
        lista.forEach((c, i) => {
            if (!c.temBola) return;
            const di = Math.hypot(c.x - x, c.z - z);
            if (di < d) { d = di; melhor = i; }
        });
        return melhor;
    },

    _mostrarBolaDoCone(i, sim) {
        const c = this.cones[i];
        if (!c) return;
        c.temBola = sim;
        if (c.bola) c.bola.visible = sim;
    },

    _mostrarBolaDeJogo(sim) {
        if (typeof Match !== 'undefined' && Match.ball) Match.ball.visible = sim;
    },

    activo() { return typeof MultiBolaModel !== 'undefined' && MultiBolaModel.activo && this.cones.length > 0; },
    /** Ha uma busca a correr (o lance espera por ela: o prazo e o arremesso nao contam). */
    emBusca() { return !!this.busca; },
    /** A bola de jogo ainda esta solta la fora (a fisica corre). */
    bolaSolta() { return !!(this.busca && this.busca.fase === 'saida'); },

    /** A velocidade do cobrador pelo placar: a perder corre, a ganhar anda, empatado trota. */
    velocidadeDe(p) {
        const M = MultiBolaModel;
        if (typeof Match === 'undefined' || !p) return M.velTrote;
        const meu = p.team === 'TeamA' ? (Match.placarA || 0) : (Match.placarB || 0);
        const deles = p.team === 'TeamA' ? (Match.placarB || 0) : (Match.placarA || 0);
        return meu < deles ? M.velCorrida : meu > deles ? M.velAndar : M.velTrote;
    },

    /*
    O LATERAL COM MULTIBOLA (chamado do setupSetPiece('THROW_IN')). `ponto`: onde a bola saiu, na linha; `pontoCobranca`: onde o cobrador fica, atras da linha.
    A bola segue a fisica (fase 'saida') ate bater na placa/barreira, parar ou passarem `tetoSaida` s; se voltar ao campo, e ela que se usa.
    */
    comecarLateral(taker, ponto, pontoCobranca, equipaQueRepoe) {
        this.busca = { tipo: 'lateral', fase: 'saida', t: 0, taker, ponto, pontoCobranca, equipa: equipaQueRepoe, fonte: null, cone: -1 };
        if (typeof Match !== 'undefined') Match.bolaBateuNaLateral = false;
        if (taker) { taker.velocity.set(0, 0, 0); taker.hasBall = false; }
    },

    _listaDe(equipa) { return equipa === 'TeamA' ? Match.players : Match.opponents; },
    _emCampo(p) { return !!(p && p.model && !p.expulso && !p.queda && !p.subSaindo && this._listaDe(p.team).indexOf(p) >= 0); },

    _ir(alvo) {
        const b = this.busca, p = b.taker;
        b.fase = 'ir';
        p.fsm.changeState('SET_PIECE_WAIT');
        p.lugarBolaParada = { x: alvo.x, z: alvo.z, t: 0, vel: this.velocidadeDe(p), multibola: true };
    },

    _escolherFonteDoCone() {
        const b = this.busca;
        const i = this.coneMaisProximo(b.ponto.x, b.ponto.z);
        b.cone = i;
        const c = this.cones[i];
        // A bola de jogo some e fica (escondida) no ponto da cobranca: quem a segue com os olhos ou se afasta dela usa esse ponto.
        this._mostrarBolaDeJogo(false);
        Match.ball.position.set(b.ponto.x, BallPhysics.raio, b.ponto.z);
        Match.ballVel.set(0, 0, 0);
        b.fonte = c ? { tipo: 'cone', x: c.x, z: c.z } : { tipo: 'bola', x: b.ponto.x, z: b.ponto.z };
    },

    /*
    ABAIXAR PARA PEGAR NA BOLA. Corre depois do animateBones do frame (o Match.update chama isto depois dos jogadores), por cima da pose de espera: coxas a frente,
    joelhos dobrados, tronco inclinado e o corpo mais baixo. `k` de 0 (de pe) a 1 (agachado). Convencao do esqueleto em GoalkeeperPose (config/goalkeeper.js).
    */
    _poseAgachado(p, k) {
        if (!p || !p.model) return;
        const base = (typeof ALTURA_BASE_Y === 'number') ? ALTURA_BASE_Y : 0;
        p.model.position.y = base - 0.30 * k;
        const r = p.rig;
        if (!r || k <= 0) return;
        if (r.lLeg) r.lLeg.rotation.x = -1.0 * k;
        if (r.rLeg) r.rLeg.rotation.x = -1.0 * k;
        if (r.lKnee) r.lKnee.rotation.x = 1.6 * k;
        if (r.rKnee) r.rKnee.rotation.x = 1.6 * k;
        if (r.chest) r.chest.rotation.x = 0.7 * k;
        if (r.lArm) r.lArm.rotation.x = -0.9 * k;
        if (r.rArm) r.rArm.rotation.x = -0.9 * k;
    },

    /** A bola (la fora, acabada de bater) vem com forca para voltar a entrar no campo? Pela distancia de travagem do rolamento. */
    _voltaAoCampo() {
        const bp = Match.ball.position, bv = Match.ballVel;
        const B = BallPhysics;
        const desac = Math.max(0.1, (B.atritoRolamento || 0.1) * B.gravidade);
        const alcance = (v) => (v * v) / (2 * desac);
        const foraX = Math.abs(bp.x) - CAMPO_LARG / 2, foraZ = Math.abs(bp.z) - CAMPO_COMP / 2;
        const vxDentro = -Math.sign(bp.x) * bv.x, vzDentro = -Math.sign(bp.z) * bv.z;
        if (foraX > 0) return vxDentro > 0 && alcance(vxDentro) > foraX + 0.5;
        if (foraZ > 0) return vzDentro > 0 && alcance(vzDentro) > foraZ + 0.5;
        return false;
    },

    /** Um frame da busca (chamado do Match.update, antes do updateBall). */
    update(dt) {
        if (typeof Match === 'undefined') return;
        // O cone usado volta a ter bola quando a cobranca e feita (o lance deixa de ser THROW_IN).
        if (this._conePorRepor !== undefined && this._conePorRepor !== null && Match.state !== 'THROW_IN') {
            this._mostrarBolaDoCone(this._conePorRepor, true);
            this._conePorRepor = null;
        }
        const b = this.busca;
        if (!b) return;
        if (Match.state !== 'THROW_IN') { this.cancelar(); return; }
        const M = MultiBolaModel;
        b.t += dt;

        // O cobrador saiu (expulso, substituido, lesionado): outro da ordem assume e recomeca.
        if (!this._emCampo(b.taker)) {
            const novo = (typeof escolherBatedorDoLateral === 'function') ? escolherBatedorDoLateral(this._listaDe(b.equipa).filter(q => this._emCampo(q)), b.ponto) : null;
            if (!novo) return;
            b.taker = novo; Match.setPieceTaker = novo;
            if (b.fase === 'levar' || b.fase === 'pegar') {
                // A bola cai onde estava: o novo vai la busca-la.
                Match.ball.position.y = BallPhysics.raio;
                b.fonte = { tipo: 'bola', x: Match.ball.position.x, z: Match.ball.position.z };
                if (b.cone >= 0) { this._conePorRepor = b.cone; b.cone = -1; }
            }
            if (b.fase !== 'saida') this._ir(b.fonte);
            return;
        }

        if (b.fase === 'saida') {
            const bp = Match.ball.position, v = Match.ballVel.length();
            const dentro = Math.abs(bp.x) < CAMPO_LARG / 2 && Math.abs(bp.z) < CAMPO_COMP / 2;
            if (dentro && v < M.vParada) {
                // Bateu e voltou ao campo, e parou: e esta bola que se usa.
                Match.ballVel.set(0, 0, 0); bp.y = BallPhysics.raio;
                b.fonte = { tipo: 'bola', x: bp.x, z: bp.z };
                this._ir(b.fonte);
            } else if (!dentro && (Match.bolaBateuNaLateral || Match.bolaBateuNoFundo) && this._voltaAoCampo()) {
                // Bateu na placa e vem de volta com forca para entrar no campo: espera por ela (e essa bola que se usa).
                Match.bolaBateuNaLateral = false; Match.bolaBateuNoFundo = false;
            } else if (!dentro && (Match.bolaBateuNaLateral || Match.bolaBateuNoFundo || v < M.vParada)) {
                Match.bolaBateuNaLateral = false; Match.bolaBateuNoFundo = false;
                this._escolherFonteDoCone();
                this._ir(b.fonte);
            } else if (b.t > M.tetoSaida) {
                if (dentro) { Match.ballVel.set(0, 0, 0); bp.y = BallPhysics.raio; b.fonte = { tipo: 'bola', x: bp.x, z: bp.z }; }
                else this._escolherFonteDoCone();
                this._ir(b.fonte);
            }
            return;
        }

        const p = b.taker;
        if (b.fase === 'ir') {
            if (!p.lugarBolaParada) { b.fase = 'pegar'; b.tPegar = 0; p.velocity.set(0, 0, 0); if (typeof lookAtBola === 'function') lookAtBola(p.model, _v1.set(b.fonte.x, p.model.position.y, b.fonte.z)); }
            return;
        }
        if (b.fase === 'pegar') {
            b.tPegar += dt;
            // Abaixa-se na primeira metade e levanta-se na segunda.
            const meio = M.tempoPegar * 0.5;
            p.multibolaAgachado = b.tPegar < meio ? b.tPegar / meio : Math.max(0, 1 - (b.tPegar - meio) / meio);
            this._poseAgachado(p, p.multibolaAgachado);
            if (b.tPegar >= M.tempoPegar) {
                // Pegou: a bola de jogo vai para as maos dele e o cone fica vazio.
                if (b.fonte.tipo === 'cone' && b.cone >= 0) this._mostrarBolaDoCone(b.cone, false);
                this._mostrarBolaDeJogo(true);
                p.multibolaAgachado = 0;
                this._poseAgachado(p, 0);
                b.fase = 'levar';
                p.fsm.changeState('SET_PIECE_WAIT');
                p.lugarBolaParada = { x: b.pontoCobranca.x, z: b.pontoCobranca.z, t: 0, vel: this.velocidadeDe(p), multibola: true };
            }
            return;
        }
        if (b.fase === 'levar') {
            // A bola vai nas maos, a frente do peito.
            const ang = p.model.rotation.y;
            Match.ball.position.set(p.model.position.x + Math.sin(ang) * M.avancoNasMaos, M.alturaNasMaos, p.model.position.z + Math.cos(ang) * M.avancoNasMaos);
            Match.ballVel.set(0, 0, 0);
            if (!p.lugarBolaParada) this._entregar();
        }
    },

    /** Chegou ao ponto: daqui em diante e o lateral de sempre (estado LATERAL; o lateralAtraso comeca a contar agora). */
    _entregar() {
        const b = this.busca, p = b.taker;
        p.model.position.set(b.pontoCobranca.x, ALTURA_BASE_Y, b.pontoCobranca.z);
        p.velocity.set(0, 0, 0);
        Match.ball.position.set(b.ponto.x, BallPhysics.raio, b.ponto.z);
        Match.ballVel.set(0, 0, 0);
        this._mostrarBolaDeJogo(true);
        p.hasBall = false; p.lateralAction = null; p.lateralLargou = false; p.lateralPreparado = false; p.lateralFinta = null;
        Match.lateralEsperaExtra = 0;
        Match.setPieceTaker = p;
        p.fsm.changeState('LATERAL');
        this._conePorRepor = (b.cone >= 0) ? b.cone : null;
        this.busca = null;
    },

    /** O lance mudou a meio (golo anulado, fim do tempo, reset): a bola volta a ver-se e o cone repoe-se. */
    cancelar() {
        const b = this.busca;
        if (!b) return;
        this._mostrarBolaDeJogo(true);
        if (b.cone >= 0) this._mostrarBolaDoCone(b.cone, true);
        if (b.taker) { b.taker.multibolaAgachado = 0; if (b.taker.lugarBolaParada && b.taker.lugarBolaParada.multibola) b.taker.lugarBolaParada = null; }
        this.busca = null;
    }
};

if (typeof window !== 'undefined') window.MultiBola = MultiBola;
