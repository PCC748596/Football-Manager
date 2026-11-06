/*
LESOES NA PARTIDA (liga os modulos de js/injuries ao jogo 3D).

  . CONTATO: `Officials.marcarFalta` chama `MatchInjuries.aoContato(vitima, gravidade)`. Quem sofre a falta pode se machucar.
  . SEM CONTATO: `tick(dt)` (chamado de Match.update) sorteia, uma vez por segundo de jogo, quem esta em corrida.
  . ESTADOS (injury_database.js, estadosPossiveisInMatch):
      Forced    sai de qualquer jeito: debuff forte e troca pedida (feita na proxima parada).
      Requested o jogador pede para sair: troca pedida, sem debuff extra.
      Hurt      continua baleado (-20% de velocidade) e a cada minuto pode agravar (vira Complexa + Forced).
  . A troca usa Match.pedirSubstituicao com `_reportar`, o mesmo caminho do goleiro expulso: o manager espelha escalacao, banco e contador.
    Sem reserva do mesmo papel, ou com 5 trocas feitas, quem saiu fica em campo baleado (Forced = -60%).
  . Ao manager vai a mensagem `lesao` (ver GameContext.motor3dMensagem): dias reais e estimativa do medico ja calculados aqui.
  . O medico do clube sai de `equipaInfo.pesoLiga` (default 65): ver MedicalDepartment.gerarMedicoProcedural.
*/
const MatchInjuries = {
    ligada: true,
    maxTrocas: 5,
    fatorBaleado: 0.80,
    fatorForcado: 0.40,
    _acSeg: 0,
    _acMin: 0,
    _medicos: {},
    historico: [],

    reiniciar: function () { this._acSeg = 0; this._acMin = 0; this._medicos = {}; this.historico = []; },

    _lista: function () { return [].concat(Match.players || [], Match.opponents || []); },
    _lado: function (p) { return p.team === 'TeamB' ? 'fora' : 'casa'; },
    _minuto: function () { return Math.floor((Match.tempoDeJogo || 0) / 60); },

    _medico: function (p) {
        const info = p.team === 'TeamA' ? Match.equipaInfoA : Match.equipaInfoB;
        if (!this._medicos[p.team]) this._medicos[p.team] = MedicalDepartment.gerarMedicoProcedural((info && info.pesoLiga) || 65);
        return this._medicos[p.team];
    },

    // 0..1. Forma fisica do dia baixa e cansaco alto agravam; sem skills, 0.5.
    propensao: function (p) {
        const forma = (p.skills && typeof p.skills.fitness === 'number') ? p.skills.fitness : 60;
        const cansaco = 1 - (typeof p.energia === 'number' ? p.energia : 1);
        return Math.max(0.1, Math.min(1, 0.25 + 0.55 * (1 - forma / 100) + 0.3 * cansaco));
    },

    elegivel: function (p) {
        return !!p && !p.expulso && !p.lesao && p.role !== undefined && !(Match.disputa);
    },

    // Quem sofreu a falta. `gravidade`: a da falta (Officials.gravidadeDaFalta), normalizada aqui para 0..1.
    aoContato: function (vitima, gravidade) {
        if (!this.ligada || !this.elegivel(vitima) || vitima.role === 'gk') return;
        const g = Math.max(0, Math.min(1, (gravidade || 0) / 2));
        const r = InMatchInjuryEngine.calcularGatilhoLesaoContato(g, this.propensao(vitima));
        if (r.sofreuLesao) this.aplicar(vitima, r.lesao, r.estado, 'contato');
    },

    tick: function (dt) {
        if (!this.ligada || Match.disputa || typeof MatchDuration === 'undefined') return;
        const dtJogo = dt * (MatchDuration.timeScale || 1);
        this._acSeg += dtJogo;
        this._acMin += dtJogo;
        if (Match.state === 'PLAY') {
            while (this._acSeg >= 1) {
                this._acSeg -= 1;
                for (const p of this._lista()) {
                    if (!this.elegivel(p)) continue;
                    const v = p.velocity ? Math.hypot(p.velocity.x, p.velocity.z) : 0;
                    const vRef = (typeof StaminaModel !== 'undefined' && StaminaModel.vRef) || 6;
                    const esforco = Math.min(1, v / (vRef * 1.5));
                    if (esforco < 0.5) continue;
                    const r = InMatchInjuryEngine.calcularGatilhoLesaoSemContato(esforco, this.propensao(p));
                    if (r.sofreuLesao) { this.aplicar(p, r.lesao, r.estado, 'semContato'); break; }
                }
            }
        } else this._acSeg = Math.min(this._acSeg, 1);
        while (this._acMin >= 60) {
            this._acMin -= 60;
            for (const p of this._lista()) {
                if (!p.isBaleado || p.lesao === undefined || p.lesao.estado !== 'Hurt') continue;
                const ag = InMatchInjuryEngine.processarRiscoAgravamento(p);
                if (ag.agravou) this.aplicar(p, ag.novaLesao, ag.novoEstado, 'agravou', true);
            }
        }
        this._tentarTrocasPendentes();
    },

    aplicar: function (p, lesao, estado, causa, agravou) {
        const medico = this._medico(p);
        const reg = MedicalDepartment.registrarNovaLesao(p, lesao, medico);
        p.lesao = { reg: reg, estado: estado, lado: this._lado(p), minuto: this._minuto(), troca: false };
        if (estado === 'Hurt') InMatchInjuryEngine.aplicarDebuffBaleado(p, this.fatorBaleado);
        else if (estado === 'Forced') InMatchInjuryEngine.aplicarDebuffBaleado(p, this.fatorForcado);
        else InMatchInjuryEngine.aplicarDebuffBaleado(p, this.fatorBaleado);
        this.historico.push({ minuto: this._minuto(), jogador: p.skills && p.skills.id, lesao: lesao.id, estado: estado, causa: causa });
        this._enviar(p, estado, causa, !!agravou);
        if (estado !== 'Hurt') this._pedirTroca(p);
    },

    _enviar: function (p, estado, causa, agravou) {
        if (typeof Ponte === 'undefined' || !Ponte.enviar) return;
        const l = p.lesao.reg;
        Ponte.enviar('lesao', {
            lado: p.lesao.lado, jogador: p.skills ? p.skills.id : null, minuto: p.lesao.minuto, estado: estado, causa: causa, agravou: agravou,
            idLesao: l.idLesao, nome: l.nomeLesao, tipo: l.tipo, dias: l.diasRestantesReais, estimativa: l.estimativaManager, parte: (INJURY_DATABASE.find(x => x.id === l.idLesao) || {}).parteCorpo || null,
            quedaFisPorDia: (INJURY_DATABASE.find(x => x.id === l.idLesao) || {}).quedaFisPorDia || 0
        });
    },

    _trocasDoLado: function (lado) {
        return (Match.subsFeitas || []).filter(s => s.lado === lado).length + (Match.subsPendentes || []).filter(r => !r.feita && r.lado === lado).length;
    },

    // Pede a troca; sem reserva do papel ou sem trocas, fica em campo baleado. Chamada de novo a cada tick enquanto `troca` for false.
    _pedirTroca: function (p) {
        if (!p.lesao || p.lesao.troca || typeof TreinadorCPU === 'undefined') return;
        const lado = p.lesao.lado;
        if (this._trocasDoLado(lado) >= this.maxTrocas) { p.lesao.troca = 'sem_trocas'; return; }
        const reserva = TreinadorCPU.escolherReserva(p.team, p.role, p) || TreinadorCPU.escolherReserva(p.team, p.role === 'def' ? 'mid' : 'def', p);
        if (!reserva) { p.lesao.troca = 'sem_reserva'; return; }
        const req = { lado: lado, sai: String(p.skills && p.skills.id), entra: String(reserva.id), jogador: reserva.sk, _sk: reserva.sk, _reportar: true, _motivoLesao: true };
        if (Match.pedirSubstituicao(req)) {
            p.lesao.troca = true;
            TreinadorCPU._usados = TreinadorCPU._usados || new Set(); TreinadorCPU._usados.add(reserva.id);
        }
    },

    _tentarTrocasPendentes: function () {
        for (const p of this._lista()) if (p.lesao && p.lesao.estado !== 'Hurt' && p.lesao.troca === false) this._pedirTroca(p);
    }
};
if (typeof window !== 'undefined') window.MatchInjuries = MatchInjuries;
