import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FolderOpen, Save, Download, Upload, Plus, Trash2, Edit2, Check, X, 
  Layers, Tag, Tags, Copy, AlertTriangle, Sparkles, Folder, 
  ArrowRight, FileUp, FileDown, CheckCircle2, Info, Search
} from 'lucide-react';
import { Tag as TagData, Label, LabelGroup, AdvancedPadItem } from '../../types';
import { CODE_FILE_AI_INSTRUCTIONS } from '../../utils/codeFiles';

export interface CodingTemplate {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  isBuiltIn?: boolean;
  tags: TagData[];
  labels: Label[];
  labelGroups?: LabelGroup[];
}

export const BUILT_IN_TEMPLATES: CodingTemplate[] = [
  {
    id: 'builtin-standard-match',
    name: 'Standard Match Analysis',
    description: 'Comprehensive football match tagging with offensive/defensive events, outcomes, pitch thirds, and body parts.',
    createdAt: '2026-01-01T00:00:00.000Z',
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
    ]
  },
  {
    id: 'builtin-possession-buildup',
    name: 'Possession & Build-Up Play',
    description: 'Detailed analysis of team progression, line-breaking passes, pressing resistance, and spatial channels.',
    createdAt: '2026-01-01T00:00:00.000Z',
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
    id: 'builtin-defensive-pressing',
    name: 'Pressing & Defensive Organization',
    description: 'Track counter-pressing triggers, pressing efficiency, aerial & ground duel outcomes, and recovery locations.',
    createdAt: '2026-01-01T00:00:00.000Z',
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
    id: 'builtin-set-pieces',
    name: 'Set Pieces & Dead Balls',
    description: 'Specialized template for corner kicks, indirect/direct free kicks, penalties, throw-ins, and first contacts.',
    createdAt: '2026-01-01T00:00:00.000Z',
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

interface Props {
  isOpen: boolean;
  onClose: () => void;
  currentTags: TagData[];
  currentLabels: Label[];
  currentLabelGroups?: LabelGroup[];
  currentTemplateName?: string;
  onApplyTemplate: (
    template: {
      tags: TagData[];
      labels: Label[];
      labelGroups: LabelGroup[];
      name: string;
    },
    mode: 'replace' | 'merge'
  ) => void;
  showNotification?: (text: string, color?: string) => void;
}

export const NormalCodingTemplateModal: React.FC<Props> = ({
  isOpen,
  onClose,
  currentTags,
  currentLabels,
  currentLabelGroups = [],
  currentTemplateName,
  onApplyTemplate,
  showNotification
}) => {
  const [activeTab, setActiveTab] = useState<'presets' | 'save' | 'import-export'>('presets');
  const [savedTemplates, setSavedTemplates] = useState<CodingTemplate[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Save State
  const [saveName, setSaveName] = useState(currentTemplateName || '');
  const [saveDescription, setSaveDescription] = useState('');
  const [overwriteConfirmId, setOverwriteConfirmId] = useState<string | null>(null);

  // Rename & Delete State
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Import State
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pendingImport, setPendingImport] = useState<{
    name: string;
    tags: TagData[];
    labels: Label[];
    labelGroups: LabelGroup[];
    sourceFile: string;
  } | null>(null);

  // Load custom templates from localStorage
  useEffect(() => {
    if (isOpen) {
      try {
        const stored = localStorage.getItem('normalCodingPresets');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) {
            setSavedTemplates(parsed);
          }
        }
      } catch (err) {
        console.error("Failed to load normalCodingPresets", err);
      }
    }
  }, [isOpen]);

  const saveTemplatesToStorage = (templates: CodingTemplate[]) => {
    setSavedTemplates(templates);
    try {
      localStorage.setItem('normalCodingPresets', JSON.stringify(templates));
    } catch (e) {
      console.error("Failed to save templates to localStorage", e);
    }
  };

  const handleSaveCurrent = (forceOverwriteId?: string) => {
    const trimmed = saveName.trim();
    if (!trimmed) {
      if (showNotification) showNotification('Please enter a template name', '#ef4444');
      return;
    }

    const existing = savedTemplates.find(
      t => t.name.toLowerCase() === trimmed.toLowerCase() || (forceOverwriteId && t.id === forceOverwriteId)
    );

    if (existing && !forceOverwriteId) {
      setOverwriteConfirmId(existing.id);
      return;
    }

    let updatedTemplates: CodingTemplate[];
    if (existing) {
      updatedTemplates = savedTemplates.map(t => 
        t.id === existing.id 
          ? {
              ...t,
              name: trimmed,
              description: saveDescription.trim() || t.description,
              tags: currentTags,
              labels: currentLabels,
              labelGroups: currentLabelGroups,
              createdAt: new Date().toISOString()
            }
          : t
      );
      if (showNotification) showNotification(`Updated template "${trimmed}"!`, '#c6ff1f');
    } else {
      const newTemplate: CodingTemplate = {
        id: `tpl-${Date.now()}`,
        name: trimmed,
        description: saveDescription.trim(),
        createdAt: new Date().toISOString(),
        tags: currentTags,
        labels: currentLabels,
        labelGroups: currentLabelGroups
      };
      updatedTemplates = [newTemplate, ...savedTemplates];
      if (showNotification) showNotification(`Saved template "${trimmed}"!`, '#c6ff1f');
    }

    saveTemplatesToStorage(updatedTemplates);
    setOverwriteConfirmId(null);
    setActiveTab('presets');
  };

  const handleDeleteTemplate = (id: string) => {
    const next = savedTemplates.filter(t => t.id !== id);
    saveTemplatesToStorage(next);
    setDeleteConfirmId(null);
    if (showNotification) showNotification('Template deleted', '#f59e0b');
  };

  const handleRenameTemplate = (id: string) => {
    const trimmed = renameValue.trim();
    if (!trimmed) {
      setRenamingId(null);
      return;
    }
    const next = savedTemplates.map(t => t.id === id ? { ...t, name: trimmed } : t);
    saveTemplatesToStorage(next);
    setRenamingId(null);
    if (showNotification) showNotification(`Renamed to "${trimmed}"`, '#c6ff1f');
  };

  const handleDuplicateTemplate = (tpl: CodingTemplate) => {
    const copy: CodingTemplate = {
      ...tpl,
      id: `tpl-${Date.now()}`,
      name: `${tpl.name} (Copy)`,
      isBuiltIn: false,
      createdAt: new Date().toISOString()
    };
    saveTemplatesToStorage([copy, ...savedTemplates]);
    if (showNotification) showNotification(`Duplicated template "${tpl.name}"!`, '#c6ff1f');
  };

  const handleExportTemplateJSON = (tpl: { name: string; tags: TagData[]; labels: Label[]; labelGroups?: LabelGroup[]; description?: string }) => {
    const payload = {
      app: "TacStem Football Analysis",
      format: "TacStem Normal Coding Template",
      version: "3.0",
      exportedAt: new Date().toISOString(),
      _ai_instructions: CODE_FILE_AI_INSTRUCTIONS,
      name: tpl.name,
      description: tpl.description || "Unified tags and labels coding template for football video analysis.",
      tags: tpl.tags,
      labels: tpl.labels,
      labelGroups: tpl.labelGroups || []
    };

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(payload, null, 2));
    const dl = document.createElement('a');
    dl.setAttribute("href", dataStr);
    dl.setAttribute("download", `${tpl.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-template.json`);
    document.body.appendChild(dl);
    dl.click();
    dl.remove();
    if (showNotification) showNotification(`Exported "${tpl.name}" JSON file!`, '#c6ff1f');
  };

  const handleExportCurrent = () => {
    handleExportTemplateJSON({
      name: currentTemplateName || 'match-coding-setup',
      tags: currentTags,
      labels: currentLabels,
      labelGroups: currentLabelGroups,
      description: "Unified export of project tags and labels."
    });
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const data = JSON.parse(text);

        let parsedTags: TagData[] = [];
        let parsedLabels: Label[] = [];
        let parsedGroups: LabelGroup[] = [];
        let templateName = file.name.replace(/\.[^/.]+$/, "");

        if (Array.isArray(data)) {
          // Direct array of tags
          parsedTags = data.map((t: any, idx: number) => ({
            id: String(t.id || `tag-${Date.now()}-${idx}`),
            name: String(t.name || t.tag_name || t.label || `Tag ${idx + 1}`),
            color: String(t.color || '#c6ff1f'),
            shortcut: String(t.shortcut || t.hotkey || ''),
            leadLagEnabled: Boolean(t.leadLagEnabled),
            preTime: typeof t.preTime === 'number' ? t.preTime : 10,
            postTime: typeof t.postTime === 'number' ? t.postTime : 10
          }));
        } else if (typeof data === 'object' && data !== null) {
          if (data.name) templateName = data.name;

          // Extract tags
          if (Array.isArray(data.tags)) {
            parsedTags = data.tags.map((t: any, idx: number) => ({
              id: String(t.id || `tag-${Date.now()}-${idx}`),
              name: String(t.name || t.tag_name || t.label || `Tag ${idx + 1}`),
              color: String(t.color || '#c6ff1f'),
              shortcut: String(t.shortcut || t.hotkey || ''),
              leadLagEnabled: Boolean(t.leadLagEnabled),
              preTime: typeof t.preTime === 'number' ? t.preTime : 10,
              postTime: typeof t.postTime === 'number' ? t.postTime : 10
            }));
          } else if (Array.isArray(data.items)) {
            // Advanced pad file items
            parsedTags = data.items.filter((it: any) => it.type === 'tag').map((it: any, idx: number) => ({
              id: String(it.id || `tag-${Date.now()}-${idx}`),
              name: String(it.content || it.name || `Tag ${idx + 1}`),
              color: String(it.color || '#c6ff1f'),
              shortcut: String(it.shortcut || '')
            }));
          }

          // Extract labels
          if (Array.isArray(data.labels)) {
            parsedLabels = data.labels.map((l: any, idx: number) => ({
              id: String(l.id || `lbl-${Date.now()}-${idx}`),
              name: String(l.name || `Label ${idx + 1}`),
              groupId: l.groupId ? String(l.groupId) : undefined,
              shortcut: l.shortcut ? String(l.shortcut) : undefined
            }));
          } else if (Array.isArray(data.items)) {
            parsedLabels = data.items.filter((it: any) => it.type === 'label').map((it: any, idx: number) => ({
              id: String(it.id || `lbl-${Date.now()}-${idx}`),
              name: String(it.content || it.name || `Label ${idx + 1}`),
              groupId: it.groupId ? String(it.groupId) : undefined,
              shortcut: it.shortcut ? String(it.shortcut) : undefined
            }));
          }

          // Extract groups
          if (Array.isArray(data.labelGroups)) {
            parsedGroups = data.labelGroups.map((g: any, idx: number) => ({
              id: String(g.id || `grp-${Date.now()}-${idx}`),
              name: String(g.name || `Group ${idx + 1}`)
            }));
          }
        }

        if (parsedTags.length === 0 && parsedLabels.length === 0) {
          if (showNotification) showNotification('No tags or labels found in file', '#ef4444');
          return;
        }

        setPendingImport({
          name: templateName,
          tags: parsedTags,
          labels: parsedLabels,
          labelGroups: parsedGroups,
          sourceFile: file.name
        });
      } catch (err) {
        if (showNotification) showNotification('Invalid JSON file format', '#ef4444');
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const executeImport = (mode: 'replace' | 'merge', saveToPresets: boolean) => {
    if (!pendingImport) return;

    if (saveToPresets) {
      const newPreset: CodingTemplate = {
        id: `tpl-${Date.now()}`,
        name: pendingImport.name,
        description: `Imported from ${pendingImport.sourceFile}`,
        createdAt: new Date().toISOString(),
        tags: pendingImport.tags,
        labels: pendingImport.labels,
        labelGroups: pendingImport.labelGroups
      };
      saveTemplatesToStorage([newPreset, ...savedTemplates]);
    }

    onApplyTemplate({
      tags: pendingImport.tags,
      labels: pendingImport.labels,
      labelGroups: pendingImport.labelGroups,
      name: pendingImport.name
    }, mode);

    if (showNotification) {
      showNotification(
        `Applied "${pendingImport.name}" (${pendingImport.tags.length} tags, ${pendingImport.labels.length} labels)!`,
        '#c6ff1f'
      );
    }

    setPendingImport(null);
    onClose();
  };

  const allDisplayTemplates = [
    ...BUILT_IN_TEMPLATES,
    ...savedTemplates
  ].filter(t => 
    t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (t.description && t.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 overflow-y-auto">
      <motion.div 
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-[#141416] border border-[#2b2b30] rounded-2xl w-full max-w-4xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden text-gray-200"
      >
        {/* Header */}
        <div className="p-4 bg-[#18181c] border-b border-[#2b2b30] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#c6ff1f]/10 border border-[#c6ff1f]/30 flex items-center justify-center text-[#c6ff1f]">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white tracking-wide">Coding Setup & Templates</h3>
                <span className="text-[10px] font-bold uppercase tracking-wider bg-[#222] text-[#c6ff1f] px-2 py-0.5 rounded-full border border-[#333]">
                  All-in-One
                </span>
              </div>
              <p className="text-xs text-gray-400">
                Save, load, and share complete tagging matrices (Tags + Labels + Groups in a single preset).
              </p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 text-gray-400 hover:text-white hover:bg-[#252528] rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-[#2b2b30] bg-[#111114] px-4 shrink-0">
          <button
            onClick={() => setActiveTab('presets')}
            className={`py-3 px-4 text-xs font-bold uppercase tracking-wider border-b-2 flex items-center gap-2 transition-all ${
              activeTab === 'presets'
                ? 'border-[#c6ff1f] text-[#c6ff1f]'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <FolderOpen className="w-4 h-4" />
            <span>Templates Library ({BUILT_IN_TEMPLATES.length + savedTemplates.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('save')}
            className={`py-3 px-4 text-xs font-bold uppercase tracking-wider border-b-2 flex items-center gap-2 transition-all ${
              activeTab === 'save'
                ? 'border-[#c6ff1f] text-[#c6ff1f]'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <Save className="w-4 h-4" />
            <span>Save Current Setup</span>
          </button>
          <button
            onClick={() => setActiveTab('import-export')}
            className={`py-3 px-4 text-xs font-bold uppercase tracking-wider border-b-2 flex items-center gap-2 transition-all ${
              activeTab === 'import-export'
                ? 'border-[#c6ff1f] text-[#c6ff1f]'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <FileUp className="w-4 h-4" />
            <span>Export & Import JSON</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
          {/* TAB 1: PRESETS / TEMPLATES LIBRARY */}
          {activeTab === 'presets' && (
            <div className="space-y-4">
              {/* Search Bar & Quick Actions */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="relative w-full sm:w-72">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search templates..."
                    className="w-full pl-9 pr-3 py-1.5 text-xs bg-[#1a1a1e] border border-[#2e2e34] rounded-lg text-white placeholder-gray-500 focus:border-[#c6ff1f] outline-none transition-colors"
                  />
                  {searchQuery && (
                    <button 
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                  <button
                    onClick={() => setActiveTab('save')}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-[#c6ff1f] hover:bg-[#b0e619] text-black rounded-lg text-xs font-bold transition-all shadow-sm"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Save Current As Template</span>
                  </button>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-[#222228] hover:bg-[#2e2e36] text-gray-200 hover:text-white rounded-lg text-xs font-medium border border-[#33333d] transition-all"
                    title="Import template JSON file"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Import File</span>
                  </button>
                </div>
              </div>

              {/* Current Active Info Banner */}
              <div className="p-3 bg-[#18181d] border border-[#2b2b34] rounded-xl flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-gray-400">Current Match Coding:</span>
                  <span className="font-bold text-white bg-[#222] px-2 py-0.5 rounded border border-[#333]">
                    {currentTemplateName || 'Custom Unsaved Setup'}
                  </span>
                  <span className="text-gray-500">•</span>
                  <span className="text-[#c6ff1f] font-semibold">{currentTags.length} Tags</span>
                  <span className="text-gray-500">•</span>
                  <span className="text-cyan-400 font-semibold">{currentLabels.length} Labels</span>
                  {currentLabelGroups.length > 0 && (
                    <>
                      <span className="text-gray-500">•</span>
                      <span className="text-amber-400 font-semibold">{currentLabelGroups.length} Groups</span>
                    </>
                  )}
                </div>
                <button
                  onClick={handleExportCurrent}
                  className="flex items-center gap-1 px-2.5 py-1 bg-[#25252c] hover:bg-[#303038] text-xs font-semibold text-gray-300 hover:text-white rounded-lg transition-colors border border-[#353540]"
                >
                  <Download className="w-3 h-3 text-[#c6ff1f]" />
                  <span>Export Current</span>
                </button>
              </div>

              {/* Templates Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {allDisplayTemplates.map((tpl) => {
                  const isCurrent = currentTemplateName === tpl.name;
                  const isRenaming = renamingId === tpl.id;
                  const isDeleting = deleteConfirmId === tpl.id;

                  return (
                    <div
                      key={tpl.id}
                      className={`p-3.5 rounded-xl border flex flex-col justify-between transition-all relative ${
                        isCurrent
                          ? 'bg-[#1a2016] border-[#c6ff1f]/50 shadow-md ring-1 ring-[#c6ff1f]/30'
                          : 'bg-[#18181d] border-[#292930] hover:border-[#3d3d48]'
                      }`}
                    >
                      {/* Top Row: Title & Badges */}
                      <div>
                        <div className="flex items-start justify-between gap-2 mb-1.5">
                          <div className="flex-1 min-w-0">
                            {isRenaming ? (
                              <div className="flex items-center gap-1.5">
                                <input
                                  type="text"
                                  value={renameValue}
                                  onChange={(e) => setRenameValue(e.target.value)}
                                  className="w-full bg-[#111] border border-[#c6ff1f] rounded px-2 py-0.5 text-xs text-white outline-none"
                                  autoFocus
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleRenameTemplate(tpl.id);
                                    if (e.key === 'Escape') setRenamingId(null);
                                  }}
                                />
                                <button
                                  onClick={() => handleRenameTemplate(tpl.id)}
                                  className="p-1 bg-[#c6ff1f] text-black rounded hover:bg-[#b0e619]"
                                >
                                  <Check className="w-3 h-3" />
                                </button>
                                <button
                                  onClick={() => setRenamingId(null)}
                                  className="p-1 bg-[#333] text-gray-300 rounded hover:text-white"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                <h4 className="font-bold text-sm text-white truncate">{tpl.name}</h4>
                                {tpl.isBuiltIn && (
                                  <span className="text-[9px] font-extrabold uppercase tracking-wider bg-emerald-950/70 text-emerald-400 border border-emerald-700/50 px-1.5 py-0.2 rounded">
                                    Built-in
                                  </span>
                                )}
                                {isCurrent && (
                                  <span className="text-[9px] font-extrabold uppercase tracking-wider bg-[#c6ff1f]/20 text-[#c6ff1f] border border-[#c6ff1f]/40 px-1.5 py-0.2 rounded flex items-center gap-1">
                                    <Check className="w-2.5 h-2.5" /> Active
                                  </span>
                                )}
                              </div>
                            )}
                          </div>

                          {/* Quick Options (Rename/Duplicate/Export/Delete) */}
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              onClick={() => handleExportTemplateJSON(tpl)}
                              className="p-1 text-gray-400 hover:text-white hover:bg-[#25252c] rounded transition-colors"
                              title="Export this template to JSON"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDuplicateTemplate(tpl)}
                              className="p-1 text-gray-400 hover:text-white hover:bg-[#25252c] rounded transition-colors"
                              title="Duplicate as new preset"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                            {!tpl.isBuiltIn && (
                              <>
                                <button
                                  onClick={() => {
                                    setRenamingId(tpl.id);
                                    setRenameValue(tpl.name);
                                  }}
                                  className="p-1 text-gray-400 hover:text-[#c6ff1f] hover:bg-[#25252c] rounded transition-colors"
                                  title="Rename template"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => setDeleteConfirmId(tpl.id)}
                                  className="p-1 text-gray-400 hover:text-red-400 hover:bg-[#25252c] rounded transition-colors"
                                  title="Delete template"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Description */}
                        {tpl.description && (
                          <p className="text-[11px] text-gray-400 line-clamp-2 mb-2">
                            {tpl.description}
                          </p>
                        )}

                        {/* Tags Preview (Color Dots) & Labels Info */}
                        <div className="flex items-center gap-2 mb-3 flex-wrap">
                          <div className="flex items-center gap-1 bg-[#121215] px-2 py-0.5 rounded border border-[#25252c]">
                            <Tags className="w-3 h-3 text-[#c6ff1f]" />
                            <span className="text-[10px] font-bold text-gray-200">
                              {tpl.tags.length} Tags
                            </span>
                          </div>
                          <div className="flex items-center gap-1 bg-[#121215] px-2 py-0.5 rounded border border-[#25252c]">
                            <Tag className="w-3 h-3 text-cyan-400" />
                            <span className="text-[10px] font-bold text-gray-200">
                              {tpl.labels.length} Labels
                            </span>
                          </div>
                          {tpl.labelGroups && tpl.labelGroups.length > 0 && (
                            <div className="flex items-center gap-1 bg-[#121215] px-2 py-0.5 rounded border border-[#25252c]">
                              <Folder className="w-3 h-3 text-amber-400" />
                              <span className="text-[10px] font-bold text-gray-200">
                                {tpl.labelGroups.length} Groups
                              </span>
                            </div>
                          )}

                          {/* Color dots of first 8 tags */}
                          <div className="flex items-center -space-x-1 ml-auto">
                            {tpl.tags.slice(0, 7).map((t, idx) => (
                              <div
                                key={idx}
                                className="w-3 h-3 rounded-full border border-[#141416]"
                                style={{ backgroundColor: t.color }}
                                title={t.name}
                              />
                            ))}
                            {tpl.tags.length > 7 && (
                              <div className="w-3.5 h-3.5 rounded-full bg-[#2a2a30] text-[8px] font-bold text-gray-300 flex items-center justify-center border border-[#141416]">
                                +{tpl.tags.length - 7}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Sample tags badges */}
                        <div className="flex items-center gap-1 flex-wrap mb-3">
                          {tpl.tags.slice(0, 4).map((t) => (
                            <span
                              key={t.id}
                              className="text-[9.5px] px-1.5 py-0.5 rounded bg-[#1e1e24] text-gray-300 border border-[#2c2c36] truncate max-w-[100px]"
                            >
                              {t.name}
                            </span>
                          ))}
                          {tpl.tags.length > 4 && (
                            <span className="text-[9px] text-gray-500">
                              +{tpl.tags.length - 4} more
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Delete Confirmation Box */}
                      {isDeleting ? (
                        <div className="p-2 bg-red-950/60 border border-red-800/80 rounded-lg flex items-center justify-between gap-2 mt-2">
                          <span className="text-[11px] font-medium text-red-200">Delete this preset?</span>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleDeleteTemplate(tpl.id)}
                              className="px-2 py-0.5 bg-red-600 hover:bg-red-500 text-white rounded text-[10px] font-bold"
                            >
                              Yes, Delete
                            </button>
                            <button
                              onClick={() => setDeleteConfirmId(null)}
                              className="px-2 py-0.5 bg-[#333] hover:bg-[#444] text-gray-300 rounded text-[10px]"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        /* Action Buttons (Replace vs Merge) */
                        <div className="flex items-center gap-2 pt-2 border-t border-[#26262e]">
                          <button
                            onClick={() => {
                              onApplyTemplate({
                                tags: tpl.tags,
                                labels: tpl.labels,
                                labelGroups: tpl.labelGroups || [],
                                name: tpl.name
                              }, 'replace');
                              if (showNotification) showNotification(`Loaded "${tpl.name}" setup!`, '#c6ff1f');
                              onClose();
                            }}
                            className="flex-1 py-1.5 px-2 bg-[#25252c] hover:bg-[#c6ff1f] text-gray-200 hover:text-black rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 group"
                          >
                            <Sparkles className="w-3.5 h-3.5 text-[#c6ff1f] group-hover:text-black transition-colors" />
                            <span>Load Template</span>
                          </button>
                          <button
                            onClick={() => {
                              onApplyTemplate({
                                tags: tpl.tags,
                                labels: tpl.labels,
                                labelGroups: tpl.labelGroups || [],
                                name: tpl.name
                              }, 'merge');
                              if (showNotification) showNotification(`Merged "${tpl.name}" into current setup!`, '#c6ff1f');
                              onClose();
                            }}
                            className="py-1.5 px-2.5 bg-[#1b1b20] hover:bg-[#25252c] text-gray-400 hover:text-white rounded-lg text-xs font-medium border border-[#2b2b34] transition-all"
                            title="Add non-duplicate tags and labels to your current setup"
                          >
                            + Merge
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {allDisplayTemplates.length === 0 && (
                <div className="py-12 text-center text-gray-500">
                  <Folder className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No templates found matching "{searchQuery}".</p>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: SAVE CURRENT SETUP */}
          {activeTab === 'save' && (
            <div className="max-w-xl mx-auto space-y-5 py-4">
              <div className="p-4 bg-[#18181d] border border-[#2c2c36] rounded-xl space-y-3">
                <div className="flex items-center gap-2">
                  <Save className="w-4 h-4 text-[#c6ff1f]" />
                  <h4 className="text-sm font-bold text-white">Save Current Setup as Preset</h4>
                </div>
                <p className="text-xs text-gray-400">
                  Store your current project's tags, labels, and groups into your browser library so you can instantly load them into any current or future match project.
                </p>

                {/* Summary of what will be saved */}
                <div className="grid grid-cols-3 gap-2 py-2">
                  <div className="p-2.5 bg-[#121215] rounded-lg border border-[#25252c] text-center">
                    <span className="text-xs text-gray-400 block mb-0.5">Tags</span>
                    <span className="text-lg font-bold text-[#c6ff1f]">{currentTags.length}</span>
                  </div>
                  <div className="p-2.5 bg-[#121215] rounded-lg border border-[#25252c] text-center">
                    <span className="text-xs text-gray-400 block mb-0.5">Labels</span>
                    <span className="text-lg font-bold text-cyan-400">{currentLabels.length}</span>
                  </div>
                  <div className="p-2.5 bg-[#121215] rounded-lg border border-[#25252c] text-center">
                    <span className="text-xs text-gray-400 block mb-0.5">Groups</span>
                    <span className="text-lg font-bold text-amber-400">{currentLabelGroups.length}</span>
                  </div>
                </div>

                {/* Form */}
                <div className="space-y-3 pt-2">
                  <div>
                    <label className="text-xs font-semibold text-gray-300 block mb-1">
                      Template / Preset Name *
                    </label>
                    <input
                      type="text"
                      value={saveName}
                      onChange={(e) => setSaveName(e.target.value)}
                      placeholder="e.g. 4-3-3 Matchday Analysis, Pressing Matrix..."
                      className="w-full px-3 py-2 text-sm bg-[#121215] border border-[#33333d] rounded-lg text-white focus:border-[#c6ff1f] outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-gray-300 block mb-1">
                      Description (Optional)
                    </label>
                    <textarea
                      value={saveDescription}
                      onChange={(e) => setSaveDescription(e.target.value)}
                      placeholder="Add notes about what scenarios this setup is tailored for..."
                      rows={2}
                      className="w-full px-3 py-2 text-xs bg-[#121215] border border-[#33333d] rounded-lg text-white focus:border-[#c6ff1f] outline-none resize-none"
                    />
                  </div>

                  {overwriteConfirmId && (
                    <div className="p-3 bg-amber-950/60 border border-amber-700/80 rounded-lg flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                        <span className="text-xs text-amber-200">
                          A template with this name already exists. Overwrite it?
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => handleSaveCurrent(overwriteConfirmId)}
                          className="px-2.5 py-1 bg-amber-600 hover:bg-amber-500 text-white rounded text-xs font-bold"
                        >
                          Overwrite
                        </button>
                        <button
                          onClick={() => setOverwriteConfirmId(null)}
                          className="px-2.5 py-1 bg-[#333] hover:bg-[#444] text-gray-300 rounded text-xs"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-2 pt-2">
                    <button
                      onClick={() => handleSaveCurrent()}
                      className="flex-1 py-2 px-4 bg-[#c6ff1f] hover:bg-[#b0e619] text-black font-bold text-xs rounded-lg transition-all flex items-center justify-center gap-2 shadow-md"
                    >
                      <Save className="w-4 h-4" />
                      <span>Save To Templates Library</span>
                    </button>
                    <button
                      onClick={handleExportCurrent}
                      className="py-2 px-4 bg-[#222228] hover:bg-[#2c2c34] text-gray-200 hover:text-white font-medium text-xs rounded-lg transition-colors border border-[#33333d] flex items-center gap-1.5"
                    >
                      <Download className="w-4 h-4" />
                      <span>Export File Only</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: IMPORT & EXPORT JSON */}
          {activeTab === 'import-export' && (
            <div className="max-w-2xl mx-auto space-y-6 py-4">
              {/* Unified Export Banner */}
              <div className="p-4 bg-[#18181d] border border-[#2b2b34] rounded-xl flex items-center justify-between flex-wrap gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <FileDown className="w-4 h-4 text-[#c6ff1f]" />
                    <h4 className="text-sm font-bold text-white">Export All-in-One Template (JSON)</h4>
                  </div>
                  <p className="text-xs text-gray-400">
                    Downloads a single clean JSON file containing all {currentTags.length} tags and {currentLabels.length} labels with groups and shortcuts.
                  </p>
                </div>
                <button
                  onClick={handleExportCurrent}
                  className="px-4 py-2 bg-[#c6ff1f] hover:bg-[#b0e619] text-black text-xs font-bold rounded-lg transition-all flex items-center gap-2 shadow-sm"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Setup JSON</span>
                </button>
              </div>

              {/* Unified Import Dropzone / Button */}
              <div className="p-6 bg-[#18181d] border-2 border-dashed border-[#33333d] hover:border-[#c6ff1f]/50 rounded-xl text-center space-y-3 transition-colors">
                <div className="w-12 h-12 rounded-full bg-[#222228] flex items-center justify-center mx-auto text-[#c6ff1f]">
                  <FileUp className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">Import Coding Setup or Pad File</h4>
                  <p className="text-xs text-gray-400 mt-1 max-w-md mx-auto">
                    Supports TacStem All-in-One Templates, Advanced Coding Pad JSON, or legacy tags/labels files. Both tags and labels will be extracted and synced!
                  </p>
                </div>

                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileInputChange}
                  accept=".json"
                  className="hidden"
                />

                <div className="pt-2">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="px-5 py-2.5 bg-[#25252c] hover:bg-[#303038] text-white text-xs font-bold rounded-lg transition-all border border-[#3b3b46] inline-flex items-center gap-2 shadow-md"
                  >
                    <Upload className="w-4 h-4 text-[#c6ff1f]" />
                    <span>Select JSON File</span>
                  </button>
                </div>
              </div>

              {/* Supported formats info */}
              <div className="p-3 bg-[#111114] border border-[#222228] rounded-xl text-xs text-gray-400 space-y-1.5">
                <div className="flex items-center gap-1.5 text-gray-300 font-semibold">
                  <Info className="w-3.5 h-3.5 text-[#c6ff1f]" />
                  <span>Supported File Formats</span>
                </div>
                <ul className="list-disc list-inside space-y-0.5 pl-1 text-[11.5px] text-gray-400">
                  <li><strong className="text-gray-200">TacStem Normal Coding Template:</strong> Full setup with tags + labels + groups.</li>
                  <li><strong className="text-gray-200">TacStem Advanced Coding Pad:</strong> Full interactive matrix files (all tags, labels, and layouts).</li>
                  <li><strong className="text-gray-200">Legacy Tags File:</strong> Standard tags array JSON.</li>
                  <li><strong className="text-gray-200">Legacy Labels File:</strong> Standard labels and groups JSON.</li>
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Pending Import Modal / Overlay */}
        <AnimatePresence>
          {pendingImport && (
            <div className="fixed inset-0 z-[130] flex items-center justify-center bg-black/80 p-4">
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-[#18181c] border border-[#33333d] rounded-2xl w-full max-w-lg p-5 shadow-2xl space-y-4"
              >
                <div className="flex items-center justify-between border-b border-[#2b2b34] pb-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-[#c6ff1f]" />
                    <h3 className="font-bold text-sm text-white">Confirm Template Import</h3>
                  </div>
                  <button
                    onClick={() => setPendingImport(null)}
                    className="text-gray-400 hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="p-3 bg-[#121215] border border-[#25252c] rounded-xl space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-400">File Name:</span>
                    <span className="font-bold text-white truncate max-w-[250px]">
                      {pendingImport.sourceFile}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-400">Detected Template:</span>
                    <span className="font-bold text-[#c6ff1f]">{pendingImport.name}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 pt-2">
                    <div className="p-2 bg-[#1a1a20] rounded border border-[#2b2b36] text-center">
                      <span className="text-[10px] text-gray-400 block">Tags</span>
                      <span className="text-base font-bold text-[#c6ff1f]">
                        {pendingImport.tags.length}
                      </span>
                    </div>
                    <div className="p-2 bg-[#1a1a20] rounded border border-[#2b2b36] text-center">
                      <span className="text-[10px] text-gray-400 block">Labels</span>
                      <span className="text-base font-bold text-cyan-400">
                        {pendingImport.labels.length}
                      </span>
                    </div>
                    <div className="p-2 bg-[#1a1a20] rounded border border-[#2b2b36] text-center">
                      <span className="text-[10px] text-gray-400 block">Groups</span>
                      <span className="text-base font-bold text-amber-400">
                        {pendingImport.labelGroups.length}
                      </span>
                    </div>
                  </div>
                </div>

                <p className="text-xs text-gray-300">
                  How would you like to apply these tags and labels to your current match project?
                </p>

                <div className="space-y-2">
                  <button
                    onClick={() => executeImport('replace', true)}
                    className="w-full py-2.5 px-4 bg-[#c6ff1f] hover:bg-[#b0e619] text-black font-bold text-xs rounded-xl flex items-center justify-between transition-all"
                  >
                    <span>Replace Entire Current Setup & Save to Presets</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => executeImport('merge', true)}
                    className="w-full py-2.5 px-4 bg-[#25252c] hover:bg-[#303038] text-white font-semibold text-xs rounded-xl flex items-center justify-between border border-[#3b3b46] transition-all"
                  >
                    <span>Merge with Current Setup (Keep Existing)</span>
                    <Plus className="w-4 h-4 text-[#c6ff1f]" />
                  </button>

                  <button
                    onClick={() => setPendingImport(null)}
                    className="w-full py-1.5 text-center text-xs text-gray-400 hover:text-white"
                  >
                    Cancel
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};
