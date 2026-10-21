
import React, { useState } from 'react';
import { useGame } from '../context/GameContext';
import { ActivityType, Team } from '../types';

interface ActivityModalProps {
  isOpen: boolean;
  onClose: () => void;
  date: string;
  onSchedule: (type: ActivityType, details: any) => void;
}

const ActivityModal: React.FC<ActivityModalProps> = ({ isOpen, onClose, date, onSchedule }) => {
  const { teams, userTeam, gameState, fixtures } = useGame();
  const [step, setStep] = useState<'TYPE' | 'FRIENDLY_SELECT' | 'CAMP_SELECT' | 'PARTY_SELECT'>('TYPE');

  if (!isOpen) return null;

  const dateLabel = new Date(date + 'T12:00:00').toLocaleDateString('en-US', { day: 'numeric', month: 'long' });
  
  // Check if there's already an activity on this date
  const existingActivity = gameState.activities?.find(a => a.date === date);

  const handleRemoveActivity = () => {
    // Remove activity by scheduling a "NONE" replacement that clears it
    onSchedule('REMOVE' as ActivityType, {});
    onClose();
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val);
  };

  const renderStep = () => {
    const hasMatchOnSelectedDate = fixtures.some(f => f.date === date && !f.played && (f.homeTeamId === userTeam?.id || f.awayTeamId === userTeam?.id));

    const checkCampConflict = (days: number) => {
        for (let i = 0; i < days; i++) {
            const d = new Date(date + 'T12:00:00');
            d.setDate(d.getDate() + i);
            const dateStr = d.toISOString().split('T')[0];
            if (fixtures.some(f => f.date === dateStr && !f.played && (f.homeTeamId === userTeam?.id || f.awayTeamId === userTeam?.id))) return true;
        }
        return false;
    };

    switch (step) {
      case 'TYPE':
        return (
          <div className="space-y-3">
            {existingActivity && (
              <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-300 dark:border-amber-700 mb-4">
                <div className="text-[10px] text-amber-600 dark:text-amber-400 font-black uppercase tracking-widest mb-1">Atividade Atual</div>
                <div className="text-slate-800 dark:text-white font-bold text-sm uppercase">{existingActivity.label}</div>
                <button 
                  onClick={handleRemoveActivity}
                  className="mt-2 text-[10px] font-black text-red-500 uppercase tracking-widest hover:underline"
                >
                  ✕ Remover Atividade
                </button>
              </div>
            )}
            <button 
              onClick={() => !hasMatchOnSelectedDate && setStep('FRIENDLY_SELECT')}
              disabled={hasMatchOnSelectedDate}
              className={`w-full p-5 rounded-xl border transition-all group flex items-center justify-between ${
                hasMatchOnSelectedDate 
                  ? 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 opacity-50 cursor-not-allowed' 
                  : 'bg-blue-600/10 border-blue-500/30 hover:bg-blue-600'
              }`}
            >
              <div className="text-left">
                <div className={`font-black uppercase text-lg group-hover:text-white transition-colors ${hasMatchOnSelectedDate ? 'text-slate-400' : 'text-slate-900 dark:text-white'}`}>
                    Amistoso {hasMatchOnSelectedDate && <span className="text-[10px] bg-red-500 text-white px-1.5 py-0.5 rounded ml-2">CONFLITO</span>}
                </div>
                <div className={`text-[10px] font-bold uppercase tracking-widest group-hover:text-blue-100 transition-colors ${hasMatchOnSelectedDate ? 'text-slate-500' : 'text-blue-500 dark:text-blue-400'}`}>Friendly Match</div>
              </div>
              <span className="text-2xl">⚽</span>
            </button>

            <button 
              onClick={() => setStep('CAMP_SELECT')}
              className="w-full p-5 rounded-xl bg-emerald-600/10 border border-emerald-500/30 hover:bg-emerald-600 transition-all group flex items-center justify-between"
            >
              <div className="text-left">
                <div className="text-slate-900 dark:text-white font-black uppercase text-lg group-hover:text-white transition-colors">Treinamento</div>
                <div className="text-emerald-500 dark:text-emerald-400 text-[10px] font-bold uppercase tracking-widest group-hover:text-emerald-100 transition-colors">Training Camp</div>
              </div>
              <span className="text-2xl">🏔️</span>
            </button>

            <button 
              onClick={() => !hasMatchOnSelectedDate && setStep('PARTY_SELECT')}
              disabled={hasMatchOnSelectedDate}
              className={`w-full p-5 rounded-xl border transition-all group flex items-center justify-between ${
                hasMatchOnSelectedDate 
                  ? 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 opacity-50 cursor-not-allowed' 
                  : 'bg-amber-600/10 border-amber-500/30 hover:bg-amber-600'
              }`}
            >
              <div className="text-left">
                <div className={`font-black uppercase text-lg group-hover:text-white transition-colors ${hasMatchOnSelectedDate ? 'text-slate-400' : 'text-slate-900 dark:text-white'}`}>
                    Festa {hasMatchOnSelectedDate && <span className="text-[10px] bg-red-500 text-white px-1.5 py-0.5 rounded ml-2">CONFLITO</span>}
                </div>
                <div className={`text-[10px] font-bold uppercase tracking-widest group-hover:text-amber-100 transition-colors ${hasMatchOnSelectedDate ? 'text-slate-500' : 'text-amber-500 dark:text-amber-400'}`}>Team Party</div>
              </div>
              <span className="text-2xl">🎉</span>
            </button>
          </div>
        );
      case 'FRIENDLY_SELECT':
        return (
          <div className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar pr-2">
            <p className="text-xs text-slate-500 font-bold mb-4 uppercase tracking-widest text-center">Selecione o adversário:</p>
            {teams.filter(t => t.id !== userTeam?.id && t.leagueId === userTeam?.leagueId).slice(0, 15).map(t => (
              <button 
                key={t.id}
                onClick={() => { onSchedule('FRIENDLY', { opponentId: t.id }); onClose(); }}
                className="w-full p-3 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-blue-500 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all flex items-center gap-3"
              >
                <div className="w-1.5 h-6 rounded-full" style={{ backgroundColor: t.primaryColor }}></div>
                <span className="text-slate-800 dark:text-white font-bold uppercase text-sm truncate flex-1 text-left">{t.name}</span>
                <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase">{t.strength} OVR</span>
              </button>
            ))}
          </div>
        );
      case 'CAMP_SELECT':
        const camps = [
          { days: 3, cost: 100000 },
          { days: 5, cost: 200000 },
          { days: 7, cost: 300000 }
        ];
        return (
          <div className="space-y-3">
            <p className="text-xs text-slate-500 font-bold mb-4 uppercase tracking-widest text-center">Selecione a duração:</p>
            {camps.map(c => {
              const hasConflict = checkCampConflict(c.days);
              return (
                <button 
                  key={c.days}
                  disabled={hasConflict}
                  onClick={() => { onSchedule('TRAINING_CAMP', { days: c.days, cost: c.cost }); onClose(); }}
                  className={`w-full p-4 rounded border transition-all flex items-center justify-between shadow-sm ${
                    hasConflict
                      ? 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 opacity-50 cursor-not-allowed'
                      : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-emerald-500 hover:bg-slate-50 dark:hover:bg-slate-700'
                  }`}
                >
                  <div className="text-left">
                     <div className={`font-black text-lg uppercase leading-none ${hasConflict ? 'text-slate-400' : 'text-slate-800 dark:text-white'}`}>
                        {c.days} Dias {hasConflict && <span className="text-[10px] bg-red-500 text-white px-1.5 py-0.5 rounded ml-2 font-black">CONFLITO</span>}
                     </div>
                     <div className="text-[10px] text-slate-500 font-bold mt-1 uppercase tracking-widest">Custo: {formatCurrency(c.cost)}</div>
                  </div>
                </button>
              );
            })}
          </div>
        );
      case 'PARTY_SELECT':
        const parties = [
          { name: 'Churrasco Simples', cost: 1000, moraleBonus: 5 },
          { name: 'Festa com DJ', cost: 5000, moraleBonus: 15 },
          { name: 'Evento de Gala', cost: 20000, moraleBonus: 30 }
        ];
        return (
          <div className="space-y-3">
            <p className="text-xs text-slate-500 font-bold mb-4 uppercase tracking-widest text-center">Selecione o tipo de evento:</p>
            {parties.map(p => (
              <button 
                key={p.name}
                onClick={() => { onSchedule('TEAM_PARTY', { partyName: p.name, cost: p.cost, moraleBonus: p.moraleBonus }); onClose(); }}
                className="w-full p-4 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-amber-500 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all flex items-center justify-between shadow-sm"
              >
                <div className="text-left">
                   <div className="text-slate-800 dark:text-white font-black text-lg uppercase leading-none">{p.name}</div>
                   <div className="text-[10px] text-slate-500 font-bold mt-1 uppercase tracking-widest">Custo: {formatCurrency(p.cost)} | Bônus: +{p.moraleBonus} Morale</div>
                </div>
              </button>
            ))}
          </div>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden transition-all duration-300">
        <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-950/40 transition-colors">
           <div>
              <h3 className="text-lg font-black text-slate-800 dark:text-white uppercase italic leading-none transition-colors">Agendar Atividade</h3>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1 opacity-60 transition-colors">{dateLabel}</p>
           </div>
           <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors text-2xl font-light">×</button>
        </div>
        <div className="p-6">
           {renderStep()}
        </div>
        {step !== 'TYPE' && (
          <div className="p-4 bg-slate-50 dark:bg-slate-950/40 border-t border-slate-200 dark:border-slate-800 transition-colors">
             <button onClick={() => setStep('TYPE')} className="text-[10px] font-black text-blue-600 uppercase tracking-widest hover:underline transition-colors">Voltar</button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ActivityModal;
