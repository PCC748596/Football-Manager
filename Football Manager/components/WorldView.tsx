import { tx } from '../textSim/idiomas';
import { logoComp } from '../textSim/nomesCompeticoes';
import React, { useEffect, useMemo, useState } from 'react';
import { assetUrl } from '../textSim/assetUrl';
import { useGame } from '../context/GameContext';
import { COUNTRIES } from '../textSim/dataGenerator';
import { WorldLeague, buildTable } from '../textSim/world';
import { Competition, CompMatch, ehLigaFase, FaseVista, NOMES_FASES, fasesDeSerieCD, ligaDoUtilizador, mapaDeClubes, ordemDoGrupoVista, tabelaDoGrupo, teamKey, vencedorDoConfronto } from '../textSim/competitions';
import { Fixture, Team, naLigaDoUtilizador } from '../types';
import { TeamShield } from './TeamShield';

/*
WORLD COMPETITIONS: as ligas do jogo (tabela e jogos de cada uma) e as copas (Libertadores, Sul-Americana, Copa do Brasil). A liga do utilizador mostra os dados REAIS do jogo
(motor completo); o resto vem do mundo simulado em modo rapido (textSim/world.ts, textSim/competitions.ts) e anda com a data do jogo.
*/

// Bandeiras (Assets/Bandeiras/<id do pais>.png) e logos das copas (Assets/Competicoes/<id>.png).
const bandeira = (countryId: string) => assetUrl(`/Assets/Bandeiras/${countryId}.png`);
// O logo da copa vem do mod dos dados reais (dados_reais/competicoes); sem ele fica o quadrado em branco.
const logoCopa = (id: string) => { const u = logoComp(id); return u ? assetUrl(u) : ''; };
// Nomes das abas das Series C e D (as fases do regulamento).
const NOME_FASE_BR: Record<string, string> = { 'SERIE_C:G': 'Segunda fase', 'SERIE_C:F': 'Final', 'SERIE_D:R64': 'Segunda fase', 'SERIE_D:R32': 'Terceira fase', 'SERIE_D:R16': 'Oitavas de final', 'SERIE_D:QF': 'Quartas de final', 'SERIE_D:SF': 'Semi final', 'SERIE_D:PA': 'Playoffs de acesso', 'SERIE_D:F': 'Final' };
// Carabao Cup: uma aba por fase (a mais recente abre primeiro).
const FASES_CARABAO_ABAS = ['R1', 'R2', 'R3', 'R4', 'QF', 'SF', 'F'];
const FASES_FA_ABAS = ['Q3', 'Q4', 'R1', 'R2', 'R3', 'R4', 'R5', 'QF', 'SF', 'F'];
// As copas inglesas a eliminar (Carabao e FA Cup): uma aba por rodada.
const abasInglesas = (id: string): string[] | null => (id === 'CARABAO' ? FASES_CARABAO_ABAS : id === 'FA_CUP' ? FASES_FA_ABAS : null);
// Libertadores e Sul-Americana: o mata-mata em abas por fase (16 clubes, 8, semifinal e final), em vez da aba unica Knockout.
const FASES_COPA_SUL_ABAS = ['R16', 'QF', 'SF', 'F'];
const ehCopaSul = (id: string) => id === 'LIB' || id === 'SUL';
const nomeGrupo = (c: Competition, g: string) => ehLigaFase(c.id) ? 'League phase' : c.id === 'PAULISTA' ? 'First phase' : (c.id === 'SERIE_C' && g === 'L') ? 'First phase' : (c.id === 'SERIE_C' && /^G\d$/.test(g)) ? 'Group ' + g.slice(1) : 'Group ' + g;

// As Series C e D do Brasil sao competicoes (com a fase final): quando o utilizador joga numa delas, a liga dele nao aparece a parte (seria a mesma divisao duas vezes).
const COMP_DA_LIGA: Record<string, Competition['id']> = { bra_serie_c: 'SERIE_C', bra_serie_d: 'SERIE_D' };

// O clube escolhido nas tabelas: fundo hachurado (listras diagonais azuis), para saltar a vista.
const HACHURA: React.CSSProperties = { backgroundImage: 'repeating-linear-gradient(135deg, rgba(37,99,235,0.20) 0, rgba(37,99,235,0.20) 2px, rgba(15,23,42,0.35) 2px, rgba(15,23,42,0.35) 4px)' };

type Selecao = { tipo: 'LIGA'; id: string } | { tipo: 'COPA'; id: Competition['id'] };

