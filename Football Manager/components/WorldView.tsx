import React, { useEffect, useMemo, useState } from 'react';
import { useGame } from '../context/GameContext';
import { COUNTRIES } from '../textSim/dataGenerator';
import { WorldLeague, buildTable } from '../textSim/world';
import { Competition, CompMatch, NOMES_FASES, ligaDoUtilizador, mapaDeClubes, tabelaDoGrupo, vencedorDoConfronto } from '../textSim/competitions';
import { Fixture, Team } from '../types';
import { TeamShield } from './TeamShield';

/*
WORLD COMPETITIONS: as ligas do jogo (tabela e jogos de cada uma) e as copas (Libertadores, Sul-Americana, Copa do Brasil). A liga do utilizador mostra os dados REAIS do jogo
(motor completo); o resto vem do mundo simulado em modo rapido (textSim/world.ts, textSim/competitions.ts) e anda com a data do jogo.
*/

// Cores das bandeiras: [cor principal, cor secundaria]. Os botoes das ligas usam-nas.
const CORES_PAIS: Record<string, [string, string]> = {
  '45': ['#009739', '#FEDD00'], '65': ['#FFFFFF', '#CF081F'], '52': ['#75AADB', '#FFFFFF'], '53': ['#D52B1E', '#F9E300'], '55': ['#D52B1E', '#0039A6'],
  '56': ['#FCD116', '#003893'], '57': ['#FFDD00', '#034EA2'], '58': ['#D52B1E', '#0038A8'], '59': ['#D91023', '#FFFFFF'], '60': ['#5CBFEB', '#FFFFFF'], '61': ['#FFCC00', '#00247D']
};
const CORES_COPA: Record<string, [string, string]> = { LIB: ['#C8A24A', '#111111'], SUL: ['#0B3D91', '#F2C400'], COPA_BR: ['#0B7A3B', '#FEDD00'] };
const luz = (hex: string) => { const n = parseInt(hex.slice(1), 16); return (0.2126 * (n >> 16) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255)) / 255; };
const estiloBotao = (cores: [string, string], ativo: boolean): React.CSSProperties => ({
  background: `linear-gradient(100deg, ${cores[0]} 0%, ${cores[0]} 62%, ${cores[1]} 100%)`,
  color: luz(cores[0]) > 0.6 ? '#0f172a' : '#ffffff',
  boxShadow: ativo ? `0 0 0 3px #ffffff, 0 0 0 5px ${cores[1]}` : 'none',
  opacity: ativo ? 1 : 0.82,
  borderColor: cores[1]
});

type Selecao = { tipo: 'LIGA'; id: string } | { tipo: 'COPA'; id: Competition['id'] };

