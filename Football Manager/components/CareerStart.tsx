import React, { useMemo, useState } from 'react';
import { COUNTRIES, generateLeagueData } from '../textSim/dataGenerator';
import { Team, Player } from '../types';
import { TeamShield } from './TeamShield';
import { TeamKit } from './TeamKit';
import { PlayerFace } from './PlayerFace';

// Depois do Manage Profile: escolher o clube a mao ou deixar o sistema propor 5 clubes de dificuldades diferentes.

type Alvo = 'TOP' | 'MEDIO' | 'PIOR';
interface Nivel { rotulo: string; cor: string; liga: number; alvo: Alvo; }   // `liga`: posicao na lista de ligas visiveis do pais (0 = Serie A)

// Padrao: A-top, A-medio, A-pior, B-medio, B-pior.
const NIVEIS_PADRAO: Nivel[] = [
  { rotulo: 'Very easy', cor: 'text-emerald-400', liga: 0, alvo: 'TOP' },
  { rotulo: 'Easy', cor: 'text-lime-400', liga: 0, alvo: 'MEDIO' },
  { rotulo: 'Medium', cor: 'text-amber-400', liga: 0, alvo: 'PIOR' },
  { rotulo: 'Hard', cor: 'text-orange-400', liga: 1, alvo: 'MEDIO' },
  { rotulo: 'Very hard', cor: 'text-rose-400', liga: 1, alvo: 'PIOR' }
];
// Brasil (id 45): A-top, A-medio, B-pior, C-medio, D-pior.
const NIVEIS_BRASIL: Nivel[] = [
  NIVEIS_PADRAO[0], NIVEIS_PADRAO[1],
  { ...NIVEIS_PADRAO[2], liga: 1 },
  { ...NIVEIS_PADRAO[3], liga: 2 },
  { ...NIVEIS_PADRAO[4], liga: 3 }
];

interface Oferta { nivel: Nivel; team: Team; elenco: Player[]; leagueId: string; leagueName: string; }

const escolher = (times: Team[], alvo: Alvo): Team => {
  const o = [...times].sort((a, b) => b.strength - a.strength || a.name.localeCompare(b.name));
  return alvo === 'TOP' ? o[0] : alvo === 'PIOR' ? o[o.length - 1] : o[Math.floor((o.length - 1) / 2)];
};

export const ModeSelection: React.FC<{ managerName: string; onPickClub: () => void; onCareer: () => void; onBack: () => void }> = ({ managerName, onPickClub, onCareer, onBack }) => {
  const cartao = 'flex-1 max-w-sm p-8 rounded border-2 text-left transition-all bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-blue-500 hover:scale-[1.02]';
  return (
    <div className="w-full h-full flex flex-col items-center justify-center gap-8 p-8 bg-white dark:bg-manager-bg transition-colors duration-300">
      <div className="text-center">
        <h1 className="text-3xl font-black uppercase tracking-tight text-slate-900 dark:text-white">How do you want to start?</h1>
        <p className="text-xs text-blue-600 dark:text-blue-400 font-bold uppercase tracking-widest mt-1">Manager: {managerName}</p>
      </div>
      <div className="flex gap-6 w-full max-w-3xl">
        <button onClick={onPickClub} className={cartao}>
          <div className="text-2xl font-black uppercase text-slate-800 dark:text-white mb-2">Choose your club</div>
          <div className="text-sm text-slate-500 dark:text-slate-400">Pick any club from any league.</div>
        </button>
        <button onClick={onCareer} className={cartao}>
          <div className="text-2xl font-black uppercase text-slate-800 dark:text-white mb-2">Manager career</div>
          <div className="text-sm text-slate-500 dark:text-slate-400">Choose a country and take one of 5 offers, from a top club to a real challenge.</div>
        </button>
      </div>
      <button onClick={onBack} className="text-slate-500 hover:text-blue-500 font-bold uppercase text-sm">‹ Back</button>
    </div>
  );
};

