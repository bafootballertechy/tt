const fs = require('fs');
const file = 'src/components/Workspace/Workspace.tsx';
let content = fs.readFileSync(file, 'utf8');

const stateVarStr = `  const [isTimelineExpanded, setIsTimelineExpanded] = useState(false);
  const [showTimelineFiltersMenu, setShowTimelineFiltersMenu] = useState(false);
  const [showTimelineFreezeFrames, setShowTimelineFreezeFrames] = useState(true);
  const [showTimelineTags, setShowTimelineTags] = useState(true);
`;

content = content.replace('  const [isTimelineExpanded, setIsTimelineExpanded] = useState(false);\n', stateVarStr);
fs.writeFileSync(file, content);
