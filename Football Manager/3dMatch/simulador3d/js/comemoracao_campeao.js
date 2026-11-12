/*
=============================================================================
COMEMORACAO DE CAMPEAO — o grupo no circulo central, os saltos e a taca (numeros em config/comemoracao_campeao.js)
=============================================================================
Pedido: *"Crie a comemoracao de campeao. Todos os jogadores juntos no centro do campo, pulando e levantando a
taca."*

QUANDO: no apito final (Match.encerrarJogo) de um jogo que da o titulo — `Match.campeao`, que o manager manda no
`iniciar` da ponte (`campeao: { seVencer: 'casa' | 'fora' | 'qualquer', seEmpatar?: 'casa' | 'fora' }`, ver
js/narracao/ponte.js); o vencedor conta com o agregado (`Match.decisao`) e com a disputa de penaltis
(`Match.vencedorPenaltis`). O teste manual e `Comemoracao.campeao('TeamA')` na consola (ou o botao "Champion" do
painel): com o jogo a correr apita ja o fim e a festa vem a seguir. Nos lotes (`Sim.running`) nada disto corre: o
fim de jogo e o de sempre.

O QUE ACONTECE (estado FIM_DE_JOGO do Match; relogio e IA parados, so a coreografia anda, como na abertura):
  . o juiz apita e aponta o centro (`atrasoApito` s) e so depois arranca;
  . `reuniao`: os vencedores correm para o circulo central — o capitao (Match.cobradores 'captain', ou o melhor
    candidato) no centro, virado para as cameras (+X), os outros em dois arcos atras e aos lados; quem chega
    comeca logo a pular. Os derrotados vao a passo para o lado do tunel e ficam desolados (maos na cabeca, na
    cintura ou nos joelhos). O trio afasta-se para a lateral do tunel, o juiz com a bola na mao;
  . `festa`: a taca (procedimental, dourada) aparece nas maos do capitao; o guiao ergue-a, segura-a la em cima,
    baixa-a e passa-a a um companheiro (`guiao.portadores`), que a ergue tambem; no fim o capitao ergue-a outra vez. Com a taca no
    ar todos saltam juntos, de bracos no ar; fora disso cada um pula ao seu ritmo (com pausas). Confetis e a
    torcida do campeao a vibrar a cada erguer;
  . no fim (ou ESC) todos param e segue o fim de jogo normal: o modal das estatisticas e a saida de campo
    (Abertura.saidaIntervalo).

Os jogadores sao movidos por `passoDoJogador` (chamado do topo do FootballPlayer.update, como a abertura e a
disputa de penaltis) e as poses sao as da comemoracao de golo (`_poseMistura` / `_escreverPoseComemorar` da FSM).
A taca segue as maos de quem a segura (posta, a cada frame, no meio das duas maos, como o cartao do juiz vive na
mao dele). A camara e propria (`camera`, chamada do Match.updateCamera); como nao muda o modo da camara do
utilizador, no fim volta sozinha a dele.
=============================================================================
*/
const ComemoracaoCampeao = {
    activa: false,
    pendente: null,          // { equipa, t }: agendada no apito, arranca quando o juiz acabar o sinal
    equipa: null,            // 'TeamA' | 'TeamB'
    fase: null,              // 'reuniao' | 'festa'
    t: 0, tFase: 0,
    partes: [],              // uma por jogador em coreografia (vencedores e derrotados)
    oficiais: [],
    capitao: null,
    ordem: [],               // quem segura a taca, por ordem
    guiao: [],               // os segmentos do guiao da taca (tempos da festa)
    fimFesta: 0,
    taca: null,
    confetis: null,
    _forcada: null,
    _v: null, _w: null,

    _semDesenho() { return (typeof Sim !== 'undefined' && Sim.running); },
    _lista(equipa) { return equipa === 'TeamA' ? Match.players : Match.opponents; },
    _emCampo(p) { return !!(p && p.model && !p.expulso && !p.subSaindo && !p.foraDeCampo && p.model.visible !== false); },
    _suave(u) { u = Math.max(0, Math.min(1, u)); return u * u * (3 - 2 * u); },
    _sorteio(par) { return par[0] + Math.random() * (par[1] - par[0]); },

    /*
    NO APITO FINAL (Match.encerrarJogo, ja em FIM_DE_JOGO): se este jogo deu o titulo a alguem, a festa fica agendada e o fim de jogo
    (modal e saida de campo) espera por ela. Devolve true se ficou agendada.
    */
    agendarNoApito() {
        const C = (typeof ComemoracaoTitulo !== 'undefined') ? ComemoracaoTitulo : null;
        const forcada = this._forcada;
        this._forcada = null;
        if (!C || !C.activo || this._semDesenho() || this.activa || this.pendente) return false;
        if (typeof Match === 'undefined' || !Match.players || !Match.players.length) return false;
        const equipa = forcada || (Match.campeaoDoJogo ? Match.campeaoDoJogo() : null);
        if (!equipa) return false;
        this.pendente = { equipa: equipa, t: C.atrasoApito };
        return true;
    },

    /*
    O TESTE MANUAL — `Comemoracao.campeao('TeamA')` na consola, ou o botao "Champion" do painel. Com o jogo a correr apita o fim (o mesmo
    caminho de um jogo a serio, sem o placar contar) e a festa vem depois do sinal do juiz; ja no fim de jogo comeca logo. Devolve true se
    arrancou (ou ficou agendada).
    */
    /*
    BOTAO "Champion" (debug): pedido *"vai simular o final do jogo e um time campeao: o relogio vai para 87 min, o juiz termina o jogo aos 90 e o time campeao inicia a
    comemoracao"*. O relogio salta para 87:00 do 2.o tempo (sem intervalo, se ainda estava no 1.o), o acrescimo fica a zero e o apito sai aos 90:00 em ponto (sem a espera
    pela bola no meio-campo, `Match._fimNoRelogio`). O jogo passa a decidir o titulo (`Match.campeao`): campeao e quem vencer; empatado, quem ia a frente quando se carregou
    no botao, ou a casa. Se o resultado mudar nesses 3 minutos, festeja quem ganhar.
    */
    simularFimDeJogo() {
        if (this._semDesenho() || typeof Match === 'undefined' || !Match.players || !Match.players.length) return false;
        if (Match.state === 'FIM_DE_JOGO' || Match.disputa || (typeof Abertura !== 'undefined' && Abertura.activa)) return false;
        const meio = MatchDuration.halfGameMinutes * 60;
        const lider = Match.placarB > Match.placarA ? 'fora' : 'casa';
        Match.campeao = { seVencer: 'qualquer', seEmpatar: lider };
        Match.decisao = Match.decisao || null;
        if (!Match.primeiroTempoAcabou) { Match.primeiroTempoAcabou = true; Match.acr1Calculado = true; Match.acrescimo1 = 0; Match.acrMin1 = 0; }
        Match.faseExtra = 0;
        Match.aguardaSaida2T = false;
        Match.tempoDeJogo = 2 * meio - 3 * 60;
        Match.acr2Calculado = true; Match.acrMin2 = 0; Match.acrescimo2 = 0;
        Match._fimNoRelogio = true;
        if (typeof Match.updatePlacar === 'function') Match.updatePlacar();
        console.log('Champion: relogio em 87:00, apito aos 90:00; campeao = quem vencer (empate: ' + lider + ')');
        return true;
    },

    testar(equipa) {
        equipa = (equipa === 'TeamB' || equipa === 'B' || equipa === 'fora') ? 'TeamB' : 'TeamA';
        if (this._semDesenho() || typeof Match === 'undefined' || !Match.players || !Match.players.length) return false;
        if (this.activa || this.pendente) this.cancelar();
        if (Match.state === 'FIM_DE_JOGO') {
            // A saida de campo ja a correr: desfaz-se e todos voltam a ser visiveis (saem do tunel a correr para a festa).
            if (typeof Abertura !== 'undefined' && Abertura.activa) Abertura._libertar();
            for (const p of [].concat(Match.players, Match.opponents)) if (p && p.model && !p.expulso) { p.foraDeCampo = false; p.model.visible = true; }
            return this.iniciar(equipa);
        }
        if (Match.disputa || (typeof Abertura !== 'undefined' && Abertura.activa)) return false;
        this._forcada = equipa;
        Match.encerrarJogo();
        return !!(this.pendente || this.activa);
    },

    // ARRANCA a festa de `equipa` (ja em FIM_DE_JOGO). Devolve true se arrancou.
    iniciar(equipa) {
        const C = (typeof ComemoracaoTitulo !== 'undefined') ? ComemoracaoTitulo : null;
        if (!C || !C.activo || this._semDesenho() || typeof Match === 'undefined' || !Match.players || !Match.players.length) return false;
        this.limpar();
        if (!this._v) { this._v = new THREE.Vector3(); this._w = new THREE.Vector3(); }
        const R = C.reuniao;
        const venc = this._lista(equipa).filter(p => this._emCampo(p));
        const derr = this._lista(equipa === 'TeamA' ? 'TeamB' : 'TeamA').filter(p => this._emCampo(p));
        if (!venc.length) return false;

        this.activa = true;
        this.equipa = equipa;
        this.fase = 'reuniao';
        this.t = 0; this.tFase = 0;

        // O CAPITAO: o designado (a aba Tactics); sem ele, o jogador de campo mais perto do centro (para nao atravessar o campo todo).
        let cap = (typeof cobradorDesignado === 'function') ? cobradorDesignado(equipa, 'captain', venc) : null;
        if (!cap) {
            const campo = venc.filter(p => p.role !== 'gk');
            cap = (campo.length ? campo : venc).slice().sort((a, b) => Math.hypot(a.model.position.x, a.model.position.z) - Math.hypot(b.model.position.x, b.model.position.z))[0];
        }
        this.capitao = cap;

        // OS LUGARES: o capitao no centro; os outros em dois arcos atras e aos lados (angulos a partir da frente, +X). Cada um vai para o lugar mais perto
        // (por ordem de quem esta mais longe, que escolhe primeiro: os de perto ajustam-se), para os caminhos se cruzarem pouco.
        const outros = venc.filter(p => p !== cap);
        const n1 = Math.min(R.arco1.max, outros.length), n2 = outros.length - n1;
        const lugares = [];
        const arco = (A, n) => {
            for (let i = 0; i < n; i++) {
                const a = THREE.MathUtils.degToRad(A.de + (A.ate - A.de) * (n === 1 ? 0.5 : i / (n - 1)));
                const j = R.jitter;
                lugares.push({ x: Math.cos(a) * A.raio + (Math.random() * 2 - 1) * j, z: Math.sin(a) * A.raio + (Math.random() * 2 - 1) * j, arco: A === R.arco1 ? 1 : 2 });
            }
        };
        arco(R.arco1, n1); arco(R.arco2, n2);
        const olhar = { x: R.olharFrente, z: 0 };
        const novo = (p, lugar, papel, vel, atraso) => {
            this._reporCorpo(p);
            const f = new THREE.Vector3(0, 0, 1).applyQuaternion(p.model.quaternion);
            const s = { papel: papel, p: p, wps: [lugar], i: 0, vel: vel, atraso: atraso, chegou: false, yaw: Math.atan2(f.x, f.z), yawAlvo: undefined, olhar: olhar,
                arco: lugar.arco || 0, fase: Math.random(), periodo: this._sorteio(C.salto.periodo), altura: this._sorteio(C.salto.altura), pausa: 0, variante: null, maos: new THREE.Vector3() };
            p.campeaoOrdem = s;
            this.partes.push(s);
            return s;
        };
        novo(cap, { x: 0, z: 0, arco: 0 }, 'venc', this._sorteio(R.velocidade), 0);
        const porDist = outros.slice().sort((a, b) => Math.hypot(b.model.position.x, b.model.position.z) - Math.hypot(a.model.position.x, a.model.position.z));
        const livres = lugares.slice();
        for (const p of porDist) {
            let mi = 0, md = Infinity;
            livres.forEach((l, k) => { const d = Math.hypot(l.x - p.model.position.x, l.z - p.model.position.z); if (d < md) { md = d; mi = k; } });
            novo(p, livres.splice(mi, 1)[0], 'venc', this._sorteio(R.velocidade), Math.random() * R.atrasoMax);
        }

        // OS DERROTADOS: a passo para o lado do tunel, no lado do campo (z) onde ja estavam, para nao atravessarem o grupo; e ficam desolados.
        const T = (typeof TunelJogadores !== 'undefined') ? TunelJogadores : { lado: -1 };
        const D = C.derrotados, variantes = ['cabeca', 'cintura', 'joelhos'];
        derr.forEach((p, k) => {
            const zs = Math.abs(p.model.position.z) > 3 ? Math.sign(p.model.position.z) : (k % 2 ? 1 : -1);
            const alvo = { x: T.lado * (D.xMin + Math.random() * (D.xMax - D.xMin)), z: zs * (D.zMin + Math.random() * (D.zMax - D.zMin)) };
            const s = novo(p, alvo, 'derr', this._sorteio(D.velocidade), Math.random() * 1.2);
            s.olhar = null;
            s.variante = variantes[k % variantes.length];
        });

        // O TRIO afasta-se para a lateral do tunel, de frente para o grupo.
        this.oficiais = [];
        if (typeof Officials !== 'undefined' && Officials.arbitro) {
            const O = C.oficiais, x = T.lado * O.x;
            this.oficiais.push({ o: Officials.arbitro, tipo: 'arb', alvo: { x: x, z: O.zArbitro } });
            (Officials.assistentes || []).forEach((a, i) => { if (a && a.model) this.oficiais.push({ o: a, tipo: 'lin', alvo: { x: x + T.lado * 0.4, z: O.zAssistentes[i % O.zAssistentes.length] } }); });
        }

        // A ORDEM DA TACA: o capitao, `portadores - 1` companheiros do primeiro arco (os que ficam ao lado dele) e o capitao outra vez no ultimo erguer.
        const arco1 = this.partes.filter(s => s.papel === 'venc' && s.arco === 1).map(s => s.p);
        for (let i = arco1.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); const tmp = arco1[i]; arco1[i] = arco1[j]; arco1[j] = tmp; }
        this.ordem = [cap].concat(arco1.slice(0, Math.max(0, C.guiao.portadores - 1)));
        if (this.ordem.length > 1) this.ordem.push(cap);

        this._criarTaca();
        if (typeof AmbienteSonoro !== 'undefined' && AmbienteSonoro.gritarGolo && !AmbienteSonoro._pausado) { try { AmbienteSonoro.gritarGolo(); } catch (e) { /* sem som */ } }
        return true;
    },

    /*
    O CORPO DE PE ANTES DE ENTRAR NA COREOGRAFIA (o mesmo cuidado da disputa de penaltis, `_reporCorpo`): sem bola, sem salto nem queda, o goleiro
    parado, a FSM em IDLE e os ossos na pose base.
    */
    _reporCorpo(p) {
        p.hasBall = false;
        if (p.velocity) p.velocity.set(0, 0, 0);
        p.jumpTimer = 0; p.pedindoBola = 0; p.lamento = null; p.comemorando = false; p.comemoracao = null;
        if (p.role === 'gk' || p.gkEstado !== undefined) { p.gkEstado = 'idle'; p.dive = null; }
        if (p.fsm && p.fsm.currentState !== 'IDLE') p.fsm.changeState('IDLE');
        if (p.resetBonesToDefault) p.resetBonesToDefault();
        if (typeof ALTURA_BASE_Y === 'number') p.model.position.y = ALTURA_BASE_Y;
    },

    // Os segmentos do guiao da taca, em segundos desde o inicio da festa.
    _montarGuiao() {
        const G = ComemoracaoTitulo.guiao;
        const segs = [];
        let t = G.inicio;
        this.ordem.forEach((h, i) => {
            if (i > 0) { segs.push({ tipo: 'passe', de: this.ordem[i - 1], h: h, t0: t, t1: t + G.tPasse }); t += G.tPasse + G.pausa; }
            segs.push({ tipo: 'erguer', h: h, t0: t, t1: t + G.tErguer, n: i }); t += G.tErguer;
            segs.push({ tipo: 'manter', h: h, t0: t, t1: t + G.tManter }); t += G.tManter;
            segs.push({ tipo: 'baixar', h: h, t0: t, t1: t + G.tBaixar }); t += G.tBaixar + G.pausa;
        });
        this.guiao = segs;
        this.fimFesta = t + G.fimDepois;
    },

    _comecarFesta() {
        this.fase = 'festa';
        this.tFase = 0;
        this._montarGuiao();
        this._erguerDisparado = -1;
    },

    /*
    O ESTADO DA TACA neste instante da festa: quem a segura (`h`), quanto esta erguida (`k`, 0 = ao peito, 1 = la em cima) e, num passe, de quem
    vem (`de`) e quanto ja andou (`u`).
    */
    estadoDaTaca() {
        if (!this.activa || this.fase !== 'festa') return { h: this.capitao, k: 0, de: null, u: 0 };
        const tf = this.tFase;
        let ultimo = null;
        for (const s of this.guiao) {
            if (tf < s.t0) break;
            ultimo = s;
            if (tf <= s.t1) {
                const u = (tf - s.t0) / Math.max(0.01, s.t1 - s.t0);
                if (s.tipo === 'erguer') return { h: s.h, k: this._suave(u), de: null, u: 0, seg: s };
                if (s.tipo === 'manter') return { h: s.h, k: 1, de: null, u: 0, seg: s };
                if (s.tipo === 'baixar') return { h: s.h, k: 1 - this._suave(u), de: null, u: 0, seg: s };
                if (s.tipo === 'passe') return { h: s.h, k: 0, de: s.de, u: this._suave(u), seg: s };
            }
        }
        return { h: ultimo ? ultimo.h : this.capitao, k: 0, de: null, u: 0 };
    },

    update(dt) {
        if (this.pendente) {
            this.pendente.t -= dt;
            if (this.pendente.t <= 0) {
                const e = this.pendente.equipa;
                this.pendente = null;
                if (!(typeof Match !== 'undefined' && Match.state === 'FIM_DE_JOGO' && this.iniciar(e))) this._seguirFimDeJogo();
            }
            return;
        }
        if (!this.activa) return;
        if (typeof Match !== 'undefined' && Match.state !== 'FIM_DE_JOGO') { this.cancelar(); return; }
        const C = ComemoracaoTitulo;
        this.t += dt; this.tFase += dt;
        if (this.fase === 'reuniao') {
            const venc = this.partes.filter(s => s.papel === 'venc');
            if (venc.every(s => s.chegou) || this.tFase >= C.reuniao.prazo) this._comecarFesta();
        } else if (this.fase === 'festa') {
            // A taca aparece nas maos do capitao.
            if (this.taca) { const k = this._suave(this.tFase / C.taca.tEntrega); this.taca.visible = true; this.taca.scale.setScalar(Math.max(0.001, k)); }
            // A cada erguer (no inicio do segmento): confetis e a torcida.
            const e = this.estadoDaTaca();
            if (e.seg && e.seg.tipo === 'erguer' && this._erguerDisparado !== e.seg.n) {
                this._erguerDisparado = e.seg.n;
                this._lancarConfetis();
                if (e.seg.n > 0 && typeof AmbienteSonoro !== 'undefined' && AmbienteSonoro.gritarGolo && !AmbienteSonoro._pausado) { try { AmbienteSonoro.gritarGolo(); } catch (er) { /* sem som */ } }
            }
            if (this.tFase >= this.fimFesta) { this.terminar(); return; }
        }
        this._tickConfetis(dt);
        if (this.t > C.tempoMax) this.terminar();
    },

    // ---------------------------------------------------------------------------------------------------------------------------------
    // OS JOGADORES
    // ---------------------------------------------------------------------------------------------------------------------------------

    // O passo de um jogador em coreografia (chamado do topo do FootballPlayer.update).
    passoDoJogador(p, dt) {
        const s = p.campeaoOrdem;
        const C = ComemoracaoTitulo, PS = C.pose;
        const pos = p.model.position;
        s.t = (s.t || 0) + dt;
        if (typeof ALTURA_BASE_Y === 'number') pos.y = ALTURA_BASE_Y;
        p.jumpTimer = 0;
        // Anda em linha reta ate ao lugar (depois do atraso sorteado).
        if (s.t >= s.atraso && s.i < s.wps.length) {
            const w = s.wps[s.i];
            const dx = w.x - pos.x, dz = w.z - pos.z, d = Math.hypot(dx, dz);
            if (d < 0.05) s.i++;
            else {
                // A chegar trava (os ultimos 1.5 m), para nao parar de golpe dentro do grupo.
                const vel = s.vel * Math.min(1, 0.35 + d / 1.5);
                const passo = Math.min(d, vel * dt);
                pos.x += dx / d * passo; pos.z += dz / d * passo;
                p.velocity.set(dx / d * vel, 0, dz / d * vel);
                s.yawAlvo = Math.atan2(dx, dz);
            }
        } else if (s.t < s.atraso) p.velocity.set(0, 0, 0);
        if (s.i >= s.wps.length) {
            s.chegou = true; p.velocity.set(0, 0, 0);
            if (s.olhar) s.yawAlvo = Math.atan2(s.olhar.x - pos.x, s.olhar.z - pos.z);
        }
        const alvo = (typeof s.yawAlvo === 'number') ? s.yawAlvo : s.yaw;
        const dif = Math.atan2(Math.sin(alvo - s.yaw), Math.cos(alvo - s.yaw));
        s.yaw += dif * (1 - Math.exp(-dt * 8));
        p.model.quaternion.setFromAxisAngle(this._eixoY || (this._eixoY = new THREE.Vector3(0, 1, 0)), s.yaw);
        // As maos na cabeca de alguns derrotados (o `lamento` do quase golo): em coreografia o relogio dele conta-se aqui.
        if (p.lamento) p.lamento.t += dt;
        p.animateBones(dt);
        if (!s.chegou || !p.rig || !p.fsm || !p.fsm._escreverPoseComemorar) return;

        if (s.papel === 'derr') { this._poseDerrotado(p, s, dt); return; }

        // O VENCEDOR: segura a taca, passa-a, ou pula de bracos no ar.
        const e = this.estadoDaTaca();
        const fsm = p.fsm;
        let P = null, y = 0;
        const comTaca = !!this.taca && this.fase === 'festa' && (p === e.h || p === e.de);
        if (comTaca) {
            // Num passe os dois seguram-na ao peito; o que a segura ergue-a pelo `k`, e la em cima abana-a um pouco.
            P = fsm._poseMistura(PS.segurar, PS.erguer, (p === e.h) ? e.k : 0);
            if (p === e.h && e.k > 0.95) {
                const ab = Math.sin(s.t * 9) * 0.05;
                P = Object.assign({}, P, { bracoEx: P.bracoEx + ab, bracoDx: P.bracoDx + ab });
                y = C.salto.alturaPortador * Math.abs(Math.sin(s.t * Math.PI / C.salto.periodoJuntos));
            }
        } else {
            // Os saltos: com a taca no ar todos ao mesmo ritmo (a fase de cada um puxada para a comum); senao cada um ao seu, com pausas.
            const juntos = this.fase === 'festa' && e.k > 0.5 && !e.de;
            const periodo = juntos ? C.salto.periodoJuntos : s.periodo;
            const antes = s.fase;
            if (s.pausa > 0) s.pausa -= dt;
            else s.fase += dt / periodo;
            if (juntos) {
                const comum = this.tFase / C.salto.periodoJuntos;
                let dfase = (comum - s.fase) % 1; if (dfase > 0.5) dfase -= 1; if (dfase < -0.5) dfase += 1;
                s.fase += THREE.MathUtils.clamp(dfase, -dt * 1.2, dt * 1.2);
            }
            if (Math.floor(s.fase) !== Math.floor(antes) && !juntos && Math.random() < C.salto.pausaChance) s.pausa = s.periodo;
            const u = ((s.fase % 1) + 1) % 1, fAr = C.salto.fracaoNoAr;
            if (s.pausa > 0) {
                // Parado um ciclo: de pe, bracos no ar a abanar.
                P = fsm._poseMistura(PS.dePe, PS.ar, 0.75);
                const ab = Math.sin(s.t * 7 + s.periodo * 10) * 0.25;
                P = Object.assign({}, P, { bracoEz: P.bracoEz + ab, bracoDz: P.bracoDz - ab, pelvisX: 0, coxaE: 0, coxaD: 0, joelhoE: 0.05, joelhoD: 0.05, peE: 0, peD: 0 });
            } else if (u < fAr) {
                const k = u / fAr;
                y = s.altura * (juntos ? 1.15 : 1) * 4 * k * (1 - k);
                P = fsm._poseMistura(PS.dePe, PS.ar, Math.min(1, 0.55 + Math.sin(Math.PI * k)));
            } else {
                const k = (u - fAr) / (1 - fAr);
                P = fsm._poseMistura(PS.ar, PS.agachar, Math.sin(Math.PI * k));
            }
        }
        fsm._escreverPoseComemorar(P);
        // As solas no relvado com a pose ja escrita, e so entao o salto (vai a zero no ponto mais baixo) — como na festa da disputa de penaltis.
        if (p.assentarNoChao) { for (let k = 0; k < 6; k++) p.assentarNoChao(); }
        pos.y += y;
        if (comTaca) this._tacaNasMaos(p, s, e);
    },

    // Os derrotados, parados: maos na cabeca (o lamento do quase golo), na cintura de cabeca baixa, ou agachados com as maos nos joelhos.
    _poseDerrotado(p, s, dt) {
        const PS = ComemoracaoTitulo.pose;
        if (s.variante === 'cabeca') {
            if (!p.lamento) p.lamento = { t: 0, dur: 1e6 };
            return;   // o `animateBones` ja pos as maos na cabeca (aplicarQuaseGolo)
        }
        const k = this._suave((s.tParado = (s.tParado || 0) + dt) / 0.8);
        const P = p.fsm._poseMistura(PS.dePe, s.variante === 'joelhos' ? PS.joelhos : PS.cintura, k);
        p.fsm._escreverPoseComemorar(P);
        if (p.assentarNoChao) { for (let i = 0; i < 6; i++) p.assentarNoChao(); }
    },

    // O meio das duas maos de `p` (no mundo), em `out`.
    _meioDasMaos(p, out) {
        const r = p.rig;
        if (!r || !r.lHand || !r.rHand) return out.set(p.model.position.x, 1.3, p.model.position.z);
        p.model.updateMatrixWorld(true);
        r.lHand.getWorldPosition(out);
        r.rHand.getWorldPosition(this._w);
        return out.add(this._w).multiplyScalar(0.5);
    },

    /*
    A TACA NAS MAOS: o pe da taca (`pega` acima da base) fica no meio das duas maos de quem a segura, de pe e virada para onde ele olha. Num passe vai das
    maos de um as do outro (com um pequeno arco). Chamado no fim do passo de cada um dos que a seguram (o ultimo a andar no frame acerta-a).
    */
    _tacaNasMaos(p, s, e) {
        this._meioDasMaos(p, s.maos);
        s.maosT = this.t;
        const tc = this.taca, TC = ComemoracaoTitulo.taca;
        if (!tc) return;
        const v = this._v;
        if (e.de) {
            const sd = e.de.campeaoOrdem, sh = e.h.campeaoOrdem;
            if (!sd || !sh) return;
            // (quem recebe ainda sem as maos medidas — nao chegou ao lugar —: a taca fica nas maos de quem a da)
            v.copy(sd.maosT !== undefined ? sd.maos : sh.maos).lerp(sh.maosT !== undefined ? sh.maos : v, e.u);
            v.y += Math.sin(Math.PI * e.u) * 0.15;
        } else v.copy(s.maos);
        tc.position.set(v.x, v.y - TC.pega * tc.scale.y, v.z);
        tc.quaternion.setFromAxisAngle(this._eixoY, (e.de ? e.h : p).campeaoOrdem.yaw);
    },

    // ---------------------------------------------------------------------------------------------------------------------------------
    // A TACA (procedimental: base, pe, bojo, bordo e duas asas; ouro metalico)
    // ---------------------------------------------------------------------------------------------------------------------------------
    _criarTaca() {
        const TC = ComemoracaoTitulo.taca;
        const g = new THREE.Group();
        g.name = 'taca_campeao';
        const ouro = new THREE.MeshStandardMaterial({ color: TC.cor, metalness: TC.metalness, roughness: TC.roughness, emissive: TC.emissivo });
        const base = new THREE.MeshStandardMaterial({ color: TC.corBase, metalness: 0.2, roughness: 0.6 });
        const H = TC.altura, R = TC.raioBojo;
        // O pedestal (escuro, com um friso dourado).
        const ped = new THREE.Mesh(new THREE.CylinderGeometry(R * 0.62, R * 0.72, H * 0.13, 20), base);
        ped.position.y = H * 0.065; g.add(ped);
        const friso = new THREE.Mesh(new THREE.CylinderGeometry(R * 0.64, R * 0.64, H * 0.025, 20), ouro);
        friso.position.y = H * 0.12; g.add(friso);
        // O pe e o bojo num so perfil torneado (LatheGeometry), da base do pe ao bordo.
        const perfil = [
            [R * 0.45, 0.13], [R * 0.40, 0.16], [R * 0.16, 0.20], [R * 0.11, 0.26], [R * 0.13, 0.33], [R * 0.24, 0.37],
            [R * 0.55, 0.42], [R * 0.82, 0.52], [R * 0.97, 0.66], [R * 1.00, 0.80], [R * 1.06, 0.94], [R * 1.10, 1.00],
            [R * 1.04, 1.00], [R * 0.93, 0.93]
        ].map(([r, y]) => new THREE.Vector2(r, y * H));
        const corpo = new THREE.Mesh(new THREE.LatheGeometry(perfil, 28), ouro);
        corpo.material.side = THREE.DoubleSide;
        g.add(corpo);
        // As duas asas (meio toro de cada lado do bojo).
        for (const lado of [-1, 1]) {
            const asa = new THREE.Mesh(new THREE.TorusGeometry(R * 0.42, R * 0.085, 8, 16, Math.PI), ouro);
            asa.rotation.z = lado > 0 ? -Math.PI / 2 : Math.PI / 2;
            asa.position.set(lado * R * 0.95, H * 0.72, 0);
            g.add(asa);
        }
        g.traverse(m => { if (m.isMesh) { m.castShadow = true; } });
        g.visible = false;
        g.scale.setScalar(0.001);
        if (Match.scene) Match.scene.add(g);
        this.taca = g;
    },

    _tirarTaca() {
        const g = this.taca;
        if (!g) return;
        if (g.parent) g.parent.remove(g);
        g.traverse(m => { if (m.isMesh) { if (m.geometry) m.geometry.dispose(); } });
        this.taca = null;
    },

    // ---------------------------------------------------------------------------------------------------------------------------------
    // OS CONFETIS (nas cores do campeao e dourados), a cada erguer da taca
    // ---------------------------------------------------------------------------------------------------------------------------------
    _coresDoCampeao() {
        const info = (this.equipa === 'TeamA') ? Match.equipaInfoA : Match.equipaInfoB;
        const cores = (info && info.escudo && info.escudo.cores) ? info.escudo.cores.filter(c => c && c !== 'transparent') : [];
        return cores.concat(['#ffd700', '#ffffff']);
    },

    _lancarConfetis() {
        const K = ComemoracaoTitulo.confetis;
        if (!K || !K.activo || !Match.scene) return;
        if (!this.confetis) {
            const n = K.quantidade, geo = new THREE.BufferGeometry();
            const pos = new Float32Array(n * 3), cor = new Float32Array(n * 3);
            const cores = this._coresDoCampeao().map(c => { try { return new THREE.Color(c); } catch (e) { return new THREE.Color(0xffd700); } });
            for (let i = 0; i < n; i++) { const c = cores[i % cores.length]; cor[i * 3] = c.r; cor[i * 3 + 1] = c.g; cor[i * 3 + 2] = c.b; }
            geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
            geo.setAttribute('color', new THREE.BufferAttribute(cor, 3));
            const pts = new THREE.Points(geo, new THREE.PointsMaterial({ size: K.tamanho, vertexColors: true }));
            pts.name = 'confetis_campeao';
            pts.frustumCulled = false;
            Match.scene.add(pts);
            this.confetis = { pts: pts, vel: new Float32Array(n), fase: new Float32Array(n) };
        }
        const c = this.confetis, a = c.pts.geometry.attributes.position.array;
        for (let i = 0; i < c.vel.length; i++) {
            const r = Math.sqrt(Math.random()) * K.area, ang = Math.random() * Math.PI * 2;
            a[i * 3] = Math.cos(ang) * r; a[i * 3 + 1] = K.alturaMin + Math.random() * (K.alturaMax - K.alturaMin); a[i * 3 + 2] = Math.sin(ang) * r;
            c.vel[i] = this._sorteio(K.queda); c.fase[i] = Math.random() * 6.28;
        }
        c.pts.geometry.attributes.position.needsUpdate = true;
        c.pts.visible = true;
    },

    _tickConfetis(dt) {
        const c = this.confetis;
        if (!c || !c.pts.visible) return;
        const a = c.pts.geometry.attributes.position.array;
        for (let i = 0; i < c.vel.length; i++) {
            if (a[i * 3 + 1] <= 0.02) continue;
            c.fase[i] += dt * 3;
            a[i * 3] += Math.sin(c.fase[i]) * 0.6 * dt;
            a[i * 3 + 2] += Math.cos(c.fase[i] * 0.8) * 0.6 * dt;
            a[i * 3 + 1] = Math.max(0.02, a[i * 3 + 1] - c.vel[i] * dt);
        }
        c.pts.geometry.attributes.position.needsUpdate = true;
    },

    _tirarConfetis() {
        const c = this.confetis;
        if (!c) return;
        if (c.pts.parent) c.pts.parent.remove(c.pts);
        c.pts.geometry.dispose(); c.pts.material.dispose();
        this.confetis = null;
    },

    // ---------------------------------------------------------------------------------------------------------------------------------
    // O TRIO, A CAMARA, A TORCIDA
    // ---------------------------------------------------------------------------------------------------------------------------------

    // O trio anda para a lateral do tunel, de frente para o grupo; o juiz leva a bola no antebraco (a pose da abertura). Chamado do Officials.update.
    moverOficiais(dt) {
        const O = ComemoracaoTitulo.oficiais;
        for (const x of this.oficiais) {
            if (!x.o || !x.o.model) continue;
            Officials.mover(x.o, x.alvo.x, x.alvo.z, O.velocidade, dt, { x: 0, z: 0 });
            if (x.tipo === 'lin' && Officials._ajustarPano) Officials._ajustarPano(x.o, dt);
        }
        if (typeof Abertura !== 'undefined' && Abertura._bolaNaMao && typeof AberturaModel !== 'undefined' && AberturaModel.bracoDaBola && Match.ball) {
            if (!Abertura._v) Abertura._v = new THREE.Vector3();   // (a abertura cria-o ao arrancar; sem abertura neste jogo ainda nao existe)
            Abertura._bolaNaMao();
        }
        if (Officials.atualizarVista) Officials.atualizarVista();
    },

    /*
    A CAMARA DA FESTA (chamada do Match.updateCamera, preenche posicao e alvo; a suavizacao e a de todas as vistas): de longe e alta enquanto se juntam;
    depois perto, a frente do grupo (+X, o lado das cameras), a rodar devagar de um lado para o outro e a olhar para a taca; nos ultimos segundos
    afasta-se e sobe.
    */
    camera(pos, look) {
        const CC = ComemoracaoTitulo.camera;
        if (this.fase !== 'festa') {
            pos.set(CC.reuniao.raio, CC.reuniao.altura, 0);
            look.set(0, 1.0, 0);
            return;
        }
        const F = CC.festa, tf = this.tFase;
        const ang = F.abertura * Math.sin(tf * F.ritmo * Math.PI * 2 * 0.5);
        let r = F.raio + F.raioOscila * Math.sin(tf * F.ritmo * 1.3), h = F.altura;
        const fim = this._suave((tf - (this.fimFesta - CC.fim.tempo)) / CC.fim.tempo);
        r += (CC.fim.raio - r) * fim; h += (CC.fim.altura - h) * fim;
        pos.set(Math.cos(ang) * r, h, Math.sin(ang) * r);
        const tc = this.taca;
        const ty = (tc && tc.visible) ? tc.position.y + ComemoracaoTitulo.taca.altura * 0.5 : CC.alvoAltura;
        look.set(tc ? tc.position.x * 0.5 : 0, Math.max(CC.alvoAltura, ty * 0.8 + CC.alvoAltura * 0.2), tc ? tc.position.z * 0.5 : 0);
    },

    // A claque do campeao festeja como num golo enquanto dura (Crowd.update): devolve { equipa } ou null.
    festaTorcida() { return this.activa ? { equipa: this.equipa } : null; },

    // O jogo espera por isto antes do modal e da saida de campo do fim de jogo.
    emCurso() { return this.activa || !!this.pendente; },

    // ---------------------------------------------------------------------------------------------------------------------------------
    // O FIM
    // ---------------------------------------------------------------------------------------------------------------------------------

    // Fim natural (ou ESC): todos param e segue o fim de jogo de sempre (modal e saida de campo).
    terminar() {
        if (!this.activa && !this.pendente) return;
        const arb = (typeof Officials !== 'undefined') ? Officials.arbitro : null;
        this.limpar();
        // A bola que o juiz levava fica no relvado ao lado dele.
        if (arb && arb.model && typeof Match !== 'undefined' && Match.ball) {
            const r = (typeof BallPhysics !== 'undefined' && BallPhysics.raio) || 0.11;
            Match.ball.position.set(arb.model.position.x + 0.5, r, arb.model.position.z);
            if (Match.ballVel) Match.ballVel.set(0, 0, 0);
        }
        this._seguirFimDeJogo();
    },

    // O fim de jogo que esperou pela festa: o modal das estatisticas e a saida de campo (o mesmo do Match.encerrarJogo sem festa).
    _seguirFimDeJogo() {
        if (typeof Match === 'undefined' || Match.state !== 'FIM_DE_JOGO') return;
        try { if (typeof mostrarModalIntervalo === 'function') mostrarModalIntervalo(true, 'FIM DE JOGO'); } catch (e) { console.warn('[fim de jogo] modal:', e); }
        if (typeof Abertura !== 'undefined' && Abertura.saidaIntervalo) Abertura.saidaIntervalo();
        // Acabado o jogo do manager, a torcida cala-se (o que a ponte faria no `fim`, adiado para depois da festa).
        if (typeof Ponte !== 'undefined' && Ponte.estado === 'terminado' && Ponte.modo === 'visivel' && typeof AmbienteSonoro !== 'undefined' && AmbienteSonoro.setPausa) AmbienteSonoro.setPausa(true);
    },

    // Desfaz tudo sem seguir o fim de jogo (um `iniciar` novo da ponte, o estado mudou por fora).
    cancelar() { this.limpar(); },

    limpar() {
        for (const s of this.partes) {
            const p = s.p;
            if (!p) continue;
            p.campeaoOrdem = null;
            p.lamento = null;
            if (p.velocity) p.velocity.set(0, 0, 0);
            if (p.model && typeof ALTURA_BASE_Y === 'number') p.model.position.y = ALTURA_BASE_Y;
            if (p.resetBonesToDefault) p.resetBonesToDefault();
        }
        this._tirarTaca();
        this._tirarConfetis();
        this.partes = []; this.oficiais = []; this.ordem = []; this.guiao = [];
        this.activa = false; this.pendente = null; this.fase = null; this.equipa = null; this.capitao = null;
        this.t = 0; this.tFase = 0; this.fimFesta = 0;
    }
};
if (typeof window !== 'undefined') window.ComemoracaoCampeao = ComemoracaoCampeao;
// O teste da consola, junto das outras comemoracoes: `Comemoracao.campeao('TeamA')` (ou 'TeamB').
if (typeof Comemoracao !== 'undefined') Comemoracao.campeao = (equipa) => ComemoracaoCampeao.testar(equipa);
