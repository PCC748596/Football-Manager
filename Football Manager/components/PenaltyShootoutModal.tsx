import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useGame } from '../context/GameContext';
import { Player, Team } from '../types';
import PenaltyOrderView from './PenaltyOrderView';
import { Cobranca, Lado, chanceDeGol, estadoDaDisputa, normalizarOrdem, simularDisputaCom, COBRANCAS_REGULARES } from '../textSim/penaltyShootout';

/*
A DISPUTA DE PENALTIS DO UTILIZADOR (copas: jogo unico ou agregado empatado). Abre sozinha quando um confronto dele acaba empatado (`disputaDePenaltis`): 1) o tecnico escolhe a ordem
dos batedores (PenaltyOrderView, todo o plantel, goleiro incluido, ja pelos melhores em Penalties + Consistency); 2) as cobrancas saem uma a uma (regras em textSim/penaltyShootout.ts:
5 alternadas, depois 1 para cada lado, e volta ao primeiro batedor se acabarem); 3) o resultado e gravado no jogo que decide o confronto. O adversario bate pela ordem automatica.
*/
const PenaltyShootoutModal: React.FC = () => {
  const { disputaDePenaltis, registrarPenaltis, definirOrdemPenaltis, teams, players, userTeam } = useGame();
  const [fase, setFase] = useState<'ORDEM' | 'DISPUTA'>('ORDEM');
  const [cobrancas, setCobrancas] = useState<Cobranca[]>([]);
  const [mostradas, setMostradas] = useState(0);
  const [ordens, setOrdens] = useState<{ casa: string[]; fora: string[] } | null>(null);
  const chave = disputaDePenaltis ? disputaDePenaltis.compId + '|' + disputaDePenaltis.matchId : '';
  const ultimaChave = useRef('');
  useEffect(() => { if (chave !== ultimaChave.current) { ultimaChave.current = chave; setFase('ORDEM'); setCobrancas([]); setMostradas(0); setOrdens(null); } }, [chave]);

  const d = disputaDePenaltis;
  const usuarioEhCasa = !!(d && userTeam && d.casaKey.endsWith('|' + userTeam.id));
  const idCasa = d ? d.casaKey.split('|')[1] : '', idFora = d ? d.foraKey.split('|')[1] : '';
  const timeCasa: Team | undefined = teams.find(t => t.id === idCasa);
  const timeFora: Team | undefined = teams.find(t => t.id === idFora);
  const elenco = (id: string): Player[] => players.filter(p => p.teamId === id);
  const porId = useMemo(() => { const m: Record<string, Player> = {}; players.forEach(p => { m[p.id] = p; }); return m; }, [players]);

  // O tempo das cobrancas: uma a cada ~1,1 s (ate o fim).
  useEffect(() => {
    if (fase !== 'DISPUTA' || mostradas >= cobrancas.length) return;
    const h = setTimeout(() => setMostradas(n => Math.min(cobrancas.length, n + 1)), 1100);
    return () => clearTimeout(h);
  }, [fase, mostradas, cobrancas.length]);

  if (!d || !userTeam || !timeCasa || !timeFora) return null;
  const meuTime = usuarioEhCasa ? timeCasa : timeFora;
  const elencoMeu = elenco(meuTime.id);

  const iniciar = (ordemMeu: string[]) => {
    definirOrdemPenaltis(meuTime.id, ordemMeu);
    const outro = usuarioEhCasa ? timeFora : timeCasa;
    const elencoOutro = elenco(outro.id);
    const ordemOutro = normalizarOrdem(outro.penaltyOrder, elencoOutro);
    const ordemCasa = usuarioEhCasa ? ordemMeu : ordemOutro, ordemFora = usuarioEhCasa ? ordemOutro : ordemMeu;
    const gkDe = (lista: Player[]) => lista.find(p => p.position === 'GK') || null;
    const gkCasa = gkDe(elenco(timeCasa.id)), gkFora = gkDe(elenco(timeFora.id));
    const lista = simularDisputaCom(ordemCasa, ordemFora, (lado: Lado, id: string) => {
      const b = porId[id];
      return b ? chanceDeGol(b, lado === 'casa' ? gkFora : gkCasa) : 0.72;
    }, Math.random, Math.random() < 0.5 ? 'casa' : 'fora');
    setOrdens({ casa: ordemCasa, fora: ordemFora });
    setCobrancas(lista);
    setMostradas(0);
    setFase('DISPUTA');
  };

  const terminou = fase === 'DISPUTA' && mostradas >= cobrancas.length && cobrancas.length > 0;
  const primeiro: Lado = cobrancas.length ? cobrancas[0].lado : 'casa';
  const estado = estadoDaDisputa(cobrancas.slice(0, mostradas), primeiro);
  const nomeDe = (id: string) => (porId[id] ? porId[id].name : '—');
  const confirmar = () => {
    const f = estadoDaDisputa(cobrancas, primeiro);
    registrarPenaltis(d.compId, d.matchId, [f.golsCasa, f.golsFora]);
  };

  return (
    <div className="absolute inset-0 z-[300] bg-slate-950/90 backdrop-blur-sm flex items-center justify-center p-6">
      {fase === 'ORDEM' ? (
        <PenaltyOrderView time={meuTime} jogadores={elencoMeu} ordemInicial={meuTime.penaltyOrder} aoConfirmar={iniciar} />
      ) : (
        <div className="flex flex-col gap-4 w-full max-w-2xl bg-slate-900/95 p-6 rounded-3xl border border-slate-800 shadow-2xl">
          <div className="text-center">
            <h2 className="text-xl font-black text-white uppercase italic tracking-widest">Penalty Shootout</h2>
            <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">After the match: {timeCasa.name} {d.golsCasa} - {d.golsFora} {timeFora.name}</p>
          </div>
          <div className="flex items-center justify-center gap-6 text-white">
            <span className="text-sm font-black uppercase truncate max-w-[10rem] text-right">{timeCasa.name}</span>
            <span className="text-4xl font-black tabular-nums">{estado.golsCasa} - {estado.golsFora}</span>
            <span className="text-sm font-black uppercase truncate max-w-[10rem]">{timeFora.name}</span>
          </div>
          <div className="grid grid-cols-2 gap-4 text-xs">
            {(['casa', 'fora'] as Lado[]).map(lado => {
              const minhas = cobrancas.slice(0, mostradas).filter(c => c.lado === lado);
              return (
                <div key={lado} className="flex flex-col gap-1">
                  {minhas.map((c, i) => (
                    <div key={i} className="flex items-center gap-2 bg-slate-800 rounded px-2 py-1">
                      <span className="w-5 text-slate-500 font-black">{i + 1}{i + 1 > COBRANCAS_REGULARES ? '*' : ''}</span>
                      <span className="flex-1 font-bold text-white truncate">{nomeDe(c.jogadorId)}</span>
                      <span className={`font-black ${c.gol ? 'text-emerald-400' : 'text-rose-400'}`}>{c.gol ? 'GOAL' : 'MISS'}</span>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
          {terminou ? (
            <div className="flex flex-col items-center gap-3">
              <div className="text-lg font-black text-emerald-400 uppercase tracking-widest">
                {(estado.vencedor === 'casa' ? timeCasa : timeFora).name} wins on penalties ({estado.golsCasa}-{estado.golsFora})
              </div>
              <button onClick={confirmar} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black py-3 rounded-xl text-xs uppercase tracking-[0.2em] border-b-4 border-emerald-800">Continue</button>
            </div>
          ) : (
            <button onClick={() => setMostradas(cobrancas.length)} className="self-center bg-slate-800 hover:bg-slate-700 text-slate-300 font-black px-4 py-2 rounded text-[10px] uppercase tracking-widest">Skip</button>
          )}
        </div>
      )}
    </div>
  );
};

export default PenaltyShootoutModal;
