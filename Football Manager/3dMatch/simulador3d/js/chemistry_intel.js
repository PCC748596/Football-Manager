/*
=============================================================================
ChemistryIntel — o quadro de intencoes entre companheiros (Chemistry Intelligence)
=============================================================================
Spec: docs/superpowers/specs/2026-11-12-chemistry-intelligence-design.md; config: ChemistryIntelModel (js/config/chemistry_intel.js).

NAO E UMA SEGUNDA AI. E um quadro de mensagens: as folhas que ja existem (infiltrar, overlap, desmarcar; o portador) postam intencoes, e a Utility AI do
passe e o movimento leem-nas como informacao a mais. Sem intencao, tudo fica como estava.

Etapa 1: o Chemistry da dupla, o quadro (postar, compreender, cancelar, expirar, sem conflitos nem repeticoes) e o debug.
Etapa 2: fluxo A — quem corre (infiltrar, overlap, apoio) avisa o portador; se ele compreende, o o passe para essa corrida vai no ponto avisado e sai com menos erro.
=============================================================================
*/
const ChemistryIntel = {
    // Minutos juntos por dupla, por equipa: Map('idA|idB' -> minutos), com idA < idB (ids reais, os de `p.skills.id`).
    _par: { TeamA: null, TeamB: null },
    _pool: [],
    activas: [],          // as mensagens vivas (estado enviada/compreendida/aceita)
    historico: [],        // as ultimas que acabaram (para o debug e os testes)
    contagem: {},         // por tipo e por estado
    _acc: 0,
    _ultimaDe: new Map(), // 'remetente|destinatario|tipo' -> instante da ultima (controle de repeticao)
    _tempo: 0,

    /*
    O SORTEIO PROPRIO do modulo (mulberry32), reposto a cada partida: nao consome o Math.random do jogo, para que ligar o sistema nao mude todos os sorteios
    seguintes da partida — com ele ligado e desligado o jogo e o mesmo ate ao primeiro passe que o Chemistry muda (o lote compara-se jogo a jogo).
    */
    _semente: 0x9E3779B9,
    _sorteio() {
        let t = (this._semente = (this._semente + 0x6D2B79F5) | 0);
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    },

    reset() {
        this._semente = 0x9E3779B9;
        this._passeAberto = null; this.activas.length = 0; this.historico.length = 0; this.contagem = {}; this._acc = 0; this._ultimaDe.clear(); this._tempo = 0;
        this._limparDebug();
    },

    /*
    O ENTROSAMENTO DO MANAGER: `lista` = [[idManagerA, idManagerB, minutos], ...] (o `synergyMap` das duplas do elenco, ver simulador3dCliente.ts).
    Os ids passam a ids reais (os do motor) pelo `AdaptadorManager.idReal`. Sem lista, a equipa fica sem dados (Chemistry `semDados`).
    */
    carregar(team, lista) {
        if (!Array.isArray(lista)) { this._par[team] = null; return; }
        const real = (id) => (typeof AdaptadorManager !== 'undefined' && AdaptadorManager.idReal) ? AdaptadorManager.idReal(id) : Number(String(id).replace(/\D/g, ''));
        const m = new Map();
        for (const e of lista) {
            if (!e || e.length < 3) continue;
            const a = real(e[0]), b = real(e[1]);
            if (a === null || b === null || a === b) continue;
            m.set(a < b ? a + '|' + b : b + '|' + a, Number(e[2]) || 0);
        }
        this._par[team] = m;
    },

    _idDe(p) { return (p && p.skills && p.skills.id !== undefined) ? Number(p.skills.id) : (p ? Number(p.id) : null); },

    /** Chemistry da dupla, 0 a 99 (`semDados` se o manager nao mandou o entrosamento desta equipa). */
    chemistry(p1, p2) {
        const M = ChemistryIntelModel;
        if (!p1 || !p2 || p1 === p2 || p1.team !== p2.team) return 0;
        const m = this._par[p1.team];
        if (!m) return M.semDados;
        const a = this._idDe(p1), b = this._idDe(p2);
        const min = m.get(a < b ? a + '|' + b : b + '|' + a) || 0;
        return Math.max(0, Math.min(99, Math.round(min / (M.jogosParaTeto * M.minutosPorJogo) * 99)));
    },

    /** A faixa de comunicacao (0 inexistente .. 4 excelente). */
    faixa(chem) {
        const f = ChemistryIntelModel.faixas;
        for (let i = 0; i < f.length; i++) if (chem <= f[i]) return i;
        return f.length - 1;
    },

    _contar(tipo, estado) {
        const k = tipo + ':' + estado;
        this.contagem[k] = (this.contagem[k] || 0) + 1;
    },

    _novaMensagem() {
        const m = this._pool.pop() || {};
        m.de = null; m.para = null; m.tipo = ''; m.x = 0; m.z = 0; m.acao = ''; m.criada = 0; m.validade = 0; m.confianca = 0; m.estado = 'enviada';
        m.motivo = ''; m.chem = 0; m.bonus = 0;
        return m;
    },

    /*
    POSTAR UMA INTENCAO. Devolve a mensagem, ou null (com o motivo em `ultimoMotivo`) se: o sistema esta desligado, o remetente ja tem o maximo de intencoes
    ativas, a mesma mensagem foi postada ha menos de `cooldownRepeticao` s, ou o destino fica a menos de `distMinDestinos` de outra intencao ativa da equipa
    (dois colegas para o mesmo espaco).
    */
    postar(de, para, tipo, x, z, acao, confianca) {
        const M = ChemistryIntelModel;
        this.ultimoMotivo = '';
        if (!M.activo || !de || !para || de === para || de.team !== para.team) { this.ultimoMotivo = 'invalida'; return null; }
        let doRemetente = 0;
        for (const a of this.activas) {
            if (a.de === de) doRemetente++;
            if (a.de.team === de.team && Math.hypot(a.x - x, a.z - z) < M.distMinDestinos) { this.ultimoMotivo = 'conflito'; this._contar(tipo, 'conflito'); return null; }
        }
        if (doRemetente >= M.maxPorRemetente) { this.ultimoMotivo = 'limite'; return null; }
        const chave = de.id + '|' + para.id + '|' + tipo;
        const ultima = this._ultimaDe.get(chave);
        if (ultima !== undefined && this._tempo - ultima < M.cooldownRepeticao) { this.ultimoMotivo = 'repetida'; return null; }
        this._ultimaDe.set(chave, this._tempo);
        const m = this._novaMensagem();
        m.de = de; m.para = para; m.tipo = tipo; m.x = x; m.z = z; m.acao = acao || ''; m.criada = this._tempo;
        m.validade = (M.validade && M.validade[tipo]) || M.validadePadrao;
        m.confianca = (typeof confianca === 'number') ? Math.max(0, Math.min(1, confianca)) : 0.5;
        m.chem = this.chemistry(de, para);
        this.activas.push(m);
        this._contar(tipo, 'enviada');
        return m;
    },

    /** Muda o estado de uma mensagem viva (compreendida, aceita) ou acaba-a (recusada, executada, cancelada, expirada). */
    marcar(m, estado, motivo) {
        if (!m) return;
        m.estado = estado; if (motivo) m.motivo = motivo;
        this._contar(m.tipo, estado);
        if (estado === 'recusada' || estado === 'executada' || estado === 'cancelada' || estado === 'expirada') {
            const i = this.activas.indexOf(m);
            if (i >= 0) this.activas.splice(i, 1);
            this.historico.push({ tipo: m.tipo, de: m.de && m.de.id, para: m.para && m.para.id, estado, motivo: m.motivo, chem: m.chem, confianca: m.confianca, bonus: m.bonus });
            if (this.historico.length > 200) this.historico.shift();
            if (this._pool.length < ChemistryIntelModel.tamanhoDoPool) this._pool.push(m);
        }
    },

    /** A intencao viva que tem `para` como destinatario (e, se dado, `de` como remetente), ou null. */
    intencaoPara(para, de) {
        for (const a of this.activas) if (a.para === para && (!de || a.de === de)) return a;
        return null;
    },
    /** A intencao viva postada por `de`, ou null. */
    intencaoDe(de) {
        for (const a of this.activas) if (a.de === de) return a;
        return null;
    },

    /** Cancela todas as intencoes vivas (posse mudou, lance parado). */
    cancelarTodas(motivo, team) {
        for (let i = this.activas.length - 1; i >= 0; i--) {
            const a = this.activas[i];
            if (!team || a.de.team === team) this.marcar(a, 'cancelada', motivo);
        }
    },

    /*
    UM FRAME (chamado do Match.update). O tempo corre sempre; o resto so a cada `intervalo` s: expira o que passou da validade, cancela o que deixou de fazer
    sentido (remetente ou destinatario fora de campo, lance parado, a equipa do remetente perdeu a bola) e desenha o debug.
    */
    _posse: null,
    update(dt) {
        if (typeof Match === 'undefined') return;
        this._tempo += dt;
        if (!ChemistryIntelModel.activo) { if (this.activas.length) this.cancelarTodas('desligado'); return; }
        this._acc += dt;
        if (this._acc < ChemistryIntelModel.intervalo) return;
        this._acc = 0;
        if (Match.state !== 'PLAY') { if (this.activas.length) this.cancelarTodas('lance_parado'); }
        const posse = Match.possessionTeam || null;
        if (posse !== this._posse) { if (this._posse && this.activas.length) this.cancelarTodas('posse_mudou', this._posse); this._posse = posse; }
        const emCampo = (p) => !!(p && p.model && !p.expulso && (p.team === 'TeamA' ? Match.players : Match.opponents).indexOf(p) >= 0);
        for (let i = this.activas.length - 1; i >= 0; i--) {
            const a = this.activas[i];
            if (this._tempo - a.criada > a.validade) this.marcar(a, 'expirada', 'validade');
            else if (!emCampo(a.de) || !emCampo(a.para)) this.marcar(a, 'cancelada', 'fora_de_campo');
            else if (Match.ballCarrier && a.para !== Match.ballCarrier && a.tipo !== 'THROUGH_PASS' && a.tipo !== 'CROSS_TARGET') this.marcar(a, 'cancelada', 'portador_mudou');
        }
        this._escutarCorridas();
        this._lerEspaco();
        this._compreender();
        if (ChemistryIntelModel.debug) this._desenharDebug(); else this._limparDebug();
    },

    // ---------------------------------------------------------------- debug
    _debugObjs: [],
    _limparDebug() {
        for (const o of this._debugObjs) { if (o.parent) o.parent.remove(o); if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); }
        this._debugObjs.length = 0;
        const el = (typeof document !== 'undefined') ? document.getElementById('chemistry-debug') : null;
        if (el) el.style.display = 'none';
    },
    _desenharDebug() {
        if (typeof THREE === 'undefined' || typeof Match === 'undefined' || !Match.scene) return;
        this._limparDebug();
        const linhas = [];
        for (const a of this.activas) {
            if (!a.de.model || !a.para.model) continue;
            const cor = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6'][this.faixa(a.chem)];
            const mat = new THREE.LineBasicMaterial({ color: cor });
            const g = new THREE.BufferGeometry().setFromPoints([
                new THREE.Vector3(a.de.model.position.x, 0.3, a.de.model.position.z),
                new THREE.Vector3(a.para.model.position.x, 0.3, a.para.model.position.z),
                new THREE.Vector3(a.x, 0.3, a.z)]);
            const l = new THREE.Line(g, mat);
            const marca = new THREE.Mesh(new THREE.RingGeometry(0.5, 0.7, 20), new THREE.MeshBasicMaterial({ color: cor, side: THREE.DoubleSide }));
            marca.rotation.x = -Math.PI / 2; marca.position.set(a.x, 0.05, a.z);
            Match.scene.add(l); Match.scene.add(marca);
            this._debugObjs.push(l, marca);
            const resta = Math.max(0, a.validade - (this._tempo - a.criada));
            linhas.push(`${a.tipo} #${a.de.num || a.de.id}→#${a.para.num || a.para.id} chem ${a.chem} ${a.estado} ${resta.toFixed(1)}s conf ${a.confianca.toFixed(2)} +${Math.round(a.bonus)}${a.motivo ? ' (' + a.motivo + ')' : ''}`);
        }
        const el = (typeof document !== 'undefined') ? document.getElementById('chemistry-debug') : null;
        if (el) { el.style.display = linhas.length ? 'block' : 'none'; el.textContent = linhas.join('\n'); }
    },

    // ---------------------------------------------------------------- etapa 2: fluxo A (sem bola -> portador)

    /** Atributos (0..1: 50 -> 0, 99 -> 1) pela media dos campos do manager (skills.atr); sem eles, o skill do jogador. */
    _norm(p, campos, base) {
        const v = (p && typeof p.atributoDe === 'function') ? p.atributoDe(campos, base || 'tec') : 70;
        return Math.max(0, Math.min(1, (v - 50) / 49));
    },

    /*
    AVISAR (ou actualizar) uma intencao: se o remetente ja tem uma viva para o mesmo destinatario e tipo, so o destino anda (a corrida mudou de rumo); se tem
    outra (outro portador, outro tipo), essa cai e entra a nova. Ao nascer sorteia-se se o destinatario a vai compreender e quando (faixa + atributos dele).
    */
    avisar(de, para, tipo, x, z, acao, confianca) {
        const viva = this.intencaoDe(de);
        if (viva) {
            if (viva.para === para && viva.tipo === tipo) { viva.x = x; viva.z = z; return viva; }
            this.marcar(viva, 'cancelada', 'substituida');
        }
        const m = this.postar(de, para, tipo, x, z, acao, confianca);
        if (!m) return null;
        const M = ChemistryIntelModel, f = this.faixa(m.chem);
        // Quem le: o portador le a corrida (visao, compostura, reaccoes); quem corre le o espaco que o portador lhe mostra (sem bola, posicionamento, reaccoes).
        const leitura = (tipo === 'THROUGH_PASS')
            ? this._norm(para, ['posOffense', 'tacticalAwa', 'reactions'], 'tec')
            : this._norm(para, ['vision', 'composure', 'reactions'], 'pass');
        const chance = M.compreensaoBase[f] * ((1 - M.pesoAtributos) + M.pesoAtributos * leitura);
        m.compreendeEm = m.criada + M.atrasoCompreensao[f];
        m.vaiCompreender = this._sorteio() < chance;
        // A corrida que o PROPRIO portador pediu (fluxo B) ele ja a conhece: o aviso de volta vem compreendido logo.
        if (tipo !== 'THROUGH_PASS') {
            for (const a of this.activas) {
                if (a.tipo === 'THROUGH_PASS' && a.de === para && a.para === de && a.estado === 'compreendida') { m.vaiCompreender = true; m.compreendeEm = m.criada; break; }
            }
        }
        return m;
    },

    /** O tipo da corrida de `q` (overlap, para dentro da area, diagonal ou em profundidade) e o destino dela; null se nao esta a correr. */
    _corridaDe(q) {
        const s = q.fsm ? q.fsm.currentState : '';
        if (s === 'SUPPORT_PASS') return { tipo: 'SUPPORT_RUN', x: q.dynamicTarget.x, z: q.dynamicTarget.z };
        if (s !== 'RUN_INTO_SPACE' || !(q.runTimer > 0)) return null;
        const alvo = q.overlapAlvo || q.runAlvo || q.dynamicTarget;
        if (!alvo) return null;
        let tipo = 'FORWARD_RUN';
        if (q.overlapAlvo) tipo = 'OVERLAP';
        else if (typeof Area !== 'undefined' && Area.contem && Area.contem(alvo.x, alvo.z, q.targetGoalZ)) tipo = 'BOX_RUN';
        else if (Math.abs(alvo.x - q.model.position.x) > ChemistryIntelModel.diagonalMin) tipo = 'DIAGONAL_RUN';
        return { tipo, x: alvo.x, z: alvo.z };
    },

    /*
    ESCUTAR AS CORRIDAS da equipa com a bola: quem corre (as folhas de sempre — infiltrar, overlap, tabela, desmarcar/apoio — ja o puseram a correr) avisa o
    portador. O destino e o alvo que a propria folha calculou; nada no comportamento muda. Quem deixou de correr retira o aviso.
    */
    _escutarCorridas() {
        const portador = Match.ballCarrier;
        if (!portador || Match.state !== 'PLAY') return;
        const colegas = portador.team === 'TeamA' ? Match.players : Match.opponents;
        for (const q of colegas) {
            if (q === portador || q.role === 'gk' || !q.model) continue;
            const c = this._corridaDe(q);
            if (c) {
                const conf = this._norm(q, ['posOffense', 'tacticalAwa'], 'tec');
                this.avisar(q, portador, c.tipo, c.x, c.z, 'passe', 0.4 + 0.6 * conf);
            } else {
                const viva = this.intencaoDe(q);
                if (viva && viva.para === portador) this.marcar(viva, 'cancelada', 'parou_de_correr');
            }
        }
    },

    // ---------------------------------------------------------------- etapa 3: fluxo B (portador -> sem bola)

    /*
    LER O ESPACO (fluxo B, o que se ve nos jogos grandes): o portador olha para os colegas a frente da bola que ainda nao correm e procura, para cada um, o
    ponto do lancamento (alvoDoLancamento, bt/player_bt.js: o controle do ponto em probabilidade x o valor do ponto, e o baricentro). Se o melhor tem
    controle suficiente (`fluxoB.pMin`), mostra-lho (THROUGH_PASS, destino = esse ponto). Se o colega compreende (Chemistry da dupla + a leitura dele),
    ARRANCA ANTES DO PASSE para la (_arrancar); a corrida dele volta ao portador como aviso ja compreendido (avisar), e o lancamento sai para quem corre.
    De `fluxoB.intervalo` em `fluxoB.intervalo` s por portador, um aviso de cada vez.
    */
    _lerEspaco() {
        const M = ChemistryIntelModel, B = M.fluxoB;
        const portador = Match.ballCarrier;
        if (!B || !B.activo || !portador || !portador.model || Match.state !== 'PLAY' || portador.role === 'gk') return;
        if (this.intencaoDe(portador)) return;
        if (portador._chemLerEm !== undefined && this._tempo < portador._chemLerEm) return;
        portador._chemLerEm = this._tempo + B.intervalo;
        if (typeof alvoDoLancamento !== 'function' || typeof TeamAI === 'undefined') return;
        const outra = portador.team === 'TeamA' ? 'TeamB' : 'TeamA';
        const bbAdv = TeamAI.get(outra);
        if (!bbAdv || typeof bbAdv.defLineDir !== 'number') return;
        const linhaNoNosso = -bbAdv.defLineDir;
        const dirZ = portador.dirZ, meuAv = portador.model.position.z * dirZ;
        if (meuAv > linhaNoNosso - 4) return;   // colado a linha: nao ha espaco nas costas dela
        const colegas = portador.team === 'TeamA' ? Match.players : Match.opponents;
        const advs = portador.team === 'TeamA' ? Match.opponents : Match.players;
        let melhor = null;
        for (const q of colegas) {
            if (q === portador || !q.model || q.role === 'gk' || q.role === 'def' || q.expulso) continue;
            if (q.fsm && q.fsm.currentState === 'RUN_INTO_SPACE') continue;      // ja corre: e o fluxo A
            if (q.runCooldown > 0) continue;
            const av = q.model.position.z * dirZ;
            if (av <= meuAv + 2 || av > linhaNoNosso + 0.3) continue;            // a frente da bola e em posicao regular
            if (linhaNoNosso - av > B.longeDaLinha) continue;
            if (this.chemistry(portador, q) < B.chemMin) continue;
            const t = alvoDoLancamento(portador, q, advs, linhaNoNosso, true);
            if (!t || !(t.p >= B.pMin)) continue;
            if (!melhor || t.nota > melhor.t.nota) melhor = { q, t };
        }
        if (!melhor) return;
        const m = this.avisar(portador, melhor.q, 'THROUGH_PASS', melhor.t.x, melhor.t.z, 'arrancar', melhor.t.p);
        if (m) this._contar('THROUGH_PASS', 'espacoMostrado');
    },

    /** O colega compreendeu o espaco: arranca ja para o ponto (RUN_INTO_SPACE, o mesmo estado das infiltracoes), antes de o passe sair. */
    _arrancar(a) {
        const q = a.para;
        if (!q || !q.model || !q.fsm || q === Match.ballCarrier) return;
        q.runAlvo = { x: a.x, z: a.z };
        q.overlapAlvo = null;
        if (q.dynamicTarget) q.dynamicTarget.set(a.x, (typeof ALTURA_BASE_Y === 'number') ? ALTURA_BASE_Y : 0, a.z);
        q.speedMult = q.sprintSpeed || (6.5 * 1.3);
        q.runTimer = a.validade + 1.0;
        q.runCarrier = a.de;
        q.fsm.changeState('RUN_INTO_SPACE');
        this._contar('THROUGH_PASS', 'arrancou');
    },

    /** Compreensao: chegou a hora de a mensagem ser percebida (ou nao) pelo destinatario. */
    _compreender() {
        for (let i = this.activas.length - 1; i >= 0; i--) {
            const a = this.activas[i];
            if (a.estado !== 'enviada' || a.compreendeEm === undefined || this._tempo < a.compreendeEm) continue;
            if (a.vaiCompreender) { this.marcar(a, 'compreendida'); if (a.tipo === 'THROUGH_PASS') this._arrancar(a); }
            else this.marcar(a, 'recusada', 'nao_compreendeu');
        }
    },

    /*
    O PASSE SAIU (initiatePass): se era para quem avisou a corrida, a intencao foi executada (o gancho da memoria fica para a etapa 4). Se o portador a tinha
    COMPREENDIDO, devolve { x, z, fator }: o destino avisado e quanto o passe melhora (Chemistry da dupla / 99) — a bola vai no ponto da corrida e sai com
    menos erro (ChemistryIntelModel.precisao, aplicado em fsm.js). A ESCOLHA do passe nao muda: um bonus na nota (lote de 36 jogos, 2026-11-13) empurrava
    passes arriscados e baixava os passes certos. Sem aviso compreendido: null, o passe de sempre.
    */
    passeFeito(portador, alvo) {
        // Um passe anterior para quem avisou que ninguem recebeu (saiu, morreu no relvado, impedimento): errado.
        if (this._passeAberto) { this._contar(this._passeAberto.tipo, this._passeAberto.comBonus ? 'comBonus_errado' : 'semBonus_errado'); this._passeAberto = null; }
        // O espaco que o portador mostrou (fluxo B): o passe para la executa-o.
        for (const a of this.activas) {
            if (a.tipo === 'THROUGH_PASS' && a.de === portador && a.para === alvo) { this.marcar(a, 'executada', 'passe'); this._contar('THROUGH_PASS', 'passeNoEspacoMostrado'); break; }
        }
        for (const a of this.activas) {
            if (a.de === alvo && a.para === portador) {
                const comBonus = a.estado === 'compreendida';
                if (comBonus) this._contar(a.tipo, 'comBonus');
                this._passeAberto = { para: alvo, tipo: a.tipo, comBonus };
                const r = (comBonus && ChemistryIntelModel.activo) ? { x: a.x, z: a.z, fator: Math.max(0, Math.min(1, a.chem / 99)) } : null;
                if (r) a.bonus = r.fator;
                this.marcar(a, 'executada', 'passe'); this.registarJogada(a.de, a.para, a.tipo, 'passe');
                return r;
            }
        }
        return null;
    },

    /*
    O PONTO DO ENCONTRO para quem avisou a corrida (so no passe directo; o lancamento e o passe ao espaco ja trazem o ponto deles, filtrado): onde a bola e
    ele se encontram, a caminho do destino avisado. Ponto fixo: o tempo de voo e o da bola ATE ao ponto (a velocidade media do alvoDePasse, utils.js), e ele
    corre desde a velocidade actual, a acelerar ate ~90% do maximo. Nao passa do destino. Devolve null (fica o ponto de sempre) se a linha de passe estiver
    tapada ou houver adversario perto do ponto.
    */
    pontoDaCorrida(portador, alvo, destX, destZ) {
        const R = alvo.model.position, P = portador.model.position;
        const dx = destX - R.x, dz = destZ - R.z, falta = Math.hypot(dx, dz);
        if (falta < 0.5) return null;
        const ux = dx / falta, uz = dz / falta;
        const vMax = (alvo.speedMult || 7.5) * 0.9;
        const v0 = Math.min(vMax, alvo.velocity ? Math.max(0, alvo.velocity.x * ux + alvo.velocity.z * uz) : 0);
        const acel = 4.0;
        const percorre = (t) => { const tA = (vMax - v0) / acel; return t <= tA ? v0 * t + 0.5 * acel * t * t : v0 * tA + 0.5 * acel * tA * tA + vMax * (t - tA); };
        let x = R.x, z = R.z;
        for (let k = 0; k < 4; k++) {
            const d = Math.hypot(x - P.x, z - P.z);
            const vBola = d <= 15 ? 12 : (d <= 30 ? 22 - (d - 15) * 4 / 15 : Math.max(16, 18 - (d - 30) * 2 / 30));
            const s = Math.min(falta, percorre(Math.min(3.0, d / vBola)));
            x = R.x + ux * s; z = R.z + uz * s;
        }
        const adv = (portador.team === 'TeamA') ? Match.opponents : Match.players;
        const obst = [];
        for (const o of adv) {
            if (!o || !o.model || o.expulso) continue;
            if (Math.hypot(o.model.position.x - x, o.model.position.z - z) < ChemistryIntelModel.folgaNoPonto) return null;
            obst.push(o.model.position);
        }
        if (typeof linhaLivre === 'function' && !linhaLivre(P.x, P.z, x, z, obst, ChemistryIntelModel.folgaNaLinha)) return null;
        return { x, z };
    },

    /*
    A bola de um passe chegou a alguem (MatchStats.registarRecepcao): se o passe era para quem avisou a corrida, certo quando o proprio a dominou, errado
    noutro caso. Conta com bonus (o portador compreendeu) e sem bonus (nao compreendeu), para comparar a percentagem de certos dos dois.
    */
    _passeAberto: null,
    passeChegou(jogador, dominou) {
        const p = this._passeAberto;
        if (!p) return;
        this._passeAberto = null;
        const certo = dominou && jogador === p.para;
        this._contar(p.tipo, (p.comBonus ? 'comBonus_' : 'semBonus_') + (certo ? 'certo' : 'errado'));
    },

    /** O gancho da memoria das duplas (etapa 4 e o futuro Player Memory System). Por agora so conta. */
    jogadas: [],
    registarJogada(de, para, tipo, resultado) {
        this.jogadas.push({ de: de && de.id, para: para && para.id, tipo, resultado, t: this._tempo });
        if (this.jogadas.length > 200) this.jogadas.shift();
    },

    /** Liga/desliga o debug (botao do painel). */
    alternarDebug() {
        ChemistryIntelModel.debug = !ChemistryIntelModel.debug;
        if (!ChemistryIntelModel.debug) this._limparDebug();
        return ChemistryIntelModel.debug;
    }
};

if (typeof window !== 'undefined') window.ChemistryIntel = ChemistryIntel;
