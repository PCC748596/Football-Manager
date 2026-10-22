/*
A CAIXA DE ENTRADA (INBOX) — os e-mails de boas-vindas e os avisos de todos os setores do clube: treino/fisio, jogos importantes, olheiros (base), financas, negociacoes e contratos.

Funcoes puras: o contexto do jogo (context/GameContext.tsx) chama `avisosDoDia` a cada mudanca de data e `adicionar` guarda o que for novo. Cada mensagem leva `keys`
(as razoes que a geraram, ex. `contract|CRITICO|p-12`): uma razao so gera UMA mensagem, mesmo que o motor volte a passar pelo mesmo dia ou o save seja recarregado.
Os textos saem no idioma do jogo (EN ou PT).
*/
import type { Player } from '../types';
import { EstadoContrato, estadoDoContrato } from './contracts';

export type CategoriaInbox = 'WELCOME' | 'BOARD' | 'TRAINING' | 'MATCH' | 'SCOUTING' | 'FINANCE' | 'TRANSFER' | 'CONTRACT' | 'SQUAD';
export type AbaDoJogo = 'DASHBOARD' | 'SQUAD' | 'LEAGUE' | 'FINANCES' | 'STATISTICS' | 'TACTICS' | 'FIXTURES' | 'TRAINING_VIEW' | 'WORLD';

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

export type Idioma = 'EN' | 'PT';
const L = (lang: Idioma, en: string, pt: string) => (lang === 'PT' ? pt : en);
export const LIMITE_INBOX = 400;

