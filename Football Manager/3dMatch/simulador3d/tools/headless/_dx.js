require('./harness.js');
if (typeof Sim === 'undefined') global.Sim = {};
Sim.running = true;
Match.init(new THREE.Scene());
const r={}; let shown=0;
for (let i=0;i<60*1500;i++){ Match.update(1/60);
 if(i%30) continue;
 const bc=Match.ballCarrier; if(!bc) continue;
 for (const p of Match.players.concat(Match.opponents)){
  if(p.team===bc.team||(p.pos!=='LB'&&p.pos!=='RB')) continue;
  const adv=p.model.position.z*p.dirZ, bAdv=bc.model.position.z*p.dirZ;
  if(adv>bAdv+12){ const k=p.fsm.currentState+' style='+p.playingStyle+' troca='+JSON.stringify(TeamAI.get(p.team)._trocaAla)+' phaseAtk='+TeamAI.get(p.team).isAttacking; r[k]=(r[k]||0)+1; }
 }}
console.log(r);process.exit(0);
