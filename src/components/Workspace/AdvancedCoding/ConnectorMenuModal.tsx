import React from 'react';
import { Link, X, ArrowLeftRight, Zap, StopCircle, AlertTriangle } from 'lucide-react';
import { AdvancedPadItem, Tag as TagData, Label, SmartConnector } from '../../../types';
import { getLuminance } from './utils';

interface ConnectorMenuModalProps {
  showConnectorMenu: { sourceId: string; targetId: string; x: number; y: number } | null;
  onClose: () => void;
  items: AdvancedPadItem[];
  tags: TagData[];
  labels: Label[];
  connectors: SmartConnector[];
  setConnectors: React.Dispatch<React.SetStateAction<SmartConnector[]>>;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const ConnectorMenuModal: React.FC<ConnectorMenuModalProps> = ({
  showConnectorMenu,
  onClose,
  items,
  tags,
  labels,
  connectors,
  setConnectors,
  showToast,
}) => {
  if (!showConnectorMenu) return null;

  const sourceItem = items.find(i => i.id === showConnectorMenu.sourceId);
  const targetItem = items.find(i => i.id === showConnectorMenu.targetId);
  const sourceTag = tags.find(t => t.id === showConnectorMenu.sourceId);
  const targetTag = tags.find(t => t.id === showConnectorMenu.targetId);
  const sourceLabel = labels.find(l => l.id === showConnectorMenu.sourceId);
  const targetLabel = labels.find(l => l.id === showConnectorMenu.targetId);
  
  const sourceName = sourceTag?.name || sourceLabel?.name || sourceItem?.content || 'Source Item';
  const targetName = targetTag?.name || targetLabel?.name || targetItem?.content || 'Target Item';
  const sourceColor = sourceTag?.color || '#333';
  const targetColor = targetTag?.color || '#333';

  const sourceIsBright = getLuminance(sourceColor) > 160;
  const targetIsBright = getLuminance(targetColor) > 160;

  // Type Aware Relationships
  const isTagToTag = sourceItem?.type === 'tag' && targetItem?.type === 'tag';
  const isTagToLabel = (sourceItem?.type === 'tag' && targetItem?.type === 'label') || (sourceItem?.type === 'label' && targetItem?.type === 'tag');
  const isLabelToLabel = sourceItem?.type === 'label' && targetItem?.type === 'label';

  return (
    <div 
      className="fixed inset-0 bg-black/70 backdrop-blur-xs z-[250] flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div 
        className="bg-[#161616] border border-[#333] rounded-2xl shadow-2xl w-full max-w-lg p-4 sm:p-5 flex flex-col max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#222]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400">
              <Link className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white tracking-wide">Connect Items</h3>
              <p className="text-[10px] text-gray-400">Choose automated interaction logic between these two elements</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-1 rounded-lg hover:bg-[#222] text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Connection Overview */}
        <div className="my-3 p-3 bg-[#0d0d0d] border border-[#222] rounded-xl flex items-center justify-between gap-2 shadow-inner">
          <div className="flex-1 text-center truncate py-1.5 px-2 rounded-lg font-bold text-xs shadow-sm" style={{ backgroundColor: sourceItem?.type === 'tag' ? sourceColor : '#1e1b4b', color: sourceItem?.type === 'tag' ? (sourceIsBright ? '#000' : '#fff') : '#c084fc', border: sourceItem?.type === 'label' ? '1px dashed #a855f7' : 'none' }}>
            {sourceName}
            <span className="block text-[8px] font-normal opacity-60 uppercase">{sourceItem?.type}</span>
          </div>
          <div className="shrink-0 px-2 flex items-center gap-1 text-[#c6ff1f]">
            <ArrowLeftRight className="w-4 h-4" />
          </div>
          <div className="flex-1 text-center truncate py-1.5 px-2 rounded-lg font-bold text-xs shadow-sm" style={{ backgroundColor: targetItem?.type === 'tag' ? targetColor : '#1e1b4b', color: targetItem?.type === 'tag' ? (targetIsBright ? '#000' : '#fff') : '#c084fc', border: targetItem?.type === 'label' ? '1px dashed #a855f7' : 'none' }}>
            {targetName}
            <span className="block text-[8px] font-normal opacity-60 uppercase">{targetItem?.type}</span>
          </div>
        </div>

        {/* Connector Choices */}
        <div className="space-y-2 mb-3">
          {isTagToTag && (
            <>
              <div className="p-2 bg-blue-500/5 border border-blue-500/20 rounded-lg text-[10px] text-blue-300 mb-2 leading-relaxed">
                💡 <strong>Tag to Tag Connection:</strong> These nodes represent events on the video timeline. You can configure mutual state switches or sequence triggers between them.
              </div>
              
              {/* 1. Exclusive */}
              <button 
                onClick={() => {
                  setConnectors([...connectors, { id: `conn-${Date.now()}`, sourceId: showConnectorMenu.sourceId, targetId: showConnectorMenu.targetId, type: 'exclusive', enabled: true }]);
                  onClose();
                  showToast(`Connected "${sourceName}" ↔ "${targetName}" (Exclusive)`, 'success');
                }}
                className="w-full text-left p-3 bg-[#111] hover:bg-[#222] border border-[#2a2a2a] hover:border-blue-500/50 rounded-xl transition-all group flex items-start gap-3"
              >
                <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center shrink-0 mt-0.5 group-hover:scale-110 transition-transform">
                  <ArrowLeftRight className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white group-hover:text-blue-400 transition-colors">Exclusive Swap (Two-Way)</span>
                    <span className="text-[9px] font-mono uppercase bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded font-bold">↔ Mutual</span>
                  </div>
                  <p className="text-[11px] text-gray-400 mt-0.5 leading-snug">
                    Starting one tag automatically stops & saves the other (e.g. In Possession ↔ Out of Possession). Great for mutually exclusive game phases.
                  </p>
                </div>
              </button>

              {/* 2. Trigger */}
              <button 
                onClick={() => {
                  setConnectors([...connectors, { id: `conn-${Date.now()}`, sourceId: showConnectorMenu.sourceId, targetId: showConnectorMenu.targetId, type: 'trigger', enabled: true }]);
                  onClose();
                  showToast(`Connected "${sourceName}" → "${targetName}" (Trigger)`, 'success');
                }}
                className="w-full text-left p-3 bg-[#111] hover:bg-[#222] border border-[#2a2a2a] hover:border-[#c6ff1f]/50 rounded-xl transition-all group flex items-start gap-3"
              >
                <div className="w-8 h-8 rounded-lg bg-[#c6ff1f]/10 text-[#c6ff1f] flex items-center justify-center shrink-0 mt-0.5 group-hover:scale-110 transition-transform">
                  <Zap className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white group-hover:text-[#c6ff1f] transition-colors">Trigger Sequence (One-Way)</span>
                    <span className="text-[9px] font-mono uppercase bg-[#c6ff1f]/20 text-[#c6ff1f] px-1.5 py-0.5 rounded font-bold">→ Start next</span>
                  </div>
                  <p className="text-[11px] text-gray-400 mt-0.5 leading-snug">
                    Stopping the first tag automatically triggers & starts the second tag (e.g. Shot → Rebound). Useful for quick sequential clips.
                  </p>
                </div>
              </button>

              {/* 3. Defuse */}
              <button 
                onClick={() => {
                  setConnectors([...connectors, { id: `conn-${Date.now()}`, sourceId: showConnectorMenu.sourceId, targetId: showConnectorMenu.targetId, type: 'defuse', enabled: true }]);
                  onClose();
                  showToast(`Connected "${sourceName}" ─⊣ "${targetName}" (Defuse)`, 'success');
                }}
                className="w-full text-left p-3 bg-[#111] hover:bg-[#222] border border-[#2a2a2a] hover:border-red-500/50 rounded-xl transition-all group flex items-start gap-3"
              >
                <div className="w-8 h-8 rounded-lg bg-red-500/10 text-red-400 flex items-center justify-center shrink-0 mt-0.5 group-hover:scale-110 transition-transform">
                  <StopCircle className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white group-hover:text-red-400 transition-colors">One-Way Defuse (Cutoff)</span>
                    <span className="text-[9px] font-mono uppercase bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded font-bold">─⊣ Stop first</span>
                  </div>
                  <p className="text-[11px] text-gray-400 mt-0.5 leading-snug">
                    Starting the second tag immediately defuses and stops the first tag. (e.g. Starting Turnover stops Possession).
                  </p>
                </div>
              </button>
            </>
          )}

          {isTagToLabel && (() => {
            const tagItem = sourceItem?.type === 'tag' ? sourceItem : targetItem;
            const labelItem = sourceItem?.type === 'label' ? sourceItem : targetItem;
            const tName = sourceItem?.type === 'tag' ? sourceName : targetName;
            const lName = sourceItem?.type === 'label' ? sourceName : targetName;

            return (
              <>
                <div className="p-2 bg-purple-500/5 border border-purple-500/20 rounded-lg text-[10px] text-purple-300 mb-2 leading-relaxed">
                  ⚡ <strong>Tag & Label Connection:</strong> Perfect for tagging descriptors instantly! This automates attaching qualifier properties to active timeline clips.
                </div>

                {/* 4. Assign */}
                <button 
                  onClick={() => {
                    // Always normalize: sourceId is Tag, targetId is Label
                    setConnectors([...connectors, { id: `conn-${Date.now()}`, sourceId: tagItem!.id, targetId: labelItem!.id, type: 'assign', enabled: true }]);
                    onClose();
                    showToast(`Connected "${tName}" ⇢ "${lName}" (Assign)`, 'success');
                  }}
                  className="w-full text-left p-3 bg-purple-950/20 hover:bg-purple-950/40 border border-purple-500/30 hover:border-purple-400 rounded-xl transition-all group flex items-start gap-3"
                >
                  <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center shrink-0 mt-0.5 group-hover:scale-110 transition-transform">
                    <Link className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white group-hover:text-purple-400 transition-colors">Assign (Instant Qualifier)</span>
                      <span className="text-[9px] font-mono uppercase bg-purple-500/20 text-purple-400 px-1.5 py-0.5 rounded font-bold">⇢ Auto Tag</span>
                    </div>
                    <p className="text-[11px] text-purple-300 mt-0.5 leading-snug">
                      Clicking the Label <strong>"{lName}"</strong> starts the Tag <strong>"{tName}"</strong> with this label pre-attached (no need to click tag button!). Clicking the Label a second time stops the event.
                    </p>
                  </div>
                </button>
              </>
            );
          })()}

          {isLabelToLabel && (
            <div className="p-4 bg-orange-500/5 border border-orange-500/20 rounded-xl text-center">
              <AlertTriangle className="w-8 h-8 text-orange-400 mx-auto mb-2 animate-bounce" />
              <h4 className="text-xs font-bold text-white mb-1">Direct Label Connections Blocked</h4>
              <p className="text-[11.5px] text-gray-400 leading-relaxed max-w-sm mx-auto">
                Labels are descriptive properties of timeline clips. They do not have active start/stop timestamps. Therefore, they should be connected directly to <strong>Tag Events</strong> to automate tagging qualifiers.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-[#222] flex justify-end">
          <button 
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-gray-400 hover:text-white bg-[#222] hover:bg-[#333] rounded-lg transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
