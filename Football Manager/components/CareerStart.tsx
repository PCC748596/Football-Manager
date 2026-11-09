import React, { useEffect, useMemo, useState } from 'react';
import { COUNTRIES, generateLeagueData } from '../textSim/dataGenerator';
import { Team, Player, League } from '../types';
import ManagerAvatar from './ManagerAvatar';
import type { ManagerLook } from './ManagerAvatar';
import { TeamShield } from './TeamShield';
import { ClubOverviewContent } from './ClubOverviewContent';
import { DIFICULDADES, escolherDificuldade, type Dificuldade } from '../textSim/orcamento';

// Depois do Manage Profile: escolher o clube a mao ou deixar o sistema propor 5 clubes de dificuldades diferentes.

type Alvo = 'TOP' | 'MEDIO' | 'PIOR' | 'TOP3' | 'PIOR3' | 'PIOR6';   // TOP3/PIOR3/PIOR6: um clube SORTEADO entre os 3 melhores / 3 piores / 6 piores da liga
interface Nivel { rotulo: string; cor: string; liga: number; alvo: Alvo; }   // `liga`: posicao na lista de ligas visiveis do pais (0 = Serie A)

// Padrao: A-top, A-medio, A-pior, B-medio, B-pior.
const NIVEIS_PADRAO: Nivel[] = [
  { rotulo: 'Very easy', cor: 'text-emerald-400', liga: 0, alvo: 'TOP' },
  { rotulo: 'Easy', cor: 'text-lime-400', liga: 0, alvo: 'MEDIO' },
  { rotulo: 'Medium', cor: 'text-amber-400', liga: 0, alvo: 'PIOR' },
  { rotulo: 'Hard', cor: 'text-orange-400', liga: 1, alvo: 'MEDIO' },
  { rotulo: 'Very hard', cor: 'text-rose-400', liga: 1, alvo: 'PIOR' }
];
// Brasil (id 45): 1 dos 3 melhores da A, 1 dos 3 piores da A, 1 dos 3 melhores da B, 1 dos 3 melhores da C e 1 dos 6 piores da D.
const NIVEIS_BRASIL: Nivel[] = [
  { ...NIVEIS_PADRAO[0], liga: 0, alvo: 'TOP3' },
  { ...NIVEIS_PADRAO[1], liga: 0, alvo: 'PIOR3' },
  { ...NIVEIS_PADRAO[2], liga: 1, alvo: 'TOP3' },
  { ...NIVEIS_PADRAO[3], liga: 2, alvo: 'TOP3' },
  { ...NIVEIS_PADRAO[4], liga: 3, alvo: 'PIOR6' }
];

interface Oferta { nivel: Nivel; team: Team; elenco: Player[]; leagueId: string; leagueName: string; ligaTimes: Team[]; liga: League; }

const escolher = (times: Team[], alvo: Alvo): Team => {
  const o = [...times].sort((a, b) => b.strength - a.strength || a.name.localeCompare(b.name));
  // Sorteio entre os N melhores (TOP3) ou os N piores (PIOR3 / PIOR6); com menos clubes que N sorteia entre os que ha.
  const sorteia = (grupo: Team[]) => grupo[Math.floor(Math.random() * grupo.length)];
  if (alvo === 'TOP3') return sorteia(o.slice(0, 3));
  if (alvo === 'PIOR3') return sorteia(o.slice(-3));
  if (alvo === 'PIOR6') return sorteia(o.slice(-6));
  return alvo === 'TOP' ? o[0] : alvo === 'PIOR' ? o[o.length - 1] : o[Math.floor((o.length - 1) / 2)];
};

