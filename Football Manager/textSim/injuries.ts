export type InjurySeverity = 'LIGHT' | 'MEDIUM' | 'SEVERE';

export interface InjuryDefinition {
    name: string;
    severity: InjurySeverity;
    minDays: number;
    maxDays: number;
}

export const INJURY_DATABASE: InjuryDefinition[] = [
    // LIGHT INJURIES
    { name: 'Pancada na coxa', severity: 'LIGHT', minDays: 1, maxDays: 3 },
    { name: 'Entorse leve de tornozelo', severity: 'LIGHT', minDays: 2, maxDays: 5 },
    { name: 'Distensão leve de panturrilha', severity: 'LIGHT', minDays: 3, maxDays: 7 },
    { name: 'Dor lombar muscular', severity: 'LIGHT', minDays: 2, maxDays: 6 },
    { name: 'Contusão no ombro', severity: 'LIGHT', minDays: 3, maxDays: 7 },
    { name: 'Estiramento leve de adutor', severity: 'LIGHT', minDays: 4, maxDays: 8 },
    { name: 'Bolha ou problema no pé', severity: 'LIGHT', minDays: 1, maxDays: 4 },
    { name: 'Torcicolo', severity: 'LIGHT', minDays: 1, maxDays: 3 },
    { name: 'Contusão no joelho sem lesão estrutural', severity: 'LIGHT', minDays: 3, maxDays: 10 },
    { name: 'Sobrecarga muscular', severity: 'LIGHT', minDays: 2, maxDays: 14 },

    // MEDIUM INJURIES
    { name: 'Distensão muscular moderada', severity: 'MEDIUM', minDays: 15, maxDays: 30 },
    { name: 'Lesão de adutor grau 2', severity: 'MEDIUM', minDays: 20, maxDays: 40 },
    { name: 'Lesão de posterior de coxa grau 2', severity: 'MEDIUM', minDays: 21, maxDays: 45 },
    { name: 'Entorse moderada de tornozelo', severity: 'MEDIUM', minDays: 20, maxDays: 40 },
    { name: 'Lesão no menisco leve', severity: 'MEDIUM', minDays: 30, maxDays: 60 },
    { name: 'Tendinite patelar', severity: 'MEDIUM', minDays: 15, maxDays: 35 },
    { name: 'Luxação de ombro', severity: 'MEDIUM', minDays: 30, maxDays: 50 },
    { name: 'Fratura simples de dedo do pé', severity: 'MEDIUM', minDays: 20, maxDays: 40 },
    { name: 'Estiramento de ligamento do joelho', severity: 'MEDIUM', minDays: 25, maxDays: 50 },
    { name: 'Pubalgia', severity: 'MEDIUM', minDays: 20, maxDays: 60 },

    // SEVERE INJURIES
    { name: 'Ruptura do LCA (ACL)', severity: 'SEVERE', minDays: 180, maxDays: 300 },
    { name: 'Ruptura do tendão de Aquiles', severity: 'SEVERE', minDays: 180, maxDays: 365 },
    { name: 'Fratura de tíbia/fíbula', severity: 'SEVERE', minDays: 120, maxDays: 300 },
    { name: 'Lesão multiligamentar de joelho', severity: 'SEVERE', minDays: 240, maxDays: 365 },
    { name: 'Ruptura completa de posterior de coxa', severity: 'SEVERE', minDays: 90, maxDays: 180 },
    { name: 'Fratura de tornozelo', severity: 'SEVERE', minDays: 90, maxDays: 180 },
    { name: 'Ruptura de menisco com cirurgia', severity: 'SEVERE', minDays: 90, maxDays: 180 },
    { name: 'Hérnia de disco com cirurgia', severity: 'SEVERE', minDays: 120, maxDays: 240 },
    { name: 'Fratura de metatarso', severity: 'SEVERE', minDays: 60, maxDays: 120 },
    { name: 'Lesão crônica grave na cartilagem do joelho', severity: 'SEVERE', minDays: 120, maxDays: 300 },
];

export const getRandomInjuryBySeverity = (severity: InjurySeverity): InjuryDefinition & { daysOut: number } => {
    const pool = INJURY_DATABASE.filter(i => i.severity === severity);
    const injury = pool[Math.floor(Math.random() * pool.length)];
    const daysOut = Math.floor(Math.random() * (injury.maxDays - injury.minDays + 1)) + injury.minDays;
    
    return { ...injury, daysOut };
};
