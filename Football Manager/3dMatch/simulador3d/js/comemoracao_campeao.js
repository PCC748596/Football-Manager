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
        /*
        As variantes (pedido: *"no time adversario coloca alguns jogadores olhando a comemoracao e outros sentados no campo"*): `olhar` (de pe, virado para o grupo),
        `sentado` (no relvado, de joelhos para cima e apoiado nas maos), e umas poucas das antigas (maos na cabeca, na cintura). A ordem e sorteada.
        */
        const D = C.derrotados, variantes = (D.variantes || ['olhar', 'sentado', 'cabeca']).slice();
        for (let i = variantes.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); const tmp = variantes[i]; variantes[i] = variantes[j]; variantes[j] = tmp; }
        derr.forEach((p, k) => {
            const zs = Math.abs(p.model.position.z) > 3 ? Math.sign(p.model.position.z) : (k % 2 ? 1 : -1);
            const alvo = { x: T.lado * (D.xMin + Math.random() * (D.xMax - D.xMin)), z: zs * (D.zMin + Math.random() * (D.zMax - D.zMin)) };
            // No maximo `andarMax` m na direccao do sitio (quem estava do outro lado do campo ficava a andar a festa inteira) e nunca a menos de `longeDoGrupo` m do centro.
            {
                const px = p.model.position.x, pz = p.model.position.z, dx = alvo.x - px, dz = alvo.z - pz, d = Math.hypot(dx, dz);
                if (D.andarMax && d > D.andarMax) { alvo.x = px + dx / d * D.andarMax; alvo.z = pz + dz / d * D.andarMax; }
                const dc = Math.hypot(alvo.x, alvo.z);
                if (D.longeDoGrupo && dc < D.longeDoGrupo) { const f = D.longeDoGrupo / Math.max(0.01, dc); alvo.x *= f; alvo.z *= f; }
            }
            const s = novo(p, alvo, 'derr', this._sorteio(D.velocidade), Math.random() * 1.2);
            s.variante = variantes[k % variantes.length];
            s.olhar = (s.variante === 'olhar') ? { x: 0, z: 0 } : null;   // quem olha vira-se para o grupo
        });

        // OS RESERVAS do campeao que ja esperavam a beira do campo (ver tickReservas) juntam-se ao grupo, num arco de fora.
        this._juntarReservas(equipa, novo, R);
        // O TECNICO do campeao tambem (pedido: *"o tecnico tambem tem que ir para a comemoracao"*): sai da area tecnica e entra no grupo, a frente do arco de fora.
        if (typeof Bancos !== 'undefined' && Bancos.bancos) {
            const b = Bancos.bancos.find(q => q.equipa === (equipa === 'TeamA' ? 'A' : 'B'));
            const t = b && b.treinador;
            if (t && t.jogador && t.model && t.model.visible !== false) {
                const A = R.arco3 || { raio: 3.1 };
                const s = novo(t.jogador, { x: A.raio * 0.85, z: (Math.random() * 2 - 1) * 0.8, arco: 3 }, 'venc', this._sorteio(C.tecnico.velocidade), 0.4);
                s.extra = true; s.tecnico = true; s.banco = b;
                this.tecnico = s;
            }
        }

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
        // Os de fora das listas do Match (o tecnico): o passo da coreografia e daqui (os reservas vem de tickReservas).
        for (const s of this.partes) if (s.extra && s.p && s.p.campeaoOrdem === s) this.passoDoJogador(s.p, dt);
        if (this.fase === 'volta') { this._tickVolta(dt); this._tickConfetis(dt); return; }
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
            if (this.tFase >= this.fimFesta) {
                if (C.volta && C.volta.activo) this._comecarVolta(); else this.terminar();
                return;
            }
        }
        this._tickConfetis(dt);
        if (this.t > C.tempoMax) this.terminar();
    },

    /*
    A VOLTA OLIMPICA (pedido: *"quando entrarem as estatisticas, o time vai comecar a dar a volta olimpica; a camera vai se afastar mais para cima para mostrar a volta
    olimpica"*). No fim da festa aparecem as estatisticas (o modal do fim de jogo) e os campeoes — titulares, reservas e tecnico — correm em grupo a volta do campo, por
    dentro das linhas, no sentido dos ponteiros do relogio, de bracos no ar a acenar a torcida; o capitao leva a taca. Os derrotados ficam onde estavam. No fim da volta
    (junto ao tunel) segue o fim de jogo de sempre: a saida de campo. A camera e a da volta (alta e afastada). ESC acaba-a (terminar).
    */
    _comecarVolta() {
        const V = ComemoracaoTitulo.volta;
        this.fase = 'volta'; this.tFase = 0;
        // As estatisticas so DEPOIS da volta (pedido: *"coloca o painel das estatisticas so depois da volta olimpica"*): o _seguirFimDeJogo mostra-as no fim.
        // O percurso: um retangulo por dentro das linhas, do meio da lateral da camara (+X) a volta inteira, e de volta ao meio dela.
        const X = CAMPO_LARG / 2 - V.dentro, Z = CAMPO_COMP / 2 - V.dentro;
        this._percurso = [{ x: X, z: 0 }, { x: X, z: Z }, { x: -X, z: Z }, { x: -X, z: -Z }, { x: X, z: -Z }, { x: X, z: -1 }];
        const venc = this.partes.filter(s => s.papel === 'venc');
        venc.forEach((s, i) => {
            const p = s.p;
            // Cada um com um desvio (o grupo nao corre em fila) e um pequeno atraso; o capitao a frente com a taca.
            const ox = (Math.random() * 2 - 1) * V.espalhar, oz = (Math.random() * 2 - 1) * V.espalhar;
            s.volta = { i: 0, ox: ox, oz: oz, atraso: p === this.capitao ? 0 : 0.3 + Math.random() * V.atrasoMax, t: 0, fim: false, fase: Math.random() * Math.PI * 2 };
            s.papel = 'volta';
            s.vel = this._sorteio(V.velocidade) * (p === this.capitao ? 0.97 : 1);
        });
        if (typeof AmbienteSonoro !== 'undefined' && AmbienteSonoro.gritarGolo && !AmbienteSonoro._pausado) { try { AmbienteSonoro.gritarGolo(); } catch (e) { /* sem som */ } }
    },

    _tickVolta(dt) {
        const V = ComemoracaoTitulo.volta;
        const corredores = this.partes.filter(s => s.papel === 'volta');
        if (!corredores.length || corredores.every(s => s.volta && s.volta.fim) || this.tFase > V.tempoMax) { this.terminar(); return; }
        // A taca: com o capitao, erguida de quando em quando.
        if (this.taca) this.taca.visible = true;
        if (this.tFase > (this._proxConfetis || 0)) { this._proxConfetis = this.tFase + V.confetisCada; this._lancarConfetis(); }
    },

    // O passo de quem corre a volta (chamado do passoDoJogador).
    _passoVolta(p, s, dt) {
        const V = ComemoracaoTitulo.volta, v = s.volta, pos = p.model.position;
        v.t += dt;
        if (v.t < v.atraso || v.fim) { p.velocity.set(0, 0, 0); p.animateBones(dt); this._bracosAcenar(p, s); return; }
        const w = this._percurso[v.i];
        const tx = w.x + v.ox, tz = w.z + v.oz, dx = tx - pos.x, dz = tz - pos.z, d = Math.hypot(dx, dz);
        if (d < 0.8) { v.i++; if (v.i >= this._percurso.length) { v.fim = true; p.velocity.set(0, 0, 0); } }
        else {
            const passo = Math.min(d, s.vel * dt);
            pos.x += dx / d * passo; pos.z += dz / d * passo;
            p.velocity.set(dx / d * s.vel, 0, dz / d * s.vel);
            s.yawAlvo = Math.atan2(dx, dz);
        }
        const dif = Math.atan2(Math.sin(s.yawAlvo - s.yaw), Math.cos(s.yawAlvo - s.yaw));
        s.yaw += dif * (1 - Math.exp(-dt * 6));
        p.model.quaternion.setFromAxisAngle(this._eixoY || (this._eixoY = new THREE.Vector3(0, 1, 0)), s.yaw);
        if (typeof ALTURA_BASE_Y === 'number') pos.y = ALTURA_BASE_Y;
        p.animateBones(dt);   // a passada de corrida (pela velocidade)
        if (p.assentarNoChao) p.assentarNoChao();
        if (p === this.capitao && this.taca) {
            // O capitao corre com a taca ao alto (erguida e baixada devagar, `ergueCada` s).
            const k = 0.5 + 0.5 * Math.sin(this.tFase * Math.PI * 2 / V.ergueCada);
            const r = p.rig, PS = ComemoracaoTitulo.pose, P = p.fsm._poseMistura(PS.segurar, PS.erguer, k);
            r.lArm.rotation.x = P.bracoEx; r.lArm.rotation.z = P.bracoEz; r.rArm.rotation.x = P.bracoDx; r.rArm.rotation.z = -P.bracoDz;
            if (r.lElbow) r.lElbow.rotation.x = P.cotoveloE; if (r.rElbow) r.rElbow.rotation.x = P.cotoveloD;
            p.model.updateMatrixWorld(true);
            this._tacaNasMaos(p, s, { h: p, k: k, de: null });
        } else this._bracosAcenar(p, s);
    },

    // Os bracos no ar a acenar a torcida (por cima da passada).
    _bracosAcenar(p, s) {
        const r = p.rig; if (!r) return;
        const a = Math.sin(this.tFase * 6 + s.volta.fase);
        r.lArm.rotation.x = -2.5 + a * 0.25; r.rArm.rotation.x = -2.5 - a * 0.25;
        r.lArm.rotation.z = 0.35 + a * 0.15; r.rArm.rotation.z = -0.35 + a * 0.15;
        if (r.lElbow) r.lElbow.rotation.x = -0.2; if (r.rElbow) r.rElbow.rotation.x = -0.2;
    },

    // A camera da volta: alta e afastada, do lado de fora do grupo em relacao ao centro, a olhar para o grupo (o campo inteiro em fundo).
    _cameraVolta(pos, look) {
        const CV = ComemoracaoTitulo.camera.volta;
        const vs = this.partes.filter(s => s.papel === 'volta');
        let cx = 0, cz = 0; for (const s of vs) { cx += s.p.model.position.x; cz += s.p.model.position.z; }
        if (vs.length) { cx /= vs.length; cz /= vs.length; }
        const n = Math.hypot(cx, cz) || 1;
        const alvoPos = { x: -cx / n * CV.recuo + cx * CV.segue, y: CV.altura, z: -cz / n * CV.recuo + cz * CV.segue };
        if (!this._camV) this._camV = { x: alvoPos.x, y: alvoPos.y, z: alvoPos.z, lx: cx, lz: cz };
        const c = this._camV, k = CV.suave;
        c.x += (alvoPos.x - c.x) * k; c.y += (alvoPos.y - c.y) * k; c.z += (alvoPos.z - c.z) * k;
        c.lx += (cx - c.lx) * k * 1.5; c.lz += (cz - c.lz) * k * 1.5;
        pos.set(c.x, c.y, c.z); look.set(c.lx, 0, c.lz);
    },

    // ---------------------------------------------------------------------------------------------------------------------------------
    // OS JOGADORES
    // ---------------------------------------------------------------------------------------------------------------------------------

    // O passo de um jogador em coreografia (chamado do topo do FootballPlayer.update).
    passoDoJogador(p, dt) {
        const s = p.campeaoOrdem;
        if (s && s.papel === 'volta' && s.volta) { this._passoVolta(p, s, dt); return; }
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
        if (s.papel === 'volta') { this._passoVolta(p, s, dt); return; }

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
                /*
                NO CHAO, A SOLA PLANA (relato: *"na comemoracao do campeonato os jogadores estao pulando nas pontas dos pes"*). A pose de agachar trazia os pes a +0.45
                (pontas para baixo) e a aterragem comecava na pose do ar (pontas esticadas): de joelhos dobrados, so a ponta tocava no relvado. O pe compensa a
                canela (-(coxa + joelho), a mesma conta do pe de apoio do encaixe ajoelhado do guarda-redes) para a sola assentar.
                */
                P = Object.assign({}, P, { peE: -(P.coxaE + P.joelhoE) * C.salto.compensaPe, peD: -(P.coxaD + P.joelhoD) * C.salto.compensaPe });
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
        const k = this._suave((s.tParado = (s.tParado || 0) + dt) / (s.variante === 'sentado' ? 1.2 : 0.8));
        /*
        SENTADO, NA MESMA POSE DO LESIONADO A ESPERA DA MACA (pedido: *"os jogadores sentados depois do final do campeonato tem que estar na mesma posicao sentada do INJ"*):
        a pose sentada da maca (Maca._poseDoente, k 0..1: de pe -> sentado no relvado), no sitio onde ele parou e com o rumo que trazia.
        */
        if (s.variante === 'sentado' && typeof Maca !== 'undefined' && Maca._poseDoente) {
            if (!s.ancSentado) { const pv = new THREE.Vector3(); if (p.rig && p.rig.pelvis) p.rig.pelvis.getWorldPosition(pv); else pv.copy(p.model.position); s.ancSentado = { x: pv.x, z: pv.z }; }
            Maca._poseDoente(p, k, s.ancSentado, (typeof ALTURA_BASE_Y === 'number') ? ALTURA_BASE_Y : 0, s.yaw);
            return;
        }
        const alvo = s.variante === 'joelhos' ? PS.joelhos : s.variante === 'sentado' ? PS.sentadoRelva : s.variante === 'olhar' ? PS.olhar : PS.cintura;
        const P = p.fsm._poseMistura(PS.dePe, alvo, k);
        p.fsm._escreverPoseComemorar(P);
        // Sentado, assenta pelo ponto mais baixo do corpo (a bacia); de pe, pelas solas.
        if (s.variante === 'sentado' && p.assentarCorpoInteiro) p.assentarCorpoInteiro();
        else if (p.assentarNoChao) { for (let i = 0; i < 6; i++) p.assentarNoChao(); }
    },

    /*
    OS RESERVAS DO CAMPEAO (pedido: *"faltando 5 min para terminar o jogo, faz os reservas levantarem e irem para a beira do campo aguardar o termino do jogo; eles vao
    comemorar tambem no final"*). No jogo que da o titulo (`Match.campeao`), a partir de `reservas.aosMinutos` do 2.o tempo, os reservas do time que esta a ser campeao
    (Match.campeaoDoJogo) levantam-se do banco (Bancos: descongelados, de pe) e vao para a beira do campo em frente ao banco, a olhar o jogo. Se o campeao mudar (golo do
    outro), voltam a sentar-se e levantam-se os do outro. No apito, se o time deles for o campeao, correm para o grupo (arco de fora, `reuniao.arco3`) e festejam como os
    outros; no fim (ou se nao foram campeoes) voltam ao banco e sentam-se. Corre so no jogo visivel; os do banco ocupados com uma troca (aquecimento) ficam de fora.
    */
    tickReservas(dt) {
        if (this._semDesenho() || typeof Match === 'undefined') return;
        const RC = ComemoracaoTitulo.reservas;
        if (!RC) return;
        // O QUASE CAMPEAO nos ultimos minutos (a torcida dele ja pula, ver festaTorcida): o jogo que da o titulo, no 2.o tempo, a partir de `aosMinutos`.
        {
            const ultimos = Match.state !== 'FIM_DE_JOGO' && !Match.disputa && Match.campeao && Match.primeiroTempoAcabou && !Match.faseExtra && (Match.tempoDeJogo || 0) >= RC.aosMinutos * 60;
            this._preEquipa = ultimos && Match.campeaoDoJogo ? Match.campeaoDoJogo() : null;
        }
        // O tecnico de volta a area tecnica depois da festa.
        const tv = this._tecnicoVolta;
        if (tv && typeof Officials !== 'undefined' && Officials.mover) {
            const d = Math.hypot(tv.x - tv.t.model.position.x, tv.z - tv.t.model.position.z);
            if (d > 0.3 && !(tv.t.jogador && tv.t.jogador.campeaoOrdem)) Officials.mover(tv.t, tv.x, tv.z, 2.6, dt);
            else this._tecnicoVolta = null;
        }
        if (!RC.activo || typeof Bancos === 'undefined' || !Bancos.bancos) return;
        const r = this._res;
        // Partida nova (os corpos do banco foram refeitos): esquece.
        if (r && r.lista.some(e => !e.banco.reservas.includes(e.p))) { this._res = null; return; }
        const emJogo = Match.state !== 'FIM_DE_JOGO' && !Match.disputa;
        if (emJogo && Match.campeao && Match.primeiroTempoAcabou && !Match.faseExtra && (Match.tempoDeJogo || 0) >= RC.aosMinutos * 60) {
            const eq = Match.campeaoDoJogo ? Match.campeaoDoJogo() : null;
            if (eq && (!r || r.equipa !== eq)) { if (r) this._mandarSentar(r); this._levantarReservas(eq); }
        }
        const rr = this._res;
        if (!rr) return;
        let todosSentados = true;
        for (const e of rr.lista) {
            const p = e.p;
            if (e.fase === 'festa') {
                // Na festa e o passo da coreografia (fora das listas do Match, por isso chamado daqui).
                if (p.campeaoOrdem && this.activa) this.passoDoJogador(p, dt);
                else e.fase = 'voltar';
                todosSentados = false;
                continue;
            }
            if (e.fase === 'ir' || e.fase === 'esperar') {
                const d = Math.hypot(e.alvo.x - p.model.position.x, e.alvo.z - p.model.position.z);
                if (d > 0.15) Match._andar(p, e.alvo.x, e.alvo.z, RC.velocidade, dt);
                else { e.fase = 'esperar'; Match._andar(p, e.alvo.x, e.alvo.z, 0, dt, { x: 0, z: p.model.position.z }); }
                if (Match._assentar) Match._assentar(p, dt, p.model.position.x, p.model.position.z);
                todosSentados = false;
            } else if (e.fase === 'voltar') {
                const d = Math.hypot(e.casa.x - p.model.position.x, e.casa.z - p.model.position.z);
                if (d > 0.2) { Match._andar(p, e.casa.x, e.casa.z, RC.velocidadeVolta, dt); if (Match._assentar) Match._assentar(p, dt, p.model.position.x, p.model.position.z); todosSentados = false; }
                else {
                    p.model.position.set(e.casa.x, p.model.position.y, e.casa.z);
                    if (p.resetBonesToDefault) p.resetBonesToDefault();
                    Bancos._sentar(p); p.model.rotation.set(0, e.casa.rot, 0);
                    if (Bancos.congelar) Bancos.congelar(p);
                    e.fase = 'sentado';
                }
            }
        }
        if (todosSentados && rr.lista.every(e => e.fase === 'sentado')) this._res = null;
    },

    _levantarReservas(eq) {
        const banco = Bancos.bancos.find(b => b.equipa === (eq === 'TeamA' ? 'A' : 'B'));
        if (!banco || !banco.reservas.length) return;
        const RC = ComemoracaoTitulo.reservas, B = BancosDeReservas;
        const ocupados = new Set((Match.subsPendentes || []).filter(q => !q.feita && q.B).map(q => q.B));
        const lado = (B.lado < 0 ? -1 : 1);
        const livres = banco.reservas.filter(p => p && p.model && p.model.visible !== false && !ocupados.has(p));
        const lista = livres.map((p, i) => {
            const casa = { x: p.model.position.x, z: p.model.position.z, rot: p.model.rotation.y };
            if (Bancos.descongelar) Bancos.descongelar(p);
            if (p.resetBonesToDefault) p.resetBonesToDefault();
            if (p.rig && p.rig.pelvis && typeof p._pelvisY0 === 'number') p.rig.pelvis.position.y = p._pelvisY0;
            p.model.position.y = (typeof ALTURA_BASE_Y === 'number') ? ALTURA_BASE_Y : 0;
            p.animTimer = 0; p.velAnim = 0;
            // A beira do campo em frente ao banco, lado a lado (fora da linha lateral).
            const z = banco.zc + (i - (livres.length - 1) / 2) * RC.espaco;
            return { p, banco, casa, alvo: { x: lado * (CAMPO_LARG / 2 + RC.foraDaLinha), z }, fase: 'ir' };
        });
        this._res = { equipa: eq, lista };
    },

    _mandarSentar(r) { for (const e of r.lista) { if (e.p.campeaoOrdem) e.p.campeaoOrdem = null; e.fase = 'voltar'; } },

    // No `iniciar`: os reservas que esperavam (do campeao) entram na coreografia; os do outro time voltam ao banco.
    _juntarReservas(equipa, novo, R) {
        const r = this._res;
        if (!r) return;
        if (r.equipa !== equipa) { this._mandarSentar(r); return; }
        const quem = r.lista.filter(e => e.fase === 'ir' || e.fase === 'esperar');
        const A = R.arco3 || { raio: 3.1, de: 40, ate: 320 }, n = quem.length;
        quem.forEach((e, i) => {
            const a = THREE.MathUtils.degToRad(A.de + (A.ate - A.de) * (n === 1 ? 0.5 : i / (n - 1)));
            const s = novo(e.p, { x: Math.cos(a) * A.raio + (Math.random() * 2 - 1) * R.jitter, z: Math.sin(a) * A.raio + (Math.random() * 2 - 1) * R.jitter, arco: 3 }, 'venc', this._sorteio(R.velocidade), Math.random() * R.atrasoMax);
            s.reserva = true;
            e.fase = 'festa';
        });
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
        if (this.fase === 'volta' && CC.volta) { this._cameraVolta(pos, look); return; }
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
    /*
    A torcida do campeao festeja (Crowd.update: pula como num golo) enquanto dura a festa e a volta olimpica — e JA nos ultimos minutos (pedido: *"quando faltar 5 min
    para acabar o jogo, a torcida do time que e quase campeao ja vai comecar a pular sem parar"*): desde que os reservas dele se levantaram (tickReservas).
    */
    festaTorcida() {
        if (this.activa) return { equipa: this.equipa };
        return this._preEquipa ? { equipa: this._preEquipa } : null;
    },

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
        if (!this._modalMostrado) { try { if (typeof mostrarModalIntervalo === 'function') mostrarModalIntervalo(true, 'FIM DE JOGO'); } catch (e) { console.warn('[fim de jogo] modal:', e); } }
        this._modalMostrado = false;
        if (typeof Abertura !== 'undefined' && Abertura.saidaIntervalo) Abertura.saidaIntervalo();
        // Acabado o jogo do manager, a torcida cala-se (o que a ponte faria no `fim`, adiado para depois da festa).
        if (typeof Ponte !== 'undefined' && Ponte.estado === 'terminado' && Ponte.modo === 'visivel' && typeof AmbienteSonoro !== 'undefined' && AmbienteSonoro.setPausa) AmbienteSonoro.setPausa(true);
    },

    // Desfaz tudo sem seguir o fim de jogo (um `iniciar` novo da ponte, o estado mudou por fora).
    cancelar() { this.limpar(); },

    limpar() {
        if (this._res) for (const e of this._res.lista) if (e.fase === 'festa') e.fase = 'voltar';
        // O tecnico volta a area tecnica a pe (o Bancos.update, que o move no jogo, nao corre depois do apito): ver tickReservas.
        if (this.tecnico && this.tecnico.banco && this.tecnico.banco.treinador && typeof BancosDeReservas !== 'undefined' && BancosDeReservas.treinador) {
            const t = this.tecnico.banco.treinador;
            this._tecnicoVolta = { t: t, x: BancosDeReservas.treinador.x, z: this.tecnico.banco.zc };
            t.paradoNoAlvo = false; t.animTimer = 0;
        }
        this.tecnico = null; this._percurso = null; this._camV = null; this._proxConfetis = 0;
        for (const s of this.partes) {
            const p = s.p;
            if (!p) continue;
            p.campeaoOrdem = null;
            p.lamento = null;
            if (p.velocity) p.velocity.set(0, 0, 0);
            if (p.model && typeof ALTURA_BASE_Y === 'number') p.model.position.y = ALTURA_BASE_Y;
            if (p.resetBonesToDefault) p.resetBonesToDefault();
            if (p.model && s.ancSentado) { p.model.rotation.order = 'XYZ'; p.model.rotation.set(0, s.yaw || 0, 0); }   // a pose sentada da maca muda a ordem do Euler
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
