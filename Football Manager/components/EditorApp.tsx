import React, { useState, useEffect } from 'react';
import { REAL_TEAMS_JSON, REAL_PLAYERS_JSON, REAL_COUNTRIES_JSON } from '../textSim/realDatabase';
import { ShirtIcon } from './ShirtIcon';
import { urlSimulador } from '../3dMatch/simulador3dCliente';
import FaceEditor from './FaceEditor';

type EditorTab = 'TEAMS' | 'PLAYERS' | 'LEAGUES' | 'TACTICS' | 'MODELS' | 'FACES';

export const EditorApp: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState<EditorTab>('TEAMS');
  const [teams, setTeams] = useState<any[]>([]);
  const [players, setPlayers] = useState<any[]>([]);
  const [countries, setCountries] = useState<any[]>([]);
  const [expandedContinent, setExpandedContinent] = useState<string | null>('South America');
  const [expandedCountry, setExpandedCountry] = useState<string | null>('brazil');
  
  // Edit State
  const [editingTeam, setEditingTeam] = useState<any | null>(null);
  const [editingPlayer, setEditingPlayer] = useState<any | null>(null);
  const [editingCountry, setEditingCountry] = useState<any | null>(null);
  const [playerFilterTeam, setPlayerFilterTeam] = useState<string>('');

  useEffect(() => {
    // Clone to avoid mutating original exported arrays
    setTeams(JSON.parse(JSON.stringify(REAL_TEAMS_JSON)));
    setPlayers(JSON.parse(JSON.stringify(REAL_PLAYERS_JSON)));
    setCountries(JSON.parse(JSON.stringify(REAL_COUNTRIES_JSON)));
  }, []);

  const handleSaveToDisk = async () => {
    try {
      const response = await fetch('/api/save-database', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ countries, teams, players })
      });
      if (response.ok) {
        alert("Database saved successfully! Restart game to see changes.");
      } else {
        const err = await response.json();
        alert("Error saving: " + err.error);
      }
    } catch (e: any) {
      alert("Failed to save: " + e.message);
    }
  };

  const saveEditingTeam = () => {
    setTeams(teams.map(t => t.teamID === editingTeam.teamID ? editingTeam : t));
    setEditingTeam(null);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-950 text-slate-300 p-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-3xl font-black text-white uppercase tracking-tighter">Database Editor</h1>
        <div className="flex gap-2">
          <button onClick={handleSaveToDisk} className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2 px-4 rounded transition-colors">
            Save to Disk
          </button>
          <button onClick={onClose} className="bg-slate-800 hover:bg-slate-700 text-white font-bold py-2 px-4 rounded transition-colors">
            Close
          </button>
        </div>
      </div>

      <div className="flex gap-4 border-b border-slate-800 mb-4">
        {(['TEAMS', 'PLAYERS', 'LEAGUES', 'TACTICS', 'MODELS', 'FACES'] as EditorTab[]).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`py-2 px-4 font-bold uppercase transition-colors ${activeTab === tab ? 'text-blue-400 border-b-2 border-blue-400' : 'text-slate-500 hover:text-slate-300'}`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-hidden flex gap-4">
        {activeTab === 'TEAMS' && (() => {
          const continents = Array.from(new Set(countries.map(c => c.continent || 'Other')));
          const getTeamsForCountry = (cId: string) => {
            const c = countries.find(x => x.id === cId);
            if (!c) return [];
            const teamIds = new Set(c.leagues.flatMap(l => l.teamIds || []));
            return teams.filter(t => teamIds.has(t.teamID));
          };
          const assignedTeamIds = new Set(countries.flatMap(c => c.leagues.flatMap(l => l.teamIds || [])));
          const unassignedTeams = teams.filter(t => !assignedTeamIds.has(t.teamID));

          return (
          <>
            <div className="w-1/3 border border-slate-800 rounded bg-slate-900 overflow-y-auto flex flex-col p-2 gap-2">
              {continents.map(continent => (
                <div key={continent} className="border border-slate-800 rounded bg-slate-950">
                  <button 
                    onClick={() => setExpandedContinent(expandedContinent === continent ? null : continent)}
                    className="w-full text-left p-2 font-bold text-slate-300 hover:bg-slate-800 flex justify-between"
                  >
                    <span>{continent}</span>
                    <span>{expandedContinent === continent ? '▼' : '▶'}</span>
                  </button>
                  {expandedContinent === continent && (
                    <div className="p-2 border-t border-slate-800 bg-slate-900 flex flex-col gap-1">
                      {countries.filter(c => (c.continent || 'Other') === continent).map(c => (
                        <div key={c.id} className="border border-slate-800 rounded bg-slate-950">
                          <button 
                            onClick={() => setExpandedCountry(expandedCountry === c.id ? null : c.id)}
                            className="w-full text-left p-2 font-bold text-sm text-slate-400 hover:bg-slate-800 flex justify-between"
                          >
                            <span>{c.name}</span>
                            <span>{expandedCountry === c.id ? '▼' : '▶'}</span>
                          </button>
                          {expandedCountry === c.id && (
                            <div className="p-1 border-t border-slate-800 bg-slate-900 flex flex-col gap-1">
                              {getTeamsForCountry(c.id).map(t => (
                                <button 
                                  key={t.teamID} 
                                  onClick={() => setEditingTeam(t)}
                                  className={`w-full text-left p-2 text-xs border border-slate-800 rounded hover:bg-slate-800 flex items-center gap-2 ${editingTeam?.teamID === t.teamID ? 'bg-slate-800 text-blue-400' : ''}`}
                                >
                                  <div className="w-6 h-6 flex-shrink-0 flex items-center justify-center overflow-hidden bg-slate-950 rounded">
                                     <img src={t.teamBadgeLocation || `/Assets/Escudos/${t.teamName}.png`} alt={t.teamName} className="w-full h-full object-contain" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                                  </div>
                                  <span className="truncate">{t.teamName}</span>
                                </button>
                              ))}
                              <button onClick={() => {
                                 const newTeamId = Date.now();
                                 const newTeam = { teamID: newTeamId, teamName: "New Team", teamAbb: "NEW", color: "#ffffff" };
                                 setTeams([...teams, newTeam]);
                                 const updatedCountries = [...countries];
                                 const targetCountry = updatedCountries.find(x => x.id === c.id);
                                 if (targetCountry) {
                                   if (!targetCountry.leagues || targetCountry.leagues.length === 0) {
                                     targetCountry.leagues = [{ id: `league_${Date.now()}`, name: "Divisão 1", tier: 1, teamIds: [] }];
                                   }
                                   targetCountry.leagues[0].teamIds = [...(targetCountry.leagues[0].teamIds || []), newTeamId];
                                   setCountries(updatedCountries);
                                 }
                                 setEditingTeam(newTeam);
                              }} className="w-full p-2 text-xs text-center text-emerald-500 font-bold border border-slate-800 border-dashed rounded hover:bg-slate-800">
                                + ADD TEAM
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                      <button onClick={() => {
                         const newCountry = { id: `country_${Date.now()}`, name: "New Country", continent, leagues: [] };
                         setCountries([...countries, newCountry]);
                         setExpandedCountry(newCountry.id);
                      }} className="w-full p-2 text-xs text-center text-emerald-500 font-bold border border-slate-800 border-dashed rounded hover:bg-slate-800 mt-2">
                        + ADD COUNTRY
                      </button>
                    </div>
                  )}
                </div>
              ))}
              
              {unassignedTeams.length > 0 && (
                <div className="border border-slate-800 rounded bg-slate-950">
                  <button 
                    onClick={() => setExpandedContinent(expandedContinent === 'Unassigned' ? null : 'Unassigned')}
                    className="w-full text-left p-2 font-bold text-slate-500 hover:bg-slate-800 flex justify-between"
                  >
                    <span>Unassigned Teams</span>
                    <span>{expandedContinent === 'Unassigned' ? '▼' : '▶'}</span>
                  </button>
                  {expandedContinent === 'Unassigned' && (
                    <div className="p-2 border-t border-slate-800 bg-slate-900 flex flex-col gap-1">
                      {unassignedTeams.map(t => (
                        <button 
                          key={t.teamID} 
                          onClick={() => setEditingTeam(t)}
                          className={`w-full text-left p-2 text-xs border border-slate-800 rounded hover:bg-slate-800 flex items-center gap-2 ${editingTeam?.teamID === t.teamID ? 'bg-slate-800 text-blue-400' : ''}`}
                        >
                          <div className="w-6 h-6 flex-shrink-0 flex items-center justify-center overflow-hidden bg-slate-950 rounded">
                             <img src={t.teamBadgeLocation || `/Assets/Escudos/${t.teamName}.png`} alt={t.teamName} className="w-full h-full object-contain" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                          </div>
                          <span className="truncate">{t.teamName}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="flex-1 border border-slate-800 rounded bg-slate-900 p-4 overflow-y-auto">
               {editingTeam ? (
                 <div className="space-y-4">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="w-16 h-16 flex-shrink-0 flex items-center justify-center overflow-hidden bg-slate-950 rounded-lg shadow-inner">
                        <img 
                          src={editingTeam.teamBadgeLocation || `/Assets/Escudos/${editingTeam.teamName}.png`} 
                          alt={editingTeam.teamName} 
                          className="w-full h-full object-contain"
                          onError={(e) => { e.currentTarget.style.display = 'none'; }}
                        />
                      </div>
                      <h2 className="text-xl font-bold text-white">Edit Team: {editingTeam.teamName}</h2>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Team Name</label>
                        <input type="text" value={editingTeam.teamName} onChange={e => setEditingTeam({...editingTeam, teamName: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Abbreviation</label>
                        <input type="text" value={editingTeam.teamAbb} onChange={e => setEditingTeam({...editingTeam, teamAbb: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white" />
                      </div>
                      <div className="col-span-2 mt-4">
                        {/* Os quatro uniformes lado a lado (em vez de abas): mais facil de comparar e corrigir. */}
                        <div className="grid grid-cols-4 gap-3">
                          {(['homeKit', 'awayKit', 'thirdKit', 'gkKit'] as const).map(tab => (
                        <div key={tab} className="bg-slate-950 border border-slate-800 rounded p-3 min-w-0">
                          <div className="mb-3 text-xs font-black text-emerald-400 uppercase tracking-widest">{tab.replace('Kit', '')} kit</div>
                          {(() => {
                            const kit = editingTeam[tab] || {
                                pattern: tab === 'homeKit' ? (editingTeam.shirtPattern || 'solid') : 'solid',
                                color1: tab === 'homeKit' ? (editingTeam.color1 || editingTeam.color || '#ffffff') : '#ffffff',
                                color2: tab === 'homeKit' ? (editingTeam.color2 || '') : '',
                                color3: tab === 'homeKit' ? (editingTeam.color3 || '') : ''
                            };

                            const updateKit = (updates: any) => {
                                const newKit = { ...kit, ...updates };
                                const newTeam = { ...editingTeam, [tab]: newKit };
                                // also keep root backward compatible for homeKit
                                if (tab === 'homeKit') {
                                    newTeam.shirtPattern = newKit.pattern;
                                    newTeam.color1 = newKit.color1;
                                    newTeam.color2 = newKit.color2;
                                    newTeam.color3 = newKit.color3;
                                    newTeam.color = newKit.color1;
                                }
                                setEditingTeam(newTeam);
                            };

                            return (
                                <div className="grid grid-cols-1 gap-3">
                                  <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Color 1 (Primary)</label>
                                    <input type="text" value={kit.color1} onChange={e => updateKit({ color1: e.target.value })} className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-white" />
                                  </div>
                                  <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Color 2 (Secondary)</label>
                                    <input type="text" value={kit.color2} onChange={e => updateKit({ color2: e.target.value })} className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-white" />
                                  </div>
                                  <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Color 3 (Tertiary)</label>
                                    <input type="text" value={kit.color3 || ''} onChange={e => updateKit({ color3: e.target.value })} className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-white" />
                                  </div>
                                  <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Number Color</label>
                                    <input type="text" value={kit.numberColor || ''} onChange={e => updateKit({ numberColor: e.target.value })} className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-white" />
                                  </div>
                                  <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Number Outline</label>
                                    <input type="text" value={kit.numberOutlineColor || ''} onChange={e => updateKit({ numberOutlineColor: e.target.value })} className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-white" />
                                  </div>
                                  <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Collar Color</label>
                                    <input type="text" value={kit.collarColor || ''} onChange={e => updateKit({ collarColor: e.target.value })} className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-white" />
                                  </div>
                                  <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Sleeve Color</label>
                                    <input type="text" value={kit.sleeveColor || ''} onChange={e => updateKit({ sleeveColor: e.target.value })} className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-white" />
                                  </div>
                                  <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Shirt Pattern</label>
                                    <select 
                                      value={kit.pattern} 
                                      onChange={e => updateKit({ pattern: e.target.value })}
                                      className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-white"
                                    >
                                      <option value="solid">Solid</option>
                                      <option value="stripes">Vertical Stripes</option>
                                      <option value="horizontal">Horizontal Stripes</option>
                                      <option value="centerVerticalStripes">Center Vertical Stripes</option>
                                      <option value="diagonal">Diagonal Stripe</option>
                                      <option value="dualDiagonal">Dual Diagonal</option>
                                      <option value="multipleDiagonals">Multiple Diagonals</option>
                                      <option value="criciumaStripes">Criciuma Stripes</option>
                                      <option value="spfcStripes">SPFC Stripes</option>
                                      <option value="triStripes">Tri-color Stripes</option>
                                    </select>
                                  </div>
                                  <div className="flex justify-center mt-2">
                                    <div className="w-24 h-24 bg-slate-800 rounded flex items-center justify-center shadow-lg">
                                      <ShirtIcon 
                                          color={kit.color1 || '#ffffff'}
                                          color2={kit.color2 || 'transparent'}
                                          color3={kit.color3 || 'transparent'}
                                          pattern={kit.pattern || 'solid'}
                                          numberColor={kit.numberColor}
                                          numberOutlineColor={kit.numberOutlineColor}
                                          collarColor={kit.collarColor}
                                          sleeveColor={kit.sleeveColor}
                                          number={10}
                                          longSleeves={tab === 'gkKit'}
                                          className="w-16 h-16"
                                      />
                                    </div>
                                  </div>
                                </div>
                            );
                          })()}
                        </div>
                          ))}
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Stadium</label>
                        <input type="text" value={editingTeam.teamStadiumName || ''} onChange={e => setEditingTeam({...editingTeam, teamStadiumName: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Stadium Capacity</label>
                        <input type="number" value={editingTeam.stadiumCapacity || ''} onChange={e => setEditingTeam({...editingTeam, stadiumCapacity: parseInt(e.target.value) || undefined})} className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white" />
                      </div>
                    </div>
                    <button onClick={saveEditingTeam} className="mt-4 bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 px-4 rounded transition-colors">
                      Apply Changes
                    </button>
                 </div>
               ) : (
                 <div className="flex items-center justify-center h-full text-slate-500">Select a team to edit</div>
               )}
            </div>
          </>
          );
        })()}
        
        {activeTab === 'PLAYERS' && (
          <>
            <div className="w-1/3 border border-slate-800 rounded bg-slate-900 flex flex-col">
               <div className="p-2 border-b border-slate-800 bg-slate-900 z-10">
                 <select 
                   className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white text-sm"
                   onChange={e => {
                      setPlayerFilterTeam(e.target.value);
                   }}
                 >
                   <option value="">All Teams</option>
                   {[...new Set(players.map(p => p.team))].sort().map(teamName => (
                     <option key={teamName as string} value={teamName as string}>{teamName as string}</option>
                   ))}
                 </select>
               </div>
               <div className="flex-1 overflow-y-auto">
                 {players.filter(p => playerFilterTeam === '' || p.team === playerFilterTeam).map(p => (
                   <button 
                     key={p.idPlayer} 
                     onClick={() => setEditingPlayer(p)}
                     className={`w-full text-left p-3 border-b border-slate-800 hover:bg-slate-800 flex items-center justify-between ${editingPlayer?.idPlayer === p.idPlayer ? 'bg-slate-800 text-blue-400' : ''}`}
                   >
                     <div>
                       <div className="font-bold truncate max-w-[150px]">{p.namePlayer}</div>
                       <div className="text-xs text-slate-500">{p.team}</div>
                     </div>
                     <div className="flex items-center gap-2">
                        <span className="text-xs px-2 py-1 bg-slate-950 rounded text-slate-400 font-mono">{p.posPlayer}</span>
                        <span className="font-bold text-emerald-400">{p.ovrPlayer}</span>
                     </div>
                   </button>
                 ))}
               </div>
            </div>
            <div className="flex-1 border border-slate-800 rounded bg-slate-900 p-4 overflow-y-auto">
               {editingPlayer ? (
                 <div className="space-y-4">
                    <h2 className="text-xl font-bold text-white mb-4">Edit Player: {editingPlayer.namePlayer}</h2>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="col-span-2">
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Name (NAME)</label>
                        <input type="text" value={editingPlayer.namePlayer || ''} onChange={e => setEditingPlayer({...editingPlayer, namePlayer: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Position (POS)</label>
                        <input type="text" value={editingPlayer.posPlayer || ''} onChange={e => setEditingPlayer({...editingPlayer, posPlayer: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Number (#)</label>
                        <input type="number" value={editingPlayer.shirtNumber || 0} onChange={e => setEditingPlayer({...editingPlayer, shirtNumber: parseInt(e.target.value) || 0})} className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Age (AGE)</label>
                        <input type="number" value={editingPlayer.agePlayer || 0} onChange={e => setEditingPlayer({...editingPlayer, agePlayer: parseInt(e.target.value) || 0})} className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Overall (OVR)</label>
                        <input type="number" value={editingPlayer.ovrPlayer || 0} onChange={e => setEditingPlayer({...editingPlayer, ovrPlayer: parseInt(e.target.value) || 0})} className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Morale (MOR)</label>
                        <input type="number" value={editingPlayer.morplayer || 0} onChange={e => setEditingPlayer({...editingPlayer, morplayer: parseInt(e.target.value) || 0})} className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Defense (DEF)</label>
                        <input type="number" value={editingPlayer.defPlayer || 0} onChange={e => setEditingPlayer({...editingPlayer, defPlayer: parseInt(e.target.value) || 0})} className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Passing (PAS)</label>
                        <input type="number" value={editingPlayer.pasPlayer || 0} onChange={e => setEditingPlayer({...editingPlayer, pasPlayer: parseInt(e.target.value) || 0})} className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Dribbling (DRB)</label>
                        <input type="number" value={editingPlayer.drbplayer || 0} onChange={e => setEditingPlayer({...editingPlayer, drbplayer: parseInt(e.target.value) || 0})} className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Shooting (SHT)</label>
                        <input type="number" value={editingPlayer.shtPlayer || 0} onChange={e => setEditingPlayer({...editingPlayer, shtPlayer: parseInt(e.target.value) || 0})} className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Progression (PROG)</label>
                        <input type="number" value={editingPlayer.progPlayer || 0} onChange={e => setEditingPlayer({...editingPlayer, progPlayer: parseInt(e.target.value) || 0})} className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white" />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Value (VAL)</label>
                        <input type="number" value={editingPlayer.valPlayer || 0} onChange={e => setEditingPlayer({...editingPlayer, valPlayer: parseInt(e.target.value) || 0})} className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white" />
                      </div>
                    </div>
                    <button onClick={() => {
                        setPlayers(players.map(p => p.idPlayer === editingPlayer.idPlayer ? editingPlayer : p));
                        setEditingPlayer(null);
                    }} className="mt-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2 px-4 rounded transition-colors">
                      Apply Changes
                    </button>
                 </div>
               ) : (
                 <div className="flex items-center justify-center h-full text-slate-500">Select a player to edit</div>
               )}
            </div>
          </>
        )}

        {activeTab === 'FACES' && <FaceEditor />}

        {activeTab === 'MODELS' && (
          // Comparacao do corpo dos jogadores em T-pose (modelosComparar.html): actual, metade dos triangulos e minimo.
          <iframe title="Comparar modelos" src={urlSimulador().replace(/index\.html$/, 'modelosComparar.html')} className="w-full h-full border-0 rounded bg-slate-900" />
        )}
        {activeTab === 'TACTICS' && (
          // O editor de formacoes por zona do simulador 3D (tacticsEditor.html), servido pelo mesmo servidor do 3D.
          <iframe title="Tactics editor" src={urlSimulador().replace(/index\.html$/, 'tacticsEditor.html')} className="w-full h-full border-0 rounded bg-slate-900" />
        )}

        {activeTab === 'LEAGUES' && (
          <>
            <div className="w-1/3 border border-slate-800 rounded bg-slate-900 overflow-y-auto flex flex-col">
               {countries.map((c, i) => (
                 <button 
                   key={c.id || i} 
                   onClick={() => setEditingCountry(c)}
                   className={`w-full text-left p-3 border-b border-slate-800 hover:bg-slate-800 flex items-center gap-3 ${editingCountry?.id === c.id ? 'bg-slate-800 text-blue-400' : ''}`}
                 >
                   <div>
                     <div className="font-bold">{c.name}</div>
                     <div className="text-xs text-slate-500">{c.leagues?.length || 0} Leagues</div>
                   </div>
                 </button>
               ))}
               <button onClick={() => {
                   const newCountry = { id: `country_${Date.now()}`, name: 'New Country', leagues: [] };
                   setCountries([...countries, newCountry]);
                   setEditingCountry(newCountry);
               }} className="p-3 text-center text-sm font-bold text-emerald-500 hover:bg-slate-800 border-b border-slate-800">
                   + ADD COUNTRY
               </button>
            </div>
            <div className="flex-1 border border-slate-800 rounded bg-slate-900 p-4 overflow-y-auto">
               {editingCountry ? (
                 <div className="space-y-4">
                    <h2 className="text-xl font-bold text-white mb-4">Edit Country: {editingCountry.name}</h2>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Country Name</label>
                        <input type="text" value={editingCountry.name} onChange={e => setEditingCountry({...editingCountry, name: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Continent</label>
                        <input type="text" value={editingCountry.continent || ''} onChange={e => setEditingCountry({...editingCountry, continent: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Country ID</label>
                        <input type="text" value={editingCountry.id} onChange={e => setEditingCountry({...editingCountry, id: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white" />
                      </div>
                    </div>
                    
                    <div className="mt-8">
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="font-bold text-lg text-slate-300">Leagues</h3>
                            <button onClick={() => {
                                const newLeague = { id: `league_${Date.now()}`, name: 'New League', tier: 1, teamIds: [] };
                                setEditingCountry({...editingCountry, leagues: [...(editingCountry.leagues || []), newLeague]});
                            }} className="text-xs bg-slate-800 hover:bg-slate-700 px-3 py-1 rounded">Add League</button>
                        </div>
                        <div className="space-y-4">
                            {(editingCountry.leagues || []).map((league: any, lIdx: number) => (
                                <div key={league.id || lIdx} className="bg-slate-950 border border-slate-800 p-4 rounded">
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-2">
                                        <input type="text" placeholder="League Name" value={league.name} onChange={e => {
                                            const updatedLeagues = [...editingCountry.leagues];
                                            updatedLeagues[lIdx].name = e.target.value;
                                            setEditingCountry({...editingCountry, leagues: updatedLeagues});
                                        }} className="bg-slate-900 border border-slate-800 rounded p-2 text-white text-sm" />
                                        <input type="number" placeholder="Tier" value={league.tier} onChange={e => {
                                            const updatedLeagues = [...editingCountry.leagues];
                                            updatedLeagues[lIdx].tier = parseInt(e.target.value);
                                            setEditingCountry({...editingCountry, leagues: updatedLeagues});
                                        }} className="bg-slate-900 border border-slate-800 rounded p-2 text-white text-sm" />
                                        <input type="number" placeholder="Promoted" value={league.promoted || 0} onChange={e => {
                                            const updatedLeagues = [...editingCountry.leagues];
                                            updatedLeagues[lIdx].promoted = parseInt(e.target.value);
                                            setEditingCountry({...editingCountry, leagues: updatedLeagues});
                                        }} className="bg-slate-900 border border-slate-800 rounded p-2 text-white text-sm" title="Number of teams promoted" />
                                        <input type="number" placeholder="Relegated" value={league.relegated || 0} onChange={e => {
                                            const updatedLeagues = [...editingCountry.leagues];
                                            updatedLeagues[lIdx].relegated = parseInt(e.target.value);
                                            setEditingCountry({...editingCountry, leagues: updatedLeagues});
                                        }} className="bg-slate-900 border border-slate-800 rounded p-2 text-white text-sm" title="Number of teams relegated" />
                                    </div>
                                    <div className="grid grid-cols-2 gap-2 mb-2">
                                        <select 
                                            value={league.type || 'LEAGUE'} 
                                            onChange={e => {
                                                const updatedLeagues = [...editingCountry.leagues];
                                                updatedLeagues[lIdx].type = e.target.value;
                                                setEditingCountry({...editingCountry, leagues: updatedLeagues});
                                            }}
                                            className="bg-slate-900 border border-slate-800 rounded p-2 text-white text-sm"
                                        >
                                            <option value="LEAGUE">Format: LEAGUE (Round-Robin)</option>
                                            <option value="CUP">Format: CUP (Tournament)</option>
                                        </select>
                                        {league.type === 'CUP' && (
                                            <select 
                                                value={league.cupFormat || 'KNOCKOUT'} 
                                                onChange={e => {
                                                    const updatedLeagues = [...editingCountry.leagues];
                                                    updatedLeagues[lIdx].cupFormat = e.target.value;
                                                    setEditingCountry({...editingCountry, leagues: updatedLeagues});
                                                }}
                                                className="bg-slate-900 border border-slate-800 rounded p-2 text-white text-sm"
                                            >
                                                <option value="KNOCKOUT">Knockout (Eliminatório)</option>
                                                <option value="GROUPS_KNOCKOUT">Groups + Knockout (Grupos + Copa)</option>
                                            </select>
                                        )}
                                    </div>
                                    <div className="text-xs text-slate-500 mb-1">Teams (Comma separated Team IDs):</div>
                                    <textarea 
                                        value={(league.teamIds || []).join(', ')} 
                                        onChange={e => {
                                            const updatedLeagues = [...editingCountry.leagues];
                                            updatedLeagues[lIdx].teamIds = e.target.value.split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n));
                                            setEditingCountry({...editingCountry, leagues: updatedLeagues});
                                        }}
                                        className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-white text-xs font-mono h-16" 
                                    />
                                    <div className="text-xs text-slate-400 mt-1 mb-2">Found {league.teamIds?.length || 0} teams.</div>
                                    
                                    <div className="text-xs text-slate-500 mb-1">Match Dates (Comma separated days of the year 1-365 e.g. 14, 21, 28):</div>
                                    <textarea 
                                        value={(league.matchDates || []).join(', ')} 
                                        onChange={e => {
                                            const updatedLeagues = [...editingCountry.leagues];
                                            updatedLeagues[lIdx].matchDates = e.target.value.split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n) && n > 0 && n <= 365);
                                            setEditingCountry({...editingCountry, leagues: updatedLeagues});
                                        }}
                                        className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-white text-xs font-mono h-16" 
                                        placeholder="14, 21, 28, 35"
                                    />
                                    <div className="flex justify-end mt-2">
                                        <button onClick={() => {
                                            if(confirm('Are you sure you want to delete this league?')) {
                                                const updatedLeagues = [...editingCountry.leagues];
                                                updatedLeagues.splice(lIdx, 1);
                                                setEditingCountry({...editingCountry, leagues: updatedLeagues});
                                            }
                                        }} className="text-xs text-red-500 hover:text-red-400 border border-red-900 hover:bg-red-900/30 px-3 py-1 rounded">Delete League</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <button onClick={() => {
                        setCountries(countries.map(c => c.id === editingCountry.id ? editingCountry : c));
                        setEditingCountry(null);
                    }} className="mt-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2 px-4 rounded transition-colors">
                      Apply Changes
                    </button>
                 </div>
               ) : (
                 <div className="flex items-center justify-center h-full text-slate-500">Select a country to edit</div>
               )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default EditorApp;
