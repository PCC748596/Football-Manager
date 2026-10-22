import React, { useEffect, useMemo, useState } from 'react';
import { Player } from '../types';
import { useGame } from '../context/GameContext';
import { EstadoContrato, diasRestantes, estadoDoContrato, faixaDeContrato, mesesRestantes, somarAnos } from '../textSim/contracts';
import { ANOS_MAX, ANOS_MIN, chanceDeAceitar, humorDaOferta, propostaDoJogador } from '../textSim/negociacao';

const ESTILO: Record<EstadoContrato, { rotulo: string; classe: string }> = {
  REGULAR: { rotulo: 'Regular', classe: 'bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-300 dark:border-slate-700' },
  ATENCAO: { rotulo: 'Attention', classe: 'bg-amber-100 dark:bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-300 dark:border-amber-500/40' },
  CRITICO: { rotulo: 'Critical', classe: 'bg-rose-100 dark:bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-300 dark:border-rose-500/40' },
  VENCIDO: { rotulo: 'Expired', classe: 'bg-red-600 text-white border-red-700' }
};

/** O que falta, em texto curto: "2y 3m", "5m" ou "12d". */
export const restanteEmTexto = (fim: string, hoje: string): string => {
  const m = mesesRestantes(fim, hoje);
  if (m >= 12) return `${Math.floor(m / 12)}y ${m % 12}m`;
  if (m >= 1) return `${m}m`;
  const d = diasRestantes(fim, hoje);
  return d > 0 ? `${d}d` : 'expired';
};

export const dataCurta = (iso?: string) => (iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}` : '-');

/** A etiqueta do estado do contrato (regular / atencao / critico / vencido) com o tempo que falta. */
export const ContractChip: React.FC<{ player: Player; hoje: string }> = ({ player, hoje }) => {
  const c = player.contract;
  if (!c) return <span className="text-slate-400">-</span>;
  const estado = estadoDoContrato(c, hoje), e = ESTILO[estado];
  return (
    <span title={`${dataCurta(c.start)} → ${dataCurta(c.end)} (${c.years} years)`} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[11px] font-black uppercase tracking-wide whitespace-nowrap ${e.classe}`}>
      {estado !== 'REGULAR' && <span>{estado === 'VENCIDO' ? '⛔' : '⚠'}</span>}
      {estado === 'VENCIDO' ? e.rotulo : restanteEmTexto(c.end, hoje)}
    </span>
  );
};


/**
 * O modal da renovacao (negociacao). O jogador mostra o que pede (salario e anos); o treinador pode aceitar como esta (assina na hora, moral em alta) ou mudar o salario e/ou
 * os anos: ai o jogador analisa 2 ou 3 dias e responde (aceita: moral em alta; recusa: moral em baixa e o contrato fica como estava).
 */
