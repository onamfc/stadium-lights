import { PatternConfig, PatternType, Zone, ZoneSchedule } from '@stadium-lights/shared';
import { BasePattern } from './BasePattern';

export class CheckerboardPattern extends BasePattern {
  readonly id = PatternType.CHECKERBOARD;
  readonly name = 'Checkerboard';

  generateSchedule(zones: Zone[], config: PatternConfig): ZoneSchedule {
    const schedule: ZoneSchedule = {};
    const frequency = config.frequency || 2;
    const duration = this.getDuration(config);

    const interval = 1000 / frequency;

    // Create 2x2 block checkerboard pattern
    // Blocks are determined by floor(row/2) + floor(col/2) % 2
    const blockA = zones.filter(
      (z) => (Math.floor(z.row / 2) + Math.floor(z.col / 2)) % 2 === 0
    );
    const blockB = zones.filter(
      (z) => (Math.floor(z.row / 2) + Math.floor(z.col / 2)) % 2 === 1
    );

    let time = 0;
    let aOn = true;

    while (time < duration) {
      schedule[time] = [
        ...blockA.map((z) => this.createState(z.id, aOn)),
        ...blockB.map((z) => this.createState(z.id, !aOn)),
      ];

      aOn = !aOn;
      time += interval;
    }

    return schedule;
  }
}
