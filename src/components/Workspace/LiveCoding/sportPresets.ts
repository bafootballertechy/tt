import type { SportPreset, MatchPeriodDef } from './types';

// Standard Football / Soccer Match Periods (45m halves, 15m ETs, Penalties)
export const DEFAULT_PERIODS: MatchPeriodDef[] = [
  { id: '1st-half', name: '1st Half', shortLabel: '1H', startOffset: 0, normalDuration: 45 * 60 },
  { id: '2nd-half', name: '2nd Half', shortLabel: '2H', startOffset: 45 * 60, normalDuration: 45 * 60 },
  { id: 'et-1st', name: 'ET 1st Half', shortLabel: 'ET1', startOffset: 90 * 60, normalDuration: 15 * 60 },
  { id: 'et-2nd', name: 'ET 2nd Half', shortLabel: 'ET2', startOffset: 105 * 60, normalDuration: 15 * 60 },
  { id: 'penalties', name: 'Penalties', shortLabel: 'PEN', startOffset: 120 * 60, normalDuration: 0 }
];

export const SPORT_PRESETS: SportPreset[] = [
  {
    id: 'football',
    name: 'Football / Soccer',
    description: '45m halves + Extra Time (15m each) & Penalties',
    periods: DEFAULT_PERIODS
  }
];

