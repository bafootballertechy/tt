import { useUIStore } from "../store/uiStore";
import React from 'react';
import { Project, TeamSide, ToolType } from '../types';
import TeamPanel from './TeamPanel';
import EquipmentPanel from './EquipmentPanel';

interface SidebarLeftProps {
  project: Project;
  currentSlide: any;
  onUpdateTeam: (side: TeamSide, updates: any) => void;
  onUpdateTeamSettings: (side: TeamSide, updates: any) => void;
  onUpdatePlayer: (side: TeamSide, playerId: string, updates: any) => void;
  onDeployPlayer: (side: TeamSide, playerId: string) => void;
  onApplyFormation: (side: TeamSide, formationName: string) => void;
  onReorderPlayers: (side: TeamSide, oldIndex: number, newIndex: number) => void;
  onAddPlayer: (side: TeamSide) => void;
}

const SidebarLeft: React.FC<SidebarLeftProps> = ({ project, currentSlide,
  onUpdateTeam, onUpdateTeamSettings, onUpdatePlayer, onDeployPlayer,
  onApplyFormation, onReorderPlayers, onAddPlayer
}) => {
  const { activeLeftTab, setActiveLeftTab, activeTool, setActiveTool, drawingColor, setDrawingColor, equipmentAngle, setEquipmentAngle, equipmentScale, setEquipmentScale } = useUIStore();
  return (
    <div className="flex z-10 border-r border-[#1c2438] bg-[#0e1422] shadow-[4px_0_24px_rgba(0,0,0,0.2)]">
      <div className="w-12 flex flex-col items-center py-4 gap-4 bg-[#080b12] border-r border-[#1c2438]">
         <button 
            onClick={() => setActiveLeftTab(TeamSide.HOME)}
            className={`w-8 h-8 rounded-[12px] text-[10px] font-bold flex items-center justify-center transition-all ${activeLeftTab === TeamSide.HOME ? 'text-white ring-2 ring-[#080b12] ring-offset-2 ring-offset-[#ef4444]' : 'bg-[#1a233a] text-slate-500 hover:bg-[#263351]'}`}
            style={{ backgroundColor: activeLeftTab === TeamSide.HOME ? project.teams[TeamSide.HOME].color : undefined }}
         >H</button>
         <button 
            onClick={() => setActiveLeftTab(TeamSide.AWAY)}
            className={`w-8 h-8 rounded-[12px] text-[10px] font-bold flex items-center justify-center transition-all ${activeLeftTab === TeamSide.AWAY ? 'text-white ring-2 ring-[#080b12] ring-offset-2 ring-offset-[#3b82f6]' : 'bg-[#1a233a] text-slate-500 hover:bg-[#263351]'}`}
            style={{ backgroundColor: activeLeftTab === TeamSide.AWAY ? project.teams[TeamSide.AWAY].color : undefined }}
         >A</button>
         <button 
            onClick={() => setActiveLeftTab(TeamSide.NEUTRAL)}
            className={`w-8 h-8 rounded-[12px] text-[10px] font-bold flex items-center justify-center transition-all ${activeLeftTab === TeamSide.NEUTRAL ? 'text-white ring-2 ring-[#080b12] ring-offset-2 ring-offset-[#6b7280]' : 'bg-[#1a233a] text-slate-500 hover:bg-[#263351]'}`}
            style={{ backgroundColor: activeLeftTab === TeamSide.NEUTRAL ? project.teams[TeamSide.NEUTRAL].color : undefined }}
         >N</button>
         <div className="w-5 h-px bg-[#1c2438] my-1"></div>
         <button 
            onClick={() => setActiveLeftTab('EQUIPMENT')}
            className={`w-8 h-8 rounded-[12px] flex items-center justify-center transition-all ${activeLeftTab === 'EQUIPMENT' ? 'bg-[#c0fa4a] text-[#080b12] shadow-[0_0_15px_rgba(192,250,74,0.3)]' : 'bg-[#1a233a] text-slate-500 hover:bg-[#263351]'}`}
            title="Equipment"
         >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3.5c.9 0 1.7.6 1.9 1.5L16.6 16H7.4L10.1 5c.2-.9 1-1.5 1.9-1.5z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10.5h6"/><rect x="4.5" y="16" width="15" height="3.4" rx="1.5"/></svg>
         </button>
      </div>
      {activeLeftTab === 'EQUIPMENT' ? (
         <EquipmentPanel
            activeTool={activeTool}
            setActiveTool={setActiveTool}
            color={drawingColor}
            setColor={setDrawingColor}
            angle={equipmentAngle}
            setAngle={setEquipmentAngle}
            scale={equipmentScale}
            setScale={setEquipmentScale}
         />
      ) : (
         <TeamPanel 
           side={activeLeftTab as TeamSide} 
           team={project.teams[activeLeftTab as TeamSide]} 
           teamSettings={currentSlide?.teamSettings?.[activeLeftTab as TeamSide]}
           activePlayerIds={new Set(Object.keys(currentSlide?.positions || {}))}
           isMultiSelect={project.selectedSlideIds && project.selectedSlideIds.length > 1}
           onUpdateTeam={onUpdateTeam}
           onUpdateTeamSettings={onUpdateTeamSettings}
           onUpdatePlayer={onUpdatePlayer}
           onDeployPlayer={onDeployPlayer}
           onApplyFormation={onApplyFormation}
           onReorderPlayers={onReorderPlayers}
           onAddPlayer={onAddPlayer}
         />
      )}
    </div>
  );
};

export default SidebarLeft;
