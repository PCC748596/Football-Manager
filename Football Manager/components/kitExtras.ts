import { Team, KitDetails, getGKKitDetails } from '../types';

/*
Opcoes de cor do uniforme do goleiro e do juiz, na tela de selecao dos uniformes (KitSelection).
A primeira opcao de cada lista e o padrao do jogo; as seguintes rodam ao clicar na camisa.

GOLEIRO: os uniformes ja ajustados do clube (getGKKitDetails, indices 0 e 1) + 16 cores.
JUIZ: o traje sorteado (automatico) + os trajes ja ajustados do 3D (js/config/officials.js, RefereeModel.trajes) + 16 cores, sem o branco.
*/

export const PALETA_16: { nome: string; hex: string }[] = [
  { nome: 'Vermelho', hex: '#dc2626' }, { nome: 'Laranja', hex: '#ea580c' }, { nome: 'Amarelo', hex: '#facc15' },
  { nome: 'Lima', hex: '#a3e635' }, { nome: 'Verde', hex: '#16a34a' }, { nome: 'Verde-agua', hex: '#0d9488' },
  { nome: 'Ciano', hex: '#22d3ee' }, { nome: 'Azul', hex: '#2563eb' }, { nome: 'Marinho', hex: '#1e3a8a' },
  { nome: 'Roxo', hex: '#7c3aed' }, { nome: 'Rosa', hex: '#ec4899' }, { nome: 'Magenta', hex: '#c026d3' },
  { nome: 'Marrom', hex: '#92400e' }, { nome: 'Cinza', hex: '#6b7280' }, { nome: 'Preto', hex: '#14161a' },
  { nome: 'Branco', hex: '#ffffff' }
];

// O juiz nao usa branco: a 16.a cor e o vinho.
export const PALETA_JUIZ = PALETA_16.map(c => c.hex === '#ffffff' ? { nome: 'Vinho', hex: '#7f1d1d' } : c);

// Os trajes do 3D (espelho de RefereeModel.trajes, js/config/officials.js): camisa e calcao.
export const TRAJES_JUIZ: { nome: string; camisa: string; calcao: string; gola: string }[] = [
  { nome: 'Tudo preto', camisa: '#14161a', calcao: '#14161a', gola: '#f5e61b' },
  { nome: 'Tudo amarelo', camisa: '#f5e61b', calcao: '#f5e61b', gola: '#14161a' },
  { nome: 'Tudo azul', camisa: '#1f5fd1', calcao: '#1f5fd1', gola: '#f5e61b' },
  { nome: 'Azul claro', camisa: '#4fb8ff', calcao: '#14161a', gola: '#1f5fd1' },
  { nome: 'Verde limao', camisa: '#9be31a', calcao: '#14161a', gola: '#166534' },
  { nome: 'Amarelo fosfor.', camisa: '#e8ff1f', calcao: '#14161a', gola: '#14161a' },
  { nome: 'Rosa', camisa: '#ff6fb5', calcao: '#14161a', gola: '#be185d' },
  { nome: 'Lilas', camisa: '#b58cf0', calcao: '#14161a', gola: '#6d28d9' }
];

const ehClara = (hex: string) => {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.6;
};

export interface OpcaoGK { nome: string; details: KitDetails; }
export interface OpcaoJuiz { nome: string; camisa: string; calcao: string; gola: string; auto?: boolean; }

export const opcoesGK = (team: Team, fieldKitIdx: number): OpcaoGK[] => {
  const lista: OpcaoGK[] = [];
  for (const g of [0, 1] as const) {
    const d = getGKKitDetails(team, fieldKitIdx as 0 | 1 | 2, g);
    if (!lista.some(o => o.details.c1 === d.c1)) lista.push({ nome: g === 0 ? 'Padrao' : 'Alternativo', details: d });
  }
  for (const c of PALETA_16) {
    if (lista.some(o => o.details.c1.toLowerCase() === c.hex)) continue;
    const contraste = ehClara(c.hex) ? 'black' : 'white';
    lista.push({ nome: c.nome, details: { c1: c.hex, c2: undefined, c3: undefined, nc: contraste, noc: undefined, clc: contraste, diagonal: false } as KitDetails });
  }
  return lista;
};

// --- O traje AUTOMATICO, decidido aqui (e nao sorteado no jogo): a tela mostra EXATAMENTE o que o juiz vai vestir na entrada em campo. ---
// Mesma regra do 3D (Officials.sortearTraje): o primeiro traje, pela ordem de prioridade, cuja camisa fica a `DELTA_MIN` (CIE76, Lab) ou mais de qualquer camisa em campo;
// sem nenhum, o que mais se afasta.
const DELTA_MIN = 38;
const NOMES_DE_COR: Record<string, string> = { white: '#ffffff', black: '#000000', red: '#ff0000', blue: '#0000ff', yellow: '#ffff00', green: '#008000', gray: '#808080', grey: '#808080', orange: '#ffa500', purple: '#800080', pink: '#ffc0cb', silver: '#c0c0c0', gold: '#ffd700', lime: '#00ff00', cyan: '#00ffff', beige: '#f5f5dc', ivory: '#fffff0' };
const paraLab = (cor: string): [number, number, number] | null => {
  let h = (NOMES_DE_COR[String(cor).toLowerCase()] || String(cor)).replace('#', '');
  if (h.length === 3) h = h.split('').map(c => c + c).join('');
  if (!/^[0-9a-f]{6}$/i.test(h)) return null;
  const lin = (v: number) => { v /= 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
  const r = lin(parseInt(h.slice(0, 2), 16)), g = lin(parseInt(h.slice(2, 4), 16)), b = lin(parseInt(h.slice(4, 6), 16));
  const x = (0.4124 * r + 0.3576 * g + 0.1805 * b) / 0.95047, y = 0.2126 * r + 0.7152 * g + 0.0722 * b, z = (0.0193 * r + 0.1192 * g + 0.9505 * b) / 1.08883;
  const f = (t: number) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  return [116 * f(y) - 16, 500 * (f(x) - f(y)), 200 * (f(y) - f(z))];
};
export const trajeAutomatico = (coresEmCampo: string[]): OpcaoJuiz => {
  const labs = coresEmCampo.map(paraLab).filter((l): l is [number, number, number] => !!l);
  const folga = (t: { camisa: string }) => {
    const l = paraLab(t.camisa)!; let m = Infinity;
    for (const o of labs) m = Math.min(m, Math.hypot(l[0] - o[0], l[1] - o[1], l[2] - o[2]));
    return m;
  };
  const bom = TRAJES_JUIZ.find(t => folga(t) >= DELTA_MIN);
  const t = bom || TRAJES_JUIZ.reduce((a, b) => (folga(b) > folga(a) + 1e-6 ? b : a));
  return { nome: 'Automatico (' + t.nome + ')', camisa: t.camisa, calcao: t.calcao, gola: t.gola, auto: true };
};

export const opcoesJuiz = (coresEmCampo: string[] = []): OpcaoJuiz[] => [
  trajeAutomatico(coresEmCampo),
  ...TRAJES_JUIZ,
  // Gola em cor de contraste: amarela sobre camisa escura, azul sobre camisa clara.
  ...PALETA_JUIZ.map(c => ({ nome: c.nome, camisa: c.hex, calcao: '#14161a', gola: ehClara(c.hex) ? '#1f5fd1' : '#f5e61b' }))
];
