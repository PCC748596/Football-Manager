/*
A CAIXA DE ENTRADA (INBOX) — os e-mails de boas-vindas e os avisos de todos os setores do clube: treino/fisio, jogos importantes, olheiros (base), financas, negociacoes e contratos.

Funcoes puras: o contexto do jogo (context/GameContext.tsx) chama `avisosDoDia` a cada mudanca de data e `adicionar` guarda o que for novo. Cada mensagem leva `keys`
(as razoes que a geraram, ex. `contract|CRITICO|p-12`): uma razao so gera UMA mensagem, mesmo que o motor volte a passar pelo mesmo dia ou o save seja recarregado.
Os textos saem no idioma do jogo (EN ou PT).
*/
import { textoDoMotivo } from './transferencias';
import { tx, ordinal, textoDaLesao, comIdioma } from './idiomas';
import type { Language } from '../types';
import type { Player } from '../types';
import { EstadoContrato, estadoDoContrato } from './contracts';
import type { Faixa } from './managerExpectations';

export type CategoriaInbox = 'WELCOME' | 'BOARD' | 'TRAINING' | 'MATCH' | 'SCOUTING' | 'FINANCE' | 'TRANSFER' | 'CONTRACT' | 'SQUAD';
export type AbaDoJogo = 'DASHBOARD' | 'TRANSFERS' | 'SQUAD' | 'LEAGUE' | 'FINANCES' | 'STATISTICS' | 'TACTICS' | 'FIXTURES' | 'TRAINING_VIEW' | 'WORLD';

export interface MensagemInbox {
  id: string;
  keys: string[];                 // razoes (dedupe)
  date: string;                   // ISO do jogo
  categoria: CategoriaInbox;
  de: string;                     // quem escreve (cargo)
  assunto: string;
  corpo: string;
  lida: boolean;
  alta?: boolean;                 // prioridade alta: destaca na lista
  ir?: AbaDoJogo;                 // botao "abrir" a aba relacionada
}

/** O idioma das mensagens: os textos daqui so tem EN e PT; os outros idiomas saem em ingles (`L`). */
export type Idioma = Language;
export const LIMITE_INBOX = 400;

let contador = 0;
const criar = (m: Omit<MensagemInbox, 'id' | 'lida'>): MensagemInbox => ({ ...m, id: `msg-${m.date}-${(contador++).toString(36)}-${Math.random().toString(36).slice(2, 6)}`, lida: false });
const dataLonga = (iso: string, lang: Idioma) => {
  const [y, m, d] = iso.split('-').map(Number);
  const meses = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map(s => tx(s));
  return `${String(d).padStart(2, '0')} ${meses[m - 1]} ${y}`;
};

/** Acrescenta so as mensagens cujas razoes ainda nao existem; ordena (mais nova primeiro) e limita o tamanho (descarta as lidas mais antigas primeiro). */
export const adicionar = (atuais: MensagemInbox[], novas: MensagemInbox[]): MensagemInbox[] => {
  if (!novas.length) return atuais;
  const vistas = new Set<string>();
  atuais.forEach(m => m.keys.forEach(k => vistas.add(k)));
  const aceitas: MensagemInbox[] = [];
  for (const m of novas) {
    const keys = m.keys.filter(k => !vistas.has(k));
    if (m.keys.length && !keys.length) continue;       // todas as razoes ja geraram mensagem
    keys.forEach(k => vistas.add(k));
    aceitas.push(m.keys.length ? { ...m, keys } : m);
  }
  if (!aceitas.length) return atuais;
  let todas = [...aceitas, ...atuais].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  if (todas.length > LIMITE_INBOX) {
    const sobra = todas.length - LIMITE_INBOX;
    const idsFora = new Set(todas.filter(m => m.lida).slice(-sobra).map(m => m.id));
    todas = todas.filter(m => !idsFora.has(m.id)).slice(0, LIMITE_INBOX);
  }
  return todas;
};

// ------------------------------------------------------------------ boas-vindas
export interface EntradaBoasVindas {
  hoje: string; lang: Idioma; treinador: string;
  clube: string; estadio: string; cidade: string; liga: string;
  forca: number; posicaoNaForca: number; clubesNaLiga: number;
  caixa: string;                   // ja formatado na moeda do jogo
  tamanhoDoElenco: number; contratosEmAtencao: number;
}

