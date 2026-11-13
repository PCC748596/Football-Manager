/*
=============================================================================
ChemistryIntel — o quadro de intencoes entre companheiros (Chemistry Intelligence)
=============================================================================
Spec: docs/superpowers/specs/2026-11-12-chemistry-intelligence-design.md; config: ChemistryIntelModel (js/config/chemistry_intel.js).

NAO E UMA SEGUNDA AI. E um quadro de mensagens: as folhas que ja existem (infiltrar, overlap, desmarcar; o portador) postam intencoes, e a Utility AI do
passe e o movimento leem-nas como informacao a mais. Sem intencao, tudo fica como estava.

Etapa 1: o Chemistry da dupla, o quadro (postar, compreender, cancelar, expirar, sem conflitos nem repeticoes) e o debug.
Etapa 2: fluxo A — quem corre (infiltrar, overlap, apoio) avisa o portador; se ele compreende, o passe para essa corrida ganha um bonus no findPassTarget.
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

    reset() {
        this.activas.length = 0; this.historico.length = 0; this.contagem = {}; this._acc = 0; this._ultimaDe.clear(); this._tempo = 0;
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
        const leitura = this._norm(para, ['vision', 'composure', 'reactions'], 'pass');
        const chance = M.compreensaoBase[f] * ((1 - M.pesoAtributos) + M.pesoAtributos * leitura);
        m.compreendeEm = m.criada + M.atrasoCompreensao[f];
        m.vaiCompreender = Math.random() < chance;
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

    /** Compreensao: chegou a hora de a mensagem ser percebida (ou nao) pelo destinatario. */
    _compreender() {
        for (let i = this.activas.length - 1; i >= 0; i--) {
            const a = this.activas[i];
            if (a.estado !== 'enviada' || a.compreendeEm === undefined || this._tempo < a.compreendeEm) continue;
            if (a.vaiCompreender) this.marcar(a, 'compreendida');
            else this.marcar(a, 'recusada', 'nao_compreendeu');
        }
    },

    /*
    O BONUS NA NOTA DO PASSE (findPassTarget, player.js) do `portador` para `alvo`: so se `alvo` avisou uma corrida ao portador e ele a compreendeu. Sem isso,
    zero — a nota fica a de sempre. Guarda-se na mensagem para o debug.
    */
    bonusPasse(portador, alvo) {
        if (!ChemistryIntelModel.activo || !this.activas.length) return 0;
        for (const a of this.activas) {
            if (a.de !== alvo || a.para !== portador || a.estado !== 'compreendida') continue;
            const base = ChemistryIntelModel.bonusPasse[a.tipo] || 0;
            a.bonus = base * (a.chem / 99) * a.confianca;
            return a.bonus;
        }
        return 0;
    },

    /** O passe saiu (initiatePass): se era para quem avisou a corrida, a intencao foi executada (o gancho da memoria fica para a etapa 4). */
    passeFeito(portador, alvo) {
        for (const a of this.activas) {
            if (a.de === alvo && a.para === portador) { this.marcar(a, 'executada', 'passe'); this.registarJogada(a.de, a.para, a.tipo, 'passe'); return; }
        }
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
