/*
=============================================================================
NOTAS DOS JOGADORES — LIGACAO AO MOTOR 3D
=============================================================================
Nao decide nada no jogo: ouve o registo de eventos (Eventos.aoRegistar) e recebe chamadas pontuais dos ganchos
(`typeof Notas !== 'undefined'`, ao estilo do MatchStats). O calculo esta em notas_motor.js.

O id de um jogador e o do ELENCO do manager (`p.skills.id`), o mesmo que o manager usa em `playerRatings`.
=============================================================================
*/
const _NMotor = (typeof NotasMotor !== 'undefined') ? NotasMotor : require('./notas_motor.js');

const Notas = {
    _ligado: false,
    ativo: true,
    _n: 0,

    minutoAtual() { return (typeof Match !== 'undefined' && typeof Match.tempoDeJogo === 'number') ? Match.tempoDeJogo / 60 : 0; },
    segAtual() { return (typeof Match !== 'undefined' && typeof Match.tempoDeJogo === 'number') ? Match.tempoDeJogo : 0; },
    jogadorId(p) { return (p && p.skills && p.skills.id !== undefined && p.skills.id !== null) ? String(p.skills.id) : null; },
    _id(j) { return (j && j.id !== undefined && j.id !== null) ? String(j.id) : null; },

    registarJogador(p, minuto) {
        const id = this.jogadorId(p);
        if (id === null) return;
        const ja = _NMotor.jogadores[id];
        if (ja && ja.saiu === null) return;
        _NMotor.entrar(id, { equipa: p.team, pos: p.pos, estilo: p.playingStyleFixo || (p.skills && p.skills.estilo) || null, minuto: minuto || 0 });
    },
    // Chamado ao abrir cada jogo, com os jogadores ja criados (ver Ponte.iniciar e Match.trocarEquipas).
    iniciar() {
        _NMotor.reset();
        this._n = 0;
        if (typeof Match !== 'undefined') for (const p of this.emCampo()) this.registarJogador(p, 0);
        if (!this._ligado && typeof Eventos !== 'undefined') { Eventos.aoRegistar(ev => this._aoEvento(ev)); this._ligado = true; }
    },
    // As duas equipas: `Match.players` e a TeamA, `Match.opponents` a TeamB.
    emCampo() { return (typeof Match !== 'undefined') ? [].concat(Match.players || [], Match.opponents || []) : []; },
    sair(p) { const id = this.jogadorId(p); if (id !== null) _NMotor.sair(id, this.minutoAtual()); },
    substituir(sai, entra) { this.sair(sai); this.registarJogador(entra, this.minutoAtual()); },

    _ev(j, tipo, evId) { const id = this._id(j); if (id !== null && this.ativo) _NMotor.evento(id, tipo, { evId: evId, minuto: this.minutoAtual() }); },

    /*
    Os eventos do registo (js/narracao/eventos.js). Um acontecimento, um efeito: o REMATE so conta no desfecho
    'defesa' ou 'fora' (no 'golo' conta como GOLO, nao como remate no gol) e cada efeito tem o seu evId.
    */
    _aoEvento(ev) {
        if (!this.ativo) return;
        switch (ev.tipo) {
            case 'REMATE':
                if (!ev.desfecho) break;
                if (ev.desfecho === 'defesa') this._ev(ev.jogador, 'REMATE_NO_GOL', 'r' + ev.n);
                else if (ev.desfecho === 'fora') this._ev(ev.jogador, 'REMATE_FORA', 'r' + ev.n);
                if ((ev.desfecho === 'defesa' || ev.desfecho === 'fora') && ev.xg >= 0.3) this._ev(ev.jogador, 'GRANDE_CHANCE_PERDIDA', 'gc' + ev.n);
                if (ev.equipa) _NMotor.remateAdversario(ev.equipa, this.segAtual(), ev.desfecho === 'golo');
                break;
            case 'GOLO':
                if (ev.proprioGolo) this._ev(ev.jogador, 'ERRO_GOLO', 'og' + ev.n);
                else { this._ev(ev.jogador, 'GOLO', 'g' + ev.n); if (ev.assistente) this._ev(ev.assistente, 'ASSISTENCIA', 'a' + ev.n); }
                break;
            case 'DEFESA': {
                const r = (typeof Eventos !== 'undefined') ? Eventos.ultimoRemate : null;
                this._ev(ev.jogador, (r && r.xg >= 0.25) ? 'DEFESA_DIFICIL' : 'DEFESA', 'd' + ev.n);
                break;
            }
            case 'FALTA':
                this._ev(ev.jogador, 'FALTA', 'f' + ev.n);
                if (ev.cartao) {
                    this._ev(ev.jogador, ev.cartao === 'vermelho' ? 'VERMELHO' : 'AMARELO', 'c' + ev.n);
                    if (ev.cartao === 'vermelho') this.sair({ skills: { id: ev.jogador && ev.jogador.id } });
                }
                break;
        }
    },

    // ---- ganchos pontuais (um por acontecimento; o `evId` impede a dupla contagem) ------------------------------
    _gancho(p, tipo) { const id = this.jogadorId(p); if (id !== null && this.ativo) _NMotor.evento(id, tipo, { evId: tipo + ':' + (++this._n), minuto: this.minutoAtual() }); },
    tackle(p) { this._gancho(p, 'DESARME'); },
    intercecao(p) { this._gancho(p, 'INTERCEPTACAO'); },
    corte(p) { this._gancho(p, 'CORTE'); },
    duelo(p, aereo) { if (aereo) this._gancho(p, 'DUELO_AEREO'); },
    passeProgressivo(p) { this._gancho(p, 'PASSE_PROGRESSIVO'); },
    passeDecisivo(p) { this._gancho(p, 'PASSE_DECISIVO'); },
    cruzamento(p) { this._gancho(p, 'CRUZAMENTO_CERTO'); },
    drible(p) { this._gancho(p, 'DRIBLE'); },
    penaltiCometido(p) { this._gancho(p, 'PENALTI_COMETIDO'); },
    perda(p) { const id = this.jogadorId(p); if (id !== null && this.ativo) _NMotor.perda(id, p.team, this.segAtual(), 'pp:' + (++this._n)); },

    // Faixas de cor da especificacao (seccao 11).
    corDaNota(n) {
        return n >= 9 ? '#1b8a3a' : n >= 8 ? '#37b24d' : n >= 7 ? '#82c91e' : n >= 6 ? '#fcc419' : n >= 5 ? '#fd9a14' : n >= 4 ? '#e8590c' : '#e03131';
    },

    // { idDoElenco: { nota, tatico, tecnico, participacao, disciplina, minutos, pos, equipa, moc, def } }
    resultado() {
        const o = {}, agora = this.minutoAtual();
        const mocA = _NMotor.melhor('TeamA', agora), mocB = _NMotor.melhor('TeamB', agora);
        for (const id in _NMotor.jogadores) {
            const j = _NMotor.jogadores[id], d = _NMotor.detalhes(id, agora);
            o[id] = Object.assign({ pos: j.pos, equipa: j.equipa, moc: id === mocA || id === mocB, def: j.nDef }, d);
        }
        return o;
    }
};
if (typeof module !== 'undefined') module.exports = Notas;
