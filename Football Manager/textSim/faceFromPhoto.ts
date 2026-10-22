/*
DA FOTO PARA A FACE DO JOGO — le uma foto no padrao do site de faces (rosto de frente, luz uniforme, fundo claro e liso, cabeca e ombros centralizados) e devolve os parametros da face
em blocos (`FaceCustom`: pele, cabelo, estilo do cabelo, barba, oculos, largura). Tudo local, sem enviar a foto a ninguem, e puro: recebe os pixels (RGBA) e devolve numeros — por isso
tambem corre em teste, com uma foto de referencia.

COMO LE A FOTO (sem modelo de IA):
  1. a regiao util e a de cima (a faixa de baixo leva a marca d'agua e a camisa);
  2. o FUNDO e a mediana de duas faixas junto as bordas laterais, a meia altura;
  3. a PELE: um pixel de pele (matiz quente, R > G > B, nem muito escuro nem estourado) parecido com a mediana do miolo do rosto; o rosto e o conjunto desses pixels na coluna central;
  4. o CABELO: o que nao e fundo nem pele acima da testa (e a cor e a media dos mais escuros); a altura dele em relacao ao rosto da o estilo (careca, raspado, curto, topete), e o que
     sobra ao lado do rosto, abaixo das orelhas, da o cabelo longo;
  5. a BARBA: na parte de baixo do rosto, a fracao de pixels mais escuros que a pele (e pouco vermelhos: labios nao contam): quase tudo = cheia, uma parte = rala, so por cima da boca = bigode;
  6. a LARGURA: a proporcao largura/altura do rosto;
  7. OCULOS nao se detectam (a leitura automatica erraria): ficam desligados, o editor deixa ligar.
A leitura e uma SUGESTAO: o editor mostra a previa e deixa ajustar cada campo.
*/
import type { EstiloBarba, EstiloCabelo, FaceCustom } from './aparencia';

export interface Imagem { data: ArrayLike<number>; width: number; height: number; }
export interface LeituraFace { face: FaceCustom; avisos: string[]; detalhe: { fundo: string; rosto: { x0: number; x1: number; y0: number; y1: number }; razaoCabelo: number; fracaoBarba: number; fracaoBigode: number; razaoRosto: number }; }

type Rgb = [number, number, number];
const hex = (c: Rgb) => '#' + c.map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
const luma = (c: Rgb) => 0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2];
const dist = (a: Rgb, b: Rgb) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
const mediana = (xs: number[]) => { if (!xs.length) return 0; const s = [...xs].sort((a, b) => a - b); return s[Math.floor(s.length / 2)]; };
const medianaCor = (cs: Rgb[]): Rgb => [mediana(cs.map(c => c[0])), mediana(cs.map(c => c[1])), mediana(cs.map(c => c[2]))];

/** Pele: matiz quente (R > G > B), com saturacao moderada e luminosidade que nao e nem sombra fechada nem brilho estourado. */
const pareceCarne = (c: Rgb): boolean => {
  const [r, g, b] = c, l = luma(c);
  if (!(r > g && g > b)) return false;
  if (l < 55 || l > 245) return false;
  const sat = (r - b) / Math.max(1, r);
  return sat > 0.12 && sat < 0.75 && (r - g) / Math.max(1, r) < 0.35;
};

