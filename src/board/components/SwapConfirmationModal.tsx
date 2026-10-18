import React from 'react';
import { Project, TeamSide, Point } from '../types';

interface SwapConfirmationModalProps {
  pendingSwap: {
    type: 'roster' | 'board';
    playerAId?: string;
    playerBId?: string;
    side?: TeamSide;
    oldIndex?: number;
    newIndex?: number;
    originalPosA?: Point;
  } | null;
  project: Project;
  onConfirm: () => void;
  onCancel: () => void;
}

const SwapConfirmationModal: React.FC<SwapConfirmationModalProps> = ({ pendingSwap, project, onConfirm, onCancel }) => {
  if (!pendingSwap) return null;

  let swapPlayerA = null;
  let swapPlayerB = null;

  if (pendingSwap.type === 'board' && pendingSwap.playerAId && pendingSwap.playerBId) {
    const allPlayers = [
      ...project.teams[TeamSide.HOME].players,
      ...project.teams[TeamSide.AWAY].players,
      ...project.teams[TeamSide.NEUTRAL].players
    ];
    swapPlayerA = allPlayers.find(p => p.id === pendingSwap.playerAId) || null;
    swapPlayerB = allPlayers.find(p => p.id === pendingSwap.playerBId) || null;
  } else if (pendingSwap.type === 'roster' && pendingSwap.side && pendingSwap.oldIndex !== undefined && pendingSwap.newIndex !== undefined) {
    const teamPlayers = project.teams[pendingSwap.side].players;
    swapPlayerA = teamPlayers[pendingSwap.oldIndex] || null;
    swapPlayerB = teamPlayers[pendingSwap.newIndex] || null;
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 w-full max-w-sm shadow-2xl flex flex-col">
        <h2 className="text-lg font-bold text-white mb-2">Swap Players</h2>
        <p className="text-slate-400 mb-4 text-sm">
          Are you sure you want to swap these two players?
        </p>
        
        {swapPlayerA && swapPlayerB && (
          <div className="flex items-center justify-center gap-4 mb-6 bg-slate-950/50 p-4 rounded-lg border border-slate-800">
            <div className="flex flex-col items-center flex-1">
              <div className="w-10 h-10 rounded-full border-2 border-slate-700 bg-slate-800 flex items-center justify-center text-sm font-bold text-white mb-2 shadow-sm">
                {swapPlayerA.number}
              </div>
              <span className="text-xs text-slate-300 font-medium text-center w-full truncate" title={swapPlayerA.name}>{swapPlayerA.name}</span>
            </div>
            
            <div className="text-slate-500 flex items-center justify-center px-2">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m16 3 4 4-4 4"/>
                <path d="M20 7H4"/>
                <path d="m8 21-4-4 4-4"/>
                <path d="M4 17h16"/>
              </svg>
            </div>
            
            <div className="flex flex-col items-center flex-1">
              <div className="w-10 h-10 rounded-full border-2 border-slate-700 bg-slate-800 flex items-center justify-center text-sm font-bold text-white mb-2 shadow-sm">
                {swapPlayerB.number}
              </div>
              <span className="text-xs text-slate-300 font-medium text-center w-full truncate" title={swapPlayerB.name}>{swapPlayerB.name}</span>
            </div>
          </div>
        )}

        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium rounded-lg border border-slate-600 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            Confirm Swap
          </button>
        </div>
      </div>
    </div>
  );
};

export default SwapConfirmationModal;
