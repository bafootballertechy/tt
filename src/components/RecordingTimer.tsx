import React, { useState, useEffect } from 'react';

export const RecordingTimer = ({ startTime, label }: { startTime: number; label?: string }) => {
    const [elapsed, setElapsed] = useState(0);

    useEffect(() => {
        setElapsed(Math.max(0, Math.floor((Date.now() - startTime) / 1000)));
        const interval = setInterval(() => {
            setElapsed(Math.max(0, Math.floor((Date.now() - startTime) / 1000)));
        }, 500);
        return () => clearInterval(interval);
    }, [startTime]);

    const m = Math.floor(elapsed / 60).toString().padStart(2, '0');
    const s = (elapsed % 60).toString().padStart(2, '0');

    return (
        <div className="absolute top-2.5 right-2.5 sm:top-3 sm:right-3 z-[70] pointer-events-none">
            <div className="bg-black/75 backdrop-blur-md text-white px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-full shadow-lg border border-red-500/50 flex items-center gap-2 pointer-events-auto select-none transition-all">
                <span className="relative flex h-2 sm:h-2.5 w-2 sm:w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 sm:h-2.5 w-2 sm:w-2.5 bg-red-500"></span>
                </span>
                <span className="font-mono font-bold tracking-wider text-[11px] sm:text-xs text-red-100">
                    {label || 'SCREEN REC'} {m}:{s}
                </span>
            </div>
        </div>
    );
};
