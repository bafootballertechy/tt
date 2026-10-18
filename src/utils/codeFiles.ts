import { Tag, Label, LabelGroup, AdvancedPadItem, SmartConnector } from '../types';

export interface CodeFile {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  isBuiltIn?: boolean;
  tags: Tag[];
  labels: Label[];
  labelGroups?: LabelGroup[];
  items?: AdvancedPadItem[];
  connectors?: SmartConnector[];
}

export const STORAGE_KEY_CODE_FILES = 'sportscode_code_files';
export const STORAGE_KEY_ACTIVE_CODE_FILE = 'sportscode_active_code_file_name';

/**
 * Self-documenting schema guide and comprehensive AI instructions embedded
 * in exported Code File JSONs so LLMs can understand, generate, and edit Code Pads.
 */
export const CODE_FILE_AI_INSTRUCTIONS = {
  title: 'TacStem Code File Schema & AI Generation Guide',
  description: 'Comprehensive specification for AI models (LLMs) to generate, customize, or extend TacStem Code Files, Advanced Coding Pads, and Smart Connectors.',
  format_version: '3.0',
  schema_specification: {
    overview: 'A Code File defines video analysis tags, contextual labels, a 2D visual coding pad canvas layout, and smart connector automation rules.',
    tags: {
      description: 'Primary match events with time intervals (e.g. Goal, Shot, Press, Tackle, Turnover).',
      fields: {
        id: 'Unique string ID (e.g. "tag-goal", "tag-shot-target")',
        name: 'Display name of the tag event',
        color: 'Hex color code (e.g. "#22c55e", "#3b82f6", "#ef4444", "#c6ff1f")',
        shortcut: 'Single alphanumeric keyboard hotkey (e.g. "1", "2", "G", "P")',
        leadLagEnabled: 'Boolean. If true, activates quick tagging buffer window around click timestamp.',
        preTime: 'Pre-event buffer in seconds before click timestamp (e.g. 8)',
        postTime: 'Post-event buffer in seconds after click timestamp (e.g. 6)'
      }
    },
    labels: {
      description: 'Secondary descriptors/qualifiers attached to tags (e.g. Successful/Unsuccessful, Left Foot, Penalty Box).',
      fields: {
        id: 'Unique string ID (e.g. "lbl-succ", "lbl-zone-box")',
        name: 'Display name of the label qualifier',
        groupId: 'Optional ID linking to a labelGroup (e.g. "grp-outcome")',
        shortcut: 'Optional single alphanumeric keyboard hotkey (e.g. "S", "U")'
      }
    },
    labelGroups: {
      description: 'Categorical groupings for organizing labels (e.g. Outcome, Pitch Zone, Body Part, Pressure Level).',
      fields: {
        id: 'Unique string ID (e.g. "grp-outcome", "grp-zone")',
        name: 'Display name of the category group'
      }
    },
    items: {
      description: '2D visual canvas buttons and category headers placed on the Advanced Coding Pad.',
      fields: {
        id: 'Must match corresponding tag.id or label.id (or custom ID for "text" banners)',
        type: '"tag" | "label" | "text"',
        x: 'Horizontal pixel coordinate on canvas (e.g. 40 to 900+)',
        y: 'Vertical pixel coordinate on canvas (e.g. 40 to 800+)',
        width: 'Button width in pixels (recommended: 120-150px)',
        height: 'Button height in pixels (recommended: 38-48px)',
        content: 'Display text content (used for "text" section header banners)',
        color: 'Optional custom background color (hex or rgba)',
        fontSize: 'Optional font size in pixels (e.g. 11, 12, 13)',
        rotation: 'Optional button rotation in degrees (default 0)',
        zIndex: 'Stacking order (e.g. 5 for headers, 10 for interactive buttons)'
      }
    },
    connectors: {
      description: 'Smart automation links between coding pad buttons that execute interactive logic during live tagging.',
      types: {
        exclusive: {
          name: 'Mutual Exclusion',
          behavior: 'Selecting the source button automatically deselects/clears the target button (e.g. selecting "Successful" clears "Unsuccessful").'
        },
        assign: {
          name: 'Auto-Assignment',
          behavior: 'While the source tag is active or being recorded, the target label is automatically assigned/paired.'
        },
        trigger: {
          name: 'Action Trigger',
          behavior: 'Clicking the source button immediately triggers and starts the target button.'
        },
        defuse: {
          name: 'Cancel / Defuse',
          behavior: 'Clicking the source button immediately stops/cancels the active target button recording.'
        }
      },
      fields: {
        id: 'Unique string ID (e.g. "conn-succ-unsucc")',
        sourceId: 'ID of the source button (tag or label ID)',
        targetId: 'ID of the target button (tag or label ID)',
        type: '"exclusive" | "assign" | "trigger" | "defuse"',
        enabled: 'Boolean (true to enable rule execution)'
      }
    }
  },
  ai_prompt_instructions: 'When generating new Code Files, an AI can create custom sport/tactical templates (e.g. Football, Basketball, Ice Hockey, Rugby, Tennis, Futsal) by outputting a valid JSON object matching this schema. Ensure buttons have non-overlapping grid coordinates (x, y) with spacing of 140px horizontal and 50px vertical.'
};

