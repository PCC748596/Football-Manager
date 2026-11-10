/*
O MOD DOS DADOS REAIS (`public/dados_reais/`). O jogo traz uma base GENERICA (textSim/realDatabase.ts: clubes, estadios e jogadores com nomes gerados). Se a pasta `dados_reais` estiver ao lado do jogo
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
import { registarCompeticoes, InfoCompeticao } from './nomesCompeticoes';

export interface ModClube { id: number; nome?: string; abreviatura?: string; estadio?: string; escudo?: string }
export interface ModJogador { id: number; nome?: string }
export interface ModCompeticao extends InfoCompeticao { id: string }
export interface EstadoDoMod { ativo: boolean; nome?: string; clubes: number; jogadores: number; competicoes: number }

export const estadoDoMod: EstadoDoMod = { ativo: false, clubes: 0, jogadores: 0, competicoes: 0 };

/** Aplica os dados do mod sobre a base (no sitio). Devolve quantos clubes e jogadores mudaram. */
export const aplicarMod = (clubes: ModClube[], jogadores: ModJogador[], competicoes: ModCompeticao[] = [], pasta = 'dados_reais'): { clubes: number; jogadores: number; competicoes: number } => {
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
    if (m.escudo) t.teamBadgeLocation = `${pasta}/escudos/${m.escudo}`;
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
  const ncomp = registarCompeticoes((competicoes || []).filter(c => c && c.id));
  for (const pais of REAL_COUNTRIES_JSON as any[]) for (const l of (pais.leagues || [])) { const n = nomesDeLiga.get(String(l.id)); if (n) l.name = n; }
  return { clubes: nc, jogadores: nj, competicoes: ncomp };
};

/** Le o mod da pasta `dados_reais` (se existir) e aplica-o. Nunca lanca: sem pasta, ou com um ficheiro estragado, o jogo segue com a base generica. */
export const carregarMod = async (pasta = 'dados_reais'): Promise<EstadoDoMod> => {
  try {
    if (typeof fetch === 'undefined' || typeof document === 'undefined') return estadoDoMod;
    const base = new URL(pasta + '/', document.baseURI).href;
    const json = async (nome: string): Promise<any | null> => {
      const r = await fetch(base + nome, { cache: 'no-store' });
      if (!r.ok) return null;
      try { return await r.json(); } catch { return null; }   // o servidor de desenvolvimento responde com a pagina (HTML) a um ficheiro que nao existe
    };
    const mod = await json('mod.json');
    if (!mod || typeof mod !== 'object') return estadoDoMod;
    const [clubes, jogadores, competicoes] = await Promise.all([json('clubes.json'), json('jogadores.json'), json('competicoes.json')]);
    const r = aplicarMod(Array.isArray(clubes) ? clubes : [], Array.isArray(jogadores) ? jogadores : [], Array.isArray(competicoes) ? competicoes : [], pasta);
    Object.assign(estadoDoMod, { ativo: true, nome: String(mod.nome || pasta), clubes: r.clubes, jogadores: r.jogadores, competicoes: r.competicoes });
    console.info(`[mod] ${estadoDoMod.nome}: ${r.clubes} clubes, ${r.jogadores} jogadores, ${r.competicoes} competicoes`);
  } catch (e) {
    console.warn('[mod] nao foi possivel ler a pasta dados_reais; segue a base generica.', e);
  }
  return estadoDoMod;
};
