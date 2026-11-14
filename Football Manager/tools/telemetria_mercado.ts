/*
TELEMETRIA DO MERCADO DE TRANSFERENCIAS — o "retrato" do mercado da CPU, para medir antes e depois de cada mudanca (passo zero da auditoria).

Gera a liga como o jogo faz no arranque (generateLeagueData), poe o mercado a correr dia a dia (tickDoDia) durante `dias` dias com TODOS os clubes na CPU (o dono
e um id que nao existe), recalcula os valores uma vez por mes, e no fim mostra:
  . volume: negociacoes abertas pela CPU, concluidas (transferencias, agentes livres, pre-contratos, emprestimos), por janela
  . mortalidade: como acabaram as negociacoes e porque (motivos)
  . inflacao: preco pago / valor de mercado do jogador no dia
  . realismo do alvo: OVR do contratado contra o OVR medio dos 11 melhores do comprador
  . saude dos elencos: tamanho (min/med/max), quantos acima de 34 ou abaixo de 20, quantos listados e ha quanto tempo, dispensas

Uso: npx tsx tools/telemetria_mercado.ts [paisId=45] [ligaId=bra_serie_a] [dias=365] [inicio=2026-04-01]
*/
import { generateLeagueData } from '../textSim/dataGenerator';
import { tickDoDia, mercadoVazio, prepararOrcamentos, recalcularValoresDoMes, ESTADOS_ATIVOS, janelaAberta, jovemPromessa, CONFIG_MERCADO, type Universo } from '../textSim/transferencias';
// GARIMPO=0 desliga a trilha de garimpo sub-21 (para comparar).
if (process.env.GARIMPO === '0') CONFIG_MERCADO.ia.garimpo.activo = false;
import { recalcularValores, valorDeMercado } from '../textSim/valuation';
import { registrarLigas } from '../textSim/economia';