export const lerFaceDaFoto = (img: Imagem): LeituraFace => {
  const { width: W, height: H, data } = img;
  const avisos: string[] = [];
  const px = (x: number, y: number): Rgb => { const i = (y * W + x) * 4; return [data[i], data[i + 1], data[i + 2]]; };
  const yMax = Math.floor(H * 0.86);          // a faixa de baixo (marca d'agua, camisa) fica de fora

  // 2. fundo: as faixas junto as bordas laterais, a meia altura
  const amostrasFundo: Rgb[] = [];
  for (let y = Math.floor(H * 0.12); y < Math.floor(H * 0.55); y++) {
    for (let x = Math.floor(W * 0.07); x < Math.floor(W * 0.16); x++) amostrasFundo.push(px(x, y));
    for (let x = Math.floor(W * 0.84); x < Math.floor(W * 0.93); x++) amostrasFundo.push(px(x, y));
  }
  const fundo = medianaCor(amostrasFundo);
  if (luma(fundo) < 150) avisos.push('O fundo da foto nao e claro: a leitura do cabelo pode errar.');

  // 3. pele: a semente e a mediana dos pixels de carne no miolo do rosto
  const miolo: Rgb[] = [];
  for (let y = Math.floor(H * 0.34); y < Math.floor(H * 0.58); y++) for (let x = Math.floor(W * 0.38); x < Math.floor(W * 0.62); x++) { const c = px(x, y); if (pareceCarne(c)) miolo.push(c); }
  if (miolo.length < 30) avisos.push('Nao encontrei o rosto no centro da foto: use uma foto de frente, com o rosto centralizado.');
  const semente = miolo.length ? medianaCor(miolo) : ([205, 160, 130] as Rgb);
  // "Parecido com a pele": a mesma cromaticidade (a luz de um lado so escurece a pele, nao muda o tom) e uma luminosidade entre 55% e 135% da da semente.
  const crom = (c: Rgb): [number, number] => { const t = c[0] + c[1] + c[2] || 1; return [c[0] / t, c[1] / t]; };
  const cromSemente = crom(semente), lumaSemente = luma(semente);
  const eSemelhante = (c: Rgb) => {
    if (!pareceCarne(c)) return false;
    const k = crom(c), l = luma(c);
    return Math.hypot(k[0] - cromSemente[0], k[1] - cromSemente[1]) < 0.045 && l > lumaSemente * 0.55 && l < lumaSemente * 1.35;
  };

  // o rosto: linhas/colunas com pele suficiente, na faixa central
  const x0c = Math.floor(W * 0.2), x1c = Math.floor(W * 0.8);
  const contaLinha = (y: number) => { let n = 0; for (let x = x0c; x < x1c; x++) if (eSemelhante(px(x, y))) n++; return n; };
  const linhas: number[] = []; for (let y = 0; y < yMax; y++) linhas.push(contaLinha(y));
  const pico = Math.max(...linhas, 1);
  let y0 = 0; while (y0 < yMax && linhas[y0] < pico * 0.3) y0++;
  // colunas do rosto: a largura a altura das bochechas
  // a linha das bochechas: a mais larga nos primeiros 30% da altura da foto abaixo da testa (ali ainda nao ha barba)
  let yB = y0; for (let y = y0; y < Math.min(yMax, y0 + Math.floor(H * 0.3)); y++) if (linhas[y] > linhas[yB]) yB = y;
  let x0 = x0c, x1 = x1c;
  const naLinha = (x: number) => { let n = 0; for (let y = yB - 4; y <= yB + 4; y++) if (eSemelhante(px(x, y))) n++; return n >= 3; };
  // do centro para fora, ate o primeiro buraco de mais de 4 colunas sem pele (a orelha entra; o cabelo e o fundo, nao)
  const centro = Math.floor((Math.floor(W * 0.2) + Math.floor(W * 0.8)) / 2);
  x0 = x1 = centro;
  for (let x = centro, buraco = 0; x > 0 && buraco < 5; x--) { if (naLinha(x)) { x0 = x; buraco = 0; } else buraco++; }
  for (let x = centro, buraco = 0; x < W - 1 && buraco < 5; x++) { if (naLinha(x)) { x1 = x; buraco = 0; } else buraco++; }
  // O QUEIXO pela proporcao do rosto (da linha do cabelo ao queixo ~ 1.3 x a largura): nem a pele nem o fundo o marcam — a barba corta a mascara de pele e o pescoco tem a largura do queixo.
  const larg = Math.max(1, x1 - x0);
  const y1 = Math.min(yMax - 1, y0 + Math.round(larg * 1.3));
  const alt = Math.max(1, y1 - y0);
  const razaoRosto = larg / alt;

  // a pele a usar: a mediana de testa e bochechas (sem a zona da barba)
  const peleAmostras: Rgb[] = [];
  for (let y = y0 + Math.floor(alt * 0.08); y < y0 + Math.floor(alt * 0.5); y++) for (let x = x0 + Math.floor(larg * 0.2); x < x1 - Math.floor(larg * 0.2); x++) { const c = px(x, y); if (eSemelhante(c)) peleAmostras.push(c); }
  const pele = peleAmostras.length ? medianaCor(peleAmostras) : semente;

  // 4. cabelo: o que nao e fundo nem pele logo acima da testa
  const naoFundoNemPele = (c: Rgb) => dist(c, fundo) > 38 && !eSemelhante(c);
  let topoCabelo = y0;
  const colunasCabelo = (y: number) => { let n = 0; for (let x = x0; x < x1; x++) if (naoFundoNemPele(px(x, y))) n++; return n; };
  while (topoCabelo > 0 && colunasCabelo(topoCabelo - 1) > larg * 0.18) topoCabelo--;
  const alturaCabelo = y0 - topoCabelo;
  const razaoCabelo = alturaCabelo / alt;
  const cabeloAmostras: Rgb[] = [];
  for (let y = topoCabelo; y < y0 + Math.floor(alt * 0.05); y++) for (let x = x0; x < x1; x++) { const c = px(x, y); if (naoFundoNemPele(c)) cabeloAmostras.push(c); }
  cabeloAmostras.sort((a, b) => luma(a) - luma(b));
  const escuros = cabeloAmostras.slice(0, Math.max(1, Math.floor(cabeloAmostras.length * 0.5)));
  const cabelo: Rgb = escuros.length ? medianaCor(escuros) : ([40, 32, 28] as Rgb);

  let estilo: EstiloCabelo;
  if (razaoCabelo < 0.04 || cabeloAmostras.length < 15) estilo = 'careca';
  else if (razaoCabelo < 0.13) estilo = 'raspado';
  else if (razaoCabelo < 0.34) estilo = 'curto';
  else estilo = 'topete';
  // cabelo longo: cabelo (nao fundo, nao pele) ao lado do rosto, abaixo das orelhas
  let ladoLongo = 0, ladoTotal = 0;
  for (let y = y0 + Math.floor(alt * 0.55); y < y1; y++) {
    for (let x = Math.max(0, x0 - Math.floor(larg * 0.22)); x < x0; x++) { ladoTotal++; if (dist(px(x, y), fundo) > 38 && luma(px(x, y)) < luma(pele) * 0.6) ladoLongo++; }
    for (let x = x1; x < Math.min(W, x1 + Math.floor(larg * 0.22)); x++) { ladoTotal++; if (dist(px(x, y), fundo) > 38 && luma(px(x, y)) < luma(pele) * 0.6) ladoLongo++; }
  }
  if (ladoTotal && ladoLongo / ladoTotal > 0.35) estilo = 'longo';

  // 5. barba: a parte de baixo do rosto
  const lp = luma(pele);
  const maisEscuro = (c: Rgb) => luma(c) < lp * 0.84 && ((c[0] - c[1]) / Math.max(1, c[0]) < 0.30);
  const regiao = (ya: number, yb: number, xa: number, xb: number): number => {
    let n = 0, d = 0;
    for (let y = Math.floor(ya); y < Math.floor(yb); y++) for (let x = Math.floor(xa); x < Math.floor(xb); x++) { d++; const c = px(x, y); if (pareceCarne(c) || luma(c) < lp) { if (maisEscuro(c)) n++; } }
    return d ? n / d : 0;
  };
  const fracaoBarba = regiao(y0 + alt * 0.68, y1 - 1, x0 + larg * 0.15, x1 - larg * 0.15);
  const fracaoBigode = regiao(y0 + alt * 0.56, y0 + alt * 0.66, x0 + larg * 0.3, x1 - larg * 0.3);
  let barba: EstiloBarba = 'nenhuma';
  if (fracaoBarba > 0.55) barba = 'cheia';
  else if (fracaoBarba > 0.14) barba = 'rala';
  else if (fracaoBigode > 0.35) barba = 'bigode';

  const largura = 1;   // a largura do rosto nao se mede bem de uma foto so (o queixo e estimado): fica neutra e ajusta-se no editor
  if (estilo === 'careca') avisos.push('Cabelo curto demais ou muito parecido com a pele: confira o estilo do cabelo.');

  return {
    face: { pele: hex(pele), cabelo: hex(cabelo), estilo, barba, oculos: false, largura: Math.round(largura * 100) / 100 },
    avisos,
    detalhe: { fundo: hex(fundo), rosto: { x0, x1, y0, y1 }, razaoCabelo, fracaoBarba, fracaoBigode, razaoRosto }
  };
};
