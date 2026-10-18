
import { Player, PlayerRole, Project, TeamSide, ToolType, Point, PitchView } from "./types";

export const PITCH_WIDTH = 800;
export const PITCH_HEIGHT = 450;

export const INITIAL_PLAYER_POSITIONS = {
  [TeamSide.HOME]: { x: 100, y: PITCH_HEIGHT / 2 },
  [TeamSide.AWAY]: { x: PITCH_WIDTH - 100, y: PITCH_HEIGHT / 2 },
  [TeamSide.NEUTRAL]: { x: PITCH_WIDTH / 2, y: PITCH_HEIGHT / 2 },
};

const createPlayers = (side: TeamSide): Player[] => {
  if (side === TeamSide.NEUTRAL) {
    return []; // Neutral pool starts empty
  }
  const players: Player[] = [];
  // 11 Main players
  for (let i = 1; i <= 11; i++) {
    players.push({
      id: `${side}-main-${i}`,
      number: i.toString(),
      name: `Player ${i}`,
      positionLabel: '',
      role: PlayerRole.MAIN,
      isOnField: false,
    });
  }
  // 9 Subs
  for (let i = 12; i <= 20; i++) {
    players.push({
      id: `${side}-sub-${i}`,
      number: i.toString(),
      name: `Sub ${i}`,
      positionLabel: '',
      role: PlayerRole.SUB,
      isOnField: false,
    });
  }
  return players;
};

const defaultTeamSettings = {
  showName: true,
  showNumber: true,
  showPositionLabel: false,
  shape: 'circle' as const,
  orientation: 'normal' as const,
};

export const INITIAL_PROJECT: Project = {
  teams: {
    [TeamSide.HOME]: {
      id: TeamSide.HOME,
      name: "Home Team",
      color: "#ef4444", // Red
      players: createPlayers(TeamSide.HOME),
      settings: { ...defaultTeamSettings }
    },
    [TeamSide.AWAY]: {
      id: TeamSide.AWAY,
      name: "Away Team",
      color: "#3b82f6", // Blue
      players: createPlayers(TeamSide.AWAY),
      settings: { ...defaultTeamSettings }
    },
    [TeamSide.NEUTRAL]: {
      id: TeamSide.NEUTRAL,
      name: "Neutral Pool",
      color: "#eab308", // Yellow
      players: createPlayers(TeamSide.NEUTRAL),
      settings: { ...defaultTeamSettings }
    },
  },
  slides: [
    {
      id: "slide-1",
      name: "Slide 1",
      duration: 5, // Default 5 seconds
      positions: {},
      drawings: [],
      transitionSpeed: 0.5,
      coinSettings: {
        showName: true,
        showNumber: true,
        showPositionLabel: false,
        shape: 'circle',
        globalScale: 1,
        globalTextScale: 1,
        globalNamePos: 'bottom',
        orientation: 'normal',
        trails: {
          enabled: false,
          style: 'dashed',
          color: '#fbbf24',
          opacity: 0.6
        },
        motionPaths: {
          enabled: true,
          color: '#ef4444'
        }
      }
    },
  ],
  currentSlideId: "slide-1",
  selectedSlideIds: ["slide-1"],
  pitchWidth: 800,
  pitchHeight: 450,
  aspectRatio: '16:9',
  pitchView: PitchView.PERSPECTIVE,
};

export const TOOL_LABELS = {
  [ToolType.SELECT]: "Move",
  [ToolType.PEN]: "Pen",
  [ToolType.ARROW]: "Arrow",
  [ToolType.CURVE_ARROW]: "Curve Arrow",
  [ToolType.LINE]: "Line",
  [ToolType.CIRCLE]: "Circle",
  [ToolType.POLYGON]: "Polygon",
  [ToolType.ERASER]: "Eraser",
  [ToolType.CONNECTOR]: "Connect",
  [ToolType.TEXT]: "Text",
  [ToolType.BALL]: "Ball",
  [ToolType.CONE]: "Cone",
  [ToolType.DISC]: "Disc",
  [ToolType.GOAL]: "Goal",
  [ToolType.GOAL_MINI]: "Mini Goal",
  [ToolType.GOAL_SIDE]: "Side Goal",
  [ToolType.MANNEQUIN]: "Mannequin",
  [ToolType.LADDER]: "Ladder",
  [ToolType.HURDLE]: "Hurdle",
  [ToolType.POLE]: "Pole",
};

