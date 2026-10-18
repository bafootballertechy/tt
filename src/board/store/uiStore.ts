import { create } from 'zustand';
import { TeamSide, ToolType, PitchTemplate } from '../types';

interface UIState {
  activeLeftTab: TeamSide | 'EQUIPMENT';
  setActiveLeftTab: (tab: TeamSide | 'EQUIPMENT') => void;
  
  activeTool: ToolType;
  setActiveTool: (tool: ToolType) => void;
  
  drawingColor: string;
  setDrawingColor: (color: string) => void;
  
  customColors: string[];
  setCustomColors: (colors: string[]) => void;
  
  drawingStrokeWidth: number;
  setDrawingStrokeWidth: (width: number) => void;
  
  drawingStrokeStyle: 'solid' | 'dashed' | 'dribbling';
  setDrawingStrokeStyle: (style: 'solid' | 'dashed' | 'dribbling') => void;
  
  drawingFillStyle: 'none' | 'solid' | 'stripes';
  setDrawingFillStyle: (style: 'none' | 'solid' | 'stripes') => void;
  
  drawingFontFamily: string;
  setDrawingFontFamily: (font: string) => void;
  
  drawingTextSize: number;
  setDrawingTextSize: (size: number) => void;
  
  attachToPlayer: boolean;
  setAttachToPlayer: (attach: boolean) => void;
  
  equipmentAngle: number;
  setEquipmentAngle: (angle: number) => void;
  
  equipmentScale: number;
  setEquipmentScale: (scale: number) => void;
  
  backgroundImage: string | null;
  setBackgroundImage: (image: string | null) => void;
  
  pitchTemplate: PitchTemplate;
  setPitchTemplate: (template: PitchTemplate) => void;
  
  editingPlayerIds: string[];
  setEditingPlayerIds: (ids: string[]) => void;
  
  isFullscreen: boolean;
  setIsFullscreen: (full: boolean) => void;
  
  showLayerManager: boolean;
  setShowLayerManager: (show: boolean) => void;
  
  showNewProjectConfirm: boolean;
  setShowNewProjectConfirm: (show: boolean) => void;
  showPanels: boolean;
  setShowPanels: (show: boolean) => void;
}

export const useUIStore = create<UIState>((set) => ({
  activeLeftTab: TeamSide.HOME,
  setActiveLeftTab: (tab) => set({ activeLeftTab: tab }),
  
  activeTool: ToolType.SELECT,
  setActiveTool: (tool) => set({ activeTool: tool }),
  
  drawingColor: '#ffffff',
  setDrawingColor: (color) => set({ drawingColor: color }),
  
  customColors: ['#ffffff', '#facc15', '#ef4444', '#3b82f6', '#000000', '#22c55e', '#ff8a00'],
  setCustomColors: (colors) => set({ customColors: colors }),
  
  drawingStrokeWidth: 4,
  setDrawingStrokeWidth: (width) => set({ drawingStrokeWidth: width }),
  
  drawingStrokeStyle: 'solid',
  setDrawingStrokeStyle: (style) => set({ drawingStrokeStyle: style }),
  
  drawingFillStyle: 'none',
  setDrawingFillStyle: (style) => set({ drawingFillStyle: style }),
  
  drawingFontFamily: '"Gotham", system-ui, sans-serif',
  setDrawingFontFamily: (font) => set({ drawingFontFamily: font }),
  
  drawingTextSize: 28,
  setDrawingTextSize: (size) => set({ drawingTextSize: size }),
  
  attachToPlayer: false,
  setAttachToPlayer: (attach) => set({ attachToPlayer: attach }),
  
  equipmentAngle: 0,
  setEquipmentAngle: (angle) => set({ equipmentAngle: angle }),
  
  equipmentScale: 1,
  setEquipmentScale: (scale) => set({ equipmentScale: scale }),
  
  backgroundImage: null,
  setBackgroundImage: (image) => set({ backgroundImage: image }),
  
  pitchTemplate: PitchTemplate.THEME_FRESH,
  setPitchTemplate: (template) => set({ pitchTemplate: template }),
  
  editingPlayerIds: [],
  setEditingPlayerIds: (ids) => set({ editingPlayerIds: ids }),
  
  isFullscreen: false,
  setIsFullscreen: (full) => set({ isFullscreen: full }),
  
  showLayerManager: false,
  setShowLayerManager: (show) => set({ showLayerManager: show }),
  
  showNewProjectConfirm: false,
  setShowNewProjectConfirm: (show) => set({ showNewProjectConfirm: show }),
  showPanels: true,
  setShowPanels: (show) => set({ showPanels: show }),
}));
