export type ToolType = 'move' | 'pen' | 'line' | 'arrow' | 'curved-arrow' | 'curved-run-arrow' | 'circle' | 'polygon' | 'scanner' | 'connected-circle' | 'masking' | 'player-move' | 'spotlight' | 'lens' | 'name-tag' | 'text' | 'eraser' | 'radar' | null;

export interface Point {
  x: number;
  y: number;
  r?: number;
  timestamp?: number;
}

export interface Rect {
    x: number;
    y: number;
    w: number;
    h: number;
}

export interface Particle {
  initialAngle: number;
  speed: number;
}

export interface ScannerConfig {
  length: number;
  baseAngle: number;
  sweepRange: number;
  sweepSpeed: number;
  fov: number;
  sweepPhase?: number;
  jitterSeed?: number;
  team?: number;
  showSweepBounds?: boolean;
  showCenterAxis?: boolean;
  showOriginEye?: boolean;
  showHandles?: boolean;
  isPaused?: boolean;
  label?: string;
}

export interface Shape {
  id: string;
  type: ToolType;
  points: Point[];
  color: string;
  strokeWidth: number;
  text?: string;
  isClosed?: boolean; 
  isFilled?: boolean; 
  isDashed?: boolean; 
  isFreehand?: boolean; 
  isCurved?: boolean;
  img?: ImageBitmap | HTMLCanvasElement; 
  bgImg?: ImageBitmap | HTMLCanvasElement; 
  box?: Rect; 
  timestamp: number; 
  freezeFrameId?: string;
  animStart?: number;
  animEnd?: number;
  spotlightConfig?: {
    size: number;
    intensity: number;
    rotation: number;
    particles: Particle[];
  };
  lensConfig?: {
      radius: number;
      zoom: number;
  };
  ringConfig?: {
      tilt: number; 
      size?: number;
      isFilled?: boolean;
      outlineColor?: string;
      secondaryRing?: boolean;
      secondaryColor?: string;
  };
  textConfig?: {
      bgEnabled: boolean;
      bgColor: string;
      animation: 'none' | 'fade' | 'scale' | 'type';
      fontSize: number;
  };
  polygonConfig?: PolygonConfig;
  radarConfig?: RadarConfig;
  scannerConfig?: ScannerConfig;
  playerNumber?: string;
  nameTagConfig?: {
    playerNumber?: string;
    style?: 'broadcast' | 'minimal' | 'badge';
    uppercase?: boolean;
    showNumber?: boolean;
  };
}

export interface PlayerTagItem {
  id: string;
  text: string;
  name?: string;
  number?: string;
}

export interface PlayerTagTeam {
  name: string;
  colorId: number;
  names: PlayerTagItem[];
  bulkText?: string;
}

export interface PlayerTagSettings {
  teamA: PlayerTagTeam;
  teamB: PlayerTagTeam;
  activeTeam: 'A' | 'B';
  activeId: string | null;
  size: number;
  style?: 'broadcast' | 'minimal' | 'badge';
  uppercase?: boolean;
  showNumber?: boolean;
}

export type PolygonToolMode = 'polygon' | 'radar';
export type PolygonFillStyle = 'none' | 'fill' | 'stripe';

export interface RadarDot {
  angle: number;
  distRatio: number;
  size: number;
  blinkSpeed: number;
  blinkOffset: number;
}

export interface RadarConfig {
  radius: number;
  tilt?: number;
  fillOpacity?: number;
  sweepSpeed?: number;
  showBlips?: boolean;
  showCrosshair?: boolean;
  showGlow?: boolean;
  showRings?: boolean;
  showBroadcastHud?: boolean;
  dots?: RadarDot[];
  seed?: number;
}

export interface PolygonConfig {
  mode?: PolygonToolMode;
  fillStyle?: PolygonFillStyle;
  radarConfig?: RadarConfig;
}

