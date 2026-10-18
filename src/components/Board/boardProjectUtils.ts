import { INITIAL_PROJECT, FORMATIONS } from '../../board/constants';
import { TeamSide, Project } from '../../board/types';
import type { BoardProject } from '../../types';

export const PITCH_TEMPLATES = [
  { id: 'theme-classic', name: 'Classic Green', color: '#1a542b', border: '#22c55e' },
  { id: 'theme-night', name: 'Dark Pitch', color: '#091522', border: '#38bdf8' },
  { id: 'theme-blueprint', name: 'Blueprint Tactical', color: '#0f2942', border: '#60a5fa' },
  { id: 'theme-minimal', name: 'Minimal Mono', color: '#18181b', border: '#a1a1aa' },
  { id: 'theme-checker', name: 'Checkerboard', color: '#164e29', border: '#4ade80' },
  { id: 'theme-diamond', name: 'Diamond Grass', color: '#14532d', border: '#86efac' },
  { id: 'theme-contour', name: 'Contour Waves', color: '#064e3b', border: '#34d399' },
  { id: 'theme-winter', name: 'Winter Frost', color: '#1e293b', border: '#93c5fd' },
];

export const STARTER_FORMATIONS = [
  { id: '4-3-3', name: '4-3-3 Attacking' },
  { id: '4-2-3-1', name: '4-2-3-1 Modern' },
  { id: '4-4-2', name: '4-4-2 Classic' },
  { id: '3-5-2', name: '3-5-2 Wingbacks' },
  { id: '5-3-2', name: '5-3-2 Solid Block' },
  { id: 'blank', name: 'Blank (Empty Pitch)' },
];

export const DEFAULT_KIT_COLORS = [
  { name: 'Red', hex: '#ef4444' },
  { name: 'Blue', hex: '#3b82f6' },
  { name: 'Yellow', hex: '#eab308' },
  { name: 'Green', hex: '#22c55e' },
  { name: 'White', hex: '#f8fafc' },
  { name: 'Black', hex: '#0f172a' },
  { name: 'Sky Blue', hex: '#0284c7' },
  { name: 'Orange', hex: '#f97316' },
  { name: 'Purple', hex: '#a855f7' },
  { name: 'Neon Lime', hex: '#c6ff1f' },
];

export const createDefaultBoardProject = (
  name: string,
  description: string = '',
  pitchTemplate: string = 'theme-classic',
  homeColor: string = '#ef4444',
  awayColor: string = '#3b82f6'
): BoardProject => {
  const id = 'board_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8);
  const data: Project = JSON.parse(JSON.stringify(INITIAL_PROJECT));

  data.name = name.trim() || 'Untitled Board Project';
  if (data.teams[TeamSide.HOME]) {
    data.teams[TeamSide.HOME].color = homeColor;
    data.teams[TeamSide.HOME].players.forEach(p => { p.isOnField = false; });
  }
  if (data.teams[TeamSide.AWAY]) {
    data.teams[TeamSide.AWAY].color = awayColor;
    data.teams[TeamSide.AWAY].players.forEach(p => { p.isOnField = false; });
  }
  if (data.teams[TeamSide.NEUTRAL]) {
    data.teams[TeamSide.NEUTRAL].players.forEach(p => { p.isOnField = false; });
  }

  // Ensure clean blank slide 1 with NO placed players (completely blank canvas)
  if (data.slides && data.slides[0]) {
    data.slides[0].positions = {};
    data.slides[0].drawings = [];
  }

  return {
    id,
    name: name.trim() || 'Untitled Board Project',
    description: description.trim(),
    createdAt: Date.now(),
    lastModified: Date.now(),
    favourite: false,
    slideCount: 1,
    pitchTemplate,
    homeTeamColor: homeColor,
    awayTeamColor: awayColor,
    pitchView: 'HORIZONTAL',
    data,
  };
};
