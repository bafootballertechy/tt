import React from 'react';
import { ArrowLeft } from 'lucide-react';

interface HeaderProps {
  projectName: string;
  onUpdateProjectName: (name: string) => void;
  saveError: string | null;
  historyIndex: number;
  historyLength: number;
  exportFormat: string;
  setExportFormat: (val: any) => void;
  exportQuality: number;
  setExportQuality: (val: number) => void;
  exportFps: number;
  setExportFps: (val: number) => void;
  isRecording: boolean;
  onStartNew: () => void;
  onExportJSON: () => void;
  onImportJSON: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onExportImage: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onFullscreen: () => void;
  onStartRecording: () => void;
  onStopRecording: () => void;
  showPanels?: boolean;
  onTogglePanels?: () => void;
  onBackToHome?: () => void;
}

const Header: React.FC<HeaderProps> = ({
  projectName, onUpdateProjectName,
  saveError, historyIndex, historyLength,
  exportFormat, setExportFormat, exportQuality, setExportQuality, exportFps, setExportFps, isRecording,
  onStartNew, onExportJSON, onImportJSON, onExportImage,
  onUndo, onRedo, onFullscreen, onStartRecording, onStopRecording,
  showPanels = true, onTogglePanels,
  onBackToHome
}) => {
  return (
    <header className="h-12 bg-[#080b12] border-b border-[#1c2438] flex items-center justify-between px-3 sm:px-4 z-30 shadow-md">
      <div className="flex items-center gap-2 sm:gap-3">
        {onBackToHome && (
          <button
            onClick={onBackToHome}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-white/80 hover:text-white text-xs border border-white/10 transition-colors mr-1 cursor-pointer font-medium"
            title="Return to Board Projects listing"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Board Projects</span>
          </button>
        )}

        <div className="w-7 h-7 bg-[#c0fa4a] rounded flex items-center justify-center font-black text-sm text-[#080b12] shadow-[0_0_15px_rgba(192,250,74,0.2)]">T</div>
        <div className="flex items-baseline gap-2 pr-3 border-r border-[#1c2438]">
          <h1 className="text-sm sm:text-base font-bold tracking-tight text-white hidden sm:block">Tacstem Pad</h1>
          <span className="bg-[#c0fa4a]/20 text-[#c0fa4a] border border-[#c0fa4a]/30 text-[9px] px-1 py-0.5 rounded-full font-bold tracking-wider">v2.0</span>
        </div>

        <input 
          type="text" 
          value={projectName} 
          onChange={(e) => onUpdateProjectName(e.target.value)} 
          placeholder="Untitled Project"
          className="bg-transparent border border-transparent text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-[#c0fa4a] focus:bg-[#1a233a] hover:bg-[#1a233a] rounded px-2 py-1 min-w-[120px] w-36 sm:w-48 transition-colors"
        />
      </div>
      <div className="flex items-center gap-4">
           <div className="flex items-center gap-2 mr-2">
             {saveError && (
               <div className="text-red-500 text-[10px] font-bold px-2 py-1 bg-red-500/10 border border-red-500/30 rounded flex items-center gap-1" title={saveError}>
                 <span className="truncate max-w-[200px]">{saveError}</span>
               </div>
             )}
             <button 
               onClick={onStartNew}
               className="px-2 py-1 bg-red-500/10 text-red-500 text-[10px] font-bold rounded border border-red-500/30 hover:bg-red-500/20 transition-colors"
               title="New Project (Warning: Clears everything)"
             >
               New Project
             </button>
             <button 
               onClick={onExportJSON}
               className="px-2 py-1 bg-[#1a233a] text-slate-300 text-[10px] font-bold rounded border border-[#263351] hover:bg-[#263351] transition-colors"
             >
               Export JSON
             </button>
             <label className="px-2 py-1 bg-[#1a233a] text-slate-300 text-[10px] font-bold rounded border border-[#263351] hover:bg-[#263351] cursor-pointer transition-colors">
               Import JSON
               <input type="file" accept=".json" className="hidden" onChange={onImportJSON} />
             </label>
           </div>

           <button
              onClick={onExportImage}
              className="flex items-center justify-center w-8 h-8 rounded-md transition-all bg-[#c0fa4a] hover:bg-[#aee638] text-[#080b12] shadow-[0_0_15px_rgba(192,250,74,0.2)]"
              title="Export Image (PNG)"
           >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
           </button>

           <div className="flex items-center gap-1 bg-[#1a233a] rounded-lg p-1 border border-[#263351]">
              <button 
                onClick={onUndo} 
                disabled={historyIndex === 0}
                className="p-1.5 hover:bg-[#263351] rounded-md text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                title="Undo"
              >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" /></svg>
              </button>
              <button 
                onClick={onRedo} 
                disabled={historyIndex === historyLength - 1}
                className="p-1.5 hover:bg-[#263351] rounded-md text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                title="Redo"
              >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 10h-10a8 8 0 00-8 8v2M21 10l-6 6m6-6l-6-6" /></svg>
              </button>
           </div>

           <div className="flex items-center gap-2">
             <div className="flex items-center bg-[#1a233a] rounded-lg border border-[#263351] p-0.5 h-8">
               <select 
                 className="bg-transparent text-[10px] font-bold outline-none text-slate-300 px-2 cursor-pointer border-none focus:ring-0 appearance-none"
                 value={exportFormat}
                 onChange={(e) => setExportFormat(e.target.value)}
                 disabled={isRecording}
               >
                 <option value="auto">Auto</option>
                 <option value="mp4">MP4</option>
                 <option value="webm">WebM</option>
               </select>
               <svg className="w-3 h-3 text-slate-500 mr-1 -ml-1 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" /></svg>
               
               <div className="w-px h-3 bg-[#263351] mx-0.5"></div>
               
               <select 
                 className="bg-transparent text-[10px] font-bold outline-none text-slate-300 px-2 cursor-pointer border-none focus:ring-0 appearance-none"
                 value={exportQuality}
                 onChange={(e) => setExportQuality(parseFloat(e.target.value))}
                 disabled={isRecording}
               >
                 <option value={1}>720p</option>
                 <option value={1.5}>1080p</option>
                 <option value={3}>4K</option>
               </select>
               <svg className="w-3 h-3 text-slate-500 mr-1 -ml-1 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" /></svg>

               <div className="w-px h-3 bg-[#263351] mx-0.5"></div>

               <select 
                 className="bg-transparent text-[10px] font-bold outline-none text-slate-300 px-2 cursor-pointer border-none focus:ring-0 appearance-none"
                 value={exportFps}
                 onChange={(e) => setExportFps(parseInt(e.target.value))}
                 disabled={isRecording}
               >
                 <option value={30}>30 fps</option>
                 <option value={60}>60 fps</option>
               </select>
               <svg className="w-3 h-3 text-slate-500 mr-1 -ml-1 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" /></svg>
             </div>
             <button
               onClick={onFullscreen}
               className="px-3 h-8 text-[10px] font-bold rounded-lg transition-all bg-[#1a233a] hover:bg-[#263351] text-slate-300 border border-[#263351] flex items-center gap-1.5 shadow-lg"
               title="Enter Full Screen"
             >
               <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" /></svg>
               Full Screen
             </button>
             <button 
               onClick={isRecording ? onStopRecording : onStartRecording}
               className={`px-4 h-8 text-[10px] font-bold rounded-lg transition-all flex items-center gap-1.5 shadow-lg ${
                  isRecording 
                    ? 'bg-red-500 hover:bg-red-600 text-white animate-pulse shadow-[0_0_15px_rgba(239,68,68,0.4)]' 
                    : 'bg-[#c0fa4a] hover:bg-[#aee638] text-[#080b12] shadow-[0_0_15px_rgba(192,250,74,0.2)]'
               }`}
            >
              {isRecording ? (
                  <>
                     <div className="w-1.5 h-1.5 rounded-full bg-white animate-ping"></div> Stop
                  </>
              ) : (
                  <>
                     <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                     Export
                  </>
              )}
            </button>
           </div>
      </div>
    </header>
  );
};

export default Header;
