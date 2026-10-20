
import React from 'react';
import { useGame } from '../context/GameContext';
import { MatchDuration } from '../types';

interface SettingsViewProps {
    onBack?: () => void;
}

const SettingsView: React.FC<SettingsViewProps> = ({ onBack }) => {
  const { gameState, updateSettings, t } = useGame();

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

      <div className="bg-white/80 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 shadow-xl flex flex-col gap-8 transition-colors min-h-[75vh]">
          
          {/* General Section */}
          <section className="space-y-4">
              <h3 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] border-b border-slate-200 dark:border-slate-800 pb-2">{t('set_gen')}</h3>
              
              <div className="grid grid-cols-2 gap-8">
                  <div className="space-y-2">
                      <label className="text-sm font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wide">{t('set_lang')}</label>
                      <div className="flex gap-2">
                          {['EN', 'PT'].map((lang) => (
                              <button
                                key={lang}
                                onClick={() => updateSettings({ language: lang as any })}
                                className={`flex-1 py-3 rounded-lg font-black text-xs uppercase tracking-widest transition-all ${
                                    gameState.language === lang 
                                    ? 'bg-blue-600 text-white shadow-lg ring-2 ring-blue-400 ring-offset-2 ring-offset-white dark:ring-offset-slate-900' 
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                                }`}
                              >
                                  {lang === 'EN' ? 'English' : 'Português'}
                              </button>
                          ))}
                      </div>
                  </div>

                  <div className="space-y-2">
                      <label className="text-sm font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wide">{t('set_theme')}</label>
                      <div className="flex gap-2">
                          {['LIGHT', 'DARK', 'AUTO'].map((mode) => (
                              <button
                                key={mode}
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
              <h3 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] border-b border-slate-200 dark:border-slate-800 pb-2">Gameplay</h3>
              
              <div className="grid grid-cols-2 gap-8">
                  <div className="space-y-2">
                      <label className="text-sm font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wide">Match Day Time (Real Min)</label>
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
                                  {dur}m
                              </button>
                          ))}
                      </div>
                  </div>
              </div>
          </section>

          {/* Graphics Section */}
          <section className="space-y-4">
              <h3 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] border-b border-slate-200 dark:border-slate-800 pb-2">Graphics</h3>
              <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wide">3D Match Quality</label>
                  <div className="flex gap-2">
                      {(['HIGH', 'MEDIUM', 'LOW'] as const).map((q) => (
                          <button
                            key={q}
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
                  <p className="text-xs text-slate-400">HIGH (default): everything, 100% crowd. MEDIUM: shadows, 50% crowd. LOW: no shadows, light player model, 25% of the stadium seats filled. Crowd size applies from the next match.</p>
              </div>
          </section>

          {/* Financial Section */}
          <section className="space-y-4">
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
                                key={freq}
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
