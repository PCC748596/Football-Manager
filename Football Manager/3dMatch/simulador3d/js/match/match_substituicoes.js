/*
=============================================================================
SUBSTITUICOES NO 3D
=============================================================================
O treinador mexe na aba Tactics (SUBSTITUTOS): o manager manda `substituicao { lado, sai, entra, jogador }` (ver Ponte e GameContext.updateTactics) e o pedido entra
na fila (`Match.subsPendentes`). Cada pedido percorre, no reserva e no 4.o arbitro (js/officials_quarto.js):

    levantar -> aquecer -> espera -> pronto -> (numa PARADA do jogo) placa -> sai -> voltar

  . levantar / aquecer: o reserva sai do banco, vai a lateral e corre entre o banco e a linha de fundo `Aquecimento.ciclos` vezes: corre ate la, para `parada` s a olhar o
    jogo, volta para perto do banco, para outros `parada` s. Varios reservas aquecem juntos.
  . espera: vai ao meio da lateral, ao lado do 4.o arbitro, e fica a espera.
  . pronto -> placa: so numa parada (falta, lateral, tiro de meta, canto) e com quem sai fora do lance (batedor, barreira). Enquanto dura a troca o jogo ESPERA (`Match.subsEmCurso`:
    o `update` so anda os jogadores): o 4.o arbitro levanta a placa (vermelho = quem sai, verde = quem entra).
  . sai: quem sai vai a lateral e deixa o campo; no instante em que a pisa o substituto entra (um FootballPlayer NOVO com o posto dele, ver `executarSubstituicao`) e o jogo
    recomeça. O que saiu volta ao banco e senta-se; a placa baixa.

A TROCA NO MOTOR: quem entra e um FootballPlayer novo, construido como o `createTeams` o faria (skills do manager por `AdaptadorManager.jogador`, uniforme da equipa,
aparencia do id real), com o POSTO do que sai (slot, formacao, funcao), no lugar dele na lista da equipa; as referencias ao que sai no `Match` limpam-se.
=============================================================================
*/
const Aquecimento = {
    activo: true,
    depurar: true,        // escreve na consola uma linha por segundo do aquecimento / volta
    ciclos: 2,            // idas a linha de fundo (pedido: so 2 corridas; eram 4)
    parada: 4.0,          // s a olhar o jogo em cada ponta
    velocidade: 5.2,      // m/s: aquece a CORRER (trote), nao a andar
    xAquecer: 41.3,       // o TRILHO DE IDA, atras das placas (39) e dos reporters (40.4), entre eles e o banco (42.4): o aquecimento nao entra na area tecnica nem no relvado
    xVolta: 41.9,         // o TRILHO DE VOLTA: a ida e a volta nao se cruzam, nem com varias substituicoes ao mesmo tempo
    zSobraBanco: 6.5,     // a volta acaba tanto (m, em z) do centro do banco: fora do banco, onde os reservas sentados tem as pernas no trilho
    xVao: 36.4,           // o vao das placas em frente ao banco leva a faixa da lateral (34 a 39), por onde se vai ao meio da lateral
    xEspera: 36.0,        // a espera, ao lado do 4.o arbitro
    zSobraFundo: 4.0,     // a corrida acaba tantos metros antes da linha de fundo
    saida: { x: 34.4, z: 0 },   // onde quem sai deixa o campo e quem entra o pisa (meio da lateral)
    velEntra: 5.0,        // quem entra segue a trote para o posto
    velSai: 5.0, velVolta: 3.0,   // quem sai TROTA ate a lateral (de frente para o movimento); depois anda de volta ao banco
    preparador: { funcao: 'massagista', x: 41.0, xFim: 42.4, zLado: 5.9, palmas: 0.5, duracaoPalma: 0.25, velocidade: 2.6, bracoX: -1.05, cotovelo: -1.35, abre: 0.30, junta: -0.40 },
    placaSobra: 1.6       // s de placa levantada depois da troca
};
if (typeof window !== 'undefined') window.Aquecimento = Aquecimento;