const WorldView: React.FC = () => {
  const { world, comps, openWorld, teams, fixtures, userTeam } = useGame();
  const [sel, setSel] = useState<Selecao | null>(null);
  const [aba, setAba] = useState<string>('TABELA');
  const [rodada, setRodada] = useState<number | null>(null);

  // O mundo cria-se aqui, depois de o ecra pintar "a carregar" (gerar as ligas demora uma fracao de segundo).
  useEffect(() => {
    if (world) return;
    const id = window.setTimeout(() => { openWorld(); }, 50);
    return () => window.clearTimeout(id);
  }, [world]);

  const meu = useMemo(() => ligaDoUtilizador(userTeam, teams.filter(t => !userTeam || t.leagueId === userTeam.leagueId), fixtures), [userTeam, teams, fixtures]);
  const ligas: WorldLeague[] = useMemo(() => {
    const out: WorldLeague[] = [];
    if (meu) out.push(meu);
    (world || []).forEach(l => out.push(l));
    const ordem = (COUNTRIES as any[]).map(c => c.id);
    return out.sort((a, b) => ordem.indexOf(a.countryId) - ordem.indexOf(b.countryId) || a.tier - b.tier);
  }, [world, meu]);
  const mapa = useMemo(() => mapaDeClubes(ligas), [ligas]);

  const selecao: Selecao | null = sel || (ligas.length ? { tipo: 'LIGA', id: (meu && meu.leagueId) || ligas[0].leagueId } : null);
  const liga = selecao && selecao.tipo === 'LIGA' ? ligas.find(l => l.leagueId === selecao.id) || null : null;
  const copa = selecao && selecao.tipo === 'COPA' && comps ? comps.find(c => c.id === selecao.id) || null : null;
  useEffect(() => { setRodada(null); setAba(copa ? (copa.groups ? 'GRUPOS' : 'MATA') : 'TABELA'); }, [selecao?.tipo, selecao?.id]);

  if (!world || !comps) {
    return <div className="h-full flex items-center justify-center text-slate-500 dark:text-slate-400 font-black uppercase tracking-widest text-sm animate-pulse">A gerar as competições do mundo...</div>;
  }

  const fmtData = (s: string) => { const d = new Date(s + 'T12:00:00'); return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`; };
  const th = 'px-3 py-2 text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest border-b border-slate-200 dark:border-slate-800 text-center';
  const Escudo = ({ k }: { k: string }) => <TeamShield team={mapa.get(k)} className="w-5 h-6" />;
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
              <span className="text-[11px] font-black uppercase tracking-widest text-slate-700 dark:text-slate-200">Round {rv} / {rodadas[rodadas.length - 1] || 1}</span>
              <button className="px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-black" disabled={rv >= (rodadas[rodadas.length - 1] || 1)} onClick={() => setRodada(rv + 1)}>▶</button>
              <button className="px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 text-[10px] text-slate-600 dark:text-slate-300 font-black uppercase" onClick={() => setRodada(null)}>today</button>
            </div>
          )}
        </div>
        <div className="flex-1 overflow-auto custom-scrollbar">
          {aba === 'TABELA' ? (
            <table className="w-full text-left border-separate border-spacing-0">
              <thead className="sticky top-0 z-10 bg-slate-100 dark:bg-slate-950/90">
                <tr><th className={th}>#</th><th className={th + ' text-left'}>Team</th><th className={th}>P</th><th className={th}>W</th><th className={th}>D</th><th className={th}>L</th><th className={th}>GF</th><th className={th}>GA</th><th className={th}>GD</th><th className={th + ' text-blue-600 dark:text-white'}>Pts</th></tr>
              </thead>
              <tbody>
                {tabela.map((r, i) => {
                  const rebaixado = l.relegated > 0 && i >= tabela.length - l.relegated;
                  const eu = userTeam?.id === r.team.id && ehMeu;
                  return (
                    <tr key={r.team.id} className={`${eu ? 'bg-blue-600/10' : ''} ${rebaixado ? 'bg-red-500/5' : ''}`}>
                      <td className={`px-3 py-1.5 text-center text-xs font-black border-b border-slate-100 dark:border-slate-800/30 ${i < 4 ? 'text-emerald-600 dark:text-emerald-400' : rebaixado ? 'text-red-500' : 'text-slate-500'}`}>{i + 1}</td>
                      <td className="px-3 py-1.5 border-b border-slate-100 dark:border-slate-800/30"><div className="flex items-center gap-3"><TeamShield team={r.team} className="w-5 h-6" /><span className={`text-sm font-bold ${eu ? 'text-blue-600 dark:text-blue-400' : 'text-slate-800 dark:text-slate-200'}`}>{r.team.name}</span></div></td>
                      {[r.played, r.won, r.drawn, r.lost, r.gf, r.ga, r.gd].map((v, k) => <td key={k} className="px-3 py-1.5 text-center text-xs text-slate-600 dark:text-slate-300 border-b border-slate-100 dark:border-slate-800/30">{k === 6 && v > 0 ? '+' + v : v}</td>)}
                      <td className="px-3 py-1.5 text-center text-sm font-black text-blue-600 dark:text-white border-b border-slate-100 dark:border-slate-800/30">{r.points}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <div className="p-3 space-y-1">
              {jogos.length === 0 && <div className="text-slate-500 text-sm p-4">No matches in this round.</div>}
              {jogos.map(f => {
                const h = porId.get(f.homeTeamId), a = porId.get(f.awayTeamId);
                const eu = ehMeu && userTeam && (f.homeTeamId === userTeam.id || f.awayTeamId === userTeam.id);
                return (
                  <div key={f.id} className={`flex items-center gap-3 px-4 py-2 rounded border ${eu ? 'border-blue-400 bg-blue-600/10' : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40'}`}>
                    <span className="w-12 text-[10px] font-black text-slate-400">{fmtData(f.date)}</span>
                    <span className="flex-1 text-right text-sm font-bold text-slate-800 dark:text-slate-200 truncate">{h?.name}</span>
                    <TeamShield team={h} className="w-5 h-6" />
                    <span className="w-16 text-center text-sm font-black text-slate-900 dark:text-white">{f.played ? `${f.homeScore} - ${f.awayScore}` : '—'}</span>
                    <TeamShield team={a} className="w-5 h-6" />
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
      <span className="w-20 text-center text-sm font-black text-slate-900 dark:text-white">{m.played ? `${m.homeScore} - ${m.awayScore}` : '—'}{m.pens ? <span className="block text-[9px] text-slate-400 font-bold">pens {m.pens[0]}-{m.pens[1]}</span> : null}</span>
      <Escudo k={m.awayKey} />
      <span className="flex-1 text-sm font-bold text-slate-800 dark:text-slate-200 truncate">{nomeDe(m.awayKey)}</span>
    </div>
  );

  const painelCopa = (c: Competition) => {
    const fases = Array.from(new Set(c.matches.filter(m => !m.group).map(m => m.stage)));
    return (
      <>
        <div className="flex gap-2 p-3 border-b border-slate-200 dark:border-slate-800 items-center">
          {(c.groups ? ['GRUPOS', 'MATA', 'JOGOS'] : ['MATA', 'JOGOS']).map(a => (
            <button key={a} onClick={() => setAba(a)} className={`px-4 py-1.5 rounded text-[11px] font-black uppercase tracking-widest ${aba === a ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'}`}>{a === 'GRUPOS' ? 'Groups' : a === 'MATA' ? 'Knockout' : 'All matches'}</button>
          ))}
          {c.champion && <span className="ml-auto flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-amber-500">🏆 Champion <Escudo k={c.champion} /> {nomeDe(c.champion)}</span>}
        </div>
        <div className="flex-1 overflow-auto custom-scrollbar p-3">
          {aba === 'GRUPOS' && c.groups && (
            <div className="grid grid-cols-2 gap-4">
              {Object.keys(c.groups).map(g => (
                <div key={g} className="rounded border border-slate-200 dark:border-slate-800 overflow-hidden">
                  <div className="px-3 py-1 bg-slate-100 dark:bg-slate-950/70 text-[10px] font-black uppercase tracking-widest text-slate-500">Group {g}</div>
                  <table className="w-full">
                    <thead><tr><th className={th + ' text-left'}>Team</th><th className={th}>P</th><th className={th}>W</th><th className={th}>D</th><th className={th}>L</th><th className={th}>GD</th><th className={th + ' text-blue-600 dark:text-white'}>Pts</th></tr></thead>
                    <tbody>
                      {tabelaDoGrupo(c, g, mapa).map((r, i) => (
                        <tr key={r.key} className={souEu(r.key) ? 'bg-blue-600/10' : ''}>
                          <td className="px-3 py-1 text-xs font-bold text-slate-800 dark:text-slate-200"><div className="flex items-center gap-2"><span className={`w-3 text-[10px] ${i < 2 ? 'text-emerald-500' : 'text-slate-400'}`}>{i + 1}</span><Escudo k={r.key} /><span className="truncate">{nomeDe(r.key)}</span></div></td>
                          {[r.played, r.won, r.drawn, r.lost, r.gf - r.ga].map((v, k) => <td key={k} className="px-2 py-1 text-center text-xs text-slate-600 dark:text-slate-300">{k === 4 && v > 0 ? '+' + v : v}</td>)}
                          <td className="px-2 py-1 text-center text-xs font-black text-blue-600 dark:text-white">{r.points}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          )}
          {aba === 'MATA' && (
            <div className="space-y-5">
              {fases.length === 0 && <div className="text-slate-500 text-sm p-4">The knockout rounds are drawn when the group stage ends.</div>}
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
  const botaoLiga = (l: WorldLeague) => {
    const ativo = selecao?.tipo === 'LIGA' && selecao.id === l.leagueId;
    return (
      <button key={l.leagueId} onClick={() => setSel({ tipo: 'LIGA', id: l.leagueId })} style={estiloBotao(CORES_PAIS[l.countryId] || ['#64748b', '#94a3b8'], ativo)}
        className="w-full text-left px-3 py-2 rounded border-2 transition-all">
        <div className="text-xs font-black uppercase leading-tight">{l.countryName}{meu && l.leagueId === meu.leagueId ? ' ★' : ''}</div>
        <div className="text-[10px] font-bold opacity-80">{l.leagueName} · {l.teams.length} clubs</div>
      </button>
    );
  };

  return (
    <div className="h-full flex flex-col animate-fade-in min-h-0">
      <div className="mb-4 flex items-end justify-between">
        <h2 className="text-4xl font-black uppercase tracking-tighter leading-none italic">
          <span className="text-slate-900 dark:text-white">WORLD</span> <span className="text-blue-500">COMPETITIONS</span>
        </h2>
        <div className="text-[11px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">{cabecalho}</div>
      </div>
      <div className="flex-1 flex gap-4 min-h-0">
        <div className="w-64 flex-shrink-0 overflow-y-auto custom-scrollbar pr-1 space-y-1">
          <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1 pt-1">Cups</div>
          {comps.map(c => {
            const ativo = selecao?.tipo === 'COPA' && selecao.id === c.id;
            return (
              <button key={c.id} onClick={() => setSel({ tipo: 'COPA', id: c.id })} style={estiloBotao(CORES_COPA[c.id], ativo)} className="w-full text-left px-3 py-2 rounded border-2 transition-all">
                <div className="text-xs font-black uppercase leading-tight">{c.name}</div>
                <div className="text-[10px] font-bold opacity-80">{c.teamKeys.length} clubs{c.champion ? ' · finished' : ''}</div>
              </button>
            );
          })}
          <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1 pt-3">Leagues</div>
          {ligas.map(botaoLiga)}
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
