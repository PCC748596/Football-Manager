import { tx, textoDaLesao } from '../textSim/idiomas';
import React from 'react';
import { useGame } from '../context/GameContext';
import { Player, Team } from '../types';
import { PlayerFace3D } from './PlayerFace3D';
import EnergyBar, { energiaDe } from './EnergyBar';
import { gerarMedico } from '../textSim/medico';

const COR_GRAVIDADE: Record<string, string> = { LIGHT: 'text-emerald-500 border-emerald-500/50', LEVE: 'text-emerald-500 border-emerald-500/50', MEDIUM: 'text-amber-500 border-amber-500/50', 'MÉDIA': 'text-amber-500 border-amber-500/50', SEVERE: 'text-rose-500 border-rose-500/50', GRAVE: 'text-rose-500 border-rose-500/50' };
const ROTULO_GRAVIDADE: Record<string, string> = { LIGHT: 'Light', LEVE: 'Light', MEDIUM: 'Medium', 'MÉDIA': 'Medium', SEVERE: 'Severe', GRAVE: 'Severe' };

const corNota = (v: number) => (v >= 80 ? 'bg-emerald-500' : v >= 65 ? 'bg-amber-500' : 'bg-rose-500');

const Nota: React.FC<{ rotulo: string; dica: string; valor: number }> = ({ rotulo, dica, valor }) => (
  <div title={dica} className="min-w-[110px]">
    <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-slate-500"><span>{rotulo}</span><span className="text-slate-800 dark:text-white">{valor}</span></div>
    <div className="h-1.5 mt-1 rounded bg-slate-300 dark:bg-slate-800 overflow-hidden"><div className={`h-full ${corNota(valor)}`} style={{ width: `${valor}%` }} /></div>
  </div>
);

/** O card de um lesionado, no desenho dos cards do Transfer Market: foto, nome, a lesao, a estimativa do medico, a energia e o ultimo boletim. */
const CardLesao: React.FC<{ p: Player; cor?: string; team?: Team }> = ({ p, cor, team }) => {
  const l = p.injury!;
  const grav = l.severity;
  return (
    <div className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100/50 dark:bg-[#0e182c] px-3 py-2 flex flex-wrap items-center gap-x-5 gap-y-2">
      <div className="relative -top-[15px] w-20 h-20 shrink-0 pointer-events-none"><PlayerFace3D playerId={p.id} team={team} gk={p.position === 'GK'} camisa={cor} className="w-full h-full" /></div>
      <div className="min-w-[150px] flex-1">
        <div className="flex items-center flex-wrap gap-x-3 gap-y-1">
          <div className="text-base font-black text-slate-900 dark:text-white leading-tight truncate">{p.name}</div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 truncate">{p.position} • Age {p.age}</span>
          <div className={`inline-block text-[10px] font-black uppercase border px-2 py-0.5 rounded-md ${COR_GRAVIDADE[grav] || COR_GRAVIDADE.LIGHT}`}>{ROTULO_GRAVIDADE[grav] || 'Light'}{l.tipoLesao ? ` • ${l.tipoLesao === 'Complexa' ? 'Complex' : 'Simple'}` : ''}</div>
        </div>
        {/* O boletim medico logo abaixo do nome, alinhado com ele (antes ia numa linha a largura toda e comecava debaixo da foto). */}
        <div className="mt-1 text-[11px] text-slate-500 italic">{l.boletim ? `🩺 ${textoDaLesao(l.boletim)}` : tx('Awaiting first medical report.')}</div>
      </div>
      <div className="text-sm font-black text-slate-800 dark:text-slate-100 min-w-[130px]">✚ {textoDaLesao(l.type)}</div>
      <div><div className="text-[10px] font-bold uppercase text-slate-500">{tx('Estimated return')}</div><div className="text-sm font-black text-slate-900 dark:text-white">{l.estimativa || `~${l.daysOut} days`}</div></div>
      <div className="w-[140px]"><div className="text-[10px] font-bold uppercase text-slate-500 mb-1">{tx('Energy')} {Math.round(energiaDe(p))}%</div><EnergyBar energy={energiaDe(p)} className="w-full h-2" /></div>
    </div>
  );
};

/** O grupo MED da aba Training: o medico do clube e os lesionados (quem nao pode treinar). */
export const MedicalDepartmentPanel: React.FC = () => {
  const { userTeam, players } = useGame();
  if (!userTeam) return null;
  const medico = userTeam.medico || gerarMedico(userTeam.id);
  const lesionados = players.filter(p => p.teamId === userTeam.id && p.injury).sort((a, b) => b.injury!.daysOut - a.injury!.daysOut);
  return (
    <div className="flex-1 flex flex-col gap-3 p-3 overflow-y-auto custom-scrollbar bg-white dark:bg-transparent">
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100/50 dark:bg-[#0e182c] p-3 flex flex-wrap items-center gap-x-8 gap-y-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-xl">🩺</div>
          <div>
            <div className="text-[10px] font-black uppercase tracking-widest text-slate-500">{tx('Head of Medical Department')}</div>
            <div className="text-lg font-black text-slate-900 dark:text-white leading-tight">{medico.nome}</div>
          </div>
        </div>
        <div className="flex flex-wrap gap-5 flex-1 justify-end">
          <Nota rotulo="Accuracy" dica="Accuracy of the return estimate: the higher, the closer to the real timeline." valor={medico.precisao} />
          <Nota rotulo="Recovery" dica="Speed: shortens the real duration of injuries (up to -20%)." valor={medico.tempo} />
          <Nota rotulo="Efficacy" dica="Efficacy: chance of an excellent weekly report and fewer relapses (complex injuries)." valor={medico.eficacia} />
        </div>
      </div>
      <div className="text-[11px] font-black uppercase tracking-widest text-slate-500">Injured players ({lesionados.length})</div>
      {lesionados.length === 0
        ? <div className="flex-1 flex flex-col items-center justify-center text-center text-slate-400 py-10"><span className="text-4xl mb-2 opacity-70">✚</span><div className="text-xs font-bold uppercase tracking-widest">{tx('No injured players')}</div></div>
        : <div className="flex flex-col gap-2">{lesionados.map(p => <CardLesao key={p.id} p={p} cor={userTeam.primaryColor} team={userTeam} />)}</div>}
    </div>
  );
};
