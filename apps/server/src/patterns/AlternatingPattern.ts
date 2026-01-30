import { PatternConfig, PatternType, Zone, ZoneSchedule } from '@stadium-lights/shared';
import { BasePattern } from './BasePattern';

export class AlternatingPattern extends BasePattern {
  readonly id = PatternType.ALTERNATING;
  readonly name = 'Alternating';

  generateSchedule(zones: Zone[], config: PatternConfig): ZoneSchedule {
    const schedule: ZoneSchedule = {};
    const frequency = config.frequency || 2;
    const duration = this.getDuration(config);

    const interval = 1000 / frequency;

    // Separate zones into odd and even based on (row + col) % 2
    const oddZones = zones.filter((z) => (z.row + z.col) % 2 === 1);
    const evenZones = zones.filter((z) => (z.row + z.col) % 2 === 0);

    let time = 0;
    let oddOn = true;

    while (time < duration) {
      schedule[time] = [
        ...oddZones.map((z) => this.createState(z.id, oddOn)),
        ...evenZones.map((z) => this.createState(z.id, !oddOn)),
      ];

      oddOn = !oddOn;
      time += interval;
    }

    return schedule;
  }
}
