import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Clock, Play, X } from 'lucide-react';

interface LivePeriodConfirmModalProps {
  pendingPeriod: {
    id: string;
    name: string;
    isGoingBack?: boolean;
    fromName?: string;
  } | null;
  onConfirm: () => void;
  onCancel: () => void;
}

export const LivePeriodConfirmModal: React.FC<LivePeriodConfirmModalProps> = ({
  pendingPeriod,
  onConfirm,
  onCancel
}) => {
  return (
    <AnimatePresence>
      {pendingPeriod && (
        <div className="fixed inset-0 z-[400] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className="bg-[#16161a] border border-[#2d2d38] rounded-2xl p-6 sm:p-7 max-w-md w-full shadow-2xl relative overflow-hidden"
          >
            {/* Top Amber/Red Stripe */}
            <div className={`absolute top-0 left-0 right-0 h-1.5 ${
              pendingPeriod.isGoingBack
                ? 'bg-gradient-to-r from-red-500 via-amber-500 to-red-500'
                : 'bg-gradient-to-r from-amber-500 via-orange-400 to-amber-500'
            }`} />

            <div className="flex items-start gap-4">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border ${
                pendingPeriod.isGoingBack
                  ? 'bg-red-500/10 border-red-500/30 text-red-400'
                  : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
              }`}>
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-white mb-1.5">
                  {pendingPeriod.isGoingBack
                    ? `Warning: Switch back to ${pendingPeriod.name}?`
                    : `End ${pendingPeriod.fromName || '1st Half'} & Start ${pendingPeriod.name}?`}
                </h3>
                <p className="text-xs sm:text-sm text-gray-300 leading-relaxed">
                  {pendingPeriod.isGoingBack ? (
                    <>
                      You are currently in <span className="text-white font-semibold">{pendingPeriod.fromName || '2nd Half'}</span>. Switching back will set the active live match clock and all subsequent tags back to <span className="text-amber-300 font-semibold">{pendingPeriod.name}</span>.
                    </>
                  ) : (
                    <>
                      Are you sure you want to end <span className="text-white font-semibold">{pendingPeriod.fromName || '1st Half'}</span> and start <span className="text-[#c6ff1f] font-semibold">{pendingPeriod.name}</span>? The {pendingPeriod.name} timeline tab will be unlocked above the timeline, and kick-off will begin from 45:00.
                    </>
                  )}
                </p>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-[#262630] flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onCancel}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-300 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={onConfirm}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs shadow-lg active:scale-95 transition-all cursor-pointer ${
                  pendingPeriod.isGoingBack
                    ? 'bg-red-600 hover:bg-red-500 text-white shadow-red-500/20'
                    : 'bg-[#c6ff1f] hover:bg-[#b5eb1b] text-black shadow-[#c6ff1f]/20'
                }`}
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>
                  {pendingPeriod.isGoingBack ? `Switch to ${pendingPeriod.name}` : `Kick Off ${pendingPeriod.name}`}
                </span>
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
