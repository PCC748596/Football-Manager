/*
=============================================================================
NOTAS DOS JOGADORES — O MOTOR (logica pura: sem THREE, sem DOM)
=============================================================================
Cada jogador acumula valores brutos por componente (unidades de nota). A pontuacao de cada componente (0-100) vem de
uma saturacao tanh centrada na base que da a nota neutra, e a nota e `1 + 9 * ponderada / 100`.
Um evId, um efeito por jogador: repetir o mesmo evId com o mesmo tipo e ignorado; com outro tipo SUBSTITUI o anterior
(e assim que uma perda de bola vira "erro que gera golo" sem contar duas vezes).
=============================================================================
*/
const _NCfg = (typeof NotasConfig !== 'undefined') ? NotasConfig : require('./notas_config.js');
const COMPONENTES = ['tatico', 'tecnico', 'participacao', 'disciplina'];

const NotasMotor = {
    cfg: _NCfg,
    jogadores: {},
    _ultimaPerda: { TeamA: null, TeamB: null },

    reset() { this.jogadores = {}; this._ultimaPerda = { TeamA: null, TeamB: null }; },

    normalizarEstilo(e) { return e ? String(e).toLowerCase().replace(/[\s-]+/g, '_') : null; },
    grupoDe(pos) { return this.cfg.grupos[pos] || 'CM'; },
    _estiloAtivo(j) {
        const e = this.cfg.estilos[j.estilo];
        return (e && e.posicoes.indexOf(j.pos) >= 0) ? e : null;
    },

    entrar(id, d) {
        const pos = d.pos || 'CM';
        this.jogadores[id] = {
            id: id, equipa: d.equipa, pos: pos, grupo: this.grupoDe(pos), estilo: this.normalizarEstilo(d.estilo),
            entrou: d.minuto || 0, saiu: null,
            raw: { tatico: 0, tecnico: 0, participacao: 0, disciplina: 0 },
            aplicado: {}, cont: {}, nDef: 0, nEventos: 0, qSoma: 0, qN: 0
        };
        return this.jogadores[id];
    },
    sair(id, minuto) { const j = this.jogadores[id]; if (j && j.saiu === null) j.saiu = minuto; },

    _mult(j, tipo) {
        const p = this.cfg.perfis[j.grupo] || {};
        const e = this._estiloAtivo(j);
        return ((p.mult && p.mult[tipo]) || 1) * ((e && e.mult && e.mult[tipo]) || 1);
    },
    _contribs(j, tipo) {
        const base = this.cfg.eventos[tipo];
        if (!base) return null;
        const m = this._mult(j, tipo) * (this.cfg.escalaEventos || 1);
        return base.map(([c, v]) => [c, v * m]);
    },
    _somar(j, contribs, sinal) { for (const [c, v] of contribs) j.raw[c] += sinal * v; },

    evento(id, tipo, d) {
        const j = this.jogadores[id];
        if (!j) return false;
        const contribs = this._contribs(j, tipo);
        if (!contribs) return false;
        const evId = (d && d.evId) || (tipo + ':' + j.nEventos);
        const ant = j.aplicado[evId];
        if (ant) {
            if (ant.tipo === tipo) return false;
            this._somar(j, ant.contribs, -1);
            j.cont[ant.tipo]--;
            if (this.cfg.defensivos.indexOf(ant.tipo) >= 0) j.nDef--;
        }
        this._somar(j, contribs, +1);
        j.aplicado[evId] = { tipo: tipo, contribs: contribs };
        j.cont[tipo] = (j.cont[tipo] || 0) + 1;
        if (this.cfg.defensivos.indexOf(tipo) >= 0) j.nDef++;
        if (!ant) j.nEventos++;
        return true;
    },

    perda(id, equipa, tSeg, evId) {
        this.evento(id, 'PASSE_ERRADO', { evId: evId });
        this._ultimaPerda[equipa] = { id: id, t: tSeg, evId: evId, promovida: false };
    },
    // Uma perda so e promovida uma vez; um remate (promovida 'remate') ainda pode subir para golo.
    remateAdversario(equipaQueRematou, tSeg, foiGolo) {
        const equipaDoErro = equipaQueRematou === 'TeamA' ? 'TeamB' : 'TeamA';
        const p = this._ultimaPerda[equipaDoErro];
        if (!p || p.promovida === true || (p.promovida === 'remate' && !foiGolo)) return false;
        if (tSeg < p.t || tSeg - p.t > this.cfg.janelaErroSeg) return false;
        p.promovida = foiGolo ? true : 'remate';
        return this.evento(p.id, foiGolo ? 'ERRO_GOLO' : 'ERRO_REMATE', { evId: p.evId });
    },

    /*
    Qualidade tatica de UM instante, de -1 a 1. Nao e so a distancia ao posto: o estilo alarga a tolerancia (`liberdade`),
    a bola perto justifica sair do posto, e ha bonus por fazer o que a fase pede (oferecer linha de passe a atacar,
    fechar linha/pressionar a defender).
    */
    qualidadeTatica(id, ctx) {
        const j = this.jogadores[id];
        if (!j) return 0;
        const e = this._estiloAtivo(j);
        const liberdade = e ? e.liberdade : this.cfg.liberdadePadrao;
        // Tolerancias medidas em jogo: dEsperada tem mediana 4.5 m e p90 13.5 m; so o que passa do ~5 m (6-9 m com liberdade) conta.
        const tolerancia = 3 + 6 * liberdade + (ctx.bolaPerto ? 4 : 0);
        const excesso = Math.max(0, ctx.dEsperada - tolerancia);
        let q = 0.75 * (1 - 2 * Math.min(1, excesso / 15));
        if (ctx.fase === 'ataque' && ctx.ofereceLinha) q += 0.25;
        if (ctx.fase === 'defesa' && ctx.fechaLinha) q += 0.25;
        if (ctx.fase === 'defesa' && ctx.pressiona) q += 0.10;
        return Math.max(-1, Math.min(1, q));
    },
    amostrar(id, ctx) {
        const j = this.jogadores[id];
        if (!j) return;
        j.qSoma += this.qualidadeTatica(id, ctx);
        j.qN++;
    },

    // Quantas vezes o jogador fez `tipo` (para a tabela: golos, assistencias...).
    contar(id, tipo) { const j = this.jogadores[id]; return (j && j.cont[tipo]) || 0; },

    _min(j, agora) { return Math.max(0, (j.saiu !== null ? j.saiu : agora) - j.entrou); },
    _pesos(j) {
        const p = (this.cfg.perfis[j.grupo] || {}).pesos || this.cfg.pesos;
        const soma = COMPONENTES.reduce((s, c) => s + p[c], 0);
        const o = {}; for (const c of COMPONENTES) o[c] = p[c] / soma;
        return o;
    },
    _base() { return 100 * (this.cfg.neutra - 1) / 9; },
    // raw (unidades de nota) -> pontuacao 0..100. Escala 4*peso: pequenos valores dao ~ o mesmo delta de nota.
    _pontuacao(raw, peso) {
        const B = this._base(), t = Math.tanh(raw / (4 * peso));
        return t >= 0 ? B + (100 - B) * t : B * (1 + t);
    },
    _rawTatico(j) {
        if (!j.qN) return 0;
        const pf = this.cfg.perfis[j.grupo] || {};
        const perfil = pf.tatico || 1;
        return (j.qSoma / j.qN - (pf.qNeutro !== undefined ? pf.qNeutro : this.cfg.qNeutro)) * this.cfg.ampTatica * perfil * Math.pow(Math.min(1, j.qN / this.cfg.amostrasPlenas), 2);
    },

    detalhes(id, agora) {
        const j = this.jogadores[id];
        if (!j) return null;
        const pesos = this._pesos(j);
        const raw = Object.assign({}, j.raw, { tatico: j.raw.tatico + this._rawTatico(j) });
        const sc = {}; let pond = 0;
        for (const c of COMPONENTES) { sc[c] = this._pontuacao(raw[c], pesos[c]); pond += pesos[c] * sc[c]; }
        const nota = Math.min(10, Math.max(1, 1 + 9 * pond / 100));
        const r = {}; for (const c of COMPONENTES) r[c] = Math.round(sc[c]);
        return Object.assign({ nota: Math.round(nota * 10) / 10, minutos: Math.round(this._min(j, agora)) }, r);
    },
    nota(id, agora) { const d = this.detalhes(id, agora); return d ? d.nota : null; },

    melhor(equipa, agora) {
        let best = null, bn = -1, bd = -1;
        for (const id in this.jogadores) {
            const j = this.jogadores[id];
            if (equipa && j.equipa !== equipa) continue;
            if (this._min(j, agora) < this.cfg.minutosMoc || (j.nEventos + j.qN) === 0) continue;
            const n = this.nota(id, agora);
            if (n > bn || (n === bn && j.nDef > bd)) { best = id; bn = n; bd = j.nDef; }
        }
        return best;
    }
};
if (typeof module !== 'undefined') module.exports = NotasMotor;
