import React from 'react';
import { Settings2, X, Trash2 } from 'lucide-react';
import { SmartConnector, AdvancedPadItem, Tag as TagData, Label } from '../../../types';

interface ConnectorsManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  connectors: SmartConnector[];
  setConnectors: React.Dispatch<React.SetStateAction<SmartConnector[]>>;
  items: AdvancedPadItem[];
  tags: TagData[];
  labels: Label[];
  showConnectorsOnPad: boolean;
  setShowConnectorsOnPad: (show: boolean) => void;
}

export const ConnectorsManagerModal: React.FC<ConnectorsManagerModalProps> = ({
  isOpen,
  onClose,
  connectors,
  setConnectors,
  items,
  tags,
  labels,
  showConnectorsOnPad,
  setShowConnectorsOnPad,
}) => {
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4" 
      onClick={onClose}
    >
      <div 
        className="bg-[#161616] border border-[#333] rounded-xl w-full max-w-2xl p-6 shadow-2xl flex flex-col max-h-[80vh]" 
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4 shrink-0">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Settings2 className="w-4 h-4 text-[#c6ff1f]" /> Manage Connectors
          </h3>
          <button 
            onClick={onClose} 
            className="text-gray-500 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        
        <div className="mb-4 flex items-center justify-between border-b border-[#222] pb-4">
          <div className="text-sm text-gray-300">
            Show connector lines on the pad while coding
          </div>
          <button 
            onClick={() => setShowConnectorsOnPad(!showConnectorsOnPad)}
            className={`w-12 h-6 rounded-full p-1 transition-colors ${showConnectorsOnPad ? 'bg-[#c6ff1f]' : 'bg-[#333]'}`}
          >
            <div className={`w-4 h-4 rounded-full bg-white transition-transform ${showConnectorsOnPad ? 'translate-x-6' : 'translate-x-0'}`} />
          </button>
        </div>

        <div className="flex-1 overflow-auto min-h-0 space-y-2">
          {connectors.length === 0 ? (
            <div className="text-center py-8 text-gray-500 text-sm">
              No connectors defined. Enter Connector Mode to create them.
            </div>
          ) : (
            connectors.map(conn => {
              const source = items.find(i => i.id === conn.sourceId);
              const target = items.find(i => i.id === conn.targetId);
              if (!source || !target) return null;
              
              const sourceName = source.content || (source.type === 'tag' ? tags.find(t => t.id === source.id)?.name : labels.find(l => l.id === source.id)?.name) || 'Unknown';
              const targetName = target.content || (target.type === 'tag' ? tags.find(t => t.id === target.id)?.name : labels.find(l => l.id === target.id)?.name) || 'Unknown';

              let relationSymbol = '→';
              if (conn.type === 'exclusive') relationSymbol = '↔';
              if (conn.type === 'defuse') relationSymbol = '─⊣';

              return (
                <div key={conn.id} className="flex items-center justify-between p-3 bg-[#111] border border-[#222] rounded-lg group transition-colors">
                  <div className="flex items-center gap-4">
                    <div className={`px-2 py-1 rounded text-xs font-bold uppercase ${conn.enabled ? 'bg-[#c6ff1f]/10 text-[#c6ff1f]' : 'bg-gray-800 text-gray-500'}`}>
                      {conn.type}
                    </div>
                    <div className="text-sm font-medium text-white flex items-center gap-2">
                      <span className="text-gray-300">{sourceName}</span>
                      <span className="text-gray-500">{relationSymbol}</span>
                      <span className="text-gray-300">{targetName}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => setConnectors(connectors.map(c => c.id === conn.id ? {...c, enabled: !c.enabled} : c))}
                      className={`px-3 py-1 text-xs rounded border transition-colors ${conn.enabled ? 'border-yellow-500/50 text-yellow-500 hover:bg-yellow-500/10' : 'border-green-500/50 text-green-500 hover:bg-green-500/10'}`}
                    >
                      {conn.enabled ? 'Disable' : 'Enable'}
                    </button>
                    <button 
                      onClick={() => setConnectors(connectors.filter(c => c.id !== conn.id))}
                      className="text-gray-500 hover:text-red-500 p-2 rounded hover:bg-[#222]"
                      title="Delete Connector"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
