require('../headless/harness.js');
const vm=require('vm'),fs=require('fs');
const _t0=Date.now(); try{Object.defineProperty(global,'performance',{value:{now:()=>Date.now()-_t0},configurable:true,writable:true});}catch(e){}
const scene = new THREE.Scene();
Match.init(scene);
if (typeof Officials !== 'undefined' && Officials.init) Officials.init(scene);
if (typeof Tatics !== 'undefined' && Tatics.updateSkills) Tatics.updateSkills();
vm.runInThisContext(fs.readFileSync('js/simulate.js','utf8'),{filename:'simulate.js'});
const S = vm.runInThisContext('Sim');
const ll=console.log; console.log=()=>{}; console.table=()=>{};
const N=Number(process.argv[3]||60);
const num=v=>parseFloat(String(v).split(' ')[0].split('/')[0]);
function resumo(){
  const R=S.resultados, n=R.length, out={jogos:n};
  const m=(f)=>+(R.reduce((a,j)=>a+num(j.TeamA[f])+num(j.TeamB[f]),0)/n).toFixed(2);
  for(const f of ['golos','remates','rematesNoAlvo','cantos','faltas','passes','lancamentos','carrinhos','defesas','xg']) out[f+'_total_jogo']=m(f);
  out.amarelos=+(R.reduce((a,j)=>a+parseInt(String(j.TeamA.cartoes))+parseInt(String(j.TeamB.cartoes)),0)/n).toFixed(2);
  out.placares=R.map(j=>j.placar).join(' ');
  return out;
}
(async()=>{
  const prog=setInterval(()=>{ fs.writeFileSync(process.argv[2]+'.parcial', JSON.stringify(S.resultados.length?resumo():{jogos:0})); },30000);
  try { await S.run({jogos:N, duracaoSeg:1200, rapido:true}); } catch(e){ fs.writeFileSync(process.argv[2]+'.erro', String(e.stack)); }
  clearInterval(prog); console.log=ll;
  fs.writeFileSync(process.argv[2], JSON.stringify(resumo(),null,1));
  process.exit(0);
})();
