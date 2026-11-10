/*
O MOD DOS DADOS REAIS (a pasta escolhida em Settings > Mod, por omissao `C:\Footmanager3D\mod`; nao ha outra origem). O jogo traz uma base GENERICA (textSim/realDatabase.ts: clubes, estadios e jogadores com nomes gerados). Se a pasta `dados_reais` estiver ao lado do jogo
(no servidor de desenvolvimento, em `public/dados_reais`; no jogo empacotado, a pasta `dados_reais` junto dos ficheiros do jogo), os nomes e escudos dela substituem os genericos ao arrancar. Sem a pasta
(o pacote da Steam) o jogo corre com os genericos, sem erro.

    dados_reais/mod.json         { nome, versao, descricao }       (obrigatorio: e ele que diz que o mod existe)
    dados_reais/clubes.json      [{ id, nome, abreviatura, estadio, escudo }]    id = teamID da base; `escudo` = ficheiro em escudos/ (vazio = escudo generico)
    dados_reais/jogadores.json   [{ id, nome }]                                  id = idPlayer da base
    dados_reais/competicoes.json [{ id, nome, nomeCurto, prefixo, logo }]          copas e ligas (ver textSim/nomesCompeticoes.ts)
    dados_reais/competicoes/     os logos das copas
    dados_reais/escudos/         as imagens dos escudos

E assim que qualquer pessoa pode editar o jogo: basta alterar estes JSON (e trocar as imagens). Um id que nao exista na base e ignorado; um campo em falta fica como na base generica.
Substitui no sitio os campos de REAL_TEAMS_JSON / REAL_PLAYERS_JSON (os numeros nao mudam), por isso tem de correr ANTES de se gerar qualquer jogo (ver index.tsx).
*/
import { REAL_TEAMS_JSON, REAL_PLAYERS_JSON, REAL_COUNTRIES_JSON } from './realDatabase';
import { registarCompeticoes, definirBaseDosLogos, InfoCompeticao } from './nomesCompeticoes';
import { lerConfigMod, urlDaPastaDoMod } from './modConfig';

export interface ModClube { id: number; nome?: string; abreviatura?: string; estadio?: string; escudo?: string }
export interface ModJogador { id: number; nome?: string }
export interface ModCompeticao extends InfoCompeticao { id: string }
/** `pasta`: lido da pasta escolhida em Settings > Mod (nao ha outra origem: sem a pasta, sem mod). */
export type OrigemDoMod = 'pasta' | null;
export interface EstadoDoMod { ativo: boolean; nome?: string; clubes: number; jogadores: number; competicoes: number; origem: OrigemDoMod; caminho: string; configurado: boolean }

export const estadoDoMod: EstadoDoMod = { ativo: false, clubes: 0, jogadores: 0, competicoes: 0, origem: null, caminho: '', configurado: false };

/** Aplica os dados do mod sobre a base (no sitio). Devolve quantos clubes e jogadores mudaram. */
export const aplicarMod = (clubes: ModClube[], jogadores: ModJogador[], competicoes: ModCompeticao[] = [], fonte: { base: string; sufixo: string } = { base: 'dados_reais/', sufixo: '' }): { clubes: number; jogadores: number; competicoes: number } => {
  const porClube = new Map<number, ModClube>((clubes || []).map(c => [Number(c.id), c]));
  const porJogador = new Map<number, ModJogador>((jogadores || []).map(j => [Number(j.id), j]));
  const renomeado = new Map<string, string>();   // nome generico do clube -> nome do mod (os jogadores ligam-se ao clube pelo nome)
  let nc = 0, nj = 0;
  for (const t of REAL_TEAMS_JSON as any[]) {
    const m = porClube.get(Number(t.teamID));
    if (!m) continue;
    if (m.nome && m.nome !== t.teamName) { renomeado.set(String(t.teamName), m.nome); t.teamName = m.nome; }
    if (m.abreviatura) t.teamAbb = m.abreviatura;
    if (m.estadio) t.teamStadiumName = m.estadio;
    if (m.escudo) t.teamBadgeLocation = `${fonte.base}escudos/${m.escudo}${fonte.sufixo}`;
    nc++;
  }
  for (const p of REAL_PLAYERS_JSON as any[]) {
    const novoClube = renomeado.get(String(p.team));
    if (novoClube) p.team = novoClube;
    const m = porJogador.get(Number(p.idPlayer));
    if (m && m.nome) { p.namePlayer = m.nome; nj++; }
  }
  // As competicoes: copas (nome, nome curto, prefixo, logo) e ligas (o nome na base dos paises).
  const nomesDeLiga = new Map<string, string>();
  for (const c of competicoes || []) if (c && c.id && c.nome) nomesDeLiga.set(String(c.id), c.nome);
  definirBaseDosLogos(fonte.base, fonte.sufixo);
  const ncomp = registarCompeticoes((competicoes || []).filter(c => c && c.id));
  for (const pais of REAL_COUNTRIES_JSON as any[]) for (const l of (pais.leagues || [])) { const n = nomesDeLiga.get(String(l.id)); if (n) l.name = n; }
  return { clubes: nc, jogadores: nj, competicoes: ncomp };
};

/** Le um JSON de uma URL (null se nao existir ou nao for JSON: o servidor de desenvolvimento responde com a pagina a um ficheiro que nao existe). */
const lerJson = async (url: string): Promise<any | null> => {
  try {
    const r = await fetch(url, { cache: 'no-store' });
    if (!r.ok) return null;
    return await r.json();
  } catch { return null; }
};

/**
 * Le o mod e aplica-o. Com o mod OFF (Settings) nao faz nada. Com ON le SO a pasta escolhida (por omissao C:\Footmanager3D\mod, servida em `api/mod/`): se ela nao existir ou estiver vazia, o jogo segue com
 * a base generica (nao ha outra pasta de reserva). Nunca lanca: um ficheiro estragado tambem cai nos genericos.
 */
export const carregarMod = async (): Promise<EstadoDoMod> => {
  const cfg = lerConfigMod();
  estadoDoMod.configurado = cfg.ativo;
  estadoDoMod.caminho = cfg.caminho;
  try {
    if (!cfg.ativo || typeof fetch === 'undefined' || typeof document === 'undefined') return estadoDoMod;
    const pastaBase = new URL('api/mod/', document.baseURI).href, pastaSufixo = '?pasta=' + encodeURIComponent(cfg.caminho);
    const url = (n: string) => pastaBase + n + pastaSufixo;
    const mod = await lerJson(url('mod.json'));
    if (!mod || typeof mod !== 'object') { console.info(`[mod] nenhum mod em ${cfg.caminho}; segue a base generica.`); return estadoDoMod; }
    const [clubes, jogadores, competicoes] = await Promise.all([lerJson(url('clubes.json')), lerJson(url('jogadores.json')), lerJson(url('competicoes.json'))]);
    const r = aplicarMod(Array.isArray(clubes) ? clubes : [], Array.isArray(jogadores) ? jogadores : [], Array.isArray(competicoes) ? competicoes : [], { base: pastaBase, sufixo: pastaSufixo });
    Object.assign(estadoDoMod, { ativo: true, nome: String(mod.nome || 'mod'), origem: 'pasta', clubes: r.clubes, jogadores: r.jogadores, competicoes: r.competicoes });
    console.info(`[mod] ${estadoDoMod.nome} (${cfg.caminho}): ${r.clubes} clubes, ${r.jogadores} jogadores, ${r.competicoes} competicoes`);
  } catch (e) {
    console.warn('[mod] nao foi possivel ler o mod; segue a base generica.', e);
  }
  return estadoDoMod;
};
