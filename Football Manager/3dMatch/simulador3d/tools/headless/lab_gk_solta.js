/* Bola solta e lenta a passar ao lado do goleiro: como ele desliza? Uso: node tools/headless/lab_gk_solta.js [com_adversario 0|1] [semente] */
const adv = process.argv[2] === '1', semente = Number(process.argv[3] || 0), lado = Number(process.argv[4] || 1), equipaGk = process.argv[5] || 'B';
const mulberry32 = (a) => () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
Math.random = mulberry32(1000 + semente * 977);
require('./harness.js');
const dt = 1 / 60;
const scene = new THREE.Scene(); Match.init(scene);
if (typeof Officials !== 'undefined' && Officials.init) Officials.init(scene);
if (typeof Sim === 'undefined') global.Sim = {}; Sim.running = true;
for (let i = 0; i < 120; i++) Match.update(dt);
const gk = (equipaGk === 'B' ? Match.opponents : Match.players).find(p => p.role === 'gk');
const atk = (equipaGk === 'B' ? Match.players : Match.opponents).find(p => p.role === 'atk');
const fundoZ = atk.dirZ * (CAMPO_COMP / 2);
Match.mudarEstado('PLAY', 'lab'); Match.kickoffActive = false; Match.kickoffTimer = 0; Match.possessionTeam = atk.team;
Match.ballCarrier = null; Match.lastTouchedTeam = atk.team; Match.lastTouchedPlayer = atk;
const bx = 3.5 * lado, bz = fundoZ - atk.dirZ * 4;
Match.ball.position.set(bx, 0.11, bz); Match.ballVel.set(-1.5 * lado, 0, 0);
for (const p of Match.players.concat(Match.opponents)) { if (p === gk || p.role === 'gk') continue; p.model.position.set(adv && p === atk ? bx + 1.5 : 30, ALTURA_BASE_Y, adv && p === atk ? bz - atk.dirZ * 1.5 : -30); p.dynamicTarget = p.model.position.clone(); p.baseTarget.copy(p.model.position); p.velocity.set(0, 0, 0); }
gk.gkEstado = 'mergulho'; gk.dive = null; gk.gkDirMergulho = Math.sign(Match.ball.position.x - gk.model.position.x) || 1; gk.gkAlvoX = Match.ball.position.x + Match.ballVel.x * 0.8; gk.gkAlvoY = 0.15; gk.gkTipoMergulho = 'baixo';
let ult = '', fim = false, minMao = 99; const _w = new THREE.Vector3();
for (let i = 0; i < 4 * 60; i++) {
    Match.update(dt);
    if (!fim && gk.hasBall) { fim = true; console.log('t=' + ((i + 1) * dt).toFixed(2), 'GOLEIRO AGARROU a bola, estado', gk.gkEstado, 'bola=(' + Match.ball.position.x.toFixed(1) + ',' + Match.ball.position.z.toFixed(1) + ')'); }
    for (const n of ['lHand', 'rHand']) { gk.rig[n].getWorldPosition(_w); minMao = Math.min(minMao, _w.distanceTo(Match.ball.position)); }
    const d = gk.dive;
    const l = gk.gkEstado + (d ? '/' + d.fase + ' pesPrimeiro=' + !!d.pesPrimeiro + ' bolaSolta=' + d.bolaSolta + ' deslizeLado=' + d.deslizeLado + ' ang=' + d.ang.toFixed(2) : '');
    if (d && d.fase === 'chao' && i % 6 === 0 && !global.__m) { global.__m = 1; gk.model.updateMatrixWorld(true); const v = new THREE.Vector3(), w = new THREE.Vector3(); const bel = new THREE.Vector3(0, 0, 1).transformDirection(gk.model.matrixWorld); gk.rig.neck.getWorldPosition(v); gk.rig.pelvis.getWorldPosition(w); const cab = v.clone().sub(w).normalize(); const pe = new THREE.Vector3(); gk.rig.lFoot.getWorldPosition(pe); const aBola = Match.ball.position.clone().sub(w); aBola.y = 0; aBola.normalize(); console.log('  dirX=' + d.dirX + ' ladoLocal=' + d.ladoLocal + ' pesPrimeiro=' + !!d.pesPrimeiro + ' modelo.x->mundo=' + new THREE.Vector3(1,0,0).applyQuaternion(d.qFacing).x.toFixed(1) + ' |'); console.log('  barriga=(' + bel.x.toFixed(2) + ',' + bel.y.toFixed(2) + ',' + bel.z.toFixed(2) + ') cabeca=(' + cab.x.toFixed(2) + ',' + cab.y.toFixed(2) + ',' + cab.z.toFixed(2) + ') dirBola=(' + aBola.x.toFixed(2) + ',' + aBola.z.toFixed(2) + ') gk.x=' + gk.model.position.x.toFixed(1) + ' bola.x=' + Match.ball.position.x.toFixed(1)); }
    if (l.split(' ang')[0] !== ult) { ult = l.split(' ang')[0]; console.log('t=' + ((i + 1) * dt).toFixed(2), l); }
}

console.log('menor distancia mao-bola:', minMao.toFixed(2), 'm | bola final=(' + Match.ball.position.x.toFixed(1) + ',' + Match.ball.position.z.toFixed(1) + ') gk=(' + gk.model.position.x.toFixed(1) + ',' + gk.model.position.z.toFixed(1) + ') hasBall=' + gk.hasBall);
