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
        if (this._cobranca) this._fimDaCobranca();   // uma cobranca anterior ainda no desfecho: fecha-se primeiro
        this.bolaComJuiz = false;                     // a bola esta na marca (o juiz ja a entregou no preparo)
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
        if (c.resultado && !c.desfecho) this._iniciarDesfecho();
    },

    /*
    O DESFECHO (relato: "sai gol mas a bola nao bate na rede e a torcida nao vibra; o goleiro defende e a bola some; e um penalti normal"). O resultado era classificado e no
    MESMO frame tudo parava: estado DISPUTA, bola congelada e posta na mao do juiz. Agora, conhecido o resultado, a app fica logo a saber (o card atualiza), mas o lance continua
    como um penalti em jogo durante `pausa.desfechoGol` / `desfechoDefesa` / `desfechoFora` s: a bola segue a fisica (a rede, o ressalto, sai pela linha de fundo), o goleiro
    fica com ela ou espalma; no golo a torcida festeja e o estadio grita (`festa`, lida pelo Crowd e pelo AmbienteSonoro como o estado GOAL), o juiz apita, o aviso GOOL acende e o
    batedor comemora (Comemoracao). Nada disto toca no placar, nos eventos ou nas estatisticas do jogo (o ramo do golo em match_physics.js so chama `golNaBaliza` na disputa) e o
    estado nunca passa a GOAL (sem saida de bola). So no fim do desfecho todos param e o juiz fica com a bola; a cobranca seguinte espera por isso (`receberProxima`).
    */
    festa: null,
    _iniciarDesfecho() {
        const c = this._cobranca, DM = DisputaModel;
        const P = DM.pausa;
        c.gkSegurou = !!(c.goleiro && c.goleiro.hasBall);   // ficou com a bola: no fim ele a atira ao juiz
        c.desfecho = { t: 0, dur: c.resultado === 'gol' ? (P.desfechoGol || 4.5) : c.resultado === 'defesa' ? (P.desfechoDefesa || 2.5) : (P.desfechoFora || 2.5) };
        if (c.resultado === 'gol') this._reacaoDeGolo(c);
        // Quem bate e PERDE (defesa, trave, fora): a torcida do OUTRO time vibra e grita GOOOL (a `festa` e a mesma do golo, para a equipa do goleiro, sem aviso GOOL nem apito).
        else {
            this.festa = { equipa: (c.batedor.team === 'TeamA') ? 'TeamB' : 'TeamA', t: 0 };
            // E quem PERDEU leva as maos a cabeca (a animacao do gol perdido, QuaseGoloModel): fica parado a lamentar ate ela acabar, e so entao volta ao posto.
            // Fica PARADO, com a mao na cabeca, uns 5 s (`dur`), e so entao caminha para o meio-campo (antes a arvore do jogo o levava a correr para o posto).
            if (c.batedor.rig) {
                c.batedor.lamento = { t: 0, dur: 5.0 }; c.lamentou = true;
                const q = c.batedor.model.position;
                this._parte('jog', c.batedor, c.batedor.model, [{ x: q.x, z: q.z }], 1.0, { x: q.x, z: q.z - this.sinalZ * 10 });
            }
        }
        // O batedor nao fica solto no desfecho (o estado e PLAY e a arvore do jogo levava-o para o posto da formacao — um goleiro que batia, com o papel 'atk', atravessava o
        // campo): se nao comemora, sai ja da jogada (o resultado pode chegar antes do `pausa.aposContato` do `update`).
        if (!c.comemora && !this._soltou && !c.batedor.lamento) this._soltarBatedor(c);
        if (c.aoFim) { const f = c.aoFim; c.aoFim = null; f(c.resultado); }
    },
    // A apresentacao do golo do ramo normal (match_physics.js), sem creditar nada: apito, aviso GOOL, torcida e grito (via `festa`), comemoracao do batedor.
    _reacaoDeGolo(c) {
        this.festa = { equipa: c.batedor.team, t: 0 };
        if (typeof EfeitosSonoros !== 'undefined' && EfeitosSonoros.apito) EfeitosSonoros.apito(1.0);
        const alerta = (typeof document !== 'undefined') ? document.getElementById('alerta-golo') : null;
        if (alerta) { alerta.style.opacity = '1'; alerta.style.transform = 'translate(-50%, -50%) scale(1.2)'; setTimeout(() => { alerta.style.transform = 'translate(-50%, -50%) scale(1)'; }, 150); }
        if (typeof Comemoracao !== 'undefined' && c.batedor.role !== 'gk' && !c.papelGuardado) {
            c.batedor.disputaOrdem = null;
            c.comemora = !!Comemoracao.iniciar(c.batedor, this.sinalZ, true);
        }
    },
    /*
    O batedor sai da jogada depois do remate: volta andando para o lugar dele na fila. O GOLEIRO QUE BATEU nao vai para a fila do meio-campo (relato: "as vezes o goleiro e
    resetado para o meio do campo"): durante a cobranca o papel dele e 'atk' (papelGuardado), e o teste `role !== 'gk'` mandava-o para a fila (z = 0); e solto, a arvore do
    jogo (estado PLAY) levava-o como avancado. Fica parado onde esta, em coreografia, ate o preparo seguinte o levar a baliza ou ao lado da area.
    */
    _soltarBatedor(c) {
        const DM = DisputaModel;
        this._soltou = true;
        const slot = this._slots && this._slots.get(c.batedor);   // sem fila (a cobranca corrida a seco, nos testes) o batedor fica onde esta
        if (c.papelGuardado) { const q = c.batedor.model.position; this._parte('jog', c.batedor, c.batedor.model, [{ x: q.x, z: q.z }], DM.velocidade.jogador, DM.posMarca(this.sinalZ)); }
        else if (slot && c.batedor.role !== 'gk') this._parte('jog', c.batedor, c.batedor.model, [slot], c.lamentou ? 2.0 : DM.velocidade.jogador, { x: 0, z: this.sinalZ * 20 });   // depois de lamentar: a andar
    },

    _acabarFesta() {
        if (!this.festa) return;
        this.festa = null;
        const alerta = (typeof document !== 'undefined') ? document.getElementById('alerta-golo') : null;
        if (alerta) alerta.style.opacity = '0';
        if (typeof Comemoracao !== 'undefined' && Comemoracao.ativa) Comemoracao.limpar();
    },

    /*
    DESFAZ A COBRANCA EM CURSO (se houver): devolve ao goleiro-batedor o papel `gk`, aos dois a baliza do time (`_reporLados`), apaga o penalti pendente e para-os. Devolve a
    cobranca desfeita (ou null). Chamado no fim normal de uma cobranca (`_fimDaCobranca`) e por todos os caminhos que acabam a disputa a meio (`_libertar`), para que nenhum
    jogador fique a apontar para a baliza errada nem sem o papel de goleiro.
    */
    abortarCobranca(manterBaliza) {
        const c = this._cobranca;
        if (!c) return null;
        this._cobranca = null;
        if (c.papelGuardado) c.batedor.role = c.papelGuardado;
        // `manterBaliza` (o fim normal): a baliza do time volta quando eles entram em coreografia (`_parte`), nao ja — ver `_fimDaCobranca`.
        if (!manterBaliza) this._reporLados(c.batedor, c.goleiro);
        // O goleiro que bateu volta a ser goleiro ja: com a baliza de ATACANTE (a do outro lado) o `updateGK` prendia-o a area errada e ele saltava ~5 m (ou o campo todo).
        else if (c.papelGuardado) { const meio = CAMPO_COMP / 2; c.batedor.dirZ = -this.sinalZ; c.batedor.targetGoalZ = -meio * this.sinalZ; c.batedor.ownGoalZ = meio * this.sinalZ; }
        Match.penaltiPendente = false;
        Match.penaltiEmVoo = 0;
        [c.batedor, c.goleiro].forEach(p => { if (p) { p.velocity.set(0, 0, 0); p.hasBall = false; if (p.fsm) p.fsm.changeState('IDLE'); } });
        return c;
    },

    /*
    O GOLEIRO QUE DEFENDIA "DESAPARECIA" DEPOIS DA DEFESA (relato). Com a baliza do time reposta logo no fim da cobranca, o goleiro sem coreografia corria o `updateGK` no estado
    DISPUTA e o `updateGK` prende-o dentro da SUA grande area (clamp em z): um goleiro cuja baliza do time e a outra era teletransportado 88 m, para z = -36.5 (medido no harness,
    stack em player.js updateGK), e caminhava de la. Agora a baliza fica a da cobranca ate eles entrarem em coreografia (`_parte` repoe-na) e a cobranca seguinte espera o
    `pausa.levantar` (o mergulho acaba de cair; ver `receberProxima`).
    */
    _fimDaCobranca() {
        this._acabarFesta();
        const c = this.abortarCobranca(true);
        if (!c) return;
        // O goleiro (e o batedor) sem coreografia ficavam congelados no ar no fim do mergulho durante a espera da app: passado `pausa.levantar` s ficam de pe onde estao.
        this._levantar = { t: 0, jogadores: [c.batedor, c.goleiro].filter(Boolean) };
        Match.mudarEstado('DISPUTA', 'fim_da_cobranca');
        Match.ballVel.set(0, 0, 0);
        // So agora (acabado o desfecho) a bola vai para a mao do juiz, que a leva para a cobranca seguinte. Se o goleiro ficou com ela, ATIRA-A ao juiz (arco ate a mao dele);
        // senao ela vai direto (rolou para fora / ficou na rede).
        this.bolaComJuiz = true;
        if (c.gkSegurou) { const b = Match.ball.position; this._passeJuiz = { t: 0, dur: 1.0, x0: b.x, y0: Math.max(BallPhysics.raio, b.y), z0: b.z, gk: c.goleiro }; }
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
                // ANDAR DE COSTAS (`re`): de frente para onde olha (o gol / a bola) enquanto o corpo vai para o lado oposto — o `animateBones` le a frente contra a velocidade e faz a passada de re.
                s.yawAlvo = (s.re && s.olhar) ? Math.atan2(s.olhar.x - pos.x, s.olhar.z - pos.z) : Math.atan2(dx, dz);
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
        /*
        O GOLEIRO A OLHAR PARA O CEU (relato com foto). A postura do penalti (GoalkeeperPose.penalti) levanta o pescoco (`cabeca` -0.48) e roda os pes (`pe` -0.75) para
        compensar o tronco inclinado; quem escreve isso de volta e o `updateGK`, que nao corre em coreografia, e o `animateBones` endireita a anca mas nao o pescoco de um goleiro
        (o `nivelarCabeca` nao trata goleiros). Saido da postura ele caminhava e esperava a olhar 30-37 graus para cima (medido). Em coreografia o pescoco e os pes voltam a direito.
        */
        const rg = p.rig;
        if (rg) {
            const k = 1 - Math.exp(-dt * 10);
            if (rg.neck) rg.neck.rotation.x += (0 - rg.neck.rotation.x) * k;
            if (p.role === 'gk' || p.gkEstado !== undefined) {
                if (rg.lFoot) rg.lFoot.rotation.x += (0 - rg.lFoot.rotation.x) * k;
                if (rg.rFoot) rg.rFoot.rotation.x += (0 - rg.rFoot.rotation.x) * k;
                if (rg.chest) rg.chest.rotation.x += (0 - rg.chest.rotation.x) * k;
            }
        }
        // O relogio da lamentacao do gol perdido (em coreografia o `update` do jogador sai antes de o contar).
        if (p.lamento) { p.lamento.t += dt; if (typeof QuaseGoloModel === 'undefined' || p.lamento.t >= (p.lamento.dur || QuaseGoloModel.duracao)) p.lamento = null; }
        p.animateBones(dt);
        // OS COLEGAS FESTEJAM A BATIDA FAVORAVEL (golo do time deles ou erro do adversario): ja nos postos, pulam de bracos no ar. Nao o batedor (comemora a parte). Os goleiros tambem vibram (o da cobranca, se defendeu, depois de se levantar: ver o desfecho).
        const fe = this.festa, cb = this._cobranca;
        if (fe && fe.equipa === p.team && s.chegou && rg && !(cb && p === cb.batedor)) {
            if (s.faseFesta === undefined) s.faseFesta = Math.random() * 6.28;
            const ondaP = Math.abs(Math.sin(fe.t * 8 + s.faseFesta));
            const bx = -2.6 + Math.sin(fe.t * 11 + s.faseFesta) * 0.25;
            rg.lArm.rotation.x = bx; rg.rArm.rotation.x = bx;
            rg.lArm.rotation.z = 0.25; rg.rArm.rotation.z = -0.25;
            rg.lElbow.rotation.x = -0.3; rg.rElbow.rotation.x = -0.3;
            rg.lLeg.rotation.x = -0.25 * ondaP; rg.rLeg.rotation.x = -0.25 * ondaP;
            // AS SOLAS NO RELVADO ANTES DE SALTAR (relato: pulavam "no ar" — o goleiro, que o `animateBones` nao assenta, ficava com os pes acima do chao ate no ponto mais baixo): assenta-se com a
            // pose ja escrita e so entao se soma o salto, que vai a zero no ponto mais baixo.
            // (o goleiro que mergulhou ficava com `gkEstado` 'mergulho': o assento ignora-o ate no chao; em festa volta a 'idle'.)
            if (p.role === 'gk' && p.gkEstado !== undefined && p.gkEstado !== 'idle') { p.gkEstado = 'idle'; p.dive = null; }
            p.jumpTimer = 0;
            if (p.assentarNoChao) { for (let k = 0; k < 6; k++) p.assentarNoChao(); }
            p.model.position.y += 0.34 * ondaP;
        }
        // O BATEDOR SE ABAIXA PARA AJEITAR A BOLA, como o goleiro se abaixa para apanha-la (GoalkeeperPose.apanhar + as solas e as palmas por IK), antes de recuar para bater.
        if (s.agachar && Match.ball && typeof GoalkeeperPose !== 'undefined' && GoalkeeperPose.apanhar && rg) {
            const P = GoalkeeperPose.apanhar, L = (a, b) => a + (b - a) * 0.5;
            rg.lLeg.rotation.x = L(rg.lLeg.rotation.x, P.coxa); rg.rLeg.rotation.x = L(rg.rLeg.rotation.x, P.coxa);
            rg.lKnee.rotation.x = L(rg.lKnee.rotation.x, P.joelho); rg.rKnee.rotation.x = L(rg.rKnee.rotation.x, P.joelho);
            rg.lArm.rotation.x = L(rg.lArm.rotation.x, P.bracoX); rg.rArm.rotation.x = L(rg.rArm.rotation.x, P.bracoX);
            rg.lElbow.rotation.x = L(rg.lElbow.rotation.x, P.cotovelo); rg.rElbow.rotation.x = L(rg.rElbow.rotation.x, P.cotovelo);
            rg.chest.rotation.x = L(rg.chest.rotation.x, P.chest);
            p.model.position.y = L(p.model.position.y, ALTURA_BASE_Y + P.altura);
            if (p.apanharPorIK) p.apanharPorIK(p.model, rg, P);
        }
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
        // Em coreografia o jogador volta a baliza do time (o batedor e o goleiro da cobranca anterior ainda apontavam para a da disputa, ver `_fimDaCobranca`).
        if (tipo === 'jog') { this._reporCorpo(obj); this._reporLados(obj); }
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
        this._nCobrancas = 0; this._ultimaCobranca = null; this._ultimaReuniao = null; this._levantar = null; this._proximaPendente = null; this.card = null; this.festa = null;
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
        this._reservasEmPe();
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
                this._parte('jog', p, p.model, [DM.posGoleiroEspera(this.sinalZ, ladoAssist)], vel.goleiro, marca); continue;
            }
            const slot = this._slots.get(p);
            // Para o meio-campo / o posto anda-se SEMPRE de frente (de costas so o batedor, a tomar a distancia da batida).
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
        this._animarReservas(dt);
        const DM = DisputaModel;
        this.t += dt;
        if (this._levantar && !this._cobranca) {
            this._levantar.t += dt;
            if (this._levantar.t > (DM.pausa.levantar || 0.8)) {
                for (const p of this._levantar.jogadores) if (!p.disputaOrdem) this._parte('jog', p, p.model, [{ x: p.model.position.x, z: p.model.position.z }], DM.velocidade.jogador, DM.posMarca(this.sinalZ));
                this._levantar = null;
                // A resposta da app que chegou durante o levantar: a cobranca seguinte arranca agora.
                const prox = this._proximaPendente; this._proximaPendente = null;
                if (prox) this.receberProxima(prox);
            }
        }
        if (this._cobranca && this._cobranca.desfecho) {
            // O desfecho: o lance corre como em jogo; no fim todos param e a disputa segue.
            const c0 = this._cobranca, d = c0.desfecho;
            d.t += dt;
            // O goleiro que DEFENDEU (ou viu o adversario falhar) tambem festeja: depois de se levantar passa a coreografia no sitio onde esta (a festa pula-o la em `passoDoJogador`).
            if (this.festa && c0 && c0.goleiro && this.festa.equipa === c0.goleiro.team && !c0._gkFesta && d.t > (DisputaModel.pausa.levantar || 0.8) + 0.3) {
                c0._gkFesta = true;
                const q = c0.goleiro.model.position;
                this._parte('jog', c0.goleiro, c0.goleiro.model, [{ x: q.x, z: q.z }], DisputaModel.velocidade.goleiro, { x: q.x, z: q.z - this.sinalZ * 10 });
            }
            if (this.festa) { this.festa.t += dt; if (typeof Comemoracao !== 'undefined' && Comemoracao.ativa) Comemoracao.update(dt); }   // no jogo e o ramo GOAL de match_physics.js que a corre
            if (d.t >= d.dur) this._fimDaCobranca();
            else return;
        }
        if (this._cobranca) {
            this.fase = 'COBRANCA';
            this.atualizarCobranca(dt);
            // Passado o contato, o batedor volta andando para o lugar dele na fila (no golo, comemora: ver `_reacaoDeGolo`).
            const c = this._cobranca;
            if (c && c.tContato !== null && c.tContato > DM.pausa.aposContato && !this._soltou && !c.comemora && !c.batedor.lamento) this._soltarBatedor(c);
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
                if (this.festa) this.festa.t += dt;   // a festa final (ver `_festaFinal`) continua a contar
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
                const m = DM.posMarca(this.sinalZ), r = BallPhysics.raio;
                // O JUIZ ATIRA A BOLA PARA A MARCA (pedido): primeiro leva o braco para TRAS (a bola vai na mao), depois para a FRENTE, e solta. Dai a bola sai em arco e assenta na marca
                // (a fisica da bola esta parada no estado DISPUTA: o arco e escrito aqui; o braco e a bola na mao sao postos em `moverOficiais`, depois do `Officials.mover`).
                // Dois saltos curtos e para.
                if (!this._lance) {
                    this.bolaComJuiz = false;
                    this._lance = { t: 0, A: 0.55, S: 0.2, F: 1.0, solta: false };
                }
                const L = this._lance;
                L.t += dt;
                // SOLTA com o braco ja a voltar e ligeiramente a FRENTE do corpo (ombro ~ -0.5 rad, 63% do avanco de +1.2 a -1.5), e nao no fim do avanco; o braco segue ate la.
                const tSolta = L.A + L.S * 0.63;
                if (L.t >= tSolta) {
                    if (!L.solta) {
                        L.solta = true;
                        L.x0 = Match.ball.position.x; L.z0 = Match.ball.position.z; L.y0 = Math.max(r, Match.ball.position.y);
                        if (typeof EfeitosSonoros !== 'undefined' && EfeitosSonoros.chute) EfeitosSonoros.chute(Match.ball.position, 0.4);
                    }
                    const u = Math.min(1, (L.t - tSolta) / L.F);
                    const ar = u < 0.6 ? u / 0.6 : 1;
                    const f = u < 0.6 ? 0.85 * ar * ar * (3 - 2 * ar) : 0.85 + 0.15 * (u - 0.6) / 0.4;
                    Match.ball.position.x = L.x0 + (m.x - L.x0) * f;
                    Match.ball.position.z = L.z0 + (m.z - L.z0) * f;
                    let y;
                    if (u < 0.6) y = L.y0 * (1 - ar) + r + 1.1 * 4 * ar * (1 - ar);
                    else if (u < 0.85) { const v = (u - 0.6) / 0.25; y = r + 0.22 * 4 * v * (1 - v); }
                    else { const v = (u - 0.85) / 0.15; y = r + 0.06 * 4 * v * (1 - v); }
                    Match.ball.position.y = y;
                    Match.ballVel.set(0, 0, 0);
                    if (u >= 1) {
                        Match.ball.position.set(m.x, r, m.z);
                        this._lance = null;
                        this.sub = 'ajeita'; this.tSub = 0;
                        { const sb = this._parteDe(a.batedor); if (sb) sb.agachar = true; }   // abaixa-se para ajeitar a bola
                    }
                }
            }
        } else if (this.sub === 'ajeita') {
            // MEXE NA BOLA PARA ARRUMAR: duas idas e vindas para um lado e para o outro (ao longo da linha da area), a bola quase sem sair do sitio, e assenta exacta na marca no fim.
            {
                const mk = DM.posMarca(this.sinalZ), u = Math.min(1, this.tSub / DM.pausa.ajeitar), bola = Match.ball.position;
                const amp = 0.09 * (1 - u);
                bola.x = mk.x + Math.sin(u * Math.PI * 4) * amp;
                bola.z = mk.z + Math.sin(u * Math.PI * 4 + 1.2) * amp * 0.35;
                bola.y = BallPhysics.raio;
                Match.ballVel.set(0, 0, 0);
            }
            if (this.tSub > DM.pausa.ajeitar) {
                Match.ball.position.set(DM.posMarca(this.sinalZ).x, BallPhysics.raio, DM.posMarca(this.sinalZ).z);
                const e = DM.posEsperaBatedor(this.sinalZ, a.batedor.pe), m = DM.posMarca(this.sinalZ);
                const sr = this._parte('jog', a.batedor, a.batedor.model, [e], DM.velocidade.jogador, m);
                // A distancia da batida: de COSTAS (de frente para a bola) ou de frente, ao acaso.
                if (Math.random() < 0.5) sr.re = true;
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
        // A bola vai ao juiz no fim do DESFECHO (`_fimDaCobranca`), nao ja: o lance ainda corre.
        // `n`: o indice desta cobranca (a app nao soma duas vezes um reenvio, ver reenviarPendente).
        this._ultimaCobranca = { lado: a.lado, jogadorId: this.idApp(a.batedor), resultado, n: this._nCobrancas++ };
        Ponte.enviar('disputa_cobranca', this._ultimaCobranca);
    },

    /*
    A FESTA DO ULTIMO PENALTI (o que decide a disputa): se foi o BATEDOR a marcar, os jogadores do time dele correm do meio-campo para festejar com ele onde ele esta (a intermediaria); se foi o
    GOLEIRO a defender, correm para ele, no meio da area. Chegados, pulam (a `festa` do time, em `passoDoJogador`), e a torcida dele vibra. Sem gol decisivo nem defesa (ex.: o adversario
    chutou fora) nao ha corrida.
    */
    _festaFinal(m) {
        const a = this.atual, res = this._ultimaCobranca && this._ultimaCobranca.resultado;
        if (!a || !res) return;
        const venc = m.vencedor || ((m.pens && m.pens[0] > m.pens[1]) ? 'casa' : 'fora');
        const foco = (res === 'gol' && this.ladoDe(a.batedor) === venc) ? a.batedor : (res === 'defesa' && a.goleiro && this.ladoDe(a.goleiro) === venc) ? a.goleiro : null;
        if (!foco) return;
        const DM = DisputaModel, c = foco.model.position;
        this.festa = { equipa: foco.team, t: 0 };
        const outros = this.lista(venc).filter(p => p !== foco && p.role !== 'gk' && !p.expulso);
        outros.forEach((p, i) => {
            const ang = (i / Math.max(1, outros.length)) * Math.PI * 2, raio = 1.4 + (i % 2) * 0.7;
            const pt = { x: c.x + Math.cos(ang) * raio, z: c.z + Math.sin(ang) * raio };
            this._parte('jog', p, p.model, [pt], (DM.velocidade.jogador || 2) * 2.6, { x: c.x, z: c.z });
        });
        // O foco tambem festeja onde esta (o batedor ja voltou ao posto; o goleiro fica na area).
        if (!foco.disputaOrdem) this._parte('jog', foco, foco.model, [{ x: c.x, z: c.z }], DM.velocidade.jogador, { x: c.x, z: c.z + this.sinalZ * 5 });
    },

    // A resposta da app: o proximo batedor, ou o fim.
    // `abortar` (a app nao tem proximo batedor): a disputa desfaz-se em qualquer fase e o jogo acaba sem ela.
    receberProxima(m) {
        if (this.activa && m && m.abortar && !this._cobranca) { this._abortar(); return; }
        if (!this.activa || this.fase !== 'AGUARDA') return;
        // O lance ainda no desfecho, ou o goleiro ainda a cair do mergulho: a resposta (o proximo batedor ou o fim) espera o fim do desfecho e o `pausa.levantar`.
        if (this._levantar || (this._cobranca && this._cobranca.desfecho)) { this._proximaPendente = m; return; }
        if (m.fim) { this.pens = m.pens || this.pens; this._vencedorFinal = m.vencedor || null; this.fase = 'FIM'; this.t = 0; this._festaFinal(m); return; }
        this._prepararCobranca(m);
    },

    _encerrar() {
        Ponte.enviar('disputa_fim', { pens: this.pens });
        // O vencedor da disputa ('casa' | 'fora'): se o jogo dava o titulo, e ele o campeao (Match.campeaoDoJogo, js/comemoracao_campeao.js).
        const pn = this.pens || [0, 0];
        Match.vencedorPenaltis = this._vencedorFinal || (pn[0] > pn[1] ? 'casa' : pn[1] > pn[0] ? 'fora' : null);
        this._vencedorFinal = null;
        this._libertar();
        Match.encerrarJogo();
    },

    // Sem resposta da app: o jogo termina como se nao houvesse disputa (a app cai no modal de texto).
    _abortar() { this._libertar(); Match.encerrarJogo(); },

    // Todos os caminhos que acabam a disputa passam por aqui: antes de largar os jogadores desfaz-se uma cobranca a meio (baliza dos jogadores, papel `gk`, penalti pendente).
    _libertar() {
        this._lance = null; this._passeJuiz = null;
        this._reservasSentar();
        this._acabarFesta();
        this.abortarCobranca();
        if (this._levantar) this._levantar.jogadores.forEach(p => this._reporLados(p));
        this._proximaPendente = null; this.card = null;
        // Os goleiros ficam apontados a baliza da disputa: se voltassem ao lado do time, o `updateGK` do estado seguinte prendia-os a area da OUTRA baliza e o goleiro era
        // teletransportado para o outro lado do campo (relato: "as vezes o goleiro e resetado para o meio do campo"). So antes da primeira cobranca (reuniao/ordem) nao se aplica.
        if (this.fase && this.fase !== 'REUNIAO' && this.fase !== 'ORDEM') {
            const meio = CAMPO_COMP / 2;
            Match.players.concat(Match.opponents).filter(p => p.role === 'gk').forEach(g => { g.dirZ = -this.sinalZ; g.targetGoalZ = -meio * this.sinalZ; g.ownGoalZ = meio * this.sinalZ; });
        }
        for (const s of this.partes) if (s.tipo === 'jog') { s.obj.disputaOrdem = null; s.model.visible = true; }
        this.partes = []; this.activa = false; this.fase = null; this.bolaComJuiz = false; this._levantar = null;
        Match.disputa = null;
    },

    /*
    O CARD DA DISPUTA no cartao de evento (#hud-evento, main.js updateHudEvento). A app calcula os circulos (textSim/penaltyShootout.ts circulosDaDisputa: a app e a arbitra) e
    manda-os em `disputa_card { casa: [5], fora: [5], rodada, morteSubita, golsCasa, golsFora }`; aqui so se guarda e desenha. Fica no ecra enquanto a disputa esta activa (sem
    temporizador; os eventos de canto, falta... nao o substituem) e sai com ela (fim do jogo, aborto, `iniciar` novo).
    */
    card: null,
    receberCard(m) {
        if (!this.activa || !m) return;
        const ok = (l) => Array.isArray(l) ? l.slice(0, 5).map(c => (c === 'verde' || c === 'vermelho') ? c : 'cinza') : ['cinza', 'cinza', 'cinza', 'cinza', 'cinza'];
        this.card = { casa: ok(m.casa), fora: ok(m.fora), rodada: m.rodada || 1, morteSubita: !!m.morteSubita, golsCasa: m.golsCasa || 0, golsFora: m.golsFora || 0 };
    },
    cardVisivel() { return !!(this.activa && this.card); },
    // O miolo do cartao: SIGLA circulos (gols) - (gols) circulos SIGLA, a casa a esquerda (como o placar de TV); por cima o titulo (a rodada na morte subita).
    htmlDoCard(card, siglaCasa, siglaFora) {
        const c = card || this.card; if (!c) return '';
        const esc = (t) => String(t || '').replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));
        const bolas = (l) => l.map(x => '<i class="hd-c hd-' + x + '"></i>').join('');
        const titulo = c.morteSubita ? 'SUDDEN DEATH · ROUND ' + c.rodada : 'PENALTIES';
        return '<div class="hd-titulo">' + titulo + '</div><div class="hd-linha"><span class="hd-sigla">' + esc(siglaCasa) + '</span>' + bolas(c.casa) +
            '<span class="hd-gols">(' + c.golsCasa + ') - (' + c.golsFora + ')</span>' + bolas(c.fora) + '<span class="hd-sigla">' + esc(siglaFora) + '</span></div>';
    },
    // Desenha o card dentro do #hud-evento (esconde os filhos do cartao de estatistica) e mostra-o; `limparCard` desfaz.
    pintarCard(el, siglaCasa, siglaFora) {
        if (!el || !this.card) return;
        let box = el.querySelector('#hud-disputa');
        if (!box) { box = document.createElement('div'); box.id = 'hud-disputa'; el.appendChild(box); }
        const html = this.htmlDoCard(this.card, siglaCasa, siglaFora);
        if (box.innerHTML !== html) box.innerHTML = html;
        el.classList.add('modo-disputa');
        el.classList.remove('oculto');
    },
    limparCard(el) {
        if (!el || !el.classList.contains('modo-disputa')) return false;
        const box = el.querySelector('#hud-disputa'); if (box) box.remove();
        el.classList.remove('modo-disputa');
        el.classList.add('oculto');
        return true;
    },

    // ESC: leva todos direto aos pontos finais (so durante o caminhar; nunca salta cobrancas, por isso nao ha cobranca a desfazer aqui).
    cancelar() {
        if (!this.activa || this._cobranca || !['REUNIAO', 'PREPARO', 'AGUARDA'].includes(this.fase)) return;
        for (const s of this.partes) {
            const w = s.wps[s.wps.length - 1];
            if (w) { s.model.position.x = w.x; s.model.position.z = w.z; s.i = s.wps.length; s.chegou = true; }
        }
    },

    /*
    A PALMA DO JUIZ: a posicao da mao (o centro da esfera da mao) e a normal da palma — o eixo local +X da mao, que com a pose do braco (`AberturaModel.bracoDaBola`, `maoRoll`) aponta
    para CIMA (medido: (0.10, 0.99, -0.03)). A bola assenta nela: centro = palma + normal * (raio da mao + raio da bola), por isso encosta na palma sem entrar no braco.
    */
    _palma(out, normal) {
        const arb = Officials.arbitro, h = arb.rig.rHand;
        arb.model.updateMatrixWorld(true);
        h.getWorldPosition(out);
        const n = normal || (this._n = this._n || new THREE.Vector3());
        n.set(1, 0, 0).transformDirection(h.matrixWorld);
        const m = h.children.find(c => c.isMesh && c.geometry && c.geometry.parameters && c.geometry.parameters.radius);
        this._rMao = m ? m.geometry.parameters.radius * m.getWorldScale(this._ws = this._ws || new THREE.Vector3()).x : 0.04;
        return n;
    },
    _bolaNaPalma() {
        this._v = this._v || new THREE.Vector3();
        const n = this._palma(this._v), d = this._rMao + BallPhysics.raio;
        Match.ball.position.set(this._v.x + n.x * d, this._v.y + n.y * d, this._v.z + n.z * d);
    },

    /*
    OS RESERVAS NA BEIRA DO GRAMADO (pedido): durante a disputa os jogadores dos bancos levantam-se e ficam em pe, em fila na linha lateral (do lado do banco), a olhar para o campo; festejam
    com o time (a mesma festa dos colegas). No fim sentam-se onde estavam.
    */
    _reservasEmPe() {
        if (typeof Bancos === 'undefined' || !Bancos.bancos) return;
        this._reservas = [];
        const xLinha = this.ladoBanco * (CAMPO_LARG / 2 + 1.2);
        for (const b of Bancos.bancos) {
            const rs = (b.reservas || []).filter(r => r && r.model);
            rs.forEach((r, i) => {
                const q = r.model.position;
                r._posBanco = { x: q.x, z: q.z, ry: r.model.rotation.y };
                if (Bancos.descongelar) Bancos.descongelar(r);
                r.model.visible = true;
                r.model.position.set(xLinha, 0, b.zc + (i - (rs.length - 1) / 2) * 1.15);
                r.model.rotation.set(0, Math.atan2(-xLinha, 0), 0);   // de frente para o campo
                if (r.resetBonesToDefault) r.resetBonesToDefault();
                if (r.rig && r.rig.pelvis) r.rig.pelvis.position.y = (typeof r.pelvisY0 === 'number') ? r.pelvisY0 : 2.6;
                r._faseFesta = Math.random() * 6.28;
                r._equipaDisputa = b.equipa === 'A' ? 'TeamA' : 'TeamB';
                this._reservas.push(r);
            });
        }
    },
    _reservasSentar() {
        if (!this._reservas) return;
        for (const r of this._reservas) {
            if (!r._posBanco) continue;
            r.model.position.set(r._posBanco.x, 0, r._posBanco.z); r.model.rotation.set(0, r._posBanco.ry, 0);
            if (typeof Bancos !== 'undefined') { Bancos._sentar(r); r.model.rotation.y = r._posBanco.ry; if (Bancos.congelar) Bancos.congelar(r); }
            r._posBanco = null;
        }
        this._reservas = null;
    },
    _animarReservas(dt) {
        if (!this._reservas) return;
        const fe = this.festa;
        for (const r of this._reservas) {
            if (!r.rig) continue;
            r.velocity.set(0, 0, 0);
            r.animateBones(dt);
            if (fe && fe.equipa === r._equipaDisputa) {
                const ondaP = Math.abs(Math.sin(fe.t * 8 + r._faseFesta)), bx = -2.6 + Math.sin(fe.t * 11 + r._faseFesta) * 0.25, g = r.rig;
                g.lArm.rotation.x = bx; g.rArm.rotation.x = bx; g.lArm.rotation.z = 0.25; g.rArm.rotation.z = -0.25;
                g.lElbow.rotation.x = -0.3; g.rElbow.rotation.x = -0.3;
                if (r.assentarNoChao) { for (let k = 0; k < 4; k++) r.assentarNoChao(); }
                r.model.position.y += 0.34 * ondaP;
            }
        }
    },

    // O juiz, o bandeirinha e o tecnico andam por `Officials.mover`; a bola vai na mao do juiz enquanto `bolaComJuiz`.
    moverOficiais(dt) {
        for (const s of this.partes) {
            if (s.tipo === 'jog') continue;
            const w = s.wps[s.wps.length - 1];
            // A andar vai de frente para onde caminha (com a bola na mao, de lado ou de costas parecia perdido); so ao chegar se vira para onde tem de olhar.
            const perto = Math.hypot(w.x - s.model.position.x, w.z - s.model.position.z) < 0.6;
            Officials.mover(s.obj, w.x, w.z, s.vel, dt, (s.tipo === 'arb' && !perto) ? undefined : (s.olhar || undefined));
            s.chegou = Math.hypot(w.x - s.model.position.x, w.z - s.model.position.z) < 0.4;
            if (s.tipo === 'lin') Officials._ajustarPano(s.obj, dt);
        }
        // O LANCAMENTO DA BOLA: braco direito atras e depois a frente; ate soltar a bola vai na mao.
        const Lc = this._lance, arbL = Officials.arbitro;
        if (Lc && arbL && arbL.rig && arbL.rig.rArm && arbL.rig.rElbow) {
            const lerp = (a, b, k) => a + (b - a) * Math.max(0, Math.min(1, k)), suave = (k) => { k = Math.max(0, Math.min(1, k)); return k * k * (3 - 2 * k); };
            let ombro, cot;
            if (Lc.t < Lc.A) { const k = suave(Lc.t / Lc.A); ombro = lerp(-0.3, 1.2, k); cot = lerp(-1.3, -0.7, k); }
            else if (Lc.t < Lc.A + Lc.S) { const k = (Lc.t - Lc.A) / Lc.S; ombro = lerp(1.2, -1.5, k); cot = lerp(-0.7, -0.15, k); }
            else { const k = suave((Lc.t - Lc.A - Lc.S) / 0.5); ombro = lerp(-1.5, 0, k); cot = lerp(-0.15, -0.3, k); }
            arbL.rig.rArm.rotation.set(ombro, 0, -0.12);
            arbL.rig.rElbow.rotation.x = cot;
            if (!Lc.solta && arbL.rig.rHand) {
                // A bola ASSENTA NA PALMA ate ser lancada (ver `_bolaNaPalma`).
                if (arbL.rig.rHand.rotation) arbL.rig.rHand.rotation.set(0, ((typeof AberturaModel !== 'undefined' && AberturaModel.bracoDaBola) || {}).maoRoll || -1.57, 0);
                this._bolaNaPalma();
                Match.ballVel.set(0, 0, 0);
            }
        }
        // O PASSE DO GOLEIRO AO JUIZ: arco da posicao da bola ate a mao do juiz (que continua a andar).
        const Pj = this._passeJuiz;
        if (Pj && arbL && arbL.rig && arbL.rig.rHand) {
            Pj.t += dt;
            this._v = this._v || new THREE.Vector3();
            this._palma(this._v);
            const u = Math.min(1, Pj.t / Pj.dur), k = u * u * (3 - 2 * u);
            Match.ball.position.set(Pj.x0 + (this._v.x - Pj.x0) * k, Pj.y0 + (this._v.y - Pj.y0) * k + 1.4 * 4 * u * (1 - u), Pj.z0 + (this._v.z - Pj.z0) * k);
            Match.ballVel.set(0, 0, 0);
            if (Pj.gk && Pj.gk.model && Pj.t < 0.4) {   // o goleiro vira-se para o juiz ao atirar
                const g = Pj.gk.model.position, ang = Math.atan2(arbL.model.position.x - g.x, arbL.model.position.z - g.z);
                if (Pj.gk.disputaOrdem) Pj.gk.disputaOrdem.yawAlvo = ang;
            }
            if (u >= 1) this._passeJuiz = null;
        }
        // A bola na mao do juiz (a andar ou parado): braco na pose da abertura e a bola ASSENTA NA PALMA.
        if (this.bolaComJuiz && !this._passeJuiz && !Lc && arbL && arbL.rig && arbL.rig.rHand && typeof Abertura !== 'undefined') { Abertura._poseDoBracoDoJuiz(); this._bolaNaPalma(); Match.ballVel.set(0, 0, 0); }
        Officials.atualizarVista();
    },

    // A camera: na reuniao, do outro lado do campo para as duas meias-luas; depois, atras do batedor com a baliza ao fundo.
    camera(pos, look) {
        const DM = DisputaModel;
        if (this.fase === 'REUNIAO' || this.fase === 'ORDEM') {
            pos.set(-this.ladoBanco * 30, 14, 0);
            look.set(this.ladoBanco * 26, 1.2, 0);
        } else if (window.cameraMode === 'sideline' || window.cameraMode === 'lateraltv') {
            // TV SIDELINE: em cima do bico da grande area (o canto dela no lado das cameras, +X), olhando para a marca do penalti (no centro do ecra) — fica na diagonal.
            pos.set(DM.area.grandeMeiaLargura, 8.0, this.sinalZ * (DM.campo.comp / 2 - (typeof Area !== 'undefined' ? Area.profundidade : 16.5)));
            // A marca do penalti no centro do ecra.
            const mk = DM.posMarca(this.sinalZ);
            look.set(mk.x, 0.3, mk.z);
            // O ZOOM (rodinha / botoes) vale aqui: a camara aproxima-se ou afasta-se da marca ao longo da diagonal, como nas outras vistas (posicao = alvo + (base - alvo) * zoom).
            const z = Math.max(0.2, window.cameraZoom || 1.0);
            pos.set(look.x + (pos.x - look.x) * z, look.y + (pos.y - look.y) * z, look.z + (pos.z - look.z) * z);
        } else {
            const m = DM.posMarca(this.sinalZ);
            pos.set(0, 2.4, m.z - this.sinalZ * 16);
            look.set(0, 1.2, this.sinalZ * 50);
        }
    }
};
if (typeof window !== 'undefined') window.DisputaPenaltis = DisputaPenaltis;