Object.assign(Match, {
    subsPendentes: [],
    subsEmCurso: null,
    _placaViva: 0,

    /*
    A BRACADEIRA DE CAPITAO (pedido): na manga DIREITA da camisa do capitao de cada time, uma faixa na cor de MAIOR CONTRASTE com a manga, com a letra C (preta sobre faixa clara, branca sobre
    escura), no lado de fora e na frente do braco. O capitao e o designado em `Match.cobradores[lado].captain` (a aba Tactics); sem designado (ou se ele sai, e expulso) nao ha faixa — troca de
    capitao ou substituicao passam a valer na proxima leitura (de `Bracadeira.intervalo` em `Bracadeira.intervalo` s).
    */
    _bracadeiraDe: function (p, ligada) {
        const rig = p && p.rig; if (!rig || !rig.rArm) return;
        if (!ligada) { if (p._bracadeira) { p._bracadeira.parent && p._bracadeira.parent.remove(p._bracadeira); p._bracadeira = null; } return; }
        if (p._bracadeira) return;
        const up = rig.rArm.children[0]; if (!up) return;   // o braco de cima (a manga e filha dele)
        const u = Bracadeira.u;
        // A cor da manga (para o contraste): a da peca `manga` do braco de cima.
        const manga = up.children[0];
        const corManga = (manga && manga.material && manga.material.color) ? manga.material.color : new THREE.Color(0xffffff);
        const lum = (c) => { const f = (v) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)); return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b); };
        const contraste = (a, b) => { const x = lum(a) + 0.05, y = lum(b) + 0.05; return x > y ? x / y : y / x; };
        let melhor = Bracadeira.cores[0], nota = -1;
        for (const hex of Bracadeira.cores) { const c = new THREE.Color(hex); const n = contraste(c, corManga); if (n > nota) { nota = n; melhor = hex; } }
        const corFaixa = new THREE.Color(melhor), corC = lum(corFaixa) > 0.35 ? '#000000' : '#ffffff';
        const grupo = new THREE.Group(); grupo.name = 'bracadeira';
        const faixa = new THREE.Mesh(new THREE.BoxGeometry(u * 0.44, u * 0.2, u * 0.44), new THREE.MeshStandardMaterial({ color: corFaixa, roughness: 0.7 }));
        grupo.add(faixa);
        const cv = document.createElement('canvas'); cv.width = cv.height = 64;
        const g = cv.getContext('2d'); g.fillStyle = '#' + corFaixa.getHexString(); g.fillRect(0, 0, 64, 64);
        g.fillStyle = corC; g.font = 'bold 54px system-ui,Arial,sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('C', 32, 36);
        const tex = new THREE.CanvasTexture(cv);
        const matC = new THREE.MeshBasicMaterial({ map: tex });
        const lado = new THREE.Mesh(new THREE.PlaneGeometry(u * 0.17, u * 0.17), matC);   // o lado de fora do braco direito (-x)
        lado.position.set(-(u * 0.22 + 0.002), 0, 0); lado.rotation.y = -Math.PI / 2; grupo.add(lado);
        const frente = new THREE.Mesh(new THREE.PlaneGeometry(u * 0.17, u * 0.17), matC);   // e a frente
        frente.position.set(0, 0, u * 0.22 + 0.002); grupo.add(frente);
        grupo.position.y = 0.18;   // no braco de cima, abaixo do ombro, por cima da manga
        up.add(grupo); p._bracadeira = grupo;
    },
    tickBracadeiras: function (dt) {
        if (typeof Bracadeira === 'undefined' || !Bracadeira.activa || typeof document === 'undefined') return;
        if (typeof Sim !== 'undefined' && Sim.running && !this.forcarBracadeira) return;   // simulacao em lote: sem desenho
        this._tBracadeira = (this._tBracadeira || 0) - dt;
        if (this._tBracadeira > 0) return;
        this._tBracadeira = Bracadeira.intervalo;
        for (const [time, lista] of [['TeamA', this.players], ['TeamB', this.opponents]]) {
            if (!lista) continue;
            const cap = (typeof cobradorDesignado === 'function') ? cobradorDesignado(time, 'captain', lista) : null;
            for (const p of lista) { if (p && p.rig && p.role !== undefined) this._bracadeiraDe(p, p === cap); }
        }
    },

    // A fila de pedidos. `req` = { lado: 'casa'|'fora', sai: id do manager, entra: id do manager, jogador: o Player do manager que entra }.
    pedirSubstituicao: function (req) {
        if (!req || !req.jogador) return false;
        // O MESMO pedido nao entra duas vezes: o manager envia-o de dentro de um `setTeams` que o React (modo dev) corre DUAS vezes, e dois pedidos a
        // comandar o mesmo reserva travavam-no (um empurra para a frente, o outro para o passo anterior; so andava quando o jogo parava).
        if (this.subsPendentes.some(q => !q.feita && q.lado === req.lado && (q.sai === req.sai || q.entra === req.entra))) return false;
        const r = Object.assign({ t: 0, feita: false, estado: 'novo', passo: 0, passos: null, B: null }, req);
        this.subsPendentes.push(r);
        return true;
    },

    _equipaDoLado: function (lado) { return lado === 'fora' ? this.opponents : this.players; },

    // O jogador do motor que corresponde ao id do manager (o `skills.id` e o id real, ver AdaptadorManager.idReal).
    _jogadorPorIdManager: function (lista, idManager) {
        const id = (typeof AdaptadorManager !== 'undefined') ? AdaptadorManager.idReal(idManager) : null;
        return lista.find(p => p && p.skills && p.skills.id === id) || null;
    },

    // A parada de jogo em que se pode trocar (nao com a bola a rolar).
    _paradaParaSubstituir: function () {
        return this.state === 'FREE_KICK' || this.state === 'THROW_IN' || this.state === 'GOAL_KICK' || this.state === 'CORNER_KICK';
    },

    _bancoDoLado: function (lado) {
        if (typeof Bancos === 'undefined' || !Bancos.bancos) return null;
        return Bancos.bancos.find(b => b.equipa === (lado === 'fora' ? 'B' : 'A')) || null;
    },

    // O reserva sentado no banco que corresponde ao id do manager (ou null: troca sem aquecimento).
    _reservaDoBanco: function (banco, idManager) {
        const id = (typeof AdaptadorManager !== 'undefined') ? AdaptadorManager.idReal(idManager) : null;
        return (banco && banco.reservas.find(r => r && r._idMeiao === id)) || null;
    },

    _numeroDoEntrante: function (req, P, lista) {
        const opcoes = (typeof AdaptadorManager !== 'undefined' && AdaptadorManager._opcoes) ? AdaptadorManager._opcoes : {};
        if (!req._sk) req._sk = AdaptadorManager.jogador(req.jogador, P.pos, opcoes);
        const n = req._sk.numero;
        return (n && !lista.some(q => q !== P && q.num === n)) ? n : P.num;
    },

    // ---------------------------------------------------------------------------------------------
    // O que corre todos os frames (chamado do `update`): o aquecimento de cada pedido, a troca em curso e a placa do 4.o arbitro.
    tickSubstituicoes: function (dt) {
        this.tickBracadeiras(dt);
        const Q = (typeof Officials !== 'undefined') ? Officials : null;
        const emBatch = (typeof Sim !== 'undefined' && Sim.running);
        if (this._placaViva > 0) this._placaViva -= dt;
        // A CAMERA DA SUBSTITUICAO acaba com ela: sem troca em curso nem placa no ar volta a vista que o utilizador tinha.
        if (this._camAntesDaTroca && !this.subsEmCurso && !(this._placaViva > 0) && typeof this.setCameraMode === 'function') {
            if (window.cameraMode === 'substituicao') this.setCameraMode(this._camAntesDaTroca);
            this._camAntesDaTroca = null;
        }
        if (Q && Q.tickQuarto) Q.tickQuarto(dt, !!this.subsEmCurso || this._placaViva > 0);
        if (!emBatch) this._tickPreparador(dt);
        if (!this.subsPendentes.length) return;

        for (const req of this.subsPendentes) {
            if (req.feita) continue;
            const lista = this._equipaDoLado(req.lado);
            const P = (req.estado === 'voltar') ? req.sai : this._jogadorPorIdManager(lista, req.sai);
            if (!P) { this._cancelar(req); continue; }   // ja nao esta em campo: o pedido cai
            if (req.estado === 'novo') this._comecar(req, P, emBatch);
            if (req.estado === 'aquecer' || req.estado === 'espera' || req.estado === 'levantar') this._tickAquecimento(req, dt);
            // Mais de um substituto do mesmo lado: o jogo fica parado (subsEmCurso passa de um para o seguinte) e entram um a seguir ao outro.
            if (req.estado === 'pronto' && req.B) this._esperarEmIdle(req, dt);
            if (req.estado === 'pronto' && this.subsEmCurso === req && !this._elegivel(P)) { this.subsEmCurso = null; req.junto = false; }
            if (this.subsEmCurso === req && req.estado !== 'pronto' && (req._esperaJunto = (req._esperaJunto || 0) + dt) > 40) { this.subsEmCurso = null; req.junto = false; req._esperaJunto = 0; }
            if (req.estado === 'pronto' && (!this.subsEmCurso || this.subsEmCurso === req) && this._paradaParaSubstituir() && this._elegivel(P)) {
                // Nos lotes (sem desenho) a troca e instantanea.
                if (emBatch) { this.executarSubstituicao(req, P, lista); req.feita = true; }
                else this._comecarTroca(req, P, lista);
            }
            if (req.estado === 'placa' || req.estado === 'sai') this._tickTroca(req, P, lista, dt);
            if (req.estado === 'voltar') this._tickVoltar(req, dt);
        }
        this.subsPendentes = this.subsPendentes.filter(r => !r.feita);
    },

    /*
    O PREPARADOR FISICO (o staff `Aquecimento.preparador.funcao` do banco): enquanto um reserva dessa equipa aquece levanta-se, vai para o lado do banco (do lado
    do meio-campo, fora do trilho de aquecimento), vira-se para o campo e bate palmas de `palmas` em `palmas` segundos; acabado o aquecimento volta e senta-se.
    */
    _tickPreparador: function (dt) {
        if (typeof Bancos === 'undefined' || !Bancos.bancos || typeof Officials === 'undefined') return;
        const C = Aquecimento.preparador;
        for (const banco of Bancos.bancos) {
            const s = (banco.staff || []).find(q => q.funcao === C.funcao);
            if (!s) continue;
            const ativo = this.subsPendentes.some(r => !r.feita && r.banco === banco && r.estado === 'aquecer');
            const pr = s.prep || (s.prep = { estado: 'sentado', t: 0 });
            const sinal = Math.sign(banco.zc) || 1;
            if (pr.estado === 'sentado') {
                if (!ativo) continue;
                pr.assento = { x: s.model.position.x, z: s.model.position.z, rot: s.model.rotation.y };
                Bancos.descongelar(s);
                const r = s.rig;
                r.lLeg.rotation.set(0, 0, 0); r.rLeg.rotation.set(0, 0, 0); r.lKnee.rotation.set(0, 0, 0); r.rKnee.rotation.set(0, 0, 0);
                r.chest.rotation.x = 0;
                if (typeof s.pelvisY0 === 'number') r.pelvis.position.y = s.pelvisY0;
                s.model.position.y = 0;
                s.animTimer = 0; s.velAnim = 0; s.paradoNoAlvo = true;
                pr.estado = 'indo'; pr.t = 0;
            }
            const ponto = { x: C.xFim, z: banco.zc + sinal * C.zLado };   // ao lado do banco, na ponta mais PERTO DA LINHA DE FUNDO
            if (pr.estado === 'indo') {
                // Pela frente do banco (x 41, onde nao ha pernas nem costas) e so no fim encosta-se a ponta do banco.
                pr.v = pr.v || 0;
                const alvo = pr.v === 0 ? { x: C.x, z: pr.assento.z } : pr.v === 1 ? { x: C.x, z: ponto.z } : ponto;
                this._andar(s, alvo.x, alvo.z, C.velocidade, dt);
                if (Math.hypot(alvo.x - s.model.position.x, alvo.z - s.model.position.z) < 0.25) { pr.v++; if (pr.v >= 3) { pr.estado = 'palmas'; pr.t = 0; pr.v = 0; } }
            }
            if (pr.estado === 'palmas') {
                Officials.mover(s, ponto.x, ponto.z, 0, dt, undefined);
                // A atencao e o JOGADOR que aquece (o primeiro a aquecer desta equipa), nao o jogo: vira-se para ele e acompanha-o.
                const aq = this.subsPendentes.find(q => !q.feita && q.banco === banco && q.estado === 'aquecer' && q.B);
                const alvoOlhar = aq ? aq.B.model.position : { x: 0, z: s.model.position.z };
                const ang = Math.atan2(alvoOlhar.x - s.model.position.x, alvoOlhar.z - s.model.position.z);
                const dif = Math.atan2(Math.sin(ang - s.model.rotation.y), Math.cos(ang - s.model.rotation.y));
                s.model.rotation.y += dif * Math.min(1, dt * 6);
                pr.t += dt;
                const c = pr.t % C.palmas;
                const fase = c < C.duracaoPalma ? Math.sin(c / C.duracaoPalma * Math.PI) : 0;   // 0 maos afastadas -> 1 juntas -> 0
                const r = s.rig, z = C.abre * (1 - fase) + C.junta * fase;
                r.lArm.rotation.set(C.bracoX, 0, z); r.rArm.rotation.set(C.bracoX, 0, -z);
                r.lElbow.rotation.x = C.cotovelo; r.rElbow.rotation.x = C.cotovelo;
                if (!ativo) { pr.estado = 'voltando'; pr.passo = 0; }
            }
            if (pr.estado === 'voltando') {
                const a = pr.assento;
                const pontos = [{ x: C.x, z: ponto.z }, { x: C.x, z: a.z }, { x: a.x, z: a.z }];
                const alvo = pontos[Math.min(pr.passo, 2)];
                this._andar(s, alvo.x, alvo.z, C.velocidade, dt);
                if (Math.hypot(alvo.x - s.model.position.x, alvo.z - s.model.position.z) < 0.25) {
                    pr.passo++;
                    if (pr.passo >= 3) {
                        s.model.position.x = a.x; s.model.position.z = a.z;
                        s.rig.lArm.rotation.set(0, 0, 0); s.rig.rArm.rotation.set(0, 0, 0);
                        Bancos._sentar(s);
                        s.model.rotation.y = a.rot;
                        Bancos.congelar(s);
                        pr.estado = 'sentado';
                    }
                }
            }
        }
    },

    // O substituto a espera: de pe, virado para o campo a acompanhar o jogo (idle), onde acabou o aquecimento.
    _esperarEmIdle: function (req, dt) {
        const B = req.B, p = B.model.position;
        Officials.mover(B, p.x, p.z, 0, dt, undefined);
        this._virarPara(B, this.ball.position.x, this.ball.position.z, dt * 5);
        this._assentar(B, dt, p.x, p.z);
    },

    // O bandeirinha da substituicao chegou a ponta da area tecnica? (a bandeira so sobe la)
    _bandeiraPronta: function () {
        const a = (typeof Officials !== 'undefined') ? Officials.assistentes && Officials.assistentes[0] : null;
        if (!a || this._zBandeira === undefined || this._zBandeira === null) return true;
        return Math.abs(a.model.position.z - this._zBandeira) < 1.5 || (this._tBandeira = (this._tBandeira || 0) + 1 / 60) > 9;
    },

    _elegivel: function (P) {
        // Quem esta no lance (batedor, barreira, caido) fica para a parada seguinte.
        return !!P && P !== this.setPieceTaker && !P.naBarreiraFalta && P !== this.repositor && !P.queda;
    },

    _cancelar: function (req) {
        req.feita = true;
        if (this.subsEmCurso === req) this.subsEmCurso = null;
    },

    _comecar: function (req, P, emBatch) {
        const banco = this._bancoDoLado(req.lado);
        const B = (!emBatch && Aquecimento.activo) ? this._reservaDoBanco(banco, req.entra) : null;
        req.banco = banco; req.B = B;
        // So quando se levanta para aquecer a camisa leva o numero e as costas do clube (sentado, no banco, fica como estava).
        if (B && B.updateShirt) { try { B.updateShirt(this._numeroDoEntrante(req, P, this._equipaDoLado(req.lado)), P.pos); } catch (e) { /* sem textura: fica como estava */ } }
        if (!B) { req.estado = 'pronto'; return; }            // sem banco/reserva: sem aquecimento, troca na primeira parada
        // O aquecimento: os passos.
        const A = Aquecimento;
        const indice = this.subsPendentes.filter(r => !r.feita && r.lado === req.lado).indexOf(req);
        const off = Math.max(0, indice) * 1.2;
        const sinal = Math.sign(banco.zc) || 1;
        const zPerto = banco.zc + sinal * (A.zSobraBanco + off);
        const zFim = sinal * (CAMPO_COMP / 2 - A.zSobraFundo) - sinal * off;
        const zAssento = B.model.position.z;
        const passos = [{ tipo: 'ir', x: A.xAquecer, z: zAssento }, { tipo: 'ir', x: A.xAquecer, z: banco.zc + sinal * (A.zSobraBanco + off) }];   // do assento para o trilho de ida
        for (let c = 0; c < A.ciclos; c++) {
            passos.push({ tipo: 'ir', x: A.xAquecer, z: zFim });          // ida pelo trilho de ida
            passos.push({ tipo: 'parar', s: A.parada });
            passos.push({ tipo: 'ir', x: A.xVolta, z: zFim });            // muda de trilho (passo ao lado)
            passos.push({ tipo: 'ir', x: A.xVolta, z: zPerto });          // volta pelo trilho de volta
            passos.push({ tipo: 'parar', s: A.parada });
            passos.push({ tipo: 'ir', x: A.xAquecer, z: zPerto });        // e regressa ao de ida
        }
        // Para a espera: de volta ao banco, pelo vao da placa ate a faixa da lateral e dai ao meio.
        req.idxEspera = passos.length;
        passos.push({ tipo: 'ir', x: A.xAquecer, z: banco.zc });
        passos.push({ tipo: 'ir', x: A.xEspera, z: banco.zc });
        passos.push({ tipo: 'ir', x: A.xEspera, z: (indice % 2 ? 1.6 : -1.6) * Math.ceil((indice + 1) / 2) * 0.9 });
        req.passos = passos; req.passo = req.junto ? req.idxEspera : 0; req.t = 0;
        // Levanta-se: a pose do banco sai, a posicao de pe fica onde estava sentado.
        req.assento = { x: B.model.position.x, z: B.model.position.z, rot: B.model.rotation.y };
        if (typeof Bancos !== 'undefined') Bancos.descongelar(B);
        B.resetBonesToDefault();
        B.model.position.y = (typeof ALTURA_BASE_Y === 'number') ? ALTURA_BASE_Y : 0;
        B.animTimer = 0; B.velAnim = 0; B.paradoNoAlvo = true;
        req.estado = 'aquecer';
    },

    /*
    ANDAR (reserva, quem sai): o `Officials.mover` leva o corpo e a passada; aqui garante-se (1) que ele SAI DO SITIO — se por qualquer razao o `mover` o deixar quieto a
    animar a corrida, avanca-se a mao (relato: *"a corrida de volta: a animacao esta ok mas o jogador fica no lugar"*) — e (2) que ele PISA O RELVADO: a sola assenta
    (`assentarNoChao`) como nos jogadores de campo (relato: *"o jogador aquecendo esta meio no ar"*).
    */
    _andar: function (o, x, z, vel, dt, olhar) {
        this._endireitarEuler(o);
        const p = o.model.position, x0 = p.x, z0 = p.z;
        const d = Math.hypot(x - x0, z - z0);
        Officials.mover(o, x, z, vel, dt, olhar);
        // O `mover` so da a passada: o AVANCO e sempre este (vel * dt em linha recta para o alvo), seja qual for o estado do `mover` (relato repetido: corrida so com a animacao).
        const esperado = Math.min(d, vel * dt);
        if (d > 0.05 && vel > 0) {
            if (!olhar) {
                p.x = x0 + (x - x0) / d * esperado; p.z = z0 + (z - z0) / d * esperado;
                o.model.rotation.y = Math.atan2(x - x0, z - z0);
            } else if (Math.hypot(p.x - x0, p.z - z0) < esperado * 0.3) {
                // A olhar para outro lado o `mover` leva o corpo (passo lateral/de costas); so se o deixar quieto se avanca a mao, sem mexer na orientacao.
                p.x = x0 + (x - x0) / d * esperado * 0.6; p.z = z0 + (z - z0) / d * esperado * 0.6;
            }
        }
        // A cabeca e a cintura endireitam-se para o rumo: quem sai vinha a olhar para a bola (pescoco ate ~80 graus) e ia de corpo virado para um lado e cara para outro.
        const rg = o.rig;
        if (rg) {
            if (rg.neck) rg.neck.rotation.y += (0 - rg.neck.rotation.y) * 0.25;
            if (rg.chest) rg.chest.rotation.y += (0 - rg.chest.rotation.y) * 0.25;
            if (rg.pelvis) rg.pelvis.rotation.y += (0 - rg.pelvis.rotation.y) * 0.25;
        }
        this._assentar(o, dt, x0, z0);
    },

    // Diagnostico (consola do iframe): uma linha por segundo com onde o corpo esta e para onde vai. `Aquecimento.depurar = false` desliga.
    _depurar: function (req, o, alvo) {
        if (!Aquecimento.depurar || typeof console === 'undefined') return;
        req._dbgT = (req._dbgT || 0) + 1;
        if (req._dbgT % 60 !== 1) return;
        const p = o.model.position;
        console.log('[subs]', req.estado, 'passo', req.passo, 'pos', p.x.toFixed(2), p.z.toFixed(2), '-> alvo', alvo ? alvo.x.toFixed(2) + ',' + alvo.z.toFixed(2) : '-',
            '| na cena', !!o.model.parent, 'visivel', o.model.visible, '| estado jogo', this.state);
    },

    _assentar: function (o, dt, x0, z0) {
        const p = o.model.position;
        if (o.velocity && dt > 0) o.velocity.set((p.x - x0) / dt, 0, (p.z - z0) / dt);
        o.jumpTimer = 0; o.peitoHopTimer = 0;
        for (let k = 0; k < 3; k++) { if (o.assentarNoChao) o.assentarNoChao(); }   // varias passagens: a correccao e suavizada e o corpo parte de cima
    },

    /*
    O CORPO DOS JOGADORES e orientado por `lookAt`: o Euler dele passa a (pi, y, pi) quando a frente aponta para tras (z negativo), e ler ou escrever so o `rotation.y` num
    modelo assim inverte a frente (relato: quem sai corre para o lado certo virado para o outro, e depois volta ao banco de costas). Antes de o conduzir a pe, le-se o rumo
    da FRENTE pelo quaternião e o Euler volta a (0, yaw, 0): a partir dai o `rotation.y` e fiavel (o `Officials.mover` e esta classe so usam esse).
    */
    _endireitarEuler: function (o) {
        const e = o.model.rotation;
        if (Math.abs(e.x) < 1e-3 && Math.abs(e.z) < 1e-3) return;
        const f = new THREE.Vector3(0, 0, 1).applyQuaternion(o.model.quaternion);
        e.set(0, Math.atan2(f.x, f.z), 0);
    },

    _virarPara: function (o, x, z, k) {
        this._endireitarEuler(o);
        const alvo = Math.atan2(x - o.model.position.x, z - o.model.position.z);
        const dif = Math.atan2(Math.sin(alvo - o.model.rotation.y), Math.cos(alvo - o.model.rotation.y));
        o.model.rotation.y += dif * Math.min(1, k);
    },

    _tickAquecimento: function (req, dt) {
        const B = req.B;
        if (!B || !req.passos) return;
        const st = req.passos[req.passo];
        if (!st) { req.estado = 'pronto'; return; }
        const bola = this.ball.position;
        if (st.tipo === 'ir') {
            this._andar(B, st.x, st.z, Aquecimento.velocidade, dt);
            this._depurar(req, B, st);
            req.t += dt;
            if (Math.hypot(st.x - B.model.position.x, st.z - B.model.position.z) < 0.6 || req.t > 40) { req.passo++; req.t = 0; }
        } else {
            // Parado a olhar o jogo.
            const bx = B.model.position.x, bz = B.model.position.z;
            Officials.mover(B, bx, bz, 0, dt, undefined);
            this._virarPara(B, bola.x, bola.z, dt * 5);
            this._assentar(B, dt, bx, bz);
            req.t += dt;
            if (req.t >= st.s) { req.passo++; req.t = 0; }
        }
        if (req.passo >= req.passos.length) req.estado = 'pronto';   // chegou ao sitio da espera
    },

    _comecarTroca: function (req, P, lista) {
        req.estado = 'placa';
        req.t = 0;
        this.subsEmCurso = req;
        // A camera mostra a substituicao (vista lateral para a zona da troca, CameraSubstituicao em config/tactics.js) e volta ao normal no fim (tickSubstituicoes).
        if (!(typeof Sim !== 'undefined' && Sim.running) && typeof this.setCameraMode === 'function' && window.cameraMode !== 'substituicao' && typeof window.cameraMode === 'string') {
            this._camAntesDaTroca = window.cameraMode;
            this.setCameraMode('substituicao');
        }
        // Os outros substitutos do mesmo lado entram nesta MESMA parada: se ainda aquecem, vao a correr para o ponto de espera.
        for (const o of this.subsPendentes) {
            if (o.feita || o === req || o.lado !== req.lado || !['novo', 'aquecer', 'pronto'].includes(o.estado)) continue;
            o.junto = true;
            if (o.estado === 'aquecer' && o.idxEspera !== undefined && o.passo < o.idxEspera) { o.passo = o.idxEspera; o.t = 0; }
        }
        // O bandeirinha da substituicao vai a ponta da area tecnica (a de la do 4.o arbitro), fora do meio dos outros modelos.
        const sin = Math.sign(req.banco ? req.banco.zc : 1) || 1;
        this._zBandeira = (req.banco ? req.banco.zc : 0) + sin * (BancosDeReservas.area.meiaLargura + 1.0);
        this._tBandeira = 0;
        const numEntra = this._numeroDoEntrante(req, P, lista);
        if (Officials && Officials.mostrarPlaca) Officials.mostrarPlaca(P.num, numEntra);
        // Quem sai pára o que estava a fazer: o `Player.update` deixa-o quieto (subSaindo) e o `mover` leva-o a lateral.
        P.subSaindo = true;
        P.hasBall = false; P.velocity.set(0, 0, 0);
        if (P.fsm) P.fsm.changeState('IDLE');
    },

    _tickTroca: function (req, P, lista, dt) {
        req.t += dt;
        const A = Aquecimento;
        if (req.estado === 'placa') {
            // Espera a placa estar no ar (o 4.o arbitro levanta os bracos) e o jogador comeca a andar.
            const q = (typeof Officials !== 'undefined') ? Officials.quarto : null;
            if ((q ? q.braco >= 0.95 && this._bandeiraPronta() : true) && req.t >= 0.4 || req.t > 14) { req.estado = 'sai'; req.t = 0; }
            return;
        }
        // 'sai': quem sai vai ao meio da lateral e sai de campo.
        this._andar(P, A.saida.x, A.saida.z + (req.lado === 'fora' ? 0.9 : -0.9), A.velSai, dt);
        const d = Math.hypot(A.saida.x - P.model.position.x, (A.saida.z + (req.lado === 'fora' ? 0.9 : -0.9)) - P.model.position.z);
        if (d < 0.7 || req.t > 28) {
            this.executarSubstituicao(req, P, lista, { x: A.saida.x - 0.6, z: A.saida.z, entrada: true });
            req.estado = 'voltar'; req.passo = 0; req.t = 0;
            req.sai = P;
            const prox = this.subsPendentes.find(o => !o.feita && o !== req && o.lado === req.lado && o.junto);
            this.subsEmCurso = prox || null;
            this._placaViva = prox ? 0 : A.placaSobra;
            if (req.B) req.B.model.visible = false;
        }
    },

    // Quem saiu volta ao banco (pelo vao da placa) e senta-se.
    _tickVoltar: function (req, dt) {
        const P = req.sai, banco = req.banco;
        if (!P || !banco || !req.assento) { req.feita = true; return; }
        const A = Aquecimento;
        const pontos = [{ x: A.xVao, z: banco.zc }, { x: A.xAquecer, z: banco.zc }, { x: A.xAquecer, z: req.assento.z }, { x: req.assento.x, z: req.assento.z }];
        const alvo = pontos[Math.min(req.passo, pontos.length - 1)];
        this._andar(P, alvo.x, alvo.z, A.velVolta, dt);
        this._depurar(req, P, alvo);
        if (Math.hypot(alvo.x - P.model.position.x, alvo.z - P.model.position.z) < 0.35) {
            req.passo++;
            if (req.passo >= pontos.length) {
                P.model.position.set(req.assento.x, P.model.position.y, req.assento.z);
                P.model.rotation.y = req.assento.rot;
                if (typeof Bancos !== 'undefined' && Bancos._sentar) { P.resetBonesToDefault(); Bancos._sentar(P); P.model.rotation.y = req.assento.rot; if (Bancos.congelar) Bancos.congelar(P); }
                req.feita = true;
            }
        }
    },

    // A troca no motor. `opcoes.x/z`: onde o substituto aparece (a lateral); sem eles, no sitio de quem sai.
    executarSubstituicao: function (req, P, lista, opcoes) {
        const i = lista.indexOf(P);
        if (i < 0) return null;
        const info = (P.team === 'TeamA') ? this.equipaInfoA : this.equipaInfoB;
        const ops = (typeof AdaptadorManager !== 'undefined' && AdaptadorManager._opcoes) ? AdaptadorManager._opcoes : {};
        const sk = req._sk || AdaptadorManager.jogador(req.jogador, P.pos, ops);
        // O uniforme: o do clube; o guarda-redes leva o dele (o do que sai).
        const uni = (P.role === 'gk') ? P.uniforme : ((typeof uniformeDe === 'function' && info) ? uniformeDe(info.nome) : P.uniforme);
        const N = new FootballPlayer(P.id, P.corCamisa, P.corCalcao, P.team, uni, sk.id);
        N.skills = sk;
        if (sk && sk.pe) N.pe = sk.pe;
        N.playingStyleFixo = sk.estilo || null;
        // O POSTO do que sai.
        N.role = P.role;
        N.slot = P.slot;
        N.idxFormacao = P.idxFormacao;
        N.baseTarget.copy(P.baseTarget);
        N.dirZ = P.dirZ; N.targetGoalZ = P.targetGoalZ; N.ownGoalZ = P.ownGoalZ;
        if (P.role === 'gk') { N.gkStyleBase = P.gkStyleBase; N.playingStyle = P.playingStyle; }
        const numero = this._numeroDoEntrante(req, P, lista);
        N.updateShirt(numero, P.pos);
        const idxPos = lista.slice(0, i).filter(q => q.pos === P.pos).length;
        if (P.role !== 'gk') this.aplicarPlayingStyle(N, P.pos, idxPos);
        const ponto = (opcoes && typeof opcoes.x === 'number') ? opcoes : P.model.position;
        N.model.position.set(ponto.x, (typeof ALTURA_BASE_Y === 'number') ? ALTURA_BASE_Y : 0, ponto.z);
        if (opcoes && opcoes.entrada) N.model.rotation.y = -Math.PI / 2; else N.model.quaternion.copy(P.model.quaternion);
        N.velocity.set(0, 0, 0);
        // O alvo de quem sai (o que a parada lhe deu) passa a ser o de quem entra: segue para la; sem entrada em campo, fica onde esta.
        if (opcoes && opcoes.entrada && P.dynamicTarget) {
            N.dynamicTarget.copy(P.dynamicTarget);
            N.lugarBolaParada = { x: P.dynamicTarget.x, z: P.dynamicTarget.z, t: 0, vel: Aquecimento.velEntra, entrada: true };   // anda ao posto pelo caminho de sempre das bolas paradas
        } else N.dynamicTarget.copy(N.model.position);
        // Quem ENTRA segue logo para o seu posto (nao espera por mais trocas); na troca em campo (batch) fica parado como sempre.
        if (N.fsm) N.fsm.changeState((opcoes && opcoes.entrada) ? 'MOVE_TO_POS' : 'IDLE');
        // Troca na lista e na cena (o que sai fica na cena enquanto anda para o banco, se for andado).
        lista[i] = N;
        this.scene.add(N.model);
        if (!(opcoes && opcoes.entrada)) {
            for (const obj of [P.model, P.discoTatico]) { if (obj) this.scene.remove(obj); }
        } else if (P.discoTatico) this.scene.remove(P.discoTatico);
        for (const obj of [P.btTargetGroup, P.btLine, P.positionTargetGroup, P.styleTargetGroup]) { if (obj) this.scene.remove(obj); }
        this.esquecerJogadoresAntigos([P]);
        if (typeof this.subsFeitas === 'undefined') this.subsFeitas = [];
        this.subsFeitas.push({ lado: req.lado, sai: P, entra: N, t: this.tempoDeJogo });
        // O acrescimo de tempo (MatchDuration.acrescimo): cada troca conta.
        this.substituicoes = (this.substituicoes || 0) + 1;
        if (!(opcoes && opcoes.entrada)) req.feita = true;
        return N;
    }
});
