/*
DIAGNOSTICO: O PORTADOR PARADO NA AREA. Relato: *"as vezes o jogador passa pelo defensor, entra na area e para uns 2 s; depois toca ou chuta. Bem estranho"*.
Nao reproduz no headless com os planteis do 3D (500 s de jogo, 341 frames de posse na area, nenhum abaixo de 1 m/s), por isso fica este registo no jogo a serio:
quando quem tem a bola esta na grande area adversaria a menos de `velMax` m/s por mais de `limite` s, escreve no console (F12) UMA linha `[portador parado]`
com o estado da FSM, o ultimo no da arvore, o tempo de decisao, os adversarios perto, e os estados e nos dos ultimos segundos. So le; nao muda nada no jogo.
Desliga-se com `DiagPortadorParado.activo = false`.
*/
const DiagPortadorParado = {
    activo: true, velMax: 0.8, limite: 1.2,
    _p: null, _t: 0, _avisado: null, _hist: [],

    _instalar() {
        if (this._instalado || typeof Action === 'undefined') return;
        this._instalado = true;
        const AP = Action.prototype, orig = AP.tick, D = this;
        AP.tick = function (bb) {
            const r = orig.call(this, bb);
            if (D.activo && bb && bb.p && typeof Match !== 'undefined' && bb.p === Match.ballCarrier) bb.p._diagNo = this.name;
            return r;
        };
    },

    tick(dt) {
        if (!this.activo || typeof Match === 'undefined' || !Match.ball) return;
        this._instalar();
        const p = Match.ballCarrier;
        if (!p || !p.model || Match.state !== 'PLAY' || p.role === 'gk') { this._p = null; this._t = 0; return; }
        const z = p.model.position.z * p.dirZ, x = p.model.position.x;
        const naArea = z > (CAMPO_COMP / 2 - 16.5) && Math.abs(x) < 20.2;
        const agora = (typeof tempoSimulado === 'function') ? tempoSimulado() : 0;
        this._hist.push({ t: agora, est: p.fsm ? p.fsm.currentState : '?', no: p._diagNo || '?', pos: p.pos });
        while (this._hist.length && agora - this._hist[0].t > 4) this._hist.shift();
        if (!naArea) { this._p = null; this._t = 0; return; }
        if (this._p !== p) { this._p = p; this._t = 0; }
        const v = p.velocity ? Math.hypot(p.velocity.x, p.velocity.z) : 0;
        if (v < this.velMax) this._t += dt; else this._t = 0;
        if (this._t > this.limite && this._avisado !== p) {
            this._avisado = p;
            const advs = (p.team === 'TeamA' ? Match.opponents : Match.players).filter(o => o && o.model && o.role !== 'gk' && !o.expulso)
                .map(o => o.model.position.distanceTo(p.model.position)).sort((a, b) => a - b).slice(0, 3).map(d => d.toFixed(1));
            // Os estados e os nos dos ultimos 4 s, sem repeticoes seguidas.
            const seq = []; for (const h of this._hist) { const k = h.est + '/' + h.no; if (!seq.length || seq[seq.length - 1].k !== k) seq.push({ k, t: (h.t - agora).toFixed(1) }); }
            console.warn('[portador parado] ' + JSON.stringify({
                minuto: Math.floor((Match.tempoDeJogo || 0) / 60), equipa: p.team, pos: p.pos, estilo: p.playingStyle, z: +z.toFixed(1), x: +x.toFixed(1),
                parado_s: +this._t.toFixed(2), fsm: p.fsm && p.fsm.currentState, no: p._diagNo, decisionTimer: +(p.decisionTimer || 0).toFixed(2), hasBall: p.hasBall,
                carryHold: p.carryHold, actionState: p.actionState, advMaisPerto: advs, pausado: (typeof window !== 'undefined') ? !!window.isPaused : null,
                estiloEquipa: (typeof Tatics !== 'undefined') ? Tatics.teamPlayStyle : null, ultimos4s: seq.slice(-12).map(s => s.t + 's ' + s.k)
            }));
        }
        if (this._avisado === p && this._t === 0) this._avisado = null;
    }
};
if (typeof window !== 'undefined') window.DiagPortadorParado = DiagPortadorParado;