// Formations (x, y) relative to Home side (Left, 0-400 width)
// Points ordered: GK, Defenders (Top-Bottom), Midfielders, Forwards
export const FORMATIONS: Record<string, Point[]> = {
  '4-4-2': [
    { x: 40, y: 275 }, // GK
    { x: 120, y: 80 }, { x: 110, y: 210 }, { x: 110, y: 340 }, { x: 120, y: 470 }, // Def
    { x: 250, y: 80 }, { x: 250, y: 210 }, { x: 250, y: 340 }, { x: 250, y: 470 }, // Mid
    { x: 350, y: 200 }, { x: 350, y: 350 } // Fwd
  ],
  '4-3-3': [
    { x: 40, y: 275 }, // GK
    { x: 120, y: 80 }, { x: 110, y: 210 }, { x: 110, y: 340 }, { x: 120, y: 470 }, // Def
    { x: 220, y: 150 }, { x: 200, y: 275 }, { x: 220, y: 400 }, // Mid
    { x: 350, y: 100 }, { x: 350, y: 275 }, { x: 350, y: 450 } // Fwd
  ],
  '4-2-3-1': [
    { x: 40, y: 275 }, // GK
    { x: 120, y: 80 }, { x: 110, y: 210 }, { x: 110, y: 340 }, { x: 120, y: 470 }, // Def
    { x: 200, y: 200 }, { x: 200, y: 350 }, // CDM
    { x: 300, y: 100 }, { x: 300, y: 275 }, { x: 300, y: 450 }, // AM
    { x: 380, y: 275 } // ST
  ],
  '3-5-2': [
    { x: 40, y: 275 }, // GK
    { x: 120, y: 150 }, { x: 100, y: 275 }, { x: 120, y: 400 }, // CB
    { x: 220, y: 50 }, { x: 220, y: 170 }, { x: 200, y: 275 }, { x: 220, y: 380 }, { x: 220, y: 500 }, // Mid/WB
    { x: 350, y: 200 }, { x: 350, y: 350 } // Fwd
  ],
  '5-3-2': [
    { x: 40, y: 275 }, // GK
    { x: 150, y: 50 }, { x: 120, y: 160 }, { x: 100, y: 275 }, { x: 120, y: 390 }, { x: 150, y: 500 }, // Def
    { x: 240, y: 150 }, { x: 220, y: 275 }, { x: 240, y: 400 }, // Mid
    { x: 350, y: 200 }, { x: 350, y: 350 } // Fwd
  ],
  '4-1-2-1-2 (Diamond)': [
    { x: 40, y: 275 }, // GK
    { x: 120, y: 80 }, { x: 110, y: 210 }, { x: 110, y: 340 }, { x: 120, y: 470 }, // Def
    { x: 180, y: 275 }, // CDM
    { x: 260, y: 150 }, { x: 260, y: 400 }, // LM/RM
    { x: 320, y: 275 }, // CAM
    { x: 380, y: 200 }, { x: 380, y: 350 } // ST
  ],
  '3-4-3': [
    { x: 40, y: 275 }, // GK
    { x: 120, y: 150 }, { x: 100, y: 275 }, { x: 120, y: 400 }, // CB
    { x: 220, y: 80 }, { x: 200, y: 200 }, { x: 200, y: 350 }, { x: 220, y: 470 }, // Mid
    { x: 340, y: 100 }, { x: 360, y: 275 }, { x: 340, y: 450 } // Fwd
  ],
  '4-1-4-1': [
    { x: 40, y: 275 }, // GK
    { x: 120, y: 80 }, { x: 110, y: 210 }, { x: 110, y: 340 }, { x: 120, y: 470 }, // Def
    { x: 180, y: 275 }, // CDM
    { x: 260, y: 100 }, { x: 240, y: 210 }, { x: 240, y: 340 }, { x: 260, y: 450 }, // Mid
    { x: 360, y: 275 } // ST
  ],
  '4-3-2-1 (Christmas Tree)': [
    { x: 40, y: 275 }, // GK
    { x: 120, y: 80 }, { x: 110, y: 210 }, { x: 110, y: 340 }, { x: 120, y: 470 }, // Def
    { x: 220, y: 150 }, { x: 200, y: 275 }, { x: 220, y: 400 }, // CMs
    { x: 300, y: 200 }, { x: 300, y: 350 }, // AMs
    { x: 370, y: 275 } // ST
  ],
  '3-4-2-1': [
    { x: 40, y: 275 }, // GK
    { x: 120, y: 150 }, { x: 100, y: 275 }, { x: 120, y: 400 }, // CB
    { x: 220, y: 80 }, { x: 200, y: 210 }, { x: 200, y: 340 }, { x: 220, y: 470 }, // Mid
    { x: 300, y: 200 }, { x: 300, y: 350 }, // AMs
    { x: 370, y: 275 } // ST
  ],
  '4-4-1-1': [
    { x: 40, y: 275 }, // GK
    { x: 120, y: 80 }, { x: 110, y: 210 }, { x: 110, y: 340 }, { x: 120, y: 470 }, // Def
    { x: 250, y: 80 }, { x: 240, y: 210 }, { x: 240, y: 340 }, { x: 250, y: 470 }, // Mid
    { x: 320, y: 275 }, // SS
    { x: 380, y: 275 } // ST
  ],
  '5-4-1': [
    { x: 40, y: 275 }, // GK
    { x: 150, y: 50 }, { x: 120, y: 160 }, { x: 100, y: 275 }, { x: 120, y: 390 }, { x: 150, y: 500 }, // Def
    { x: 250, y: 100 }, { x: 230, y: 210 }, { x: 230, y: 340 }, { x: 250, y: 450 }, // Mid
    { x: 370, y: 275 } // ST
  ],
  '3-2-4-1': [
    { x: 40, y: 275 }, // GK
    { x: 120, y: 150 }, { x: 100, y: 275 }, { x: 120, y: 400 }, // CB
    { x: 190, y: 200 }, { x: 190, y: 350 }, // CDMs
    { x: 280, y: 80 }, { x: 260, y: 200 }, { x: 260, y: 350 }, { x: 280, y: 470 }, // AMs/Wingers
    { x: 360, y: 275 } // ST
  ],
  '4-2-2-2': [
    { x: 40, y: 275 }, // GK
    { x: 120, y: 80 }, { x: 110, y: 210 }, { x: 110, y: 340 }, { x: 120, y: 470 }, // Def
    { x: 200, y: 200 }, { x: 200, y: 350 }, // CDM
    { x: 300, y: 150 }, { x: 300, y: 400 }, // CAM
    { x: 370, y: 210 }, { x: 370, y: 340 } // ST
  ]
};
