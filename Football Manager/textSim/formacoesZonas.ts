/*
POSICOES POR ZONA — o que a aba Match Tactics deixa ajustar.

Cada formacao tem, para as duas fases (COM e SEM a bola), onze postos por ZONA da bola (grelha 3x3). As tabelas de base sao as do motor 3D (data/formacoes_zonas.js, copiadas
para `formacoesZonasBase.json`); o treinador pode mexer em qualquer posto de qualquer zona e fase, e o que muda fica em `Tactics.zoneOverrides` (so as diferencas).

Coordenadas, as do motor: x em [-1, 1] com +x o lado do lateral ESQUERDO (a esquerda do ecra), z em [-1, 1] com +1 a baliza adversaria (o topo do ecra).
Zona = linha * 3 + coluna: linha 0 o terco defensivo, 2 o ofensivo; coluna 0 a bola com x < -corredorX (a direita do ecra), 2 a esquerda.
*/
import base from './formacoesZonasBase.json';
import type { Tactics, ZoneOverrides } from '../types';

export type FaseZona = 'com' | 'sem';

const B: any = base;

export const ZONAS = { corredorX: B.corredorX as number, terco: B.terco as number, meiaLargura: B.meiaLargura as number, meiaAltura: B.meiaAltura as number };

/** O centro (x, z normalizados) da zona onde a bola esta. */
export const centroDaZona = (zona: number): { x: number; z: number } => {
  const cx = [-(ZONAS.corredorX + ZONAS.meiaLargura) / 2, 0, (ZONAS.corredorX + ZONAS.meiaLargura) / 2];
  const cz = [-(ZONAS.terco + ZONAS.meiaAltura) / 2, 0, (ZONAS.terco + ZONAS.meiaAltura) / 2];
  return { x: cx[zona % 3] / ZONAS.meiaLargura, z: cz[Math.floor(zona / 3)] / ZONAS.meiaAltura };
};

export const formacaoTemTabela = (formacao: string): boolean => !!B.formacoes[formacao];

/** Os onze postos da tabela de base para uma formacao, fase e zona. */
export const postosDeBase = (formacao: Tactics['formation'] | string, fase: FaseZona, zona: number): { x: number; z: number }[] => {
  const f = B.formacoes[formacao];
  if (!f) return [];
  return (f[fase][zona] as { x: number; z: number }[]).map(p => ({ x: p.x, z: p.z }));
};

/** Os onze postos com os ajustes do treinador por cima. */
export const postosEfetivos = (formacao: string, over: ZoneOverrides | undefined, fase: FaseZona, zona: number): { x: number; z: number }[] => {
  const postos = postosDeBase(formacao, fase, zona);
  const o = over?.[fase]?.[String(zona)];
  if (o) for (const k of Object.keys(o)) { const i = Number(k); if (postos[i]) postos[i] = { x: o[k][0], z: o[k][1] }; }
  return postos;
};

const limpar = (over: ZoneOverrides): ZoneOverrides | undefined => {
  const r: ZoneOverrides = {};
  for (const fase of ['com', 'sem'] as FaseZona[]) {
    const f = over[fase]; if (!f) continue;
    const zonas: Record<string, Record<string, [number, number]>> = {};
    for (const z of Object.keys(f)) if (f[z] && Object.keys(f[z]).length) zonas[z] = f[z];
    if (Object.keys(zonas).length) r[fase] = zonas;
  }
  return (r.com || r.sem) ? r : undefined;
};

/** Move um posto: devolve os ajustes novos (sem mexer nos antigos). Um posto de volta a base apaga o ajuste. */
export const moverPosto = (formacao: string, over: ZoneOverrides | undefined, fase: FaseZona, zona: number, slot: number, x: number, z: number): ZoneOverrides | undefined => {
  const novo: ZoneOverrides = JSON.parse(JSON.stringify(over || {}));
  novo[fase] = novo[fase] || {};
  const zk = String(zona);
  novo[fase]![zk] = novo[fase]![zk] || {};
  const r3 = (v: number) => Math.round(v * 1000) / 1000;
  const b = postosDeBase(formacao, fase, zona)[slot];
  if (b && Math.abs(b.x - x) < 0.0006 && Math.abs(b.z - z) < 0.0006) delete novo[fase]![zk][String(slot)];
  else novo[fase]![zk][String(slot)] = [r3(x), r3(z)];
  return limpar(novo);
};

/** Apaga os ajustes de uma zona, de uma fase inteira ou de tudo (`zona` e/ou `fase` omitidos). */
export const repor = (over: ZoneOverrides | undefined, fase?: FaseZona, zona?: number): ZoneOverrides | undefined => {
  if (!over) return undefined;
  if (!fase) return undefined;
  const novo: ZoneOverrides = JSON.parse(JSON.stringify(over));
  if (zona === undefined) delete novo[fase]; else if (novo[fase]) delete novo[fase]![String(zona)];
  return limpar(novo);
};

export const temAjustes = (over: ZoneOverrides | undefined): boolean => !!over && !!(over.com || over.sem);

/*
ESPELHAR. O posto espelhado de `i` e o de `j`: o lateral esquerdo (LB) troca com o direito (RB), LM com RM, LW com RW; os da mesma funcao (CB, CM, DM, CF...) com o que fica do outro lado.
Sai da tabela de base (zona do meio, com a bola): para cada posto, o de rotulo espelhado mais perto de (-x, z).
*/
const ESPELHO_ROTULO: Record<string, string> = { LB: 'RB', RB: 'LB', LM: 'RM', RM: 'LM', LW: 'RW', RW: 'LW' };
export const parceiroDoEspelho = (formacao: string, rotulos: string[]): number[] => {
  const ref = postosDeBase(formacao, 'com', 4);
  return ref.map((p, i) => {
    const alvo = ESPELHO_ROTULO[rotulos[i]] || rotulos[i];
    let melhor = i, d = Infinity;
    ref.forEach((q, j) => {
      if (rotulos[j] !== alvo) return;
      const dd = Math.hypot(q.x + p.x, q.z - p.z);
      if (dd < d) { d = dd; melhor = j; }
    });
    return melhor;
  });
};

/** A zona do outro lado do campo (a coluna espelhada, a mesma linha). */
export const zonaEspelhada = (zona: number): number => Math.floor(zona / 3) * 3 + (2 - (zona % 3));

/** Escreve em `destino` os postos de `origem` espelhados (x trocado de sinal, cada posto passa para o seu parceiro). `origem === destino` vira a zona ao contrario. */
export const espelharZona = (formacao: string, rotulos: string[], over: ZoneOverrides | undefined, fase: FaseZona, origem: number, destino: number): ZoneOverrides | undefined => {
  const par = parceiroDoEspelho(formacao, rotulos);
  const src = postosEfetivos(formacao, over, fase, origem);
  let r = over;
  src.forEach((p, i) => { r = moverPosto(formacao, r, fase, destino, par[i], -p.x, p.z); });
  return r;
};

/** A fase toda: cada zona da coluna de `zonaRef` e copiada, espelhada, para a coluna oposta; a coluna do meio vira ao contrario. */
export const espelharFase = (formacao: string, rotulos: string[], over: ZoneOverrides | undefined, fase: FaseZona, zonaRef: number): ZoneOverrides | undefined => {
  const col = zonaRef % 3;
  let r = over;
  for (let lin = 0; lin < 3; lin++) {
    const o = lin * 3 + col;
    r = espelharZona(formacao, rotulos, r, fase, o, col === 1 ? o : lin * 3 + (2 - col));
  }
  return r;
};
