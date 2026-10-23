/*
=============================================================================
CAPTURA DOS ULTIMOS 30 s (pedido: *"sempre gravar os ultimos 30 s do jogo... se tiver gravado, qualquer problema eu posso dizer em que minuto foi e voce
pode rever a situacao e fazer todas as medicoes"*).

Grava SEMPRE, em memoria, um anel dos ultimos `SEGUNDOS` s a `HZ` quadros por segundo (30 s a 30 Hz = 900 quadros, ~0.8 MB num Float32Array: nada em disco, sem
alocar por quadro). Por quadro: o instante de jogo e o estado da partida; a bola (posicao, velocidade, quem a tem); e, para cada um dos 22 jogadores, a posicao,
a orientacao, a velocidade, o estado da FSM, o alvo (`dynamicTarget`) e se tem a bola. (Esta nao e a repeticao: ver MatchReplay, que guarda so poses.)

F9 salva o anel num ficheiro `captura_<relogio>.json` (descarregado). `CapturaDeJogo.exportar()` devolve o mesmo objecto, para as ferramentas. O manager, com o foco
fora do iframe, pode mandar a mensagem { para: 'simulador3d', tipo: 'captura' } (ver ponte.js).
=============================================================================
*/
const CapturaDeJogo = {
    SEGUNDOS: 30,
    HZ: 30,
    JOGADORES: 22,
    // Por jogador: x, z, rotY, vx, vz, estado, alvoX, alvoZ, comBola
    POR_JOGADOR: 9,
    CAB: 12,   // por quadro: tempoDeJogo, estadoPartida, bx, by, bz, bvx, bvy, bvz, portador, posse, pausado, reservado
    estados: [],        // nomes das FSM vistos (o indice vai no quadro)
    estadosPartida: [],
    _buf: null, _n: 0, _i: 0, _acc: 0,

    _tamanho() { return this.CAB + this.JOGADORES * this.POR_JOGADOR; },

    iniciar() {
        this._buf = new Float32Array(this.SEGUNDOS * this.HZ * this._tamanho());
        this._n = 0; this._i = 0; this._acc = 0;
    },

    _idx(lista, nome) { let k = lista.indexOf(nome); if (k < 0) { lista.push(nome); k = lista.length - 1; } return k; },

    // Chamado a cada frame de desenho (main.js): grava a `HZ` quadros por segundo.
    registar(dt) {
        if (typeof Match === 'undefined' || !Match.ball || !Match.players || !Match.players.length) return;
        if (!this._buf) this.iniciar();
        this._acc += dt;
        const passo = 1 / this.HZ;
        if (this._acc < passo) return;
        this._acc = Math.min(this._acc - passo, passo);
        const T = this._tamanho(), base = this._i * T, b = this._buf;
        b[base] = Match.tempoDeJogo || 0;
        b[base + 1] = this._idx(this.estadosPartida, String(Match.state));
        const bp = Match.ball.position, bv = Match.ballVel || { x: 0, y: 0, z: 0 };
        b[base + 2] = bp.x; b[base + 3] = bp.y; b[base + 4] = bp.z;
        b[base + 5] = bv.x; b[base + 6] = bv.y; b[base + 7] = bv.z;
        const todos = Match.players.concat(Match.opponents);
        b[base + 8] = Match.ballCarrier ? todos.indexOf(Match.ballCarrier) : -1;
        b[base + 9] = Match.possessionTeam === 'TeamA' ? 0 : Match.possessionTeam === 'TeamB' ? 1 : -1;
        b[base + 10] = (typeof window !== 'undefined' && window.isPaused) ? 1 : 0;
        for (let k = 0; k < this.JOGADORES; k++) {
            const p = todos[k], o = base + this.CAB + k * this.POR_JOGADOR;
            if (!p || !p.model) { for (let j = 0; j < this.POR_JOGADOR; j++) b[o + j] = 0; continue; }
            b[o] = p.model.position.x; b[o + 1] = p.model.position.z; b[o + 2] = p.model.rotation.y;
            b[o + 3] = p.velocity ? p.velocity.x : 0; b[o + 4] = p.velocity ? p.velocity.z : 0;
            b[o + 5] = this._idx(this.estados, p.fsm ? p.fsm.currentState : '');
            b[o + 6] = p.dynamicTarget ? p.dynamicTarget.x : 0; b[o + 7] = p.dynamicTarget ? p.dynamicTarget.z : 0;
            b[o + 8] = p.hasBall ? 1 : 0;
        }
        this._i = (this._i + 1) % (this.SEGUNDOS * this.HZ);
        this._n = Math.min(this._n + 1, this.SEGUNDOS * this.HZ);
    },

    // O anel por ordem de tempo, como objecto serializavel.
    exportar() {
        if (!this._buf || !this._n) return null;
        const T = this._tamanho(), cap = this.SEGUNDOS * this.HZ, ini = (this._i - this._n + cap) % cap;
        const quadros = [];
        for (let q = 0; q < this._n; q++) {
            const base = ((ini + q) % cap) * T;
            quadros.push(Array.from(this._buf.subarray(base, base + T), v => Math.round(v * 1000) / 1000));
        }
        const todos = Match.players.concat(Match.opponents);
        const texto = (id) => (typeof document !== 'undefined' && document.getElementById(id)) ? document.getElementById(id).textContent.replace(/\s+/g, ' ').trim() : '';
        return {
            versao: 1, hz: this.HZ, cab: this.CAB, porJogador: this.POR_JOGADOR,
            campos: ['x', 'z', 'rotY', 'vx', 'vz', 'estado', 'alvoX', 'alvoZ', 'comBola'],
            cabCampos: ['tempoDeJogo', 'estadoPartida', 'bx', 'by', 'bz', 'bvx', 'bvy', 'bvz', 'portador', 'posse', 'pausado', 'reservado'],
            relogio: texto('placar-tempo'),
            placar: texto('placar'),
            estados: this.estados.slice(), estadosPartida: this.estadosPartida.slice(),
            jogadores: todos.map((p, i) => ({ i: i, time: p.team, pos: p.pos, num: p.num, nome: (p.skills && p.skills.nome) ? p.skills.nome : '' })),
            quadros: quadros
        };
    },

    salvar() {
        const c = this.exportar();
        if (!c) return null;
        const nome = 'captura_' + (c.relogio || 'jogo').replace(/[^0-9a-zA-Z]+/g, '-') + '.json';
        try {
            const url = URL.createObjectURL(new Blob([JSON.stringify(c)], { type: 'application/json' }));
            const a = document.createElement('a'); a.href = url; a.download = nome; document.body.appendChild(a); a.click();
            setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 500);
        } catch (e) { /* sem DOM (testes): o chamador usa exportar() */ }
        return c;
    }
};
if (typeof window !== 'undefined') {
    window.CapturaDeJogo = CapturaDeJogo;
    window.addEventListener('keydown', (e) => { if (e.key === 'F9') { e.preventDefault(); CapturaDeJogo.salvar(); } });
}
