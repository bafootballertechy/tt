import React from 'react';
import { HelpCircle, X, Video, Link, ArrowLeftRight, Zap, StopCircle, Layers, Folder } from 'lucide-react';

interface GuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GuideModal: React.FC<GuideModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/70 backdrop-blur-xs z-[250] flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150" 
      onClick={onClose}
    >
      <div 
        className="bg-[#161616] border border-[#333] rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[85vh] overflow-hidden animate-in zoom-in-95 duration-150" 
        onClick={e => e.stopPropagation()}
      >
        <div className="p-4 border-b border-[#222] flex items-center justify-between bg-[#111]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#c6ff1f]/10 flex items-center justify-center text-[#c6ff1f]">
              <HelpCircle className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white tracking-wide uppercase">Coding Pad User Guide & Tool Info</h3>
              <p className="text-[10px] text-gray-400">How tools, connectors, and modes operate in TacStem</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-1 rounded-lg hover:bg-[#222] text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5 text-sm">
          {/* Operational Modes */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#c6ff1f] mb-2 flex items-center gap-1.5">
              <Video className="w-3.5 h-3.5" /> 1. Operational Modes
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3 bg-[#111] border border-[#222] rounded-xl">
                <div className="font-bold text-white text-xs mb-1 text-red-400">Tagging Mode (REC)</div>
                <p className="text-xs text-gray-400 leading-relaxed">
                  Active match coding. Clicking any tag on the pad records an event with timestamps, or toggles an ongoing recording. Hotkeys and smart connectors trigger automatically.
                </p>
              </div>
              <div className="p-3 bg-[#111] border border-[#222] rounded-xl">
                <div className="font-bold text-white text-xs mb-1 text-[#c6ff1f]">Layout Mode (DESIGN)</div>
                <p className="text-xs text-gray-400 leading-relaxed">
                  Canvas design mode. Click and drag elements to position them. Drag the bottom-right handle to resize. Double-click any element to edit colors, text, or hotkeys.
                </p>
              </div>
            </div>
          </div>

          {/* Smart Connectors */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#c6ff1f] mb-2 flex items-center gap-1.5">
              <Link className="w-3.5 h-3.5" /> 2. Smart Connectors Logic
            </h4>
            <div className="space-y-2">
              <div className="p-3 bg-[#111] border border-[#222] rounded-xl flex items-start gap-3">
                <div className="w-7 h-7 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center shrink-0 mt-0.5">
                  <ArrowLeftRight className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-bold text-white text-xs flex items-center gap-2">
                    <span>Exclusive</span> <span className="font-mono text-blue-400 text-[10px]">↔ Two-Way</span>
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">
                    Starting one tag automatically defuses & stops the other. Perfect for mutually exclusive states like <em>In Possession ↔ Out of Possession</em>.
                  </p>
                </div>
              </div>

              <div className="p-3 bg-[#111] border border-[#222] rounded-xl flex items-start gap-3">
                <div className="w-7 h-7 rounded-lg bg-[#c6ff1f]/10 text-[#c6ff1f] flex items-center justify-center shrink-0 mt-0.5">
                  <Zap className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-bold text-white text-xs flex items-center gap-2">
                    <span>Trigger</span> <span className="font-mono text-[#c6ff1f] text-[10px]">→ Sequential</span>
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">
                    Starting or stopping the first tag automatically triggers the start or stop of the second tag. Example: <em>Shot → Rebound</em>.
                  </p>
                </div>
              </div>

              <div className="p-3 bg-[#111] border border-[#222] rounded-xl flex items-start gap-3">
                <div className="w-7 h-7 rounded-lg bg-red-500/10 text-red-400 flex items-center justify-center shrink-0 mt-0.5">
                  <StopCircle className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-bold text-white text-xs flex items-center gap-2">
                    <span>Defuse</span> <span className="font-mono text-red-400 text-[10px]">─⊣ Cutoff</span>
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">
                    Starting the second tag immediately stops the first tag (one-way). Starting the first tag does not affect the second.
                  </p>
                </div>
              </div>

              <div className="p-3 bg-[#111] border border-[#222] rounded-xl flex items-start gap-3">
                <div className="w-7 h-7 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center shrink-0 mt-0.5">
                  <Link className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-bold text-white text-xs flex items-center gap-2">
                    <span>Assign</span> <span className="font-mono text-purple-400 text-[10px]">⇢ Label Attachment</span>
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">
                    Clicking the target item triggers the source tag and attaches the target as an active qualifier label modifier.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Normal Coding & Group Label Sync */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#c6ff1f] mb-2 flex items-center gap-1.5">
              <Folder className="w-3.5 h-3.5" /> 4. Group Labels & Normal Coding Sync
            </h4>
            <div className="p-3 bg-[#111] border border-[#222] rounded-xl space-y-2">
              <div className="font-bold text-white text-xs flex items-center justify-between">
                <span>Seamless Bi-Directional Sync</span>
                <span className="text-[9px] font-mono text-[#c6ff1f] bg-[#c6ff1f]/10 px-1.5 py-0.5 rounded font-bold">Live Synced</span>
              </div>
              <p className="text-xs text-gray-400 leading-relaxed">
                Labels configured in Normal Coding groups (such as Outcome, Player, Zone) automatically display their group badge on the coding pad. You can click <strong>+ Group / Label</strong> to place entire groups onto the pad at once. Any name changes or group reassignments done on the pad immediately update Normal Coding, and clicking labels during Tagging mode attaches them to active recordings in real-time.
              </p>
            </div>
          </div>

          {/* Tool Reference */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#c6ff1f] mb-2 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5" /> 3. Canvas Elements & Tools
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div className="p-2.5 bg-[#111] border border-[#222] rounded-xl">
                <span className="text-xs font-bold text-white block mb-1">Tags</span>
                <span className="text-[11px] text-gray-400">Events with hotkeys, colors, and quick lead/lag recording buffers.</span>
              </div>
              <div className="p-2.5 bg-[#111] border border-[#222] rounded-xl">
                <span className="text-xs font-bold text-white block mb-1">Labels</span>
                <span className="text-[11px] text-gray-400">Qualifiers to attach to active tag recordings (e.g. Left Foot, Good).</span>
              </div>
              <div className="p-2.5 bg-[#111] border border-[#222] rounded-xl">
                <span className="text-xs font-bold text-white block mb-1">Text Notes</span>
                <span className="text-[11px] text-gray-400">Pinboard style annotation banners for organizing functional groups.</span>
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-[#222] bg-[#111] flex justify-end">
          <button 
            onClick={onClose} 
            className="px-4 py-2 bg-[#c6ff1f] hover:bg-[#b3e61c] text-black text-xs font-bold rounded-lg transition-colors shadow-sm"
          >
            Got It
          </button>
        </div>
      </div>
    </div>
  );
};
