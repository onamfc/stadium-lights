import { PatternConfig, PatternType, Zone, ZoneSchedule } from '@stadium-lights/shared';
import { BasePattern } from './BasePattern';

export class StrobePattern extends BasePattern {
  readonly id = PatternType.STROBE;
  readonly name = 'Strobe';

  generateSchedule(zones: Zone[], config: PatternConfig): ZoneSchedule {
    const schedule: ZoneSchedule = {};
    const frequency = config.frequency || 4; // flashes per second
    const duration = this.getDuration(config);

    const flashInterval = 1000 / frequency;
    const onDuration = flashInterval * 0.3; // 30% duty cycle

    let time = 0;
    while (time < duration) {
      // Turn all on
      schedule[time] = zones.map((z) => this.createState(z.id, true));

      // Turn all off
      const offTime = time + onDuration;
      if (offTime < duration) {
        schedule[offTime] = zones.map((z) => this.createState(z.id, false));
      }

      time += flashInterval;
    }

    return schedule;
  }
}