/**
 * Creates a complete, self-documenting JSON export payload for any Code File.
 */
export function buildCodeFileExportPayload(file: Partial<CodeFile> & { name: string }) {
  return {
    app: 'TacStem Football Analysis',
    format: 'TacStem Code File',
    version: '3.0',
    exportedAt: new Date().toISOString(),
    _ai_instructions: CODE_FILE_AI_INSTRUCTIONS,
    ...file
  };
}

/**
 * Generate a clean, responsive layout of items for the Advanced Coding Pad
 * given a list of tags and labels.
 */
export function generateDefaultPadItems(
  tags: Tag[],
  labels: Label[],
  labelGroups: LabelGroup[] = []
): AdvancedPadItem[] {
  const items: AdvancedPadItem[] = [];
  let currY = 40;

  // 1. Tags Header Item
  if (tags.length > 0) {
    items.push({
      id: `header-tags-banner`,
      type: 'text',
      x: 40,
      y: currY,
      width: 140,
      height: 34,
      content: '🏷️ MATCH TAGS',
      color: 'rgba(198, 255, 31, 0.15)',
      fontSize: 12,
      zIndex: 5
    });
    currY += 44;

    let tagX = 40;
    tags.forEach((tag, idx) => {
      items.push({
        id: tag.id,
        type: 'tag',
        x: tagX,
        y: currY,
        width: 130,
        height: 42,
        zIndex: 10
      });
      tagX += 142;
      if (tagX > 750) {
        tagX = 40;
        currY += 50;
      }
    });
    currY += 60;
  }

  // 2. Labels by Group
  if (labels.length > 0) {
    const groupsMap = new Map<string, { name: string; labels: Label[] }>();

    // Registered groups
    labelGroups.forEach(g => {
      groupsMap.set(g.id, { name: g.name, labels: [] });
    });

    // Populate
    const ungrouped: Label[] = [];
    labels.forEach(l => {
      if (l.groupId && groupsMap.has(l.groupId)) {
        groupsMap.get(l.groupId)!.labels.push(l);
      } else {
        ungrouped.push(l);
      }
    });

    // Place each group
    groupsMap.forEach((grp, grpId) => {
      if (grp.labels.length === 0) return;

      items.push({
        id: `header-grp-${grpId}`,
        type: 'text',
        x: 40,
        y: currY,
        width: 180,
        height: 34,
        content: `📁 ${grp.name.toUpperCase()}`,
        color: 'rgba(0, 234, 255, 0.15)',
        fontSize: 12,
        zIndex: 5
      });
      currY += 42;

      let lblX = 40;
      grp.labels.forEach((label) => {
        items.push({
          id: label.id,
          type: 'label',
          x: lblX,
          y: currY,
          width: 130,
          height: 42,
          zIndex: 10
        });
        lblX += 142;
        if (lblX > 750) {
          lblX = 40;
          currY += 50;
        }
      });
      currY += 56;
    });

    // Ungrouped labels
    if (ungrouped.length > 0) {
      items.push({
        id: `header-grp-ungrouped`,
        type: 'text',
        x: 40,
        y: currY,
        width: 160,
        height: 34,
        content: '📁 GENERAL LABELS',
        color: 'rgba(255, 255, 255, 0.12)',
        fontSize: 12,
        zIndex: 5
      });
      currY += 42;

      let lblX = 40;
      ungrouped.forEach((label) => {
        items.push({
          id: label.id,
          type: 'label',
          x: lblX,
          y: currY,
          width: 130,
          height: 42,
          zIndex: 10
        });
        lblX += 142;
        if (lblX > 750) {
          lblX = 40;
          currY += 50;
        }
      });
      currY += 56;
    }
  }

  return items;
}