const boasVindas_ = (e: EntradaBoasVindas): MensagemInbox[] => {
  const { lang: l, hoje } = e;
  const topo = e.posicaoNaForca <= Math.max(3, Math.round(e.clubesNaLiga * 0.15)), baixo = e.posicaoNaForca > Math.round(e.clubesNaLiga * 0.7);
  const meta = topo ? tx('fight for the title and a place in the continental cups')
    : baixo ? tx('secure the club\'s place in the division and build for the future')
    : tx('finish in the top half of the table and avoid any scare at the bottom');
  const k = (s: string) => [`welcome|${s}`];
  return [
    criar({ keys: k('board'), date: hoje, categoria: 'BOARD', de: tx('Chairman'), ir: 'LEAGUE',
      assunto: tx('Welcome to {v0}, {v1}', { v0: e.clube, v1: e.treinador }),
      corpo: tx('On behalf of the board, welcome to {v0}. We play at {v1} in {v2}, and this season we compete in the {v3}.\n\nYour squad ranks {v4} of {v5} on overall strength ({v6}). The board\'s expectation is to {v7}.\n\nYou have our full support. Good luck.', { v0: e.clube, v1: e.estadio, v2: e.cidade, v3: e.liga, v4: ordinal(e.posicaoNaForca), v5: e.clubesNaLiga, v6: e.forca, v7: meta }) }),
    criar({ keys: k('football'), date: hoje, categoria: 'SQUAD', de: tx('Director of Football'), ir: 'SQUAD',
      assunto: tx('Squad overview'),
      corpo: tx('You have {v0} professionals available.', { v0: e.tamanhoDoElenco }) + ' ' + (e.contratosEmAtencao ? tx('{v0} contract(s) expire within 12 months — I recommend negotiating renewals early.', { v0: e.contratosEmAtencao }) : tx('No contract expires within the next 12 months.'))
        + '\n\n' + tx('The Sub-20 academy has 20 youngsters aged 15 to 20. Promotions to the first team are always your decision; players who turn 21 leave the academy.') }),
    criar({ keys: k('training'), date: hoje, categoria: 'TRAINING', de: tx('Assistant Manager'), ir: 'TRAINING_VIEW',
      assunto: tx('Training plan'),
      corpo: tx('The squad is in pre-season and fitness is still low. Set the weekly training schedule, balance workload and recovery, and avoid heavy sessions right before matches. I will report injuries and fitness problems here.') }),
    criar({ keys: k('finance'), date: hoje, categoria: 'FINANCE', de: tx('Finance Director'), ir: 'FINANCES',
      assunto: tx('Club finances'),
      corpo: tx('The club cash balance is {v0}. Wages are paid every week, so keep an eye on the payroll before signing players. I will send a monthly summary and warn you if the balance gets tight.', { v0: e.caixa }) }),
    criar({ keys: k('scout'), date: hoje, categoria: 'SCOUTING', de: tx('Head of Scouting'), ir: 'SQUAD',
      assunto: tx('Scouting department'),
      corpo: tx('Our scouts follow the Sub-20 academy every month. Potential is shown as a star estimate — it is an opinion, not a guarantee, and it becomes more reliable as the players get older. A monthly development report will arrive here.') })
  ];
};

// ------------------------------------------------------------------ avisos automaticos
export interface JogoDoUtilizador {
  id: string; date: string; adversario: string; casa: boolean; jogado: boolean;
  golsPro: number; golsContra: number;
  derbi: boolean;                  // mesmo estado/cidade
  copa?: string;                   // rotulo da fase se for copa (LIBERT-16, SULA-G ...)
  amistoso?: boolean;
}
export interface EntradaAvisos {
  hoje: string; lang: Idioma;
  elenco: Player[];                // profissionais do utilizador
  jogos: JogoDoUtilizador[];
  jovens: { nome: string; posicao: string; delta: number; estrelas: number; ovr: number; mudou: boolean }[];   // relatorio mais recente da base do utilizador
  mesDoRelatorio: string;          // yyyy-mm
  caixa: number; folhaSemanal: number; formatar: (n: number) => string;
  janelaAberta: boolean;
  proximaAbertura?: { data: string; dias: number } | null;   // proxima abertura da janela (null se ja aberta)
}

export const DIAS_AVISO_JANELA = 30;

const diasEntre = (a: string, b: string) => Math.round((Date.UTC(+b.slice(0, 4), +b.slice(5, 7) - 1, +b.slice(8, 10)) - Date.UTC(+a.slice(0, 4), +a.slice(5, 7) - 1, +a.slice(8, 10))) / 86400000);

/** As razoes que a caixa ja conhece (para os avisos agrupados listarem so o que e novo). */
export const chavesDe = (inbox: MensagemInbox[]): Set<string> => new Set(inbox.flatMap(m => m.keys));

