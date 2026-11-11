import { tx } from '../textSim/idiomas';
import React, { useMemo } from 'react';
import { useGame } from '../context/GameContext';
import { naLigaDoUtilizador } from '../types';
import { TeamShield } from './TeamShield';
import ManagerAvatar from './ManagerAvatar';
import { LOOK_PADRAO } from './ManagerCreation';
import { BoardExpectationBox, calcularExpectativa } from './BoardExpectationBox';
import { FAIXAS } from './BoardConfidenceCard';
import { faixaDeConfianca, USUARIO_ID, RegistroCarreira } from '../textSim/managerExpectations';
import { snapDeLiga, ligaPorId } from '../textSim/managerLigas';
import { NOMES_FASES, teamKey } from '../textSim/competitions';

const card = 'bg-slate-900 text-white border border-slate-700 rounded p-3';
const titulo = 'text-[10px] font-black text-white/60 uppercase tracking-widest mb-2';
const dataCurta = (iso: string) => iso.split('-').reverse().join('/');

const Barra: React.FC<{ rotulo: string; valor: number; cor: string; texto?: string }> = ({ rotulo, valor, cor, texto }) => (
  <div>
    <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-white/60"><span>{rotulo}</span><span className="text-white">{texto ?? Math.round(valor)}</span></div>
    {/* 100 retangulos em pe, um por ponto: os preenchidos na cor da barra. */}
    <div className="flex gap-px h-4 mt-1">{Array.from({ length: 100 }, (_, i) => <div key={i} className={`flex-1 min-w-0 ${i < Math.round(Math.max(0, Math.min(100, valor))) ? cor : 'bg-white/10'}`} />)}</div>
  </div>
);

const Numero: React.FC<{ rotulo: string; valor: React.ReactNode }> = ({ rotulo, valor }) => (
  <div className="bg-white/5 rounded px-2 py-1 text-center">
    <div className="text-[9px] font-black text-white/60 uppercase tracking-widest">{rotulo}</div>
    <div className="text-lg font-black leading-tight">{valor}</div>
  </div>
);

