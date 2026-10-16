
import React, { useState, useEffect } from 'react';
import { Team, getKitDetails, getGKKitDetails } from '../types';
import { TeamShield } from './TeamShield';
import { ShirtIcon } from './ShirtIcon';

const hexToRgb = (hex: string) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : { r: 0, g: 0, b: 0 };
}

const getContrastColor = (hex: string) => {
  const rgb = hexToRgb(hex);
  if (!hex || hex === 'transparent') return '#ffffff';
  const brightness = (rgb.r * 299 + rgb.g * 587 + rgb.b * 114) / 1000;
  return brightness > 128 ? '#000000' : '#ffffff';
}

interface KitSelectionProps {
    homeTeam: Team;
    awayTeam: Team;
    userTeamId: string | null;
    onSelectionComplete: (homeIdx: number, awayIdx: number) => void;
}

export const KitSelection: React.FC<KitSelectionProps> = ({ 
    homeTeam, 
    awayTeam, 
    userTeamId, 
    onSelectionComplete 
}) => {
    const isUserHome = userTeamId === homeTeam.id;
    const isUserAway = userTeamId === awayTeam.id;
    
    const [homeIdx, setHomeIdx] = useState(0);
    const [awayIdx, setAwayIdx] = useState(1);
    
    // Auto-select initial away kit that contrasts with home kit 0
    useEffect(() => {
        if (!isUserHome) {
            // CPU Home always picks 0
            setHomeIdx(0);
            // Away (User) might need to pick something else if 0 is too similar to 0
            // For now default to 1 for away
            setAwayIdx(1);
        }
    }, [isUserHome]);

    const renderKitPreview = (team: Team, idx: number, isGK: boolean) => {
        const details = isGK ? getGKKitDetails(team, idx as 0 | 1 | 2) : getKitDetails(team, idx as 0 | 1 | 2);
        return (
            <div className="flex flex-col items-center gap-2">
                <ShirtIcon 
                    color={details.c1} 
                    color2={details.c2} 
                    color3={details.c3} 
                    diagonal={details.diagonal}
                    horizontal={(details as any).horizontal}
                    multipleDiagonals={(details as any).multipleDiagonals}
                    dualDiagonal={(details as any).dualDiagonal}
                    centerVerticalStripes={(details as any).centerVerticalStripes}
                    gradient={(details as any).gradient}
                    spfcStripes={(details as any).spfcStripes}
                    criciumaStripes={(details as any).criciumaStripes}
                    diagonalWidth={details.diagonalWidth}
                    number={isGK ? "1" : "10"} 
                    numberColor={details.nc}
                    collarColor={details.clc}
                    numberOutlineColor={details.noc}
                    longSleeves={isGK}
                    sleeveColor={(details as any).sc}
                    scale={1.2} 
                    className="drop-shadow-xl"
                />
                <span className="text-[8px] font-black uppercase text-slate-500">{isGK ? 'Goalkeeper' : `Uniform ${idx+1}`}</span>
            </div>
        );
    };

    return (
        <div className="flex flex-col gap-8 w-full max-w-2xl bg-slate-900/90 backdrop-blur-md p-8 rounded-3xl border border-slate-800 shadow-2xl animate-fade-in">
            <div className="text-center">
                <h2 className="text-2xl font-black text-white uppercase italic tracking-widest mb-1">Uniform Selection</h2>
                <p className="text-blue-400 text-[10px] font-black uppercase tracking-[0.2em]">Match Day Preparation</p>
            </div>

            <div className="grid grid-cols-2 gap-12">
                {/* Home Team Column */}
                <div className="flex flex-col items-center gap-6">
                    <div className="flex flex-col items-center gap-2">
                        <TeamShield team={homeTeam} className="w-16 h-20" />
                        <span className="text-sm font-black text-white uppercase italic">{homeTeam.name}</span>
                        <span className="text-[10px] font-bold text-slate-500 uppercase">Home Team</span>
                    </div>

                    <div className="flex gap-4">
                        {renderKitPreview(homeTeam, homeIdx, false)}
                        {renderKitPreview(homeTeam, homeIdx, true)}
                    </div>

                    <div className="flex gap-2">
                        {[0, 1, 2].map(idx => (
                            <button
                                key={idx}
                                disabled={!isUserHome}
                                onClick={() => setHomeIdx(idx)}
                                className={`px-4 py-2 rounded-lg text-[10px] font-black transition-all ${
                                    homeIdx === idx 
                                    ? 'bg-blue-600 text-white shadow-lg scale-105' 
                                    : 'bg-slate-800 text-slate-500 hover:bg-slate-700 disabled:opacity-30'
                                }`}
                            >
                                KIT {idx + 1}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Away Team Column */}
                <div className="flex flex-col items-center gap-6">
                    <div className="flex flex-col items-center gap-2">
                        <TeamShield team={awayTeam} className="w-16 h-20" />
                        <span className="text-sm font-black text-white uppercase italic">{awayTeam.name}</span>
                        <span className="text-[10px] font-bold text-slate-500 uppercase">Away Team</span>
                    </div>

                    <div className="flex gap-4">
                        {renderKitPreview(awayTeam, awayIdx, false)}
                        {renderKitPreview(awayTeam, awayIdx, true)}
                    </div>

                    <div className="flex gap-2">
                        {[0, 1, 2].map(idx => (
                            <button
                                key={idx}
                                disabled={!isUserHome && !isUserAway}
                                onClick={() => setAwayIdx(idx)}
                                className={`px-4 py-2 rounded-lg text-[10px] font-black transition-all ${
                                    awayIdx === idx 
                                    ? 'bg-blue-600 text-white shadow-lg scale-105' 
                                    : 'bg-slate-800 text-slate-500 hover:bg-slate-700 disabled:opacity-30'
                                }`}
                            >
                                KIT {idx + 1}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <div className="mt-4 pt-6 border-t border-slate-800 flex flex-col items-center gap-4">
                {isUserHome && (
                    <p className="text-[10px] text-emerald-500 font-bold uppercase tracking-widest animate-pulse">
                        You are at home. Choose uniforms for both teams.
                    </p>
                )}
                {!isUserHome && isUserAway && (
                    <p className="text-[10px] text-amber-500 font-bold uppercase tracking-widest">
                        Home team picked Uniform 1. Choose your colors.
                    </p>
                )}
                <button
                    onClick={() => onSelectionComplete(homeIdx, awayIdx)}
                    className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-black uppercase tracking-[0.3em] rounded-xl shadow-xl transition-all active:scale-95 border-b-4 border-emerald-800"
                >
                    Start Match
                </button>
            </div>
        </div>
    );
};
