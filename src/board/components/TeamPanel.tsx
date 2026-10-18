
import React, { useState } from 'react';
import { Team, TeamSide, PlayerRole, TeamCoinSettings } from '../types';
import { FORMATIONS } from '../constants';

import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface TeamPanelProps {
  team: Team;
  side: TeamSide;
  teamSettings?: TeamCoinSettings;
  activePlayerIds?: Set<string>;
  onUpdateTeam: (side: TeamSide, updates: Partial<Team>) => void;
  onUpdateTeamSettings: (side: TeamSide, updates: Partial<TeamCoinSettings>) => void;
  onUpdatePlayer: (side: TeamSide, playerId: string, updates: any) => void;
  onDeployPlayer: (side: TeamSide, playerId: string) => void;
  onApplyFormation: (side: TeamSide, formation: string) => void;
  onReorderPlayers: (side: TeamSide, oldIndex: number, newIndex: number) => void;
  onAddPlayer?: (side: TeamSide) => void;
  isMultiSelect?: boolean;
}

const TeamPanel: React.FC<TeamPanelProps> = ({ 
  team, 
  side, 
  teamSettings,
  activePlayerIds,
  onUpdateTeam, 
  onUpdateTeamSettings,
  onUpdatePlayer, 
  onDeployPlayer,
  onApplyFormation,
  onReorderPlayers,
  onAddPlayer,
  isMultiSelect
}) => {
  const [selectedFormation, setSelectedFormation] = useState('4-4-2');
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [bulkText, setBulkText] = useState('');

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = team.players.findIndex(p => p.id === active.id);
      const newIndex = team.players.findIndex(p => p.id === over.id);
      if (oldIndex !== -1 && newIndex !== -1) {
        onReorderPlayers(side, oldIndex, newIndex);
      }
    }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        onUpdateTeamSettings(side, { logo: ev.target?.result as string });
      };
      reader.readAsDataURL(e.target.files[0]);
    }
  };

  const handleBulkImport = (replace: boolean) => {
     if (!bulkText.trim()) return;
     const lines = bulkText.split('\n').map(l => l.trim()).filter(Boolean);
     
     let newPlayers = replace ? [] : [...team.players];
     let currentIndex = 0;

     lines.forEach((line) => {
         let number = '';
         let positionLabel = '';
         let name = line;

         const tokens = line.split(/[\t,]+/);
         if (tokens.length >= 2) {
             if (tokens.length >= 3) {
                number = tokens[0].trim();
                positionLabel = tokens[1].trim();
                name = tokens.slice(2).join(' ').trim();
             } else {
                number = tokens[0].trim();
                name = tokens[1].trim();
             }
         } else {
             const parts = line.trim().split(/\s+/);
             if (parts.length > 1) {
                 if (/^\d+$/.test(parts[0])) {
                     number = parts.shift() || '';
                 }
                 if (parts.length > 1 && /^[a-zA-Z]{1,3}$/.test(parts[0]) && parts[0] === parts[0].toUpperCase()) {
                     positionLabel = parts.shift() || '';
                 }
                 name = parts.join(' ');
             }
         }

         if (replace) {
             newPlayers.push({
                id: `${side}-p${currentIndex + 1}`,
                name: name,
                number: number || String(currentIndex + 1),
                role: currentIndex < 11 ? PlayerRole.MAIN : PlayerRole.SUB,
                isOnField: false,
                positionLabel: positionLabel
             });
             currentIndex++;
         } else {
             if (currentIndex < newPlayers.length) {
                 newPlayers[currentIndex] = {
                     ...newPlayers[currentIndex],
                     name: name || newPlayers[currentIndex].name,
                     number: number || newPlayers[currentIndex].number,
                     positionLabel: positionLabel || newPlayers[currentIndex].positionLabel
                 };
                 currentIndex++;
             }
         }
     });

     if (replace) {
         while(newPlayers.length < 20) {
             const idx = newPlayers.length;
             newPlayers.push({
                id: `${side}-p${idx + 1}`,
                name: `Player ${idx + 1}`,
                number: String(idx + 1),
                role: idx < 11 ? PlayerRole.MAIN : PlayerRole.SUB,
                isOnField: false,
             });
         }
     }

     onUpdateTeam(side, { players: newPlayers });
     setShowBulkImport(false);
     setBulkText('');
  };

  return (
    <div className="flex flex-col h-full bg-[#0e1422] border-r border-[#1c2438] overflow-y-auto w-64 p-3 scrollbar-panel">
      <div className="mb-4 space-y-3">
        <div className="flex items-center gap-2 border-b border-[#1c2438] pb-3">
          <div 
            className="w-8 h-8 rounded-[10px] flex items-center justify-center font-bold text-white text-base shadow-lg ring-1 ring-black/20" 
            style={{ backgroundColor: team.color }}
          >
            {side === TeamSide.HOME ? 'H' : side === TeamSide.AWAY ? 'A' : 'N'}
          </div>
          <div>
            <h2 className="text-sm font-black uppercase tracking-wider text-white leading-tight">{side} SQUAD</h2>
            <span className="text-[10px] text-slate-500 font-medium tracking-wide">Formation, kit & players</span>
          </div>
        </div>
        
        <div className="space-y-1">
          <label className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Team Name</label>
          <input 
            type="text" 
            value={teamSettings?.name ?? team.name} 
            onChange={(e) => onUpdateTeamSettings(side, { name: e.target.value })}
            className="w-full bg-[#080b12] border border-[#1c2438] rounded-md px-2 py-1.5 text-xs font-medium focus:border-[#c0fa4a] focus:ring-1 focus:ring-[#c0fa4a] outline-none text-white transition-all shadow-inner"
          />
        </div>

        <div className="flex gap-2">
          <div className="flex-1 space-y-1">
            <label className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Color</label>
            <div className="flex items-center gap-1 mt-1">
               <div className="relative w-6 h-6 rounded-md overflow-hidden ring-1 ring-[#1c2438] shadow-sm">
                 <input 
                    type="color" 
                    value={teamSettings?.color ?? team.color} 
                    onChange={(e) => onUpdateTeamSettings(side, { color: e.target.value })}
                    className="absolute -top-2 -left-2 w-10 h-10 cursor-pointer border-none p-0"
                 />
               </div>
               <span className="text-[9px] font-mono text-slate-400 font-medium tracking-wide">{teamSettings?.color ?? team.color}</span>
            </div>
          </div>
          <div className="flex-1 space-y-1">
            <label className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Sec. Color</label>
            <div className="flex items-center gap-1 mt-1">
               <div className="relative w-6 h-6 rounded-md overflow-hidden ring-1 ring-[#1c2438] shadow-sm">
                 <input 
                    type="color" 
                    value={teamSettings?.secondaryColor ?? team.secondaryColor ?? '#ffffff'} 
                    onChange={(e) => onUpdateTeamSettings(side, { secondaryColor: e.target.value })}
                    className="absolute -top-2 -left-2 w-10 h-10 cursor-pointer border-none p-0"
                 />
               </div>
               <span className="text-[9px] font-mono text-slate-400 font-medium tracking-wide">{teamSettings?.secondaryColor ?? team.secondaryColor ?? '#ffffff'}</span>
            </div>
          </div>
          <div className="flex-1 space-y-1">
             <label className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Logo</label>
             <label className="flex items-center justify-center h-6 mt-1 bg-[#1a233a] border border-[#263351] rounded-md cursor-pointer hover:bg-[#263351] text-[9px] font-bold tracking-wider text-slate-300 transition-colors shadow-sm">
               UPLOAD
               <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
             </label>
          </div>
        </div>
      </div>

      <div className="mb-4 border-t border-[#1c2438] pt-3">
        <label className="text-[10px] text-slate-400 block uppercase font-bold tracking-wider mb-2">Display Settings</label>
        <div className="grid grid-cols-2 gap-y-2 gap-x-2 text-[10px]">
           <label className="flex items-center gap-2.5 cursor-pointer group">
            <input type="checkbox" className="hidden" checked={teamSettings?.showNumber ?? team.settings?.showNumber ?? true} onChange={(e) => onUpdateTeamSettings(side, { showNumber: e.target.checked })} />
            <div className={`w-9 h-5 rounded-full transition-colors relative flex items-center px-0.5 ${teamSettings?.showNumber ?? team.settings?.showNumber ?? true ? 'bg-[#c0fa4a]' : 'bg-[#263351]'}`}>
                <div className={`bg-[#080b12] w-4 h-4 rounded-full transition-transform shadow-sm ${teamSettings?.showNumber ?? team.settings?.showNumber ?? true ? 'translate-x-4' : 'translate-x-0'}`}></div>
            </div>
            <span className="text-slate-300 font-medium tracking-wide group-hover:text-white transition-colors">Show Number</span>
          </label>
          <label className="flex items-center gap-2.5 cursor-pointer group">
            <input type="checkbox" className="hidden" checked={teamSettings?.showPositionLabel ?? team.settings?.showPositionLabel ?? false} onChange={(e) => onUpdateTeamSettings(side, { showPositionLabel: e.target.checked })} />
            <div className={`w-9 h-5 rounded-full transition-colors relative flex items-center px-0.5 ${teamSettings?.showPositionLabel ?? team.settings?.showPositionLabel ?? false ? 'bg-[#c0fa4a]' : 'bg-[#263351]'}`}>
                <div className={`bg-[#080b12] w-4 h-4 rounded-full transition-transform shadow-sm ${teamSettings?.showPositionLabel ?? team.settings?.showPositionLabel ?? false ? 'translate-x-4' : 'translate-x-0'}`}></div>
            </div>
            <span className="text-slate-300 font-medium tracking-wide group-hover:text-white transition-colors">Show Pos</span>
          </label>
          <label className="flex items-center gap-2.5 cursor-pointer group">
            <input type="checkbox" className="hidden" checked={teamSettings?.showName ?? team.settings?.showName ?? true} onChange={(e) => onUpdateTeamSettings(side, { showName: e.target.checked })} />
            <div className={`w-9 h-5 rounded-full transition-colors relative flex items-center px-0.5 ${teamSettings?.showName ?? team.settings?.showName ?? true ? 'bg-[#c0fa4a]' : 'bg-[#263351]'}`}>
                <div className={`bg-[#080b12] w-4 h-4 rounded-full transition-transform shadow-sm ${teamSettings?.showName ?? team.settings?.showName ?? true ? 'translate-x-4' : 'translate-x-0'}`}></div>
            </div>
            <span className="text-slate-300 font-medium tracking-wide group-hover:text-white transition-colors">Show Names</span>
          </label>
        </div>
        <div className="flex gap-2 mt-3">
           <div className="flex-1">
             <span className="text-[9px] text-slate-500 uppercase font-bold tracking-wider block mb-1">Shape</span>
             <select 
                value={teamSettings?.shape ?? team.settings?.shape ?? 'circle'}
                onChange={(e) => onUpdateTeamSettings(side, { shape: e.target.value as any })}
                className="w-full bg-[#1a233a] border border-[#263351] rounded-md px-1.5 py-1 text-[9px] text-slate-300 outline-none focus:border-[#c0fa4a]"
             >
                <option value="circle">Circle</option>
                <option value="semicircle">Semicircle</option>
                <option value="crescent">Crescent</option>
                <option value="jersey">Jersey (Old)</option>
                <option value="coins">3D Coins</option>
                <option value="pucks">Pucks</option>
                <option value="shirts">Shirts</option>
                <option value="minis">Minis</option>
                <option value="domes">Domes</option>
                <option value="meeples">Meeples</option>
                <option value="badges">Badges</option>
                <option value="logo">Team Logo</option>
                <option value="holo">Holo</option>
                <option value="tactic">Tactic</option>
             </select>
           </div>
           <div className="flex-1">
             <span className="text-[9px] text-slate-500 uppercase font-bold tracking-wider block mb-1">Orientation</span>
             <select 
                value={teamSettings?.orientation ?? team.settings?.orientation ?? 'normal'}
                onChange={(e) => onUpdateTeamSettings(side, { orientation: e.target.value as any })}
                className="w-full bg-[#1a233a] border border-[#263351] rounded-md px-1.5 py-1 text-[9px] text-slate-300 outline-none focus:border-[#c0fa4a]"
             >
                <option value="normal">Normal</option>
                <option value="inverted">Inverted</option>
                <option value="vertical">Vertical</option>
             </select>
           </div>
        </div>
      </div>

      <div className={`mb-4 border-t border-[#1c2438] pt-3 ${isMultiSelect ? 'opacity-30 pointer-events-none transition-opacity' : ''}`}>
        <div className="flex items-center justify-between mb-2">
          {side !== TeamSide.NEUTRAL ? (
            <label className="text-[10px] text-slate-400 block uppercase font-bold tracking-wider">Quick Formation</label>
          ) : (
            <div />
          )}
          <button 
            onClick={() => setShowBulkImport(!showBulkImport)}
            className="text-[9px] text-[#4afae4] hover:text-[#7efbf0] font-bold tracking-wider"
          >
            {showBulkImport ? 'CLOSE IMPORT' : 'BULK IMPORT'}
          </button>
        </div>
        {!showBulkImport ? (
          side !== TeamSide.NEUTRAL ? (
            <div className="flex gap-1.5">
              <select 
                value={selectedFormation}
                onChange={(e) => setSelectedFormation(e.target.value)}
                className="flex-1 bg-[#1a233a] border border-[#263351] rounded-md px-1.5 py-1 text-[10px] text-white outline-none focus:border-[#c0fa4a]"
              >
                {Object.keys(FORMATIONS).map(fmt => (
                  <option key={fmt} value={fmt}>{fmt}</option>
                ))}
              </select>
              <button 
                onClick={() => onApplyFormation(side, selectedFormation)}
                className="bg-[#c0fa4a] hover:bg-[#aee638] text-[#080b12] px-3 py-1 rounded-md text-[9px] font-bold tracking-wider transition-colors"
              >
                Apply
              </button>
            </div>
          ) : null
        ) : (
          <div className="space-y-1.5 bg-slate-800/50 p-2 rounded border border-slate-700">
             <div className="flex justify-between items-center pb-1">
                 <span className="text-[9px] text-slate-400 font-mono">1 GK Player Name</span>
                 <button 
                    onClick={() => navigator.clipboard.writeText("1 GK De Gea\n2 CB Martinez\n3 LB Shaw\n4 CB Varane\n5 RB Dalot\n6 CDM Casemiro\n7 RW Antony\n8 CM Eriksen\n9 ST Martial\n10 CAM Fernandes\n11 LW Rashford")}
                    className="px-1.5 py-0.5 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded text-[9px] transition-colors"
                    title="Copy format example"
                 >
                    Copy Example
                 </button>
             </div>
             <textarea 
               value={bulkText}
               onChange={e => setBulkText(e.target.value)}
               placeholder="1 GK De Gea&#10;2 CB Martinez"
               className="w-full h-24 bg-slate-900 border border-slate-700 rounded p-1.5 text-xs text-slate-300 resize-none focus:border-blue-500 outline-none font-mono"
             />
             <div className="flex justify-end gap-1.5">
                 <button 
                    onClick={() => handleBulkImport(true)}
                    className="px-2 py-1 bg-slate-700 hover:bg-slate-600 text-white rounded text-[9px] font-medium transition-colors"
                    title="Replaces all players and clears field"
                 >
                   Replace All
                 </button>
                 <button 
                    onClick={() => handleBulkImport(false)}
                    className="px-2 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded text-[9px] font-medium transition-colors"
                    title="Updates existing players with matching lines"
                 >
                   Update Existing
                 </button>
             </div>
          </div>
        )}
      </div>

      <div className={`flex-1 space-y-3 text-slate-100 ${isMultiSelect ? 'opacity-30 pointer-events-none transition-opacity' : ''}`}>
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <div>
            <div className="flex justify-between items-center mb-2 px-1">
              <div className="flex items-center gap-2">
                <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{side === TeamSide.NEUTRAL ? 'Player Pool' : 'Main Squad'}</h3>
                {side === TeamSide.NEUTRAL && onAddPlayer && (
                  <button 
                    onClick={() => onAddPlayer(side)}
                    className="w-5 h-5 bg-[#c0fa4a] hover:bg-[#aee638] rounded-md text-[#080b12] flex items-center justify-center text-xs font-bold transition-colors shadow-sm"
                    title="Add player to pool"
                  >
                    +
                  </button>
                )}
              </div>
              <div className="text-[8px] text-slate-500 flex gap-4 uppercase font-bold tracking-wider pl-4">
                <span className="w-6 text-center">#</span>
                <span className="w-8 text-center">POS</span>
                <span className="flex-1 text-left">NAME</span>
                <span className="w-8 text-center">ON</span>
              </div>
            </div>
            <div className="space-y-1.5">
              <SortableContext items={team.players.filter(p => p.role === PlayerRole.MAIN || side === TeamSide.NEUTRAL).map(p => p.id)} strategy={verticalListSortingStrategy}>
                {team.players.filter(p => p.role === PlayerRole.MAIN || side === TeamSide.NEUTRAL).map(player => (
                   <SortablePlayerRow 
                      key={player.id} 
                      player={player} 
                      teamColor={teamSettings?.color ?? team.color}
                      isNeutral={side === TeamSide.NEUTRAL}
                      isActive={activePlayerIds?.has(player.id) ?? player.isOnField}
                      onUpdate={(u: any) => onUpdatePlayer(side, player.id, u)}
                      onDeploy={() => onDeployPlayer(side, player.id)}
                   />
                ))}
              </SortableContext>
            </div>
          </div>

          {side !== TeamSide.NEUTRAL && (
            <div className="mt-4 border-t border-[#1c2438] pt-2">
              <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2 px-1">Substitutes</h3>
              <div className="space-y-1.5">
                <SortableContext items={team.players.filter(p => p.role === PlayerRole.SUB).map(p => p.id)} strategy={verticalListSortingStrategy}>
                  {team.players.filter(p => p.role === PlayerRole.SUB).map(player => (
                     <SortablePlayerRow 
                        key={player.id} 
                        player={player} 
                        teamColor={teamSettings?.color ?? team.color}
                        isNeutral={false}
                        isActive={activePlayerIds?.has(player.id) ?? player.isOnField}
                        onUpdate={(u: any) => onUpdatePlayer(side, player.id, u)}
                        onDeploy={() => onDeployPlayer(side, player.id)}
                     />
                  ))}
                </SortableContext>
              </div>
            </div>
          )}
        </DndContext>
      </div>
    </div>
  );
};

