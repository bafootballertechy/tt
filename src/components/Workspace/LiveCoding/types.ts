import type { PeriodSync, Tag, TagEvent } from '../../../types';

export interface MatchPeriodDef {
  id: string;
  name: string;
  shortLabel: string;
  startOffset: number; // in seconds (e.g. 0 for 1st half, 2700 for 2nd half)
  normalDuration: number; // in seconds (e.g. 2700 for 45 mins)
}

export type LiveClockState = 'stopped' | 'running' | 'paused';

export interface SportPreset {
  id: string;
  name: string;
  description: string;
  iconName?: string;
  periods: MatchPeriodDef[];
}

export type LiveCaptureSource = 'none' | 'screen' | 'camera';

export interface LiveClockDetails {
  display: string;
  baseTime: string;
  stoppageTime: string | null;
  hasStoppage: boolean;
  totalSecondsInPeriod: number;
  periodProgressPercent: number;
  isOvertime: boolean;
  matchTimeSeconds: number;
  periodStartOffset: number;
  periodNormalDuration: number;
  periodId?: string;
  stoppageMinutes?: number;
  compactDisplay?: string;
}

export interface LiveCodingStats {
  totalEvents: number;
  eventsInCurrentPeriod: number;
  eventsByTag: Record<string, number>;
  recentEvents: TagEvent[];
}
