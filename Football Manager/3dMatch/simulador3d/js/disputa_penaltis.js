/*
=============================================================================
A DISPUTA DE PENALTIS EM 3D (ver docs/superpowers/specs/2026-10-31-disputa-penaltis-3d-design.md, medidas em config/disputa.js)
=============================================================================
Corre quando um jogo de copa visto no manager termina empatado (Match.decisao, mandada no `iniciar` pelo manager). Estado `DISPUTA` do Match; `Match.disputa` aponta para
este objeto enquanto dura. As REGRAS (quem bate, quando acaba) sao do manager (textSim/penaltyShootout.ts): o 3D encena, reporta o resultado de cada cobranca (gol, defesa,
trave, fora — pela fisica do penalti em jogo) e espera `disputa_proxima`.

Neste ficheiro: a COBRANCA (este bloco) e, mais abaixo, a coreografia (reuniao, preparo, troca, fim).
=============================================================================
*/
const DisputaPenaltis = {
    activa: false,
    fase: null,            // 'REUNIAO' | 'ORDEM' | 'PREPARO' | 'COBRANCA' | 'AGUARDA' | 'FIM'
    sinalZ: 1,             // a baliza em uso: z = sinalZ * 53
    bateuNaTrave: false,
    _cobranca: null,       // { lado, batedor, goleiro, aoFim, tContato, resultado, papelGuardado }

    // Os ganchos do jogo (match_loop.js, no fim do 2.o tempo). Por enquanto a disputa nunca arranca sozinha: a coreografia e o `iniciar` vem nas tarefas seguintes.
    podeIniciar() { return false; },
    iniciar() { },

    // Os ganchos do motor (match_physics.js): so valem durante uma cobranca com o remate no ar.
    golNaBaliza() { const c = this._cobranca; if (c && !c.resultado && c.tContato !== null) c.resultado = 'gol'; },
    bolaFora() { const c = this._cobranca; if (c && !c.resultado && c.tContato !== null) this._classificarSemGol(); },

    // Defesa se o goleiro tem a bola ou foi o ultimo a toca-la; trave se bateu num poste; senao fora.
    _classificarSemGol() {
        const c = this._cobranca;
        if (c.goleiro.hasBall || Match.lastTouchedPlayer === c.goleiro) c.resultado = 'defesa';
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
        const papelGuardado = batedor.role === 'gk' ? 'gk' : null;
        if (papelGuardado) batedor.role = 'atk';
        batedor.disputaOrdem = null;
        if (goleiro) goleiro.disputaOrdem = null;
        this._cobranca = { lado, batedor, goleiro, aoFim, tContato: null, resultado: null, papelGuardado, t: 0 };
        this._apontarParaBaliza(batedor, goleiro);
        Match.iniciarPenaltiDaDisputa(batedor, goleiro);
    },

    // Um frame (chamado do Match.update). Na cobranca: espera o contato (o estado passa a PLAY), conta 7 s ou ate haver resultado.
    update(dt) { this.atualizarCobranca(dt); },

    atualizarCobranca(dt) {
        const c = this._cobranca;
        if (!c) return;
        c.t += dt;
        if (c.tContato === null) {
            if (Match.state === 'PLAY') c.tContato = 0;   // `baterPenalti` mudou o estado no contato
            else if (c.t > 30) { c.resultado = 'fora'; }  // a rede de seguranca: o batedor nunca chegou a bola
        } else {
            c.tContato += dt;
            if (!c.resultado) {
                const parada = Match.ballVel.length() < 0.3 && c.tContato > 1.0;
                if (c.goleiro && c.goleiro.hasBall) this._classificarSemGol();
                else if (parada || c.tContato > DisputaModel.prazo.cobranca) this._classificarSemGol();
            }
        }
        if (c.resultado) this._fimDaCobranca();
    },

    _fimDaCobranca() {
        const c = this._cobranca;
        this._cobranca = null;
        if (c.papelGuardado) c.batedor.role = c.papelGuardado;
        this._reporLados(c.batedor, c.goleiro);
        Match.penaltiPendente = false;
        Match.penaltiEmVoo = 0;
        Match.mudarEstado('DISPUTA', 'fim_da_cobranca');
        Match.ballVel.set(0, 0, 0);
        [c.batedor, c.goleiro].forEach(p => { if (p) { p.velocity.set(0, 0, 0); p.hasBall = false; if (p.fsm) p.fsm.changeState('IDLE'); } });
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
    }
};
if (typeof window !== 'undefined') window.DisputaPenaltis = DisputaPenaltis;