const RenovarModal: React.FC<{ player: Player; hoje: string; onClose: () => void }> = ({ player, hoje, onClose }) => {
  const { proporRenovacao, negociacoes, formatCurrency } = useGame();
  const pedido = useMemo(() => propostaDoJogador(player, hoje), [player.id, hoje.slice(0, 7)]);
  const [salario, setSalario] = useState(pedido.salario);
  const [anos, setAnos] = useState(pedido.anos);
  const [resultado, setResultado] = useState<'ASSINADO' | 'EM_ANALISE' | null>(null);
  const pendente = negociacoes.find(n => n.playerId === player.id);
  const atual = player.contract;
  const chance = chanceDeAceitar(player, { salario, anos }, pedido);
  const humor = humorDaOferta(chance);
  const igual = chance === 1;
  const HUMOR = {
    MUITO_PROVAVEL: ['Very likely to accept', 'text-emerald-400'], PROVAVEL: ['Likely to accept', 'text-lime-400'],
    INCERTO: ['Uncertain', 'text-amber-400'], IMPROVAVEL: ['Unlikely to accept', 'text-rose-400']
  } as const;
  const [rotuloHumor, corHumor] = HUMOR[humor];
  const [min, max] = faixaDeContrato(player.age);
  const variacao = (v: number, base: number) => (base ? `${v >= base ? '+' : ''}${Math.round(((v - base) / base) * 100)}%` : '');

  const linha = (rotulo: string, valor: string, destaque = false) => (
    <div className="flex justify-between py-1.5 border-b border-slate-800/70 last:border-0"><span className="text-xs font-bold uppercase tracking-wider text-slate-500">{rotulo}</span><span className={`text-sm font-black ${destaque ? 'text-emerald-400' : 'text-slate-200'}`}>{valor}</span></div>
  );
  // ESC fecha so este modal (captura: o Overview que esta por baixo nao recebe a tecla).
  useEffect(() => {
    const aoTeclar = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); onClose(); } };
    window.addEventListener('keydown', aoTeclar, true);
    return () => window.removeEventListener('keydown', aoTeclar, true);
  }, [onClose]);
  const enviar = () => { const r = proporRenovacao(player.id, { salario, anos }); if (r !== 'BLOQUEADO') setResultado(r); };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="w-full max-w-3xl max-h-[95vh] overflow-y-auto custom-scrollbar bg-slate-950 border border-slate-700 rounded-xl shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-slate-800 flex justify-between items-start">
          <div>
            <div className="text-[11px] font-black uppercase tracking-widest text-blue-400">Contract negotiation</div>
            <div className="text-2xl font-black italic uppercase text-white leading-tight">{player.name}</div>
            <div className="text-xs font-bold uppercase tracking-wider text-slate-500">{player.position} • OVR {player.skill} • {player.age} years • morale {Math.round(player.morale ?? 50)}</div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-slate-800 hover:bg-red-600 text-slate-400 hover:text-white transition-colors">✕</button>
        </div>

        {resultado === 'ASSINADO' ? (
          <div className="px-6 py-10 text-center">
            <div className="text-5xl mb-3">✅</div>
            <div className="text-xl font-black text-white">Contract renewed</div>
            <div className="text-sm text-slate-400 mt-2">{player.name} signed for {formatCurrency(salario)} per week, {anos} year(s). He is happy with the deal: morale up.</div>
            <button onClick={onClose} className="mt-6 bg-blue-600 hover:bg-blue-500 text-white font-black px-8 py-2.5 rounded text-xs uppercase tracking-widest transition-colors">Close</button>
          </div>
        ) : resultado === 'EM_ANALISE' || pendente ? (
          <div className="px-6 py-10 text-center">
            <div className="text-5xl mb-3">⏳</div>
            <div className="text-xl font-black text-white">{player.name} is analysing your offer</div>
            {pendente && <div className="text-sm text-slate-400 mt-2">Offer: <span className="font-black text-slate-200">{formatCurrency(pendente.oferta.salario)}</span> per week for <span className="font-black text-slate-200">{pendente.oferta.anos}</span> year(s).<br />He answers on <span className="font-black text-amber-400">{dataCurta(pendente.decide)}</span>. If he refuses, his morale drops; if he accepts, it goes up.</div>}
            <button onClick={onClose} className="mt-6 bg-slate-800 hover:bg-slate-700 text-slate-200 font-black px-8 py-2.5 rounded text-xs uppercase tracking-widest transition-colors">Close</button>
          </div>
        ) : (
          <>
            <div className="px-6 py-4 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-slate-900/60 border border-slate-800 rounded-lg p-3">
                <div className="text-[11px] font-black uppercase tracking-widest text-slate-500 mb-1">Current contract</div>
                {linha('Wage / week', formatCurrency(player.salary))}{linha('Signed', dataCurta(atual?.start))}{linha('Expires', dataCurta(atual?.end))}{linha('Length', atual ? `${atual.years} yr` : '-')}{linha('Left', atual ? restanteEmTexto(atual.end, hoje) : '-')}
              </div>
              <div className="bg-amber-950/20 border border-amber-700/40 rounded-lg p-3">
                <div className="text-[11px] font-black uppercase tracking-widest text-amber-400 mb-1">Player asks</div>
                {linha('Wage / week', formatCurrency(pedido.salario), true)}{linha('vs current', variacao(pedido.salario, player.salary))}{linha('Length', `${pedido.anos} yr`, true)}{linha('Starts', dataCurta(hoje))}{linha('Expires', dataCurta(somarAnos(hoje, pedido.anos)))}
              </div>
              <div className="bg-emerald-950/30 border border-emerald-700/40 rounded-lg p-3 flex flex-col">
                <div className="text-[11px] font-black uppercase tracking-widest text-emerald-400 mb-2">Your offer</div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Wage / week</label>
                <input type="number" min={500} step={100} value={salario} onChange={e => setSalario(Math.max(0, Math.round(Number(e.target.value) || 0)))}
                  className="mt-1 mb-3 w-full bg-slate-900 border border-slate-700 focus:border-emerald-500 rounded px-3 py-2 text-white font-black outline-none" />
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Length (years)</label>
                <div className="mt-1 flex items-center gap-2">
                  <button onClick={() => setAnos(a => Math.max(ANOS_MIN, a - 1))} className="w-9 h-9 rounded bg-slate-800 hover:bg-slate-700 text-white font-black">−</button>
                  <div className="flex-1 text-center text-xl font-black text-white">{anos}</div>
                  <button onClick={() => setAnos(a => Math.min(ANOS_MAX, a + 1))} className="w-9 h-9 rounded bg-slate-800 hover:bg-slate-700 text-white font-black">+</button>
                </div>
                <div className="mt-3 text-xs text-slate-500">Ends {dataCurta(somarAnos(hoje, anos))} • {variacao(salario, pedido.salario)} vs his ask</div>
                <button onClick={() => { setSalario(pedido.salario); setAnos(pedido.anos); }} className="mt-auto pt-3 text-left text-[11px] font-black uppercase tracking-widest text-blue-400 hover:text-blue-300">Use the ask</button>
              </div>
            </div>

            <div className="px-6 pb-2 flex flex-wrap items-center justify-between gap-2 text-sm">
              <div className="font-bold text-slate-400">His mood about your offer: <span className={`font-black ${corHumor}`}>{rotuloHumor}</span></div>
              <div className="text-xs text-slate-500">Typical length for age {player.age}: {min}–{max} years</div>
            </div>
            <div className="px-6 pb-3 text-xs text-slate-500 leading-relaxed">
              {igual ? 'This matches his ask: he signs right away and his morale goes up.' : 'You changed his ask: he will take 2 or 3 days to answer. If he accepts, he signs your terms and his morale goes up; if he refuses, nothing changes in the contract and his morale drops.'}
            </div>
            <div className="px-6 pb-5 flex gap-3">
              <button onClick={enviar} disabled={salario < 500} className={`flex-1 ${igual ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-blue-600 hover:bg-blue-500'} disabled:opacity-40 text-white font-black py-3 rounded text-xs uppercase tracking-widest transition-colors`}>
                {igual ? 'Confirm renewal' : 'Submit offer (answer in 2–3 days)'}
              </button>
              <button onClick={onClose} className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-black py-3 rounded text-xs uppercase tracking-widest transition-colors">Cancel</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

/** O bloco de contrato do jogador: datas, duracao, estado, alerta e (no clube do utilizador) o botao de renovar. */
export const ContractPanel: React.FC<{ player: Player }> = ({ player: recebido }) => {
  const { gameState, userTeam, players, negociacoes } = useGame();
  const player = players.find(p => p.id === recebido.id) || recebido;   // o jogador de agora (o modal guarda uma copia antiga)
  const hoje = gameState.currentDate, c = player.contract;
  const meu = !!userTeam && player.teamId === userTeam.id;
  const [renovando, setRenovando] = useState(false);
  const estado = estadoDoContrato(c, hoje);
  const alerta = estado === 'CRITICO' ? 'Critical: renew or sell this player now.' : estado === 'ATENCAO' ? 'Less than 12 months left: negotiate a renewal or consider selling.' : estado === 'VENCIDO' ? 'The contract has expired.' : '';
  return (
    <div className="bg-slate-900/50 p-3 rounded-lg border border-slate-800">
      <div className="flex items-center justify-between mb-2">
        <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Contract</div>
        {c && <ContractChip player={player} hoje={hoje} />}
      </div>
      {c ? (
        <div className="grid grid-cols-3 gap-3 text-center">
          <div><div className="text-[10px] text-slate-500 font-bold uppercase">Signed</div><div className="text-sm font-black text-slate-200">{dataCurta(c.start)}</div></div>
          <div><div className="text-[10px] text-slate-500 font-bold uppercase">Expires</div><div className="text-sm font-black text-slate-200">{dataCurta(c.end)}</div></div>
          <div><div className="text-[10px] text-slate-500 font-bold uppercase">Length</div><div className="text-sm font-black text-slate-200">{c.years} yr</div></div>
        </div>
      ) : <div className="text-xs text-slate-500">No contract.</div>}
      {alerta && <div className={`mt-2 text-xs font-bold ${estado === 'ATENCAO' ? 'text-amber-400' : 'text-rose-400'}`}>{alerta}</div>}
      {meu && c && (
        <button onClick={() => setRenovando(true)}
          className="mt-3 w-full bg-blue-600 hover:bg-blue-500 text-white font-black py-2 rounded text-xs uppercase tracking-widest transition-colors">{negociacoes.some(n => n.playerId === player.id) ? 'Negotiation in progress' : 'Renew contract'}</button>
      )}
      {renovando && <RenovarModal player={player} hoje={hoje} onClose={() => setRenovando(false)} />}
    </div>
  );
};
