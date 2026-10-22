import React, { useState } from 'react';
import { useGame } from '../context/GameContext';
import { COUNTRIES } from '../textSim/dataGenerator';
import { TERNOS, ternoPorHex, CAMISAS, CALCAS, COMBINACOES } from '../textSim/managerColors';
import ManagerAvatar, { ManagerLook, ManagerBody, ManagerHairStyle, ManagerOutfit } from './ManagerAvatar';

const SKINS = ['#f6ddc8', '#f2d7bd', '#e8c9a8', '#d6a77a', '#b98560', '#8d5a3b', '#6b4630'];
const HAIRS = ['#1a1410', '#2f4a2f', '#d9c37a', '#8b6b45', '#b5502a', '#4a3a30'];
const TRACKSUIT_COLORS = ['#2563eb', '#16a34a', '#dc2626', '#1f2937'];
// As cores (terno + gravata, camisas, calcas, combinacoes) vivem no banco textSim/managerColors.ts.
const PRIMEIRO_TERNO = { outfitColor: TERNOS[0].hex, tieColor: TERNOS[0].gravatas[0].hex };
const swatch = (ativo: boolean, tam = 'w-8 h-8') => `${tam} rounded-sm border-2 transition-all ${ativo ? 'border-blue-400 scale-110' : 'border-slate-700 hover:border-slate-500'}`;
const MESES = ['JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE', 'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'];

const campo = 'w-full bg-slate-900/70 border border-slate-700 rounded-sm px-4 py-3 text-white font-bold uppercase focus:outline-none focus:border-blue-500 transition-colors';
const secao = 'text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2';

const pick = <T,>(lista: T[]): T => lista[Math.floor(Math.random() * lista.length)];

const Segmentos = <T extends string>({ valor, opcoes, onChange }: { valor: T; opcoes: T[]; onChange: (v: T) => void }) => (
  <div className="flex gap-2">
    {opcoes.map(o => (
      <button key={o} type="button" onClick={() => onChange(o)}
        className={`flex-1 py-2.5 rounded-sm text-xs font-black uppercase tracking-wider transition-colors ${valor === o ? 'bg-blue-600 text-white' : 'bg-slate-900/70 border border-slate-700 text-slate-400 hover:text-white'}`}>
        {o}
      </button>
    ))}
  </div>
);

const Cores = ({ valor, cores, onChange }: { valor: string; cores: string[]; onChange: (c: string) => void }) => (
  <div className="flex gap-2 flex-wrap">
    {cores.map(c => (
      <button key={c} type="button" onClick={() => onChange(c)} style={{ background: c }}
        className={`w-8 h-8 rounded-sm border-2 transition-all ${valor === c ? 'border-blue-400 scale-110' : 'border-slate-700 hover:border-slate-500'}`} />
    ))}
  </div>
);

interface Props {
  onNext: (name: string) => void;
  onBack: () => void;
}

