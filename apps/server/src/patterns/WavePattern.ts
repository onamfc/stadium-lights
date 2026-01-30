import { PatternConfig, PatternType, Zone, ZoneSchedule } from '@stadium-lights/shared';
import { BasePattern } from './BasePattern';

export class WavePattern extends BasePattern {
  readonly id = PatternType.WAVE;
  readonly name = 'Wave';

  generateSchedule(zones: Zone[], config: PatternConfig): ZoneSchedule {
    if (this.isRingMode(config)) {
      return this.generateRingSchedule(zones, config);
    }
    return this.generateGridSchedule(zones, config);
  }

  private generateGridSchedule(zones: Zone[], config: PatternConfig): ZoneSchedule {
    const schedule: ZoneSchedule = {};
    const speed = config.speed || 200;
    const direction = config.direction || 'left';

    // Group zones by column or row based on direction
    const isHorizontal = direction === 'left' || direction === 'right';
    const groupKey = isHorizontal ? 'col' : 'row';

    // Get unique positions
    const positions = [...new Set(zones.map((z) => z[groupKey]))].sort((a, b) => a - b);

    if (direction === 'right' || direction === 'down') {
      positions.reverse();
    }

    // Generate exactly ONE cycle - looping is handled by the client
    for (let i = 0; i < positions.length; i++) {
      const position = positions[i];
      const timeOffset = i * speed;

      const zonesAtPosition = zones.filter((z) => z[groupKey] === position);

      // Turn on
      schedule[timeOffset] = zonesAtPosition.map((z) => this.createState(z.id, true));

      // Turn off after half the speed interval
      const offTime = timeOffset + speed / 2;
      if (!schedule[offTime]) {
        schedule[offTime] = [];
      }
      schedule[offTime].push(
        ...zonesAtPosition.map((z) => this.createState(z.id, false))
      );
    }

    return schedule;
  }

  private generateRingSchedule(zones: Zone[], config: PatternConfig): ZoneSchedule {
    const schedule: ZoneSchedule = {};
    const speed = config.speed || 200;
    const clockwise = this.isClockwise(config);

    // Divide the stadium into angular segments (e.g., 36 segments of 10 degrees each)
    const numSegments = 36;
    const segments = this.getZonesByAngleSegment(zones, numSegments);

    // Order segments based on direction and filter out empty segments
    const orderedSegmentIndices = clockwise
      ? Array.from({ length: numSegments }, (_, i) => (numSegments - i) % numSegments)
      : Array.from({ length: numSegments }, (_, i) => i);

    // Filter to only non-empty segments for smooth timing
    const nonEmptySegments = orderedSegmentIndices
      .map((segmentIndex) => segments[segmentIndex])
      .filter((seg) => seg.length > 0);

    if (nonEmptySegments.length === 0) return schedule;

    // Generate exactly ONE cycle - looping is handled by the client
    for (let i = 0; i < nonEmptySegments.length; i++) {
      const timeOffset = i * speed;
      const zonesInSegment = nonEmptySegments[i];

      // Turn on
      if (!schedule[timeOffset]) {
        schedule[timeOffset] = [];
      }
      schedule[timeOffset].push(...zonesInSegment.map((z) => this.createState(z.id, true)));

      // Turn off after half the speed interval
      const offTime = timeOffset + speed / 2;
      if (!schedule[offTime]) {
        schedule[offTime] = [];
      }
      schedule[offTime].push(...zonesInSegment.map((z) => this.createState(z.id, false)));
    }

    return schedule;
  }
}
