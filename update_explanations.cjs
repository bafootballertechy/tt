const fs = require('fs');
let content = fs.readFileSync('src/components/Workspace/AdvancedCodingPad.tsx', 'utf-8');

const oldHTML = `              <div className="mb-4 flex flex-col gap-2">
                  <button onClick={() => {
                      setConnectors([...connectors, { id: \`conn-\${Date.now()}\`, sourceId: showConnectorMenu.sourceId, targetId: showConnectorMenu.targetId, type: 'exclusive', enabled: true }]);
                      setShowConnectorMenu(null);
                  }} className="text-left px-3 py-2 bg-[#161616] hover:bg-[#333] border border-[#444] rounded text-sm text-white">
                      <strong>Exclusive</strong> <br/><span className="text-xs text-gray-500">When source starts, stop target.</span>
                  </button>
                  <button onClick={() => {
                      setConnectors([...connectors, { id: \`conn-\${Date.now()}\`, sourceId: showConnectorMenu.sourceId, targetId: showConnectorMenu.targetId, type: 'trigger', enabled: true }]);
                      setShowConnectorMenu(null);
                  }} className="text-left px-3 py-2 bg-[#161616] hover:bg-[#333] border border-[#444] rounded text-sm text-white">
                      <strong>Trigger</strong> <br/><span className="text-xs text-gray-500">When source starts, start target.</span>
                  </button>
                  <button onClick={() => {
                      setConnectors([...connectors, { id: \`conn-\${Date.now()}\`, sourceId: showConnectorMenu.sourceId, targetId: showConnectorMenu.targetId, type: 'defuse', enabled: true }]);
                      setShowConnectorMenu(null);
                  }} className="text-left px-3 py-2 bg-[#161616] hover:bg-[#333] border border-[#444] rounded text-sm text-white">
                      <strong>Defuse</strong> <br/><span className="text-xs text-gray-500">When source starts, stop target.</span>
                  </button>
                  <button onClick={() => {
                      setConnectors([...connectors, { id: \`conn-\${Date.now()}\`, sourceId: showConnectorMenu.sourceId, targetId: showConnectorMenu.targetId, type: 'assign', enabled: true }]);
                      setShowConnectorMenu(null);
                  }} className="text-left px-3 py-2 bg-[#161616] hover:bg-[#333] border border-[#444] rounded text-sm text-white">
                      <strong>Assign</strong> <br/><span className="text-xs text-gray-500">Attach target metadata to source.</span>
                  </button>
              </div>`;

const newHTML = `              <div className="mb-4 flex flex-col gap-2">
                  <button onClick={() => {
                      setConnectors([...connectors, { id: \`conn-\${Date.now()}\`, sourceId: showConnectorMenu.sourceId, targetId: showConnectorMenu.targetId, type: 'exclusive', enabled: true }]);
                      setShowConnectorMenu(null);
                  }} className="text-left px-3 py-2 bg-[#161616] hover:bg-[#333] border border-[#444] rounded text-sm text-white">
                      <strong>Exclusive</strong> <br/><span className="text-xs text-gray-500">Starting one stops the other (Two-way).</span>
                  </button>
                  <button onClick={() => {
                      setConnectors([...connectors, { id: \`conn-\${Date.now()}\`, sourceId: showConnectorMenu.sourceId, targetId: showConnectorMenu.targetId, type: 'trigger', enabled: true }]);
                      setShowConnectorMenu(null);
                  }} className="text-left px-3 py-2 bg-[#161616] hover:bg-[#333] border border-[#444] rounded text-sm text-white">
                      <strong>Trigger</strong> <br/><span className="text-xs text-gray-500">Starting/stopping first starts/stops second.</span>
                  </button>
                  <button onClick={() => {
                      setConnectors([...connectors, { id: \`conn-\${Date.now()}\`, sourceId: showConnectorMenu.sourceId, targetId: showConnectorMenu.targetId, type: 'defuse', enabled: true }]);
                      setShowConnectorMenu(null);
                  }} className="text-left px-3 py-2 bg-[#161616] hover:bg-[#333] border border-[#444] rounded text-sm text-white">
                      <strong>Defuse</strong> <br/><span className="text-xs text-gray-500">Starting second stops first (One-way).</span>
                  </button>
                  <button onClick={() => {
                      setConnectors([...connectors, { id: \`conn-\${Date.now()}\`, sourceId: showConnectorMenu.sourceId, targetId: showConnectorMenu.targetId, type: 'assign', enabled: true }]);
                      setShowConnectorMenu(null);
                  }} className="text-left px-3 py-2 bg-[#161616] hover:bg-[#333] border border-[#444] rounded text-sm text-white">
                      <strong>Assign</strong> <br/><span className="text-xs text-gray-500">Clicking second triggers first (with second attached).</span>
                  </button>
              </div>`;

if (!content.includes(oldHTML)) {
  console.log("oldHTML not found!");
  process.exit(1);
}
content = content.replace(oldHTML, newHTML);
fs.writeFileSync('src/components/Workspace/AdvancedCodingPad.tsx', content);
