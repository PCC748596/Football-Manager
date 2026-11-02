require('../headless/harness.js');
const scene = new THREE.Scene(); Match.init(scene);
window.cameraCore = new THREE.PerspectiveCamera(50, 16/9); window.cameraZoom = 1;
CameraBolaNaBorda.activo = process.argv[2] !== "off";
for (const modo of ['center','lateraltv','sideline','grua']) {
  window.cameraMode = modo;
  for (const [x,z] of [[0,0],[33,0],[0,50],[-33,-50]]) {
    Match.ball.position.set(x, 0.2, z);
    window.cameraCore.position.set(60, 20, 0); this_lt = Match.currentLookTarget = new THREE.Vector3(x,0,z);
    for (let i=0;i<400;i++) Match.updateCamera();
    window.cameraCore.updateMatrixWorld(true); window.cameraCore.updateProjectionMatrix();
    const v = Match.ball.position.clone().project(window.cameraCore);
    console.log(modo, [x,z].join(','), 'ndc', v.x.toFixed(2), v.y.toFixed(2));
  }
}
