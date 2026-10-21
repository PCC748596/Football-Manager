/*
O lado do manager da ponte com o simulador 3D (3dMatch/simulador3d, ver js/narracao/ponte.js la dentro).
O motor 3D decide a partida e gera a narracao. Dois usos:
  . jogarOculto  corre a partida do utilizador sem desenhar (modo "2D simulador": so a narracao) e devolve o resultado inteiro;
  . montarPayload  monta a mensagem `iniciar` (usada tambem pelo Simulador3DView, que mostra o 3D num iframe).
*/
import { Team, Player, Fixture, MatchEvent, Tactics, FORMATIONS, getKitDetails, getGKKitDetails, kitShorts, ehVerde, KitDetails } from '../types';

const CAMINHO_SIMULADOR = '/simulador3d/index.html';
/*
O simulador corre NOUTRO PROCESSO do navegador: um iframe de outro "site" (localhost <-> 127.0.0.1) tem a sua propria thread, e o 3D
deixa de disputar o processador com a pagina do manager (React a re-renderizar a cada tick). Fora do dev (outro host) cai no mesmo
endereco. O postMessage funciona entre origens.
*/
export const urlSimulador = (): string => {
  const { protocol, hostname, port } = window.location;
  const outro = hostname === 'localhost' ? '127.0.0.1' : hostname === '127.0.0.1' ? 'localhost' : null;
  return outro ? protocol + '//' + outro + (port ? ':' + port : '') + CAMINHO_SIMULADOR : CAMINHO_SIMULADOR;
};

export interface LadoPayload {
  equipa: { id: string; name: string; city?: string; logoUrl?: string; cores?: string[]; lineup: string[]; bench: string[]; tactics: any; cobradores?: any };
  jogadoresPorId: Record<string, any>;
  formacao: { nome: string; slots: { id: number; x: number; y: number; label: string }[] };
}

export interface ResultadoMotor {
  placar: { casa: number; fora: number };
  posse: { casa: number; fora: number };
  estatisticas: any;
  golos: { minuto: number; equipa: 'casa' | 'fora'; jogador: any; assistente: any; proprioGolo: boolean }[];
  cartoes: { minuto: number; equipa: 'casa' | 'fora'; jogador: any; cor: string; segundoAmarelo: boolean }[];
  eventos: any[];
  relato: { minuto: number; texto: string; importante?: boolean }[];
}

const ladoDe = (team: Team, players: Player[]): LadoPayload => {
  const porId: Record<string, any> = {};
  // O onze e os substitutos (o banco 3D mostra os 10 da aba Tactics).
  const ids = [...team.lineup.filter(Boolean), ...(((team as any).bench || []) as string[]).filter(Boolean)];
  for (const id of ids) {
    const p = players.find(x => x.id === id);
    if (p) porId[id] = p;
  }
  const formacao = team.tactics?.formation || '4-4-2';
  return {
    equipa: { id: team.id, name: team.name, city: (team as any).city, logoUrl: (team as any).logoUrl, cores: [team.primaryColor, team.secondaryColor, team.tertiaryColor], lineup: team.lineup, bench: (team as any).bench || [], tactics: team.tactics, cobradores: (team as any).setPieceTakers || null },
    jogadoresPorId: porId,
    formacao: { nome: formacao, slots: FORMATIONS[formacao as keyof typeof FORMATIONS] }
  };
};