const ManagerCreation: React.FC<Props> = ({ onNext, onBack }) => {
  const { t } = useGame();
  const [nome, setNome] = useState('');
  const [sobrenome, setSobrenome] = useState('');
  const [pais, setPais] = useState(COUNTRIES.find(c => c.name === 'Brazil')?.id || COUNTRIES[0]?.id || '');
  const [dia, setDia] = useState(15);
  const [mes, setMes] = useState(2);
  const [ano, setAno] = useState(1984);
  const [estilo, setEstilo] = useState<'TRACKSUIT' | 'TACTICAL'>('TACTICAL');
  const [rodar, setRodar] = useState(0);
  const [look, setLook] = useState<ManagerLook>({
    gender: 'MALE', body: 'ATHLETIC', skin: SKINS[4], hairStyle: 'SHORT', hair: HAIRS[0], outfit: 'SUIT', ...PRIMEIRO_TERNO, pantsColor: COMBINACOES[0].calca
  });
  const mudar = (p: Partial<ManagerLook>) => setLook(l => ({ ...l, ...p }));
  const mudarOutfit = (outfit: ManagerOutfit) => mudar(
    outfit === 'SUIT' ? { outfit, ...PRIMEIRO_TERNO }
    : outfit === 'CASUAL' ? { outfit, outfitColor: COMBINACOES[0].camisa, pantsColor: COMBINACOES[0].calca }
    : { outfit, outfitColor: TRACKSUIT_COLORS[0] });
  // Trocar o terno traz a primeira gravata que combina com ele.
  const mudarTerno = (hex: string) => mudar({ outfitColor: hex, tieColor: ternoPorHex(hex).gravatas[0].hex });

  const randomizar = () => {
    const outfit = pick<ManagerOutfit>(['SUIT', 'TRACKSUIT', 'CASUAL']);
    setLook({
      gender: look.gender, body: pick<ManagerBody>(['SLIM', 'ATHLETIC', 'AVERAGE']), skin: pick(SKINS),
      hairStyle: pick<ManagerHairStyle>(['SHORT', 'BUZZ', 'LONG', 'BALD']), hair: pick(HAIRS), outfit, tieColor: look.tieColor, pantsColor: look.pantsColor,
      ...(outfit === 'CASUAL' ? (k => ({ outfitColor: k.camisa, pantsColor: k.calca }))(pick(COMBINACOES))
        : outfit === 'SUIT' ? (t => ({ outfitColor: t.hex, tieColor: pick(t.gravatas).hex }))(pick(TERNOS))
        : { outfitColor: pick(TRACKSUIT_COLORS) })
    });
  };

  const nomeCompleto = `${nome.trim()} ${sobrenome.trim()}`.trim();
  const valido = nome.trim() !== '' && sobrenome.trim() !== '';
  const submeter = (e: React.FormEvent) => { e.preventDefault(); if (valido) onNext(nomeCompleto); };
  const dias = new Date(ano, mes + 1, 0).getDate();

  return (
    <form onSubmit={submeter} className="w-full h-full flex flex-col gap-4 p-6 bg-slate-950 overflow-y-auto custom-scrollbar">
      <div className="flex items-center gap-6 bg-slate-900/60 border border-slate-800 rounded p-4">
        <button type="button" onClick={onBack} className="text-slate-400 hover:text-white font-bold uppercase text-sm">‹ {t('prof_cancel')}</button>
        <div>
          <h2 className="text-2xl font-black text-white uppercase tracking-tight leading-none">{t('prof_title')}</h2>
          <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest">Step 1 of 2</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.4fr_1fr] gap-4 flex-1 min-h-0">
        <div className="bg-slate-900/50 border border-slate-800 rounded p-5 space-y-4">
          <p className={secao}>1. Personal Details</p>
          <div>
            <label className={secao}>First name</label>
            <input className={campo} value={nome} onChange={e => setNome(e.target.value)} autoFocus />
          </div>
          <div>
            <label className={secao}>Surname</label>
            <input className={campo} value={sobrenome} onChange={e => setSobrenome(e.target.value)} />
          </div>
          <div>
            <label className={secao}>Nationality</label>
            <select className={campo} value={pais} onChange={e => setPais(e.target.value)}>
              {COUNTRIES.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className={secao}>Date of birth</label>
            <div className="grid grid-cols-[1fr_2fr_1.2fr] gap-2">
              <select className={campo} value={Math.min(dia, dias)} onChange={e => setDia(+e.target.value)}>
                {Array.from({ length: dias }, (_, i) => <option key={i} value={i + 1}>{i + 1}</option>)}
              </select>
              <select className={campo} value={mes} onChange={e => setMes(+e.target.value)}>
                {MESES.map((m, i) => <option key={m} value={i}>{m}</option>)}
              </select>
              <select className={campo} value={ano} onChange={e => setAno(+e.target.value)}>
                {Array.from({ length: 50 }, (_, i) => 2005 - i).map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
          </div>
        </div>

        <div className="bg-slate-900/50 border border-slate-800 rounded p-5 space-y-4">
          <p className={secao}>2. Appearance</p>
          <div><label className={secao}>Gender</label><Segmentos valor={look.gender} opcoes={['MALE', 'FEMALE']} onChange={gender => mudar({ gender, hairStyle: gender === 'FEMALE' ? 'LONG' : 'SHORT' })} /></div>
          <div><label className={secao}>Body type</label><Segmentos valor={look.body} opcoes={['SLIM', 'ATHLETIC', 'AVERAGE']} onChange={body => mudar({ body })} /></div>
          <div><label className={secao}>Skin tone</label><Cores valor={look.skin} cores={SKINS} onChange={skin => mudar({ skin })} /></div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={secao}>Hairstyle</label>
              <select className={campo} value={look.hairStyle} onChange={e => mudar({ hairStyle: e.target.value as ManagerHairStyle })}>
                {(['SHORT', 'BUZZ', 'LONG', 'BALD'] as ManagerHairStyle[]).map(h => <option key={h} value={h}>{h}</option>)}
              </select>
            </div>
            <div><label className={secao}>Hair color</label><Cores valor={look.hair} cores={HAIRS} onChange={hair => mudar({ hair })} /></div>
          </div>
          <div>
            <label className={secao}>Outfit</label>
            <Segmentos valor={look.outfit} opcoes={['SUIT', 'TRACKSUIT', 'CASUAL']} onChange={mudarOutfit} />
            <div className="mt-3 space-y-3">
              {look.outfit === 'SUIT' && (
                <>
                  <div>
                    <p className={secao}>Suit colour</p>
                    <div className="flex gap-2 flex-wrap">
                      {TERNOS.map(t => <button key={t.id} type="button" title={t.nome} onClick={() => mudarTerno(t.hex)} style={{ background: t.hex }} className={swatch(look.outfitColor === t.hex)} />)}
                    </div>
                  </div>
                  <div>
                    <p className={secao}>Best tie colours</p>
                    <div className="flex gap-2 flex-wrap">
                      {ternoPorHex(look.outfitColor).gravatas.map(g => <button key={g.id} type="button" title={g.nome} onClick={() => mudar({ tieColor: g.hex })} style={{ background: g.hex }} className={swatch(look.tieColor === g.hex)} />)}
                    </div>
                  </div>
                </>
              )}
              {look.outfit === 'TRACKSUIT' && <Cores valor={look.outfitColor} cores={TRACKSUIT_COLORS} onChange={outfitColor => mudar({ outfitColor })} />}
              {look.outfit === 'CASUAL' && (
                <>
                  <div>
                    <p className={secao}>Presets</p>
                    <div className="flex gap-1.5 flex-wrap">
                      {COMBINACOES.map(({ nome, camisa, calca }) => (
                        <button key={nome} type="button" title={nome} onClick={() => mudar({ outfitColor: camisa, pantsColor: calca })}
                          style={{ background: `linear-gradient(135deg, ${camisa} 50%, ${calca} 50%)` }} className={swatch(look.outfitColor === camisa && look.pantsColor === calca, 'w-7 h-7')} />
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className={secao}>Shirt colour</p>
                    <div className="grid grid-cols-7 gap-1.5">
                      {CAMISAS.map(k => <button key={k.id} type="button" title={k.nome} onClick={() => mudar({ outfitColor: k.hex })} style={{ background: k.hex }} className={swatch(look.outfitColor === k.hex, 'h-6')} />)}
                    </div>
                  </div>
                  <div>
                    <p className={secao}>Pants colour</p>
                    <div className="flex gap-1.5 flex-wrap">
                      {CALCAS.map(k => <button key={k.id} type="button" title={k.nome} onClick={() => mudar({ pantsColor: k.hex })} style={{ background: k.hex }} className={swatch(look.pantsColor === k.hex)} />)}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <div className="bg-slate-900/50 border border-slate-800 rounded p-5 flex-1 flex flex-col min-h-[320px]">
            <p className={secao}>Manager Preset &amp; Avatar Preview</p>
            <div className="relative flex-1 min-h-[420px] overflow-hidden bg-slate-950 rounded">
              <ManagerAvatar look={look} rodar={rodar} className="absolute inset-0 w-full h-full" />
            </div>
            <div className="grid grid-cols-2 gap-2 mt-3">
              <button type="button" onClick={() => setRodar(r => r + 1)} className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-black text-xs py-2.5 rounded-sm uppercase tracking-wider">↻ Rotate</button>
              <button type="button" onClick={randomizar} className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-black text-xs py-2.5 rounded-sm uppercase tracking-wider">⇄ Randomize</button>
            </div>
          </div>
          <div className="bg-slate-900/50 border border-slate-800 rounded p-4">
            <p className={secao}>Managerial Style</p>
            <div className="grid grid-cols-2 gap-2">
              {([['TRACKSUIT', 'Tracksuit Manager', 'Focused on training and development'], ['TACTICAL', 'Tactical Manager', 'Focused on tactics and mentality']] as const).map(([id, titulo, desc]) => (
                <button key={id} type="button" onClick={() => setEstilo(id)}
                  className={`p-3 rounded-sm border text-left transition-colors ${estilo === id ? 'border-blue-500 bg-blue-900/20' : 'border-slate-700 bg-slate-900/70 hover:border-slate-500'}`}>
                  <div className="text-xs font-black text-white uppercase">{titulo}</div>
                  <div className="text-[10px] text-slate-400 mt-1">{desc}</div>
                </button>
              ))}
            </div>
          </div>
          <button type="submit" disabled={!valido} className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-black py-4 rounded-sm uppercase tracking-wider shadow-lg">{t('prof_continue')}</button>
        </div>
      </div>
    </form>
  );
};

export default ManagerCreation;
