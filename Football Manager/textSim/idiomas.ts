/*
OS IDIOMAS DO JOGO. Os textos vivem em textSim/idiomas/<codigo>.json (en, pt, es, fr, de, zh): as chaves da interface (`t('nav_home')` no GameContext), as do placar ao vivo (prefixo
`mr_`, MatchRoundView) e a narracao do motor de texto (`narracao`, matchEngine). Uma chave que falte num idioma cai no INGLES, e uma que falte no ingles devolve a propria chave: um texto novo
pode entrar so no en.json e os outros idiomas mostram-no em ingles ate alguem o traduzir.

O mod tambem pode trazer traducoes: `<pasta do mod>/idiomas/<codigo>.json` com as mesmas chaves, lido ao abrir o jogo (textSim/modDados.ts); o que vier la substitui o do jogo. Assim qualquer
pessoa corrige ou completa uma traducao sem mexer no codigo.

Para juntar um idioma: o ficheiro .json aqui, o codigo em `Language` (types.ts) e uma linha em IDIOMAS.
*/
import type { Language } from '../types';
import en from './idiomas/en.json';
import pt from './idiomas/pt.json';
import es from './idiomas/es.json';
import fr from './idiomas/fr.json';
import de from './idiomas/de.json';
import zh from './idiomas/zh.json';

/** Os idiomas do Settings: o codigo, o nome no proprio idioma, a voz da narracao falada e o formato das datas. */
export const IDIOMAS: { codigo: Language; nome: string; voz: string; locale: string }[] = [
  { codigo: 'EN', nome: 'English', voz: 'en', locale: 'en-US' },
  { codigo: 'PT', nome: 'Português', voz: 'pt', locale: 'pt-BR' },
  { codigo: 'ES', nome: 'Español', voz: 'es', locale: 'es-ES' },
  { codigo: 'FR', nome: 'Français', voz: 'fr', locale: 'fr-FR' },
  { codigo: 'DE', nome: 'Deutsch', voz: 'de', locale: 'de-DE' },
  { codigo: 'ZH', nome: '中文', voz: 'zh', locale: 'zh-CN' }
];

type Dicionario = Record<string, any>;
const DIC: Record<string, Dicionario> = { EN: en, PT: pt, ES: es, FR: fr, DE: de, ZH: zh };

export const idiomaValido = (codigo: unknown): codigo is Language => typeof codigo === 'string' && IDIOMAS.some(i => i.codigo === codigo);
const infoDe = (lang: Language) => IDIOMAS.find(i => i.codigo === lang) || IDIOMAS[0];
/** O prefixo da voz do sintetizador (speechSynthesis) para o idioma: 'pt', 'es'... */
export const vozDoIdioma = (lang: Language): string => infoDe(lang).voz;
/** O locale das datas e numeros (toLocaleDateString). */
export const localeDoIdioma = (lang: Language): string => infoDe(lang).locale;

/** O texto da chave no idioma, ou o ingles, ou a propria chave. `vars` troca `{nome}` no texto. */
export const traduzir = (lang: Language, chave: string, vars?: Record<string, string | number>): any => {
  const v = DIC[lang]?.[chave] ?? DIC.EN[chave] ?? chave;
  if (!vars || typeof v !== 'string') return v;
  return v.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m));
};

/** Junta o objeto `extra` sobre `base` (objetos fundem-se; listas e textos substituem). */
const fundir = (base: Dicionario, extra: Dicionario): Dicionario => {
  const out: Dicionario = { ...base };
  for (const [k, v] of Object.entries(extra || {})) out[k] = v && typeof v === 'object' && !Array.isArray(v) && base[k] && typeof base[k] === 'object' ? fundir(base[k], v) : v;
  return out;
};

/** A narracao do motor de texto no idioma (cada frase que falte vem do ingles). */
export const narracaoDe = (lang: Language): any => fundir(DIC.EN.narracao, DIC[lang]?.narracao || {});

/** Os textos do placar ao vivo (chaves `mr_*` sem o prefixo), para o MatchRoundView. */
export const textosDaPartida = (lang: Language): Record<string, string> => {
  const out: Record<string, string> = {};
  for (const k of Object.keys(DIC.EN)) if (k.startsWith('mr_')) out[k.slice(3)] = traduzir(lang, k);
  return out;
};

/*
O IDIOMA ATUAL E `tx`: o texto em INGLES e a propria chave (como o gettext). `tx('Squad Snapshot')` devolve a traducao do bloco `textos` do idioma atual, ou o proprio ingles. Serve para os
textos das telas sem ter de inventar um nome de chave para cada um: o en.json nem precisa deles. `vars` troca `{nome}` (`tx('{n} unread', { n: 3 })`).
O idioma atual e posto pelo GameContext a cada render (`definirIdiomaAtual`), antes de as telas desenharem.
*/
let atual: Language = 'EN';
export const definirIdiomaAtual = (lang: Language): void => { if (idiomaValido(lang)) atual = lang; };
export const idiomaAtual = (): Language => atual;
export const tx = (en: string, vars?: Record<string, string | number>): string => {
  const v: string = (atual !== 'EN' && DIC[atual]?.textos?.[en]) || en;
  return vars ? v.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m)) : v;
};

/** Traducoes do mod (idiomas/<codigo>.json): substituem as do jogo. Devolve quantas chaves entraram. */
export const registarTraducoes = (lang: Language, extra: Dicionario): number => {
  if (!extra || typeof extra !== 'object' || !DIC[lang]) return 0;
  DIC[lang] = fundir(DIC[lang], extra);
  return Object.keys(extra).length;
};