const WorldView: React.FC = () => {
  const { world, comps, openWorld, teams, fixtures, userTeam, historicoCopas } = useGame();
  const [sel, setSel] = useState<Selecao | null>(null);
  const [aba, setAba] = useState<string>('TABELA');
  const [rodada, setRodada] = useState<number | null>(null);
  // Paises abertos/fechados na lista: o escolhido pelo utilizador (clique) manda; sem escolha, so o pais do clube do utilizador (e o da selecao atual) fica aberto.
  const [abertos, setAbertos] = useState<Record<string, boolean>>({});

  // O mundo cria-se aqui, depois de o ecra pintar "a carregar" (gerar as ligas demora uma fracao de segundo).
  useEffect(() => {
    if (world) return;
    const id = window.setTimeout(() => { openWorld(); }, 50);
    return () => window.clearTimeout(id);
  }, [world]);

  const meu = useMemo(() => ligaDoUtilizador(userTeam, teams.filter(t => naLigaDoUtilizador(t, userTeam)), fixtures), [userTeam, teams, fixtures]);
  const ligas: WorldLeague[] = useMemo(() => {
    const out: WorldLeague[] = [];
    if (meu) out.push(meu);
    (world || []).filter(l => !l.oculta).forEach(l => out.push(l));
    const ordem = (COUNTRIES as any[]).map(c => c.id);
    return out.sort((a, b) => ordem.indexOf(a.countryId) - ordem.indexOf(b.countryId) || a.tier - b.tier);
  }, [world, meu]);
  const mapa = useMemo(() => mapaDeClubes([...ligas, ...(world || []).filter(l => l.oculta)]), [ligas, world]);

  const compDoMeu = meu && COMP_DA_LIGA[meu.leagueId] && comps?.some(c => c.id === COMP_DA_LIGA[meu.leagueId]) ? COMP_DA_LIGA[meu.leagueId] : null;
  const selecao: Selecao | null = sel || (compDoMeu ? { tipo: 'COPA', id: compDoMeu } : ligas.length ? { tipo: 'LIGA', id: (meu && meu.leagueId) || ligas[0].leagueId } : null);
  const liga = selecao && selecao.tipo === 'LIGA' ? ligas.find(l => l.leagueId === selecao.id) || null : null;
  const copa = selecao && selecao.tipo === 'COPA' && comps ? comps.find(c => c.id === selecao.id) || null : null;
  useEffect(() => { setRodada(null); setAba(copa ? ((copa.id === 'SERIE_C' || copa.id === 'SERIE_D') ? 'P1' : abasInglesas(copa.id) ? 'C:' + (abasInglesas(copa.id)!.filter(s => copa.matches.some(m => m.stage === s)).pop() || 'R1') : copa.groups ? 'GRUPOS' : 'MATA') : 'TABELA'); }, [selecao?.tipo, selecao?.id]);

  if (!world || !comps) {
    return <div className="h-full flex items-center justify-center text-slate-500 dark:text-slate-400 font-black uppercase tracking-widest text-sm animate-pulse">{tx("Generating the world's competitions...")}</div>;
  }

  const fmtData = (s: string) => { const d = new Date(s + 'T12:00:00'); return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`; };
  const th = 'px-3 py-2 text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest border-b border-slate-200 dark:border-slate-800 text-center';
  // Champions, Europa League, Conference e Carabao: escudos dos clubes 15,3% maiores (30x36 -> 34.6x40.6).
  const escudoGrande = !!copa && (ehLigaFase(copa.id) || !!abasInglesas(copa.id));
  const Escudo = ({ k }: { k: string }) => <TeamShield team={mapa.get(k)} className={escudoGrande ? 'w-[34.6px] h-[40.6px]' : 'w-[30px] h-9'} />;
  const nomeDe = (k: string) => mapa.get(k)?.name || '?';
  const souEu = (k: string) => !!userTeam && mapa.get(k)?.id === userTeam.id && k.startsWith(userTeam.leagueId + '|');

  // ------------------------------------------------------------ liga
  const painelLiga = (l: WorldLeague) => {
    const ehMeu = !!meu && l.leagueId === meu.leagueId;
    const tabela = buildTable(l.teams, l.fixtures);
    const rodadas = Array.from(new Set(l.fixtures.map(f => f.week))).filter(w => w > 0).sort((a, b) => a - b);
    const emCurso = rodadas.find(r => l.fixtures.some(f => f.week === r && !f.played)) || rodadas[rodadas.length - 1] || 1;
    const rv = rodada !== null && rodadas.includes(rodada) ? rodada : emCurso;
    const porId = new Map(l.teams.map(t => [t.id, t]));
    const jogos: Fixture[] = l.fixtures.filter(f => f.week === rv).sort((a, b) => a.date.localeCompare(b.date));
    return (
      <>
        <div className="flex gap-2 p-3 border-b border-slate-200 dark:border-slate-800 items-center">
          {(['TABELA', 'JOGOS'] as const).map(a => (
            <button key={a} onClick={() => setAba(a)} className={`px-4 py-1.5 rounded text-[11px] font-black uppercase tracking-widest ${aba === a ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'}`}>{a === 'TABELA' ? 'Standings' : 'Fixtures'}</button>
          ))}
          <span className={`ml-2 text-[10px] font-bold uppercase ${ehMeu ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`}>{ehMeu ? 'your league — full engine' : 'fast simulation'}</span>
          {aba === 'JOGOS' && (
            <div className="ml-auto flex items-center gap-2">
              <button className="px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-black" disabled={rv <= (rodadas[0] || 1)} onClick={() => setRodada(rv - 1)}>◀</button>
              <span className="text-[11px] font-black uppercase tracking-widest text-slate-700 dark:text-slate-200">{tx('Round')} {rv} / {rodadas[rodadas.length - 1] || 1}</span>
              <button className="px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-black" disabled={rv >= (rodadas[rodadas.length - 1] || 1)} onClick={() => setRodada(rv + 1)}>▶</button>
              <button className="px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 text-[10px] text-slate-600 dark:text-slate-300 font-black uppercase" onClick={() => setRodada(null)}>{tx('today')}</button>
            </div>
          )}
        </div>
        <div className="flex-1 overflow-auto custom-scrollbar">
          {aba === 'TABELA' ? (
            <table className="w-full text-left border-separate border-spacing-0">
              <thead className="sticky top-0 z-10 bg-slate-100 dark:bg-slate-950/90">
                <tr><th className={th}>#</th><th className={th + ' text-left'}>{tx('Team')}</th><th className={th}>P</th><th className={th}>W</th><th className={th}>D</th><th className={th}>L</th><th className={th}>GF</th><th className={th}>GA</th><th className={th}>GD</th><th className={th + ' text-blue-600 dark:text-white'}>{tx('Pts')}</th></tr>
              </thead>
              <tbody>
                {tabela.map((r, i) => {
                  const rebaixado = l.relegated > 0 && i >= tabela.length - l.relegated;
                  const eu = userTeam?.id === r.team.id && ehMeu;
                  return (
                    <tr key={r.team.id} style={eu ? HACHURA : undefined} className={`${eu ? '' : ''} ${rebaixado && !eu ? 'bg-red-500/5' : ''}`}>
                      <td className={`px-3 py-[2.5px] text-center text-xs font-black border-b border-slate-100 dark:border-slate-800/30 ${i < 4 ? 'text-emerald-600 dark:text-emerald-400' : rebaixado ? 'text-red-500' : 'text-slate-500'}`}>{i + 1}</td>
                      <td className="px-3 py-[2.5px] border-b border-slate-100 dark:border-slate-800/30"><div className="flex items-center gap-3"><TeamShield team={r.team} className="w-[30px] h-9" /><span className={`text-sm font-bold ${eu ? 'text-blue-600 dark:text-blue-400' : 'text-slate-800 dark:text-slate-200'}`}>{r.team.name}</span></div></td>
                      {[r.played, r.won, r.drawn, r.lost, r.gf, r.ga, r.gd].map((v, k) => <td key={k} className="px-3 py-[2.5px] text-center text-xs text-slate-600 dark:text-slate-300 border-b border-slate-100 dark:border-slate-800/30">{k === 6 && v > 0 ? '+' + v : v}</td>)}
                      <td className="px-3 py-[2.5px] text-center text-sm font-black text-blue-600 dark:text-white border-b border-slate-100 dark:border-slate-800/30">{r.points}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <div className="p-3 space-y-1">
              {jogos.length === 0 && <div className="text-slate-500 text-sm p-4">{tx('No matches in this round.')}</div>}
              {jogos.map(f => {
                const h = porId.get(f.homeTeamId), a = porId.get(f.awayTeamId);
                const eu = ehMeu && userTeam && (f.homeTeamId === userTeam.id || f.awayTeamId === userTeam.id);
                return (
                  <div key={f.id} className={`flex items-center gap-3 px-4 py-2 rounded border ${eu ? 'border-blue-400 bg-blue-600/10' : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40'}`}>
                    <span className="w-12 text-[10px] font-black text-slate-400">{fmtData(f.date)}</span>
                    <span className="flex-1 text-right text-sm font-bold text-slate-800 dark:text-slate-200 truncate">{h?.name}</span>
                    <TeamShield team={h} className="w-[30px] h-9" />
                    <span className="w-16 text-center text-sm font-black text-slate-900 dark:text-white">{f.played ? `${f.homeScore} - ${f.awayScore}` : '—'}</span>
                    <TeamShield team={a} className="w-[30px] h-9" />
                    <span className="flex-1 text-sm font-bold text-slate-800 dark:text-slate-200 truncate">{a?.name}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </>
    );
  };

  // ------------------------------------------------------------ copa
  const linhaJogo = (m: CompMatch) => (
    <div key={m.id} className={`flex items-center gap-3 px-4 py-1.5 rounded border ${souEu(m.homeKey) || souEu(m.awayKey) ? 'border-blue-400 bg-blue-600/10' : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40'}`}>
      <span className="w-12 text-[10px] font-black text-slate-400">{fmtData(m.date)}</span>
      <span className="flex-1 text-right text-sm font-bold text-slate-800 dark:text-slate-200 truncate">{nomeDe(m.homeKey)}</span>
      <Escudo k={m.homeKey} />
      <span className="w-20 text-center text-sm font-black text-slate-900 dark:text-white">{m.played ? `${m.homeScore} - ${m.awayScore}` : '—'}{m.pens ? <span className="block text-[9px] text-slate-400 font-bold">{tx('pens')} {m.pens[0]}-{m.pens[1]}</span> : null}</span>
      <Escudo k={m.awayKey} />
      <span className="flex-1 text-sm font-bold text-slate-800 dark:text-slate-200 truncate">{nomeDe(m.awayKey)}</span>
    </div>
  );

  // Serie C / D com o utilizador: a 1.a fase / o grupo dele e a liga do jogo; a tabela vem das fixtures dele.
  const tabelaDaVista = (c: Competition, g: string) => {
    if (meu && ((c.ligaExterna && g === 'L') || (c.grupoExterno && g === c.grupoExterno))) {
      return buildTable(meu.teams, meu.fixtures).map(r => ({ key: teamKey(meu.leagueId, r.team.id), team: r.team, played: r.played, won: r.won, drawn: r.drawn, lost: r.lost, gf: r.gf, ga: r.ga, points: r.points }));
    }
    return tabelaDoGrupo(c, g, mapa);
  };

  // Series C / D: abas das fases seguintes, com a origem de cada vaga (classificacao do grupo: a do jogo se for o grupo do utilizador).
  const ordemVista = (c: Competition) => (g: string) => {
    if (meu && ((c.ligaExterna && g === 'L') || (c.grupoExterno && g === c.grupoExterno))) {
      const t = buildTable(meu.teams, meu.fixtures);
      return { ord: t.map(r => teamKey(meu.leagueId, r.team.id)), completo: meu.fixtures.length > 0 && meu.fixtures.every(f => f.played), iniciado: meu.fixtures.some(f => f.played) };
    }
    return ordemDoGrupoVista(c, g);
  };
  const slotVista = (s: { rotulo: string; key?: string; provisorio?: boolean }) => (
    <span className={`flex items-center gap-2 min-w-0 ${s.provisorio ? 'opacity-60' : ''}`}>
      {s.key ? <><Escudo k={s.key} /><span className={`text-sm font-bold truncate ${s.provisorio ? 'italic' : ''} text-slate-800 dark:text-slate-200`}>{nomeDe(s.key)}</span>{s.rotulo && <span className="text-[9px] text-slate-400 whitespace-nowrap">{s.rotulo}</span>}</>
        : <span className="text-xs font-bold italic text-slate-400 truncate">{s.rotulo}</span>}
    </span>
  );
  const painelFase = (f: FaseVista, compAtual: string) => (
    <div className="space-y-1">
      <div className="text-[11px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-2">{NOME_FASE_BR[compAtual + ':' + f.stage] || f.titulo}</div>
      {f.grupos && (
        <div className="grid grid-cols-2 gap-4">
          {f.grupos.map(g => (
            <div key={g.nome} className="rounded border border-slate-200 dark:border-slate-800 overflow-hidden">
              <div className="px-3 py-1 bg-slate-100 dark:bg-slate-950/70 text-[10px] font-black uppercase tracking-widest text-slate-500">{g.nome}</div>
              <div className="p-2 space-y-1">{g.slots.map((s, i) => <div key={i} className="px-2 py-1">{slotVista(s)}</div>)}</div>
            </div>
          ))}
        </div>
      )}
      {f.confrontos.map(t => {
        const gols = (k?: string) => k ? t.jogos.filter(m => m.played).reduce((sum, m) => sum + (m.homeKey === k ? m.homeScore || 0 : 0) + (m.awayKey === k ? m.awayScore || 0 : 0), 0) : 0;
        const pens = t.jogos.length ? t.jogos[t.jogos.length - 1].pens : undefined;
        return (
          <div key={t.tie} className={`flex items-center gap-3 px-4 py-1.5 rounded border ${(t.a.key && souEu(t.a.key)) || (t.b.key && souEu(t.b.key)) ? 'border-blue-400 bg-blue-600/10' : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40'}`}>
            <div className="flex-1 min-w-0 flex justify-end">{slotVista(t.a)}</div>
            <span className="w-28 text-center text-sm font-black text-slate-900 dark:text-white">
              {t.jogos.some(m => m.played) ? `${gols(t.a.key)} - ${gols(t.b.key)}` : '—'}
              <span className="block text-[9px] text-slate-400 font-bold">{t.jogos.length ? t.jogos.map(m => m.played ? `${m.homeScore}-${m.awayScore}` : fmtData(m.date)).join(' · ') : ''}{pens ? ` · pens ${pens[0]}-${pens[1]}` : ''}</span>
            </span>
            <div className="flex-1 min-w-0">{slotVista(t.b)}</div>
          </div>
        );
      })}
    </div>
  );

  // Fase unica em tabela (Serie C 1.a fase, Paulista): EXATAMENTE a tabela da Serie A e B (mesmo th, linhas, escudo e espacamento), sem caixa nem margem a volta.
  const estiloLiga = (c: Competition, g: string) => (c.id === 'SERIE_C' && g === 'L') || (c.id === 'PAULISTA' && g === 'L');
  const tabelaEstiloLiga = (c: Competition, g: string) => {
    const linhas = tabelaDaVista(c, g);
    const passam = 8, descem = c.id === 'SERIE_C' ? 4 : 0;   // Serie C: 8 vao a 2.a fase e 4 descem; Paulista: 8 vao as quartas
    return (
      <table className="w-full text-left border-separate border-spacing-0">
        <thead className="sticky top-0 z-10 bg-slate-100 dark:bg-slate-950/90">
          <tr><th className={th}>#</th><th className={th + ' text-left'}>{tx('Team')}</th><th className={th}>P</th><th className={th}>W</th><th className={th}>D</th><th className={th}>L</th><th className={th}>GF</th><th className={th}>GA</th><th className={th}>GD</th><th className={th + ' text-blue-600 dark:text-white'}>{tx('Pts')}</th></tr>
        </thead>
        <tbody>
          {linhas.map((r, i) => {
            const rebaixado = descem > 0 && i >= linhas.length - descem, eu = souEu(r.key), gd = r.gf - r.ga;
            return (
              <tr key={r.key} style={eu ? HACHURA : undefined} className={rebaixado && !eu ? 'bg-red-500/5' : ''}>
                <td className={`px-3 py-[2.5px] text-center text-xs font-black border-b border-slate-100 dark:border-slate-800/30 ${i < passam ? 'text-emerald-600 dark:text-emerald-400' : rebaixado ? 'text-red-500' : 'text-slate-500'}`}>{i + 1}</td>
                <td className="px-3 py-[2.5px] border-b border-slate-100 dark:border-slate-800/30"><div className="flex items-center gap-3"><Escudo k={r.key} /><span className={`text-sm font-bold ${eu ? 'text-blue-600 dark:text-blue-400' : 'text-slate-800 dark:text-slate-200'}`}>{nomeDe(r.key)}</span></div></td>
                {[r.played, r.won, r.drawn, r.lost, r.gf, r.ga, gd].map((v, k) => <td key={k} className="px-3 py-[2.5px] text-center text-xs text-slate-600 dark:text-slate-300 border-b border-slate-100 dark:border-slate-800/30">{k === 6 && v > 0 ? '+' + v : v}</td>)}
                <td className="px-3 py-[2.5px] text-center text-sm font-black text-blue-600 dark:text-white border-b border-slate-100 dark:border-slate-800/30">{r.points}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    );
  };

  const painelCopa = (c: Competition) => {
    const fasesSerie = (c.id === 'SERIE_C' || c.id === 'SERIE_D') ? fasesDeSerieCD(c, ordemVista(c)) : null;
    const fasesTodas = Array.from(new Set(c.matches.filter(m => !m.group).map(m => m.stage)));
    // Champions: o playoff tem a sua aba (entre Groups e Knockout); o Knockout so mostra as fases seguintes.
    const fases = ((abasInglesas(c.id) || ehCopaSul(c.id)) && aba.startsWith('C:')) ? fasesTodas.filter(f => f === aba.slice(2)) : ehLigaFase(c.id) ? (aba === 'PLAYOFF' ? ['PO'].filter(f => fasesTodas.includes(f)) : fasesTodas.filter(f => f !== 'PO')) : fasesTodas;
    return (
      <>
        <div className="flex gap-2 p-3 border-b border-slate-200 dark:border-slate-800 items-center">
          {[...(abasInglesas(c.id) ? [...abasInglesas(c.id)!.map(s => 'C:' + s), 'JOGOS'] : fasesSerie ? ['P1', ...fasesSerie.map(f => 'F:' + f.stage), 'JOGOS'] : c.groups ? ['GRUPOS', ...(ehLigaFase(c.id) ? ['PLAYOFF'] : []), ...(ehCopaSul(c.id) ? [...FASES_COPA_SUL_ABAS.map(f => 'C:' + f), 'JOGOS'] : ['MATA', 'JOGOS'])] : ['MATA', 'JOGOS']), ...((historicoCopas[c.id] || []).length ? ['HIST'] : [])].map(a => (
            <button key={a} onClick={() => setAba(a)} className={`px-4 py-1.5 rounded text-[11px] font-black uppercase tracking-widest ${aba === a ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'}`}>{a === 'HIST' ? 'History' : (abasInglesas(c.id) || (ehCopaSul(c.id) && a.startsWith('C:'))) ? (a === 'JOGOS' ? 'All matches' : NOMES_FASES[a.slice(2)] || a) : fasesSerie ? (a === 'P1' ? 'Primeira fase' : a === 'JOGOS' ? 'Todos os jogos' : (NOME_FASE_BR[c.id + ':' + a.slice(2)] || a)) : (a === 'GRUPOS' ? 'Groups' : a === 'PLAYOFF' ? 'Playoffs' : a === 'MATA' ? 'Knockout' : 'All matches')}</button>
          ))}
          {c.champion && <span className="ml-auto flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-amber-500">🏆 Champion <Escudo k={c.champion} /> {nomeDe(c.champion)}</span>}
        </div>
        <div className={`flex-1 overflow-auto custom-scrollbar ${(aba === 'GRUPOS' || aba === 'P1') && c.groups && estiloLiga(c, 'L') ? '' : 'p-3'}`}>
          {(aba === 'GRUPOS' || aba === 'P1' || (aba === 'F:G' && !!c.groups?.G1)) && c.groups && (
            <div className={`grid ${ehLigaFase(c.id) || estiloLiga(c, 'L') ? 'grid-cols-1' : 'grid-cols-2'} ${estiloLiga(c, 'L') ? '' : 'gap-4'}`}>
              {(aba === 'F:G' ? ['G1', 'G2'] : (aba === 'P1' && c.id === 'SERIE_C') ? ['L'] : Object.keys(c.groups)).map(g => (
                <div key={g} className={estiloLiga(c, g) ? '' : 'rounded border border-slate-200 dark:border-slate-800 overflow-hidden'}>
                  {!estiloLiga(c, g) && <div className="px-3 py-1 bg-slate-100 dark:bg-slate-950/70 text-[10px] font-black uppercase tracking-widest text-slate-500">{nomeGrupo(c, g)}</div>}
                  {estiloLiga(c, g) ? tabelaEstiloLiga(c, g) : (
                  <table className="w-full">
                    <thead><tr><th className={th + ' text-left'}>{tx('Team')}</th><th className={th}>P</th><th className={th}>W</th><th className={th}>D</th><th className={th}>L</th><th className={th}>GD</th><th className={th + ' text-blue-600 dark:text-white'}>{tx('Pts')}</th></tr></thead>
                    <tbody>
                      {tabelaDaVista(c, g).map((r, i) => (
                        <tr key={r.key} style={souEu(r.key) ? HACHURA : undefined}>
                          <td className="px-3 py-1 text-xs font-bold text-slate-800 dark:text-slate-200"><div className="flex items-center gap-2"><span className={`w-3 text-[10px] ${ehLigaFase(c.id) ? (i < 8 ? 'text-emerald-500' : i < 24 ? 'text-amber-500' : 'text-red-400') : (i < (c.id === 'PAULISTA' ? 8 : 2) ? 'text-emerald-500' : 'text-slate-400')}`}>{i + 1}</span><Escudo k={r.key} /><span className="truncate">{nomeDe(r.key)}</span></div></td>
                          {[r.played, r.won, r.drawn, r.lost, r.gf - r.ga].map((v, k) => <td key={k} className="px-2 py-1 text-center text-xs text-slate-600 dark:text-slate-300">{k === 4 && v > 0 ? '+' + v : v}</td>)}
                          <td className="px-2 py-1 text-center text-xs font-black text-blue-600 dark:text-white">{r.points}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  )}
                </div>
              ))}
            </div>
          )}
          {fasesSerie && aba.startsWith('F:') && !(aba === 'F:G' && c.groups?.G1) && (() => { const f = fasesSerie.find(x => x.stage === aba.slice(2)); return f ? painelFase(f, c.id) : null; })()}
          {(aba === 'MATA' || aba === 'PLAYOFF' || aba.startsWith('C:')) && (
            <div className="space-y-5">
              {fases.length === 0 && <div className="text-slate-500 text-sm p-4">{aba === 'PLAYOFF' ? 'The playoffs (9th to 24th) are drawn when the league phase ends.' : abasInglesas(c.id) ? 'This round is drawn when the previous one ends.' : 'The knockout rounds are drawn when the group stage ends.'}</div>}
              {fases.map(f => {
                const ties = Array.from(new Set(c.matches.filter(m => m.stage === f).map(m => m.tie)));
                return (
                  <div key={f}>
                    <div className="text-[11px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-1">{NOMES_FASES[f] || f}</div>
                    <div className="space-y-1">
                      {ties.map(t => {
                        const js = c.matches.filter(m => m.stage === f && m.tie === t).sort((a, b) => (a.leg || 0) - (b.leg || 0));
                        // `ka` = quem joga a volta em casa (o melhor cabeca de serie), `kb` o outro; em jogo unico ka = casa.
                        const ka = js.length === 2 ? js[1].homeKey : js[0].homeKey, kb = js.length === 2 ? js[1].awayKey : js[0].awayKey;
                        const gol = (k: string) => js.filter(m => m.played).reduce((s, m) => s + (m.homeKey === k ? m.homeScore || 0 : 0) + (m.awayKey === k ? m.awayScore || 0 : 0), 0);
                        const terminou = js.every(m => m.played);
                        const venc = terminou ? vencedorDoConfronto(js.map(m => ({ ...m })), new Map(), false) : null;
                        const pens = js[js.length - 1].pens;
                        return (
                          <div key={t} className={`flex items-center gap-3 px-4 py-2 rounded border ${souEu(ka) || souEu(kb) ? 'border-blue-400 bg-blue-600/10' : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40'}`}>
                            <span className={`flex-1 text-right text-sm truncate ${venc === ka ? 'font-black text-slate-900 dark:text-white' : 'font-bold text-slate-600 dark:text-slate-400'}`}>{nomeDe(ka)}</span>
                            <Escudo k={ka} />
                            <span className="w-28 text-center text-sm font-black text-slate-900 dark:text-white">
                              {js.some(m => m.played) ? `${gol(ka)} - ${gol(kb)}` : '—'}
                              <span className="block text-[9px] text-slate-400 font-bold">{js.map(m => m.played ? `${m.homeScore}-${m.awayScore}` : fmtData(m.date)).join(' · ')}{pens ? ` · pens ${pens[0]}-${pens[1]}` : ''}</span>
                            </span>
                            <Escudo k={kb} />
                            <span className={`flex-1 text-sm truncate ${venc === kb ? 'font-black text-slate-900 dark:text-white' : 'font-bold text-slate-600 dark:text-slate-400'}`}>{nomeDe(kb)}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          {aba === 'HIST' && (
            <div className="space-y-1">
              <div className="grid grid-cols-[70px_1fr_1fr] gap-3 px-4 pb-1 text-[10px] font-black uppercase tracking-widest text-slate-400"><span>{tx('Season')}</span><span>{tx('Champion')}</span><span>{tx('Runner-up')}</span></div>
              {(historicoCopas[c.id] || []).slice().reverse().map(r => (
                <div key={r.ano} className="grid grid-cols-[70px_1fr_1fr] gap-3 items-center px-4 py-2 rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40 text-sm">
                  <span className="font-black text-slate-500">{r.ano}</span>
                  <span className="font-black text-amber-500 truncate">🏆 {r.campeao}</span>
                  <span className="font-bold text-slate-600 dark:text-slate-300 truncate">{r.vice || '—'}</span>
                </div>
              ))}
            </div>
          )}
          {aba === 'JOGOS' && (
            <div className="space-y-1">
              {Array.from(new Set(c.matches.slice().sort((x, y) => x.date.localeCompare(y.date)).map(m => m.date))).map(d => (
                <div key={d} className="mb-2">
                  <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">{fmtData(d)} · {NOMES_FASES[c.matches.find(m => m.date === d)!.stage] || ''}</div>
                  <div className="space-y-1">{c.matches.filter(m => m.date === d).map(linhaJogo)}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </>
    );
  };

  const cabecalho = liga ? `${liga.countryName} · ${liga.leagueName}` : copa ? copa.name : '';
  // A lista da esquerda: as copas soltas e, por pais, as divisoes (ligas + as Series C e D do Brasil, que sao competicoes) dentro do cartao do pais.
  type Item = { sel: Selecao; titulo: string; sub: string; tier: number };
  const paises = (() => {
    const m = new Map<string, { id: string; nome: string; itens: Item[] }>();
    // Um cartao por PAIS (agrupado pelo nome, para um jogo antigo com o pais escrito de outra forma nao abrir um cartao a parte), com o id certo da base (a bandeira usa-o).
    const pais = (id: string, nome: string) => {
      const real = (COUNTRIES as any[]).find(c => c.name === nome || c.id === id);
      const chave = real ? real.id : id;
      let p = m.get(chave);
      if (!p) { p = { id: chave, nome: real ? real.name : nome, itens: [] }; m.set(chave, p); }
      return p;
    };
    const jaTem = new Set<string>();
    ligas.forEach(l => {
      if (jaTem.has(l.leagueId)) return;   // nunca a mesma liga duas vezes
      if (comps.some(c => c.id === COMP_DA_LIGA[l.leagueId])) return;   // Series C e D: aparecem como competicao
      jaTem.add(l.leagueId);
      pais(l.countryId, l.countryName).itens.push({ sel: { tipo: 'LIGA', id: l.leagueId }, titulo: l.leagueName, sub: `${l.teams.length} clubs`, tier: l.tier });
    });
    comps.filter(c => c.id === 'SERIE_C' || c.id === 'SERIE_D' || c.id === 'PAULISTA' || c.id === 'CARIOCA' || c.id === 'MINEIRO' || c.id === 'GAUCHO' || c.id === 'CATARINENSE' || c.id === 'PARANAENSE' || c.id === 'BAIANO' || c.id === 'PERNAMBUCANO' || c.id === 'CEARENSE' || c.id === 'GOIANO' || c.id === 'PARAENSE' || c.id === 'AMAZONENSE' || c.id === 'MARANHENSE' || c.id === 'POTIGUAR').forEach(c => pais('45', 'Brazil').itens.push({ sel: { tipo: 'COPA', id: c.id }, titulo: c.name, sub: `${c.teamKeys.length} clubs${c.champion ? ' · finished' : ''}`, tier: c.id === 'SERIE_C' ? 3 : c.id === 'SERIE_D' ? 4 : 5 }));
    const ordem = (COUNTRIES as any[]).map(c => c.id);
    return Array.from(m.values()).sort((x, y) => ordem.indexOf(x.id) - ordem.indexOf(y.id)).map(p => ({ ...p, itens: p.itens.sort((a, b) => a.tier - b.tier) }));
  })();
  const copasSoltas = comps.filter(c => ehLigaFase(c.id) || !!abasInglesas(c.id) || c.id === 'LIB' || c.id === 'SUL' || c.id === 'COPA_BR');

  return (
    <div className="h-full flex flex-col animate-fade-in min-h-0">
      <div className="mb-4 flex items-end justify-between">
        <h2 className="text-4xl font-black uppercase tracking-tighter leading-none italic">
          <span className="text-slate-900 dark:text-white">{tx('WORLD')}</span> <span className="text-blue-500">{tx('COMPETITIONS')}</span>
        </h2>
        <div className="text-[11px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">{cabecalho}</div>
      </div>
      <div className="flex-1 flex gap-4 min-h-0">
        <div className="w-64 flex-shrink-0 overflow-y-auto custom-scrollbar pr-1 space-y-1">
          <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1 pt-1">{tx('Cups')}</div>
          {copasSoltas.map(c => {
            const ativo = selecao?.tipo === 'COPA' && selecao.id === c.id;
            return (
              <button key={c.id} onClick={() => setSel({ tipo: 'COPA', id: c.id })}
                className={`w-full flex items-center gap-3 text-left px-3 py-2 rounded-lg border-2 transition-all ${ativo ? 'bg-blue-600/15 border-blue-500' : 'bg-slate-50 dark:bg-slate-800/70 border-slate-200 dark:border-slate-700 hover:border-blue-400'}`}>
                <span className="w-11 h-11 flex-shrink-0 rounded bg-white flex items-center justify-center p-1">{logoCopa(c.id) && <img src={logoCopa(c.id)} alt="" className="max-w-full max-h-full object-contain" />}</span>
                <span className="min-w-0">
                  <span className="block text-xs font-black uppercase leading-tight text-slate-800 dark:text-slate-100">{c.name}</span>
                  <span className="block text-[10px] font-bold text-slate-400">{c.teamKeys.length} clubs{c.champion ? ' · finished' : ''}</span>
                </span>
              </button>
            );
          })}
          <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1 pt-3">{tx('Countries')}</div>
          {paises.map(p => {
            const meuPais = !!meu && p.itens.some(it => (it.sel.tipo === 'LIGA' && it.sel.id === meu.leagueId) || (it.sel.tipo === 'COPA' && it.sel.id === compDoMeu));
            const temSelecao = !!selecao && p.itens.some(it => it.sel.tipo === selecao.tipo && it.sel.id === selecao.id);
            const aberto = abertos[p.id] ?? (meuPais || temSelecao);
            return (
              <div key={p.id} className="rounded-lg border-2 border-slate-200 dark:border-slate-700 overflow-hidden bg-slate-50 dark:bg-slate-800/70">
                <button onClick={() => setAbertos(a => ({ ...a, [p.id]: !aberto }))} className={`w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-slate-100 dark:hover:bg-slate-700/50 ${aberto ? 'border-b border-slate-200 dark:border-slate-700' : ''}`}>
                  <img src={bandeira(p.id)} alt="" className="w-8 h-[22px] object-cover rounded-sm shadow flex-shrink-0" />
                  <span className="flex-1 text-xs font-black uppercase leading-tight text-slate-800 dark:text-slate-100">{p.nome}{meuPais ? ' ★' : ''}</span>
                  <span className="flex items-center gap-1.5 text-slate-500 dark:text-slate-300"><span className="text-sm font-black">{p.itens.length}</span><span className="text-xl leading-none">{aberto ? '▾' : '▸'}</span></span>
                </button>
                {aberto && <div className="p-1 space-y-0">
                  {p.itens.map(it => {
                    const ativo = !!selecao && selecao.tipo === it.sel.tipo && selecao.id === it.sel.id;
                    return (
                      <button key={it.sel.tipo + it.sel.id} onClick={() => setSel(it.sel)}
                        className={`w-full text-left px-3 py-1.5 rounded transition-all ${ativo ? 'bg-blue-600 text-white' : 'bg-white dark:bg-slate-900/70 text-slate-700 dark:text-slate-200 hover:bg-blue-50 dark:hover:bg-slate-700/70'}`}>
                        <div className="text-[11px] font-black uppercase leading-tight">{it.titulo}{meu && ((it.sel.tipo === 'LIGA' && it.sel.id === meu.leagueId) || (it.sel.tipo === 'COPA' && it.sel.id === compDoMeu)) ? ' ★' : ''}</div>
                        <div className={`text-[10px] font-bold ${ativo ? 'text-blue-100' : 'text-slate-400'}`}>{it.sub}</div>
                      </button>
                    );
                  })}
                </div>}
              </div>
            );
          })}
        </div>
        <div className="flex-1 min-w-0 flex flex-col bg-white/80 dark:bg-slate-900/40 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800/50 overflow-hidden">
          {liga && painelLiga(liga)}
          {copa && painelCopa(copa)}
        </div>
      </div>
    </div>
  );
};

export default WorldView;
