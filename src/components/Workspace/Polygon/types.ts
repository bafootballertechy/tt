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
  showCompass?: boolean;
  showPillar?: boolean;
  dots?: RadarDot[];
  seed?: number;
}

export interface PolygonSettings {
  mode: PolygonToolMode;
  fillStyle: PolygonFillStyle;
  radarRadius: number;
  radarTilt: number;
  radarFillOpacity: number;
  radarSweepSpeed: number;
  radarShowBlips: boolean;
  radarShowCrosshair: boolean;
  radarShowGlow: boolean;
  radarShowRings: boolean;
  radarShowBroadcastHud?: boolean;
  radarShowCompass?: boolean;
  radarShowPillar?: boolean;
}

export const DEFAULT_POLYGON_SETTINGS: PolygonSettings = {
  mode: 'polygon', // default as polygon
  fillStyle: 'fill',
  radarRadius: 130,
  radarTilt: 65, // default 65 degrees like ring tool to lay on ground
  radarFillOpacity: 0.38, // rich tactical fill opacity
  radarSweepSpeed: 0.025,
  radarShowBlips: true,
  radarShowCrosshair: true,
  radarShowGlow: true,
  radarShowRings: true,
  radarShowBroadcastHud: false, // avoid hud badge
  radarShowCompass: false,
  radarShowPillar: false,
};

