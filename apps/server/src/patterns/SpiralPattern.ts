import { PatternConfig, PatternType, Zone, ZoneSchedule } from '@stadium-lights/shared';
import { BasePattern } from './BasePattern';

export class SpiralPattern extends BasePattern {
  readonly id = PatternType.SPIRAL;
  readonly name = 'Spiral';

  generateSchedule(zones: Zone[], config: PatternConfig): ZoneSchedule {
    if (this.isRingMode(config)) {
      return this.generateRingSchedule(zones, config);
    }
    return this.generateGridSchedule(zones, config);
  }

  private generateGridSchedule(zones: Zone[], config: PatternConfig): ZoneSchedule {
    const schedule: ZoneSchedule = {};
    const speed = config.speed || 150;
    const direction = config.direction || 'out'; // 'in' or 'out'

    // Find dimensions
    const maxRow = Math.max(...zones.map((z) => z.row));
    const maxCol = Math.max(...zones.map((z) => z.col));

    // Generate spiral order
    const spiralOrder = this.getSpiralOrder(maxRow + 1, maxCol + 1);

    if (direction === 'out') {
      spiralOrder.reverse();
    }

    // Create a map for quick zone lookup
    const zoneMap = new Map<string, Zone>();
    for (const zone of zones) {
      zoneMap.set(`${zone.row}-${zone.col}`, zone);
    }

    // Generate exactly ONE cycle - looping is handled by the client
    let stepIndex = 0;
    for (let i = 0; i < spiralOrder.length; i++) {
      const [row, col] = spiralOrder[i];
      const zone = zoneMap.get(`${row}-${col}`);

      if (!zone) continue;

      const timeOffset = stepIndex * speed;

      // Turn on
      if (!schedule[timeOffset]) {
        schedule[timeOffset] = [];
      }
      schedule[timeOffset].push(this.createState(zone.id, true));

      // Turn off
      const offTime = timeOffset + speed * 0.6;
      if (!schedule[offTime]) {
        schedule[offTime] = [];
      }
      schedule[offTime].push(this.createState(zone.id, false));

      stepIndex++;
    }

    return schedule;
  }

  private generateRingSchedule(zones: Zone[], config: PatternConfig): ZoneSchedule {
    const schedule: ZoneSchedule = {};
    const speed = config.speed || 150;
    const direction = config.direction || 'out';
    const clockwise = this.isClockwise(config);

    // Sort zones to create a spiral: primarily by distance, secondarily by angle
    // This creates a spiral that goes outward while rotating around
    const sortedZones = [...zones].sort((a, b) => {
      const distA = a.distance ?? 0;
      const distB = b.distance ?? 0;
      const angleA = a.angle ?? 0;
      const angleB = b.angle ?? 0;

      // Combine distance and angle to create spiral effect
      // Multiply distance by 360 so it dominates, but angle adds the rotation
      const spiralA = distA * 360 + (clockwise ? 360 - angleA : angleA);
      const spiralB = distB * 360 + (clockwise ? 360 - angleB : angleB);

      return direction === 'out' ? spiralA - spiralB : spiralB - spiralA;
    });

    // Generate exactly ONE cycle - looping is handled by the client
    for (let i = 0; i < sortedZones.length; i++) {
      const zone = sortedZones[i];
      const timeOffset = i * speed;

      // Turn on
      if (!schedule[timeOffset]) {
        schedule[timeOffset] = [];
      }
      schedule[timeOffset].push(this.createState(zone.id, true));

      // Turn off
      const offTime = timeOffset + speed * 0.6;
      if (!schedule[offTime]) {
        schedule[offTime] = [];
      }
      schedule[offTime].push(this.createState(zone.id, false));
    }

    return schedule;
  }

  private getSpiralOrder(rows: number, cols: number): [number, number][] {
    const result: [number, number][] = [];
    let top = 0,
      bottom = rows - 1,
      left = 0,
      right = cols - 1;

    while (top <= bottom && left <= right) {
      // Top row
      for (let col = left; col <= right; col++) {
        result.push([top, col]);
      }
      top++;

      // Right column
      for (let row = top; row <= bottom; row++) {
        result.push([row, right]);
      }
      right--;

      // Bottom row
      if (top <= bottom) {
        for (let col = right; col >= left; col--) {
          result.push([bottom, col]);
        }
        bottom--;
      }

      // Left column
      if (left <= right) {
        for (let row = bottom; row >= top; row--) {
          result.push([row, left]);
        }
        left++;
      }
    }

    return result;
  }
}
