import React, { useState, useEffect, useMemo } from 'react';

// Frame format: 0=off, 1=on 
// " " (space) = off, "#" = on for easier visual design.

// Animation dimensions (Width x Height = 36 x 14)
const COLS = 40;
const ROWS = 14;

// --- FRAMES FOR NORMAL KICK GOAL ---
// Simple stick figure running, kicking a ball, goalie diving, ball in net.
const KICK_FRAMES = [
  // Frame 1: Ready to kick
  [
    "                                        ",
    "                                        ",
    "                                        ",
    "   ##                                 ##",
    "   ##      _O_               O        ##",
    "   ##       |               /|\\       ##",
    "   ##      / \\               |        ##",
    "   ##     /   \\     o       / \\       ##",
    "   ##                                 ##",
    "   ##                                 ##",
    "   ##                                 ##",
    "   ##                                 ##",
    "   ##                                 ##",
    "   ##                                 ##"
  ],
  // Frame 2: Kicking
  [
    "                                        ",
    "                                        ",
    "                                        ",
    "   ##                                 ##",
    "   ##      _O                O        ##",
    "   ##       |\\              /|\\       ##",
    "   ##      / |               |        ##",
    "   ##     |   \\   o         / \\       ##",
    "   ##                                 ##",
    "   ##                                 ##",
    "   ##                                 ##",
    "   ##                                 ##",
    "   ##                                 ##",
    "   ##                                 ##"
  ],
  // Frame 3: Ball flying
  [
    "                                        ",
    "                                        ",
    "                                        ",
    "   ##                                 ##",
    "   ##      _O_               O        ##",
    "   ##       |               /|\\       ##",
    "   ##      / \\       o       |        ##",
    "   ##     /   \\             / \\       ##",
    "   ##                                 ##",
    "   ##                                 ##",
    "   ##                                 ##",
    "   ##                                 ##",
    "   ##                                 ##",
    "   ##                                 ##"
  ],
  // Frame 4: Goalie diving
  [
    "                                        ",
    "                                        ",
    "                                        ",
    "   ##                                 ##",
    "   ##       O                 _       ##",
    "   ##      /|\\             \\ O /      ##",
    "   ##       |          o      |       ##",
    "   ##      / \\               / \\      ##",
    "   ##                                 ##",
    "   ##                                 ##",
    "   ##                                 ##",
    "   ##                                 ##",
    "   ##                                 ##",
    "   ##                                 ##"
  ],
  // Frame 5: Ball in net! Goalie on ground
  [
    "                                        ",
    "                                        ",
    "                                        ",
    "   ##                  o              ##",
    "   ##      \\O/                        ##",
    "   ##       |                         ##",
    "   ##      / \\          __O_          ##",
    "   ##     /   \\        /    \\         ##",
    "   ##                                 ##",
    "   ##                                 ##",
    "   ##                                 ##",
    "   ##                                 ##",
    "   ##                                 ##",
    "   ##                                 ##"
  ],
  // Frame 6: Celebration GOOOAL
  [
    "                                        ",
    "                                        ",
    "                                        ",
    "   ##        G O O O O A L L !        ##",
    "   ##                                 ##",
    "   ##                                 ##",
    "   ##      \\O/          \\O/           ##",
    "   ##       |            |            ##",
    "   ##      / \\          / \\           ##",
    "   ##                                 ##",
    "   ##                                 ##",
    "   ##                                 ##",
    "   ##                                 ##",
    "   ##                                 ##"
  ]
];

