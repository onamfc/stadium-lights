import {
  IPattern,
  PatternConfig,
  Zone,
  ZoneSchedule,
  ZoneState,
} from '@stadium-lights/shared';
import { PatternType } from '@stadium-lights/shared';

export abstract class BasePattern implements IPattern {
  abstract readonly id: PatternType;
  abstract readonly name: string;

  abstract generateSchedule(zones: Zone[], config: PatternConfig): ZoneSchedule;

  getDuration(config: PatternConfig): number {
    return config.duration || 5000;
  }

  /**
   * Helper to create a zone state
   */
  protected createState(zoneId: string, isOn: boolean, brightness = 1): ZoneState {
    return { zoneId, isOn, brightness: isOn ? brightness : 0 };
  }

  /**
   * Helper to get zones sorted by row then column
   */
  protected sortZonesByPosition(zones: Zone[]): Zone[] {
    return [...zones].sort((a, b) => {
      if (a.row !== b.row) return a.row - b.row;
      return a.col - b.col;
    });
  }

  /**
   * Helper to get center zone
   */
  protected getCenterZone(zones: Zone[]): Zone | null {
    if (zones.length === 0) return null;

    const maxRow = Math.max(...zones.map((z) => z.row));
    const maxCol = Math.max(...zones.map((z) => z.col));
    const centerRow = Math.floor(maxRow / 2);
    const centerCol = Math.floor(maxCol / 2);

    return zones.find((z) => z.row === centerRow && z.col === centerCol) || zones[0];
  }

  /**
   * Helper to calculate distance from center for a zone
   */
  protected getDistanceFromCenter(zone: Zone, centerRow: number, centerCol: number): number {
    const rowDiff = zone.row - centerRow;
    const colDiff = zone.col - centerCol;
    return Math.sqrt(rowDiff * rowDiff + colDiff * colDiff);
  }

  /**
   * Helper to get zones sorted by angle (for ring mode)
   * @param clockwise - If true, sort clockwise (decreasing angle), otherwise counter-clockwise
   */
  protected sortZonesByAngle(zones: Zone[], clockwise = true): Zone[] {
    return [...zones].sort((a, b) => {
      const angleA = a.angle ?? 0;
      const angleB = b.angle ?? 0;
      return clockwise ? angleB - angleA : angleA - angleB;
    });
  }

  /**
   * Helper to get zones grouped by angular segments
   * Divides the 360 degrees into segments and groups zones by which segment they're in
   * @param zones - All zones
   * @param numSegments - Number of segments to divide the circle into
   */
  protected getZonesByAngleSegment(zones: Zone[], numSegments: number): Zone[][] {
    const segmentSize = 360 / numSegments;
    const segments: Zone[][] = Array.from({ length: numSegments }, () => []);

    for (const zone of zones) {
      const angle = zone.angle ?? 0;
      const segmentIndex = Math.floor(angle / segmentSize) % numSegments;
      segments[segmentIndex].push(zone);
    }

    return segments;
  }

  /**
   * Helper to check if ring mode is enabled
   */
  protected isRingMode(config: PatternConfig): boolean {
    return config.mode === 'ring';
  }

  /**
   * Helper to get ring direction
   */
  protected isClockwise(config: PatternConfig): boolean {
    return config.ringDirection !== 'counterclockwise';
  }
}
