import { PatternConfig, PatternType, Zone, ZoneSchedule } from '@stadium-lights/shared';
import { BasePattern } from './BasePattern';

export class ChasePattern extends BasePattern {
  readonly id = PatternType.CHASE;
  readonly name = 'Chase';

  generateSchedule(zones: Zone[], config: PatternConfig): ZoneSchedule {
    if (this.isRingMode(config)) {
      return this.generateRingSchedule(zones, config);
    }
    return this.generateGridSchedule(zones, config);
  }

  private generateGridSchedule(zones: Zone[], config: PatternConfig): ZoneSchedule {
    const schedule: ZoneSchedule = {};
    const speed = config.speed || 100;
    const direction = config.direction || 'right';

    // Sort zones into a chase order based on direction
    const sortedZones = this.getChaseOrder(zones, direction);

    // Keep a "tail" of lit zones for the chase effect
    const tailLength = Math.max(1, Math.floor(sortedZones.length * 0.15));

    // Generate exactly ONE cycle - looping is handled by the client
    for (let i = 0; i < sortedZones.length; i++) {
      const timeOffset = i * speed;

      // Calculate which zones should be lit (head + tail)
      const litIndices = new Set<number>();
      for (let t = 0; t < tailLength; t++) {
        const idx = (i - t + sortedZones.length) % sortedZones.length;
        litIndices.add(idx);
      }

      schedule[timeOffset] = sortedZones.map((zone, idx) =>
        this.createState(zone.id, litIndices.has(idx))
      );
    }

    return schedule;
  }

  private generateRingSchedule(zones: Zone[], config: PatternConfig): ZoneSchedule {
    const schedule: ZoneSchedule = {};
    const speed = config.speed || 100;
    const clockwise = this.isClockwise(config);

    // Sort zones by angle for ring chase
    const sortedZones = this.sortZonesByAngle(zones, clockwise);

    // Keep a "tail" of lit zones for the chase effect
    const tailLength = Math.max(1, Math.floor(sortedZones.length * 0.15));

    // Generate exactly ONE cycle - looping is handled by the client
    for (let i = 0; i < sortedZones.length; i++) {
      const timeOffset = i * speed;

      // Calculate which zones should be lit (head + tail)
      const litIndices = new Set<number>();
      for (let t = 0; t < tailLength; t++) {
        const idx = (i - t + sortedZones.length) % sortedZones.length;
        litIndices.add(idx);
      }

      schedule[timeOffset] = sortedZones.map((zone, idx) =>
        this.createState(zone.id, litIndices.has(idx))
      );
    }

    return schedule;
  }

  private getChaseOrder(zones: Zone[], direction: string): Zone[] {
    const sorted = [...zones];

    switch (direction) {
      case 'right':
        sorted.sort((a, b) => a.row * 1000 + a.col - (b.row * 1000 + b.col));
        break;
      case 'left':
        sorted.sort((a, b) => a.row * 1000 + (1000 - a.col) - (b.row * 1000 + (1000 - b.col)));
        break;
      case 'down':
        sorted.sort((a, b) => a.col * 1000 + a.row - (b.col * 1000 + b.row));
        break;
      case 'up':
        sorted.sort((a, b) => a.col * 1000 + (1000 - a.row) - (b.col * 1000 + (1000 - b.row)));
        break;
      default:
        // Diagonal or default: snake pattern
        sorted.sort((a, b) => {
          if (a.row !== b.row) return a.row - b.row;
          return a.row % 2 === 0 ? a.col - b.col : b.col - a.col;
        });
    }

    return sorted;
  }
}
