export enum PatternType {
  WAVE = 'wave',
  PULSE = 'pulse',
  STROBE = 'strobe',
  ALTERNATING = 'alternating',
  CHECKERBOARD = 'checkerboard',
  SPIRAL = 'spiral',
  SPARKLE = 'sparkle',
  CHASE = 'chase',
}

export type PatternMode = 'grid' | 'ring';
export type RingDirection = 'clockwise' | 'counterclockwise';

export interface PatternInfo {
  id: PatternType;
  name: string;
  description: string;
  defaultConfig: PatternDefaultConfig;
}

export interface PatternDefaultConfig {
  duration: number;
  speed?: number;
  frequency?: number;
  direction?: 'left' | 'right' | 'up' | 'down' | 'in' | 'out';
  density?: number;
  repeat?: boolean;
}

export const PATTERN_CATALOG: PatternInfo[] = [
  {
    id: PatternType.SPARKLE,
    name: 'Random Sparkle',
    description: 'Random zones flash creating a sparkle effect',
    defaultConfig: { duration: 5000, density: 0.3, speed: 100 },
  },
  {
    id: PatternType.WAVE,
    name: 'Wave',
    description: 'Light sweeps across the stadium',
    defaultConfig: { duration: 5000, speed: 200, direction: 'left' },
  },
  {
    id: PatternType.PULSE,
    name: 'Pulse',
    description: 'Light expands from the center outward',
    defaultConfig: { duration: 5000, speed: 300, repeat: true },
  },
  {
    id: PatternType.STROBE,
    name: 'Strobe',
    description: 'All lights flash together',
    defaultConfig: { duration: 5000, frequency: 4 },
  },
  {
    id: PatternType.ALTERNATING,
    name: 'Alternating',
    description: 'Odd and even zones alternate',
    defaultConfig: { duration: 5000, frequency: 2 },
  },
  {
    id: PatternType.CHECKERBOARD,
    name: 'Checkerboard',
    description: 'Grid pattern alternates like a checkerboard',
    defaultConfig: { duration: 5000, frequency: 2 },
  },
  {
    id: PatternType.SPIRAL,
    name: 'Spiral',
    description: 'Light spirals in or out from center',
    defaultConfig: { duration: 5000, speed: 150, direction: 'out' },
  },
  {
    id: PatternType.CHASE,
    name: 'Chase',
    description: 'Light chases sequentially through zones',
    defaultConfig: { duration: 5000, speed: 100, direction: 'right' },
  },
];
