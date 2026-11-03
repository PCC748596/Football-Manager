import React, { useState } from 'react';
import { useGame } from '../context/GameContext';
import { assetUrl } from '../textSim/assetUrl';
import { PATROCINADORES, statusDoPatrocinador, reputacaoMinima, diasParaFim, ANOS_MIN, ANOS_MAX, valorAnualPara, bonusPctDaMarca, FATOR_DURACAO, JANELA_RENOVACAO_DIAS, type Patrocinador, type RegiaoPatrocinio } from '../textSim/patrocinadores';
import { paraDolares } from '../textSim/cambio';

const bandeira = (p: Patrocinador) => assetUrl(p.cod === 'br' ? '/Assets/Bandeiras/45.png' : `/flags/${p.cod}.svg`);

/** Logo da marca (todas ficticias): monograma com as iniciais sobre uma cor derivada do nome. Se existir public/sponsors/<id>.png, usa a imagem. */
const LogoMarca: React.FC<{ p: Patrocinador; className?: string }> = ({ p, className = 'w-10 h-10' }) => {
  const [semImagem, setSemImagem] = useState(false);
  const palavras = p.nome.replace(/[^A-Za-z0-9 -]/g, '').split(/[ -]+/).filter(Boolean);
  const iniciais = (palavras.length > 1 ? palavras[0][0] + palavras[1][0] : p.nome.slice(0, 2)).toUpperCase();
  let h = 0; for (const c of p.nome) h = (h * 31 + c.charCodeAt(0)) % 360;
  if (!semImagem) return <img src={assetUrl(`/sponsors/${p.id}.png`)} alt="" onError={() => setSemImagem(true)} className={`${className} object-contain rounded-lg shrink-0`} />;
  return <div className={`${className} rounded-lg shrink-0 flex items-center justify-center font-black text-white text-sm tracking-tight shadow-inner`} style={{ background: `linear-gradient(135deg, hsl(${h} 65% 45%), hsl(${(h + 40) % 360} 65% 32%))` }}>{iniciais}</div>;
};