export interface FreezeFrame {
    id: string;
    timestamp: number;
    duration: number;
    name?: string;
}

export interface ColorPreset {
  id: number;
  value: string;
}

export interface MaskSettings {
  enabled: boolean;
  sensitivity: number;
  showOverlay: boolean;
  keyColor?: string;
  keyColors?: string[];
  smoothness?: number;
}

export interface MaskLayerCache {
  foreground: ImageBitmap | null; 
  overlay: ImageBitmap | null;    
  timestamp: number;
  processedAt: number;
}

export interface TimelineMarker {
  id: string;
  time: number;
  label: string;
  color: string;
}

export interface Tag {
  id: string;
  name: string;
  color: string;
  shortcut: string;
  leadLagEnabled?: boolean;
  preTime?: number;
  postTime?: number;
}

export interface TagEvent {
  id: string;
  tagId: string;
  startTime: number;
  endTime: number;
  notes?: string;
  labelIds?: string[];
  periodId?: string;
  matchStart?: number;
  matchEnd?: number;
}

export interface ActiveRecording {
  tagId: string;
  startTime: number;
  labelIds?: string[];
  matchStartTime?: number;
}

export interface PlaylistClip {
  instanceId: string;
  eventId: string;
  projectId?: string;
  projectName?: string;
  inPoint?: number;
  outPoint?: number;
  notes?: string;
}

export type PlaylistItem = string | PlaylistClip;

export interface Playlist {
  id: string;
  name: string;
  events: PlaylistItem[]; 
}

export interface LabelGroup {
  id: string;
  name: string;
}

export interface Label {
  id: string;
  name: string;
  groupId?: string;
  shortcut?: string;
  exclusive?: boolean;
}

export interface LabelEvent {
  id: string;
  labelId: string;
  startTime: number;
  endTime: number;
  notes?: string;
}

// --- Code File Types ---

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

// --- Project Types ---

export interface AdvancedPadItem {
  id: string;
  type: 'tag' | 'label' | 'text' | 'image';
  x: number;
  y: number;
  width: number;
  height: number;
  content?: string;
  src?: string;
  color?: string;
  fontSize?: number;
  rotation?: number;
  zIndex?: number;
}

export interface SmartConnector {
  id: string;
  sourceId: string;
  targetId: string;
  type: 'exclusive' | 'trigger' | 'defuse' | 'assign';
  enabled: boolean;
}

export interface PeriodSync {
  id: '1st-half' | '2nd-half' | 'et-1st' | 'et-2nd' | 'penalties';
  name: string;
  videoTimeSeconds: number;
  needsVideoSync?: boolean;
}

export interface ProjectData {
  shapes: Shape[];
  freezeFrames: FreezeFrame[];
  tags: Tag[];
  labelGroups?: LabelGroup[];
  labels?: Label[];
  labelEvents?: LabelEvent[];
  tagEvents: TagEvent[];
  playlists: Playlist[];
  markers: TimelineMarker[];
  presetTexts?: {id: string, text: string}[];
  projectNotes?: string;
  advancedPadItems?: AdvancedPadItem[];
  connectors?: SmartConnector[];
  periodSyncs?: PeriodSync[];
  liveTime?: number;
  maskSettings?: MaskSettings;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  createdAt: number;
  lastModified: number;
  fileName?: string;
  favourite?: boolean;
  data: ProjectData;
}

export interface Batch {
  id: string;
  name: string;
  description: string;
  createdAt: number;
  lastModified: number;
  projectIds: string[];
  favourite?: boolean;
  playlists?: Playlist[];
}

export interface BoardProject {
  id: string;
  name: string;
  description: string;
  createdAt: number;
  lastModified: number;
  favourite?: boolean;
  slideCount?: number;
  pitchView?: string;
  pitchTemplate?: string;
  homeTeamColor?: string;
  awayTeamColor?: string;
  formation?: string;
  data: any;
}

