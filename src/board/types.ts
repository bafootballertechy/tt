
export enum TeamSide {
  HOME = 'HOME',
  AWAY = 'AWAY',
  NEUTRAL = 'NEUTRAL'
}

export enum PlayerRole {
  MAIN = 'MAIN',
  SUB = 'SUB'
}

export interface Player {
  id: string;
  number: string;
  name: string;
  positionLabel?: string; // e.g. "CB", "ST"
  role: PlayerRole;
  isOnField: boolean;
  color?: string; // Individual player color override
  lastPos?: { x: number, y: number, rotation?: number, scale?: number }; // To remember position
}

export interface TeamCoinSettings {
  name?: string;
  color?: string;
  secondaryColor?: string;
  logo?: string;
  showName: boolean;
  showNumber: boolean;
  showPositionLabel: boolean;
  shape: 'circle' | 'semicircle' | 'crescent' | 'jersey' | 'coins' | 'pucks' | 'shirts' | 'minis' | 'domes' | 'meeples' | 'badges' | 'holo' | 'tactic' | 'logo';
  orientation: 'normal' | 'inverted' | 'vertical';
}

export interface Team {
  id: TeamSide;
  name: string;
  color: string;
  secondaryColor?: string;
  players: Player[];
  logo?: string; // Data URL
  settings?: TeamCoinSettings;
}

export enum ToolType {
  SELECT = 'SELECT',
  PEN = 'PEN',
  ARROW = 'ARROW',
  CURVE_ARROW = 'CURVE_ARROW',
  LINE = 'LINE',
  CIRCLE = 'CIRCLE',
  POLYGON = 'POLYGON',
  ERASER = 'ERASER',
  CONNECTOR = 'CONNECTOR',
  TEXT = 'TEXT',
  BALL = 'BALL',
  CONE = 'CONE',
  DISC = 'DISC',
  GOAL = 'GOAL',
  GOAL_MINI = 'GOAL_MINI',
  GOAL_SIDE = 'GOAL_SIDE',
  MANNEQUIN = 'MANNEQUIN',
  LADDER = 'LADDER',
  HURDLE = 'HURDLE',
  POLE = 'POLE'
}

export interface Point {
  x: number;
  y: number;
  attachedToPlayerId?: string;
}

export interface Drawing {
  id: string;
  type: ToolType;
  points: Point[];
  color: string;
  props?: any;
  text?: string;
  animationOrder?: number;
}

export interface PlayerVisuals {
  rotation?: number; // degrees
  scale?: number; // default 1
  borderColor?: string;
  namePos?: 'top' | 'bottom';
  showName?: boolean | null;
  showNumber?: boolean | null;
  showPositionLabel?: boolean | null;
}

export interface PlayerPosition extends Point, PlayerVisuals {
  motionPath?: Point[]; // Optional array of control points for curving the movement from the previous slide
  animationOrder?: number;
}

// Position map: key is player ID, value is position
export type PlayerPositions = Record<string, PlayerPosition>;

export interface Slide {
  id: string;
  name: string;
  duration: number; // in seconds
  positions: PlayerPositions;
  drawings: Drawing[];
  note?: string;
  camera?: {
    rotateX: number;
    rotateY: number;
    rotateZ: number;
    zoom: number;
    panX?: number;
    panY?: number;
  };
  transitionSpeed?: number;
  stepDuration?: number;
  stepDelay?: number;
  coinSettings?: CoinSettings;
  teamSettings?: {
    [TeamSide.HOME]?: TeamCoinSettings;
    [TeamSide.AWAY]?: TeamCoinSettings;
    [TeamSide.NEUTRAL]?: TeamCoinSettings;
  };
  layerVisibility?: Record<string, boolean>;
  layerOrder?: string[];
}

export type LayerType = 'HOME' | 'AWAY' | 'EQUIPMENT' | 'DRAWINGS';

export interface TrailSettings {
  enabled: boolean;
  style: 'solid' | 'dashed' | 'dotted';
  color: string;
  opacity: number;
  thickness?: number;
}

export enum PitchView {
  PERSPECTIVE = 'PERSPECTIVE',
  HORIZONTAL = 'HORIZONTAL',
  VERTICAL = 'VERTICAL',
  HALF = 'HALF',
  TRAINING = 'TRAINING'
}

export interface Project {
  name?: string;
  teams: {
    [TeamSide.HOME]: Team;
    [TeamSide.AWAY]: Team;
    [TeamSide.NEUTRAL]: Team;
  };
  slides: Slide[];
  currentSlideId: string;
  selectedSlideIds: string[]; // For multi-selection
  pitchWidth?: number;
  pitchHeight?: number;
  aspectRatio?: '16:9' | '4:3' | '1:1' | '9:16' | '21:9' | 'custom' | 'default';
  pitchView?: PitchView;
}

export enum PitchTemplate {
  // New templates based on HTML request
  THEME_CLASSIC = 'theme-classic',
  THEME_CHECKER = 'theme-checker',
  THEME_FRESH = 'theme-fresh',
  THEME_DIAGONAL = 'theme-diagonal',
  THEME_WORN = 'theme-worn',
  THEME_RINGS = 'theme-rings',
  THEME_DIAMOND = 'theme-diamond',
  THEME_CONTOUR = 'theme-contour',
  THEME_HEX = 'theme-hex',
  THEME_NIGHT = 'theme-night',
  THEME_VAPOR = 'theme-vapor',
  THEME_HOLO = 'theme-holo',
  THEME_CHALK = 'theme-chalk',
  THEME_BLUEPRINT = 'theme-blueprint',
  THEME_SASH = 'theme-sash',
  THEME_MINIMAL = 'theme-minimal',
  THEME_WINTER = 'theme-winter',
  THEME_RETRO = 'theme-retro'
}

export interface CoinSettings {
  showName: boolean;
  showNumber: boolean;
  showPositionLabel: boolean;
  shape: 'circle' | 'semicircle' | 'crescent' | 'jersey' | 'coins' | 'pucks' | 'shirts' | 'minis' | 'domes' | 'meeples' | 'badges' | 'holo' | 'tactic' | 'logo';
  orientation: 'normal' | 'inverted' | 'vertical';
  globalScale: number;
  globalTextScale: number;
  globalNamePos: 'top' | 'bottom';
  trails: TrailSettings;
  motionPaths: {
    enabled: boolean;
    color: string;
    thickness?: number;
  };
}

export interface CompiledAnimation {
  durationMs: number;
  camDurationMs: number;
  hasAnimSteps: boolean;
  players: Record<string, { startTimeMs: number; endTimeMs: number }>;
  drawings: Record<string, { startTimeMs: number; endTimeMs: number }>;
}
