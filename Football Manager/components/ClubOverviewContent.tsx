import React from 'react';
import { Team, Player } from '../types';
import { TeamShield } from './TeamShield';
import { TeamKit } from './TeamKit';
import { PlayerFace } from './PlayerFace';
import { useGame } from '../context/GameContext';
import { expectativaDoClube } from '../textSim/managerExpectations';

const painel = 'bg-black/45 backdrop-blur-sm border border-white/15 rounded';

interface Props {
  team: Team;
  leagueName?: string;
  /** Todos os clubes da liga do clube (a expectativa e a tradicao sao relativas a liga). */
  leagueTeams: Team[];
  /** Quantos descem na liga (sem valor: 20% dos clubes). */
  relegated?: number;
  elenco: Player[];
}

/**
 * O conteudo da area rolavel do "Club Overview" (escolha de clube e Manager career): nome e liga, numeros, estadio, expectativa da diretoria, kits e os 5 melhores jogadores.
 * O fundo degradê e o botao de entrar ficam por conta de quem usa.
 */
export const ClubOverviewContent: React.FC<Props> = ({ team, leagueName, leagueTeams, relegated, elenco }) => {
  const { gameState } = useGame();
  const pt = gameState.language === 'PT';
  const { nivel, alvo, ajuste } = expectativaDoClube(leagueTeams, team, relegated ?? Math.round(leagueTeams.length * 0.2));
  const notaTradicao = ajuste === 0 ? '' : ajuste > 0 ? (pt ? 'A tradição do clube eleva a cobrança.' : "The club's history raises the demand.") : (pt ? 'A pouca tradição reduz a cobrança.' : 'Little history lowers the demand.');
  const rotulos = pt
    ? ['Evitar o rebaixamento', 'Garantir a permanência', 'Terminar na metade de cima', 'Terminar entre os primeiros', 'Disputar o título', 'Conquistar o título']
    : ['Avoid relegation', 'Secure survival', 'Finish in the upper half', 'Finish near the top', 'Compete for the title', 'Win the title'];
  const campeao = alvo <= 3;
  const meta = campeao ? (pt ? 'Ser campeão' : 'To be Champion') : (pt ? `Meta: top ${alvo}` : `Target: top ${alvo}`);
  const cores = ['bg-red-500', 'bg-orange-500', 'bg-amber-400', 'bg-lime-400', 'bg-emerald-400', 'bg-yellow-300'];
  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 space-y-0.5 min-h-0">
      <div className={`relative overflow-hidden h-[84px] flex flex-col justify-center text-left pl-3 pr-[88px] ${painel}`}>
        <div className="absolute top-1/2 -translate-y-1/2 -right-[26px] w-[120px] h-[144px]"><TeamShield team={team} className="w-full h-full" /></div>
        <div className="text-2xl font-black text-white uppercase leading-tight truncate">{team.name}</div>
        <div className="text-[10px] font-bold text-blue-300 uppercase tracking-widest">{leagueName}</div>
        {notaTradicao && <div className="text-[9px] text-white/50 leading-tight mt-0.5">{notaTradicao}</div>}
      </div>
      <div className="grid grid-cols-2 gap-0.5 text-center">
        {[['OVR', team.strength], ['Founded', team.foundedYear || '-'], ['Fan base', (team.fanBase || 0).toLocaleString()], ['Budget', '$' + Math.round((team.cash || 0) / 1000).toLocaleString() + 'k']].map(([k, v]) => (
          <div key={String(k)} className={`${painel} px-2 py-[5.5px]`}>
            <div className="text-[9px] font-black text-white/60 uppercase tracking-widest">{k}</div>
            <div className="text-lg font-black text-white">{v}</div>
          </div>
        ))}
      </div>
      <div className={`${painel} px-3 py-[7px] text-sm space-y-1`}>
        <div className="flex justify-between"><span className="text-white/60 font-bold uppercase text-[10px] tracking-widest">City</span><span className="font-bold text-white">{team.city || '-'}</span></div>
        <div className="flex justify-between gap-2"><span className="text-white/60 font-bold uppercase text-[10px] tracking-widest">Stadium</span><span className="font-bold text-white text-right">{team.stadium || '-'}</span></div>
        {team.stadiumCapacity ? <div className="flex justify-between"><span className="text-white/60 font-bold uppercase text-[10px] tracking-widest">Capacity</span><span className="font-bold text-white">{team.stadiumCapacity.toLocaleString()}</span></div> : null}
      </div>
      <div className={`${painel} p-3`}>
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10px] font-black text-white/60 uppercase tracking-widest">{pt ? 'Expectativa da diretoria' : 'Board expectations'}</span>
          <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full shrink-0 ${campeao ? 'bg-yellow-400/20 text-yellow-300' : 'bg-blue-500/20 text-blue-300'}`}>{campeao ? '🏆 ' : ''}{meta}</span>
        </div>
        <div className="font-black text-white text-base leading-tight mt-1">{rotulos[nivel]}</div>
        <div className="flex gap-1 mt-2">
          {cores.map((cor, i) => <div key={i} className={`h-1.5 flex-1 rounded-full ${i <= nivel ? cor : 'bg-white/10'}`} />)}
        </div>
        <div className="flex justify-between text-[8px] font-bold text-white/40 uppercase tracking-widest mt-1"><span>{pt ? 'Permanência' : 'Survival'}</span><span>{pt ? 'Título' : 'Title'}</span></div>
      </div>
      <div className={`${painel} px-0 pt-[2px] pb-0`}>
        <div className="text-[10px] font-black text-white/60 uppercase tracking-widest leading-none mb-0 px-2">Kits</div>
        <div className="flex flex-wrap justify-center gap-x-0 gap-y-0 -mt-[10px] -mb-[11px]">
          {([0, 1, 2] as const).map(k => <TeamKit key={k} team={team} kitIndex={k} className="w-[66px] h-[85px]" number={10} />)}
          <TeamKit team={team} gk className="w-[66px] h-[85px]" number={1} />
        </div>
      </div>
      <div className={`${painel} p-3`}>
        <div className="text-[10px] font-black text-white/60 uppercase tracking-widest mb-2">Key players ({elenco.length})</div>
        {elenco.slice(0, 5).map(p => (
          <div key={p.id} className="flex items-center justify-between text-sm py-0.5 gap-2">
            <PlayerFace playerId={p.id} camisa={team.homeKit?.color1 || team.primaryColor} className="w-[47px] h-[47px] shrink-0 rounded-lg overflow-hidden bg-black/30 border border-white/20" />
            <span className="font-bold text-white truncate flex-1 min-w-0">{p.name}</span>
            <span className="text-white/60 font-bold text-xs shrink-0 ml-2">{p.position} · {p.age}y · <span className="text-blue-300">{p.skill}</span></span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ClubOverviewContent;
