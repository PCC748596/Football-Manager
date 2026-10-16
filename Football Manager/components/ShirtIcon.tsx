import React from 'react';

interface ShirtIconProps {
  color: string;
  color2?: string;
  color3?: string;
  number?: number | string;
  numberColor?: string;
  collarColor?: string;
  numberOutlineColor?: string;
  diagonal?: boolean;
  diagonalWidth?: number;
  scale?: number;
  outOfPosition?: boolean;
  longSleeves?: boolean;
  sleeveColor?: string;
  horizontal?: boolean;
  multipleDiagonals?: boolean;
  dualDiagonal?: boolean;
  centerVerticalStripes?: boolean;
  gradient?: boolean;
  spfcStripes?: boolean;
  criciumaStripes?: boolean;
  pattern?: string;
  shortColor?: string;      // com ele o icone leva o short por baixo da camisa (ver kitShorts em types.ts)
  shortTrimColor?: string;  // a aba (barra da bainha) do short
  className?: string;
}

export const ShirtIcon: React.FC<ShirtIconProps> = ({
  color, color2, color3, number, numberColor, collarColor, numberOutlineColor, diagonal = false, horizontal = false, multipleDiagonals = false, dualDiagonal = false, centerVerticalStripes = false, gradient = false, spfcStripes = false, criciumaStripes = false, pattern, diagonalWidth = 10, scale = 1, outOfPosition = false, longSleeves = false, sleeveColor, shortColor, shortTrimColor, className = ''
}) => {
  const maskId = `shirt-mask-${Math.random().toString(36).substr(2, 9)}`;
  const hasStripes = !diagonal && !gradient && color2 && color2 !== 'transparent' && color2 !== color;
  const hasTriStripes = color3 && color3 !== 'transparent' && color3 !== color && color3 !== color2;

  const sleevePath = longSleeves
    ? "M70 30 Q100 55 130 30 L165 55 L180 160 L155 165 L145 95 L145 185 L55 185 L55 95 L45 165 L20 160 L35 55 Z"
    : "M70 30 Q100 55 130 30 L165 55 L185 95 L155 110 L145 95 L145 185 L55 185 L55 95 L45 110 L15 95 L35 55 Z";

  const pathLeftSleeve = longSleeves
    ? "M70 30 Q100 55 85 45 L45 165 L20 160 L35 55 Z"
    : "M70 30 Q100 55 85 45 L45 110 L15 95 L35 55 Z";
  const pathRightSleeve = longSleeves
    ? "M130 30 Q100 55 115 45 L155 165 L180 160 L165 55 Z"
    : "M130 30 Q100 55 115 45 L155 110 L185 95 L165 55 Z";

  const renderPattern = () => {
    // New unified pattern logic
    if (pattern) {
      switch (pattern) {
        case 'criciumaStripes':
          return (
            <>
              <rect x="0" y="0" width="200" height="80" fill={color} />
              <rect x="0" y="80" width="200" height="80" fill={color2} />
              <rect x="0" y="133" width="200" height="67" fill={color3} />
            </>
          );
        case 'centerVerticalStripes':
          return (
            <>
              {color2 && <rect x="85" y="0" width="20" height="200" fill={color2} />}
              {color3 && <rect x="100" y="0" width="20" height="200" fill={color3} />}
            </>
          );
        case 'dualDiagonal':
          const dwDual = (diagonalWidth || 10) * 1.5;
          return (
            <>
              {color2 && <path d={`M200 0 L${200 - dwDual} ${0 - dwDual} L${0 - dwDual} ${200 - dwDual} L0 200 Z`} fill={color2} />}
              {color3 && <path d={`M${200 + dwDual} ${dwDual} L200 0 L0 200 L${dwDual} ${200 + dwDual} Z`} fill={color3} />}
            </>
          );
        case 'diagonal':
          const dwDiag = (diagonalWidth || 10) * 1.5;
          return color2 ? <path d={`M${200 + dwDiag} ${dwDiag} L${200 - dwDiag} ${0 - dwDiag} L${0 - dwDiag} ${200 - dwDiag} L${dwDiag} ${200 + dwDiag} Z`} fill={color2} /> : null;
        case 'multipleDiagonals':
          if (!color2) return null;
          const stripsMult = [];
          for (let x = -100; x < 300; x += 25) {
            stripsMult.push(<rect key={`${x}-md`} x={x} y="-100" width="12" height="400" fill={color2} />);
          }
          return <g transform="rotate(45, 100, 100)">{stripsMult}</g>;
        case 'spfcStripes':
          return (
            <>
              {color2 && <rect x="0" y="120" width="190" height="15" fill={color2} />}
              {color3 && <rect x="0" y="140" width="190" height="15" fill={color3} />}
            </>
          );
        case 'horizontal':
          if (!color2) return null;
          const stripsHoriz = [];
          for (let y = 20; y < 200; y += 60) {
            stripsHoriz.push(<rect key={`${y}-h`} x="0" y={y} width="200" height="25" fill={color2} />);
          }
          return stripsHoriz;
        case 'triStripes':
          if (!hasTriStripes) return null;
          const stripsTri = [];
          // Pattern: color1 (thick) -> color2 (thin) -> color3 (thick) -> color2 (thin)
          // Thick = 21, Thin = 7. Cycle = 56. 7 is exactly 1/3 of 21.
          // Center gap (color1) at exactly center (x=100), meaning gap spans x=89.5 to 110.5
          for (let x = -22.5; x < 200; x += 56) {
            stripsTri.push(<rect key={`${x}-tri-2a`} x={x + 21} y="0" width="7" height="200" fill={color2} />);
            stripsTri.push(<rect key={`${x}-tri-3`} x={x + 28} y="0" width="21" height="200" fill={color3} />);
            stripsTri.push(<rect key={`${x}-tri-2b`} x={x + 49} y="0" width="7" height="200" fill={color2} />);
          }
          return stripsTri;
        case 'stripes':
          if (!color2) return null;
          const stripsVert = [];
          for (let x = -30; x < 200; x += 40) {
            stripsVert.push(<rect key={`${x}-v`} x={x} y="0" width="20" height="200" fill={color2} />);
          }
          return stripsVert;
        case 'solid':
        default:
          return null;
      }
    }

    if (criciumaStripes) {
      return (
        <>
          <rect x="0" y="0" width="200" height="80" fill={color} />
          <rect x="0" y="80" width="200" height="80" fill={color2} />
          <rect x="0" y="133" width="200" height="67" fill={color3} />
        </>
      );
    }
    if (centerVerticalStripes && color2 && color3) {
      return (
        <>
          <rect x="85" y="0" width="20" height="200" fill={color2} />
          <rect x="100" y="0" width="20" height="200" fill={color3} />
        </>
      );
    }
    if (dualDiagonal && color2 && color3) {
      const dw = (diagonalWidth || 10) * 1.5;
      return (
        <>
          <path d={`M200 0 L${200 - dw} ${0 - dw} L${0 - dw} ${200 - dw} L0 200 Z`} fill={color2} />
          <path d={`M${200 + dw} ${dw} L200 0 L0 200 L${dw} ${200 + dw} Z`} fill={color3} />
        </>
      );
    }
    if (diagonal && color2) {
      const dw = (diagonalWidth || 10) * 1.5;
      return <path d={`M${200 + dw} ${dw} L${200 - dw} ${0 - dw} L${0 - dw} ${200 - dw} L${dw} ${200 + dw} Z`} fill={color2} />;
    }
    if (multipleDiagonals && color2) {
      const strips = [];
      for (let x = -100; x < 300; x += 25) {
        strips.push(<rect key={`${x}-md`} x={x} y="-100" width="12" height="400" fill={color2} />);
      }
      return <g transform="rotate(45, 100, 100)">{strips}</g>;
    }
    if (spfcStripes && color2 && color3) {
      return (
        <>
          <rect x="0" y="120" width="190" height="15" fill={color2} />
          <rect x="0" y="140" width="190" height="15" fill={color3} />
        </>
      );
    }
    if (horizontal && color2) {
      const strips = [];
      for (let y = 20; y < 200; y += 60) {
        strips.push(<rect key={`${y}-h`} x="0" y={y} width="200" height="25" fill={color2} />);
      }
      return strips;
    }
    if (hasTriStripes) {
      const strips = [];
      for (let x = -22.5; x < 200; x += 56) {
        strips.push(<rect key={`${x}-1`} x={x + 21} y="0" width="7" height="200" fill={color2} />);
        strips.push(<rect key={`${x}-2`} x={x + 28} y="0" width="21" height="200" fill={color3} />);
        strips.push(<rect key={`${x}-3`} x={x + 49} y="0" width="7" height="200" fill={color2} />);
      }
      return strips;
    }
    if (hasStripes) {
      const strips = [];
      for (let x = 20; x < 200; x += 40) {
        strips.push(<rect key={`${x}-v`} x={x} y="0" width="20" height="200" fill={color2} />);
      }
      return strips;
    }
    return null;
  };

  const finalNumberColor = numberColor || (hasTriStripes || (color !== 'white' && color !== '#fff') ? 'white' : '#333');
  const finalCollarColor = collarColor || (hasTriStripes && color2 === 'white' ? 'white' : undefined);
  const finalNumberOutline = numberOutlineColor || 'transparent';

  const comShort = !!shortColor;
  const shirtNode = (
    <div className={`relative flex items-center justify-center ${comShort ? '' : className}`} style={{ width: `${64 * scale}px`, height: `${64 * scale}px` }}>
      <svg viewBox="0 0 200 200" className={`w-full h-full filter drop-shadow-md transition-all ${outOfPosition ? 'opacity-40 grayscale-[0.3]' : ''}`}>
        <defs>
          <mask id={maskId}>
            <path d={sleevePath} fill="white" />
          </mask>
          {gradient && color2 && (
            <linearGradient id={`${maskId}-grad`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} />
              <stop offset="100%" stopColor={color2} />
            </linearGradient>
          )}
        </defs>

        <g mask={`url(#${maskId})`}>
          <rect x="0" y="0" width="200" height="200" fill={gradient && color2 ? `url(#${maskId}-grad)` : color} />
          {renderPattern()}
          {sleeveColor && (
            <>
              <path d={pathLeftSleeve} fill={sleeveColor} />
              <path d={pathRightSleeve} fill={sleeveColor} />
            </>
          )}
        </g>

        {/* Collar (Neckband) */}
        {finalCollarColor && (
          <path d="M68 31 Q100 58 132 31 L135 38 Q100 65 65 38 Z" fill={finalCollarColor} stroke="rgba(0,0,0,0.1)" strokeWidth="0.5" />
        )}

        {/* Sleeve Cuffs */}
        {finalCollarColor && !longSleeves && (
          <>
            <path d="M15 95 L45 110 L48 103 L18 88 Z" fill={finalCollarColor} />
            <path d="M185 95 L155 110 L152 103 L182 88 Z" fill={finalCollarColor} />
          </>
        )}

        {/* Long Sleeve Cuffs (Wrists) */}
        {finalCollarColor && longSleeves && (
          <>
            <path d="M20 160 L45 165 L43 156 L18 151 Z" fill={finalCollarColor} />
            <path d="M180 160 L155 165 L157 156 L182 151 Z" fill={finalCollarColor} />
          </>
        )}

        <path d={sleevePath} fill="none" stroke="rgba(0,0,0,0.2)" strokeWidth="2" strokeLinejoin="round" />
        <path d="M70 30 Q100 55 130 30" fill="none" stroke="rgba(0,0,0,0.2)" strokeWidth="3" strokeLinecap="round" />
      </svg>
      {number !== undefined && (
        <span
          className={`absolute font-black pointer-events-none select-none transition-all ${outOfPosition ? 'opacity-50' : ''}`}
          style={{
            color: finalNumberColor,
            fontSize: `${20 * scale}px`,
            marginTop: `${0 * scale}px`,
            textShadow: finalNumberOutline === 'none'
              ? 'none'
              : finalNumberOutline !== 'transparent'
                ? `-0.5px -0.5px 0 ${finalNumberOutline}, 0.5px -0.5px 0 ${finalNumberOutline}, -0.5px 0.5px 0 ${finalNumberOutline}, 0.5px 0.5px 0 ${finalNumberOutline}`
                : (hasTriStripes ? `-1px -1px 0 ${color3}, 1px -1px 0 ${color3}, -1px 1px 0 ${color3}, 1px 1px 0 ${color3}` : '0 1px 2px rgba(0,0,0,0.3)')
          }}
        >
          {number}
        </span>
      )}
    </div>
  );

  if (!comShort) return shirtNode;
  // O short fica por baixo da camisa: duas pernas com a aba (barra da bainha) na cor do kit.
  const w = 64 * scale * 0.62, h = 64 * scale * 0.5;
  return (
    <div className={`flex flex-col items-center ${className}`}>
      {shirtNode}
      <svg viewBox="0 0 120 80" style={{ width: `${w}px`, height: `${h}px`, marginTop: `${-6 * scale}px` }} className={`filter drop-shadow-md transition-all ${outOfPosition ? 'opacity-40 grayscale-[0.3]' : ''}`}>
        <path d="M14 2 H106 L116 74 H66 L60 28 L54 74 H4 Z" fill={shortColor} stroke="rgba(0,0,0,0.2)" strokeWidth="2" strokeLinejoin="round" />
        {shortTrimColor && (
          <>
            <path d="M5.2 62 H53 L54 74 H4 Z" fill={shortTrimColor} />
            <path d="M67 62 H114.8 L116 74 H66 Z" fill={shortTrimColor} />
          </>
        )}
      </svg>
    </div>
  );
};