// Built-in standard Code Files
export const BUILT_IN_CODE_FILES: CodeFile[] = [
  {
    id: 'codefile-standard-match',
    name: 'Standard Match Analysis',
    description: 'Comprehensive football match tagging with offensive/defensive events, outcomes, pitch zones, and body parts.',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    isBuiltIn: true,
    tags: [
      { id: 'tag-goal', name: 'Goal', color: '#22c55e', shortcut: '1', leadLagEnabled: true, preTime: 10, postTime: 8 },
      { id: 'tag-shot-target', name: 'Shot on Target', color: '#3b82f6', shortcut: '2', leadLagEnabled: true, preTime: 8, postTime: 6 },
      { id: 'tag-shot-off', name: 'Shot off Target', color: '#60a5fa', shortcut: '3', leadLagEnabled: true, preTime: 8, postTime: 6 },
      { id: 'tag-key-pass', name: 'Key Pass / Chance', color: '#c6ff1f', shortcut: '4', leadLagEnabled: true, preTime: 7, postTime: 5 },
      { id: 'tag-cross', name: 'Cross', color: '#f59e0b', shortcut: '5', leadLagEnabled: true, preTime: 6, postTime: 6 },
      { id: 'tag-interception', name: 'Interception', color: '#a855f7', shortcut: '6', leadLagEnabled: true, preTime: 5, postTime: 5 },
      { id: 'tag-tackle', name: 'Tackle / Duel', color: '#ec4899', shortcut: '7', leadLagEnabled: true, preTime: 5, postTime: 5 },
      { id: 'tag-foul', name: 'Foul Committed', color: '#ef4444', shortcut: '8', leadLagEnabled: false },
      { id: 'tag-corner', name: 'Corner Kick', color: '#eab308', shortcut: '9', leadLagEnabled: true, preTime: 8, postTime: 8 },
      { id: 'tag-free-kick', name: 'Free Kick', color: '#14b8a6', shortcut: '0', leadLagEnabled: true, preTime: 8, postTime: 8 },
      { id: 'tag-offside', name: 'Offside', color: '#f97316', shortcut: 'O', leadLagEnabled: false },
      { id: 'tag-turnover', name: 'Turnover / Lost', color: '#dc2626', shortcut: 'T', leadLagEnabled: true, preTime: 6, postTime: 5 }
    ],
    labelGroups: [
      { id: 'grp-outcome', name: 'Outcome' },
      { id: 'grp-zone', name: 'Pitch Zone' },
      { id: 'grp-body', name: 'Body Part' }
    ],
    labels: [
      { id: 'lbl-succ', name: 'Successful', groupId: 'grp-outcome', shortcut: 'S' },
      { id: 'lbl-unsucc', name: 'Unsuccessful', groupId: 'grp-outcome', shortcut: 'U' },
      { id: 'lbl-blocked', name: 'Blocked / Deflected', groupId: 'grp-outcome' },
      { id: 'lbl-def3rd', name: 'Defensive 3rd', groupId: 'grp-zone', shortcut: 'D' },
      { id: 'lbl-mid3rd', name: 'Middle 3rd', groupId: 'grp-zone', shortcut: 'M' },
      { id: 'lbl-att3rd', name: 'Attacking 3rd', groupId: 'grp-zone', shortcut: 'A' },
      { id: 'lbl-box', name: 'Penalty Box', groupId: 'grp-zone', shortcut: 'B' },
      { id: 'lbl-rightfoot', name: 'Right Foot', groupId: 'grp-body' },
      { id: 'lbl-leftfoot', name: 'Left Foot', groupId: 'grp-body' },
      { id: 'lbl-header', name: 'Header', groupId: 'grp-body' }
    ],
    connectors: [
      { id: 'conn-succ-unsucc', sourceId: 'lbl-succ', targetId: 'lbl-unsucc', type: 'exclusive', enabled: true }
    ]
  },
  {
    id: 'codefile-possession-buildup',
    name: 'Possession & Build-Up Play',
    description: 'Detailed analysis of team progression, line-breaking passes, pressing resistance, and spatial channels.',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    isBuiltIn: true,
    tags: [
      { id: 'tag-buildup', name: 'Build-Up Deep', color: '#3b82f6', shortcut: '1', leadLagEnabled: true, preTime: 8, postTime: 8 },
      { id: 'tag-line-break', name: 'Line Breaking Pass', color: '#22c55e', shortcut: '2', leadLagEnabled: true, preTime: 6, postTime: 6 },
      { id: 'tag-switch', name: 'Switch of Play', color: '#06b6d4', shortcut: '3', leadLagEnabled: true, preTime: 7, postTime: 7 },
      { id: 'tag-prog-carry', name: 'Progressive Carry', color: '#c6ff1f', shortcut: '4', leadLagEnabled: true, preTime: 6, postTime: 6 },
      { id: 'tag-final3rd-entry', name: 'Final 3rd Entry', color: '#eab308', shortcut: '5', leadLagEnabled: true, preTime: 7, postTime: 6 },
      { id: 'tag-3rd-man', name: 'Third-Man Run', color: '#f97316', shortcut: '6', leadLagEnabled: true, preTime: 6, postTime: 6 },
      { id: 'tag-high-turnover', name: 'High Turnover', color: '#ef4444', shortcut: '7', leadLagEnabled: true, preTime: 5, postTime: 5 },
      { id: 'tag-counter-regain', name: 'Counter Regain', color: '#10b981', shortcut: '8', leadLagEnabled: true, preTime: 5, postTime: 5 }
    ],
    labelGroups: [
      { id: 'grp-pressure', name: 'Opponent Pressure' },
      { id: 'grp-direction', name: 'Pass Direction' },
      { id: 'grp-channel', name: 'Channel / Corridor' }
    ],
    labels: [
      { id: 'lbl-high-press', name: 'High Press Faced', groupId: 'grp-pressure' },
      { id: 'lbl-mid-block', name: 'Mid Block Faced', groupId: 'grp-pressure' },
      { id: 'lbl-low-block', name: 'Low Block Faced', groupId: 'grp-pressure' },
      { id: 'lbl-uncontested', name: 'Uncontested', groupId: 'grp-pressure' },
      { id: 'lbl-forward', name: 'Forward', groupId: 'grp-direction', shortcut: 'F' },
      { id: 'lbl-lateral', name: 'Lateral', groupId: 'grp-direction', shortcut: 'L' },
      { id: 'lbl-diagonal', name: 'Diagonal', groupId: 'grp-direction' },
      { id: 'lbl-left-half', name: 'Left Half-Space', groupId: 'grp-channel' },
      { id: 'lbl-central', name: 'Central Channel', groupId: 'grp-channel' },
      { id: 'lbl-right-half', name: 'Right Half-Space', groupId: 'grp-channel' },
      { id: 'lbl-wide', name: 'Wide Flank', groupId: 'grp-channel' }
    ]
  },
  {
    id: 'codefile-defensive-pressing',
    name: 'Pressing & Defensive Organization',
    description: 'Track counter-pressing triggers, pressing efficiency, aerial & ground duel outcomes, and recovery locations.',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    isBuiltIn: true,
    tags: [
      { id: 'tag-press-trigger', name: 'Press Trigger', color: '#ef4444', shortcut: '1', leadLagEnabled: true, preTime: 6, postTime: 6 },
      { id: 'tag-counter-press', name: 'Counter-Press (5s)', color: '#f97316', shortcut: '2', leadLagEnabled: true, preTime: 6, postTime: 6 },
      { id: 'tag-def-transition', name: 'Def Transition', color: '#eab308', shortcut: '3', leadLagEnabled: true, preTime: 7, postTime: 7 },
      { id: 'tag-ball-recovery', name: 'Ball Recovery', color: '#22c55e', shortcut: '4', leadLagEnabled: true, preTime: 5, postTime: 5 },
      { id: 'tag-ground-duel', name: 'Ground Duel', color: '#8b5cf6', shortcut: '5', leadLagEnabled: true, preTime: 5, postTime: 5 },
      { id: 'tag-aerial-duel', name: 'Aerial Duel', color: '#3b82f6', shortcut: '6', leadLagEnabled: true, preTime: 5, postTime: 5 },
      { id: 'tag-clearance', name: 'Clearance', color: '#ec4899', shortcut: '7', leadLagEnabled: true, preTime: 5, postTime: 5 },
      { id: 'tag-block', name: 'Block Shot/Cross', color: '#06b6d4', shortcut: '8', leadLagEnabled: true, preTime: 5, postTime: 5 }
    ],
    labelGroups: [
      { id: 'grp-duel-outcome', name: 'Duel / Press Outcome' },
      { id: 'grp-half', name: 'Pitch Half' },
      { id: 'grp-intensity', name: 'Intensity' }
    ],
    labels: [
      { id: 'lbl-won', name: 'Won Possession', groupId: 'grp-duel-outcome', shortcut: 'W' },
      { id: 'lbl-lost', name: 'Lost Possession', groupId: 'grp-duel-outcome', shortcut: 'L' },
      { id: 'lbl-second-ball', name: 'Second Ball Won', groupId: 'grp-duel-outcome' },
      { id: 'lbl-foul-drawn', name: 'Foul Drawn / Forced', groupId: 'grp-duel-outcome' },
      { id: 'lbl-off-half', name: 'Opponent Half', groupId: 'grp-half' },
      { id: 'lbl-def-half', name: 'Own Half', groupId: 'grp-half' },
      { id: 'lbl-sprint', name: 'High Intensity Sprint', groupId: 'grp-intensity' },
      { id: 'lbl-contain', name: 'Delay & Contain', groupId: 'grp-intensity' }
    ]
  },
  {
    id: 'codefile-set-pieces',
    name: 'Set Pieces & Dead Balls',
    description: 'Specialized template for corner kicks, indirect/direct free kicks, penalties, throw-ins, and first contacts.',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    isBuiltIn: true,
    tags: [
      { id: 'tag-corner-att', name: 'Attacking Corner', color: '#eab308', shortcut: '1', leadLagEnabled: true, preTime: 8, postTime: 10 },
      { id: 'tag-corner-def', name: 'Defending Corner', color: '#f59e0b', shortcut: '2', leadLagEnabled: true, preTime: 8, postTime: 10 },
      { id: 'tag-fk-att', name: 'Attacking Free Kick', color: '#3b82f6', shortcut: '3', leadLagEnabled: true, preTime: 8, postTime: 10 },
      { id: 'tag-fk-def', name: 'Defending Free Kick', color: '#14b8a6', shortcut: '4', leadLagEnabled: true, preTime: 8, postTime: 10 },
      { id: 'tag-penalty', name: 'Penalty Kick', color: '#22c55e', shortcut: '5', leadLagEnabled: true, preTime: 10, postTime: 10 },
      { id: 'tag-throw-in', name: 'Long Throw-In', color: '#8b5cf6', shortcut: '6', leadLagEnabled: true, preTime: 6, postTime: 8 },
      { id: 'tag-goal-kick', name: 'Goal Kick', color: '#f97316', shortcut: '7', leadLagEnabled: true, preTime: 8, postTime: 8 }
    ],
    labelGroups: [
      { id: 'grp-delivery', name: 'Delivery Type' },
      { id: 'grp-contact', name: 'First Contact' },
      { id: 'grp-result', name: 'Terminal Result' }
    ],
    labels: [
      { id: 'lbl-inswing', name: 'In-Swinger', groupId: 'grp-delivery' },
      { id: 'lbl-outswing', name: 'Out-Swinger', groupId: 'grp-delivery' },
      { id: 'lbl-driven', name: 'Driven / Flat', groupId: 'grp-delivery' },
      { id: 'lbl-short-routine', name: 'Short Routine', groupId: 'grp-delivery' },
      { id: 'lbl-first-att', name: 'Attacking Player First', groupId: 'grp-contact' },
      { id: 'lbl-first-def', name: 'Defending Player First', groupId: 'grp-contact' },
      { id: 'lbl-first-gk', name: 'Goalkeeper Punch/Catch', groupId: 'grp-contact' },
      { id: 'lbl-res-goal', name: 'Goal Scored', groupId: 'grp-result' },
      { id: 'lbl-res-shot', name: 'Shot Generated', groupId: 'grp-result' },
      { id: 'lbl-res-cleared', name: 'Cleared / Defended', groupId: 'grp-result' },
      { id: 'lbl-res-turnover', name: 'Turnover / Counter', groupId: 'grp-result' }
    ]
  }
];