/** A aba Manager: acompanhar a carreira do treinador (perfil, expectativas da diretoria, posicoes, estatisticas, ofertas e diario). Dados de textSim/managerExpectations.ts. */
const ManagerView: React.FC = () => {
  const { managerState, recusarOferta, userTeam, teams, fixtures, comps, world, gameState } = useGame();
  const pt = gameState.language === 'PT';
  const eu = managerState?.managers[USUARIO_ID];

  const dados = useMemo(() => {
    if (!userTeam) return null;
    const times = teams.filter(t => naLigaDoUtilizador(t, userTeam));
    const snap = snapDeLiga(userTeam.leagueId, times, fixtures);
    const i = snap.tabela.findIndex(r => r.team.id === userTeam.id);
    return { times, snap, liga: ligaPorId(userTeam.leagueId), row: snap.tabela[i], pos: i + 1 };
  }, [teams, fixtures, userTeam]);

  const clubes = useMemo(() => {
    const m = new Map<string, { nome: string; ovr: number; liga: string }>();
    (world || []).forEach(l => l.teams.forEach(t => m.set(teamKey(l.leagueId, t.id), { nome: t.name, ovr: t.strength, liga: l.leagueName })));
    return m;
  }, [world]);

  if (!userTeam || !eu || !dados || !dados.row) return <div className="p-6 text-sm text-slate-400">{tx('Loading…')}</div>;

  const { snap, liga, row, pos } = dados;
  const n = snap.tabela.length;
  const faixa = FAIXAS[faixaDeConfianca(eu.confidence)];
  const exp = calcularExpectativa(pt, userTeam, dados.times, liga);
  const diff = exp.alvo - pos;
  const relativa = exp.porFases || !row.played ? null : diff > 0 ? { txt: tx('{v0} ahead of target', { v0: diff }), cor: 'text-emerald-400' } : diff === 0 ? { txt: tx('Right on target'), cor: 'text-lime-300' } : { txt: tx('{v0} behind target', { v0: -diff }), cor: 'text-rose-400' };
  /*
  AS ESTATISTICAS DA TEMPORADA SAO DE TODAS AS COMPETICOES (relato: *"o season statistics do tecnico nao esta conectado com os resultados"*): vinham so da linha da LIGA (`row`), que fica a zero enquanto o clube
  joga so o estadual e a copa (a Serie D ainda nao comecou). Agora somam-se todos os jogos oficiais ja disputados do clube na temporada (liga, estadual, copas; os amistosos ficam de fora).
  */
  const oficiais = fixtures.filter(f => f.played && !f.isFriendly && f.type !== 'FRIENDLY' && (f.homeTeamId === userTeam.id || f.awayTeamId === userTeam.id));
  const temp = { jogos: oficiais.length, v: 0, e: 0, d: 0, gf: 0, ga: 0 };
  for (const f of oficiais) {
    const casa = f.homeTeamId === userTeam.id, pro = casa ? f.homeScore : f.awayScore, contra = casa ? f.awayScore : f.homeScore;
    temp.gf += pro || 0; temp.ga += contra || 0;
    if ((pro || 0) > (contra || 0)) temp.v++; else if ((pro || 0) < (contra || 0)) temp.d++; else temp.e++;
  }
  const tPontos = 3 * temp.v + temp.e;
  const aprov = temp.jogos ? tPontos / (3 * temp.jogos) : 0;
  // Desde que assumiu: com o inicio da temporada (sem jogos nem pontos de base) vale o total de todas as competicoes; com base (assumiu a meio) fica o calculo da liga.
  const jogosM = row.played - eu.baseJogos;
  const aprovM = (eu.baseJogos === 0 && eu.basePontos === 0) ? (temp.jogos ? aprov : null) : (jogosM > 0 ? (row.points - eu.basePontos) / (3 * jogosM) : null);
  const userKey = teamKey(userTeam.leagueId, userTeam.id);
  const copas = (comps || []).filter(c => c.teamKeys.includes(userKey)).map(c => {
    const jogos = c.matches.filter(m => m.homeKey === userKey || m.awayKey === userKey).sort((a, b) => a.date.localeCompare(b.date));
    const ultimo = jogos[jogos.length - 1];
    const fase = c.champion === userKey ? (tx('Champion 🏆')) : ultimo ? (NOMES_FASES[ultimo.stage] || ultimo.stage) : '—';
    return { id: c.id, nome: c.name, fase };
  });
  const textoDoRegistro = (r: RegistroCarreira) => {
    if (r.tipo === 'CONTRATADO') return tx('Took charge of {v0}', { v0: r.clube });
    if (r.tipo === 'DEMITIDO') return tx('{v0}: the board ended the contract (last chance)', { v0: r.clube });
    if (r.tipo === 'OFERTA') return tx('Job offer from {v0}', { v0: r.clube });
    const marcas = [r.titulo ? (tx('🏆 champions')) : '', r.promovido ? (tx('promoted')) : '', r.rebaixado ? (tx('relegated')) : ''].filter(Boolean).join(' · ');
    return `${r.clube}: ${r.pos}${tx('.')} / ${r.n} · ${r.pontos} ${tx('pts')} · ${r.jogos} ${tx('games')}${marcas ? ' · ' + marcas : ''}`;
  };
  const diario = [...(managerState?.historico || [])].reverse();
  const ofertas = managerState?.ofertas || [];

  return (
    <div className="h-full flex flex-col gap-2 animate-fade-in overflow-hidden">
      <div>
        <h2 className="text-4xl font-black uppercase tracking-tight italic leading-none"><span className="text-slate-900 dark:text-white">{tx('MANAGER')}</span> <span className="text-blue-500">{tx('CAREER')}</span></h2>
        <p className="text-blue-500 dark:text-blue-400 font-bold text-[10px] uppercase tracking-widest mt-1 italic">{tx('Follow your career')}</p>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar pr-1 grid grid-cols-1 xl:grid-cols-2 gap-2 content-start">
        <div className={card + ' flex gap-4'}>
          {/* A FOTO GRANDE do treinador a esquerda, a toda a altura do cartao; o escudo, o nome e as barras ficam ao lado dela, depois da foto. */}
          <div className="relative w-[150px] shrink-0 self-stretch min-h-[170px] -my-3 -ml-2"><ManagerAvatar look={gameState.managerLook || LOOK_PADRAO} busto className="absolute inset-0 w-full h-full" /></div>
          <div className="flex-1 min-w-0 flex flex-col justify-center">
            <div className="flex items-center gap-3 mb-3">
              <TeamShield team={userTeam} className="w-[40px] h-[50px] shrink-0" />
              <div className="min-w-0">
                <div className="text-xl font-black uppercase leading-tight truncate">{gameState.managerName}</div>
                <div className="text-[10px] font-bold text-blue-300 uppercase tracking-widest truncate">{userTeam.name} · {liga?.name}</div>
              </div>
            </div>
            <div className="space-y-2">
              <Barra rotulo={tx('Board confidence')} valor={eu.confidence} cor={faixa.cor} texto={`${Math.round(eu.confidence)} · ${tx(faixa.en)}`} />
              <Barra rotulo={tx('Manager reputation')} valor={eu.reputation} cor="bg-blue-500" />
            </div>
          </div>
        </div>

        <div className={card}>
          <BoardExpectationBox exp={exp} pt={pt} />
          <div className="mt-3 flex items-center justify-between gap-2 bg-white/5 rounded px-3 py-2">
            <span className="text-[10px] font-black text-white/60 uppercase tracking-widest">{exp.porFases ? (tx('Group position')) : (tx('Position now'))}</span>
            <span className="font-black">{pos}{tx('.')} / {n}{relativa && <span className={`ml-2 text-xs ${relativa.cor}`}>{relativa.txt}</span>}</span>
          </div>
          {exp.notaTradicao && <div className="text-[10px] text-white/50 mt-1">{exp.notaTradicao}</div>}
        </div>

        <div className={card}>
          <div className={titulo}>{tx('Competition positions')}</div>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between"><span className="font-bold">{liga?.name}</span><span className="font-black">{pos}{tx('.')} / {n} · {row.points} {tx('pts')} · {row.played} {tx('games')}</span></div>
            {copas.map(c => <div key={c.id} className="flex justify-between"><span className="font-bold">{c.nome}</span><span className="font-black text-blue-300">{c.fase}</span></div>)}
            {!copas.length && <div className="text-xs text-white/40">{tx('No cups right now.')}</div>}
          </div>
        </div>

        <div className={card}>
          <div className={titulo}>{tx('Season statistics')}</div>
          <div className="grid grid-cols-4 gap-1">
            <Numero rotulo={tx('Games')} valor={temp.jogos} />
            <Numero rotulo={tx('W')} valor={temp.v} />
            <Numero rotulo={tx('D')} valor={temp.e} />
            <Numero rotulo={tx('L')} valor={temp.d} />
            <Numero rotulo={tx('Goals for')} valor={temp.gf} />
            <Numero rotulo={tx('Goals against')} valor={temp.ga} />
            <Numero rotulo={tx('Diff')} valor={temp.gf - temp.ga > 0 ? `+${temp.gf - temp.ga}` : temp.gf - temp.ga} />
            <Numero rotulo={tx('Win %')} valor={`${Math.round(aprov * 100)}%`} />
          </div>
          <div className="mt-2 text-xs text-white/60">{tx('Since taking charge')}: <span className="font-black text-white">{aprovM === null ? '—' : `${Math.round(aprovM * 100)}% ${tx('of points')} (${jogosM} ${tx('games')})`}</span></div>
        </div>

        <div className={card}>
          <div className={titulo}>{tx('Job offers')}</div>
          {ofertas.length ? <div className="space-y-1">{ofertas.map(o => {
            const c = clubes.get(o.clubKey);
            return (
              <div key={o.id} className="flex items-center justify-between gap-2 bg-white/5 rounded px-3 py-2">
                <div className="min-w-0">
                  <div className="font-black uppercase truncate">{o.clube}</div>
                  <div className="text-[10px] text-white/60 uppercase tracking-widest">{c ? `${c.liga} · ${c.ovr} OVR · ` : ''}{tx('reputation')} {o.exigencia} · {dataCurta(o.data)}</div>
                </div>
                <button onClick={() => recusarOferta(o.id)} className="shrink-0 px-3 py-1 rounded text-[10px] font-black uppercase tracking-widest bg-white/10 hover:bg-rose-600 transition-colors">{tx('Decline')}</button>
              </div>
            );
          })}</div> : <div className="text-xs text-white/40">{tx('No offers right now. Good results attract bigger clubs at the end of the league.')}</div>}
        </div>

        <div className={card}>
          <div className={titulo}>{tx('Career log')}</div>
          <div className="space-y-1 max-h-[180px] overflow-y-auto custom-scrollbar pr-1">
            {diario.length ? diario.map((r, i) => (
              <div key={i} className="flex gap-2 text-sm"><span className="text-white/40 font-mono text-xs shrink-0 pt-0.5">{dataCurta(r.data)}</span><span>{textoDoRegistro(r)}</span></div>
            )) : <div className="text-xs text-white/40">{tx('No entries yet.')}</div>}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ManagerView;