const SponsorsTab: React.FC = () => {
  const { userTeam, gameState, formatCurrency, proporPatrocinio, reputacaoClube } = useGame();
  const [regiao, setRegiao] = useState<RegiaoPatrocinio>('BRASIL');
  const [aberto, setAberto] = useState<Patrocinador | null>(null);
  const [anos, setAnos] = useState(1);
  const [msg, setMsg] = useState<{ ok: boolean; texto: string } | null>(null);
  if (!userTeam) return null;
  const pt = gameState.language === 'PT';
  const hoje = gameState.currentDate;
  const atual = userTeam.sponsorContract, proximo = userTeam.sponsorNext;
  const nomeDe = (id: string) => PATROCINADORES.find(p => p.id === id)?.nome || '';

  const ROTULO = {
    ATIVO: pt ? 'Ativo' : 'Active', DISPONIVEL: pt ? 'Disponível' : 'Available', BLOQUEADO: pt ? 'Reputação insuficiente' : 'Reputation too low', INDISPONIVEL: pt ? 'Contrato em vigor' : 'Contract in force'
  };
  const COR = { ATIVO: 'text-emerald-500', DISPONIVEL: 'text-blue-500', BLOQUEADO: 'text-rose-500', INDISPONIVEL: 'text-slate-400' };
  const MOTIVO: Record<string, string> = {
    REPUTACAO: pt ? 'A reputação do clube é insuficiente para este patrocinador.' : "The club's reputation is too low for this sponsor.",
    ATIVO: pt ? `O contrato atual só pode ser trocado nos últimos ${JANELA_RENOVACAO_DIAS} dias.` : `The current contract can only be replaced in its last ${JANELA_RENOVACAO_DIAS} days.`,
    JA_RENOVADO: pt ? 'A renovação já foi acordada.' : 'A renewal is already agreed.',
    ANOS: pt ? 'Duração inválida.' : 'Invalid duration.'
  };

  const propor = () => {
    if (!aberto) return;
    const r = proporPatrocinio(aberto.id, anos);
    if (r.ok) { setMsg({ ok: true, texto: r.renovacao ? (pt ? 'Renovação acordada: começa no fim do contrato atual.' : 'Renewal agreed: it starts when the current contract ends.') : (pt ? 'Proposta aceita! Contrato assinado.' : 'Proposal accepted! Contract signed.') }); setAberto(null); }
    else if ('motivo' in r) setMsg({ ok: false, texto: MOTIVO[r.motivo] });
  };

  // Ativo e Disponivel primeiro, depois Contrato em vigor e Reputacao insuficiente; dentro de cada grupo, a ordem do banco (maior valor primeiro).
  const ORDEM = { ATIVO: 0, DISPONIVEL: 1, INDISPONIVEL: 2, BLOQUEADO: 3 };
  const lista = PATROCINADORES.filter(p => p.regiao === regiao)
    .map((p, i) => ({ p, i, st: statusDoPatrocinador(reputacaoClube, p, atual, proximo, hoje) }))
    .sort((x, y) => ORDEM[x.st] - ORDEM[y.st] || x.i - y.i);
  const aba = (r: RegiaoPatrocinio, rotulo: string) => (
    <button onClick={() => { setRegiao(r); setAberto(null); setMsg(null); }} className={`min-h-[44px] px-6 rounded font-black text-xs uppercase tracking-widest transition-all ${regiao === r ? 'bg-blue-600 text-white shadow-lg' : 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-500 hover:text-slate-800 dark:hover:text-white'}`}>{rotulo}</button>
  );

  return (
    <div className="h-full overflow-y-auto flex flex-col gap-4 pr-1">
      <div className="flex flex-wrap items-center gap-3 justify-between">
        <div className="flex gap-2">{aba('BRASIL', 'BRASIL')}{aba('INTERNATIONAL', 'INTERNATIONAL')}</div>
        <div className="text-[11px] font-black uppercase tracking-widest text-slate-500">{pt ? 'Reputação do clube' : 'Club reputation'}: <span className="text-blue-500">{reputacaoClube}</span> / 100</div>
      </div>

      <div className="bg-white/80 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl px-5 py-3 text-sm">
        {atual
          ? <>
              <span className="font-black text-emerald-500">{nomeDe(atual.sponsorId)}</span> — {formatCurrency(atual.valorAnualUSD)} / {pt ? 'ano' : 'year'} · {pt ? 'até' : 'until'} {atual.fim} · {atual.parcelasPagas}/{atual.anos * 12} {pt ? 'parcelas' : 'instalments'}
              {proximo && <span className="ml-3 text-blue-500 font-bold">{pt ? 'Renovação' : 'Renewal'}: {nomeDe(proximo.sponsorId)} ({proximo.anos} {pt ? 'anos' : 'yrs'})</span>}
              {!proximo && diasParaFim(atual, hoje) <= JANELA_RENOVACAO_DIAS && <span className="ml-3 text-amber-500 font-bold">{pt ? 'Pode renovar ou trocar agora' : 'You can renew or switch now'}</span>}
            </>
          : <span className="text-slate-500">{pt ? 'Sem patrocinador principal. Escolha um abaixo.' : 'No main sponsor. Pick one below.'}</span>}
      </div>

      {msg && <div className={`text-sm font-bold ${msg.ok ? 'text-emerald-500' : 'text-rose-500'}`}>{msg.texto}</div>}

      {aberto && (
        <div className="bg-white dark:bg-slate-900 border border-blue-500/40 rounded-xl p-5 flex flex-wrap items-center gap-4 shadow-xl">
          <LogoMarca p={aberto} className="w-12 h-12" />
          <div className="flex-1 min-w-[180px]">
            <div className="font-black text-lg text-slate-900 dark:text-white">{aberto.nome}</div>
            <div className="text-sm text-slate-500">{formatCurrency(valorAnualPara(aberto, anos))} / {pt ? 'ano' : 'year'} ({Math.round(FATOR_DURACAO[anos] * 100)}%) · 12 {pt ? 'parcelas mensais' : 'monthly instalments'}</div>
            <div className="text-[11px] text-slate-500">{pt ? 'Total do contrato' : 'Contract total'}: {formatCurrency(valorAnualPara(aberto, anos) * anos)} · {pt ? 'bônus de competição' : 'competition bonus'}: {Math.round(bonusPctDaMarca(aberto) * 100)}% {pt ? 'dos prêmios' : 'of prize money'}</div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-black uppercase tracking-widest text-slate-500">{pt ? 'Duração' : 'Duration'}</span>
            {Array.from({ length: ANOS_MAX - ANOS_MIN + 1 }, (_, i) => ANOS_MIN + i).map(n => (
              <button key={n} onClick={() => setAnos(n)} className={`min-w-[44px] min-h-[44px] rounded font-black ${anos === n ? 'bg-blue-600 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-500'}`}>{n}</button>
            ))}
            <span className="text-xs text-slate-500">{pt ? 'ano(s)' : 'year(s)'}</span>
          </div>
          <button onClick={propor} className="min-h-[44px] px-6 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-widest">{atual ? (pt ? 'Renovar / trocar' : 'Renew / switch') : (pt ? 'Propor' : 'Propose')}</button>
          <button onClick={() => setAberto(null)} className="min-h-[44px] px-4 rounded bg-slate-200 dark:bg-slate-800 text-slate-500 font-black text-xs uppercase tracking-widest">{pt ? 'Cancelar' : 'Cancel'}</button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {lista.map(({ p, st }) => {
          const clicavel = st === 'DISPONIVEL';
          return (
            <button key={p.id} disabled={!clicavel} onClick={() => { setAberto(p); setAnos(1); setMsg(null); }}
              className={`min-h-[64px] text-left flex items-center gap-3 px-4 py-3 rounded-xl border transition-all ${aberto?.id === p.id ? 'border-blue-500 bg-blue-500/10' : 'border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/60'} ${clicavel ? 'hover:border-blue-400 cursor-pointer' : 'opacity-70 cursor-default'}`}>
              <LogoMarca p={p} />
              <div className="flex-1 min-w-0">
                <div className="font-black text-slate-900 dark:text-white truncate">{p.nome}</div>
                <div className="text-[11px] text-slate-500 truncate flex items-center gap-1.5"><img src={bandeira(p)} alt="" className="w-4 h-3 object-cover rounded-[2px] border border-slate-300 dark:border-slate-700" />{p.pais} · {pt ? 'rep. mín.' : 'min. rep.'} {reputacaoMinima(p)}</div>
              </div>
              <div className="text-right shrink-0">
                <div className="font-black text-slate-900 dark:text-white">{formatCurrency(paraDolares(p.valorAnual, p.moeda))}</div>
                <div className={`text-[10px] font-black uppercase tracking-wider ${COR[st]}`}>{ROTULO[st]}</div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default SponsorsTab;
