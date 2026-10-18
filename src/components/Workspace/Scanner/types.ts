export interface ScannerConfig {
  length: number;           // Reach of the scan / distance in px (e.g. 150)
  baseAngle: number;        // Aim angle in radians
  sweepRange: number;       // Total sweep arc in degrees (e.g. 50°)
  sweepSpeed: number;       // Multiplier for sweep speed (e.g. 1.2)
  fov: number;              // Field of vision cone spread in degrees (e.g. 35°)
  sweepPhase?: number;      // Current phase offset
  jitterSeed?: number;      // Seed for subtle natural eye micro-jitter
  team?: number;            // 0: Home, 1: Away, 2: Ref, 3: Tactical/Custom
  showSweepBounds?: boolean;// Whether to show faint dashed sector limit lines
  showCenterAxis?: boolean; // Whether to show faint center aim ray
  showOriginEye?: boolean;  // Whether to draw the turning head/eye icon at player origin
  showHandles?: boolean;    // Range handles (left/right/tip)
  isPaused?: boolean;       // Pause individual scanner sweep
  label?: string;           // Optional text label, e.g. "Scanning Left Flank"
}

export interface ScannerSettings {
  length: number;
  sweepRange: number;
  sweepSpeed: number;
  fov: number;
  team: number;
  showSweepBounds: boolean;
  showCenterAxis: boolean;
  showOriginEye: boolean;
  isPaused: boolean;
}

export const DEFAULT_SCANNER_SETTINGS: ScannerSettings = {
  length: 150,
  sweepRange: 50,
  sweepSpeed: 1.2,
  fov: 35,
  team: 0,
  showSweepBounds: false,
  showCenterAxis: false,
  showOriginEye: true,
  isPaused: false,
};

export interface ScannerTeamColor {
  id: number;
  name: string;
  main: string;
  light: string;
  dark: string;
  rgb: [number, number, number];
}

export const SCANNER_TEAMS: ScannerTeamColor[] = [
  { id: 0, name: 'Home', main: '#1a3a8f', light: '#4a6fd4', dark: '#0d1f5c', rgb: [74, 111, 212] },
  { id: 1, name: 'Away', main: '#d4a017', light: '#f4d03f', dark: '#8b6914', rgb: [244, 208, 63] },
  { id: 2, name: 'Ref', main: '#c0392b', light: '#e74c3c', dark: '#7b241c', rgb: [231, 76, 60] },
  { id: 3, name: 'Tactical', main: '#c6ff1f', light: '#d8ff4f', dark: '#88b800', rgb: [198, 255, 31] },
];
