import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, X, ChevronUp, ChevronDown, ExternalLink, Info, ShieldAlert, Monitor } from 'lucide-react';

export function isNonChromiumBrowser(): { isNonChromium: boolean; browserName: string } {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return { isNonChromium: false, browserName: '' };
  }

  const ua = navigator.userAgent || '';
  const vendor = navigator.vendor || '';

  // Check if browser is Brave
  const isBrave = typeof (navigator as any).brave?.isBrave === 'function';
  
  // Check for Edge, Chrome, Opera, or other Chromium browsers
  const isEdge = /Edg|Edge/i.test(ua);
  const isOpera = /OPR|Opera/i.test(ua);
  const isChrome = (/Chrome|CriOS/i.test(ua) && !isEdge && !isOpera) || !!(window as any).chrome;
  const isChromium = isChrome || isEdge || isOpera || isBrave || /Chromium/i.test(ua);

  if (isChromium) {
    return { isNonChromium: false, browserName: '' };
  }

  // Detect specific non-Chromium browser
  if (/Firefox|FxiOS/i.test(ua)) {
    return { isNonChromium: true, browserName: 'Mozilla Firefox' };
  }
  if (/Safari/i.test(ua) && /Apple/i.test(vendor)) {
    return { isNonChromium: true, browserName: 'Apple Safari' };
  }

  return { isNonChromium: true, browserName: 'this browser' };
}

export const BrowserRecommendationBanner: React.FC = () => {
  const [detection, setDetection] = useState<{ isNonChromium: boolean; browserName: string } | null>(null);
  const [isCompact, setIsCompact] = useState<boolean>(true);
  const [isDismissedForSession, setIsDismissedForSession] = useState<boolean>(false);

  useEffect(() => {
    const result = isNonChromiumBrowser();
    setDetection(result);

    if (!result.isNonChromium) return;

    // Check visit count to determine full banner (1st time) vs very small pill (2nd time onwards)
    try {
      const rawCount = localStorage.getItem('tacstem_browser_prompt_visits');
      const count = rawCount ? parseInt(rawCount, 10) : 0;

      if (count === 0) {
        // First visit: Show friendly full toast banner
        setIsCompact(false);
      } else {
        // 2nd time onwards: Always show, but very small compact pill
        setIsCompact(true);
      }

      // Record this visit
      localStorage.setItem('tacstem_browser_prompt_visits', (count + 1).toString());
    } catch {
      setIsCompact(true);
    }
  }, []);

  if (!detection || !detection.isNonChromium || isDismissedForSession) {
    return null;
  }

  return (
    <aside aria-label="Browser recommendation" className="fixed bottom-4 right-4 z-[9999] max-w-sm pointer-events-auto select-none font-sans">
      <AnimatePresence mode="wait">
        {isCompact ? (
          // --- 2nd time onwards: Very small, sleek compact pill ---
          <motion.div
            key="compact-pill"
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="group flex items-center gap-1.5 bg-[#141416]/90 hover:bg-[#1c1c20] text-gray-300 hover:text-white px-2.5 py-1.5 rounded-full border border-white/10 hover:border-[#c6ff1f]/40 backdrop-blur-md shadow-lg shadow-black/40 transition-all cursor-pointer text-xs"
            onClick={() => setIsCompact(false)}
            title="Click for browser performance recommendation"
          >
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#c6ff1f] opacity-60"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#c6ff1f]"></span>
            </span>

            <span className="text-[11px] font-medium tracking-tight flex items-center gap-1">
              <Zap className="w-3 h-3 text-[#c6ff1f] fill-[#c6ff1f]/20" />
              <span>Chrome / Edge recommended</span>
            </span>

            <ChevronUp className="w-3 h-3 text-gray-400 group-hover:text-white transition-transform" />
          </motion.div>
        ) : (
          // --- 1st time or Expanded View: Friendly explanation banner ---
          <motion.div
            key="expanded-banner"
            initial={{ opacity: 0, y: 15, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 350, damping: 25 }}
            className="w-80 sm:w-96 rounded-xl bg-[#141418]/95 border border-white/15 p-3.5 backdrop-blur-xl shadow-2xl shadow-black/60 text-white"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-[#c6ff1f]/10 border border-[#c6ff1f]/30 text-[#c6ff1f]">
                  <Zap className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-white tracking-wide">
                    Better with Chrome / Edge
                  </h4>
                  <p className="text-[10px] text-gray-400">
                    {detection.browserName ? `You're using ${detection.browserName}` : 'Optimized for Chromium'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => setIsCompact(true)}
                  className="p-1 text-gray-400 hover:text-white rounded hover:bg-white/10 transition-colors text-[10px]"
                  title="Minimize to small icon"
                >
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <p className="mt-2 text-[11px] leading-relaxed text-gray-300">
              For ultra-fast video rendering, full WebCodecs hardware acceleration, and seamless timeline scrubbing, we suggest using <strong className="text-white font-medium">Google Chrome</strong> or <strong className="text-white font-medium">Microsoft Edge</strong>.
            </p>

            <div className="mt-3 flex items-center justify-between pt-2 border-t border-white/10">
              <div className="flex items-center gap-2">
                <a
                  href="https://www.google.com/chrome/"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] text-[#c6ff1f] hover:underline font-medium"
                >
                  Get Chrome <ExternalLink className="w-2.5 h-2.5" />
                </a>
                <span className="text-gray-600 text-xs">•</span>
                <a
                  href="https://www.microsoft.com/edge"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] text-gray-300 hover:text-white hover:underline"
                >
                  Get Edge <ExternalLink className="w-2.5 h-2.5" />
                </a>
              </div>

              <button
                onClick={() => setIsCompact(true)}
                className="px-2.5 py-1 text-[11px] font-medium bg-[#c6ff1f] hover:bg-[#a8dc13] text-black rounded-md transition-colors"
              >
                Got it
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </aside>
  );
};
