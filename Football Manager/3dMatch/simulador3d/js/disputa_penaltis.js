/*
=============================================================================
A DISPUTA DE PENALTIS EM 3D (ver docs/superpowers/specs/2026-10-31-disputa-penaltis-3d-design.md, medidas em config/disputa.js)
=============================================================================
Corre quando um jogo de copa visto no manager termina empatado (Match.decisao, mandada no `iniciar` pelo manager). Estado `DISPUTA` do Match; `Match.disputa` aponta para
este objeto enquanto dura. As REGRAS (quem bate, quando acaba) sao do manager (textSim/penaltyShootout.ts): o 3D encena, reporta o resultado de cada cobranca (gol, defesa,
trave, fora — pela fisica do penalti em jogo) e espera `disputa_proxima`.

Neste ficheiro: a COBRANCA (o miolo) e, mais abaixo, a coreografia (reuniao, preparo, troca, fim).
=============================================================================
*/
const DisputaPenaltis = {
    activa: false,
    fase: null,            // 'REUNIAO' | 'ORDEM' | 'PREPARO' | 'COBRANCA' | 'AGUARDA' | 'FIM'
    sinalZ: 1,             // a baliza em uso: z = sinalZ * 53
    bateuNaTrave: false,
    _cobranca: null,       // { lado, batedor, goleiro, aoFim, tContato, resultado, papelGuardado }

    // Os ganchos do motor (match_physics.js): so valem durante uma cobranca com o remate no ar.
    // Golo so do remate: depois de o goleiro tocar, se outro (o batedor na recarga) a mete, foi defesa (na disputa nao ha recarga).
    golNaBaliza() {
        const c = this._cobranca;
        if (!c || c.resultado || c.tContato === null) return;
        this._notarToque();
        c.resultado = (c.gkTocou && Match.lastTouchedPlayer && Match.lastTouchedPlayer !== c.goleiro) ? 'defesa' : 'gol';
    },
    // O goleiro tocou na bola depois do contato (marca-se no frame, antes de alguem a tocar outra vez).
    _notarToque() { const c = this._cobranca; if (c && c.goleiro && Match.lastTouchedPlayer === c.goleiro) c.gkTocou = true; },
    bolaFora() { const c = this._cobranca; if (c && !c.resultado && c.tContato !== null) this._classificarSemGol(); },

    // Defesa se o goleiro tem a bola ou foi o ultimo a toca-la; trave se bateu num poste; senao fora.
    _classificarSemGol() {
        const c = this._cobranca;
        if (c.goleiro && (c.goleiro.hasBall || Match.lastTouchedPlayer === c.goleiro || c.gkTocou)) c.resultado = 'defesa';
        else if (this.bateuNaTrave) c.resultado = 'trave';
        else c.resultado = 'fora';
    },

    /*
    A BALIZA DA COBRANCA. O motor do penalti le a baliza de cada jogador (`dirZ`, `targetGoalZ`, `ownGoalZ`: o batedor chuta para a `targetGoalZ` dele e o goleiro defende a
    `ownGoalZ` dele — baterPenalti em player.js, match_physics.js), e esses campos vem do lado do TIME (Lados). Na disputa os dois times batem na MESMA baliza (`sinalZ`), por
    isso, durante a cobranca, o batedor e o goleiro apontam para ela; `_reporLados` repoe-lhes o lado do time no fim (a mesma conta de match_loop.js, troca de lados).
    */
    _apontarParaBaliza(batedor, goleiro) {
        const meio = CAMPO_COMP / 2;
        const por = (p, dir) => { p.dirZ = dir; p.targetGoalZ = meio * dir; p.ownGoalZ = -meio * dir; };
        por(batedor, this.sinalZ);
        if (goleiro) por(goleiro, -this.sinalZ);
    },
    _reporLados(...jogadores) {
        const meio = CAMPO_COMP / 2;
        jogadores.forEach(p => { if (!p) return; p.dirZ = Lados.dirDe(p.team); p.targetGoalZ = meio * p.dirZ; p.ownGoalZ = -meio * p.dirZ; });
    },

    /*
    UMA COBRANCA. O goleiro que bate perde o papel `gk` so durante o gesto (o ramo do penalti em player.js exclui o `gk` da corrida); o papel volta no fim. `aoFim(resultado)`
    chama-se uma vez; depois o estado volta a `DISPUTA` e a bola fica onde parou.
    */
    cobrar(lado, batedor, goleiro, aoFim) {
        this.bateuNaTrave = false;
        this._soltou = false;
        const papelGuardado = batedor.role === 'gk' ? 'gk' : null;
        if (papelGuardado) batedor.role = 'atk';
        batedor.disputaOrdem = null;
        if (goleiro) goleiro.disputaOrdem = null;
        this._cobranca = { lado, batedor, goleiro, aoFim, tContato: null, resultado: null, papelGuardado, t: 0 };
        this._apontarParaBaliza(batedor, goleiro);
        Match.iniciarPenaltiDaDisputa(batedor, goleiro);
    },

    // Na cobranca (chamado do `update`): espera o contato (o estado passa a PLAY), conta 7 s ou ate haver resultado.
    atualizarCobranca(dt) {
        const c = this._cobranca;
        if (!c) return;
        c.t += dt;
        if (c.tContato === null) {
            if (Match.state === 'PLAY') c.tContato = 0;   // `baterPenalti` mudou o estado no contato
            else if (c.t > 30) { c.resultado = 'fora'; }  // a rede de seguranca: o batedor nunca chegou a bola
        } else {
            c.tContato += dt;
            this._notarToque();
            // A recarga: depois da defesa, quem toca a seguir (o batedor) ja nao conta — a cobranca acabou em defesa.
            if (!c.resultado && c.gkTocou && Match.lastTouchedPlayer && Match.lastTouchedPlayer !== c.goleiro) c.resultado = 'defesa';
            if (!c.resultado) {
                const parada = Match.ballVel.length() < 0.3 && c.tContato > 1.0;
                if (c.goleiro && c.goleiro.hasBall) this._classificarSemGol();
                else if (parada || c.tContato > DisputaModel.prazo.cobranca) this._classificarSemGol();
            }
        }
        if (c.resultado) this._fimDaCobranca();
    },

    /*
    DESFAZ A COBRANCA EM CURSO (se houver): devolve ao goleiro-batedor o papel `gk`, aos dois a baliza do time (`_reporLados`), apaga o penalti pendente e para-os. Devolve a
    cobranca desfeita (ou null). Chamado no fim normal de uma cobranca (`_fimDaCobranca`) e por todos os caminhos que acabam a disputa a meio (`_libertar`), para que nenhum
    jogador fique a apontar para a baliza errada nem sem o papel de goleiro.
    */
    abortarCobranca() {
        const c = this._cobranca;
        if (!c) return null;
        this._cobranca = null;
        if (c.papelGuardado) c.batedor.role = c.papelGuardado;
        this._reporLados(c.batedor, c.goleiro);
        Match.penaltiPendente = false;
        Match.penaltiEmVoo = 0;
        [c.batedor, c.goleiro].forEach(p => { if (p) { p.velocity.set(0, 0, 0); p.hasBall = false; if (p.fsm) p.fsm.changeState('IDLE'); } });
        return c;
    },

    _fimDaCobranca() {
        const c = this.abortarCobranca();
        if (!c) return;
        // O goleiro (e o batedor) sem coreografia ficavam congelados no ar no fim do mergulho durante a espera da app: passado `pausa.levantar` s ficam de pe onde estao.
        this._levantar = { t: 0, jogadores: [c.batedor, c.goleiro].filter(Boolean) };
        Match.mudarEstado('DISPUTA', 'fim_da_cobranca');
        Match.ballVel.set(0, 0, 0);
        if (c.aoFim) c.aoFim(c.resultado);
    },

    // O passo de um jogador em coreografia (chamado do topo do FootballPlayer.update): anda em linha reta pelos pontos de `disputaOrdem.wps`.
    passoDoJogador(p, dt) {
        const s = p.disputaOrdem;
        const pos = p.model.position;
        if (s.i < s.wps.length) {
            const w = s.wps[s.i];
            const dx = w.x - pos.x, dz = w.z - pos.z, d = Math.hypot(dx, dz);
            if (d < 0.05) s.i++;
            else {
                const passo = Math.min(d, s.vel * dt);
                pos.x += dx / d * passo; pos.z += dz / d * passo;
                p.velocity.set(dx / d * s.vel, 0, dz / d * s.vel);
                s.yawAlvo = Math.atan2(dx, dz);
            }
        }
        if (s.i >= s.wps.length) {
            s.chegou = true; p.velocity.set(0, 0, 0);
            if (s.olhar) s.yawAlvo = Math.atan2(s.olhar.x - pos.x, s.olhar.z - pos.z);
        }
        const alvo = (typeof s.yawAlvo === 'number') ? s.yawAlvo : s.yaw;
        const dif = Math.atan2(Math.sin(alvo - s.yaw), Math.cos(alvo - s.yaw));
        s.yaw += dif * (1 - Math.exp(-dt * 9));
        p.model.quaternion.setFromAxisAngle(this._eixoY || (this._eixoY = new THREE.Vector3(0, 1, 0)), s.yaw);
        p.animateBones(dt);
    },

    // ----------------------------------------------------------------------------------------------------------------------------------------------------------
    // A COREOGRAFIA
    // ----------------------------------------------------------------------------------------------------------------------------------------------------------
    t: 0, partes: [], ordem: { casa: [], fora: [] }, primeiro: 'casa', atual: null, sub: null, tSub: 0, tApp: 0, pens: [0, 0],
    bolaComJuiz: false, ladoBanco: 1, _slots: null, _v: null, _soltou: false, _prazoPreparo: 30, _nCobrancas: 0, _ultimaCobranca: null, _ultimaReuniao: null,

    lista(lado) { return lado === 'casa' ? Match.players : Match.opponents; },
    ladoDe(p) { return p.team === 'TeamA' ? 'casa' : 'fora'; },
    goleiroDe(lado) { return this.lista(lado).find(p => p.role === 'gk') || null; },
    /*
    O ID QUE A APP CONHECE: o real (`skills.id` = AdaptadorManager.idReal('p-269429')). O `p.id` do motor e o LUGAR (0..10 TeamA, 20..30 TeamB; quem entra herda o do que sai) e
    nao serve ao manager. Tudo o que a disputa manda ou recebe da app (reuniao, ordens, proxima, cobranca) passa por aqui. Sem skills (nunca no manager), o id do motor.
    */
    idApp(p) { return (p && p.skills && p.skills.id !== undefined && p.skills.id !== null) ? p.skills.id : (p ? p.id : null); },
    jogadorPorId(lado, id) { return this.lista(lado).find(p => this.idApp(p) === id) || null; },
    _banco(lado) { return (typeof Bancos !== 'undefined' && Bancos.bancos) ? (Bancos.bancos.find(b => b.equipa === (lado === 'casa' ? 'A' : 'B')) || null) : null; },

    // So arranca no 3D visivel dentro do manager, com `decisao` e o jogo empatado no agregado, e com goleiro em campo nos dois times.
    podeIniciar() {
        const d = Match.decisao;
        if (!d || (typeof Sim !== 'undefined' && Sim.running)) return false;
        if (typeof Ponte === 'undefined' || Ponte.modo !== 'visivel') return false;
        if (Match.placarA + d.agregadoCasa !== Match.placarB + d.agregadoFora) return false;
        if (typeof Officials === 'undefined' || !Officials.arbitro || !Officials.assistentes || Officials.assistentes.length < 2) return false;
        return !!(this.goleiroDe('casa') && this.goleiroDe('fora'));
    },

    // Um movimento: `obj` (jogador, oficial ou o registo do tecnico) vai pelos pontos `wps`, a `vel` m/s, e ao chegar olha para `olhar`.
    _parte(tipo, obj, model, wps, vel, olhar) {
        if (tipo === 'jog') this._reporCorpo(obj);
        const s = { tipo, obj, model, wps, i: 0, vel, olhar: olhar || null, chegou: false, yaw: 0, yawAlvo: undefined };
        const f = new THREE.Vector3(0, 0, 1).applyQuaternion(model.quaternion);
        s.yaw = Math.atan2(f.x, f.z);
        this.partes = this.partes.filter(x => x.obj !== obj);
        this.partes.push(s);
        if (tipo === 'jog') { obj.disputaOrdem = s; obj.hasBall = false; obj.velocity.set(0, 0, 0); if (obj.fsm) obj.fsm.changeState('IDLE'); }
        return s;
    },
    _parteDe(obj) { return this.partes.find(x => x.obj === obj) || null; },

    /*
    O CORPO DE PE ANTES DE ANDAR (relato com fotos: "o goleiro esta flutuando" na disputa). O goleiro que mergulhou numa cobranca ficava com `gkEstado = 'mergulho'` e a altura do
    mergulho no `model.position.y`: o `assentarNoChao` (no fim do `animateBones`, chamado pelo `passoDoJogador`) nao assenta um goleiro em mergulho, e ele caminhava e esperava as
    cobrancas seguintes 20 a 75 cm acima do relvado (medido no harness: sola media 0.19 m em PREPARO, ate 0.76). Quem entra em coreografia volta a ficar de pe: estado de goleiro
    parado, sem salto nem queda, ossos na pose base e o corpo a altura base; o assento faz o resto. So mexe em quem esta fora disso (nao reinicia a passada de quem ja anda bem).
    */
    _reporCorpo(p) {
        if (!p || !p.model) return;
        const base = (typeof ALTURA_BASE_Y === 'number') ? ALTURA_BASE_Y : 0;
        const noAr = (p.gkEstado && p.gkEstado !== 'idle') || p.jumpTimer > 0 || p.peitoHopTimer > 0 || !!p.queda || Math.abs(p.model.position.y - base) > 0.12;
        if (!noAr) return;
        if (p.gkEstado !== undefined) { p.gkEstado = 'idle'; p.dive = null; p.gkReagiu = false; p.gkDelayReacao = 0; }
        p.jumpTimer = 0; p.peitoHopTimer = 0; p.queda = null;
        if (typeof p.resetBonesToDefault === 'function') p.resetBonesToDefault();
        p.model.position.y = base;
    },

    iniciar() {
        const DM = DisputaModel;
        this.activa = true; this.fase = 'REUNIAO'; this.t = 0; this.partes = []; this.pens = [0, 0]; this.atual = null; this.sub = null; this._soltou = false;
        this._nCobrancas = 0; this._ultimaCobranca = null; this._ultimaReuniao = null; this._levantar = null;
        this.sinalZ = Math.random() < 0.5 ? 1 : -1;
        this.primeiro = Math.random() < 0.5 ? 'casa' : 'fora';
        this.ladoBanco = Math.sign((typeof BancosDeReservas !== 'undefined' && BancosDeReservas.treinador && BancosDeReservas.treinador.x) || 1) || 1;
        if (!this._v) this._v = new THREE.Vector3();
        Match.disputa = this;
        Match.mudarEstado('DISPUTA', 'disputa_penaltis');
        Match.pararTodos();
        Match.ballVel.set(0, 0, 0);

        for (const lado of ['casa', 'fora']) {
            const banco = this._banco(lado);
            const zBanco = banco ? banco.zc : (lado === 'casa' ? -DM.tecnico.zDoMeio : DM.tecnico.zDoMeio);
            const tec = DM.posTecnico(this.ladoBanco, zBanco);
            const jogs = this.lista(lado).slice();
            const pts = DM.meiaLua(tec, jogs.length, this.ladoBanco, Math.random);
            if (banco && banco.treinador) this._parte('tec', banco.treinador, banco.treinador.model, [tec], DM.velocidade.tecnico, { x: 0, z: tec.z });
            jogs.forEach((p, i) => this._parte('jog', p, p.model, [pts[i]], DM.velocidade.jogador, tec));
        }
        // O juiz, com a bola na mao, vai ao circulo central e anuncia o sorteio.
        this.bolaComJuiz = true;
        const arb = Officials.arbitro;
        this._parte('arb', arb, arb.model, [{ x: 0, z: 0 }], DM.velocidade.juiz, { x: this.ladoBanco * 10, z: 0 });
        if (typeof Officials.anunciar === 'function') Officials.anunciar('PENALTY SHOOTOUT');
    },

    _todosChegaram() { return this.partes.every(s => s.chegou); },

    // A reuniao acabou: o 3D pede a ordem (ids reais, `idApp`; so quem esta em campo) e espera a resposta (`receberOrdens`).
    _pedirOrdem() {
        this.fase = 'ORDEM'; this.tApp = 0;
        // O nome vem de `skills.nome` (data/player_skills.js) e o numero da camisola de `num` (ver desenhaCostas em player.js).
        const dados = (lista) => lista.map(p => ({ id: this.idApp(p), nome: (p.skills && p.skills.nome) || p.nomeCamisola || '', numero: p.num || 0, gk: p.role === 'gk' }));
        this._ultimaReuniao = { casa: dados(Match.players), fora: dados(Match.opponents), ladoBaliza: this.sinalZ, primeiro: this.primeiro };
        Ponte.enviar('disputa_reuniao', this._ultimaReuniao);
    },

    /*
    O MANAGER VOLTOU (Ponte.continuar): enquanto esteve fora (Tactics...) o 3D esteve em pausa e o MatchDay desmontado, e uma mensagem mandada mesmo antes da pausa pode ter-se
    perdido. O que estava a espera de resposta vai outra vez, marcado como reenvio: a ordem (ORDEM) ou a ultima cobranca (AGUARDA, com o mesmo `n`; a app nao a soma duas vezes).
    */
    reenviarPendente() {
        if (!this.activa || typeof Ponte === 'undefined') return;
        if (this.fase === 'ORDEM' && this._ultimaReuniao) Ponte.enviar('disputa_reuniao', Object.assign({}, this._ultimaReuniao, { reenvio: true }));
        else if (this.fase === 'AGUARDA' && this._ultimaCobranca) Ponte.enviar('disputa_cobranca', Object.assign({}, this._ultimaCobranca, { reenvio: true }));
    },

    // A app mandou as ordens (ids reais, `idApp`) e o primeiro batedor: monta os lugares da fila e arranca o preparo.
    receberOrdens(ordemCasa, ordemFora, proxima) {
        if (!this.activa || this.fase !== 'ORDEM') return;
        if (!proxima || proxima.abortar) { this._abortar(); return; }
        this.ordem.casa = (ordemCasa || []).slice(); this.ordem.fora = (ordemFora || []).slice();
        const f = DisputaModel.filaCentral(Match.players.length, Match.opponents.length);
        this._slots = new Map();
        Match.players.forEach((p, i) => this._slots.set(p, f.casa[i]));
        Match.opponents.forEach((p, i) => this._slots.set(p, f.fora[i]));
        this._prepararCobranca(proxima);
    },

    // Quem anda para onde, para a cobranca de `proxima` = { lado, jogadorId }: o batedor para a marca, o goleiro que defende para a linha, o outro goleiro para a lateral da
    // area, o juiz e o bandeirinha para os postos; os demais para a fila do meio-campo.
    _prepararCobranca(proxima) {
        const DM = DisputaModel;
        this.fase = 'PREPARO'; this.sub = 'andar'; this.tSub = 0; this.t = 0;
        const lado = proxima.lado, outro = lado === 'casa' ? 'fora' : 'casa';
        const batedor = this.jogadorPorId(lado, proxima.jogadorId);
        // O contrato: a app manda sempre ids que o 3D conhece. Se nao conhece o batedor nao ha como encenar a cobranca: acaba como se nao houvesse disputa (a app cai no modal de texto).
        if (!batedor) { this._abortar(); return; }
        const goleiro = this.goleiroDe(outro);
        this.atual = { lado, batedor, goleiro, tecnicos: null };
        const marca = DM.posMarca(this.sinalZ), gol = DM.posGol(this.sinalZ);
        const vel = DM.velocidade;
        const assistente = Officials.assistentes.find(a => Math.sign(a.model.position.z) === this.sinalZ) || Officials.assistentes[0];
        const ladoAssist = Math.sign(assistente.model.position.x) || 1;

        for (const p of Match.players.concat(Match.opponents)) {
            if (p === batedor) { this._parte('jog', p, p.model, [{ x: marca.x, z: marca.z - this.sinalZ * 0.9 }], vel.jogador, marca); continue; }
            if (p === goleiro) { this._parte('jog', p, p.model, [{ x: gol.x, z: gol.z - this.sinalZ * 0.5 }], vel.goleiro, marca); continue; }
            if (p.role === 'gk' && this.ladoDe(p) === lado) {
                this._parte('jog', p, p.model, [DM.posGoleiroEspera(this.sinalZ, -ladoAssist)], vel.goleiro, marca); continue;
            }
            const slot = this._slots.get(p);
            this._parte('jog', p, p.model, [slot], vel.jogador, { x: 0, z: this.sinalZ * 20 });
        }
        const arb = Officials.arbitro, j = DM.posJuiz(this.sinalZ);
        this.bolaComJuiz = true;
        this._parte('arb', arb, arb.model, [j], vel.juiz, marca);
        this._parte('lin', assistente, assistente.model, [DM.posBandeirinha(this.sinalZ, ladoAssist)], vel.bandeirinha, { x: 0, z: this.sinalZ * 53 });
        this._prazoPreparo = DM.prazo.preparo;
    },

    // Um frame (chamado do Match.update): a cobranca corre pelo miolo (`atualizarCobranca`); as outras fases tem os seus tempos.
    update(dt) {
        if (!this.activa) return;
        const DM = DisputaModel;
        this.t += dt;
        if (this._levantar && !this._cobranca) {
            this._levantar.t += dt;
            if (this._levantar.t > (DM.pausa.levantar || 0.8)) {
                for (const p of this._levantar.jogadores) if (!p.disputaOrdem) this._parte('jog', p, p.model, [{ x: p.model.position.x, z: p.model.position.z }], DM.velocidade.jogador, DM.posMarca(this.sinalZ));
                this._levantar = null;
            }
        }
        if (this._cobranca) {
            this.fase = 'COBRANCA';
            this.atualizarCobranca(dt);
            // Passado o contato, o batedor volta andando para o lugar dele na fila.
            const c = this._cobranca;
            if (c && c.tContato !== null && c.tContato > DM.pausa.aposContato && !this._soltou) {
                this._soltou = true;
                const slot = this._slots && this._slots.get(c.batedor);   // sem fila (a cobranca corrida a seco, nos testes) o batedor fica onde esta
                if (slot && c.batedor.role !== 'gk') this._parte('jog', c.batedor, c.batedor.model, [slot], DM.velocidade.jogador, { x: 0, z: this.sinalZ * 20 });
            }
            return;
        }
        switch (this.fase) {
            case 'REUNIAO':
                if (this._todosChegaram() || this.t > DM.prazo.reuniao) this._pedirOrdem();
                break;
            // ORDEM espera uma decisao humana (o modal da ordem dos batedores no manager): prazo longo. AGUARDA espera so a resposta automatica da app.
            case 'ORDEM':
            case 'AGUARDA':
                this.tApp += dt;
                if (this.tApp > (this.fase === 'ORDEM' ? DM.prazo.ordem : DM.prazo.app)) this._abortar();
                break;
            case 'PREPARO': this._atualizarPreparo(dt); break;
            case 'FIM':
                if (this.t > DM.pausa.fim) this._encerrar();
                break;
        }
    },

    _atualizarPreparo(dt) {
        const DM = DisputaModel, a = this.atual;
        this.tSub += dt;
        if (this.sub === 'andar') {
            const prontos = [a.batedor, a.goleiro].every(p => this._parteDe(p) && this._parteDe(p).chegou) && this._parteDe(Officials.arbitro).chegou;
            if (prontos || this.t > this._prazoPreparo) { this.sub = 'entrega'; this.tSub = 0; }
        } else if (this.sub === 'entrega') {
            // O juiz entrega a bola; o batedor a ajeita na marca.
            if (this.tSub > DM.pausa.entrega) {
                this.bolaComJuiz = false;
                const m = DM.posMarca(this.sinalZ);
                Match.ball.position.set(m.x, BallPhysics.raio, m.z);
                Match.ballVel.set(0, 0, 0);
                this.sub = 'ajeita'; this.tSub = 0;
            }
        } else if (this.sub === 'ajeita') {
            if (this.tSub > DM.pausa.ajeitar) {
                const e = DM.posEsperaBatedor(this.sinalZ), m = DM.posMarca(this.sinalZ);
                this._parte('jog', a.batedor, a.batedor.model, [e], DM.velocidade.jogador, m);
                this.sub = 'recuo'; this.tSub = 0;
            }
        } else if (this.sub === 'recuo') {
            const s = this._parteDe(a.batedor);
            if ((s && s.chegou) || this.tSub > 8) {
                this.sub = null;
                this.cobrar(a.lado, a.batedor, a.goleiro, (r) => this._aoFimDaCobranca(r));
            }
        }
    },

    _aoFimDaCobranca(resultado) {
        const a = this.atual;
        this._soltou = false;
        this.fase = 'AGUARDA'; this.tApp = 0;
        // A bola volta ao juiz (fora de cena, como o apanha-bolas): o preparo seguinte pega nela ja na mao dele.
        this.bolaComJuiz = true;
        // `n`: o indice desta cobranca (a app nao soma duas vezes um reenvio, ver reenviarPendente).
        this._ultimaCobranca = { lado: a.lado, jogadorId: this.idApp(a.batedor), resultado, n: this._nCobrancas++ };
        Ponte.enviar('disputa_cobranca', this._ultimaCobranca);
    },

    // A resposta da app: o proximo batedor, ou o fim.
    // `abortar` (a app nao tem proximo batedor): a disputa desfaz-se em qualquer fase e o jogo acaba sem ela.
    receberProxima(m) {
        if (this.activa && m && m.abortar && !this._cobranca) { this._abortar(); return; }
        if (!this.activa || this.fase !== 'AGUARDA') return;
        if (m.fim) { this.pens = m.pens || this.pens; this.fase = 'FIM'; this.t = 0; return; }
        this._prepararCobranca(m);
    },

    _encerrar() {
        Ponte.enviar('disputa_fim', { pens: this.pens });
        this._libertar();
        Match.encerrarJogo();
    },

    // Sem resposta da app: o jogo termina como se nao houvesse disputa (a app cai no modal de texto).
    _abortar() { this._libertar(); Match.encerrarJogo(); },

    // Todos os caminhos que acabam a disputa passam por aqui: antes de largar os jogadores desfaz-se uma cobranca a meio (baliza dos jogadores, papel `gk`, penalti pendente).
    _libertar() {
        this.abortarCobranca();
        for (const s of this.partes) if (s.tipo === 'jog') { s.obj.disputaOrdem = null; s.model.visible = true; }
        this.partes = []; this.activa = false; this.fase = null; this.bolaComJuiz = false; this._levantar = null;
        Match.disputa = null;
    },

    // ESC: leva todos direto aos pontos finais (so durante o caminhar; nunca salta cobrancas, por isso nao ha cobranca a desfazer aqui).
    cancelar() {
        if (!this.activa || this._cobranca || !['REUNIAO', 'PREPARO', 'AGUARDA'].includes(this.fase)) return;
        for (const s of this.partes) {
            const w = s.wps[s.wps.length - 1];
            if (w) { s.model.position.x = w.x; s.model.position.z = w.z; s.i = s.wps.length; s.chegou = true; }
        }
    },

    // O juiz, o bandeirinha e o tecnico andam por `Officials.mover`; a bola vai na mao do juiz enquanto `bolaComJuiz`.
    moverOficiais(dt) {
        for (const s of this.partes) {
            if (s.tipo === 'jog') continue;
            const w = s.wps[s.wps.length - 1];
            Officials.mover(s.obj, w.x, w.z, s.vel, dt, s.olhar || undefined);
            s.chegou = Math.hypot(w.x - s.model.position.x, w.z - s.model.position.z) < 0.4;
            if (s.tipo === 'lin') Officials._ajustarPano(s.obj, dt);
        }
        if (this.bolaComJuiz && typeof Abertura !== 'undefined') { Abertura._v = Abertura._v || this._v; Abertura._bolaNaMao(); }
        Officials.atualizarVista();
    },

    // A camera: na reuniao, do outro lado do campo para as duas meias-luas; depois, atras do batedor com a baliza ao fundo.
    camera(pos, look) {
        const DM = DisputaModel;
        if (this.fase === 'REUNIAO' || this.fase === 'ORDEM') {
            pos.set(-this.ladoBanco * 30, 14, 0);
            look.set(this.ladoBanco * 26, 1.2, 0);
        } else {
            const m = DM.posMarca(this.sinalZ);
            pos.set(0, 2.4, m.z - this.sinalZ * 16);
            look.set(0, 1.2, this.sinalZ * 50);
        }
    }
};
if (typeof window !== 'undefined') window.DisputaPenaltis = DisputaPenaltis;
