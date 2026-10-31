// Passe pelo ar com curva: onde a bola toca o chao em relacao ao alvo, e a flecha maxima.
require('../headless/harness.js');
if (typeof Sim === 'undefined') global.Sim = {};
Sim.running = true;
Match.init(new THREE.Scene());
const r = BallPhysics.raio;
for (const dist of [15, 25, 40]) for (const graus of [8, 14, 20]) {
    const elev = 30 * Math.PI / 180;
    const v = velocidadeParaAlcance(dist, elev);
    Match.ballCarrier = null; Match.freeKickCurve = null; Match.freeKickDip = null;
    Match.ball.position.set(0, r, 0);
    Match.ballVel.set(0, v * Math.sin(elev), v * Math.cos(elev));
    const vh = v * Math.cos(elev);
    const cv = curvaDoPasse(dist, v, elev, 0, 1, graus, 0, 1, 3);
    Match.ballVel.x += cv.vLatX; Match.ballVel.z += cv.vLatZ;
    Match.freeKickCurve = { active: true, ax: cv.ax, az: cv.az, rasteira: false, tMax: cv.tVoo, n: cv.n, T: cv.tVoo };
    let maxLat = 0, zMax = 0, noChao = null, caiu = false;
    Match.ball.position.y = r + 0.01;
    for (let i = 0; i < 600; i++) {
        Match.delta = 1 / 60; Match.updateBall();
        const x = Match.ball.position.x, z = Match.ball.position.z;
        if (Math.abs(x) > Math.abs(maxLat)) { maxLat = x; zMax = z; }
        if (i > 3 && Match.ball.position.y <= r + 0.001) { noChao = { x, z }; break; }
    }
    console.log(`dist ${dist} m, giro ${graus}deg: flecha max ${maxLat.toFixed(2)} m a z=${zMax.toFixed(1)} | toca o chao em x=${noChao ? noChao.x.toFixed(2) : '?'} z=${noChao ? noChao.z.toFixed(1) : '?'} (alvo z=${dist}, x=0)`);
}