const avisosDoDia_ = (e: EntradaAvisos, vistas: Set<string> = new Set()): MensagemInbox[] => {
  const { hoje, lang: l } = e;
  const out: MensagemInbox[] = [];

  // JANELA DE TRANSFERENCIAS: aviso quando faltam DIAS_AVISO_JANELA dias (ou menos) para abrir; uma razao por abertura.
  const ab = e.proximaAbertura;
  if (ab && ab.dias > 0 && ab.dias <= DIAS_AVISO_JANELA && !vistas.has(`window|open|${ab.data}`)) {
    out.push(criar({ keys: [`window|open|${ab.data}`], date: hoje, categoria: 'TRANSFER', ir: 'TRANSFERS', de: tx('Director of Football'),
      assunto: tx('Transfer window opens in {v0} day(s)', { v0: ab.dias }),
      corpo: tx('The transfer window opens on {v0}. Review the squad, contracts and budget, and shortlist your targets.', { v0: dataLonga(ab.data, l) }) }));
  }

  // CONTRATOS: um aviso por estado, agrupando os jogadores que entraram nele (uma razao por jogador e estado).
  (['ATENCAO', 'CRITICO'] as EstadoContrato[]).forEach(estado => {
    const lista = e.elenco.filter(p => estadoDoContrato(p.contract, hoje) === estado && !vistas.has(`contract|${estado}|${p.id}`));
    if (!lista.length) return;
    const critico = estado === 'CRITICO';
    const linhas = lista.map(p => `• ${p.name} (${p.position}, OVR ${p.skill}) — ${l === 'PT' ? 'vence em' : 'expires'} ${dataLonga(p.contract!.end, l)}`).join('\n');
    out.push(criar({
      keys: lista.map(p => `contract|${estado}|${p.id}`), date: hoje, categoria: 'CONTRACT', alta: critico, ir: 'FINANCES', de: tx('Director of Football'),
      assunto: critico ? tx('Critical: {v0} contract(s) end within 6 months', { v0: lista.length }) : tx('{v0} contract(s) end within 12 months', { v0: lista.length }),
      corpo: `${linhas}\n\n${critico ? tx('Renew now or sell: when the contract ends the player leaves for free.') : tx('Negotiate a renewal, or consider selling while he still has market value.')}`
    }));
  });

  // JOGOS: resultado (ate 7 dias depois), e aviso 2 dias antes de jogo importante (classico, copa).
  e.jogos.forEach(j => {
    if (j.amistoso) return;
    const dias = diasEntre(hoje, j.date);
    if (j.jogado && dias <= 0 && dias >= -7) {
      const r = j.golsPro > j.golsContra ? tx('Win') : j.golsPro < j.golsContra ? tx('Defeat') : tx('Draw');
      const placar = j.casa ? `${j.golsPro} x ${j.golsContra}` : `${j.golsContra} x ${j.golsPro}`;
      out.push(criar({ keys: [`result|${j.id}`], date: j.date, categoria: 'MATCH', ir: 'FIXTURES', de: tx('Press Office'),
        alta: !!j.copa || j.derbi,
        assunto: `${r}: ${j.casa ? `${tx('vs')} ${j.adversario}` : `${tx('at')} ${j.adversario}`} (${placar})${j.copa ? ` · ${j.copa}` : ''}`,
        corpo: (j.casa ? tx('Full time: {v0} at home against {v1}, {v2}.', { v0: r.toLowerCase(), v1: j.adversario, v2: placar }) : tx('Full time: {v0} away at {v1}, {v2}.', { v0: r.toLowerCase(), v1: j.adversario, v2: placar })) + (j.derbi ? ' ' + tx('A local derby.') : '') }));
    }
    if (!j.jogado && dias >= 1 && dias <= 2 && (j.derbi || j.copa)) {
      out.push(criar({ keys: [`preview|${j.id}`], date: hoje, categoria: 'MATCH', alta: true, ir: 'TACTICS', de: tx('Assistant Manager'),
        assunto: j.copa ? tx('Cup match in {v0} day(s): {v1}', { v0: dias, v1: j.adversario }) : tx('Derby in {v0} day(s): {v1}', { v0: dias, v1: j.adversario }),
        corpo: (j.copa ? `${j.copa} — ` : '') + (j.casa ? tx('Home against {v0} on {v1}.', { v0: j.adversario, v1: dataLonga(j.date, l) }) : tx('Away against {v0} on {v1}.', { v0: j.adversario, v1: dataLonga(j.date, l) })) + ' ' + tx('This one matters: check the lineup, fitness and set pieces.') }));
    }
  });

  // TREINO / FISIO: lesoes novas (uma razao por lesao: o dia em que o jogador volta e fixo).
  e.elenco.filter(p => p.injury).forEach(p => {
    const volta = addDias(hoje, p.injury!.daysOut);
    const grave = p.injury!.severity === 'SEVERE';
    out.push(criar({ keys: [`injury|${p.id}|${volta}`], date: hoje, categoria: 'TRAINING', alta: grave, ir: 'SQUAD', de: tx('Physio'),
      assunto: tx('Injury: {v0} ({v1})', { v0: p.name, v1: textoDaLesao(p.injury!.type) }),
      corpo: tx('{v0} ({v1}, OVR {v2}) is injured — {v3}, about {v4} day(s) out (back around {v5}).', { v0: p.name, v1: p.position, v2: p.skill, v3: textoDaLesao(p.injury!.type), v4: p.injury!.daysOut, v5: dataLonga(volta, l) }) }));
  });
  // fisico: na vespera de jogo com o elenco muito cansado
  const proximo = e.jogos.find(j => !j.jogado && diasEntre(hoje, j.date) === 1);
  if (proximo && e.elenco.length) {
    const saudaveis = e.elenco.filter(p => !p.injury);
    const media = saudaveis.reduce((s, p) => s + p.fitness, 0) / Math.max(1, saudaveis.length);
    if (media < 70) out.push(criar({ keys: [`fitness|${proximo.id}`], date: hoje, categoria: 'TRAINING', alta: media < 55, ir: 'TRAINING_VIEW', de: tx('Assistant Manager'),
      assunto: tx('Squad fitness at {v0}% before the match', { v0: Math.round(media) }),
      corpo: tx('Tomorrow\'s match against {v0}: the average fitness of the available players is {v1}%. Consider rotating tired players and keeping today\'s training light.', { v0: proximo.adversario, v1: Math.round(media) }) }));
  }

  // OLHEIROS: no primeiro relatorio de cada mes da base.
  if (e.jovens.length && e.mesDoRelatorio) {
    const subiram = e.jovens.filter(j => j.delta > 0).sort((a, b) => b.delta - a.delta);
    const talento = [...e.jovens].sort((a, b) => b.estrelas - a.estrelas || b.ovr - a.ovr)[0];
    const parados = e.jovens.filter(j => !j.mudou).length;
    out.push(criar({ keys: [`scout|${e.mesDoRelatorio}`], date: hoje, categoria: 'SCOUTING', ir: 'SQUAD', de: tx('Head of Scouting'),
      assunto: tx('Academy development report — {v0}', { v0: e.mesDoRelatorio }),
      corpo: tx('{v0} of {v1} academy players improved their overall this month', { v0: subiram.length, v1: e.jovens.length })
        + (subiram[0] ? tx('; the biggest rise was {v0} ({v1}, +{v2})', { v0: subiram[0].nome, v1: subiram[0].posicao, v2: subiram[0].delta }) : '') + '. '
        + tx('{v0} showed no change at all.', { v0: parados }) + '\n\n'
        + tx('Best prospect (our estimate): {v0} ({v1}, OVR {v2}) — {v3}.', { v0: talento.nome, v1: talento.posicao, v2: talento.ovr, v3: '★'.repeat(talento.estrelas) + '☆'.repeat(5 - talento.estrelas) }) + '\n\n'
        + tx('Open Squad → Sub-20 for the full monthly report.') }));
  }

  // FINANCAS: resumo no dia 1 de cada mes e alerta de caixa apertado (uma vez por mes).
  const mes = hoje.slice(0, 7), semanas = e.folhaSemanal > 0 ? e.caixa / e.folhaSemanal : 99;
  if (hoje.endsWith('-01')) out.push(criar({ keys: [`finance|${mes}`], date: hoje, categoria: 'FINANCE', ir: 'FINANCES', de: tx('Finance Director'),
    assunto: tx('Monthly finance summary — {v0}', { v0: mes }),
    corpo: tx('Cash balance: {v0}. Weekly payroll: {v1} ({v2} weeks of wages covered).', { v0: e.formatar(e.caixa), v1: e.formatar(e.folhaSemanal), v2: semanas >= 99 ? tx('n/a') : Math.floor(semanas) }) }));
  if (e.folhaSemanal > 0 && semanas < 8) out.push(criar({ keys: [`finance-low|${mes}`], date: hoje, categoria: 'FINANCE', alta: true, ir: 'FINANCES', de: tx('Finance Director'),
    assunto: e.caixa < 0 ? tx('Warning: the club is in the red') : tx('Warning: cash is running low'),
    corpo: tx('Cash is {v0} — less than 8 weeks of wages ({v1} per week). Avoid new signings and consider selling players.', { v0: e.formatar(e.caixa), v1: e.formatar(e.folhaSemanal) }) }));

  // NEGOCIACOES: a janela de transferencias (abre em jan e jul; aviso de fechamento 7 dias antes do fim de fev e ago).
  const dia = hoje.slice(5);
  if (dia === '01-01' || dia === '07-01') out.push(criar({ keys: [`window-open|${hoje}`], date: hoje, categoria: 'TRANSFER', ir: 'FINANCES', de: tx('Director of Football'),
    assunto: tx('The transfer window is open'), corpo: tx('You can now buy and sell players until the end of next month. Review expiring contracts and the squad needs.') }));
  if (dia === '02-22' || dia === '08-22') out.push(criar({ keys: [`window-close|${hoje}`], date: hoje, categoria: 'TRANSFER', alta: true, ir: 'FINANCES', de: tx('Director of Football'),
    assunto: tx('The transfer window closes in a week'), corpo: tx('Last chance to complete signings and sales before the window closes.') }));
  return out;
};

