
import { tx } from '../textSim/idiomas';
import React, { useState } from 'react';
import { buscarTaxasOnline, cambioAutomatico, definirCambioAutomatico } from '../textSim/cambio';
import { useGame } from '../context/GameContext';
import { IDIOMAS, localeDoIdioma } from '../textSim/idiomas';
import { MatchDuration } from '../types';
import { lerConfigMod, gravarConfigMod, CAMINHO_PADRAO_DO_MOD } from '../textSim/modConfig';
import { estadoDoMod } from '../textSim/modDados';

interface SettingsViewProps {
    onBack?: () => void;
}

const SettingsView: React.FC<SettingsViewProps> = ({ onBack }) => {
  const { gameState, updateSettings, t, taxasDeCambio, atualizarTaxas } = useGame();
  const [cambioAuto, setCambioAuto] = useState(cambioAutomatico());
  const [msgCambio, setMsgCambio] = useState('');
  const [mod, setMod] = React.useState(lerConfigMod());

  return (
    <div className="h-full flex flex-col gap-6 animate-fade-in max-w-6xl mx-auto w-full">
       <div className="flex justify-between items-end">
        <div>
          {onBack && (
              <button onClick={onBack} className="text-slate-500 hover:text-blue-500 font-bold uppercase text-sm flex items-center gap-2 mb-4 transition-colors">
                 <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
                 {t('set_back_menu')}
              </button>
          )}
          <h2 className="text-4xl font-black uppercase tracking-tight leading-none italic transition-colors">
            <span className="text-slate-900 dark:text-white">{t('set_game')}</span> <span className="text-blue-500">{t('set_settings')}</span>
          </h2>
          <p className="text-slate-400 dark:text-slate-500 font-bold text-[10px] uppercase tracking-widest mt-2 opacity-60 transition-colors">
            {t('set_subtitle')}
          </p>
        </div>
      </div>

      <div className="bg-white/80 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xl grid grid-cols-1 lg:grid-cols-3 gap-x-6 gap-y-5 content-start transition-colors">
          
          {/* General Section */}
          <section className="space-y-4">
              <h3 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] border-b border-slate-200 dark:border-slate-800 pb-2">{t('set_gen')}</h3>
              
              <div className="grid grid-cols-1 gap-4">
                  <div className="space-y-2">
                      <label className="text-sm font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wide">{t('set_lang')}</label>
                      <div className="grid grid-cols-3 gap-2">
                          {IDIOMAS.map(({ codigo: lang, nome }) => (
                              <button
                                key={lang}
                                onClick={() => updateSettings({ language: lang })}
                                title={nome}
                                className={`py-2 rounded-lg font-black text-sm transition-all flex flex-col items-center leading-tight ${
                                    gameState.language === lang 
                                    ? 'bg-blue-600 text-white shadow-lg ring-2 ring-blue-400 ring-offset-2 ring-offset-white dark:ring-offset-slate-900' 
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                                }`}
                              >
                                  <span>{nome}</span>
                                  <span className="text-[9px] tracking-widest opacity-60">{lang}</span>
                              </button>
                          ))}
                      </div>
                  </div>

                  <div className="space-y-2">
                      <label className="text-sm font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wide">{t('set_theme')}</label>
                      <div className="flex gap-2">
                          {['LIGHT', 'DARK', 'AUTO'].map((mode) => (
                              <button
                                key={tx(({ LIGHT: 'Light', DARK: 'Dark', AUTO: 'Auto' } as Record<string, string>)[mode])}
                                onClick={() => updateSettings({ themeMode: mode as any })}
                                className={`flex-1 py-3 rounded-lg font-black text-xs uppercase tracking-widest transition-all ${
                                    gameState.themeMode === mode 
                                    ? 'bg-slate-800 dark:bg-white text-white dark:text-slate-900 shadow-lg' 
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                                }`}
                              >
                                  {mode}
                              </button>
                          ))}
                      </div>
                  </div>
              </div>
          </section>

          {/* Gameplay Section */}
          <section className="space-y-4">
              <h3 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] border-b border-slate-200 dark:border-slate-800 pb-2">{tx('Gameplay')}</h3>
              
              <div className="grid grid-cols-1 gap-4">
                  <div className="space-y-2">
                      <label className="text-sm font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wide">{tx('Match Day Time (Real Min)')}</label>
                      <div className="flex gap-2">
                          {[10, 15, 20].map((dur) => (
                              <button
                                key={dur}
                                onClick={() => updateSettings({ matchDuration: dur as MatchDuration })}
                                className={`flex-1 py-3 rounded-lg font-black text-xs uppercase tracking-widest transition-all ${
                                    gameState.matchDuration === dur 
                                    ? 'bg-blue-600 text-white shadow-lg ring-2 ring-blue-400' 
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                                }`}
                              >
                                  {tx('{v0} min', { v0: dur })}
                              </button>
                          ))}
                      </div>
                  </div>
              </div>
          </section>

          {/* Mod Section */}
          <section className="space-y-4">
              <h3 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] border-b border-slate-200 dark:border-slate-800 pb-2">{tx('Mod')}</h3>
              <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wide">{tx('Mod (real names, badges and competitions)')}</label>
                  <div className="flex gap-2">
                      {[true, false].map(on => (
                          <button key={String(on)} onClick={() => setMod({ ...mod, ativo: on })}
                              className={`flex-1 py-3 rounded-lg font-black text-xs uppercase tracking-widest transition-all ${mod.ativo === on ? 'bg-blue-600 text-white shadow-lg ring-2 ring-blue-400' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'}`}>
                              {on ? t('set_on') : t('set_off')}
                          </button>
                      ))}
                  </div>
                  {mod.ativo && (
                      <div className="space-y-1">
                          <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{tx('Mod folder')}</span>
                          <input type="text" value={mod.caminho} spellCheck={false} placeholder={CAMINHO_PADRAO_DO_MOD}
                              onChange={e => setMod({ ...mod, caminho: e.target.value })}
                              className="w-full px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100 font-bold text-sm font-mono" />
                      </div>
                  )}
                  <div className="flex items-center gap-3 flex-wrap">
                      <button onClick={() => { gravarConfigMod(mod); window.location.reload(); }}
                          className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-widest transition-colors">{tx('Apply and restart')}</button>
                      <button onClick={() => setMod({ ...mod, caminho: CAMINHO_PADRAO_DO_MOD })}
                          className="px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-black text-[10px] uppercase tracking-widest hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">{tx('Default folder')}</button>
                  </div>
                  <p className="text-[10px] text-slate-400">
                      {estadoDoMod.ativo
                          ? tx('Loaded: {v0} ({v1}) — {v2} clubs, {v3} players, {v4} competitions.', { v0: estadoDoMod.nome || '', v1: estadoDoMod.caminho, v2: estadoDoMod.clubes, v3: estadoDoMod.jogadores, v4: estadoDoMod.competicoes })
                          : estadoDoMod.configurado
                              ? tx('No mod found in {v0}: the game uses the generic names.', { v0: estadoDoMod.caminho })
                              : tx('Mod is OFF: the game uses the generic names.')}
                      {' '}{tx('The mod folder holds mod.json, clubes.json, jogadores.json, competicoes.json and the escudos/ and competicoes/ images. Changes apply after restarting.')}
                  </p>
              </div>
          </section>

          {/* Graphics Section */}
          <section className="space-y-4">
              <h3 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] border-b border-slate-200 dark:border-slate-800 pb-2">{tx('Graphics')}</h3>
              <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wide">{tx('3D Match Quality')}</label>
                  <div className="flex gap-2">
                      {(['HIGH', 'MEDIUM', 'LOW'] as const).map((q) => (
                          <button
                            key={tx(({ HIGH: 'High', MEDIUM: 'Medium', LOW: 'Low' } as Record<string, string>)[q])}
                            onClick={() => updateSettings({ graphicsQuality: q })}
                            className={`flex-1 py-3 rounded-lg font-black text-xs uppercase tracking-widest transition-all ${
                                (gameState.graphicsQuality || 'HIGH') === q
                                ? 'bg-blue-600 text-white shadow-lg ring-2 ring-blue-400'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                            }`}
                          >
                              {q}
                          </button>
                      ))}
                  </div>
                  <p className="text-xs text-slate-400">{tx('HIGH (default): 100% crowd. MEDIUM: 50% crowd. LOW: light player model, 25% of the stadium seats filled. Real-time shadows are OFF by default at every level (use the Shadows button in the 3D match to turn them on; a soft blob shadow is drawn instead). Crowd size applies from the next match.')}</p>
              </div>
              <div className="space-y-2 pt-2">
                  <label className="text-sm font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wide">{tx('TV Sideline camera')}</label>
                  <div className="grid grid-cols-2 gap-4 items-end">
                      <div className="space-y-1">
                          <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{tx('Min Distance (m)')}</span>
                          <input type="number" step="1" min="5" value={gameState.cameraTvMin ?? 15}
                              onChange={e => { const v = parseInt(e.target.value); if (v >= 5) updateSettings({ cameraTvMin: v }); }}
                              className="w-full px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100 font-bold text-sm border border-slate-200 dark:border-slate-700" />
                      </div>
                      <div className="space-y-1">
                          <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{tx('Max Distance (m)')}</span>
                          <input type="number" step="1" min="5" value={gameState.cameraTvMax ?? 30}
                              onChange={e => { const v = parseInt(e.target.value); if (v >= 5) updateSettings({ cameraTvMax: v }); }}
                              className="w-full px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100 font-bold text-sm border border-slate-200 dark:border-slate-700" />
                      </div>
                  </div>
                  <p className="text-[10px] text-slate-400">{tx('Controls how close or far the camera gets from the ball (default 15 to 30).')}</p>
              </div>
          </section>

          {/* Financial Section */}
          <section className="space-y-4 lg:col-span-2">
              <h3 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] border-b border-slate-200 dark:border-slate-800 pb-2">{t('set_fin')}</h3>
              
              <div className="grid grid-cols-2 gap-8">
                  <div className="space-y-2">
                      <label className="text-sm font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wide">{t('set_curr')}</label>
                      <div className="flex gap-2">
                          {['USD', 'EUR', 'BRL'].map((curr) => (
                              <button
                                key={curr}
                                onClick={() => updateSettings({ currency: curr as any })}
                                className={`flex-1 py-3 rounded-lg font-black text-xs uppercase tracking-widest transition-all ${
                                    gameState.currency === curr 
                                    ? 'bg-emerald-600 text-white shadow-lg ring-2 ring-emerald-400 ring-offset-2 ring-offset-white dark:ring-offset-slate-900' 
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                                }`}
                              >
                                  {curr}
                              </button>
                          ))}
                      </div>
                  </div>

                  <div className="space-y-2">
                      <label className="text-sm font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wide">{t('set_wage')}</label>
                      <div className="flex gap-2">
                          {['WEEKLY', 'MONTHLY'].map((freq) => (
                              <button
                                key={tx(({ WEEKLY: 'Weekly', MONTHLY: 'Monthly' } as Record<string, string>)[freq])}
                                onClick={() => updateSettings({ wageFrequency: freq as any })}
                                className={`flex-1 py-3 rounded-lg font-black text-xs uppercase tracking-widest transition-all ${
                                    gameState.wageFrequency === freq 
                                    ? 'bg-indigo-600 text-white shadow-lg ring-2 ring-indigo-400 ring-offset-2 ring-offset-white dark:ring-offset-slate-900' 
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                                }`}
                              >
                                  {freq}
                              </button>
                          ))}
                      </div>
                  </div>
              </div>

              {/* Taxas de cambio (unidades de cada moeda por 1 dolar): alimentam a moeda de exibicao, as premiacoes e a economia do estadio. */}
              <div className="space-y-2 pt-2">
                  <label className="text-sm font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wide">{tx('Exchange rates (per 1 USD)')}</label>
                  <div className="grid grid-cols-4 gap-4 items-end">
                      {(['BRL', 'EUR', 'GBP'] as const).map(m => (
                          <div key={m} className="space-y-1">
                              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{m}</span>
                              <input type="number" step="0.01" min="0.01" value={taxasDeCambio[m]}
                                  onChange={e => { const v = parseFloat(e.target.value); if (v > 0) { atualizarTaxas({ [m]: v }); if (cambioAuto) { definirCambioAutomatico(false); setCambioAuto(false); setMsgCambio(tx('Manual rate set: auto-update turned off.')); } } }}
                                  className="w-full px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100 font-bold text-sm border border-slate-200 dark:border-slate-700" />
                          </div>
                      ))}
                      <button onClick={() => atualizarTaxas('padrao')} className="py-2 rounded-lg font-black text-xs uppercase tracking-widest bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700">{tx('Reset')}</button>
                  </div>
                  <div className="flex items-center gap-3 flex-wrap">
                      <button onClick={async () => { setMsgCambio(tx('Updating...')); const r = await buscarTaxasOnline(); if (r) { atualizarTaxas(r); setMsgCambio(tx('Updated: {v0}', { v0: new Date().toLocaleString(localeDoIdioma(gameState.language)) })); } else setMsgCambio(tx('Could not reach the rates service; the saved rates were kept.')); }}
                          className="px-4 py-2 rounded-lg font-black text-xs uppercase tracking-widest bg-blue-600 text-white hover:bg-blue-500">{tx('Update now')}</button>
                      <label className="flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-300">
                          <input type="checkbox" checked={cambioAuto} onChange={e => { definirCambioAutomatico(e.target.checked); setCambioAuto(e.target.checked); }} /> {tx('Auto-update when the game opens (once every 12 h)')}
                      </label>
                      {msgCambio && <span className="text-[10px] text-slate-400">{msgCambio}</span>}
                  </div>
                  <p className="text-[10px] text-slate-400">{tx('Game money is stored in US dollars. Changing a rate changes how values are shown and how prize money (BRL, GBP) is converted.')}</p>
              </div>
          </section>

          <div className="mt-8 p-4 bg-blue-50 dark:bg-blue-900/10 rounded-lg border border-blue-100 dark:border-blue-800 flex gap-4 items-center mt-auto">
              <div className="text-2xl">ℹ️</div>
              <p className="text-xs text-blue-800 dark:text-blue-300">
                  <strong>{t('set_note')}</strong>
              </p>
          </div>

      </div>
    </div>
  );
};

export default SettingsView;
