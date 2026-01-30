import { PatternConfig, Zone, ZoneSchedule } from '../types/models';
import { PatternType } from '../types/patterns';

export interface IPattern {
  readonly id: PatternType;
  readonly name: string;

  /**
   * Generates a complete zone schedule for this pattern
   * @param zones - All zones in the stadium grid
   * @param config - Pattern configuration (speed, direction, etc.)
   * @returns A schedule mapping time offsets to zone states
   */
  generateSchedule(zones: Zone[], config: PatternConfig): ZoneSchedule;

  /**
   * Returns the total duration of the pattern in milliseconds
   */
  getDuration(config: PatternConfig): number;
}