const addDias = (iso: string, n: number): string => { const d = new Date(iso + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };

// ------------------------------------------------------------------ avisos das acoes do utilizador (negociacoes, contratos, promocoes)
const avisoDeContratacao_ = (hoje: string, lang: Idioma, p: Player, valor: string): MensagemInbox => criar({ keys: [], date: hoje, categoria: 'TRANSFER', ir: 'SQUAD', de: tx('Director of Football'),
  assunto: tx('Signing completed: {v0}', { v0: p.name }),
  corpo: tx('{v0} ({v1}, OVR {v2}, {v3}) joined for {v4}.', { v0: p.name, v1: p.position, v2: p.skill, v3: p.age, v4: valor }) + (p.contract ? ' ' + tx('Contract until {v0} ({v1} years).', { v0: dataLonga(p.contract.end, lang), v1: p.contract.years }) : '') });
const avisoDeVenda_ = (hoje: string, lang: Idioma, p: Player, valor: string): MensagemInbox => criar({ keys: [], date: hoje, categoria: 'TRANSFER', ir: 'FINANCES', de: tx('Finance Director'),
  assunto: tx('Sale completed: {v0}', { v0: p.name }), corpo: tx('{v0} ({v1}, OVR {v2}) was sold for {v3}.', { v0: p.name, v1: p.position, v2: p.skill, v3: valor }) });
/** O dinheiro de uma copa (premiacao): o e-mail leva a chave do pagamento, que impede de pagar duas vezes. */
const avisoDePremiacao_ = (hoje: string, lang: Idioma, key: string, copa: string, razao: string, valor: string): MensagemInbox => {
  const motivo = /^entrada-/.test(razao) ? tx('reaching the next phase') : /^pos-/.test(razao) ? tx('finishing {v0}th in the league', { v0: razao.slice(4) }) : /^vitoria/.test(razao) ? tx('a group-stage win') : /^empate/.test(razao) ? tx('a group-stage draw') : razao === 'cota' ? tx('taking part in the group stage')
    : razao === 'campeao' ? tx('winning the title') : razao === 'vice' ? tx('finishing as runner-up')
    : ({ PO: tx('the knockout playoff'), P5: tx('the 5th round'), R16: tx('the round of 16'), QF: tx('the quarter-finals'), SF: tx('the semi-finals') } as Record<string, string>)[razao] || razao;
  return criar({ keys: [key], date: hoje, categoria: 'FINANCE', ir: 'FINANCES', de: tx('Finance Director'),
    assunto: tx('{v0}: prize money of {v1}', { v0: copa, v1: valor }), corpo: tx('The club received {v0} from {v1} for {v2}.', { v0: valor, v1: copa, v2: motivo }) });
};
const avisoDeRenovacao_ = (hoje: string, lang: Idioma, p: Player): MensagemInbox => criar({ keys: [], date: hoje, categoria: 'CONTRACT', ir: 'FINANCES', de: tx('Director of Football'),
  assunto: tx('Contract renewed: {v0}', { v0: p.name }), corpo: p.contract ? tx('{v0} signed a new contract until {v1} ({v2} years).', { v0: p.name, v1: dataLonga(p.contract.end, lang), v2: p.contract.years }) : '' });
const avisoDePromocao_ = (hoje: string, lang: Idioma, p: Player): MensagemInbox => criar({ keys: [], date: hoje, categoria: 'SQUAD', ir: 'SQUAD', de: tx('Head of Scouting'),
  assunto: tx('Promoted from the academy: {v0}', { v0: p.name }), corpo: tx('{v0} ({v1}, OVR {v2}, {v3}) joined the first team. A new youngster will fill the academy spot.', { v0: p.name, v1: p.position, v2: p.skill, v3: p.age }) });
const avisoDeLiberados_ = (hoje: string, lang: Idioma, jogadores: Player[]): MensagemInbox[] => jogadores.map(p => criar({
  keys: [`released|${p.id}|${p.contract?.end || hoje}`], date: hoje, categoria: 'CONTRACT', alta: true, ir: 'FINANCES', de: tx('Director of Football'),
  assunto: tx('Contract expired: {v0} left the club', { v0: p.name }),
  corpo: tx('{v0} ({v1}, OVR {v2}) was not renewed and is now a free agent.', { v0: p.name, v1: p.position, v2: p.skill }) }));
const avisoDeSaidaDaBase_ = (hoje: string, lang: Idioma, jogadores: Player[]): MensagemInbox[] => jogadores.map(p => criar({
  keys: [`u20-out|${p.id}`], date: hoje, categoria: 'SCOUTING', ir: 'SQUAD', de: tx('Head of Scouting'),
  assunto: tx('{v0} turned 21 and left the academy', { v0: p.name }),
  corpo: tx('{v0} ({v1}, OVR {v2}) is no longer eligible for the Sub-20 and was not promoted. He is now a free agent; a new youngster replaced him.', { v0: p.name, v1: p.position, v2: p.skill }) }));

// ------------------------------------------------------------------ negociacao de renovacao
const avisoDeNegociacaoIniciada_ = (hoje: string, lang: Idioma, p: Player, decide: string, salario: string, anos: number): MensagemInbox => criar({
  keys: [], date: hoje, categoria: 'CONTRACT', ir: 'FINANCES', de: tx('Director of Football'),
  assunto: tx('Negotiation: {v0} is analysing your offer', { v0: p.name }),
  corpo: tx('You offered {v0} {v1} per week for {v2} year(s). He will answer on {v3}.', { v0: p.name, v1: salario, v2: anos, v3: dataLonga(decide, lang) }) });

const avisoDeRespostaRenovacao_ = (hoje: string, lang: Idioma, p: Player, aceitou: boolean, salario: string, anos: number): MensagemInbox => criar({
  keys: [], date: hoje, categoria: 'CONTRACT', alta: !aceitou, ir: 'FINANCES', de: tx('Director of Football'),
  assunto: aceitou ? tx('{v0} accepted the renewal', { v0: p.name }) : tx('{v0} rejected your offer', { v0: p.name }),
  corpo: aceitou
    ? tx('{v0} signed until {v1} ({v2} year(s)) for {v3} per week. His morale went up.', { v0: p.name, v1: p.contract ? dataLonga(p.contract.end, lang) : '-', v2: anos, v3: salario })
    : tx('{v0} turned down {v1} per week for {v2} year(s) and is unhappy about it: his morale dropped. The current contract stays as it was; you can make a new offer.', { v0: p.name, v1: salario, v2: anos }) });

// ------------------------------------------------------------------ mercado de transferencias
export interface EventoMercado { tipo: string; jogadorNome: string; clubeNome: string; valor: number; motivo?: string; }
const avisoDeTransferencia_ = (hoje: string, lang: Idioma, e: EventoMercado, valor: string): MensagemInbox => {
  const j = e.jogadorNome, c = e.clubeNome;
  const M = (assunto: string, corpo: string, alta = false): MensagemInbox => criar({ keys: [], date: hoje, categoria: 'TRANSFER', alta, ir: 'TRANSFERS', de: tx('Director of Football'), assunto, corpo });
  switch (e.tipo) {
    case 'OFERTA_RECEBIDA': return M(tx('Offer for {v0}: {v1} bids {v2}', { v0: j, v1: c, v2: valor }), tx('{v0} made an offer of {v1} for {v2}. Open the Transfer Market to accept, refuse or make a counter-offer.', { v0: c, v1: valor, v2: j }), true);
    case 'CONTRAPROPOSTA': return M(tx('Counter-offer for {v0}: {v1} asks {v2}', { v0: j, v1: c, v2: valor }), tx('{v0} answered your offer with a counter-offer of {v1} for {v2}. You can accept it, refuse or offer again.', { v0: c, v1: valor, v2: j }), true);
    case 'ACEITA': return M(tx('{v0} accepted your offer for {v1}', { v0: c, v1: j }), tx('{v0} accepted {v1} for {v2}. The transfer completes as soon as the conditions allow.', { v0: c, v1: valor, v2: j }));
    case 'RECUSADA': return M(tx('{v0} turned down the deal for {v1}', { v0: c, v1: j }), tx('The offer of {v0} for {v1} was refused{v2}.', { v0: valor, v1: j, v2: e.motivo ? ` (${textoDoMotivo(e.motivo)})` : '' }));
    case 'EXPIRADA': return M(tx('Negotiation for {v0} expired', { v0: j }), tx('The negotiation with {v0} for {v1} is no longer available{v2}.', { v0: c, v1: j, v2: e.motivo ? ` (${textoDoMotivo(e.motivo)})` : '' }));
    case 'BLOQUEADA': return M(tx('Deal for {v0} accepted but not completed yet', { v0: j }), tx('The deal for {v0} ({v1}) cannot be completed yet: {v2}. It stays pending until the conditions are met or it expires.', { v0: j, v1: valor, v2: e.motivo ? textoDoMotivo(e.motivo) : tx('conditions not met') }), true);
    case 'CONCLUIDA_COMPRA': return M(tx('Transfer completed: {v0} joins the club', { v0: j }), tx('{v0} signed for {v1}.', { v0: j, v1: valor }));
    case 'CONCLUIDA_VENDA': return M(tx('Transfer completed: {v0} was sold', { v0: j }), tx('{v0} was sold for {v1}.', { v0: j, v1: valor }));
    case 'AGENTE_LIVRE': return M(tx('Free agent signed: {v0}', { v0: j }), tx('{v0} joined as a free agent, with no transfer fee.', { v0: j }));
    case 'SAIDA_LIVRE': return M(tx('{v0} left on a free transfer', { v0: j }), tx('{v0} had less than 6 months left on his contract and signed with {v1}. The club receives no fee.', { v0: j, v1: e.motivo || '' }), true);
    default: return M(`${j}`, `${c} ${valor}`);
  }
};


/** O utilizador foi "demitido": sem game over, ele fica no clube com a confianca em baixo (ver textSim/managerExpectations.ts, `demitir`). */
const avisoDeDemissao_ = (hoje: string, lang: Idioma, key: string, clube: string): MensagemInbox =>
  criar({ keys: [key], date: hoje, categoria: 'BOARD', de: tx('Chairman'), alta: true,
    assunto: tx('{v0}: the board has lost patience', { v0: clube }),
    corpo: tx('After the recent results the board decided to end your contract at {v0}. It is giving you one last chance: confidence is very low and the next results will decide.', { v0: clube }) });

/** Um clube maior quer contratar o utilizador (a oferta fica pendente; ver `ManagerState.ofertas`). */
const avisoDeOferta_ = (hoje: string, lang: Idioma, key: string, clube: string): MensagemInbox =>
  criar({ keys: [key], date: hoje, categoria: 'BOARD', de: tx('Sporting Director'),
    assunto: tx('{v0} wants you as manager', { v0: clube }),
    corpo: tx('{v0} was impressed by your work and wants to hire you.', { v0: clube }) });

/** A confianca da diretoria entrou numa faixa pior. */
const avisoDeFaixa_ = (hoje: string, lang: Idioma, key: string, clube: string, faixa: Faixa): MensagemInbox => {
  const texto: Record<string, [string, string]> = {
    PRESSAO: ['The board is putting pressure on you.', 'A diretoria está a pressioná-lo.'],
    RISCO: ['Your job is at risk: the board expects an improvement soon.', 'O seu cargo está em risco: a diretoria espera melhora em breve.'],
    IMINENTE: ['Dismissal is imminent unless results change immediately.', 'A demissão é iminente se os resultados não mudarem já.']
  };
  const [en, pt] = texto[faixa] || texto.PRESSAO;
  return criar({ keys: [key], date: hoje, categoria: 'BOARD', de: tx('Chairman'), alta: faixa === 'RISCO' || faixa === 'IMINENTE',
    assunto: tx('{v0}: board confidence dropping', { v0: clube }), corpo: tx(en) });
};

// ------------------------------------------------------------------ patrocinio (textSim/patrocinadores.ts)
const avisoDeParcelaPatrocinio_ = (hoje: string, lang: Idioma, nome: string, parcelas: number, valor: string, key: string): MensagemInbox => criar({ keys: [key], date: hoje, categoria: 'FINANCE', ir: 'FINANCES', de: tx('Finance Director'),
  assunto: tx('Sponsorship payment received — {v0}', { v0: nome }),
  corpo: (parcelas > 1 ? tx('{v0} paid {v1} instalments: {v2} added to the club\'s cash.', { v0: nome, v1: parcelas, v2: valor }) : tx('{v0} paid the monthly instalment: {v1} added to the club\'s cash.', { v0: nome, v1: valor })) });

const avisoDeFimPatrocinio_ = (hoje: string, lang: Idioma, nome: string, fim: string, key: string): MensagemInbox => criar({ keys: [key], date: hoje, categoria: 'FINANCE', alta: true, ir: 'FINANCES', de: tx('Finance Director'),
  assunto: tx('Sponsorship ending soon — {v0}', { v0: nome }),
  corpo: tx('The {v0} contract ends on {v1}. Open Finance → Sponsors to renew or choose another sponsor.', { v0: nome, v1: dataLonga(fim, lang) }) });

const avisoDeBonusPatrocinio_ = (hoje: string, lang: Idioma, nome: string, valor: string, premioKeys: string[]): MensagemInbox => criar({ keys: premioKeys.map(k => `spons-bonus|${k}`), date: hoje, categoria: 'FINANCE', ir: 'FINANCES', de: tx('Finance Director'),
  assunto: tx('Sponsor bonus — {v0}', { v0: nome }),
  corpo: tx('{v0} paid a competition bonus of {v1} on top of the prize money.', { v0: nome, v1: valor }) });


/** A evolucao de UM jogador na semana: os atributos que mudaram (de -> para). */
export interface EvolucaoDoJogador { nome: string; posicao: string; mudancas: { nome: string; de: number; para: number }[]; }

/**
 * O E-MAIL SEMANAL DE EVOLUCAO (segunda-feira, do treinador de preparacao): quem melhorou (ou piorou, na virada de temporada) desde o relatorio da semana anterior, com cada atributo e o valor novo.
 * Os jogadores com mais ganho primeiro, ate `maxJogadores`; cada um mostra ate `maxAtributos` atributos. A razao `evolucao|<data>` so gera um e-mail por semana.
 */
const avisoDeEvolucao_ = (hoje: string, lang: Idioma, jogadores: EvolucaoDoJogador[], maxJogadores = 12, maxAtributos = 5): MensagemInbox => {
  const saldo = (j: EvolucaoDoJogador) => j.mudancas.reduce((s, m) => s + (m.para - m.de), 0);
  const ordenados = [...jogadores].sort((a, b) => saldo(b) - saldo(a));
  const linhas = ordenados.slice(0, maxJogadores).map(j => {
    const ms = [...j.mudancas].sort((a, b) => Math.abs(b.para - b.de) - Math.abs(a.para - a.de)).slice(0, maxAtributos);
    const resto = j.mudancas.length - ms.length;
    return `${j.nome} (${j.posicao}): ${ms.map(m => `${tx(m.nome)} ${m.para > m.de ? '+' : ''}${m.para - m.de} (${m.para})`).join(', ')}${resto > 0 ? tx(' and {v0} more', { v0: resto }) : ''}`;
  });
  const fora = jogadores.length - linhas.length;
  const total = jogadores.reduce((s, j) => s + j.mudancas.length, 0);
  return criar({ keys: [`evolucao|${hoje}`], date: hoje, categoria: 'TRAINING', de: tx('Head of Training'), ir: 'SQUAD',
    assunto: tx('Training report: {v0} player(s) changed', { v0: jogadores.length }),
    corpo: tx('Here is how the squad developed since last week ({v0} attribute change(s)):\n\n', { v0: total })
      + linhas.join('\n') + (fora > 0 ? '\n\n' + tx('...and {v0} more player(s).', { v0: fora }) : '') });
};

// Cada aviso sai no idioma pedido (`lang`, ou `e.lang`), mesmo que a interface esteja noutro: o `tx` usa o idioma atual, e `comIdioma` troca-o so durante a chamada.
export const boasVindas = (...a: Parameters<typeof boasVindas_>): ReturnType<typeof boasVindas_> => comIdioma(a[0].lang, () => boasVindas_(...a));
export const avisosDoDia = (...a: Parameters<typeof avisosDoDia_>): ReturnType<typeof avisosDoDia_> => comIdioma(a[0].lang, () => avisosDoDia_(...a));
export const avisoDeContratacao = (...a: Parameters<typeof avisoDeContratacao_>): ReturnType<typeof avisoDeContratacao_> => comIdioma(a[1], () => avisoDeContratacao_(...a));
export const avisoDeVenda = (...a: Parameters<typeof avisoDeVenda_>): ReturnType<typeof avisoDeVenda_> => comIdioma(a[1], () => avisoDeVenda_(...a));
export const avisoDePremiacao = (...a: Parameters<typeof avisoDePremiacao_>): ReturnType<typeof avisoDePremiacao_> => comIdioma(a[1], () => avisoDePremiacao_(...a));
export const avisoDeRenovacao = (...a: Parameters<typeof avisoDeRenovacao_>): ReturnType<typeof avisoDeRenovacao_> => comIdioma(a[1], () => avisoDeRenovacao_(...a));
export const avisoDePromocao = (...a: Parameters<typeof avisoDePromocao_>): ReturnType<typeof avisoDePromocao_> => comIdioma(a[1], () => avisoDePromocao_(...a));
export const avisoDeLiberados = (...a: Parameters<typeof avisoDeLiberados_>): ReturnType<typeof avisoDeLiberados_> => comIdioma(a[1], () => avisoDeLiberados_(...a));
export const avisoDeSaidaDaBase = (...a: Parameters<typeof avisoDeSaidaDaBase_>): ReturnType<typeof avisoDeSaidaDaBase_> => comIdioma(a[1], () => avisoDeSaidaDaBase_(...a));
export const avisoDeNegociacaoIniciada = (...a: Parameters<typeof avisoDeNegociacaoIniciada_>): ReturnType<typeof avisoDeNegociacaoIniciada_> => comIdioma(a[1], () => avisoDeNegociacaoIniciada_(...a));
export const avisoDeRespostaRenovacao = (...a: Parameters<typeof avisoDeRespostaRenovacao_>): ReturnType<typeof avisoDeRespostaRenovacao_> => comIdioma(a[1], () => avisoDeRespostaRenovacao_(...a));
export const avisoDeTransferencia = (...a: Parameters<typeof avisoDeTransferencia_>): ReturnType<typeof avisoDeTransferencia_> => comIdioma(a[1], () => avisoDeTransferencia_(...a));
export const avisoDeDemissao = (...a: Parameters<typeof avisoDeDemissao_>): ReturnType<typeof avisoDeDemissao_> => comIdioma(a[1], () => avisoDeDemissao_(...a));
export const avisoDeOferta = (...a: Parameters<typeof avisoDeOferta_>): ReturnType<typeof avisoDeOferta_> => comIdioma(a[1], () => avisoDeOferta_(...a));
export const avisoDeFaixa = (...a: Parameters<typeof avisoDeFaixa_>): ReturnType<typeof avisoDeFaixa_> => comIdioma(a[1], () => avisoDeFaixa_(...a));
export const avisoDeParcelaPatrocinio = (...a: Parameters<typeof avisoDeParcelaPatrocinio_>): ReturnType<typeof avisoDeParcelaPatrocinio_> => comIdioma(a[1], () => avisoDeParcelaPatrocinio_(...a));
export const avisoDeFimPatrocinio = (...a: Parameters<typeof avisoDeFimPatrocinio_>): ReturnType<typeof avisoDeFimPatrocinio_> => comIdioma(a[1], () => avisoDeFimPatrocinio_(...a));
export const avisoDeBonusPatrocinio = (...a: Parameters<typeof avisoDeBonusPatrocinio_>): ReturnType<typeof avisoDeBonusPatrocinio_> => comIdioma(a[1], () => avisoDeBonusPatrocinio_(...a));
export const avisoDeEvolucao = (...a: Parameters<typeof avisoDeEvolucao_>): ReturnType<typeof avisoDeEvolucao_> => comIdioma(a[1], () => avisoDeEvolucao_(...a));