const [paisId = '45', ligaId = 'bra_serie_a', diasStr = '365', inicio = '2026-04-01'] = process.argv.slice(2);
const DIAS = Number(diasStr);
const somarDias = (iso: string, n: number) => { const d = new Date(iso + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };

const { teams: t0, players: p0 } = generateLeagueData(paisId, ligaId) as any;
const teams = prepararOrcamentos(t0);
registrarLigas(teams);
let u: Universo = { players: p0, base: null, teams, mercado: mercadoVazio(inicio) };
const DONO = '__ninguem__';

const top11 = (teamId: string) => {
  const s = u.players.filter(p => p.teamId === teamId).map(p => p.skill).sort((a, b) => b - a).slice(0, 11);
  return s.length ? s.reduce((a, b) => a + b, 0) / s.length : 0;
};
const elencos = () => u.teams.map(t => u.players.filter(p => p.teamId === t.id).length);

const negVistas = new Map<string, any>();
const compras: { valor: number; mercado: number; ovr: number; ovrComprador: number; janela: string; idade: number; promessa: boolean }[] = [];
const outros = { AGENTE_LIVRE: 0, DISPENSA: 0, EMPRESTIMO: 0, preContrato: 0 };
let histVisto = 0;
const tam0 = elencos();
const listados0 = u.players.filter(p => p.listedForSale).length;
let maxListados = listados0, maxEmp = 0;
const motivosLista: Record<string, number> = {};

let hoje = inicio;
for (let d = 0; d < DIAS; d++, hoje = somarDias(inicio, d)) {
  u = recalcularValoresDoMes(u, hoje, recalcularValores);
  const antes = new Map(u.players.map(p => [p.id, p]));
  const ovrAntes = new Map(u.teams.map(t => [t.id, top11(t.id)]));
  const r = tickDoDia(u, { donoId: DONO, hoje });
  u = r.u;
  for (const n of u.mercado.negociacoes) negVistas.set(n.id, n);
  const hist = u.mercado.historico;
  for (let i = histVisto; i < hist.length; i++) {
    const m = hist[i];
    if (m.tipo === 'TRANSFERENCIA') {
      const p = antes.get(m.jogadorId);
      const vm = p ? valorDeMercado(p, hoje) : m.valor;
      compras.push({ valor: m.valor, mercado: vm, ovr: p ? p.skill : 0, ovrComprador: ovrAntes.get(m.para) || 0, janela: hoje.slice(5, 7) <= '04' ? 'inicio-ano' : 'meio-ano', idade: p ? p.age : 0, promessa: !!(p && jovemPromessa(p)) });
    } else if (m.tipo === 'AGENTE_LIVRE') { if (m.de !== 'MARKET') outros.preContrato++; else outros.AGENTE_LIVRE++; }
    else if (m.tipo === 'DISPENSA') outros.DISPENSA++;
    else if (m.tipo === 'EMPRESTIMO') outros.EMPRESTIMO++;
  }
  histVisto = hist.length;
  maxListados = Math.max(maxListados, u.players.filter(p => p.listedForSale).length);
  maxEmp = Math.max(maxEmp, u.players.filter(p => p.listedForLoan).length);
}

// ------------------------------------------------------------------ relatorio
const negs = [...negVistas.values()];
const porEstado: Record<string, number> = {}, porMotivo: Record<string, number> = {};
let rodadasConcluidas = 0, nConc = 0;
for (const n of negs) {
  porEstado[n.estado] = (porEstado[n.estado] || 0) + 1;
  if (n.estado !== 'CONCLUIDA' && !ESTADOS_ATIVOS.includes(n.estado)) porMotivo[n.motivo || '(sem motivo)'] = (porMotivo[n.motivo || '(sem motivo)'] || 0) + 1;
  if (n.estado === 'CONCLUIDA') { nConc++; rodadasConcluidas += n.historico.length; }
}
const pct = (a: number, b: number) => (b ? (100 * a / b).toFixed(1) + '%' : '-');
const media = (v: number[]) => (v.length ? v.reduce((a, b) => a + b, 0) / v.length : 0);
const tam = elencos();
const listados = u.players.filter(p => p.listedForSale);
const ratios = compras.filter(c => c.mercado > 0).map(c => c.valor / c.mercado);

console.log(`MERCADO — ${ligaId} (${u.teams.length} clubes, ${p0.length} jogadores), ${DIAS} dias desde ${inicio}`);
console.log(`\nVOLUME`);
console.log(`  negociacoes abertas pela CPU: ${negs.length} (${(negs.length / u.teams.length).toFixed(1)} por clube)`);
console.log(`  transferencias concluidas: ${compras.length} (${compras.filter(c => c.janela === 'inicio-ano').length} na janela de inicio de ano, ${compras.filter(c => c.janela === 'meio-ano').length} na de meio de ano)`);
// A trilha de garimpo (ia.garimpo): os jovens comprados e quanto abaixo dos titulares de quem os comprou.
{
  const sub21 = compras.filter(c => c.idade <= 21), prom = compras.filter(c => c.promessa);
  console.log(`  sub-21 comprados: ${sub21.length} (${pct(sub21.length, compras.length)}), prometidos: ${prom.length}; OVR deles - media dos 11 de quem comprou: ${sub21.length ? (media(sub21.map(c => c.ovr - c.ovrComprador))).toFixed(1) : '-'}; pago / valor de mercado: ${prom.length ? media(prom.filter(c => c.mercado > 0).map(c => c.valor / c.mercado)).toFixed(2) : '-'}`);
}
console.log(`  agentes livres: ${outros.AGENTE_LIVRE}, pre-contratos: ${outros.preContrato}, emprestimos: ${outros.EMPRESTIMO}, dispensas: ${outros.DISPENSA}`);
console.log(`\nMORTALIDADE (como acabaram as ${negs.length} negociacoes)`);
Object.entries(porEstado).sort((a, b) => b[1] - a[1]).forEach(([k, v]) => console.log(`  ${k.padEnd(16)} ${String(v).padStart(5)}  ${pct(v, negs.length)}`));
console.log(`  motivos de quem nao fechou:`);
Object.entries(porMotivo).sort((a, b) => b[1] - a[1]).slice(0, 12).forEach(([k, v]) => console.log(`    ${k.padEnd(48)} ${String(v).padStart(5)}`));
console.log(`  propostas por negociacao concluida: ${(rodadasConcluidas / Math.max(1, nConc)).toFixed(2)}`);
console.log(`\nINFLACAO (preco pago / valor de mercado no dia)`);
if (ratios.length) {
  const ord = [...ratios].sort((a, b) => a - b);
  console.log(`  media ${media(ratios).toFixed(2)}x, mediana ${ord[Math.floor(ord.length / 2)].toFixed(2)}x, min ${ord[0].toFixed(2)}x, max ${ord[ord.length - 1].toFixed(2)}x; acima de 1.25x: ${pct(ratios.filter(r => r > 1.25).length, ratios.length)}`);
} else console.log('  (nenhuma transferencia)');
console.log(`\nREALISMO DO ALVO (OVR do contratado - OVR medio dos 11 melhores do comprador)`);
if (compras.length) {
  const dif = compras.map(c => c.ovr - c.ovrComprador);
  console.log(`  media ${media(dif).toFixed(1)}; acima de +5: ${pct(dif.filter(x => x > 5).length, dif.length)}; abaixo de -8: ${pct(dif.filter(x => x < -8).length, dif.length)}`);
}
console.log(`\nSAUDE DOS ELENCOS`);
console.log(`  tamanho no inicio: min ${Math.min(...tam0)}, media ${media(tam0).toFixed(1)}, max ${Math.max(...tam0)}`);
console.log(`  tamanho no fim:    min ${Math.min(...tam)}, media ${media(tam).toFixed(1)}, max ${Math.max(...tam)}; acima de 34: ${tam.filter(x => x > 34).length}, abaixo de 20: ${tam.filter(x => x < 20).length}`);
console.log(`  listados para venda: no inicio ${listados0}, no fim ${listados.length} (maximo ${maxListados}); agentes livres no mercado: ${u.players.filter(p => p.teamId === 'MARKET').length}`);
console.log(`  listados para emprestimo: no fim ${u.players.filter(p => p.listedForLoan).length} (maximo ${maxEmp})`);
const idades = listados.map(p => p.age);
if (idades.length) console.log(`  idade dos listados para venda no fim: media ${media(idades).toFixed(1)}, 32+: ${idades.filter(a => a >= 32).length}`);
console.log(`  janela aberta no inicio? ${janelaAberta(inicio)}`);
