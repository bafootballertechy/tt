import React from 'react';

interface ExportProgressOverlayProps {
  isRecording: boolean;
  exportProgress: number;
  onCancel: () => void;
}

const ExportProgressOverlay: React.FC<ExportProgressOverlayProps> = ({ isRecording, exportProgress, onCancel }) => {
  if (!isRecording) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-700 rounded-xl p-8 w-full max-w-md shadow-2xl flex flex-col items-center text-center">
        <div className="w-16 h-16 mb-6 rounded-full border-4 border-slate-800 border-t-indigo-500 animate-spin"></div>
        <h2 className="text-xl font-bold text-white mb-2">Exporting Video</h2>
        <p className="text-slate-400 mb-8 text-sm">Please wait while we render your tactical presentation. This may take a moment depending on the length and quality.</p>
        
        <div className="w-full bg-slate-800 rounded-full h-3 mb-2 overflow-hidden shadow-inner">
          <div 
            className="bg-indigo-500 h-full rounded-full transition-all duration-200 ease-linear shadow-[0_0_10px_rgba(99,102,241,0.5)]"
            style={{ width: `${exportProgress}%` }}
          ></div>
        </div>
        <div className="w-full flex justify-between text-xs text-slate-500 font-medium mb-8">
          <span>0%</span>
          <span className="text-indigo-400">{Math.round(exportProgress)}%</span>
          <span>100%</span>
        </div>

        <button 
          onClick={onCancel}
          className="px-6 py-2 bg-slate-800 hover:bg-slate-700 text-white text-sm font-medium rounded-lg border border-slate-600 transition-colors w-full"
        >
          Cancel Export
        </button>
      </div>
    </div>
  );
};

export default ExportProgressOverlay;
