import { Logo, Wordmark } from '../Logo';
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, X, HelpCircle, Film, Tags, Pen, ListPlus, Keyboard } from 'lucide-react';

export class ErrorBoundary extends React.Component<{ children: React.ReactNode, onReset: () => void }, { hasError: boolean, error: any }> {
    constructor(props: any) {
        super(props);
        this.state = { hasError: false, error: null };
    }
    static getDerivedStateFromError(error: any) { return { hasError: true, error }; }
    componentDidCatch(error: any, errorInfo: any) { console.error("Workspace Error:", error, errorInfo); }
    render() {
        if (this.state.hasError) {
            return (
                <div className="w-screen h-screen bg-[#0a0a0a] text-white flex flex-col items-center justify-center p-8 text-center">
                    <AlertTriangle className="w-16 h-16 text-red-500 mb-4" />
                    <h2 className="text-2xl font-bold mb-2">Something went wrong</h2>
                    <p className="text-gray-400 max-w-md mb-8">The workspace encountered a critical error. Your projects are safe.</p>
                    <div className="bg-[#111] p-2 rounded text-left text-red-400 font-mono text-sm mb-8 max-w-2xl overflow-auto max-h-40 border border-[#333]">
                        {this.state.error?.toString()}
                    </div>
                    <button onClick={() => { this.setState({ hasError: false }); this.props.onReset(); }} className="px-6 py-2 bg-[#c6ff1f] hover:bg-[#c6ff1f] text-black rounded-lg font-medium">Return to Projects</button>
                </div>
            );
        }
        return this.props.children;
    }
}
export const StorageWarning = () => {
    const [isFull, setIsFull] = useState(false);
    useEffect(() => {
        if (typeof window === 'undefined') return;
        const handleFull = () => setIsFull(true);
        const handleSuccess = () => setIsFull(false);
        window.addEventListener('storage-full', handleFull);
        window.addEventListener('storage-success', handleSuccess);
        return () => {
            window.removeEventListener('storage-full', handleFull);
            window.removeEventListener('storage-success', handleSuccess);
        };
    }, []);
    if (!isFull) return null;
    return (
        <div className="fixed inset-0 z-[9999] bg-black/80 flex items-center justify-center backdrop-blur-sm">
            <div className="bg-red-900 border border-red-500 p-8 rounded-2xl max-w-md text-center shadow-2xl">
                <AlertTriangle className="w-16 h-16 text-red-400 mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-white mb-2">Storage Full</h2>
                <p className="text-red-200">New changes are not being saved. Please delete old projects to free up space.</p>
            </div>
        </div>
    );
};
export const LoadingProjectOverlay = ({ isLoading, onCancel }: { isLoading: boolean, onCancel?: () => void }) => {
    const [tipIndex, setTipIndex] = useState(0);
    const [elapsed, setElapsed] = useState(0);

    const tips = [
        "Restoring high-resolution video frames...",
        "Tip: Use spacebar to play or pause at any time.",
        "Tip: Use draw tools to annotate tactical freeze frames.",
        "Connecting cached media stream...",
        "Tip: Export tagged events and timelines to CSV.",
        "Preparing frame-accurate playback sequence..."
    ];

    useEffect(() => {
        if (!isLoading) {
            setElapsed(0);
            return;
        }
        const interval = setInterval(() => {
            setTipIndex(prev => (prev + 1) % tips.length);
        }, 2500);
        const timer = setInterval(() => {
            setElapsed(prev => prev + 1);
        }, 1000);
        return () => {
            clearInterval(interval);
            clearInterval(timer);
        };
    }, [isLoading]);

    if (!isLoading) return null;

    return (
        <div className="fixed inset-0 z-[1000] bg-black/85 backdrop-blur-md flex items-center justify-center p-4 text-center transition-all duration-300">
            <div className="bg-[#121215] p-6 sm:p-7 rounded-2xl border border-[#27272c] shadow-2xl max-w-sm sm:max-w-md w-full relative overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                {/* Top Accent line */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#e4ff7a] via-[#c6ff1f] to-[#a0d600]" />

                <div className="relative w-14 h-14 mx-auto mb-4 flex items-center justify-center">
                    <div className="absolute inset-0 rounded-full border-2 border-[#c6ff1f]/20 animate-ping" />
                    <div className="w-12 h-12 border-3 border-[#2b2b32] border-t-[#c6ff1f] rounded-full animate-spin" />
                    <Film className="w-5 h-5 text-[#c6ff1f] absolute" />
                </div>

                <h2 className="text-lg font-bold text-white mb-1 tracking-tight">
                    Loading Video Workspace
                </h2>
                <p className="text-xs text-gray-400 mb-4">
                    Restoring video stream & timeline tags ({elapsed}s)
                </p>
                
                {/* Shimmer Bar */}
                <div className="w-full h-1 bg-[#222228] rounded-full overflow-hidden mb-4 relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#c6ff1f] to-transparent w-full animate-pulse" />
                </div>

                <div className="bg-[#18181d] border border-white/5 py-2.5 px-4 rounded-xl min-h-[3rem] flex items-center justify-center">
                    <p className="text-xs text-[#c6ff1f] transition-opacity duration-300" key={tipIndex}>
                        {tips[tipIndex]}
                    </p>
                </div>

                {elapsed >= 8 && onCancel && (
                    <button
                        type="button"
                        onClick={onCancel}
                        className="mt-4 text-xs text-gray-400 hover:text-white transition-colors"
                    >
                        Taking too long? <span className="text-[#c6ff1f] underline">Cancel and return</span>
                    </button>
                )}
            </div>
        </div>
    );
};
export const TutorialOverlay = ({ onClose }: { onClose: () => void }) => {
    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[200] flex items-center justify-center p-2">
            <motion.div 
                initial={{ opacity: 0, scale: 0.95 }} 
                animate={{ opacity: 1, scale: 1 }} 
                className="bg-[#111] border border-[#333] rounded-2xl p-8 max-w-2xl w-full text-left shadow-2xl relative"
            >
                <button onClick={onClose} className="absolute top-2 right-4 text-gray-500 hover:text-white transition-colors">
                    <X className="w-6 h-6" />
                </button>
                <div className="flex items-center gap-2 mb-3">
                    <div className="w-12 h-12 bg-[#c6ff1f]/20 rounded-xl flex items-center justify-center border border-[#c6ff1f]/30">
                        <HelpCircle className="w-6 h-6 text-[#c6ff1f]" />
                    </div>
                    <div>
                        <div className="flex items-center gap-1"><h2 className="text-2xl font-bold text-white">Welcome to</h2><Logo className="w-8 h-8 ml-2" /><Wordmark className="scale-75 origin-left" /></div>
                        <p className="text-gray-400 text-sm">Your professional video analysis workspace.</p>
                    </div>
                </div>
                
                <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                        <div className="bg-[#161616] p-2 rounded-xl border border-[#222]">
                            <div className="flex items-center gap-2 mb-2 text-[#c6ff1f]">
                                <Film className="w-4 h-4" />
                                <h3 className="font-bold">1. Create Projects</h3>
                            </div>
                            <p className="text-sm text-gray-400">Upload any video to start a new project. You can link a local video folder so you don't have to repeatedly re-upload the same files.</p>
                        </div>
                        <div className="bg-[#161616] p-2 rounded-xl border border-[#222]">
                            <div className="flex items-center gap-2 mb-2 text-[#c6ff1f]">
                                <Tags className="w-4 h-4" />
                                <h3 className="font-bold">2. Tag Events</h3>
                            </div>
                            <p className="text-sm text-gray-400">Press numbers (1-9) to quickly tag events while the video is playing. Setup custom tags in the right panel.</p>
                        </div>
                        <div className="bg-[#161616] p-2 rounded-xl border border-[#222]">
                            <div className="flex items-center gap-2 mb-2 text-green-400">
                                <Pen className="w-4 h-4" />
                                <h3 className="font-bold">3. Draw Telestrations</h3>
                            </div>
                            <p className="text-sm text-gray-400">Pause the video to draw shapes, arrows, or text over the frame. These freeze-frames will be saved automatically.</p>
                        </div>
                        <div className="bg-[#161616] p-2 rounded-xl border border-[#222]">
                            <div className="flex items-center gap-2 mb-2 text-yellow-400">
                                <ListPlus className="w-4 h-4" />
                                <h3 className="font-bold">4. Build Playlists</h3>
                            </div>
                            <p className="text-sm text-gray-400">Drag and drop your tagged events into custom playlists for review sessions or highlight reels.</p>
                        </div>
                    </div>
                    
                    <div className="bg-[#1a1a1a] p-2 rounded-xl border border-[#333]">
                        <h3 className="font-bold text-gray-300 mb-3 text-sm flex items-center gap-2">
                            <Keyboard className="w-4 h-4" /> Essential Shortcuts
                        </h3>
                        <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
                            <div className="flex justify-between"><span className="text-gray-500">Play / Pause</span><kbd className="bg-[#222] px-2 py-0.5 rounded text-gray-300 font-mono text-xs">Space</kbd></div>
                            <div className="flex justify-between"><span className="text-gray-500">Step Forward</span><kbd className="bg-[#222] px-2 py-0.5 rounded text-gray-300 font-mono text-xs">→</kbd></div>
                            <div className="flex justify-between"><span className="text-gray-500">Step Back</span><kbd className="bg-[#222] px-2 py-0.5 rounded text-gray-300 font-mono text-xs">←</kbd></div>
                            <div className="flex justify-between"><span className="text-gray-500">Quick Tagging</span><kbd className="bg-[#222] px-2 py-0.5 rounded text-gray-300 font-mono text-xs">1 - 9</kbd></div>
                        </div>
                    </div>
                </div>
                
                <div className="mt-8 flex justify-end">
                    <button onClick={onClose} className="px-6 py-2.5 bg-[#c6ff1f] hover:bg-[#c6ff1f] text-black rounded-lg font-medium transition-colors">
                        Got it, let's start!
                    </button>
                </div>
            </motion.div>
        </div>
    );
};
export const ConfirmOverlay = ({ title = "Are you sure?", message, onConfirm, onCancel }: { title?: string, message: string, onConfirm: () => void, onCancel: () => void }) => {
    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[200] flex items-center justify-center p-2">
            <motion.div 
                initial={{ opacity: 0, scale: 0.95 }} 
                animate={{ opacity: 1, scale: 1 }} 
                className="bg-[#111] border border-[#333] rounded-xl p-4 max-w-sm w-full text-left shadow-2xl relative"
            >
                <h3 className="text-lg font-bold text-white mb-2">{title}</h3>
                <p className="text-gray-400 text-sm mb-3">{message}</p>
                <div className="flex justify-end gap-3">
                    <button onClick={onCancel} className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors">Cancel</button>
                    <button onClick={onConfirm} className="px-4 py-2 text-sm bg-red-600 hover:bg-red-500 text-white rounded transition-colors">Confirm</button>
                </div>
            </motion.div>
        </div>
    );
};
