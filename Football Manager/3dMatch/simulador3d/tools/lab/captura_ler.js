/*
LER UMA CAPTURA (F9 no jogo -> captura_<relogio>.json): resumo e as medicoes de sempre.

Uso: node tools/lab/captura_ler.js <ficheiro.json> [indiceDoJogador]

Sem indice: o estado da partida, a posse, e por jogador a distancia andada, a velocidade maxima, o tremor (inversoes de sentido com quase nada de deslocamento) e os
estados da FSM mais usados. Com indice: a linha do tempo dele (um quadro em cada 5).
*/
const fs = require('fs');
const c = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const idx = process.argv[3] !== undefined ? Number(process.argv[3]) : null;
const T = c.cab + 22 * c.porJogador, dt = 1 / c.hz;
const q = c.quadros, n = q.length;
const jog = (f, k) => { const o = c.cab + k * c.porJogador; return { x: f[o], z: f[o + 1], rot: f[o + 2], vx: f[o + 3], vz: f[o + 4], st: c.estados[f[o + 5]], ax: f[o + 6], az: f[o + 7], bola: f[o + 8] }; };

console.log('captura de', c.relogio, '|', c.placar, '|', n, 'quadros a', c.hz, 'Hz =', (n / c.hz).toFixed(1), 's');
console.log('estados da partida:', [...new Set(q.map(f => c.estadosPartida[f[1]]))].join(', '));
if (idx === null) {
    for (let k = 0; k < 22; k++) {
        let dist = 0, vmax = 0, rev = 0, ult = null; const st = {};
        for (let i = 0; i < n; i++) {
            const j = jog(q[i], k); st[j.st] = (st[j.st] || 0) + 1;
            if (i) { const p = jog(q[i - 1], k), dx = j.x - p.x, dz = j.z - p.z, m = Math.hypot(dx, dz); dist += m; vmax = Math.max(vmax, m / dt);
                if (ult && m > 0.01 && ult.m > 0.01 && dx * ult.dx + dz * ult.dz < 0) rev++; ult = { dx, dz, m }; }
        }
        const info = c.jogadores[k];
        const top = Object.keys(st).sort((a, b) => st[b] - st[a]).slice(0, 3).map(s => s + ' ' + st[s]).join(', ');
        console.log(String(k).padStart(2), info.time, (info.pos || '').padEnd(3), String(info.num || '').padStart(2), 'andou', dist.toFixed(0).padStart(4), 'm  vmax', vmax.toFixed(1).padStart(4), ' inversoes', String(rev).padStart(3), ' |', top);
    }
} else {
    for (let i = 0; i < n; i += 5) { const j = jog(q[i], idx); console.log((i / c.hz).toFixed(2).padStart(6), j.st.padEnd(14), 'pos', j.x.toFixed(1), j.z.toFixed(1), 'v', Math.hypot(j.vx, j.vz).toFixed(1), 'alvo', j.ax.toFixed(1), j.az.toFixed(1), j.bola ? 'COM BOLA' : ''); }
}