const SortablePlayerRow = ({ player, teamColor, isNeutral, isActive, onUpdate, onDeploy }: any) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: player.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} className={`flex items-center gap-1.5 py-1 border-b border-[#1c2438]/50 group relative ${isDragging ? 'shadow-lg bg-[#1a233a] z-10 rounded-md border-transparent px-1 -mx-1' : ''}`}>
      <div {...attributes} {...listeners} className="cursor-grab hover:bg-[#263351] p-1 rounded-md text-slate-600 hover:text-slate-400 flex items-center justify-center transition-colors">
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 8h16M4 16h16"></path></svg>
      </div>
      
      {isNeutral ? (
        <input 
          type="color" 
          value={player.color || teamColor} 
          onChange={(e) => onUpdate({ color: e.target.value })}
          className="w-5 h-5 bg-transparent cursor-pointer rounded-sm overflow-hidden p-0 border-0 flex-shrink-0"
          title="Player Color"
        />
      ) : (
        <input 
          type="text" 
          value={player.number}
          onChange={(e) => onUpdate({ number: e.target.value })}
          className="w-6 text-center bg-[#080b12] border border-[#1c2438] rounded-md text-[10px] py-1 px-0 text-white font-bold focus:border-[#c0fa4a] outline-none shadow-inner transition-colors"
          placeholder="#"
        />
      )}

      <input 
        type="text" 
        value={player.positionLabel || ''}
        onChange={(e) => onUpdate({ positionLabel: e.target.value })}
        className="w-7 text-center bg-[#080b12] border border-[#1c2438] rounded-md text-[9px] py-1 uppercase px-0 text-white font-bold focus:border-[#c0fa4a] outline-none shadow-inner transition-colors"
        placeholder="Pos"
        maxLength={3}
      />
      <input 
        type="text" 
        value={player.name}
        onChange={(e) => onUpdate({ name: e.target.value })}
        className="flex-1 w-0 bg-transparent border-b border-transparent hover:border-[#263351] focus:border-[#c0fa4a] outline-none text-[11px] px-1.5 py-0.5 text-white font-medium transition-colors"
      />
      
      {/* Switch toggle for ON/OFF field */}
      <button 
        onClick={onDeploy}
        className="w-8 h-4 rounded-full relative flex items-center px-0.5 transition-colors flex-shrink-0"
        style={{ backgroundColor: isActive ? '#c0fa4a' : '#263351' }}
      >
         <div className={`bg-[#080b12] w-3 h-3 rounded-full transition-transform shadow-sm ${isActive ? 'translate-x-4' : 'translate-x-0'}`}></div>
      </button>
    </div>
  );
};

export default TeamPanel;
