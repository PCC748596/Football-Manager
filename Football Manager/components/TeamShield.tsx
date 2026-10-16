
import React, { useMemo, useState, useEffect } from 'react';
import { Team } from '../types';

interface TeamShieldProps {
  team?: Team;
  className?: string;
}

export const TeamShield: React.FC<TeamShieldProps> = ({ team, className = "w-6 h-8" }) => {
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    setImageError(false);
  }, [team?.id]);

  // Pattern Generator Logic
  const shieldData = useMemo(() => {
    if (!team) return null;

    // Use team ID to deterministically generate unique ID for clipPath
    const hash = team.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const uniqueId = `shield-${team.id}-${hash}`;
    
    const c1 = team.primaryColor || '#333';
    const c2 = team.secondaryColor || '#fff';
    
    // User Requirement: "Se o time não tiver a color3, repete a color 1."
    const c3 = team.tertiaryColor && team.tertiaryColor !== 'transparent' ? team.tertiaryColor : c1;

    return { c1, c2, c3, uniqueId };
  }, [team]);

  if (!team || !shieldData) return <div className={`${className} bg-gray-200 rounded-full animate-pulse`} />;

  // Display Image if available and not broken
  if (team.logoUrl && !imageError) {
    return (
      <div className={`${className} flex items-center justify-center overflow-hidden`}>
        <img 
          src={team.logoUrl} 
          alt={team.name} 
          className="w-full h-full object-contain"
          onError={() => setImageError(true)} 
        />
      </div>
    );
  }

  const { c1, c2, c3, uniqueId } = shieldData;

  return (
    <svg viewBox="0 0 100 120" className={`${className} drop-shadow-md filter`}>
      <defs>
        <clipPath id={uniqueId}>
          <path d="M0 0 L100 0 L100 40 C100 100 50 120 50 120 C50 120 0 100 0 40 Z" />
        </clipPath>
      </defs>
      <g clipPath={`url(#${uniqueId})`}>
        {/* Standard Vertical 3 Stripes Pattern for All Teams */}
        <rect x="0" y="0" width="33" height="120" fill={c1} />
        <rect x="33" y="0" width="34" height="120" fill={c2} />
        <rect x="67" y="0" width="33" height="120" fill={c3} />
        
        {/* Shine effect */}
        <path d="M0 0 L100 0 L50 60 Z" fill="white" fillOpacity="0.1" />
      </g>
      {/* Border */}
      <path 
        d="M0 0 L100 0 L100 40 C100 100 50 120 50 120 C50 120 0 100 0 40 Z" 
        fill="none" 
        stroke="rgba(0,0,0,0.15)" 
        strokeWidth="4" 
      />
    </svg>
  );
};