export const CareerOffers: React.FC<{ managerName: string; onSelectTeam: (teamId: string, countryId: string, leagueId: string) => void; onBack: () => void }> = ({ managerName, onSelectTeam, onBack }) => {
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
      out.push({ nivel, team, elenco: dados.players.filter(p => p.teamId === team.id).sort((a, b) => b.skill - a.skill), leagueId: liga.id, leagueName: liga.name });
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
        <div className="flex-1 grid grid-cols-5 gap-3 min-h-0 content-start overflow-y-auto custom-scrollbar">
          {ofertas.map(o => (
            <button key={o.team.id} onClick={() => setSelId(o.team.id)} className={`flex flex-col items-center text-center gap-3 p-4 rounded border-2 transition-all hover:border-blue-500 ${sel?.team.id === o.team.id ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-500' : 'bg-slate-50 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800'}`}>
              <div className={`text-[11px] font-black uppercase tracking-widest ${o.nivel.cor}`}>{o.nivel.rotulo}</div>
              <TeamShield team={o.team} className="w-[70px] h-[88px]" />
              <div className="text-base font-black uppercase text-slate-800 dark:text-white leading-tight">{o.team.name}</div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{o.leagueName}<br />{o.team.strength} OVR</div>
            </button>
          ))}
          {!ofertas.length && <div className="col-span-5 text-xs text-slate-400 font-bold uppercase tracking-widest p-4">No offers for this country.</div>}
        </div>
        <div className="w-[24%] flex flex-col gap-2 min-h-0">
          <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Club Overview</div>
          {sel ? (() => {
            const c = sel.team, c1 = c.homeKit?.color1 || '#1e293b', c2 = c.homeKit?.color2 || c1;
            const painel = 'bg-black/45 backdrop-blur-sm border border-white/15 rounded';
            return (
              <div className="flex-1 relative overflow-hidden rounded border-2 border-slate-200 dark:border-slate-800 min-h-0" style={{ background: `linear-gradient(165deg, ${c1} 0%, ${c1} 18%, ${c2} 62%, #020617 100%)` }}>
                <div className="absolute inset-0 flex flex-col gap-2 p-1.5 min-h-0">
                  <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 space-y-3 min-h-0">
                    <div className={`relative overflow-hidden h-[84px] flex flex-col justify-center text-left pl-3 pr-[88px] ${painel}`}>
                      <div className="absolute top-1/2 -translate-y-1/2 -right-[26px] w-[120px] h-[144px]"><TeamShield team={c} className="w-full h-full" /></div>
                      <div className="text-2xl font-black text-white uppercase leading-tight truncate">{c.name}</div>
                      <div className="text-[10px] font-bold text-blue-300 uppercase tracking-widest">{sel.leagueName}</div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-center">
                      {[['OVR', c.strength], ['Founded', c.foundedYear || '-'], ['Fan base', (c.fanBase || 0).toLocaleString()], ['Budget', '$' + Math.round((c.cash || 0) / 1000).toLocaleString() + 'k']].map(([k, v]) => (
                        <div key={String(k)} className={`${painel} p-2`}>
                          <div className="text-[9px] font-black text-white/60 uppercase tracking-widest">{k}</div>
                          <div className="text-lg font-black text-white">{v}</div>
                        </div>
                      ))}
                    </div>
                    <div className={`${painel} p-3 text-sm space-y-1`}>
                      <div className="flex justify-between"><span className="text-white/60 font-bold uppercase text-[10px] tracking-widest">City</span><span className="font-bold text-white">{c.city || '-'}</span></div>
                      <div className="flex justify-between gap-2"><span className="text-white/60 font-bold uppercase text-[10px] tracking-widest">Stadium</span><span className="font-bold text-white text-right">{c.stadium || '-'}</span></div>
                      {c.stadiumCapacity ? <div className="flex justify-between"><span className="text-white/60 font-bold uppercase text-[10px] tracking-widest">Capacity</span><span className="font-bold text-white">{c.stadiumCapacity.toLocaleString()}</span></div> : null}
                    </div>
                    <div className={`${painel} px-0 py-1`}>
                      <div className="text-[10px] font-black text-white/60 uppercase tracking-widest mb-0 px-2">Kits</div>
                      <div className="flex flex-wrap justify-center gap-y-2">
                        {([0, 1, 2] as const).map(k => <TeamKit key={k} team={c} kitIndex={k} className="w-[95px] h-[122px]" showLabel number={10} />)}
                        <TeamKit team={c} gk className="w-[95px] h-[122px]" showLabel number={1} />
                      </div>
                    </div>
                    <div className={`${painel} p-3`}>
                      <div className="text-[10px] font-black text-white/60 uppercase tracking-widest mb-2">Key players ({sel.elenco.length})</div>
                      {sel.elenco.slice(0, 6).map(p => (
                        <div key={p.id} className="flex items-center justify-between text-sm py-0.5 gap-2">
                          <PlayerFace playerId={p.id} camisa={c.homeKit?.color1 || c.primaryColor} className="w-[49px] h-[49px] shrink-0 rounded-lg overflow-hidden bg-black/30 border border-white/20" />
                          <span className="font-bold text-white truncate flex-1 min-w-0">{p.name}</span>
                          <span className="text-white/60 font-bold text-xs shrink-0 ml-2">{p.position} · {p.age}y · <span className="text-blue-300">{p.skill}</span></span>
                        </div>
                      ))}
                    </div>
                  </div>
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