let contador = 0;
const criar = (m: Omit<MensagemInbox, 'id' | 'lida'>): MensagemInbox => ({ ...m, id: `msg-${m.date}-${(contador++).toString(36)}-${Math.random().toString(36).slice(2, 6)}`, lida: false });
const dataLonga = (iso: string, lang: Idioma) => {
  const [y, m, d] = iso.split('-').map(Number);
  const meses = lang === 'PT' ? ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'] : ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
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

export const boasVindas = (e: EntradaBoasVindas): MensagemInbox[] => {
  const { lang: l, hoje } = e;
  const topo = e.posicaoNaForca <= Math.max(3, Math.round(e.clubesNaLiga * 0.15)), baixo = e.posicaoNaForca > Math.round(e.clubesNaLiga * 0.7);
  const meta = topo ? L(l, 'fight for the title and a place in the continental cups', 'brigar pelo título e por uma vaga nas copas continentais')
    : baixo ? L(l, 'secure the club\'s place in the division and build for the future', 'garantir a permanência na divisão e construir para o futuro')
    : L(l, 'finish in the top half of the table and avoid any scare at the bottom', 'terminar na metade de cima da tabela e evitar sustos na parte de baixo');
  const k = (s: string) => [`welcome|${s}`];
  return [
    criar({ keys: k('board'), date: hoje, categoria: 'BOARD', de: L(l, 'Chairman', 'Presidente'), ir: 'LEAGUE',
      assunto: L(l, `Welcome to ${e.clube}, ${e.treinador}`, `Bem-vindo ao ${e.clube}, ${e.treinador}`),
      corpo: L(l,
        `On behalf of the board, welcome to ${e.clube}. We play at ${e.estadio} in ${e.cidade}, and this season we compete in the ${e.liga}.\n\nYour squad ranks ${e.posicaoNaForca}${e.posicaoNaForca === 1 ? 'st' : e.posicaoNaForca === 2 ? 'nd' : e.posicaoNaForca === 3 ? 'rd' : 'th'} of ${e.clubesNaLiga} on overall strength (${e.forca}). The board's expectation is to ${meta}.\n\nYou have our full support. Good luck.`,
        `Em nome da diretoria, seja bem-vindo ao ${e.clube}. Jogamos no ${e.estadio}, em ${e.cidade}, e nesta temporada disputamos a ${e.liga}.\n\nSeu elenco é o ${e.posicaoNaForca}º de ${e.clubesNaLiga} em força geral (${e.forca}). A expectativa da diretoria é ${meta}.\n\nVocê tem todo o nosso apoio. Boa sorte.`) }),
    criar({ keys: k('football'), date: hoje, categoria: 'SQUAD', de: L(l, 'Director of Football', 'Diretor de Futebol'), ir: 'SQUAD',
      assunto: L(l, 'Squad overview', 'Visão geral do elenco'),
      corpo: L(l,
        `You have ${e.tamanhoDoElenco} professionals available.${e.contratosEmAtencao ? ` ${e.contratosEmAtencao} contract(s) expire within 12 months — I recommend negotiating renewals early.` : ' No contract expires within the next 12 months.'}\n\nThe Sub-20 academy has 20 youngsters aged 15 to 20. Promotions to the first team are always your decision; players who turn 21 leave the academy.`,
        `Você tem ${e.tamanhoDoElenco} profissionais disponíveis.${e.contratosEmAtencao ? ` ${e.contratosEmAtencao} contrato(s) vence(m) em até 12 meses — recomendo negociar as renovações cedo.` : ' Nenhum contrato vence nos próximos 12 meses.'}\n\nA base Sub-20 tem 20 jovens de 15 a 20 anos. A promoção ao time principal é sempre decisão sua; quem completa 21 anos deixa a base.`) }),
    criar({ keys: k('training'), date: hoje, categoria: 'TRAINING', de: L(l, 'Assistant Manager', 'Auxiliar Técnico'), ir: 'TRAINING_VIEW',
      assunto: L(l, 'Training plan', 'Plano de treinos'),
      corpo: L(l, 'The squad is in pre-season and fitness is still low. Set the weekly training schedule, balance workload and recovery, and avoid heavy sessions right before matches. I will report injuries and fitness problems here.',
        'O elenco está na pré-temporada e a condição física ainda é baixa. Monte a agenda semanal de treinos, equilibre carga e recuperação e evite sessões pesadas na véspera dos jogos. Vou avisar aqui sobre lesões e problemas físicos.') }),
    criar({ keys: k('finance'), date: hoje, categoria: 'FINANCE', de: L(l, 'Finance Director', 'Diretor Financeiro'), ir: 'FINANCES',
      assunto: L(l, 'Club finances', 'Finanças do clube'),
      corpo: L(l, `The club cash balance is ${e.caixa}. Wages are paid every week, so keep an eye on the payroll before signing players. I will send a monthly summary and warn you if the balance gets tight.`,
        `O saldo em caixa do clube é ${e.caixa}. Os salários são pagos toda semana, então acompanhe a folha antes de contratar. Envio um resumo mensal e aviso se o caixa apertar.`) }),
    criar({ keys: k('scout'), date: hoje, categoria: 'SCOUTING', de: L(l, 'Head of Scouting', 'Chefe de Olheiros'), ir: 'SQUAD',
      assunto: L(l, 'Scouting department', 'Departamento de olheiros'),
      corpo: L(l, 'Our scouts follow the Sub-20 academy every month. Potential is shown as a star estimate — it is an opinion, not a guarantee, and it becomes more reliable as the players get older. A monthly development report will arrive here.',
        'Nossos olheiros acompanham a base Sub-20 todo mês. O potencial aparece como uma estimativa em estrelas — é uma opinião, não uma garantia, e fica mais confiável com a idade. Um relatório mensal de desenvolvimento chegará aqui.') })
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
}

const diasEntre = (a: string, b: string) => Math.round((Date.UTC(+b.slice(0, 4), +b.slice(5, 7) - 1, +b.slice(8, 10)) - Date.UTC(+a.slice(0, 4), +a.slice(5, 7) - 1, +a.slice(8, 10))) / 86400000);

/** As razoes que a caixa ja conhece (para os avisos agrupados listarem so o que e novo). */
export const chavesDe = (inbox: MensagemInbox[]): Set<string> => new Set(inbox.flatMap(m => m.keys));

export const avisosDoDia = (e: EntradaAvisos, vistas: Set<string> = new Set()): MensagemInbox[] => {
  const { hoje, lang: l } = e;
  const out: MensagemInbox[] = [];

  // CONTRATOS: um aviso por estado, agrupando os jogadores que entraram nele (uma razao por jogador e estado).
  (['ATENCAO', 'CRITICO'] as EstadoContrato[]).forEach(estado => {
    const lista = e.elenco.filter(p => estadoDoContrato(p.contract, hoje) === estado && !vistas.has(`contract|${estado}|${p.id}`));
    if (!lista.length) return;
    const critico = estado === 'CRITICO';
    const linhas = lista.map(p => `• ${p.name} (${p.position}, OVR ${p.skill}) — ${l === 'PT' ? 'vence em' : 'expires'} ${dataLonga(p.contract!.end, l)}`).join('\n');
    out.push(criar({
      keys: lista.map(p => `contract|${estado}|${p.id}`), date: hoje, categoria: 'CONTRACT', alta: critico, ir: 'SQUAD', de: L(l, 'Director of Football', 'Diretor de Futebol'),
      assunto: critico ? L(l, `Critical: ${lista.length} contract(s) end within 6 months`, `Crítico: ${lista.length} contrato(s) terminam em até 6 meses`) : L(l, `${lista.length} contract(s) end within 12 months`, `${lista.length} contrato(s) terminam em até 12 meses`),
      corpo: `${linhas}\n\n${critico ? L(l, 'Renew now or sell: when the contract ends the player leaves for free.', 'Renove agora ou venda: ao fim do contrato o jogador sai de graça.') : L(l, 'Negotiate a renewal, or consider selling while he still has market value.', 'Negocie a renovação ou considere vender enquanto ele ainda tem valor de mercado.')}`
    }));
  });

  // JOGOS: resultado (ate 7 dias depois), e aviso 2 dias antes de jogo importante (classico, copa).
  e.jogos.forEach(j => {
    if (j.amistoso) return;
    const dias = diasEntre(hoje, j.date);
    if (j.jogado && dias <= 0 && dias >= -7) {
      const r = j.golsPro > j.golsContra ? L(l, 'Win', 'Vitória') : j.golsPro < j.golsContra ? L(l, 'Defeat', 'Derrota') : L(l, 'Draw', 'Empate');
      const placar = j.casa ? `${j.golsPro} x ${j.golsContra}` : `${j.golsContra} x ${j.golsPro}`;
      out.push(criar({ keys: [`result|${j.id}`], date: j.date, categoria: 'MATCH', ir: 'FIXTURES', de: L(l, 'Press Office', 'Assessoria de Imprensa'),
        alta: !!j.copa || j.derbi,
        assunto: `${r}: ${j.casa ? `${L(l, 'vs', 'x')} ${j.adversario}` : `${L(l, 'at', 'fora:')} ${j.adversario}`} (${placar})${j.copa ? ` · ${j.copa}` : ''}`,
        corpo: L(l, `Full time: ${r.toLowerCase()} ${j.casa ? 'at home against' : 'away at'} ${j.adversario}, ${placar}.${j.derbi ? ' A local derby.' : ''}`,
          `Fim de jogo: ${r.toLowerCase()} ${j.casa ? 'em casa contra o' : 'fora, contra o'} ${j.adversario}, ${placar}.${j.derbi ? ' Foi um clássico.' : ''}`) }));
    }
    if (!j.jogado && dias >= 1 && dias <= 2 && (j.derbi || j.copa)) {
      out.push(criar({ keys: [`preview|${j.id}`], date: hoje, categoria: 'MATCH', alta: true, ir: 'TACTICS', de: L(l, 'Assistant Manager', 'Auxiliar Técnico'),
        assunto: j.copa ? L(l, `Cup match in ${dias} day(s): ${j.adversario}`, `Jogo de copa em ${dias} dia(s): ${j.adversario}`) : L(l, `Derby in ${dias} day(s): ${j.adversario}`, `Clássico em ${dias} dia(s): ${j.adversario}`),
        corpo: L(l, `${j.copa ? `${j.copa} — ` : ''}${j.casa ? 'Home' : 'Away'} against ${j.adversario} on ${dataLonga(j.date, l)}. This one matters: check the lineup, fitness and set pieces.`,
          `${j.copa ? `${j.copa} — ` : ''}${j.casa ? 'Em casa' : 'Fora'} contra o ${j.adversario} em ${dataLonga(j.date, l)}. Esse jogo é importante: confira a escalação, a condição física e as bolas paradas.`) }));
    }
  });

  // TREINO / FISIO: lesoes novas (uma razao por lesao: o dia em que o jogador volta e fixo).
  e.elenco.filter(p => p.injury).forEach(p => {
    const volta = addDias(hoje, p.injury!.daysOut);
    const grave = p.injury!.severity === 'SEVERE';
    out.push(criar({ keys: [`injury|${p.id}|${volta}`], date: hoje, categoria: 'TRAINING', alta: grave, ir: 'SQUAD', de: L(l, 'Physio', 'Fisioterapeuta'),
      assunto: L(l, `Injury: ${p.name} (${p.injury!.type})`, `Lesão: ${p.name} (${p.injury!.type})`),
      corpo: L(l, `${p.name} (${p.position}, OVR ${p.skill}) is injured — ${p.injury!.type}, about ${p.injury!.daysOut} day(s) out (back around ${dataLonga(volta, l)}).`,
        `${p.name} (${p.position}, OVR ${p.skill}) está lesionado — ${p.injury!.type}, cerca de ${p.injury!.daysOut} dia(s) fora (volta por volta de ${dataLonga(volta, l)}).`) }));
  });
  // fisico: na vespera de jogo com o elenco muito cansado
  const proximo = e.jogos.find(j => !j.jogado && diasEntre(hoje, j.date) === 1);
  if (proximo && e.elenco.length) {
    const saudaveis = e.elenco.filter(p => !p.injury);
    const media = saudaveis.reduce((s, p) => s + p.fitness, 0) / Math.max(1, saudaveis.length);
    if (media < 70) out.push(criar({ keys: [`fitness|${proximo.id}`], date: hoje, categoria: 'TRAINING', alta: media < 55, ir: 'TRAINING_VIEW', de: L(l, 'Assistant Manager', 'Auxiliar Técnico'),
      assunto: L(l, `Squad fitness at ${Math.round(media)}% before the match`, `Condição física do elenco em ${Math.round(media)}% antes do jogo`),
      corpo: L(l, `Tomorrow's match against ${proximo.adversario}: the average fitness of the available players is ${Math.round(media)}%. Consider rotating tired players and keeping today's training light.`,
        `Jogo de amanhã contra o ${proximo.adversario}: a condição física média dos jogadores disponíveis é ${Math.round(media)}%. Considere rodar os cansados e manter o treino de hoje leve.`) }));
  }

  // OLHEIROS: no primeiro relatorio de cada mes da base.
  if (e.jovens.length && e.mesDoRelatorio) {
    const subiram = e.jovens.filter(j => j.delta > 0).sort((a, b) => b.delta - a.delta);
    const talento = [...e.jovens].sort((a, b) => b.estrelas - a.estrelas || b.ovr - a.ovr)[0];
    const parados = e.jovens.filter(j => !j.mudou).length;
    out.push(criar({ keys: [`scout|${e.mesDoRelatorio}`], date: hoje, categoria: 'SCOUTING', ir: 'SQUAD', de: L(l, 'Head of Scouting', 'Chefe de Olheiros'),
      assunto: L(l, `Academy development report — ${e.mesDoRelatorio}`, `Relatório de desenvolvimento da base — ${e.mesDoRelatorio}`),
      corpo: L(l,
        `${subiram.length} of ${e.jovens.length} academy players improved their overall this month${subiram[0] ? `; the biggest rise was ${subiram[0].nome} (${subiram[0].posicao}, +${subiram[0].delta})` : ''}. ${parados} showed no change at all.\n\nBest prospect (our estimate): ${talento.nome} (${talento.posicao}, OVR ${talento.ovr}) — ${'★'.repeat(talento.estrelas)}${'☆'.repeat(5 - talento.estrelas)}.\n\nOpen Squad → Sub-20 for the full monthly report.`,
        `${subiram.length} de ${e.jovens.length} jovens da base subiram de overall neste mês${subiram[0] ? `; a maior evolução foi de ${subiram[0].nome} (${subiram[0].posicao}, +${subiram[0].delta})` : ''}. ${parados} não tiveram nenhuma mudança.\n\nMelhor promessa (estimativa nossa): ${talento.nome} (${talento.posicao}, OVR ${talento.ovr}) — ${'★'.repeat(talento.estrelas)}${'☆'.repeat(5 - talento.estrelas)}.\n\nAbra Elenco → Sub-20 para o relatório mensal completo.`) }));
  }

  // FINANCAS: resumo no dia 1 de cada mes e alerta de caixa apertado (uma vez por mes).
  const mes = hoje.slice(0, 7), semanas = e.folhaSemanal > 0 ? e.caixa / e.folhaSemanal : 99;
  if (hoje.endsWith('-01')) out.push(criar({ keys: [`finance|${mes}`], date: hoje, categoria: 'FINANCE', ir: 'FINANCES', de: L(l, 'Finance Director', 'Diretor Financeiro'),
    assunto: L(l, `Monthly finance summary — ${mes}`, `Resumo financeiro do mês — ${mes}`),
    corpo: L(l, `Cash balance: ${e.formatar(e.caixa)}. Weekly payroll: ${e.formatar(e.folhaSemanal)} (${semanas >= 99 ? 'n/a' : Math.floor(semanas)} weeks of wages covered).`, `Saldo em caixa: ${e.formatar(e.caixa)}. Folha semanal: ${e.formatar(e.folhaSemanal)} (${semanas >= 99 ? 'n/d' : Math.floor(semanas)} semanas de salários cobertas).`) }));
  if (e.folhaSemanal > 0 && semanas < 8) out.push(criar({ keys: [`finance-low|${mes}`], date: hoje, categoria: 'FINANCE', alta: true, ir: 'FINANCES', de: L(l, 'Finance Director', 'Diretor Financeiro'),
    assunto: e.caixa < 0 ? L(l, 'Warning: the club is in the red', 'Alerta: o clube está no vermelho') : L(l, 'Warning: cash is running low', 'Alerta: o caixa está apertado'),
    corpo: L(l, `Cash is ${e.formatar(e.caixa)} — less than 8 weeks of wages (${e.formatar(e.folhaSemanal)} per week). Avoid new signings and consider selling players.`, `O caixa está em ${e.formatar(e.caixa)} — menos de 8 semanas de salários (${e.formatar(e.folhaSemanal)} por semana). Evite novas contratações e considere vender jogadores.`) }));

  // NEGOCIACOES: a janela de transferencias (abre em jan e jul; aviso de fechamento 7 dias antes do fim de fev e ago).
  const dia = hoje.slice(5);
  if (dia === '01-01' || dia === '07-01') out.push(criar({ keys: [`window-open|${hoje}`], date: hoje, categoria: 'TRANSFER', ir: 'FINANCES', de: L(l, 'Director of Football', 'Diretor de Futebol'),
    assunto: L(l, 'The transfer window is open', 'A janela de transferências abriu'), corpo: L(l, 'You can now buy and sell players until the end of next month. Review expiring contracts and the squad needs.', 'Você já pode comprar e vender jogadores até o fim do próximo mês. Revise contratos a vencer e as necessidades do elenco.') }));
  if (dia === '02-22' || dia === '08-22') out.push(criar({ keys: [`window-close|${hoje}`], date: hoje, categoria: 'TRANSFER', alta: true, ir: 'FINANCES', de: L(l, 'Director of Football', 'Diretor de Futebol'),
    assunto: L(l, 'The transfer window closes in a week', 'A janela de transferências fecha em uma semana'), corpo: L(l, 'Last chance to complete signings and sales before the window closes.', 'Última chance de fechar contratações e vendas antes de a janela fechar.') }));
  return out;
};

const addDias = (iso: string, n: number): string => { const d = new Date(iso + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };

// ------------------------------------------------------------------ avisos das acoes do utilizador (negociacoes, contratos, promocoes)
export const avisoDeContratacao = (hoje: string, lang: Idioma, p: Player, valor: string): MensagemInbox => criar({ keys: [], date: hoje, categoria: 'TRANSFER', ir: 'SQUAD', de: L(lang, 'Director of Football', 'Diretor de Futebol'),
  assunto: L(lang, `Signing completed: ${p.name}`, `Contratação concluída: ${p.name}`),
  corpo: L(lang, `${p.name} (${p.position}, OVR ${p.skill}, ${p.age}) joined for ${valor}.${p.contract ? ` Contract until ${dataLonga(p.contract.end, lang)} (${p.contract.years} years).` : ''}`, `${p.name} (${p.position}, OVR ${p.skill}, ${p.age}) chegou por ${valor}.${p.contract ? ` Contrato até ${dataLonga(p.contract.end, lang)} (${p.contract.years} anos).` : ''}`) });
export const avisoDeVenda = (hoje: string, lang: Idioma, p: Player, valor: string): MensagemInbox => criar({ keys: [], date: hoje, categoria: 'TRANSFER', ir: 'FINANCES', de: L(lang, 'Finance Director', 'Diretor Financeiro'),
  assunto: L(lang, `Sale completed: ${p.name}`, `Venda concluída: ${p.name}`), corpo: L(lang, `${p.name} (${p.position}, OVR ${p.skill}) was sold for ${valor}.`, `${p.name} (${p.position}, OVR ${p.skill}) foi vendido por ${valor}.`) });
export const avisoDeRenovacao = (hoje: string, lang: Idioma, p: Player): MensagemInbox => criar({ keys: [], date: hoje, categoria: 'CONTRACT', ir: 'SQUAD', de: L(lang, 'Director of Football', 'Diretor de Futebol'),
  assunto: L(lang, `Contract renewed: ${p.name}`, `Contrato renovado: ${p.name}`), corpo: p.contract ? L(lang, `${p.name} signed a new contract until ${dataLonga(p.contract.end, lang)} (${p.contract.years} years).`, `${p.name} assinou novo contrato até ${dataLonga(p.contract.end, lang)} (${p.contract.years} anos).`) : '' });
export const avisoDePromocao = (hoje: string, lang: Idioma, p: Player): MensagemInbox => criar({ keys: [], date: hoje, categoria: 'SQUAD', ir: 'SQUAD', de: L(lang, 'Head of Scouting', 'Chefe de Olheiros'),
  assunto: L(lang, `Promoted from the academy: ${p.name}`, `Promovido da base: ${p.name}`), corpo: L(lang, `${p.name} (${p.position}, OVR ${p.skill}, ${p.age}) joined the first team. A new youngster will fill the academy spot.`, `${p.name} (${p.position}, OVR ${p.skill}, ${p.age}) subiu ao time principal. Um novo jovem ocupará a vaga na base.`) });
export const avisoDeLiberados = (hoje: string, lang: Idioma, jogadores: Player[]): MensagemInbox[] => jogadores.map(p => criar({
  keys: [`released|${p.id}|${p.contract?.end || hoje}`], date: hoje, categoria: 'CONTRACT', alta: true, ir: 'SQUAD', de: L(lang, 'Director of Football', 'Diretor de Futebol'),
  assunto: L(lang, `Contract expired: ${p.name} left the club`, `Contrato vencido: ${p.name} deixou o clube`),
  corpo: L(lang, `${p.name} (${p.position}, OVR ${p.skill}) was not renewed and is now a free agent.`, `${p.name} (${p.position}, OVR ${p.skill}) não foi renovado e agora é jogador livre.`) }));
export const avisoDeSaidaDaBase = (hoje: string, lang: Idioma, jogadores: Player[]): MensagemInbox[] => jogadores.map(p => criar({
  keys: [`u20-out|${p.id}`], date: hoje, categoria: 'SCOUTING', ir: 'SQUAD', de: L(lang, 'Head of Scouting', 'Chefe de Olheiros'),
  assunto: L(lang, `${p.name} turned 21 and left the academy`, `${p.name} fez 21 anos e deixou a base`),
  corpo: L(lang, `${p.name} (${p.position}, OVR ${p.skill}) is no longer eligible for the Sub-20 and was not promoted. He is now a free agent; a new youngster replaced him.`, `${p.name} (${p.position}, OVR ${p.skill}) não pode mais ficar no Sub-20 e não foi promovido. Agora é jogador livre; um novo jovem ocupou a vaga.`) }));

// ------------------------------------------------------------------ negociacao de renovacao
export const avisoDeNegociacaoIniciada = (hoje: string, lang: Idioma, p: Player, decide: string, salario: string, anos: number): MensagemInbox => criar({
  keys: [], date: hoje, categoria: 'CONTRACT', ir: 'SQUAD', de: L(lang, 'Director of Football', 'Diretor de Futebol'),
  assunto: L(lang, `Negotiation: ${p.name} is analysing your offer`, `Negociação: ${p.name} está analisando sua proposta`),
  corpo: L(lang, `You offered ${p.name} ${salario} per week for ${anos} year(s). He will answer on ${dataLonga(decide, lang)}.`, `Você ofereceu a ${p.name} ${salario} por semana por ${anos} ano(s). Ele responde em ${dataLonga(decide, lang)}.`) });

export const avisoDeRespostaRenovacao = (hoje: string, lang: Idioma, p: Player, aceitou: boolean, salario: string, anos: number): MensagemInbox => criar({
  keys: [], date: hoje, categoria: 'CONTRACT', alta: !aceitou, ir: 'SQUAD', de: L(lang, 'Director of Football', 'Diretor de Futebol'),
  assunto: aceitou ? L(lang, `${p.name} accepted the renewal`, `${p.name} aceitou a renovação`) : L(lang, `${p.name} rejected your offer`, `${p.name} recusou sua proposta`),
  corpo: aceitou
    ? L(lang, `${p.name} signed until ${p.contract ? dataLonga(p.contract.end, lang) : '-'} (${anos} year(s)) for ${salario} per week. His morale went up.`, `${p.name} assinou até ${p.contract ? dataLonga(p.contract.end, lang) : '-'} (${anos} ano(s)) por ${salario} por semana. A moral dele subiu.`)
    : L(lang, `${p.name} turned down ${salario} per week for ${anos} year(s) and is unhappy about it: his morale dropped. The current contract stays as it was; you can make a new offer.`, `${p.name} recusou ${salario} por semana por ${anos} ano(s) e ficou chateado: a moral dele caiu. O contrato atual continua como estava; você pode fazer uma nova proposta.`) });
