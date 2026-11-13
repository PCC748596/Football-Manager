/*
=============================================================================
MultiBola — os cones com as bolas de reserva e a busca da bola nas reposicoes
=============================================================================
Spec: docs/superpowers/specs/2026-11-12-multibola-design.md; config: MultiBolaModel (js/config/multibola.js).
Lateral, tiro de meta e canto: a mesma busca (cone -> pegar -> levar), e no tiro de meta e no canto pousa-se a bola na marca e toma-se distancia.
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
        this._escondida = !sim;
        if (typeof Match !== 'undefined' && Match.ball) Match.ball.visible = sim;
    },
    /** A bola de jogo esta escondida pela busca (a que saiu sumiu e ainda ninguem pegou a do cone)? O desenho (match_ui) nao a pode reacender. */
    bolaEscondida() { return !!(this.busca && this._escondida); },

    activo() { return typeof MultiBolaModel !== 'undefined' && MultiBolaModel.activo && this.cones.length > 0; },
    /** Ha uma busca a correr (o lance espera por ela: o prazo e o arremesso nao contam). */
    emBusca() { return !!this.busca; },
    /** A bola que saiu ainda anda solta (a fisica corre, ate 5 s). */
    bolaSolta() { return !!(this.busca && this.busca.bolaLivre); },

    /** A velocidade do cobrador pelo placar: a perder corre; empatado ou a ganhar, trota (pedido: os dois iguais). */
    velocidadeDe(p) {
        const M = MultiBolaModel;
        if (typeof Match === 'undefined' || !p) return M.velTrote;
        const meu = p.team === 'TeamA' ? (Match.placarA || 0) : (Match.placarB || 0);
        const deles = p.team === 'TeamA' ? (Match.placarB || 0) : (Match.placarA || 0);
        return meu < deles ? M.velCorrida : M.velTrote;
    },

    /*
    O LATERAL COM MULTIBOLA (chamado do setupSetPiece('THROW_IN')). `ponto`: onde a bola saiu, na linha; `pontoCobranca`: onde o cobrador fica, atras da linha.
    Quem cobra vai logo ao cone mais proximo; a bola que saiu segue a fisica ate `tetoSaida` s e, se voltar ao campo, e ela que se usa (_seguirBolaSolta).
    */
    comecarLateral(taker, ponto, pontoCobranca, equipaQueRepoe) {
        this._comecar('lateral', taker, ponto, pontoCobranca, equipaQueRepoe);
    },

    /*
    O TIRO DE META COM MULTIBOLA (setupSetPiece('GOAL_KICK')). O guarda-redes vai ao cone mais proximo de onde a bola saiu (atras da baliza), pega, leva-a a
    quina da pequena area (`marca`), agacha-se e pousa-a, e so entao entra no tiro de meta de sempre: 'tiro_meta_espera' (toma distancia: caminha ate ao ponto
    de arranque do gesto) e o chute.
    */
    comecarTiroDeMeta(gk, saida, marca, equipa) {
        this._comecar('meta', gk, saida, null, equipa, marca);
    },

    /*
    O CANTO COM MULTIBOLA (setupSetPiece('CORNER_KICK')). O batedor vai ao cone, pega, leva a bola a marca do canto, agacha-se e pousa-a, recua (toma
    distancia, de frente para a bola, como no penalti) e vem bater sem parar: chega ao ponto do canto (`batedor`) e cruza.
    */
    comecarCanto(taker, saida, marca, batedor, equipa) {
        this._comecar('canto', taker, saida, batedor, equipa, marca);
    },

    _comecar(tipo, taker, saida, pontoCobranca, equipa, marca) {
        // A bola que saiu segue solta ate 5 s (ver _seguirBolaSolta) e, se voltar ao campo, troca-se por ela; quem cobra vai ja ao cone mais proximo.
        const b = this.busca = { tipo, fase: 'ir', t: 0, tSolta: 0, bolaLivre: true, taker, ponto: saida, pontoCobranca, marca: marca || null, equipa, fonte: null, cone: -1, andar: null };
        // Onde a bola fica escondida enquanto ninguem a tem: no ponto da cobranca (quem a segue com os olhos ou se afasta dela usa esse ponto).
        b.parque = marca ? { x: marca.x, z: marca.z } : { x: saida.x, z: saida.z };
        const i = this.coneMaisProximo(saida.x, saida.z);
        b.cone = i;
        const c = this.cones[i] || (i >= 0 ? this.posicoesDosCones()[i] : null);
        b.fonte = c ? { tipo: 'cone', x: c.x, z: c.z } : { tipo: 'bola', x: saida.x, z: saida.z };
        if (!taker) return;
        taker.velocity.set(0, 0, 0); taker.hasBall = false;
        // O guarda-redes a meio de um mergulho acaba o gesto primeiro (ver 'aguardar').
        if (taker.role === 'gk' && taker.gkEstado === 'mergulho') { b.fase = 'aguardar'; return; }
        this._ir(this._pontoDeApanhar(b.fonte, taker));
    },

    /** O estado do jogo de cada busca: se o lance deixa de ser este, a busca acaba. */
    _estadoDe(tipo) { return tipo === 'meta' ? 'GOAL_KICK' : (tipo === 'canto' ? 'CORNER_KICK' : 'THROW_IN'); },

    _listaDe(equipa) { return equipa === 'TeamA' ? Match.players : Match.opponents; },
    _emCampo(p) { return !!(p && p.model && !p.expulso && !p.queda && !p.subSaindo && this._listaDe(p.team).indexOf(p) >= 0); },

    /*
    POR-SE A CAMINHO de (x, z). Os de campo vao pelo `lugarBolaParada` (SET_PIECE_WAIT, a caminhada de toda a gente). O guarda-redes nao tem esse caminho: fica no
    estado 'multibola' (o updateGK nao lhe mexe) e e o `depoisDosJogadores` que o leva, com a mesma passada do 'tiro_meta_espera'.
    */
    _irPara(alvo, fase, vel) {
        const b = this.busca, p = b.taker;
        b.fase = fase;
        const v = vel || this.velocidadeDe(p);
        if (p.role === 'gk') {
            p.gkEstado = 'multibola';
            b.andar = { x: alvo.x, z: alvo.z, vel: v, olhar: b.andarOlhar || null };
            b.andarOlhar = null;
        } else {
            p.fsm.changeState('SET_PIECE_WAIT');
            p.lugarBolaParada = { x: alvo.x, z: alvo.z, t: 0, vel: v, multibola: true };
        }
    },
    _ir(alvo) { this._irPara(alvo, 'ir'); },
    /** Ainda a caminho? */
    _aCaminho(p) { return p.role === 'gk' ? !!(this.busca && this.busca.andar) : !!p.lugarBolaParada; },

    /** A altura do centro da bola pousada no cone (o aro do tronco + o que a bola fica acima dele). */
    _alturaNoCone() {
        const C = MultiBolaModel.cone;
        const corte = (typeof C.corte === 'number') ? C.corte : 1;
        const h = C.altura * corte, aro = C.raio * (1 - corte);
        const r = (typeof BallPhysics !== 'undefined' && BallPhysics.raio) || 0.11;
        return h + (aro < r ? Math.sqrt(r * r - aro * aro) : 0);
    },

    /** Onde quem vai buscar (ou pousar) a bola para: `recuoDoCorpo` m antes dela, do lado de onde ele vem (curvado, sao os bracos que a alcancam). */
    _pontoDeApanhar(fonte, p) {
        const M = MultiBolaModel;
        const dx = p.model.position.x - fonte.x, dz = p.model.position.z - fonte.z, d = Math.hypot(dx, dz) || 1;
        const recuo = ((typeof GoalkeeperPose !== 'undefined' && GoalkeeperPose.apanhar && GoalkeeperPose.apanhar.recuoDoCorpo) || 0.45) + (fonte.tipo === 'cone' ? M.cone.raio * 0.5 : 0);
        return { x: fonte.x + dx / d * recuo, z: fonte.z + dz / d * recuo };
    },

    /*
    A BOLA QUE SAIU (pedido): segue a fisica ate `tetoSaida` (5 s). Se nesse tempo voltar ao campo e parar, e ela que se usa (ex.: bateu na placa e voltou); se parar
    la fora, ou se aos 5 s nao estiver dentro, some. Entretanto quem cobra ja vai a caminho do cone mais proximo.
    */
    _seguirBolaSolta(dt) {
        const b = this.busca, M = MultiBolaModel;
        if (!b.bolaLivre) return;
        b.tSolta += dt;
        const bp = Match.ball.position, v = Match.ballVel.length();
        const dentro = Math.abs(bp.x) < CAMPO_LARG / 2 && Math.abs(bp.z) < CAMPO_COMP / 2;
        const parada = v < M.vParada && bp.y < BallPhysics.raio * 1.5;
        if (dentro && (parada || b.tSolta >= M.tetoSaida)) {
            // Voltou ao campo: e esta bola. Quem cobra larga o cone e vai a ela (se ainda nao comecou a apanhar a do cone).
            b.bolaLivre = false;
            Match.ballVel.set(0, 0, 0); bp.y = BallPhysics.raio;
            if (b.fase === 'ir' || b.fase === 'aguardar') {
                b.cone = -1; b.fonte = { tipo: 'bola', x: bp.x, z: bp.z };
                if (b.fase === 'ir') this._ir(this._pontoDeApanhar(b.fonte, b.taker));
            }
            return;
        }
        if ((!dentro && parada) || b.tSolta >= M.tetoSaida) this._sumirBola();
    },

    /** A bola que saiu some: a de jogo fica escondida (no ponto da cobranca) ate ele a apanhar no cone. */
    _sumirBola() {
        const b = this.busca;
        b.bolaLivre = false;
        this._mostrarBolaDeJogo(false);
        Match.ball.position.set(b.parque.x, BallPhysics.raio, b.parque.z);
        Match.ballVel.set(0, 0, 0);
    },

    /** Um frame da busca (chamado do Match.update, antes do updateBall). A pose (agachar, a bola nas maos, a passada do guarda-redes) e do `depoisDosJogadores`. */
    update(dt) {
        if (typeof Match === 'undefined') return;
        // O cone usado volta a ter bola quando a cobranca e feita (o lance deixa de ser o da busca).
        if (this._conePorRepor !== undefined && this._conePorRepor !== null && Match.state !== this._estadoPorRepor) {
            this._mostrarBolaDoCone(this._conePorRepor, true);
            this._conePorRepor = null;
        }
        const b = this.busca;
        if (!b) return;
        if (Match.state !== this._estadoDe(b.tipo)) { this.cancelar(); return; }
        const M = MultiBolaModel;
        b.t += dt;
        this._seguirBolaSolta(dt);

        // O cobrador saiu (expulso, substituido, lesionado): outro da ordem assume e recomeca.
        if (!this._emCampo(b.taker)) {
            const lista = this._listaDe(b.equipa).filter(q => this._emCampo(q));
            let novo = null;
            if (b.tipo === 'meta') novo = lista.find(q => q.role === 'gk') || null;
            else if (typeof escolherBatedorDoLateral === 'function') novo = escolherBatedorDoLateral(lista, b.ponto);
            if (!novo) return;
            if (b.taker) b.taker.multibolaAgachado = 0;
            b.taker = novo; Match.setPieceTaker = novo;
            if (b.fase !== 'ir' && b.fase !== 'aguardar') {
                // A bola cai onde estava: o novo vai la busca-la.
                Match.ball.position.y = BallPhysics.raio;
                this._mostrarBolaDeJogo(true);
                b.fonte = { tipo: 'bola', x: Match.ball.position.x, z: Match.ball.position.z };
                if (b.cone >= 0) { this._marcarConePorRepor(b.cone); b.cone = -1; }
            }
            this._ir(this._pontoDeApanhar(b.fonte, novo));
            return;
        }

        const p = b.taker;
        if (b.fase === 'aguardar') {
            // O guarda-redes acaba o mergulho; depois vai a bola.
            if (p.gkEstado !== 'mergulho') this._ir(this._pontoDeApanhar(b.fonte, p));
            return;
        }
        if (b.fase === 'ir') {
            if (!this._aCaminho(p)) {
                // Chegou ao pe da bola. Se a que saiu ainda anda solta e ele esta no cone, a de fora some agora.
                if (b.bolaLivre && b.fonte.tipo === 'cone') this._sumirBola();
                if (b.bolaLivre) return;   // vai buscar a que voltou: espera que ela pare
                b.fase = 'pegar'; b.tGesto = 0; b.posGesto = null; p.velocity.set(0, 0, 0);
                if (b.fonte.tipo === 'cone' && b.cone >= 0) {
                    // A bola do cone passa a ser a de jogo: a do desenho do cone esconde-se e a de jogo aparece em cima dele.
                    this._mostrarBolaDoCone(b.cone, false);
                    Match.ball.position.set(b.fonte.x, this._alturaNoCone(), b.fonte.z);
                }
                Match.ballVel.set(0, 0, 0);
                this._mostrarBolaDeJogo(true);
            }
            return;
        }
        const G = M.pegar, dur = G.descer + G.segurar + G.subir;
        if (b.fase === 'pegar') {
            b.tGesto += dt;
            Match.ballVel.set(0, 0, 0);
            if (b.tGesto >= dur) {
                p.multibolaAgachado = 0;
                // Leva-a: no lateral ao ponto atras da linha; no tiro de meta e no canto ate ao pe da marca, para a pousar.
                const destino = (b.tipo === 'lateral') ? b.pontoCobranca : this._pontoDeApanhar({ tipo: 'bola', x: b.marca.x, z: b.marca.z }, p);
                if (p.role === 'gk') b.andarOlhar = null;
                this._irPara(destino, 'levar');
            }
            return;
        }
        if (b.fase === 'levar') {
            Match.ballVel.set(0, 0, 0);
            if (this._aCaminho(p)) return;
            if (b.tipo === 'lateral') { this._entregar(); return; }
            b.fase = 'pousar'; b.tGesto = 0; b.posGesto = null; p.velocity.set(0, 0, 0);
            return;
        }
        if (b.fase === 'pousar') {
            b.tGesto += dt;
            Match.ballVel.set(0, 0, 0);
            if (b.tGesto >= dur) {
                p.multibolaAgachado = 0;
                Match.ball.position.set(b.marca.x, (typeof b.marca.y === 'number') ? b.marca.y : BallPhysics.raio, b.marca.z);
                if (b.tipo === 'meta') { this._entregarTiroDeMeta(); return; }
                // CANTO: toma distancia — recua de frente para a bola, na linha bola -> ponto de batida, ate `recuoCanto` m.
                const dx = b.pontoCobranca.x - b.marca.x, dz = b.pontoCobranca.z - b.marca.z, d = Math.hypot(dx, dz) || 1;
                this._irPara({ x: b.marca.x + dx / d * M.recuoCanto, z: b.marca.z + dz / d * M.recuoCanto }, 'recuar', M.velAndar);
            }
            return;
        }
        if (b.fase === 'recuar' || b.fase === 'firmar' || b.fase === 'vir') {
            Match.ball.position.set(b.marca.x, (typeof b.marca.y === 'number') ? b.marca.y : BallPhysics.raio, b.marca.z);
            Match.ballVel.set(0, 0, 0);
        }
        if (b.fase === 'recuar') {
            if (this._aCaminho(p)) return;
            b.fase = 'firmar'; b.tGesto = 0;
            return;
        }
        if (b.fase === 'firmar') {
            // Um instante parado, a olhar para a area, antes de vir bater.
            b.tGesto += dt;
            if (b.tGesto >= M.esperaAntesDeBater) this._irPara(b.pontoCobranca, 'vir', M.velAproximacaoCanto);
            return;
        }
        if (b.fase === 'vir') {
            // Vem do recuo ao ponto de batida a andar; ao chegar, cruza (o gesto parte com ele em andamento).
            if (!this._aCaminho(p)) this._entregarCanto();
        }
    },

    _marcarConePorRepor(i) { this._conePorRepor = i; this._estadoPorRepor = this._estadoDe(this.busca ? this.busca.tipo : 'lateral'); },

    /** A bola nas maos, a frente do peito (posicao actual do corpo). */
    _bolaNasMaos(p) {
        const M = MultiBolaModel;
        const ang = p.model.rotation.y;
        return { x: p.model.position.x + Math.sin(ang) * M.avancoNasMaos, y: M.alturaNasMaos, z: p.model.position.z + Math.cos(ang) * M.avancoNasMaos };
    },

    /*
    DEPOIS DOS JOGADORES (match_loop, a seguir ao p.update de todos): o `animateBones` ja escreveu a pose do frame, e so por cima dela o agachar se ve — chamado
    antes, como era, a pose era reescrita no mesmo frame e a bola aparecia nas maos dele sem ele se baixar (relato). E A POSE DO GOLEIRO A APANHAR A BOLA
    (GoalkeeperPose.apanhar, com as solas no relvado e as palmas na bola por IK, como o batedor da disputa de penaltis): desce em `pegar.descer`, fica
    `pegar.segurar` com as maos na bola e sobe em `pegar.subir`. Ao PEGAR a bola sobe com as maos ate a frente do peito; ao POUSAR desce com elas ate a marca.
    */
    depoisDosJogadores(dt) {
        const b = this.busca;
        if (!b || !b.taker || !b.taker.model) return;
        const p = b.taker, M = MultiBolaModel;
        if (p.role === 'gk' && b.andar) this._passoDoGuardaRedes(p, dt);
        if (b.fase === 'pegar' || b.fase === 'pousar') {
            const G = M.pegar, t = b.tGesto;
            const k = t < G.descer ? t / G.descer : (t < G.descer + G.segurar ? 1 : Math.max(0, 1 - (t - G.descer - G.segurar) / G.subir));
            const suave = k * k * (3 - 2 * k);
            p.multibolaAgachado = suave;
            const alvoBola = (b.fase === 'pegar') ? b.fonte : { tipo: 'bola', x: b.marca.x, z: b.marca.z };
            // De frente para a bola, e a descer o corpo chega-se ate ficar a `recuoDoCorpo` dela (como o goleiro): sao os bracos esticados que a alcancam.
            if (typeof lookAtBola === 'function') lookAtBola(p.model, _v1.set(alvoBola.x, p.model.position.y, alvoBola.z));
            // Preso a esse ponto ate se levantar: o estado de espera (SET_PIECE_WAIT) puxava-o de volta para o lugar dele na formacao a meio do gesto.
            if (!b.posGesto) b.posGesto = this._pontoDeApanhar(alvoBola, p);
            const kp = t < G.descer ? 0.2 : 1;
            p.model.position.x += (b.posGesto.x - p.model.position.x) * kp;
            p.model.position.z += (b.posGesto.z - p.model.position.z) * kp;
            p.velocity.set(0, 0, 0);
            const m = this._bolaNasMaos(p);
            if (b.fase === 'pegar') {
                const y0p = (b.fonte.tipo === 'cone') ? this._alturaNoCone() : BallPhysics.raio;
                // A descer e com as maos nela, a bola fica onde esta (no cone): a fisica da bola parada empurrava-a para a linha de fundo (o cone esta atras dela).
                if (t < G.descer + G.segurar) { Match.ball.position.set(b.fonte.x, y0p, b.fonte.z); Match.ballVel.set(0, 0, 0); }
                // A subir, a bola vai com as maos: do sitio onde estava ate a frente do peito.
                if (t >= G.descer + G.segurar) {
                    const y0 = (b.fonte.tipo === 'cone') ? this._alturaNoCone() : BallPhysics.raio, u = 1 - suave;
                    Match.ball.position.set(b.fonte.x + (m.x - b.fonte.x) * u, y0 + (m.y - y0) * u, b.fonte.z + (m.z - b.fonte.z) * u);
                }
            } else {
                // A descer, a bola vai das maos ate a marca; fica la enquanto ele se levanta.
                const yM = (typeof b.marca.y === 'number') ? b.marca.y : BallPhysics.raio;
                const u = t < G.descer ? suave : 1;
                Match.ball.position.set(m.x + (b.marca.x - m.x) * u, m.y + (yM - m.y) * u, m.z + (b.marca.z - m.z) * u);
            }
            const noCone = b.fase === 'pegar' && b.fonte.tipo === 'cone';
            if (t < G.descer + G.segurar) this._poseApanhar(p, suave, noCone);
            else this._poseLevantar(p, 1 - suave, b.fase === 'pegar');
            return;
        }
        if (b.fase === 'levar') {
            // Leva-a com os bracos da pose de segurar do goleiro (o V, a bola no peito) e os pes no relvado.
            this._bracosDeSegurar(p, 1);
            if (p.assentarNoChao) p.assentarNoChao();
            const m = this._bolaNasMaos(p);
            Match.ball.position.set(m.x, m.y, m.z);
            Match.ballVel.set(0, 0, 0);
            return;
        }
        if (b.fase === 'recuar' || b.fase === 'firmar' || b.fase === 'vir') {
            // De frente para a bola enquanto recua (anda de costas) e enquanto espera.
            if (b.fase !== 'vir' && typeof lookAtBola === 'function') lookAtBola(p.model, _v1.set(b.marca.x, p.model.position.y, b.marca.z));
            // A BOLA FICA NA MARCA: a recuar, ele esbarrava nela e levava-a 2 m (medido); ate ele a bater, nao sai dali.
            Match.ball.position.set(b.marca.x, (typeof b.marca.y === 'number') ? b.marca.y : BallPhysics.raio, b.marca.z);
            Match.ballVel.set(0, 0, 0);
        }
    },

    /** A passada do guarda-redes (estado 'multibola'): a mesma do 'tiro_meta_espera' (player.js), a velocidade da busca. */
    _passoDoGuardaRedes(p, dt) {
        const a = this.busca.andar, corpo = p.model, rig = p.rig;
        const dx = a.x - corpo.position.x, dz = a.z - corpo.position.z, d = Math.hypot(dx, dz);
        if (d <= 0.12) { this.busca.andar = null; p.velocity.set(0, 0, 0); if (p.resetBonesToDefault) p.resetBonesToDefault(); return; }
        const passo = Math.min(d, a.vel * dt);
        corpo.position.x += dx / d * passo; corpo.position.z += dz / d * passo;
        const vel = dt > 0.0001 ? passo / dt : 0;
        p.velocity.set(dx / d * vel, 0, dz / d * vel);
        if (rig && typeof getGaitPose === 'function' && typeof aplicarPosePassada === 'function') {
            const P0 = getGaitPose(0, vel);
            p.animTimer = (p.animTimer || 0) + (vel * dt) / P0.passada;
            const tt = ((p.animTimer % 1.0) + 1.0) % 1.0;
            aplicarPosePassada(rig, getGaitPose(tt, vel), tt, { amp: 1.0, suavizacao: Math.min(1, vel / 2.0) });
            if (rig.pelvis) rig.pelvis.rotation.set(0, 0, 0);
        }
        corpo.position.y = (typeof ALTURA_BASE_Y === 'number') ? ALTURA_BASE_Y : 0;
        // Os pes no relvado (sem isto andava uns 20 cm no ar: a altura base nao e a das solas com a passada aplicada).
        if (p.assentarNoChao) p.assentarNoChao();
        if (typeof lookAtBola === 'function') lookAtBola(corpo, _v1.set(a.x, corpo.position.y, a.z));
    },

    /*
    A POSE DO GOLEIRO A APANHAR A BOLA (GoalkeeperPose.apanhar), como no updateGK ('apanhar'): as juntas vao para a pose, o corpo desce a `altura` e as solas
    e as palmas vao por IK (apanharPorIK). Num jogador de campo o animateBones reescreve a pose em cada frame, por isso aplica-se com o peso `k` sobre ela;
    no guarda-redes (estado 'multibola', sem animateBones) segue-se a pose do frame anterior a 0.5 por frame, que e o que o updateGK faz.
    */
    _poseApanhar(p, k, noCone) {
        const r = p.rig;
        if (!r || typeof GoalkeeperPose === 'undefined' || !GoalkeeperPose.apanhar) return;
        const P = GoalkeeperPose.apanhar;
        const f = (p.role === 'gk') ? 0.5 : k;
        const L = (a, alvo) => a + (alvo - a) * f;
        r.lLeg.rotation.x = L(r.lLeg.rotation.x, P.coxa); r.rLeg.rotation.x = L(r.rLeg.rotation.x, P.coxa);
        r.lKnee.rotation.x = L(r.lKnee.rotation.x, P.joelho); r.rKnee.rotation.x = L(r.rKnee.rotation.x, P.joelho);
        r.lArm.rotation.x = L(r.lArm.rotation.x, P.bracoX); r.rArm.rotation.x = L(r.rArm.rotation.x, P.bracoX);
        if (r.lElbow) r.lElbow.rotation.x = L(r.lElbow.rotation.x, P.cotovelo);
        if (r.rElbow) r.rElbow.rotation.x = L(r.rElbow.rotation.x, P.cotovelo);
        r.chest.rotation.x = L(r.chest.rotation.x, P.chest);
        const base = (typeof ALTURA_BASE_Y === 'number') ? ALTURA_BASE_Y : 0;
        // A bola em cima do cone esta mais alta do que no relvado: o corpo desce menos.
        const subida = noCone ? (this._alturaNoCone() - BallPhysics.raio) : 0;
        const yAlvo = base + (P.altura + subida) * ((p.role === 'gk') ? 1 : k);
        p.model.position.y = (p.role === 'gk') ? L(p.model.position.y, yAlvo) : yAlvo;
        // As solas no relvado e as palmas na bola: e o que o impede de ficar a flutuar por cima dela.
        if (p.apanharPorIK) p.apanharPorIK(p.model, r, P);
    },

    /*
    LEVANTAR. Com a bola (`comBola`): a pose de segurar do goleiro (GoalkeeperPose.segurar: de pe, a bola no V dos bracos, no peito), como o goleiro se
    levanta depois de a apanhar; sem ela (acabou de a pousar): de pe, os bracos em baixo. `k` vai de 1 (ainda agachado) a 0 (de pe). O corpo sobe e os pes
    ficam no relvado (assentarNoChao): sem isso ele subia sem as pernas acompanharem e ficava a flutuar por cima da bola (relato).
    */
    _poseLevantar(p, k, comBola) {
        const r = p.rig;
        if (!r || typeof GoalkeeperPose === 'undefined') return;
        const A = GoalkeeperPose.apanhar, S = GoalkeeperPose.segurar;
        const de = (alvoAgachado, alvoDePe) => alvoDePe + (alvoAgachado - alvoDePe) * k;
        const gk = p.role === 'gk';
        // No guarda-redes, a 0.25 por frame para o alvo (o `cLev` do updateGK); no de campo, por cima da pose do frame com o peso do gesto.
        const L = gk ? ((a, alvo) => a + (alvo - a) * 0.35) : ((a, alvo) => a + (alvo - a) * Math.max(k, comBola ? 1 : 0));
        const coxa = de(A.coxa, comBola ? S.coxa : 0), joelho = de(A.joelho, comBola ? S.joelho : 0), chest = de(A.chest, comBola ? S.chest : 0);
        r.lLeg.rotation.x = L(r.lLeg.rotation.x, coxa); r.rLeg.rotation.x = L(r.rLeg.rotation.x, coxa);
        r.lKnee.rotation.x = L(r.lKnee.rotation.x, joelho); r.rKnee.rotation.x = L(r.rKnee.rotation.x, joelho);
        r.chest.rotation.x = L(r.chest.rotation.x, chest);
        if (comBola) this._bracosDeSegurar(p, 1 - k);
        else {
            r.lArm.rotation.x = L(r.lArm.rotation.x, de(A.bracoX, 0)); r.rArm.rotation.x = L(r.rArm.rotation.x, de(A.bracoX, 0));
            if (r.lElbow) r.lElbow.rotation.x = L(r.lElbow.rotation.x, de(A.cotovelo, 0));
            if (r.rElbow) r.rElbow.rotation.x = L(r.rElbow.rotation.x, de(A.cotovelo, 0));
        }
        const base = (typeof ALTURA_BASE_Y === 'number') ? ALTURA_BASE_Y : 0;
        p.model.position.y = base + A.altura * k;
        if (p.assentarNoChao) p.assentarNoChao();
    },

    /** Os bracos da pose de segurar do goleiro (o V, a bola encostada ao peito), com peso `w` sobre a pose do frame. */
    _bracosDeSegurar(p, w) {
        const r = p.rig;
        if (!r || typeof GoalkeeperPose === 'undefined' || !GoalkeeperPose.segurar || w <= 0) return;
        const S = GoalkeeperPose.segurar, L = (a, alvo) => a + (alvo - a) * w;
        r.lArm.rotation.x = L(r.lArm.rotation.x, S.bracoX); r.rArm.rotation.x = L(r.rArm.rotation.x, S.bracoX);
        r.lArm.rotation.z = L(r.lArm.rotation.z, S.bracoZ); r.rArm.rotation.z = L(r.rArm.rotation.z, -S.bracoZ);
        if (r.lElbow) r.lElbow.rotation.x = L(r.lElbow.rotation.x, S.cotovelo);
        if (r.rElbow) r.rElbow.rotation.x = L(r.rElbow.rotation.x, S.cotovelo);
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
        if (b.cone >= 0) this._marcarConePorRepor(b.cone);
        this.busca = null;
    },

    /** A bola pousada na quina da pequena area: o tiro de meta de sempre ('tiro_meta_espera' toma distancia ate ao arranque do gesto; o countdown e o chute). */
    _entregarTiroDeMeta() {
        const b = this.busca, p = b.taker;
        Match.ballVel.set(0, 0, 0);
        this._mostrarBolaDeJogo(true);
        Match.golKickBolaAlvo = null;
        p.gkTiroMetaPendente = false;
        p.gkEstado = 'tiro_meta_espera';
        p.gkTempoMergulho = 0;
        p.velocity.set(0, 0, 0);
        if (b.cone >= 0) this._marcarConePorRepor(b.cone);
        this.busca = null;
    },

    /** Chegou ao ponto do canto, vindo do recuo sem parar: entra no SET_PIECE_TAKER com a espera ja cumprida (cruza neste frame ou no seguinte). */
    _entregarCanto() {
        const b = this.busca, p = b.taker;
        this._mostrarBolaDeJogo(true);
        Match.cantoBolaAlvo = null;
        Match.setPieceTaker = p;
        p.hasBall = false;
        p.velocity.set(0, 0, 0);
        Match.setPieceTimer = Math.max(Match.setPieceTimer || 0, (typeof ESPERA_COBRANCA_CANTO === 'number') ? ESPERA_COBRANCA_CANTO : 3) + 0.01;
        p.fsm.changeState('SET_PIECE_TAKER');
        if (b.cone >= 0) this._marcarConePorRepor(b.cone);
        this.busca = null;
    },

    /** O lance mudou a meio (golo anulado, fim do tempo, reset): a bola volta a ver-se e o cone repoe-se. */
    cancelar() {
        const b = this.busca;
        if (!b) return;
        this._mostrarBolaDeJogo(true);
        if (b.cone >= 0) this._mostrarBolaDoCone(b.cone, true);
        if (b.taker) {
            b.taker.multibolaAgachado = 0;
            if (b.taker.lugarBolaParada && b.taker.lugarBolaParada.multibola) b.taker.lugarBolaParada = null;
            if (b.taker.gkEstado === 'multibola') b.taker.gkEstado = 'idle';
        }
        this.busca = null;
    }
};

if (typeof window !== 'undefined') window.MultiBola = MultiBola;
