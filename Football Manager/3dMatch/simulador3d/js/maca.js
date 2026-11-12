/*
=============================================================================
A MACA — 4 maqueiros, a maca e o medico do time (medidas em MacaModel, config/maca.js)
=============================================================================
Pedido: *"vamos colocar 4 funcionarios com uma maca em algum lugar em volta do campo. Se houver um jogador lesionado que tenha que sair, os
funcionarios entram com a maca, o jogador deita e eles carregam o jogador ate o tunel. O medico do time vai acompanhando os maqueiros."*

OS BONECOS sao o corpo dos jogadores (Officials.criarCorpo, como o 4.o arbitro, o staff do banco e os reporters), de camisa vermelha e calca
escura; a maca e procedural (dois varais, a lona, travessas e quatro pezinhos). Esperam de pe ao lado da maca pousada, atras das placas, entre a
boca do tunel e o banco (MacaModel.posto).

A SEQUENCIA (`fase`), numa parada do jogo com uma troca pendente de um lesionado que tem de sair (MatchInjuries Forced/Requested, ou `levar`):

    pegar     os 4 vao as pegas da maca pousada            erguer   agacham e levantam-na (2 de cada lado, maos nos varais)
    indo      trote ate ao lado do lesionado; a ultima perna e de lado, ja virados para o tunel (a maca nao roda por cima dele)
    pousar    pousam a maca ao lado dele                   deitar   ele (sentado no relvado desde o inicio) passa para a maca e deita-se de costas
    erguer    levantam-na com ele                          levando  a passo, sai pela lateral mais proxima e segue por fora do campo ate ao vao das placas do tunel e dentro (o caminho do expulso,
             Officials.iniciarSaidaExpulso); da metade oposta da a volta por tras da baliza
    voltando  dentro do tunel ele some; voltam com a maca vazia ao posto           pousar / arrumar   pousam-na e voltam aos lugares

O MEDICO do time (o `medico` sentado no banco, Bancos; sem banco, um medico de reserva junto ao posto) levanta-se, vai ter com o lesionado,
agacha-se ao lado dele, acompanha a maca ate a boca do tunel e volta a sentar-se. Os dados do medico do manager (equipaInfo.medico) dao o nome.

O JOGO: enquanto o lesionado esta na lista do time a cobranca espera (`seguraJogo`, Match.update). A troca (match_substituicoes.js) espera a maca
sair do campo (`foraDoCampo`) e faz-se ai: o substituto entra como sempre, o lesionado sai da lista e o jogo recomeca; a maca segue para o tunel.
Lotes rapidos (Sim.running) ou sem cena: nada disto — o jogador sai como antes. Seguranca: `esperaMax` s depois, a troca faz-se de qualquer modo.

O lesionado NAO e filho da maca na cena (o resto do jogo le `model.position` como coordenadas do mundo): o corpo e posto a cada frame no sitio da
lona (`_poseDoente`), o que da o mesmo efeito.

TESTE MANUAL: `Maca.levar(jogador)` na consola (sem argumento escolhe um jogador da CPU), ou o botao "Maca (teste)" do painel.
=============================================================================
*/
const Maca = {
    grupo: null,            // a maca (THREE.Group)
    maqueiros: [],          // { model, rig, jogador, animTimer, velAnim, k }
    _cena: null,
    fase: 'parado',
    fases: [],              // as fases da ultima sequencia, por ordem (diagnostico e teste)
    t: 0, tTotal: 0,
    pose: { x: 0, z: 0, h: 0, y: 0 },   // o centro da maca (varais), o rumo e a altura
    doente: null, req: null, medico: null,
    _wps: null, _iw: 0, _seguinte: null,
    _medicosSemBanco: {},
    _v: null,

    _lado: function () { return (typeof TunelJogadores !== 'undefined' && TunelJogadores.lado) ? TunelJogadores.lado : -1; },
    _base: function () { return (typeof ALTURA_BASE_Y === 'number') ? ALTURA_BASE_Y : 0; },
    _wrap: function (a) { return Math.atan2(Math.sin(a), Math.cos(a)); },
    _lerp: function (a, b, k) { return a + (b - a) * k; },

    // Lotes rapidos e o modo oculto do manager (Sim.running) nao desenham: a maca nao existe e o jogador sai como antes.
    _podeDesenhar: function () {
        if (typeof MacaModel === 'undefined' || !MacaModel.activa || typeof THREE === 'undefined') return false;
        if (typeof Sim !== 'undefined' && Sim.running) return false;
        if (typeof Match === 'undefined' || !Match.scene || typeof Officials === 'undefined' || !Officials.criarCorpo) return false;
        return typeof CAMPO_LARG !== 'undefined' && typeof TunelJogadores !== 'undefined' && TunelJogadores.activo;
    },

    // O rumo da maca parada no posto: de frente para o campo.
    _hPosto: function () { return Math.atan2(-this._lado(), 0); },
    _posto: function () { return { x: this._lado() * MacaModel.posto.x, z: MacaModel.posto.z }; },

    // Do referencial da maca (l = de lado, +x local; a = ao longo, a frente) para o mundo, com a pose `p` (por omissao a actual).
    _mundo: function (l, a, p) {
        p = p || this.pose;
        const c = Math.cos(p.h), s = Math.sin(p.h);
        return { x: p.x + l * c + a * s, z: p.z - l * s + a * c };
    },

    // ---------------------------------------------------------------------------------------------
    // CONSTRUCAO
    _construir: function (cena) {
        this._limpar();
        const M = MacaModel;
        this._cena = cena;
        this.grupo = this._criarMaca();
        cena.add(this.grupo);
        this.maqueiros = [];
        for (let k = 0; k < 4; k++) {
            let feito = null;
            try { feito = Officials.criarCorpo(970 + k, M.cores.camisa, M.cores.calca, true, false, undefined, true); } catch (e) { feito = null; }
            if (!feito) { this._limpar(); return false; }
            // Mangas e calcas compridas (o mesmo pano do staff do banco).
            if (typeof Bancos !== 'undefined' && Bancos._vestirPano) { try { Bancos._vestirPano(feito, new THREE.Color(M.cores.calca).getHex()); } catch (e) { /* fica de calcao */ } }
            feito.corpo.userData.maqueiro = true;
            cena.add(feito.corpo);
            this.maqueiros.push({ model: feito.corpo, rig: feito.rig, jogador: feito.jogador, animTimer: 0, velAnim: 0, k: k });
        }
        this._medirMao();
        this._noPosto();
        return true;
    },

    _limpar: function () {
        for (const o of this.maqueiros) if (o.model && o.model.parent) o.model.parent.remove(o.model);
        if (this.grupo && this.grupo.parent) this.grupo.parent.remove(this.grupo);
        for (const k of Object.keys(this._medicosSemBanco)) { const m = this._medicosSemBanco[k]; if (m && m.model && m.model.parent) m.model.parent.remove(m.model); }
        this._medicosSemBanco = {};
        this.maqueiros = []; this.grupo = null;
        this.fase = 'parado'; this.doente = null; this.req = null; this.medico = null;
    },

    // A maca: dois varais (ao longo do z local), a lona, as travessas das pontas, as pegas e quatro pezinhos. A origem e o centro dos varais.
    _criarMaca: function () {
        const C = MacaModel.maca, L = C.lona, d = C.distVarais / 2, r = C.raioVaral;
        const g = new THREE.Group();
        g.name = 'maca';
        const mVaral = new THREE.MeshStandardMaterial({ color: C.cores.varal, roughness: 0.35, metalness: 0.6 });
        const mLona = new THREE.MeshStandardMaterial({ color: C.cores.lona, roughness: 0.85 });
        const mEscuro = new THREE.MeshStandardMaterial({ color: C.cores.pernas, roughness: 0.7 });
        const juntar = (geo, mat, x, y, z, rx) => {
            const m = new THREE.Mesh(geo, mat);
            m.position.set(x, y, z); if (rx) m.rotation.x = rx;
            m.castShadow = true; m.receiveShadow = true;
            g.add(m); return m;
        };
        for (const s of [-1, 1]) {
            juntar(new THREE.CylinderGeometry(r, r, C.comprimento, 8), mVaral, s * d, 0, 0, Math.PI / 2);
            for (const e of [-1, 1]) {
                juntar(new THREE.CylinderGeometry(r * 1.5, r * 1.5, 0.16, 8), mEscuro, s * d, 0, e * (C.comprimento / 2 - 0.08), Math.PI / 2);   // as pegas
                juntar(new THREE.BoxGeometry(0.03, C.pernas, 0.03), mEscuro, s * d, -C.pernas / 2, e * (L.comprimento / 2 - 0.1));            // os pezinhos
            }
        }
        juntar(new THREE.BoxGeometry(L.largura, L.espessura, L.comprimento), mLona, 0, 0, 0);
        for (const e of [-1, 1]) juntar(new THREE.BoxGeometry(C.distVarais, 0.025, 0.03), mVaral, 0, -0.015, e * L.comprimento / 2);   // as travessas
        this._topoLona = L.espessura / 2;
        return g;
    },

    // A altura das maos de um maqueiro de pe com os bracos da pega: e a altura a que a maca anda.
    _medirMao: function () {
        const o = this.maqueiros[0];
        this._alturaMao = 0.8;
        if (!o || !o.rig || !o.rig.lHand) return;
        const pos = o.model.position.clone(), rot = o.model.rotation.clone();
        o.model.position.set(0, 0, 0); o.model.rotation.set(0, 0, 0);
        this._bracosDaPega(o);
        this._aterrar(o);   // de pe com o pe pousado (como anda com a maca): senao a maca ficava acima das maos
        o.model.updateMatrixWorld(true);
        const v = new THREE.Vector3();
        o.rig.lHand.getWorldPosition(v);
        if (v.y > 0.4 && v.y < 1.2) this._alturaMao = v.y;
        o.model.position.copy(pos); o.model.rotation.copy(rot);
    },
    _yLevar: function () { return this._base() + this._alturaMao - 0.02; },
    _yChao: function () { return this._base() + MacaModel.maca.pernas + MacaModel.maca.raioVaral; },

    _colocarMaca: function () {
        this.grupo.position.set(this.pose.x, this.pose.y, this.pose.z);
        this.grupo.rotation.set(0, this.pose.h, 0);
    },

    // Tudo no posto: a maca pousada, os 4 de pe ao lado, virados para o campo.
    _noPosto: function () {
        const p = this._posto();
        this.pose = { x: p.x, z: p.z, h: this._hPosto(), y: this._yChao() };
        this._colocarMaca();
        MacaModel.parados.forEach((q, k) => {
            const o = this.maqueiros[k]; if (!o) return;
            const w = this._mundo(q.l, q.a);
            if (o.jogador && o.jogador.resetBonesToDefault) o.jogador.resetBonesToDefault();
            o.model.position.set(w.x, this._base(), w.z);
            o.model.rotation.set(0, this.pose.h, 0);
            o.velAnim = 0;
            this._aterrar(o);
        });
        this.fase = 'parado';
    },

    // ---------------------------------------------------------------------------------------------
    // POSES
    // A passada (a do `Officials.mover`, sem o mover: aqui a posicao e imposta pela maca) a velocidade `vel`.
    _passada: function (o, vel, dt) {
        const r = o.rig;
        const lerpK = (a, b, k) => a + (b - a) * k;
        o.velAnim = lerpK(o.velAnim || 0, vel, 0.25);
        const v = o.velAnim;
        if (v > 0.1 && typeof getGaitPose === 'function') {
            const P0 = getGaitPose(0, v);
            o.animTimer = (o.animTimer || 0) + (v * dt) / (P0.passada || 1.5);
            const t = ((o.animTimer % 1) + 1) % 1;
            const P = getGaitPose(t, v);
            r.lLeg.rotation.x = P.lHip; r.lKnee.rotation.x = P.lKnee;
            r.rLeg.rotation.x = P.rHip; r.rKnee.rotation.x = P.rKnee;
            if (r.lFoot) r.lFoot.rotation.x = P.lFoot; if (r.rFoot) r.rFoot.rotation.x = P.rFoot;
            r.chest.rotation.x = P.tronco;
            r.lArm.rotation.x = P.lArm; r.rArm.rotation.x = P.rArm;
            o.model.position.y = this._base() + (P.ressalto || 0);
        } else {
            for (const n of ['lLeg', 'rLeg', 'lKnee', 'rKnee', 'lFoot', 'rFoot', 'lArm', 'rArm']) if (r[n]) r[n].rotation.x = lerpK(r[n].rotation.x, 0, 0.2);
            r.chest.rotation.x = lerpK(r.chest.rotation.x, 0, 0.2);
            o.model.position.y = lerpK(o.model.position.y, this._base(), 0.2);
        }
        this._aterrar(o);
    },

    /*
    O PE MAIS BAIXO NO CHAO. Relato (imagem): *"o pessoal da maca ta correndo no ar"*. A passada daqui poe o corpo a altura fixa (+ ressalto) e as pernas dobradas
    levantavam os dois pes: medido, o pe mais baixo dos maqueiros ficava a 0.26-0.43 m (o do juiz e o dos jogadores, a 0.13: o tornozelo pousado). Depois da
    pose, o corpo desce (ou sobe) o que for preciso para o pe mais baixo ficar a `peNoChao` (MacaModel).
    */
    _aterrar: function (o) {
        const r = o && o.rig;
        if (!r || !r.lFoot || !r.rFoot || !o.model) return;
        o.model.updateMatrixWorld(true);
        const v = this._vPe || (this._vPe = new THREE.Vector3());
        r.lFoot.getWorldPosition(v); let m = v.y;
        r.rFoot.getWorldPosition(v); m = Math.min(m, v.y);
        const alvo = (typeof MacaModel.peNoChao === 'number') ? MacaModel.peNoChao : 0.13;
        o.model.position.y += alvo - m;
    },

    // Os bracos na pega: a mao de dentro (a do lado da maca) segura o varal; os da frente tem a pega atras de si, os de tras a frente.
    _bracosDaPega: function (o, c) {
        const r = o.rig, q = MacaModel.pegas[o.k] || { a: 1, l: 1 };
        const ag = MacaModel.poses.agachado;
        const x = this._lerp(q.a > 0 ? 0.14 : -0.16, ag.braco, c || 0);
        // l > 0: a maca fica a direita dele (-x local) -> a mao direita e a de dentro.
        const dentro = q.l > 0 ? r.rArm : r.lArm, fora = q.l > 0 ? r.lArm : r.rArm;
        const sinalFora = q.l > 0 ? 1 : -1;   // lArm abre com z > 0, rArm com z < 0
        dentro.rotation.x = x; dentro.rotation.z = 0;
        fora.rotation.x = x; fora.rotation.z = sinalFora * 0.06;
        if (r.lElbow) r.lElbow.rotation.x = -0.15; if (r.rElbow) r.rElbow.rotation.x = -0.15;
    },

    // Agachado (c = 0 de pe, 1 agachado): para pousar e levantar a maca; o medico agacha-se ao lado do lesionado.
    _agachar: function (o, c) {
        const r = o.rig, A = MacaModel.poses.agachado;
        r.lLeg.rotation.x = A.anca * c; r.rLeg.rotation.x = A.anca * c;
        r.lKnee.rotation.x = A.joelho * c; r.rKnee.rotation.x = A.joelho * c;
        if (r.lFoot) r.lFoot.rotation.x = 0; if (r.rFoot) r.rFoot.rotation.x = 0;
        r.chest.rotation.x = A.tronco * c;
        if (c > 0.01 && o.jogador && o.jogador.assentarCorpoInteiro) o.jogador.assentarCorpoInteiro();
        else o.model.position.y = this._base();
    },

    /*
    O MEDICO DE UM JOELHO SO (pedido: *"coloca o medico ajoelhado com um joelho so, tipo o goleiro quando vai encaixar a bola"*): as pernas do encaixe ajoelhado do guarda-redes
    (GoalkeeperPose.encaixe: a direita ajoelha com o joelho e a ponta do pe no relvado, a esquerda de apoio a frente, com a sola assente), o tronco inclinado para o
    lesionado e os bracos a frente. `c` 0 = de pe, 1 = ajoelhado. O corpo assenta pelo ponto mais baixo (o joelho).
    */
    _ajoelhar: function (o, c) {
        const r = o.rig;
        if (!r) return;
        const E = (typeof GoalkeeperPose !== 'undefined' && GoalkeeperPose.encaixe) || { coxaAberta: 0.20, joelhoAberto: 1.70, peAberto: 0.60, coxaRecolhida: -1.30, joelhoRecolhido: 1.50, peRecolhido: -0.30, aberturaAberta: 0.18, aberturaRecolhida: 0.10 };
        const K = MacaModel.poses.ajoelhado || { tronco: 0.45, braco: -0.6, cotovelo: -0.4 };
        r.rLeg.rotation.x = E.coxaAberta * c; r.rLeg.rotation.z = -E.aberturaAberta * c; r.rKnee.rotation.x = E.joelhoAberto * c;
        r.lLeg.rotation.x = E.coxaRecolhida * c; r.lLeg.rotation.z = E.aberturaRecolhida * c; r.lKnee.rotation.x = E.joelhoRecolhido * c;
        if (r.rFoot) r.rFoot.rotation.x = E.peAberto * c;
        if (r.lFoot) r.lFoot.rotation.x = E.peRecolhido * c;
        if (r.pelvis) r.pelvis.rotation.x = 0;
        r.chest.rotation.x = K.tronco * c;
        r.lArm.rotation.x = K.braco * c; r.rArm.rotation.x = K.braco * c;
        if (r.lElbow) r.lElbow.rotation.x = K.cotovelo * c; if (r.rElbow) r.rElbow.rotation.x = K.cotovelo * c;
        if (c > 0.01 && o.jogador && o.jogador.assentarCorpoInteiro) o.jogador.assentarCorpoInteiro();
        else { o.model.position.y = this._base(); this._aterrar(o); }
    },

    /*
    O LESIONADO: `k` 0 = de pe, 1 = sentado no relvado (joelhos para cima), 2 = deitado de costas. De 1 para 2 o corpo inclina para tras em
    torno da bacia (rotation.x do modelo, ordem YXZ: primeiro o rumo, depois a inclinacao) enquanto as pernas esticam — o angulo absoluto da coxa
    fica quase igual, como quem se deita. A bacia fica em `ancora` (x, z do mundo) e o ponto mais baixo do corpo assenta em `apoioY`.
    */
    _poseDoente: function (P, k, ancora, apoioY, yaw) {
        const r = P.rig, S = MacaModel.poses.sentado, D = MacaModel.poses.deitado;
        let theta = 0, anca, joelho, tronco;
        if (k <= 1) { anca = S.anca * k; joelho = S.joelho * k; tronco = S.tronco * k; }
        else { const s = Math.min(1, k - 1); theta = -s * Math.PI / 2; anca = this._lerp(S.anca, D.anca, s); joelho = this._lerp(S.joelho, D.joelho, s); tronco = S.tronco * (1 - s); }
        r.lLeg.rotation.set(anca, 0, 0.05); r.rLeg.rotation.set(anca, 0, -0.05);
        r.lKnee.rotation.x = joelho; r.rKnee.rotation.x = joelho;
        if (r.lFoot) r.lFoot.rotation.x = 0; if (r.rFoot) r.rFoot.rotation.x = 0;
        r.chest.rotation.x = tronco;
        r.lArm.rotation.set(0.05, 0, 0.12); r.rArm.rotation.set(0.05, 0, -0.12);
        if (r.lElbow) r.lElbow.rotation.x = -0.25; if (r.rElbow) r.rElbow.rotation.x = -0.25;
        const m = P.model;
        m.rotation.order = 'YXZ';
        m.rotation.set(theta, yaw, 0);
        m.position.set(ancora.x, apoioY, ancora.z);
        m.updateMatrixWorld(true);
        const v = this._v || (this._v = new THREE.Vector3());
        if (r.pelvis) { r.pelvis.getWorldPosition(v); m.position.x += ancora.x - v.x; m.position.z += ancora.z - v.z; }
        if (P.assentarCorpoInteiro) { P.assentarCorpoInteiro(); m.position.y += apoioY - this._base(); }
        if (P.velocity) P.velocity.set(0, 0, 0);
    },

    // ---------------------------------------------------------------------------------------------
    // API (match_loop.js, match_substituicoes.js, consola)

    // O jogo espera (Match._seguraCobranca) enquanto o lesionado ainda esta na lista do time.
    seguraJogo: function () {
        const P = this.doente;
        if (!P || this.fase === 'parado' || this.tTotal > MacaModel.esperaMax) return false;
        const lista = P.team === 'TeamA' ? Match.players : Match.opponents;
        return !!lista && lista.indexOf(P) >= 0;
    },
    // Este jogador sai na maca (a troca nao o faz andar ate a lateral nem ao banco).
    leva: function (P) { return !!(P && P._naMaca); },
    // A maca ja saiu do campo com ele (ou passou o prazo de seguranca): a troca pode fazer-se.
    foraDoCampo: function (P) { return !!(P && (P._macaFora || (P === this.doente && this.tTotal > MacaModel.esperaMax))); },

    /*
    TESTE MANUAL (consola ou botao): leva `P` (um jogador; sem ele, um da CPU fora do lance) na maca. Pede a troca se ainda nao houver (um
    reserva do papel, urgente — sem aquecimento — e reportada ao manager). Com o jogo a correr (`pararJogo`, por omissao sim) marca-se uma falta para o
    time com a bola, para a maca entrar ja; senao entra na proxima parada. Devolve true se ficou combinado.
    */
    levar: function (P, opcoes) {
        opcoes = opcoes || {};
        if (typeof Match === 'undefined' || !Match.players) return false;
        if (typeof P === 'number' || typeof P === 'string') P = [].concat(Match.players, Match.opponents).find(q => q && q.skills && String(q.skills.id) === String(P)) || null;
        if (!P) P = this._escolherParaTeste();
        if (!P) { console.warn('Maca: nenhum jogador para levar'); return false; }
        const lista = P.team === 'TeamA' ? Match.players : Match.opponents;
        if (lista.indexOf(P) < 0 || P.role === undefined) { console.warn('Maca: o jogador nao esta em campo'); return false; }
        const lado = P.team === 'TeamB' ? 'fora' : 'casa';
        let req = (Match.subsPendentes || []).find(r => !r.feita && r.lado === lado && !r.intervalo && Match._jogadorPorIdManager(lista, r.sai) === P);
        if (!req) {
            if (typeof TreinadorCPU === 'undefined') return false;
            const reserva = TreinadorCPU.escolherReserva(P.team, P.role, P) || TreinadorCPU.escolherReserva(P.team, P.role === 'def' ? 'mid' : 'def', P) ||
                TreinadorCPU.reservasDe(P.team).find(r => r.sk && r.sk.role !== 'gk') || null;
            if (!reserva) { console.warn('Maca: sem reserva para trocar ' + P.pos); return false; }
            const pedido = { lado: lado, sai: String(P.skills && P.skills.id), entra: String(reserva.id), jogador: reserva.sk, _sk: reserva.sk, _reportar: true, urgente: true, _maca: true };
            if (!Match.pedirSubstituicao(pedido)) { console.warn('Maca: a troca nao foi aceite'); return false; }
            req = Match.subsPendentes[Match.subsPendentes.length - 1];
            TreinadorCPU._usados = TreinadorCPU._usados || new Set(); TreinadorCPU._usados.add(reserva.id);
        }
        req._maca = true;
        if (opcoes.pararJogo !== false && Match.state === 'PLAY' && Match.setupSetPiece) {
            const time = Match.ballCarrier ? Match.ballCarrier.team : (P.team === 'TeamA' ? 'TeamB' : 'TeamA');
            Match.setupSetPiece('FREE_KICK', time);
        }
        console.log('Maca: ' + P.team + ' ' + P.pos + ' #' + P.num + ' sai na maca (' + (Match._paradaParaSubstituir() ? 'agora' : 'na proxima parada') + ')');
        return true;
    },
    teste: function () { return this.levar(null, { pararJogo: true }); },

    /*
    BOTAO "Injury" (debug): pedido *"vai simular um jogador com lesao grave: o jogador que estiver com a bola vai cair com contusao grave e vai iniciar a retirada com a
    maca"*. Quem tem a bola (sem ela, o jogador de linha mais perto da bola; nunca o guarda-redes) cai (`iniciarQueda`, a queda das faltas), leva uma lesao COMPLEXA
    no estado Forced (MatchInjuries.aplicar: o departamento medico regista e o manager recebe o aviso `lesao`) e o juiz para o jogo com falta para o time dele
    (quem esta caido nao bate). A maca entra nessa parada (levar). Devolve true se ficou combinado.
    */
    lesaoGrave: function () {
        if (typeof Match === 'undefined' || !Match.players || !Match.ball) return false;
        if (this.emUso()) { console.warn('Maca: ja esta em uso — espera ela voltar ao posto'); return false; }
        let P = Match.ballCarrier;
        if (!P || P.role === 'gk' || !P.model) {
            const b = Match.ball.position;
            P = [].concat(Match.players, Match.opponents).filter(q => q && q.model && q.role !== 'gk' && !q.expulso && !q._naMaca && Match._elegivel(q))
                .sort((a, c) => a.model.position.distanceTo(b) - c.model.position.distanceTo(b))[0] || null;
        }
        if (!P) { console.warn('Maca: nenhum jogador para a lesao grave'); return false; }
        const time = P.team;
        // A lesao: uma das COMPLEXAS (injury_database.js), sempre Forced (sai de maca).
        if (typeof MatchInjuries !== 'undefined' && typeof INJURY_DATABASE !== 'undefined' && !P.lesao) {
            const graves = INJURY_DATABASE.filter(l => l.tipo === 'Complexa');
            const lesao = graves[Math.floor(Math.random() * graves.length)] || INJURY_DATABASE[0];
            try { MatchInjuries.aplicar(P, lesao, 'Forced', 'debug'); } catch (e) { console.warn('Maca: lesao nao registada', e); }
        }
        // Cai (a queda da falta): larga a bola e nao e escolhido para bater a falta.
        if (Match.ballCarrier === P) Match.ballCarrier = null;
        P.hasBall = false;
        if (typeof P.iniciarQueda === 'function') P.iniciarQueda(null);
        // O jogo para ja: falta para o time do lesionado (a bola era dele), no sitio da bola.
        if (Match.state === 'PLAY' && Match.setupSetPiece) Match.setupSetPiece('FREE_KICK', time);
        // O TIME DO UTILIZADOR nao troca sozinho (como numa lesao a serio): o jogador fica INJ no manager e a maca entra quando o treinador fizer a troca
        // (sem trocas possiveis, entra ja e o time fica com menos um — ver _procurarDoente).
        const doUtilizador = Match.ladoDoUtilizador && (time === 'TeamB' ? 'fora' : 'casa') === Match.ladoDoUtilizador;
        if (doUtilizador) { console.log('Maca: lesao grave no time do utilizador (' + P.pos + ' #' + P.num + '): espera a troca do treinador'); return true; }
        const ok = this.levar(P, { pararJogo: false });
        console.log('Maca: lesao grave em ' + time + ' ' + P.pos + ' #' + P.num + (P.lesao && P.lesao.reg ? ' (' + P.lesao.reg.nomeLesao + ')' : ''));
        return ok;
    },

    // Para o teste: um jogador de linha da CPU (o time que nao e do utilizador), fora do lance, o mais longe da bola (nao esta na barreira).
    _escolherParaTeste: function () {
        const time = Match.ladoDoUtilizador === 'fora' ? Match.players : Match.opponents;
        const b = Match.ball ? Match.ball.position : { x: 0, z: 0 };
        const cand = (time || []).filter(p => p && p.role !== 'gk' && p.model && Match._elegivel(p) && !p._naMaca);
        cand.sort((a, c) => Math.hypot(c.model.position.x - b.x, c.model.position.z - b.z) - Math.hypot(a.model.position.x - b.x, a.model.position.z - b.z));
        return cand[0] || null;
    },

    // ---------------------------------------------------------------------------------------------
    // O FRAME (chamado do Match.update, depois das trocas e das lesoes)
    update: function (dt) {
        if (!this._podeDesenhar()) return;
        if (!this.grupo || this._cena !== Match.scene || !this.grupo.parent) { if (!this._construir(Match.scene)) return; }
        if (this.fase === 'parado') {
            if (this.medico) this._tickMedico(dt);
            if (!this.medico) this._procurarDoente();
            if (this.fase === 'parado') return;
        }
        this.t += dt; this.tTotal += dt;
        if (!this._doenteValido()) { this._abortar(); return; }
        const M = MacaModel;
        switch (this.fase) {
            case 'aguardaMedico': {
                // Os maqueiros esperam de pe no posto; o medico avalia (fase 'atender' do _tickMedico) e ao fim de `tAvaliar` s chama a maca.
                for (const o of this.maqueiros) this._passada(o, 0, dt);
                const med = this.medico;
                if (!med || !med.o) { this._mudar('pegar'); break; }
                if (med.fase === 'atender') this._tAvaliou += dt;
                if (this._tAvaliou >= (M.tAvaliar || 3.0) || this.t > (M.esperaMedicoMax || 30)) {
                    console.log('Maca: o medico chama a maca' + (med.nome ? ' (' + med.nome + ')' : ''));
                    this._mudar('pegar');
                }
                break;
            }
            case 'pegar': {
                let todos = true;
                for (const o of this.maqueiros) {
                    const q = M.pegas[o.k], w = this._mundo(q.l, q.a);
                    if (Math.hypot(w.x - o.model.position.x, w.z - o.model.position.z) > 0.12 && this.t < 5) { Match._andar(o, w.x, w.z, 3.0, dt); todos = false; }
                    else { o.model.position.x = w.x; o.model.position.z = w.z; o.model.rotation.y += this._wrap(this.pose.h - o.model.rotation.y) * Math.min(1, dt * 8); this._passada(o, 0, dt); }
                }
                if (todos) this._mudar('erguer', 'indo');
                break;
            }
            case 'erguer': case 'pousar': {
                const dur = 2 * (this.fase === 'erguer' ? M.tPegar : M.tPousar);
                const u = Math.min(1, this.t / dur);
                let c, y;
                if (this.fase === 'erguer') { c = u < 0.5 ? u * 2 : (1 - u) * 2; y = u < 0.5 ? this._yChao() : this._lerp(this._yChao(), this._yLevar(), (u - 0.5) * 2); }
                else { c = u < 0.5 ? u * 2 : (1 - u) * 2; y = u < 0.5 ? this._lerp(this._yLevar(), this._yChao(), u * 2) : this._yChao(); }
                this.pose.y = y;
                this._colocarMaca();
                for (const o of this.maqueiros) {
                    const q = M.pegas[o.k], w = this._mundo(q.l, q.a);
                    o.model.position.x = w.x; o.model.position.z = w.z; o.model.rotation.set(0, this.pose.h, 0);
                    this._agachar(o, c);
                    this._bracosDaPega(o, c);
                }
                if (u >= 1) {
                    if (this.fase === 'erguer' && this._seguinte === 'levando') this._comecarLevar();
                    else this._mudar(this._seguinte);
                }
                break;
            }
            case 'indo':
                if (this._seguir(this._wps, M.velIr, dt)) this._mudar('pousar', 'deitar');
                this._equipaEmFormacao(dt);
                break;
            case 'deitar': {
                const s = Math.min(1, this.t / M.tDeitar);
                this._kDoente = 1 + s;
                const cama = this._mundo(0, M.zBacia);
                const anc = { x: this._lerp(this._ancoraChao.x, cama.x, s), z: this._lerp(this._ancoraChao.z, cama.z, s) };
                this._poseDoente(this.doente, this._kDoente, anc, this._lerp(this._base(), this.pose.y + this._topoLona, Math.min(1, s * 1.6)), this.pose.h);
                for (const o of this.maqueiros) { this._passada(o, 0, dt); this._bracosDaPega(o); }
                if (s >= 1) { this._kDoente = 2; this._naMacaAgora = true; this._mudar('erguer', 'levando'); }
                break;
            }
            case 'levando': {
                const fim = this._seguir(this._wps, M.velLevar, dt);
                this._equipaEmFormacao(dt);
                // Fora do campo: a troca (match_substituicoes.js) pode fazer-se e o jogo recomeca.
                if (!this.doente._macaFora && Math.abs(this.pose.x) >= this._foraX) {
                    this.doente._macaFora = true; this._marcar('fora_do_campo');
                    // Sem troca: fora do campo, sai da lista ja (o jogo recomeca com menos um; a maca segue para o tunel com ele).
                    if (this.req && this.req._semTroca) {
                        const P = this.doente, lista = P.team === 'TeamA' ? Match.players : Match.opponents, i = lista ? lista.indexOf(P) : -1;
                        if (i >= 0) { P.indiceNaFormacao = i; lista.splice(i, 1); if (Match.esquecerJogadoresAntigos) Match.esquecerJogadoresAntigos([P]); console.warn('Maca: ' + P.team + ' ' + P.pos + ' saiu sem troca possivel (ficam ' + lista.length + ')'); }
                    }
                }
                if (fim) this._entregar();
                break;
            }
            case 'voltando':
                if (this._seguir(this._wps, M.velVoltar, dt)) this._mudar('pousar', 'arrumar');
                this._equipaEmFormacao(dt);
                break;
            case 'arrumar': {
                let todos = true;
                M.parados.forEach((q, k) => {
                    const o = this.maqueiros[k], w = this._mundo(q.l, q.a);
                    if (Math.hypot(w.x - o.model.position.x, w.z - o.model.position.z) > 0.12 && this.t < 6) { Match._andar(o, w.x, w.z, 1.6, dt); todos = false; }
                    else { o.model.position.x = w.x; o.model.position.z = w.z; o.model.rotation.y += this._wrap(this.pose.h - o.model.rotation.y) * Math.min(1, dt * 6); this._passada(o, 0, dt); }
                });
                if (todos) { this._noPosto(); this.doente = null; this.req = null; this._marcar('parado'); }
                break;
            }
        }
        // O lesionado na maca segue-a (e antes dela chegar fica sentado no relvado).
        if (this.doente && !this._entregue) {
            if (this._naMacaAgora) this._poseDoente(this.doente, 2, this._mundo(0, M.zBacia), this.pose.y + this._topoLona, this.pose.h);
            else if (this.fase !== 'deitar') {
                this._kDoente = Math.min(1, this._kDoente + dt / M.tSentar);
                this._poseDoente(this.doente, this._kDoente, this._ancoraChao, this._base(), this._yawDoente);
            }
        }
        if (this.medico) this._tickMedico(dt);
        // Quem esta no caminho da maca afasta-se (ver _abrirCaminho).
        if (this.fase === 'indo' || this.fase === 'levando' || this.fase === 'voltando') this._desviar(dt);
        if (this.fase !== 'parado' && this.fase !== 'aguardaMedico') this._abrirCaminho(dt);
        // Os pes no chao tambem quando andam com o passo dos oficiais (Match._andar: a caminho das pegas, o medico a ir e a acompanhar); ver _aterrar.
        for (const o of this.maqueiros) this._aterrar(o);
        if (this.medico && this.medico.o && ['ir', 'acompanhar'].indexOf(this.medico.fase) >= 0) this._aterrar(this.medico.o);
    },

    _mudar: function (fase, seguinte) {
        this.fase = fase; this.t = 0;
        if (seguinte !== undefined) this._seguinte = seguinte;
        this._marcar(fase);
    },
    _marcar: function (nome) { this.fases.push(nome); },

    /*
    A CAMERA DA MACA (pedido: *"quando o pessoal da maca entrar, a camera deve ir para eles ate retirarem o jogador do campo; depois volta para a bola"*). Ligada do
    momento em que o medico entra ate o lesionado sair do campo (`_macaFora`); depois a camera do utilizador volta sozinha (o modo nao muda). Ver Match.updateCamera.
    Enquadra o lesionado e o medico (antes da maca chegar) ou a maca, de cima e do lado do campo, com um seguimento suave.
    */
    /*
    O CAMINHO DA MACA ABRE-SE (relato: *"os maqueiros estao passando por dentro de alguns jogadores"*). Quem esta a menos de `afastar.raio` m de um maqueiro, ou dentro
    da faixa da maca (o retangulo entre os quatro, com `afastar.folga` m de folga), e empurrado para fora, na direccao de quem o afasta, a `afastar.vel` m/s — como
    quem da um passo para o lado. Os jogadores (das duas equipas, menos o lesionado) e o medico. O jogador fica onde foi empurrado; a montagem da bola parada leva-o
    depois ao seu lugar.
    */
    /*
    A MACA CONTORNA QUEM ESTA PARADO A FRENTE. Os jogadores postos no lugar da bola parada (SET_PIECE_WAIT) voltam ao lugar todos os frames, e empurra-los nao chega
    (medido: 17 frames de um maqueiro a menos de 0.5 m de um RM parado). Quem esta na faixa a frente da maca (de `desvio.atras` a `desvio.frente` m, ate `desvio.largura`
    m do eixo) faz a maca andar para o lado contrario, a `desvio.vel` m/s; o caminho (o `_seguir`, que aponta sempre ao ponto seguinte) traz a maca de volta depois.
    */
    _desviar: function (dt) {
        const D = MacaModel.desvio || { frente: 5.0, atras: 1.0, largura: 2.0, vel: 2.5 };
        const h = this.pose.h, fx = Math.sin(h), fz = Math.cos(h), lx = Math.cos(h), lz = -Math.sin(h);
        let empurra = 0;
        for (const q of [].concat(Match.players || [], Match.opponents || [])) {
            if (!q || !q.model || q === this.doente || q.expulso || q.foraDeCampo) continue;
            const dx = q.model.position.x - this.pose.x, dz = q.model.position.z - this.pose.z;
            const a = dx * fx + dz * fz, l = dx * lx + dz * lz;
            if (a < -D.atras || a > D.frente || Math.abs(l) > D.largura) continue;
            // Mais perto (a frente e do eixo), mais forte; foge para o lado oposto ao dele.
            const peso = (1 - Math.abs(l) / D.largura) * (1 - Math.max(0, a) / D.frente);
            empurra += (l >= 0 ? -1 : 1) * peso;
        }
        if (Math.abs(empurra) < 1e-3) return;
        const passo = THREE.MathUtils.clamp(empurra, -1, 1) * D.vel * dt;
        this.pose.x += lx * passo; this.pose.z += lz * passo;
        this._colocarMaca();
    },

    _abrirCaminho: function (dt) {
        const A = MacaModel.afastar || { raio: 1.1, folga: 0.6, vel: 3.5 };
        const h = this.pose.h, fx = Math.sin(h), fz = Math.cos(h), lx = Math.cos(h), lz = -Math.sin(h);
        const meioComp = (MacaModel.maca && MacaModel.maca.comprimento ? MacaModel.maca.comprimento / 2 : 1.1) + 0.6, meioLarg = 0.9 + A.folga;
        const outros = [].concat(Match.players || [], Match.opponents || []).filter(q => q && q.model && q !== this.doente && !q.expulso && !q.foraDeCampo);
        for (const q of outros) {
            const p = q.model.position;
            let ex = 0, ez = 0;
            // Dentro da faixa da maca (no referencial dela): sai pelo lado mais perto.
            const dx = p.x - this.pose.x, dz = p.z - this.pose.z;
            const a = dx * fx + dz * fz, l = dx * lx + dz * lz;
            if (Math.abs(a) < meioComp && Math.abs(l) < meioLarg) { const s = (l >= 0 ? 1 : -1); ex += lx * s; ez += lz * s; }
            // Perto de um maqueiro: afasta-se dele.
            for (const o of this.maqueiros) {
                const mx = p.x - o.model.position.x, mz = p.z - o.model.position.z, d = Math.hypot(mx, mz);
                if (d < A.raio && d > 1e-4) { ex += mx / d; ez += mz / d; }
            }
            const n = Math.hypot(ex, ez);
            if (n < 1e-4) continue;
            const passo = A.vel * dt;
            p.x += ex / n * passo; p.z += ez / n * passo;
            if (q.dynamicTarget && q.dynamicTarget.distanceTo && q.dynamicTarget.distanceTo(p) < 0.8) q.dynamicTarget.set(p.x, q.dynamicTarget.y, p.z);
        }
    },

    // A maca esta a ser usada (de quando o medico sai ate voltarem ao posto): sem outra lesao seria entretanto (MatchInjuries.aplicar).
    emUso: function () { return this.fase !== 'parado' || !!this.doente; },

    cameraAtiva: function () {
        if (!this.doente || this._entregue || this.fase === 'parado' || this.fase === 'voltando' || this.fase === 'arrumar') return false;
        return !this.doente._macaFora;
    },
    camera: function (pos, look) {
        /*
        O ENQUADRAMENTO (pedido: *"a camera tem que focar no lance com os maqueiros vindo ate eles no fundo e depois seguir os maqueiros ate sairem de campo; quando o
        medico entrar tambem: foca no jogador com o medico vindo ate ele no fundo"*):
          . a chegar (o medico, depois a maca): a camera fica do OUTRO lado do lesionado em relacao a quem vem, e olha para ele — quem vem aparece no fundo, a
            aproximar-se. Com quem vem ja perto (< `perto` m) a direccao fica a ultima, para a camera nao dar a volta.
          . com ele na maca: segue os maqueiros, atras e ao lado da maca, a olhar um pouco a frente dela.
        */
        const C = MacaModel.camera;
        const ancora = this._ancoraChao || { x: this.pose.x, z: this.pose.z };
        const naMaca = this.fase === 'levando' || this._naMacaAgora || this.fase === 'deitar';
        let alvoPos, alvoLook;
        if (!naMaca) {
            const med = this.medico;
            const vem = (this.fase === 'aguardaMedico' && med && med.o) ? med.o.model.position : { x: this.pose.x, z: this.pose.z };
            let ux = ancora.x - vem.x, uz = ancora.z - vem.z; const d = Math.hypot(ux, uz);
            if (d > C.perto || !this._camDir) { const n = d || 1; this._camDir = { x: ux / n, z: uz / n }; }
            const u = this._camDir;
            alvoPos = { x: ancora.x + u.x * C.distancia, y: C.altura, z: ancora.z + u.z * C.distancia };
            alvoLook = { x: ancora.x - u.x * C.adiante, y: C.alvoAltura, z: ancora.z - u.z * C.adiante };
        } else {
            const h = this.pose.h, fx = Math.sin(h), fz = Math.cos(h), lx = Math.cos(h), lz = -Math.sin(h);
            alvoPos = { x: this.pose.x - fx * C.seguirAtras + lx * C.seguirLado, y: C.seguirAltura, z: this.pose.z - fz * C.seguirAtras + lz * C.seguirLado };
            alvoLook = { x: this.pose.x + fx * 3, y: C.alvoAltura, z: this.pose.z + fz * 3 };
        }
        // Mantem-se dentro do estadio (nao atravessa as bancadas).
        alvoPos.x = THREE.MathUtils.clamp(alvoPos.x, -(CAMPO_LARG / 2 + 10), CAMPO_LARG / 2 + 10);
        alvoPos.z = THREE.MathUtils.clamp(alvoPos.z, -(CAMPO_COMP / 2 + 8), CAMPO_COMP / 2 + 8);
        const k = C.suave;
        if (!this._cam || this._camFresca) { this._cam = { x: alvoPos.x, y: alvoPos.y, z: alvoPos.z, lx: alvoLook.x, ly: alvoLook.y, lz: alvoLook.z }; this._camFresca = false; }
        const c = this._cam;
        c.x += (alvoPos.x - c.x) * k; c.y += (alvoPos.y - c.y) * k; c.z += (alvoPos.z - c.z) * k;
        c.lx += (alvoLook.x - c.lx) * k * 1.5; c.ly += (alvoLook.y - c.ly) * k * 1.5; c.lz += (alvoLook.z - c.lz) * k * 1.5;
        pos.set(c.x, c.y, c.z);
        look.set(c.lx, c.ly, c.lz);
    },

    // Numa parada, uma troca pendente de um lesionado que tem de sair (ou marcada por `levar`), com ele fora do lance: comeca.
    _procurarDoente: function () {
        if (!Match._paradaParaSubstituir || !Match._paradaParaSubstituir() || Match.disputa) return;
        for (const req of (Match.subsPendentes || [])) {
            if (req.feita || req.intervalo || req.estado === 'voltar') continue;
            const lista = Match._equipaDoLado(req.lado);
            const P = Match._jogadorPorIdManager(lista, req.sai);
            if (!P || !P.model || !P.rig || P._naMaca) continue;
            const precisa = req._maca || (P.lesao && P.lesao.estado && P.lesao.estado !== 'Hurt');
            if (!precisa || !Match._elegivel(P)) continue;
            this._comecar(P, req);
            return;
        }
        /*
        SEM TROCA POSSIVEL (sem reserva do papel, ou o limite de trocas ja usado — no time do utilizador tambem): quem tem de sair (Forced) sai na maca na mesma e o
        time fica com menos um (como numa expulsao). Com trocas, o time do utilizador espera pela troca do treinador (o jogador fica INJ no manager, aviso `lesao`).
        */
        for (const P of [].concat(Match.players || [], Match.opponents || [])) {
            const L = P && P.lesao;
            if (!L || L.estado !== 'Forced' || P._naMaca || !P.model || !P.rig || !Match._elegivel(P)) continue;
            const lado = P.team === 'TeamB' ? 'fora' : 'casa';
            if ((Match.subsPendentes || []).some(r => !r.feita && r.lado === lado && Match._jogadorPorIdManager(Match._equipaDoLado(lado), r.sai) === P)) continue;
            const semTrocas = typeof MatchInjuries !== 'undefined' && MatchInjuries._trocasDoLado(lado) >= MatchInjuries.maxTrocas;
            if (!(L.troca === 'sem_trocas' || L.troca === 'sem_reserva' || (L.troca === 'manual' && semTrocas))) continue;
            this._comecar(P, { lado: lado, sai: String(P.skills && P.skills.id), _maca: true, _semTroca: true, feita: false });
            return;
        }
    },

    _comecar: function (P, req) {
        const M = MacaModel, T = TunelJogadores, lado = this._lado(), f = -lado;
        this.doente = P; this.req = req; this.fases = [];
        this._entregue = false; this._naMacaAgora = false; this._kDoente = 0; this.tTotal = 0;
        req._maca = true;
        // Sem aquecimento: o reserva que ainda aquecia vai ja para o ponto de espera (o mesmo salto das varias trocas na mesma parada).
        req.urgente = true;
        if ((req.estado === 'aquecer' || req.estado === 'levantar') && req.idxEspera !== undefined && req.passo < req.idxEspera) { req.passo = req.idxEspera; req.t = 0; }
        // O lesionado para: o Player.update deixa-o quieto (subSaindo, como quem sai numa troca) e senta-se no relvado.
        P._naMaca = true; P._macaFora = false;
        P.subSaindo = true; P.hasBall = false; P.actionState = null; P.queda = null; P.voltaDaQueda = null; P.lugarBolaParada = null;
        if (P.velocity) P.velocity.set(0, 0, 0);
        if (Match.ballCarrier === P) Match.ballCarrier = null;
        if (P.fsm) P.fsm.changeState('IDLE');
        if (P.resetBonesToDefault) P.resetBonesToDefault();
        if (P.discoTatico) P.discoTatico.visible = false;
        P.model.traverse(o => { if (o.name === 'BlobSombra') o.visible = false; });
        P.model.updateMatrixWorld(true);
        const v = new THREE.Vector3();
        if (P.rig.pelvis) P.rig.pelvis.getWorldPosition(v); else v.copy(P.model.position);
        this._ancoraChao = { x: v.x, z: v.z };
        // O caminho para o tunel (o do expulso, Officials.iniciarSaidaExpulso): o vao da placa em frente a boca, a boca, dentro.
        const zf = THREE.MathUtils.clamp(v.z, -M.zTunel, M.zTunel);
        /*
        SAI PELA LATERAL MAIS PROXIMA, a direito: o jogo recomeca mais cedo (atravessar o campo na diagonal com a maca segurava-o 30 s ou mais). Depois
        segue por fora do campo, na faixa entre a linha e as placas, ate ao vao do tunel; da metade oposta da a volta por tras da baliza mais proxima.
        */
        const longe = lado * v.x < 0;
        const xLonge = -lado * (CAMPO_LARG / 2 + M.faixaLonge), xPerto = lado * (CAMPO_LARG / 2 + M.faixaPerto);
        const zFundo = (Math.sign(v.z) || 1) * (CAMPO_COMP / 2 + M.faixaFundo);
        this._saida = (longe ? [{ x: xLonge, z: v.z }, { x: xLonge, z: zFundo }, { x: xPerto, z: zFundo }, { x: xPerto, z: zf }] : [{ x: xPerto, z: v.z }, { x: xPerto, z: zf }])
            .concat([{ x: T.xBoca + f * 3.0, z: zf }, { x: T.xFundo + f * 0.9, z: zf }]);
        this._iBoca = this._saida.length - 2;   // o medico acompanha ate a boca do tunel
        this._foraX = CAMPO_LARG / 2 + (longe ? M.faixaLonge : M.faixaPerto) - 0.1;   // no centro da faixa os maqueiros de tras ja pisaram fora
        const dx = this._saida[0].x - v.x, dz = this._saida[0].z - v.z;
        const H = Math.hypot(dx, dz) > 1 ? Math.atan2(dx, dz) : Math.atan2(lado, 0);
        this._yawDoente = H;   // sentado de frente para o tunel: deitado, os pes vao a frente
        // A maca pousa-se ao lado dele (ele fica a -ladoDoDoente no referencial dela), com o rumo do tunel.
        const c = Math.cos(H), s = Math.sin(H);
        const lv = { x: c, z: -s }, fw = { x: s, z: c };
        const C = { x: v.x + lv.x * M.ladoDoDoente - fw.x * M.zBacia, z: v.z + lv.z * M.ladoDoDoente - fw.z * M.zBacia };
        const C2 = { x: C.x + lv.x * 1.5, z: C.z + lv.z * 1.5 };   // a curva faz-se aqui, longe dele; a ultima perna e de lado
        const zg = THREE.MathUtils.clamp(C2.z, -1.4, 1.4);
        const posto = this._posto();
        this._wps = [
            { x: posto.x, z: zg, h: this._hPosto() },                 // de lado, atras das placas, ate a frente do vao do tunel
            { x: lado * (CAMPO_LARG / 2 + 1.5), z: zg },              // pelo vao, ate a faixa da lateral
            { x: C2.x, z: C2.z },
            { x: C.x, z: C.z, h: H }
        ];
        this._iw = 0;
        // O medico do time.
        this.medico = this._prepararMedico(P, { x: C.x - lv.x * (M.ladoDoDoente + M.ladoMedico) + fw.x * M.zBacia, z: C.z - lv.z * (M.ladoDoDoente + M.ladoMedico) + fw.z * M.zBacia });
        const nomeMedico = this.medico && this.medico.nome ? ' com o medico ' + this.medico.nome : '';
        /*
        O MEDICO ENTRA PRIMEIRO (pedido: *"o medico deve entrar primeiro, avalia o jogador durante 3 s e chama a maca"*): os maqueiros esperam no posto
        (`aguardaMedico`) ate o medico estar ha `tAvaliar` s agachado ao lado dele; sem medico, vao logo.
        */
        console.log('Maca: o medico' + (this.medico && this.medico.nome ? ' ' + this.medico.nome : '') + ' vai avaliar ' + P.team + ' ' + P.pos + ' #' + P.num);
        this._tAvaliou = 0;
        this._camFresca = true; this._camDir = null;
        this._mudar(this.medico ? 'aguardaMedico' : 'pegar');
    },

    // O lesionado ainda e deste jogo (nao veio um Match.init no meio)?
    _doenteValido: function () {
        const P = this.doente;
        if (!P) return true;
        if (this._entregue) return true;
        const lista = P.team === 'TeamA' ? Match.players : Match.opponents;
        if (lista && lista.indexOf(P) >= 0) return true;
        return (Match.subsFeitas || []).some(s => s.sai === P);
    },

    // Interrompida (jogo reiniciado): tudo volta ao sitio de uma vez.
    _abortar: function () {
        const P = this.doente;
        if (P) { P._naMaca = false; P._macaFora = true; if (P.model) P.model.rotation.order = 'XYZ'; }
        this._largarMedico(true);
        this._noPosto();
        this.doente = null; this.req = null; this._entregue = false; this._naMacaAgora = false;
        this._marcar('abortado');
    },

    // Ja na maca: o caminho do tunel.
    _comecarLevar: function () {
        this._wps = this._saida; this._iw = 0;
        this._mudar('levando');
    },

    // Dentro do tunel: ele some. Se ainda nao foi trocado (a troca nao chegou a fazer-se), sai da lista como um expulso — nunca fica em campo invisivel.
    _entregar: function () {
        const P = this.doente, M = MacaModel, T = TunelJogadores, lado = this._lado(), f = -lado;
        this._entregue = true; this._naMacaAgora = false;
        if (P) {
            P._macaFora = true;
            P.model.visible = false; P.foraDeCampo = true;
            P.model.rotation.order = 'XYZ';
            if (P.discoTatico) P.discoTatico.visible = false;
            const lista = P.team === 'TeamA' ? Match.players : Match.opponents;
            const i = lista ? lista.indexOf(P) : -1;
            if (i >= 0 && !(Match.subsPendentes || []).some(r => !r.feita && r === this.req)) {
                lista.splice(i, 1);
                if (Match.esquecerJogadoresAntigos) Match.esquecerJogadoresAntigos([P]);
                console.warn('Maca: ' + P.pos + ' saiu sem troca (ficam ' + lista.length + ')');
            }
        }
        this._marcar('no_tunel');
        const zf = this._saida[this._saida.length - 1].z, posto = this._posto();
        this._wps = [{ x: T.xBoca + f * 3.0, z: zf }, { x: posto.x, z: 2.2 }, { x: posto.x, z: posto.z, h: this._hPosto() }];
        this._iw = 0;
        this._mudar('voltando');
    },

    /*
    A maca anda pelos pontos `wps`; num ponto com `h` vira primeiro para esse rumo e depois vai de lado/de frente sem rodar. Nos outros, vira para
    onde vai (parada, se o desvio for grande: os maqueiros contornam) e anda. Devolve true no fim.
    */
    _seguir: function (wps, vel, dt) {
        const p = this.pose, rot = MacaModel.velRotacao * dt;
        while (this._iw < wps.length) {
            const w = wps[this._iw];
            const dx = w.x - p.x, dz = w.z - p.z, d = Math.hypot(dx, dz);
            const travado = typeof w.h === 'number';
            const hAlvo = travado ? w.h : (d > 0.5 ? Math.atan2(dx, dz) : p.h);
            const dh = this._wrap(hAlvo - p.h);
            if (d < 0.06 && (!travado || Math.abs(dh) < 0.03)) { if (travado) p.h = w.h; p.x = w.x; p.z = w.z; this._iw++; continue; }
            p.h = this._wrap(p.h + THREE.MathUtils.clamp(dh, -rot, rot));
            if (d >= 0.06 && Math.abs(dh) < (travado ? 0.1 : 0.6)) {
                const passo = Math.min(d, vel * dt);
                p.x += dx / d * passo; p.z += dz / d * passo;
            }
            return false;
        }
        return true;
    },

    // Os 4 nas pegas da maca (posicao imposta), com a passada da velocidade a que cada um anda de facto.
    _equipaEmFormacao: function (dt) {
        this._colocarMaca();
        for (const o of this.maqueiros) {
            const q = MacaModel.pegas[o.k], w = this._mundo(q.l, q.a);
            const vel = dt > 0 ? Math.hypot(w.x - o.model.position.x, w.z - o.model.position.z) / dt : 0;
            o.model.position.x = w.x; o.model.position.z = w.z;
            o.model.rotation.set(0, this.pose.h, 0);
            this._passada(o, Math.min(vel, 6), dt);
            this._bracosDaPega(o);
        }
    },

    // ---------------------------------------------------------------------------------------------
    // O MEDICO
    _prepararMedico: function (P, alvo) {
        const lado = this._lado(), team = P.team;
        const info = team === 'TeamA' ? Match.equipaInfoA : Match.equipaInfoB;
        const dados = (info && info.medico) || (typeof MatchInjuries !== 'undefined' && MatchInjuries._medicos ? MatchInjuries._medicos[team] : null);
        const nome = dados && dados.nome ? dados.nome : null;
        let o = null, banco = null, casa = null, ida, volta;
        if (typeof Bancos !== 'undefined' && Bancos.bancos) {
            banco = Bancos.bancos.find(b => b.equipa === (team === 'TeamA' ? 'A' : 'B')) || null;
            const s = banco && (banco.staff || []).find(q => q.funcao === 'medico');
            if (s && s.model && s.model.parent) {
                o = s;
                casa = { x: s.model.position.x, z: s.model.position.z, rot: s.model.rotation.y };
                // Levanta-se do banco (como o preparador em Match._tickPreparador).
                if (Bancos.descongelar) Bancos.descongelar(s);
                const r = s.rig;
                r.lLeg.rotation.set(0, 0, 0); r.rLeg.rotation.set(0, 0, 0); r.lKnee.rotation.set(0, 0, 0); r.rKnee.rotation.set(0, 0, 0);
                r.chest.rotation.x = 0;
                if (typeof s.pelvisY0 === 'number') r.pelvis.position.y = s.pelvisY0;
                s.model.position.y = 0; s.animTimer = 0; s.velAnim = 0; s.paradoNoAlvo = true;
                ida = [{ x: lado * 41.0, z: casa.z }, { x: lado * 37.0, z: banco.zc }, alvo];
                volta = [{ x: lado * 41.0, z: casa.z }, { x: casa.x, z: casa.z }];
            } else banco = null;
        }
        if (!o) {
            o = this._medicoSemBanco(team);
            if (!o) return null;
            casa = { x: o._casa.x, z: o._casa.z, rot: o._casa.rot };
            const zg = Math.sign(MacaModel.medicoSemBanco.z) * 1.4;
            ida = [{ x: lado * 40.0, z: zg }, { x: lado * (CAMPO_LARG / 2 + 1.5), z: zg }, alvo];
            volta = [{ x: casa.x, z: casa.z }];
        }
        return { o: o, banco: banco, casa: casa, ida: ida, volta: volta, i: 0, fase: 'ir', c: 0, t: 0, nome: nome, perto: Infinity };
    },

    // Sem banco (3D solto, testes): um medico de reserva por time, de pe junto ao posto da maca.
    _medicoSemBanco: function (team) {
        let m = this._medicosSemBanco[team];
        if (m && m.model && m.model.parent === this._cena) return m;
        const S = MacaModel.medicoSemBanco, lado = this._lado();
        let feito = null;
        try { feito = Officials.criarCorpo(team === 'TeamA' ? 975 : 976, '#f1f3f5', '#1b2a4a', true, false, undefined, true); } catch (e) { return null; }
        if (typeof Bancos !== 'undefined' && Bancos._vestirPano) { try { Bancos._vestirPano(feito, 0x1b2a4a); } catch (e) { /* calcao */ } }
        const casa = { x: lado * S.x, z: S.z + (team === 'TeamA' ? -S.passo / 2 : S.passo / 2), rot: Math.atan2(-lado, 0) };
        feito.corpo.position.set(casa.x, this._base(), casa.z);
        feito.corpo.rotation.set(0, casa.rot, 0);
        this._cena.add(feito.corpo);
        m = { model: feito.corpo, rig: feito.rig, jogador: feito.jogador, animTimer: 0, velAnim: 0, _casa: casa, semBanco: true };
        this._medicosSemBanco[team] = m;
        return m;
    },

    // Anda pelos pontos do caminho (Match._andar: o mover dos oficiais com o avanco garantido). true no fim.
    _caminho: function (med, pts, vel, dt) {
        const o = med.o;
        while (med.i < pts.length) {
            const w = pts[med.i];
            if (Math.hypot(w.x - o.model.position.x, w.z - o.model.position.z) < 0.3) { med.i++; continue; }
            Match._andar(o, w.x, w.z, vel, dt);
            return false;
        }
        return true;
    },

    _tickMedico: function (dt) {
        const med = this.medico, M = MacaModel;
        if (!med || !med.o) { this.medico = null; return; }
        const o = med.o, P = this.doente;
        med.t += dt;
        if (P && P.model && !this._entregue) med.perto = Math.min(med.perto, Math.hypot(this._ancoraChao.x - o.model.position.x, this._ancoraChao.z - o.model.position.z));
        if (med.fase === 'ir') {
            if (this._caminho(med, med.ida, M.velMedico, dt) || med.t > 40) { med.fase = 'atender'; med.c = 0; }
        } else if (med.fase === 'atender') {
            // Agachado ao lado dele, virado para ele, ate a maca o levantar.
            const alvo = this._naMacaAgora ? this._mundo(0, M.zBacia) : this._ancoraChao;
            const ang = Math.atan2(alvo.x - o.model.position.x, alvo.z - o.model.position.z);
            o.model.rotation.y += this._wrap(ang - o.model.rotation.y) * Math.min(1, dt * 6);
            med.c = Math.min(1, med.c + dt / 0.5);
            if (this.fase === 'levando' || this._entregue) { med.fase = 'acompanhar'; }
            this._ajoelhar(o, med.c);
        } else if (med.fase === 'acompanhar') {
            if (med.c > 0) { med.c = Math.max(0, med.c - dt / 0.4); this._ajoelhar(o, med.c); return; }
            // Ao lado da maca, do lado de onde o atendeu; na boca do tunel larga-a e volta.
            const w = this._mundo(-M.medico.l, M.medico.a);
            const d = Math.hypot(w.x - o.model.position.x, w.z - o.model.position.z);
            if (d > 0.35) Match._andar(o, w.x, w.z, M.velLevar * 1.8, dt);
            else {
                const vel = dt > 0 ? d / dt : 0;
                o.model.position.x = w.x; o.model.position.z = w.z;
                o.model.rotation.y += this._wrap(this.pose.h - o.model.rotation.y) * Math.min(1, dt * 6);
                this._passada(o, Math.min(vel, 4), dt);
            }
            if (this._entregue || (this.fase === 'levando' && this._iw > this._iBoca)) { med.fase = 'voltar'; med.i = 0; }
        } else if (med.fase === 'voltar') {
            if (this._caminho(med, med.volta, 2.6, dt) || med.t > 120) this._largarMedico(false);
        }
    },

    // De volta ao lugar: senta-se no banco (ou fica de pe no posto de reserva).
    _largarMedico: function (jaJa) {
        const med = this.medico;
        this.medico = null;
        if (!med || !med.o) return;
        const o = med.o, c = med.casa;
        o.model.position.set(c.x, this._base(), c.z);
        if (o.rig) { o.rig.lArm.rotation.set(0, 0, 0); o.rig.rArm.rotation.set(0, 0, 0); }
        if (med.banco && typeof Bancos !== 'undefined' && Bancos._sentar) {
            Bancos._sentar(o);
            o.model.rotation.set(0, c.rot, 0);
            if (Bancos.congelar) Bancos.congelar(o);
        } else {
            if (o.jogador && o.jogador.resetBonesToDefault) o.jogador.resetBonesToDefault();
            o.model.rotation.set(0, c.rot, 0);
        }
        this._marcar(jaJa ? 'medico_reposto' : 'medico_voltou');
    }
};
if (typeof window !== 'undefined') window.Maca = Maca;
