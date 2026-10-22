import React, { useState, useEffect } from 'react';
import { Team, getKitDetails, getGKKitDetails } from '../types';
import { ShirtIcon } from './ShirtIcon';

interface TeamKitProps {
  team?: Team;
  kitIndex?: 0 | 1 | 2; // 0 = home, 1 = away, 2 = third
  className?: string;
  showLabel?: boolean;
  gk?: boolean;               // o kit do goleiro (mangas compridas)
  number?: number | string;   // numero na camisa
}

const KIT_LABELS = ['Casa', 'Fora', '3ª'];

export const TeamKit: React.FC<TeamKitProps> = ({ team, kitIndex = 0, className = 'w-12 h-16', showLabel = false, gk = false, number }) => {
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    setImageError(false);
  }, [team?.id, kitIndex]);

  if (!team) return <div className={`${className} bg-gray-200 rounded animate-pulse`} />;

  const kitUrl = gk ? undefined : team.kitUrls?.[kitIndex];
  const kit = gk ? getGKKitDetails(team, 0, 0) : getKitDetails(team, kitIndex as 0 | 1 | 2);

  return (
    <div className="flex flex-col items-center gap-0.5">
      <div className={`${className} flex items-center justify-center`}>
        {kitUrl && !imageError ? (
          <img
            src={kitUrl}
            alt={`${team.name} kit ${kitIndex + 1}`}
            className="w-full h-full object-contain drop-shadow-md"
            onError={() => setImageError(true)}
          />
        ) : (
          <ShirtIcon 
            color={kit.c1} 
            color2={kit.c2} 
            color3={kit.c3} 
            diagonal={kit.diagonal}
            diagonalWidth={kit.diagonalWidth}
            multipleDiagonals={kit.multipleDiagonals}
            horizontal={kit.horizontal}
            gradient={kit.gradient}
            spfcStripes={kit.spfcStripes}
            criciumaStripes={kit.criciumaStripes}
            pattern={team.shirtPattern}
            collarColor={kit.clc}
            numberColor={kit.nc}
            numberOutlineColor={kit.noc}
            sleeveColor={kit.sc}
            number={number}
            longSleeves={gk}
            scale={1.0} 
            className="w-full h-full" 
          />
        )}
      </div>
      {showLabel && (
        <span className="text-[8px] font-black uppercase tracking-widest text-slate-500">{gk ? 'GK' : KIT_LABELS[kitIndex]}</span>
      )}
    </div>
  );
};