// Initialize built-in default pad items for each built-in file
BUILT_IN_CODE_FILES.forEach(file => {
  if (!file.items || file.items.length === 0) {
    file.items = generateDefaultPadItems(file.tags, file.labels, file.labelGroups || []);
  }
});

/**
 * Load all Code Files from localStorage, migrating any legacy templates if needed.
 */
export function loadAllCodeFiles(): CodeFile[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CODE_FILES);
    let files: CodeFile[] = [];

    if (raw) {
      files = JSON.parse(raw);
    }

    // Merge in built-ins if missing
    BUILT_IN_CODE_FILES.forEach(builtIn => {
      const idx = files.findIndex(f => f.id === builtIn.id);
      if (idx === -1) {
        files.unshift(builtIn);
      } else if (files[idx].isBuiltIn) {
        // Ensure built-in has items
        if (!files[idx].items || files[idx].items?.length === 0) {
          files[idx].items = builtIn.items;
        }
      }
    });

    // Migrate from legacy 'normalCodingPresets' if any custom ones exist
    try {
      const legacyNormal = localStorage.getItem('normalCodingPresets');
      if (legacyNormal) {
        const parsedLegacy = JSON.parse(legacyNormal);
        if (Array.isArray(parsedLegacy)) {
          parsedLegacy.forEach((legacy: any) => {
            if (legacy && legacy.name && !files.some(f => f.name.toLowerCase() === legacy.name.toLowerCase())) {
              files.push({
                id: legacy.id || `migrated-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
                name: legacy.name,
                description: legacy.description || 'Custom Coding Setup',
                createdAt: legacy.createdAt || new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                isBuiltIn: false,
                tags: legacy.tags || [],
                labels: legacy.labels || [],
                labelGroups: legacy.labelGroups || [],
                items: generateDefaultPadItems(legacy.tags || [], legacy.labels || [], legacy.labelGroups || [])
              });
            }
          });
        }
      }
    } catch (e) {
      console.warn("Legacy migration skipped:", e);
    }

    return files;
  } catch (err) {
    console.error("Failed to load Code Files:", err);
    return [...BUILT_IN_CODE_FILES];
  }
}

/**
 * Save Code Files to localStorage.
 */
export function saveAllCodeFiles(files: CodeFile[]) {
  try {
    localStorage.setItem(STORAGE_KEY_CODE_FILES, JSON.stringify(files));
  } catch (err) {
    console.error("Failed to save Code Files to localStorage:", err);
  }
}