// --- FRAMES FOR HEADER GOAL ---
// Cross comes, player jumps, heads it in.
const HEADER_FRAMES = [
  // Frame 1: Ball high
  [
    "                                        ",
    "                                        ",
    "         o                              ",
    "   ##                                 ##",
    "   ##                        O        ##",
    "   ##       O               /|\\       ##",
    "   ##      /|\\               |        ##",
    "   ##      / \\              / \\       ##",
    "   ##                                 ##",
    "   ##                                 ##",
    "   ##                                 ##",
    "   ##                                 ##",
    "   ##                                 ##",
    "   ##                                 ##"
  ],
  // Frame 2: Ball approaching, player jumping
  [
    "                                        ",
    "                                        ",
    "             o                          ",
    "   ##       O                         ##",
    "   ##      /|\\               O        ##",
    "   ##       |               /|\\       ##",
    "   ##      / \\               |        ##",
    "   ##                       / \\       ##",
    "   ##                                 ##",
    "   ##                                 ##",
    "   ##                                 ##",
    "   ##                                 ##",
    "   ##                                 ##",
    "   ##                                 ##"
  ],
  // Frame 3: Heading the ball!
  [
    "                                        ",
    "                                        ",
    "   ##        O                 _      ##",
    "   ##       /|\\  o          \\ O /     ##",
    "   ##        |                 |      ##",
    "   ##       / \\               / \\     ##",
    "   ##                                 ##",
    "   ##                                 ##",
    "   ##                                 ##",
    "   ##                                 ##",
    "   ##                                 ##",
    "   ##                                 ##",
    "   ##                                 ##",
    "   ##                                 ##"
  ],
  // Frame 4: Goalie falls, ball in net
  [
    "                                        ",
    "                                        ",
    "   ##                                 ##",
    "   ##       O          o              ##",
    "   ##      /|\\                        ##",
    "   ##       |                         ##",
    "   ##      / \\            _O__        ##",
    "   ##                                 ##",
    "   ##                                 ##",
    "   ##                                 ##",
    "   ##                                 ##",
    "   ##                                 ##",
    "   ##                                 ##",
    "   ##                                 ##"
  ],
  // Frame 5: Celebration GOOOAL
  [
    "                                        ",
    "                                        ",
    "                                        ",
    "   ##        G O O O O A L L !        ##",
    "   ##                                 ##",
    "   ##                                 ##",
    "   ##      \\O/          \\O/           ##",
    "   ##       |            |            ##",
    "   ##      / \\          / \\           ##",
    "   ##                                 ##",
    "   ##                                 ##",
    "   ##                                 ##",
    "   ##                                 ##",
    "   ##                                 ##"
  ]
];

export type AnimationType = 'KICK' | 'HEADER';

interface Props {
  type?: AnimationType;
  onComplete?: () => void;
  fps?: number;
  inline?: boolean;
}

const RetroScoreboard: React.FC<Props> = ({ type, onComplete, fps = 4, inline = false }) => {
  const [frameIdx, setFrameIdx] = useState(0);
  
  // Pick animation type once on mount and keep it stable
  const animType = useMemo(() => type || (Math.random() > 0.5 ? 'KICK' : 'HEADER'), []);

  const frames = useMemo(() => {
    return animType === 'HEADER' ? HEADER_FRAMES : KICK_FRAMES;
  }, [animType]);

  useEffect(() => {
    const timer = setInterval(() => {
      setFrameIdx(prev => {
        // Stop animation if it reaches the end and hold on the last frame
        if (prev >= frames.length - 1) {
          clearInterval(timer);
          setTimeout(() => {
             if (onComplete) onComplete();
          }, 2000); // Wait 2s on GOAL text before closing
          return prev;
        }
        return prev + 1;
      });
    }, 1000 / fps);

    return () => clearInterval(timer);
  }, [frames.length, fps, onComplete]);

  // Normalize current frame into a grid of booleans (true = on, false = off)
  const grid = useMemo(() => {
    const frame = frames[Math.min(frameIdx, frames.length - 1)];
    const result: boolean[][] = [];
    for (let y = 0; y < ROWS; y++) {
      const rowStr = frame[y] || "";
      const rowVals: boolean[] = [];
      for (let x = 0; x < COLS; x++) {
        rowVals.push((rowStr[x] && rowStr[x] !== " ") ? true : false);
      }
      result.push(rowVals);
    }
    return result;
  }, [frameIdx, frames]);

  return (
    <div className={
      inline 
        ? "flex flex-col items-center justify-center animate-fade-in pointer-events-none scale-[0.3] origin-right" 
        : "absolute inset-x-8 top-1/2 -translate-y-1/2 z-[200] flex flex-col items-center justify-center animate-fade-in pointer-events-none"
    }>
      
      {/* SCOREBOARD CASING */}
      <div className="bg-[#111] p-4 rounded border-[8px] border-[#222] shadow-[0_20px_50px_rgba(0,0,0,0.8)] flex flex-col gap-2 relative">
        {/* Glow behind the board */}
        <div className="absolute inset-0 bg-orange-500/10 blur-[40px] -z-10" />

        {/* LED MATRIX */}
        <div className="bg-black p-4 rounded flex flex-col gap-[3px] border-2 border-[#1a1a1a] shadow-inner">
          {grid.map((row, rIdx) => (
            <div key={rIdx} className="flex gap-[3px]">
              {row.map((isOn, cIdx) => (
                <div 
                  key={`${rIdx}-${cIdx}`}
                  className={`w-2.5 h-2.5 rounded-full transition-colors duration-75 ${
                    isOn 
                      ? 'bg-orange-500 shadow-[0_0_8px_#f97316] scale-100 z-10' 
                      : 'bg-[#1a130c] shadow-inner scale-95 opacity-80'
                  }`}
                />
              ))}
            </div>
          ))}
        </div>
        
        <div className="absolute bottom-2 right-4 text-[6px] font-black text-slate-700 tracking-[0.3em] font-mono">
          PANASONIC
        </div>
      </div>
    </div>
  );
};

export default RetroScoreboard;