// Cor legivel para o numero quando o kit nao diz: claro sobre escuro e vice-versa.
const ehClara = (c?: string) => !!c && /^(white|yellow|#fff|#ffffff|#fde047|#fef08a|#eab308)/i.test(c);

// O kit do manager (getKitDetails) no formato de uniforme do simulador (js/config/uniformes.js).
export const uniformeDoKit = (k: KitDetails, camisaDeLinha = true) => {
  /*
  A CAMISA DO 3D E O DESENHO DO ICONE DO KIT (ShirtIcon): `padrao: 'kit'` leva as cores e as bandeiras do kit e o 3D pinta as mesmas
  formas (pintarKitComoIcone, js/pose.js) — listras, faixas, diagonais, degrade, as faixas do Criciuma e do Sao Paulo. Lisa quando o
  icone seria liso. `manga` e a cor das mangas do kit (sc).
  */
  const tem = (c?: string) => !!c && c !== 'transparent';
  const hasTri = tem(k.c3) && k.c3 !== k.c1 && k.c3 !== k.c2;
  const hasStripes = !k.diagonal && !k.gradient && tem(k.c2) && k.c2 !== k.c1;
  const desenhado = !!(k.criciumaStripes || (k.centerVerticalStripes && k.c2 && k.c3) || (k.dualDiagonal && k.c2 && k.c3) || (k.diagonal && k.c2) ||
    (k.multipleDiagonals && k.c2) || (k.spfcStripes && k.c2 && k.c3) || (k.horizontal && k.c2) || (k.gradient && k.c2) || hasTri || hasStripes);
  const camisa: any = desenhado
    ? { padrao: 'kit', cores: [k.c1, k.c2, k.c3].filter(Boolean), kit: {
        c1: k.c1, c2: k.c2, c3: k.c3, diagonal: k.diagonal, diagonalWidth: k.diagonalWidth, horizontal: k.horizontal,
        multipleDiagonals: k.multipleDiagonals, dualDiagonal: k.dualDiagonal, centerVerticalStripes: k.centerVerticalStripes,
        gradient: k.gradient, spfcStripes: k.spfcStripes, criciumaStripes: k.criciumaStripes, cruzMalta: k.cruzMalta } }
    : { padrao: 'solido', cores: [k.c1] };
  if (k.sc) camisa.manga = k.sc;
  const sh = kitShorts(k, camisaDeLinha);
  return {
    camisa,
    // A aba e a barra da bainha do short (pose.js: calcao.barra), na cor da aba do kit.
    calcao: sh.aba ? { padrao: 'solido', cores: [sh.cor], barra: { cor: sh.aba, altura: 0.14 } } : { padrao: 'solido', cores: [sh.cor] },
    meiao: k.meiao ? { padrao: 'faixas', cores: k.meiao.cores, pesos: k.meiao.pesos, divisoes: k.meiao.cores.length } : { padrao: 'solido', cores: [k.c1] },
    corPrincipal: k.c1,
    gola: k.clc,   // cor da gola do kit (KitDetails.clc); sem ela o 3D usa o cinza de sempre
    numero: k.nc || (ehClara(k.c1) ? '#000000' : '#ffffff'),
    contorno: k.noc || 'rgba(0,0,0,0.8)',
    // Número do short: branco em short verde (o da camisa pode ser outro, ver `numero`).
    ...(ehVerde(sh.cor) ? { numeroCalcao: '#ffffff', contornoCalcao: 'rgba(0,0,0,0.8)' } : {}),
    mangaComprida: !camisaDeLinha
  };
};

export const montarPayload = (casa: Team, fora: Team, players: Player[], userTeamId: string, extra: Record<string, any> = {}, kits?: { casa?: number; fora?: number }) => {
  const lado = (t: Team, idx?: number) => {
    const i = ((idx ?? (t === casa ? 0 : 1)) as 0 | 1 | 2);
    // O escudo na camisa (pose.js): a imagem do clube ou as tres cores em barras. O Vasco-RJ fica sem ele (a camisa tem a cruz de malta).
    const escudo = t.name === 'Vasco-RJ' ? null : { logo: (t as any).logoUrl || null, cores: [t.primaryColor, t.secondaryColor, t.tertiaryColor] };
    return { ...ladoDe(t, players), uniforme: { titular: i === 0, linha: { ...uniformeDoKit(getKitDetails(t, i)), escudo }, gk: { ...uniformeDoKit(getGKKitDetails(t, i), false), escudo },
      // Os outros kits do time (para as camisas da torcida).
      outros: ([0, 1, 2] as const).filter(j => j !== i).map(j => uniformeDoKit(getKitDetails(t, j))) } };
  };
  return {
    para: 'simulador3d', tipo: 'iniciar',
    taticaDe: casa.id === userTeamId ? 'casa' : 'fora',
    casa: lado(casa, kits?.casa), fora: lado(fora, kits?.fora),
    ...extra
  };
};

// Procura o jogador do manager pelo id do motor (o numero real do 'p-<numero>').
const jogadorDoMotor = (j: any, lado: Team, players: Player[]): Player | undefined => {
  if (!j) return undefined;
  const alvo = j.id;
  const doTime = players.filter(p => p.teamId === lado.id);
  const porId = alvo !== null && alvo !== undefined ? doTime.find(p => /(\d+)$/.exec(p.id)?.[1] === String(alvo)) : undefined;
  return porId || doTime.find(p => p.name === j.nome);
};

/*
Converte o resultado do motor em eventos do manager. O motor conta o relogio em minutos de jogo (1..), o mesmo do manager.
Tipos: GOLO->GOAL, REMATE defendido->SAVE, REMATE fora/bloqueado->MISS, FALTA->FOUL (+CARD), CANTO->CORNER, IMPEDIMENTO->OFFSIDE,
INTERVALO->HALF_TIME, FIM->FULL_TIME. A frase narrada vai na descricao.
*/
export const eventosDoManager = (r: ResultadoMotor, casa: Team, fora: Team, players: Player[]): MatchEvent[] => {
  const out: MatchEvent[] = [];
  const time = (e: any) => (e.equipa === 'TeamA' ? casa : fora);
  for (const e of r.eventos) {
    const t = e.equipa ? time(e) : null;
    const p = t ? jogadorDoMotor(e.jogador, t, players) : undefined;
    const base = { minute: e.minuto, teamId: t?.id, playerId: p?.id };
    const nome = e.jogador?.nome || p?.name || '';
    switch (e.tipo) {
      case 'GOLO': {
        const ass = t ? jogadorDoMotor(e.assistente, t, players) : undefined;
        out.push({ ...base, type: 'GOAL', description: e.texto || (nome ? `Gol de ${nome}` : 'Gol'), assistPlayerId: ass?.id });
        break;
      }
      case 'REMATE':
        if (e.desfecho === 'defesa') {
          const adv = t === casa ? fora : casa;
          out.push({ minute: e.minuto, type: 'SAVE', description: e.texto || `${nome} finaliza e o goleiro defende`, teamId: t?.id, playerId: p?.id, shooterId: p?.id });
          void adv;
        } else if (e.desfecho === 'fora' || e.desfecho === 'bloqueado') {
          out.push({ ...base, type: 'MISS', description: e.texto || `${nome} finaliza ${e.desfecho === 'fora' ? 'para fora' : 'e a defesa bloqueia'}`, shooterId: p?.id });
        }
        break;
      case 'FALTA':
        out.push({ ...base, type: 'FOUL', description: e.texto || `Falta de ${nome}` });
        if (e.cartao) {
          out.push({ ...base, type: 'CARD', description: `${e.cartao === 'vermelho' ? '🟥 RED CARD' : '🟨'} ${nome}` });
        }
        break;
      case 'CANTO': out.push({ minute: e.minuto, type: 'CORNER', description: 'Escanteio', teamId: t?.id }); break;
      case 'IMPEDIMENTO': out.push({ minute: e.minuto, type: 'OFFSIDE', description: 'Impedimento', teamId: t?.id }); break;
      case 'INTERVALO': out.push({ minute: e.minuto, type: 'HALF_TIME', description: 'Fim do primeiro tempo' }); break;
      case 'FIM': out.push({ minute: e.minuto, type: 'FULL_TIME', description: 'Fim de jogo' }); break;
      default: break;
    }
  }
  return out;
};

// Os campos do Fixture que o resultado do motor preenche.
export const aplicarResultado = (f: Fixture, r: ResultadoMotor, casa: Team, fora: Team, players: Player[]): Fixture => {
  const A = r.estatisticas?.TeamA || {}, B = r.estatisticas?.TeamB || {};
  const poss: ('home' | 'away')[] = [];
  const nMin = Math.max(1, ...r.eventos.map(e => e.minuto));
  for (let i = 0; i < nMin; i++) poss.push((i / nMin) * 100 < r.posse.casa ? 'home' : 'away');
  return {
    ...f,
    events: eventosDoManager(r, casa, fora, players),
    homeScore: r.placar.casa, awayScore: r.placar.fora,
    homePossession: r.posse.casa, awayPossession: r.posse.fora,
    possessionTimeline: poss,
    homeShots: A.remates, awayShots: B.remates, homeShotsOnTarget: A.rematesNoAlvo, awayShotsOnTarget: B.rematesNoAlvo, homeXG: A.xg, awayXG: B.xg,
    homeCorners: A.cantos, awayCorners: B.cantos,
    homeFouls: A.faltas, awayFouls: B.faltas,
    homeLineup: casa.lineup.filter(Boolean), awayLineup: fora.lineup.filter(Boolean),
    played: false
  };
};

/*
Corre a partida em modo oculto num iframe escondido, ao ritmo maximo, e devolve o resultado. `aoProgresso` recebe os minutos
simulados (0..90) para uma barra de progresso. O iframe e removido no fim.
*/
export const jogarOculto = (payload: any, aoProgresso?: (minuto: number) => void, limiteMs = 180000): Promise<ResultadoMotor> =>
  new Promise((resolve, reject) => {
    const iframe = document.createElement('iframe');
    iframe.src = urlSimulador() + '?oculto=1&embutido=1';
    iframe.style.cssText = 'position:fixed;left:-9999px;top:0;width:640px;height:360px;border:0;visibility:hidden';
    let fim = false;
    const limpar = () => { window.removeEventListener('message', ouvir); clearTimeout(tmo); iframe.remove(); };
    const terminar = (fn: () => void) => { if (fim) return; fim = true; limpar(); fn(); };
    const ouvir = (e: MessageEvent) => {
      if (e.source !== iframe.contentWindow || !e.data || e.data.fonte !== 'simulador3d') return;
      const m = e.data;
      if (m.tipo === 'pronto') {
        iframe.contentWindow!.postMessage({ ...payload, modo: 'oculto', ritmo: 'maximo', fimEmMinutos: 90 }, '*');
      } else if (m.tipo === 'estado') aoProgresso?.(m.minuto);
      else if (m.tipo === 'fim') terminar(() => resolve(m.resultado));
      else if (m.tipo === 'erro') terminar(() => reject(new Error(m.mensagem)));
    };
    const tmo = setTimeout(() => terminar(() => reject(new Error('O simulador 3D demorou demais.'))), limiteMs);
    window.addEventListener('message', ouvir);
    document.body.appendChild(iframe);
  });

/*
A TATICA, NOS DOIS SENTIDOS (mensagens `tatica` / `tatica_alterada` da ponte). O manager tem numeros (pressao 0-100, linha 30-100,
objetividade 0-100) e o motor tem tres niveis, por isso cada lado e agrupado e a volta usa um valor tipico do nivel.
  estilo      Very Defensive..Very Offensive   <->  estilo (muito_defensiva..muito_ofensiva)
  pressure    <34 low, <67 balanced, resto high   <->  pressaoDefensiva
  defensiveLine  <53 low, <77 medium, resto high  <->  linhaDefensiva
  tempo (objetividade)  >=67 direct, <=33 possession, resto positional  <->  teamPlayStyle
  focusSectors  Left/Center/Right  <->  setores esq/cen/dir
A agressividade (aggression) nao tem par no motor.
*/
const ESTILO_PARA_MOTOR: Record<string, string> = { 'Very Defensive': 'muito_defensiva', 'Defensive': 'defesa', 'Balanced': 'balanceado', 'Offensive': 'ataque', 'Very Offensive': 'muito_ofensiva' };
const ESTILO_DO_MOTOR: Record<string, string> = Object.fromEntries(Object.entries(ESTILO_PARA_MOTOR).map(([k, v]) => [v, k]));
const SETOR_PARA_MOTOR: Record<string, string> = { Left: 'esq', Center: 'cen', Right: 'dir' };
const SETOR_DO_MOTOR: Record<string, string> = { esq: 'Left', cen: 'Center', dir: 'Right' };

export const taticaParaMotor = (t: Tactics) => ({
  estilo: ESTILO_PARA_MOTOR[t.style] || 'balanceado',
  pressaoDefensiva: t.pressure < 34 ? 'low' : t.pressure < 67 ? 'balanced' : 'high',
  linhaDefensiva: t.defensiveLine < 53 ? 'low' : t.defensiveLine < 77 ? 'medium' : 'high',
  teamPlayStyle: t.tempo >= 67 ? 'direct' : t.tempo <= 33 ? 'possession' : 'positional',
  setores: (t.focusSectors || []).map(x => SETOR_PARA_MOTOR[x]).filter(Boolean)
});

// O que o painel do 3D mudou, em campos do manager; so entram os campos cujo NIVEL mudou (o numero exato do manager e mantido).
export const taticaDoMotor = (m: any, atual: Tactics): Partial<Tactics> => {
  const a = taticaParaMotor(atual);
  const r: Partial<Tactics> = {};
  if (m.estilo && m.estilo !== a.estilo && ESTILO_DO_MOTOR[m.estilo]) r.style = ESTILO_DO_MOTOR[m.estilo] as Tactics['style'];
  if (m.pressaoDefensiva && m.pressaoDefensiva !== a.pressaoDefensiva) r.pressure = ({ low: 20, balanced: 50, high: 85 } as any)[m.pressaoDefensiva];
  if (m.linhaDefensiva && m.linhaDefensiva !== a.linhaDefensiva) r.defensiveLine = ({ low: 40, medium: 65, high: 90 } as any)[m.linhaDefensiva];
  if (m.teamPlayStyle && m.teamPlayStyle !== a.teamPlayStyle) r.tempo = ({ possession: 20, positional: 50, direct: 80 } as any)[m.teamPlayStyle];
  if (Array.isArray(m.setores) && JSON.stringify([...m.setores].sort()) !== JSON.stringify([...a.setores].sort())) {
    r.focusSectors = m.setores.map((x: string) => SETOR_DO_MOTOR[x]).filter(Boolean) as Tactics['focusSectors'];
  }
  return r;
};
