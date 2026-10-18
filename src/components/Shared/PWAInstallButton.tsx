import React, { useState } from 'react';
import { usePWAInstall } from '../../hooks/usePWAInstall';
import { Download, Monitor, CheckCircle, X, Sparkles } from 'lucide-react';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showGuide, setShowGuide] = useState(false);

  // If already running as an installed PWA, hide the button
  if (isInstalled) {
    return null;
  }

  const handleClick = async () => {
    if (isInstallable) {
      const outcome = await install();
      if (!outcome) {
        setShowGuide(true);
      }
    } else {
      setShowGuide(true);
    }
  };

  return (
    <>
      <button
        onClick={handleClick}
        className="flex items-center gap-1.5 rounded-lg bg-[#c6ff1f]/15 hover:bg-[#c6ff1f]/25 border border-[#c6ff1f]/30 text-[#c6ff1f] hover:text-white px-2.5 py-1.5 text-xs font-semibold transition-all shadow-sm cursor-pointer"
        title="Install Tacstem as a desktop or mobile application (PWA)"
      >
        <Download className="w-3.5 h-3.5 text-[#c6ff1f]" />
        <span>Install App</span>
      </button>

      {showGuide && (
        <div 
          className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
          onClick={() => setShowGuide(false)}
        >
          <div 
            className="w-full max-w-md rounded-2xl bg-[#141418] p-6 shadow-2xl border border-white/10 text-white"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#c6ff1f]/15 border border-[#c6ff1f]/30 flex items-center justify-center text-[#c6ff1f]">
                  <Monitor className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Install Tacstem Application</h3>
                  <p className="text-[11px] text-gray-400">Offline & Fast Local Video Editing</p>
                </div>
              </div>
              <button 
                onClick={() => setShowGuide(false)}
                className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-white/5 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {isIOS ? (
              <div className="space-y-3 text-xs text-gray-300">
                <p className="font-semibold text-white">To install on iPhone or iPad:</p>
                <div className="bg-[#1c1c22] p-3 rounded-xl border border-white/5 space-y-2">
                  <div className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-[#c6ff1f] text-black font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">1</span>
                    <span>Tap the <strong className="text-white">Share button</strong> (square with arrow) at the bottom of Safari.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-[#c6ff1f] text-black font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">2</span>
                    <span>Scroll down and tap <strong className="text-white">"Add to Home Screen"</strong>.</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-3 text-xs text-gray-300">
                <p className="text-xs text-gray-300 leading-relaxed">
                  Installing Tacstem gives you full desktop standalone mode, instant file loading, and offline access without needing a browser tab!
                </p>
                <div className="bg-[#1c1c22] p-3.5 rounded-xl border border-white/5 space-y-2.5">
                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-[#c6ff1f] text-black font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">1</span>
                    <div>
                      <strong className="text-white block">From Address Bar:</strong>
                      <span className="text-gray-400">Look for the install icon <strong className="text-[#c6ff1f]">(⊕ or desktop screen with arrow)</strong> on the right side of the address bar.</span>
                    </div>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-[#c6ff1f] text-black font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">2</span>
                    <div>
                      <strong className="text-white block">From Browser Menu:</strong>
                      <span className="text-gray-400">Click browser menu <strong className="text-white">(⋮ or ⋯)</strong> &rarr; Select <strong className="text-white">"Install Tacstem Video Editor"</strong> or <strong className="text-white">"Save and share" &rarr; "Install app"</strong>.</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="mt-5 pt-3 border-t border-white/10 flex items-center justify-end gap-2">
              <button
                onClick={() => setShowGuide(false)}
                className="w-full rounded-xl bg-[#c6ff1f] hover:bg-[#b0e817] py-2 text-xs font-bold text-black transition-colors"
              >
                Got It
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
