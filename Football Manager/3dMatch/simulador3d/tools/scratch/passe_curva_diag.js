// Mede a curva do passe rasteiro com a fisica real: desvio lateral maximo (e onde) e o desvio na chegada ao ponto-alvo.
require('../headless/harness.js');
if (typeof Sim === 'undefined') global.Sim = {};
Sim.running = true;
Match.init(new THREE.Scene());
const r = BallPhysics.raio;
for (const dist of [8, 15, 25, 35]) {
    for (const graus of [3, 5, 8]) {
        const v = require('./_v.js')(dist);
        Match.ballCarrier = null; Match.freeKickCurve = null; Match.freeKickDip = null;
        Match.ball.position.set(0, r, 0); Match.ballVel.set(0, 0, v);
        const cv = curvaDoPasse(dist, v, 0, 0, 1, graus, 0, 1, 3);
        Match.ballVel.x += cv.vLatX; Match.ballVel.z += cv.vLatZ;
        Match.freeKickCurve = { active: true, ax: cv.ax, az: cv.az, rasteira: true, tMax: cv.tVoo, n: cv.n, T: cv.tVoo };
        let maxLat = 0, zMax = 0, latChegada = null, t = 0;
        for (let i = 0; i < 1200; i++) {
            Match.delta = 1 / 60; Match.updateBall(); t += 1 / 60;
            const x = Match.ball.position.x, z = Match.ball.position.z;
            if (Math.abs(x) > Math.abs(maxLat)) { maxLat = x; zMax = z; }
            if (latChegada === null && z >= dist) latChegada = x;
            if (Math.hypot(Match.ballVel.x, Match.ballVel.z) < 0.3) break;
        }
        console.log(`dist ${dist} m, giro ${graus}deg: flecha max ${maxLat.toFixed(2)} m a z=${zMax.toFixed(1)} | em z=${dist}: lateral ${latChegada === null ? 'nao chega (para a ' + Match.ball.position.z.toFixed(1) + ' m, x=' + Match.ball.position.x.toFixed(2) + ')' : latChegada.toFixed(2) + ' m'}`);
    }
}
