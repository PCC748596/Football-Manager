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
    ciclos: 4,            // idas a linha de fundo
    parada: 4.0,          // s a olhar o jogo em cada ponta
    velocidade: 3.4,      // m/s a correr
    xAquecer: 36.4,       // entre a linha lateral (34) e as placas (39)
    xEspera: 36.0,        // a espera, ao lado do 4.o arbitro
    zSobraFundo: 4.0,     // a corrida acaba tantos metros antes da linha de fundo
    saida: { x: 34.4, z: 0 },   // onde quem sai deixa o campo e quem entra o pisa (meio da lateral)
    velSai: 4.8, velVolta: 3.0,
    placaSobra: 1.6       // s de placa levantada depois da troca
};
if (typeof window !== 'undefined') window.Aquecimento = Aquecimento;

Object.assign(Match, {
    subsPendentes: [],
    subsEmCurso: null,
    _placaViva: 0,

    // A fila de pedidos. `req` = { lado: 'casa'|'fora', sai: id do manager, entra: id do manager, jogador: o Player do manager que entra }.
    pedirSubstituicao: function (req) {
        if (!req || !req.jogador) return false;
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
        const Q = (typeof Officials !== 'undefined') ? Officials : null;
        const emBatch = (typeof Sim !== 'undefined' && Sim.running);
        if (this._placaViva > 0) this._placaViva -= dt;
        if (Q && Q.tickQuarto) Q.tickQuarto(dt, !!this.subsEmCurso || this._placaViva > 0);
        if (!this.subsPendentes.length) return;

        for (const req of this.subsPendentes) {
            if (req.feita) continue;
            const lista = this._equipaDoLado(req.lado);
            const P = (req.estado === 'voltar') ? req.sai : this._jogadorPorIdManager(lista, req.sai);
            if (!P) { this._cancelar(req); continue; }   // ja nao esta em campo: o pedido cai
            if (req.estado === 'novo') this._comecar(req, P, emBatch);
            if (req.estado === 'aquecer' || req.estado === 'espera' || req.estado === 'levantar') this._tickAquecimento(req, dt);
            if (req.estado === 'pronto' && !this.subsEmCurso && this._paradaParaSubstituir() && this._elegivel(P)) {
                // Nos lotes (sem desenho) a troca e instantanea.
                if (emBatch) { this.executarSubstituicao(req, P, lista); req.feita = true; }
                else this._comecarTroca(req, P, lista);
            }
            if (req.estado === 'placa' || req.estado === 'sai') this._tickTroca(req, P, lista, dt);
            if (req.estado === 'voltar') this._tickVoltar(req, dt);
        }
        this.subsPendentes = this.subsPendentes.filter(r => !r.feita);
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
        if (!B) { req.estado = 'pronto'; return; }            // sem banco/reserva: sem aquecimento, troca na primeira parada
        // O aquecimento: os passos.
        const A = Aquecimento;
        const indice = this.subsPendentes.filter(r => !r.feita && r.lado === req.lado).indexOf(req);
        const off = Math.max(0, indice) * 1.2;
        const sinal = Math.sign(banco.zc) || 1;
        const zPerto = banco.zc + sinal * (4 + off);
        const zFim = sinal * (CAMPO_COMP / 2 - A.zSobraFundo) - sinal * off;
        const passos = [{ tipo: 'ir', x: A.xAquecer, z: banco.zc }];
        for (let c = 0; c < A.ciclos; c++) {
            passos.push({ tipo: 'ir', x: A.xAquecer, z: zFim });
            passos.push({ tipo: 'parar', s: A.parada });
            passos.push({ tipo: 'ir', x: A.xAquecer, z: zPerto });
            passos.push({ tipo: 'parar', s: A.parada });
        }
        passos.push({ tipo: 'ir', x: A.xEspera, z: (indice % 2 ? 1.6 : -1.6) * Math.ceil((indice + 1) / 2) * 0.9 });
        req.passos = passos; req.passo = 0; req.t = 0;
        // Levanta-se: a pose do banco sai, a posicao de pe fica onde estava sentado.
        req.assento = { x: B.model.position.x, z: B.model.position.z, rot: B.model.rotation.y };
        B.resetBonesToDefault();
        B.model.position.y = (typeof ALTURA_BASE_Y === 'number') ? ALTURA_BASE_Y : 0;
        B.animTimer = 0; B.velAnim = 0; B.paradoNoAlvo = true;
        req.estado = 'aquecer';
    },

    _virarPara: function (o, x, z, k) {
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
            Officials.mover(B, st.x, st.z, Aquecimento.velocidade, dt, undefined);
            if (Math.hypot(st.x - B.model.position.x, st.z - B.model.position.z) < 0.6) { req.passo++; req.t = 0; }
        } else {
            // Parado a olhar o jogo.
            Officials.mover(B, B.model.position.x, B.model.position.z, 0, dt, undefined);
            this._virarPara(B, bola.x, bola.z, dt * 5);
            req.t += dt;
            if (req.t >= st.s) { req.passo++; req.t = 0; }
        }
        if (req.passo >= req.passos.length) req.estado = 'pronto';   // chegou ao sitio da espera
    },

    _comecarTroca: function (req, P, lista) {
        req.estado = 'placa';
        req.t = 0;
        this.subsEmCurso = req;
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
            if (req.t >= 0.9) { req.estado = 'sai'; req.t = 0; }
            return;
        }
        // 'sai': quem sai vai ao meio da lateral e sai de campo.
        Officials.mover(P, A.saida.x, A.saida.z + (req.lado === 'fora' ? 0.9 : -0.9), A.velSai, dt, undefined);
        const d = Math.hypot(A.saida.x - P.model.position.x, (A.saida.z + (req.lado === 'fora' ? 0.9 : -0.9)) - P.model.position.z);
        if (d < 0.7 || req.t > 28) {
            this.executarSubstituicao(req, P, lista, { x: A.saida.x - 0.6, z: A.saida.z, entrada: true });
            req.estado = 'voltar'; req.passo = 0; req.t = 0;
            req.sai = P;
            this.subsEmCurso = null;
            this._placaViva = A.placaSobra;
            if (req.B) req.B.model.visible = false;
        }
    },

    // Quem saiu volta ao banco (pelo vao da placa) e senta-se.
    _tickVoltar: function (req, dt) {
        const P = req.sai, banco = req.banco;
        if (!P || !banco || !req.assento) { req.feita = true; return; }
        const A = Aquecimento;
        const pontos = [{ x: A.xAquecer, z: banco.zc }, { x: req.assento.x, z: req.assento.z }];
        const alvo = pontos[Math.min(req.passo, pontos.length - 1)];
        Officials.mover(P, alvo.x, alvo.z, A.velVolta, dt, undefined);
        if (Math.hypot(alvo.x - P.model.position.x, alvo.z - P.model.position.z) < 0.35) {
            req.passo++;
            if (req.passo >= pontos.length) {
                P.model.position.set(req.assento.x, P.model.position.y, req.assento.z);
                P.model.rotation.y = req.assento.rot;
                if (typeof Bancos !== 'undefined' && Bancos._sentar) { P.resetBonesToDefault(); Bancos._sentar(P); P.model.rotation.y = req.assento.rot; }
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
        N.dynamicTarget.copy(N.model.position);
        if (N.fsm) N.fsm.changeState('IDLE');
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
