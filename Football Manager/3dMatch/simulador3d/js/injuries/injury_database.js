export const INJURY_DATABASE = [
    // --- LESÕES SIMPLES ---
    {
        id: 'SIM01', nome: 'Tostão na Coxa (Pancada)', tipo: 'Simples', parteCorpo: 'Coxa',
        baseDiasMin: 2, baseDiasMax: 5, estadosPossiveisInMatch: { Forced: 0, Requested: 30, Hurt: 70 }, quedaFisPorDia: 0.5
    },
    {
        id: 'SIM02', nome: 'Fisgada na Posterior da Coxa', tipo: 'Simples', parteCorpo: 'Coxa',
        baseDiasMin: 10, baseDiasMax: 21, estadosPossiveisInMatch: { Forced: 10, Requested: 80, Hurt: 10 }, quedaFisPorDia: 1.0
    },
    {
        id: 'SIM03', nome: 'Corte no Supercílio', tipo: 'Simples', parteCorpo: 'Rosto',
        baseDiasMin: 1, baseDiasMax: 3, estadosPossiveisInMatch: { Forced: 20, Requested: 0, Hurt: 80 }, quedaFisPorDia: 0.1
    },
    {
        id: 'SIM04', nome: 'Torcicolo Forte', tipo: 'Simples', parteCorpo: 'Pescoco',
        baseDiasMin: 3, baseDiasMax: 7, estadosPossiveisInMatch: { Forced: 5, Requested: 45, Hurt: 50 }, quedaFisPorDia: 0.3
    },
    {
        id: 'SIM05', nome: 'Bolhas Severas no Pé', tipo: 'Simples', parteCorpo: 'Pe',
        baseDiasMin: 2, baseDiasMax: 6, estadosPossiveisInMatch: { Forced: 0, Requested: 20, Hurt: 80 }, quedaFisPorDia: 0.2
    },
    {
        id: 'SIM06', nome: 'Pancada no Tornozelo', tipo: 'Simples', parteCorpo: 'Tornozelo',
        baseDiasMin: 3, baseDiasMax: 8, estadosPossiveisInMatch: { Forced: 5, Requested: 40, Hurt: 55 }, quedaFisPorDia: 0.6
    },
    {
        id: 'SIM07', nome: 'Leve Entorse no Joelho', tipo: 'Simples', parteCorpo: 'Joelho',
        baseDiasMin: 14, baseDiasMax: 25, estadosPossiveisInMatch: { Forced: 20, Requested: 60, Hurt: 20 }, quedaFisPorDia: 1.2
    },
    {
        id: 'SIM08', nome: 'Espasmo nas Costas', tipo: 'Simples', parteCorpo: 'Costas',
        baseDiasMin: 5, baseDiasMax: 12, estadosPossiveisInMatch: { Forced: 15, Requested: 65, Hurt: 20 }, quedaFisPorDia: 0.7
    },
    {
        id: 'SIM09', nome: 'Sobrecarga na Panturrilha', tipo: 'Simples', parteCorpo: 'Panturrilha',
        baseDiasMin: 7, baseDiasMax: 15, estadosPossiveisInMatch: { Forced: 5, Requested: 70, Hurt: 25 }, quedaFisPorDia: 0.8
    },
    {
        id: 'SIM10', nome: 'Desidratação / Exaustão', tipo: 'Simples', parteCorpo: 'Geral',
        baseDiasMin: 1, baseDiasMax: 3, estadosPossiveisInMatch: { Forced: 10, Requested: 50, Hurt: 40 }, quedaFisPorDia: 0.0
    },

    // --- LESÕES COMPLEXAS ---
    {
        id: 'COM01', nome: 'Rompimento de Ligamento Cruzado (LCA)', tipo: 'Complexa', parteCorpo: 'Joelho',
        baseDiasMin: 180, baseDiasMax: 270, estadosPossiveisInMatch: { Forced: 100, Requested: 0, Hurt: 0 }, quedaFisPorDia: 1.5
    },
    {
        id: 'COM02', nome: 'Estiramento Grau 3 na Coxa', tipo: 'Complexa', parteCorpo: 'Coxa',
        baseDiasMin: 45, baseDiasMax: 90, estadosPossiveisInMatch: { Forced: 80, Requested: 20, Hurt: 0 }, quedaFisPorDia: 1.3
    },
    {
        id: 'COM03', nome: 'Fratura de Metatarso', tipo: 'Complexa', parteCorpo: 'Pe',
        baseDiasMin: 60, baseDiasMax: 120, estadosPossiveisInMatch: { Forced: 90, Requested: 10, Hurt: 0 }, quedaFisPorDia: 1.4
    },
    {
        id: 'COM04', nome: 'Entorse Grave no Tornozelo', tipo: 'Complexa', parteCorpo: 'Tornozelo',
        baseDiasMin: 30, baseDiasMax: 60, estadosPossiveisInMatch: { Forced: 50, Requested: 40, Hurt: 10 }, quedaFisPorDia: 1.0
    },
    {
        id: 'COM05', nome: 'Luxação no Ombro', tipo: 'Complexa', parteCorpo: 'Ombro',
        baseDiasMin: 30, baseDiasMax: 70, estadosPossiveisInMatch: { Forced: 95, Requested: 5, Hurt: 0 }, quedaFisPorDia: 1.1
    },
    {
        id: 'COM06', nome: 'Concussão Cerebral', tipo: 'Complexa', parteCorpo: 'Cabeca',
        baseDiasMin: 10, baseDiasMax: 25, estadosPossiveisInMatch: { Forced: 100, Requested: 0, Hurt: 0 }, quedaFisPorDia: 0.5
    },
    {
        id: 'COM07', nome: 'Fratura de Fíbula / Tíbia', tipo: 'Complexa', parteCorpo: 'Perna',
        baseDiasMin: 120, baseDiasMax: 210, estadosPossiveisInMatch: { Forced: 100, Requested: 0, Hurt: 0 }, quedaFisPorDia: 1.5
    },
    {
        id: 'COM08', nome: 'Lesão no Menisco', tipo: 'Complexa', parteCorpo: 'Joelho',
        baseDiasMin: 40, baseDiasMax: 90, estadosPossiveisInMatch: { Forced: 40, Requested: 60, Hurt: 0 }, quedaFisPorDia: 1.2
    },
    {
        id: 'COM09', nome: 'Pubalgia Crônica', tipo: 'Complexa', parteCorpo: 'Virilha',
        baseDiasMin: 60, baseDiasMax: 150, estadosPossiveisInMatch: { Forced: 20, Requested: 50, Hurt: 30 }, quedaFisPorDia: 1.1
    },
    {
        id: 'COM10', nome: 'Fratura na Costela', tipo: 'Complexa', parteCorpo: 'Costas',
        baseDiasMin: 25, baseDiasMax: 50, estadosPossiveisInMatch: { Forced: 80, Requested: 20, Hurt: 0 }, quedaFisPorDia: 1.0
    }
];