export const ModeSelection: React.FC<{ managerName: string; onPickClub: () => void; onCareer: () => void; onBack: () => void }> = ({ managerName, onPickClub, onCareer, onBack }) => {
  const [dif, setDif] = useState<Dificuldade | null>(null);   // so depois de escolher a dificuldade financeira as opcoes de baixo ficam ativas
  useEffect(() => { escolherDificuldade(null); }, []);   // ao voltar a esta tela, a escolha anterior nao vale
  const escolherDif = (d: Dificuldade) => { setDif(d); escolherDificuldade(d); };
  const cartao = `flex-1 max-w-sm p-8 rounded border-2 text-left transition-all bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 ${dif ? 'hover:border-blue-500 hover:scale-[1.02]' : 'opacity-40 cursor-not-allowed'}`;
  return (
    <div className="w-full h-full flex flex-col items-center justify-center gap-8 p-8 bg-white dark:bg-manager-bg transition-colors duration-300">
      <div className="text-center">
        <h1 className="text-3xl font-black uppercase tracking-tight text-slate-900 dark:text-white">How do you want to start?</h1>
        <p className="text-xs text-blue-600 dark:text-blue-400 font-bold uppercase tracking-widest mt-1">Manager: {managerName}</p>
      </div>
      <div className="w-full max-w-3xl">
        <div className="text-center text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-3">Financial difficulty · starting budget = payroll ×</div>
        <div className="grid grid-cols-5 gap-3">
          {DIFICULDADES.map(d => (
            <button key={d.id} onClick={() => escolherDif(d.id)} className={`min-h-[64px] rounded border-2 px-2 py-3 text-center transition-all bg-slate-50 dark:bg-slate-800 ${dif === d.id ? 'border-blue-500 bg-blue-500/10' : 'border-slate-200 dark:border-slate-700 hover:border-blue-500'}`}>
              <div className={`font-black uppercase text-sm ${d.cor}`}>{d.rotulo}</div>
              <div className="text-xs font-bold text-slate-500 dark:text-slate-400 mt-0.5">{d.fator}× payroll</div>
            </button>
          ))}
        </div>
      </div>
      <div className="flex gap-6 w-full max-w-3xl">
        <button onClick={onPickClub} disabled={!dif} className={cartao}>
          <div className="text-2xl font-black uppercase text-slate-800 dark:text-white mb-2">Choose your club</div>
          <div className="text-sm text-slate-500 dark:text-slate-400">Pick any club from any league.</div>
        </button>
        <button onClick={onCareer} disabled={!dif} className={cartao}>
          <div className="text-2xl font-black uppercase text-slate-800 dark:text-white mb-2">Manager career</div>
          <div className="text-sm text-slate-500 dark:text-slate-400">Choose a country and take one of 5 offers, from a top club to a real challenge.</div>
        </button>
      </div>
      <button onClick={onBack} className="text-slate-500 hover:text-blue-500 font-bold uppercase text-sm">‹ Back</button>
    </div>
  );
};

