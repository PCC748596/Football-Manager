import { Position } from '../types';

/*
O OVERALL a partir dos 4 atributos, por posicao. E a formula que o `generatePlayer` (textSim/dataGenerator.ts) sempre usou; vive aqui para a base Sub-20
(textSim/youth.ts) recalcular o overall pela MESMA logica, sem copiar a conta.
*/
export const pesosDoOverall = (position: Position): { def: number; pas: number; drb: number; sht: number } => {
  if (position === Position.GK) return { def: 0.7, pas: 0.15, drb: 0, sht: 0.15 };
  if ([Position.LB, Position.CB, Position.RB].includes(position)) return { def: 0.7, pas: 0.2, drb: 0, sht: 0.1 };
  if ([Position.DM, Position.LM, Position.CM, Position.RM, Position.AM].includes(position)) return { def: 0.2, pas: 0.3, drb: 0.3, sht: 0.2 };
  return { def: 0.1, pas: 0.1, drb: 0.3, sht: 0.5 };
};

export const calcularSkill = (position: Position, def: number, pas: number, drb: number, sht: number): number => {
  const w = pesosDoOverall(position);
  return Math.round(def * w.def + pas * w.pas + drb * w.drb + sht * w.sht);
};
