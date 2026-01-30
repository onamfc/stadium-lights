export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface StadiumBounds {
  topLeft: Coordinates;
  topRight: Coordinates;
  bottomLeft: Coordinates;
  bottomRight: Coordinates;
}

export interface Zone {
  id: string;
  row: number;
  col: number;
  bounds: {
    minLat: number;
    maxLat: number;
    minLng: number;
    maxLng: number;
  };
  // Ring mode properties (calculated from center of stadium)
  angle?: number; // Angle in degrees (0-360) from stadium center
  distance?: number; // Normalized distance from center (0-1)
}

export interface ZoneState {
  zoneId: string;
  isOn: boolean;
  brightness?: number; // 0-1, optional for fade effects
}

export interface Group {
  id: string;
  code: string;
  controllerDeviceId: string;
  stadiumBounds: StadiumBounds;
  gridSize: { rows: number; cols: number };
  createdAt: Date;
  lastActivity: Date;
  expiresAt: Date;
  isCustomCode: boolean;
}

export interface Participant {
  id: string;
  groupId: string;
  deviceId: string;
  displayName: string;
  latitude: number;
  longitude: number;
  zoneId: string | null;
  lastSeen: Date;
}

import { PatternMode, RingDirection } from './patterns';

export interface PatternConfig {
  direction?: 'left' | 'right' | 'up' | 'down' | 'in' | 'out';
  speed?: number; // ms per step
  frequency?: number; // flashes per second
  duration?: number; // total duration in ms
  density?: number; // 0-1, for sparkle effect
  repeat?: boolean;
  mode?: PatternMode; // 'grid' or 'ring'
  ringDirection?: RingDirection; // 'clockwise' or 'counterclockwise'
}

export interface ZoneSchedule {
  [timeOffset: number]: ZoneState[];
}

export interface PatternExecution {
  patternId: string;
  startTime: number; // Unix timestamp when pattern first started
  duration: number; // Duration of one cycle
  zoneSchedule: ZoneSchedule;
  loop: boolean; // If true, pattern repeats continuously
  mode: PatternMode; // 'grid' or 'ring' - tells visualizer how to display
}

export interface ActivePattern {
  patternId: string;
  startTime: number;
  duration: number;
  zoneSchedule: ZoneSchedule;
  config: PatternConfig;
}