export const CareerOffers: React.FC<{ managerName: string; managerLook?: ManagerLook; onSelectTeam: (teamId: string, countryId: string, leagueId: string) => void; onBack: () => void }> = ({ managerName, managerLook, onSelectTeam, onBack }) => {
  const [countryId, setCountryId] = useState('45');
  const paises = useMemo(() => COUNTRIES.filter(c => c.leagues.some(l => !l.hidden)).sort((a, b) => a.name.localeCompare(b.name)), []);

  const ofertas = useMemo<Oferta[]>(() => {
    const pais = COUNTRIES.find(c => c.id === countryId);
    const ligas = (pais?.leagues || []).filter(l => !l.hidden).sort((a, b) => a.tier - b.tier);
    if (!ligas.length) return [];
    const cache = new Map<string, { teams: Team[]; players: Player[] }>();
    const dadosDe = (id: string) => { if (!cache.has(id)) cache.set(id, generateLeagueData(countryId, id)); return cache.get(id)!; };
    const niveis = countryId === '45' ? NIVEIS_BRASIL : NIVEIS_PADRAO;
    const usados = new Set<string>();
    const out: Oferta[] = [];
    for (const nivel of niveis) {
      const liga = ligas[Math.min(nivel.liga, ligas.length - 1)];   // pais com menos divisoes: usa a ultima
      const dados = dadosDe(liga.id);
      const times = dados.teams.filter(t => !usados.has(t.id));
      if (!times.length) continue;
      const team = escolher(times, nivel.alvo);
      usados.add(team.id);
      out.push({ nivel, team, elenco: dados.players.filter(p => p.teamId === team.id).sort((a, b) => b.skill - a.skill), leagueId: liga.id, leagueName: liga.name, ligaTimes: dados.teams, liga });
    }
    return out;
  }, [countryId]);
  const [selId, setSelId] = useState('');
  const sel = ofertas.find(o => o.team.id === selId) || ofertas[0];

  return (
    <div className="w-full h-full flex flex-col p-8 bg-white dark:bg-manager-bg transition-colors duration-300">
      <div className="flex items-center gap-6 mb-6 bg-slate-50 dark:bg-slate-800/50 p-6 rounded border border-slate-200 dark:border-slate-700">
        <button onClick={onBack} className="text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-white font-bold uppercase text-sm">‹ Back</button>
        <div className="h-8 w-[1px] bg-slate-200 dark:bg-slate-700"></div>
        {managerLook && <div className="relative w-[84px] h-[96px] shrink-0 -my-3"><ManagerAvatar look={managerLook} busto className="absolute inset-0 w-full h-full" /></div>}
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight uppercase">Manager career</h1>
          <p className="text-xs text-blue-600 dark:text-blue-400 font-bold uppercase tracking-widest">Manager: {managerName}</p>
        </div>
      </div>
      <div className="flex-1 flex gap-6 min-h-0">
        <div className="w-[220px] flex flex-col gap-2 min-h-0">
          <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Country</div>
          <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-2">
            {paises.map(c => (
              <button key={c.id} onClick={() => { setCountryId(c.id); setSelId(''); }} className={`w-full text-left p-3 rounded border-2 font-black uppercase transition-all ${countryId === c.id ? 'bg-blue-600 border-blue-400 text-white' : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-blue-400'}`}>{c.name}</button>
            ))}
          </div>
        </div>
        <div className="flex-1 min-w-0 grid grid-cols-1 xl:grid-cols-5 gap-2 xl:gap-3 min-h-0 content-start overflow-y-auto custom-scrollbar">
          {ofertas.map(o => (
            <button key={o.team.id} onClick={() => setSelId(o.team.id)} className={`flex flex-row xl:flex-col items-center text-left xl:text-center gap-4 xl:gap-3 p-2 xl:p-4 rounded border-2 transition-all hover:border-blue-500 ${sel?.team.id === o.team.id ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-500' : 'bg-slate-50 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800'}`}>
              <div className={`w-24 xl:w-auto shrink-0 text-[11px] font-black uppercase tracking-widest ${o.nivel.cor}`}>{o.nivel.rotulo}</div>
              <TeamShield team={o.team} className="shrink-0 w-[40px] h-[50px] xl:w-[70px] xl:h-[88px]" />
              <div className="flex-1 min-w-0 text-base font-black uppercase text-slate-800 dark:text-white leading-tight">{o.team.name}</div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 text-right xl:text-center shrink-0">{o.leagueName}<br />{o.team.strength} OVR</div>
            </button>
          ))}
          {!ofertas.length && <div className="col-span-full text-xs text-slate-400 font-bold uppercase tracking-widest p-4">No offers for this country.</div>}
        </div>
        <div className="w-[32%] xl:w-[24%] min-w-[270px] flex flex-col gap-2 min-h-0">
          <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Club Overview</div>
          {sel ? (() => {
            const c = sel.team, c1 = c.homeKit?.color1 || '#1e293b', c2 = c.homeKit?.color2 || c1;
            return (
              <div className="flex-1 relative overflow-hidden rounded border-2 border-slate-200 dark:border-slate-800 min-h-0" style={{ background: `linear-gradient(165deg, ${c1} 0%, ${c1} 18%, ${c2} 62%, #020617 100%)` }}>
                <div className="absolute inset-0 flex flex-col gap-2 p-1.5 min-h-0">
                  <ClubOverviewContent team={c} leagueName={sel.leagueName} leagueTeams={sel.ligaTimes} league={sel.liga} elenco={sel.elenco} />
                  <button onClick={() => onSelectTeam(c.id, countryId, sel.leagueId)} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black py-4 rounded-sm transition-all shadow-lg text-xl uppercase tracking-widest">Take job</button>
                </div>
              </div>
            );
          })() : <div className="flex-1 flex items-center justify-center text-xs text-slate-400 font-bold uppercase tracking-widest border-2 border-dashed border-slate-200 dark:border-slate-800 rounded">No club</div>}
        </div>
      </div>
    </div>
  );
};
