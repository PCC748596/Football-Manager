
import React from 'react';

interface FitnessBarProps {
  fitness: number;
  className?: string;
  showDividers?: boolean;
}

const FitnessBar: React.FC<FitnessBarProps> = ({ fitness, className = "" }) => {
  // 5 segments of 20 points each
  const segments = [0, 20, 40, 60, 80];
  
  const getOverallColor = (val: number) => {
    if (val <= 20) return 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.2)]';
    if (val <= 40) return 'bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.2)]';
    if (val <= 80) return 'bg-yellow-500 shadow-[0_0_8px_rgba(234,179,8,0.2)]';
    return 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.2)]';
  };

  const colorClass = getOverallColor(fitness);

  return (
    <div className={`flex gap-[2px] ${className}`}>
      {segments.map((threshold, i) => {
        const segProgress = Math.min(20, Math.max(0, fitness - threshold));
        const fillPercent = (segProgress / 20) * 100;
        
        return (
          <div key={i} className="flex-1 h-full bg-slate-200 dark:bg-slate-800 rounded-[1px] overflow-hidden relative">
            <div 
              className={`absolute inset-0 ${colorClass} transition-all duration-300`}
              style={{ width: `${fillPercent}%` }}
            />
          </div>
        );
      })}
    </div>
  );
};

export default FitnessBar;
